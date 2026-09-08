import { useState, useEffect, useCallback } from 'react'
import { sucursalService } from '@/lib/api'
import { useKV } from '@/hooks/use-kv'

export interface SucursalActiva {
  id: string
  codigo: string
  nombre: string
}

/**
 * Hook compartido para cargar sucursales activas.
 * Se actualiza automáticamente cuando cambia el trigger 'refrescar-sucursales-trigger'
 * (disparado al crear/editar/eliminar/activar sucursales).
 */
export function useSucursalesActivas() {
  const [sucursales, setSucursales] = useState<SucursalActiva[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refrescarTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const response = await sucursalService.getActivas()
      const data: any = response
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(data)) {
        setSucursales(data)
      } else if (data?.success && Array.isArray(data.data)) {
        setSucursales(data.data)
      } else if (Array.isArray(data?.data)) {
        setSucursales(data.data)
      } else {
        setSucursales([])
      }
    } catch (err: any) {
      console.error('Error cargando sucursales:', err)
      setError(err.message || 'Error al cargar sucursales')
      setSucursales([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar, refrescarTrigger])

  return { sucursales, cargando, error, recargar: cargar }
}
