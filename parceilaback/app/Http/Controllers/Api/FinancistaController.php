<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Financista;
use App\Models\ParametrizacionMoraInmobiliaria;
use App\Services\CajaService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class FinancistaController extends Controller
{
    public function index(Request $request)
    {
        $query = Financista::with('finca:id,nombre,codigo')->withSum('pagos as capital_pagado', 'monto_capital')
            ->withSum('pagos as interes_pagado', 'monto_interes')
            ->withSum('pagos as mora_pagada', 'monto_mora')
            ->withSum('pagos as descuento_aplicado', 'descuento_interes');

        if ($request->filled('finca_id')) {
            $query->where('finca_id', (int) $request->finca_id);
        }

        $items = $query->orderByDesc('id')->get()->map(fn (Financista $f) => $this->presentar($f));

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(Request $request)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $validated = $this->aplicarPlan($this->validar($request));
        $item = Financista::create($validated);
        $ingreso = CajaService::registrarIngreso((float) $item->monto, 'Inversión recibida de '.$item->nombre, [
            'tipo_operacion' => 'ingreso_financista',
            'financista_id' => $item->id,
            'debita_ventas' => false,
        ], $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => $ingreso
                ? 'Financiamiento registrado. El dinero recibido se sumó a la caja del día.'
                : 'Financiamiento registrado.',
            'data' => $this->presentar($item->fresh()),
            'caja_aplicada' => (bool) $ingreso,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Financista::findOrFail($id);
        $item->update($this->aplicarPlan($this->validar($request)));

        return response()->json([
            'success' => true,
            'data' => $this->presentar($item->fresh()),
        ]);
    }

    public function destroy($id)
    {
        $item = Financista::findOrFail($id);
        if ($item->pagos()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'No se elimina un financiamiento que ya tiene pagos.',
            ], 422);
        }
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Financiamiento eliminado.',
        ]);
    }

    public function pagar(Request $request, $id)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $item = Financista::findOrFail($id);
        $validated = $request->validate([
            'fecha' => 'required|date',
            'monto_capital' => 'nullable|numeric|min:0',
            'monto_interes' => 'nullable|numeric|min:0',
            'monto_mora' => 'nullable|numeric|min:0',
            'descuento_interes' => 'nullable|numeric|min:0',
            'referencia' => 'nullable|string|max:255',
            'numero_recibo' => 'nullable|string|max:40',
            'metodo_pago' => 'nullable|in:efectivo,cheque,transferencia,deposito',
            'concepto' => 'nullable|string|max:255',
            'archivo' => 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png,webp',
        ]);

        $capital = round((float) ($validated['monto_capital'] ?? 0), 2);
        $interes = round((float) ($validated['monto_interes'] ?? 0), 2);
        $mora = round((float) ($validated['monto_mora'] ?? 0), 2);
        $descuento = round((float) ($validated['descuento_interes'] ?? 0), 2);

        if ($capital + $interes + $mora + $descuento <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Indica capital, interés, mora o descuento.',
            ], 422);
        }

        $archivo = $request->file('archivo');
        $correlativo = $item->pagos()->count() + 1;
        $recibo = trim((string) ($validated['numero_recibo'] ?? ''));
        if ($recibo === '') {
            $recibo = 'FIN-'.$item->id.'-'.str_pad((string) $correlativo, 3, '0', STR_PAD_LEFT);
        }
        $concepto = trim((string) ($validated['concepto'] ?? ''));
        if ($concepto === '') {
            $concepto = 'PAGO DE FINANCIAMIENTO A NOMBRE DE '.mb_strtoupper($item->nombre).' CON NÚMERO DE RECIBO '.$recibo;
        }
        $salida = round($capital + $interes + $mora, 2);
        $pago = $item->pagos()->create([
            'fecha' => $validated['fecha'],
            'numero_recibo' => $recibo,
            'metodo_pago' => $validated['metodo_pago'] ?? 'efectivo',
            'concepto' => $concepto,
            'monto_capital' => $capital,
            'monto_interes' => $interes,
            'monto_mora' => $mora,
            'descuento_interes' => $descuento,
            'referencia' => $validated['referencia'] ?? $recibo,
            'archivo_path' => $archivo ? $archivo->store('financista-pagos', 'public') : null,
            'archivo_nombre' => $archivo ? $archivo->getClientOriginalName() : null,
            'user_id' => $request->user()?->id,
        ]);

        $cajaAplicada = false;
        if ($salida > 0) {
            $movimiento = CajaService::registrarEgreso($salida, $concepto, [
                'tipo_operacion' => 'pago_financista',
                'debita_ventas' => false,
                'financista_id' => $item->id,
                'numero_recibo' => $recibo,
                'capital' => $capital,
                'interes' => $interes,
                'mora' => $mora,
                'fecha' => $validated['fecha'],
            ], $request->user()?->id);
            if ($movimiento) {
                $pago->movimiento_caja_id = $movimiento->id;
                $pago->save();
                $cajaAplicada = true;
            }
        }

        $fresco = $item->fresh();
        $vista = $this->presentar($fresco);
        if ($vista['saldo_capital'] <= 0.009 && $vista['interes_pendiente'] <= 0.009) {
            $fresco->estado = 'liquidado';
            $fresco->save();
            $vista['estado'] = 'liquidado';
        }

        $mensaje = 'Pago registrado. Salió del disponible de la caja del día y no modifica el precio de venta de los lotes.';

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'data' => $vista,
            'numero_recibo' => $recibo,
            'caja_aplicada' => $cajaAplicada,
        ]);
    }

    public function updatePago(Request $request, $id, $pagoId)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $item = Financista::findOrFail($id);
        $pago = $item->pagos()->findOrFail($pagoId);
        $validated = $request->validate([
            'fecha' => 'required|date',
            'monto_capital' => 'nullable|numeric|min:0',
            'monto_interes' => 'nullable|numeric|min:0',
            'monto_mora' => 'nullable|numeric|min:0',
            'descuento_interes' => 'nullable|numeric|min:0',
            'referencia' => 'nullable|string|max:255',
        ]);

        $capital = round((float) ($validated['monto_capital'] ?? 0), 2);
        $interes = round((float) ($validated['monto_interes'] ?? 0), 2);
        $mora = round((float) ($validated['monto_mora'] ?? 0), 2);
        $descuento = round((float) ($validated['descuento_interes'] ?? 0), 2);
        if ($capital + $interes + $mora + $descuento <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Indica capital, interés, mora o descuento.',
            ], 422);
        }

        $salida = round($capital + $interes + $mora, 2);
        $antes = $pago->movimiento_caja_id
            ? round((float) $pago->monto_capital + (float) $pago->monto_interes + (float) $pago->monto_mora, 2)
            : 0;
        $concepto = 'Pago de financiamiento a '.$item->nombre;
        $movimientoId = CajaService::conciliarEgreso($pago->movimiento_caja_id, $antes, $salida, $concepto, [
            'tipo_operacion' => 'pago_financista',
            'debita_ventas' => false,
            'financista_id' => $item->id,
            'pago_id' => $pago->id,
            'capital' => $capital,
            'interes' => $interes,
            'mora' => $mora,
            'fecha' => $validated['fecha'],
        ], $request->user()?->id);

        $pago->update([
            'fecha' => $validated['fecha'],
            'monto_capital' => $capital,
            'monto_interes' => $interes,
            'monto_mora' => $mora,
            'descuento_interes' => $descuento,
            'referencia' => $validated['referencia'] ?? $pago->referencia,
            'movimiento_caja_id' => $movimientoId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pago actualizado. La caja quedó con el monto nuevo y el precio de venta de los lotes no cambia.',
            'data' => $this->sincronizarEstado($item),
        ]);
    }

    public function destroyPago(Request $request, $id, $pagoId)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $item = Financista::findOrFail($id);
        $pago = $item->pagos()->findOrFail($pagoId);
        $antes = $pago->movimiento_caja_id
            ? round((float) $pago->monto_capital + (float) $pago->monto_interes + (float) $pago->monto_mora, 2)
            : 0;
        CajaService::conciliarEgreso($pago->movimiento_caja_id, $antes, 0, 'Reverso de pago de financiamiento a '.$item->nombre, [
            'tipo_operacion' => 'reverso_pago_financista',
            'debita_ventas' => false,
            'financista_id' => $item->id,
            'pago_id' => $pago->id,
        ], $request->user()?->id);
        $pago->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pago eliminado. El dinero volvió al disponible de caja y el precio de venta de los lotes no cambia.',
            'data' => $this->sincronizarEstado($item),
        ]);
    }

    public function previewPago(Request $request, $id)
    {
        $fecha = Carbon::parse($request->validate([
            'fecha' => 'required|date',
        ])['fecha'])->startOfDay();
        $item = Financista::withSum('pagos as capital_pagado', 'monto_capital')
            ->withSum('pagos as interes_pagado', 'monto_interes')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->sugerirPago($item, $fecha),
        ]);
    }

    public function estado($id)
    {
        $item = Financista::with(['finca:id,nombre,codigo', 'pagos'])->findOrFail($id);

        $item->loadSum('pagos as capital_pagado', 'monto_capital');
        $item->loadSum('pagos as interes_pagado', 'monto_interes');

        return response()->json([
            'success' => true,
            'data' => [
                'financista' => $this->presentar($item),
                'pagos' => $item->pagos()->orderBy('fecha')->orderBy('id')->get(),
                'plan' => $this->planConSaldos($item),
            ],
        ]);
    }

    private function sincronizarEstado(Financista $item): array
    {
        $fresco = $item->fresh();
        $fresco->loadSum('pagos as capital_pagado', 'monto_capital');
        $fresco->loadSum('pagos as interes_pagado', 'monto_interes');
        $fresco->loadSum('pagos as mora_pagada', 'monto_mora');
        $fresco->loadSum('pagos as descuento_aplicado', 'descuento_interes');
        $vista = $this->presentar($fresco);
        $conPagos = $vista['capital_pagado'] > 0.009 || $vista['interes_pagado'] > 0.009 || $vista['mora_pagada'] > 0.009;
        $liquidado = $conPagos && $vista['saldo_capital'] <= 0.009 && $vista['interes_pendiente'] <= 0.009;
        $estado = $liquidado ? 'liquidado' : 'activo';
        if ($fresco->estado !== $estado) {
            $fresco->estado = $estado;
            $fresco->save();
            $vista['estado'] = $estado;
        }

        return $vista;
    }

    private function sinCaja(Request $request)
    {
        try {
            CajaService::exigirAbierta($request->user()?->id);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return null;
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'finca_id' => 'required|integer|exists:fincas,id',
            'tipo' => 'required|in:banco,cooperativa,particular,otro',
            'esquema' => 'nullable|in:particular_anual,cooperativa_mensual,libre',
            'nombre' => 'required|string|max:255',
            'dpi' => 'nullable|string|max:30',
            'destino' => 'required|in:compra,urbanizacion',
            'monto' => 'required|numeric|min:0.01',
            'tasa_anual' => 'nullable|numeric|min:0|max:100',
            'interes_total' => 'nullable|numeric|min:0',
            'plazo' => 'nullable|integer|min:1|max:600',
            'frecuencia' => 'nullable|in:mensual,bimensual,trimestral,semestral,anual',
            'fecha_inicio' => 'nullable|date',
            'fecha_vencimiento' => 'nullable|date',
            'cuota' => 'nullable|numeric|min:0',
            'capital_al_vencimiento' => 'nullable|boolean',
            'observaciones' => 'nullable|string',
        ]);
    }

    private function aplicarPlan(array $datos): array
    {
        $esquema = $datos['esquema'] ?? null;
        if ($esquema === 'particular_anual') {
            $datos['tipo'] = 'particular';
            $datos['frecuencia'] = 'anual';
            $datos['capital_al_vencimiento'] = true;
            $plazoParticular = (int) ($datos['plazo'] ?? 12);
            $datos['plazo'] = max(1, min(24, $plazoParticular < 1 ? 12 : $plazoParticular));
        } elseif ($esquema === 'cooperativa_mensual') {
            $datos['tipo'] = 'cooperativa';
            $datos['frecuencia'] = 'mensual';
            $datos['capital_al_vencimiento'] = false;
        }

        $meses = (int) ($datos['plazo'] ?? 0);
        $tasa = (float) ($datos['tasa_anual'] ?? 0);
        $monto = (float) ($datos['monto'] ?? 0);
        $datos['interes_total'] = ($tasa > 0 && $meses > 0)
            ? round($monto * ($tasa / 100) * ($meses / 12), 2)
            : round((float) ($datos['interes_total'] ?? 0), 2);

        $n = ($datos['esquema'] ?? null) === 'particular_anual'
            ? ($meses > 0 ? 1 : 0)
            : $this->numeroDesdePlazo($meses, $datos['frecuencia'] ?? 'mensual');
        $capitalAlFinal = (bool) ($datos['capital_al_vencimiento'] ?? false);
        $datos['cuota'] = $n > 0
            ? round(($capitalAlFinal ? (float) $datos['interes_total'] : $monto + (float) $datos['interes_total']) / $n, 2)
            : 0;
        if (($datos['esquema'] ?? null) === 'particular_anual' && $n === 1) {
            $datos['cuota'] = round($monto + (float) $datos['interes_total'], 2);
        }

        if (empty($datos['fecha_inicio'])) {
            $datos['fecha_inicio'] = Carbon::today()->toDateString();
        }
        if ($meses > 0) {
            $datos['fecha_vencimiento'] = Carbon::parse($datos['fecha_inicio'])->addMonths($meses)->toDateString();
        }

        return $datos;
    }

    private function mesesPorFrecuencia(?string $frecuencia): int
    {
        return match ($frecuencia) {
            'bimensual' => 2,
            'trimestral' => 3,
            'semestral' => 6,
            'anual' => 12,
            default => 1,
        };
    }

    private function numeroDesdePlazo(int $plazo, ?string $frecuencia): int
    {
        if ($plazo < 1) {
            return 0;
        }

        return (int) ceil($plazo / $this->mesesPorFrecuencia($frecuencia));
    }

    private function repartir(float $total, int $n): array
    {
        if ($n < 1) {
            return [];
        }
        $base = round($total / $n, 2);
        $filas = array_fill(0, $n, $base);
        $filas[$n - 1] = round($total - ($base * ($n - 1)), 2);

        return $filas;
    }

    private function cuotasDe(Financista $f): array
    {
        if ($f->esquema === 'particular_anual') {
            if ((int) $f->plazo < 1 || ! $f->fecha_inicio) {
                return [];
            }
            $fecha = $f->fecha_vencimiento
                ? Carbon::parse($f->fecha_vencimiento)->toDateString()
                : Carbon::parse($f->fecha_inicio)->addMonths((int) $f->plazo)->toDateString();

            return [[
                'numero' => 1,
                'fecha' => $fecha,
                'capital' => round((float) $f->monto, 2),
                'interes' => round((float) $f->interes_total, 2),
            ]];
        }

        $plazo = (int) $f->plazo;
        $n = $this->numeroDesdePlazo($plazo, $f->frecuencia);
        if ($n < 1 || ! $f->fecha_inicio) {
            return [];
        }

        $paso = $this->mesesPorFrecuencia($f->frecuencia);
        $inicio = Carbon::parse($f->fecha_inicio);
        $capitales = $this->repartir($f->capital_al_vencimiento ? 0 : (float) $f->monto, $n);
        $intereses = $this->repartir((float) $f->interes_total, $n);
        if ($f->capital_al_vencimiento) {
            $capitales[$n - 1] = round((float) $f->monto, 2);
        }

        $filas = [];
        for ($i = 1; $i <= $n; $i++) {
            $filas[] = [
                'numero' => $i,
                'fecha' => $inicio->copy()->addMonths(min($plazo, $i * $paso))->toDateString(),
                'capital' => $capitales[$i - 1],
                'interes' => $intereses[$i - 1],
            ];
        }

        return $filas;
    }

    private function sugerirPago(Financista $f, Carbon $fecha): array
    {
        $capitalPagado = round((float) $f->capital_pagado, 2);
        $interesPagado = round((float) $f->interes_pagado, 2);
        $cuotas = $this->cuotasDe($f);
        $config = ParametrizacionMoraInmobiliaria::vigente();
        $vencidas = [];
        $proxima = null;

        foreach ($cuotas as $cuota) {
            $tomarCapital = min($cuota['capital'], $capitalPagado);
            $tomarInteres = min($cuota['interes'], $interesPagado);
            $capitalPagado = round($capitalPagado - $tomarCapital, 2);
            $interesPagado = round($interesPagado - $tomarInteres, 2);
            $pendienteCapital = round($cuota['capital'] - $tomarCapital, 2);
            $pendienteInteres = round($cuota['interes'] - $tomarInteres, 2);
            if ($pendienteCapital <= 0.009 && $pendienteInteres <= 0.009) {
                continue;
            }
            $fila = [
                'numero' => $cuota['numero'],
                'fecha' => $cuota['fecha'],
                'capital' => $pendienteCapital,
                'interes' => $pendienteInteres,
            ];
            if (Carbon::parse($cuota['fecha'])->startOfDay()->lte($fecha)) {
                $vencidas[] = $fila;
            } elseif ($proxima === null) {
                $proxima = $fila;
            }
        }

        $objetivo = $vencidas !== [] ? $vencidas : ($proxima ? [$proxima] : []);
        $capital = round(array_sum(array_column($objetivo, 'capital')), 2);
        $interes = round(array_sum(array_column($objetivo, 'interes')), 2);
        $mora = 0.0;
        foreach ($vencidas as $fila) {
            $mora += $this->moraDe($fila['capital'], Carbon::parse($fila['fecha'])->startOfDay(), $fecha, $config);
        }

        if ($cuotas === []) {
            $saldo = round(max(0, (float) $f->monto - (float) $f->capital_pagado), 2);
            $interes = round(max(0, (float) $f->interes_total - (float) $f->interes_pagado), 2);
            $capital = $saldo;
            $nota = 'Este financiamiento no tiene plan de cuotas. Se toma el saldo y el interés pendientes.';
            if ($f->fecha_vencimiento && $fecha->gt(Carbon::parse($f->fecha_vencimiento)->startOfDay())) {
                $mora = $this->moraDe($saldo, Carbon::parse($f->fecha_vencimiento)->startOfDay(), $fecha, $config);
            }
        } elseif ($objetivo === []) {
            $nota = 'No quedan cuotas pendientes.';
        } elseif ($vencidas !== []) {
            $nota = count($vencidas) === 1
                ? 'Cuota '.$vencidas[0]['numero'].' vencida el '.$vencidas[0]['fecha'].'.'
                : 'Se suman '.count($vencidas).' cuotas vencidas a la fecha elegida.';
        } else {
            $nota = 'A esa fecha aún no vence una cuota. Se toma la próxima, la '.$proxima['numero'].' del '.$proxima['fecha'].'.';
        }

        if ($mora <= 0.009 && $vencidas !== [] && ! $config) {
            $nota .= ' No hay mora parametrizada, así que la mora queda en 0.';
        }

        return [
            'capital' => round($capital, 2),
            'interes' => round($interes, 2),
            'mora' => round($mora, 2),
            'nota' => $nota,
        ];
    }

    private function moraDe(float $capital, Carbon $vence, Carbon $pago, ?ParametrizacionMoraInmobiliaria $config): float
    {
        if (! $config || $capital <= 0.009) {
            return 0;
        }
        $inicio = $vence->copy()->addDays((int) $config->dias_gracia);
        $dias = max(0, (int) $inicio->diffInDays($pago, false));
        if ($dias <= 0) {
            return 0;
        }
        if ($config->tipo_calculo === 'monto_fijo_diario') {
            return round((float) $config->monto_fijo_diario * $dias, 2);
        }

        return round($capital * ((float) $config->porcentaje_diario / 100) * $dias, 2);
    }

    private function planConSaldos(Financista $f): array
    {
        $capitalPagado = round((float) ($f->capital_pagado ?? 0), 2);
        $interesPagado = round((float) ($f->interes_pagado ?? 0), 2);
        $filas = [];
        foreach ($this->cuotasDe($f) as $cuota) {
            $tomarCapital = min($cuota['capital'], $capitalPagado);
            $tomarInteres = min($cuota['interes'], $interesPagado);
            $capitalPagado = round($capitalPagado - $tomarCapital, 2);
            $interesPagado = round($interesPagado - $tomarInteres, 2);
            $pendienteCapital = round($cuota['capital'] - $tomarCapital, 2);
            $pendienteInteres = round($cuota['interes'] - $tomarInteres, 2);
            $cubierta = $pendienteCapital <= 0.009 && $pendienteInteres <= 0.009;
            $algo = $tomarCapital > 0.009 || $tomarInteres > 0.009;
            $vencida = ! $cubierta && Carbon::parse($cuota['fecha'])->startOfDay()->lt(Carbon::today());
            $filas[] = [
                'numero' => $cuota['numero'],
                'fecha' => $cuota['fecha'],
                'capital' => $cuota['capital'],
                'interes' => $cuota['interes'],
                'total' => round($cuota['capital'] + $cuota['interes'], 2),
                'pendiente_capital' => $pendienteCapital,
                'pendiente_interes' => $pendienteInteres,
                'estado' => $cubierta ? 'pagada' : ($vencida ? 'vencida' : ($algo ? 'parcial' : 'pendiente')),
            ];
        }

        return $filas;
    }

    public function filasPlan(Financista $f): array
    {
        if (! array_key_exists('capital_pagado', $f->getAttributes())) {
            $f->loadSum('pagos as capital_pagado', 'monto_capital');
            $f->loadSum('pagos as interes_pagado', 'monto_interes');
        }

        return $this->planConSaldos($f);
    }

    private function presentar(Financista $f): array
    {
        $f->loadMissing('finca:id,nombre,codigo');
        if (! array_key_exists('capital_pagado', $f->getAttributes())) {
            $f->loadSum('pagos as capital_pagado', 'monto_capital');
            $f->loadSum('pagos as interes_pagado', 'monto_interes');
            $f->loadSum('pagos as mora_pagada', 'monto_mora');
            $f->loadSum('pagos as descuento_aplicado', 'descuento_interes');
        }

        $capitalPagado = round((float) $f->capital_pagado, 2);
        $interesPagado = round((float) $f->interes_pagado, 2);
        $descuento = round((float) $f->descuento_aplicado, 2);
        $saldoCapital = round(max(0, (float) $f->monto - $capitalPagado), 2);
        $interesPendiente = round(max(0, (float) $f->interes_total - $interesPagado - $descuento), 2);
        $vence = $f->fecha_vencimiento ? Carbon::parse($f->fecha_vencimiento) : null;
        $alerta = $f->estado === 'activo'
            && $saldoCapital > 0
            && $vence
            && $vence->lte(Carbon::today()->addDays(15));

        return [
            'id' => $f->id,
            'finca_id' => $f->finca_id,
            'finca' => $f->finca,
            'tipo' => $f->tipo,
            'esquema' => $f->esquema,
            'nombre' => $f->nombre,
            'dpi' => $f->dpi,
            'destino' => $f->destino,
            'monto' => (float) $f->monto,
            'tasa_anual' => $f->tasa_anual !== null ? (float) $f->tasa_anual : null,
            'interes_total' => (float) $f->interes_total,
            'plazo' => $f->plazo,
            'frecuencia' => $f->frecuencia,
            'fecha_inicio' => $f->fecha_inicio?->toDateString(),
            'fecha_vencimiento' => $f->fecha_vencimiento?->toDateString(),
            'cuota' => (float) $f->cuota,
            'numero_cuotas' => $f->esquema === 'particular_anual'
                ? ((int) $f->plazo > 0 ? 1 : 0)
                : $this->numeroDesdePlazo((int) $f->plazo, $f->frecuencia),
            'capital_al_vencimiento' => (bool) $f->capital_al_vencimiento,
            'estado' => $f->estado,
            'observaciones' => $f->observaciones,
            'capital_pagado' => $capitalPagado,
            'interes_pagado' => $interesPagado,
            'mora_pagada' => round((float) $f->mora_pagada, 2),
            'descuento_aplicado' => $descuento,
            'saldo_capital' => $saldoCapital,
            'interes_pendiente' => $interesPendiente,
            'alerta_vencimiento' => $alerta,
        ];
    }

}
