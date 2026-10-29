/**
 * Recuperación automática cuando se publica una versión nueva del frontend.
 *
 * Tras un deploy, los archivos JS con hash anterior (ej. NegociacionesModule-abc123.js)
 * dejan de existir en el servidor. Una pestaña abierta con la versión vieja falla con
 * "Failed to fetch dynamically imported module". Aquí limpiamos cachés del Service Worker
 * y recargamos una sola vez para tomar la versión nueva.
 */

const CLAVE_RECARGA = 'kottan:chunk-reload-at'
const VENTANA_MS = 30_000

const PATRONES_CHUNK = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'ChunkLoadError',
  'Loading chunk',
  'Loading CSS chunk',
  'Unable to preload CSS',
]

export function esErrorDeChunk(error: unknown): boolean {
  const texto = String((error as { message?: string })?.message ?? error ?? '')
  const nombre = String((error as { name?: string })?.name ?? '')
  return PATRONES_CHUNK.some((p) => texto.includes(p) || nombre.includes(p))
}

async function limpiarCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const claves = await caches.keys()
      await Promise.all(claves.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignorar */
  }
  try {
    if ('serviceWorker' in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registros.map((r) => r.update().catch(() => undefined)))
    }
  } catch {
    /* ignorar */
  }
}

/** Limpia cachés y recarga. Devuelve false si ya se recargó hace poco (evita bucles). */
export async function recargarPorNuevaVersion(forzar = false): Promise<boolean> {
  const ultimo = Number(sessionStorage.getItem(CLAVE_RECARGA) || 0)
  if (!forzar && ultimo && Date.now() - ultimo < VENTANA_MS) {
    return false
  }
  sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()))
  await limpiarCaches()
  window.location.reload()
  return true
}

/** Registra los listeners globales. Llamar una vez en main.tsx. */
export function instalarRecuperacionDeChunks(): void {
  // Evento nativo de Vite cuando falla el preload de un chunk dinámico
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    void recargarPorNuevaVersion()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (esErrorDeChunk(event.reason)) {
      event.preventDefault()
      void recargarPorNuevaVersion()
    }
  })

  // Si la app cargó bien, liberamos el candado para futuras actualizaciones
  window.setTimeout(() => {
    sessionStorage.removeItem(CLAVE_RECARGA)
  }, VENTANA_MS)
}

