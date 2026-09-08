import { getApiBaseUrl } from '@/lib/config'
import type {
  Gasto,
  CrearGastoDTO,
  ActualizarGastoDTO,
  GastosListResponse,
  GastosCreditoResponse,
  CalcularGastoResponse,
  SyncGastosCreditoDTO,
  SimularPlanResponse,
} from '@/types/gastos.types'

/**
 * Servicio para gestión de gastos de créditos prendarios
 * 
 * Los gastos son cargos adicionales que:
 * - NO se suman al principal
 * - NO generan interés
 * - SÍ se agregan al plan de pagos como cargos prorrateados
 */
class GastosService {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBaseUrl()
  }

  private get token(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      const error = await response.json().catch(() => ({ message: 'Error de red' }))
      throw new Error(error.message || `Error ${response.status}`)
    }

    return response.json()
  }

  // ========== CATÁLOGO DE GASTOS ==========

  /**
   * Obtener lista de gastos del catálogo
   */
  async listar(params?: {
    tipo?: 'FIJO' | 'VARIABLE'
    buscar?: string
    activos?: boolean
    all?: boolean
    per_page?: number
    page?: number
  }): Promise<GastosListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.tipo) searchParams.append('tipo', params.tipo)
    if (params?.buscar) searchParams.append('buscar', params.buscar)
    if (params?.activos !== undefined) searchParams.append('activos', params.activos.toString())
    if (params?.all) searchParams.append('all', 'true')
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const query = searchParams.toString()
    return this.request<GastosListResponse>(`/gastos${query ? `?${query}` : ''}`)
  }

  /**
   * Obtener todos los gastos activos (sin paginar)
   */
  async listarTodos(): Promise<Gasto[]> {
    const response = await this.listar({ all: true, activos: true })
    return response.data
  }

  /**
   * Obtener un gasto por ID
   */
  async obtener(id: number): Promise<{ success: boolean; data: Gasto }> {
    return this.request(`/gastos/${id}`)
  }

  /**
   * Crear un nuevo gasto
   */
  async crear(datos: CrearGastoDTO): Promise<{ success: boolean; data: Gasto; message: string }> {
    return this.request('/gastos', {
      method: 'POST',
      body: JSON.stringify(datos),
    })
  }

  /**
   * Actualizar un gasto
   */
  async actualizar(id: number, datos: ActualizarGastoDTO): Promise<{ success: boolean; data: Gasto; message: string }> {
    return this.request(`/gastos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    })
  }

  /**
   * Eliminar un gasto
   * - Si tiene créditos asociados: soft delete
   * - Si no tiene créditos: hard delete
   */
  async eliminar(id: number): Promise<{ success: boolean; message: string; soft_delete: boolean }> {
    return this.request(`/gastos/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Restaurar un gasto eliminado
   */
  async restaurar(id: number): Promise<{ success: boolean; data: Gasto; message: string }> {
    return this.request(`/gastos/${id}/restaurar`, {
      method: 'POST',
    })
  }

  /**
   * Calcular valor de un gasto para un monto dado
   */
  async calcular(id: number, montoOtorgado: number): Promise<{ success: boolean; data: CalcularGastoResponse }> {
    return this.request(`/gastos/${id}/calcular`, {
      method: 'POST',
      body: JSON.stringify({ monto_otorgado: montoOtorgado }),
    })
  }

  // ========== GASTOS DE CRÉDITO ==========

  /**
   * Obtener gastos asociados a un crédito
   */
  async obtenerGastosCredito(creditoId: number | string): Promise<{ success: boolean; data: GastosCreditoResponse }> {
    return this.request(`/creditos-prendarios/${creditoId}/gastos`)
  }

  /**
   * Sincronizar gastos de un crédito
   * El array enviado representa el estado final
   */
  async sincronizarGastosCredito(creditoId: number | string, gastoIds: number[]): Promise<{ success: boolean; data: GastosCreditoResponse; message: string }> {
    return this.request(`/creditos-prendarios/${creditoId}/gastos`, {
      method: 'POST',
      body: JSON.stringify({ gas_ids: gastoIds } as SyncGastosCreditoDTO),
    })
  }

  /**
   * Remover un gasto específico de un crédito
   */
  async removerGastoCredito(creditoId: number | string, gastoId: number): Promise<{ success: boolean; data: GastosCreditoResponse; message: string }> {
    return this.request(`/creditos-prendarios/${creditoId}/gastos/${gastoId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Recalcular valores de gastos (útil cuando cambia el monto)
   */
  async recalcularGastosCredito(creditoId: number | string): Promise<{ success: boolean; data: GastosCreditoResponse; message: string }> {
    return this.request(`/creditos-prendarios/${creditoId}/gastos/recalcular`, {
      method: 'POST',
    })
  }

  /**
   * Vista previa de gastos para un monto dado (sin guardar)
   */
  async previewGastos(gastoIds: number[], montoOtorgado: number): Promise<{ success: boolean; data: GastosCreditoResponse }> {
    return this.request('/gastos/preview', {
      method: 'POST',
      body: JSON.stringify({
        gas_ids: gastoIds,
        monto_otorgado: montoOtorgado,
      }),
    })
  }

  // ========== SIMULACIÓN DE PLAN CON GASTOS ==========

  /**
   * Simular plan de pagos con gastos
   */
  async simularPlanConGastos(params: {
    monto: number
    tasa_interes: number
    tipo_interes: string
    numero_cuotas: number
    fecha_desembolso?: string
    fecha_primer_pago?: string
    dias_gracia?: number
    gas_ids?: number[]
  }): Promise<SimularPlanResponse> {
    return this.request('/creditos-prendarios/simular-plan', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }
}

export const gastosService = new GastosService()
export default gastosService
