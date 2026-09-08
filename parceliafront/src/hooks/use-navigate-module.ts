import { useCallback } from 'react'
import { useKV } from './use-kv'

/**
 * Hook para navegar entre módulos
 * Usa useKV para comunicarse con MainApp
 */
export function useNavigateModule() {
  const [, setNavigateRequest] = useKV<{ modulo: string } | null>('navigate-module-request', null)

  const navigate = useCallback((modulo: string) => {
    setNavigateRequest({ modulo })
    // Limpiar después de un momento para permitir navegaciones repetidas
    setTimeout(() => {
      setNavigateRequest(null)
    }, 100)
  }, [setNavigateRequest])

  return { navigate }
}
