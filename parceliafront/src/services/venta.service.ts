import { ApiResponse, PaginatedResponse } from '@/types/creditoPrendario.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// ==================== TIPOS ====================

export interface Venta {
  id: number
  tipo_documento: 'NOTA' | 'FACTURA' | 'RECIBO' | 'COTIZACION'
  numero_documento?: string
  serie_documento?: string
  codigo_venta?: string
  
  // Cliente
  cliente_id?: number
  cliente?: Cliente
  consumidor_final: boolean
  cliente_nombre?: string
  cliente_nit?: string
  cliente_telefono?: string
  cliente_email?: string
  
  // Moneda
  moneda_id: number
  moneda?: Moneda
  tipo_cambio: number
  
  // Totales
  subtotal: number
  total_descuentos: number
  total_impuestos: number
  total_final: number
  total_pagado: number
  cambio_devuelto: number
  
  // Tipo y estado
  tipo_venta: 'contado' | 'apartado' | 'plan_pagos'
  estado: 'pendiente' | 'pagada' | 'apartado' | 'plan_pagos' | 'cancelada' | 'devuelta' | 'anulada'
  
  // Certificación
  certificada: boolean
  no_autorizacion?: string
  fecha_certificacion?: string
  
  // Detalles y pagos
  detalles: VentaDetalle[]
  pagos: VentaPago[]
  apartado?: Apartado
  
  // Auditoría
  vendedor_id: number
  vendedor?: Usuario
  sucursal_id: number
  sucursal?: Sucursal
  fecha_venta: string
  fecha_cancelacion?: string
  observaciones?: string
  notas?: string
  motivo_cancelacion?: string
  created_at: string
  updated_at: string
}

export interface VentaDetalle {
  id: number
  venta_id: number
  prenda_id?: number
  prenda?: Prenda
  producto_id?: number
  codigo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento: number
  descuento_porcentaje: number
  subtotal: number
  total: number
  tipo_precio: 'normal' | 'mayoreo' | 'promocion' | 'especial'
  observaciones?: string
}

export interface VentaPago {
  id: number
  venta_id: number
  metodo: 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'cheque' | 'deposito' | 'qr' | 'otro'
  monto: number
  cambio: number
  referencia?: string
  banco?: string
  autorizacion?: string
  fecha_pago: string
  observaciones?: string
}

export interface Apartado {
  id: number
  venta_id: number
  cliente_id?: number
  cliente?: Cliente
  cliente_nombre: string
  cliente_telefono?: string
  total_apartado: number
  anticipo: number
  saldo_pendiente: number
  fecha_apartado: string
  fecha_limite: string
  fecha_completado?: string
  fecha_cancelado?: string
  estado: 'activo' | 'completado' | 'cancelado' | 'vencido'
  observaciones?: string
  motivo_cancelacion?: string
  porcentaje_pagado: number
  esta_vencido: boolean
}

export interface MetodoPago {
  id: number
  nombre: string
  codigo: string
  descripcion?: string
  tipo: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque' | 'digital' | 'otro'
  requiere_referencia: boolean
  requiere_autorizacion: boolean
  activo: boolean
  comision_porcentaje: number
  comision_fija: number
}

export interface CrearVentaDTO {
  tipo_documento: 'NOTA' | 'FACTURA' | 'RECIBO' | 'COTIZACION'
  cliente_id?: number
  consumidor_final?: boolean
  moneda_id: number
  tipo_cambio?: number
  tipo_venta: 'contado' | 'apartado' | 'plan_pagos'
  vendedor_id: number
  sucursal_id: number
  observaciones?: string
}

export interface AgregarProductoDTO {
  prenda_id?: number
  producto_id?: number
  descripcion?: string
  cantidad: number
  precio_unitario: number
  descuento?: number
  descuento_porcentaje?: number
  tipo_precio?: 'normal' | 'mayoreo' | 'promocion' | 'especial'
  observaciones?: string
}

export interface ProcesarPagoDTO {
  pagos: {
    metodo: string
    monto: number
    referencia?: string
    banco?: string
    autorizacion?: string
  }[]
}

export interface CrearApartadoDTO {
  cliente_id: number
  anticipo: number
  dias_limite: number
  metodo_pago?: string
  observaciones?: string
}

export interface FiltrosVenta {
  estado?: string
  tipo_venta?: string
  tipo_documento?: string
  fecha_desde?: string
  fecha_hasta?: string
  cliente_id?: number
  vendedor_id?: number
  sucursal_id?: number
  numero_documento?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  per_page?: number
  page?: number
  use_cursor?: boolean
}

export interface EstadisticasVentas {
  total_ventas: number
  total_ingresos: number
  total_pagado: number
  ventas_por_estado: { estado: string; total: number }[]
  ventas_por_tipo: { tipo_venta: string; total: number }[]
  promedio_venta: number
  venta_mayor: number
  venta_menor: number
  apartados_activos: number
  apartados_vencidos: number
}

// Tipos auxiliares
interface Cliente {
  id: number
  nombre_completo: string
  dpi?: string
  nit?: string
  telefono?: string
  email?: string
}

interface Moneda {
  id: number
  codigo: string
  nombre: string
  simbolo: string
}

interface Usuario {
  id: number
  name: string
  email: string
}

interface Sucursal {
  id: number
  nombre: string
  direccion?: string
}

interface Prenda {
  id: number
  codigo_prenda: string
  descripcion: string
  valor_venta?: number
}

// ==================== SERVICIO ====================

class VentaService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = `${API_BASE_URL}/ventas`
    this.loadToken()
  }

  private loadToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  setToken(token: string | null): void {
    this.token = token
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('auth_token', token)
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    this.loadToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error en la petición')
      }

      return data
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // ==================== CRUD BÁSICO ====================

  async listar(filtros?: FiltrosVenta): Promise<PaginatedResponse<Venta>> {
    const queryParams = new URLSearchParams()

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const query = queryParams.toString()
    return this.request<PaginatedResponse<Venta>>(query ? `?${query}` : '')
  }

  async crear(venta: CrearVentaDTO): Promise<Venta> {
    const response = await this.request<any>('', {
      method: 'POST',
      body: JSON.stringify(venta),
    })
    // Laravel retorna { message: '...', venta: {...} }
    return response.venta || response.data || response
  }

  async obtener(id: number): Promise<Venta> {
    return this.request<Venta>(`/${id}`)
  }

  async actualizar(id: number, data: Partial<Venta>): Promise<Venta> {
    const response = await this.request<any>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.venta || response.data || response
  }

  async eliminar(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${id}`, {
      method: 'DELETE',
    })
  }

  // ==================== ACCIONES ESPECÍFICAS ====================

  async agregarProducto(
    ventaId: number,
    producto: AgregarProductoDTO
  ): Promise<{ detalle: VentaDetalle; venta: Venta }> {
    return this.request<{ detalle: VentaDetalle; venta: Venta }>(
      `/${ventaId}/productos`,
      {
        method: 'POST',
        body: JSON.stringify(producto),
      }
    )
  }

  async quitarProducto(
    ventaId: number,
    detalleId: number
  ): Promise<{ venta: Venta }> {
    return this.request<{ venta: Venta }>(
      `/${ventaId}/productos/${detalleId}`,
      {
        method: 'DELETE',
      }
    )
  }

  async procesarPago(
    ventaId: number,
    pagos: ProcesarPagoDTO
  ): Promise<{ venta: Venta; cambio: number }> {
    return this.request<{ venta: Venta; cambio: number }>(
      `/${ventaId}/procesar`,
      {
        method: 'POST',
        body: JSON.stringify(pagos),
      }
    )
  }

  async crearApartado(
    ventaId: number,
    apartado: CrearApartadoDTO
  ): Promise<{ apartado: Apartado; venta: Venta }> {
    return this.request<{ apartado: Apartado; venta: Venta }>(
      `/${ventaId}/apartar`,
      {
        method: 'POST',
        body: JSON.stringify(apartado),
      }
    )
  }

  // ==================== ESTADÍSTICAS Y REPORTES ====================

  async obtenerEstadisticas(params?: {
    fecha_desde?: string
    fecha_hasta?: string
    sucursal_id?: number
  }): Promise<EstadisticasVentas> {
    const queryParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const query = queryParams.toString()
    return this.request<EstadisticasVentas>(
      `/estadisticas${query ? `?${query}` : ''}`
    )
  }

  async generarRecibo(ventaId: number): Promise<Blob> {
    this.loadToken()

    const headers: HeadersInit = {
      Accept: 'application/pdf',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    }

    const response = await fetch(`${this.baseUrl}/${ventaId}/recibo`, {
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al generar recibo')
    }

    return response.blob()
  }

  async exportarExcel(filtros?: FiltrosVenta): Promise<Blob> {
    const queryParams = new URLSearchParams()

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    this.loadToken()

    const headers: HeadersInit = {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    }

    const query = queryParams.toString()
    const response = await fetch(
      `${this.baseUrl}/reporte/excel${query ? `?${query}` : ''}`,
      {
        headers,
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al exportar')
    }

    return response.blob()
  }

  // ==================== MÉTODOS DE PAGO ====================

  async listarMetodosPago(): Promise<MetodoPago[]> {
    return this.request<MetodoPago[]>('/metodos-pago')
  }
}

export const ventaService = new VentaService()
export default ventaService
