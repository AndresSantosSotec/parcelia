<?php

namespace Tests\Feature;

use App\Models\FincaPlano;
use App\Models\Lote;
use App\Models\LoteGeometria;
use App\Models\Negociacion;
use App\Models\PagoTerreno;
use App\Models\PlanPagoTerreno;
use App\Models\Sucursal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlanoLotificacionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Sucursal $sucursal;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sucursal = Sucursal::create([
            'codigo' => 'SUC-PL',
            'nombre' => 'Sucursal Plano',
            'direccion' => 'Zona 1',
            'telefono' => '22224444',
            'activa' => true,
        ]);

        $this->admin = User::create([
            'name' => 'Admin Plano',
            'username' => 'admin_plano_qa',
            'email' => 'admin.plano@example.com',
            'password' => bcrypt('password'),
            'rol' => 'administrador',
            'activo' => true,
            'sucursal_id' => $this->sucursal->id,
        ]);
    }

    private function api(?User $user = null)
    {
        return $this->actingAs($user ?? $this->admin, 'sanctum');
    }

    private function crearFinca(string $nombre = 'Finca Plano', int $lotes = 3): array
    {
        $finca = $this->api()->postJson('/api/v1/fincas', [
            'nombre' => $nombre,
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'area_total_m2' => 10000,
        ])->assertCreated()->json('data');

        $parcela = $this->api()->postJson("/api/v1/fincas/{$finca['id']}/parcelas", [
            'nombre_identificador' => 'Manzana A',
            'area_m2' => 2000,
        ])->assertCreated()->json('data');

        $ids = [];
        for ($i = 1; $i <= $lotes; $i++) {
            $ids[] = $this->api()->postJson("/api/v1/parcelas/{$parcela['id']}/lotes", [
                'numero_lote' => sprintf('%02d', $i),
                'area_m2' => 200,
                'frente_metros' => 10,
                'fondo_metros' => 20,
                'precio_venta' => 90000,
            ])->assertCreated()->json('data.id');
        }

        return ['finca' => $finca, 'parcela' => $parcela, 'lotes' => $ids];
    }

    private function vendedor(array $permisos, string $username = 'vend_plano'): User
    {
        $user = User::create([
            'name' => 'Vendedor '.$username,
            'username' => $username,
            'email' => $username.'@example.com',
            'password' => bcrypt('password'),
            'rol' => 'vendedor',
            'activo' => true,
            'sucursal_id' => $this->sucursal->id,
        ]);
        $user->syncPermissions($permisos);

        return $user;
    }

    private function cuadro(int $x, int $y, int $lado = 100): array
    {
        return [[$x, $y], [$x + $lado, $y], [$x + $lado, $y + $lado], [$x, $y + $lado]];
    }

    private function cliente(string $dpi = '1234567890101', string $tel = '55551234'): array
    {
        return $this->api()->postJson('/api/v1/clientes', [
            'nombres' => 'Ana María',
            'apellidos' => 'López',
            'dpi' => $dpi,
            'telefono' => $tel,
            'direccion' => 'Zona 1, Guatemala',
            'fecha_nacimiento' => '1990-01-15',
            'genero' => 'femenino',
        ])->assertCreated()->json('data');
    }

    public function test_plano_muestra_lotes_con_estado_real_y_sin_geometria(): void
    {
        $t = $this->crearFinca();
        Lote::whereKey($t['lotes'][1])->update(['estado' => 'reservado']);

        $data = $this->api()->getJson("/api/v1/fincas/{$t['finca']['id']}/plano")->assertOk()->json('data');

        $this->assertCount(3, $data['lotes']);
        $this->assertSame(1000, $data['plano']['ancho']);
        $this->assertFalse($data['plano']['tiene_imagen']);
        $porId = collect($data['lotes'])->keyBy('id');
        $this->assertSame('disponible', $porId[$t['lotes'][0]]['estado']);
        $this->assertSame('reservado', $porId[$t['lotes'][1]]['estado']);
        $this->assertNull($porId[$t['lotes'][2]]['puntos']);
        $this->assertEquals(90000, (float) $porId[$t['lotes'][0]]['precio_venta']);
    }

    public function test_guardar_y_quitar_geometrias(): void
    {
        $t = $this->crearFinca();
        $url = "/api/v1/fincas/{$t['finca']['id']}/plano/geometrias";

        $this->api()->putJson($url, ['geometrias' => [
            ['lote_id' => $t['lotes'][0], 'puntos' => $this->cuadro(10, 10)],
            ['lote_id' => $t['lotes'][1], 'puntos' => $this->cuadro(150, 10)],
        ]])->assertOk()->assertJsonPath('data.guardadas', 2);

        $this->assertSame(2, LoteGeometria::count());
        $this->assertSame(1, FincaPlano::count());

        $this->api()->putJson($url, ['geometrias' => [
            ['lote_id' => $t['lotes'][0], 'puntos' => null],
        ]])->assertOk()->assertJsonPath('data.quitadas', 1);

        $this->assertSame(1, LoteGeometria::count());
        $lote = Lote::find($t['lotes'][0]);
        $this->assertSame('disponible', $lote->estado);
    }

    public function test_rechaza_lote_de_otra_finca_puntos_fuera_y_figura_sin_area(): void
    {
        $a = $this->crearFinca('Finca A', 1);
        $b = $this->crearFinca('Finca B', 1);
        $url = "/api/v1/fincas/{$a['finca']['id']}/plano/geometrias";

        $this->api()->putJson($url, ['geometrias' => [
            ['lote_id' => $b['lotes'][0], 'puntos' => $this->cuadro(10, 10)],
        ]])->assertStatus(422);

        $this->api()->putJson($url, ['geometrias' => [
            ['lote_id' => $a['lotes'][0], 'puntos' => [[10, 10], [5000, 10], [10, 90]]],
        ]])->assertStatus(422);

        $this->api()->putJson($url, ['geometrias' => [
            ['lote_id' => $a['lotes'][0], 'puntos' => [[10, 10], [20, 20], [30, 30]]],
        ]])->assertStatus(422);

        $this->api()->putJson($url, ['geometrias' => [
            ['lote_id' => $a['lotes'][0], 'puntos' => [[10, 10], [20, 20]]],
        ]])->assertStatus(422);

        $this->assertSame(0, LoteGeometria::count());
    }

    public function test_subir_imagen_y_reescalar_geometrias(): void
    {
        Storage::fake('local');
        $t = $this->crearFinca('Finca Imagen', 1);
        $base = "/api/v1/fincas/{$t['finca']['id']}/plano";

        $this->api()->post("{$base}/imagen", [
            'archivo' => UploadedFile::fake()->image('plano.png', 800, 600),
        ])->assertCreated()->assertJsonPath('data.ancho', 800);

        $this->api()->putJson("{$base}/geometrias", ['geometrias' => [
            ['lote_id' => $t['lotes'][0], 'puntos' => $this->cuadro(100, 100)],
        ]])->assertOk();

        $this->api()->get("{$base}/imagen")->assertOk();
        $this->assertTrue($this->api()->getJson($base)->json('data.plano.tiene_imagen'));

        $this->api()->post("{$base}/imagen", [
            'archivo' => UploadedFile::fake()->image('plano2.png', 1600, 1200),
        ])->assertCreated();

        $puntos = LoteGeometria::first()->puntos;
        $this->assertEquals([200, 200], $puntos[0]);
        $this->assertEquals([400, 400], $puntos[2]);

        $this->api()->post("{$base}/imagen", [
            'archivo' => UploadedFile::fake()->create('plano.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_simulacion_desde_lote_usa_precio_del_servidor_y_no_altera_nada(): void
    {
        $t = $this->crearFinca('Finca Sim', 1);

        $sim = $this->api()->postJson('/api/v1/simulador/calcular', [
            'lote_id' => $t['lotes'][0],
            'precio_lote' => 1,
            'enganche' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'metodo' => 'frances',
        ])->assertOk()->json('data');

        $this->assertEquals(90000, (float) $sim['precio_original']);
        $this->assertEquals(80000, (float) $sim['monto_financiado']);
        $this->assertCount(12, $sim['cuotas']);

        $directa = $this->api()->postJson('/api/v1/simulador/calcular', [
            'precio_lote' => 90000,
            'enganche' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'metodo' => 'frances',
        ])->json('data');
        $this->assertEquals($directa['cuota_mensual'], $sim['cuota_mensual']);

        $this->assertSame(0, Negociacion::count());
        $this->assertSame(0, PagoTerreno::count());
        $this->assertSame(0, PlanPagoTerreno::count());
        $lote = Lote::find($t['lotes'][0]);
        $this->assertSame('disponible', $lote->estado);
        $this->assertNull($lote->negociacion_activa_id);
    }

    public function test_simulacion_con_tasa_de_catalogo_ignora_tasa_del_navegador(): void
    {
        $t = $this->crearFinca('Finca Tasa', 1);
        $tasa = $this->api()->postJson('/api/v1/tasas-inmobiliarias', [
            'nombre' => 'Catálogo 10',
            'porcentaje_anual' => 10,
            'tipo_calculo' => 'sobre_saldos',
            'activo' => true,
        ])->assertCreated()->json('data');

        $sim = $this->api()->postJson('/api/v1/simulador/calcular', [
            'lote_id' => $t['lotes'][0],
            'tasa_interes_id' => $tasa['id'],
            'tasa_interes_anual' => 1,
            'enganche' => 0,
            'plazo_meses' => 12,
        ])->assertOk()->json('data');

        $this->assertEquals(10, (float) $sim['tasa_anual']);
    }

    public function test_simulacion_rechaza_descuento_mayor_al_precio_del_lote(): void
    {
        $t = $this->crearFinca('Finca Desc', 1);

        $this->api()->postJson('/api/v1/simulador/calcular', [
            'lote_id' => $t['lotes'][0],
            'descuento' => 90000,
            'plazo_meses' => 12,
        ])->assertStatus(422);
    }

    public function test_venta_por_flujo_existente_se_refleja_en_el_plano_y_bloquea_segunda_venta(): void
    {
        $t = $this->crearFinca('Finca Venta', 1);
        $c1 = $this->cliente();
        $c2 = $this->cliente('2234567890101', '55550001');

        $payload = [
            'lote_id' => $t['lotes'][0],
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ];

        $this->api()->postJson('/api/v1/negociaciones', $payload + ['cliente_id' => $c1['id']])->assertCreated();
        $this->api()->postJson('/api/v1/negociaciones', $payload + ['cliente_id' => $c2['id']])->assertStatus(422);

        $lote = collect($this->api()->getJson("/api/v1/fincas/{$t['finca']['id']}/plano")->json('data.lotes'))->first();
        $this->assertSame('en_negociacion', $lote['estado']);
        $this->assertNotNull($lote['negociacion']);
        $this->assertSame('Ana María López', $lote['negociacion']['comprador']);
        $this->assertSame('Admin Plano', $lote['negociacion']['asesor']);
        $this->assertSame(12, (int) $lote['negociacion']['plazo_meses']);
        $this->assertEquals(12, (float) $lote['negociacion']['tasa_interes_anual']);
        $this->assertSame([], $lote['negociacion']['comisionistas']);
        $this->assertSame(0, PagoTerreno::count());
        $this->assertSame(1, Negociacion::count());
    }

    public function test_vendedor_ve_figura_pero_no_datos_de_lote_no_asignado(): void
    {
        $t = $this->crearFinca('Finca Vend', 2);
        $vend = $this->vendedor([['modulo' => 'lotes', 'acciones' => ['ver']]]);
        Lote::whereKey($t['lotes'][0])->update(['vendedor_id' => $vend->id]);

        $lotes = collect($this->api($vend)->getJson("/api/v1/fincas/{$t['finca']['id']}/plano")->assertOk()->json('data.lotes'))->keyBy('id');

        $this->assertTrue($lotes[$t['lotes'][0]]['visible']);
        $this->assertArrayHasKey('precio_venta', $lotes[$t['lotes'][0]]);
        $this->assertFalse($lotes[$t['lotes'][1]]['visible']);
        $this->assertArrayNotHasKey('precio_venta', $lotes[$t['lotes'][1]]);

        $this->api($vend)->postJson('/api/v1/simulador/calcular', [
            'lote_id' => $t['lotes'][1],
            'plazo_meses' => 12,
        ])->assertStatus(403);
    }

    public function test_sin_permiso_no_ve_ni_edita_el_plano(): void
    {
        $t = $this->crearFinca('Finca Perm', 1);
        $sinPermiso = $this->vendedor([['modulo' => 'clientes', 'acciones' => ['ver']]], 'sin_plano');
        $soloVer = $this->vendedor([['modulo' => 'lotes', 'acciones' => ['ver']]], 'solo_ver');
        $base = "/api/v1/fincas/{$t['finca']['id']}/plano";

        $this->api($sinPermiso)->getJson($base)->assertStatus(403);
        $this->api($soloVer)->getJson($base)->assertOk();
        $this->api($soloVer)->putJson("{$base}/geometrias", ['geometrias' => [
            ['lote_id' => $t['lotes'][0], 'puntos' => $this->cuadro(10, 10)],
        ]])->assertStatus(403);
        $this->assertSame(0, LoteGeometria::count());
    }

    public function test_comprador_oculto_sin_permiso_de_negociaciones(): void
    {
        $t = $this->crearFinca('Finca Priv', 1);
        $c = $this->cliente();
        $this->api()->postJson('/api/v1/negociaciones', [
            'cliente_id' => $c['id'],
            'lote_id' => $t['lotes'][0],
            'tipo_negociacion' => 'credito',
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ])->assertCreated();

        $vend = $this->vendedor([['modulo' => 'lotes', 'acciones' => ['ver']]], 'sin_neg');
        Lote::whereKey($t['lotes'][0])->update(['vendedor_id' => $vend->id]);

        $lote = $this->api($vend)->getJson("/api/v1/fincas/{$t['finca']['id']}/plano")->json('data.lotes.0');
        $this->assertNotNull($lote['negociacion']);
        $this->assertNull($lote['negociacion']['comprador']);
    }

    public function test_migracion_es_reversible(): void
    {
        $migracion = require database_path('migrations/2026_10_09_100000_create_planos_lotificacion_tables.php');

        $migracion->down();
        $this->assertFalse(Schema::hasTable('lote_geometrias'));
        $this->assertFalse(Schema::hasTable('finca_planos'));
        $this->assertTrue(Schema::hasTable('lotes'));

        $migracion->up();
        $this->assertTrue(Schema::hasTable('finca_planos'));
        $this->assertTrue(Schema::hasTable('lote_geometrias'));
    }
}
