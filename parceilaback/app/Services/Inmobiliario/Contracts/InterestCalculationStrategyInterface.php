<?php

namespace App\Services\Inmobiliario\Contracts;

interface InterestCalculationStrategyInterface
{
    /**
     * Calcula la tabla de amortización para un financiamiento inmobiliario.
     *
     * @param float $montoFinanciado Monto de capital a financiar
     * @param float $tasaAnual Tasa de interés anual en porcentaje (ej: 6.0 = 6%)
     * @param int $plazoMeses Plazo total en meses
     * @param string $fechaInicio Fecha del primer pago (Y-m-d)
     * @param array $opciones Opciones adicionales (gastos recurrentes, días de gracia, etc.)
     * @return array Estructura con resumen financiero y desglose de cuotas
     */
    public function calcularPlan(
        float $montoFinanciado,
        float $tasaAnual,
        int $plazoMeses,
        string $fechaInicio,
        array $opciones = []
    ): array;
}
