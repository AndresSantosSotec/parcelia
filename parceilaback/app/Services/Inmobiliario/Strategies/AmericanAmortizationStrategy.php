<?php

namespace App\Services\Inmobiliario\Strategies;

use App\Services\Inmobiliario\Contracts\InterestCalculationStrategyInterface;
use Carbon\Carbon;

/**
 * Sistema americano (bullet): solo intereses hasta la última cuota, que liquida el capital.
 */
class AmericanAmortizationStrategy implements InterestCalculationStrategyInterface
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
            return $this->planVacio($montoFinanciado);
        }

        $paso = $this->pasoMeses($opciones);
        $tasaPeriodo = ($tasaAnual / 100) * ($paso / 12);
        $interesPeriodo = $tasaPeriodo == 0 ? 0.0 : round($montoFinanciado * $tasaPeriodo, 2);
        $cuotas = [];
        $fecha = Carbon::parse($fechaInicio);
        $totalInteres = 0.0;

        for ($i = 1; $i <= $plazoMeses; $i++) {
            $esUltima = $i === $plazoMeses;
            $capital = $esUltima ? round($montoFinanciado, 2) : 0.0;
            $saldoRestante = $esUltima ? 0.0 : $montoFinanciado;
            $totalInteres += $interesPeriodo;
            $cuotas[] = $this->filaCuota(
                $i,
                $fecha->format('Y-m-d'),
                $montoFinanciado,
                $capital,
                $interesPeriodo,
                $saldoRestante,
                $esUltima ? 'ordinaria' : 'ordinaria'
            );
            $fecha->addMonths($paso);
        }

        return $this->resumen(
            'americano_bullet',
            $montoFinanciado,
            $tasaAnual,
            $plazoMeses,
            $interesPeriodo,
            $totalInteres,
            $cuotas
        );
    }
}
