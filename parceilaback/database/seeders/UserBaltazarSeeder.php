<?php

namespace Database\Seeders;

use App\Models\Sucursal;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Usuarios Juan Baltazar.
 *
 * Administrador recibe todos los permisos del rol.
 * Asesor de ventas usa el rol vendedor y sus permisos de operación.
 * Los correos son de ejemplo. Usuario y contraseña son de acceso real.
 *
 * Ejecutar sin borrar datos:
 *   php artisan db:seed --class=UserBaltazarSeeder
 */
class UserBaltazarSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Creando usuarios Juan Baltazar...');
        $this->command->newLine();

        $sucursal = Sucursal::where('codigo', 'ESQ-001')->first();

        if (!$sucursal) {
            $this->command->warn('No estaba la sucursal ESQ-001. Se crea ahora.');
            $this->call(SucursalProdSeeder::class);
            $sucursal = Sucursal::where('codigo', 'ESQ-001')->first();
        }

        if (!$sucursal) {
            $this->command->error('No se pudo crear la sucursal ESQ-001.');
            return;
        }

        $usuarios = [
            [
                'name' => 'Sebastián Juan Baltazar',
                'username' => 'sjb.admin.8k2m',
                'email' => 'sebastian.juan@ejemplo.parcelia.gt',
                'password_plain' => 'K7m#pQ2vLx9$nR4w',
                'rol' => 'administrador',
                'cargo' => 'Administrador',
            ],
            [
                'name' => 'Belmer Sosa Juan Baltazar',
                'username' => 'bsosa.ventas.4q7n',
                'email' => 'belmer.sosa@ejemplo.parcelia.gt',
                'password_plain' => 'T3s!bN8cYw5&uH6q',
                'rol' => 'vendedor',
                'cargo' => 'Asesor de ventas',
            ],
            [
                'name' => 'Diego Nicolás Juan Baltazar',
                'username' => 'dnicolas.ventas.6w3p',
                'email' => 'diego.nicolas@ejemplo.parcelia.gt',
                'password_plain' => 'M4d@jF7kZp2#eL9x',
                'rol' => 'vendedor',
                'cargo' => 'Asesor de ventas',
            ],
            [
                'name' => 'Roberto Juan Baltazar',
                'username' => 'rjb.admin.9h1t',
                'email' => 'roberto.juan@ejemplo.parcelia.gt',
                'password_plain' => 'R8w$gH3nVc6!aQ1y',
                'rol' => 'administrador',
                'cargo' => 'Administrador',
            ],
        ];

        $creados = 0;

        foreach ($usuarios as $datos) {
            $plain = $datos['password_plain'];
            $cargo = $datos['cargo'];
            unset($datos['password_plain'], $datos['cargo']);

            $user = User::firstOrCreate(
                ['email' => $datos['email']],
                array_merge($datos, [
                    'password' => Hash::make($plain),
                    'activo' => true,
                    'sucursal_id' => $sucursal->id,
                ])
            );

            if ($user->wasRecentlyCreated) {
                $user->assignDefaultPermissions();
                $creados++;
                $this->command->info("Creado: {$user->name}");
            } else {
                $this->command->comment("Ya existía: {$user->name}");
            }

            $this->command->line("   Cargo: {$cargo}");
            $this->command->line("   Rol: {$user->rol}");
            $this->command->line("   Usuario: {$user->username}");
            $this->command->line("   Correo: {$user->email}");
            $this->command->line("   Contraseña: {$plain}");
            $this->command->line("   Permisos: {$user->permissions()->count()}");
            $this->command->newLine();
        }

        $this->command->info("Listo. Creados en esta corrida: {$creados} de " . count($usuarios) . '.');
        $this->command->line('Sucursal: ' . $sucursal->nombre . ' (' . $sucursal->codigo . ').');
    }
}
