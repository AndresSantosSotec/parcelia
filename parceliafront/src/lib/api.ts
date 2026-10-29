import { type CategoriaProducto, type Cliente } from "./types"
import { API_BASE_URL } from "./config"
import { mockDatabase } from "./mockDatabase"

export type { CategoriaProducto, Cliente } from "./types"

// Variable para activar modo standalone libre sin backend (false = conecta a Laravel en vivo)
export const STANDALONE_MODE = false

// Tiempo de expiración del token en localStorage (24 horas)
const TOKEN_EXPIRY_KEY = 'auth_token_expiry'
const TOKEN_KEY = 'auth_token'

// Flag para evitar disparar múltiples eventos de autenticación fallida
let authUnauthorizedDispatched = false
let authUnauthorizedTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Helper para verificar si un error es de autenticación
 * Útil para evitar mostrar toasts duplicados cuando la sesión expira
 */
export function isAuthError(error: any): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() || ''
  return (
    message.includes('unauthenticated') ||
    message.includes('unauthorized') ||
    message.includes('401') ||
    message.includes('sesión') ||
    message.includes('session') ||
    error.status === 401
  )
}

/**
 * Resetear flag de evento no autorizado (llamar después de login exitoso)
 */
export function resetAuthFlag(): void {
  authUnauthorizedDispatched = false
  if (authUnauthorizedTimeout) {
    clearTimeout(authUnauthorizedTimeout)
    authUnauthorizedTimeout = null
  }
}

interface ApiResponse<T> {
  pagination: any
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
  locked?: boolean
  retry_after?: number
  attempts_remaining?: number
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    // Recuperar token del localStorage si no ha expirado
    if (typeof window !== 'undefined') {
      this.loadToken()
    }
  }

  /**
   * Cargar token del localStorage verificando expiración
   */
  private loadToken(): void {
    const token = localStorage.getItem(TOKEN_KEY)
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

    if (token && expiry) {
      const expiryTime = parseInt(expiry, 10)
      if (Date.now() < expiryTime) {
        this.token = token
      } else {
        // Token expirado, limpiar
        this.clearToken()
      }
    }
  }

  /**
   * Guardar token con tiempo de expiración
   */
  setToken(token: string | null, expiresIn: number = 86400): void {
    this.token = token
    if (token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem('token', token) // alias de compatibilidad
      // Guardar tiempo de expiración (actual + expiresIn en segundos)
      const expiryTime = Date.now() + (expiresIn * 1000)
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
    } else if (typeof window !== 'undefined') {
      this.clearToken()
    }
  }

  /**
   * Limpiar token y datos de sesión
   */
  clearToken(): void {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('token')
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
    }
  }

  private isRefreshingToken = false
  private refreshTokenPromise: Promise<any> | null = null

  /**
   * Refrescar el token automáticamente si está por expirar
   */
  async checkAndRefreshToken(): Promise<void> {
    if (STANDALONE_MODE || !this.token) return
    if (!this.isTokenExpiringSoon()) return
    if (this.isRefreshingToken) {
      if (this.refreshTokenPromise) await this.refreshTokenPromise
      return
    }

    this.isRefreshingToken = true
    this.refreshTokenPromise = (async () => {
      try {
        const response = await this.post<{ token: string; expires_in: number }>('/auth/refresh-token')
        if (response.success && response.data?.token) {
          this.setToken(response.data.token, response.data.expires_in)
        }
      } catch (e) {
        console.warn('No se pudo refrescar el token automáticamente:', e)
      } finally {
        this.isRefreshingToken = false
        this.refreshTokenPromise = null
      }
    })()

    await this.refreshTokenPromise
  }

  /**
   * Verificar si el token está próximo a expirar (últimos 30 minutos)
   */
  isTokenExpiringSoon(): boolean {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true

    const expiryTime = parseInt(expiry, 10)
    const thirtyMinutes = 30 * 60 * 1000
    return Date.now() > (expiryTime - thirtyMinutes)
  }

  /**
   * Verificar si hay token válido
   */
  hasValidToken(): boolean {
    if (!this.token) {
      this.loadToken()
    }
    return !!this.token
  }

  /**
   * Obtener el token actual para uso en servicios externos (ej: descargar PDFs)
   */
  getToken(): string | null {
    if (!this.token) {
      this.loadToken()
    }
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    this.loadToken()

    // Si el token está por expirar y no es un endpoint de auth, refrescarlo proactivamente
    if (!STANDALONE_MODE && this.token && !endpoint.startsWith('/auth/') && this.isTokenExpiringSoon()) {
      await this.checkAndRefreshToken()
    }

    // Si está en modo standalone / sin backend, procesar directo con mockDatabase
    if (STANDALONE_MODE) {
      let bodyData: any = null
      if (options.body) {
        try {
          bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        } catch {
          bodyData = options.body
        }
      }
      const mockResult = mockDatabase.handleRequest(endpoint, options.method || 'GET', bodyData)
      return mockResult as ApiResponse<T>
    }

    const url = `${this.baseUrl}${endpoint}`
    const clientId = 'AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)'
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Client-ID': clientId,
      ...(options.headers as Record<string, string>),
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    if (typeof window !== 'undefined') {
      try {
        const sucursalActiva = localStorage.getItem('kv_sucursal-activa')
        if (sucursalActiva) {
          const parsed = JSON.parse(sucursalActiva)
          if (parsed) {
            headers['X-Sucursal-Activa'] = String(parsed)
          }
        }
      } catch { /* ignorar errores de parse */ }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: options.signal ?? (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(20000) : undefined),
      })

      const contentType = response.headers.get('content-type')
      let data: any

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { message: text || 'Error en la petición' }
        }
      }

      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined' && !authUnauthorizedDispatched) {
          authUnauthorizedDispatched = true
          window.dispatchEvent(new CustomEvent('auth:unauthorized'))
          authUnauthorizedTimeout = setTimeout(() => {
            authUnauthorizedDispatched = false
          }, 2000)
        }
      }

      if (response.status === 429) {
        const retryAfter = data.retry_after || 15
        throw new Error(`Demasiados intentos. Espera ${retryAfter} minutos.`)
      }

      if (response.status === 423) {
        throw new Error(data.message || 'Cuenta bloqueada temporalmente')
      }

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          const validationMsgs = Object.values(data.errors).flat().join(', ')
          const msg = data.message ? `${data.message}: ${validationMsgs}` : `Error de validación: ${validationMsgs}`
          const errorObj: any = new Error(msg)
          errorObj.errors = data.errors
          errorObj.status = response.status
          throw errorObj
        }
        const errorMessage = data.message || data.error || `Error ${response.status}: ${response.statusText}`
        const errorObj: any = new Error(errorMessage)
        errorObj.status = response.status
        errorObj.errors = data.errors
        throw errorObj
      }

      return data
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('El servidor tardó demasiado. Revisa la conexión e inténtalo de nuevo.')
      }
      if (error?.status || error?.errors) {
        throw error
      }
      const isNetwork = error instanceof TypeError || /failed to fetch|network|load failed/i.test(error?.message || '')
      if (!isNetwork) {
        throw error
      }
      console.warn('API fetch no disponible, usando fallback mock local:', error)
      let bodyData: any = null
      if (options.body) {
        try {
          bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        } catch {
          bodyData = options.body
        }
      }
      return mockDatabase.handleRequest(endpoint, options.method || 'GET', bodyData) as ApiResponse<T>
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const isFormData = typeof window !== 'undefined' && body instanceof FormData
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    })
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const isFormData = typeof window !== 'undefined' && body instanceof FormData
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    })
  }

  async delete<T>(endpoint: string, p0?: { foto_url: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * Descargar archivo (PDF, Excel, etc.) con autenticación
   */
  async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const url = `${this.baseUrl}${endpoint}`
    const puente = typeof window !== 'undefined'
      ? (window as Window & { ReactNativeWebView?: { postMessage: (mensaje: string) => void } }).ReactNativeWebView
      : undefined
    if (puente) {
      puente.postMessage(JSON.stringify({
        tipo: 'descarga',
        url,
        nombre: filename || 'documento.pdf',
        token: this.token || '',
      }))
      return
    }
    const headers: HeadersInit = {
      'Accept': 'application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream',
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'))
          }
          throw new Error('No autorizado. Por favor inicia sesión nuevamente.')
        }
        throw new Error(`Error al descargar archivo: ${response.statusText}`)
      }

      // Obtener el nombre del archivo del header Content-Disposition si existe
      const contentDisposition = response.headers.get('Content-Disposition')
      let downloadFilename = filename

      if (!downloadFilename && contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '')
        }
      }

      // Si aún no hay nombre, usar uno por defecto basado en el tipo
      if (!downloadFilename) {
        const contentType = response.headers.get('Content-Type') || ''
        if (contentType.includes('pdf')) {
          downloadFilename = `documento-${Date.now()}.pdf`
        } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
          downloadFilename = `reporte-${Date.now()}.xlsx`
        } else {
          downloadFilename = `archivo-${Date.now()}`
        }
      }

      // Convertir a blob y descargar
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error: any) {
      console.error('Error al descargar archivo:', error)
      throw error
    }
  }

  async fetchBlob(endpoint: string): Promise<Blob> {
    const headers: HeadersInit = { 'Accept': '*/*' }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, { method: 'GET', headers, credentials: 'include' })
    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
        throw new Error('No autorizado. Por favor inicia sesión nuevamente.')
      }
      throw new Error('No se pudo abrir el documento')
    }
    return response.blob()
  }

  async downloadPost(endpoint: string, body: unknown, filename?: string): Promise<void> {
    const headers: HeadersInit = {
      Accept: 'application/pdf,application/octet-stream',
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`Error al descargar archivo: ${response.statusText}`)
    }
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || `documento-${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }
}

export const api = new ApiClient(API_BASE_URL)

// ============ AUTH SERVICE ============
export interface LoginResponse {
  user: any
  token: string
  expires_in: number
  require_password_change?: boolean
}

export const authService = {
  login: async (username: string, password: string) => {
    // Sanitizar inputs
    const sanitizedUsername = username.trim().toLowerCase()

    const response = await api.post<LoginResponse>('/auth/login', {
      username: sanitizedUsername,
      password,
    })

    if (response.success && response.data) {
      api.setToken(response.data.token, response.data.expires_in)
      // Resetear flag de autenticación fallida después de login exitoso
      resetAuthFlag()
    }
    return response
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      api.clearToken()
    }
  },

  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all')
    } finally {
      api.clearToken()
    }
  },

  me: async () => {
    return api.get<any>('/auth/me')
  },

  changePassword: async (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => {
    return api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    })
  },

  refreshToken: async () => {
    const response = await api.post<{ token: string; expires_in: number }>('/auth/refresh-token')
    if (response.success && response.data) {
      api.setToken(response.data.token, response.data.expires_in)
    }
    return response
  },

  cambiarSucursal: async (sucursalId: number | null) => {
    return api.post('/auth/cambiar-sucursal', { sucursal_id: sucursalId })
  },

  /**
   * Validar fortaleza de contraseña en el frontend
   */
  validatePassword: (password: string): string[] => {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Al menos una mayúscula')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Al menos una minúscula')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Al menos un número')
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]/.test(password)) {
      errors.push('Al menos un carácter especial')
    }

    return errors
  },

  /**
   * Verificar si hay sesión válida
   */
  isAuthenticated: (): boolean => {
    return api.hasValidToken()
  },
}

// ============ USER SERVICE ============
export interface UserFilters {
  activo?: boolean | string
  rol?: string
  busqueda?: string
  page?: number
  per_page?: number
  order_by?: 'name' | 'email' | 'rol' | 'created_at' | 'activo'
  order_dir?: 'asc' | 'desc'
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

export interface UserStats {
  total: number
  activos: number
  inactivos: number
  por_rol: {
    administrador: number
    cajero: number
    tasador: number
    vendedor: number
    supervisor: number
  }
}

export interface UsersResponse {
  data: any[]
  pagination: PaginationInfo
  stats: UserStats
}

export const userService = {
  getAll: (params?: UserFilters) => {
    const query = new URLSearchParams()
    if (params?.activo !== undefined && params.activo !== '') query.append('activo', String(params.activo))
    if (params?.rol && params.rol !== 'todos') query.append('rol', params.rol)
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.order_by) query.append('order_by', params.order_by)
    if (params?.order_dir) query.append('order_dir', params.order_dir)

    // Omitir estadísticas en navegación de páginas para mejorar rendimiento
    // Solo cargar estadísticas en la primera carga o cuando cambian filtros
    if (params?.page && params.page > 1) {
      query.append('skip_stats', '1')
    }

    const queryString = query.toString()
    return api.get<UsersResponse>(`/usuarios${queryString ? `?${queryString}` : ''}`)
  },

  getById: (id: string) => {
    return api.get<any>(`/usuarios/${id}`)
  },

  create: (user: any) => {
    return api.post<any>('/usuarios', user)
  },

  update: (id: string, user: any) => {
    return api.put<any>(`/usuarios/${id}`, user)
  },

  delete: (id: string) => {
    return api.delete(`/usuarios/${id}`)
  },

  toggleActivo: (id: string) => {
    return api.post<any>(`/usuarios/${id}/toggle-activo`)
  },

  changePassword: (id: string, password: string, passwordConfirmation: string) => {
    return api.post(`/usuarios/${id}/cambiar-password`, {
      password,
      password_confirmation: passwordConfirmation,
    })
  },

  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('foto', file)
    return api.post<any>(`/usuarios/${id}/foto`, formData)
  },
}

// ============ PERMISSION SERVICE ============
export interface Permiso {
  modulo: string
  acciones: string[]
}

export const permissionService = {
  getAll: () => {
    return api.get<Permiso[]>('/permisos')
  },

  getRolePermissions: (rol: string) => {
    return api.get<Permiso[]>(`/permisos/rol/${rol}`)
  },

  getUserPermissions: (userId: string) => {
    return api.get<Permiso[]>(`/usuarios/${userId}/permisos`)
  },

  updateUserPermissions: (userId: string, permisos: Permiso[]) => {
    return api.put<Permiso[]>(`/usuarios/${userId}/permisos`, { permisos })
  },

  resetToDefault: (userId: string) => {
    return api.post<Permiso[]>(`/usuarios/${userId}/permisos/reset`)
  },
}

// ============ CLIENTES SERVICE ============
export interface ClienteFilters {
  busqueda?: string
  estado?: string
  tipo_cliente?: string
  genero?: string
  sucursal?: string
  page?: number
  per_page?: number
  order_by?: 'nombres' | 'apellidos' | 'dpi' | 'created_at' | 'estado' | 'tipo_cliente'
  order_dir?: 'asc' | 'desc'
}

export interface ClienteStats {
  total: number
  activos: number
  inactivos: number
  vip: number
  por_genero: {
    masculino: number
    femenino: number
    otro: number
  }
}

export interface ClientesResponse {
  data: any[]
  pagination: PaginationInfo
  stats: ClienteStats
  sucursales: string[]
}

export const clienteService = {
  getActivos: () => {
    return api.get<Cliente[]>('/clientes/activos')
  },

  getAll: (params?: ClienteFilters) => {
    const query = new URLSearchParams()
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.estado && params.estado !== 'todos') query.append('estado', params.estado)
    if (params?.tipo_cliente && params.tipo_cliente !== 'todos') query.append('tipo_cliente', params.tipo_cliente)
    if (params?.genero && params.genero !== 'todos') query.append('genero', params.genero)
    if (params?.sucursal && params.sucursal !== 'todos') query.append('sucursal', params.sucursal)
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.order_by) query.append('order_by', params.order_by)
    if (params?.order_dir) query.append('order_dir', params.order_dir)
    const queryString = query.toString()
    return api.get<ClientesResponse>(`/clientes${queryString ? `?${queryString}` : ''}`)
  },

  getById: (id: string) => {
    return api.get<any>(`/clientes/${id}`)
  },

  getCreditosPrendarios: (id: string, params?: { page?: number; per_page?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    const queryString = query.toString()
    return api.get<any>(`/clientes/${id}/creditos-prendarios${queryString ? `?${queryString}` : ''}`)
  },

  getFicha: (id: string) => {
    return api.get<any>(`/clientes/${id}/ficha`)
  },

  descargarFichaPdf: async (id: string): Promise<void> => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      throw new Error('No hay sesión activa')
    }

    const response = await fetch(`${API_BASE_URL}/clientes/${id}/ficha/pdf`, {
      method: 'POST',
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
        throw new Error(error.message || 'Error al descargar ficha del cliente')
      }
      throw new Error('Error al descargar ficha del cliente')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Ficha_Cliente_${id}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  create: (cliente: any) => {
    const data: any = {
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      dpi: cliente.dpi,
      nit: cliente.nit,
      fecha_nacimiento: cliente.fechaNacimiento,
      genero: cliente.genero,
      estado_civil: cliente.estadoCivil,
      profesion: cliente.profesion,
      telefono: cliente.telefono,
      telefono_secundario: cliente.telefonoSecundario,
      email: cliente.email,
      direccion: cliente.direccion,
      municipio: cliente.municipio,
      departamento_geoname_id: cliente.departamentoGeonameId,
      municipio_geoname_id: cliente.municipioGeonameId,
      fotografia: cliente.fotografia,
      estado: cliente.estado,
      sucursal: cliente.sucursal,
      tipo_cliente: cliente.tipoCliente,
      notas: cliente.notas,
    }
    if (Array.isArray(cliente.referencias)) {
      data.referencias = cliente.referencias.map((ref: any) => ({
        nombre: ref.nombre,
        telefono: ref.telefono,
        relacion: ref.relacion,
      }))
    }
    return api.post<any>('/clientes', data)
  },

  update: (id: string, cliente: any) => {
    const data: any = {}
    if (cliente.nombres !== undefined) data.nombres = cliente.nombres
    if (cliente.apellidos !== undefined) data.apellidos = cliente.apellidos
    if (cliente.dpi !== undefined) data.dpi = cliente.dpi
    if (cliente.nit !== undefined) data.nit = cliente.nit
    if (cliente.fechaNacimiento !== undefined) data.fecha_nacimiento = cliente.fechaNacimiento
    if (cliente.genero !== undefined) data.genero = cliente.genero
    if (cliente.estadoCivil !== undefined) data.estado_civil = cliente.estadoCivil
    if (cliente.profesion !== undefined) data.profesion = cliente.profesion
    if (cliente.telefono !== undefined) data.telefono = cliente.telefono
    if (cliente.telefonoSecundario !== undefined) data.telefono_secundario = cliente.telefonoSecundario
    if (cliente.email !== undefined) data.email = cliente.email
    if (cliente.direccion !== undefined) data.direccion = cliente.direccion
    if (cliente.municipio !== undefined) data.municipio = cliente.municipio
    if (cliente.departamentoGeonameId !== undefined) data.departamento_geoname_id = cliente.departamentoGeonameId
    if (cliente.municipioGeonameId !== undefined) data.municipio_geoname_id = cliente.municipioGeonameId
    if (cliente.fotografia !== undefined) data.fotografia = cliente.fotografia
    if (cliente.estado !== undefined) data.estado = cliente.estado
    if (cliente.sucursal !== undefined) data.sucursal = cliente.sucursal
    if (cliente.tipoCliente !== undefined) data.tipo_cliente = cliente.tipoCliente
    if (cliente.notas !== undefined) data.notas = cliente.notas
    if (cliente.referencias !== undefined) {
      data.referencias = Array.isArray(cliente.referencias)
        ? cliente.referencias.map((ref: any) => ({
            nombre: ref.nombre,
            telefono: ref.telefono,
            relacion: ref.relacion,
          }))
        : []
    }
    return api.put<any>(`/clientes/${id}`, data)
  },

  delete: (id: string) => {
    return api.delete(`/clientes/${id}`)
  },

  uploadPhoto: (id: string, fotografia: string) => {
    return api.post<any>(`/clientes/${id}/foto`, { fotografia })
  },

  toggleMasivo: (ids: string[], accion: 'activar' | 'desactivar') => {
    return api.post<any>('/clientes/toggle-masivo', { ids: ids.map(Number), accion })
  },

  descargarReporte: async (params?: { estado?: string; busqueda?: string }): Promise<void> => {
    const query = new URLSearchParams({ formato: 'csv' })
    if (params?.estado && params.estado !== 'todos') query.append('estado', params.estado)
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    await api.downloadFile(`/clientes/reporte?${query}`, `Clientes_${new Date().toISOString().split('T')[0]}.csv`)
  },
}

// ============ CLIENTE BORRADORES SERVICE ============

export interface ClienteBorrador {
  id: number
  user_id: number
  titulo: string
  datos: Record<string, any>
  created_at: string
  updated_at: string
}

export const clienteDraftService = {
  getAll: () => api.get<ClienteBorrador[]>('/clientes/borradores'),

  create: (datos: Record<string, any>, titulo?: string) =>
    api.post<ClienteBorrador>('/clientes/borradores', { datos, titulo }),

  update: (id: number, datos: Record<string, any>, titulo?: string) =>
    api.put<ClienteBorrador>(`/clientes/borradores/${id}`, { datos, titulo }),

  delete: (id: number) => api.delete(`/clientes/borradores/${id}`),
}

// ============ SUCURSALES SERVICE ============

export interface SucursalFilters {
  activa?: boolean | string
  busqueda?: string
  page?: number
  per_page?: number
  order_by?: 'codigo' | 'nombre' | 'ciudad' | 'activa' | 'created_at'
  order_dir?: 'asc' | 'desc'
}

export interface SucursalStats {
  total: number
  activas: number
  inactivas: number
}

export interface SucursalesResponse {
  data: any[]
  pagination: PaginationInfo
  stats: SucursalStats
}

export const sucursalService = {
  getAll: (params?: SucursalFilters) => {
    const query = new URLSearchParams()
    if (params?.activa !== undefined && params.activa !== '') query.append('activa', String(params.activa))
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.order_by) query.append('order_by', params.order_by)
    if (params?.order_dir) query.append('order_dir', params.order_dir)
    const queryString = query.toString()
    return api.get<SucursalesResponse>(`/sucursales${queryString ? `?${queryString}` : ''}`)
  },

  getActivas: () => {
    // Cache-busting: timestamp para evitar caché del navegador/CDN
    const ts = Date.now()
    return api.get<Array<{ id: string; codigo: string; nombre: string }>>(`/sucursales/activas?_t=${ts}`)
  },

  getById: (id: string) => {
    return api.get<any>(`/sucursales/${id}`)
  },

  create: (sucursal: any) => {
    return api.post<any>('/sucursales', sucursal)
  },

  update: (id: string, sucursal: any) => {
    return api.put<any>(`/sucursales/${id}`, sucursal)
  },

  delete: (id: string) => {
    return api.delete(`/sucursales/${id}`)
  },

  toggleActiva: (id: string) => {
    return api.post<any>(`/sucursales/${id}/toggle-activa`)
  },
}

// ============ CATEGORIAS PRODUCTOS SERVICE ============

export interface CategoriaProductoFilters {
  activa?: boolean | string
  busqueda?: string
  page?: number
  per_page?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}

export interface CategoriasProductosResponse {
  success: boolean
  data: CategoriaProducto[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
  stats: {
    total: number
    activas: number
    inactivas: number
  }
}

export const categoriaProductoService = {
  getAll: (params?: CategoriaProductoFilters) => {
    const query = new URLSearchParams()
    if (params?.activa !== undefined && params.activa !== '') query.append('activa', String(params.activa))
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.order_by) query.append('order_by', params.order_by)
    if (params?.order_dir) query.append('order_dir', params.order_dir)
    const queryString = query.toString()
    return api.get<CategoriasProductosResponse>(`/categorias-productos${queryString ? `?${queryString}` : ''}`)
  },

  getActivas: () => {
    return api.get<{
      data: Array<{
        id: string
        codigo: string
        nombre: string
        color?: string
        icono?: string
        tasa_interes_default?: number | null
        tasa_mora_default?: number | null
        plazo_maximo_dias?: number | null
        porcentaje_prestamo_maximo?: number | null
        metodo_calculo_default?: 'francesa' | 'flat'
        afecta_interes_mensual?: boolean
        permite_pago_capital_diferente?: boolean
        campos_formulario?: {
          marca: boolean
          modelo: boolean
          numero_serie: boolean
          condicion_fisica: boolean
        } | null
        campos_adicionales?: Array<{
          nombre: string
          label: string
          tipo: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date'
          requerido: boolean
          opciones?: string[]
          placeholder?: string
          min?: number
          max?: number
          step?: number
        }> | null
      }>
    }>('/categorias-productos/activas')
  },

  getById: (id: string) => {
    return api.get<any>(`/categorias-productos/${id}`)
  },

  create: (categoria: any) => {
    // Transformar camposDinamicos a campos_dinamicos para el backend
    const payload = {
      ...categoria,
      campos_dinamicos: categoria.camposDinamicos || [],
    }
    delete payload.camposDinamicos
    return api.post<any>('/categorias-productos', payload)
  },

  update: (id: string, categoria: any) => {
    // Transformar camposDinamicos a campos_dinamicos para el backend
    const payload = {
      ...categoria,
      campos_dinamicos: categoria.camposDinamicos || [],
    }
    delete payload.camposDinamicos
    return api.put<any>(`/categorias-productos/${id}`, payload)
  },

  delete: (id: string) => {
    return api.delete(`/categorias-productos/${id}`)
  },

  toggleActiva: (id: string) => {
    return api.post<any>(`/categorias-productos/${id}/toggle-activa`)
  },
}

// ============ GEONAMES SERVICE (GUATEMALA) ============

export interface Departamento {
  geonameId: number
  name: string
  adminCode1: string
  countryCode: string
}

export interface Municipio {
  geonameId: number
  name: string
  adminCode1: string
  countryCode: string
}

export interface GuatemalaCompleto {
  pais: {
    geonameId: number
    countryName: string
    countryCode: string
  }
  departamentos: Array<{
    geonameId: number
    name: string
    adminCode1: string
    municipios: Municipio[]
  }>
}

export const geoNamesService = {
  getDepartamentos: () => {
    return api.get<Departamento[]>('/geonames/departamentos')
  },

  getMunicipios: (departamentoGeonameId: number) => {
    return api.get<Municipio[]>(`/geonames/municipios/${departamentoGeonameId}`)
  },

  getGuatemalaCompleto: () => {
    return api.get<GuatemalaCompleto>('/geonames/guatemala-completo')
  },
}

// ============ PRENDAS SERVICE ============

export interface PrendaFilters {
  busqueda?: string
  estado?: string
  categoria?: string
  sucursal?: string
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  per_page?: number
  order_by?: 'descripcion' | 'categoria' | 'avaluo' | 'estado' | 'fecha_ingreso'
  order_dir?: 'asc' | 'desc'
}

export interface PrendaStats {
  total: number
  empeniadas: number
  vencidas: number
  en_venta: number
  vendidas: number
  recuperadas: number
  valor_total_avaluo: number
  valor_total_venta: number
}

export interface PrendasResponse {
  data: any[]
  pagination: PaginationInfo
  stats: PrendaStats
}

export const prendaService = {
  getAll: (params?: PrendaFilters) => {
    const query = new URLSearchParams()
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.estado && params.estado !== 'todos') query.append('estado', params.estado)
    if (params?.categoria && params.categoria !== 'todos') query.append('categoria', params.categoria)
    if (params?.sucursal && params.sucursal !== 'todos') query.append('sucursal', params.sucursal)
    if (params?.fecha_desde) query.append('fecha_desde', params.fecha_desde)
    if (params?.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta)
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.order_by) query.append('order_by', params.order_by)
    if (params?.order_dir) query.append('order_dir', params.order_dir)
    const queryString = query.toString()
    return api.get<PrendasResponse>(`/prendas${queryString ? `?${queryString}` : ''}`)
  },

  getById: (id: string) => {
    return api.get<any>(`/prendas/${id}`)
  },

  create: (prenda: any) => {
    return api.post<any>('/prendas', prenda)
  },

  update: (id: string, prenda: any) => {
    return api.put<any>(`/prendas/${id}`, prenda)
  },

  delete: (id: string) => {
    return api.delete(`/prendas/${id}`)
  },

  // Gestión de estado
  marcarRecuperada: (id: string, fechaRecuperacion?: string) => {
    return api.post<any>(`/prendas/${id}/recuperar`, { fecha_recuperacion: fechaRecuperacion })
  },

  marcarEnVenta: (id: string, valorVenta: number) => {
    return api.post<any>(`/prendas/${id}/poner-venta`, { valor_venta: valorVenta })
  },

  marcarVendida: (id: string, data: { valor_venta_final: number; comprador_id?: string; fecha_venta?: string }) => {
    return api.post<any>(`/prendas/${id}/vender`, data)
  },

  // Fotos
  uploadPhoto: (id: string, foto: string) => {
    return api.post<any>(`/prendas/${id}/foto`, { foto })
  },

  deletePhoto: (id: string, fotoUrl: string) => {
    return api.delete(`/prendas/${id}/foto`, { foto_url: fotoUrl })
  },

  // Estadísticas
  getStats: () => {
    return api.get<PrendaStats>('/prendas/estadisticas')
  },

  // Consultas específicas
  getEnVenta: () => {
    return api.get<any[]>('/prendas/en-venta')
  },

  getPorCategoria: (categoriaId: string) => {
    return api.get<any[]>(`/prendas/categoria/${categoriaId}`)
  },
}

// ============ VENTAS SERVICE ============

export interface VentaItem {
  prenda_id: number | string
  precio_unitario: number
  descuento: number
}

export interface VentaPago {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
  monto: number
  referencia?: string
}

export interface VentaPayload {
  cliente_id: number | null
  consumidor_final?: boolean
  tipo_venta: 'contado' | 'apartado' | 'plan_pagos'
  tipo_comprobante?: string
  nit?: string
  estado?: string
  fecha_factura?: string
  items: VentaItem[]
  pagos: VentaPago[]
  descuento_general?: number
  observaciones?: string
}

export const ventaService = {
  getAll: (params?: any) => {
    const query = new URLSearchParams()
    if (params?.estado) query.append('estado', params.estado)
    if (params?.fecha_desde) query.append('fecha_desde', params.fecha_desde)
    if (params?.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta)
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    const queryString = query.toString()
    return api.get<any>(`/ventas${queryString ? `?${queryString}` : ''}`)
  },

  getById: (id: string) => {
    return api.get<any>(`/ventas/${id}`)
  },

  store: (venta: VentaPayload) => {
    return api.post<any>('/ventas', venta)
  },

  cancelar: (id: string, data: { motivo: string; devolver_abono?: boolean }) => {
    return api.post<any>(`/ventas/${id}/cancelar`, data)
  },

  registrarPago: (id: string, pago: VentaPago) => {
    return api.post<any>(`/ventas/${id}/pagos`, pago)
  },

  getEstadisticas: (params?: { fecha_desde?: string; fecha_hasta?: string }) => {
    const query = new URLSearchParams()
    if (params?.fecha_desde) query.append('fecha_desde', params.fecha_desde)
    if (params?.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta)
    const queryString = query.toString()
    return api.get<any>(`/ventas/estadisticas${queryString ? `?${queryString}` : ''}`)
  },

  certificar: (id: string) => {
    return api.post<any>(`/ventas/${id}/certificar`)
  },

  getPDF: (id: string) => {
    return api.get<any>(`/ventas/${id}/pdf`)
  },

  exportExcel: (params?: any) => {
    const query = new URLSearchParams()
    if (params?.estado) query.append('estado', params.estado)
    if (params?.fecha_desde) query.append('fecha_desde', params.fecha_desde)
    if (params?.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta)
    const queryString = query.toString()
    return api.get<any>(`/ventas/exportar/excel${queryString ? `?${queryString}` : ''}`)
  },

  delete: (id: string) => {
    return api.delete(`/ventas/${id}`)
  },

  registrarAbono: (id: string, data: any) => {
    return api.post<any>(`/ventas/${id}/abonos`, data)
  },

  getPendientesPago: (params?: any) => {
    const query = new URLSearchParams()
    if (params?.cliente_id) query.append('cliente_id', params.cliente_id)
    if (params?.vencidas) query.append('vencidas', '1')
    if (params?.por_vencer) query.append('por_vencer', '1')
    if (params?.page) query.append('page', String(params.page))
    const queryString = query.toString()
    return api.get<any>(`/ventas/pendientes-pago${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Prendas realmente disponibles para vender (excluye apartadas, en plan de pago, ya vendidas).
   * Usar este endpoint en Nueva Venta en lugar de prendaService.getAll para que no aparezcan en el selector.
   */
  getPrendasDisponibles: (params?: { page?: number; per_page?: number; busqueda?: string; categoria_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.busqueda) query.append('busqueda', params.busqueda ?? '')
    if (params?.categoria_id) query.append('categoria_id', String(params.categoria_id))
    const queryString = query.toString()
    return api.get<any[]>(`/ventas/prendas-disponibles${queryString ? `?${queryString}` : ''}`)
  },

  /** Apartados: solo ventas con estado apartado (tab Apartados) */
  getApartados: (params?: { page?: number; per_page?: number; busqueda?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    const queryString = query.toString()
    return api.get<any[]>(`/ventas/apartados${queryString ? `?${queryString}` : ''}`)
  },

  /** Planes de pago activos (VentaCredito con cuotas) - tab Planes Pago */
  getPlanesPago: (params?: { page?: number; per_page?: number; estado?: string; busqueda?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.estado) query.append('estado', params.estado)
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    const queryString = query.toString()
    return api.get<any[]>(`/ventas/planes-pago${queryString ? `?${queryString}` : ''}`)
  },

  /** Detalle del plan de pago de una venta */
  getPlanPago: (ventaId: string) => api.get<any>(`/ventas/${ventaId}/plan-pago`),

  /** Registrar pago de una cuota (plan de pagos). Soporta pago normal, parcial (abono) y adelantado. */
  pagarCuota: (
    cuotaId: string,
    data: {
      monto: number
      caja_id: number
      observacion?: string
      /** Si true, en pago parcial genera una nueva cuota con el restante + intereses + gastos */
      generar_nueva_cuota_restante?: boolean
      gasto_refinanciamiento?: number
    }
  ) => api.post<any>(`/ventas/cuotas/${cuotaId}/pagar`, data),

  /** Pago múltiple de cuotas (un solo ingreso a caja y un asiento). Todas deben ser del mismo crédito. */
  pagarMultipleCuotas: (data: {
    cuota_ids: number[]
    caja_id: number
    observacion?: string
  }) => api.post<any>('/ventas/cuotas/pagar-multiple', data),

  /**
   * Descargar recibo POS de una venta (contado, apartado, crédito).
   * Usa el endpoint GET /ventas/{id}/recibo-pos que ya incluye info de apartado/crédito.
   */
  generarReciboVenta: (ventaId: string): Promise<Blob> => {
    const token = localStorage.getItem('auth_token')
    return fetch(`${API_BASE_URL}/ventas/${ventaId}/recibo-pos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      credentials: 'include',
    }).then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.message || 'Error al generar recibo') })
      return r.blob()
    })
  },

  /** Descargar recibo PDF de pago de una cuota específica */
  generarTicketCuota: (cuotaId: string): Promise<Blob> => {
    const token = localStorage.getItem('auth_token')
    return fetch(`${API_BASE_URL}/ventas/cuotas/${cuotaId}/ticket`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      credentials: 'include',
    }).then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.message || 'Error al generar ticket') })
      return r.blob()
    })
  },

  generarReciboCuota: (cuotaId: string): Promise<Blob> => {
    const token = localStorage.getItem('auth_token')
    return fetch(`${API_BASE_URL}/ventas/cuotas/${cuotaId}/recibo`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      credentials: 'include',
    }).then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.message || 'Error al generar recibo') })
      return r.blob()
    })
  },
}

// Tipos para Dashboard
export interface DashboardData {
  total_clientes: number
  creditos_activos: number
  creditos_vencidos: number
  total_prestado: number
  total_saldo: number
  total_recuperado: number
  creditos_por_estado: Record<string, number>
  ventas_mes_actual: number
  prendas_en_inventario: number
  creditos_proximos_vencer: number
  fecha_consulta: string
  modo_bienvenida?: boolean
  mensaje_bienvenida?: string
}

export interface DashboardGraficas {
  creditos_por_mes: Array<{
    mes: string
    total: number
    monto_total: number
  }>
  ventas_por_mes: Array<{
    mes: string
    total: number
    monto_total: number
  }>
}

export interface DashboardAlertas {
  creditos_vencidos_hoy: any[]
  creditos_en_mora: any[]
  creditos_proximos_vencer: any[]
}

// Servicio de Dashboard
export const dashboardService = {
  getEstadisticas: () => {
    return api.get<DashboardData>('/dashboard')
  },

  getGraficas: () => {
    return api.get<DashboardGraficas>('/dashboard/graficas')
  },

  getAlertas: () => {
    return api.get<DashboardAlertas>('/dashboard/alertas')
  }
}

// ==========================================
// 🏡 REAL ESTATE SERVICES (FINCAS, PARCELAS, LOTES)
// ==========================================

export interface Finca {
  id: number
  nombre: string
  codigo: string
  ubicacion?: string
  municipio: string
  departamento: string
  area_total_m2: number
  numero_finca?: string
  folio?: string
  libro?: string
  descripcion?: string
  parcelas_count?: number
  lotes_count?: number
  lotes_disponibles_count?: number
  activo?: boolean
  parcelas?: Parcela[]
}

export interface Parcela {
  id: number
  finca_id: number
  nombre_identificador: string
  codigo?: string
  area_m2: number
  medidas_perimetro?: string
  colindancias?: string
  tipo_terreno: string
  descripcion?: string
  lotes_count?: number
  lotes?: Lote[]
}

export interface Lote {
  id: number
  parcela_id: number
  vendedor_id?: number | null
  numero_lote: string
  codigo_unico: string
  area_m2: number
  frente_metros?: number
  fondo_metros?: number
  lado_norte?: number | string | null
  lado_sur?: number | string | null
  lado_este?: number | string | null
  lado_oeste?: number | string | null
  colindancias?: string
  tipo_terreno: string
  precio_m2: number
  precio_venta: number
  estado: 'disponible' | 'reservado' | 'en_negociacion' | 'vendido' | 'pagado' | 'cancelado'
  observaciones?: string
  latitud?: number | string | null
  longitud?: number | string | null
  altitud?: number | string | null
  precision_metros?: number | string | null
  referencia_geo?: string | null
  token_publico?: string | null
  publicado?: boolean
  parcela?: Parcela & { finca?: Finca }
  vendedor?: { id: number; nombre?: string; username?: string; name?: string }
  servicios?: Array<{ id: number; nombre_servicio: string; estado: string; costo_adicional: number }>
  imagenes?: Array<{ id: number; url: string; url_publica?: string; descripcion?: string; es_principal: boolean }>
}

export interface TerrenoPublico {
  numero_lote: string
  codigo_unico: string
  area_m2: number
  frente_metros?: number | string | null
  fondo_metros?: number | string | null
  colindancias?: string | null
  tipo_terreno?: string
  precio_venta: number | string
  precio_m2?: number | string
  observaciones?: string | null
  latitud?: number | string | null
  longitud?: number | string | null
  altitud?: number | string | null
  referencia_geo?: string | null
  disponible: boolean
  estado_comercial: string
  proyecto?: {
    nombre?: string | null
    municipio?: string | null
    departamento?: string | null
    ubicacion?: string | null
  }
  parcela?: string | null
  servicios?: Array<{ nombre: string; estado: string }>
  imagenes?: Array<{ id?: number; url: string; descripcion?: string | null; es_principal: boolean }>
}

export const fincaService = {
  getAll: (params?: { busqueda?: string }) => {
    const query = new URLSearchParams()
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    return api.get<Finca[]>(`/fincas?${query.toString()}`)
  },
  getById: (id: number) => {
    return api.get<Finca>(`/fincas/${id}`)
  },
  create: (data: Partial<Finca>) => {
    return api.post<Finca>('/fincas', data)
  },
  update: (id: number, data: Partial<Finca>) => {
    return api.put<Finca>(`/fincas/${id}`, data)
  },
  desactivar: (id: number) => {
    return api.post<Finca>(`/fincas/${id}/desactivar`)
  },
  createParcela: (fincaId: number, data: Partial<Parcela>) => {
    return api.post<Parcela>(`/fincas/${fincaId}/parcelas`, data)
  },
  createLote: (parcelaId: number, data: Partial<Lote>) => {
    return api.post<Lote>(`/parcelas/${parcelaId}/lotes`, data)
  }
}

export const loteService = {
  getAll: (params?: { estado?: string; parcela_id?: number; finca_id?: number; busqueda?: string; vendedor_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.estado && params.estado !== 'todos') query.append('estado', params.estado)
    if (params?.parcela_id) query.append('parcela_id', params.parcela_id.toString())
    if (params?.finca_id) query.append('finca_id', params.finca_id.toString())
    if (params?.busqueda) query.append('busqueda', params.busqueda)
    if (params?.vendedor_id) query.append('vendedor_id', params.vendedor_id.toString())
    return api.get<Lote[]>(`/lotes?${query.toString()}`)
  },
  getDisponibles: () => {
    return api.get<Lote[]>('/lotes/disponibles')
  },
  getById: (id: number) => {
    return api.get<Lote>(`/lotes/${id}`)
  },
  update: (id: number, data: Partial<Lote>) => {
    return api.put<Lote>(`/lotes/${id}`, data)
  },
  eliminar: (id: number) => {
    return api.delete(`/lotes/${id}`)
  },
  getPublico: (token: string) => {
    return api.get<TerrenoPublico>(`/publico/terrenos/${token}`)
  },
  addServicio: (loteId: number, data: any) => {
    return api.post(`/lotes/${loteId}/servicios`, data)
  },
  subirImagen: (loteId: number, archivo: File, extras?: { descripcion?: string; es_principal?: boolean }) => {
    const form = new FormData()
    form.append('archivo', archivo)
    if (extras?.descripcion) form.append('descripcion', extras.descripcion)
    if (extras?.es_principal) form.append('es_principal', '1')
    return api.post(`/lotes/${loteId}/imagenes`, form)
  },
  eliminarImagen: (loteId: number, imagenId: number) => {
    return api.delete(`/lotes/${loteId}/imagenes/${imagenId}`)
  },
}

export type PuntoPlano = [number, number]

export interface LotePlano {
  id: number
  numero_lote: string
  codigo_unico: string
  estado: string
  parcela: { id: number; nombre: string } | null
  puntos: PuntoPlano[] | null
  visible: boolean
  area_m2?: number | string
  frente_metros?: number | string | null
  fondo_metros?: number | string | null
  lado_norte?: number | string | null
  lado_sur?: number | string | null
  lado_este?: number | string | null
  lado_oeste?: number | string | null
  tipo_terreno?: string | null
  colindancias?: string | null
  precio_venta?: number | string | null
  precio_m2?: number | string | null
  observaciones?: string | null
  vendedor?: string | null
  servicios?: Array<{ nombre: string; estado: string }>
  negociacion?: {
    id: number
    codigo: string
    tipo: string
    estado: string
    comprador: string | null
    asesor?: string | null
    precio_final?: number | string | null
    enganche_pactado?: number | string | null
    plazo_meses?: number | null
    tasa_interes_anual?: number | string | null
    sistema_amortizacion?: string | null
    cuota_mensual?: number | string | null
    monto_financiado?: number | string | null
    cuotas_pagadas?: number | null
    cuotas_pendientes?: number | null
    saldo_capital_pendiente?: number | string | null
    comisionistas?: Array<{ nombre: string | null; monto: number | string | null; estado: string | null }>
  } | null
}

export interface PlanoFinca {
  finca: { id: number; codigo: string; nombre: string }
  plano: { id: number | null; ancho: number; alto: number; tiene_imagen: boolean; imagen_nombre: string | null; actualizado: string | null }
  lotes: LotePlano[]
}

export const planoLotificacionService = {
  get: (fincaId: number) => api.get<PlanoFinca>(`/fincas/${fincaId}/plano`),
  imagen: (fincaId: number) => api.fetchBlob(`/fincas/${fincaId}/plano/imagen`),
  subirImagen: (fincaId: number, archivo: File) => {
    const form = new FormData()
    form.append('archivo', archivo)
    return api.post<{ ancho: number; alto: number; imagen_nombre: string }>(`/fincas/${fincaId}/plano/imagen`, form)
  },
  guardarGeometrias: (fincaId: number, geometrias: Array<{ lote_id: number; puntos: PuntoPlano[] | null }>) =>
    api.put<{ guardadas: number; quitadas: number }>(`/fincas/${fincaId}/plano/geometrias`, { geometrias }),
}

// ==========================================
// 💼 NEGOCIACIONES & SIMULADOR INMOBILIARIO
// ==========================================

export interface SimuladorRequest {
  lote_id?: number
  tasa_interes_id?: number
  precio_lote?: number
  descuento?: number
  enganche?: number
  gastos_escrituracion?: number
  plazo_meses: number
  periodo_pago?: 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'quimestral' | 'semestral' | 'anual'
  tasa_interes_anual?: number
  fecha_primer_pago?: string
  metodo?: 'frances' | 'aleman' | 'americano' | 'plano'
}

export interface SimuladorResponse {
  precio_original: number
  descuento: number
  gastos_escrituracion: number
  precio_final: number
  enganche: number
  monto_financiado: number
  tasa_interes_anual: number
  plazo_meses: number
  periodo_pago?: string
  numero_cuotas?: number
  cuota_mensual: number
  total_intereses_proyectados: number
  total_a_pagar: number
  tabla_amortizacion: Array<{
    numero_cuota: number
    fecha_vencimiento: string
    cuota_capital: number
    cuota_interes: number
    cuota_monto_total: number
    saldo_capital_restante: number
  }>
}

export interface Negociacion {
  id: number
  codigo_negociacion: string
  cliente_id: number
  comprador?: any
  lote_id: number
  lote?: Lote
  tipo_negociacion: 'contado' | 'credito' | 'reserva'
  precio_original: number
  descuento: number
  gastos_escrituracion: number
  precio_final: number
  enganche_pactado: number
  enganche_pagado: number
  monto_financiado: number
  tasa_interes_anual: number
  parametrizacion_mora_id?: number | null
  tipo_mora_aplicada?: string | null
  mora_porcentaje_diario_snapshot?: number | null
  mora_monto_fijo_diario_snapshot?: number | null
  mora_dias_gracia_snapshot?: number | null
  parametrizacion_mora?: {
    id: number
    nombre: string
    tipo_calculo: string
    porcentaje_diario: number
    monto_fijo_diario: number
    dias_gracia: number
  } | null
  sistema_amortizacion?: 'frances' | 'aleman' | 'americano' | 'plano' | string
  politica_abono_extra?: 'reducir_plazo' | 'reducir_cuota' | string
  plazo_meses: number
  periodo_pago?: string
  cuota_mensual: number
  total_intereses_proyectados: number
  total_a_pagar: number
  total_capital_pagado: number
  total_interes_pagado: number
  saldo_capital_pendiente: number
  cuotas_pagadas: number
  cuotas_pendientes: number
  fecha_negociacion: string
  fecha_primer_pago?: string
  fecha_vencimiento_contrato?: string
  estado: 'borrador' | 'reservada' | 'activa' | 'pagada_total' | 'rescindida' | 'en_mora'
  observaciones?: string
  planPagos?: any[]
  plan_pagos?: any[]
  pagos?: any[]
}

export const negociacionService = {
  simular: (data: SimuladorRequest) => {
    return api.post<SimuladorResponse>('/simulador/calcular', data)
  },
  getAll: (params?: { estado?: string; cliente_id?: number; per_page?: number }) => {
    const query = new URLSearchParams()
    if (params?.estado && params.estado !== 'todos') query.append('estado', params.estado)
    if (params?.cliente_id) query.append('cliente_id', params.cliente_id.toString())
    if (params?.per_page) query.append('per_page', params.per_page.toString())
    return api.get<Negociacion[]>(`/negociaciones?${query.toString()}`)
  },
  getById: (id: number) => {
    return api.get<Negociacion>(`/negociaciones/${id}`)
  },
  getEstadoCuenta: (id: number) => {
    return api.get<any>(`/negociaciones/${id}/estado-cuenta`)
  },
  descargarEstadoCuentaPdf: (id: number, codigo?: string) => {
    return api.downloadFile(
      `/negociaciones/${id}/estado-cuenta?formato=pdf`,
      `EstadoCuenta_${codigo || id}.pdf`
    )
  },
  descargarEstadoCuentaExcel: (id: number, codigo?: string) => {
    return api.downloadFile(
      `/negociaciones/${id}/estado-cuenta?formato=xlsx`,
      `EstadoCuenta_${codigo || id}.xlsx`
    )
  },
  descargarPlanPagosPdf: (id: number, codigo?: string) => {
    return api.downloadFile(
      `/negociaciones/${id}/plan-pagos-pdf`,
      `PlanPagos_${codigo || id}.pdf`
    )
  },
  descargarContratoPdf: (id: number, codigo?: string) => {
    return api.downloadFile(
      `/negociaciones/${id}/contrato-pdf`,
      `Contrato_${codigo || id}.pdf`
    )
  },
  create: (data: any) => {
    return api.post<Negociacion>('/negociaciones', data)
  },
  actualizarFechas: (
    id: number,
    data: {
      fecha_negociacion: string
      fecha_primer_pago?: string
      sincronizar_pagos_iniciales?: boolean
    }
  ) => {
    return api.put<Negociacion>(`/negociaciones/${id}/fechas`, data)
  },
  rescindir: (id: number, motivo: string) => {
    return api.post<Negociacion>(`/negociaciones/${id}/rescindir`, { motivo })
  },
}

export const pagoTerrenoService = {
  getAll: (params?: { negociacion_id?: number; cliente_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.negociacion_id) query.append('negociacion_id', params.negociacion_id.toString())
    if (params?.cliente_id) query.append('cliente_id', params.cliente_id.toString())
    return api.get<any[]>(`/pagos-terrenos?${query.toString()}`)
  },
  registrar: (data: {
    negociacion_id: number
    tipo_pago: string
    monto: number
    metodo_pago: string
    referencia_bancaria?: string
    observaciones?: string
    caja_apertura_cierre_id?: number
    fecha_pago?: string
  }) => {
    return api.post<any>('/pagos-terrenos', data)
  },
  descargarReciboPdf: (pagoId: number, numRecibo?: string) => {
    return api.downloadFile(
      `/pagos-terrenos/${pagoId}/recibo-pdf`,
      `ReciboPago_${numRecibo || pagoId}.pdf`
    )
  },
  descargarTicketPdf: (pagoId: number, numRecibo?: string) => {
    return api.downloadFile(
      `/pagos-terrenos/${pagoId}/ticket-pdf`,
      `TicketPago_${numRecibo || pagoId}.pdf`
    )
  },
  anular: (pagoId: number, motivo: string) => {
    return api.post<any>(`/pagos-terrenos/${pagoId}/anular`, { motivo })
  },
}

export interface TasaInmobiliaria {
  id: number
  nombre: string
  porcentaje_anual: number
  tipo_calculo: 'fijo' | 'sobre_saldos' | 'interes_plano'
  periodicidad: 'mensual' | 'quincenal' | 'anual'
  vigencia_inicio?: string | null
  vigencia_fin?: string | null
  activo: boolean
  descripcion?: string | null
}

export const tasaInmobiliariaService = {
  getAll: (soloActivas = false) => {
    const q = soloActivas ? '?solo_activas=1' : ''
    return api.get<TasaInmobiliaria[]>(`/tasas-inmobiliarias${q}`)
  },
  create: (data: Partial<TasaInmobiliaria>) => api.post<TasaInmobiliaria>('/tasas-inmobiliarias', data),
  update: (id: number, data: Partial<TasaInmobiliaria>) => api.put<TasaInmobiliaria>(`/tasas-inmobiliarias/${id}`, data),
  desactivar: (id: number) => api.post<TasaInmobiliaria>(`/tasas-inmobiliarias/${id}/desactivar`),
}

export interface ParametrizacionMoraInmo {
  id: number
  nombre: string
  tipo_calculo: 'porcentaje_capital_vencido' | 'monto_fijo_diario'
  porcentaje_diario: number
  monto_fijo_diario: number
  dias_gracia: number
  activo: boolean
  descripcion?: string | null
}

export const moraInmobiliariaService = {
  getAll: (soloActivas = false) => {
    const q = soloActivas ? '?solo_activas=1' : ''
    return api.get<ParametrizacionMoraInmo[]>(`/parametrizacion-mora-inmobiliaria${q}`)
  },
  create: (data: Partial<ParametrizacionMoraInmo>) => api.post<ParametrizacionMoraInmo>('/parametrizacion-mora-inmobiliaria', data),
  update: (id: number, data: Partial<ParametrizacionMoraInmo>) => api.put<ParametrizacionMoraInmo>(`/parametrizacion-mora-inmobiliaria/${id}`, data),
}

export interface CompraFincaPayload {
  finca: Finca & {
    vendedor_nombre?: string | null
    vendedor_dpi?: string | null
    referencia?: string | null
    precio_compra?: number | string
    gastos_escrituracion?: number | string
    tipo_compra?: 'contado' | 'pagos'
    enganche?: number | string
    numero_cuotas?: number
    frecuencia_pago?: string
    fecha_inicio_pagos?: string | null
    cuota_compra?: number | string
    porcentaje_utilidad?: number | string
    area_negociable_m2?: number | string | null
    area_no_negociable_m2?: number | string | null
    area_vialidades_m2?: number | string | null
    area_verde_m2?: number | string | null
    area_tecnica_m2?: number | string | null
    escrituras?: Array<{ id: number; numero_escritura: string; fecha_escritura?: string | null; area_m2: number | string; documento_nombre?: string | null }>
    cuotas_compra?: Array<{ id: number; numero_cuota: number; fecha_vencimiento: string; monto: number | string; monto_pagado: number | string; estado: string }>
    gastos_urbanizacion?: Array<{ id: number; categoria: string; concepto: string; monto: number | string; fecha?: string | null }>
    pagos_compra?: Array<{ id: number; fecha?: string | null; monto: number | string; origen: string; numero_recibo: string }>
  }
  resumen: {
    precio_compra: number
    gastos_escrituracion: number
    urbanizacion: number
    inversion: number
    area_escrituras: number
    area_negociable_m2: number
    area_no_negociable_m2: number
    area_vialidades_m2?: number
    area_verde_m2?: number
    area_tecnica_m2?: number
    area_lotes_m2: number
    costo_m2: number
    porcentaje_utilidad: number
    precio_sugerido_m2: number
    costo_lotes: number
    precio_sugerido_lotes: number
    utilidad_proyectada: number
    saldo_compra: number
    pagado_cuotas: number
    pendiente_cuotas: number
    deuda?: {
      precio: number
      enganche: number
      pagado: number
      pendiente: number
      cuotas_total: number
      cuotas_pagadas: number
      cuotas_pendientes: number
      cuota_proxima: number
      fecha_proxima?: string | null
      saldo_plan: number
      cuadra: boolean
    }
  }
  lotes: Array<{
    id: number
    codigo_unico: string
    numero_lote: string
    parcela?: string | null
    tipo_terreno?: string
    area_m2: number
    frente_metros?: number | null
    fondo_metros?: number | null
    costo_asignado: number
    precio_sugerido: number
    precio_venta: number
    utilidad: number
    utilidad_venta: number
    estado: string
  }>
}

export interface CompraFincaListado {
  id: number
  codigo: string
  nombre: string
  vendedor_nombre?: string | null
  vendedor_dpi?: string | null
  ubicacion?: string | null
  municipio?: string | null
  departamento?: string | null
  precio_compra: number
  gastos_escrituracion: number
  tipo_compra: string
  enganche: number
  numero_cuotas: number
  frecuencia_pago?: string | null
  fecha_inicio_pagos?: string | null
  pagado: number
  pendiente: number
  urbanizacion: number
  escrituras: number
  area_total_m2: number
  estado: string
}

export const compraFincaService = {
  listar: () => api.get<CompraFincaListado[]>('/compras-fincas'),
  crear: (data: Record<string, unknown>) => api.post<CompraFincaPayload>('/compras-fincas', data),
  eliminar: (id: number) => api.delete<{ id: number }>(`/fincas/${id}/compra`),
  detalle: (id: number) => api.get<CompraFincaPayload>(`/fincas/${id}/compra`),
  guardar: (id: number, data: Record<string, unknown>) => api.put<CompraFincaPayload>(`/fincas/${id}/compra`, data),
  agregarEscritura: (id: number, data: { numero_escritura: string; fecha_escritura?: string; area_m2: number }, archivo?: File | null) => {
    const body = new FormData()
    body.append('numero_escritura', data.numero_escritura)
    if (data.fecha_escritura) body.append('fecha_escritura', data.fecha_escritura)
    body.append('area_m2', String(data.area_m2))
    if (archivo) body.append('documento', archivo)
    return api.post<CompraFincaPayload>(`/fincas/${id}/escrituras`, body)
  },
  eliminarEscritura: (id: number, escrituraId: number) =>
    api.delete<CompraFincaPayload>(`/fincas/${id}/escrituras/${escrituraId}`),
  adjuntarDocumento: (id: number, escrituraId: number, archivo: File) => {
    const body = new FormData()
    body.append('documento', archivo)
    return api.post<CompraFincaPayload>(`/fincas/${id}/escrituras/${escrituraId}/documento`, body)
  },
  agregarGasto: (id: number, data: { categoria: string; concepto: string; monto: number; fecha?: string }) =>
    api.post<CompraFincaPayload>(`/fincas/${id}/gastos-urbanizacion`, data),
  eliminarGasto: (id: number, gastoId: number) =>
    api.delete<CompraFincaPayload>(`/fincas/${id}/gastos-urbanizacion/${gastoId}`),
  pagarCuota: (id: number, cuotaId: number, data: { monto: number; fecha?: string; origen: 'caja' | 'boveda' }) =>
    api.post<CompraFincaPayload & { pago_id: number }>(`/fincas/${id}/cuotas-compra/${cuotaId}/pagar`, data),
  sincronizarLotes: (id: number, lotes: Array<{ numero: string; area_m2: number; tipo: string; frente_metros?: number | null; fondo_metros?: number | null }>) =>
    api.post<CompraFincaPayload>(`/fincas/${id}/lotes-medidas`, { lotes }),
  rehacerPendiente: (id: number, data: { cuotas: number; fecha_inicio?: string }) =>
    api.post<CompraFincaPayload>(`/fincas/${id}/rehacer-plan-pendiente`, data),
  aplicarPrecios: (id: number) => api.post<CompraFincaPayload>(`/fincas/${id}/aplicar-precios`),
}

export interface FinancistaItem {
  id: number
  finca_id: number
  finca?: { id: number; nombre: string; codigo?: string }
  tipo: string
  esquema?: string | null
  nombre: string
  dpi?: string | null
  destino: string
  monto: number
  tasa_anual?: number | null
  interes_total: number
  plazo?: number | null
  frecuencia?: string
  fecha_inicio?: string | null
  fecha_vencimiento?: string | null
  cuota: number
  numero_cuotas?: number
  capital_al_vencimiento: boolean
  estado: string
  observaciones?: string | null
  capital_pagado: number
  interes_pagado: number
  mora_pagada: number
  descuento_aplicado: number
  saldo_capital: number
  interes_pendiente: number
  alerta_vencimiento: boolean
}

export const financistaService = {
  listar: (fincaId?: number) => api.get<FinancistaItem[]>(`/financistas${fincaId ? `?finca_id=${fincaId}` : ''}`),
  crear: (data: Record<string, unknown>) => api.post<FinancistaItem>('/financistas', data),
  actualizar: (id: number, data: Record<string, unknown>) => api.put<FinancistaItem>(`/financistas/${id}`, data),
  eliminar: (id: number) => api.delete<FinancistaItem>(`/financistas/${id}`),
  pagar: (id: number, data: { fecha: string; monto_capital: number; monto_interes: number; monto_mora: number; descuento_interes: number; archivo?: File | null; numero_recibo?: string; metodo_pago?: string; concepto?: string }) => {
    const body = new FormData()
    body.append('fecha', data.fecha)
    body.append('monto_capital', String(data.monto_capital))
    body.append('monto_interes', String(data.monto_interes))
    body.append('monto_mora', String(data.monto_mora))
    body.append('descuento_interes', String(data.descuento_interes))
    if (data.numero_recibo) body.append('numero_recibo', data.numero_recibo)
    if (data.metodo_pago) body.append('metodo_pago', data.metodo_pago)
    if (data.concepto) body.append('concepto', data.concepto)
    if (data.archivo) body.append('archivo', data.archivo)
    return api.post<FinancistaItem>(`/financistas/${id}/pagos`, body)
  },
  previewPago: (id: number, fecha: string) => api.get<{ capital: number; interes: number; mora: number; nota: string }>(`/financistas/${id}/preview-pago?fecha=${fecha}`),
  actualizarPago: (id: number, pagoId: number, data: { fecha: string; monto_capital: number; monto_interes: number; monto_mora: number; descuento_interes?: number; referencia?: string }) =>
    api.put<FinancistaItem>(`/financistas/${id}/pagos/${pagoId}`, data),
  eliminarPago: (id: number, pagoId: number) => api.delete<FinancistaItem>(`/financistas/${id}/pagos/${pagoId}`),
  estado: (id: number) => api.get<{
    financista: FinancistaItem
    pagos: Array<Record<string, unknown>>
    plan: Array<{ numero: number; fecha: string; capital: number; interes: number; total: number; estado: string }>
  }>(`/financistas/${id}/estado`),
}

export interface ComisionistaItem {
  id: number
  nombre: string
  telefono?: string | null
  direccion?: string | null
  dpi?: string | null
  activo: boolean
  comisiones_count?: number
}

export interface ComisionItem {
  id: number
  comisionista_id: number
  comisionista?: ComisionistaItem
  lote_id?: number | null
  lote?: { id: number; codigo_unico: string; numero_lote: string } | null
  negociacion_id?: number | null
  negociacion?: { id: number; codigo_negociacion: string } | null
  regla?: { id: number; nombre: string } | null
  descripcion?: string | null
  monto_venta: number
  monto_comision: number
  pagado: number
  pendiente: number
  liberado?: number
  disponible?: number
  cobrado_venta?: number
  precio_base?: number
  excedente?: number
  venta_liquidada?: boolean
  estado: string
  pagos?: Array<{ id: number; fecha: string; monto: number; referencia?: string | null }>
}

export interface ComisionRegla {
  id: number
  nombre: string
  tipo: 'porcentaje' | 'monto_fijo'
  base: 'precio_final' | 'precio_venta' | 'enganche' | 'excedente'
  valor: number | string
  momento: 'al_contrato' | 'al_enganche' | 'al_liquidar' | 'proporcional'
  activo: boolean
}

export const comisionistaService = {
  listar: () => api.get<ComisionistaItem[]>('/comisionistas'),
  crear: (data: { nombre: string; telefono?: string; direccion?: string; dpi?: string }) =>
    api.post<ComisionistaItem>('/comisionistas', data),
  actualizar: (id: number, data: { nombre: string; telefono?: string; direccion?: string; dpi?: string }) =>
    api.put<ComisionistaItem>(`/comisionistas/${id}`, data),
  eliminar: (id: number) => api.delete<ComisionistaItem>(`/comisionistas/${id}`),
  comisiones: (comisionistaId?: number) =>
    api.get<ComisionItem[]>(`/comisiones${comisionistaId ? `?comisionista_id=${comisionistaId}` : ''}`),
  crearComision: (data: Record<string, unknown>) => api.post<ComisionItem>('/comisiones', data),
  reglas: () => api.get<ComisionRegla[]>('/comision-reglas'),
  crearRegla: (data: Record<string, unknown>) => api.post<ComisionRegla>('/comision-reglas', data),
  actualizarRegla: (id: number, data: Record<string, unknown>) => api.put<ComisionRegla>(`/comision-reglas/${id}`, data),
  eliminarRegla: (id: number) => api.delete<ComisionRegla>(`/comision-reglas/${id}`),
  eliminarComision: (id: number) => api.delete<ComisionItem>(`/comisiones/${id}`),
  aplicar: (data: { comisionista_id: number; negociacion_id: number; regla_id?: number | null; monto_comision?: number | null }) =>
    api.post<ComisionItem>('/comisiones/aplicar', data),
  pagar: (id: number, data: { fecha: string; monto: number; referencia?: string }) =>
    api.post<ComisionItem>(`/comisiones/${id}/pagos`, data),
  actualizarPago: (id: number, pagoId: number, data: { fecha: string; monto: number; referencia?: string }) =>
    api.put<ComisionItem>(`/comisiones/${id}/pagos/${pagoId}`, data),
  eliminarPago: (id: number, pagoId: number) => api.delete<ComisionItem>(`/comisiones/${id}/pagos/${pagoId}`),
  estado: (id: number) => api.get<{ comision: ComisionItem; pagos: Array<{ fecha: string; monto: number | string; referencia?: string | null }> }>(`/comisiones/${id}/estado`),
}
