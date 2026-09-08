<?php

namespace Tests\Feature;

use App\Models\CajaAperturaCierre;
use App\Models\Cliente;
use App\Models\Finca;
use App\Models\Lote;
use App\Models\Negociacion;
use App\Models\PagoTerreno;
use App\Models\ParametrizacionMoraInmobiliaria;
use App\Models\Parcela;
use App\Models\PlanPagoTerreno;
use App\Models\Sucursal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmobiliarioIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Sucursal $sucursal;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sucursal = Sucursal::create([
            'codigo' => 'SUC-QA',
            'nombre' => 'Sucursal QA',
            'direccion' => 'Zona 1',
            'telefono' => '22223333',
            'activa' => true,
        ]);

        $this->user = User::create([
            'name' => 'Admin QA',
            'username' => 'admin_qa_lotes',
            'email' => 'admin.qa.lotes@example.com',
            'password' => bcrypt('password'),
            'rol' => 'administrador',
            'activo' => true,
            'sucursal_id' => $this->sucursal->id,
        ]);
    }

    private function api()
    {
        return $this->actingAs($this->user, 'sanctum');
    }

    private function payloadCliente(array $override = []): array
    {
        return array_merge([
            'nombres' => 'Ana María',
            'apellidos' => 'López',
            'dpi' => '1234567890101',
            'telefono' => '55551234',
            'direccion' => 'Zona 1, Guatemala',
            'fecha_nacimiento' => '1990-01-15',
            'genero' => 'femenino',
        ], $override);
    }

    private function crearTerreno(array $loteOverride = []): array
    {
        $finca = $this->api()->postJson('/api/v1/fincas', [
            'nombre' => 'Finca El Roble',
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'area_total_m2' => 10000,
        ])->assertCreated()->json('data');

        $parcela = $this->api()->postJson("/api/v1/fincas/{$finca['id']}/parcelas", [
            'nombre_identificador' => 'Manzana A',
            'area_m2' => 1000,
        ])->assertCreated()->json('data');

        $lote = $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", array_merge([
            'numero_lote' => '01',
            'area_m2' => 200,
            'frente_metros' => 10,
            'fondo_metros' => 20,
            'precio_venta' => 90000,
        ], $loteOverride))->assertCreated()->json('data');

        return compact('finca', 'parcela', 'lote');
    }

    private function abrirCaja(): CajaAperturaCierre
    {
        return CajaAperturaCierre::create([
            'user_id' => $this->user->id,
            'sucursal_id' => $this->sucursal->id,
            'fecha_apertura' => now()->toDateString(),
            'hora_apertura' => now()->format('H:i:s'),
            'saldo_inicial' => 1000,
            'estado' => 'abierta',
        ]);
    }

    public function test_comprador_valido_se_crea(): void
    {
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())
            ->assertCreated()
            ->assertJsonPath('data.dpi', '1234567890101');
    }

    public function test_crear_lote_guarda_geolocalizacion(): void
    {
        $finca = $this->api()->postJson('/api/v1/fincas', [
            'nombre' => 'Finca Geo Demo',
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'area_total_m2' => 10000,
        ])->assertCreated()->json('data');

        $parcela = $this->api()->postJson("/api/v1/fincas/{$finca['id']}/parcelas", [
            'nombre_identificador' => 'Manzana Geo',
            'area_m2' => 1000,
        ])->assertCreated()->json('data');

        $lote = $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
            'numero_lote' => 'G-01',
            'area_m2' => 200,
            'frente_metros' => 10,
            'fondo_metros' => 20,
            'precio_venta' => 90000,
            'latitud' => 14.634915,
            'longitud' => -90.506882,
            'altitud' => 1500.25,
            'precision_metros' => 12.5,
            'referencia_geo' => 'Ingreso principal Manzana A',
        ])->assertCreated()->json('data');

        $this->assertEqualsWithDelta(14.634915, (float) $lote['latitud'], 0.000001);
        $this->assertEqualsWithDelta(-90.506882, (float) $lote['longitud'], 0.000001);
        $this->assertEqualsWithDelta(1500.25, (float) $lote['altitud'], 0.01);
        $this->assertSame('Ingreso principal Manzana A', $lote['referencia_geo']);
        $this->assertNotEmpty($lote['token_publico']);
        $this->assertTrue((bool) $lote['publicado']);

        $publico = $this->getJson('/api/v1/publico/terrenos/'.$lote['token_publico'])
            ->assertOk()
            ->json('data');
        $this->assertSame('G-01', $publico['numero_lote']);
        $this->assertEqualsWithDelta(14.634915, (float) $publico['latitud'], 0.000001);
    }

    public function test_lote_disponible_se_puede_editar_y_eliminar(): void
    {
        $terreno = $this->crearTerreno(['numero_lote' => 'DEL-01']);
        $id = $terreno['lote']['id'];

        $this->api()->putJson("/api/v1/lotes/{$id}", [
            'precio_venta' => 99000,
            'latitud' => 14.6,
            'longitud' => -90.5,
            'referencia_geo' => 'Pin de demo',
        ])->assertOk()->assertJsonPath('data.precio_venta', '99000.00');

        $this->api()->deleteJson("/api/v1/lotes/{$id}")
            ->assertOk();

        $this->assertSoftDeleted('lotes', ['id' => $id]);
    }

    public function test_lote_vendido_no_se_elimina(): void
    {
        $terreno = $this->crearTerreno(['numero_lote' => 'VEND-01']);
        $lote = \App\Models\Lote::find($terreno['lote']['id']);
        $lote->update(['estado' => 'vendido']);

        $this->api()->deleteJson("/api/v1/lotes/{$lote->id}")
            ->assertStatus(422);
    }

    public function test_dpi_vacio_letras_corto_y_largo_se_rechazan(): void
    {
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['dpi' => null]))
            ->assertStatus(422);
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['dpi' => 'ABCDEFGHIJKLM']))
            ->assertStatus(422);
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['dpi' => '123']))
            ->assertStatus(422);
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['dpi' => '12345678901012345']))
            ->assertStatus(422);
    }

    public function test_dpi_con_espacios_y_guiones_se_normaliza(): void
    {
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'dpi' => '1234-56789-0101',
        ]))->assertCreated()->assertJsonPath('data.dpi', '1234567890101');
    }

    public function test_dpi_duplicado_se_rechaza(): void
    {
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->assertCreated();
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'nombres' => 'Otra',
            'telefono' => '55559999',
        ]))->assertStatus(422);
    }

    public function test_telefono_invalido_y_nombre_vacio_se_rechazan(): void
    {
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['telefono' => '']))
            ->assertStatus(422);
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['telefono' => 'abc']))
            ->assertStatus(422);
        $this->api()->postJson('/api/v1/clientes', $this->payloadCliente(['nombres' => '   ']))
            ->assertStatus(422);
    }

    public function test_xss_se_almacena_sin_etiquetas_y_sql_no_rompe(): void
    {
        $res = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'nombres' => '<script>alert(1)</script>Ana',
            'dpi' => "' OR 1=1 --",
        ]));

        $res->assertStatus(422);
        $ok = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'nombres' => '<b>Ana</b>',
            'dpi' => '2987123450101',
        ]))->assertCreated();

        $this->assertSame('Ana', $ok->json('data.nombres'));
    }

    public function test_no_elimina_comprador_con_negociacion(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'precio_original' => 1,
            'descuento' => 1000,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated();

        $this->api()->deleteJson('/api/v1/clientes/'.$cliente['id'])->assertStatus(422);
        $this->assertDatabaseHas('clientes', ['id' => $cliente['id'], 'eliminado' => 0]);
    }

    public function test_restaurar_comprador_sin_ventas(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $this->api()->deleteJson('/api/v1/clientes/'.$cliente['id'])->assertOk();
        $this->api()->postJson('/api/v1/clientes/'.$cliente['id'].'/restaurar')->assertOk();
        $this->assertDatabaseHas('clientes', ['id' => $cliente['id'], 'eliminado' => 0]);
    }

    public function test_finca_y_parcela_sin_nombre_se_rechazan(): void
    {
        $this->api()->postJson('/api/v1/fincas', [
            'nombre' => '   ',
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
        ])->assertStatus(422);
    }

    public function test_lote_duplicado_en_misma_parcela_y_permitido_en_otra(): void
    {
        $terreno = $this->crearTerreno();
        $this->api()->postJson("/api/v1/parcelas/{$terreno['parcela']['id']}/lotes", [
            'numero_lote' => '01',
            'area_m2' => 100,
            'precio_venta' => 50000,
        ])->assertStatus(422);

        $otra = $this->api()->postJson("/api/v1/fincas/{$terreno['finca']['id']}/parcelas", [
            'nombre_identificador' => 'Manzana B',
            'area_m2' => 1000,
        ])->json('data');

        $this->api()->postJson("/api/v1/parcelas/{$otra['id']}/lotes", [
            'numero_lote' => '01',
            'area_m2' => 100,
            'precio_venta' => 50000,
        ])->assertCreated();
    }

    public function test_area_cero_negativa_y_exceso_de_parcela(): void
    {
        $finca = $this->api()->postJson('/api/v1/fincas', [
            'nombre' => 'Finca Área',
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'area_total_m2' => 5000,
        ])->json('data');
        $parcela = $this->api()->postJson("/api/v1/fincas/{$finca['id']}/parcelas", [
            'nombre_identificador' => 'Sector 1',
            'area_m2' => 200,
        ])->json('data');

        $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
            'numero_lote' => 'Z',
            'area_m2' => 0,
            'precio_venta' => 1000,
        ])->assertStatus(422);

        $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
            'numero_lote' => 'N',
            'area_m2' => -10,
            'precio_venta' => 1000,
        ])->assertStatus(422);

        $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
            'numero_lote' => '01',
            'area_m2' => 150,
            'precio_venta' => 1000,
        ])->assertCreated();

        $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
            'numero_lote' => '02',
            'area_m2' => 100,
            'precio_venta' => 1000,
        ])->assertStatus(422);
    }

    public function test_no_cambia_estado_ni_precio_de_lote_en_operacion(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $this->api()->putJson('/api/v1/lotes/'.$terreno['lote']['id'], [
            'estado' => 'vendido',
        ])->assertStatus(422);

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated();

        $vendedor = User::create([
            'name' => 'Vendedor QA',
            'username' => 'vendedor_qa_lotes',
            'email' => 'vendedor.qa@example.com',
            'password' => bcrypt('password'),
            'rol' => 'vendedor',
            'activo' => true,
            'sucursal_id' => $this->sucursal->id,
        ]);

        $this->actingAs($vendedor, 'sanctum')->putJson('/api/v1/lotes/'.$terreno['lote']['id'], [
            'precio_venta' => 1,
        ])->assertStatus(403);
    }

    public function test_precio_de_venta_sale_del_lote_no_del_frontend(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'precio_original' => 1,
            'descuento' => 1000,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->assertEquals(90000, (float) $neg['precio_original']);
        $this->assertEquals(89000, (float) $neg['precio_final']);
    }

    public function test_descuento_igual_o_mayor_al_precio_se_rechaza(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 90000,
            'enganche_pactado' => 0,
            'plazo_meses' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertStatus(422);
    }

    public function test_segunda_venta_del_mismo_lote_se_rechaza(): void
    {
        $c1 = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $c2 = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'dpi' => '2234567890101',
            'telefono' => '55550001',
            'nombres' => 'Bruno',
        ]))->json('data');
        $terreno = $this->crearTerreno();

        $payload = [
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ];

        $this->api()->postJson('/api/v1/negociaciones', $payload + ['cliente_id' => $c1['id']])->assertCreated();
        $this->api()->postJson('/api/v1/negociaciones', $payload + ['cliente_id' => $c2['id']])->assertStatus(422);
        $this->assertEquals(1, Negociacion::count());
    }

    public function test_simulacion_no_genera_pagos(): void
    {
        $this->api()->postJson('/api/v1/simulador/calcular', [
            'precio_lote' => 80000,
            'descuento' => 0,
            'enganche' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'metodo' => 'frances',
        ])->assertOk();

        $this->assertEquals(0, PagoTerreno::count());
        $this->assertEquals(0, Negociacion::count());
    }

    public function test_pago_sin_caja_cero_y_exceso_se_rechazan(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();
        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->json('data');

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
        ])->assertStatus(422);

        $this->abrirCaja();

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 0,
            'metodo_pago' => 'efectivo',
        ])->assertStatus(422);

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 999999.99,
            'metodo_pago' => 'efectivo',
        ])->assertStatus(422);

        $pago = $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
            'idempotency_key' => 'qa-enganche-1',
        ])->assertCreated();

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
            'idempotency_key' => 'qa-enganche-1',
        ])->assertCreated()->assertJsonPath('data.id', $pago->json('data.id'));

        $this->assertEquals(1, PagoTerreno::count());
    }

    public function test_reporte_fechas_invertidas_y_pagos_anulados_fuera_de_ingresos(): void
    {
        $this->api()->getJson('/api/v1/reportes-inmobiliarios/ventas?fecha_desde=2026-12-31&fecha_hasta=2026-01-01')
            ->assertStatus(422);

        $empty = $this->api()->getJson('/api/v1/reportes-inmobiliarios/inventario')->assertOk()->json('data');
        $this->assertArrayHasKey('total_lotes', $empty);
        $this->assertArrayHasKey('meta', $empty);

        PagoTerreno::query();
        $ingresos = $this->api()->getJson('/api/v1/reportes-inmobiliarios/ingresos-diarios')->assertOk()->json('data');
        $this->assertSame(0, $ingresos['total_recibos']);
    }

    public function test_flujo_credito_enganche_actualiza_lote_y_no_acepta_plusvalia_posterior(): void
    {
        $this->abrirCaja();
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 2000,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'sistema_amortizacion' => 'frances',
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->assertSame('en_negociacion', Lote::find($terreno['lote']['id'])->estado);
        $this->assertEquals(78000, (float) $neg['saldo_capital_pendiente']);
        $this->assertEquals($neg['id'], Lote::find($terreno['lote']['id'])->negociacion_activa_id);

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
        ])->assertCreated();

        $lote = Lote::find($terreno['lote']['id']);
        $this->assertSame('vendido', $lote->estado);
        $this->assertGreaterThan(0, Negociacion::find($neg['id'])->planPagos()->count());

        $this->api()->postJson('/api/v1/lotes/'.$lote->id.'/servicios', [
            'nombre_servicio' => 'Agua extra',
            'estado' => 'disponible',
            'costo_adicional' => 5000,
        ])->assertStatus(422);
    }

    public function test_anular_solo_el_ultimo_pago_y_restaura_lote(): void
    {
        $this->abrirCaja();
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->assertEquals(80000, (float) $neg['saldo_capital_pendiente']);

        $pago = $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
        ])->assertCreated()->json('data');

        $this->assertSame('vendido', Lote::find($terreno['lote']['id'])->estado);

        $cuota = $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'cuota_normal',
            'monto' => 100,
            'metodo_pago' => 'efectivo',
        ])->assertCreated()->json('data');

        $this->api()->postJson('/api/v1/pagos-terrenos/'.$pago['id'].'/anular', [
            'motivo' => 'No es el último',
        ])->assertStatus(422);

        $this->api()->postJson('/api/v1/pagos-terrenos/'.$cuota['id'].'/anular', [
            'motivo' => 'Error de captura en caja',
        ])->assertOk();

        $this->assertTrue((bool) PagoTerreno::find($cuota['id'])->anulado);

        $this->api()->postJson('/api/v1/pagos-terrenos/'.$pago['id'].'/anular', [
            'motivo' => 'Se anula el enganche',
        ])->assertOk();

        $this->assertSame('en_negociacion', Lote::find($terreno['lote']['id'])->estado);
        $this->assertEquals(0, Negociacion::find($neg['id'])->planPagos()->count());
    }

    public function test_vendedor_no_puede_anular_pago(): void
    {
        $this->abrirCaja();
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();
        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->json('data');

        $pago = $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
        ])->json('data');

        $vendedor = User::create([
            'name' => 'Vendedor anula',
            'username' => 'vendedor_anula_qa',
            'email' => 'vendedor.anula@example.com',
            'password' => bcrypt('password'),
            'rol' => 'vendedor',
            'activo' => true,
            'sucursal_id' => $this->sucursal->id,
        ]);

        $this->actingAs($vendedor, 'sanctum')->postJson('/api/v1/pagos-terrenos/'.$pago['id'].'/anular', [
            'motivo' => 'Intento no autorizado',
        ])->assertStatus(403);
    }

    public function test_editar_tasa_catalogo_no_cambia_snapshot_de_negociacion(): void
    {
        $tasa = $this->api()->postJson('/api/v1/tasas-inmobiliarias', [
            'nombre' => 'Estándar 12',
            'porcentaje_anual' => 12,
            'tipo_calculo' => 'sobre_saldos',
            'activo' => true,
        ])->assertCreated()->json('data');

        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();
        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_id' => $tasa['id'],
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->assertEquals(12, (float) $neg['tasa_interes_anual']);

        $this->api()->putJson('/api/v1/tasas-inmobiliarias/'.$tasa['id'], [
            'porcentaje_anual' => 99,
        ])->assertOk();

        $this->assertEquals(12, (float) Negociacion::find($neg['id'])->tasa_interes_anual);
    }

    public function test_finca_se_actualiza_y_no_se_desactiva_con_lote_en_operacion(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();

        $this->api()->putJson('/api/v1/fincas/'.$terreno['finca']['id'], [
            'nombre' => 'Finca Renombrada',
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
        ])->assertOk()->assertJsonPath('data.nombre', 'Finca Renombrada');

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated();

        $this->api()->postJson('/api/v1/fincas/'.$terreno['finca']['id'].'/desactivar')
            ->assertStatus(422);
    }

    public function test_finca_sin_operacion_se_desactiva_y_se_reactiva(): void
    {
        $terreno = $this->crearTerreno();

        $this->api()->postJson('/api/v1/fincas/'.$terreno['finca']['id'].'/desactivar')
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->api()->putJson('/api/v1/fincas/'.$terreno['finca']['id'], [
            'nombre' => 'Finca Reactivada',
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'activo' => true,
        ])->assertOk()->assertJsonPath('data.activo', true);
    }

    public function test_rescinde_venta_con_pagos_y_libera_lote(): void
    {
        $this->abrirCaja();
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();
        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
        ])->assertCreated();

        $this->api()->postJson('/api/v1/negociaciones/'.$neg['id'].'/rescindir', [
            'motivo' => 'Desistimiento del comprador',
        ])->assertOk();

        $this->assertSame('rescindida', Negociacion::find($neg['id'])->estado);
        $this->assertTrue((bool) PagoTerreno::first()->anulado);
        $lote = Lote::find($terreno['lote']['id']);
        $this->assertSame('disponible', $lote->estado);
        $this->assertNull($lote->negociacion_activa_id);

        $otro = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'dpi' => '3234567890101',
            'telefono' => '55550002',
            'nombres' => 'Carla',
        ]))->json('data');

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $otro['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated();
    }

    public function test_ocupacion_bloquea_segunda_venta_aunque_estado_diga_disponible(): void
    {
        $c1 = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $c2 = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente([
            'dpi' => '4234567890101',
            'telefono' => '55550003',
            'nombres' => 'Diego',
        ]))->json('data');
        $terreno = $this->crearTerreno();

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $c1['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated();

        $lote = Lote::find($terreno['lote']['id']);
        Negociacion::where('lote_id', $lote->id)->update(['estado' => 'rescindida']);
        $lote->estado = 'disponible';
        $lote->save();

        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $c2['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertStatus(422);

        $this->assertEquals(1, Negociacion::count());
    }

    public function test_mora_se_cobra_con_snapshot_no_con_catalogo_vigente(): void
    {
        ParametrizacionMoraInmobiliaria::query()->update(['activo' => false]);
        ParametrizacionMoraInmobiliaria::create([
            'nombre' => 'QA fijo 10',
            'tipo_calculo' => 'monto_fijo_diario',
            'porcentaje_diario' => 0,
            'monto_fijo_diario' => 10,
            'dias_gracia' => 0,
            'activo' => true,
        ]);

        $this->abrirCaja();
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();
        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated()->json('data');

        $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'enganche',
            'monto' => 10000,
            'metodo_pago' => 'efectivo',
        ])->assertCreated();

        ParametrizacionMoraInmobiliaria::query()->update([
            'monto_fijo_diario' => 999,
            'tipo_calculo' => 'monto_fijo_diario',
        ]);

        $cuota = PlanPagoTerreno::where('negociacion_id', $neg['id'])->orderBy('numero_cuota')->first();
        $cuota->fecha_vencimiento = now()->subDays(10)->toDateString();
        $cuota->save();

        $pago = $this->api()->postJson('/api/v1/pagos-terrenos', [
            'negociacion_id' => $neg['id'],
            'tipo_pago' => 'cuota_normal',
            'monto' => 50,
            'metodo_pago' => 'efectivo',
        ])->assertCreated()->json('data');

        $this->assertEqualsWithDelta(50.0, (float) $pago['distribucion_mora'], 0.05);
        $this->assertSame('en_mora', Negociacion::find($neg['id'])->estado);
    }

    public function test_vendedor_no_puede_rescindir(): void
    {
        $cliente = $this->api()->postJson('/api/v1/clientes', $this->payloadCliente())->json('data');
        $terreno = $this->crearTerreno();
        $neg = $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $cliente['id'],
            'lote_id' => $terreno['lote']['id'],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->json('data');

        $vendedor = User::create([
            'name' => 'Vendedor rescinde',
            'username' => 'vendedor_rescinde_qa',
            'email' => 'vendedor.rescinde@example.com',
            'password' => bcrypt('password'),
            'rol' => 'vendedor',
            'activo' => true,
            'sucursal_id' => $this->sucursal->id,
        ]);

        $this->actingAs($vendedor, 'sanctum')->postJson('/api/v1/negociaciones/'.$neg['id'].'/rescindir', [
            'motivo' => 'Intento no autorizado',
        ])->assertStatus(403);
    }
}
