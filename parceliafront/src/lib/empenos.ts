/**
 * El código de empeños se conserva, pero no forma parte de la operación
 * de Parcelia. Reactivar solo con VITE_EMPENOS_ENABLED=true y el flag
 * equivalente en el backend (EMPENOS_ENABLED).
 */
export const EMPENOS_ENABLED = import.meta.env.VITE_EMPENOS_ENABLED === 'true'

export const MODULOS_EMPENO = [
  'creditos',
  'prendas',
  'ventas',
  'cobros',
  'historial',
  'categorias_productos',
  'planes_interes',
  'cotizaciones',
  'boveda',
  'compras',
  'remates',
  'transferencias',
  'migracion',
] as const

export function isModuloEmpeno(modulo: string): boolean {
  return (MODULOS_EMPENO as readonly string[]).includes(modulo)
}

/** Herramientas de soporte que el superadmin sí usa aunque empeños esté apagado. */
export const MODULOS_SOPORTE_SUPERADMIN = ['categorias_productos'] as const

export function esModuloSoporteSuperadmin(modulo: string): boolean {
  return (MODULOS_SOPORTE_SUPERADMIN as readonly string[]).includes(modulo)
}

export function isModuloOcultoEnOperacion(modulo: string, esSuperAdmin = false): boolean {
  if (EMPENOS_ENABLED) {
    return false
  }
  if (esSuperAdmin && esModuloSoporteSuperadmin(modulo)) {
    return false
  }
  return isModuloEmpeno(modulo)
}

export function isModuloVisible(modulo: string): boolean {
  if (EMPENOS_ENABLED) {
    return true
  }
  return !isModuloEmpeno(modulo)
}
