import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/hooks/use-permissions'
import { AvisoCaja, useCajaOperable } from '@/components/shared/AvisoCaja'
import { Plus, Handshake, Calculator, Receipt, User, Package, Calendar, CurrencyDollar, CheckCircle, Clock, ArrowRight, Eye, ShieldCheck, Wallet, Printer, FileText, XCircle, DownloadSimple, WarningCircle, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api, negociacionService, loteService, clienteService, pagoTerrenoService, moraInmobiliariaService, Negociacion, Lote, SimuladorResponse, ParametrizacionMoraInmo } from '@/lib/api'
import type { Cliente } from '@/lib/types'
import { cajaService } from '@/lib/services/caja.service'
import { useNavigateModule } from '@/hooks/use-navigate-module'
import { GastosCreditoSelector } from '@/components/modules/gastos/GastosCreditoSelector'
import { CLAVE_VENTA_DESDE_PLANO, CLAVE_VER_NEGOCIACION } from '@/components/modules/lotificacion/estadosLote'

function cuotasPlan(neg: any): any[] {
  const rows = neg?.planPagos ?? neg?.plan_pagos ?? []
  return Array.isArray(rows) ? rows : []
}

function normalizarNegociacion(neg: any): Negociacion {
  return {
    ...neg,
    planPagos: cuotasPlan(neg),
  }
}

function formatFechaCorta(valor?: string | null) {
  if (!valor) return '—'
  const soloFecha = String(valor).slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
    const [anio, mes, dia] = soloFecha.split('-').map(Number)
    const dLocal = new Date(anio, mes - 1, dia)
    if (!Number.isNaN(dLocal.getTime())) {
      return dLocal.toLocaleDateString('es-GT')
    }
  }
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return soloFecha
  return d.toLocaleDateString('es-GT')
}

function normalizarInputFecha(valor?: string | null) {
  if (!valor) return ''
  const soloFecha = String(valor).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha) ? soloFecha : ''
}

const PERIODOS_PAGO = [
  { value: 'mensual', label: 'Mensual', meses: 1 },
  { value: 'bimestral', label: 'Bimestral', meses: 2 },
  { value: 'trimestral', label: 'Trimestral', meses: 3 },
  { value: 'cuatrimestral', label: 'Cuatrimestral', meses: 4 },
  { value: 'quimestral', label: 'Quimestral', meses: 5 },
  { value: 'semestral', label: 'Semestral', meses: 6 },
  { value: 'anual', label: 'Anual', meses: 12 },
] as const

function mesesDePeriodo(valor?: string) {
  return PERIODOS_PAGO.find((p) => p.value === valor)?.meses ?? 1
}

function etiquetaPeriodo(valor?: string) {
  return PERIODOS_PAGO.find((p) => p.value === valor)?.label ?? 'Mensual'
}

function numeroCuotasPeriodo(plazo: number, periodo?: string) {
  return Math.max(1, Math.ceil(Math.max(1, plazo) / mesesDePeriodo(periodo)))
}

function etiquetaTipo(tipo?: string) {
  if (tipo === 'credito') return 'A plazo / Financiamiento'
  if (tipo === 'contado') return 'Contado'
  if (tipo === 'reserva') return 'Reserva'
  return tipo || ''
}

function MarcaTipo({ tipo }: { tipo?: string }) {
  if (tipo === 'contado') {
    return <Badge className="border-sky-500/50 bg-sky-500/20 font-semibold text-sky-900 dark:text-sky-100">Contado</Badge>
  }
  if (tipo === 'credito') {
    return <Badge className="border-violet-500/50 bg-violet-500/20 font-semibold text-violet-900 dark:text-violet-100">A plazo / crédito</Badge>
  }
  return <Badge className="border-amber-500/50 bg-amber-500/20 font-semibold text-amber-900 dark:text-amber-100">Reserva</Badge>
}

function tonoTipo(tipo?: string) {
  if (tipo === 'contado') return 'border-l-4 border-l-sky-500 bg-sky-500/10'
  if (tipo === 'credito') return 'border-l-4 border-l-violet-500 bg-violet-500/10'
  return 'border-l-4 border-l-amber-500 bg-amber-500/10'
}

function marcaCuotaContrato(cuota: { estado?: string; fecha_vencimiento?: string }) {
  const estado = String(cuota.estado || '').toLowerCase()
  if (estado === 'pagada' || estado === 'pagado') return 'pagada'
  const fecha = String(cuota.fecha_vencimiento || '').slice(0, 10)
  if (fecha && fecha < fechaLocalHoy()) return 'vencida'
  if (estado === 'parcial') return 'parcial'
  return 'pendiente'
}

function claseCuotaContrato(estado: string) {
  if (estado === 'pagada') return 'cuota-pagada'
  if (estado === 'vencida') return 'cuota-vencida'
  if (estado === 'parcial') return 'cuota-parcial'
  return 'cuota-pendiente'
}

function chipCuotaContrato(estado: string) {
  if (estado === 'pagada') return 'cuota-chip-pagada'
  if (estado === 'vencida') return 'cuota-chip-vencida'
  if (estado === 'parcial') return 'cuota-chip-parcial'
  return 'cuota-chip-pendiente'
}

function textoCuotaContrato(estado: string) {
  if (estado === 'pagada') return 'Pagada'
  if (estado === 'vencida') return 'Vencida'
  if (estado === 'parcial') return 'Parcial'
  return 'Pendiente'
}

function fechaLocalHoy() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function quetzales(valor: number) {
  return `Q${Number(valor || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function etiquetaSistema(sistema?: string | null) {
  switch (sistema) {
    case 'aleman':
      return 'Alemán (capital fijo)'
    case 'americano':
      return 'Americano (capital al final)'
    case 'plano':
      return 'Interés plano'
    case 'frances':
    default:
      return 'Francés (cuota fija)'
  }
}

function etiquetaMora(mora: ParametrizacionMoraInmo) {
  const tipo = mora.tipo_calculo === 'monto_fijo_diario'
    ? `Q${Number(mora.monto_fijo_diario).toFixed(2)} por día`
    : `${Number(mora.porcentaje_diario).toFixed(4)}% diario sobre capital vencido`
  return `${mora.nombre} · ${tipo} · ${mora.dias_gracia} día${mora.dias_gracia === 1 ? '' : 's'} de gracia`
}

function resumenMoraContrato(neg: Negociacion) {
  const tipo = neg.tipo_mora_aplicada || neg.parametrizacion_mora?.tipo_calculo
  if (!tipo) return null
  const nombre = neg.parametrizacion_mora?.nombre
  if (tipo === 'monto_fijo_diario') {
    const monto = neg.mora_monto_fijo_diario_snapshot ?? neg.parametrizacion_mora?.monto_fijo_diario ?? 0
    return `${nombre ? `${nombre} · ` : ''}Q${Number(monto).toFixed(2)}/día · ${neg.mora_dias_gracia_snapshot ?? 0} días de gracia`
  }
  const pct = neg.mora_porcentaje_diario_snapshot ?? neg.parametrizacion_mora?.porcentaje_diario ?? 0
  return `${nombre ? `${nombre} · ` : ''}${Number(pct).toFixed(4)}% diario sobre capital vencido · ${neg.mora_dias_gracia_snapshot ?? 0} días de gracia`
}

export function NegociacionesModule({ userSession }: { userSession?: { userData?: { rol?: string; permisos?: unknown } | null } }) {
  const { navigate } = useNavigateModule()
  const { hasPermission } = usePermissions(userSession?.userData)
  const puedeAnularRecibo = hasPermission('pagos_terreno', 'anular')
  const { abierta: cajaAbierta } = useCajaOperable()
  const [negociaciones, setNegociaciones] = useState<Negociacion[]>([])
  const [lotesDisponibles, setLotesDisponibles] = useState<Lote[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [reglasMora, setReglasMora] = useState<ParametrizacionMoraInmo[]>([])
  const [cargando, setCargando] = useState(false)
  const [datosListos, setDatosListos] = useState(false)

  // Modales
  const [modalNuevaVenta, setModalNuevaVenta] = useState(false)
  const [modalEstadoCuenta, setModalEstadoCuenta] = useState(false)
  const [modalRegistrarPago, setModalRegistrarPago] = useState(false)
  const [modalRescision, setModalRescision] = useState(false)
  const [modalEditarFecha, setModalEditarFecha] = useState(false)
  const [guardandoFecha, setGuardandoFecha] = useState(false)
  const [formFecha, setFormFecha] = useState({
    fecha_negociacion: '',
    fecha_primer_pago: '',
    sincronizar_pagos_iniciales: true,
  })
  const [motivoRescision, setMotivoRescision] = useState('')
  const [negociacionSeleccionada, setNegociacionSeleccionada] = useState<Negociacion | null>(null)
  const [cargandoEstadoCuenta, setCargandoEstadoCuenta] = useState(false)
  const [descargandoDoc, setDescargandoDoc] = useState<string | null>(null)
  const [kardexMovimientos, setKardexMovimientos] = useState<any[]>([])
  const [reciboAnular, setReciboAnular] = useState<{ pagoId: number; documento?: string; abono?: number } | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [anulando, setAnulando] = useState(false)
  const ultimoPagoVigente = useMemo(() => {
    return kardexMovimientos.reduce((mayor, mov) => {
      if (mov?.anulado || !mov?.pago_id) return mayor
      return Math.max(mayor, Number(mov.pago_id))
    }, 0)
  }, [kardexMovimientos])

  // Formulario Nueva Negociación
  const formVentaInicial = {
    cliente_id: '',
    lote_id: '',
    tipo_negociacion: 'credito' as 'contado' | 'credito' | 'reserva',
    precio_original: 0,
    descuento: 0,
    gastos_escrituracion: 0,
    enganche_pactado: 10000,
    plazo_meses: 24,
    periodo_pago: 'mensual' as (typeof PERIODOS_PAGO)[number]['value'],
    tasa_interes_anual: 6.0,
    sistema_amortizacion: 'frances',
    politica_abono_extra: 'reducir_plazo',
    fecha_negociacion: fechaLocalHoy(),
    fecha_primer_pago: '',
    observaciones: '',
    gas_ids: [] as number[],
    parametrizacion_mora_id: '',
  }
  const [formVenta, setFormVenta] = useState(formVentaInicial)
  const [fincaVentaId, setFincaVentaId] = useState('')
  const [busquedaLote, setBusquedaLote] = useState('')
  const [ventasDesde, setVentasDesde] = useState('')
  const [ventasHasta, setVentasHasta] = useState('')
  const [filtroTipoVenta, setFiltroTipoVenta] = useState<'' | 'contado' | 'credito' | 'reserva'>('')
  const [totalVentas, setTotalVentas] = useState<{ contratos: number; monto: number } | null>(null)
  const [totalIntervalo, setTotalIntervalo] = useState<{ contratos: number; monto: number } | null>(null)

  // Simulación en Vivo
  const [simulacion, setSimulacion] = useState<SimuladorResponse | null>(null)

  // Formulario Pago
  const [formPago, setFormPago] = useState({
    tipo_pago: 'cuota_normal',
    monto: 0,
    metodo_pago: 'efectivo',
    referencia_bancaria: '',
    observaciones: '',
    fecha_pago: fechaLocalHoy(),
  })
  const [cajaPagoId, setCajaPagoId] = useState<number | null>(null)
  const [cajaPagoAbierta, setCajaPagoAbierta] = useState<boolean | null>(null)
  const [verificandoCajaPago, setVerificandoCajaPago] = useState(false)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resNeg, resLotes, resCli, resMora] = await Promise.all([
        negociacionService.getAll(),
        loteService.getDisponibles(),
        clienteService.getActivos(),
        moraInmobiliariaService.getAll(true),
      ])

      if (resNeg.success && resNeg.data) {
        const lista = Array.isArray(resNeg.data) ? resNeg.data : []
        setNegociaciones(lista.map(normalizarNegociacion))
      }
      if (resLotes.success && resLotes.data) setLotesDisponibles(resLotes.data)
      if (resCli.success && resCli.data) setClientes(resCli.data)
      if (resMora.success && resMora.data) {
        const activas = Array.isArray(resMora.data) ? resMora.data : []
        setReglasMora(activas)
        setFormVenta((prev) => prev.parametrizacion_mora_id ? prev : {
          ...prev,
          parametrizacion_mora_id: activas[0] ? String(activas[0].id) : '',
        })
      }
      const resTotales = await api.get<any>('/reportes-inmobiliarios/ventas?per_page=1').catch(() => null)
      if (resTotales?.success && resTotales.data) {
        setTotalVentas({
          contratos: Number(resTotales.data.total_contratos || 0),
          monto: Number(resTotales.data.monto_total_ventas || 0),
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
      setDatosListos(true)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const solicitudPlanoAtendida = useRef(false)
  useEffect(() => {
    if (!datosListos || cargando || solicitudPlanoAtendida.current) return
    const venta = sessionStorage.getItem(CLAVE_VENTA_DESDE_PLANO)
    const verId = sessionStorage.getItem(CLAVE_VER_NEGOCIACION)
    if (!venta && !verId) return
    solicitudPlanoAtendida.current = true
    sessionStorage.removeItem(CLAVE_VENTA_DESDE_PLANO)
    sessionStorage.removeItem(CLAVE_VER_NEGOCIACION)

    if (verId) {
      const neg = negociaciones.find((n) => n.id === Number(verId))
      if (neg) abrirEstadoCuenta(neg)
      else toast.error('No se encontró la negociación del lote')
      return
    }

    try {
      const datos = JSON.parse(venta!)
      const lote = lotesDisponibles.find((l) => l.id === Number(datos.lote_id))
      if (!lote) {
        toast.error('El lote ya no está disponible para una nueva venta')
        return
      }
      setFincaVentaId(lote.parcela?.finca?.id ? String(lote.parcela.finca.id) : '')
      setBusquedaLote('')
      setFormVenta((prev) => ({
        ...prev,
        lote_id: String(lote.id),
        precio_original: Number(lote.precio_venta),
        gastos_escrituracion: 0,
        tipo_negociacion: datos.tipo_negociacion ?? prev.tipo_negociacion,
        enganche_pactado: Number(datos.enganche_pactado ?? prev.enganche_pactado),
        plazo_meses: Number(datos.plazo_meses ?? prev.plazo_meses),
        tasa_interes_anual: Number(datos.tasa_interes_anual ?? prev.tasa_interes_anual),
        sistema_amortizacion: datos.sistema_amortizacion ?? prev.sistema_amortizacion,
      }))
      setModalNuevaVenta(true)
    } catch {
      toast.error('No se pudo abrir la venta desde el plano')
    }
  }, [datosListos, cargando, lotesDisponibles, negociaciones])

  // Ejecutar simulación cuando cambian los valores del formulario
  const fincasConLotes = useMemo(() => {
    const mapa = new Map<number, string>()
    lotesDisponibles.forEach((lote) => {
      const finca = lote.parcela?.finca
      if (finca?.id) mapa.set(finca.id, finca.nombre)
    })
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [lotesDisponibles])

  const lotesDeFinca = useMemo(() => {
    if (!fincaVentaId) return []
    const q = busquedaLote.trim().toLowerCase()
    return lotesDisponibles.filter((lote) => {
      if (String(lote.parcela?.finca?.id) !== fincaVentaId) return false
      if (!q) return true
      return lote.numero_lote.toLowerCase().includes(q)
    })
  }, [lotesDisponibles, fincaVentaId, busquedaLote])

  const abrirNuevaNegociacion = () => {
    setFormVenta((prev) => ({
      ...formVentaInicial,
      fecha_negociacion: fechaLocalHoy(),
      fecha_primer_pago: '',
      parametrizacion_mora_id: prev.parametrizacion_mora_id,
    }))
    setFincaVentaId('')
    setBusquedaLote('')
    setSimulacion(null)
    setModalNuevaVenta(true)
  }

  const consultarTotalIntervalo = async () => {
    if (ventasDesde && ventasHasta && ventasHasta < ventasDesde) {
      toast.error('La fecha final del intervalo no puede ser anterior a la inicial')
      return
    }
    const q = new URLSearchParams({ per_page: '1' })
    if (ventasDesde) q.set('fecha_desde', ventasDesde)
    if (ventasHasta) q.set('fecha_hasta', ventasHasta)
    try {
      const res = await api.get<any>(`/reportes-inmobiliarios/ventas?${q.toString()}`)
      if (res.success && res.data) {
        setTotalIntervalo({
          contratos: Number(res.data.total_contratos || 0),
          monto: Number(res.data.monto_total_ventas || 0),
        })
      }
    } catch {
      toast.error('No se pudo calcular el total de ventas del intervalo')
    }
  }

  useEffect(() => {
    if (formVenta.tipo_negociacion === 'contado') {
      setSimulacion(null)
      return
    }
    if (formVenta.precio_original > 0) {
      negociacionService.simular({
        precio_lote: formVenta.precio_original,
        descuento: formVenta.descuento,
        gastos_escrituracion: formVenta.gastos_escrituracion,
        enganche: formVenta.enganche_pactado,
        plazo_meses: formVenta.plazo_meses,
        periodo_pago: formVenta.periodo_pago,
        tasa_interes_anual: formVenta.tasa_interes_anual,
        metodo: formVenta.sistema_amortizacion as 'frances' | 'aleman' | 'americano' | 'plano',
        fecha_primer_pago: formVenta.fecha_primer_pago || undefined,
      }).then(res => {
        if (res.success && res.data) setSimulacion(res.data)
      }).catch(console.error)
    }
  }, [formVenta.tipo_negociacion, formVenta.precio_original, formVenta.descuento, formVenta.gastos_escrituracion, formVenta.enganche_pactado, formVenta.plazo_meses, formVenta.periodo_pago, formVenta.tasa_interes_anual, formVenta.sistema_amortizacion, formVenta.fecha_primer_pago])

  const handleSeleccionarLote = (loteId: string) => {
    const lote = lotesDisponibles.find(l => l.id.toString() === loteId)
    if (lote) {
      const pOrig = Number(lote.precio_venta)
      const engSugerido = Math.round(pOrig * 0.15)
      setFormVenta({
        ...formVenta,
        lote_id: loteId,
        precio_original: pOrig,
        enganche_pactado: engSugerido
      })
    }
  }

  const handleCrearNegociacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formVenta.cliente_id || !formVenta.lote_id) {
      toast.error('Selecciona un comprador y un lote disponible')
      return
    }
    if (formVenta.tipo_negociacion === 'credito' && !formVenta.parametrizacion_mora_id) {
      toast.error('Selecciona el tipo de mora que se aplicará a este crédito')
      return
    }
    if (formVenta.tipo_negociacion === 'contado') {
      try {
        const estado = await cajaService.checkEstado()
        if (estado?.estado !== 'abierta' || !estado.caja?.id) {
          avisarAbrirCaja()
          return
        }
      } catch {
        avisarAbrirCaja()
        return
      }
    }

    try {
      const payload: Record<string, any> = {
        ...formVenta,
        cliente_id: parseInt(formVenta.cliente_id),
        lote_id: parseInt(formVenta.lote_id),
        parametrizacion_mora_id: formVenta.parametrizacion_mora_id
          ? parseInt(formVenta.parametrizacion_mora_id)
          : undefined,
      }
      if (!formVenta.fecha_primer_pago) {
        delete payload.fecha_primer_pago
      }
      const res = await negociacionService.create(payload)

      if (res.success) {
        toast.success('Contrato de negociación y plan de pagos creados con éxito')
        setModalNuevaVenta(false)
        cargarDatos()
      }
    } catch (e: any) {
      toast.error(e?.message || e.response?.data?.message || 'Error al procesar la negociación')
    }
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negociacionSeleccionada) return

    if (cajaPagoAbierta !== true || !cajaPagoId) {
      avisarAbrirCaja()
      return
    }

    try {
      const res = await pagoTerrenoService.registrar({
        negociacion_id: negociacionSeleccionada.id,
        tipo_pago: formPago.tipo_pago,
        monto: formPago.monto,
        metodo_pago: formPago.metodo_pago,
        referencia_bancaria: formPago.referencia_bancaria,
        observaciones: formPago.observaciones,
        caja_apertura_cierre_id: cajaPagoId,
        fecha_pago: formPago.fecha_pago || undefined,
      })

      if (res.success) {
        toast.success('Pago aplicado exitosamente e ingresado en Caja')
        if (res.data?.id) {
          pagoTerrenoService.descargarTicketPdf(res.data.id, res.data.numero_recibo).catch(() => {
            toast.error('El pago se registró, pero no se pudo descargar el ticket')
          })
        }
        setModalRegistrarPago(false)
        setFormPago({
          tipo_pago: 'cuota_normal',
          monto: 0,
          metodo_pago: 'efectivo',
          referencia_bancaria: '',
          observaciones: '',
          fecha_pago: fechaLocalHoy(),
        })
        cargarDatos()
      }
    } catch (e: any) {
      const msg = e?.message || e?.response?.data?.message || 'Error al registrar el pago'
      toast.error(msg)
    }
  }

  const abrirEstadoCuenta = async (neg: Negociacion) => {
    setNegociacionSeleccionada(normalizarNegociacion(neg))
    setKardexMovimientos([])
    setModalEstadoCuenta(true)
    setCargandoEstadoCuenta(true)
    try {
      const [resDet, resEstado] = await Promise.all([
        negociacionService.getById(neg.id),
        negociacionService.getEstadoCuenta(neg.id),
      ])
      if (resDet.success && resDet.data) {
        const detalle = normalizarNegociacion(resDet.data)
        const planEstado = resEstado?.data?.plan_pagos
        if ((!detalle.planPagos || detalle.planPagos.length === 0) && Array.isArray(planEstado)) {
          detalle.planPagos = planEstado
        }
        setNegociacionSeleccionada(detalle)
      }
      if (resEstado.success && Array.isArray(resEstado.data?.kardex_movimientos)) {
        setKardexMovimientos(resEstado.data.kardex_movimientos)
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar el plan de pagos de esta negociación')
    } finally {
      setCargandoEstadoCuenta(false)
    }
  }

  const handleDescargarEstadoCuentaPdf = async (neg: Negociacion) => {
    try {
      setDescargandoDoc('estado')
      await negociacionService.descargarEstadoCuentaPdf(neg.id, neg.codigo_negociacion)
    } catch (e: any) {
      toast.error(e.message || 'No se pudo descargar el estado de cuenta')
    } finally {
      setDescargandoDoc(null)
    }
  }

  const handleDescargarPlanPagosPdf = async (neg: Negociacion) => {
    try {
      setDescargandoDoc('plan')
      await negociacionService.descargarPlanPagosPdf(neg.id, neg.codigo_negociacion)
    } catch (e: any) {
      toast.error(e.message || 'No se pudo descargar el plan de pagos')
    } finally {
      setDescargandoDoc(null)
    }
  }

  const handleDescargarContratoPdf = async (neg: Negociacion) => {
    try {
      setDescargandoDoc('contrato')
      await negociacionService.descargarContratoPdf(neg.id, neg.codigo_negociacion)
    } catch (e: any) {
      toast.error(e.message || 'No se pudo descargar el contrato')
    } finally {
      setDescargandoDoc(null)
    }
  }

  const handleDescargarReciboPdf = async (pagoId: number, numRecibo?: string) => {
    try {
      setDescargandoDoc('recibo')
      await pagoTerrenoService.descargarReciboPdf(pagoId, numRecibo)
    } catch (e: any) {
      toast.error(e.message || 'No se pudo descargar el recibo')
    } finally {
      setDescargandoDoc(null)
    }
  }

  const handleDescargarTicketPdf = async (pagoId: number, numRecibo?: string) => {
    try {
      setDescargandoDoc('ticket')
      await pagoTerrenoService.descargarTicketPdf(pagoId, numRecibo)
    } catch (e: any) {
      toast.error(e.message || 'No se pudo descargar el ticket')
    } finally {
      setDescargandoDoc(null)
    }
  }

  const confirmarAnulacionRecibo = async () => {
    if (!reciboAnular || !negociacionSeleccionada) return
    if (motivoAnulacion.trim().length < 5) {
      toast.error('Escribe el motivo de la anulación, con al menos 5 caracteres.')
      return
    }
    setAnulando(true)
    try {
      const res = await pagoTerrenoService.anular(reciboAnular.pagoId, motivoAnulacion.trim())
      toast.success(res.message || 'Recibo anulado. El cobro se revirtió en la caja.')
      setReciboAnular(null)
      setMotivoAnulacion('')
      await abrirEstadoCuenta(negociacionSeleccionada)
      cargarDatos()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo anular el recibo')
    } finally {
      setAnulando(false)
    }
  }

  const avisarAbrirCaja = () => {
    toast.error('Debes abrir caja para cobrar', {
      description: 'Ve a Caja & Cobros → Aperturar Caja. Sin caja abierta no se puede registrar el pago ni emitir recibo.',
      duration: 8000,
      action: {
        label: 'Ir a Caja',
        onClick: () => {
          setModalRegistrarPago(false)
          navigate('caja')
        },
      },
    })
  }

  const verificarCajaParaPago = async () => {
    setVerificandoCajaPago(true)
    setCajaPagoAbierta(null)
    setCajaPagoId(null)
    try {
      const estado = await cajaService.checkEstado()
      const abierta = estado?.estado === 'abierta' && !!estado?.caja?.id
      setCajaPagoAbierta(abierta)
      setCajaPagoId(abierta && estado.caja ? Number(estado.caja.id) : null)
      if (!abierta) {
        avisarAbrirCaja()
      }
    } catch {
      setCajaPagoAbierta(false)
      setCajaPagoId(null)
      avisarAbrirCaja()
    } finally {
      setVerificandoCajaPago(false)
    }
  }

  const irAAbrirCaja = () => {
    setModalRegistrarPago(false)
    navigate('caja')
  }

  const abrirPago = (neg: Negociacion) => {
    setNegociacionSeleccionada(neg)
    const cuotaSugerida = neg.saldo_capital_pendiente > 0 ? (neg.cuota_mensual || neg.saldo_capital_pendiente) : 0
    setFormPago({
      tipo_pago: neg.enganche_pagado < neg.enganche_pactado ? 'enganche' : 'cuota_normal',
      monto: cuotaSugerida,
      metodo_pago: 'efectivo',
      referencia_bancaria: '',
      observaciones: '',
      fecha_pago: normalizarInputFecha(neg.fecha_negociacion) || fechaLocalHoy(),
    })
    setModalRegistrarPago(true)
    void verificarCajaParaPago()
  }

  const abrirEditarFecha = (neg: Negociacion) => {
    setNegociacionSeleccionada(neg)
    setFormFecha({
      fecha_negociacion: normalizarInputFecha(neg.fecha_negociacion) || fechaLocalHoy(),
      fecha_primer_pago: normalizarInputFecha(neg.fecha_primer_pago),
      sincronizar_pagos_iniciales: true,
    })
    setModalEditarFecha(true)
  }

  const handleActualizarFechas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negociacionSeleccionada || !formFecha.fecha_negociacion) {
      toast.error('Selecciona la fecha de la venta / contrato')
      return
    }
    if (formFecha.fecha_primer_pago && formFecha.fecha_primer_pago < formFecha.fecha_negociacion) {
      toast.error('La fecha del primer pago no puede ser anterior a la fecha de la venta')
      return
    }
    setGuardandoFecha(true)
    try {
      const res = await negociacionService.actualizarFechas(negociacionSeleccionada.id, {
        fecha_negociacion: formFecha.fecha_negociacion,
        fecha_primer_pago: formFecha.fecha_primer_pago || undefined,
        sincronizar_pagos_iniciales: formFecha.sincronizar_pagos_iniciales,
      })
      if (res.success) {
        toast.success(res.message || 'Fechas de la venta actualizadas correctamente')
        setModalEditarFecha(false)
        if (res.data) {
          setNegociacionSeleccionada(normalizarNegociacion(res.data))
        }
        await cargarDatos()
        if (modalEstadoCuenta && negociacionSeleccionada) {
          await abrirEstadoCuenta(res.data || negociacionSeleccionada)
        }
      }
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || 'No se pudo actualizar la fecha de la venta')
    } finally {
      setGuardandoFecha(false)
    }
  }

  const abrirRescision = (neg: Negociacion) => {
    setNegociacionSeleccionada(neg)
    setMotivoRescision('')
    setModalRescision(true)
  }

  const handleRescindir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negociacionSeleccionada || motivoRescision.trim().length < 5) {
      toast.error('Indique un motivo de al menos 5 caracteres')
      return
    }
    try {
      await negociacionService.rescindir(negociacionSeleccionada.id, motivoRescision.trim())
      toast.success('Venta rescindida. Cobros revertidos y lote disponible.')
      setModalRescision(false)
      cargarDatos()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo rescindir')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-toolbar">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <Handshake size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
            <h1 className="font-bold tracking-tight">Negociaciones & Ventas de Terrenos</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Gestión de contratos de compraventa, financiamientos a plazos, enganches y estados de cuenta.
          </p>
        </div>
        <div className="page-toolbar-actions">
          <Button onClick={abrirNuevaNegociacion} className="gap-2 shadow-sm">
            <Plus size={18} weight="bold" /> Nueva Negociación / Venta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total de ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-foreground">{quetzales(totalVentas?.monto || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(totalVentas?.contratos ?? 0) === 1 ? '1 contrato' : `${totalVentas?.contratos ?? 0} contratos`}, sin filtrar por fecha
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total de ventas por intervalo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 text-xs text-muted-foreground space-y-1">
                <span className="block">Desde</span>
                <input
                  type="date"
                  value={ventasDesde}
                  onChange={(e) => setVentasDesde(e.target.value)}
                  className="w-full bg-background border rounded-lg px-2.5 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex-1 text-xs text-muted-foreground space-y-1">
                <span className="block">Hasta</span>
                <input
                  type="date"
                  value={ventasHasta}
                  onChange={(e) => setVentasHasta(e.target.value)}
                  className="w-full bg-background border rounded-lg px-2.5 py-2 text-sm text-foreground"
                />
              </label>
              <Button type="button" variant="outline" className="sm:self-end" onClick={consultarTotalIntervalo}>
                Ver total
              </Button>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">
                {totalIntervalo ? quetzales(totalIntervalo.monto) : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalIntervalo
                  ? `${totalIntervalo.contratos === 1 ? '1 contrato' : `${totalIntervalo.contratos} contratos`} en el intervalo`
                  : 'Elige las fechas y pulsa Ver total'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Negociaciones */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Contratos y Negociaciones Activas ({negociaciones.filter((n) => !filtroTipoVenta || n.tipo_negociacion === filtroTipoVenta).length})</CardTitle>
          <CardDescription className="text-xs">El contado queda en azul y el crédito a plazo en violeta.</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" size="sm" variant={filtroTipoVenta === '' ? 'default' : 'outline'} onClick={() => setFiltroTipoVenta('')}>Todos ({negociaciones.length})</Button>
            <Button type="button" size="sm" variant={filtroTipoVenta === 'contado' ? 'default' : 'outline'} className={filtroTipoVenta === 'contado' ? 'bg-sky-600 hover:bg-sky-700' : 'border-sky-500/40 text-sky-800 dark:text-sky-200'} onClick={() => setFiltroTipoVenta('contado')}>Contado ({negociaciones.filter((n) => n.tipo_negociacion === 'contado').length})</Button>
            <Button type="button" size="sm" variant={filtroTipoVenta === 'credito' ? 'default' : 'outline'} className={filtroTipoVenta === 'credito' ? 'bg-violet-600 hover:bg-violet-700' : 'border-violet-500/40 text-violet-800 dark:text-violet-200'} onClick={() => setFiltroTipoVenta('credito')}>A plazo / crédito ({negociaciones.filter((n) => n.tipo_negociacion === 'credito').length})</Button>
            <Button type="button" size="sm" variant={filtroTipoVenta === 'reserva' ? 'default' : 'outline'} onClick={() => setFiltroTipoVenta('reserva')}>Reserva ({negociaciones.filter((n) => n.tipo_negociacion === 'reserva').length})</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {negociaciones.filter((n) => !filtroTipoVenta || n.tipo_negociacion === filtroTipoVenta).map((neg) => {
              const total = Number(neg.precio_final || 1)
              const pagado = Number(neg.total_capital_pagado || 0)
              const porcentaje = Math.min(100, Math.round((pagado / total) * 100))
              return (
                <div key={neg.id} className={`p-4 space-y-3 ${tonoTipo(neg.tipo_negociacion)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1"><MarcaTipo tipo={neg.tipo_negociacion} /></div>
                      <p className="font-mono font-bold text-xs text-primary">{neg.codigo_negociacion}</p>
                      <p className="font-medium truncate">
                        {neg.comprador?.nombres ? `${neg.comprador.nombres} ${neg.comprador.apellidos}` : neg.comprador?.nombre_completo || 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {neg.lote?.numero_lote || neg.lote?.codigo_unico || 'Lote'} · {neg.plazo_meses} meses
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar size={12} className="text-primary" /> Fecha venta: <span className="font-medium text-foreground">{formatFechaCorta(neg.fecha_negociacion)}</span>
                      </p>
                    </div>
                    {neg.estado === 'activa' && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">Al Día</Badge>}
                    {neg.estado === 'en_mora' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 shrink-0">En mora</Badge>}
                    {neg.estado === 'pagada_total' && <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30 shrink-0">Liquidado</Badge>}
                    {neg.estado === 'reservada' && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">Reservado</Badge>}
                    {neg.estado === 'rescindida' && <Badge variant="outline" className="shrink-0">Rescindida</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[0.6875rem] text-muted-foreground">Precio</p>
                      <p className="font-semibold">Q{Number(neg.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[0.6875rem] text-muted-foreground">Saldo</p>
                      <p className="font-semibold text-amber-600">Q{Number(neg.saldo_capital_pendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[0.6875rem] mb-1">
                      <span>{porcentaje}%</span>
                      <span className="text-muted-foreground">{neg.cuotas_pagadas}/{neg.plazo_meses} cuotas</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => abrirEstadoCuenta(neg)} className="h-8 gap-1 text-xs flex-1">
                      <Receipt size={14} /> Estado
                    </Button>
                    {neg.estado !== 'rescindida' && (
                      <Button size="sm" onClick={() => abrirPago(neg)} className="h-8 gap-1 text-xs flex-1">
                        <Wallet size={14} /> Cobrar
                      </Button>
                    )}
                    {neg.estado !== 'rescindida' && (
                      <Button size="sm" variant="outline" onClick={() => abrirEditarFecha(neg)} className="h-8 gap-1 text-xs" title="Cambiar fecha de venta / contrato">
                        <Calendar size={14} /> Fecha
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDescargarContratoPdf(neg)} className="h-8 gap-1 text-xs">
                      <Printer size={14} /> Contrato
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDescargarContratoPdf(neg)} disabled={descargandoDoc === 'contrato'} className="h-8 gap-1 text-xs">
                      <DownloadSimple size={14} /> PDF
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-y text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Código / Contrato</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Lote Asignado</th>
                  <th className="py-3 px-4">Precio Final</th>
                  <th className="py-3 px-4">Enganche</th>
                  <th className="py-3 px-4">Saldo Pendiente</th>
                  <th className="py-3 px-4">Progreso</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {negociaciones.filter((n) => !filtroTipoVenta || n.tipo_negociacion === filtroTipoVenta).map((neg) => {
                  const total = Number(neg.precio_final || 1)
                  const pagado = Number(neg.total_capital_pagado || 0)
                  const porcentaje = Math.min(100, Math.round((pagado / total) * 100))

                  return (
                    <tr key={neg.id} className={`transition-colors hover:bg-muted/20 ${tonoTipo(neg.tipo_negociacion)}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                        <div className="mb-1"><MarcaTipo tipo={neg.tipo_negociacion} /></div>
                        {neg.codigo_negociacion}
                        <span className="block text-[0.6875rem] text-muted-foreground font-normal">
                          {etiquetaTipo(neg.tipo_negociacion)} · {neg.plazo_meses} meses
                          {neg.tipo_negociacion === 'credito' && neg.periodo_pago && neg.periodo_pago !== 'mensual'
                            ? ` · ${etiquetaPeriodo(neg.periodo_pago).toLowerCase()}`
                            : ''}
                          {neg.tipo_negociacion === 'credito' ? ` · ${etiquetaSistema(neg.sistema_amortizacion)}` : ''}
                        </span>
                        <span className="block text-[0.6875rem] text-muted-foreground font-normal mt-0.5">
                          Fecha venta: <strong className="text-foreground">{formatFechaCorta(neg.fecha_negociacion)}</strong>
                        </span>
                        {resumenMoraContrato(neg) && (
                          <span className="block text-[0.625rem] text-amber-700 dark:text-amber-400 font-normal mt-0.5">
                            Mora: {resumenMoraContrato(neg)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {neg.comprador?.nombres ? `${neg.comprador.nombres} ${neg.comprador.apellidos}` : neg.comprador?.nombre_completo || 'Cliente'}
                        <span className="block text-xs text-muted-foreground">
                          DPI: {neg.comprador?.dpi || 'S/D'} · Tel: {neg.comprador?.telefono || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground">{neg.lote?.numero_lote || neg.lote?.codigo_unico || 'Lote'}</span>
                        <span className="block text-xs text-muted-foreground">
                          {neg.lote?.parcela?.finca?.nombre || 'Finca'} · {neg.lote?.area_m2} m²
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        Q{Number(neg.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-emerald-600 font-semibold">Q{Number(neg.enganche_pagado || 0).toLocaleString()}</span> / Q{Number(neg.enganche_pactado).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-600">
                        Q{Number(neg.saldo_capital_pendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-24">
                          <div className="flex justify-between text-[0.6875rem] mb-1">
                            <span>{porcentaje}%</span>
                            <span className="text-muted-foreground">{neg.cuotas_pagadas}/{neg.plazo_meses} cuotas</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${porcentaje}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {neg.estado === 'activa' && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Al Día</Badge>}
                        {neg.estado === 'en_mora' && <Badge className="bg-red-500/15 text-red-600 border-red-500/30">En mora</Badge>}
                        {neg.estado === 'pagada_total' && <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30">Liquidado</Badge>}
                        {neg.estado === 'reservada' && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Reservado</Badge>}
                        {neg.estado === 'rescindida' && <Badge variant="outline">Rescindida</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => handleDescargarContratoPdf(neg)} className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <Printer size={14} /> Contrato
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDescargarContratoPdf(neg)} disabled={descargandoDoc === 'contrato'} className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground" title="Descargar contrato PDF">
                            <DownloadSimple size={14} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrirEstadoCuenta(neg)} className="h-8 gap-1 text-xs">
                            <Receipt size={14} /> Estado Cuenta
                          </Button>
                          {neg.estado !== 'rescindida' && (
                            <Button size="sm" variant="outline" onClick={() => abrirEditarFecha(neg)} className="h-8 gap-1 text-xs" title="Cambiar fecha de venta y recalcular cronograma">
                              <Calendar size={14} /> Cambiar fecha
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDescargarPlanPagosPdf(neg)} className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground" disabled={descargandoDoc === 'plan'}>
                            <DownloadSimple size={14} /> Plan
                          </Button>
                          {neg.estado !== 'rescindida' && (
                            <Button size="sm" onClick={() => abrirPago(neg)} className="h-8 gap-1 text-xs">
                              <Wallet size={14} /> Cobrar
                            </Button>
                          )}
                          {neg.estado !== 'rescindida' && (
                            <Button size="sm" variant="ghost" onClick={() => abrirRescision(neg)} className="h-8 gap-1 text-xs text-destructive">
                              <XCircle size={14} /> Rescindir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nueva Negociación */}
      <Dialog open={modalNuevaVenta} onOpenChange={setModalNuevaVenta}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="text-primary" size={24} weight="duotone" />
              Nueva Negociación y Asignación de Terreno
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearNegociacion} className="space-y-4 py-2">
            {/* Selección de Comprador y Lote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Comprador / Cliente *</Label>
                <select
                  required
                  value={formVenta.cliente_id}
                  onChange={(e) => setFormVenta({ ...formVenta, cliente_id: e.target.value })}
                  className="w-full bg-background border rounded-lg p-2.5 text-sm"
                >
                  <option value="">Selecciona un comprador...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombres} {c.apellidos} — DPI: {c.dpi}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Finca o proyecto *</Label>
                <select
                  required
                  value={fincaVentaId}
                  onChange={(e) => {
                    setFincaVentaId(e.target.value)
                    setBusquedaLote('')
                    setFormVenta({ ...formVenta, lote_id: '', precio_original: 0 })
                  }}
                  className="w-full bg-background border rounded-lg p-2.5 text-sm"
                >
                  <option value="">Selecciona la finca o proyecto...</option>
                  {fincasConLotes.map((finca) => (
                    <option key={finca.id} value={finca.id}>{finca.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buscar lote</Label>
                <div className="relative">
                  <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={busquedaLote}
                    onChange={(e) => setBusquedaLote(e.target.value)}
                    placeholder="Identificador del lote"
                    className="pl-8"
                    disabled={!fincaVentaId}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lote disponible *</Label>
                <select
                  required
                  value={formVenta.lote_id}
                  onChange={(e) => handleSeleccionarLote(e.target.value)}
                  disabled={!fincaVentaId}
                  className="w-full bg-background border rounded-lg p-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  <option value="">{fincaVentaId ? 'Selecciona el lote...' : 'Primero elige la finca o proyecto'}</option>
                  {lotesDeFinca.map((l) => (
                    <option key={l.id} value={l.id}>{l.numero_lote}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condiciones Financieras */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Calculator size={18} className="text-primary" /> Condiciones Comerciales & Financiamiento
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de operación *</Label>
                  <select
                    value={formVenta.tipo_negociacion}
                    onChange={(e) => setFormVenta({ ...formVenta, tipo_negociacion: e.target.value as 'contado' | 'credito' | 'reserva' })}
                    className="w-full bg-background border rounded-lg p-2.5 text-sm"
                  >
                    <option value="credito">A Plazo / Financiamiento</option>
                    <option value="contado">Contado</option>
                    <option value="reserva">Reserva</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-primary flex items-center gap-1">
                    <Calendar size={14} /> Fecha de Venta / Contrato *
                  </Label>
                  <Input
                    required
                    type="date"
                    value={formVenta.fecha_negociacion}
                    onChange={(e) => setFormVenta({ ...formVenta, fecha_negociacion: e.target.value })}
                    className="bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Puedes elegir hoy o cualquier fecha anterior para registrar ventas pasadas.
                  </p>
                </div>
              </div>

              {formVenta.tipo_negociacion === 'credito' && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar size={14} /> Fecha del 1er Pago (opcional)
                  </Label>
                  <Input
                    type="date"
                    min={formVenta.fecha_negociacion || undefined}
                    value={formVenta.fecha_primer_pago}
                    onChange={(e) => setFormVenta({ ...formVenta, fecha_primer_pago: e.target.value })}
                    className="bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Si lo dejas vacío, el 1er pago se programa automáticamente un periodo después de la fecha de venta ({formatFechaCorta(formVenta.fecha_negociacion)}).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio de Lista (Q)</Label>
                  <Input
                    type="number"
                    value={formVenta.precio_original}
                    onChange={(e) => setFormVenta({ ...formVenta, precio_original: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descuento Comercial (Q)</Label>
                  <Input
                    type="number"
                    value={formVenta.descuento}
                    onChange={(e) => setFormVenta({ ...formVenta, descuento: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gastos de Escritura (Q)</Label>
                  <Input
                    type="number"
                    value={formVenta.gastos_escrituracion}
                    onChange={(e) => setFormVenta({ ...formVenta, gastos_escrituracion: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {formVenta.tipo_negociacion !== 'contado' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-primary">Enganche Pactado (Q)</Label>
                  <Input
                    type="number"
                    value={formVenta.enganche_pactado}
                    onChange={(e) => setFormVenta({ ...formVenta, enganche_pactado: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plazo (Meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={240}
                    step={1}
                    value={formVenta.plazo_meses}
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10)
                      const meses = Number.isFinite(raw) ? Math.min(240, Math.max(1, raw)) : 1
                      setFormVenta({ ...formVenta, plazo_meses: meses })
                    }}
                    placeholder="Ej. 18, 30, 72…"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Libre: 1 a 240 meses
                    {formVenta.plazo_meses >= 12
                      ? ` · ≈ ${(formVenta.plazo_meses / 12).toFixed(formVenta.plazo_meses % 12 === 0 ? 0 : 1)} año(s)`
                      : ''}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tasa Interés Anual (%)</Label>
                    <Input
                    type="number"
                    step="0.5"
                    value={formVenta.tasa_interes_anual}
                    onChange={(e) => setFormVenta({ ...formVenta, tasa_interes_anual: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              )}

              {formVenta.tipo_negociacion === 'credito' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Periodo de pago *</Label>
                  <select
                    value={formVenta.periodo_pago}
                    onChange={(e) => setFormVenta({ ...formVenta, periodo_pago: e.target.value as typeof formVenta.periodo_pago })}
                    className="w-full bg-background border rounded-lg p-2.5 text-sm"
                  >
                    {PERIODOS_PAGO.map((periodo) => (
                      <option key={periodo.value} value={periodo.value}>{periodo.label}</option>
                    ))}
                  </select>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {formVenta.plazo_meses} meses · pagos {etiquetaPeriodo(formVenta.periodo_pago).toLowerCase()}es · {numeroCuotasPeriodo(formVenta.plazo_meses, formVenta.periodo_pago)} {numeroCuotasPeriodo(formVenta.plazo_meses, formVenta.periodo_pago) === 1 ? 'cuota' : 'cuotas'}
                  </p>
                </div>
              )}

              {formVenta.tipo_negociacion === 'credito' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">Regla de mora de este contrato *</Label>
                  <select
                    required
                    value={formVenta.parametrizacion_mora_id}
                    onChange={(e) => setFormVenta({ ...formVenta, parametrizacion_mora_id: e.target.value })}
                    className="w-full bg-background border rounded-lg p-2.5 text-sm"
                  >
                    <option value="">Selecciona cómo se calculará la mora...</option>
                    {reglasMora.map((mora) => (
                      <option key={mora.id} value={mora.id}>
                        {etiquetaMora(mora)}
                      </option>
                    ))}
                  </select>
                  {reglasMora.length === 0 ? (
                    <p className="text-[0.6875rem] text-destructive">
                      No hay reglas activas. Crea una en Tasas & Mora antes de vender a crédito.
                    </p>
                  ) : (
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Queda ligada a este contrato. Si luego cambias el catálogo, esta venta conserva su snapshot.
                    </p>
                  )}
                </div>
              )}

              {formVenta.tipo_negociacion === 'credito' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Sistema de amortización *</Label>
                    <select
                      value={formVenta.sistema_amortizacion}
                      onChange={(e) => setFormVenta({ ...formVenta, sistema_amortizacion: e.target.value })}
                      className="w-full bg-background border rounded-lg p-2.5 text-sm"
                    >
                      <option value="frances">Francés — cuota fija (recomendado)</option>
                      <option value="aleman">Alemán — capital fijo, cuota decreciente</option>
                      <option value="americano">Americano — solo intereses y capital al final</option>
                      <option value="plano">Interés plano — cuota simple</option>
                    </select>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {formVenta.sistema_amortizacion === 'aleman' && 'En cada periodo se paga el mismo capital; la cuota baja conforme baja el interés.'}
                      {formVenta.sistema_amortizacion === 'americano' && 'Se pagan intereses en cada periodo y el capital se liquida en el último pago.'}
                      {formVenta.sistema_amortizacion === 'plano' && 'Interés simple prorrateado; la cuota no se recalcula sobre saldos.'}
                      {(formVenta.sistema_amortizacion === 'frances' || !formVenta.sistema_amortizacion) && 'Cuota igual en cada pago durante todo el plazo (sistema más usado en terrenos).'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Abonos extras a capital</Label>
                    <select
                      value={formVenta.politica_abono_extra}
                      onChange={(e) => setFormVenta({ ...formVenta, politica_abono_extra: e.target.value })}
                      className="w-full bg-background border rounded-lg p-2.5 text-sm"
                    >
                      <option value="reducir_plazo">Reducir plazo (menos cuotas)</option>
                      <option value="reducir_cuota">Reducir cuota (mismo plazo)</option>
                    </select>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Define cómo se aplica un abono extraordinario sobre este contrato.
                    </p>
                  </div>
                </div>
              )}

              {formVenta.tipo_negociacion === 'credito' && (
                <GastosCreditoSelector
                  montoOtorgado={Math.max(0, Number(formVenta.precio_original) - Number(formVenta.descuento) - Number(formVenta.enganche_pactado))}
                  gastosSeleccionados={formVenta.gas_ids}
                  onGastosChange={(ids) => setFormVenta({ ...formVenta, gas_ids: ids })}
                />
              )}
            </div>

            {/* Resumen del Simulador en Vivo */}
            {formVenta.tipo_negociacion === 'contado' && formVenta.precio_original > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <span className="text-[0.6875rem] text-muted-foreground block">Precio final de contado</span>
                <span className="font-bold text-lg text-foreground">
                  Q{Math.max(0, Number(formVenta.precio_original) - Number(formVenta.descuento) + Number(formVenta.gastos_escrituracion)).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {formVenta.tipo_negociacion !== 'contado' && simulacion && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-[0.6875rem] text-muted-foreground block">Precio Final</span>
                    <span className="font-bold text-sm text-foreground">Q{simulacion.precio_final.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[0.6875rem] text-muted-foreground block">Capital Financiado</span>
                    <span className="font-bold text-sm text-foreground">Q{simulacion.monto_financiado.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[0.6875rem] text-muted-foreground block">
                      Cuota {etiquetaPeriodo(formVenta.periodo_pago).toLowerCase()}
                      {simulacion.numero_cuotas ? ` · ${simulacion.numero_cuotas}` : ''}
                    </span>
                    <span className="font-extrabold text-base text-primary">Q{simulacion.cuota_mensual.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[0.6875rem] text-muted-foreground block">Total con Intereses</span>
                    <span className="font-bold text-sm text-foreground">Q{simulacion.total_a_pagar.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalNuevaVenta(false)}>Cancelar</Button>
              <Button type="submit">Generar Contrato & Asignar Lote</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Estado de Cuenta Detallado */}
      {negociacionSeleccionada && (
        <Dialog open={modalEstadoCuenta} onOpenChange={setModalEstadoCuenta}>
          <DialogContent className="!w-[min(96vw,1200px)] !max-w-[min(96vw,1200px)] max-h-[94vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span>Estado de Cuenta: {negociacionSeleccionada.codigo_negociacion}</span>
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    Fecha de venta: <strong className="text-foreground">{formatFechaCorta(negociacionSeleccionada.fecha_negociacion)}</strong>
                    {negociacionSeleccionada.fecha_primer_pago ? (
                      <> · 1er pago: <strong className="text-foreground">{formatFechaCorta(negociacionSeleccionada.fecha_primer_pago)}</strong></>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {negociacionSeleccionada.estado !== 'rescindida' && (
                    <Button size="sm" variant="outline" onClick={() => abrirEditarFecha(negociacionSeleccionada)} className="h-8 gap-1 text-xs">
                      <Calendar size={14} /> Cambiar fecha de venta
                    </Button>
                  )}
                  <Badge variant="outline" className="text-primary">{negociacionSeleccionada.estado.toUpperCase()}</Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {/* Tarjetas de Resumen Financiero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border">
                  <span className="text-[0.6875rem] text-muted-foreground block">Precio del Lote</span>
                  <span className="font-bold text-foreground">Q{Number(negociacionSeleccionada.precio_final).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border">
                  <span className="text-[0.6875rem] text-muted-foreground block">Enganche Pagado</span>
                  <span className="font-bold text-emerald-600">Q{Number(negociacionSeleccionada.enganche_pagado || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border">
                  <span className="text-[0.6875rem] text-muted-foreground block">Capital Amortizado</span>
                  <span className="font-bold text-primary">Q{Number(negociacionSeleccionada.total_capital_pagado || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <span className="text-[0.6875rem] text-amber-700 block font-semibold">Saldo Pendiente</span>
                  <span className="font-extrabold text-amber-700 text-base">
                    Q{Number(negociacionSeleccionada.saldo_capital_pendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {resumenMoraContrato(negociacionSeleccionada) && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Mora de este contrato: </span>
                  <span className="text-muted-foreground">{resumenMoraContrato(negociacionSeleccionada)}</span>
                </div>
              )}
              {negociacionSeleccionada.tipo_negociacion === 'credito' && (
                <div className="p-3 rounded-xl border bg-muted/40 text-xs">
                  <span className="font-semibold">Sistema de crédito: </span>
                  <span className="text-muted-foreground">
                    {etiquetaSistema(negociacionSeleccionada.sistema_amortizacion)}
                    {negociacionSeleccionada.politica_abono_extra === 'reducir_cuota'
                      ? ' · Abonos extras reducen la cuota'
                      : ' · Abonos extras reducen el plazo'}
                  </span>
                </div>
              )}

              {/* Plan de Pagos / Cronograma de Cuotas */}
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Cronograma de Cuotas & Amortización
                  </h4>
                  <span className={`rounded px-2 py-0.5 text-[0.625rem] font-semibold ${chipCuotaContrato('pagada')}`}>Pagada</span>
                  <span className={`rounded px-2 py-0.5 text-[0.625rem] font-semibold ${chipCuotaContrato('pendiente')}`}>Pendiente</span>
                  <span className={`rounded px-2 py-0.5 text-[0.625rem] font-semibold ${chipCuotaContrato('vencida')}`}>Vencida</span>
                </div>
                <div className="max-h-[42vh] overflow-auto border rounded-xl">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="bg-muted/60 sticky top-0 border-b">
                      <tr>
                        <th className="p-2">No.</th>
                        <th className="p-2">Vencimiento</th>
                        <th className="p-2">Capital</th>
                        <th className="p-2">Interés</th>
                        <th className="p-2">Cargos</th>
                        <th className="p-2">Cuota Total</th>
                        <th className="p-2">Saldo</th>
                        <th className="p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cargandoEstadoCuenta ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-muted-foreground">
                            Cargando plan de pagos...
                          </td>
                        </tr>
                      ) : cuotasPlan(negociacionSeleccionada).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-muted-foreground">
                            {negociacionSeleccionada.tipo_negociacion === 'credito' && Number(negociacionSeleccionada.enganche_pagado || 0) + 0.009 < Number(negociacionSeleccionada.enganche_pactado || 0)
                              ? 'El cronograma se genera al completar el enganche pactado.'
                              : 'Aún no hay cuotas registradas para esta negociación.'}
                          </td>
                        </tr>
                      ) : (
                        cuotasPlan(negociacionSeleccionada).map((cuota: any) => {
                        const cargos = Number(cuota.otros_cargos || 0)
                        const cargosPagados = Number(cuota.otros_cargos_pagados || 0)
                        const marca = marcaCuotaContrato(cuota)
                        return (
                        <tr key={cuota.id || cuota.numero_cuota} className={claseCuotaContrato(marca)}>
                          <td className="p-2 font-mono">{cuota.numero_cuota}</td>
                          <td className="p-2 whitespace-nowrap">{formatFechaCorta(cuota.fecha_vencimiento)}</td>
                          <td className="p-2">Q{Number(cuota.cuota_capital).toLocaleString()}</td>
                          <td className="p-2">Q{Number(cuota.cuota_interes || 0).toLocaleString()}</td>
                          <td className="p-2">
                            {cargos > 0 ? (
                              <span title={`Pagado Q${cargosPagados.toLocaleString()}`}>
                                Q{cargos.toLocaleString()}
                                {cargosPagados + 0.009 >= cargos ? (
                                  <Badge className="ml-1 bg-emerald-500/20 text-emerald-600 text-[0.5rem]">PAGADO</Badge>
                                ) : cargosPagados > 0 ? (
                                  <Badge variant="outline" className="ml-1 text-[0.5rem]">PARCIAL</Badge>
                                ) : null}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-2 font-bold">Q{Number(cuota.cuota_monto_total).toLocaleString()}</td>
                          <td className="p-2">Q{Number(cuota.saldo_capital_restante).toLocaleString()}</td>
                          <td className="p-2">
                            <span className={`rounded px-2 py-0.5 text-[0.625rem] font-semibold ${chipCuotaContrato(marca)}`}>{textoCuotaContrato(marca)}</span>
                          </td>
                        </tr>
                        )
                      })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {kardexMovimientos.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Kardex de movimientos
                  </h4>
                  <div className="max-h-[28vh] overflow-auto border rounded-xl">
                    <table className="w-full text-left text-xs min-w-[520px]">
                      <thead className="bg-muted/60 sticky top-0 border-b">
                        <tr>
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Documento</th>
                          <th className="p-2">Concepto</th>
                          <th className="p-2">Abono</th>
                          <th className="p-2">Saldo</th>
                          <th className="p-2">Recibo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {kardexMovimientos.map((mov, idx) => (
                          <tr key={`${mov.documento || 'mov'}-${idx}`}>
                            <td className="p-2 whitespace-nowrap">{formatFechaCorta(mov.fecha)}</td>
                            <td className="p-2 font-mono">{mov.documento || '—'}</td>
                            <td className="p-2">{mov.concepto}</td>
                            <td className="p-2">Q{Number(mov.abono || 0).toLocaleString()}</td>
                            <td className="p-2">Q{Number(mov.saldo || 0).toLocaleString()}</td>
                            <td className="p-2">
                              {mov.pago_id ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {mov.anulado && <Badge variant="outline" className="text-[0.625rem]">Anulado</Badge>}
                                  <Button size="sm" variant="outline" onClick={() => handleDescargarReciboPdf(mov.pago_id, mov.documento)} disabled={descargandoDoc === 'recibo'} className="h-7 gap-1 px-2 text-[0.625rem]" title="Recibo en hoja carta">
                                    <DownloadSimple size={12} /> Recibo
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDescargarTicketPdf(mov.pago_id, mov.documento)} disabled={descargandoDoc === 'ticket'} className="h-7 gap-1 px-2 text-[0.625rem]" title="Ticket de 80 mm para impresora térmica">
                                    <Printer size={12} /> Ticket
                                  </Button>
                                  {!mov.anulado && puedeAnularRecibo && Number(mov.pago_id) === ultimoPagoVigente && (
                                    <Button size="sm" variant="outline" onClick={() => { setReciboAnular({ pagoId: Number(mov.pago_id), documento: mov.documento, abono: Number(mov.abono || 0) }); setMotivoAnulacion('') }} className="aviso-caja-cerrada h-7 border-0 px-2 text-[0.625rem]">
                                      Anular
                                    </Button>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                <span className="self-center text-xs font-semibold text-muted-foreground">Documentos</span>
                <Button variant="outline" onClick={() => handleDescargarEstadoCuentaPdf(negociacionSeleccionada)} disabled={descargandoDoc === 'estado'} className="gap-1.5 text-xs">
                  <DownloadSimple size={16} /> {descargandoDoc === 'estado' ? 'Descargando...' : 'Estado de cuenta PDF'}
                </Button>
                <Button variant="outline" onClick={() => negociacionService.descargarEstadoCuentaExcel(negociacionSeleccionada.id, negociacionSeleccionada.codigo_negociacion)} className="gap-1.5 text-xs">
                  Excel
                </Button>
                <Button variant="outline" onClick={() => handleDescargarPlanPagosPdf(negociacionSeleccionada)} disabled={descargandoDoc === 'plan'} className="gap-1.5 text-xs">
                  <DownloadSimple size={16} /> {descargandoDoc === 'plan' ? 'Descargando...' : 'Plan de pagos PDF'}
                </Button>
                <Button variant="outline" onClick={() => handleDescargarContratoPdf(negociacionSeleccionada)} disabled={descargandoDoc === 'contrato'} className="gap-1.5 text-xs">
                  <DownloadSimple size={16} /> {descargandoDoc === 'contrato' ? 'Descargando...' : 'Contrato PDF'}
                </Button>
              </div>
              <Button onClick={() => setModalEstadoCuenta(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Registrar Pago en Caja */}
      {negociacionSeleccionada && (
        <Dialog open={modalRegistrarPago} onOpenChange={setModalRegistrarPago}>
          <DialogContent className="!w-[min(96vw,980px)] !max-w-[min(96vw,980px)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="text-primary" size={24} weight="duotone" />
                Registrar Pago de Terreno
              </DialogTitle>
              <CardDescription className="text-xs">
                Contrato: {negociacionSeleccionada.codigo_negociacion} · Saldo actual: Q{Number(negociacionSeleccionada.saldo_capital_pendiente).toLocaleString()}
              </CardDescription>
            </DialogHeader>
            <form onSubmit={handleRegistrarPago} className="space-y-4 py-2">
              {verificandoCajaPago ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Verificando caja...
                </div>
              ) : cajaPagoAbierta === false ? (
                <div className="aviso-caja-cerrada rounded-lg px-3 py-3 text-sm flex gap-2 items-start">
                  <WarningCircle size={18} className="shrink-0 mt-0.5" weight="fill" />
                  <div className="space-y-2 min-w-0">
                    <p className="font-semibold">Debes abrir caja para cobrar</p>
                    <p className="text-xs opacity-90">
                      Sin caja abierta no se registra el pago ni se emite recibo. Ve a <strong>Caja &amp; Cobros</strong>, apertúra tu caja y vuelve.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" className="h-8" onClick={irAAbrirCaja}>
                        Ir a abrir caja
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void verificarCajaParaPago()}>
                        Ya abrí caja · verificar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : cajaPagoAbierta === true ? (
                <div className="aviso-caja-lista rounded-lg px-3 py-2 text-xs">
                  Caja abierta · lista para registrar el cobro
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Pago *</Label>
                  <select
                    value={formPago.tipo_pago}
                    onChange={(e) => setFormPago({ ...formPago, tipo_pago: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
                  >
                    <option value="cuota_normal">Pago de Cuota Ordinaria</option>
                    <option value="enganche">Pago de Enganche</option>
                    <option value="abono_capital">Abono Extraordinario a Capital</option>
                    <option value="pago_total">Liquidación Total de Saldo</option>
                    <option value="gastos_escritura">Gastos de Escrituración</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar size={14} className="text-primary" /> Fecha del Pago *
                  </Label>
                  <Input
                    required
                    type="date"
                    value={formPago.fecha_pago}
                    onChange={(e) => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                    className="bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Puedes seleccionar una fecha anterior si el cobro se realizó en otra fecha.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monto a Cobrar (Q) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: parseFloat(e.target.value) || 0 })}
                  className="text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <select
                    value={formPago.metodo_pago}
                    onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="deposito">Boleta de Depósito</option>
                    <option value="tarjeta">Tarjeta Débito/Crédito</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>No. Referencia / Boleta</Label>
                  <Input
                    placeholder="Ej. TRANSF-8921"
                    value={formPago.referencia_bancaria}
                    onChange={(e) => setFormPago({ ...formPago, referencia_bancaria: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comentario u observación</Label>
                <Textarea
                  value={formPago.observaciones}
                  maxLength={500}
                  rows={3}
                  placeholder="Nota del cobro. Sale en el recibo."
                  onChange={(e) => setFormPago({ ...formPago, observaciones: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalRegistrarPago(false)}>Cancelar</Button>
                <Button type="submit" disabled={verificandoCajaPago || cajaPagoAbierta !== true}>
                  Ingresar a Caja & Emitir Recibo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={reciboAnular !== null} onOpenChange={(abierto) => { if (!abierto) setReciboAnular(null) }}>
        <DialogContent className="!w-[min(92vw,760px)] !max-w-[min(92vw,760px)]">
          <DialogHeader>
            <DialogTitle>Anular recibo {reciboAnular?.documento || ''}</DialogTitle>
            <DialogDescription>
              Esta anulación usa el permiso Pagos de terrenos → Anular. Solo procede el último recibo vigente, con tu caja abierta. El cobro sale de la caja, el saldo del contrato vuelve y el recibo queda anulado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <AvisoCaja abierta={cajaAbierta} />
            <p className="text-sm">Monto del recibo: Q{Number(reciboAnular?.abono || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
            <div className="space-y-1">
              <Label>Motivo de la anulación *</Label>
              <Textarea value={motivoAnulacion} maxLength={500} rows={6} placeholder="Escribe por qué se anula este recibo" onChange={(e) => setMotivoAnulacion(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReciboAnular(null)}>Cancelar</Button>
              <Button type="button" variant="destructive" disabled={anulando || cajaAbierta !== true || motivoAnulacion.trim().length < 5} onClick={() => void confirmarAnulacionRecibo()}>
                {anulando ? 'Anulando...' : 'Anular recibo'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalEditarFecha} onOpenChange={setModalEditarFecha}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="text-primary" size={22} weight="duotone" />
              Cambiar fecha de venta · {negociacionSeleccionada?.codigo_negociacion}
            </DialogTitle>
            <DialogDescription>
              Permite asignar fechas anteriores a ventas ya registradas. Si el contrato tiene cuotas, las fechas de vencimiento se ajustan automáticamente a partir de la nueva fecha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActualizarFechas} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Fecha real de la venta / contrato *</Label>
              <Input
                required
                type="date"
                value={formFecha.fecha_negociacion}
                onChange={(e) => setFormFecha({ ...formFecha, fecha_negociacion: e.target.value })}
              />
            </div>

            {negociacionSeleccionada?.tipo_negociacion === 'credito' && (
              <div className="space-y-1.5">
                <Label>Fecha del 1er pago (opcional)</Label>
                <Input
                  type="date"
                  min={formFecha.fecha_negociacion || undefined}
                  value={formFecha.fecha_primer_pago}
                  onChange={(e) => setFormFecha({ ...formFecha, fecha_primer_pago: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Si lo dejas en blanco, el sistema colocará el 1er pago automáticamente un periodo después de la nueva fecha de venta y recalculará el resto de cuotas.
                </p>
              </div>
            )}

            <label className="flex items-start gap-2.5 rounded-lg border p-3 text-xs cursor-pointer bg-muted/30">
              <input
                type="checkbox"
                checked={formFecha.sincronizar_pagos_iniciales}
                onChange={(e) => setFormFecha({ ...formFecha, sincronizar_pagos_iniciales: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <strong className="block text-foreground">Actualizar también la fecha del enganche / pago de contado</strong>
                <span className="text-muted-foreground">
                  Ajusta la fecha del recibo de enganche o pago de contado inicial para que coincida con la nueva fecha de venta.
                </span>
              </span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalEditarFecha(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoFecha}>
                {guardandoFecha ? 'Guardando...' : 'Guardar nueva fecha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalRescision} onOpenChange={setModalRescision}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Rescindir {negociacionSeleccionada?.codigo_negociacion}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRescindir} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se anulan los cobros vigentes (último a primero), se revierten recibos y caja, y el lote vuelve a disponible. Requiere caja abierta.
            </p>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Input required minLength={5} value={motivoRescision} onChange={(e) => setMotivoRescision(e.target.value)} placeholder="Ej. Desistimiento del comprador" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalRescision(false)}>Cancelar</Button>
              <Button type="submit" variant="destructive">Confirmar rescisión</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
