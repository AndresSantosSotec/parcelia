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

    private static bool $definitionsEnsured = false;

    /**
     * Crea en BD cualquier par (módulo, acción) definido en $permisosPorModulo que aún no exista.
     * syncPermissions() solo enlaza IDs existentes; sin esto, permisos nuevos se ignoraban en silencio.
     */
    public static function ensureDefinitionsInDatabase(): void
    {
        if (self::$definitionsEnsured) {
            return;
        }

        foreach (self::$permisosPorModulo as $modulo => $acciones) {
            foreach ($acciones as $accion) {
                $descripcion = match ("{$modulo}.{$accion}") {
                    'creditos.editar_tasa_interes' => 'Permite modificar la tasa de interés % al configurar créditos prendarios',
                    'creditos.editar_mora' => 'Permite modificar tasa de mora, tipo y monto fijo al configurar créditos prendarios',
                    'compra_fincas.ver' => 'Consultar el listado y el detalle de las compras de finca',
                    'compra_fincas.crear' => 'Registrar una compra de finca',
                    'compra_fincas.editar' => 'Modificar compra, escrituras, urbanización, plan y abonos',
                    'compra_fincas.eliminar' => 'Eliminar una compra que todavía no tiene pagos',
                    'compra_fincas.reportes' => 'Descargar plan de compra y costeo en PDF o Excel',
                    'financistas.ver' => 'Consultar financiamientos externos',
                    'financistas.editar' => 'Registrar y modificar financiamientos',
                    'financistas.pagar' => 'Registrar pagos de capital, interés y mora',
                    'financistas.reportes' => 'Estado de cuenta y listado de financiamientos',
                    'comisionistas.ver' => 'Consultar comisionistas y comisiones de venta',
                    'comisionistas.editar' => 'Registrar comisionistas y ligar comisiones a ventas',
                    'comisionistas.pagar' => 'Registrar pagos de comisión y su recibo',
                    'comisionistas.reglas' => 'Parametrizar reglas de comisión',
                    'comisionistas.reportes' => 'Estado de cuenta y listados de comisionistas',
                    'negociaciones.ajustar_condiciones' => 'Ajustar condiciones y editar fechas de venta/contrato',
                    default => ucfirst(str_replace('_', ' ', (string) $accion)).' en '.ucfirst(str_replace('_', ' ', (string) $modulo)),
                };

                self::firstOrCreate(
                    ['modulo' => $modulo, 'accion' => $accion],
                    ['descripcion' => $descripcion]
                );
            }
        }

        self::$definitionsEnsured = true;
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
        'compra_fincas' => ['ver', 'crear', 'editar', 'eliminar', 'reportes'],
        'financistas' => ['ver', 'editar', 'pagar', 'reportes'],
        'comisionistas' => ['ver', 'editar', 'pagar', 'reglas', 'reportes'],
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
        'administrador' => '*', // Operación completa (incluye contabilidad); la UI oculta auditoría/migración de soporte
        'cajero' => [
            'dashboard' => ['ver'],
            'clientes' => ['ver', 'crear', 'editar'],
            'creditos' => ['ver', 'crear'],
            'refrendos' => ['ver', 'validar', 'calcular', 'procesar'],
            'compras' => ['ver', 'crear'],
            'caja' => ['abrir', 'cerrar', 'ver_movimientos'],
            'boveda' => ['ver', 'movimientos', 'reportes'],
            'fincas' => ['ver'],
            'compra_fincas' => ['ver', 'editar', 'reportes'],
            'financistas' => ['ver', 'pagar', 'reportes'],
            'comisionistas' => ['ver', 'pagar', 'reportes'],
            'lotes' => ['ver'],
            'negociaciones' => ['ver', 'contrato'],
            'pagos_terreno' => ['ver', 'cobrar'],
            'reportes_inmobiliarios' => ['generar', 'exportar'],
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
            'fincas' => ['ver'],
            'lotes' => ['ver'],
        ],
        'vendedor' => [
            'dashboard' => ['ver'],
            'clientes' => ['ver', 'crear', 'editar'],
            'fincas' => ['ver', 'crear', 'editar'],
            'compra_fincas' => ['ver', 'crear', 'editar', 'reportes'],
            'financistas' => ['ver', 'reportes'],
            'comisionistas' => ['ver', 'editar', 'reportes'],
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
            'clientes' => ['ver', 'crear', 'editar'],
            'fincas' => ['ver', 'crear', 'editar', 'desactivar'],
            'compra_fincas' => ['ver', 'crear', 'editar', 'eliminar', 'reportes'],
            'financistas' => ['ver', 'editar', 'pagar', 'reportes'],
            'comisionistas' => ['ver', 'editar', 'pagar', 'reglas', 'reportes'],
            'lotes' => ['ver', 'crear', 'editar', 'eliminar', 'servicios', 'imagenes'],
            'negociaciones' => ['ver', 'crear', 'ajustar_condiciones', 'rescindir', 'contrato'],
            'pagos_terreno' => ['ver', 'cobrar', 'anular'],
            'tasas_inmobiliarias' => ['ver', 'crear', 'editar', 'desactivar'],
            'reportes_inmobiliarios' => ['generar', 'exportar'],
            'refrendos' => ['ver', 'validar', 'calcular', 'procesar'],
            'creditos' => ['ver', 'renovar'],
            'compras' => ['ver', 'crear', 'editar'],
            'prendas' => ['ver', 'cambiar_estado'],
            'ventas' => ['ver', 'modificar_precio', 'aplicar_descuento'],
            'reportes' => ['generar', 'exportar'],
            'remates' => ['ver'],
            'caja' => ['abrir', 'cerrar', 'ver_movimientos', 'gestionar_cajas'],
            'boveda' => ['ver', 'movimientos', 'aprobar', 'reportes'],
            'categorias_productos' => ['ver', 'crear', 'editar'],
            'gastos' => ['ver', 'crear', 'editar', 'asignar_credito'],
            'cobros' => ['realizar', 'ver', 'imprimir_recibo'],
            'recibos' => ['ver', 'crear', 'imprimir', 'anular'],
            'historial' => ['ver'],
            'otros_gastos' => ['ver', 'crear', 'anular'],
            'cotizaciones' => ['ver', 'crear', 'editar', 'eliminar', 'convertir'],
            'planes_interes' => ['ver'],
            'transferencias' => ['ver', 'crear', 'aprobar', 'anular'],
        ],
    ];
}
