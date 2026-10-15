<?php

namespace Tests\Unit;

use App\Support\AreaLote;
use PHPUnit\Framework\TestCase;

class AreaLoteTest extends TestCase
{
    public function test_trapecio_del_plano_usa_el_promedio_de_bases_por_la_altura(): void
    {
        $medidas = AreaLote::desdeLados(200, 150, 112, 100);

        $this->assertNotNull($medidas);
        $this->assertEquals(175, $medidas['promedio']);
        $this->assertEquals(100, $medidas['altura']);
        $this->assertEquals(17500, $medidas['area']);
    }

    public function test_rectangulo_sigue_siendo_frente_por_fondo(): void
    {
        $medidas = AreaLote::desdeLados(20, 20, 10, 10);

        $this->assertEquals(200, $medidas['area']);
    }
}
