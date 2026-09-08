import {
  Tasacion,
  TasacionFiltros,
  CrearTasacionDTO,
  AprobarTasacionDTO,
  ApiResponse,
  PaginatedResponse
} from '@/types/creditoPrendario.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

class TasacionService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = `${API_BASE_URL}/tasaciones`
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

  async getAll(filters?: TasacionFiltros): Promise<PaginatedResponse<Tasacion>> {
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
    const response = await this.request<PaginatedResponse<Tasacion>>(
      query ? `?${query}` : ''
    )
    return response.data!
  }

  async getById(id: string): Promise<Tasacion> {
    const response = await this.request<Tasacion>(`/${id}`)
    return response.data!
  }

  async create(data: CrearTasacionDTO): Promise<Tasacion> {
    const response = await this.request<Tasacion>('', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async update(id: string, data: Partial<Tasacion>): Promise<Tasacion> {
    const response = await this.request<Tasacion>(`/${id}`, {
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

  // ==================== FLUJO DE TASACIÓN ====================

  async aprobar(id: string, data: AprobarTasacionDTO): Promise<Tasacion> {
    const response = await this.request<Tasacion>(`/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async rechazar(id: string, motivoRechazo: string): Promise<Tasacion> {
    const response = await this.request<Tasacion>(`/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo: motivoRechazo }),
    })
    return response.data!
  }

  async enviarARevision(id: string, observaciones: string): Promise<Tasacion> {
    const response = await this.request<Tasacion>(`/${id}/revision`, {
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

  // ==================== CONSULTAS ESPECÍFICAS ====================

  async getPendientes(): Promise<Tasacion[]> {
    const response = await this.request<Tasacion[]>('/pendientes')
    return response.data!
  }

  async getAprobadas(): Promise<Tasacion[]> {
    const response = await this.request<Tasacion[]>('/aprobadas')
    return response.data!
  }

  async getPorPrenda(prendaId: string): Promise<Tasacion[]> {
    const response = await this.request<Tasacion[]>(`/prenda/${prendaId}`)
    return response.data!
  }

  async getPorTasador(tasadorId: string): Promise<Tasacion[]> {
    const response = await this.request<Tasacion[]>(`/tasador/${tasadorId}`)
    return response.data!
  }

  // ==================== RETASACIÓN ====================

  async retasar(prendaId: string, data: CrearTasacionDTO): Promise<Tasacion> {
    const response = await this.request<Tasacion>('/retasar', {
      method: 'POST',
      body: JSON.stringify({ ...data, prenda_id: prendaId }),
    })
    return response.data!
  }

  // ==================== REPORTES ====================

  async getHistorialPorPrenda(prendaId: string): Promise<Tasacion[]> {
    const response = await this.request<Tasacion[]>(`/historial/prenda/${prendaId}`)
    return response.data!
  }

  async getComparativo(prendaId: string): Promise<{
    tasaciones: Tasacion[]
    valor_promedio: number
    valor_maximo: number
    valor_minimo: number
    diferencia_porcentaje: number
  }> {
    const response = await this.request<any>(`/comparativo/prenda/${prendaId}`)
    return response.data!
  }
}

export const tasacionService = new TasacionService()
