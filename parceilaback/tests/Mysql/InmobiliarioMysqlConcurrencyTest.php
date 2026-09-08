<?php

namespace Tests\Mysql;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * No usa RefreshDatabase. Solo corre con phpunit.mysql.xml contra MySQL local.
 * SQLite de phpunit.xml no simula lockForUpdate entre dos conexiones.
 */
class InmobiliarioMysqlConcurrencyTest extends TestCase
{
    public function test_carrera_dos_procesos_php_contra_mysql(): void
    {
        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requiere MySQL real; sqlite no serializa FOR UPDATE entre procesos.');
        }

        $exit = Artisan::call('inmobiliario:qa-carrera');
        $output = Artisan::output();

        $this->assertSame(0, $exit, $output);
        $this->assertStringContainsString('RESULTADO: 1 creada, 1 rechazada', $output);
    }
}
