<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PagoTerreno;
use App\Models\Negociacion;
use App\Models\PlanPagoTerreno;
use App\Models\Lote;
use App\Models\CajaAperturaCierre;
use App\Models\MovimientoCaja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PagoTerrenoController extends Controller
{
    public function index(Request $request)
    {
        $query = PagoTerreno::with(['comprador', 'lote.parcela.finca', 'usuario', 'negociacion']);

        if ($request->filled('negociacion_id')) {
            $query->where('negociacion_id', $request->negociacion_id);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        $pagos = $query->orderBy('fecha_pago', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $pagos,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'negociacion_id' => 'required|exists:negociaciones,id',
            'tipo_pago' => 'required|in:enganche,cuota_normal,abono_capital,pago_total,gastos_escritura,mora',
            'monto' => 'required|numeric|min:0.01',
            'metodo_pago' => 'required|in:efectivo,transferencia,deposito,cheque,tarjeta',
            'referencia_bancaria' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string',
            'caja_apertura_cierre_id' => 'nullable|exists:caja_apertura_cierres,id',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $negociacion = Negociacion::lockForUpdate()->with(['lote', 'comprador', 'planPagos'])->findOrFail($validated['negociacion_id']);

            $monto = (float) $validated['monto'];
            $tipoPago = $validated['tipo_pago'];
            $saldoAnterior = (float) $negociacion->saldo_capital_pendiente;

            if ($monto > $saldoAnterior && $tipoPago !== 'gastos_escritura') {
                $monto = $saldoAnterior; // Ajustar al saldo pendiente exacto
            }

            $distCapital = 0;
            $distInteres = 0;
            $distMora = 0;
            $distGastos = 0;

            if ($tipoPago === 'enganche') {
                $distCapital = $monto;
                $negociacion->enganche_pagado += $monto;
            } elseif ($tipoPago === 'abono_capital' || $tipoPago === 'pago_total') {
                $distCapital = $monto;
            } elseif ($tipoPago === 'gastos_escritura') {
                $distGastos = $monto;
            } else {
                // Cuota normal: amortizar cuotas pendientes en orden
                $montoRestante = $monto;
                $cuotasPendientes = $negociacion->planPagos()
                    ->whereIn('estado', ['pendiente', 'parcial'])
                    ->orderBy('numero_cuota')
                    ->get();

                foreach ($cuotasPendientes as $cuota) {
                    if ($montoRestante <= 0) break;

                    $interesPendiente = (float) $cuota->cuota_interes - (float) $cuota->interes_pagado;
                    $capitalPendiente = (float) $cuota->cuota_capital - (float) $cuota->capital_pagado;

                    // Pagar interés primero
                    $pagoInteres = min($montoRestante, $interesPendiente);
                    $cuota->interes_pagado += $pagoInteres;
                    $distInteres += $pagoInteres;
                    $montoRestante -= $pagoInteres;

                    // Pagar capital
                    if ($montoRestante > 0) {
                        $pagoCapital = min($montoRestante, $capitalPendiente);
                        $cuota->capital_pagado += $pagoCapital;
                        $distCapital += $pagoCapital;
                        $montoRestante -= $pagoCapital;
                    }

                    $cuota->monto_pagado = $cuota->capital_pagado + $cuota->interes_pagado;
                    if ($cuota->monto_pagado >= $cuota->cuota_monto_total) {
                        $cuota->estado = 'pagada';
                        $cuota->fecha_pagado = Carbon::now()->format('Y-m-d');
                    } else {
                        $cuota->estado = 'parcial';
                    }
                    $cuota->save();
                }

                // Si sobró saldo de este pago, entra como abono a capital
                if ($montoRestante > 0) {
                    $distCapital += $montoRestante;
                }
            }

            $saldoPosterior = max(0, round($saldoAnterior - $distCapital, 2));

            // Actualizar negociación
            $negociacion->total_capital_pagado += $distCapital;
            $negociacion->total_interes_pagado += $distInteres;
            $negociacion->total_mora_pagada += $distMora;
            $negociacion->saldo_capital_pendiente = $saldoPosterior;

            if ($saldoPosterior <= 0) {
                $negociacion->estado = 'pagada_total';
                $negociacion->lote->update(['estado' => 'pagado']);
            }
            $negociacion->save();

            // Generar correlativo de recibo
            $consecutivo = PagoTerreno::count() + 1;
            $numeroRecibo = 'REC-TER-' . date('Y') . '-' . str_pad($consecutivo, 5, '0', STR_PAD_LEFT);

            // Registrar el Pago inmutable
            $pago = PagoTerreno::create([
                'numero_recibo' => $numeroRecibo,
                'negociacion_id' => $negociacion->id,
                'cliente_id' => $negociacion->cliente_id,
                'lote_id' => $negociacion->lote_id,
                'caja_apertura_cierre_id' => $validated['caja_apertura_cierre_id'] ?? null,
                'user_id' => $request->user()->id ?? 1,
                'tipo_pago' => $tipoPago,
                'monto_total' => $monto,
                'distribucion_capital' => $distCapital,
                'distribucion_interes' => $distInteres,
                'distribucion_mora' => $distMora,
                'distribucion_gastos' => $distGastos,
                'saldo_anterior' => $saldoAnterior,
                'saldo_posterior' => $saldoPosterior,
                'metodo_pago' => $validated['metodo_pago'],
                'referencia_bancaria' => $validated['referencia_bancaria'] ?? null,
                'fecha_pago' => Carbon::now(),
                'concepto' => "Pago de {$tipoPago} - Lote: {$negociacion->lote->codigo_unico} - Comprador: {$negociacion->comprador->nombre_completo}",
                'observaciones' => $validated['observaciones'] ?? null,
            ]);

            // Integración con Caja si hay caja abierta
            if (!empty($validated['caja_apertura_cierre_id'])) {
                MovimientoCaja::create([
                    'caja_apertura_cierre_id' => $validated['caja_apertura_cierre_id'],
                    'tipo' => 'ingreso',
                    'concepto' => "Ingreso por Venta de Terreno {$pago->numero_recibo}",
                    'monto' => $monto,
                    'metodo_pago' => $validated['metodo_pago'],
                    'usuario_id' => $request->user()->id ?? 1,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $pago->load(['comprador', 'lote.parcela.finca']),
                'message' => 'Pago registrado y aplicado exitosamente.',
            ], 201);
        });
    }
}
