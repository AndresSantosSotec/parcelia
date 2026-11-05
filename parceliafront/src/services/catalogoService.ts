import { api } from '@/lib/api'

export interface FincaPublica {
  id: number
  nombre: string
  departamento: string
  municipio: string
  direccion: string
  descripcion: string
  total_sectores: number
  total_lotes: number
  lotes_disponibles: number
  precio_desde: number
  precio_hasta: number
  area_min_m2: number
  area_max_m2: number
  tiene_plano: boolean
}

export interface LotePublico {
  id: number
  numero_lote: string
  codigo_unico: string
  area_m2: number
  frente_metros: number
  fondo_metros: number
  precio_venta: number
  estado: 'disponible' | 'apartado' | 'vendido'
  colindancias?: {
    norte?: string
    sur?: string
    oriente?: string
    poniente?: string
  }
  token_publico?: string
}

export interface SectorPublico {
  id: number
  nombre: string
  tipo?: string
  lotes: LotePublico[]
}

export interface DetalleFincaPublica {
  finca: {
    id: number
    nombre: string
    departamento: string
    municipio: string
    direccion: string
  }
  plano: {
    tiene_imagen: boolean
    ancho?: number
    alto?: number
    geometrias?: any[]
  }
  sectores: SectorPublico[]
}

export const catalogoService = {
  getFincasPublicas: async (): Promise<FincaPublica[]> => {
    const res = await api.get<{ success: boolean; data: FincaPublica[] }>('/publico/catalogo')
    return res.data?.data || []
  },

  getDetalleFinca: async (id: number): Promise<DetalleFincaPublica> => {
    const res = await api.get<{ success: boolean; data: DetalleFincaPublica }>(`/publico/catalogo/fincas/${id}`)
    return res.data?.data
  },

  enviarProspectoWeb: async (payload: {
    nombre_completo: string
    telefono: string
    email?: string
    finca_id?: number
    lote_id?: number
    mensaje?: string
    origen?: string
  }) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>('/publico/prospectos', payload)
    return res.data
  },
}

