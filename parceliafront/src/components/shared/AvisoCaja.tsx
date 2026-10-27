import { useCallback, useEffect, useState } from 'react'
import { cajaService } from '@/lib/services/caja.service'

export function useCajaOperable() {
  const [abierta, setAbierta] = useState<boolean | null>(null)

  const revisar = useCallback(async () => {
    try {
      const estado = await cajaService.checkEstado()
      setAbierta(estado?.estado === 'abierta' && Boolean(estado.caja?.id))
    } catch {
      setAbierta(false)
    }
  }, [])

  useEffect(() => {
    void revisar()
  }, [revisar])

  return { abierta, revisar }
}

export function AvisoCaja({ abierta }: { abierta: boolean | null }) {
  if (abierta !== false) return null
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      No hay caja abierta con tu usuario. Las entradas y salidas de dinero están bloqueadas. Ve a Caja y Cobros y apertúrala.
    </div>
  )
}
