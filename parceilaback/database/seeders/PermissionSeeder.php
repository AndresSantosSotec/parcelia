<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\User;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear y asegurar todos los permisos disponibles en la base de datos
        Permission::ensureDefinitionsInDatabase();

        $this->command->info('Permisos base creados correctamente.');

        // Asignar permisos por defecto a todos los usuarios existentes (conservando extras personalizados)
        $users = User::all();
        foreach ($users as $user) {
            $user->assignDefaultPermissions(true);
            $this->command->info("Permisos sincronizados para: {$user->name} ({$user->rol}) -> {$user->permissions()->count()} permisos");
        }
    }
}
