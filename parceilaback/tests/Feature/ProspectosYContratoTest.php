<?php

namespace Tests\Feature;

use App\Models\Finca;
use App\Models\Lote;
use App\Models\Parcela;
use App\Models\Permission;
use App\Models\Prospecto;
use App\Models\Sucursal;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProspectosYContratoTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::ensureDefinitionsInDatabase();

        $sucursal = Sucursal::create([
            'codigo' => 'SUC-TEST',
            'nombre' => 'Sucursal Central Test',
            'direccion' => 'Zona 1',
            'telefono' => '22223333',
            'activa' => true,
        ]);

        $this->adminUser = User::create([
            'name' => 'Admin Test',
            'username' => 'admin_test_crm',
            'email' => 'admin.test.crm@example.com',
            'password' => bcrypt('password'),
            'rol' => 'administrador',
            'activo' => true,
            'sucursal_id' => $sucursal->id,
        ]);
    }

    public function test_prospectos_requiere_autenticacion(): void
    {
        $response = $this->getJson('/api/v1/prospectos');
        $response->assertStatus(401);
    }

    public function test_crear_prospecto_y_evaluar_seguimiento(): void
    {
        $finca = Finca::create([
            'nombre' => 'Finca Los Pinos Test',
            'codigo' => 'PINOS-TEST',
            'activo' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/prospectos', [
                'nombre_completo' => 'Carlos Méndez',
                'telefono' => '55551234',
                'finca_id' => $finca->id,
                'origen' => 'whatsapp',
                'presupuesto_estimado' => 75000,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $prospectoId = $response->json('data.id');
        $prospecto = Prospecto::findOrFail($prospectoId);

        $this->assertEquals('Carlos Méndez', $prospecto->nombre_completo);
        $this->assertEquals('nuevo', $prospecto->estado);
        $this->assertFalse($prospecto->requiere_seguimiento);
        $this->assertEquals(0, $prospecto->horas_sin_contacto);
    }

    public function test_alerta_inactividad_48_horas(): void
    {
        $prospectoInactivo = Prospecto::create([
            'nombre_completo' => 'Mario Estrada',
            'telefono' => '44445555',
            'estado' => 'nuevo',
            'ultimo_contacto_at' => Carbon::now()->subHours(50),
        ]);

        $this->assertTrue($prospectoInactivo->requiere_seguimiento);
        $this->assertGreaterThanOrEqual(48, $prospectoInactivo->horas_sin_contacto);

        // Al registrar un contacto, el contador de 48h debe reiniciarse
        $response = $this->actingAs($this->adminUser)
            ->postJson("/api/v1/prospectos/{$prospectoInactivo->id}/registrar-contacto", [
                'tipo_interaccion' => 'llamada',
                'detalle' => 'Llamada telefónica exitosa. Interesado en lote esquinero.',
                'nuevo_estado' => 'contactado',
            ]);

        $response->assertStatus(200);

        $prospectoActualizado = $prospectoInactivo->fresh();
        $this->assertEquals('contactado', $prospectoActualizado->estado);
        $this->assertFalse($prospectoActualizado->requiere_seguimiento);
        $this->assertEquals(0, $prospectoActualizado->horas_sin_contacto);
    }
}
