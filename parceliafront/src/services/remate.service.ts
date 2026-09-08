/**
 * Servicio para el Sistema de Remates de Contratos Vencidos
 * 
 * Endpoints:
 * - GET    /api/v1/remates
 * - GET    /api/v1/remates/candidatos
 * - GET    /api/v1/remates/estadisticas
 * - POST   /api/v1/remates
 * - GET    /api/v1/remates/{id}
 * - POST   /api/v1/remates/{id}/cancelar
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export interface Remate {
  id: number
  codigo_remate: string
  credito_id: number
  prenda_id: number
  sucursal_id: number
  usuario_id: number
  tipo: 'manual' | 'automatico'
  estado: 'pendiente' | 'ejecutado' | 'cancelado' | 'vendido'
  capital_pendiente: number
  intereses_pendientes: number
  mora_pendiente: number
  deuda_total: number
  valor_avaluo: number
  precio_remate: number | null
  fecha_vencimiento_credito: string | null
  dias_vencido: number
  fecha_remate: string
  fecha_venta_remate: string | null
  motivo: string | null
  observaciones: string | null
  created_at: string
  updated_at: string
  // Relaciones
  credito?: any
  prenda?: any
  sucursal?: any
  usuario?: any
}

export interface CandidatoRemate {
  id: string
  codigo_credito: string
  estado: string
  fecha_vencimiento: string
  capital_pendiente: number
  intereses_pendientes: number
  mora_pendiente: number
  dias_vencido: number
  deuda_total: number
  cliente?: {
    id: string
    nombres: string
    apellidos: string
    dpi: string
    telefono: string
  }
  prendas?: any[]
  sucursal?: any
}

export interface RemateEstadisticas {
  total_remates: number
  pendientes: number
  ejecutados: number
  vendidos: number
  cancelados: number
  manuales: number
  automaticos: number
  deuda_total_rematada: number
  valor_avaluo_total: number
  candidatos_remate: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

class RemateService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = API_BASE_URL
    this.loadToken()
  }

  private loadToken(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const expiry = localStorage.getItem('auth_token_expiry')
        if (expiry) {
          const expiryTime = parseInt(expiry, 10)
          if (Date.now() >= expiryTime) {
            this.token = null
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_token_expiry')
            return
          }
        }
        this.token = token
      }
    }
  }

  private syncToken(): void {
    this.loadToken()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    this.syncToken()

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    // Enviar sucursal activa si existe
    const sucursalActiva = localStorage.getItem('kv_sucursal-activa')
    if (sucursalActiva) {
      const parsed = JSON.parse(sucursalActiva)
      if (parsed) {
        headers['X-Sucursal-Activa'] = String(parsed)
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `Error ${response.status}`)
    }

    return data
  }

  /**
   * Listar remates con filtros y paginación
   */
  async listar(params?: {
    estado?: string
    tipo?: string
    sucursal_id?: string
    fecha_desde?: string
    fecha_hasta?: string
    search?: string
    page?: number
    per_page?: number
  }): Promise<ApiResponse<PaginatedResponse<Remate>>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value))
        }
      })
    }
    const qs = query.toString()
    return this.request<PaginatedResponse<Remate>>(`/remates${qs ? '?' + qs : ''}`)
  }

  /**
   * Obtener candidatos a remate (créditos vencidos elegibles)
   */
  async obtenerCandidatos(params?: {
    dias_minimos?: number
    page?: number
    per_page?: number
  }): Promise<ApiResponse<PaginatedResponse<CandidatoRemate>>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value))
        }
      })
    }
    const qs = query.toString()
    return this.request<PaginatedResponse<CandidatoRemate>>(`/remates/candidatos${qs ? '?' + qs : ''}`)
  }

  /**
   * Obtener estadísticas de remates
   */
  async obtenerEstadisticas(): Promise<ApiResponse<RemateEstadisticas>> {
    return this.request<RemateEstadisticas>('/remates/estadisticas')
  }

  /**
   * Ejecutar remate manual
   */
  async ejecutarRemate(data: {
    credito_id: string | number
    motivo?: string
    observaciones?: string
  }): Promise<ApiResponse<{ remates: Remate[]; credito: any }>> {
    return this.request<{ remates: Remate[]; credito: any }>('/remates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Ver detalle de un remate
   */
  async obtenerDetalle(id: number | string): Promise<ApiResponse<Remate>> {
    return this.request<Remate>(`/remates/${id}`)
  }

  /**
   * Cancelar un remate
   */
  async cancelarRemate(id: number | string, motivo: string): Promise<ApiResponse<Remate>> {
    return this.request<Remate>(`/remates/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    })
  }
}

export const remateService = new RemateService()
