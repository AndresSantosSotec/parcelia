export const ESTADOS_LOTE: Record<string, { etiqueta: string; color: string }> = {
  disponible: { etiqueta: 'Disponible', color: '#22c55e' },
  reservado: { etiqueta: 'Reservado', color: '#f59e0b' },
  en_negociacion: { etiqueta: 'En negociación', color: '#3b82f6' },
  vendido: { etiqueta: 'Vendido', color: '#ef4444' },
  pagado: { etiqueta: 'Pagado', color: '#a855f7' },
  cancelado: { etiqueta: 'Cancelado', color: '#6b7280' },
}

export function estadoLote(estado: string) {
  return ESTADOS_LOTE[estado] ?? { etiqueta: estado, color: '#94a3b8' }
}

export const ESTADOS_NEGOCIACION: Record<string, string> = {
  borrador: 'Borrador',
  reservada: 'Reservada',
  activa: 'Al día',
  en_mora: 'En mora',
  pagada_total: 'Liquidada',
  rescindida: 'Rescindida',
}

export const CLAVE_VENTA_DESDE_PLANO = 'parcelia_venta_desde_plano'
export const CLAVE_VER_NEGOCIACION = 'parcelia_ver_negociacion'

export function quetzales(valor: number | string | null | undefined) {
  const n = Number(valor ?? 0)
  return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
