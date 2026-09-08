import { getApiBaseUrl } from '@/lib/config'

interface CodigosReservados {
  id: string
  codigo_credito: string
  codigo_prenda: string
  session_token: string
  fecha_expiracion: string
  estado: 'reservado' | 'usado' | 'expirado'
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

class CodigoPrereservadoService {
  private baseUrl: string
  private sessionToken: string | null = null

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/codigos-prereservados`
    // Intentar recuperar el token de sessionStorage
    if (typeof window !== 'undefined') {
      this.sessionToken = sessionStorage.getItem('wizard_session_token')
    }
  }

  private get token(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const authToken = this.token
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error en la solicitud')
    }

    return response.json()
  }

  /**
   * Generar un nuevo token de sesión para el wizard
   */
  async generarSessionToken(): Promise<string> {
    const response = await this.request<{ session_token: string }>('/token')
    this.sessionToken = response.data.session_token
    // Guardar en sessionStorage para persistencia durante la sesión del navegador
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wizard_session_token', this.sessionToken)
    }
    return this.sessionToken
  }

  /**
   * Obtener el token de sesión actual o generar uno nuevo
   */
  async getOrCreateSessionToken(): Promise<string> {
    if (this.sessionToken) {
      return this.sessionToken
    }
    return this.generarSessionToken()
  }

  /**
   * Validar si un string es un UUID válido
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Reservar códigos únicos para el crédito y la prenda
   */
  async reservarCodigos(clienteId?: string, sucursalId?: number): Promise<CodigosReservados> {
    const sessionToken = await this.getOrCreateSessionToken()
    
    // Solo enviar cliente_id si es un UUID válido
    const payload: { session_token: string; cliente_id?: string; sucursal_id?: number } = {
      session_token: sessionToken,
    }
    
    if (clienteId && this.isValidUUID(clienteId)) {
      payload.cliente_id = clienteId
    }

    if (sucursalId !== undefined && sucursalId !== null) {
      payload.sucursal_id = sucursalId
    }
    
    const response = await this.request<CodigosReservados>('/reservar', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return response.data
  }

  /**
   * Obtener códigos ya reservados
   */
  async obtenerCodigos(): Promise<CodigosReservados | null> {
    if (!this.sessionToken) {
      return null
    }

    try {
      const response = await this.request<CodigosReservados>(`/obtener?session_token=${this.sessionToken}`)
      return response.data
    } catch (error) {
      return null
    }
  }

  /**
   * Liberar códigos reservados (cuando se cancela el proceso)
   */
  async liberarCodigos(): Promise<void> {
    if (!this.sessionToken) {
      return
    }

    await this.request('/liberar', {
      method: 'POST',
      body: JSON.stringify({
        session_token: this.sessionToken,
      }),
    })

    // Limpiar el token de la sesión
    this.sessionToken = null
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('wizard_session_token')
    }
  }

  /**
   * Limpiar el token de sesión (para iniciar un nuevo wizard)
   */
  limpiarSesion(): void {
    this.sessionToken = null
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('wizard_session_token')
    }
  }

  /**
   * Obtener el session token actual
   */
  getSessionToken(): string | null {
    return this.sessionToken
  }
}

export const codigoPrereservadoService = new CodigoPrereservadoService()
export type { CodigosReservados }
