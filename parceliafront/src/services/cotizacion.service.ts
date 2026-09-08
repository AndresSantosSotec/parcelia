import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/config'

export interface ProductoCotizacion {
  prenda_id: number
  codigo_prenda: string
  descripcion: string
  precio_unitario: number
  cantidad: number
}

export interface PlanPagos {
  numero_cuotas: number
  tasa_interes: number
  monto_cuota: number
  total_con_intereses: number
}

export interface Cotizacion {
  id: number
  numero_cotizacion: string
  fecha: string
  cliente_id?: number
  cliente_nombre?: string
  cliente?: {
    id: number
    codigo: string
    nombre: string
    telefono?: string
  }
  sucursal_id: number
  sucursal?: {
    id: number
    codigo: string
    nombre: string
  }
  user_id: number
  usuario?: {
    id: number
    name: string
    email: string
  }
  productos: ProductoCotizacion[]
  subtotal: number
  descuento: number
  total: number
  tipo_venta: 'contado' | 'credito'
  plan_pagos?: PlanPagos
  observaciones?: string
  estado: 'pendiente' | 'convertida' | 'cancelada' | 'vencida'
  venta_id?: number
  fecha_conversion?: string
  fecha_vencimiento?: string
  created_at: string
  updated_at: string
}

export interface CotizacionCreateRequest {
  cliente_id?: number
  cliente_nombre?: string
  productos: ProductoCotizacion[]
  subtotal: number
  descuento?: number
  total: number
  tipo_venta: 'contado' | 'credito'
  plan_pagos?: PlanPagos
  observaciones?: string
  vigencia_dias?: number
}

export interface CotizacionFilters {
  estado?: string
  tipo_venta?: string
  fecha_inicio?: string
  fecha_fin?: string
  cliente_id?: number
  search?: string
  per_page?: number
  page?: number
}

export const cotizacionService = {
  /**
   * Listar cotizaciones
   */
  getCotizaciones: async (filters?: CotizacionFilters) => {
    try {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }

      const response = await api.get(`/cotizaciones?${params.toString()}`) as any
      // El backend devuelve { success, data, meta }
      return response
    } catch (error) {
      console.error('Error al obtener cotizaciones:', error)
      throw error
    }
  },

  /**
   * Obtener detalle de una cotización
   */
  getCotizacion: async (id: number) => {
    try {
      const response = await api.get(`/cotizaciones/${id}`)
      return response.data
    } catch (error) {
      console.error('Error al obtener cotización:', error)
      throw error
    }
  },

  /**
   * Crear nueva cotización
   */
  createCotizacion: async (data: CotizacionCreateRequest) => {
    try {
      const response = await api.post('/cotizaciones', data)
      return response.data
    } catch (error) {
      console.error('Error al crear cotización:', error)
      throw error
    }
  },

  /**
   * Actualizar cotización
   */
  updateCotizacion: async (id: number, data: Partial<CotizacionCreateRequest>) => {
    try {
      const response = await api.put(`/cotizaciones/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error al actualizar cotización:', error)
      throw error
    }
  },

  /**
   * Eliminar/cancelar cotización
   */
  deleteCotizacion: async (id: number) => {
    try {
      const response = await api.delete(`/cotizaciones/${id}`)
      return response.data
    } catch (error) {
      console.error('Error al eliminar cotización:', error)
      throw error
    }
  },

  /**
   * Generar PDF de cotización
   */
  descargarPDF: async (id: number) => {
    try {
      // Obtener token de la instancia de api
      const token = api.getToken()
      console.log('🔑 Token para PDF:', token ? 'Presente' : 'NO ENCONTRADO')
      
      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicie sesión nuevamente.')
      }
      
      const response = await fetch(`${API_BASE_URL}/cotizaciones/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf, application/json',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.message || 'Error al generar PDF')
        }
        throw new Error(`Error al generar PDF: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `cotizacion_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      throw error
    }
  },

  /**
   * URL para PDF en navegador
   */
  getPDFUrl: (id: number): string => {
    return `/cotizaciones/${id}/pdf`
  },

  /**
   * Convertir cotización a venta
   */
  convertirAVenta: async (id: number) => {
    try {
      const response = await api.post(`/cotizaciones/${id}/convertir`)
      return response.data
    } catch (error) {
      console.error('Error al convertir cotización:', error)
      throw error
    }
  }
}
