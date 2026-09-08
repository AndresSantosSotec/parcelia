import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/config'

// ==================== INTERFACES ====================

export interface CuentaContable {
  id: number
  codigo_cuenta: string
  nombre_cuenta: string
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto'
  naturaleza: 'deudor' | 'acreedor'
  nivel: number
  padre_id?: number
  acepta_movimientos: boolean
  estado: boolean
  descripcion?: string
  created_at: string
  updated_at: string
  hijos?: CuentaContable[]
}

export interface TipoPoliza {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  estado: boolean
}

export interface MovimientoContable {
  id: number
  ctb_diario_id: number
  cuenta_id: number
  cliente_id?: number
  debe: number
  haber: number
  glosa?: string
  linea: number
  cuenta?: CuentaContable
  cliente?: {
    id: number
    codigo: string
    nombre: string
  }
}

export interface AsientoContable {
  id: number
  numero_comprobante: string
  fecha: string
  tipo_poliza_id: number
  tipo_poliza?: TipoPoliza
  concepto: string
  origen_tipo?: 'credito_prendario' | 'venta_prenda' | 'caja' | 'compra'
  origen_id?: number
  total_debe: number
  total_haber: number
  cuadrado: boolean
  estado: 'activo' | 'anulado'
  created_by?: number
  usuario?: {
    id: number
    name: string
    email: string
  }
  movimientos?: MovimientoContable[]
  created_at: string
  updated_at: string
}

export interface BalanceComprobacionItem {
  cuenta_id: number
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  debe: number
  haber: number
  saldo: number
}

export interface LibroMayorMovimiento {
  id: number
  fecha: string
  numero_comprobante: string
  numero_documento?: string
  detalle?: string
  glosa?: string
  debe: number
  haber: number
  saldo: number
}

export interface DashboardContable {
  total_activos: number
  total_pasivos: number
  total_patrimonio: number
  total_ingresos: number
  total_gastos: number
  utilidad_neta: number
  asientos_mes: number
  cuentas_activas: number
}

// ==================== FILTROS ====================

export interface DiarioFilters {
  fecha_inicio?: string
  fecha_fin?: string
  tipo_poliza_id?: number
  origen_tipo?: string
  estado?: string
  search?: string
  per_page?: number
  page?: number
}

export interface BalanceFilters {
  fecha_inicio?: string
  fecha_fin?: string
  sucursal_id?: number
  nivel?: number
  tipo?: string
}

export interface LibroMayorFilters {
  cuenta_id: number
  fecha_inicio?: string
  fecha_fin?: string
  sucursal_id?: number
}

export interface NomenclaturaFilters {
  tipo?: string
  nivel?: number
  solo_movimientos?: boolean
  search?: string
  per_page?: number
  page?: number
}

// ==================== SERVICIO ====================

export const contabilidadService = {
  // ==================== DASHBOARD ====================
  
  /**
   * Obtener resumen del dashboard contable
   */
  getDashboard: async (): Promise<DashboardContable> => {
    try {
      const response = await api.get('/contabilidad/dashboard') as any
      return response.data
    } catch (error) {
      console.error('Error al obtener dashboard contable:', error)
      throw error
    }
  },

  // ==================== NOMENCLATURA ====================
  
  /**
   * Listar cuentas contables (paginado)
   */
  getCuentas: async (filters?: NomenclaturaFilters) => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      const response = await api.get(`/contabilidad/nomenclatura?${params.toString()}`) as any
      return response
    } catch (error) {
      console.error('Error al obtener cuentas:', error)
      throw error
    }
  },

  /**
   * Obtener árbol de cuentas contables
   */
  getCuentasArbol: async () => {
    try {
      const response = await api.get('/contabilidad/nomenclatura/arbol') as any
      return response.data
    } catch (error) {
      console.error('Error al obtener árbol de cuentas:', error)
      throw error
    }
  },

  /**
   * Crear nueva cuenta contable
   */
  createCuenta: async (data: Partial<CuentaContable>) => {
    try {
      const response = await api.post('/contabilidad/nomenclatura', data)
      return response.data
    } catch (error) {
      console.error('Error al crear cuenta:', error)
      throw error
    }
  },

  /**
   * Actualizar cuenta contable
   */
  updateCuenta: async (id: number, data: Partial<CuentaContable>) => {
    try {
      const response = await api.put(`/contabilidad/nomenclatura/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error al actualizar cuenta:', error)
      throw error
    }
  },

  // ==================== TIPOS DE POLIZA ====================
  
  /**
   * Listar tipos de póliza
   */
  getTiposPoliza: async (): Promise<TipoPoliza[]> => {
    try {
      const response = await api.get('/contabilidad/tipos-poliza') as any
      return response.data
    } catch (error) {
      console.error('Error al obtener tipos de póliza:', error)
      throw error
    }
  },

  // ==================== LIBRO DIARIO ====================
  
  /**
   * Listar asientos contables (libro diario)
   */
  getDiario: async (filters?: DiarioFilters) => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      const response = await api.get(`/contabilidad/diario?${params.toString()}`) as any
      return response
    } catch (error) {
      console.error('Error al obtener libro diario:', error)
      throw error
    }
  },

  /**
   * Obtener detalle de un asiento contable
   */
  getAsiento: async (id: number): Promise<AsientoContable> => {
    try {
      const response = await api.get(`/contabilidad/diario/${id}`) as any
      return response.data
    } catch (error) {
      console.error('Error al obtener asiento:', error)
      throw error
    }
  },

  /**
   * Descargar PDF del libro diario
   */
  descargarLibroDiarioPDF: async (filters?: DiarioFilters) => {
    try {
      const token = api.getToken()
      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicie sesión nuevamente.')
      }
      
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      const response = await fetch(`${API_BASE_URL}/contabilidad/libro-diario/pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf, application/json',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.message || 'Error al generar PDF')
        }
        throw new Error(`Error al generar PDF: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `libro_diario_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      throw error
    }
  },

  // ==================== BALANCE DE COMPROBACION ====================
  
  /**
   * Obtener balance de comprobación
   */
  getBalanceComprobacion: async (filters?: BalanceFilters): Promise<BalanceComprobacionItem[]> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      const response = await api.get(`/contabilidad/balance-comprobacion?${params.toString()}`) as any
      return response.data
    } catch (error) {
      console.error('Error al obtener balance:', error)
      throw error
    }
  },

  /**
   * Descargar PDF del balance de comprobación
   */
  descargarBalancePDF: async (filters?: BalanceFilters) => {
    try {
      const token = api.getToken()
      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicie sesión nuevamente.')
      }
      
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      const response = await fetch(`${API_BASE_URL}/contabilidad/balance-comprobacion/pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf, application/json',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.message || 'Error al generar PDF')
        }
        throw new Error(`Error al generar PDF: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `balance_comprobacion_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      throw error
    }
  },

  // ==================== LIBRO MAYOR ====================
  
  /**
   * Obtener libro mayor de una cuenta
   */
  getLibroMayor: async (filters: LibroMayorFilters) => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      const response = await api.get(`/contabilidad/libro-mayor?${params.toString()}`) as any
      return response.data
    } catch (error) {
      console.error('Error al obtener libro mayor:', error)
      throw error
    }
  },

  /**
   * Descargar PDF del libro mayor
   */
  descargarLibroMayorPDF: async (filters: LibroMayorFilters) => {
    try {
      const token = api.getToken()
      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicie sesión nuevamente.')
      }
      
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      const response = await fetch(`${API_BASE_URL}/contabilidad/libro-mayor/pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf, application/json',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.message || 'Error al generar PDF')
        }
        throw new Error(`Error al generar PDF: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `libro_mayor_${filters.cuenta_id}_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      throw error
    }
  }
}
