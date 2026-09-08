/**
 * Tipos para el módulo de Gastos
 * 
 * Los gastos son cargos adicionales de un crédito que:
 * - NO se suman al principal
 * - NO generan interés
 * - SÍ se agregan al plan de pagos como cargos
 */

export type TipoGasto = 'FIJO' | 'VARIABLE'

/**
 * Gasto del catálogo
 */
export interface Gasto {
  id_gasto: number
  nombre: string
  tipo: TipoGasto
  porcentaje: number | null
  monto: number | null
  descripcion: string | null
  activo: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  creditos_count?: number  // Contador de créditos asociados (para eliminación)
  // Computed
  valor_formateado?: string
}

/**
 * Gasto con valor calculado (asociado a un crédito)
 */
export interface GastoCalculado extends Gasto {
  valor_calculado: number
}

/**
 * DTO para crear un gasto
 */
export interface CrearGastoDTO {
  nombre: string
  tipo: TipoGasto
  porcentaje?: number | null
  monto?: number | null
  descripcion?: string | null
  activo?: boolean
}

/**
 * DTO para actualizar un gasto
 */
export interface ActualizarGastoDTO {
  nombre?: string
  tipo?: TipoGasto
  porcentaje?: number | null
  monto?: number | null
  descripcion?: string | null
  activo?: boolean
}

/**
 * DTO para sincronizar gastos de un crédito
 */
export interface SyncGastosCreditoDTO {
  gas_ids: number[]
}

/**
 * Respuesta de gastos de un crédito
 */
export interface GastosCreditoResponse {
  gastos: GastoCalculado[]
  total_gastos: number
  monto_otorgado: number
}

/**
 * Respuesta del catálogo de gastos (paginado)
 */
export interface GastosListResponse {
  success: boolean
  data: Gasto[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  total?: number
}

/**
 * Respuesta de cálculo de gasto
 */
export interface CalcularGastoResponse {
  gasto: Gasto
  monto_otorgado: number
  valor_calculado: number
}

/**
 * Cuota del plan de pagos con gastos
 */
export interface CuotaPlanPagos {
  id: string
  numero_cuota: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: string
  // Componentes de la cuota
  capital: number
  interes: number
  gastos: number
  mora: number
  cuota_base: number
  cuota_total: number
  // Compatibilidad
  capital_proyectado: number
  interes_proyectado: number
  mora_proyectada: number
  monto_cuota_proyectado: number
  // Pagos realizados
  capital_pagado: number
  interes_pagado: number
  mora_pagada: number
  monto_total_pagado: number
  // Pendientes
  capital_pendiente: number
  interes_pendiente: number
  mora_pendiente: number
  monto_pendiente: number
  saldo_capital_credito: number
  dias_mora: number
  es_cuota_gracia: boolean
  observaciones: string | null
}

/**
 * Resumen del plan de pagos
 */
export interface ResumenPlanPagos {
  monto_otorgado: number
  total_capital: number
  total_interes: number
  total_gastos: number
  total_a_pagar: number
  numero_cuotas: number
  gastos_detalle: GastoCalculado[]
}

/**
 * Respuesta del plan de pagos con gastos
 */
export interface PlanPagosConGastosResponse {
  success: boolean
  data: CuotaPlanPagos[]
  resumen: ResumenPlanPagos
}

/**
 * Cuota de simulación
 */
export interface CuotaSimulacion {
  numero_cuota: number
  fecha_vencimiento: string
  capital: number
  interes: number
  gastos: number
  cuota_base: number
  cuota_total: number
  otros: number
  cuota: number
  saldo: number
}

/**
 * Respuesta de simulación de plan
 */
export interface SimularPlanResponse {
  success: boolean
  data: CuotaSimulacion[]
  resumen: {
    monto_otorgado: number
    total_interes: number
    total_gastos: number
    total_a_pagar: number
    numero_cuotas: number
    gastos_detalle: GastoCalculado[]
  }
}
