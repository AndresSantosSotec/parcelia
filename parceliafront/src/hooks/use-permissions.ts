import { useMemo } from 'react'

export interface Permiso {
  modulo: string
  acciones: string[]
}

/**
 * API/login puede enviar permisos agrupados `{ modulo, acciones[] }` o planos `{ modulo, accion }`.
 * El hook solo entiende el formato agrupado.
 */
export function normalizePermisosInput(raw: unknown): Permiso[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const first = raw[0] as Record<string, unknown>
  if (first && Array.isArray(first.acciones)) {
    return raw as Permiso[]
  }
  const byModule = new Map<string, Set<string>>()
  for (const row of raw as Record<string, unknown>[]) {
    const m = row?.modulo
    const a = row?.accion
    if (typeof m !== 'string' || typeof a !== 'string') continue
    if (!byModule.has(m)) byModule.set(m, new Set())
    byModule.get(m)!.add(a)
  }
  return Array.from(byModule.entries()).map(([modulo, acciones]) => ({
    modulo,
    acciones: Array.from(acciones),
  }))
}

export interface UserWithPermissions {
  id: string
  nombre: string
  username: string
  email: string
  rol: string
  activo: boolean
  permisos: Permiso[]
}

// Módulos del sistema
export const MODULOS = [
  'dashboard',
  'clientes',
  'sucursales',
  'categorias_productos',
  'simulador',
  'creditos',
  'prendas',
  'ventas',
  'caja',
  'cotizaciones',
  'boveda',
  'reportes',
  'usuarios',
  'compras',
  'remates',
  'auditoria',
  'migracion',
  'recibos',
  'cobros',
  'historial',
  'gastos',
  'otros_gastos',
  'contabilidad',
  'planes_interes',
  'transferencias',
] as const

export type Modulo = typeof MODULOS[number]

// Mapeo de módulos a IDs de navegación
export const MODULO_NAV_MAP: Record<Modulo, string> = {
  dashboard: 'dashboard',
  clientes: 'clientes',
  sucursales: 'sucursales',
  categorias_productos: 'categorias_productos',
  simulador: 'simulador',
  creditos: 'creditos',
  prendas: 'prendas',
  ventas: 'ventas',
  caja: 'caja',
  cotizaciones: 'cotizaciones',
  boveda: 'boveda',
  reportes: 'reportes',
  usuarios: 'usuarios',
  compras: 'compras',
  remates: 'remates',
  auditoria: 'auditoria',
  migracion: 'migracion',
  recibos: 'recibos',
  cobros: 'cobros',
  historial: 'historial',
  gastos: 'gastos',
  otros_gastos: 'otros_gastos',
  contabilidad: 'contabilidad',
  planes_interes: 'planes_interes',
  transferencias: 'transferencias',
}

// Acciones por módulo
export const ACCIONES_POR_MODULO: Record<Modulo, string[]> = {
  dashboard: ['ver'],
  clientes: ['ver', 'crear', 'editar', 'eliminar'],
  sucursales: ['ver', 'crear', 'editar', 'eliminar'],
  categorias_productos: ['ver', 'crear', 'editar', 'eliminar'],
  simulador: ['usar', 'imprimir', 'guardar', 'editar_tasa_interes'],
  creditos: ['ver', 'crear', 'renovar', 'cancelar', 'pasar_venta', 'editar_tasa_interes', 'editar_mora'],
  prendas: ['ver', 'editar', 'cambiar_estado', 'vender'],
  ventas: ['ver', 'tasar', 'vender', 'apartar', 'crear_plan_pago', 'modificar_precio', 'aplicar_descuento'],
  caja: ['abrir', 'cerrar', 'ver_movimientos', 'gestionar_cajas'],
  cotizaciones: ['ver', 'crear', 'editar', 'eliminar', 'convertir'],
  boveda: ['ver', 'crear', 'editar', 'eliminar', 'movimientos', 'aprobar', 'reportes'],
  cobros: ['realizar', 'ver', 'imprimir_recibo'],
  historial: ['ver'],
  reportes: ['generar', 'exportar'],
  usuarios: ['ver', 'crear', 'editar', 'eliminar', 'asignar_permisos'],
  compras: ['ver', 'crear', 'editar', 'eliminar'],
  remates: ['ver', 'crear', 'cancelar'],
  auditoria: ['ver', 'exportar'],
  migracion: ['ver', 'importar', 'descargar_plantilla'],
  recibos: ['ver', 'crear', 'imprimir', 'anular'],
  gastos: ['ver', 'crear', 'editar', 'eliminar', 'asignar_credito'],
  otros_gastos: ['ver', 'crear', 'editar', 'eliminar', 'anular'],
  contabilidad: ['ver', 'configurar', 'asientos', 'reportes'],
  planes_interes: ['ver', 'crear', 'editar', 'eliminar'],
  transferencias: ['ver', 'crear', 'aprobar', 'anular'],
}

// Nombres legibles de acciones
export const ACCION_LABELS: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  usar: 'Usar',
  imprimir: 'Imprimir',
  guardar: 'Guardar',
  renovar: 'Renovar',
  cancelar: 'Cancelar',
  pasar_venta: 'Pasar a Venta',
  editar_tasa_interes: 'Modificar tasa de interés (%)',
  editar_mora: 'Modificar mora (tasa / tipo / monto fijo)',
  cambiar_estado: 'Cambiar Estado',
  vender: 'Vender',
  tasar: 'Tasar',
  apartar: 'Apartar',
  crear_plan_pago: 'Crear Plan de Pago',
  modificar_precio: 'Modificar Precio',
  aplicar_descuento: 'Aplicar Descuento',
  abrir: 'Abrir',
  cerrar: 'Cerrar',
  ver_movimientos: 'Ver Movimientos',
  gestionar_cajas: 'Gestionar Cajas',
  realizar: 'Realizar',
  imprimir_recibo: 'Imprimir Recibo',
  generar: 'Generar',
  exportar: 'Exportar',
  asignar_permisos: 'Asignar Permisos',
  anular: 'Anular',
  movimientos: 'Registrar Movimientos',
  aprobar: 'Aprobar/Rechazar',
  reportes: 'Ver Reportes',
  importar: 'Importar Datos',
  descargar_plantilla: 'Descargar Plantilla',
  configurar: 'Configurar Cuentas',
  asientos: 'Ver Asientos',
}

// Nombres legibles de módulos
export const MODULO_LABELS: Record<Modulo, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  sucursales: 'Sucursales',
  categorias_productos: 'Categorías de Productos',
  simulador: 'Simulador',
  creditos: 'Créditos',
  prendas: 'Prendas',
  ventas: 'Ventas',
  caja: 'Caja',
  recibos: 'Recibos',
  boveda: 'Bóveda',
  cobros: 'Cobros',
  historial: 'Historial',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  compras: 'Compras',
  remates: 'Remates',
  auditoria: 'Auditoría',
  migracion: 'Migración de Datos',
  cotizaciones: 'Cotizaciones',
  gastos: 'Catálogo de Gastos',
  otros_gastos: 'Otros Gastos',
  contabilidad: 'Contabilidad',
  planes_interes: 'Productos Crediticios',
  transferencias: 'Transferencias',
}

interface UsePermissionsResult {
  // Verificar si tiene permiso específico
  hasPermission: (modulo: Modulo, accion: string) => boolean
  // Verificar si tiene acceso a un módulo (cualquier acción)
  hasModuleAccess: (modulo: Modulo) => boolean
  // Obtener las acciones permitidas para un módulo
  getModuleActions: (modulo: Modulo) => string[]
  // Verificar si es administrador
  isAdmin: boolean
  // Verificar si es superadmin
  isSuperAdmin: boolean
  // Obtener todos los módulos accesibles
  accessibleModules: Modulo[]
  // Los permisos del usuario
  permisos: Permiso[]
}

export function usePermissions(user: UserWithPermissions | null | undefined): UsePermissionsResult {
  const permisos = useMemo(() => normalizePermisosInput(user?.permisos ?? []), [user?.permisos])
  // En etapa de desarrollo: Acceso 100% libre a todos los módulos y acciones
  const isAdmin = true
  const isSuperAdmin = true

  const hasPermission = (_modulo: Modulo, _accion: string): boolean => true
  const hasModuleAccess = (_modulo: Modulo): boolean => true
  const getModuleActions = (modulo: Modulo): string[] => ACCIONES_POR_MODULO[modulo] || ['ver', 'crear', 'editar', 'eliminar', 'exportar']
  const accessibleModules = [...MODULOS]

  return {
    hasPermission,
    hasModuleAccess,
    getModuleActions,
    isAdmin,
    isSuperAdmin,
    accessibleModules,
    permisos,
  }
}

// Hook para obtener permisos desde el contexto de la sesión
export function useUserPermissions() {
  // Este hook se usará cuando tengamos un contexto de autenticación
  // Por ahora, devolvemos una función helper
  return {
    checkPermission: (permisos: Permiso[], modulo: Modulo, accion: string): boolean => {
      for (const p of permisos) {
        if (p.modulo === modulo && p.acciones.includes(accion)) {
          return true
        }
      }
      return false
    },
    checkModuleAccess: (permisos: Permiso[], modulo: Modulo): boolean => {
      return permisos.some(p => p.modulo === modulo)
    },
  }
}
