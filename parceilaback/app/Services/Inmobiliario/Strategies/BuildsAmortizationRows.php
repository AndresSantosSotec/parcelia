<?php

namespace App\Services\Inmobiliario\Strategies;

trait BuildsAmortizationRows
{
    protected function filaCuota(
        int $numero,
        string $fecha,
        float $saldoInicial,
        float $capital,
        float $interes,
        float $saldoRestante,
        string $tipo = 'ordinaria'
    ): array {
        return [
            'numero_cuota' => $numero,
            'tipo_cuota' => $tipo,
            'fecha_vencimiento' => $fecha,
            'saldo_inicial' => round($saldoInicial, 2),
            'cuota_capital' => round($capital, 2),
            'cuota_interes' => round($interes, 2),
            'otros_cargos' => 0.0,
            'cuota_monto_total' => round($capital + $interes, 2),
            'saldo_capital_restante' => round($saldoRestante, 2),
            'estado' => 'pendiente',
        ];
    }

    protected function resumen(string $metodo, float $financiado, float $tasa, int $plazo, float $cuotaRef, float $intereses, array $cuotas): array
    {
        return [
            'metodo' => $metodo,
            'monto_financiado' => round($financiado, 2),
            'tasa_anual' => $tasa,
            'plazo_meses' => $plazo,
            'cuota_mensual' => round($cuotaRef, 2),
            'total_intereses' => round($intereses, 2),
            'total_a_pagar' => round($financiado + $intereses, 2),
            'cuotas' => $cuotas,
        ];
    }

    protected function planVacio(float $financiado): array
    {
        return [
            'cuota_mensual' => 0.0,
            'total_intereses' => 0.0,
            'total_a_pagar' => $financiado,
            'cuotas' => [],
        ];
    }
}
