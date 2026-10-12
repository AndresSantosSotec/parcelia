import { useCallback } from 'react'

export const EVENTO_NAVEGAR_MODULO = 'parcelia:navegar-modulo'

/**
 * Hook para navegar entre módulos
 * Emite un evento de ventana que escucha MainApp
 */
export function useNavigateModule() {
  const navigate = useCallback((modulo: string) => {
    window.dispatchEvent(new CustomEvent<{ modulo: string }>(EVENTO_NAVEGAR_MODULO, { detail: { modulo } }))
  }, [])

  return { navigate }
}
