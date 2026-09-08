<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmpenosDisabledRoutesTest extends TestCase
{
    use RefreshDatabase;

    private function usuarioAdministrador(string $username): User
    {
        return User::create([
            'name' => 'Admin Test',
            'username' => $username,
            'email' => $username.'@example.com',
            'password' => bcrypt('password'),
            'rol' => 'administrador',
            'activo' => true,
        ]);
    }

    public function test_rutas_publicas_de_prendas_no_existen_con_empenos_desactivado(): void
    {
        config(['empenos.enabled' => false]);

        $this->getJson('/api/ecommerce/prendas')->assertNotFound();
        $this->getJson('/api/ecommerce/categorias')->assertNotFound();
    }

    public function test_rutas_autenticadas_de_empenos_responden_404(): void
    {
        config(['empenos.enabled' => false]);

        $user = $this->usuarioAdministrador('admin_empenos_off');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/creditos-prendarios')
            ->assertNotFound();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/prendas')
            ->assertNotFound();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/ventas')
            ->assertNotFound();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/remates')
            ->assertNotFound();
    }

    public function test_rutas_operativas_siguen_disponibles(): void
    {
        config(['empenos.enabled' => false]);

        $user = $this->usuarioAdministrador('admin_parcelia_ok');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/fincas')
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/clientes')
            ->assertOk();
    }
}
