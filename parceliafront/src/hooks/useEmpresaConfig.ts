import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface EmpresaConfig {
  nombreEmpresa: string
  slogan: string
  logoUrl: string | null
  nit: string
  telefono: string
  email: string
  direccion: string
  sitioWeb: string
  monedaSimbolo: string
  monedaCodigo: string
  piePaginaDocumentos: string
  clausulasContrato: string
  temaColor: 'esmeralda' | 'bosque' | 'menta' | 'oliva'
}

export const DEFAULT_EMPRESA_CONFIG: EmpresaConfig = {
  nombreEmpresa: 'Parcelia',
  slogan: 'Venta de Terrenos & Financiamiento Propio',
  logoUrl: null,
  nit: '',
  telefono: '',
  email: '',
  direccion: 'Guatemala',
  sitioWeb: '',
  monedaSimbolo: 'Q',
  monedaCodigo: 'GTQ',
  piePaginaDocumentos: 'Documento oficial · Válido según la legislación vigente de la República de Guatemala.',
  clausulasContrato: 'El comprador acepta formalmente los términos y condiciones de la operación, comprometiéndose al cumplimiento de los pagos en los plazos estipulados.',
  temaColor: 'esmeralda'
}

/**
 * Resuelve la URL de la imagen del logo asegurando que rutas relativas del backend
 * (/storage/...) se direccionen al origen correcto de la API.
 */
export function resolveLogoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${backendBase}${cleanPath}`
}

const STORAGE_KEY = 'parcelia_empresa_config'
const EVENT_NAME = 'parcelia:config_updated'

export function useEmpresaConfig() {
  const [config, setConfigState] = useState<EmpresaConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_EMPRESA_CONFIG, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.error('Error loading empresa config:', e)
    }
    return DEFAULT_EMPRESA_CONFIG
  })

  // Cargar configuración desde el backend al iniciar
  useEffect(() => {
    const fetchBackendConfig = async () => {
      try {
        const res = await api.get<Partial<EmpresaConfig>>('/empresa-config')
        if (res.success && res.data) {
          const merged = { ...DEFAULT_EMPRESA_CONFIG, ...res.data }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          setConfigState(merged)
        }
      } catch (e) {
        // En caso de estar offline o no autenticado, mantiene localStorage
      }
    }
    fetchBackendConfig()
  }, [])

  // Escuchar cambios entre pestañas o componentes
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setConfigState({ ...DEFAULT_EMPRESA_CONFIG, ...JSON.parse(saved) })
        }
      } catch (e) {
        console.error('Error syncing empresa config:', e)
      }
    }

    window.addEventListener(EVENT_NAME, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const updateConfig = useCallback(async (newConfig: Partial<EmpresaConfig>) => {
    const updated = { ...config, ...newConfig }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent(EVENT_NAME))
      setConfigState(updated)

      // Guardar también en el backend Laravel
      const res = await api.post<any>('/empresa-config', updated).catch((err) => {
        console.warn('No se pudo guardar en backend:', err)
        return null
      })
      if (res?.success && res?.data) {
        const mergedBackend = { ...updated, ...res.data }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedBackend))
        setConfigState(mergedBackend)
      }
    } catch (e) {
      console.error('Error saving empresa config:', e)
    }
  }, [config])

  const resetConfig = useCallback(async () => {
    setConfigState(DEFAULT_EMPRESA_CONFIG)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EMPRESA_CONFIG))
      window.dispatchEvent(new CustomEvent(EVENT_NAME))
      await api.post('/empresa-config', DEFAULT_EMPRESA_CONFIG).catch(() => {})
    } catch (e) {
      console.error('Error resetting config:', e)
    }
  }, [])

  return {
    config,
    updateConfig,
    resetConfig
  }
}
