import { api } from './api'

export interface MigracionLog {
    id: number
    tabla_destino: string
    estado: 'procesando' | 'completado' | 'fallido' | 'completado_parcial'
    total_filas: number
    filas_insertadas: number
    errores_count: number
    created_at: string
    usuario: {
        name: string
        username: string
    }
}

export interface ValidationResult {
    total_filas: number
    errores_count: number
    valido: boolean
    preview: any[]
    errores_muestra: Array<{
        fila: number
        errores: string[]
        data: any
    }>
}

export const migracionService = {
    // Obtener historial
    getLogs: async (page = 1) => {
        try {
            const response = await api.get(`/migraciones?page=${page}`)
            return response.data
        } catch (error) {
            throw error
        }
    },

    // Descargar plantilla Excel
    downloadTemplate: async (modelo: string) => {
        try {
            await api.downloadFile(`/migraciones/plantilla/${modelo}`, `plantilla_${modelo}.xlsx`)
        } catch (error) {
            throw error
        }
    },

    // Subir archivo para validación
    uploadFile: async (file: File, modelo: string) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('modelo', modelo)

        try {
            const response = await api.post<any>('/migraciones/upload', formData)
            return response.data
        } catch (error) {
            throw error
        }
    },

    // Ejecutar importación final
    executeImport: async (tempPath: string, modelo: string) => {
        try {
            const response = await api.post('/migraciones/execute', {
                temp_path: tempPath,
                modelo
            })
            return response.data
        } catch (error) {
            throw error
        }
    }
}
