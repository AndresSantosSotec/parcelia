<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comisionista;
use App\Models\ComisionRegla;
use App\Models\ComisionVenta;
use App\Models\Negociacion;
use App\Services\CajaService;
use Illuminate\Http\Request;

class ComisionistaController extends Controller
{
    public function index()
    {
        $items = Comisionista::withCount('comisiones')->orderBy('nombre')->get();

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:40',
            'direccion' => 'nullable|string|max:255',
            'dpi' => 'nullable|string|max:30',
        ]);
        $item = Comisionista::create($validated + ['activo' => true]);

        return response()->json(['success' => true, 'data' => $item], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Comisionista::findOrFail($id);
        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'telefono' => 'nullable|string|max:40',
            'direccion' => 'nullable|string|max:255',
            'dpi' => 'nullable|string|max:30',
            'activo' => 'nullable|boolean',
        ]);
        $item->update($validated);

        return response()->json(['success' => true, 'data' => $item->fresh()]);
    }

    public function destroy($id)
    {
        $item = Comisionista::withCount('comisiones')->findOrFail($id);
        if ($item->comisiones_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se elimina un comisionista que ya tiene comisiones de venta.',
            ], 422);
        }
        $item->delete();

        return response()->json(['success' => true, 'message' => 'Comisionista eliminado.']);
    }

    public function reglas()
    {
        return response()->json([
            'success' => true,
            'data' => ComisionRegla::orderBy('nombre')->get(),
        ]);
    }

    public function storeRegla(Request $request)
    {
        $validated = $this->validarRegla($request);
        $regla = ComisionRegla::create($validated + ['activo' => true]);

        return response()->json(['success' => true, 'data' => $regla], 201);
    }

    public function updateRegla(Request $request, $id)
    {
        $regla = ComisionRegla::findOrFail($id);
        $regla->update($this->validarRegla($request, true));

        return response()->json(['success' => true, 'data' => $regla->fresh()]);
    }

    public function destroyRegla($id)
    {
        $regla = ComisionRegla::findOrFail($id);
        if (ComisionVenta::where('regla_id', $regla->id)->exists()) {
            $regla->update(['activo' => false]);

            return response()->json([
                'success' => true,
                'message' => 'La regla ya se usó en ventas. Quedó inactiva y las comisiones anteriores no cambian.',
            ]);
        }
        $regla->delete();

        return response()->json(['success' => true, 'message' => 'Regla eliminada.']);
    }

    public function destroyComision($id)
    {
        $comision = ComisionVenta::findOrFail($id);
        if ($comision->pagos()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'No se elimina una comisión que ya tiene pagos. El recibo y el estado de cuenta se conservan.',
            ], 422);
        }
        $comision->delete();

        return response()->json(['success' => true, 'message' => 'Comisión eliminada.']);
    }

    public function aplicar(Request $request)
    {
        $validated = $request->validate([
            'comisionista_id' => 'required|integer|exists:comisionistas,id',
            'negociacion_id' => 'required|integer|exists:negociaciones,id',
            'regla_id' => 'nullable|integer|exists:comision_reglas,id',
            'monto_comision' => 'nullable|numeric|min:0.01',
        ]);

        $negociacion = Negociacion::with('lote')->findOrFail($validated['negociacion_id']);
        $regla = ! empty($validated['regla_id']) ? ComisionRegla::find($validated['regla_id']) : null;
        $montoVenta = round((float) $negociacion->precio_final, 2);
        $monto = isset($validated['monto_comision'])
            ? round((float) $validated['monto_comision'], 2)
            : $this->calcular($regla, $negociacion);

        if ($monto < 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Indica un monto o una regla que produzca una comisión mayor a cero.',
            ], 422);
        }

        $ya = ComisionVenta::where('negociacion_id', $negociacion->id)
            ->where('comisionista_id', $validated['comisionista_id'])
            ->exists();
        if ($ya) {
            return response()->json([
                'success' => false,
                'message' => 'Ese comisionista ya tiene comisión en esta venta.',
            ], 422);
        }

        $item = ComisionVenta::create([
            'comisionista_id' => $validated['comisionista_id'],
            'lote_id' => $negociacion->lote_id,
            'negociacion_id' => $negociacion->id,
            'regla_id' => $regla?->id,
            'descripcion' => $regla ? $regla->nombre : 'Comisión de la venta',
            'monto_venta' => $montoVenta,
            'monto_comision' => $monto,
            'estado' => 'pendiente',
        ]);

        return response()->json(['success' => true, 'data' => $this->presentar($item)], 201);
    }

    public function comisiones(Request $request)
    {
        $query = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico,numero_lote', 'negociacion:id,codigo_negociacion,precio_original,precio_final,enganche_pactado,enganche_pagado,total_capital_pagado,saldo_capital_pendiente,monto_financiado,estado', 'regla', 'pagos'])
            ->withSum('pagos as pagado', 'monto');

        if ($request->filled('comisionista_id')) {
            $query->where('comisionista_id', (int) $request->comisionista_id);
        }

        $items = $query->orderByDesc('id')->get()->map(fn (ComisionVenta $c) => $this->presentar($c));

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function storeComision(Request $request)
    {
        $validated = $request->validate([
            'comisionista_id' => 'required|integer|exists:comisionistas,id',
            'lote_id' => 'nullable|integer|exists:lotes,id',
            'negociacion_id' => 'nullable|integer|exists:negociaciones,id',
            'descripcion' => 'nullable|string|max:255',
            'monto_venta' => 'nullable|numeric|min:0',
            'monto_comision' => 'required|numeric|min:0.01',
        ]);

        $item = ComisionVenta::create($validated + ['estado' => 'pendiente']);

        return response()->json(['success' => true, 'data' => $this->presentar($item)], 201);
    }

    public function pagar(Request $request, $id)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $comision = ComisionVenta::findOrFail($id);
        $validated = $request->validate([
            'fecha' => 'required|date',
            'monto' => 'required|numeric|min:0.01',
            'referencia' => 'nullable|string|max:255',
        ]);

        $comision->load(['negociacion', 'regla', 'comisionista', 'lote:id,codigo_unico,numero_lote']);
        $pagado = round((float) $comision->pagos()->sum('monto'), 2);
        $pendiente = round((float) $comision->monto_comision - $pagado, 2);
        $liberacion = $this->liberacion($comision);
        $disponible = round(max(0, $liberacion['liberado'] - $pagado), 2);
        $monto = round((float) $validated['monto'], 2);
        if ($monto > $pendiente + 0.009) {
            return response()->json([
                'success' => false,
                'message' => 'El pago supera la comisión pendiente.',
            ], 422);
        }
        if ($monto > $disponible + 0.009) {
            return response()->json([
                'success' => false,
                'message' => 'Por ahora solo hay Q '.number_format($disponible, 2).' liberados, según lo que el comprador ya abonó. El resto se paga conforme entren el enganche y las cuotas, y se salda al escriturar.',
            ], 422);
        }

        $pago = $comision->pagos()->create([
            'fecha' => $validated['fecha'],
            'monto' => $monto,
            'referencia' => $validated['referencia'] ?? null,
            'user_id' => $request->user()?->id,
        ]);
        $persona = $comision->comisionista?->nombre ?: 'comisionista';
        $lote = $comision->lote?->codigo_unico ?: 'lote';
        $movimiento = CajaService::registrarEgreso($monto, "Pago de comisión a {$persona} · {$lote}", [
            'tipo_operacion' => 'pago_comision',
            'debita_ventas' => false,
            'comision_id' => $comision->id,
            'fecha' => $validated['fecha'],
        ], $request->user()?->id);
        if ($movimiento) {
            $pago->movimiento_caja_id = $movimiento->id;
            $pago->save();
        }

        $nuevo = round($pagado + $monto, 2);
        $comision->estado = $nuevo + 0.009 >= (float) $comision->monto_comision ? 'pagada' : 'parcial';
        $comision->save();

        return response()->json([
            'success' => true,
            'message' => 'Pago de comisión registrado. Salió de la caja del día y no modifica el precio de venta del lote.',
            'data' => $this->presentar($comision->fresh()),
        ]);
    }

    public function updatePago(Request $request, $id, $pagoId)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $comision = ComisionVenta::with(['negociacion', 'regla', 'comisionista', 'lote:id,codigo_unico,numero_lote'])->findOrFail($id);
        $pago = $comision->pagos()->findOrFail($pagoId);
        $validated = $request->validate([
            'fecha' => 'required|date',
            'monto' => 'required|numeric|min:0.01',
            'referencia' => 'nullable|string|max:255',
        ]);

        $monto = round((float) $validated['monto'], 2);
        $otros = round((float) $comision->pagos()->where('id', '!=', $pago->id)->sum('monto'), 2);
        $liberacion = $this->liberacion($comision);
        $tope = round(min((float) $comision->monto_comision, $liberacion['liberado']) - $otros, 2);
        if ($monto > $tope + 0.009) {
            return response()->json([
                'success' => false,
                'message' => 'El monto editado supera lo que se puede pagar de esta comisión. El tope es Q '.number_format(max(0, $tope), 2).'.',
            ], 422);
        }

        $persona = $comision->comisionista?->nombre ?: 'comisionista';
        $lote = $comision->lote?->numero_lote ?: ($comision->lote?->codigo_unico ?: 'lote');
        $concepto = "Pago de comisión a {$persona} · {$lote}";
        $antes = $pago->movimiento_caja_id ? round((float) $pago->monto, 2) : 0;
        $movimientoId = CajaService::conciliarEgreso($pago->movimiento_caja_id, $antes, $monto, $concepto, [
            'tipo_operacion' => 'pago_comision',
            'debita_ventas' => false,
            'comision_id' => $comision->id,
            'pago_id' => $pago->id,
            'fecha' => $validated['fecha'],
        ], $request->user()?->id);

        $pago->update([
            'fecha' => $validated['fecha'],
            'monto' => $monto,
            'referencia' => $validated['referencia'] ?? null,
            'movimiento_caja_id' => $movimientoId,
        ]);
        $this->refrescarEstadoComision($comision);

        return response()->json([
            'success' => true,
            'message' => 'Pago actualizado. La caja quedó con el monto nuevo y el precio de venta del lote no cambia.',
            'data' => $this->presentar($comision->fresh()),
        ]);
    }

    public function destroyPago(Request $request, $id, $pagoId)
    {
        if ($respuesta = $this->sinCaja($request)) {
            return $respuesta;
        }
        $comision = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico,numero_lote'])->findOrFail($id);
        $pago = $comision->pagos()->findOrFail($pagoId);
        $persona = $comision->comisionista?->nombre ?: 'comisionista';
        $lote = $comision->lote?->numero_lote ?: ($comision->lote?->codigo_unico ?: 'lote');
        $antes = $pago->movimiento_caja_id ? round((float) $pago->monto, 2) : 0;
        CajaService::conciliarEgreso($pago->movimiento_caja_id, $antes, 0, "Reverso de pago de comisión a {$persona} · {$lote}", [
            'tipo_operacion' => 'reverso_pago_comision',
            'debita_ventas' => false,
            'comision_id' => $comision->id,
            'pago_id' => $pago->id,
        ], $request->user()?->id);
        $pago->delete();
        $this->refrescarEstadoComision($comision);

        return response()->json([
            'success' => true,
            'message' => 'Pago eliminado. El dinero volvió al disponible de caja y el precio de venta del lote no cambia.',
            'data' => $this->presentar($comision->fresh()),
        ]);
    }

    public function estado($id)
    {
        $comision = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico,numero_lote', 'pagos'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'comision' => $this->presentar($comision),
                'pagos' => $comision->pagos()->orderBy('fecha')->orderBy('id')->get(),
            ],
        ]);
    }

    private function presentar(ComisionVenta $c): array
    {
        $c->loadMissing(['comisionista', 'lote:id,codigo_unico,numero_lote', 'negociacion:id,codigo_negociacion,precio_original,precio_final,enganche_pactado,enganche_pagado,total_capital_pagado,saldo_capital_pendiente,monto_financiado,estado', 'regla', 'pagos']);
        if (! array_key_exists('pagado', $c->getAttributes())) {
            $c->loadSum('pagos as pagado', 'monto');
        }
        $pagado = round((float) $c->pagado, 2);
        $liberacion = $this->liberacion($c);
        $pendiente = round(max(0, (float) $c->monto_comision - $pagado), 2);

        return [
            'id' => $c->id,
            'comisionista_id' => $c->comisionista_id,
            'comisionista' => $c->comisionista,
            'lote_id' => $c->lote_id,
            'lote' => $c->lote,
            'negociacion_id' => $c->negociacion_id,
            'negociacion' => $c->negociacion,
            'regla_id' => $c->regla_id,
            'regla' => $c->regla,
            'descripcion' => $c->descripcion,
            'monto_venta' => (float) $c->monto_venta,
            'monto_comision' => (float) $c->monto_comision,
            'pagado' => $pagado,
            'pendiente' => $pendiente,
            'liberado' => $liberacion['liberado'],
            'disponible' => round(max(0, $liberacion['liberado'] - $pagado), 2),
            'cobrado_venta' => $liberacion['cobrado_venta'],
            'precio_base' => $liberacion['precio_base'],
            'excedente' => $liberacion['excedente'],
            'venta_liquidada' => $liberacion['liquidada'],
            'estado' => $c->estado,
            'pagos' => $c->pagos->map(fn ($p) => [
                'id' => $p->id,
                'fecha' => $p->fecha?->toDateString(),
                'monto' => round((float) $p->monto, 2),
                'referencia' => $p->referencia,
            ])->values(),
        ];
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

    private function refrescarEstadoComision(ComisionVenta $comision): void
    {
        $pagado = round((float) $comision->pagos()->sum('monto'), 2);
        if ($pagado <= 0.009) {
            $comision->estado = 'pendiente';
        } elseif ($pagado + 0.009 >= (float) $comision->monto_comision) {
            $comision->estado = 'pagada';
        } else {
            $comision->estado = 'parcial';
        }
        $comision->save();
    }

    private function liberacion(ComisionVenta $c): array
    {
        $negociacion = $c->negociacion;
        $precio = $negociacion ? (float) $negociacion->precio_final : (float) $c->monto_venta;
        $base = $negociacion ? (float) $negociacion->precio_original : 0.0;
        $cobrado = 0.0;
        $liquidada = false;
        if ($negociacion) {
            $cobrado = round((float) $negociacion->enganche_pagado + (float) $negociacion->total_capital_pagado, 2);
            $liquidada = in_array($negociacion->estado, ['pagada', 'liquidada', 'escriturada', 'finalizada'], true)
                || ($precio > 0 && $cobrado + 0.009 >= $precio);
        }

        $comision = round((float) $c->monto_comision, 2);
        $momento = $c->regla?->momento;
        if ($momento === 'proporcional' && $precio > 0.009) {
            $liberado = $liquidada ? $comision : round($comision * min(1, $cobrado / $precio), 2);
        } else {
            $liberado = $comision;
        }

        return [
            'precio_base' => round($base, 2),
            'excedente' => round(max(0, $precio - $base), 2),
            'cobrado_venta' => $cobrado,
            'liberado' => $liberado,
            'liquidada' => $liquidada,
        ];
    }

    private function validarRegla(Request $request, bool $parcial = false): array
    {
        $req = $parcial ? 'sometimes' : 'required';

        return $request->validate([
            'nombre' => $req.'|string|max:160',
            'tipo' => $req.'|in:porcentaje,monto_fijo',
            'base' => 'nullable|in:precio_final,precio_venta,enganche,excedente',
            'valor' => $req.'|numeric|min:0',
            'momento' => 'nullable|in:al_contrato,al_enganche,al_liquidar,proporcional',
            'activo' => 'nullable|boolean',
        ]);
    }

    private function calcular(?ComisionRegla $regla, Negociacion $negociacion): float
    {
        if (! $regla) {
            return 0;
        }
        $excedente = max(0, (float) $negociacion->precio_final - (float) $negociacion->precio_original);
        if ($regla->base === 'excedente') {
            if ($regla->tipo === 'porcentaje') {
                return round($excedente * ((float) $regla->valor / 100), 2);
            }

            return round($excedente, 2);
        }
        if ($regla->tipo === 'monto_fijo') {
            return round((float) $regla->valor, 2);
        }
        $base = match ($regla->base) {
            'precio_venta' => (float) $negociacion->precio_original,
            'enganche' => (float) $negociacion->enganche_pactado,
            default => (float) $negociacion->precio_final,
        };

        return round($base * ((float) $regla->valor / 100), 2);
    }

}
