import { api } from '@/lib/api'

export interface Moneda {
    id: number
    codigo: string
    nombre: string
    simbolo: string
    tipo_cambio: number
    es_moneda_base: boolean
    activa: boolean
}

export interface Denominacion {
    id: number
    moneda_id: number
    valor: number
    tipo: 'billete' | 'moneda'
    descripcion: string | null
    orden: number
    activa: boolean
}

export interface DenominacionesResponse {
    moneda: {
        id: number
        codigo: string
        nombre: string
        simbolo: string
    }
    billetes: Denominacion[]
    monedas: Denominacion[]
    todas: Denominacion[]
}

export const denominacionService = {
    /**
     * Obtener la moneda base del sistema con sus denominaciones
     */
    getMonedaBase: async (): Promise<DenominacionesResponse> => {
        const response = await api.get<any>('/denominaciones/moneda-base')
        // La API retorna directamente el objeto JSON
        const responseData = response as any
        
        // Si viene con wrapper 'data'
        if (responseData?.data) {
            return responseData.data as DenominacionesResponse
        }
        
        // Si viene directamente
        if (responseData?.moneda && responseData?.billetes && responseData?.monedas) {
            return responseData as DenominacionesResponse
        }
        
        throw new Error('Formato de respuesta de denominaciones no reconocido')
    },

    /**
     * Obtener todas las monedas activas
     */
    getMonedas: async (): Promise<Moneda[]> => {
        const response = await api.get<any>('/denominaciones')
        const responseData = response as any
        return responseData?.data || responseData || []
    },

    /**
     * Obtener denominaciones de una moneda específica
     */
    getDenominacionesByMoneda: async (monedaId: number): Promise<DenominacionesResponse> => {
        const response = await api.get<any>(`/denominaciones/moneda/${monedaId}`)
        const responseData = response as any
        return responseData?.data || responseData
    }
}
