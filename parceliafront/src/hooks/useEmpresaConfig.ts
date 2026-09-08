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
  nombreEmpresa: 'TerraCloud',
  slogan: 'Solución Cloud de Parcelamiento & Financiamiento',
  logoUrl: null,
  nit: '1098472-9',
  telefono: '(502) 2334-8900',
  email: 'contacto@terracloud.gt',
  direccion: 'Avenida Reforma 12-40, Zona 10, Edificio Reforma Montúfar',
  sitioWeb: 'www.terracloud.gt',
  monedaSimbolo: 'Q',
  monedaCodigo: 'GTQ',
  piePaginaDocumentos: 'Documento oficial emitido por TerraCloud SaaS · Válido según la legislación vigente.',
  clausulasContrato: 'El comprador acepta formalmente los términos y condiciones de la operación, comprometiéndose al cumplimiento de los pagos en los plazos estipulados.',
  temaColor: 'esmeralda'
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
        const res = await api.get<{ success: boolean; data: Partial<EmpresaConfig> }>('/empresa-config')
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
      await api.post('/empresa-config', updated).catch(() => {})
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
