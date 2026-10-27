<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Boveda;
use App\Models\BovedaMovimiento;
use App\Models\Finca;
use App\Models\FincaCompraPago;
use App\Models\FincaCuotaCompra;
use App\Models\FincaEscritura;
use App\Models\FincaGastoUrbanizacion;
use App\Models\Lote;
use App\Models\MovimientoCaja;
use App\Services\CajaService;
use Illuminate\Support\Facades\DB;
use App\Services\Inmobiliario\FincaInversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompraFincaController extends Controller
{
    public function __construct(private FincaInversionService $inversion) {}

    public function index()
    {
        $filas = Finca::query()
            ->withCount('escrituras')
            ->withSum('pagosCompra as pagado_estado', 'monto')
            ->withSum('cuotasCompra as pagado_cuotas', 'monto_pagado')
            ->withSum('gastosUrbanizacion as urbanizacion', 'monto')
            ->orderBy('nombre')
            ->get()
            ->filter(function (Finca $finca) {
                return (float) $finca->precio_compra > 0
                    || filled($finca->vendedor_nombre)
                    || (int) $finca->escrituras_count > 0;
            })
            ->map(function (Finca $finca) {
                $precio = round((float) $finca->precio_compra, 2);
                $pagado = round(max((float) $finca->pagado_estado, (float) $finca->pagado_cuotas), 2);
                $pendiente = round(max(0, $precio - $pagado), 2);

                return [
                    'id' => $finca->id,
                    'codigo' => $finca->codigo,
                    'nombre' => $finca->nombre,
                    'vendedor_nombre' => $finca->vendedor_nombre,
                    'vendedor_dpi' => $finca->vendedor_dpi,
                    'ubicacion' => $finca->ubicacion,
                    'municipio' => $finca->municipio,
                    'departamento' => $finca->departamento,
                    'precio_compra' => $precio,
                    'gastos_escrituracion' => round((float) $finca->gastos_escrituracion, 2),
                    'tipo_compra' => $finca->tipo_compra ?: 'contado',
                    'enganche' => round((float) $finca->enganche, 2),
                    'numero_cuotas' => (int) $finca->numero_cuotas,
                    'frecuencia_pago' => $finca->frecuencia_pago,
                    'fecha_inicio_pagos' => optional($finca->fecha_inicio_pagos)->format('Y-m-d'),
                    'pagado' => $pagado,
                    'pendiente' => $pendiente,
                    'urbanizacion' => round((float) $finca->urbanizacion, 2),
                    'escrituras' => (int) $finca->escrituras_count,
                    'area_total_m2' => round((float) $finca->area_total_m2, 2),
                    'estado' => $precio <= 0 ? 'Sin precio' : ($pendiente <= 0.01 ? 'Cancelada' : 'Vigente'),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $filas,
        ]);
    }

    public function detalle($id)
    {
        $finca = $this->cargar($id);
        $resumen = $this->inversion->recalcular($finca);

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => $finca->fresh([
                    'escrituras',
                    'cuotasCompra',
                    'gastosUrbanizacion',
                    'pagosCompra',
                ]),
                'resumen' => $resumen,
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'municipio' => 'required|string|max:120',
            'departamento' => 'required|string|max:120',
        ]);

        $request->attributes->set('compra_recien_creada', true);
        $finca = Finca::create([
            'nombre' => trim(strip_tags((string) $request->input('nombre'))),
            'codigo' => $this->siguienteCodigoFinca(),
            'ubicacion' => $request->input('ubicacion'),
            'municipio' => $request->input('municipio'),
            'departamento' => $request->input('departamento'),
            'activo' => true,
        ]);

        $respuesta = $this->guardarCompra($request, $finca->id);
        if ($respuesta->getStatusCode() >= 400) {
            $finca->delete();
        }

        return $respuesta;
    }

    public function guardarCompra(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        if ($respuesta = $this->autorizarMutacion($request, $finca)) {
            return $respuesta;
        }

        $validated = $request->validate([
            'nombre' => 'nullable|string|max:255',
            'vendedor_nombre' => 'nullable|string|max:255',
            'vendedor_dpi' => 'nullable|string|max:30',
            'referencia' => 'nullable|string|max:255',
            'ubicacion' => 'nullable|string|max:255',
            'municipio' => 'nullable|string|max:120',
            'departamento' => 'nullable|string|max:120',
            'precio_compra' => 'required|numeric|min:0',
            'gastos_escrituracion' => 'nullable|numeric|min:0',
            'tipo_compra' => 'required|in:contado,pagos',
            'enganche' => 'nullable|numeric|min:0',
            'numero_cuotas' => 'nullable|integer|min:0|max:360',
            'frecuencia_pago' => 'nullable|in:no_aplica,mensual,bimensual,trimestral,semestral,anual',
            'fecha_inicio_pagos' => 'nullable|date',
            'porcentaje_utilidad' => 'nullable|numeric|min:0|max:500',
            'area_negociable_m2' => 'nullable|numeric|min:0',
            'area_no_negociable_m2' => 'nullable|numeric|min:0',
            'area_vialidades_m2' => 'nullable|numeric|min:0',
            'area_verde_m2' => 'nullable|numeric|min:0',
            'area_tecnica_m2' => 'nullable|numeric|min:0',
            'regenerar_plan' => 'nullable|boolean',
            'forzar_plan' => 'nullable|boolean',
        ]);

        $enganche = (float) ($validated['enganche'] ?? 0);
        $precio = (float) $validated['precio_compra'];
        if ($validated['tipo_compra'] === 'pagos' && $enganche > $precio) {
            return response()->json([
                'success' => false,
                'message' => 'El enganche no puede ser mayor que el precio de compra.',
            ], 422);
        }

        if ($validated['tipo_compra'] === 'pagos' && (int) ($validated['numero_cuotas'] ?? 0) < 1) {
            return response()->json([
                'success' => false,
                'message' => 'Indica cuántas cuotas tiene la compra.',
            ], 422);
        }

        $regenerar = (bool) ($validated['regenerar_plan'] ?? false);
        $forzar = (bool) ($validated['forzar_plan'] ?? false);
        unset($validated['regenerar_plan'], $validated['forzar_plan']);

        if (! empty($validated['nombre'])) {
            $validated['nombre'] = trim(strip_tags($validated['nombre']));
        } else {
            unset($validated['nombre']);
        }

        $noLotificada = round(
            (float) ($validated['area_vialidades_m2'] ?? 0)
            + (float) ($validated['area_verde_m2'] ?? 0)
            + (float) ($validated['area_tecnica_m2'] ?? 0),
            2
        );
        if ($noLotificada > 0) {
            $validated['area_no_negociable_m2'] = $noLotificada;
        }

        if ($validated['tipo_compra'] === 'contado') {
            $validated['enganche'] = 0;
            $validated['numero_cuotas'] = 1;
            $validated['frecuencia_pago'] = 'no_aplica';
            $validated['cuota_compra'] = $precio;
            $regenerar = true;
        }

        $finca->update($validated);

        $sinPlan = $finca->tipo_compra === 'pagos' && $finca->cuotasCompra()->count() === 0;
        if ($regenerar || $sinPlan) {
            $this->inversion->generarPlan($finca->fresh(), $forzar);
        }

        $resumen = $this->inversion->recalcular($finca->fresh());

        return response()->json([
            'success' => true,
            'message' => $request->attributes->get('compra_recien_creada')
                ? 'Compra registrada. La finca ya está en Fincas y lotes. Desde Parcelar puedes dividirla en lotes.'
                : 'Compra de finca actualizada.',
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $resumen,
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $finca = Finca::with(['escrituras', 'pagosCompra', 'cuotasCompra', 'gastosUrbanizacion'])->findOrFail($id);
        $tieneCompra = (float) $finca->precio_compra > 0
            || filled($finca->vendedor_nombre)
            || $finca->escrituras->isNotEmpty();
        if (! $tieneCompra) {
            return response()->json([
                'success' => false,
                'message' => 'Esta finca no tiene una compra registrada.',
            ], 422);
        }

        $tienePagos = $finca->pagosCompra->isNotEmpty()
            || $finca->cuotasCompra->contains(fn ($cuota) => (float) $cuota->monto_pagado > 0);
        if ($tienePagos) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar una compra que ya tiene pagos. El estado de cuenta debe quedar en cero.',
            ], 422);
        }

        DB::transaction(function () use ($finca) {
            foreach ($finca->escrituras as $escritura) {
                if ($escritura->documento_path) {
                    Storage::disk('public')->delete($escritura->documento_path);
                }
                $escritura->delete();
            }
            $finca->cuotasCompra()->delete();
            $finca->gastosUrbanizacion()->delete();
            $finca->update([
                'vendedor_nombre' => null,
                'vendedor_dpi' => null,
                'referencia' => null,
                'precio_compra' => 0,
                'gastos_escrituracion' => 0,
                'tipo_compra' => 'contado',
                'enganche' => 0,
                'numero_cuotas' => 0,
                'frecuencia_pago' => 'no_aplica',
                'fecha_inicio_pagos' => null,
                'cuota_compra' => 0,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Compra eliminada. La finca y sus lotes siguen en el inventario.',
        ]);
    }

    public function storeEscritura(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        if ($respuesta = $this->autorizarMutacion($request, $finca)) {
            return $respuesta;
        }
        $validated = $request->validate([
            'numero_escritura' => 'required|string|max:80',
            'fecha_escritura' => 'nullable|date',
            'area_m2' => 'required|numeric|min:0.01',
        ]);

        $escritura = $finca->escrituras()->create($validated);
        $this->guardarDocumento($request, $escritura);
        $this->inversion->sincronizarAreaEscrituras($finca);
        $resumen = $this->inversion->recalcular($finca->fresh());

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $resumen,
                'lotes' => $this->lotes($finca),
            ],
        ], 201);
    }

    public function destroyEscritura(Request $request, $id, $escrituraId)
    {
        $finca = Finca::findOrFail($id);
        if ($respuesta = $this->autorizarMutacion($request, $finca)) {
            return $respuesta;
        }
        $escritura = FincaEscritura::where('finca_id', $finca->id)->findOrFail($escrituraId);
        if ($escritura->documento_path) {
            Storage::disk('public')->delete($escritura->documento_path);
        }
        $escritura->delete();
        $this->inversion->sincronizarAreaEscrituras($finca);
        $resumen = $this->inversion->recalcular($finca->fresh());

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $resumen,
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    public function adjuntarDocumento(Request $request, $id, $escrituraId)
    {
        $finca = Finca::findOrFail($id);
        if ($respuesta = $this->autorizarMutacion($request, $finca)) {
            return $respuesta;
        }
        $request->validate(['documento' => 'required|file|max:15360']);
        $escritura = FincaEscritura::where('finca_id', $id)->findOrFail($escrituraId);
        $this->guardarDocumento($request, $escritura);

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => Finca::with(['escrituras', 'cuotasCompra', 'gastosUrbanizacion'])->findOrFail($id),
                'resumen' => $this->inversion->recalcular(Finca::findOrFail($id)),
                'lotes' => $this->lotes(Finca::findOrFail($id)),
            ],
        ]);
    }

    public function documentoEscritura($id, $escrituraId)
    {
        $escritura = FincaEscritura::where('finca_id', $id)->findOrFail($escrituraId);
        if (! $escritura->documento_path || ! Storage::disk('public')->exists($escritura->documento_path)) {
            return response()->json(['success' => false, 'message' => 'Esta escritura no tiene documento.'], 404);
        }

        return Storage::disk('public')->download($escritura->documento_path, $escritura->documento_nombre ?: 'escritura');
    }

    private function guardarDocumento(Request $request, FincaEscritura $escritura): void
    {
        if (! $request->hasFile('documento')) {
            return;
        }
        if ($escritura->documento_path) {
            Storage::disk('public')->delete($escritura->documento_path);
        }
        $archivo = $request->file('documento');
        $escritura->documento_path = $archivo->store('escrituras', 'public');
        $escritura->documento_nombre = $archivo->getClientOriginalName();
        $escritura->save();
    }

    public function storeGasto(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        if ($respuesta = $this->autorizarMutacion($request, $finca)) {
            return $respuesta;
        }
        return response()->json([
            'success' => false,
            'message' => 'La urbanización ya no se carga al costo de los lotes. Ese desembolso se registra como egreso de la caja del día.',
        ], 422);
    }

    public function destroyGasto(Request $request, $id, $gastoId)
    {
        $finca = Finca::findOrFail($id);
        if ($respuesta = $this->autorizarMutacion($request, $finca)) {
            return $respuesta;
        }
        FincaGastoUrbanizacion::where('finca_id', $finca->id)->findOrFail($gastoId)->delete();
        $resumen = $this->inversion->recalcular($finca->fresh());

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $resumen,
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    public function pagarCuota(Request $request, $id, $cuotaId)
    {
        $finca = Finca::findOrFail($id);
        $cuota = FincaCuotaCompra::where('finca_id', $finca->id)->findOrFail($cuotaId);
        $validated = $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'fecha' => 'nullable|date',
            'origen' => 'required|in:caja,boveda',
        ]);

        $pendiente = round((float) $cuota->monto - (float) $cuota->monto_pagado, 2);
        $monto = round((float) $validated['monto'], 2);
        if ($monto > $pendiente + 0.009) {
            return response()->json([
                'success' => false,
                'message' => 'El abono supera el saldo de la cuota.',
            ], 422);
        }

        try {
            CajaService::exigirAbierta($request->user()?->id);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        try {
            $pago = DB::transaction(function () use ($request, $finca, $cuota, $validated, $monto) {
                return $this->registrarPago($request, $finca, $cuota, $monto, $validated['origen'], $validated['fecha'] ?? null);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Abono registrado en '.($validated['origen'] === 'boveda' ? 'bóveda' : 'caja').'.',
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $this->inversion->recalcular($finca->fresh()),
                'lotes' => $this->lotes($finca),
                'pago_id' => $pago->id,
            ],
        ]);
    }

    public function sincronizarLotes(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        $validated = $request->validate([
            'lotes' => 'required|array|min:1|max:500',
            'lotes.*.numero' => 'required|string|max:50',
            'lotes.*.area_m2' => 'required|numeric|min:0.01',
            'lotes.*.tipo' => 'required|string|max:80',
            'lotes.*.frente_metros' => 'nullable|numeric|min:0',
            'lotes.*.fondo_metros' => 'nullable|numeric|min:0',
        ]);

        $parcela = $finca->parcelas()->orderBy('id')->first();
        if (! $parcela) {
            $parcela = $finca->parcelas()->create([
                'nombre_identificador' => 'Sector 1',
                'codigo' => 'S1',
                'area_m2' => 0,
                'activo' => true,
            ]);
        }

        $suma = round(collect($validated['lotes'])->sum(fn ($l) => (float) $l['area_m2']), 2);
        if ((float) $parcela->area_m2 < $suma) {
            $parcela->area_m2 = $suma;
            $parcela->save();
        }

        $creados = 0;
        $actualizados = 0;
        foreach ($validated['lotes'] as $fila) {
            $numero = trim($fila['numero']);
            $lote = Lote::where('parcela_id', $parcela->id)->where('numero_lote', $numero)->first();
            if ($lote) {
                if ($lote->negociacion_activa_id) {
                    $lote->tipo_terreno = $fila['tipo'];
                    $lote->save();
                    continue;
                }
                $lote->area_m2 = $fila['area_m2'];
                $lote->tipo_terreno = $fila['tipo'];
                $lote->frente_metros = $fila['frente_metros'] ?? $lote->frente_metros;
                $lote->fondo_metros = $fila['fondo_metros'] ?? $lote->fondo_metros;
                $lote->save();
                $actualizados++;
                continue;
            }

            $codigo = strtoupper($finca->codigo.'-'.$parcela->codigo.'-L'.$numero);
            $parcela->lotes()->create([
                'vendedor_id' => $request->user()?->id,
                'numero_lote' => $numero,
                'codigo_unico' => $codigo,
                'area_m2' => $fila['area_m2'],
                'frente_metros' => $fila['frente_metros'] ?? null,
                'fondo_metros' => $fila['fondo_metros'] ?? null,
                'tipo_terreno' => $fila['tipo'],
                'precio_venta' => 0,
                'precio_base' => 0,
                'precio_m2' => 0,
                'estado' => 'disponible',
                'publicado' => true,
            ]);
            $creados++;
        }

        if ((float) $finca->area_negociable_m2 <= 0) {
            $finca->area_negociable_m2 = $suma;
            $finca->save();
        }

        return response()->json([
            'success' => true,
            'message' => "Lotes listos en Fincas y lotes: {$creados} nuevos y {$actualizados} actualizados.",
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $this->inversion->recalcular($finca->fresh()),
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    public function rehacerPendiente(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        $validated = $request->validate([
            'cuotas' => 'required|integer|min:1|max:360',
            'fecha_inicio' => 'nullable|date',
        ]);

        try {
            $this->inversion->rehacerCuotasPendientes(
                $finca,
                (int) $validated['cuotas'],
                $validated['fecha_inicio'] ?? null
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => collect($e->errors())->flatten()->first() ?: 'No se pudo rehacer el plan.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Las cuotas pendientes se calcularon con el saldo del estado de cuenta.',
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $this->inversion->recalcular($finca->fresh()),
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    public function aplicarPrecios(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        $this->inversion->recalcular($finca);

        $actualizados = 0;
        foreach ($finca->lotes()->get() as $lote) {
            if ($lote->estado !== 'disponible' || (float) $lote->precio_sugerido <= 0) {
                continue;
            }
            $lote->precio_venta = $lote->precio_sugerido;
            $lote->precio_m2 = (float) $lote->area_m2 > 0
                ? round((float) $lote->precio_sugerido / (float) $lote->area_m2, 2)
                : 0;
            $lote->save();
            $actualizados++;
        }

        return response()->json([
            'success' => true,
            'message' => "Precio sugerido aplicado a {$actualizados} lotes.",
            'data' => [
                'finca' => $finca->fresh(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra']),
                'resumen' => $this->inversion->recalcular($finca->fresh()),
                'lotes' => $this->lotes($finca),
            ],
        ]);
    }

    private function registrarPago(Request $request, Finca $finca, FincaCuotaCompra $cuota, float $monto, string $origen, ?string $fecha): FincaCompraPago
    {
        $user = $request->user();
        $correlativo = FincaCompraPago::where('finca_id', $finca->id)->count() + 1;
        $recibo = strtoupper($finca->codigo).'-P-'.str_pad((string) $correlativo, 3, '0', STR_PAD_LEFT);
        $concepto = 'Compra de finca '.$finca->codigo.' · recibo '.$recibo;

        $movimientoCajaId = null;
        $bovedaMovimientoId = null;

        if ($origen === 'caja') {
            $caja = CajaService::getCajaAbierta($user?->id);
            if (! $caja) {
                throw new \RuntimeException('No hay una caja abierta. Abre la caja o elige bóveda.');
            }
            $movimiento = MovimientoCaja::create([
                'caja_id' => $caja->id,
                'tipo' => 'decremento',
                'monto' => $monto,
                'concepto' => $concepto,
                'detalles_movimiento' => [
                    'tipo_operacion' => 'compra_finca',
                    'finca_id' => $finca->id,
                    'cuota_id' => $cuota->id,
                ],
                'estado' => 'aplicado',
                'user_id' => $user?->id,
            ]);
            $movimientoCajaId = $movimiento->id;
        } else {
            $boveda = Boveda::where('activa', true)->orderBy('id')->first();
            if (! $boveda) {
                throw new \RuntimeException('No hay una bóveda activa. Regístrala o elige caja.');
            }
            if ((float) $boveda->saldo_actual + 0.009 < $monto) {
                throw new \RuntimeException('La bóveda no tiene saldo suficiente para este pago.');
            }
            $movimiento = BovedaMovimiento::create([
                'boveda_id' => $boveda->id,
                'usuario_id' => $user?->id,
                'sucursal_id' => $boveda->sucursal_id,
                'tipo_movimiento' => 'salida',
                'monto' => $monto,
                'concepto' => $concepto,
                'referencia' => $recibo,
                'estado' => 'aprobado',
                'aprobado_por' => $user?->id,
                'fecha_aprobacion' => now(),
            ]);
            $boveda->saldo_actual = round((float) $boveda->saldo_actual - $monto, 2);
            $boveda->save();
            $bovedaMovimientoId = $movimiento->id;
        }

        $cuota->monto_pagado = round((float) $cuota->monto_pagado + $monto, 2);
        $cuota->estado = $cuota->monto_pagado + 0.009 >= (float) $cuota->monto ? 'pagada' : 'parcial';
        $cuota->save();

        return FincaCompraPago::create([
            'finca_id' => $finca->id,
            'cuota_id' => $cuota->id,
            'fecha' => $fecha ?: now()->toDateString(),
            'monto' => $monto,
            'origen' => $origen,
            'numero_recibo' => $recibo,
            'movimiento_caja_id' => $movimientoCajaId,
            'boveda_movimiento_id' => $bovedaMovimientoId,
            'user_id' => $user?->id,
        ]);
    }

    private function autorizarMutacion(Request $request, Finca $finca)
    {
        $user = $request->user();
        $tienePagos = $finca->pagosCompra()->exists()
            || $finca->cuotasCompra()->where('monto_pagado', '>', 0)->exists();
        if ($tienePagos) {
            if ($user && $user->hasPermission('compra_fincas', 'editar')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Esta compra ya tiene pagos. Para modificarla hace falta el permiso de editar.',
            ], 403);
        }

        if ($user && ($user->hasPermission('compra_fincas', 'editar') || $user->hasPermission('compra_fincas', 'crear'))) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'No tienes permiso para esta operación.',
        ], 403);
    }

    private function siguienteCodigoFinca(): string
    {
        $anio = date('Y');
        $ultimo = Finca::withTrashed()
            ->where('codigo', 'like', "FIN-{$anio}-%")
            ->orderByDesc('id')
            ->value('codigo');
        $n = 1;
        if ($ultimo && preg_match('/(\d+)$/', $ultimo, $m)) {
            $n = intval($m[1]) + 1;
        }

        return sprintf('FIN-%s-%03d', $anio, $n);
    }

    private function cargar($id): Finca
    {
        return Finca::with(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra'])->findOrFail($id);
    }

    private function lotes(Finca $finca)
    {
        return $finca->lotes()->with('parcela')->orderBy('codigo_unico')->get()->map(function (Lote $lote) {
            $costo = (float) $lote->costo_asignado;
            $sugerido = (float) $lote->precio_sugerido;
            $venta = (float) $lote->precio_venta;

            return [
                'id' => $lote->id,
                'codigo_unico' => $lote->codigo_unico,
                'numero_lote' => $lote->numero_lote,
                'parcela' => $lote->parcela?->nombre_identificador,
                'tipo_terreno' => $lote->tipo_terreno,
                'area_m2' => (float) $lote->area_m2,
                'frente_metros' => $lote->frente_metros !== null ? (float) $lote->frente_metros : null,
                'fondo_metros' => $lote->fondo_metros !== null ? (float) $lote->fondo_metros : null,
                'costo_asignado' => $costo,
                'precio_sugerido' => $sugerido,
                'precio_venta' => $venta,
                'utilidad' => round($sugerido - $costo, 2),
                'utilidad_venta' => round($venta - $costo, 2),
                'estado' => $lote->estado,
            ];
        })->values();
    }

}
