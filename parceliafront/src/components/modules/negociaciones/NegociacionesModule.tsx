import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Handshake, Calculator, Receipt, User, Package, Calendar, CurrencyDollar, CheckCircle, Clock, ArrowRight, Eye, ShieldCheck, Wallet, Printer, FileText, XCircle, DownloadSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api, negociacionService, loteService, clienteService, pagoTerrenoService, moraInmobiliariaService, Negociacion, Lote, Cliente, SimuladorResponse, ParametrizacionMoraInmo } from '@/lib/api'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { imprimirDocumentoHTML } from '@/utils/impresionDocumentos'
import { GastosCreditoSelector } from '@/components/modules/gastos/GastosCreditoSelector'

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
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return String(valor).slice(0, 10)
  return d.toLocaleDateString('es-GT')
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

export function NegociacionesModule() {
  const { config: empresaConfig } = useEmpresaConfig()
  const [negociaciones, setNegociaciones] = useState<Negociacion[]>([])
  const [lotesDisponibles, setLotesDisponibles] = useState<Lote[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [reglasMora, setReglasMora] = useState<ParametrizacionMoraInmo[]>([])
  const [cargando, setCargando] = useState(false)

  // Modales
  const [modalNuevaVenta, setModalNuevaVenta] = useState(false)
  const [modalEstadoCuenta, setModalEstadoCuenta] = useState(false)
  const [modalRegistrarPago, setModalRegistrarPago] = useState(false)
  const [modalRescision, setModalRescision] = useState(false)
  const [motivoRescision, setMotivoRescision] = useState('')
  const [negociacionSeleccionada, setNegociacionSeleccionada] = useState<Negociacion | null>(null)
  const [cargandoEstadoCuenta, setCargandoEstadoCuenta] = useState(false)
  const [descargandoDoc, setDescargandoDoc] = useState<string | null>(null)
  const [kardexMovimientos, setKardexMovimientos] = useState<any[]>([])

  // Formulario Nueva Negociación
  const [formVenta, setFormVenta] = useState({
    cliente_id: '',
    lote_id: '',
    tipo_negociacion: 'credito',
    precio_original: 0,
    descuento: 0,
    gastos_escrituracion: 3500,
    enganche_pactado: 10000,
    plazo_meses: 24,
    tasa_interes_anual: 6.0,
    sistema_amortizacion: 'frances',
    politica_abono_extra: 'reducir_plazo',
    fecha_negociacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    gas_ids: [] as number[],
    parametrizacion_mora_id: '',
  })

  // Simulación en Vivo
  const [simulacion, setSimulacion] = useState<SimuladorResponse | null>(null)

  // Formulario Pago
  const [formPago, setFormPago] = useState({
    tipo_pago: 'cuota_normal',
    monto: 0,
    metodo_pago: 'efectivo',
    referencia_bancaria: '',
    observaciones: ''
  })

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
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Ejecutar simulación cuando cambian los valores del formulario
  useEffect(() => {
    if (formVenta.precio_original > 0) {
      negociacionService.simular({
        precio_lote: formVenta.precio_original,
        descuento: formVenta.descuento,
        gastos_escrituracion: formVenta.gastos_escrituracion,
        enganche: formVenta.enganche_pactado,
        plazo_meses: formVenta.plazo_meses,
        tasa_interes_anual: formVenta.tasa_interes_anual,
        metodo: formVenta.sistema_amortizacion as 'frances' | 'aleman' | 'americano' | 'plano',
      }).then(res => {
        if (res.success && res.data) setSimulacion(res.data)
      }).catch(console.error)
    }
  }, [formVenta.precio_original, formVenta.descuento, formVenta.gastos_escrituracion, formVenta.enganche_pactado, formVenta.plazo_meses, formVenta.tasa_interes_anual, formVenta.sistema_amortizacion])

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

    try {
      const res = await negociacionService.create({
        ...formVenta,
        cliente_id: parseInt(formVenta.cliente_id),
        lote_id: parseInt(formVenta.lote_id),
        parametrizacion_mora_id: formVenta.parametrizacion_mora_id
          ? parseInt(formVenta.parametrizacion_mora_id)
          : undefined,
      })

      if (res.success) {
        toast.success('Contrato de negociación y plan de pagos creados con éxito')
        setModalNuevaVenta(false)
        cargarDatos()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al procesar la negociación')
    }
  }

  const handleImprimirRecibo = (pago: any, neg: Negociacion) => {
    const cuerpoHTML = `
      <h2 style="text-align: center; color: #047857; text-transform: uppercase; margin-bottom: 3px;">RECIBO OFICIAL DE PAGO</h2>
      <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">NO. ${pago.numero_recibo || 'REC-TER'}</p>
      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e5e7eb;" />

      <table style="width: 100%; margin-bottom: 20px; font-size: 11px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <strong>Comprador:</strong> ${neg.comprador?.nombres ? `${neg.comprador.nombres} ${neg.comprador.apellidos}` : neg.comprador?.nombre_completo || 'Cliente'}<br />
            <strong>DPI / NIT:</strong> ${neg.comprador?.dpi || 'S/D'} / ${neg.comprador?.nit || 'C/F'}<br />
            <strong>Contrato Ref:</strong> ${neg.codigo_negociacion}
          </td>
          <td style="width: 50%; vertical-align: top; text-align: right;">
            <strong>Fecha de Pago:</strong> ${new Date().toLocaleDateString('es-GT')}<br />
            <strong>Método:</strong> ${String(pago.metodo_pago || 'EFECTIVO').toUpperCase()}<br />
            <strong>Referencia:</strong> ${pago.referencia_bancaria || 'N/A'}
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin-bottom: 25px; font-size: 12px; border: 1px solid #e5e7eb;">
        <tr style="background: #f0fdf4;">
          <th style="padding: 10px; text-align: left; color: #166534;">Concepto / Descripción</th>
          <th style="padding: 10px; text-align: right; color: #166534;">Monto (Q)</th>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${pago.tipo_pago === 'enganche' ? 'Pago de Enganche Inmobiliario' : pago.tipo_pago === 'abono_capital' ? 'Abono Extraordinario a Capital' : 'Pago de Cuota de Financiamiento'}</strong><br />
            <span style="font-size: 10px; color: #666;">Terreno Lote ${neg.lote?.codigo_unico || 'Lote'} · ${neg.lote?.parcela?.finca?.nombre || 'Finca'}</span>
          </td>
          <td style="padding: 10px; text-align: right; font-weight: bold; border-bottom: 1px solid #eee;">
            Q${Number(pago.monto_total || formPago.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </td>
        </tr>
        <tr style="background: #f8fafc; font-weight: bold;">
          <td style="padding: 10px; text-align: right;">TOTAL COBRADO:</td>
          <td style="padding: 10px; text-align: right; color: #047857; font-size: 14px;">
            Q${Number(pago.monto_total || formPago.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin-top: 50px; text-align: center; font-size: 10px;">
        <tr>
          <td style="width: 45%; border-top: 1px solid #000; padding-top: 6px;">
            Firma y Sello de Caja / Receptor
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; border-top: 1px solid #000; padding-top: 6px;">
            Firma del Comprador
          </td>
        </tr>
      </table>
    `
    imprimirDocumentoHTML(`Recibo-${pago.numero_recibo || 'Pago'}`, cuerpoHTML, empresaConfig)
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negociacionSeleccionada) return

    try {
      const res = await pagoTerrenoService.registrar({
        negociacion_id: negociacionSeleccionada.id,
        tipo_pago: formPago.tipo_pago,
        monto: formPago.monto,
        metodo_pago: formPago.metodo_pago,
        referencia_bancaria: formPago.referencia_bancaria,
        observaciones: formPago.observaciones
      })

      if (res.success) {
        toast.success('Pago aplicado exitosamente e ingresado en Caja')
        if (res.data) {
          handleImprimirRecibo(res.data, negociacionSeleccionada)
        }
        setModalRegistrarPago(false)
        setFormPago({ tipo_pago: 'cuota_normal', monto: 0, metodo_pago: 'efectivo', referencia_bancaria: '', observaciones: '' })
        cargarDatos()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al registrar el pago')
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

  const handleImprimirContrato = async (neg: Negociacion) => {
    try {
      const res = await api.get<{ success: boolean; data: { html: string } }>(`/negociaciones/${neg.id}/contrato-html`)
      if (res.success && res.data?.html) {
        imprimirDocumentoHTML(`Contrato-${neg.codigo_negociacion}`, res.data.html, empresaConfig)
      } else {
        toast.error('No se pudo generar el contrato')
      }
    } catch (e) {
      toast.error('Error al generar contrato para impresión')
    }
  }

  const handleImprimirEstadoCuentaDoc = (neg: Negociacion) => {
    const cuerpoHTML = `
      <h2 style="text-align: center; color: #047857; text-transform: uppercase; margin-bottom: 5px;">ESTADO DE CUENTA & KARDEX INMOBILIARIO</h2>
      <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">CONTRATO NO. ${neg.codigo_negociacion}</p>
      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e5e7eb;" />

      <table style="width: 100%; margin-bottom: 20px; font-size: 11px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <strong style="color: #047857;">DATOS DEL COMPRADOR</strong><br />
            <strong>Nombre:</strong> ${neg.comprador?.nombres ? `${neg.comprador.nombres} ${neg.comprador.apellidos}` : neg.comprador?.nombre_completo || 'Cliente'}<br />
            <strong>DPI:</strong> ${neg.comprador?.dpi || 'S/D'}<br />
            <strong>NIT:</strong> ${neg.comprador?.nit || 'C/F'}<br />
            <strong>Teléfono:</strong> ${neg.comprador?.telefono || '—'}
          </td>
          <td style="width: 50%; vertical-align: top;">
            <strong style="color: #047857;">DATOS DEL TERRENO</strong><br />
            <strong>Finca:</strong> ${neg.lote?.parcela?.finca?.nombre || 'Finca Principal'}<br />
            <strong>Parcela / Manzana:</strong> ${neg.lote?.parcela?.nombre_identificador || 'N/A'}<br />
            <strong>Lote:</strong> ${neg.lote?.numero_lote || neg.lote?.codigo_unico || 'Lote'}<br />
            <strong>Área:</strong> ${neg.lote?.area_m2 || 0} m² (Frente: ${neg.lote?.frente_metros || 0}m, Fondo: ${neg.lote?.fondo_metros || 0}m)
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <tr>
          <td style="padding: 10px;"><strong>Precio Total:</strong><br />Q${Number(neg.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px;"><strong>Enganche Pagado:</strong><br />Q${Number(neg.enganche_pagado || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px;"><strong>Capital Amortizado:</strong><br />Q${Number(neg.total_capital_pagado || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; color: #b91c1c; font-weight: bold;"><strong>Saldo Pendiente:</strong><br />Q${Number(neg.saldo_capital_pendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <h3 style="color: #047857; font-size: 13px; margin-bottom: 8px;">TABLA DE AMORTIZACIÓN Y CUOTAS</h3>
      <table class="data-table" style="font-size: 10px;">
        <thead>
          <tr>
            <th>Cuota</th>
            <th>Vencimiento</th>
            <th class="text-right">Capital</th>
            <th class="text-right">Interés</th>
            <th class="text-right">Total Cuota</th>
            <th class="text-right">Saldo Restante</th>
            <th class="text-center">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cuotasPlan(neg).length === 0 ? `
            <tr><td colspan="7" style="text-align:center;padding:12px;">Aún no hay cronograma. El plan se genera al completar el enganche.</td></tr>
          ` : cuotasPlan(neg).map((c: any) => `
            <tr>
              <td>#${c.numero_cuota}</td>
              <td>${formatFechaCorta(c.fecha_vencimiento)}</td>
              <td class="text-right">Q${Number(c.cuota_capital).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">Q${Number(c.cuota_interes || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-right font-bold">Q${Number(c.cuota_monto_total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">Q${Number(c.saldo_capital_restante).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-center">
                <span class="badge ${c.estado === 'pagada' ? 'badge-success' : 'badge-warning'}">
                  ${String(c.estado || 'pendiente').toUpperCase()}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    imprimirDocumentoHTML(`EstadoCuenta-${neg.codigo_negociacion}`, cuerpoHTML, empresaConfig)
  }

  const abrirPago = (neg: Negociacion) => {
    setNegociacionSeleccionada(neg)
    const cuotaSugerida = neg.saldo_capital_pendiente > 0 ? (neg.cuota_mensual || neg.saldo_capital_pendiente) : 0
    setFormPago({
      tipo_pago: neg.enganche_pagado < neg.enganche_pactado ? 'enganche' : 'cuota_normal',
      monto: cuotaSugerida,
      metodo_pago: 'efectivo',
      referencia_bancaria: '',
      observaciones: ''
    })
    setModalRegistrarPago(true)
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
          <Button onClick={() => setModalNuevaVenta(true)} className="gap-2 shadow-sm">
            <Plus size={18} weight="bold" /> Nueva Negociación / Venta
          </Button>
        </div>
      </div>

      {/* Listado de Negociaciones */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Contratos y Negociaciones Activas ({negociaciones.length})</CardTitle>
          <CardDescription className="text-xs">Seguimiento en tiempo real de saldos, cuotas y pagos de compradores.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {negociaciones.map((neg) => {
              const total = Number(neg.precio_final || 1)
              const pagado = Number(neg.total_capital_pagado || 0)
              const porcentaje = Math.min(100, Math.round((pagado / total) * 100))
              return (
                <div key={neg.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-xs text-primary">{neg.codigo_negociacion}</p>
                      <p className="font-medium truncate">
                        {neg.comprador?.nombres ? `${neg.comprador.nombres} ${neg.comprador.apellidos}` : neg.comprador?.nombre_completo || 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {neg.lote?.codigo_unico || 'Lote'} · {neg.plazo_meses} meses
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
                    <Button size="sm" variant="ghost" onClick={() => handleImprimirContrato(neg)} className="h-8 gap-1 text-xs">
                      <FileText size={14} /> Contrato
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
                {negociaciones.map((neg) => {
                  const total = Number(neg.precio_final || 1)
                  const pagado = Number(neg.total_capital_pagado || 0)
                  const porcentaje = Math.min(100, Math.round((pagado / total) * 100))

                  return (
                    <tr key={neg.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                        {neg.codigo_negociacion}
                        <span className="block text-[0.6875rem] text-muted-foreground font-normal">
                          {neg.tipo_negociacion.toUpperCase()} · {neg.plazo_meses} meses
                          {neg.tipo_negociacion === 'credito' ? ` · ${etiquetaSistema(neg.sistema_amortizacion)}` : ''}
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
                        <span className="font-semibold text-foreground">{neg.lote?.codigo_unico || 'Lote'}</span>
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
                          <Button size="sm" variant="ghost" onClick={() => handleImprimirContrato(neg)} className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <FileText size={14} /> Contrato
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrirEstadoCuenta(neg)} className="h-8 gap-1 text-xs">
                            <Receipt size={14} /> Estado Cuenta
                          </Button>
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
                <Label>Lote Disponible a Asignar *</Label>
                <select
                  required
                  value={formVenta.lote_id}
                  onChange={(e) => handleSeleccionarLote(e.target.value)}
                  className="w-full bg-background border rounded-lg p-2.5 text-sm font-semibold"
                >
                  <option value="">Selecciona un lote disponible...</option>
                  {lotesDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.codigo_unico} ({l.area_m2}m²) — Q{Number(l.precio_venta).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condiciones Financieras */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Calculator size={18} className="text-primary" /> Condiciones Comerciales & Financiamiento
              </h4>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de operación *</Label>
                <select
                  value={formVenta.tipo_negociacion}
                  onChange={(e) => setFormVenta({ ...formVenta, tipo_negociacion: e.target.value as 'contado' | 'credito' | 'reserva' })}
                  className="w-full bg-background border rounded-lg p-2.5 text-sm"
                >
                  <option value="credito">Crédito / financiamiento</option>
                  <option value="contado">Contado</option>
                  <option value="reserva">Reserva</option>
                </select>
              </div>

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
                  <select
                    value={formVenta.plazo_meses}
                    onChange={(e) => setFormVenta({ ...formVenta, plazo_meses: parseInt(e.target.value) })}
                    className="w-full bg-background border rounded-lg p-2 text-sm"
                  >
                    <option value="6">6 Meses</option>
                    <option value="12">12 Meses (1 Año)</option>
                    <option value="24">24 Meses (2 Años)</option>
                    <option value="36">36 Meses (3 Años)</option>
                    <option value="48">48 Meses (4 Años)</option>
                    <option value="60">60 Meses (5 Años)</option>
                  </select>
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
                      {formVenta.sistema_amortizacion === 'aleman' && 'Cada mes se paga el mismo capital; la cuota baja conforme baja el interés.'}
                      {formVenta.sistema_amortizacion === 'americano' && 'Se pagan intereses cada mes y el capital se liquida en la última cuota.'}
                      {formVenta.sistema_amortizacion === 'plano' && 'Interés simple prorrateado; la cuota no se recalcula sobre saldos.'}
                      {(formVenta.sistema_amortizacion === 'frances' || !formVenta.sistema_amortizacion) && 'Cuota mensual igual durante todo el plazo (sistema más usado en terrenos).'}
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
            {simulacion && (
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
                    <span className="text-[0.6875rem] text-muted-foreground block">Cuota Mensual</span>
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
          <DialogContent className="w-[95vw] sm:max-w-[860px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Estado de Cuenta: {negociacionSeleccionada.codigo_negociacion}</span>
                <Badge variant="outline" className="text-primary">{negociacionSeleccionada.estado.toUpperCase()}</Badge>
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
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Cronograma de Cuotas & Amortización
                </h4>
                <div className="max-h-56 overflow-auto border rounded-xl">
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
                        return (
                        <tr key={cuota.id || cuota.numero_cuota} className={cuota.estado === 'pagada' ? 'bg-emerald-500/5' : ''}>
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
                            {cuota.estado === 'pagada' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-600 text-[0.625rem]">PAGADA</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[0.625rem]">{String(cuota.estado || 'pendiente').toUpperCase()}</Badge>
                            )}
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
                  <div className="max-h-40 overflow-auto border rounded-xl">
                    <table className="w-full text-left text-xs min-w-[520px]">
                      <thead className="bg-muted/60 sticky top-0 border-b">
                        <tr>
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Documento</th>
                          <th className="p-2">Concepto</th>
                          <th className="p-2">Abono</th>
                          <th className="p-2">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {kardexMovimientos.map((mov, idx) => (
                          <tr key={`${mov.documento || 'mov'}-${idx}`} className={mov.anulado ? 'opacity-60' : ''}>
                            <td className="p-2 whitespace-nowrap">{formatFechaCorta(mov.fecha)}</td>
                            <td className="p-2 font-mono">{mov.documento || '—'}</td>
                            <td className="p-2">{mov.concepto}</td>
                            <td className="p-2">Q{Number(mov.abono || 0).toLocaleString()}</td>
                            <td className="p-2">Q{Number(mov.saldo || 0).toLocaleString()}</td>
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
                <Button variant="outline" onClick={() => handleImprimirEstadoCuentaDoc(negociacionSeleccionada)} className="gap-1.5 text-xs">
                  <Printer size={16} /> Imprimir
                </Button>
                <Button variant="outline" onClick={() => handleDescargarEstadoCuentaPdf(negociacionSeleccionada)} disabled={descargandoDoc === 'estado'} className="gap-1.5 text-xs">
                  <DownloadSimple size={16} /> {descargandoDoc === 'estado' ? 'Descargando...' : 'Estado de cuenta PDF'}
                </Button>
                <Button variant="outline" onClick={() => handleDescargarPlanPagosPdf(negociacionSeleccionada)} disabled={descargandoDoc === 'plan'} className="gap-1.5 text-xs">
                  <DownloadSimple size={16} /> {descargandoDoc === 'plan' ? 'Descargando...' : 'Plan de pagos PDF'}
                </Button>
                <Button variant="ghost" onClick={() => handleImprimirContrato(negociacionSeleccionada)} className="gap-1.5 text-xs">
                  <FileText size={16} /> Imprimir Contrato
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
          <DialogContent className="sm:max-w-[500px]">
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
              <div className="space-y-2">
                <Label>Tipo de Pago *</Label>
                <select
                  value={formPago.tipo_pago}
                  onChange={(e) => setFormPago({ ...formPago, tipo_pago: e.target.value })}
                  className="w-full bg-background border rounded-lg p-2.5 text-sm"
                >
                  <option value="cuota_normal">Pago de Cuota Ordinaria</option>
                  <option value="enganche">Pago de Enganche</option>
                  <option value="abono_capital">Abono Extraordinario a Capital</option>
                  <option value="pago_total">Liquidación Total de Saldo</option>
                  <option value="gastos_escritura">Gastos de Escrituración</option>
                </select>
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
                    className="w-full bg-background border rounded-lg p-2 text-sm"
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalRegistrarPago(false)}>Cancelar</Button>
                <Button type="submit">Ingresar a Caja & Emitir Recibo</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

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
