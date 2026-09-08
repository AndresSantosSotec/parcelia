<?php

namespace Tests\Feature;

use App\Services\Inmobiliario\FinancingService;
use App\Services\Inmobiliario\MoraTerrenoService;
use App\Models\ParametrizacionMoraInmobiliaria;
use App\Models\PlanPagoTerreno;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AmortizacionTerrenoTest extends TestCase
{
    use RefreshDatabase;

    public function test_frances_cuota_constante_y_ultima_cierra_saldo(): void
    {
        $plan = (new FinancingService())->getStrategy('frances')->calcularPlan(80000, 12, 24, '2026-10-01');

        $this->assertCount(24, $plan['cuotas']);
        $primera = $plan['cuotas'][0]['cuota_monto_total'];
        $segunda = $plan['cuotas'][1]['cuota_monto_total'];
        $this->assertEqualsWithDelta($primera, $segunda, 0.02);
        $this->assertEquals(0.0, $plan['cuotas'][23]['saldo_capital_restante']);
        $this->assertGreaterThan($plan['cuotas'][23]['cuota_interes'], $plan['cuotas'][0]['cuota_interes']);
    }

    public function test_aleman_cuota_decrece_capital_fijo(): void
    {
        $plan = (new FinancingService())->getStrategy('aleman')->calcularPlan(80000, 12, 24, '2026-10-01');
        $this->assertGreaterThan($plan['cuotas'][1]['cuota_monto_total'], $plan['cuotas'][0]['cuota_monto_total']);
        $this->assertEqualsWithDelta($plan['cuotas'][0]['cuota_capital'], $plan['cuotas'][1]['cuota_capital'], 0.02);
        $this->assertEquals(0.0, $plan['cuotas'][23]['saldo_capital_restante']);
    }

    public function test_americano_solo_intereses_hasta_el_final(): void
    {
        $plan = (new FinancingService())->getStrategy('americano')->calcularPlan(80000, 12, 24, '2026-10-01');
        $this->assertEquals(0.0, $plan['cuotas'][0]['cuota_capital']);
        $this->assertEqualsWithDelta(80000, $plan['cuotas'][23]['cuota_capital'], 0.05);
        $this->assertEquals(0.0, $plan['cuotas'][23]['saldo_capital_restante']);
    }

    public function test_mora_porcentaje_sobre_capital_vencido(): void
    {
        $config = ParametrizacionMoraInmobiliaria::create([
            'nombre' => 'test %',
            'tipo_calculo' => 'porcentaje_capital_vencido',
            'porcentaje_diario' => 1,
            'monto_fijo_diario' => 0,
            'dias_gracia' => 0,
            'activo' => true,
        ]);

        $cuota = new PlanPagoTerreno([
            'cuota_capital' => 1000,
            'capital_pagado' => 0,
            'cuota_interes' => 100,
            'interes_pagado' => 0,
            'mora_pagada' => 0,
            'fecha_vencimiento' => now()->subDays(10)->format('Y-m-d'),
            'estado' => 'pendiente',
        ]);

        $mora = (new MoraTerrenoService())->recalcularCuota($cuota, $config, now());
        $this->assertEqualsWithDelta(100.0, $mora, 0.05);
    }

    public function test_mora_monto_fijo_diario(): void
    {
        $config = ParametrizacionMoraInmobiliaria::create([
            'nombre' => 'test fijo',
            'tipo_calculo' => 'monto_fijo_diario',
            'porcentaje_diario' => 0,
            'monto_fijo_diario' => 25,
            'dias_gracia' => 0,
            'activo' => true,
        ]);

        $cuota = new PlanPagoTerreno([
            'cuota_capital' => 1000,
            'capital_pagado' => 0,
            'mora_pagada' => 0,
            'fecha_vencimiento' => now()->subDays(4)->format('Y-m-d'),
            'estado' => 'pendiente',
        ]);

        $mora = (new MoraTerrenoService())->recalcularCuota($cuota, $config, now());
        $this->assertEqualsWithDelta(100.0, $mora, 0.05);
    }
}
