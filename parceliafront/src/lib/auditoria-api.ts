const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken()
  const clientId = 'AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)'
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Client-ID': clientId,
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }

  // Log del Client-ID para verificación (User-Agent no se puede modificar en navegadores)
  console.log('🔐 X-Client-ID Auditoría:', clientId)

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de red' }))
    throw new Error(error.message || `Error ${response.status}`)
  }

  return response.json()
}

export interface AuditoriaLog {
  id: string
  user_id: number | null
  sucursal_id: number | null
  modulo: string
  accion: string
  tabla: string | null
  registro_id: string | null
  datos_anteriores: any
  datos_nuevos: any
  ip_address: string | null
  user_agent: string | null
  metodo_http: string | null
  url: string | null
  descripcion: string | null
  codigo_respuesta: number | null
  tiempo_respuesta_ms: number | null
  created_at: string
  usuario?: {
    id: number
    name: string
    username: string
    rol: string
  }
  sucursal?: {
    id: number
    codigo: string
    nombre: string
  }
}

export interface AuditoriaEstadisticas {
  total_acciones: number
  por_modulo: Array<{ modulo: string; total: number }>
  por_usuario: Array<{ user_id: number; total: number; usuario: any }>
  por_sucursal: Array<{ sucursal_id: number; total: number; sucursal: any }>
  por_tipo: Array<{ accion: string; total: number }>
}

export interface AuditoriaFilters {
  page?: number
  per_page?: number
  modulo?: string
  accion?: string
  user_id?: number
  sucursal_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  search?: string
  estado?: 'exito' | 'error'
}

export interface AuditoriaPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

export interface AuditoriaResponse {
  success: boolean
  data: AuditoriaLog[]
  pagination?: AuditoriaPagination
  message?: string
}

export interface AuditoriaListResponse {
  success: boolean
  data: string[]
  message?: string
}

export const auditoriaService = {
  async getLogs(filters: AuditoriaFilters = {}): Promise<AuditoriaResponse> {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value))
      }
    })
    const query = queryParams.toString()
    const response = await apiClient(`/auditoria${query ? `?${query}` : ''}`)

    // Transformar la respuesta al formato esperado
    if (response.success) {
      // El backend devuelve: { success, data: [...logs], pagination: {...} }
      const logs = Array.isArray(response.data) ? response.data : (response.data?.logs || [])
      const pagination = response.pagination || response.data?.pagination || {}

      return {
        success: response.success,
        data: logs,
        pagination: {
          total: pagination.total || logs.length || 0,
          per_page: pagination.per_page || 20,
          current_page: pagination.current_page || 1,
          last_page: pagination.last_page || 1,
          from: pagination.from || 1,
          to: pagination.to || logs.length,
        }
      }
    }

    return response
  },

  async getEstadisticas(fecha_desde?: string, fecha_hasta?: string) {
    const queryParams = new URLSearchParams()
    if (fecha_desde) queryParams.append('fecha_desde', fecha_desde)
    if (fecha_hasta) queryParams.append('fecha_hasta', fecha_hasta)
    const query = queryParams.toString()
    return apiClient(`/auditoria/estadisticas${query ? `?${query}` : ''}`)
  },

  async getModulos(): Promise<AuditoriaListResponse> {
    return apiClient('/auditoria/modulos')
  },

  async getAcciones(): Promise<AuditoriaListResponse> {
    return apiClient('/auditoria/acciones')
  },

  async getLog(id: string) {
    return apiClient(`/auditoria/${id}`)
  },

  async getLaravelLogs(lines: number = 500) {
    return apiClient(`/auditoria/logs?lines=${lines}`)
  },
}
