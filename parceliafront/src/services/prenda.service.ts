import {
  PrendaEmpenada,
  PrendaFiltros,
  PrendaStats,
  CrearPrendaDTO,
  CrearTasacionDTO,
  AprobarTasacionDTO,
  ApiResponse,
  PaginatedResponse,
  Tasacion
} from '@/types/creditoPrendario.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

class PrendaService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = `${API_BASE_URL}/prendas`
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
  ): Promise<ApiResponse<T>> {
    // Asegurar que el token esté actualizado antes de cada petición
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
        credentials: 'include', // Necesario para Sanctum
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error en la petición')
      }

      return data
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // ==================== CRUD BÁSICO ====================

  async getAll(filters?: PrendaFiltros): Promise<PaginatedResponse<PrendaEmpenada>> {
    const queryParams = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(`${key}[]`, String(v)))
          } else {
            queryParams.append(key, String(value))
          }
        }
      })
    }

    const query = queryParams.toString()
    const response = await this.request<PaginatedResponse<PrendaEmpenada>>(
      query ? `?${query}` : ''
    )
    return response.data!
  }

  async getById(id: string): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}`)
    return response.data!
  }

  async create(data: CrearPrendaDTO): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>('', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async update(id: string, data: Partial<PrendaEmpenada>): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async delete(id: string): Promise<void> {
    await this.request(`/${id}`, {
      method: 'DELETE',
    })
  }

  // ==================== GESTIÓN DE ESTADO ====================

  async marcarRecuperada(id: string, fechaRecuperacion?: string): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}/recuperar`, {
      method: 'POST',
      body: JSON.stringify({ fecha_recuperacion: fechaRecuperacion }),
    })
    return response.data!
  }

  async marcarEnVenta(id: string, valorVenta: number): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}/poner-venta`, {
      method: 'POST',
      body: JSON.stringify({ valor_venta: valorVenta }),
    })
    return response.data!
  }

  async marcarVendida(id: string, data: {
    valor_venta_final: number
    comprador_id?: string
    fecha_venta?: string
  }): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}/vender`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async marcarExtraviada(id: string, observaciones: string): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}/extraviar`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    })
    return response.data!
  }

  // ==================== FOTOS ====================

  async subirFoto(id: string, foto: File): Promise<string> {
    const formData = new FormData()
    formData.append('foto', foto)

    const response = await fetch(`${this.baseUrl}/${id}/fotos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    })

    const data = await response.json()
    return data.data.url
  }

  async eliminarFoto(id: string, fotoUrl: string): Promise<void> {
    await this.request(`/${id}/fotos`, {
      method: 'DELETE',
      body: JSON.stringify({ foto_url: fotoUrl }),
    })
  }

  async establecerFotoPrincipal(id: string, fotoUrl: string): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}/foto-principal`, {
      method: 'POST',
      body: JSON.stringify({ foto_url: fotoUrl }),
    })
    return response.data!
  }

  // ==================== UBICACIÓN ====================

  async actualizarUbicacion(id: string, ubicacion: {
    seccion_almacen?: string
    estante?: string
    caja?: string
    ubicacion_detalle?: string
  }): Promise<PrendaEmpenada> {
    const response = await this.request<PrendaEmpenada>(`/${id}/ubicacion`, {
      method: 'PUT',
      body: JSON.stringify(ubicacion),
    })
    return response.data!
  }

  // ==================== CONSULTAS ESPECÍFICAS ====================

  async getEstadisticas(): Promise<PrendaStats> {
    const response = await this.request<PrendaStats>('/estadisticas')
    return response.data!
  }

  async getEnCustodia(): Promise<PrendaEmpenada[]> {
    const response = await this.request<PrendaEmpenada[]>('/en-custodia')
    return response.data!
  }

  async getEnVenta(params?: {
    page?: number,
    per_page?: number,
    busqueda?: string,
    categoria?: string
  }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params.busqueda) queryParams.append('busqueda', params.busqueda)
      if (params.categoria && params.categoria !== 'todas') queryParams.append('categoria', params.categoria)
    }

    const query = queryParams.toString()
    const response = await this.request<any>(`/en-venta${query ? `?${query}` : ''}`)
    return response
  }

  async getListasParaEntrega(): Promise<PrendaEmpenada[]> {
    const response = await this.request<PrendaEmpenada[]>('/listas-entrega')
    return response.data!
  }

  async getPorCategoria(categoriaId: string): Promise<PrendaEmpenada[]> {
    const response = await this.request<PrendaEmpenada[]>(`/categoria/${categoriaId}`)
    return response.data!
  }

  async buscarPorCodigo(codigo: string): Promise<PrendaEmpenada | null> {
    try {
      const response = await this.request<PrendaEmpenada>(`/buscar/${codigo}`)
      return response.data!
    } catch (error) {
      return null
    }
  }

  async buscarPorCodigoCliente(codigoCliente: string): Promise<PrendaEmpenada[]> {
    const response = await this.request<PrendaEmpenada[]>(`/cliente/${codigoCliente}`)
    return response.data!
  }

  // ==================== TASACIONES ====================

  async getTasaciones(id: string): Promise<Tasacion[]> {
    const response = await this.request<Tasacion[]>(`/${id}/tasaciones`)
    return response.data!
  }

  async crearTasacion(data: CrearTasacionDTO): Promise<Tasacion> {
    const response = await this.request<Tasacion>('/tasaciones', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }
}

export const prendaService = new PrendaService()
