// Tipos para el sistema de créditos prendarios
// Basado en las tablas de Laravel: creditos_prendarios, prendas, tasaciones, etc.

export type EstadoCreditoPrendario =
  | 'solicitado'
  | 'en_analisis'
  | 'aprobado'
  | 'rechazado'
  | 'vigente'
  | 'vencido'
  | 'renovado'
  | 'pagado'
  | 'en_mora'
  | 'rescatado'
  | 'rematado'
  | 'vendido'
  | 'en_inventario'
  | 'anulado'
  | 'incobrable'
  | 'cancelado'
  | 'prenda_vendida'

export type TipoInteres = 'mensual' | 'quincenal' | 'catorcenal' | 'cada_28_dias' | 'semanal' | 'diario'

export interface CreditoPrendario {
  id: string
  codigo_credito: string // AUTO: EMP-YYYYMMDD-XXXXXX
  cliente_id: string
  sucursal_id: string
  usuario_creador_id: string
  usuario_aprobador_id?: string
  usuario_desembolso_id?: string

  // Montos
  monto_solicitado: number
  monto_aprobado?: number
  monto_desembolsado?: number
  capital_pendiente: number
  intereses_pendientes: number
  mora_pendiente: number
  otros_cargos_pendientes: number

  // Tasas
  tasa_interes: number
  tasa_mora: number
  tipo_interes: TipoInteres

  // Plazos
  plazo_dias: number
  numero_cuotas: number
  dias_gracia: number

  // Fechas
  fecha_solicitud: string
  fecha_aprobacion?: string
  fecha_desembolso?: string
  fecha_vencimiento?: string
  fecha_ultimo_pago?: string
  fecha_cierre?: string

  // Estado
  estado: EstadoCreditoPrendario
  motivo_rechazo?: string

  // Seguimiento
  renovaciones: number
  renovado_de_credito_id?: string

  // Observaciones
  observaciones_solicitud?: string
  observaciones_aprobacion?: string
  observaciones_cierre?: string

  // Metadata
  created_at: string
  updated_at: string
  deleted_at?: string

  // Campos adicionales (agregados/calculados)
  capital_pagado?: number
  interes_pagado?: number
  mora_pagada?: number
  observaciones?: string
  numero_credito?: string // Legacy/Alias de codigo_credito

  // Relaciones
  cliente?: Cliente
  sucursal?: Sucursal
  prendas?: PrendaEmpenada[]
  plan_pagos?: CreditoPlanPago[]
  movimientos?: CreditoMovimiento[]
  // Gastos asociados
  gastos?: CreditoGasto[]
  total_gastos?: number
}

// Gasto asociado a un crédito
export interface CreditoGasto {
  id_gasto: number
  nombre: string
  tipo: 'FIJO' | 'VARIABLE'
  porcentaje?: number | null
  monto?: number | null
  valor_calculado: number
}

export interface Cliente {
  id: string
  codigo_cliente: string // AUTO: CLI-YYYYMMDD-XXXXXX
  nombres: string
  apellidos: string
  dpi: string
  nit?: string
  fecha_nacimiento: string
  genero: 'masculino' | 'femenino' | 'otro'
  telefono: string
  telefono_secundario?: string
  email?: string
  direccion: string
  municipio?: string
  departamento_geoname_id?: number
  municipio_geoname_id?: number
  fotografia?: string
  estado: 'activo' | 'inactivo'
  sucursal_id?: string
  tipo_cliente?: 'regular' | 'vip'
  notas?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Sucursal {
  id: string
  nombre: string
  codigo: string
  direccion: string
  telefono?: string
  email?: string
  municipio?: string
  departamento_geoname_id?: number
  municipio_geoname_id?: number
  estado: 'activa' | 'inactiva'
  created_at: string
  updated_at: string
  deleted_at?: string
}

export type EstadoPrenda =
  | 'en_custodia'
  | 'en_evaluacion'
  | 'recuperada'
  | 'en_venta'
  | 'vendida'
  | 'extraviada'
  | 'danada'

export type CondicionFisica = 'excelente' | 'muy_buena' | 'buena' | 'regular' | 'mala'

// Tipos para imágenes normalizadas
export interface PrendaImagenNormalizada {
  id: string;
  url: string;
  thumbnail_url?: string;
  tipo: 'principal' | 'frontal' | 'trasera' | 'lateral' | 'detalle' | 'defecto' | 'marca' | 'serie' | 'general';
  etiqueta?: string;
  descripcion?: string;
  es_principal: boolean;
  orden: number;
  dimensiones?: string;
  tamano?: string;
}

// Tipos para datos adicionales normalizados (EAV)
export interface PrendaDatoAdicionalNormalizado {
  campo: string;
  valor: string;
  tipo: 'text' | 'number' | 'select' | 'checkbox' | 'date';
  label: string;
}

export interface PrendaEmpenada {
  id: string
  codigo_prenda: string // AUTO: PRN-YYYYMMDD-XXXXXX
  credito_prendario_id: string
  cliente_id: string
  codigo_cliente_propietario: string // Denormalizado para búsquedas rápidas
  categoria_producto_id: string

  // Descripción
  descripcion?: string
  descripcion_general?: string
  marca?: string
  modelo?: string
  numero_serie?: string
  color?: string
  material?: string
  tamano_peso?: string
  caracteristicas_especiales?: string
  condicion_fisica?: CondicionFisica

  // Valores
  valor_tasacion?: number
  valor_prestamo?: number
  valor_venta?: number
  valor_venta_final?: number

  // Ubicación física
  seccion_almacen?: string
  estante?: string
  caja?: string
  ubicacion_detalle?: string

  // Fotos (legacy - JSON array, puede contener strings u objetos con url)
  fotos?: (string | { url: string; [key: string]: any })[]
  foto_principal?: string

  // Imágenes normalizadas (nueva estructura)
  imagenes?: PrendaImagenNormalizada[]
  imagen_principal?: {
    id: string;
    url: string;
    thumbnail_url?: string;
  }

  // Datos adicionales normalizados (nueva estructura EAV)
  datos_adicionales_normalizados?: PrendaDatoAdicionalNormalizado[]

  // Estado
  estado?: EstadoPrenda
  en_plan_pagos?: boolean
  fecha_ingreso?: string
  fecha_venta?: string
  fecha_recuperacion?: string
  comprador_id?: string

  // Observaciones
  observaciones?: string

  // Metadata
  created_at?: string
  updated_at?: string
  deleted_at?: string

  // Relaciones
  categoria?: string | CategoriaProducto
  tasaciones?: Tasacion[]
  credito?: CreditoPrendario
}

export interface CategoriaProducto {
  id: string
  nombre: string
  descripcion?: string
  porcentaje_prestamo_default: number
  tasa_interes_default: number
  plazo_dias_default: number
  requiere_serie: boolean
  campos_adicionales?: Record<string, any>
  estado: 'activa' | 'inactiva'
  created_at: string
  updated_at: string
  deleted_at?: string
}

export type MetodoValuacion =
  | 'comparacion_mercado'
  | 'valor_reposicion'
  | 'valor_liquidacion'
  | 'pericial'

export type EstadoTasacion = 'pendiente' | 'aprobada' | 'rechazada' | 'revision'

export interface Tasacion {
  id: string
  prenda_id: string
  tasador_id: string
  aprobador_id?: string

  // Valores
  valor_mercado: number
  valor_comercial: number
  valor_liquidacion: number
  valor_final_asignado: number
  porcentaje_prestamo: number

  // Métodos y criterios
  metodo_valuacion: MetodoValuacion
  criterios_evaluacion?: string
  observaciones?: string

  // Fotos
  fotos_tasacion: string[] // JSON array

  // Aprobación
  estado: EstadoTasacion
  fecha_tasacion: string
  fecha_aprobacion?: string
  motivo_rechazo?: string

  // Metadata
  created_at: string
  updated_at: string
  deleted_at?: string
}

export type EstadoCuota = 'pendiente' | 'pagada' | 'parcial' | 'pagada_parcial' | 'vencida' | 'refinanciada' | 'renovada'

export interface CreditoPlanPago {
  id: string
  credito_prendario_id?: string
  numero_cuota: number

  // Montos proyectados
  fecha_vencimiento: string
  capital_proyectado: number
  interes_proyectado: number
  mora_proyectada: number
  gastos_proyectado?: number // Gastos prorrateados (no generan interés)
  monto_cuota_proyectado: number // Nombre correcto según API

  // Montos pagados
  capital_pagado: number
  interes_pagado: number
  mora_pagada: number
  gastos_pagado?: number
  monto_total_pagado: number // Nombre correcto según API

  // Saldos pendientes
  capital_pendiente?: number
  interes_pendiente?: number
  mora_pendiente?: number
  gastos_pendiente?: number
  monto_pendiente?: number
  saldo_capital_credito?: number
  
  // Alias por compatibilidad
  saldo_capital?: number
  saldo_pendiente?: number
  total_cuota_proyectada?: number // Alias
  total_pagado?: number // Alias

  // Estado
  estado: EstadoCuota
  fecha_pago?: string
  dias_mora: number
  monto_mora?: number

  // Refinanciamiento
  refinanciado?: boolean
  credito_refinanciamiento_id?: string
  es_cuota_gracia?: boolean

  // Metadata
  created_at?: string
  updated_at?: string
  deleted_at?: string
}

export type TipoMovimiento =
  | 'desembolso'
  | 'pago_capital'
  | 'pago_interes'
  | 'pago_mora'
  | 'cargo_administrativo'
  | 'descuento'
  | 'reversa'
  | 'ajuste'

export type FormaPago = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'mixto'

export interface CreditoMovimiento {
  id: string
  credito_prendario_id: string
  plan_pago_id?: string
  usuario_id: string
  tipo_movimiento: TipoMovimiento

  // Desglose del movimiento
  monto_total: number
  monto_capital: number
  monto_interes: number
  monto_mora: number
  monto_otros: number

  // Saldos después del movimiento
  saldo_capital_despues: number
  saldo_interes_despues: number
  saldo_mora_despues: number
  saldo_total_despues: number

  // Pago
  forma_pago?: FormaPago
  numero_recibo?: string
  numero_transaccion?: string
  banco?: string
  numero_cheque?: string
  numero_autorizacion?: string

  // Reversión
  reversado: boolean
  movimiento_reversa_id?: string
  motivo_reversa?: string
  fecha_reversa?: string
  usuario_reversa_id?: string

  // Observaciones
  observaciones?: string
  comprobante_url?: string

  // Metadata
  fecha_movimiento: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

// DTOs para operaciones

export interface CrearCreditoPrendarioDTO {
  cliente_id: string
  sucursal_id: string
  monto_solicitado: number
  observaciones_solicitud?: string
  prendas: CrearPrendaDTO[]
}

export interface CrearPrendaDTO {
  categoria_producto_id: string
  descripcion_general: string
  marca?: string
  modelo?: string
  numero_serie?: string
  color?: string
  material?: string
  condicion_fisica: CondicionFisica
  fotos: string[]
  valor_estimado?: number
  datos_adicionales?: Record<string, any>
}

export type TipoMora = 'porcentaje' | 'monto_fijo'

export interface AprobarCreditoDTO {
  monto_aprobado: number
  tasa_interes: number
  tasa_mora: number
  tipo_mora?: TipoMora
  mora_monto_fijo?: number | null
  tipo_interes: TipoInteres
  metodo_calculo?: 'francesa' | 'flat'
  afecta_interes_mensual?: boolean
  permite_pago_capital_diferente?: boolean
  plazo_dias: number
  numero_cuotas: number
  dias_gracia: number
  observaciones_aprobacion?: string
}

export interface RechazarCreditoDTO {
  motivo_rechazo: string
}

export interface DesembolsarCreditoDTO {
  monto_desembolsado: number
  forma_pago: FormaPago
  numero_recibo?: string
  numero_transaccion?: string
  banco?: string
  observaciones?: string
}

export interface RegistrarPagoDTO {
  monto_total: number
  forma_pago: FormaPago
  numero_recibo?: string
  numero_transaccion?: string
  banco?: string
  numero_cheque?: string
  numero_autorizacion?: string
  observaciones?: string
}

export interface CrearTasacionDTO {
  prenda_id?: string
  valor_mercado: number
  valor_comercial?: number
  valor_liquidacion?: number
  valor_final_asignado?: number
  porcentaje_prestamo?: number
  porcentaje_base?: number
  metodo_valuacion?: MetodoValuacion
  criterios_evaluacion?: string
  observaciones?: string
  fotos_tasacion?: string[]
  // Factores de tasación
  antiguedad?: number
  demanda_local?: 'alta' | 'media' | 'baja'
  riesgo_almacenamiento?: 'bajo' | 'medio' | 'alto'
  dificultad_reventa?: 'baja' | 'media' | 'alta'
  ajuste_manual?: number
  factores_aplicados?: string
}

export interface AprobarTasacionDTO {
  valor_final_asignado: number
  observaciones?: string
}

// Filtros

export interface CreditoPrendarioFiltros {
  busqueda?: string
  estado?: EstadoCreditoPrendario | EstadoCreditoPrendario[]
  cliente_id?: string
  sucursal_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  fecha_vencimiento_desde?: string
  fecha_vencimiento_hasta?: string
  monto_min?: number
  monto_max?: number
  codigo_credito?: string
  codigo_cliente?: string
  solo_vencidos?: boolean
  solo_en_mora?: boolean
  page?: number
  per_page?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}

export interface PrendaFiltros {
  busqueda?: string
  estado?: EstadoPrenda | EstadoPrenda[]
  categoria_id?: string
  cliente_id?: string
  codigo_prenda?: string
  codigo_cliente?: string
  valor_min?: number
  valor_max?: number
}

export interface TasacionFiltros {
  estado?: EstadoTasacion | EstadoTasacion[]
  tasador_id?: string
  prenda_id?: string
  fecha_desde?: string
  fecha_hasta?: string
}

// Respuestas de estadísticas

export interface CreditoPrendarioStats {
  total: number
  solicitados: number
  en_analisis: number
  aprobados: number
  vigentes: number
  vencidos: number
  en_mora: number
  pagados: number
  rechazados: number
  monto_total_vigente: number
  monto_total_vencido: number
  monto_total_en_mora: number
  monto_total_desembolsado: number
  monto_total_recuperado: number
}

export interface PrendaStats {
  total: number
  en_custodia: number
  en_evaluacion: number
  en_venta: number
  vendidas: number
  recuperadas: number
  valor_total_custodia: number
  valor_total_venta: number
}

// Info de paginación (compatible con Laravel)
export interface PaginationInfo {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number
  to: number
}

// Respuesta API genérica
export interface ApiResponse<T> {
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
  meta?: any
}

// ============================================================================
// TIPOS PARA PAGOS Y MOVIMIENTOS
// ============================================================================

export type TipoPago = 'CUOTA' | 'RENOVACION' | 'ADELANTO' | 'PARCIAL' | 'LIQUIDACION'

export interface OpcionAdelanto {
  periodos: number
  descripcion: string
  monto_interes: number
  monto_total: number
}

export interface OpcionCuotaAdelanto {
  cuotas: number
  descripcion: string
  monto_total: number
  capital_total: number
}

export interface CalculoPagoResponse {
  fecha_calculo: string
  dias_transcurridos: number
  periodos_cobrados: number
  tipo_periodo: TipoInteres
  capital_pendiente: number
  interes_acumulado: number
  interes_periodo_actual: number
  mora_acumulada: number
  otros_acumulados: number
  dias_mora: number
  total_para_liquidar: number
  minimo_renovacion: number
  interes_por_periodo: number
  monto_cuota_actual: number
  cuota_capital: number
  cuota_interes: number
  cuota_mora: number
  cuota_gastos: number
  cuota_numero?: number
  fecha_vencimiento?: string
  en_mora: boolean
  debug_calculo?: {
    usa_plan_pagos: boolean
    fecha_base?: string
    dias_transcurridos: number
    cuotas_pendientes_count?: number
    tasa_mensual?: number
    tipo_interes?: string
    periodos_cobrados?: number
    capital_total?: number
    interes_total?: number
    mora_total?: number
    otros_total?: number
    total_para_liquidar?: number
    total_recalculado?: number
    diferencia_total?: number
    incluye_otros?: boolean
    cuotas?: Array<{
      numero_cuota: number
      estado: string
      fecha_vencimiento?: string
      capital_pendiente: number
      interes_pendiente: number
      mora_pendiente: number
      otros_pendiente: number
      monto_pendiente: number
    }>
  }
  opciones_adelanto: OpcionAdelanto[]
  opciones_cuotas_adelanto: OpcionCuotaAdelanto[]
}

export interface EjecutarPagoDTO {
  tipo: TipoPago
  monto: number
  metodo_pago?: string
  referencia?: string
  observaciones?: string
  idempotency_key: string
  periodos?: number // Para RENOVACION
  cuotas?: number // Para ADELANTO
}

export interface PagoResponse {
  id: string
  credito_prendario_id: string
  tipo_movimiento: string
  fecha_movimiento: string
  monto_total: number
  capital: number
  interes: number
  mora: number
  otros_cargos: number
  saldo_capital: number
  numero_movimiento: string
  observaciones?: string
  estado: string
}
