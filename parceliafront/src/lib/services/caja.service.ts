import { api } from '@/lib/api'

export interface Caja {
    id: number
    user_id: number
    sucursal_id: number
    fecha_apertura: string
    hora_apertura?: string
    saldo_inicial: number
    saldo_final: number | null
    estado: 'abierta' | 'cerrada'
    fecha_cierre: string | null
    diferencia: number | null
    resultado_arqueo: string | null
    detalles_arqueo: any
    total_esperado_sistema?: number
    movimientos?: MovimientoCaja[]
    // Integración Caja-Bóveda
    boveda_origen_id?: number | null
    boveda_movimiento_apertura_id?: number | null
    user?: {
        id: number
        name: string
        email: string
    }
    sucursal?: {
        id: number
        nombre: string
    }
}

export interface MovimientoCaja {
    id: number
    caja_id: number
    tipo: 'incremento' | 'decremento' | 'ingreso_pago' | 'egreso_desembolso'
    monto: number
    concepto: string
    detalles_movimiento: any
    estado: string
    created_at: string
    // Integración Caja-Bóveda
    boveda_id?: number | null
    boveda_movimiento_id?: number | null
    estado_boveda?: string | null
    fecha_aprobacion_boveda?: string | null
    aprobado_por_id?: number | null
    observaciones_boveda?: string | null
    user?: {
        name: string
        email: string
    }
}

export interface CheckEstadoResponse {
    estado: string
    caja?: Caja
    mensaje?: string
    requiere_cierre?: boolean
    cash_vault_integration_enabled?: boolean
}

export interface CajasAbiertasResponse {
    success: boolean
    data: Caja[]
    total: number
}

export interface DetalleCajaResponse {
    success: boolean
    caja: Caja
    movimientos: MovimientoCaja[]
    es_propia: boolean
}

export const cajaService = {
    checkEstado: async (): Promise<CheckEstadoResponse> => {
        const response = await api.get<any>('/cajas/check-estado')
        // Puede venir plano ({ estado, caja }) o envuelto en ApiResponse ({ data: { estado, caja } })
        const raw = response as any
        const data = raw?.estado != null ? raw : (raw?.data?.estado != null ? raw.data : (raw?.data ?? raw))

        if (data?.estado === 'abierta' && data?.caja) {
            return {
                estado: 'abierta',
                caja: {
                    ...data.caja,
                    saldo_inicial: Number(data.caja.saldo_inicial),
                    saldo_final: data.caja.saldo_final ? Number(data.caja.saldo_final) : null,
                    diferencia: data.caja.diferencia ? Number(data.caja.diferencia) : null,
                    total_esperado_sistema: data.caja.total_esperado_sistema ? Number(data.caja.total_esperado_sistema) : 0,
                },
                requiere_cierre: data.requiere_cierre || false,
                cash_vault_integration_enabled: data.cash_vault_integration_enabled || false,
                mensaje: data.mensaje
            }
        }

        return {
            estado: 'cerrada',
            cash_vault_integration_enabled: data?.cash_vault_integration_enabled || false,
            mensaje: data?.mensaje || 'No hay caja abierta'
        }
    },

    abrir: async (data: { 
        saldo_inicial: number, 
        fecha_apertura: string,
        boveda_origen_id?: number | null
    }): Promise<{ message: string; caja: Caja; ya_existia?: boolean }> => {
        const response = await api.post<any>('/cajas/abrir', data)
        // La API retorna directamente el objeto
        const result = response as any
        
        // Normalizar la caja si existe
        if (result?.caja) {
            result.caja = {
                ...result.caja,
                saldo_inicial: Number(result.caja.saldo_inicial),
                saldo_final: result.caja.saldo_final ? Number(result.caja.saldo_final) : null,
                total_esperado_sistema: result.caja.total_esperado_sistema ? Number(result.caja.total_esperado_sistema) : Number(result.caja.saldo_inicial),
            }
        }
        
        return result
    },

    cerrar: async (id: number, data: { saldo_final_real: number, detalles_arqueo?: any, boveda_destino_id?: number }) => {
        const response = await api.post<any>(`/cajas/${id}/cerrar`, data)
        return response as any
    },

    getMovimientos: async (cajaId: number) => {
        const response = await api.get<any>(`/cajas/${cajaId}/movimientos`)
        return response as any
    },

    registrarMovimiento: async (data: { 
        caja_id: number, 
        tipo: string, 
        monto: number, 
        concepto: string, 
        detalles?: any,
        boveda_id?: number | null
    }) => {
        const response = await api.post<any>('/cajas/movimientos', data)
        return response as any
    },

    getHistorial: async (filters: any): Promise<any> => {
        const query = new URLSearchParams()
        if (filters?.user_id) query.append('user_id', filters.user_id)
        if (filters?.fecha_inicio) query.append('fecha_inicio', filters.fecha_inicio)
        if (filters?.fecha_fin) query.append('fecha_fin', filters.fecha_fin)
        const queryString = query.toString()
        const response = await api.get<any>(`/cajas${queryString ? `?${queryString}` : ''}`)
        return response as any
    },

    // ===== ADMIN: Ver todas las cajas abiertas =====
    todasAbiertas: async (): Promise<CajasAbiertasResponse> => {
        const response = await api.get<any>('/cajas/todas-abiertas')
        const data = response as any
        if (data?.data) {
            data.data = data.data.map((c: any) => ({
                ...c,
                saldo_inicial: Number(c.saldo_inicial),
                saldo_final: c.saldo_final ? Number(c.saldo_final) : null,
                total_esperado_sistema: c.total_esperado_sistema ? Number(c.total_esperado_sistema) : 0,
            }))
        }
        return data
    },

    // ===== ADMIN: Ver detalle de caja específica =====
    detalleCaja: async (cajaId: number): Promise<DetalleCajaResponse> => {
        const response = await api.get<any>(`/cajas/${cajaId}/detalle`)
        const data = response as any
        if (data?.caja) {
            data.caja = {
                ...data.caja,
                saldo_inicial: Number(data.caja.saldo_inicial),
                saldo_final: data.caja.saldo_final ? Number(data.caja.saldo_final) : null,
                total_esperado_sistema: data.caja.total_esperado_sistema ? Number(data.caja.total_esperado_sistema) : 0,
            }
        }
        return data
    },

    // Reportes
    reporteMovimientos: async (filters: { caja_id?: number, fecha_inicio?: string, fecha_fin?: string }): Promise<any> => {
        const query = new URLSearchParams()
        if (filters?.caja_id) query.append('caja_id', filters.caja_id.toString())
        if (filters?.fecha_inicio) query.append('fecha_inicio', filters.fecha_inicio)
        if (filters?.fecha_fin) query.append('fecha_fin', filters.fecha_fin)
        const queryString = query.toString()
        const response = await api.get<any>(`/reportes/caja/movimientos${queryString ? `?${queryString}` : ''}`)
        return response as any
    },

    descargarPDF: async (filters: { caja_id?: number, fecha_inicio?: string, fecha_fin?: string }): Promise<Blob> => {
        const body: Record<string, any> = {}
        if (filters?.caja_id) body.caja_id = filters.caja_id
        if (filters?.fecha_inicio) body.fecha_inicio = filters.fecha_inicio
        if (filters?.fecha_fin) body.fecha_fin = filters.fecha_fin
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/reportes/caja/pdf`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/pdf',
            },
            body: JSON.stringify(body),
        })
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            throw new Error(errorData?.error || 'Error al descargar el PDF')
        }
        
        return await response.blob()
    },

    descargarConsolidadoPDF: async (filters: {
        fecha_inicio?: string,
        fecha_fin?: string,
        user_ids?: number[],
        caja_ids?: number[],
        incluir_movimientos?: boolean,
    }): Promise<Blob> => {
        const body: Record<string, any> = {}
        if (filters?.fecha_inicio) body.fecha_inicio = filters.fecha_inicio
        if (filters?.fecha_fin) body.fecha_fin = filters.fecha_fin
        if (filters?.user_ids && filters.user_ids.length > 0) body.user_ids = filters.user_ids
        if (filters?.caja_ids && filters.caja_ids.length > 0) body.caja_ids = filters.caja_ids
        if (filters?.incluir_movimientos) body.incluir_movimientos = true
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/reportes/caja/consolidado-pdf`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/pdf',
            },
            body: JSON.stringify(body),
        })
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            throw new Error(errorData?.error || 'Error al descargar el PDF consolidado')
        }
        
        return await response.blob()
    },

    reporteConsolidado: async (filters: {
        fecha_inicio?: string,
        fecha_fin?: string,
        user_ids?: number[],
        caja_ids?: number[],
        incluir_movimientos?: boolean,
    }): Promise<any> => {
        const query = new URLSearchParams()
        if (filters?.fecha_inicio) query.append('fecha_inicio', filters.fecha_inicio)
        if (filters?.fecha_fin) query.append('fecha_fin', filters.fecha_fin)
        if (filters?.incluir_movimientos) query.append('incluir_movimientos', '1')
        if (filters?.user_ids) {
            filters.user_ids.forEach(id => query.append('user_ids[]', id.toString()))
        }
        if (filters?.caja_ids) {
            filters.caja_ids.forEach(id => query.append('caja_ids[]', id.toString()))
        }
        const queryString = query.toString()
        const response = await api.get<any>(`/reportes/caja/consolidado${queryString ? `?${queryString}` : ''}`)
        return response as any
    },

    descargarExcel: async (filters: { caja_id?: number, fecha_inicio?: string, fecha_fin?: string }): Promise<Blob> => {
        const query = new URLSearchParams()
        if (filters?.caja_id) query.append('caja_id', filters.caja_id.toString())
        if (filters?.fecha_inicio) query.append('fecha_inicio', filters.fecha_inicio)
        if (filters?.fecha_fin) query.append('fecha_fin', filters.fecha_fin)
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/reportes/caja/excel?${query.toString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        })
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            throw new Error(errorData?.error || 'Error al descargar el Excel')
        }
        
        return await response.blob()
    }
}
