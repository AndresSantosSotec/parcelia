import { getApiBaseUrl } from '@/lib/config'
import type {
  OtroGastoTipo,
  OtroGastoMovimiento,
  CrearMovimientoDTO,
  CrearTipoDTO,
  ResumenMes,
} from '@/types/otrosGastos.types'

class OtrosGastosService {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBaseUrl()
  }

  private get token(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Error de red' }))
      throw new Error(err.message || `Error ${response.status}`)
    }
    return response.json()
  }

  // ── Tipos ─────────────────────────────────────────────────────────────────

  async listarTipos(params?: { tipo?: string; buscar?: string; activos?: boolean; all?: boolean }) {
    const q = new URLSearchParams()
    if (params?.tipo) q.append('tipo', params.tipo)
    if (params?.buscar) q.append('buscar', params.buscar)
    if (params?.activos !== undefined) q.append('activos', String(params.activos))
    if (params?.all) q.append('all', 'true')
    return this.request<{ success: boolean; data: OtroGastoTipo[] }>(
      `/otros-gastos/tipos${q.toString() ? `?${q}` : ''}`
    )
  }

  async crearTipo(data: CrearTipoDTO) {
    return this.request<{ success: boolean; data: OtroGastoTipo; message: string }>(
      '/otros-gastos/tipos',
      { method: 'POST', body: JSON.stringify(data) }
    )
  }

  async actualizarTipo(id: number, data: Partial<CrearTipoDTO>) {
    return this.request<{ success: boolean; data: OtroGastoTipo; message: string }>(
      `/otros-gastos/tipos/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    )
  }

  async eliminarTipo(id: number) {
    return this.request<{ success: boolean; message: string }>(
      `/otros-gastos/tipos/${id}`,
      { method: 'DELETE' }
    )
  }

  // ── Movimientos ───────────────────────────────────────────────────────────

  async listarMovimientos(params?: {
    tipo?: string
    mes?: number
    anio?: number
    per_page?: number
    page?: number
    user_id?: number
    otro_gasto_tipo_id?: number
  }) {
    const q = new URLSearchParams()
    if (params?.tipo) q.append('tipo', params.tipo)
    if (params?.mes !== undefined) q.append('mes', String(params.mes))
    if (params?.anio !== undefined) q.append('anio', String(params.anio))
    if (params?.per_page) q.append('per_page', String(params.per_page))
    if (params?.page) q.append('page', String(params.page))
    if (params?.user_id) q.append('user_id', String(params.user_id))
    if (params?.otro_gasto_tipo_id) q.append('otro_gasto_tipo_id', String(params.otro_gasto_tipo_id))
    return this.request<{
      success: boolean
      data: OtroGastoMovimiento[]
      meta: { current_page: number; last_page: number; total: number; per_page: number }
      totales: { total_ingresos: number; total_egresos: number; total_registros: number }
    }>(`/otros-gastos/movimientos${q.toString() ? `?${q}` : ''}`)
  }

  async registrarMovimiento(data: CrearMovimientoDTO) {
    return this.request<{
      success: boolean
      data: OtroGastoMovimiento
      aplico_en_caja: boolean
      message: string
    }>('/otros-gastos/movimientos', { method: 'POST', body: JSON.stringify(data) })
  }

  async actualizarMovimiento(id: number, data: Partial<CrearMovimientoDTO>) {
    return this.request<{
      success: boolean
      data: OtroGastoMovimiento
      message: string
    }>(/otros-gastos/movimientos/, { method: 'PUT', body: JSON.stringify(data) })
  }

  async anularMovimiento(id: number, motivo: string) {
    return this.request<{ success: boolean; message: string }>(
      `/otros-gastos/movimientos/${id}/anular`,
      { method: 'POST', body: JSON.stringify({ motivo }) }
    )
  }

  async resumenMes(mes: number, anio: number) {
    return this.request<ResumenMes>(`/otros-gastos/resumen-mes?mes=${mes}&anio=${anio}`)
  }
}

export const otrosGastosService = new OtrosGastosService()
