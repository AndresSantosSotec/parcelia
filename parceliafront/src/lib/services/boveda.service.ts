import { api } from '@/lib/api'

export interface Boveda {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  sucursal_id: number
  sucursal?: {
    id: number
    nombre: string
    codigo: string
  }
  saldo_actual: number
  tipo: 'general' | 'principal' | 'auxiliar'
  activa: boolean
  requiere_aprobacion: boolean
  responsable_id?: number
  responsable?: {
    id: number
    name: string
    email: string
  }
  creado_por?: number
  ultima_apertura?: string
  ultimo_cierre?: string
  created_at: string
  updated_at: string
}

export interface BovedaMovimiento {
  id: number
  boveda_id: number
  boveda?: Boveda
  boveda_destino_id?: number
  bovedaDestino?: Boveda
  usuario_id: number
  usuario?: {
    id: number
    name: string
    email: string
  }
  sucursal_id: number
  tipo_movimiento: 'entrada' | 'salida' | 'transferencia_entrada' | 'transferencia_salida' | 'ingreso_cierre_diario'
  tipo_movimiento_label?: string
  monto: number
  concepto: string
  desglose_denominaciones?: { [key: string]: number }
  referencia?: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  aprobado_por?: number
  aprobador?: {
    id: number
    name: string
    email: string
  }
  fecha_aprobacion?: string
  motivo_rechazo?: string
  created_at: string
  updated_at: string
}

export interface BovedaStats {
  total_entradas: number
  total_salidas: number
  movimientos_pendientes: number
  ultima_entrada?: BovedaMovimiento
  ultima_salida?: BovedaMovimiento
}

export interface BovedaCreateRequest {
  nombre: string
  descripcion?: string
  sucursal_id: number
  saldo_inicial: number
  tipo: 'general' | 'principal' | 'auxiliar'
  requiere_aprobacion?: boolean
  responsable_id?: number
  desglose_denominaciones?: { [key: string]: number }
}

export interface BovedaUpdateRequest {
  nombre?: string
  descripcion?: string
  tipo?: 'general' | 'principal' | 'auxiliar'
  activa?: boolean
  requiere_aprobacion?: boolean
  responsable_id?: number
}

export interface MovimientoRequest {
  tipo_movimiento: 'entrada' | 'salida' | 'transferencia_entrada' | 'transferencia_salida'
  monto: number
  concepto: string
  desglose_denominaciones?: { [key: string]: number }
  boveda_destino_id?: number
  referencia?: string
}

export interface BovedaFilters {
  sucursal_id?: number
  activa?: boolean
  tipo?: string
}

export interface MovimientoFilters {
  estado?: string
  tipo_movimiento?: string
  fecha_inicio?: string
  fecha_fin?: string
}

// Tipos de respuesta del API
interface BovedaListResponse {
  bovedas: Boveda[]
  total?: number
}

interface BovedaDetailResponse {
  boveda: Boveda
  estadisticas?: BovedaStats
}

interface HistorialResponse {
  data?: BovedaMovimiento[]
  movimientos?: BovedaMovimiento[]
}

interface MovimientosPendientesResponse {
  movimientos: BovedaMovimiento[]
}

export const bovedaService = {
  // Bóvedas
  getBovedas: async (filters?: BovedaFilters): Promise<BovedaListResponse> => {
    const params = new URLSearchParams()
    if (filters?.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    if (filters?.activa !== undefined) params.append('activa', filters.activa ? '1' : '0')
    if (filters?.tipo) params.append('tipo', filters.tipo)
    
    const response = await api.get<any>(`/bovedas?${params}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { bovedas: [] }
  },

  getBoveda: async (id: number): Promise<BovedaDetailResponse> => {
    const response = await api.get<any>(`/bovedas/${id}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { boveda: {} as Boveda }
  },

  createBoveda: async (data: BovedaCreateRequest) => {
    const response = await api.post('/bovedas', data)
    return response as any
  },

  updateBoveda: async (id: number, data: BovedaUpdateRequest) => {
    const response = await api.put(`/bovedas/${id}`, data)
    return response as any
  },

  deleteBoveda: async (id: number) => {
    const response = await api.delete(`/bovedas/${id}`)
    return response as any
  },

  // Movimientos
  registrarMovimiento: async (bovedaId: number, data: MovimientoRequest) => {
    const response = await api.post(`/bovedas/${bovedaId}/movimientos`, data)
    return response as any
  },

  getHistorialMovimientos: async (bovedaId: number, filters?: MovimientoFilters): Promise<HistorialResponse> => {
    const params = new URLSearchParams()
    if (filters?.estado) params.append('estado', filters.estado)
    if (filters?.tipo_movimiento) params.append('tipo_movimiento', filters.tipo_movimiento)
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    
    const response = await api.get<any>(`/bovedas/${bovedaId}/historial?${params}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { data: [], movimientos: [] }
  },

  // Aprobaciones
  getMovimientosPendientes: async (): Promise<MovimientosPendientesResponse> => {
    const response = await api.get<any>('/bovedas-movimientos/pendientes')
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { movimientos: [] }
  },

  aprobarMovimiento: async (id: number) => {
    const response = await api.post(`/bovedas-movimientos/${id}/aprobar`)
    return response as any
  },

  rechazarMovimiento: async (id: number, motivo: string) => {
    const response = await api.post(`/bovedas-movimientos/${id}/rechazar`, {
      motivo_rechazo: motivo
    })
    return response as any
  },

  actualizarMovimiento: async (id: number, data: { concepto: string; referencia?: string }) => {
    const response = await api.put(`/bovedas-movimientos/${id}`, data)
    return response as any
  },

  // Reportes
  getConsolidacion: async (filters?: {
    sucursal_id?: number
    fecha_inicio?: string
    fecha_fin?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    
    const response = await api.get(`/bovedas/consolidacion?${params}`)
    return response as any
  },

  // Exportaciones
  exportarBovedas: async (filters?: BovedaFilters) => {
    const params = new URLSearchParams()
    if (filters?.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    if (filters?.activa !== undefined) params.append('activa', filters.activa ? '1' : '0')
    if (filters?.tipo) params.append('tipo', filters.tipo)
    
    const token = localStorage.getItem('auth_token')
    const url = `${import.meta.env.VITE_API_URL}/bovedas/exportar?${params}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
    
    if (!response.ok) {
      throw new Error('Error al generar el Excel')
    }
    
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `bovedas_${new Date().getTime()}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
  },

  exportarMovimientos: async (bovedaId: number, filters?: MovimientoFilters) => {
    const params = new URLSearchParams()
    if (filters?.estado) params.append('estado', filters.estado)
    if (filters?.tipo_movimiento) params.append('tipo_movimiento', filters.tipo_movimiento)
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    
    const token = localStorage.getItem('auth_token')
    const url = `${import.meta.env.VITE_API_URL}/bovedas/${bovedaId}/exportar-movimientos?${params}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
    
    if (!response.ok) {
      throw new Error('Error al generar el Excel')
    }
    
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `movimientos_boveda_${bovedaId}_${new Date().getTime()}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
  },

  exportarMovimientosPDF: async (bovedaId: number, filters?: MovimientoFilters) => {
    const params = new URLSearchParams()
    if (filters?.estado) params.append('estado', filters.estado)
    if (filters?.tipo_movimiento) params.append('tipo_movimiento', filters.tipo_movimiento)
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    
    const token = localStorage.getItem('auth_token')
    const url = `${import.meta.env.VITE_API_URL}/bovedas/${bovedaId}/exportar-movimientos-pdf?${params}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    })
    
    if (!response.ok) {
      throw new Error('Error al generar el PDF')
    }
    
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `movimientos_boveda_${bovedaId}_${new Date().getTime()}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
  },

  exportarConsolidacion: async (filters?: {
    sucursal_id?: number
    fecha_inicio?: string
    fecha_fin?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    
    const token = localStorage.getItem('auth_token')
    const url = `${import.meta.env.VITE_API_URL}/bovedas/consolidacion/exportar?${params}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
    
    if (!response.ok) {
      throw new Error('Error al generar el Excel')
    }
    
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `consolidacion_bovedas_${new Date().getTime()}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
  },

  exportarConsolidacionPDF: async (filters?: {
    sucursal_id?: number
    fecha_inicio?: string
    fecha_fin?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    
    const token = localStorage.getItem('auth_token')
    const url = `${import.meta.env.VITE_API_URL}/bovedas/consolidacion/pdf?${params}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    })
    
    if (!response.ok) {
      throw new Error('Error al generar el PDF')
    }
    
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `consolidacion_bovedas_${new Date().getTime()}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
  },

  // Utilidades
  formatMonto: (monto: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto)
  },

  getTipoMovimientoLabel: (tipo: string, customLabel?: string) => {
    if (customLabel) return customLabel
    const labels = {
      'entrada': 'Entrada',
      'salida': 'Salida',
      'transferencia_entrada': 'Transferencia Entrada',
      'transferencia_salida': 'Transferencia Salida',
      'ingreso_cierre_diario': 'Ingreso por Cierre Diario',
    }
    return labels[tipo as keyof typeof labels] || tipo
  },

  getEstadoLabel: (estado: string) => {
    const labels = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado',
    }
    return labels[estado as keyof typeof labels] || estado
  },

  getTipoBovedaLabel: (tipo: string) => {
    const labels = {
      'general': 'General',
      'principal': 'Principal',
      'auxiliar': 'Auxiliar',
    }
    return labels[tipo as keyof typeof labels] || tipo
  }
}
