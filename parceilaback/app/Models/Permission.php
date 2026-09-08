<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'modulo',
        'accion',
        'descripcion',
    ];

    /**
     * Los usuarios que tienen este permiso
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_permissions');
    }

    /**
     * Crea en BD cualquier par (módulo, acción) definido en $permisosPorModulo que aún no exista.
     * syncPermissions() solo enlaza IDs existentes; sin esto, permisos nuevos se ignoraban en silencio.
     */
    public static function ensureDefinitionsInDatabase(): void
    {
        foreach (self::$permisosPorModulo as $modulo => $acciones) {
            foreach ($acciones as $accion) {
                $descripcion = match ("{$modulo}.{$accion}") {
                    'creditos.editar_tasa_interes' => 'Permite modificar la tasa de interés % al configurar créditos prendarios',
                    'creditos.editar_mora' => 'Permite modificar tasa de mora, tipo y monto fijo al configurar créditos prendarios',
                    default => ucfirst(str_replace('_', ' ', (string) $accion)).' en '.ucfirst(str_replace('_', ' ', (string) $modulo)),
                };

                self::firstOrCreate(
                    ['modulo' => $modulo, 'accion' => $accion],
                    ['descripcion' => $descripcion]
                );
            }
        }
    }

    /**
     * Permisos por módulo con sus acciones
     */
    public static array $permisosPorModulo = [
        'dashboard' => ['ver'],
        'clientes' => ['ver', 'crear', 'editar', 'eliminar'],
        'sucursales' => ['ver', 'crear', 'editar', 'eliminar'],
        'simulador' => ['usar', 'imprimir', 'guardar'],
        'creditos' => ['ver', 'crear', 'renovar', 'cancelar', 'pasar_venta', 'editar_tasa_interes', 'editar_mora'],
        'refrendos' => ['ver', 'validar', 'calcular', 'procesar'],
        'prendas' => ['ver', 'editar', 'cambiar_estado', 'vender'],
        'ventas' => ['ver', 'tasar', 'vender', 'apartar', 'crear_plan_pago', 'modificar_precio', 'aplicar_descuento'],
        'caja' => ['abrir', 'cerrar', 'ver_movimientos', 'gestionar_cajas'],
        'reportes' => ['generar', 'exportar'],
        'fincas' => ['ver', 'crear', 'editar', 'desactivar'],
        'lotes' => ['ver', 'crear', 'editar', 'eliminar', 'servicios', 'imagenes'],
        'negociaciones' => ['ver', 'crear', 'ajustar_condiciones', 'rescindir', 'contrato'],
        'pagos_terreno' => ['ver', 'cobrar', 'anular'],
        'tasas_inmobiliarias' => ['ver', 'crear', 'editar', 'desactivar'],
        'reportes_inmobiliarios' => ['generar', 'exportar'],
        'usuarios' => ['ver', 'crear', 'editar', 'eliminar', 'asignar_permisos'],
        'compras' => ['ver', 'crear', 'editar', 'eliminar'],
        'remates' => ['ver', 'crear', 'cancelar'],
        'auditoria' => ['ver', 'exportar'], // Solo superadmin de soporte
        'categorias_productos' => ['ver', 'crear', 'editar', 'eliminar', 'toggle_activa'], // Generador de formularios (soporte si empeños off)
        'gastos' => ['ver', 'crear', 'editar', 'eliminar', 'asignar_credito'],
        'boveda' => ['ver', 'crear', 'editar', 'eliminar', 'movimientos', 'aprobar', 'reportes'],
        'migracion' => ['ver', 'importar', 'descargar_plantilla'],
        'contabilidad' => ['ver', 'configurar', 'asientos', 'reportes'],
        'cobros' => ['realizar', 'ver', 'imprimir_recibo'],
        'recibos' => ['ver', 'crear', 'imprimir', 'anular'],
        'historial' => ['ver'],
        'otros_gastos' => ['ver', 'crear', 'editar', 'eliminar', 'anular'],
        'cotizaciones' => ['ver', 'crear', 'editar', 'eliminar', 'convertir'],
        'planes_interes' => ['ver', 'crear', 'editar', 'eliminar'],
        'transferencias' => ['ver', 'crear', 'aprobar', 'anular'],
    ];

    /**
     * Permisos por rol por defecto
     */
    public static array $permisosPorRol = [
        'superadmin' => '*', // Soporte: auditoría, logs, generador de formularios y operación completa
        'administrador' => '*', // Operación completa; la UI oculta auditoría/formularios de soporte
        'cajero' => [
            'dashboard' => ['ver'],
            'clientes' => ['ver', 'crear'],
            'creditos' => ['ver', 'crear'],
            'refrendos' => ['ver', 'validar', 'calcular', 'procesar'],
            'compras' => ['ver', 'crear'],
            'caja' => ['abrir', 'cerrar', 'ver_movimientos'],
            'fincas' => ['ver'],
            'lotes' => ['ver'],
            'negociaciones' => ['ver'],
            'pagos_terreno' => ['ver', 'cobrar'],
            'reportes_inmobiliarios' => ['generar'],
            'prendas' => ['ver'],
            'gastos' => ['ver', 'asignar_credito'],
            'cobros' => ['realizar', 'ver', 'imprimir_recibo'],
            'recibos' => ['ver', 'crear', 'imprimir'],
            'historial' => ['ver'],
            'otros_gastos' => ['ver', 'crear'],
            'planes_interes' => ['ver'],
        ],
        'tasador' => [
            'dashboard' => ['ver'],
            'clientes' => ['ver'],
            'simulador' => ['usar', 'imprimir', 'guardar'],
            'prendas' => ['ver'],
            'ventas' => ['ver', 'tasar'],
            'compras' => ['ver', 'crear'],
            'planes_interes' => ['ver'],
        ],
        'vendedor' => [
            'dashboard' => ['ver'],
            'clientes' => ['ver', 'crear'],
            'fincas' => ['ver', 'crear', 'editar'],
            'lotes' => ['ver', 'crear', 'editar', 'eliminar', 'servicios', 'imagenes'],
            'negociaciones' => ['ver', 'crear', 'contrato'],
            'pagos_terreno' => ['ver', 'cobrar'],
            'gastos' => ['ver'],
            'otros_gastos' => ['ver', 'crear'],
            'tasas_inmobiliarias' => ['ver'],
            'reportes_inmobiliarios' => ['generar', 'exportar'],
            'ventas' => ['ver', 'vender', 'apartar', 'crear_plan_pago', 'aplicar_descuento'],
            'compras' => ['ver'],
            'prendas' => ['ver'],
            'cotizaciones' => ['ver', 'crear', 'editar'],
            'caja' => ['abrir', 'cerrar', 'ver_movimientos'],
            'cobros' => ['realizar', 'ver', 'imprimir_recibo'],
            'recibos' => ['ver', 'crear', 'imprimir'],
            'historial' => ['ver'],
        ],
        'supervisor' => [
            'dashboard' => ['ver'],
            'clientes' => ['ver'],
            'refrendos' => ['ver', 'validar', 'calcular', 'procesar'],
            'creditos' => ['ver', 'renovar'],
            'compras' => ['ver', 'crear', 'editar'],
            'prendas' => ['ver', 'cambiar_estado'],
            'ventas' => ['ver', 'modificar_precio', 'aplicar_descuento'],
            'reportes' => ['generar', 'exportar'],
            'remates' => ['ver'],
            'caja' => ['ver_movimientos'],
            'categorias_productos' => ['ver', 'crear', 'editar'],
            'gastos' => ['ver', 'crear', 'editar', 'asignar_credito'],
            'cobros' => ['realizar', 'ver', 'imprimir_recibo'],
            'recibos' => ['ver', 'crear', 'imprimir', 'anular'],
            'historial' => ['ver'],
            'otros_gastos' => ['ver', 'crear', 'anular'],
            'cotizaciones' => ['ver', 'crear', 'editar', 'eliminar', 'convertir'],
            'planes_interes' => ['ver'],
            'transferencias' => ['ver'],
        ],
    ];
}
