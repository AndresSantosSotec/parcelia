/**
 * Tipos TypeScript para el Sistema de Refrendos Mejorado
 */

export type TipoRefrendo = 'parcial' | 'total' | 'con_capital' | 're_empeno';

export interface Refrendo {
  id: number;
  credito_id: number;
  numero_refrendo: number;
  tipo_refrendo: TipoRefrendo;
  
  // Montos
  monto_interes_adeudado: number;
  monto_mora_adeudado: number;
  monto_capital_pagado: number;
  monto_total_pagado: number;
  
  // Fechas
  fecha_refrendo: string;
  fecha_vencimiento_anterior: string;
  fecha_vencimiento_nueva: string;
  dias_extendidos: number;
  
  // Configuración aplicada
  tasa_interes_aplicada: number;
  plazo_dias_nuevo: number;
  promocion_aplicada: string | null;
  descuento_aplicado: number;
  
  // Auditoría
  usuario_id: number;
  sucursal_id: number;
  caja_movimiento_id: number | null;
  recibo_pdf_url: string | null;
  observaciones: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Relaciones cargadas
  usuario?: {
    id: number;
    name: string;
    email: string;
  };
  sucursal?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  credito?: any; // CreditoPrendario
  movimientoCaja?: any; // MovimientoCaja
  
  // Accessors (si se devuelven desde el backend)
  monto_neto_pagado?: number;
  tiene_promocion?: boolean;
  tipo_refrendo_descripcion?: string;
}

export interface ValidacionRefrendoResponse {
  valido: boolean;
  mensaje: string;
  codigo?: string;
  refrendos_realizados?: number;
  refrendos_maximos?: number;
  refrendos_disponibles?: number | 'ilimitado';
  /** true cuando el crédito está pagado y se puede re-empeñar (reactivar) */
  es_re_empeno?: boolean;
  /** Configuración que tenía el crédito (para ofrecer "usar config anterior") */
  config_anterior?: {
    monto_aprobado: number;
    plazo_dias: number;
    tasa_interes: number;
    tipo_interes: string;
  };
}

export interface CalculoRefrendoResponse {
  interes_adeudado: number;
  mora_adeudada: number;
  otros_adeudados?: number;
  interes_a_pagar: number;
  mora_a_pagar: number;
  capital_minimo_requerido: number;
  requiere_capital: boolean;
  abono_capital: number;
  monto_minimo: number;
  tipo_refrendo: TipoRefrendo;
  promocion_aplicada: string | null;
  descuento_aplicado: number;
  nueva_fecha_vencimiento: string;
  plazo_dias: number;
  tasa_interes: number;
  /** Re-empeño: nuevo monto y plazo del crédito reactivado */
  es_re_empeno?: boolean;
  monto_prestamo_nuevo?: number;
  plazo_dias_nuevo?: number;
  tipo_interes_nuevo?: string;
}

export interface CrearRefrendoDTO {
  tipo_refrendo: TipoRefrendo;
  monto_pagado: number;
  abono_capital?: number;
  metodo_pago: string;
  observaciones?: string;
  /** Re-empeño: monto del nuevo préstamo */
  monto_prestamo_nuevo?: number;
  /** Re-empeño: plazo en días del nuevo crédito */
  plazo_dias_nuevo?: number;
  /** Re-empeño: tasa de interés (config nueva) */
  tasa_interes_nuevo?: number;
  /** Re-empeño: tipo de período (diario, mensual, etc.) */
  tipo_interes_nuevo?: string;
}

export interface HistorialRefrendosResponse {
  credito: {
    id: number;
    numero_credito: string;
    refrendos_realizados: number;
    refrendos_maximos: number | null;
    permite_refrendo: boolean;
  };
  refrendos: Refrendo[];
  total: number;
}

export interface RefrendoCreatedResponse {
  refrendo: Refrendo;
  credito: any; // CreditoPrendario actualizado
  movimiento_caja: any; // MovimientoCaja
}

// Para el componente RefrendoModal
export interface RefrendoFormData {
  tipoRefrendo: TipoRefrendo;
  montoPagado: string;
  abonoCapital: string;
  metodoPago: string;
  observaciones: string;
  /** Re-empeño: monto del nuevo préstamo */
  montoPrestamoNuevo?: string;
  /** Re-empeño: plazo en días */
  plazoDiasNuevo?: string;
  /** Re-empeño: tasa de interés (config nueva) */
  tasaInteresNuevo?: string;
  /** Re-empeño: tipo de período */
  tipoInteresNuevo?: string;
}

// Para estados del modal
export interface RefrendoState {
  paso: 1 | 2 | 3; // 1: Validar, 2: Calcular, 3: Confirmar
  validacion: ValidacionRefrendoResponse | null;
  calculo: CalculoRefrendoResponse | null;
  formData: RefrendoFormData;
  loading: boolean;
  error: string | null;
  /** Re-empeño: null = no elegido, true = usar config anterior, false = configurar nuevo */
  reEmpenoUsarConfigAnterior?: boolean | null;
}
