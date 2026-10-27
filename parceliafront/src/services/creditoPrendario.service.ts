import {
  CreditoPrendario,
  CreditoPrendarioFiltros,
  CreditoPrendarioStats,
  CrearCreditoPrendarioDTO,
  AprobarCreditoDTO,
  RechazarCreditoDTO,
  DesembolsarCreditoDTO,
  RegistrarPagoDTO,
  ApiResponse,
  PaginatedResponse,
  CalculoPagoResponse,
  EjecutarPagoDTO,
  PagoResponse
} from '@/types/creditoPrendario.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

class CreditoPrendarioService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = `${API_BASE_URL}/creditos-prendarios`
    this.loadToken()
  }

  private loadToken(): void {
    if (typeof window !== 'undefined') {
      // Cargar token desde localStorage (misma clave que ApiClient)
      const token = localStorage.getItem('auth_token')

      if (token) {
        // Verificar expiración si existe
        const expiry = localStorage.getItem('auth_token_expiry')
        if (expiry) {
          const expiryTime = parseInt(expiry, 10)
          if (Date.now() >= expiryTime) {
            // Token expirado, limpiar
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

  /**
   * Sincronizar token con el localStorage (útil cuando el token se actualiza desde otro servicio)
   */
  syncToken(): void {
    this.loadToken()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Recargar token antes de cada petición para asegurar que esté actualizado
    // Esto sincroniza con cualquier cambio en localStorage
    this.syncToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    try {
      const url = `${this.baseUrl}${endpoint}`
      //console.log('Haciendo petición a:', url, 'Método:', options.method || 'GET')
      //console.log('Token presente:', !!this.token)
      if (this.token) {
        //console.log('Token (primeros 20 chars):', this.token.substring(0, 20) + '...')
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Importante para Sanctum stateful authentication
      })

      //console.log('Respuesta recibida:', response.status, response.statusText)
      //console.log('Content-Type:', response.headers.get('content-type'))

      // Verificar si la respuesta es JSON antes de parsear
      const contentType = response.headers.get('content-type')
      const isJson = contentType && contentType.includes('application/json')

      if (!isJson) {
        // Si no es JSON, probablemente es HTML (página de error 404)
        const text = await response.text()
        console.error('Respuesta no es JSON. Status:', response.status, 'Texto:', text.substring(0, 200))

        // Si es 401, el problema es de autenticación
        if (response.status === 401) {
          throw new Error('No autenticado. Por favor, inicia sesión nuevamente.')
        }

        // Si es 404, verificar si es problema de ruta o autenticación
        if (response.status === 404) {
          throw new Error(
            `Endpoint no encontrado (404). URL: ${url}. Verifica que la ruta esté correcta y que el servidor esté corriendo.`
          )
        }

        throw new Error(
          `Error ${response.status}: ${text.substring(0, 100)}`
        )
      }

      const data = await response.json()

      if (!response.ok) {
        // Incluir cuerpo en error.response (como Axios) para que la UI lea message/errors con claridad
        if (response.status === 422 && data.errors) {
          const errorObj: any = new Error(data.message || 'Error de validación')
          errorObj.response = { data }
          errorObj.status = response.status
          throw errorObj
        }
        const err: any = new Error(
          data.message || data.error || `Error ${response.status} en la petición`
        )
        err.response = { data }
        err.status = response.status
        throw err
      }

      return data
    } catch (error: any) {
      console.error('API Error:', error)

      // Si es un error de validación, preservar el objeto de respuesta
      if (error.response || (error.message && error.message.includes('validación'))) {
        throw error
      }

      if (error instanceof Error) {
        throw error
      }
      throw new Error('Error desconocido en la petición')
    }
  }

  // ==================== CRUD BÁSICO ====================

  async getAll(filters?: CreditoPrendarioFiltros): Promise<PaginatedResponse<CreditoPrendario>> {
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
    const response = await this.request<any>(
      query ? `?${query}` : ''
    )
    // El backend retorna { success: true, data: [...], pagination: {...} }
    // El método request retorna el objeto completo. Cast a any para acceder a pagination si existe en la raíz.
    const res = response as any
    if (res && res.data) {
      return {
        data: Array.isArray(res.data) ? res.data : [],
        pagination: res.pagination || {
          current_page: 1,
          per_page: 15,
          total: 0,
          last_page: 1,
          from: 0,
          to: 0
        }
      }
    }
    return {
      data: [],
      pagination: {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0
      }
    }
  }

  async getById(id: string): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}`)
    return response.data!
  }

  async create(data: CrearCreditoPrendarioDTO): Promise<CreditoPrendario> {
    try {
      //console.log('Creando crédito con datos:', data)
      const response = await this.request<CreditoPrendario>('', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      //console.log('Respuesta de creación:', response)
      return response.data!
    } catch (error: any) {
      console.error('Error en servicio de creación:', error)
      throw error
    }
  }

  async update(id: string, data: Partial<CreditoPrendario>): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}`, {
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

  // ==================== FLUJO DE CRÉDITO ====================

  async aprobar(id: string, data: AprobarCreditoDTO): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async rechazar(id: string, data: RechazarCreditoDTO): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async desembolsar(id: string, data: DesembolsarCreditoDTO): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}/desembolsar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async registrarPago(id: string, data: RegistrarPagoDTO): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}/pagos`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async renovar(id: string, data: {
    nuevo_plazo_dias: number
    nueva_tasa_interes?: number
    observaciones?: string
  }): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}/renovar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async cancelar(id: string, motivo: string): Promise<CreditoPrendario> {
    const response = await this.request<CreditoPrendario>(`/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    })
    return response.data!
  }

  // ==================== CONSULTAS ESPECÍFICAS ====================

  async getEstadisticas(): Promise<CreditoPrendarioStats> {
    const response = await this.request<CreditoPrendarioStats>('/estadisticas')
    return response.data!
  }

  async getPorVencer(dias: number = 7): Promise<CreditoPrendario[]> {
    const response = await this.request<CreditoPrendario[]>(`/por-vencer?dias=${dias}`)
    return response.data!
  }

  async getVencidos(): Promise<CreditoPrendario[]> {
    const response = await this.request<CreditoPrendario[]>('/vencidos')
    return response.data!
  }

  async getEnMora(): Promise<CreditoPrendario[]> {
    const response = await this.request<CreditoPrendario[]>('/en-mora')
    return response.data!
  }

  async getPorCliente(clienteId: string): Promise<CreditoPrendario[]> {
    const response = await this.request<CreditoPrendario[]>(`/cliente/${clienteId}`)
    return response.data!
  }

  async getPorSucursal(sucursalId: string): Promise<CreditoPrendario[]> {
    const response = await this.request<CreditoPrendario[]>(`/sucursal/${sucursalId}`)
    return response.data!
  }

  async getReporteCreditosVigentes(params: { fecha_corte: string; sucursal_id?: string }) {
    this.syncToken()

    const query = new URLSearchParams()
    query.set('fecha_corte', params.fecha_corte)
    if (params.sucursal_id) query.set('sucursal_id', params.sucursal_id)

    const response = await fetch(`${API_BASE_URL}/reportes/creditos/vigentes/vista-previa?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Error ${response.status} al cargar reporte de créditos vigentes`)
    }

    return response.json()
  }

  async descargarReporteCreditosVigentesPDF(params: { fecha_corte: string; sucursal_id?: string }): Promise<void> {
    await this.descargarReporteCreditosVigentesArchivo('/reportes/creditos/vigentes/pdf', params, '.pdf')
  }

  async descargarReporteCreditosVigentesExcel(params: { fecha_corte: string; sucursal_id?: string }): Promise<void> {
    await this.descargarReporteCreditosVigentesArchivo('/reportes/creditos/vigentes/excel', params, '.csv')
  }

  private async descargarReporteCreditosVigentesArchivo(
    endpoint: string,
    params: { fecha_corte: string; sucursal_id?: string },
    defaultExt: string
  ): Promise<void> {
    this.syncToken()

    const query = new URLSearchParams()
    query.set('fecha_corte', params.fecha_corte)
    if (params.sucursal_id) query.set('sucursal_id', params.sucursal_id)

    const response = await fetch(`${API_BASE_URL}${endpoint}?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf, text/csv, application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Error ${response.status} al descargar reporte de créditos vigentes`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const cd = response.headers.get('Content-Disposition')
    const match = cd?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    a.download = match ? match[1].replace(/["']/g, '') : `reporte_creditos_vigentes_${params.fecha_corte}${defaultExt}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  async buscarPorCodigo(codigo: string): Promise<CreditoPrendario | null> {
    try {
      const response = await this.request<CreditoPrendario>(`/buscar/${codigo}`)
      return response.data!
    } catch (error) {
      return null
    }
  }

  async buscarPorCodigoCliente(codigoCliente: string): Promise<CreditoPrendario[]> {
    const response = await this.request<CreditoPrendario[]>(`/cliente-codigo/${codigoCliente}`)
    return response.data!
  }

  // ==================== PLAN DE PAGOS ====================

  async getPlanPagos(id: string) {
    const response = await this.request(`/${id}/plan-pagos`)
    return response.data
  }

  async getMovimientos(id: string) {
    const response = await this.request(`/${id}/movimientos`)
    return response
  }

  async anularMovimiento(id: string, movimientoId: string, data: { motivo: string, idempotency_key: string }): Promise<any> {
    const response = await this.request<any>(`/${id}/movimientos/${movimientoId}/anular`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  // ==================== DOCUMENTOS ====================

  async generarContrato(id: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${id}/contrato`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
    return response.blob()
  }

  async generarPagare(id: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${id}/pagare`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
    return response.blob()
  }

  async generarReciboPago(id: string, movimientoId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/${id}/movimientos/${movimientoId}/recibo`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    )
    return response.blob()
  }

  /**
   * Descargar recibo de pago de un movimiento específico de un crédito prendario.
   */
  async descargarReciboPago(creditoId: string, movimientoId: string, numeroMovimiento?: string): Promise<void> {
    this.syncToken()

    const response = await fetch(
      `${this.baseUrl}/${creditoId}/movimientos/${movimientoId}/recibo`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/pdf',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json()
        throw new Error(error.message || 'Error al generar el recibo de pago')
      }
      throw new Error(`Error ${response.status} al generar el recibo`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Recibo_Pago_${numeroMovimiento ?? movimientoId}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  /**
   * Descargar historial de pagos en PDF
   */
  async descargarHistorialPagos(id: string): Promise<void> {
    this.syncToken()

    const response = await fetch(`${this.baseUrl}/${id}/historial-pagos/pdf`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/pdf',
      },
    })

    if (!response.ok) {
      throw new Error('Error al descargar el historial de pagos')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Historial_Pagos_${id}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // ==================== SIMULACIÓN ====================

  async simularPlanPagos(data: {
    monto: number
    tasa_interes: number
    tipo_interes: string
    numero_cuotas: number
    plazo_dias?: number
    fecha_desembolso?: string
    fecha_primer_pago?: string
  }): Promise<any[]> {
    const response = await this.request<any[]>('/simular-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async calcularIntereses(id: string, fechaHasta?: string) {
    const url = fechaHasta
      ? `/${id}/calcular-intereses?fecha_hasta=${fechaHasta}`
      : `/${id}/calcular-intereses`
    const response = await this.request(url)
    return response.data
  }

  // ==================== DESCARGAS PDF ====================

  async descargarPlanPagos(id: string): Promise<void> {
    const token = this.token
    const response = await fetch(`${this.baseUrl}/${id}/plan-pagos/pdf`, {
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
        throw new Error(error.message || 'Error al descargar plan de pagos')
      }
      throw new Error('Error al descargar plan de pagos')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Plan_Pagos_${id}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  async descargarContrato(id: string): Promise<void> {
    const token = this.token
    const response = await fetch(`${this.baseUrl}/${id}/contrato/pdf`, {
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
        throw new Error(error.message || 'Error al descargar contrato')
      }
      throw new Error('Error al descargar contrato')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Contrato_Credito_${id}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  async descargarRecibo(id: string): Promise<void> {
    const token = this.token
    const response = await fetch(`${this.baseUrl}/${id}/recibo/pdf`, {
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
        throw new Error(error.message || 'Error al descargar recibo')
      }
      throw new Error('Error al descargar recibo')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Recibo_Credito_${id}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  async descargarTicket(id: string): Promise<void> {
    const url = `${this.baseUrl}/${id}/recibo/ticket`
    const puente = (window as Window & { ReactNativeWebView?: { postMessage: (mensaje: string) => void } }).ReactNativeWebView
    if (puente) {
      puente.postMessage(JSON.stringify({ tipo: 'descarga', url, nombre: `ticket-credito-${id}.pdf`, token: this.token || '' }))
      return
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/pdf' },
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Error al descargar el ticket')
    const blob = await response.blob()
    const enlace = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = enlace
    a.download = `ticket-credito-${id}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(enlace)
    document.body.removeChild(a)
  }

  async descargarTicketPago(creditoId: string, movimientoId: string, numeroMovimiento?: string): Promise<void> {
    const url = `${this.baseUrl}/${creditoId}/movimientos/${movimientoId}/ticket`
    const nombre = `ticket-pago-${numeroMovimiento ?? movimientoId}.pdf`
    const puente = (window as Window & { ReactNativeWebView?: { postMessage: (mensaje: string) => void } }).ReactNativeWebView
    if (puente) {
      puente.postMessage(JSON.stringify({ tipo: 'descarga', url, nombre, token: this.token || '' }))
      return
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/pdf' },
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Error al descargar el ticket')
    const blob = await response.blob()
    const enlace = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = enlace
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(enlace)
    document.body.removeChild(a)
  }

  async calcularPago(id: string): Promise<CalculoPagoResponse> {
    // Recargar token antes de hacer la petición
    this.loadToken()

    const response = await this.request<CalculoPagoResponse>(`/${id}/calculo-pago`)
    return response.data
  }

  async ejecutarPago(id: string, data: EjecutarPagoDTO): Promise<PagoResponse> {
    // Recargar token antes de hacer la petición
    this.loadToken()

    // Asegurar que todos los campos requeridos estén presentes
    const payload: any = {
      tipo: data.tipo || 'PARCIAL',
      monto: parseFloat(data.monto.toString()) || 0,
      metodo_pago: data.metodo_pago || 'efectivo',
      referencia: data.referencia || data.observaciones || '',
      observaciones: data.observaciones || '',
      idempotency_key: data.idempotency_key || crypto.randomUUID(),
    }

    // Agregar parámetros adicionales según el tipo de pago
    // if (data.tipo === 'INTERES_ADELANTADO' && data.periodos) {
    //   payload.periodos = parseInt(data.periodos.toString())
    // }

    // if (data.tipo === 'RENOVACION' && data.periodos_adelanto) {
    //   payload.periodos_adelanto = parseInt(data.periodos_adelanto.toString())
    // }

    if (data.tipo === 'RENOVACION' && data.periodos) {
      payload.periodos = parseInt(data.periodos.toString())
    }

    if (data.tipo === 'ADELANTO' && data.cuotas) {
      payload.cuotas = parseInt(data.cuotas.toString())
    }

    // Validar UUID para idempotency_key
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(payload.idempotency_key)) {
      payload.idempotency_key = crypto.randomUUID()
    }

    // La ruta es /{id}/pagos porque baseUrl ya incluye /creditos-prendarios
    const response = await this.request<PagoResponse>(`/${id}/pagos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return response.data
  }

  async reactivarCredito(id: string, observaciones: string = ''): Promise<any> {
    // Recargar token antes de hacer la petición
    this.loadToken()

    const response = await this.request<any>(`/${id}/reactivar`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    })
    return response.data
  }

  async generarReciboPreliminar(datos: {
    cliente: any
    prenda: any
    credito: any
    tasacion?: any
    sucursal?: any
  }): Promise<void> {
    const token = this.token
    const response = await fetch(`${this.baseUrl}/preliminar/recibo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json',
      },
      credentials: 'include',
      body: JSON.stringify(datos),
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json()
        throw new Error(error.message || 'Error al generar recibo preliminar')
      }
      throw new Error('Error al generar recibo preliminar')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Recibo_Preliminar_${datos.credito.numero_credito || 'temp'}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  async generarContratoPreliminar(datos: {
    cliente: any
    prenda: any
    credito: any
    sucursal?: any
  }): Promise<void> {
    const token = this.token
    const response = await fetch(`${this.baseUrl}/preliminar/contrato`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json',
      },
      credentials: 'include',
      body: JSON.stringify(datos),
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json()
        throw new Error(error.message || 'Error al generar contrato preliminar')
      }
      throw new Error('Error al generar contrato preliminar')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Contrato_Preliminar_${datos.credito.numero_credito || 'temp'}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  async generarPlanPagosPreliminar(datos: {
    cliente: any
    credito: any
    sucursal?: any
  }): Promise<void> {
    const token = this.token
    const response = await fetch(`${this.baseUrl}/preliminar/plan-pagos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json',
      },
      credentials: 'include',
      body: JSON.stringify(datos),
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json()
        throw new Error(error.message || 'Error al generar plan de pagos preliminar')
      }
      throw new Error('Error al generar plan de pagos preliminar')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Plan_Pagos_Preliminar_${datos.credito.numero_credito || 'temp'}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
}

export const creditoPrendarioService = new CreditoPrendarioService()
