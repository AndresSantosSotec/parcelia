/**
 * Tipos para el sistema de Planes de Interés por Categoría
 * Similar a PrendaFlex - configuración de tasas por categoría y plazo
 */

// ==================== ENUMS Y CONSTANTES ====================

export type TipoPeriodo = 'diario' | 'semanal' | 'quincenal' | 'mensual';

export type UnidadPlazo = 'dias' | 'semanas' | 'quincenas' | 'meses';

export const TIPOS_PERIODO: Record<TipoPeriodo, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual'
};

export const UNIDADES_PLAZO: Record<UnidadPlazo, string> = {
  dias: 'Días',
  semanas: 'Semanas',
  quincenas: 'Quincenas',
  meses: 'Meses'
};

// ==================== INTERFACES PRINCIPALES ====================

/**
 * Plan de interés configurado para una categoría de producto
 */
export interface PlanInteresCategoria {
  id: number;
  categoria_producto_id: number;
  
  // Identificación
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  
  // Configuración de periodo y plazo
  tipo_periodo: TipoPeriodo;
  plazo_numero: number;
  plazo_unidad: UnidadPlazo;
  plazo_dias_total: number;
  
  // Tasas e intereses
  tasa_interes: number;
  tasa_almacenaje: number;
  tasa_moratorios: number;
  tipo_mora?: 'porcentaje' | 'monto_fijo';
  mora_monto_fijo?: number | null;
  
  // Configuración de préstamo
  porcentaje_prestamo: number;
  monto_minimo: number | null;
  monto_maximo: number | null;
  
  // Días especiales
  dias_gracia: number;
  dias_enajenacion: number;
  
  // Cálculos adicionales
  cat: number | null;
  interes_anual: number | null;
  porcentaje_precio_venta: number | null;
  
  // Configuración de refrendos
  numero_refrendos_permitidos: number | null;
  permite_refrendos: boolean;
  
  // Control
  activo: boolean;
  es_default: boolean;
  orden: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Relaciones (opcionales)
  categoria?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  
  // Accessors computados
  nombre_completo?: string;
  descripcion_plazo?: string;
}

/**
 * Datos para crear un nuevo plan
 */
export interface CrearPlanInteresData {
  categoria_producto_id: number;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  tipo_periodo: TipoPeriodo;
  plazo_numero: number;
  plazo_unidad: UnidadPlazo;
  tasa_interes: number;
  tasa_almacenaje?: number;
  tasa_moratorios?: number;
  porcentaje_prestamo: number;
  monto_minimo?: number;
  monto_maximo?: number;
  dias_gracia?: number;
  dias_enajenacion?: number;
  cat?: number;
  interes_anual?: number;
  porcentaje_precio_venta?: number;
  numero_refrendos_permitidos?: number;
  permite_refrendos?: boolean;
  activo?: boolean;
  es_default?: boolean;
  orden?: number;
}

/**
 * Datos para actualizar un plan existente
 */
export interface ActualizarPlanInteresData extends Partial<CrearPlanInteresData> {
  id?: never; // No permitir cambiar ID
  categoria_producto_id?: never; // No permitir cambiar categoría
}

/**
 * Filtros para búsqueda de planes
 */
export interface FiltrosPlanesInteres {
  categoria_id?: number;
  tipo_periodo?: TipoPeriodo;
  activo?: boolean;
  es_default?: boolean;
}

/**
 * Proyección de crédito con un plan de interés
 */
export interface ProyeccionPlanInteres {
  plan: PlanInteresCategoria;
  proyeccion: {
    monto_capital: number;
    interes_total: number;
    monto_total_pagar: number;
    valor_avaluo: number;
    monto_prestado_sugerido: number;
    porcentaje_prestamo: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    plazo_dias: number;
    tasa_interes_periodo: number;
    tasa_almacenaje_periodo: number;
    tasa_total_periodo: number;
  };
}

/**
 * Respuesta al obtener planes de una categoría
 */
export interface PlanesCategoriaResponse {
  categoria: {
    id: number;
    nombre: string;
    codigo: string;
  };
  planes: PlanInteresCategoria[];
  plan_default: PlanInteresCategoria | null;
}

// ==================== TIPOS PARA FORMULARIOS ====================

/**
 * Estado del formulario de plan de interés
 */
export interface FormularioPlanInteres {
  // Datos básicos
  nombre: string;
  codigo: string;
  descripcion: string;
  
  // Periodo y plazo
  tipo_periodo: TipoPeriodo;
  plazo_numero: number;
  plazo_unidad: UnidadPlazo;
  
  // Tasas
  tasa_interes: number;
  tasa_almacenaje: number;
  tasa_moratorios: number;
  
  // Préstamo
  porcentaje_prestamo: number;
  monto_minimo: number | null;
  monto_maximo: number | null;
  
  // Días especiales
  dias_gracia: number;
  dias_enajenacion: number;
  
  // Opcionales
  cat: number | null;
  interes_anual: number | null;
  porcentaje_precio_venta: number | null;
  numero_refrendos_permitidos: number | null;
  
  // Control
  permite_refrendos: boolean;
  activo: boolean;
  es_default: boolean;
  orden: number;
}

/**
 * Errores de validación del formulario
 */
export interface ErroresFormularioPlan {
  nombre?: string;
  codigo?: string;
  tipo_periodo?: string;
  plazo_numero?: string;
  plazo_unidad?: string;
  tasa_interes?: string;
  tasa_almacenaje?: string;
  tasa_moratorios?: string;
  porcentaje_prestamo?: string;
  monto_minimo?: string;
  monto_maximo?: string;
  dias_gracia?: string;
  dias_enajenacion?: string;
}

// ==================== TIPOS PARA TABLAS ====================

/**
 * Columnas de la tabla de planes
 */
export interface ColumnaPlanInteres {
  key: keyof PlanInteresCategoria | 'acciones';
  label: string;
  sortable?: boolean;
  width?: string;
}

/**
 * Estado de ordenamiento de tabla
 */
export interface OrdenamientoPlanesInteres {
  campo: keyof PlanInteresCategoria;
  direccion: 'asc' | 'desc';
}

// ==================== TIPOS PARA CALCULADORA ====================

/**
 * Datos para calculadora de plan
 */
export interface CalculoPlanInteres {
  plan_id: number;
  monto_capital: number;
  valor_avaluo: number;
}

/**
 * Resultado de cálculo
 */
export interface ResultadoCalculoPlan {
  interes_total: number;
  monto_total: number;
  monto_sugerido: number;
  fecha_vencimiento: string;
  es_valido: boolean;
  mensaje?: string;
}

// ==================== TIPOS PARA COMPONENTES ====================

/**
 * Props para selector de plan de interés
 */
export interface SelectorPlanProps {
  categoriaId: number;
  value: number | null;
  onChange: (planId: number | null) => void;
  mostrarDefault?: boolean;
  soloActivos?: boolean;
  disabled?: boolean;
}

/**
 * Props para tarjeta de plan
 */
export interface TarjetaPlanProps {
  plan: PlanInteresCategoria;
  seleccionado?: boolean;
  onClick?: () => void;
  mostrarAcciones?: boolean;
  onEditar?: (plan: PlanInteresCategoria) => void;
  onEliminar?: (plan: PlanInteresCategoria) => void;
  onToggleActivo?: (plan: PlanInteresCategoria) => void;
  onSetDefault?: (plan: PlanInteresCategoria) => void;
}

/**
 * Props para modal de plan
 */
export interface ModalPlanInteresProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoriaId: number;
  planEditar?: PlanInteresCategoria;
  modo: 'crear' | 'editar';
}

// ==================== TIPOS AUXILIARES ====================

/**
 * Resumen de un plan (para dropdown/select)
 */
export interface ResumenPlan {
  id: number;
  nombre: string;
  codigo: string;
  tipo_periodo: TipoPeriodo;
  plazo_dias: number;
  tasa_total: number;
  es_default: boolean;
  activo: boolean;
}

/**
 * Estadísticas de planes de una categoría
 */
export interface EstadisticasPlanesCategoria {
  total_planes: number;
  planes_activos: number;
  planes_inactivos: number;
  plan_default_id: number | null;
  rango_tasas: {
    minima: number;
    maxima: number;
  };
  rango_plazos: {
    minimo: number;
    maximo: number;
  };
}
