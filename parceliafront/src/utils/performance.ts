/**
 * Debounce function utility
 * Retrasa la ejecución de una función hasta que pasen X milisegundos sin nuevas llamadas
 * 
 * @example
 * const debouncedSearch = debounce((term: string) => {
 *   searchClientes(term)
 * }, 500)
 * 
 * // En un input:
 * onChange={(e) => debouncedSearch(e.target.value)}
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * Throttle function utility
 * Limita la ejecución de una función a una vez cada X milisegundos
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   handleScroll()
 * }, 200)
 * 
 * window.addEventListener('scroll', throttledScroll)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Request Cache para evitar peticiones duplicadas
 * Útil para catálogos y datos que no cambian frecuentemente
 */
interface CacheEntry {
  data: any
  timestamp: number
}

export class RequestCache {
  private cache = new Map<string, CacheEntry>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutos por defecto

  /**
   * Obtener dato del caché
   * @param key Identificador único del request
   * @returns Datos cacheados o null si no existe o expiró
   */
  get<T = any>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    // Verificar si expiró
    if (Date.now() - cached.timestamp > this.defaultTTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  /**
   * Guardar dato en caché
   * @param key Identificador único del request
   * @param data Datos a cachear
   * @param ttl Tiempo de vida en milisegundos (opcional)
   */
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })

    // Si se especifica un TTL custom, programar eliminación
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key)
      }, ttl)
    }
  }

  /**
   * Verificar si existe en caché y no ha expirado
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Eliminar entrada específica del caché
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Limpiar todo el caché
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Obtener tamaño del caché
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Configurar TTL por defecto
   */
  setDefaultTTL(ms: number): void {
    this.defaultTTL = ms
  }
}

// Instancia singleton del caché
export const requestCache = new RequestCache()

/**
 * Hook para usar request cache en componentes React
 * 
 * @example
 * const { data, loading, error } = useCachedRequest(
 *   'categorias',
 *   () => api.get('/api/categorias-producto'),
 *   { ttl: 10 * 60 * 1000 } // 10 minutos
 * )
 */
import { useState, useEffect } from 'react'

interface UseCachedRequestOptions {
  ttl?: number
  enabled?: boolean
}

export function useCachedRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  options: UseCachedRequestOptions = {}
) {
  const { ttl, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Intentar obtener del caché primero
    const cached = requestCache.get<T>(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    // Si no está en caché, hacer request
    setLoading(true)
    setError(null)

    requestFn()
      .then((result) => {
        setData(result)
        requestCache.set(cacheKey, result, ttl)
      })
      .catch((err) => {
        setError(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [cacheKey, enabled])

  const refetch = () => {
    requestCache.delete(cacheKey)
    setLoading(true)
    setError(null)

    requestFn()
      .then((result) => {
        setData(result)
        requestCache.set(cacheKey, result, ttl)
      })
      .catch((err) => {
        setError(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return { data, loading, error, refetch }
}

/**
 * Batch Requests - Agrupa múltiples requests en uno solo
 * Útil cuando necesitas hacer varias peticiones al mismo tiempo
 * 
 * @example
 * const batcher = new RequestBatcher()
 * 
 * Promise.all([
 *   batcher.add('categorias', () => api.get('/api/categorias')),
 *   batcher.add('monedas', () => api.get('/api/monedas')),
 *   batcher.add('sucursales', () => api.get('/api/sucursales'))
 * ]).then(([categorias, monedas, sucursales]) => {
 *   // Todas las requests se ejecutaron en paralelo
 * })
 */
export class RequestBatcher {
  private pending = new Map<string, Promise<any>>()

  /**
   * Agregar request al batch
   * Si ya existe un request con la misma key, retorna el promise existente
   */
  add<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Si ya existe un request pendiente con esta key, retornarlo
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    // Crear nuevo request
    const promise = requestFn()
      .finally(() => {
        // Limpiar cuando termine
        this.pending.delete(key)
      })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * Cancelar todos los requests pendientes
   */
  cancelAll(): void {
    this.pending.clear()
  }

  /**
   * Obtener cantidad de requests pendientes
   */
  getPendingCount(): number {
    return this.pending.size
  }
}
