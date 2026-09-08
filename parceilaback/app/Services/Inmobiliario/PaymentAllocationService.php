<?php

namespace App\Services\Inmobiliario;

use App\Models\Negociacion;
use App\Models\PlanPagoTerreno;
use App\Models\PagoTerreno;
use App\Models\CajaAperturaCierre;
use App\Models\MovimientoCaja;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PaymentAllocationService
{
    /**
     * Procesa un cobro/pago para una negociación inmobiliaria.
     */
    public function procesarPago(
        Negociacion $negociacion,
        float $montoTotal,
        string $tipoPago = 'cuota_normal', // 'enganche', 'cuota_normal', 'abono_capital', 'liquidacion_total'
        string $metodoPago = 'efectivo',
        ?string $referenciaBancaria = null,
        ?string $concepto = null,
        ?string $observaciones = null,
        ?int $cajaAperturaId = null
    ): PagoTerreno {
        return DB::transaction(function () use (
            $negociacion,
            $montoTotal,
            $tipoPago,
            $metodoPago,
            $referenciaBancaria,
            $concepto,
            $observaciones,
            $cajaAperturaId
        ) {
            if ($montoTotal <= 0) {
                throw new \InvalidArgumentException('El monto a pagar debe ser mayor a cero.');
            }

            $userId = Auth::id() ?? $negociacion->user_id ?? 1;

            // Verificar o asociar caja activa si existe
            if (!$cajaAperturaId) {
                $cajaAbierta = CajaAperturaCierre::where('estado', 'abierta')->latest()->first();
                $cajaAperturaId = $cajaAbierta?->id;
            }

            $saldoAnterior = (float) $negociacion->saldo_capital_pendiente;
            $distribucionCapital = 0.0;
            $distribucionInteres = 0.0;
            $distribucionMora = 0.0;
            $distribucionGastos = 0.0;

            // Generar correlativo de recibo
            $correlativo = PagoTerreno::whereDate('created_at', Carbon::today())->count() + 1;
            $numeroRecibo = 'REC-TER-' . Carbon::now()->format('Ymd') . '-' . str_pad($correlativo, 4, '0', STR_PAD_LEFT);

            // 1. CASO ENGANCHE
            if ($tipoPago === 'enganche') {
                $distribucionCapital = $montoTotal;
                $negociacion->enganche_pagado = (float) $negociacion->enganche_pagado + $montoTotal;
                $saldoPosterior = $saldoAnterior; // El saldo financiado ya descuenta el enganche
            }
            // 2. CASO ABONO EXTRAORDINARIO DIRECTO A CAPITAL
            elseif ($tipoPago === 'abono_capital') {
                $distribucionCapital = min($montoTotal, $saldoAnterior);
                $saldoPosterior = max(0.0, $saldoAnterior - $distribucionCapital);
                $negociacion->saldo_capital_pendiente = $saldoPosterior;
                $negociacion->total_capital_pagado = (float) $negociacion->total_capital_pagado + $distribucionCapital;

                // Si el saldo llega a 0, marcar todas las cuotas restantes como saldadas
                if ($saldoPosterior <= 0.01) {
                    PlanPagoTerreno::where('negociacion_id', $negociacion->id)
                        ->where('estado', '!=', 'pagada')
                        ->update(['estado' => 'pagada', 'fecha_pagado' => Carbon::now()->format('Y-m-d')]);
                    $negociacion->estado = 'pagada_total';
                    $negociacion->lote->update(['estado' => 'pagado']);
                }
            }
            // 3. CASO CUOTA NORMAL / LIQUIDACIÓN CON PRELACIÓN
            else {
                $montoRestante = $montoTotal;

                // Obtener cuotas pendientes cronológicamente
                $cuotasPendientes = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
                    ->whereIn('estado', ['pendiente', 'vencida', 'pagada_parcial'])
                    ->orderBy('numero_cuota', 'asc')
                    ->get();

                foreach ($cuotasPendientes as $cuota) {
                    if ($montoRestante <= 0) break;

                    // 1. Mora de la cuota
                    $moraPend = (float) $cuota->cuota_interes * 0; // TODO: PENDING_DEFINITION regla exacta de mora
                    if ($moraPend > 0 && $montoRestante > 0) {
                        $pagoMora = min($montoRestante, $moraPend);
                        $distribucionMora += $pagoMora;
                        $montoRestante -= $pagoMora;
                    }

                    // 2. Interés de la cuota
                    $interesPend = max(0.0, (float) $cuota->cuota_interes - (float) $cuota->interes_pagado);
                    if ($interesPend > 0 && $montoRestante > 0) {
                        $pagoInteres = min($montoRestante, $interesPend);
                        $distribucionInteres += $pagoInteres;
                        $cuota->interes_pagado = (float) $cuota->interes_pagado + $pagoInteres;
                        $montoRestante -= $pagoInteres;
                    }

                    // 3. Capital de la cuota
                    $capitalPend = max(0.0, (float) $cuota->cuota_capital - (float) $cuota->capital_pagado);
                    if ($capitalPend > 0 && $montoRestante > 0) {
                        $pagoCapital = min($montoRestante, $capitalPend);
                        $distribucionCapital += $pagoCapital;
                        $cuota->capital_pagado = (float) $cuota->capital_pagado + $pagoCapital;
                        $montoRestante -= $pagoCapital;
                    }

                    // Determinar estado de la cuota
                    $cuota->monto_pagado = (float) $cuota->capital_pagado + (float) $cuota->interes_pagado;
                    if ($cuota->monto_pagado >= (float) $cuota->cuota_monto_total - 0.05) {
                        $cuota->estado = 'pagada';
                        $cuota->fecha_pagado = Carbon::now()->format('Y-m-d');
                    } else {
                        $cuota->estado = 'pagada_parcial';
                    }
                    $cuota->save();
                }

                // Si aún sobra dinero tras cubrir cuotas proyectadas, aplicar como abono a capital directo
                if ($montoRestante > 0) {
                    $distribucionCapital += $montoRestante;
                }

                $saldoPosterior = max(0.0, $saldoAnterior - $distribucionCapital);
                $negociacion->saldo_capital_pendiente = $saldoPosterior;
                $negociacion->total_capital_pagado = (float) $negociacion->total_capital_pagado + $distribucionCapital;
                $negociacion->total_interes_pagado = (float) $negociacion->total_interes_pagado + $distribucionInteres;
                $negociacion->total_mora_pagada = (float) $negociacion->total_mora_pagada + $distribucionMora;

                // Contar cuotas pagadas
                $cuotasPagadasCount = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
                    ->where('estado', 'pagada')
                    ->count();
                $negociacion->cuotas_pagadas = $cuotasPagadasCount;
                $negociacion->cuotas_pendientes = max(0, $negociacion->plazo_meses - $cuotasPagadasCount);

                if ($saldoPosterior <= 0.05) {
                    $negociacion->estado = 'pagada_total';
                    $negociacion->lote->update(['estado' => 'pagado']);
                }
            }

            $negociacion->save();

            // 4. Crear registro inmutable de PagoTerreno
            $pago = PagoTerreno::create([
                'negociacion_id' => $negociacion->id,
                'cliente_id' => $negociacion->cliente_id,
                'lote_id' => $negociacion->lote_id,
                'caja_apertura_cierre_id' => $cajaAperturaId,
                'user_id' => $userId,
                'numero_recibo' => $numeroRecibo,
                'tipo_pago' => $tipoPago,
                'monto_total' => $montoTotal,
                'distribucion_capital' => round($distribucionCapital, 2),
                'distribucion_interes' => round($distribucionInteres, 2),
                'distribucion_mora' => round($distribucionMora, 2),
                'distribucion_gastos' => round($distribucionGastos, 2),
                'saldo_anterior' => round($saldoAnterior, 2),
                'saldo_posterior' => round($saldoPosterior, 2),
                'metodo_pago' => $metodoPago,
                'referencia_bancaria' => $referenciaBancaria,
                'fecha_pago' => Carbon::now(),
                'concepto' => $concepto ?? "Pago de terreno - Recibo {$numeroRecibo}",
                'observaciones' => $observaciones,
            ]);

            // 5. Registrar en Caja si hay sesión abierta
            if ($cajaAperturaId) {
                MovimientoCaja::create([
                    'caja_id' => $cajaAperturaId,
                    'tipo' => 'ingreso_pago',
                    'concepto' => "Pago Inmobiliario Lote {$negociacion->lote->numero_lote} ({$numeroRecibo})",
                    'monto' => $montoTotal,
                    'user_id' => $userId,
                    'estado' => 'aplicado',
                ]);
            }

            return $pago;
        });
    }
}
