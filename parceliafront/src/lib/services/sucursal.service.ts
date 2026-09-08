import { api } from '@/lib/api'

export interface Sucursal {
  id: number
  codigo: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  responsable_id?: number
  responsable?: {
    id: number
    name: string
    email: string
  }
  activa: boolean
  es_matriz: boolean
  created_at: string
  updated_at: string
}

export interface SucursalesResponse {
  sucursales: Sucursal[]
  total?: number
}

export const sucursalService = {
  /**
   * Obtener todas las sucursales
   */
  getSucursales: async (): Promise<SucursalesResponse> => {
    const response = await api.get<any>('/sucursales')
    // La API retorna directamente el objeto JSON
    const data = response as any
    if (data?.sucursales) {
      return data
    }
    // Si viene como array directo
    if (Array.isArray(data)) {
      return { sucursales: data as Sucursal[], total: data.length }
    }
    // Si viene con wrapper 'data'
    if (data?.data && Array.isArray(data.data)) {
      return { sucursales: data.data as Sucursal[], total: data.data.length }
    }
    return { sucursales: [], total: 0 }
  },

  /**
   * Obtener solo las sucursales activas
   */
  getActivas: async (): Promise<Sucursal[]> => {
    const response = await api.get<any>('/sucursales/activas')
    // La API retorna directamente el objeto JSON
    const data = response as any
    
    // Manejar diferentes estructuras de respuesta
    if (Array.isArray(data)) {
      return data
    }
    if (data && typeof data === 'object') {
      // Respuesta con success y data
      if ('data' in data && Array.isArray(data.data)) {
        return data.data
      }
      // Respuesta con sucursales
      if ('sucursales' in data && Array.isArray(data.sucursales)) {
        return data.sucursales
      }
    }
    return []
  },

  /**
   * Obtener una sucursal por ID
   */
  getSucursal: async (id: number): Promise<Sucursal | null> => {
    try {
      const response = await api.get<any>(`/sucursales/${id}`)
      const data = response as any
      if (data && typeof data === 'object') {
        if ('sucursal' in data) {
          return data.sucursal
        }
        if ('id' in data) {
          return data as Sucursal
        }
      }
      return null
    } catch {
      return null
    }
  },

  /**
   * Crear una nueva sucursal
   */
  createSucursal: async (data: Partial<Sucursal>): Promise<Sucursal> => {
    const response = await api.post<any>('/sucursales', data)
    return response as any
  },

  /**
   * Actualizar una sucursal
   */
  updateSucursal: async (id: number, data: Partial<Sucursal>): Promise<Sucursal> => {
    const response = await api.put<any>(`/sucursales/${id}`, data)
    return response as any
  },

  /**
   * Eliminar una sucursal
   */
  deleteSucursal: async (id: number): Promise<void> => {
    await api.delete(`/sucursales/${id}`)
  },

  /**
   * Activar/desactivar una sucursal
   */
  toggleActiva: async (id: number): Promise<Sucursal> => {
    const response = await api.post<any>(`/sucursales/${id}/toggle-activa`)
    return response as any
  }
}
