<?php

namespace App\Services\Inmobiliario;

use App\Models\Negociacion;
use App\Models\PlanPagoTerreno;
use App\Services\Inmobiliario\Contracts\InterestCalculationStrategyInterface;
use App\Services\Inmobiliario\Strategies\AmericanAmortizationStrategy;
use App\Services\Inmobiliario\Strategies\FlatInterestStrategy;
use App\Services\Inmobiliario\Strategies\FrenchAmortizationStrategy;
use App\Services\Inmobiliario\Strategies\GermanAmortizationStrategy;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinancingService
{
    public function getStrategy(string $metodo = 'frances'): InterestCalculationStrategyInterface
    {
        return match (strtolower($metodo)) {
            'aleman', 'german' => new GermanAmortizationStrategy(),
            'americano', 'american', 'bullet' => new AmericanAmortizationStrategy(),
            'plano', 'flat', 'simple' => new FlatInterestStrategy(),
            default => new FrenchAmortizationStrategy(),
        };
    }

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

        $resultado = $this->getStrategy($metodo)->calcularPlan($montoFinanciado, $tasaAnual, $plazoMeses, $fechaInicio);

        return array_merge([
            'precio_original' => round($precioLote, 2),
            'descuento' => round($descuento, 2),
            'gastos_escrituracion' => round($gastosEscrituracion, 2),
            'gastos_administrativos' => round($gastosAdministrativos, 2),
            'precio_final' => $precioFinal,
            'enganche' => round($enganche, 2),
            'porcentaje_enganche' => $precioFinal > 0 ? round(($enganche / $precioFinal) * 100, 2) : 0,
            'sistema_amortizacion' => strtolower($metodo),
        ], $resultado);
    }

    public function generarPlanParaNegociacion(Negociacion $negociacion, ?string $metodo = null): array
    {
        return DB::transaction(function () use ($negociacion, $metodo) {
            PlanPagoTerreno::where('negociacion_id', $negociacion->id)
                ->where('estado', 'pendiente')
                ->delete();

            $metodo = $metodo ?? $negociacion->sistema_amortizacion ?? 'frances';
            $fechaInicio = $negociacion->fecha_primer_pago
                ? Carbon::parse($negociacion->fecha_primer_pago)->format('Y-m-d')
                : Carbon::now()->addMonth()->format('Y-m-d');

            $simulacion = $this->getStrategy($metodo)->calcularPlan(
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
                    'saldo_inicial' => $c['saldo_inicial'] ?? 0,
                    'cuota_capital' => $c['cuota_capital'],
                    'cuota_interes' => $c['cuota_interes'],
                    'otros_cargos' => $c['otros_cargos'] ?? 0.0,
                    'cuota_monto_total' => $c['cuota_monto_total'],
                    'saldo_capital_restante' => $c['saldo_capital_restante'],
                    'monto_pagado' => 0.0,
                    'capital_pagado' => 0.0,
                    'interes_pagado' => 0.0,
                    'mora_pagada' => 0.0,
                    'mora_proyectada' => 0.0,
                    'otros_cargos_pagados' => 0.0,
                    'estado' => 'pendiente',
                ]);
            }

            $this->prorratearGastosEnPlan($negociacion);

            $primera = PlanPagoTerreno::where('negociacion_id', $negociacion->id)->orderBy('numero_cuota')->first();
            $negociacion->sistema_amortizacion = strtolower($metodo);
            $negociacion->cuota_mensual = $primera
                ? (float) $primera->cuota_monto_total
                : $simulacion['cuota_mensual'];
            $totalGastos = (float) $negociacion->gastos->sum(function ($gasto) {
                return (float) ($gasto->pivot->valor_calculado ?? 0);
            });
            $negociacion->total_intereses_proyectados = $simulacion['total_intereses'];
            $negociacion->total_a_pagar = (float) $negociacion->enganche_pactado + (float) $simulacion['total_a_pagar'] + $totalGastos;
            $negociacion->cuotas_pendientes = $negociacion->plazo_meses;
            $negociacion->cuotas_pagadas = 0;
            $negociacion->save();

            return $simulacion;
        });
    }

    private function prorratearGastosEnPlan(Negociacion $negociacion): void
    {
        $negociacion->load('gastos');
        $totalGastos = (float) $negociacion->gastos->sum(function ($gasto) {
            return (float) ($gasto->pivot->valor_calculado ?? 0);
        });

        $pagado = (float) PlanPagoTerreno::where('negociacion_id', $negociacion->id)->sum('otros_cargos_pagados');
        $pendiente = max(0.0, round($totalGastos - $pagado, 2));

        $cuotas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->whereIn('estado', ['pendiente', 'parcial', 'vencida'])
            ->orderBy('numero_cuota')
            ->get();

        if ($cuotas->isEmpty() || $pendiente <= 0) {
            return;
        }

        $n = $cuotas->count();
        $porCuota = round($pendiente / $n, 2);
        $acumulado = 0.0;

        foreach ($cuotas->values() as $index => $cuota) {
            $gastoEnCuota = ($index === $n - 1)
                ? round($pendiente - $acumulado, 2)
                : $porCuota;
            $acumulado += $porCuota;

            $yaPagado = (float) ($cuota->otros_cargos_pagados ?? 0);
            $cuota->otros_cargos = round($gastoEnCuota + $yaPagado, 2);
            $cuota->cuota_monto_total = round(
                (float) $cuota->cuota_capital + (float) $cuota->cuota_interes + (float) $cuota->otros_cargos,
                2
            );
            $cuota->save();
        }
    }
}
