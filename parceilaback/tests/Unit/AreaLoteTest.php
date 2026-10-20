<?php

namespace Tests\Unit;

use App\Support\AreaLote;
use PHPUnit\Framework\TestCase;

class AreaLoteTest extends TestCase
{
    public function test_la_hoja_de_conversion_promedia_los_lados_opuestos(): void
    {
        $medidas = AreaLote::desdeLados(85.1, 79.5, 40, 40);

        $this->assertNotNull($medidas);
        $this->assertEquals(82.3, $medidas['promedio']);
        $this->assertEquals(40, $medidas['altura']);
        $this->assertEquals(3292, $medidas['area']);
        $this->assertEquals(8.23, $medidas['cuerdas']);
    }

    public function test_rectangulo_sigue_siendo_frente_por_fondo(): void
    {
        $medidas = AreaLote::desdeLados(20, 20, 10, 10);

        $this->assertEquals(200, $medidas['area']);
        $this->assertEquals(0.5, $medidas['cuerdas']);
    }
}
