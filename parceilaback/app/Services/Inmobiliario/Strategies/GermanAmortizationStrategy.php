<?php

namespace App\Services\Inmobiliario\Strategies;

use App\Services\Inmobiliario\Contracts\InterestCalculationStrategyInterface;
use Carbon\Carbon;

/**
 * Sistema alemán: capital fijo por cuota; la cuota total decrece.
 */
class GermanAmortizationStrategy implements InterestCalculationStrategyInterface
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
        $capitalFijo = round($montoFinanciado / $plazoMeses, 2);
        $saldo = $montoFinanciado;
        $totalInteres = 0.0;
        $cuotas = [];
        $fecha = Carbon::parse($fechaInicio);
        $primeraCuota = 0.0;

        for ($i = 1; $i <= $plazoMeses; $i++) {
            $saldoInicial = $saldo;
            $interes = $tasaPeriodo == 0 ? 0.0 : round($saldo * $tasaPeriodo, 2);
            $capital = ($i === $plazoMeses) ? round($saldo, 2) : $capitalFijo;
            $saldo = max(0.0, round($saldo - $capital, 2));
            $totalInteres += $interes;
            $fila = $this->filaCuota($i, $fecha->format('Y-m-d'), $saldoInicial, $capital, $interes, $saldo);
            if ($i === 1) {
                $primeraCuota = $fila['cuota_monto_total'];
            }
            $cuotas[] = $fila;
            $fecha->addMonths($paso);
        }

        return $this->resumen('aleman_capital_fijo', $montoFinanciado, $tasaAnual, $plazoMeses, $primeraCuota, $totalInteres, $cuotas);
    }
}
