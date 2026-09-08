import { api } from '@/lib/api'

export interface Cliente {
  id: number
  codigo: string
  nombre: string
  apellidos: string
  cui?: string
  nit?: string
  telefono?: string
}

export interface Recibo {
  id: number
  numero_recibo: string
  tipo: 'ingreso' | 'egreso'
  fecha: string
  serie?: string
  cliente_id?: number
  cliente?: Cliente
  credito_id?: number
  caja_id?: number
  monto: number
  desglose_denominaciones?: { [key: string]: number }
  concepto: string
  observaciones?: string
  user_id: number
  usuario?: {
    id: number
    name: string
    email: string
  }
  sucursal_id: number
  sucursal?: {
    id: number
    nombre: string
    codigo: string
  }
  estado: 'emitido' | 'anulado' | 'reimpreso'
  fecha_anulacion?: string
  motivo_anulacion?: string
  anulado_por?: number
  anulador?: {
    id: number
    name: string
  }
  created_at: string
  updated_at: string
}

export interface ReciboCreateRequest {
  tipo: 'ingreso' | 'egreso'
  fecha: string
  cliente_id?: number
  credito_id?: number
  monto: number
  concepto: string
  desglose_denominaciones?: { [key: string]: number }
  observaciones?: string
}

export interface ReciboFilters {
  tipo?: string
  cliente_id?: number
  fecha_inicio?: string
  fecha_fin?: string
  estado?: string
  sucursal_id?: number
}

export interface ReporteTotales {
  total_recibos: number
  total_ingresos: number
  total_egresos: number
  balance: number
}

export const reciboService = {
  // Recibos
  getRecibos: async (filters?: ReciboFilters): Promise<{ data: Recibo[], meta?: any }> => {
    const params = new URLSearchParams()
    if (filters?.tipo) params.append('tipo', filters.tipo)
    if (filters?.cliente_id) params.append('cliente_id', filters.cliente_id.toString())
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin)
    if (filters?.estado) params.append('estado', filters.estado)
    if (filters?.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    
    const response = await api.get<any>(`/recibos?${params}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result?.data ? result : { data: result || [] }
  },

  getRecibo: async (id: number): Promise<Recibo> => {
    const response = await api.get<any>(`/recibos/${id}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    if (!result) throw new Error('Recibo no encontrado')
    return result?.recibo || result
  },

  createRecibo: async (data: ReciboCreateRequest): Promise<Recibo> => {
    const response = await api.post<any>('/recibos', data)
    // La API retorna directamente el objeto JSON
    const result = response as any
    if (!result) throw new Error('Error al crear recibo')
    return result?.recibo || result
  },

  anularRecibo: async (id: number, motivo: string): Promise<Recibo> => {
    const response = await api.post<any>(`/recibos/${id}/anular`, { motivo })
    // La API retorna directamente el objeto JSON
    const result = response as any
    if (!result) throw new Error('Error al anular recibo')
    return result?.recibo || result
  },

  getSiguienteNumero: async (): Promise<{ numero_recibo: string }> => {
    const response = await api.get<any>('/recibos/siguiente-numero')
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { numero_recibo: '' }
  },

  buscarCliente: async (query: string): Promise<{ clientes: Cliente[] }> => {
    const response = await api.get<any>(`/recibos/buscar-cliente?query=${encodeURIComponent(query)}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { clientes: [] }
  },

  generarReporte: async (filters: {
    fecha_inicio: string
    fecha_fin: string
    tipo?: string
    sucursal_id?: number
  }): Promise<{ recibos: Recibo[], totales: ReporteTotales }> => {
    const params = new URLSearchParams()
    params.append('fecha_inicio', filters.fecha_inicio)
    params.append('fecha_fin', filters.fecha_fin)
    if (filters.tipo) params.append('tipo', filters.tipo)
    if (filters.sucursal_id) params.append('sucursal_id', filters.sucursal_id.toString())
    
    const response = await api.get<any>(`/recibos/reporte?${params}`)
    // La API retorna directamente el objeto JSON
    const result = response as any
    return result ?? { recibos: [], totales: { total_recibos: 0, total_ingresos: 0, total_egresos: 0, balance: 0 } }
  },

  getPDFUrl: (id: number) => {
    return `/recibos/${id}/pdf`
  },

  // Utilidades
  formatMonto: (monto: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto)
  },

  getTipoLabel: (tipo: string) => {
    return tipo === 'ingreso' ? 'Ingreso' : 'Egreso'
  },

  getEstadoLabel: (estado: string) => {
    const labels: { [key: string]: string } = {
      'emitido': 'Emitido',
      'anulado': 'Anulado',
      'reimpreso': 'Reimpreso',
    }
    return labels[estado] || estado
  }
}
