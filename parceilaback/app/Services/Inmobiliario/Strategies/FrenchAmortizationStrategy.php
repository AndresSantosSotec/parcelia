<?php

namespace App\Services\Inmobiliario\Strategies;

use App\Services\Inmobiliario\Contracts\InterestCalculationStrategyInterface;
use Carbon\Carbon;

/**
 * Estrategia de Amortización Francesa (Cuota fija sobre saldos deudores)
 * La fórmula estándar internacional para créditos y financiamientos de bienes raíces.
 */
class FrenchAmortizationStrategy implements InterestCalculationStrategyInterface
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

        $tasaMensual = ($tasaAnual / 100) / 12;
        
        // Si la tasa es 0% (Promoción o financiamiento directo sin interés)
        if ($tasaMensual == 0) {
            $cuotaFija = round($montoFinanciado / $plazoMeses, 2);
        } else {
            // Fórmula Francesa: R = P * [ i / (1 - (1 + i)^(-n)) ]
            $cuotaFija = round($montoFinanciado * ($tasaMensual / (1 - pow(1 + $tasaMensual, -$plazoMeses))), 2);
        }

        $cuotas = [];
        $saldoCapital = $montoFinanciado;
        $totalInteresAcumulado = 0.0;
        $fechaVencimiento = Carbon::parse($fechaInicio);

        for ($i = 1; $i <= $plazoMeses; $i++) {
            $interesCuota = $tasaMensual == 0 ? 0.0 : round($saldoCapital * $tasaMensual, 2);
            $capitalCuota = round($cuotaFija - $interesCuota, 2);

            // Ajuste en la última cuota para cuadrar redondeos
            if ($i === $plazoMeses) {
                $capitalCuota = round($saldoCapital, 2);
                $cuotaFijaReal = round($capitalCuota + $interesCuota, 2);
            } else {
                $cuotaFijaReal = $cuotaFija;
            }

            $saldoCapital = max(0.0, round($saldoCapital - $capitalCuota, 2));
            $totalInteresAcumulado += $interesCuota;

            $cuotas[] = [
                'numero_cuota' => $i,
                'tipo_cuota' => 'ordinaria',
                'fecha_vencimiento' => $fechaVencimiento->format('Y-m-d'),
                'cuota_capital' => $capitalCuota,
                'cuota_interes' => $interesCuota,
                'otros_cargos' => 0.0,
                'cuota_monto_total' => $cuotaFijaReal,
                'saldo_capital_restante' => $saldoCapital,
                'estado' => 'pendiente'
            ];

            $fechaVencimiento->addMonth();
        }

        return [
            'metodo' => 'frances_sobre_saldos',
            'monto_financiado' => round($montoFinanciado, 2),
            'tasa_anual' => $tasaAnual,
            'plazo_meses' => $plazoMeses,
            'cuota_mensual' => $cuotaFija,
            'total_intereses' => round($totalInteresAcumulado, 2),
            'total_a_pagar' => round($montoFinanciado + $totalInteresAcumulado, 2),
            'cuotas' => $cuotas
        ];
    }
}
