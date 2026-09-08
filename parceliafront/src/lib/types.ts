export interface ClienteReferencia {
  id?: string
  nombre: string
  telefono: string
  relacion?: string | null
}

export interface Cliente {
  id: string
  nombres: string
  apellidos: string
  dpi: string
  nit?: string
  fechaNacimiento: string
  genero: 'masculino' | 'femenino' | 'otro'
  estadoCivil?: string
  profesion?: string
  telefono: string
  telefonoSecundario?: string
  email?: string
  direccion: string
  municipio?: string
  departamentoGeonameId?: number
  municipioGeonameId?: number
  fotografia?: string
  estado: 'activo' | 'inactivo'
  sucursal?: string
  tipoCliente?: 'regular' | 'vip'
  notas?: string
  eliminado?: boolean
  creadoEn: string
  actualizadoEn?: string
  eliminadoEn?: string
  creditosInfo?: {
    total: number
    activos: number
    vencidos: number
  }
  referencias?: ClienteReferencia[]
}

export interface Prenda {
  id: string
  descripcion: string
  categoria: string
  fotos: string[]
  avaluo: number
  precioVenta: number
  precioMinimo: number
  descuentoMaximo: number
  estado: 'empeniado' | 'vencido' | 'evaluacion_venta' | 'en_venta' | 'apartado' | 'vendido' | 'recuperado' | 'cancelado'
  fechaIngreso: string
  fechaVenta?: string
  fechaPasaVenta?: string
  creditoId: string
  tasadorId?: string
  ubicacionBodega?: string
  sucursal?: string
  codigoQR?: string
}

export interface Credito {
  id: string
  numero: string
  clienteId: string
  prenda: {
    descripcion: string
    categoria: string
    fotos: string[]
    avaluo: number
  }
  montoComercial: number
  montoPrestado: number
  tasaInteres: number
  plazoMeses: number
  fechaCreacion: string
  fechaVencimiento: string
  estado: 'activo' | 'vencido' | 'cancelado' | 'renovado' | 'vendido'
  saldoActual: number
  firmaDigital?: string
  renovaciones: number
}

export interface Pago {
  id: string
  creditoId: string
  monto: number
  fecha: string
  interesPagado: number
  moraPagado: number
  capitalPagado: number
  saldoRestante: number
  usuarioId: string
}

export interface Caja {
  id: string
  fecha: string
  montoInicial: number
  estado: 'abierta' | 'cerrada'
  usuarioApertura: string
  usuarioCierre?: string
  horaApertura: string
  horaCierre?: string
  movimientos: MovimientoCaja[]
  totalEsperado?: number
  totalContado?: number
  diferencia?: number
}

export interface MovimientoCaja {
  id: string
  tipo: 'credito_entregado' | 'pago_recibido' | 'venta' | 'ajuste'
  monto: number
  fecha: string
  hora: string
  referencia: string
  descripcion: string
  usuarioId: string
}

export interface Cotizacion {
  id: string
  avaluo: number
  montoComercial: number
  montoPrestamo: number
  tasaInteres: number
  plazoMeses: number
  interesTotal: number
  montoTotal: number
  fechaLimite: string
  creadoEn: string
  convertidoCredito: boolean
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  username?: string
  rol: 'superadmin' | 'administrador' | 'cajero' | 'tasador' | 'supervisor' | 'vendedor'
  permisos: Permiso[]
  activo: boolean
  foto_url?: string
  sucursal_id?: number | string
  sucursal?: {
    id: string
    codigo: string
    nombre: string
  } | null
  creadoEn: string
}

export interface Sucursal {
  id: string
  codigo: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  ciudad?: string
  departamento?: string
  municipio?: string
  departamentoGeonameId?: number
  municipioGeonameId?: number
  pais?: string
  paisGeonameId?: number
  descripcion?: string
  activa: boolean
  creadoEn: string
  actualizadoEn?: string
}

export interface CampoDinamico {
  nombre: string
  tipo: 'texto' | 'numero' | 'fecha' | 'booleano' | 'seleccion' | 'texto_largo'
  requerido: boolean
  opciones?: string[]
}

export interface CategoriaProducto {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  color?: string
  icono?: string
  orden: number
  activa: boolean
  camposDinamicos?: CampoDinamico[]
  creadoEn: string
  actualizadoEn?: string
}

export interface Permiso {
  modulo: string
  acciones: string[]
}

export interface Rol {
  id: string
  nombre: 'superadmin' | 'administrador' | 'cajero' | 'tasador' | 'supervisor' | 'vendedor'
  descripcion: string
  permisos: Permiso[]
}

export interface EventoHistorial {
  id: string
  tipo: 'credito_creado' | 'pago_realizado' | 'renovacion' | 'prenda_vendida' | 'credito_cancelado' | 'prenda_recuperada' | 'tasacion_venta' | 'apartado_creado' | 'apartado_completado' | 'precio_modificado' | 'plan_pago_creado'
  creditoId?: string
  clienteId?: string
  ventaId?: string
  fecha: string
  hora: string
  descripcion: string
  monto?: number
  usuarioId: string
}

export interface Venta {
  id: string
  numero: string
  prendaId: string
  prenda: {
    descripcion: string
    categoria: string
    fotos: string[]
  }
  clienteId?: string
  compradorNombre?: string
  compradorDPI?: string
  compradorTelefono?: string
  precioOriginal: number
  descuentoAplicado: number
  precioFinal: number
  formasPago: FormaPago[]
  tipoVenta: 'contado' | 'apartado' | 'credito'
  estadoVenta: 'completada' | 'apartada' | 'credito_activo' | 'cancelada'
  fechaVenta: string
  vendedorId: string
  utilidad: number
  costoPrenda: number
}

export interface FormaPago {
  tipo: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
  monto: number
  referencia?: string
}

export interface Apartado {
  id: string
  prendaId: string
  clienteId?: string
  compradorNombre: string
  compradorTelefono: string
  precioTotal: number
  enganche: number
  saldoPendiente: number
  fechaApartado: string
  fechaLimite: string
  estado: 'activo' | 'completado' | 'cancelado' | 'vencido'
  pagosRealizados: PagoApartado[]
  vendedorId: string
}

export interface PagoApartado {
  id: string
  monto: number
  fecha: string
  formaPago: 'efectivo' | 'tarjeta' | 'transferencia'
  referencia?: string
  usuarioId: string
}

export interface PlanPago {
  id: string
  ventaId: string
  prendaId: string
  clienteId?: string
  deudorNombre: string
  deudorDPI: string
  deudorTelefono: string
  montoTotal: number
  enganche: number
  montoFinanciar: number
  tasaInteres: number
  numeroCuotas: number
  montoCuota: number
  fechaInicio: string
  cuotas: Cuota[]
  estado: 'activo' | 'completado' | 'vencido' | 'cancelado'
  vendedorId: string
}

export interface Cuota {
  numero: number
  monto: number
  fechaVencimiento: string
  fechaPago?: string
  montoPagado?: number
  estado: 'pendiente' | 'pagada' | 'vencida' | 'parcial'
  interesMora?: number
}

export interface TasacionVenta {
  id: string
  prendaId: string
  avaluo: number
  montoPrestado: number
  precioSugerido: number
  precioDefinido: number
  precioMinimo: number
  descuentoMaximo: number
  margenEsperado: number
  observaciones: string
  tasadorId: string
  fecha: string
}

export const PERMISOS_POR_MODULO = {
  clientes: ['ver', 'crear', 'editar', 'eliminar'],
  sucursales: ['ver', 'crear', 'editar', 'eliminar'],
  simulador: ['usar', 'imprimir', 'guardar', 'editar_tasa_interes'],
  creditos: ['ver', 'crear', 'renovar', 'cancelar', 'pasar_venta', 'editar_tasa_interes', 'editar_mora'],
  prendas: ['ver', 'editar', 'cambiar_estado', 'vender'],
  ventas: ['ver', 'tasar', 'vender', 'apartar', 'crear_plan_pago', 'modificar_precio', 'aplicar_descuento'],
  caja: ['abrir', 'cerrar', 'ver_movimientos'],
  reportes: ['generar', 'exportar'],
  usuarios: ['ver', 'crear', 'editar', 'eliminar', 'asignar_permisos']
}

export const ROLES_DEFAULT: Rol[] = [
  {
    id: 'superadmin',
    nombre: 'superadmin',
    descripcion: 'SuperAdmin de soporte, acceso total incluyendo auditoría',
    permisos: Object.keys(PERMISOS_POR_MODULO).map(modulo => ({
      modulo,
      acciones: PERMISOS_POR_MODULO[modulo as keyof typeof PERMISOS_POR_MODULO]
    }))
  },
  {
    id: 'admin',
    nombre: 'administrador',
    descripcion: 'Acceso completo al sistema',
    permisos: Object.keys(PERMISOS_POR_MODULO).map(modulo => ({
      modulo,
      acciones: PERMISOS_POR_MODULO[modulo as keyof typeof PERMISOS_POR_MODULO]
    }))
  },
  {
    id: 'cajero',
    nombre: 'cajero',
    descripcion: 'Operaciones de caja',
    permisos: [
      { modulo: 'clientes', acciones: ['ver', 'crear'] },
      { modulo: 'creditos', acciones: ['ver', 'crear'] },
      { modulo: 'caja', acciones: ['abrir', 'cerrar', 'ver_movimientos'] },
      { modulo: 'prendas', acciones: ['ver'] }
    ]
  },
  {
    id: 'tasador',
    nombre: 'tasador',
    descripcion: 'Evaluación y simulación',
    permisos: [
      { modulo: 'clientes', acciones: ['ver'] },
      { modulo: 'simulador', acciones: ['usar', 'imprimir', 'guardar'] },
      { modulo: 'prendas', acciones: ['ver'] },
      { modulo: 'ventas', acciones: ['ver', 'tasar'] }
    ]
  },
  {
    id: 'vendedor',
    nombre: 'vendedor',
    descripcion: 'Ventas y apartados',
    permisos: [
      { modulo: 'clientes', acciones: ['ver', 'crear'] },
      { modulo: 'ventas', acciones: ['ver', 'vender', 'apartar', 'crear_plan_pago', 'aplicar_descuento'] },
      { modulo: 'prendas', acciones: ['ver'] }
    ]
  },
  {
    id: 'supervisor',
    nombre: 'supervisor',
    descripcion: 'Supervisión y reportes',
    permisos: [
      { modulo: 'clientes', acciones: ['ver'] },
      { modulo: 'creditos', acciones: ['ver', 'renovar'] },
      { modulo: 'prendas', acciones: ['ver', 'cambiar_estado'] },
      { modulo: 'ventas', acciones: ['ver', 'modificar_precio', 'aplicar_descuento'] },
      { modulo: 'reportes', acciones: ['generar', 'exportar'] },
      { modulo: 'caja', acciones: ['ver_movimientos'] }
    ]
  }
]

// Re-exports from other type files
export type { 
  PlanInteresCategoria,
  CrearPlanInteresData,
  ActualizarPlanInteresData,
  FiltrosPlanesInteres,
  PlanesCategoriaResponse
} from '@/types/planInteres.types'

