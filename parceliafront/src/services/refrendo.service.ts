/**
 * Servicio para el Sistema de Refrendos Mejorado
 * 
 * Endpoints:
 * - GET    /api/v1/creditos-prendarios/{credito_id}/refrendos
 * - POST   /api/v1/creditos-prendarios/{credito_id}/refrendos/validar
 * - POST   /api/v1/creditos-prendarios/{credito_id}/refrendos/calcular
 * - POST   /api/v1/creditos-prendarios/{credito_id}/refrendos
 */

import {
  Refrendo,
  ValidacionRefrendoResponse,
  CalculoRefrendoResponse,
  CrearRefrendoDTO,
  HistorialRefrendosResponse,
  RefrendoCreatedResponse,
  TipoRefrendo
} from '@/types/refrendo.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

class RefrendoService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = `${API_BASE_URL}`
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
            console.warn('Token expirado, limpiando...')
            return
          }
        }
        this.token = token
      } else {
        this.token = null
      }
    }
  }

  setToken(token: string | null): void {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token)
      } else {
        localStorage.removeItem('auth_token')
      }
    }
  }

  syncToken(): void {
    this.loadToken()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    this.syncToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    try {
      const url = `${this.baseUrl}${endpoint}`
      
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido o expirado
          this.token = null
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_token_expiry')
          window.location.href = '/login'
          throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.')
        }

        throw new Error(responseData.message || `Error HTTP ${response.status}`)
      }

      return responseData as ApiResponse<T>

    } catch (error) {
      console.error('Error en petición:', error)
      throw error
    }
  }

  /**
   * Obtener historial de refrendos de un crédito
   */
  async obtenerHistorial(creditoId: number): Promise<HistorialRefrendosResponse> {
    const response = await this.request<HistorialRefrendosResponse>(
      `/creditos-prendarios/${creditoId}/refrendos`,
      { method: 'GET' }
    )

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Error al obtener historial de refrendos')
    }

    return response.data
  }

  /**
   * Validar si un crédito puede ser refrendado
   */
  async validarRefrendo(creditoId: number): Promise<ValidacionRefrendoResponse> {
    const response = await this.request<ValidacionRefrendoResponse>(
      `/creditos-prendarios/${creditoId}/refrendos/validar`,
      { method: 'POST' }
    )

    if (!response.data) {
      throw new Error(response.message || 'Error al validar refrendo')
    }

    return response.data
  }

  /**
   * Calcular montos necesarios para un refrendo, o datos del re-empeño (crédito pagado).
   */
  async calcularRefrendo(
    creditoId: number,
    tipoRefrendo: TipoRefrendo,
    abonoCapital: number = 0,
    opts?: { monto_prestamo_nuevo?: number; plazo_dias_nuevo?: number; tasa_interes_nuevo?: number; tipo_interes_nuevo?: string }
  ): Promise<CalculoRefrendoResponse> {
    const body: Record<string, unknown> = {
      tipo_refrendo: tipoRefrendo,
      abono_capital: abonoCapital
    }
    if (opts?.monto_prestamo_nuevo != null) body.monto_prestamo_nuevo = opts.monto_prestamo_nuevo
    if (opts?.plazo_dias_nuevo != null) body.plazo_dias_nuevo = opts.plazo_dias_nuevo
    if (opts?.tasa_interes_nuevo != null) body.tasa_interes_nuevo = opts.tasa_interes_nuevo
    if (opts?.tipo_interes_nuevo != null) body.tipo_interes_nuevo = opts.tipo_interes_nuevo

    const response = await this.request<CalculoRefrendoResponse>(
      `/creditos-prendarios/${creditoId}/refrendos/calcular`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    )

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Error al calcular refrendo')
    }

    return response.data
  }

  /**
   * Procesar un refrendo
   */
  async procesarRefrendo(
    creditoId: number,
    datos: CrearRefrendoDTO
  ): Promise<RefrendoCreatedResponse> {
    const response = await this.request<RefrendoCreatedResponse>(
      `/creditos-prendarios/${creditoId}/refrendos`,
      {
        method: 'POST',
        body: JSON.stringify(datos)
      }
    )

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Error al procesar refrendo')
    }

    return response.data
  }

  /**
   * Helper: Formatear moneda
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Helper: Formatear fecha
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * Helper: Obtener descripción del tipo de refrendo
   */
  getTipoRefrendoDescripcion(tipo: TipoRefrendo): string {
    const descripciones: Record<TipoRefrendo, string> = {
      'parcial': 'Refrendo Parcial (Solo Intereses)',
      'total': 'Refrendo Total (Con Capital)',
      'con_capital': 'Refrendo con Capital Obligatorio',
      're_empeno': 'Re-empeño (Reactivar crédito pagado)'
    }
    return descripciones[tipo] ?? tipo
  }

  /**
   * Helper: Obtener color del badge según tipo
   */
  getTipoRefrendoColor(tipo: TipoRefrendo): string {
    const colores: Record<TipoRefrendo, string> = {
      'parcial': 'bg-blue-100 text-blue-800',
      'total': 'bg-green-100 text-green-800',
      'con_capital': 'bg-orange-100 text-orange-800',
      're_empeno': 'bg-violet-100 text-violet-800'
    }
    return colores[tipo] ?? 'bg-gray-100 text-gray-800'
  }
}

// Exportar instancia singleton
export const refrendoService = new RefrendoService()

// También exportar la clase para testing
export default RefrendoService
