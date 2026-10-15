<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\MovimientoCaja;
use App\Models\Negociacion;
use App\Models\Sucursal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FlujosReunionKotanhTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $sucursal = Sucursal::create([
            'codigo' => 'SUC-KOT',
            'nombre' => 'Sucursal Kotanh',
            'direccion' => 'Zona 1',
            'telefono' => '22223333',
            'activa' => true,
        ]);

        $this->user = User::create([
            'name' => 'Admin Kotanh',
            'username' => 'admin_kotanh',
            'email' => 'admin.kotanh@example.com',
            'password' => bcrypt('password'),
            'rol' => 'administrador',
            'activo' => true,
            'sucursal_id' => $sucursal->id,
        ]);
    }

    private function api()
    {
        return $this->actingAs($this->user, 'sanctum');
    }

    private function crearFinca(string $nombre = 'Finca Kotanh'): array
    {
        return $this->api()->postJson('/api/v1/fincas', [
            'nombre' => $nombre,
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'area_total_m2' => 10000,
        ])->assertCreated()->json('data');
    }

    public function test_particular_anual_cobra_capital_mas_interes_en_una_cuota(): void
    {
        $finca = $this->crearFinca();

        $alta = $this->api()->postJson('/api/v1/financistas', [
            'finca_id' => $finca['id'],
            'tipo' => 'particular',
            'esquema' => 'particular_anual',
            'nombre' => 'PRUEBA Particular',
            'destino' => 'compra',
            'monto' => 100000,
            'tasa_anual' => 10,
            'plazo' => 12,
            'fecha_inicio' => '2026-01-15',
        ])->assertCreated();

        $alta->assertJsonPath('data.interes_total', 10000);
        $alta->assertJsonPath('data.cuota', 110000);
        $alta->assertJsonPath('data.numero_cuotas', 1);
        $alta->assertJsonPath('data.frecuencia', 'anual');
        $alta->assertJsonPath('data.capital_al_vencimiento', true);

        $plan = $this->api()->getJson('/api/v1/financistas/'.$alta->json('data.id').'/estado')
            ->assertOk()
            ->json('data.plan');

        $this->assertCount(1, $plan);
        $this->assertEqualsWithDelta(100000, (float) $plan[0]['capital'], 0.01);
        $this->assertEqualsWithDelta(10000, (float) $plan[0]['interes'], 0.01);
        $this->assertEqualsWithDelta(110000, (float) $plan[0]['total'], 0.01);
    }

    public function test_cooperativa_mensual_amortiza_en_doce_cuotas(): void
    {
        $finca = $this->crearFinca('Finca Cooperativa');

        $this->api()->postJson('/api/v1/financistas', [
            'finca_id' => $finca['id'],
            'tipo' => 'cooperativa',
            'esquema' => 'cooperativa_mensual',
            'nombre' => 'PRUEBA Cooperativa',
            'destino' => 'compra',
            'monto' => 500000,
            'tasa_anual' => 12,
            'plazo' => 12,
            'fecha_inicio' => '2026-01-15',
        ])->assertCreated()
            ->assertJsonPath('data.frecuencia', 'mensual')
            ->assertJsonPath('data.capital_al_vencimiento', false)
            ->assertJsonPath('data.numero_cuotas', 12);
    }

    public function test_alta_de_financiamiento_no_registra_ingreso_de_caja(): void
    {
        $finca = $this->crearFinca('Finca Sin Caja');
        $antes = MovimientoCaja::count();

        $this->api()->postJson('/api/v1/financistas', [
            'finca_id' => $finca['id'],
            'tipo' => 'particular',
            'esquema' => 'particular_anual',
            'nombre' => 'PRUEBA Sin ingreso',
            'destino' => 'compra',
            'monto' => 100000,
            'tasa_anual' => 10,
            'plazo' => 12,
        ])->assertCreated();

        $this->assertSame($antes, MovimientoCaja::count());
        $this->assertSame(0, MovimientoCaja::where('tipo', 'ingreso')->count());
    }

    public function test_comision_excedente_proporcional_limita_el_pago_a_lo_liberado(): void
    {
        $finca = $this->crearFinca('Finca Comisión');
        $parcela = $this->api()->postJson("/api/v1/fincas/{$finca['id']}/parcelas", [
            'nombre_identificador' => 'Manzana A',
            'area_m2' => 1000,
        ])->assertCreated()->json('data');

        $lote = $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
            'numero_lote' => '01',
            'area_m2' => 200,
            'frente_metros' => 10,
            'fondo_metros' => 20,
            'precio_venta' => 30000,
        ])->assertCreated()->json('data');

        $cliente = $this->api()->postJson('/api/v1/clientes', [
            'nombres' => 'Ana',
            'apellidos' => 'Kotanh',
            'dpi' => '1234567890101',
            'telefono' => '55551234',
            'direccion' => 'Zona 1',
            'fecha_nacimiento' => '1990-01-15',
            'genero' => 'femenino',
        ])->assertCreated()->json('data');

        $negociacion = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $lote['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'gastos_escrituracion' => 5000,
            'enganche_pactado' => 7000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 0,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->assertEqualsWithDelta(30000, (float) $negociacion['precio_original'], 0.01);
        $this->assertEqualsWithDelta(35000, (float) $negociacion['precio_final'], 0.01);

        Negociacion::whereKey($negociacion['id'])->update([
            'enganche_pagado' => 7000,
            'total_capital_pagado' => 0,
        ]);

        $comisionista = $this->api()->postJson('/api/v1/comisionistas', [
            'nombre' => 'PRUEBA Comisionista',
            'dpi' => '2987123450101',
        ])->assertCreated()->json('data');

        $regla = $this->api()->postJson('/api/v1/comision-reglas', [
            'nombre' => 'Excedente proporcional',
            'tipo' => 'monto_fijo',
            'base' => 'excedente',
            'valor' => 0,
            'momento' => 'proporcional',
        ])->assertCreated()->json('data');

        $comision = $this->api()->postJson('/api/v1/comisiones/aplicar', [
            'comisionista_id' => $comisionista['id'],
            'negociacion_id' => $negociacion['id'],
            'regla_id' => $regla['id'],
        ])->assertCreated();

        $comision->assertJsonPath('data.monto_comision', 5000);

        $id = $comision->json('data.id');
        $fecha = now()->toDateString();

        $this->api()->postJson("/api/v1/comisiones/{$id}/pagos", [
            'fecha' => $fecha,
            'monto' => 2000,
        ])->assertStatus(422);

        $this->api()->postJson("/api/v1/comisiones/{$id}/pagos", [
            'fecha' => $fecha,
            'monto' => 1000,
        ])->assertOk()
            ->assertJsonPath('data.pagado', 1000)
            ->assertJsonPath('data.pendiente', 4000);
    }

    public function test_sincronizar_lotes_persiste_frente_y_fondo(): void
    {
        $finca = $this->crearFinca('Finca Parcelar');

        $respuesta = $this->api()->postJson("/api/v1/fincas/{$finca['id']}/lotes-medidas", [
            'lotes' => [
                ['numero' => '1', 'area_m2' => 200, 'tipo' => 'Residencial', 'frente_metros' => 10, 'fondo_metros' => 20],
                ['numero' => '2', 'area_m2' => 200, 'tipo' => 'Residencial', 'frente_metros' => 10, 'fondo_metros' => 20],
                ['numero' => '3', 'area_m2' => 200, 'tipo' => 'Residencial', 'frente_metros' => 10, 'fondo_metros' => 20],
            ],
        ])->assertOk();

        $lotes = collect($respuesta->json('data.lotes'));
        $this->assertCount(3, $lotes);
        foreach ($lotes as $fila) {
            $this->assertEqualsWithDelta(10, (float) $fila['frente_metros'], 0.01);
            $this->assertEqualsWithDelta(20, (float) $fila['fondo_metros'], 0.01);
            $this->assertEqualsWithDelta(200, (float) $fila['area_m2'], 0.01);
        }

        $this->assertSame(3, Lote::where('frente_metros', 10)->where('fondo_metros', 20)->count());
    }
}
