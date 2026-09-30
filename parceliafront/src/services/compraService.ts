import { api } from '@/lib/api'

export interface Compra {
    id: number
    codigo_compra: string
    codigo_prenda_generado: string
    cliente_id: number
    cliente_nombre: string
    cliente_documento: string | null
    cliente_telefono: string | null
    cliente_codigo: string | null
    categoria_producto_id: number
    categoria_nombre: string
    descripcion: string
    marca: string | null
    modelo: string | null
    serie: string | null
    color: string | null
    condicion: 'excelente' | 'muy_buena' | 'buena' | 'regular' | 'mala'
    valor_tasacion: number
    monto_pagado: number
    precio_venta_sugerido: number
    margen_esperado: number
    metodo_pago: 'efectivo' | 'transferencia' | 'cheque' | 'mixto'
    genera_egreso_caja: boolean
    estado: 'activa' | 'cancelada' | 'vendida'
    observaciones: string | null
    fecha_compra: string
    fecha_compra_formateada: string
    prenda_id: number | null
    sucursal?: {
        id: number
        nombre: string
    }
    usuario?: {
        id: number
        nombre: string
    }
    cliente?: {
        id: number
        nombre_completo: string
        codigo: string
    }
    prenda?: {
        id: number
        codigo_prenda: string
        estado: string
    }
    campos_dinamicos?: Array<{
        campo_nombre: string
        campo_tipo: string
        valor: any
        valor_formateado: string
    }>
    datos_adicionales?: Record<string, any> | null
    created_at: string
    updated_at: string
}

export interface CompraFormData {
    cliente_id: number
    categoria_producto_id: number
    descripcion: string
    marca?: string
    modelo?: string
    serie?: string
    color?: string
    condicion?: string
    valor_tasacion?: number
    monto_pagado: number
    precio_venta: number
    metodo_pago?: string
    observaciones?: string
    campos_dinamicos?: Record<string, any>
}

export interface EstadisticasCompras {
    total_compras: number
    total_invertido: number
    valor_inventario_actual: number
    compras_activas: number
    compras_vendidas: number
    compras_canceladas: number
    margen_promedio: number
}

class CompraService {
    /**
     * Listar compras con filtros
     */
    async listarCompras(params?: {
        sucursal_id?: number
        estado?: string
        cliente_id?: number
        fecha_desde?: string
        fecha_hasta?: string
        search?: string
        page?: number
        per_page?: number
    }) {
        try {
            const searchParams = new URLSearchParams()
            if (params?.sucursal_id) searchParams.append('sucursal_id', params.sucursal_id.toString())
            if (params?.estado) searchParams.append('estado', params.estado)
            if (params?.cliente_id) searchParams.append('cliente_id', params.cliente_id.toString())
            if (params?.fecha_desde) searchParams.append('fecha_desde', params.fecha_desde)
            if (params?.fecha_hasta) searchParams.append('fecha_hasta', params.fecha_hasta)
            if (params?.search) searchParams.append('search', params.search)
            if (params?.page) searchParams.append('page', params.page.toString())
            if (params?.per_page) searchParams.append('per_page', params.per_page.toString())

            const query = searchParams.toString()
            const response = await api.get<Compra[]>('/compras' + (query ? '?' + query : ''))

            return {
                success: true,
                data: response.data || [],
                meta: response.pagination,
                pagination: response.pagination
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Error al obtener compras',
                data: []
            }
        }
    }

    /**
     * Obtener detalle de una compra
     */
    async obtenerDetalle(compraId: number) {
        try {
            const response = await api.get<Compra>(`/compras/${compraId}`)
            return {
                success: true,
                data: response.data || null
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Error al obtener detalle',
                data: null
            }
        }
    }

    /**
     * Registrar nueva compra directa
     */
    async registrarCompra(data: CompraFormData) {
        try {
            console.log('🚀 compraService.registrarCompra - Datos a enviar:', data)
            const response = await api.post<Compra>('/compras', data)
            return {
                success: true,
                message: response.message || 'Compra registrada exitosamente',
                data: response.data
            }
        } catch (error: any) {
            console.error('❌ compraService.registrarCompra - Error:', error)
            console.error('📋 Detalles:', error.response?.data)
            throw error
        }
    }

    /**
     * Cancelar una compra
     */
    async cancelarCompra(compraId: number, motivo?: string) {
        try {
            const response = await api.post<Compra>(`/compras/${compraId}/cancelar`, { motivo })
            return {
                success: true,
                message: response.message || 'Compra cancelada exitosamente',
                data: response.data
            }
        } catch (error: any) {
            console.error('Error al cancelar compra:', error)
            return {
                success: false,
                message: error.response?.data?.message || 'Error al cancelar compra'
            }
        }
    }

    /**
     * Actualizar una compra
     */
    async actualizarCompra(compraId: number, data: Partial<CompraFormData>) {
        try {
            const response = await api.put<Compra>(`/compras/${compraId}`, data)
            return {
                success: true,
                message: response.message || 'Compra actualizada exitosamente',
                data: response.data
            }
        } catch (error: any) {
            console.error('Error al actualizar compra:', error)
            return {
                success: false,
                message: error.response?.data?.message || 'Error al actualizar compra'
            }
        }
    }

    /**
     * Eliminar una compra
     */
    async eliminarCompra(compraId: number) {
        try {
            const response = await api.delete<{ message: string }>(`/compras/${compraId}`)
            return {
                success: true,
                message: response.message || 'Compra eliminada exitosamente'
            }
        } catch (error: any) {
            console.error('Error al eliminar compra:', error)
            return {
                success: false,
                message: error.response?.data?.message || 'Error al eliminar compra'
            }
        }
    }

    /**
     * Descargar recibo PDF
     */
    async descargarReciboPDF(compraId: number) {
        try {
            await api.downloadFile(
                `/compras/${compraId}/recibo-pdf`,
                `recibo-compra-${compraId}.pdf`
            )
        } catch (error: any) {
            throw new Error(error.message || 'Error al descargar recibo PDF')
        }
    }

    /**
     * Descargar contrato PDF
     */
    async descargarContratoPDF(compraId: number) {
        try {
            await api.downloadFile(
                `/compras/${compraId}/contrato-pdf`,
                `contrato-compra-${compraId}.pdf`
            )
        } catch (error: any) {
            throw new Error(error.message || 'Error al descargar contrato PDF')
        }
    }

    /**
     * Descargar reporte PDF con filtros
     */
    async descargarReportePDF(params?: {
        sucursal_id?: number
        estado?: string
        categoria_id?: number | number[]
        fecha_desde?: string
        fecha_hasta?: string
        search?: string
    }) {
        try {
            const searchParams = new URLSearchParams()
            
            if (params?.sucursal_id) searchParams.append('sucursal_id', params.sucursal_id.toString())
            if (params?.estado) searchParams.append('estado', params.estado)
            
            // Categorías múltiples
            if (params?.categoria_id) {
                if (Array.isArray(params.categoria_id)) {
                    params.categoria_id.forEach(id => searchParams.append('categoria_id[]', id.toString()))
                } else {
                    searchParams.append('categoria_id', params.categoria_id.toString())
                }
            }
            
            if (params?.fecha_desde) searchParams.append('fecha_desde', params.fecha_desde)
            if (params?.fecha_hasta) searchParams.append('fecha_hasta', params.fecha_hasta)
            if (params?.search) searchParams.append('search', params.search)

            const query = searchParams.toString()
            const endpoint = `/reportes/compras/pdf${query ? '?' + query : ''}`
            
            await api.downloadFile(endpoint, `reporte-compras-${Date.now()}.pdf`)
        } catch (error: any) {
            throw new Error(error.message || 'Error al descargar reporte PDF')
        }
    }

    /**
     * Descargar reporte Excel con filtros
     */
    async descargarReporteExcel(params?: {
        sucursal_id?: number
        estado?: string
        categoria_id?: number | number[]
        fecha_desde?: string
        fecha_hasta?: string
        search?: string
    }) {
        try {
            const searchParams = new URLSearchParams()
            
            if (params?.sucursal_id) searchParams.append('sucursal_id', params.sucursal_id.toString())
            if (params?.estado) searchParams.append('estado', params.estado)
            
            // Categorías múltiples
            if (params?.categoria_id) {
                if (Array.isArray(params.categoria_id)) {
                    params.categoria_id.forEach(id => searchParams.append('categoria_id[]', id.toString()))
                } else {
                    searchParams.append('categoria_id', params.categoria_id.toString())
                }
            }
            
            if (params?.fecha_desde) searchParams.append('fecha_desde', params.fecha_desde)
            if (params?.fecha_hasta) searchParams.append('fecha_hasta', params.fecha_hasta)
            if (params?.search) searchParams.append('search', params.search)

            const query = searchParams.toString()
            const endpoint = `/reportes/compras/excel${query ? '?' + query : ''}`
            
            await api.downloadFile(endpoint, `reporte-compras-${Date.now()}.xlsx`)
        } catch (error: any) {
            throw new Error(error.message || 'Error al descargar reporte Excel')
        }
    }

    /**
     * Obtener vista previa del reporte
     */
    async obtenerVistaPrevia(params?: {
        sucursal_id?: number
        estado?: string
        categoria_id?: number | number[]
        fecha_desde?: string
        fecha_hasta?: string
        search?: string
    }) {
        try {
            const searchParams = new URLSearchParams()
            
            if (params?.sucursal_id) searchParams.append('sucursal_id', params.sucursal_id.toString())
            if (params?.estado) searchParams.append('estado', params.estado)
            
            // Categorías múltiples
            if (params?.categoria_id) {
                if (Array.isArray(params.categoria_id)) {
                    params.categoria_id.forEach(id => searchParams.append('categoria_id[]', id.toString()))
                } else {
                    searchParams.append('categoria_id', params.categoria_id.toString())
                }
            }
            
            if (params?.fecha_desde) searchParams.append('fecha_desde', params.fecha_desde)
            if (params?.fecha_hasta) searchParams.append('fecha_hasta', params.fecha_hasta)
            if (params?.search) searchParams.append('search', params.search)

            const query = searchParams.toString()
            const response = await api.get(`/reportes/compras/vista-previa${query ? '?' + query : ''}`)
            
            return {
                success: true,
                data: response.data
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Error al obtener vista previa',
                data: null
            }
        }
    }

    /**
     * Obtener estadísticas
     */
    async obtenerEstadisticas(params?: {
        sucursal_id?: number
        fecha_desde?: string
        fecha_hasta?: string
    }) {
        try {
            const searchParams = new URLSearchParams()
            if (params?.sucursal_id) searchParams.append('sucursal_id', params.sucursal_id.toString())
            if (params?.fecha_desde) searchParams.append('fecha_desde', params.fecha_desde)
            if (params?.fecha_hasta) searchParams.append('fecha_hasta', params.fecha_hasta)

            const query = searchParams.toString()
            const response = await api.get<EstadisticasCompras>('/compras/stats/general' + (query ? '?' + query : ''))
            return {
                success: true,
                data: response.data || null
            }
        } catch (error: any) {
            console.error('Error al obtener estadísticas:', error)
            return {
                success: false,
                message: error.response?.data?.message || 'Error al obtener estadísticas',
                data: null
            }
        }
    }
}

export const compraService = new CompraService()
