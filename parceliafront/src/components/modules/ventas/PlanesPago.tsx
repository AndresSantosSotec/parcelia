import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, CurrencyDollar, CheckCircle, ArrowsClockwise, Warning, Eye, List, SquaresFour, FilePdf, Receipt, Spinner, XCircle } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ventaService, api } from '@/lib/api'
import { cajaService } from '@/lib/services/caja.service'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface CuotaAPI {
  id: number
  numero_cuota: number
  fecha_vencimiento: string
  fecha_pago?: string | null
  estado: string
  monto_cuota_proyectado?: number
  monto_total_pagado?: number
  monto_pendiente?: number
}

interface PlanPagoAPI {
  id: number
  numero_credito?: string
  estado: string
  venta?: { id: number; codigo_venta?: string; cliente_nombre?: string }
  cliente?: { id: number; nombre_completo?: string }
  monto_venta?: number
  enganche?: number
  total_credito?: number
  saldo_actual?: number
  numero_cuotas?: number
  cuotas_pagadas?: number
  cuotas_pendientes?: number
  monto_cuota?: number
  fecha_vencimiento?: string
  cuotas?: CuotaAPI[]
}

function formatFecha (fecha: string | undefined) {
  if (!fecha) return '—'
  try {
    return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
  } catch {
    return fecha
  }
}

export function PlanesPago() {
  const [planes, setPlanes] = useState<PlanPagoAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanPagoAPI | null>(null)
  const [cuotaAPagar, setCuotaAPagar] = useState<CuotaAPI | null>(null)
  const [dialogPagoAbierto, setDialogPagoAbierto] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [observacion, setObservacion] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [cajaId, setCajaId] = useState<number | null>(null)
  const [cajaError, setCajaError] = useState<string | null>(null)
  const [vista, setVista] = useState<'tabla' | 'tarjetas'>('tabla')
  /** Si true, al hacer pago parcial se genera una nueva cuota con el restante + intereses y gastos */
  const [generarNuevaCuotaRestante, setGenerarNuevaCuotaRestante] = useState(false)
  /** IDs de cuotas seleccionadas para pago múltiple */
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<number[]>([])
  /** Última cuota pagada (para ofrecer descarga de recibo) */
  const [ultimaCuotaPagadaId, setUltimaCuotaPagadaId] = useState<string | null>(null)
  /** Estado de descarga de recibo */
  const [descargandoRecibo, setDescargandoRecibo] = useState<string | null>(null)

  // Estados para anular/cancelar venta al crédito
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false)
  const [planACancelar, setPlanACancelar] = useState<PlanPagoAPI | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [cancelando, setCancelando] = useState(false)

  const abrirCancelar = (plan: PlanPagoAPI) => {
    setPlanACancelar(plan)
    setMotivoCancelacion('')
    setModalCancelarAbierto(true)
  }

  const cerrarCancelar = () => {
    setModalCancelarAbierto(false)
    setPlanACancelar(null)
  }

  const confirmarCancelar = async () => {
    if (!planACancelar || !planACancelar.venta?.id) return
    try {
      setCancelando(true)
      const resp = await ventaService.cancelar(String(planACancelar.venta.id), {
        motivo: motivoCancelacion,
      })
      if (resp?.success) {
        toast.success('Venta y crédito anulados exitosamente. Las prendas han regresado a inventario.')
        cerrarCancelar()
        cerrarDialog()
        await cargarPlanes()
      } else {
        toast.error(resp.message || 'Error al cancelar')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar el crédito')
    } finally {
      setCancelando(false)
    }
  }

  const descargarReciboCuota = async (cuotaId: string) => {
    setDescargandoRecibo(cuotaId)
    try {
      const blob = await ventaService.generarReciboCuota(cuotaId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Recibo_Cuota_${cuotaId}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Recibo descargado')
    } catch {
      toast.error('Error al descargar el recibo')
    } finally {
      setDescargandoRecibo(null)
    }
  }

  const obtenerCajaAbierta = async (): Promise<number | null> => {
    try {
      const { estado, caja } = await cajaService.checkEstado()
      if (estado === 'abierta' && caja?.id) return caja.id
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('Unauthenticated') || msg.includes('401') || msg.includes('Sesión')) {
        setCajaError('Sesión expirada o no autorizada. Inicie sesión de nuevo.')
      } else {
        setCajaError('No se pudo verificar la caja. Debe tener una caja abierta para registrar el pago.')
      }
    }
    return null
  }

  const cargarPlanes = async () => {
    try {
      setLoading(true)
      const response = await ventaService.getPlanesPago()
      if (response?.success && Array.isArray(response.data)) {
        setPlanes(response.data)
      } else {
        setPlanes([])
      }
    } catch (error) {
      console.error('Error cargando planes de pago:', error)
      toast.error('Error al cargar planes de pago')
      setPlanes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarPlanes()
  }, [])

  useEffect(() => {
    if (!planSeleccionado?.cuotas || cuotasSeleccionadas.length !== 1) {
      if (cuotasSeleccionadas.length !== 1) setCuotaAPagar(null)
      return
    }
    const id = cuotasSeleccionadas[0]
    const c = planSeleccionado.cuotas.find(x => x.id === id)
    if (c) {
      setCuotaAPagar(c)
      setMontoPago(String(c.monto_pendiente ?? c.monto_cuota_proyectado ?? 0))
    }
  }, [cuotasSeleccionadas, planSeleccionado?.cuotas])

  /** Abre el modal de pago con la primera cuota pendiente (o la cuota indicada para pago adelantado/parcial). */
  const abrirModalPago = async (plan: PlanPagoAPI, cuotaSeleccionada?: CuotaAPI) => {
    const pendientes = (plan.cuotas || []).filter(
      c => c.estado !== 'pagada' && (c.monto_pendiente ?? 0) > 0
    )
    const cuota = cuotaSeleccionada ?? pendientes[0]
    if (!cuota) {
      toast.info('No hay cuotas pendientes en este plan')
      return
    }
    setCajaError(null)
    const cid = await obtenerCajaAbierta()
    setCajaId(cid ?? null)
    setPlanSeleccionado(plan)
    setCuotaAPagar(cuota)
    setMontoPago(String(cuota.monto_pendiente ?? cuota.monto_cuota_proyectado ?? plan.monto_cuota ?? 0))
    setObservacion('')
    setCuotasSeleccionadas([cuota.id])
    setDialogPagoAbierto(true)
  }

  /** Desde el detalle del plan, elegir una cuota para pagar (normal, parcial o adelantado). */
  const elegirCuotaParaPagar = (cuota: CuotaAPI) => {
    if (cuota.estado === 'pagada' || (cuota.monto_pendiente ?? 0) <= 0) return
    setCuotaAPagar(cuota)
    setMontoPago(String(cuota.monto_pendiente ?? cuota.monto_cuota_proyectado ?? 0))
    setObservacion('')
    setCuotasSeleccionadas(prev => (prev.includes(cuota.id) ? prev : [...prev, cuota.id]))
  }

  /** Cuotas que se pueden seleccionar para pagar (no pagadas, con saldo). */
  const esSeleccionable = (c: CuotaAPI) =>
    c.estado !== 'pagada' && (c.monto_pendiente ?? c.monto_cuota_proyectado ?? 0) > 0

  /** Total a pagar por las cuotas seleccionadas (en tiempo real). */
  const totalAPagar = useMemo(() => {
    if (!planSeleccionado?.cuotas) return 0
    return planSeleccionado.cuotas
      .filter(c => cuotasSeleccionadas.includes(c.id))
      .reduce((sum, c) => sum + Number(c.monto_pendiente ?? c.monto_cuota_proyectado ?? 0), 0)
  }, [cuotasSeleccionadas, planSeleccionado?.cuotas])

  /** Cuántas de las seleccionadas son por adelantado. */
  const cuotasAdelantadasCount = useMemo(() => {
    if (!planSeleccionado?.cuotas) return 0
    const hoy = new Date()
    return planSeleccionado.cuotas.filter(
      c =>
        cuotasSeleccionadas.includes(c.id) &&
        c.estado !== 'pagada' &&
        c.fecha_vencimiento &&
        new Date(c.fecha_vencimiento) > hoy
    ).length
  }, [cuotasSeleccionadas, planSeleccionado?.cuotas])

  const toggleCuota = (cuotaId: number) => {
    setCuotasSeleccionadas(prev =>
      prev.includes(cuotaId) ? prev.filter(id => id !== cuotaId) : [...prev, cuotaId]
    )
  }

  const seleccionarTodasPendientes = () => {
    if (!planSeleccionado?.cuotas) return
    const ids = planSeleccionado.cuotas.filter(esSeleccionable).map(c => c.id)
    setCuotasSeleccionadas(ids)
  }

  const limpiarSeleccion = () => setCuotasSeleccionadas([])

  /** Descarga el PDF del plan de pagos (desde tabla, tarjetas o modal de detalle). */
  const descargarPlanPagosPDF = async (plan?: PlanPagoAPI | null) => {
    const p = plan ?? planSeleccionado
    const ventaId = p?.venta?.id
    if (!ventaId) {
      toast.error('No se puede generar el PDF para este plan')
      return
    }
    try {
      const codigo = p?.venta?.codigo_venta || `Venta-${ventaId}`
      await api.downloadFile(`/ventas/${ventaId}/plan-pagos-pdf`, `Plan_Pagos_${codigo}.pdf`)
      toast.success('Descarga iniciada')
    } catch (e: any) {
      toast.error(e?.message || 'Error al descargar el PDF')
    }
  }

  /** True si la cuota está vencida (fecha_vencimiento < hoy). */
  const cuotaVencida = (c: CuotaAPI) => {
    if (!c.fecha_vencimiento) return false
    return new Date(c.fecha_vencimiento) < new Date() && c.estado !== 'pagada'
  }
  /** True si la cuota es futura (fecha_vencimiento > hoy). */
  const cuotaFutura = (c: CuotaAPI) => {
    if (!c.fecha_vencimiento) return false
    return new Date(c.fecha_vencimiento) > new Date()
  }

  const handleVerDetalles = async (plan: PlanPagoAPI) => {
    setCajaError(null)
    const cid = await obtenerCajaAbierta()
    setCajaId(cid ?? null)
    setPlanSeleccionado(plan)
    setCuotaAPagar(null)
    setCuotasSeleccionadas([])
    setMontoPago('')
    setDialogPagoAbierto(true)
  }

  const cerrarDialog = () => {
    if (!registrando) {
      setDialogPagoAbierto(false)
      setPlanSeleccionado(null)
      setCuotaAPagar(null)
      setMontoPago('')
      setObservacion('')
      setGenerarNuevaCuotaRestante(false)
      setCuotasSeleccionadas([])
      setCajaId(null)
      setCajaError(null)
    }
  }

  const registrarPago = async () => {
    if (!planSeleccionado) return

    const cid = cajaId ?? (await obtenerCajaAbierta())
    if (cid == null) {
      toast.error(cajaError || 'Debe tener una caja abierta para registrar el pago. Si su sesión expiró, inicie sesión de nuevo.')
      return
    }
    if (cid !== cajaId) setCajaId(cid)

    const usarMulti = cuotasSeleccionadas.length >= 1
    const unaSolaCuota = cuotasSeleccionadas.length === 1
    const monto = parseFloat(montoPago)
    const montoValido = !isNaN(monto) && monto > 0

    if (unaSolaCuota && cuotaAPagar && montoValido) {
      try {
        setRegistrando(true)
        const resp = await ventaService.pagarCuota(String(cuotaAPagar.id), {
          monto,
          caja_id: cid,
          observacion: observacion || undefined,
          ...(generarNuevaCuotaRestante ? { generar_nueva_cuota_restante: true } : {}),
        })
        if (resp?.success) {
          const liquidado = (resp as any).data?.liquidado === true
          toast.success(
            liquidado
              ? '¡Crédito liquidado! El plan de pagos ha pasado a realizadas.'
              : (resp.message || 'Pago registrado correctamente')
          )
          const cuotaIdStr = String(cuotaAPagar.id)
          setUltimaCuotaPagadaId(cuotaIdStr)
          // Descargar recibo automáticamente al momento del pago
          try {
            await descargarReciboCuota(cuotaIdStr)
          } catch {
            // El error ya se muestra dentro de descargarReciboCuota
          }
          cerrarDialog()
          await cargarPlanes()
        } else {
          toast.error((resp as any)?.message || 'Error al registrar el pago')
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Error al registrar el pago')
      } finally {
        setRegistrando(false)
      }
      return
    }

    if (!usarMulti || cuotasSeleccionadas.length === 0) {
      if (cuotasSeleccionadas.length === 0) toast.error('Seleccione al menos una cuota para pagar')
      else if (unaSolaCuota && !montoValido) toast.error('Ingrese un monto válido')
      return
    }

    try {
      setRegistrando(true)
      const resp = await ventaService.pagarMultipleCuotas({
        cuota_ids: cuotasSeleccionadas,
        caja_id: cid,
        observacion: observacion || undefined,
      })
if (resp?.success) {
            const ventaCompletada = (resp as any).data?.venta_completada === true
            toast.success(
              ventaCompletada
                ? '¡Crédito liquidado! El plan de pagos ha pasado a realizadas.'
                : (resp.message || 'Pago registrado correctamente')
            )
            // Descargar recibo automáticamente al momento del pago (primera cuota del lote)
            if (cuotasSeleccionadas.length > 0) {
              const primeraCuotaId = String(cuotasSeleccionadas[0])
              setUltimaCuotaPagadaId(primeraCuotaId)
              try {
                await descargarReciboCuota(primeraCuotaId)
              } catch {
                // El error ya se muestra dentro de descargarReciboCuota
              }
            }
            cerrarDialog()
            await cargarPlanes()
          } else {
        toast.error((resp as any)?.message || 'Error al registrar el pago')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Error al registrar el pago')
    } finally {
      setRegistrando(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <ArrowsClockwise className="mx-auto mb-4 animate-spin text-muted-foreground" size={48} />
        <p className="text-muted-foreground">Cargando planes de pago...</p>
      </Card>
    )
  }

  if (planes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CreditCard className="mx-auto mb-4 text-muted-foreground" size={64} />
        <p className="text-lg font-medium mb-2">No hay planes de pago activos</p>
        <p className="text-muted-foreground text-sm sm:text-base">
          Los planes de pago aparecerán aquí cuando se generen (ventas a crédito con plan generado).
        </p>
      </Card>
    )
  }

  const getPlanInfo = (plan: PlanPagoAPI) => {
    const venta = plan.venta
    const codigoVenta = venta?.codigo_venta ?? plan.numero_credito ?? `#${plan.id}`
    const clienteNombre = plan.cliente?.nombre_completo ?? venta?.cliente_nombre ?? '—'
    const total = Number(plan.monto_venta ?? plan.total_credito ?? 0)
    const enganche = Number(plan.enganche ?? 0)
    const financiado = Number(plan.total_credito ?? total - enganche)
    const cuotasPagadas = plan.cuotas_pagadas ?? 0
    const cuotasTotales = plan.numero_cuotas ?? (plan.cuotas?.length ?? 0)
    const cuotasPendientes = (plan.cuotas ?? []).filter(
      c => c.estado !== 'pagada' && (c.monto_pendiente ?? 0) > 0
    )
    const proximaCuota = cuotasPendientes[0]
    const saldoPendiente = Number(plan.saldo_actual ?? 0)
    return { codigoVenta, clienteNombre, total, enganche, financiado, cuotasPagadas, cuotasTotales, cuotasPendientes, proximaCuota, saldoPendiente }
  }

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, string> = { vigente: 'Vigente', en_mora: 'En mora', vencido: 'Vencido', pagado: 'Pagado' }
    const label = map[estado] ?? estado
    const variant = estado === 'en_mora' || estado === 'vencido' ? 'destructive' : 'outline'
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <>
      {/* Banner de descarga de recibo tras un pago exitoso */}
      {ultimaCuotaPagadaId && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <span className="flex-1">Pago registrado correctamente.</span>
          <Button
            size="sm"
            variant="outline"
            className="border-green-400 text-green-700 hover:bg-green-100"
            disabled={descargandoRecibo === ultimaCuotaPagadaId}
            onClick={() => descargarReciboCuota(ultimaCuotaPagadaId)}
          >
            {descargandoRecibo === ultimaCuotaPagadaId
              ? <Spinner className="h-3 w-3 mr-1 animate-spin" />
              : <Receipt className="h-3 w-3 mr-1" />
            }
            Descargar Recibo
          </Button>
          <Button size="sm" variant="ghost" className="text-green-700 h-7 w-7 p-0" onClick={() => setUltimaCuotaPagadaId(null)}>✕</Button>
        </div>
      )}
      <div className="space-y-4">
        <Tabs value={vista} onValueChange={v => setVista(v as 'tabla' | 'tarjetas')} className="w-full">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList>
              <TabsTrigger value="tabla" className="gap-1.5">
                <List size={18} />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="tarjetas" className="gap-1.5">
                <SquaresFour size={18} />
                Tarjetas
              </TabsTrigger>
            </TabsList>
          </div>

          {vista === 'tabla' && (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Enganche</TableHead>
                    <TableHead className="text-right">Financiado</TableHead>
                    <TableHead className="text-center">Cuotas</TableHead>
                    <TableHead className="text-right">Próx. cuota</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="w-[90px]">Estado</TableHead>
                    <TableHead className="w-[180px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No hay planes de pago
                      </TableCell>
                    </TableRow>
                  ) : (
                    planes.map(plan => {
                      const info = getPlanInfo(plan)
                      return (
                        <TableRow key={plan.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">{info.codigoVenta}</TableCell>
                          <TableCell className="font-medium">{info.clienteNombre}</TableCell>
                          <TableCell className="text-right"><MoneyDisplay amount={info.total} size="sm" /></TableCell>
                          <TableCell className="text-right"><MoneyDisplay amount={info.enganche} size="sm" /></TableCell>
                          <TableCell className="text-right"><MoneyDisplay amount={info.financiado} size="sm" /></TableCell>
                          <TableCell className="text-center">{info.cuotasPagadas}/{info.cuotasTotales}</TableCell>
                          <TableCell className="text-right">
                            {info.proximaCuota ? (
                              <MoneyDisplay amount={info.proximaCuota.monto_pendiente ?? info.proximaCuota.monto_cuota_proyectado ?? 0} size="sm" />
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold"><MoneyDisplay amount={info.saldoPendiente} size="sm" className="text-amber-600" /></TableCell>
                          <TableCell>{getEstadoBadge(plan.estado)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleVerDetalles(plan) }} title="Ver detalle">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); descargarPlanPagosPDF(plan) }} title="Descargar plan de pagos (PDF)">
                                <FilePdf className="h-4 w-4" />
                              </Button>
                               <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); abrirModalPago(plan) }} disabled={info.cuotasPendientes.length === 0} title="Registrar pago">
                                <CurrencyDollar className="h-4 w-4" />
                                Pagar
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); abrirCancelar(plan) }} title="Anular Venta / Crédito">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {vista === 'tarjetas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {planes.map(plan => {
                const info = getPlanInfo(plan)
                return (
                  <Card
                    key={plan.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVerDetalles(plan)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base sm:text-lg line-clamp-1">{info.codigoVenta}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{info.clienteNombre}</p>
                        </div>
                        <Badge variant="outline">{info.cuotasPagadas}/{info.cuotasTotales}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <MoneyDisplay amount={info.total} size="sm" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Enganche:</span>
                          <MoneyDisplay amount={info.enganche} size="sm" />
                        </div>
                        <div className="flex justify-between font-semibold pt-2 border-t">
                          <span>Saldo pendiente:</span>
                          <MoneyDisplay amount={info.saldoPendiente} size="md" className="text-warning" />
                        </div>
                      </div>
                      {info.proximaCuota && (
                        <div className="bg-muted p-3 rounded text-xs">
                          <p className="font-semibold mb-1">Próxima: Cuota #{info.proximaCuota.numero_cuota}</p>
                          <div className="flex justify-between">
                            <MoneyDisplay amount={info.proximaCuota.monto_pendiente ?? info.proximaCuota.monto_cuota_proyectado ?? 0} size="sm" />
                            <span className="text-muted-foreground">Vence: {formatFecha(info.proximaCuota.fecha_vencimiento)}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="flex-1"
                          variant="outline"
                          size="sm"
                          onClick={e => { e.stopPropagation(); descargarPlanPagosPDF(plan) }}
                        >
                          <FilePdf weight="bold" />
                          Plan PDF
                        </Button>
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={e => { e.stopPropagation(); abrirModalPago(plan) }}
                          disabled={info.cuotasPendientes.length === 0}
                        >
                          <CurrencyDollar weight="bold" />
                          Registrar pago
                        </Button>
                        <Button
                          className="flex-1"
                          variant="destructive"
                          size="sm"
                          onClick={e => { e.stopPropagation(); abrirCancelar(plan) }}
                        >
                          <XCircle weight="bold" />
                          Anular
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </Tabs>
      </div>

      {planSeleccionado && (
        <Dialog open={dialogPagoAbierto} onOpenChange={open => (!open ? cerrarDialog() : null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="text-primary" />
                Pago de cuotas — {planSeleccionado.venta?.codigo_venta}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>Cliente: {planSeleccionado.cliente?.nombre_completo ?? planSeleccionado.venta?.cliente_nombre ?? '—'}</span>
                <div className="flex gap-2">
                  {planSeleccionado.venta?.id && (
                    <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => descargarPlanPagosPDF()}>
                      <FilePdf size={16} />
                      Descargar PDF
                    </Button>
                  )}
                  {planSeleccionado.venta?.id && (
                    <Button type="button" variant="destructive" size="sm" className="gap-1 shrink-0" onClick={() => abrirCancelar(planSeleccionado)}>
                      <XCircle size={16} />
                      Anular Venta
                    </Button>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {cajaError && (
              <Alert variant="destructive" className="flex items-start gap-2">
                <Warning className="h-4 w-4 mt-0.5 shrink-0" />
                <AlertDescription>{cajaError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-medium"><MoneyDisplay amount={Number(planSeleccionado.monto_venta ?? planSeleccionado.total_credito ?? 0)} className="inline" /></p>
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo pendiente:</span>
                  <p className="font-medium text-warning"><MoneyDisplay amount={Number(planSeleccionado.saldo_actual ?? 0)} className="inline" /></p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Selecciona las cuotas a pagar</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto rounded border bg-muted/30 p-2">
                  {(planSeleccionado.cuotas ?? []).map(cuota => {
                    const seleccionable = esSeleccionable(cuota)
                    const esPagada = cuota.estado === 'pagada'
                    const seleccionada = cuotasSeleccionadas.includes(cuota.id)
                    const montoCuota = cuota.monto_pendiente ?? cuota.monto_cuota_proyectado ?? 0
                    return (
                      <div
                        key={cuota.id}
                        onClick={() => seleccionable && toggleCuota(cuota.id)}
                        className={`flex items-center gap-3 p-3 rounded border text-sm transition-colors ${
                          esPagada
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 opacity-80 cursor-default'
                            : seleccionada
                              ? 'bg-primary/10 border-primary cursor-pointer hover:bg-primary/15'
                              : 'bg-background border-border cursor-pointer hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionada}
                          disabled={!seleccionable}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-input shrink-0 pointer-events-none"
                          aria-label={`Cuota ${cuota.numero_cuota}`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">Cuota #{cuota.numero_cuota}</span>
                          <span className="text-muted-foreground ml-2">{formatFecha(cuota.fecha_vencimiento)}</span>
                          <span className="ml-2"><MoneyDisplay amount={montoCuota} size="sm" className="inline" /></span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {esPagada && (
                            <>
                              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/40">Pagada</Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                title="Reimprimir recibo"
                                disabled={descargandoRecibo === String(cuota.id)}
                                onClick={e => { e.stopPropagation(); descargarReciboCuota(String(cuota.id)) }}
                              >
                                {descargandoRecibo === String(cuota.id)
                                  ? <Spinner className="h-3 w-3 animate-spin" />
                                  : <Receipt className="h-3 w-3" />
                                }
                              </Button>
                            </>
                          )}
                          {seleccionable && cuotaVencida(cuota) && (
                            <Badge variant="destructive">Vencida</Badge>
                          )}
                          {seleccionable && cuota.estado === 'pagada_parcial' && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40">Abono</Badge>
                          )}
                          {seleccionable && !cuotaVencida(cuota) && cuota.estado !== 'pagada_parcial' && cuotaFutura(cuota) && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40">Adelantado</Badge>
                          )}
                          {seleccionable && !cuotaVencida(cuota) && cuota.estado !== 'pagada_parcial' && !cuotaFutura(cuota) && (
                            <Badge variant="secondary">Pend.</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={seleccionarTodasPendientes}>
                    Seleccionar todas
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={limpiarSeleccion}>
                    Limpiar selección
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cuotas seleccionadas:</span>
                  <span className="font-medium">{cuotasSeleccionadas.length}</span>
                </div>
                {cuotasAdelantadasCount > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚡ {cuotasAdelantadasCount} cuota(s) por adelantado
                  </p>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Total a pagar:</span>
                  <MoneyDisplay amount={totalAPagar} className="text-xl font-bold text-primary" />
                </div>
              </div>

              {cuotasSeleccionadas.length === 1 && (() => {
                const c = (planSeleccionado.cuotas ?? []).find(x => x.id === cuotasSeleccionadas[0])
                if (!c || !esSeleccionable(c)) return null
                const totalCuota = c.monto_pendiente ?? c.monto_cuota_proyectado ?? 0
                return (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold">Pago de una cuota (opcional: abono parcial / pago con excedente)</h4>
                    <Label>Monto a pagar (Q) — deje el total, ingrese un abono parcial o un pago mayor (excedente)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={planSeleccionado.saldo_actual}
                      value={montoPago}
                      onChange={e => {
                        setMontoPago(e.target.value)
                        setCuotaAPagar(c)
                      }}
                      placeholder="0.00"
                    />
                    {(parseFloat(montoPago) || 0) > 0 && (parseFloat(montoPago) || 0) < totalCuota - 0.01 && (
                      <div className="flex items-start gap-2 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                        <input
                          type="checkbox"
                          id="generar-nueva-cuota"
                          checked={generarNuevaCuotaRestante}
                          onChange={e => setGenerarNuevaCuotaRestante(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-input"
                        />
                        <label htmlFor="generar-nueva-cuota" className="text-sm cursor-pointer">
                          Generar nueva cuota con el saldo restante más intereses y gastos.
                        </label>
                      </div>
                    )}
                    {(parseFloat(montoPago) || 0) > totalCuota + 0.01 && (
                      <div className="flex items-start gap-2 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 text-green-800 dark:text-green-200">
                        <CheckCircle className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Pago con excedente:</strong> El excedente de <MoneyDisplay amount={(parseFloat(montoPago) || 0) - totalCuota} className="inline font-bold" /> se distribuirá automáticamente en cascada en las siguientes cuotas del plan de pagos.
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <Label>Observación (opcional)</Label>
              <Input
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Ej. Pago cuotas 1-3"
              />

              {cuotasAdelantadasCount > 0 && (
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <Warning className="h-4 w-4" />
                  <AlertDescription>
                    Está pagando {cuotasAdelantadasCount} cuota(s) antes de su vencimiento.
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={cerrarDialog} disabled={registrando}>
                  Cancelar
                </Button>
                <Button
                  onClick={registrarPago}
                  disabled={registrando || cuotasSeleccionadas.length === 0}
                >
                  {registrando
                    ? 'Registrando...'
                    : `Confirmar Q ${Number(cuotasSeleccionadas.length === 1 && (parseFloat(montoPago) || 0) > 0 ? parseFloat(montoPago) : totalAPagar).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialogo Confirmación Cancelación de Venta/Crédito */}
      {planACancelar && (
        <Dialog open={modalCancelarAbierto} onOpenChange={open => (!open ? cerrarCancelar() : null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Warning size={20} />
                Anular Venta y Crédito
              </DialogTitle>
              <DialogDescription>
                Se anulará la venta <strong className="font-mono">{planACancelar.venta?.codigo_venta}</strong>. Las prendas volverán al inventario en estado disponible para venta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de la anulación:</Label>
                <Input
                  id="motivo"
                  value={motivoCancelacion}
                  onChange={e => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej. El cliente ya no continuará pagando..."
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={cerrarCancelar} disabled={cancelando}>
                Cerrar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmarCancelar}
                disabled={cancelando || !motivoCancelacion.trim()}
              >
                {cancelando ? 'Cancelando...' : 'Confirmar Anulación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
