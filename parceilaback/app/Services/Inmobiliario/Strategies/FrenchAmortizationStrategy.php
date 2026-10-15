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
    use BuildsAmortizationRows;

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

        $paso = $this->pasoMeses($opciones);
        $tasaPeriodo = ($tasaAnual / 100) * ($paso / 12);

        // Si la tasa es 0% (Promoción o financiamiento directo sin interés)
        if ($tasaPeriodo == 0) {
            $cuotaFija = round($montoFinanciado / $plazoMeses, 2);
        } else {
            // Fórmula Francesa: R = P * [ i / (1 - (1 + i)^(-n)) ]
            $cuotaFija = round($montoFinanciado * ($tasaPeriodo / (1 - pow(1 + $tasaPeriodo, -$plazoMeses))), 2);
        }

        $cuotas = [];
        $saldoCapital = $montoFinanciado;
        $totalInteresAcumulado = 0.0;
        $fechaVencimiento = Carbon::parse($fechaInicio);

        for ($i = 1; $i <= $plazoMeses; $i++) {
            $saldoInicial = $saldoCapital;
            $interesCuota = $tasaPeriodo == 0 ? 0.0 : round($saldoCapital * $tasaPeriodo, 2);
            $capitalCuota = round($cuotaFija - $interesCuota, 2);

            if ($i === $plazoMeses) {
                $capitalCuota = round($saldoCapital, 2);
            }

            $saldoCapital = max(0.0, round($saldoCapital - $capitalCuota, 2));
            $totalInteresAcumulado += $interesCuota;
            $cuotas[] = $this->filaCuota($i, $fechaVencimiento->format('Y-m-d'), $saldoInicial, $capitalCuota, $interesCuota, $saldoCapital);
            $fechaVencimiento->addMonths($paso);
        }

        return $this->resumen('frances_sobre_saldos', $montoFinanciado, $tasaAnual, $plazoMeses, $cuotaFija, $totalInteresAcumulado, $cuotas);
    }
}
