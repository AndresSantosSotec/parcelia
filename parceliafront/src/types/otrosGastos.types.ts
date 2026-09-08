// Tipos para el módulo Otros Gastos

export type TipoMovimiento = 'ingreso' | 'egreso'
export type TipoLinea = 'bien' | 'servicio'
export type FormaPago = 'efectivo' | 'transferencia' | 'cheque' | 'otro'
export type EstadoMovimiento = 'aplicado' | 'anulado'

export interface OtroGastoTipo {
  id: number
  nombre: string
  tipo: TipoMovimiento
  grupo: string | null
  nomenclatura: string | null
  tipo_linea: TipoLinea
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface OtroGastoMovimiento {
  id: number
  user_id: number
  sucursal_id: number | null
  otro_gasto_tipo_id: number
  caja_id: number | null
  movimiento_caja_id: number | null
  fecha: string
  tipo: TipoMovimiento
  monto: number
  concepto: string
  descripcion: string | null
  numero_recibo: string | null
  forma_pago: FormaPago
  estado: EstadoMovimiento
  anulado_motivo: string | null
  created_at: string
  tipo_gasto?: OtroGastoTipo
  user?: { id: number; name: string }
  sucursal?: { id: number; nombre: string }
}

export interface CrearMovimientoDTO {
  otro_gasto_tipo_id: number
  monto: number
  concepto: string
  descripcion?: string
  fecha?: string
  numero_recibo?: string
  forma_pago?: FormaPago
}

export interface CrearTipoDTO {
  nombre: string
  tipo: TipoMovimiento
  grupo?: string
  nomenclatura?: string
  tipo_linea?: TipoLinea
  descripcion?: string
  activo?: boolean
}

export interface ResumenMes {
  mes: number
  anio: number
  totales: {
    total_ingresos: number
    total_egresos: number
    total_movimientos: number
  }
  por_tipo: Array<{
    nombre: string
    tipo: TipoMovimiento
    subtotal: number
    cantidad: number
  }>
}
