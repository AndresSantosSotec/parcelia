<?php

namespace Tests\Unit;

use App\Services\Inmobiliario\FinancingService;
use PHPUnit\Framework\TestCase;

class PeriodoPagoTest extends TestCase
{
    public function test_trimestral_de_24_meses_genera_ocho_cuotas(): void
    {
        $plan = (new FinancingService())->simularFinanciamiento(
            200000,
            0,
            0,
            0,
            20000,
            12,
            24,
            'frances',
            '2026-02-15',
            'trimestral'
        );

        $this->assertSame('trimestral', $plan['periodo_pago']);
        $this->assertSame(24, $plan['plazo_meses']);
        $this->assertSame(8, $plan['numero_cuotas']);
        $this->assertCount(8, $plan['cuotas']);
        $this->assertSame('2026-02-15', $plan['cuotas'][0]['fecha_vencimiento']);
        $this->assertSame('2026-05-15', $plan['cuotas'][1]['fecha_vencimiento']);
        $this->assertSame('2027-11-15', $plan['cuotas'][7]['fecha_vencimiento']);
        $this->assertGreaterThan(180000 / 8, $plan['cuota_mensual']);
    }

    public function test_mensual_sin_interes_conserva_una_cuota_por_mes(): void
    {
        $plan = (new FinancingService())->simularFinanciamiento(
            120000,
            0,
            0,
            0,
            0,
            0,
            12,
            'frances',
            '2026-01-15',
            'mensual'
        );

        $this->assertCount(12, $plan['cuotas']);
        $this->assertSame('2026-02-15', $plan['cuotas'][1]['fecha_vencimiento']);
        $this->assertEquals(10000, $plan['cuota_mensual']);
    }

    public function test_anual_de_12_meses_es_una_sola_cuota(): void
    {
        $plan = (new FinancingService())->simularFinanciamiento(
            50000,
            0,
            0,
            0,
            0,
            0,
            12,
            'plano',
            '2026-03-01',
            'anual'
        );

        $this->assertSame(1, $plan['numero_cuotas']);
        $this->assertSame('2026-03-01', $plan['cuotas'][0]['fecha_vencimiento']);
        $this->assertEquals(50000, $plan['cuota_mensual']);
    }
}
