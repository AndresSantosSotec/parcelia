<?php

namespace App\Services\Inmobiliario;

use App\Services\Inmobiliario\Contracts\InterestCalculationStrategyInterface;
use App\Services\Inmobiliario\Strategies\FrenchAmortizationStrategy;
use App\Services\Inmobiliario\Strategies\FlatInterestStrategy;
use App\Models\Negociacion;
use App\Models\PlanPagoTerreno;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinancingService
{
    /**
     * Resuelve la estrategia adecuada según la configuración o parámetro.
     */
    public function getStrategy(string $metodo = 'frances'): InterestCalculationStrategyInterface
    {
        return match (strtolower($metodo)) {
            'plano', 'flat', 'simple' => new FlatInterestStrategy(),
            default => new FrenchAmortizationStrategy(),
        };
    }

    /**
     * Simula el plan de pagos en memoria sin persistir en base de datos.
     */
    public function simularFinanciamiento(
        float $precioLote,
        float $descuento = 0.0,
        float $gastosEscrituracion = 0.0,
        float $gastosAdministrativos = 0.0,
        float $enganche = 0.0,
        float $tasaAnual = 6.0,
        int $plazoMeses = 12,
        string $metodo = 'frances',
        ?string $fechaPrimerPago = null
    ): array {
        $precioFinal = max(0.0, round($precioLote - $descuento + $gastosEscrituracion + $gastosAdministrativos, 2));
        $montoFinanciado = max(0.0, round($precioFinal - $enganche, 2));
        $fechaInicio = $fechaPrimerPago ?? Carbon::now()->addMonth()->format('Y-m-d');

        $strategy = $this->getStrategy($metodo);
        $resultado = $strategy->calcularPlan($montoFinanciado, $tasaAnual, $plazoMeses, $fechaInicio);

        return array_merge([
            'precio_original' => round($precioLote, 2),
            'descuento' => round($descuento, 2),
            'gastos_escrituracion' => round($gastosEscrituracion, 2),
            'gastos_administrativos' => round($gastosAdministrativos, 2),
            'precio_final' => $precioFinal,
            'enganche' => round($enganche, 2),
            'porcentaje_enganche' => $precioFinal > 0 ? round(($enganche / $precioFinal) * 100, 2) : 0,
        ], $resultado);
    }

    /**
     * Genera y guarda físicamente las cuotas del plan de pagos en base de datos.
     */
    public function generarPlanParaNegociacion(Negociacion $negociacion, string $metodo = 'frances'): array
    {
        return DB::transaction(function () use ($negociacion, $metodo) {
            // Eliminar cuotas anteriores pendientes si existieran
            PlanPagoTerreno::where('negociacion_id', $negociacion->id)->delete();

            $fechaInicio = $negociacion->fecha_primer_pago ?? Carbon::now()->addMonth()->format('Y-m-d');
            $strategy = $this->getStrategy($metodo);
            
            $simulacion = $strategy->calcularPlan(
                (float) $negociacion->monto_financiado,
                (float) $negociacion->tasa_interes_anual,
                (int) $negociacion->plazo_meses,
                $fechaInicio
            );

            foreach ($simulacion['cuotas'] as $c) {
                PlanPagoTerreno::create([
                    'negociacion_id' => $negociacion->id,
                    'numero_cuota' => $c['numero_cuota'],
                    'tipo_cuota' => $c['tipo_cuota'],
                    'fecha_vencimiento' => $c['fecha_vencimiento'],
                    'cuota_capital' => $c['cuota_capital'],
                    'cuota_interes' => $c['cuota_interes'],
                    'otros_cargos' => $c['otros_cargos'] ?? 0.0,
                    'cuota_monto_total' => $c['cuota_monto_total'],
                    'saldo_capital_restante' => $c['saldo_capital_restante'],
                    'monto_pagado' => 0.0,
                    'capital_pagado' => 0.0,
                    'interes_pagado' => 0.0,
                    'mora_pagada' => 0.0,
                    'estado' => 'pendiente',
                ]);
            }

            // Actualizar resumen en la negociación
            $negociacion->cuota_mensual = $simulacion['cuota_mensual'];
            $negociacion->total_intereses_proyectados = $simulacion['total_intereses'];
            $negociacion->total_a_pagar = $simulacion['total_a_pagar'];
            $negociacion->saldo_capital_pendiente = $negociacion->monto_financiado;
            $negociacion->cuotas_pendientes = $negociacion->plazo_meses;
            $negociacion->cuotas_pagadas = 0;
            $negociacion->save();

            return $simulacion;
        });
    }
}
