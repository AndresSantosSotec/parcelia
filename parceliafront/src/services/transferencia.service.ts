/**
 * Servicio para Transferencias Inter-Sucursales de Prendas
 * 
 * Endpoints:
 * - GET    /api/v1/transferencias-prendas
 * - GET    /api/v1/transferencias-prendas/estadisticas
 * - POST   /api/v1/transferencias-prendas
 * - GET    /api/v1/transferencias-prendas/{id}
 * - POST   /api/v1/transferencias-prendas/{id}/autorizar
 * - POST   /api/v1/transferencias-prendas/{id}/enviar
 * - POST   /api/v1/transferencias-prendas/{id}/recibir
 * - POST   /api/v1/transferencias-prendas/{id}/rechazar
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export type EstadoTransferencia = 'solicitada' | 'autorizada' | 'en_transito' | 'recibida' | 'rechazada' | 'cancelada'

export interface Transferencia {
  id: number
  codigo_transferencia: string
  prenda_id: number
  credito_id: number | null
  sucursal_origen_id: number
  sucursal_destino_id: number
  usuario_solicita_id: number
  usuario_autoriza_id: number | null
  usuario_recibe_id: number | null
  estado: EstadoTransferencia
  motivo: string
  observaciones_autorizacion: string | null
  observaciones_recepcion: string | null
  motivo_rechazo: string | null
  fecha_solicitud: string
  fecha_autorizacion: string | null
  fecha_envio: string | null
  fecha_recepcion: string | null
  created_at: string
  updated_at: string
  // Relaciones
  prenda?: any
  credito?: any
  sucursal_origen?: any
  sucursal_destino?: any
  usuario_solicita?: any
  usuario_autoriza?: any
  usuario_recibe?: any
}

export interface TransferenciaEstadisticas {
  total: number
  solicitadas: number
  autorizadas: number
  en_transito: number
  recibidas: number
  rechazadas: number
  canceladas: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

class TransferenciaService {
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

    // Enviar sucursal activa
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
   * Listar transferencias con filtros
   */
  async listar(params?: {
    estado?: string
    sucursal_origen_id?: string
    sucursal_destino_id?: string
    search?: string
    page?: number
    per_page?: number
  }): Promise<ApiResponse<PaginatedResponse<Transferencia>>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value))
        }
      })
    }
    const qs = query.toString()
    return this.request<PaginatedResponse<Transferencia>>(`/transferencias-prendas${qs ? '?' + qs : ''}`)
  }

  /**
   * Obtener estadísticas
   */
  async obtenerEstadisticas(): Promise<ApiResponse<TransferenciaEstadisticas>> {
    return this.request<TransferenciaEstadisticas>('/transferencias-prendas/estadisticas')
  }

  /**
   * Solicitar transferencia
   */
  async solicitar(data: {
    prenda_id: number | string
    sucursal_origen_id?: number | string
    sucursal_destino_id: number | string
    motivo: string
  }): Promise<ApiResponse<Transferencia>> {
    return this.request<Transferencia>('/transferencias-prendas', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Ver detalle
   */
  async obtenerDetalle(id: number | string): Promise<ApiResponse<Transferencia>> {
    return this.request<Transferencia>(`/transferencias-prendas/${id}`)
  }

  /**
   * Autorizar transferencia
   */
  async autorizar(id: number | string, observaciones?: string): Promise<ApiResponse<Transferencia>> {
    return this.request<Transferencia>(`/transferencias-prendas/${id}/autorizar`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    })
  }

  /**
   * Enviar prenda (marcar en tránsito)
   */
  async enviar(id: number | string): Promise<ApiResponse<Transferencia>> {
    return this.request<Transferencia>(`/transferencias-prendas/${id}/enviar`, {
      method: 'POST',
    })
  }

  /**
   * Recibir prenda
   */
  async recibir(id: number | string, observaciones?: string): Promise<ApiResponse<Transferencia>> {
    return this.request<Transferencia>(`/transferencias-prendas/${id}/recibir`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    })
  }

  /**
   * Rechazar transferencia
   */
  async rechazar(id: number | string, motivo: string): Promise<ApiResponse<Transferencia>> {
    return this.request<Transferencia>(`/transferencias-prendas/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    })
  }
}

export const transferenciaService = new TransferenciaService()
