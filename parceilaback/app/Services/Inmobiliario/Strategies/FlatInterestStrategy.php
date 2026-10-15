<?php

namespace App\Services\Inmobiliario\Strategies;

use App\Services\Inmobiliario\Contracts\InterestCalculationStrategyInterface;
use Carbon\Carbon;

/**
 * Estrategia de Interés Plano / Simple (Flat Rate)
 * El interés total se calcula directamente sobre el monto original y se divide uniformemente entre las cuotas.
 */
class FlatInterestStrategy implements InterestCalculationStrategyInterface
{
    public function calcularPlan(
        float $montoFinanciado,
        float $tasaAnual,
        int $plazoMeses,
        string $fechaInicio,
        array $opciones = []
    ): array {
        if ($montoFinanciado <= 0 || $plazoMeses <= 0) {
            return [
                'cuota_mensual' => 0.0,
                'total_intereses' => 0.0,
                'total_a_pagar' => $montoFinanciado,
                'cuotas' => []
            ];
        }

        $paso = max(1, min(12, (int) ($opciones['meses_periodo'] ?? 1)));
        // Interés Total = Principal * (TasaAnual / 100) * (duración en años)
        $anios = ($plazoMeses * $paso) / 12;
        $totalInteres = round($montoFinanciado * ($tasaAnual / 100) * $anios, 2);
        $totalPagar = $montoFinanciado + $totalInteres;

        $capitalPorCuota = round($montoFinanciado / $plazoMeses, 2);
        $interesPorCuota = round($totalInteres / $plazoMeses, 2);
        $cuotaMensual = round($capitalPorCuota + $interesPorCuota, 2);

        $cuotas = [];
        $saldoCapital = $montoFinanciado;
        $fechaVencimiento = Carbon::parse($fechaInicio);

        for ($i = 1; $i <= $plazoMeses; $i++) {
            if ($i === $plazoMeses) {
                $capitalCuota = round($saldoCapital, 2);
                $cuotaReal = round($capitalCuota + $interesPorCuota, 2);
            } else {
                $capitalCuota = $capitalPorCuota;
                $cuotaReal = $cuotaMensual;
            }

            $saldoCapital = max(0.0, round($saldoCapital - $capitalCuota, 2));

            $cuotas[] = [
                'numero_cuota' => $i,
                'tipo_cuota' => 'ordinaria',
                'fecha_vencimiento' => $fechaVencimiento->format('Y-m-d'),
                'cuota_capital' => $capitalCuota,
                'cuota_interes' => $interesPorCuota,
                'otros_cargos' => 0.0,
                'cuota_monto_total' => $cuotaReal,
                'saldo_capital_restante' => $saldoCapital,
                'estado' => 'pendiente'
            ];

            $fechaVencimiento->addMonths($paso);
        }

        return [
            'metodo' => 'interes_plano_simple',
            'monto_financiado' => round($montoFinanciado, 2),
            'tasa_anual' => $tasaAnual,
            'plazo_meses' => $plazoMeses,
            'cuota_mensual' => $cuotaMensual,
            'total_intereses' => round($totalInteres, 2),
            'total_a_pagar' => round($totalPagar, 2),
            'cuotas' => $cuotas
        ];
    }
}
