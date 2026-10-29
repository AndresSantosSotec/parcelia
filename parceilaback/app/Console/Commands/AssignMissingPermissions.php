<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Permission;

class AssignMissingPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:assign-missing
                            {--force : Reasignar permisos incluso si el usuario ya tiene algunos}
                            {--reset : Reemplazar permisos personalizados por los exactos del rol}
                            {--all : Asignar TODOS los permisos del sistema a todos los usuarios}
                            {--rol= : Solo asignar a usuarios con un rol específico}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincronizar y asignar automáticamente todos los permisos de cada rol a los usuarios existentes en base de datos';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔐 Sincronizando catálogo de permisos y asignando por rol a usuarios...');
        $this->newLine();

        // Asegurar que todos los permisos estén en la base de datos
        Permission::ensureDefinitionsInDatabase();
        $allPermissionIds = Permission::all()->pluck('id')->toArray();
        $this->info('✅ Catálogo verificado: ' . count($allPermissionIds) . ' permisos en base de datos');
        $this->newLine();

        $query = User::with('permissions');

        // Filtrar por rol si se especifica
        if ($rol = $this->option('rol')) {
            $query->where('rol', $rol);
            $this->info("📌 Filtrando usuarios con rol: {$rol}");
        }

        $usuarios = $query->get();
        $totalUsuarios = $usuarios->count();

        if ($totalUsuarios === 0) {
            $this->warn('⚠️  No se encontraron usuarios en la base de datos');
            return 0;
        }

        $this->info("👥 {$totalUsuarios} usuarios encontrados");
        $this->newLine();

        $procesados = 0;
        $actualizados = 0;
        $rolesValidos = ['superadmin', 'administrador', 'cajero', 'tasador', 'supervisor', 'vendedor'];

        foreach ($usuarios as $usuario) {
            $procesados++;
            $prefix = "[{$procesados}/{$totalUsuarios}]";

            // Normalizar el rol en BD si tenía alias (ej. admin, gerente, asesor) o mayúsculas
            $rolNormalizado = $usuario->normalizedRole();
            if ($usuario->rol !== $rolNormalizado && in_array($rolNormalizado, $rolesValidos, true)) {
                $usuario->rol = $rolNormalizado;
                $usuario->saveQuietly();
            }

            if ($this->option('all')) {
                $usuario->permissions()->sync($allPermissionIds);
            } else {
                // Asignar todos los permisos correspondientes a su rol (conservando extras salvo --reset)
                $preserveCustom = !$this->option('reset');
                $usuario->assignDefaultPermissions($preserveCustom);
            }

            $actualizados++;
            $permisos = $usuario->permissions()->count();
            $this->info("{$prefix} ✅ {$usuario->name} ({$usuario->username} | rol: {$usuario->rol}) -> {$permisos} permisos activos");
        }

        $this->newLine();
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('                     RESUMEN                           ');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info("📊 Total usuarios:      {$totalUsuarios}");
        $this->info("✅ Sincronizados:       {$actualizados}");
        $this->info('═══════════════════════════════════════════════════════');
        $this->newLine();
        $this->info('🎉 Todos los usuarios tienen los permisos completos de su rol.');

        return 0;
    }
}
