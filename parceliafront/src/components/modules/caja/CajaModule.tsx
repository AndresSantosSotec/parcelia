import { useState, useEffect, useMemo, useCallback } from 'react'
import { cajaService, Caja, MovimientoCaja } from '@/lib/services/caja.service'
import { denominacionService, Denominacion, DenominacionesResponse } from '@/lib/services/denominacion.service'
import { bovedaService, Boveda } from '@/lib/services/boveda.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { StatusBadge } from '@/components/StatusBadge'
import { 
  Wallet, LockKey, ArrowDown, ArrowUp, ClockCounterClockwise, Bank, Receipt, 
  MinusCircle, PlusCircle, CaretDown, ListBullets, ClockClockwise, 
  Warning, CheckCircle, FilePdf, Printer, ArrowsClockwise, FileXls, ChartBar,
  Eye, ArrowLeft, ShieldCheck
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Permiso, usePermissions } from '@/hooks/use-permissions'

interface UserSession {
  username: string
  role: string
  loginTime: number
  userData?: {
    id: string
    nombre: string
    username: string
    email: string
    rol: string
    activo: boolean
    permisos: Permiso[]
  }
}

interface ConteoEfectivo {
  [key: string]: number
}

interface DetalleMovimiento {
  denominaciones: { [valor: string]: number }
  total: number
}

// Tipos de vista del módulo
type VistaActual = 'dashboard' | 'apertura' | 'movimientos' | 'cierre' | 'historial'

interface CajaModuleProps {
  userSession: UserSession
}

export function CajaModule({ userSession }: CajaModuleProps) {
  // Estados principales
  const [vistaActual, setVistaActual] = useState<VistaActual>('dashboard')
  const [cajaActual, setCajaActual] = useState<Caja | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [historial, setHistorial] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [requiereCierre, setRequiereCierre] = useState(false)
  
  const { isSuperAdmin, hasPermission } = usePermissions(userSession.userData)
  const canManageOtherCashRegisters = isSuperAdmin || hasPermission('caja', 'gestionar_cajas')

  // ===== ADMIN: Gestión de cajas ajenas =====
  const [cajasAbiertas, setCajasAbiertas] = useState<Caja[]>([])
  const [cajaVisualizando, setCajaVisualizando] = useState<Caja | null>(null) // Caja ajena que el admin está viendo
  const [movimientosVisualizando, setMovimientosVisualizando] = useState<MovimientoCaja[]>([])
  const [modoVisualizacion, setModoVisualizacion] = useState(false) // true = viendo caja de otro usuario

  // ===== INTEGRACIÓN CAJA-BÓVEDA =====
  const [cashVaultIntegrationEnabled, setCashVaultIntegrationEnabled] = useState(false)
  const [toggling, setToggling] = useState(false)
  // Bóveda seleccionada para apertura (modo integrado)
  const [bovedaOrigenId, setBovedaOrigenId] = useState<number | null>(null)
  // Bóveda seleccionada para movimientos (modo integrado)
  const [bovedaMovimientoId, setBovedaMovimientoId] = useState<number | null>(null)

  // Denominaciones
  const [billetes, setBilletes] = useState<Denominacion[]>([])
  const [monedas, setMonedas] = useState<Denominacion[]>([])
  const [simboloMoneda, setSimboloMoneda] = useState('Q')

  // Bóvedas
  const [bovedas, setBovedas] = useState<Boveda[]>([])

  // Bóvedas disponibles para cierre
  const [bovedasCierre, setBovedasCierre] = useState<Boveda[]>([])
  const [bovedaSeleccionadaId, setBovedaSeleccionadaId] = useState<number | null>(null)
  const [cargandoBovedasCierre, setCargandoBovedasCierre] = useState(false)
  const [dialogMovimiento, setDialogMovimiento] = useState(false)
  const [dialogConsolidado, setDialogConsolidado] = useState(false)

  // Estados de formularios
  const [montoInicial, setMontoInicial] = useState('')
  const [conteoApertura, setConteoApertura] = useState<ConteoEfectivo>({})
  const [usarDesgloseApertura, setUsarDesgloseApertura] = useState(true)
  
  const [conteo, setConteo] = useState<ConteoEfectivo>({})
  const [montoContado, setMontoContado] = useState('')
  
  const [movimientoData, setMovimientoData] = useState({ tipo: 'incremento', monto: '', concepto: '' })
  const [conteoMovimiento, setConteoMovimiento] = useState<ConteoEfectivo>({})
  const [usarDesglose, setUsarDesglose] = useState(true)

  // ===== CARGA DE DATOS =====
  const loadDenominaciones = useCallback(async () => {
    try {
      const data = await denominacionService.getMonedaBase()
      if (data?.billetes && data?.monedas) {
        setBilletes(data.billetes.map(d => ({ ...d, valor: Number(d.valor) })))
        setMonedas(data.monedas.map(d => ({ ...d, valor: Number(d.valor) })))
        setSimboloMoneda(data.moneda?.simbolo || 'Q')
      }
    } catch (error) {
      console.error('Error cargando denominaciones:', error)
      // Fallback
      setBilletes([
        { id: 1, moneda_id: 1, valor: 200, tipo: 'billete', descripcion: 'Q200', orden: 1, activa: true },
        { id: 2, moneda_id: 1, valor: 100, tipo: 'billete', descripcion: 'Q100', orden: 2, activa: true },
        { id: 3, moneda_id: 1, valor: 50, tipo: 'billete', descripcion: 'Q50', orden: 3, activa: true },
        { id: 4, moneda_id: 1, valor: 20, tipo: 'billete', descripcion: 'Q20', orden: 4, activa: true },
        { id: 5, moneda_id: 1, valor: 10, tipo: 'billete', descripcion: 'Q10', orden: 5, activa: true },
        { id: 6, moneda_id: 1, valor: 5, tipo: 'billete', descripcion: 'Q5', orden: 6, activa: true },
      ])
      setMonedas([
        { id: 7, moneda_id: 1, valor: 1.00, tipo: 'moneda', descripcion: 'Q1.00', orden: 7, activa: true },
        { id: 8, moneda_id: 1, valor: 0.50, tipo: 'moneda', descripcion: 'Q0.50', orden: 8, activa: true },
        { id: 9, moneda_id: 1, valor: 0.25, tipo: 'moneda', descripcion: 'Q0.25', orden: 9, activa: true },
        { id: 10, moneda_id: 1, valor: 0.10, tipo: 'moneda', descripcion: 'Q0.10', orden: 10, activa: true },
        { id: 11, moneda_id: 1, valor: 0.05, tipo: 'moneda', descripcion: 'Q0.05', orden: 11, activa: true },
      ])
    }
  }, [])

  const checkEstado = useCallback(async () => {
    try {
      setLoading(true)
      const data = await cajaService.checkEstado()
      
      // Capturar el flag de integración
      if (data?.cash_vault_integration_enabled !== undefined) {
        setCashVaultIntegrationEnabled(!!data.cash_vault_integration_enabled)
      }
      
      if (data?.estado === 'abierta' && data?.caja) {
        setCajaActual(data.caja)
        setRequiereCierre(data.requiere_cierre || false)
        await loadMovimientos(data.caja.id)
        
        if (data.requiere_cierre) {
          toast.warning(data.mensaje || 'Tienes una caja pendiente de cierre')
        }
      } else {
        setCajaActual(null)
        setMovimientos([])
        setRequiereCierre(false)
      }
    } catch (error) {
      console.error('Error verificando estado:', error)
      setCajaActual(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMovimientos = async (cajaId: number) => {
    try {
      const data = await cajaService.getMovimientos(cajaId)
      setMovimientos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando movimientos:', error)
      setMovimientos([])
    }
  }

  const loadHistorial = async () => {
    try {
      const response = await cajaService.getHistorial({})
      const data = response?.data || response || []
      setHistorial(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando historial:', error)
      setHistorial([])
    }
  }

  // ===== ADMIN: Cargar todas las cajas abiertas =====
  const loadCajasAbiertas = useCallback(async () => {
    if (!canManageOtherCashRegisters) return
    try {
      const response = await cajaService.todasAbiertas()
      if (response?.data) {
        setCajasAbiertas(response.data)
      }
    } catch (error) {
      console.error('Error cargando cajas abiertas:', error)
    }
  }, [canManageOtherCashRegisters])

  // ===== ADMIN: Ver caja de otro usuario =====
  const handleVerCajaAjena = async (caja: Caja) => {
    try {
      const response = await cajaService.detalleCaja(caja.id)
      if (response?.caja) {
        setCajaVisualizando(response.caja)
        setMovimientosVisualizando(response.movimientos || [])
        setModoVisualizacion(!response.es_propia)
        setVistaActual('dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar detalle de caja')
    }
  }

  // ===== ADMIN: Volver a propia caja =====
  const handleVolverACajaPropia = () => {
    setCajaVisualizando(null)
    setMovimientosVisualizando([])
    setModoVisualizacion(false)
    setVistaActual('dashboard')
  }

  // ===== ADMIN: Cerrar caja ajena =====
  const handleCerrarCajaAjena = async () => {
    if (!cajaVisualizando) return

    const totalArqueo = calcularTotalArqueo()
    const montoFinal = totalArqueo > 0 ? totalArqueo : parseFloat(montoContado)

    if (isNaN(montoFinal) || montoFinal < 0) {
      toast.error('Realiza el arqueo de caja o ingresa el monto contado')
      return
    }

    try {
      await cajaService.cerrar(cajaVisualizando.id, {
        saldo_final_real: montoFinal,
        detalles_arqueo: JSON.stringify(conteo),
        boveda_destino_id: bovedaSeleccionadaId || undefined
      })

      toast.success(`Caja de ${cajaVisualizando.user?.name || 'usuario'} cerrada correctamente`)
      handleVolverACajaPropia()
      loadCajasAbiertas()
      setConteo({})
      setMontoContado('')
      setBovedasCierre([])
      setBovedaSeleccionadaId(null)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cerrar caja ajena')
    }
  }

  useEffect(() => {
    loadDenominaciones()
    checkEstado()
    if (canManageOtherCashRegisters) loadCajasAbiertas()
  }, [loadDenominaciones, checkEstado, canManageOtherCashRegisters, loadCajasAbiertas])

  useEffect(() => {
    if (cashVaultIntegrationEnabled) {
      bovedaService.getBovedas({ activa: true })
        .then(res => {
          setBovedas(res?.bovedas || [])
        })
        .catch(err => {
          console.error('Error al cargar bóvedas para integración:', err)
          setBovedas([])
        })
    } else {
      setBovedas([])
    }
  }, [cashVaultIntegrationEnabled])

  useEffect(() => {
    if (vistaActual === 'historial') {
      loadHistorial()
    }
    if (vistaActual === 'cierre') {
      // Cargar bóvedas disponibles para transferir al cerrar caja
      const cajaParaCierre = modoVisualizacion ? cajaVisualizando : cajaActual
      const esSuperAdmin = userSession.userData?.rol === 'superadmin'
      
      if (cajaParaCierre?.sucursal_id || esSuperAdmin) {
        setCargandoBovedasCierre(true)
        // SuperAdmin: ve TODAS las bóvedas activas (de cualquier sucursal)
        // Otros roles: solo ven bóvedas activas de la sucursal de la caja
        const filtros: any = { activa: true }
        if (!esSuperAdmin) {
          filtros.sucursal_id = cajaParaCierre!.sucursal_id
        }
        bovedaService.getBovedas(filtros)
          .then(res => {
            const lista = res?.bovedas || []
            setBovedasCierre(lista)
            // Auto-seleccionar si solo hay una bóveda
            if (lista.length === 1) {
              setBovedaSeleccionadaId(lista[0].id)
            } else {
              setBovedaSeleccionadaId(null)
            }
          })
          .catch(() => {
            setBovedasCierre([])
            setBovedaSeleccionadaId(null)
          })
          .finally(() => setCargandoBovedasCierre(false))
      }
    }
  }, [vistaActual])

  // ===== CÁLCULOS =====
  const calcularTotalApertura = () => {
    return Object.entries(conteoApertura).reduce((sum, [valor, cant]) => sum + (parseFloat(valor) * cant), 0)
  }

  const calcularTotalArqueo = () => {
    return Object.entries(conteo).reduce((sum, [valor, cant]) => sum + (parseFloat(valor) * cant), 0)
  }

  const calcularTotalMovimiento = () => {
    return Object.entries(conteoMovimiento).reduce((sum, [valor, cant]) => sum + (parseFloat(valor) * cant), 0)
  }

  const totalIngresos = useMemo(() =>
    movimientos.filter(m => ['incremento', 'ingreso_pago'].includes(m.tipo) && m.estado === 'aplicado')
      .reduce((sum, m) => sum + Number(m.monto), 0)
  , [movimientos])

  const totalEgresos = useMemo(() =>
    movimientos.filter(m => ['decremento', 'egreso_desembolso'].includes(m.tipo) && m.estado === 'aplicado')
      .reduce((sum, m) => sum + Number(m.monto), 0)
  , [movimientos])

  const totalEsperado = cajaActual 
    ? Number(cajaActual.saldo_inicial) + totalIngresos - totalEgresos 
    : 0

  // ===== HANDLERS =====
  const handleAbrirCaja = async () => {
    let monto: number
    
    if (usarDesgloseApertura) {
      monto = calcularTotalApertura()
    } else {
      monto = parseFloat(montoInicial)
    }

    if (isNaN(monto) || monto < 0) {
      toast.error('Ingresa un monto inicial válido')
      return
    }

    // Modo integrado: requerir bóveda origen
    if (cashVaultIntegrationEnabled && !bovedaOrigenId) {
      toast.error('Selecciona la bóveda de origen para el saldo inicial')
      return
    }

    try {
      const response = await cajaService.abrir({ 
        saldo_inicial: monto,
        fecha_apertura: new Date().toISOString().split('T')[0],
        ...(cashVaultIntegrationEnabled && bovedaOrigenId ? { boveda_origen_id: bovedaOrigenId } : {})
      })
      
      if (response.caja) {
        setCajaActual(response.caja)
        loadMovimientos(response.caja.id)
      }
      
      if (response.ya_existia) {
        toast.info('Continuando con la caja abierta')
      } else {
        const msg = cashVaultIntegrationEnabled
          ? 'Caja aperturada. Saldo debitado de bóveda.'
          : 'Caja aperturada correctamente'
        toast.success(msg)
      }
      
      setVistaActual('dashboard')
      setMontoInicial('')
      setConteoApertura({})
      setBovedaOrigenId(null)
    } catch (error: any) {
      console.error('Error al abrir caja:', error)
      const errorMsg = error.response?.data?.error || 'Error al abrir la caja'
      
      if (error.response?.data?.caja_pendiente) {
        toast.error(errorMsg)
        // Cargar la caja pendiente para mostrarla
        if (error.response?.data?.caja) {
          setCajaActual(error.response.data.caja)
          setRequiereCierre(true)
        }
      } else {
        toast.error(errorMsg)
      }
    }
  }

  const handleCerrarCaja = async () => {
    if (!cajaActual) return

    const totalArqueo = calcularTotalArqueo()
    const montoFinal = totalArqueo > 0 ? totalArqueo : parseFloat(montoContado)

    if (isNaN(montoFinal) || montoFinal < 0) {
      toast.error('Realiza el arqueo de caja o ingresa el monto contado')
      return
    }

    try {
      const result = await cajaService.cerrar(cajaActual.id, {
        saldo_final_real: montoFinal,
        detalles_arqueo: JSON.stringify(conteo),
        boveda_destino_id: bovedaSeleccionadaId || undefined
      })

      const diferencia = montoFinal - totalEsperado
      const huboTransferenciaBoveda = result?.boveda_movimiento != null

      if (Math.abs(diferencia) < 0.01) {
        toast.success(huboTransferenciaBoveda 
          ? '✅ Caja cerrada - Cuadre perfecto. Saldo transferido a bóveda.'
          : '✅ Caja cerrada - Cuadre perfecto')
      } else {
        const msg = diferencia > 0 
          ? `Sobrante de ${simboloMoneda}${diferencia.toFixed(2)}` 
          : `Faltante de ${simboloMoneda}${Math.abs(diferencia).toFixed(2)}`
        toast.warning(`Caja cerrada con ${msg}${huboTransferenciaBoveda ? '. Saldo transferido a bóveda.' : ''}`)
      }

      setVistaActual('dashboard')
      setCajaActual(null)
      setMovimientos([])
      setConteo({})
      setMontoContado('')
      setRequiereCierre(false)
      setBovedasCierre([])
      setBovedaSeleccionadaId(null)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cerrar caja')
    }
  }

  const handleRegistrarMovimiento = async () => {
    // Determinar en qué caja se registra: si estamos viendo caja ajena, usar esa
    const cajaDestino = modoVisualizacion && cajaVisualizando ? cajaVisualizando : cajaActual
    if (!cajaDestino) {
      toast.error('No hay caja abierta')
      return
    }

    let monto: number
    let detalles: DetalleMovimiento | null = null

    if (usarDesglose) {
      monto = calcularTotalMovimiento()
      if (monto <= 0) {
        toast.error('Ingresa al menos una denominación')
        return
      }
      detalles = { denominaciones: { ...conteoMovimiento }, total: monto }
    } else {
      monto = parseFloat(movimientoData.monto)
      if (isNaN(monto) || monto <= 0) {
        toast.error('Monto inválido')
        return
      }
    }

    if (!movimientoData.concepto.trim()) {
      toast.error('El concepto es obligatorio')
      return
    }

    // Modo integrado: requerir bóveda
    if (cashVaultIntegrationEnabled && !bovedaMovimientoId) {
      toast.error('Selecciona la bóveda para este movimiento')
      return
    }

    try {
      const response = await cajaService.registrarMovimiento({
        caja_id: cajaDestino.id,
        tipo: movimientoData.tipo,
        monto: monto,
        concepto: movimientoData.concepto,
        detalles: detalles ? JSON.stringify(detalles) : undefined,
        ...(cashVaultIntegrationEnabled && bovedaMovimientoId ? { boveda_id: bovedaMovimientoId } : {})
      })
      
      const requiereAprobacion = response?.requiere_aprobacion
      const nombreCaja = modoVisualizacion && cajaVisualizando
        ? `Movimiento registrado en caja de ${cajaVisualizando.user?.name || 'usuario'}`
        : 'Movimiento registrado'

      if (requiereAprobacion) {
        toast.info(`${nombreCaja} — Pendiente de aprobación en bóveda`)
      } else {
        toast.success(nombreCaja)
      }

      setDialogMovimiento(false)
      setMovimientoData({ tipo: 'incremento', monto: '', concepto: '' })
      setConteoMovimiento({})
      setBovedaMovimientoId(null)

      // Recargar movimientos de la caja destino
      if (modoVisualizacion && cajaVisualizando) {
        handleVerCajaAjena(cajaVisualizando)
        loadCajasAbiertas()
      } else {
        loadMovimientos(cajaDestino.id)
        checkEstado()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar movimiento')
    }
  }

  // ===== REPORTES =====
  const descargarReportePDF = async () => {
    if (!cajaActual) {
      toast.error('No hay caja activa')
      return
    }
    
    try {
      const blob = await cajaService.descargarPDF({ caja_id: cajaActual.id })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-caja-${cajaActual.id}-${format(new Date(), 'yyyyMMdd')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Reporte PDF descargado')
    } catch (error: any) {
      toast.error(error.message || 'Error al descargar PDF')
    }
  }

  const descargarReporteExcel = async () => {
    if (!cajaActual) {
      toast.error('No hay caja activa')
      return
    }
    
    try {
      const blob = await cajaService.descargarExcel({ caja_id: cajaActual.id })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-caja-${cajaActual.id}-${format(new Date(), 'yyyyMMdd')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Reporte Excel descargado')
    } catch (error: any) {
      toast.error(error.message || 'Error al descargar Excel')
    }
  }

  // El consolidado ahora se maneja a través del dialog con filtros

  // ===== HELPERS =====
  const updateConteoApertura = (valor: number, cantidad: number) => {
    setConteoApertura(prev => ({ ...prev, [valor.toString()]: cantidad }))
  }

  const updateConteo = (valor: number, cantidad: number) => {
    setConteo(prev => ({ ...prev, [valor.toString()]: cantidad }))
  }

  const updateConteoMovimiento = (valor: number, cantidad: number) => {
    setConteoMovimiento(prev => ({ ...prev, [valor.toString()]: cantidad }))
  }

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* Header con título y menú de acciones */}
      <div className="page-toolbar pb-4 border-b border-border">
        <div className="min-w-0">
          <h1 className="font-bold tracking-tight">CAJA</h1>
          <p className="text-sm text-muted-foreground">Gestión de efectivo y arqueos diarios</p>
        </div>

        {/* Menú de acciones estilo MicroSystem */}
        <div className="page-toolbar-actions">
          {/* Dropdown Operaciones de Caja */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="gap-2">
                <Wallet size={18} />
                Operaciones de Caja
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setVistaActual('apertura')}
                disabled={!!cajaActual}
                className="gap-2"
              >
                <PlusCircle size={16} />
                Apertura de Caja
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setVistaActual('cierre')}
                disabled={!cajaActual}
                className="gap-2"
              >
                <LockKey size={16} />
                Cierre de Caja
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDialogMovimiento(true)}
                disabled={!cajaActual}
                className="gap-2"
              >
                <ArrowUp size={16} className="text-green-600" />
                Registrar Ingreso
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setMovimientoData({ tipo: 'decremento', monto: '', concepto: '' })
                  setDialogMovimiento(true)
                }}
                disabled={!cajaActual}
                className="gap-2"
              >
                <ArrowDown size={16} className="text-red-600" />
                Registrar Egreso
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Consultas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ListBullets size={18} />
                Consultas
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setVistaActual('movimientos')}
                disabled={!cajaActual}
                className="gap-2"
              >
                <Receipt size={16} />
                Movimientos del Día
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setVistaActual('historial')}
                className="gap-2"
              >
                <ClockClockwise size={16} />
                Historial de Cierres
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Reportes */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ChartBar size={18} />
                Reportes
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={descargarReportePDF}
                disabled={!cajaActual}
                className="gap-2"
              >
                <FilePdf size={16} className="text-red-600" />
                Descargar PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={descargarReporteExcel}
                disabled={!cajaActual}
                className="gap-2"
              >
                <FileXls size={16} className="text-green-600" />
                Exportar a Excel
              </DropdownMenuItem>
              {canManageOtherCashRegisters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDialogConsolidado(true)}
                    className="gap-2"
                  >
                    <ChartBar size={16} className="text-blue-600" />
                    Reporte Consolidado (Admin)
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón Refresh */}
          <Button variant="outline" onClick={() => { checkEstado(); if (canManageOtherCashRegisters) loadCajasAbiertas(); }} className="gap-2">
            <ArrowsClockwise size={18} />
            Actualizar
          </Button>

          {/* Toggle integración Caja-Bóveda (solo admin/superadmin) */}
          {canManageOtherCashRegisters && (
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <ShieldCheck size={16} className={cashVaultIntegrationEnabled ? 'text-green-500' : 'text-muted-foreground'} />
              <span className="text-sm font-medium">Integración Bóveda</span>
              <Switch
                id="toggle-integration"
                checked={cashVaultIntegrationEnabled}
                disabled={toggling}
                onCheckedChange={async (checked) => {
                  setToggling(true)
                  try {
                    const res = await fetch(
                      `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/configuraciones-sistema/cash-vault-integration/toggle`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ activo: checked }),
                      }
                    )
                    const data = await res.json()
                    if (data.success) {
                      setCashVaultIntegrationEnabled(checked)
                      toast.success(data.message)
                    } else {
                      toast.error(data.error || 'Error al cambiar configuración')
                    }
                  } catch {
                    toast.error('Error de conexión')
                  } finally {
                    setToggling(false)
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Alerta de caja pendiente */}
      {requiereCierre && cajaActual && (
        <Alert variant="destructive">
          <Warning className="h-4 w-4" />
          <AlertTitle>¡Caja Pendiente de Cierre!</AlertTitle>
          <AlertDescription>
            Tienes una caja abierta del {format(new Date(cajaActual.fecha_apertura), "dd/MM/yyyy", { locale: es })}.
            Debes cerrarla antes de poder abrir una nueva.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={() => setVistaActual('cierre')}
            >
              Ir a Cerrar Caja
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ===== PANEL ADMIN: Cajas abiertas de otros usuarios ===== */}
      {canManageOtherCashRegisters && cajasAbiertas.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Wallet size={20} className="text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Panel de Cajas (Admin)</CardTitle>
                  <CardDescription className="text-xs">
                    {cajasAbiertas.length} caja{cajasAbiertas.length !== 1 ? 's' : ''} abierta{cajasAbiertas.length !== 1 ? 's' : ''} en el sistema
                  </CardDescription>
                </div>
              </div>
              {modoVisualizacion && (
                <Button size="sm" variant="outline" onClick={handleVolverACajaPropia} className="gap-1.5 text-xs">
                  <ArrowsClockwise size={14} />
                  Volver a mi caja
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {cajasAbiertas.map((caja) => {
                const esMia = caja.user_id === Number(userSession.userData?.id)
                const estaVisualizando = cajaVisualizando?.id === caja.id
                return (
                  <div
                    key={caja.id}
                    className={`relative rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                      estaVisualizando 
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50' 
                        : esMia 
                          ? 'border-green-500/40 bg-green-500/5' 
                          : 'border-border hover:border-blue-500/40'
                    }`}
                    onClick={() => {
                      if (esMia) {
                        handleVolverACajaPropia()
                      } else {
                        handleVerCajaAjena(caja)
                      }
                    }}
                  >
                    {esMia && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        MI CAJA
                      </span>
                    )}
                    {estaVisualizando && !esMia && (
                      <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        VIENDO
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`relative flex h-2 w-2 ${(caja as any).es_de_otro_dia ? '' : ''}`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${(caja as any).es_de_otro_dia ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${(caja as any).es_de_otro_dia ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                      </span>
                      <span className="font-semibold text-sm truncate">{caja.user?.name || 'Usuario'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Sucursal: {caja.sucursal?.nombre || '-'}</p>
                      <p>Apertura: {format(new Date(caja.fecha_apertura), 'dd/MM/yyyy')}</p>
                      <p className="font-medium text-foreground">
                        Saldo esperado: <MoneyDisplay amount={caja.total_esperado_sistema || 0} inline />
                      </p>
                    </div>
                    {!esMia && (
                      <div className="mt-2 flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px] px-2 flex-1"
                          onClick={(e) => { e.stopPropagation(); handleVerCajaAjena(caja); }}
                        >
                          Ver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="h-6 text-[10px] px-2 flex-1"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleVerCajaAjena(caja).then(() => setVistaActual('cierre'));
                          }}
                        >
                          Cerrar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner cuando se está visualizando caja ajena */}
      {modoVisualizacion && cajaVisualizando && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Warning className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">Visualizando caja de: {cajaVisualizando.user?.name || 'otro usuario'}</AlertTitle>
          <AlertDescription className="text-sm">
            Estás viendo la caja de otro usuario. Los movimientos (ingresos/egresos) que registres irán a <strong>tu propia caja</strong>, no a esta.
            Solo puedes <strong>cerrar</strong> esta caja como administrador.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={handleVolverACajaPropia}
            >
              Volver a mi caja
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Contenido según la vista actual */}
      {vistaActual === 'dashboard' && !modoVisualizacion && <VistaDashboard 
        cajaActual={cajaActual}
        movimientos={movimientos}
        totalIngresos={totalIngresos}
        totalEgresos={totalEgresos}
        totalEsperado={totalEsperado}
        simboloMoneda={simboloMoneda}
        onAbrirCaja={() => setVistaActual('apertura')}
        onCerrarCaja={() => setVistaActual('cierre')}
        onNuevoMovimiento={() => setDialogMovimiento(true)}
      />}

      {/* Dashboard visualizando caja ajena */}
      {vistaActual === 'dashboard' && modoVisualizacion && cajaVisualizando && (
        <VistaDashboardAjena
          caja={cajaVisualizando}
          movimientos={movimientosVisualizando}
          simboloMoneda={simboloMoneda}
          onCerrarCaja={() => setVistaActual('cierre')}
          onVolver={handleVolverACajaPropia}
          onNuevoMovimiento={() => setDialogMovimiento(true)}
        />
      )}

      {vistaActual === 'apertura' && <VistaApertura
        cajaActual={cajaActual}
        billetes={billetes}
        monedas={monedas}
        simboloMoneda={simboloMoneda}
        conteoApertura={conteoApertura}
        usarDesgloseApertura={usarDesgloseApertura}
        montoInicial={montoInicial}
        calcularTotalApertura={calcularTotalApertura}
        updateConteoApertura={updateConteoApertura}
        setUsarDesgloseApertura={setUsarDesgloseApertura}
        setMontoInicial={setMontoInicial}
        onAperturar={handleAbrirCaja}
        onCancelar={() => setVistaActual('dashboard')}
        // Integración Caja-Bóveda
        cashVaultIntegrationEnabled={cashVaultIntegrationEnabled}
        bovedas={bovedas}
        bovedaOrigenId={bovedaOrigenId}
        onBovedaOrigenChange={setBovedaOrigenId}
      />}

      {vistaActual === 'movimientos' && <VistaMovimientos
        cajaActual={cajaActual}
        movimientos={movimientos}
        simboloMoneda={simboloMoneda}
        totalIngresos={totalIngresos}
        totalEgresos={totalEgresos}
        totalEsperado={totalEsperado}
        onVolver={() => setVistaActual('dashboard')}
        cashVaultIntegrationEnabled={cashVaultIntegrationEnabled}
      />}

      {vistaActual === 'cierre' && (() => {
        // Si estamos en modo visualización, usar datos de la caja ajena
        const cajaParaCierre = modoVisualizacion ? cajaVisualizando : cajaActual
        const movsParaCierre = modoVisualizacion ? movimientosVisualizando : movimientos
        const ingresosParaCierre = movsParaCierre.filter(m => ['incremento', 'ingreso_pago'].includes(m.tipo) && m.estado === 'aplicado')
          .reduce((sum, m) => sum + Number(m.monto), 0)
        const egresosParaCierre = movsParaCierre.filter(m => ['decremento', 'egreso_desembolso'].includes(m.tipo) && m.estado === 'aplicado')
          .reduce((sum, m) => sum + Number(m.monto), 0)
        const esperadoParaCierre = cajaParaCierre
          ? Number(cajaParaCierre.saldo_inicial) + ingresosParaCierre - egresosParaCierre
          : 0

        return <VistaCierre
          cajaActual={cajaParaCierre}
          movimientos={movsParaCierre}
          billetes={billetes}
          monedas={monedas}
          simboloMoneda={simboloMoneda}
          conteo={conteo}
          totalIngresos={ingresosParaCierre}
          totalEgresos={egresosParaCierre}
          totalEsperado={esperadoParaCierre}
          calcularTotalArqueo={calcularTotalArqueo}
          updateConteo={updateConteo}
          onCerrar={modoVisualizacion ? handleCerrarCajaAjena : handleCerrarCaja}
          onCancelar={() => setVistaActual('dashboard')}
          esCajaAjena={modoVisualizacion}
          nombreUsuarioCaja={modoVisualizacion ? cajaVisualizando?.user?.name : undefined}
          bovedasDisponibles={bovedasCierre}
          bovedaSeleccionadaId={bovedaSeleccionadaId}
          onBovedaChange={setBovedaSeleccionadaId}
          cargandoBovedas={cargandoBovedasCierre}
        />
      })()}

      {vistaActual === 'historial' && <VistaHistorial
        historial={historial}
        simboloMoneda={simboloMoneda}
        onVolver={() => setVistaActual('dashboard')}
      />}

      {/* Dialog reporte consolidado admin */}
      {canManageOtherCashRegisters && <DialogReporteConsolidado
        open={dialogConsolidado}
        onOpenChange={setDialogConsolidado}
        simboloMoneda={simboloMoneda}
      />}

      {/* Dialog para movimientos */}
      <DialogMovimiento
        open={dialogMovimiento}
        onOpenChange={setDialogMovimiento}
        billetes={billetes}
        monedas={monedas}
        simboloMoneda={simboloMoneda}
        movimientoData={movimientoData}
        setMovimientoData={setMovimientoData}
        conteoMovimiento={conteoMovimiento}
        usarDesglose={usarDesglose}
        setUsarDesglose={setUsarDesglose}
        calcularTotalMovimiento={calcularTotalMovimiento}
        updateConteoMovimiento={updateConteoMovimiento}
        onRegistrar={handleRegistrarMovimiento}
        // Integración Caja-Bóveda
        cashVaultIntegrationEnabled={cashVaultIntegrationEnabled}
        bovedas={bovedas}
        bovedaMovimientoId={bovedaMovimientoId}
        onBovedaMovimientoChange={setBovedaMovimientoId}
      />
    </div>
  )
}

// ============================================
// COMPONENTES DE VISTAS
// ============================================

function VistaDashboard({ 
  cajaActual, movimientos, totalIngresos, totalEgresos, totalEsperado, simboloMoneda,
  onAbrirCaja, onCerrarCaja, onNuevoMovimiento 
}: any) {
  if (!cajaActual) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center space-y-6">
          <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <Wallet size={48} className="text-primary" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-2xl font-bold">Caja Cerrada</h3>
            <p className="text-muted-foreground">
              Para comenzar a operar y registrar movimientos de efectivo, 
              debes realizar la apertura de caja.
            </p>
          </div>
          <Button size="lg" onClick={onAbrirCaja} className="px-8 shadow-lg">
            <PlusCircle className="mr-2" size={20} />
            Aperturar Caja del Día
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header de caja abierta */}
      <Card className="card-tint-success border">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 dark:bg-primary/30 p-3 rounded-full">
                <ClockCounterClockwise size={28} className="text-primary" weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 dark:bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 dark:bg-green-400"></span>
                  </span>
                  <p className="font-bold text-lg text-green-700 dark:text-green-300">Caja Abierta</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Apertura: {format(new Date(cajaActual.fecha_apertura), "dd/MM/yyyy", { locale: es })} — {cajaActual.hora_apertura}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto flex-shrink-0">
              <Button variant="outline" onClick={onNuevoMovimiento}>
                <Receipt className="mr-2" size={18} />
                Movimiento
              </Button>
              <Button variant="destructive" onClick={onCerrarCaja}>
                <LockKey className="mr-2" size={18} />
                Cerrar Caja
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de valores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard title="Saldo Inicial" amount={cajaActual.saldo_inicial} icon={<Bank size={20} />} />
        <SummaryCard title="Ingresos" amount={totalIngresos} color="text-green-600 dark:text-green-400" icon={<ArrowUp size={20} />} />
        <SummaryCard title="Egresos" amount={totalEgresos} color="text-red-500 dark:text-red-400" icon={<ArrowDown size={20} />} />
        <SummaryCard title="Total Esperado" amount={totalEsperado} color="text-primary" highlight icon={<Wallet size={20} />} />
      </div>

      {/* Últimos movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
          <CardDescription>Registro de operaciones del día</CardDescription>
        </CardHeader>
        <CardContent>
          <MovimientosCards movimientos={movimientos} limit={5} />
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow>
                  <TableHead className="w-[100px]">Hora</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientos.slice(0, 5).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(mov.created_at), 'HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{mov.concepto}</TableCell>
                      <TableCell>
                        <MovimientoBadge tipo={mov.tipo} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${['incremento', 'ingreso_pago'].includes(mov.tipo) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {['incremento', 'ingreso_pago'].includes(mov.tipo) ? '+' : '-'}
                          <MoneyDisplay amount={mov.monto} inline />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VistaDashboardAjena({ caja, movimientos, simboloMoneda, onCerrarCaja, onVolver, onNuevoMovimiento }: any) {
  const totalIngresos = movimientos
    .filter((m: any) => ['incremento', 'ingreso_pago'].includes(m.tipo))
    .reduce((sum: number, m: any) => sum + Number(m.monto), 0)
  const totalEgresos = movimientos
    .filter((m: any) => ['decremento', 'egreso_desembolso'].includes(m.tipo))
    .reduce((sum: number, m: any) => sum + Number(m.monto), 0)
  const totalEsperado = Number(caja.saldo_inicial) + totalIngresos - totalEgresos

  return (
    <div className="space-y-6">
      {/* Header de caja ajena */}
      <Card className="border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 dark:bg-blue-500/30 p-3 rounded-full">
                <Eye size={28} className="text-blue-600 dark:text-blue-400" weight="bold" />
              </div>
              <div>
                <p className="font-bold text-lg text-blue-700 dark:text-blue-300">
                  Caja de: {caja.user?.name || 'Usuario'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {caja.sucursal?.nombre && <span className="mr-2">📍 {caja.sucursal.nombre}</span>}
                  Apertura: {format(new Date(caja.fecha_apertura), "dd/MM/yyyy", { locale: es })} — {caja.hora_apertura}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto flex-shrink-0 flex-wrap">
              <Button variant="outline" onClick={onVolver}>
                <ArrowLeft className="mr-2" size={18} />
                Volver a mi caja
              </Button>
              <Button variant="outline" onClick={onNuevoMovimiento}>
                <Receipt className="mr-2" size={18} />
                Movimiento
              </Button>
              <Button variant="destructive" onClick={onCerrarCaja}>
                <LockKey className="mr-2" size={18} />
                Cerrar esta Caja
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de valores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard title="Saldo Inicial" amount={caja.saldo_inicial} icon={<Bank size={20} />} />
        <SummaryCard title="Ingresos" amount={totalIngresos} color="text-green-600 dark:text-green-400" icon={<ArrowUp size={20} />} />
        <SummaryCard title="Egresos" amount={totalEgresos} color="text-red-500 dark:text-red-400" icon={<ArrowDown size={20} />} />
        <SummaryCard title="Total Esperado" amount={totalEsperado} color="text-primary" highlight icon={<Wallet size={20} />} />
      </div>

      {/* Movimientos de la caja ajena */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimientos de esta Caja</CardTitle>
          <CardDescription>Movimientos registrados por {caja.user?.name || 'el usuario'}</CardDescription>
        </CardHeader>
        <CardContent>
          <MovimientosCards movimientos={movimientos} />
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow>
                  <TableHead className="w-[100px]">Hora</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientos.map((mov: any) => (
                    <TableRow key={mov.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(mov.created_at), 'HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{mov.concepto}</TableCell>
                      <TableCell>
                        <MovimientoBadge tipo={mov.tipo} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${['incremento', 'ingreso_pago'].includes(mov.tipo) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {['incremento', 'ingreso_pago'].includes(mov.tipo) ? '+' : '-'}
                          <MoneyDisplay amount={mov.monto} inline />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VistaApertura({
  cajaActual, billetes, monedas, simboloMoneda, conteoApertura, usarDesgloseApertura,
  montoInicial, calcularTotalApertura, updateConteoApertura, setUsarDesgloseApertura,
  setMontoInicial, onAperturar, onCancelar,
  // Integración Caja-Bóveda
  cashVaultIntegrationEnabled, bovedas, bovedaOrigenId, onBovedaOrigenChange
}: any) {
  if (cajaActual) {
    return (
      <Alert>
        <Warning className="h-4 w-4" />
        <AlertTitle>Ya tienes una caja abierta</AlertTitle>
        <AlertDescription>
          No puedes abrir una nueva caja mientras tengas una abierta.
          <Button variant="link" onClick={onCancelar}>Volver al Dashboard</Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-border bg-muted/30 dark:bg-table-header">
        <CardTitle className="text-xl">Apertura de Caja</CardTitle>
        <CardDescription>Ingresa el efectivo inicial para comenzar operaciones</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Información */}
        <div className="flex items-center gap-4 p-4 card-tint-info rounded-lg border">
          <div className="bg-blue-100 p-2 rounded-full">
            <Wallet size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium card-tint-info">Fecha de Apertura</p>
            <p className="text-lg font-bold card-tint-info">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Integración Caja-Bóveda: Selección de Bóveda Origen */}
        {cashVaultIntegrationEnabled && (
          <div className="space-y-2">
            <Label htmlFor="boveda-origen">Bóveda de Origen (Saldo Inicial) <span className="text-red-500">*</span></Label>
            <select
              id="boveda-origen"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={bovedaOrigenId || ''}
              onChange={(e) => onBovedaOrigenChange(Number(e.target.value) || null)}
            >
              <option value="">-- Selecciona una Bóveda --</option>
              {bovedas && bovedas.filter((b: any) => b.activa).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.nombre} ({b.codigo}) - Saldo: {simboloMoneda}{Number(b.saldo_actual).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle desglose */}
        <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-table-header rounded-lg">
          <div>
            <Label className="font-medium">Usar desglose de denominaciones</Label>
            <p className="text-sm text-muted-foreground">Contar billetes y monedas individualmente</p>
          </div>
          <Switch checked={usarDesgloseApertura} onCheckedChange={setUsarDesgloseApertura} />
        </div>

        {usarDesgloseApertura ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Billetes */}
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Billetes
              </Label>
              <div className="space-y-2">
                {billetes.map((d: Denominacion) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 bg-muted/30 dark:bg-surface rounded-lg">
                    <span className="w-14 font-bold text-green-700 dark:text-green-400">{simboloMoneda}{d.valor.toFixed(0)}</span>
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-20 h-9 text-center font-bold"
                      placeholder="0"
                      value={conteoApertura[d.valor] || ''}
                      onChange={(e) => updateConteoApertura(d.valor, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-muted-foreground">=</span>
                    <span className="font-bold flex-1 text-right">
                      {simboloMoneda}{((conteoApertura[d.valor] || 0) * d.valor).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monedas */}
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Monedas
              </Label>
              <div className="space-y-2">
                {monedas.map((d: Denominacion) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 bg-muted/30 dark:bg-surface rounded-lg">
                    <span className="w-14 font-bold text-amber-700 dark:text-amber-400">
                      {d.valor >= 1 ? `${simboloMoneda}${d.valor.toFixed(2)}` : `${(d.valor * 100).toFixed(0)}¢`}
                    </span>
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-20 h-9 text-center font-bold"
                      placeholder="0"
                      value={conteoApertura[d.valor] || ''}
                      onChange={(e) => updateConteoApertura(d.valor, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-muted-foreground">=</span>
                    <span className="font-bold flex-1 text-right">
                      {simboloMoneda}{((conteoApertura[d.valor] || 0) * d.valor).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Saldo Inicial</Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">{simboloMoneda}</span>
              <Input
                type="number"
                className="pl-8 text-lg font-bold"
                placeholder="0.00"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Total */}
        <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-lg">Total a Aperturar:</span>
            <span className="text-3xl font-black text-primary">
              {simboloMoneda}{usarDesgloseApertura ? calcularTotalApertura().toFixed(2) : (parseFloat(montoInicial) || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button onClick={onAperturar} className="flex-1">
            <Wallet className="mr-2" size={18} />
            Aperturar Caja
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function VistaMovimientos({
  cajaActual, movimientos, simboloMoneda, totalIngresos, totalEgresos, totalEsperado, onVolver,
  // Integración Caja-Bóveda
  cashVaultIntegrationEnabled
}: any) {
  if (!cajaActual) {
    return (
      <Alert>
        <Warning className="h-4 w-4" />
        <AlertTitle>Sin caja abierta</AlertTitle>
        <AlertDescription>
          No hay una caja abierta para mostrar movimientos.
          <Button variant="link" onClick={onVolver}>Volver</Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="page-toolbar">
        <h2 className="text-xl font-bold">Movimientos de Caja</h2>
        <div className="page-toolbar-actions">
          <Button variant="outline" onClick={onVolver}>← Volver</Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="card-tint-success border">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium card-tint-success">Total Ingresos</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{simboloMoneda}{totalIngresos.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="card-tint-danger border">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium card-tint-danger">Total Egresos</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{simboloMoneda}{totalEgresos.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="card-tint-info border">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium card-tint-info">Saldo Esperado</p>
            <p className="text-2xl font-bold text-primary">{simboloMoneda}{totalEsperado.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de movimientos */}
      <Card>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            <div className="p-3 flex items-center justify-between gap-2">
              <p className="font-medium">Saldo inicial</p>
              <p className="font-bold text-green-600 dark:text-green-400">{simboloMoneda}{Number(cajaActual.saldo_inicial).toFixed(2)}</p>
            </div>
            {movimientos.map((mov: MovimientoCaja) => {
              const ingreso = esIngresoMov(mov.tipo) && mov.estado === 'aplicado'
              const egreso = ['decremento', 'egreso_desembolso'].includes(mov.tipo) && mov.estado === 'aplicado'
              return (
                <div key={mov.id} className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{mov.concepto}</p>
                      <p className="text-xs text-muted-foreground font-mono">{format(new Date(mov.created_at), 'HH:mm:ss')}</p>
                    </div>
                    <MovimientoBadge tipo={mov.tipo} />
                  </div>
                  <p className={`text-right font-bold ${ingreso ? 'text-green-600 dark:text-green-400' : egreso ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                    {ingreso ? `${simboloMoneda}${Number(mov.monto).toFixed(2)}` : egreso ? `${simboloMoneda}${Number(mov.monto).toFixed(2)}` : '—'}
                  </p>
                </div>
              )
            })}
            <div className="p-3 flex items-center justify-between gap-2 bg-muted/40">
              <p className="font-bold">Saldo final</p>
              <p className="font-bold text-primary">{simboloMoneda}{totalEsperado.toFixed(2)}</p>
            </div>
          </div>
          <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-table-header">
              <TableRow>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead className="w-[100px]">Hora</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Egresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Saldo inicial */}
              <TableRow className="table-row-tint-info">
                <TableCell>1</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-medium">Saldo inicial</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right font-bold">{simboloMoneda}{Number(cajaActual.saldo_inicial).toFixed(2)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              {movimientos.map((mov: MovimientoCaja, idx: number) => (
                <TableRow key={mov.id}>
                  <TableCell>{idx + 2}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(mov.created_at), 'HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-medium">{mov.concepto}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <MovimientoBadge tipo={mov.tipo} />
                      {cashVaultIntegrationEnabled && mov.estado !== 'aplicado' && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          mov.estado === 'pendiente' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {mov.estado === 'pendiente' ? 'Pendiente Bóveda' : 'Rechazado'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400 font-bold">
                    {['incremento', 'ingreso_pago'].includes(mov.tipo) && mov.estado === 'aplicado' ? `${simboloMoneda}${Number(mov.monto).toFixed(2)}` : ''}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400 font-bold">
                    {['decremento', 'egreso_desembolso'].includes(mov.tipo) && mov.estado === 'aplicado' ? `${simboloMoneda}${Number(mov.monto).toFixed(2)}` : ''}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totales */}
              <TableRow className="bg-table-header font-bold">
                <TableCell colSpan={4}>Subtotales</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">
                  {simboloMoneda}{(Number(cajaActual.saldo_inicial) + totalIngresos).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400">
                  {simboloMoneda}{totalEgresos.toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow className="table-row-tint-warning font-bold text-lg">
                <TableCell colSpan={4}>Saldo Final</TableCell>
                <TableCell className="text-right">{simboloMoneda}0.00</TableCell>
                <TableCell className="text-right text-primary">
                  {simboloMoneda}{totalEsperado.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VistaCierre({
  cajaActual, movimientos, billetes, monedas, simboloMoneda, conteo,
  totalIngresos, totalEgresos, totalEsperado, calcularTotalArqueo, updateConteo,
  onCerrar, onCancelar, esCajaAjena, nombreUsuarioCaja,
  bovedasDisponibles = [], bovedaSeleccionadaId, onBovedaChange, cargandoBovedas
}: any) {
  const totalArqueo = calcularTotalArqueo()
  const diferencia = totalArqueo - totalEsperado

  if (!cajaActual) {
    return (
      <Alert>
        <Warning className="h-4 w-4" />
        <AlertTitle>Sin caja abierta</AlertTitle>
        <AlertDescription>
          No hay una caja para cerrar.
          <Button variant="link" onClick={onCancelar}>Volver</Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground dark:text-slate-100">
          {esCajaAjena ? `Cierre de Caja — ${nombreUsuarioCaja || 'Otro usuario'}` : 'Cierre de Caja'}
        </h2>
        <Button variant="outline" onClick={onCancelar}>← Cancelar</Button>
      </div>

      {esCajaAjena && (
        <Alert className="border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700 dark:text-blue-300">Cierre Administrativo</AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-400">
            Estás cerrando la caja de <strong>{nombreUsuarioCaja}</strong> como administrador.
          </AlertDescription>
        </Alert>
      )}

      {/* Info de caja */}
      <Card className="card-tint-warning border dark:border-amber-500/30 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground dark:text-slate-300">Usuario</p>
              <p className="font-bold text-foreground dark:text-slate-100">{cajaActual.user?.name || 'Usuario'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground dark:text-slate-300">Apertura</p>
              <p className="font-bold text-foreground dark:text-slate-100">{format(new Date(cajaActual.fecha_apertura), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground dark:text-slate-300">Saldo Inicial</p>
              <p className="font-bold text-foreground dark:text-slate-100">{simboloMoneda}{Number(cajaActual.saldo_inicial).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground dark:text-slate-300">Estado</p>
              <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded font-bold">Cierre Pendiente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de movimientos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground dark:text-slate-100">Resumen de Movimientos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-table-header dark:bg-slate-800">
                <TableRow>
                  <TableHead className="dark:text-slate-200">#</TableHead>
                  <TableHead className="dark:text-slate-200">Descripción</TableHead>
                  <TableHead className="text-right dark:text-slate-200">Ingresos</TableHead>
                  <TableHead className="text-right dark:text-slate-200">Egresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="table-row-tint-info">
                  <TableCell>1</TableCell>
                  <TableCell>Saldo inicial</TableCell>
                  <TableCell className="text-right">{simboloMoneda}{Number(cajaActual.saldo_inicial).toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>Incrementos de caja</TableCell>
                  <TableCell className="text-right">{simboloMoneda}{totalIngresos.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3</TableCell>
                  <TableCell>Decrementos de caja</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{simboloMoneda}{totalEgresos.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="bg-table-header dark:bg-slate-800 font-bold">
                  <TableCell colSpan={2} className="dark:text-slate-200">Subtotales</TableCell>
                  <TableCell className="text-right">{simboloMoneda}{(Number(cajaActual.saldo_inicial) + totalIngresos).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{simboloMoneda}{totalEgresos.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="table-row-tint-info font-bold text-lg">
                  <TableCell colSpan={2} className="dark:text-slate-200">Saldo Final Esperado</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-primary">{simboloMoneda}{totalEsperado.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Arqueo físico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground dark:text-slate-100">Arqueo Físico de Caja</CardTitle>
            <CardDescription className="dark:text-slate-400">Cuenta el efectivo físico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Billetes */}
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground dark:text-slate-300">Billetes</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {billetes.map((d: Denominacion) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <span className="w-12 text-sm font-bold text-green-700 dark:text-green-400">{simboloMoneda}{d.valor.toFixed(0)}</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-8 text-center text-sm"
                      placeholder="0"
                      value={conteo[d.valor] || ''}
                      onChange={(e) => updateConteo(d.valor, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground dark:text-slate-400">
                      = {simboloMoneda}{((conteo[d.valor] || 0) * d.valor).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monedas */}
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground dark:text-slate-300">Monedas</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {monedas.map((d: Denominacion) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <span className="w-12 text-sm font-bold text-amber-700 dark:text-amber-400">
                      {d.valor >= 1 ? `${simboloMoneda}${d.valor.toFixed(2)}` : `${(d.valor * 100).toFixed(0)}¢`}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-8 text-center text-sm"
                      placeholder="0"
                      value={conteo[d.valor] || ''}
                      onChange={(e) => updateConteo(d.valor, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground dark:text-slate-400">
                      = {simboloMoneda}{((conteo[d.valor] || 0) * d.valor).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultado */}
            <div className="pt-4 border-t dark:border-slate-700 space-y-2">
              <div className="flex justify-between text-foreground dark:text-slate-200">
                <span>Total Contado:</span>
                <span className="font-bold">{simboloMoneda}{totalArqueo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground dark:text-slate-200">
                <span>Esperado Sistema:</span>
                <span className="font-bold">{simboloMoneda}{totalEsperado.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                Math.abs(diferencia) < 0.01 ? 'card-tint-success' : diferencia > 0 ? 'card-tint-info' : 'card-tint-danger'
              } dark:bg-slate-800/50`}>
                <span className="font-bold text-foreground dark:text-slate-200">Diferencia:</span>
                <span className={`font-bold ${
                  Math.abs(diferencia) < 0.01 ? 'text-green-600 dark:text-green-400' : diferencia > 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'
                }`}>
                  {diferencia > 0 ? '+' : ''}{simboloMoneda}{diferencia.toFixed(2)}
                  {Math.abs(diferencia) < 0.01 && ' ✓ Cuadra'}
                  {diferencia > 0 && ' (Sobrante)'}
                  {diferencia < 0 && ' (Faltante)'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selección de Bóveda */}
      <Card className="border dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground dark:text-slate-100 flex items-center gap-2">
            <Bank size={18} />
            Transferir a Bóveda
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            El saldo contado se transferirá a la bóveda seleccionada al cerrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargandoBovedas ? (
            <p className="text-sm text-muted-foreground">Cargando bóvedas...</p>
          ) : bovedasDisponibles.length === 0 ? (
            <Alert className="border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40">
              <Warning className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-300">Sin bóveda disponible</AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                No hay bóvedas activas en esta sucursal. La caja se cerrará sin transferir el saldo a una bóveda.
              </AlertDescription>
            </Alert>
          ) : bovedasDisponibles.length === 1 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  {bovedasDisponibles[0].nombre}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {bovedasDisponibles[0].codigo} — Saldo actual: {simboloMoneda}{Number(bovedasDisponibles[0].saldo_actual).toFixed(2)}
                  {bovedasDisponibles[0].sucursal?.nombre ? ` — ${bovedasDisponibles[0].sucursal.nombre}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium dark:text-slate-200">Selecciona la bóveda destino</Label>
              <div className="grid gap-2">
                {bovedasDisponibles.map((b: any) => (
                  <div
                    key={b.id}
                    onClick={() => onBovedaChange(b.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      bovedaSeleccionadaId === b.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      bovedaSeleccionadaId === b.id ? 'border-primary' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {bovedaSeleccionadaId === b.id && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground dark:text-slate-100">{b.nombre}</p>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">
                        {b.codigo} — Tipo: {b.tipo} — Saldo: {simboloMoneda}{Number(b.saldo_actual).toFixed(2)}
                        {b.sucursal?.nombre ? ` — ${b.sucursal.nombre}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {!bovedaSeleccionadaId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">⚠ Debes seleccionar una bóveda para transferir el saldo</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón cerrar */}
      <Card className="bg-muted/30 dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="font-medium text-foreground dark:text-slate-100">¿Confirmar cierre de caja?</p>
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              {bovedasDisponibles.length === 0
                ? 'Se cerrará la caja sin transferencia a bóveda'
                : bovedaSeleccionadaId
                  ? 'El saldo se transferirá a la bóveda seleccionada'
                  : 'Selecciona una bóveda antes de cerrar'
              }
            </p>
          </div>
          <Button
            onClick={onCerrar}
            disabled={totalArqueo <= 0 || (bovedasDisponibles.length > 1 && !bovedaSeleccionadaId)}
            size="lg"
            className="px-8"
          >
            <LockKey className="mr-2" size={18} />
            Cerrar Caja
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function VistaHistorial({ historial, simboloMoneda, onVolver }: any) {
  return (
    <div className="space-y-4">
      <div className="page-toolbar">
        <h2 className="text-xl font-bold text-foreground dark:text-slate-100">Historial de Cierres</h2>
        <div className="page-toolbar-actions">
          <Button variant="outline" onClick={onVolver}>← Volver</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {historial.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hay registros de cierre</p>
            ) : historial.map((caja: Caja) => (
              <div key={caja.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{caja.user_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Apertura {format(new Date(caja.fecha_apertura), 'dd/MM/yyyy')}
                      {caja.fecha_cierre ? ` · Cierre ${format(new Date(caja.fecha_cierre), 'dd/MM/yyyy HH:mm')}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
                    caja.estado === 'cerrada' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {caja.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Inicial</p>
                    <p className="font-semibold">{simboloMoneda}{Number(caja.saldo_inicial).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Final</p>
                    <p className="font-semibold">{caja.saldo_final ? `${simboloMoneda}${Number(caja.saldo_final).toFixed(2)}` : '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-table-header">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Fecha Apertura</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Fecha Cierre</TableHead>
                <TableHead>Saldo Final</TableHead>
                <TableHead>Diferencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No hay registros de cierre
                  </TableCell>
                </TableRow>
              ) : (
                historial.map((caja: Caja, idx: number) => (
                  <TableRow key={caja.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{caja.user_id}</TableCell>
                    <TableCell>{format(new Date(caja.fecha_apertura), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{simboloMoneda}{Number(caja.saldo_inicial).toFixed(2)}</TableCell>
                    <TableCell>
                      {caja.fecha_cierre ? format(new Date(caja.fecha_cierre), "dd/MM/yyyy HH:mm") : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {caja.saldo_final ? `${simboloMoneda}${Number(caja.saldo_final).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className={`font-bold ${
                      (caja.diferencia || 0) < 0 ? 'text-red-500' : 
                      (caja.diferencia || 0) > 0 ? 'text-blue-500' : 'text-green-500'
                    }`}>
                      {caja.diferencia !== null ? `${simboloMoneda}${Number(caja.diferencia).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        caja.estado === 'cerrada' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {caja.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DialogMovimiento({
  open, onOpenChange, billetes, monedas, simboloMoneda, movimientoData, setMovimientoData,
  conteoMovimiento, usarDesglose, setUsarDesglose, calcularTotalMovimiento,
  updateConteoMovimiento, onRegistrar,
  // Integración Caja-Bóveda
  cashVaultIntegrationEnabled, bovedas, bovedaMovimientoId, onBovedaMovimientoChange
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {movimientoData.tipo === 'incremento' ? '💵 Registrar Ingreso' : '💸 Registrar Egreso'}
          </DialogTitle>
          <DialogDescription>
            {movimientoData.tipo === 'incremento' 
              ? 'Registrar dinero que entra a la caja'
              : 'Registrar dinero que sale de la caja'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de movimiento */}
          <div className="flex gap-2">
            <Button
              variant={movimientoData.tipo === 'incremento' ? 'default' : 'outline'}
              className={movimientoData.tipo === 'incremento' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => setMovimientoData({ ...movimientoData, tipo: 'incremento' })}
            >
              <ArrowUp className="mr-2" size={18} /> Ingreso
            </Button>
            <Button
              variant={movimientoData.tipo === 'decremento' ? 'default' : 'outline'}
              className={movimientoData.tipo === 'decremento' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => setMovimientoData({ ...movimientoData, tipo: 'decremento' })}
            >
              <ArrowDown className="mr-2" size={18} /> Egreso
            </Button>
          </div>

          {/* Integración Caja-Bóveda: Selección de Bóveda para Movimiento */}
          {cashVaultIntegrationEnabled && (
            <div className="space-y-2">
              <Label htmlFor="boveda-movimiento">
                {movimientoData.tipo === 'incremento' ? 'Solicitar de Bóveda' : 'Enviar a Bóveda'} <span className="text-red-500">*</span>
              </Label>
              <select
                id="boveda-movimiento"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={bovedaMovimientoId || ''}
                onChange={(e) => onBovedaMovimientoChange(Number(e.target.value) || null)}
              >
                <option value="">-- Selecciona una Bóveda --</option>
                {bovedas && bovedas.filter((b: any) => b.activa).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.codigo}) - Saldo: {simboloMoneda}{Number(b.saldo_actual).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle desglose */}
          <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-table-header rounded-lg">
            <Label>Usar desglose de denominaciones</Label>
            <Switch checked={usarDesglose} onCheckedChange={setUsarDesglose} />
          </div>

          {usarDesglose ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase">Billetes</Label>
                <div className="space-y-1 mt-2">
                  {billetes.map((d: Denominacion) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <span className="w-12 text-sm font-bold">{simboloMoneda}{d.valor.toFixed(0)}</span>
                      <Input
                        type="number"
                        min="0"
                        className="w-16 h-8 text-center text-sm"
                        value={conteoMovimiento[d.valor] || ''}
                        onChange={(e) => updateConteoMovimiento(d.valor, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Monedas</Label>
                <div className="space-y-1 mt-2">
                  {monedas.map((d: Denominacion) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <span className="w-12 text-sm font-bold">
                        {d.valor >= 1 ? `${simboloMoneda}${d.valor}` : `${(d.valor * 100).toFixed(0)}¢`}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        className="w-16 h-8 text-center text-sm"
                        value={conteoMovimiento[d.valor] || ''}
                        onChange={(e) => updateConteoMovimiento(d.valor, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Monto</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-2.5 font-bold">{simboloMoneda}</span>
                <Input
                  type="number"
                  className="pl-8 text-lg font-bold"
                  placeholder="0.00"
                  value={movimientoData.monto}
                  onChange={(e) => setMovimientoData({ ...movimientoData, monto: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Total */}
          {usarDesglose && (
            <div className={`p-3 rounded-lg border ${
              movimientoData.tipo === 'incremento' ? 'card-tint-success' : 'card-tint-danger'
            }`}>
              <div className="flex justify-between items-center">
                <span>Total:</span>
                <span className={`text-xl font-bold ${
                  movimientoData.tipo === 'incremento' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {movimientoData.tipo === 'incremento' ? '+' : '-'}{simboloMoneda}{calcularTotalMovimiento().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Concepto */}
          <div className="space-y-2">
            <Label>Concepto / Motivo <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe el motivo del movimiento..."
              value={movimientoData.concepto}
              onChange={(e) => setMovimientoData({ ...movimientoData, concepto: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onRegistrar}
            className={movimientoData.tipo === 'incremento' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {movimientoData.tipo === 'incremento' ? <PlusCircle className="mr-2" size={18} /> : <MinusCircle className="mr-2" size={18} />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function SummaryCard({ title, amount, color = "text-foreground", highlight = false, icon }: any) {
  return (
    <Card className={`shadow-sm ${highlight ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${highlight ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
          <p className={`text-xl font-bold ${color}`}>
            <MoneyDisplay amount={amount} />
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function esIngresoMov(tipo: string) {
  return ['incremento', 'ingreso_pago'].includes(tipo)
}

function MovimientosCards({ movimientos, limit }: { movimientos: any[]; limit?: number }) {
  const rows = typeof limit === 'number' ? movimientos.slice(0, limit) : movimientos
  if (rows.length === 0) {
    return <p className="md:hidden text-center text-muted-foreground py-8 text-sm">No hay movimientos registrados</p>
  }
  return (
    <div className="md:hidden divide-y">
      {rows.map((mov) => {
        const ingreso = esIngresoMov(mov.tipo)
        return (
          <div key={mov.id} className="p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{mov.concepto}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {format(new Date(mov.created_at), 'HH:mm')}
                </p>
              </div>
              <MovimientoBadge tipo={mov.tipo} />
            </div>
            <p className={`text-right font-bold ${ingreso ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {ingreso ? '+' : '-'}
              <MoneyDisplay amount={mov.monto} inline />
            </p>
          </div>
        )
      })}
    </div>
  )
}

function MovimientoBadge({ tipo }: { tipo: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    'incremento': { label: 'Ingreso', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    'decremento': { label: 'Egreso', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    'ingreso_pago': { label: 'Pago Recibido', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    'egreso_desembolso': { label: 'Desembolso', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' }
  }
  const config = configs[tipo] || { label: tipo, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${config.className}`}>
      {config.label}
    </span>
  )
}

// ─────────────── Dialog Reporte Consolidado ───────────────
interface DialogReporteConsolidadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  simboloMoneda: string
}

interface UsuarioDisponible {
  id: number
  name: string
  email: string
  rol: string
}

interface CajaConsolidada {
  id: number
  user_id: number
  estado: string
  saldo_inicial: number
  saldo_final: number | null
  diferencia: number | null
  fecha_apertura: string
  fecha_cierre: string | null
  total_ingresos: number
  total_egresos: number
  total_esperado: number
  total_movimientos: number
  user?: { id: number; name: string; email: string; rol: string }
  sucursal?: { id: number; nombre: string } | null
  movimientos?: any[]
}

function DialogReporteConsolidado({ open, onOpenChange, simboloMoneda }: DialogReporteConsolidadoProps) {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioDisponible[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [cajas, setCajas] = useState<CajaConsolidada[]>([])
  const [selectedCajaIds, setSelectedCajaIds] = useState<number[]>([])
  const [incluirMovimientos, setIncluirMovimientos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [estadisticas, setEstadisticas] = useState<any>(null)

  // Cargar usuarios disponibles al abrir
  useEffect(() => {
    if (open) {
      loadUsuarios()
    } else {
      // Reset state on close
      setFechaInicio('')
      setFechaFin('')
      setSelectedUserIds([])
      setSelectedCajaIds([])
      setCajas([])
      setIncluirMovimientos(false)
      setPreviewLoaded(false)
      setEstadisticas(null)
    }
  }, [open])

  const loadUsuarios = async () => {
    try {
      const res = await cajaService.reporteConsolidado({})
      setUsuarios(res.usuarios_disponibles || [])
    } catch (e: any) {
      toast.error('Error al cargar usuarios: ' + (e.message || ''))
    }
  }

  const buildFilters = () => ({
    fecha_inicio: fechaInicio || undefined,
    fecha_fin: fechaFin || undefined,
    user_ids: selectedUserIds.length > 0 ? selectedUserIds : undefined,
    caja_ids: selectedCajaIds.length > 0 ? selectedCajaIds : undefined,
    incluir_movimientos: incluirMovimientos || undefined,
  })

  const cargarPreview = async () => {
    setLoading(true)
    try {
      const res = await cajaService.reporteConsolidado(buildFilters())
      setCajas(res.cajas || [])
      setEstadisticas(res.estadisticas || null)
      setPreviewLoaded(true)
      // Limpiar selección de cajas que ya no están en resultados
      const cajaIdsValidos = new Set((res.cajas || []).map((c: any) => c.id))
      setSelectedCajaIds(prev => prev.filter(id => cajaIdsValidos.has(id)))
    } catch (e: any) {
      toast.error('Error al cargar datos: ' + (e.message || ''))
    } finally {
      setLoading(false)
    }
  }

  const descargarPDF = async () => {
    setDescargando(true)
    try {
      const blob = await cajaService.descargarConsolidadoPDF(buildFilters())
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consolidado-cajas-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF descargado exitosamente')
    } catch (e: any) {
      toast.error('Error al descargar PDF: ' + (e.message || ''))
    } finally {
      setDescargando(false)
    }
  }

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
    // Reset preview when filters change
    setPreviewLoaded(false)
  }

  const toggleCaja = (cajaId: number) => {
    setSelectedCajaIds(prev =>
      prev.includes(cajaId) ? prev.filter(id => id !== cajaId) : [...prev, cajaId]
    )
  }

  const selectAllUsers = () => {
    if (selectedUserIds.length === usuarios.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(usuarios.map(u => u.id))
    }
    setPreviewLoaded(false)
  }

  const selectAllCajas = () => {
    if (selectedCajaIds.length === cajas.length) {
      setSelectedCajaIds([])
    } else {
      setSelectedCajaIds(cajas.map(c => c.id))
    }
  }

  const cajasFiltradasPorUsuario = useMemo(() => {
    if (selectedUserIds.length === 0) return cajas
    return cajas.filter(c => selectedUserIds.includes(c.user_id))
  }, [cajas, selectedUserIds])

  const fmtMoney = (val: number) => `${simboloMoneda}${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChartBar size={20} className="text-blue-600" />
            Reporte Consolidado de Cajas
          </DialogTitle>
          <DialogDescription>
            Filtra por fechas, usuarios y cajas. Previsualiza los datos y descarga el PDF.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 pb-2">
            {/* ── Filtros de fecha ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Fecha inicio</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={e => { setFechaInicio(e.target.value); setPreviewLoaded(false) }}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Fecha fin</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={e => { setFechaFin(e.target.value); setPreviewLoaded(false) }}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* ── Selector de usuarios ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium">Usuarios (dejar vacío = todos)</Label>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllUsers}>
                  {selectedUserIds.length === usuarios.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </div>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1.5">
                {usuarios.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Cargando usuarios...</p>
                )}
                {usuarios.map(u => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedUserIds.includes(u.id)}
                      onCheckedChange={() => toggleUser(u.id)}
                    />
                    <span className="text-sm flex-1">{u.name}</span>
                    <Badge variant="outline" className="text-[10px] h-5">{u.rol}</Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Opciones adicionales ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="incluir-movimientos"
                  checked={incluirMovimientos}
                  onCheckedChange={v => { setIncluirMovimientos(v); setPreviewLoaded(false) }}
                />
                <Label htmlFor="incluir-movimientos" className="text-sm cursor-pointer">
                  Incluir detalle de movimientos
                </Label>
              </div>
            </div>

            {/* ── Botón cargar ── */}
            <Button onClick={cargarPreview} disabled={loading} className="w-full gap-2" variant="outline">
              {loading ? (
                <ArrowsClockwise size={16} className="animate-spin" />
              ) : (
                <ListBullets size={16} />
              )}
              {loading ? 'Cargando...' : 'Cargar vista previa'}
            </Button>

            {/* ── Vista previa de resultados ── */}
            {previewLoaded && estadisticas && (
              <div className="space-y-3">
                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total Cajas', value: estadisticas.total_cajas, color: 'text-blue-600' },
                    { label: 'Abiertas', value: estadisticas.cajas_abiertas, color: 'text-green-600' },
                    { label: 'Cerradas', value: estadisticas.cajas_cerradas, color: 'text-gray-600' },
                    { label: 'Movimientos', value: estadisticas.total_movimientos, color: 'text-purple-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/50 rounded-md p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total Ingresos', value: fmtMoney(estadisticas.total_ingresos || 0), color: 'text-green-600' },
                    { label: 'Total Egresos', value: fmtMoney(estadisticas.total_egresos || 0), color: 'text-red-600' },
                    { label: 'Saldo Esperado', value: fmtMoney(estadisticas.total_esperado || 0), color: 'text-blue-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/50 rounded-md p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Selector de cajas específicas */}
                {cajasFiltradasPorUsuario.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-medium">
                        Cajas encontradas ({cajasFiltradasPorUsuario.length})
                        {selectedCajaIds.length > 0 && (
                          <span className="text-blue-600 ml-1">— {selectedCajaIds.length} seleccionadas para PDF</span>
                        )}
                      </Label>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllCajas}>
                        {selectedCajaIds.length === cajas.length ? 'Deseleccionar' : 'Seleccionar todas'}
                      </Button>
                    </div>
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[10px]">
                            <TableHead className="w-8 px-2"></TableHead>
                            <TableHead className="px-2 text-[10px]">Usuario</TableHead>
                            <TableHead className="px-2 text-[10px]">Sucursal</TableHead>
                            <TableHead className="px-2 text-[10px]">Estado</TableHead>
                            <TableHead className="px-2 text-[10px] text-right">Saldo Ini.</TableHead>
                            <TableHead className="px-2 text-[10px] text-right">Ingresos</TableHead>
                            <TableHead className="px-2 text-[10px] text-right">Egresos</TableHead>
                            <TableHead className="px-2 text-[10px]">Apertura</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cajasFiltradasPorUsuario.map(caja => (
                            <TableRow key={caja.id} className="text-xs">
                              <TableCell className="px-2">
                                <Checkbox
                                  checked={selectedCajaIds.includes(caja.id)}
                                  onCheckedChange={() => toggleCaja(caja.id)}
                                />
                              </TableCell>
                              <TableCell className="px-2 font-medium">{caja.user?.name || '—'}</TableCell>
                              <TableCell className="px-2">{caja.sucursal?.nombre || '—'}</TableCell>
                              <TableCell className="px-2">
                                <Badge variant={caja.estado === 'abierta' ? 'default' : 'secondary'} className="text-[9px] h-4">
                                  {caja.estado}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-2 text-right">{fmtMoney(caja.saldo_inicial)}</TableCell>
                              <TableCell className="px-2 text-right text-green-600">{fmtMoney(caja.total_ingresos)}</TableCell>
                              <TableCell className="px-2 text-right text-red-600">{fmtMoney(caja.total_egresos)}</TableCell>
                              <TableCell className="px-2 text-[10px]">
                                {format(new Date(caja.fecha_apertura), 'dd/MM/yy HH:mm')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {cajasFiltradasPorUsuario.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-6">
                    No se encontraron cajas con los filtros seleccionados
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={descargarPDF}
            disabled={descargando || (!previewLoaded && !fechaInicio && !fechaFin)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {descargando ? (
              <ArrowsClockwise size={16} className="animate-spin" />
            ) : (
              <FilePdf size={16} />
            )}
            {descargando ? 'Generando...' : 'Descargar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
