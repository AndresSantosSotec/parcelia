import { api } from '@/lib/api'

export type EstadoProspecto = 'nuevo' | 'contactado' | 'visita_agendada' | 'negociacion' | 'ganado' | 'perdido'

export type OrigenProspecto = 'redes_sociales' | 'whatsapp' | 'recomendado' | 'rotulo_campo' | 'visita_oficina' | 'otro'

export interface Prospecto {
  id: number
  sucursal_id: number | null
  nombre_completo: string
  nombres?: string | null
  apellidos?: string | null
  telefono: string
  telefono_secundario?: string | null
  email: string | null
  dpi: string | null
  nit?: string | null
  direccion?: string | null
  municipio?: string | null
  departamento?: string | null
  fecha_nacimiento?: string | null
  genero?: 'masculino' | 'femenino' | 'otro' | null
  estado_civil?: string | null
  profesion?: string | null
  finca_id: number | null
  lote_id: number | null
  cliente_id?: number | null
  asesor_id: number | null
  estado: EstadoProspecto
  origen: OrigenProspecto | string
  presupuesto_estimado: number | null
  notas: string | null
  ultimo_contacto_at: string | null
  fecha_proximo_contacto: string | null
  motivo_perdido: string | null
  activo: boolean
  created_by: number | null
  created_at: string
  updated_at: string
  requiere_seguimiento: boolean
  horas_sin_contacto: number
  finca?: {
    id: number
    nombre: string
    codigo: string
  }
  lote?: {
    id: number
    numero_lote: string
    codigo_unico: string
    precio_venta: number
    estado: string
  }
  asesor?: {
    id: number
    name: string
    email: string
  }
  creador?: {
    id: number
    name: string
  }
}

export interface ProspectoEstadisticas {
  conteos_por_estado: Record<EstadoProspecto, number>
  total_sin_seguimiento: number
  total_prospectos_activos: number
  monto_pipeline_estimado: number
}

export interface ProspectosResponse {
  success: boolean
  data: Prospecto[]
  estadisticas: ProspectoEstadisticas
}

export interface FiltrosProspectos {
  sucursal_id?: number
  finca_id?: number
  asesor_id?: number
  estado?: EstadoProspecto
  origen?: string
  solo_sin_seguimiento?: boolean
  busqueda?: string
}

export const prospectoService = {
  async getProspectos(filtros: FiltrosProspectos = {}): Promise<ProspectosResponse> {
    const params = new URLSearchParams()
    if (filtros.sucursal_id) params.append('sucursal_id', filtros.sucursal_id.toString())
    if (filtros.finca_id) params.append('finca_id', filtros.finca_id.toString())
    if (filtros.asesor_id) params.append('asesor_id', filtros.asesor_id.toString())
    if (filtros.estado) params.append('estado', filtros.estado)
    if (filtros.origen) params.append('origen', filtros.origen)
    if (filtros.solo_sin_seguimiento) params.append('solo_sin_seguimiento', '1')
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda)

    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get<ProspectosResponse>(`/prospectos${query}`)
    return res.data
  },

  async getProspecto(id: number): Promise<{ success: boolean; data: Prospecto }> {
    const res = await api.get<{ success: boolean; data: Prospecto }>(`/prospectos/${id}`)
    return res.data
  },

  async createProspecto(data: Partial<Prospecto>): Promise<{ success: boolean; message: string; data: Prospecto }> {
    const res = await api.post<{ success: boolean; message: string; data: Prospecto }>('/prospectos', data)
    return res.data
  },

  async updateProspecto(id: number, data: Partial<Prospecto>): Promise<{ success: boolean; message: string; data: Prospecto }> {
    const res = await api.put<{ success: boolean; message: string; data: Prospecto }>(`/prospectos/${id}`, data)
    return res.data
  },

  async cambiarEstado(
    id: number,
    estado: EstadoProspecto,
    motivo_perdido?: string,
    notas?: string
  ): Promise<{ success: boolean; message: string; data: Prospecto }> {
    const res = await api.patch<{ success: boolean; message: string; data: Prospecto }>(`/prospectos/${id}/estado`, {
      estado,
      motivo_perdido,
      notas,
    })
    return res.data
  },

  async registrarContacto(
    id: number,
    data: {
      tipo_interaccion: 'llamada' | 'whatsapp' | 'visita' | 'reunion_oficina' | 'correo' | 'otro'
      detalle: string
      fecha_proximo_contacto?: string
      nuevo_estado?: EstadoProspecto
    }
  ): Promise<{ success: boolean; message: string; data: Prospecto }> {
    const res = await api.post<{ success: boolean; message: string; data: Prospecto }>(
      `/prospectos/${id}/registrar-contacto`,
      data
    )
    return res.data
  },

  async deleteProspecto(id: number): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/prospectos/${id}`)
    return res.data
  },

  async descargarPlantillaCsv(): Promise<void> {
    await api.downloadFile('/prospectos/plantilla-csv', 'plantilla_prospectos.csv')
  },

  async descargarPlantillaExcel(): Promise<void> {
    await api.downloadFile('/prospectos/plantilla-excel', 'plantilla_prospectos_parcelia.xlsx')
  },

  async exportarExcel(filtros?: {
    finca_id?: string | number
    asesor_id?: string | number
    estado?: string
    buscar?: string
  }): Promise<void> {
    const params = new URLSearchParams()
    if (filtros?.finca_id) params.append('finca_id', String(filtros.finca_id))
    if (filtros?.asesor_id) params.append('asesor_id', String(filtros.asesor_id))
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.buscar) params.append('buscar', filtros.buscar)

    const query = params.toString() ? `?${params.toString()}` : ''
    const fecha = new Date().toISOString().slice(0, 10)
    await api.downloadFile(`/prospectos/exportar-excel${query}`, `prospectos_crm_parcelia_${fecha}.xlsx`)
  },

  async cargarArchivoExcel(formData: FormData): Promise<{
    success: boolean
    message: string
    total_importados: number
    total_errores: number
    errores: string[]
  }> {
    const res = await api.post<any>('/prospectos/cargar-excel', formData)
    return res.data
  },

  async cargaMasiva(payload: {
    prospectos: Array<{
      nombre_completo: string
      telefono: string
      telefono_secundario?: string
      email?: string
      dpi?: string
      presupuesto_estimado?: number
      notas?: string
      finca_id?: number
    }>
    asesor_id?: number
    asesores_ids?: number[]
    distribuir_equitativo?: boolean
    finca_id?: number
    origen?: string
  }): Promise<{
    success: boolean
    message: string
    total_importados: number
    total_errores: number
    errores: string[]
  }> {
    const res = await api.post<any>('/prospectos/carga-masiva', payload)
    return res.data
  },

  async asignacionMasiva(prospectos_ids: number[], asesor_id: number): Promise<{
    success: boolean
    message: string
    total_asignados: number
  }> {
    const res = await api.post<any>('/prospectos/asignacion-masiva', {
      prospectos_ids,
      asesor_id,
    })
    return res.data
  },

  async enviarFormularioRedes(payload: {
    nombre_completo: string
    telefono: string
    email?: string
    finca_id?: number
    departamento_interes?: string
    presupuesto_estimado?: number
    red_social?: string
    medio_contacto_preferido?: string
    mensaje?: string
    empresa_seguridad_bot?: string // Honeypot
  }): Promise<{ success: boolean; message: string; data?: any }> {
    const res = await api.post<any>('/publico/formulario-redes', payload)
    return res.data
  },
}

