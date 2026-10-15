import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  ChartBar, Printer, TreeStructure, Handshake, CurrencyDollar, 
  Wallet, CheckCircle, Warning, Clock, Receipt, ArrowsClockwise 
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function ReportesModule() {
  const [cargando, setCargando] = useState(true)

  // Datos reales desde Laravel
  const [inventario, setInventario] = useState<any>(null)
  const [ventas, setVentas] = useState<any>(null)
  const [cobranza, setCobranza] = useState<any>(null)
  const [ingresosHoy, setIngresosHoy] = useState<any>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const queryVentas = (desde = fechaDesde, hasta = fechaHasta) => {
    const q = new URLSearchParams()
    if (desde) q.set('fecha_desde', desde)
    if (hasta) q.set('fecha_hasta', hasta)
    const texto = q.toString()
    return texto ? `/reportes-inmobiliarios/ventas?${texto}` : '/reportes-inmobiliarios/ventas'
  }

  const cargarVentas = async (desde = fechaDesde, hasta = fechaHasta) => {
    if (desde && hasta && hasta < desde) {
      toast.error('La fecha final del intervalo no puede ser anterior a la inicial')
      return
    }
    const resVen = await api.get<any>(queryVentas(desde, hasta)).catch(() => null)
    if (resVen?.success) setVentas(resVen.data)
  }

  const cargarReportes = async () => {
    setCargando(true)
    try {
      const [resInv, resVen, resCob, resIng] = await Promise.all([
        api.get<any>('/reportes-inmobiliarios/inventario').catch(() => null),
        api.get<any>(queryVentas()).catch(() => null),
        api.get<any>('/reportes-inmobiliarios/cobranza').catch(() => null),
        api.get<any>('/reportes-inmobiliarios/ingresos-diarios').catch(() => null),
      ])

      if (resInv?.success) setInventario(resInv.data)
      if (resVen?.success) setVentas(resVen.data)
      if (resCob?.success) setCobranza(resCob.data)
      if (resIng?.success) setIngresosHoy(resIng.data)
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar datos reales de reportes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [])

  const descargar = async (endpoint: string, formato: 'pdf' | 'xlsx', filename: string) => {
    try {
      const sep = endpoint.includes('?') ? '&' : '?'
      await api.downloadFile(`${endpoint}${sep}formato=${formato}`, filename)
    } catch {
      toast.error('No se pudo descargar el reporte')
    }
  }
  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Encabezado */}
      <div className="page-toolbar bg-card/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <ChartBar size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
            <h1 className="font-bold tracking-tight text-foreground">Reportes & Estadísticas Inmobiliarias</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Información en tiempo real de inventario de lotes, ventas, cobranza de cartera e ingresos de caja.
          </p>
        </div>
        <div className="page-toolbar-actions">
          <Button variant="outline" onClick={cargarReportes} disabled={cargando} className="gap-2">
            <ArrowsClockwise size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => descargar('/reportes-inmobiliarios/general', 'xlsx', 'informe-general.xlsx')}>Excel</Button>
          <Button onClick={() => descargar('/reportes-inmobiliarios/general', 'pdf', 'informe-general.pdf')} className="gap-2 shadow-sm">
            <Printer size={16} />
            PDF
          </Button>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <TreeStructure size={16} className="text-emerald-600" />
              Lotes Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">
              {inventario?.disponibles ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-2">/ {inventario?.total_lotes ?? 0} total</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor inventario: Q{Number(inventario?.valor_inventario_disponible || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <Handshake size={16} className="text-teal-600" />
              Ventas / Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">
              Q{Number(ventas?.monto_total_ventas || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(ventas?.total_contratos ?? 0) === 1 ? '1 contrato' : `${ventas?.total_contratos ?? 0} contratos`} · {ventas?.ventas_credito ?? 0} a plazo · {ventas?.ventas_contado ?? 0} al contado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <CurrencyDollar size={16} className="text-amber-600" />
              Cartera por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">
              Q{Number(cobranza?.saldo_cartera_capital || 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {cobranza?.contratos_al_dia ?? 0} al día · {cobranza?.contratos_en_mora ?? 0} en mora
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" />
              Ingresos de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">
              Q{Number(ingresosHoy?.total_ingresos || 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ingresosHoy?.total_recibos ?? 0} recibos cobrados hoy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de Detalle */}
      <Tabs defaultValue="inventario" className="space-y-4">
        <TabsList className="bg-muted/80 p-1 rounded-xl">
          <TabsTrigger value="inventario" className="rounded-lg gap-2 text-xs">
            <TreeStructure size={16} /> Inventario de Terrenos
          </TabsTrigger>
          <TabsTrigger value="ventas" className="rounded-lg gap-2 text-xs">
            <Handshake size={16} /> Contratos y Ventas
          </TabsTrigger>
          <TabsTrigger value="cobranza" className="rounded-lg gap-2 text-xs">
            <CurrencyDollar size={16} /> Cartera & Cobranza
          </TabsTrigger>
          <TabsTrigger value="caja" className="rounded-lg gap-2 text-xs">
            <Receipt size={16} /> Caja Diaria
          </TabsTrigger>
        </TabsList>

        {/* TAB INVENTARIO */}
        <TabsContent value="inventario">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Detalle de Lotes en Base de Datos ({inventario?.lotes?.length || 0})</CardTitle>
                <CardDescription className="text-xs">Estado de cada lote, área y precio de venta. La descarga la genera Laravel.</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar('/reportes-inmobiliarios/inventario', 'pdf', 'inventario-lotes.pdf')}>PDF</Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar('/reportes-inmobiliarios/inventario', 'xlsx', 'inventario-lotes.xlsx')}>Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="md:hidden divide-y">
                {inventario?.lotes?.map((lote: any) => (
                  <div key={lote.id} className="py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-primary">{lote.codigo_unico}</p>
                        <p className="font-semibold">Lote {lote.numero_lote}</p>
                        <p className="text-xs text-muted-foreground">
                          {lote.parcela?.finca?.nombre || 'Finca'} · {lote.parcela?.nombre_identificador}
                        </p>
                        <p className="text-xs text-muted-foreground">{lote.frente_metros}m × {lote.fondo_metros}m · {lote.area_m2} m²</p>
                      </div>
                      {lote.estado === 'disponible' && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">Disponible</Badge>}
                      {lote.estado === 'vendido' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 shrink-0">Vendido</Badge>}
                      {lote.estado === 'reservado' && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">Reservado</Badge>}
                      {lote.estado === 'pagado' && <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30 shrink-0">Liquidado</Badge>}
                    </div>
                    <p className="text-right font-bold">Q{Number(lote.precio_venta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Finca & Parcela</TableHead>
                      <TableHead>No. Lote</TableHead>
                      <TableHead>Dimensiones</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Precio de Venta</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventario?.lotes?.map((lote: any) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-mono font-bold text-xs text-primary">{lote.codigo_unico}</TableCell>
                        <TableCell>
                          <span className="font-medium">{lote.parcela?.finca?.nombre || 'Finca'}</span>
                          <span className="block text-xs text-muted-foreground">{lote.parcela?.nombre_identificador}</span>
                        </TableCell>
                        <TableCell className="font-semibold">{lote.numero_lote}</TableCell>
                        <TableCell className="text-xs">{lote.frente_metros}m x {lote.fondo_metros}m</TableCell>
                        <TableCell className="font-semibold">{lote.area_m2} m²</TableCell>
                        <TableCell className="font-bold">Q{Number(lote.precio_venta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {lote.estado === 'disponible' && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Disponible</Badge>}
                          {lote.estado === 'vendido' && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Vendido</Badge>}
                          {lote.estado === 'reservado' && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Reservado</Badge>}
                          {lote.estado === 'pagado' && <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30">Liquidado</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB VENTAS */}
        <TabsContent value="ventas">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Contratos Cerrados & Financiamientos</CardTitle>
                <CardDescription className="text-xs">
                  Total del intervalo: Q{Number(ventas?.monto_total_ventas || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}· {(ventas?.total_contratos ?? 0) === 1 ? '1 contrato' : `${ventas?.total_contratos ?? 0} contratos`}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-end">
                <label className="text-xs text-muted-foreground space-y-1">
                  <span className="block">Desde</span>
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="bg-background border rounded-lg px-2 py-1.5 text-sm text-foreground" />
                </label>
                <label className="text-xs text-muted-foreground space-y-1">
                  <span className="block">Hasta</span>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="bg-background border rounded-lg px-2 py-1.5 text-sm text-foreground" />
                </label>
                <Button variant="outline" size="sm" onClick={() => cargarVentas()}>Ver total</Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar(queryVentas(), 'pdf', 'ventas-terrenos.pdf')}>PDF</Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar(queryVentas(), 'xlsx', 'ventas-terrenos.xlsx')}>Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="md:hidden divide-y">
                {ventas?.ventas?.map((v: any) => (
                  <div key={v.id} className="py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-primary">{v.codigo_negociacion}</p>
                        <p className="font-medium truncate">
                          {v.cliente?.nombres ? `${v.cliente.nombres} ${v.cliente.apellidos}` : 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">{v.lote?.codigo_unico || 'Lote'} · {v.plazo_meses} meses</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{v.estado}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Precio</p>
                        <p className="font-bold">Q{Number(v.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Financiado</p>
                        <p className="font-bold text-amber-600">Q{Number(v.monto_financiado || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Precio Final</TableHead>
                      <TableHead>Enganche</TableHead>
                      <TableHead>Monto Financiado</TableHead>
                      <TableHead>Plazo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas?.ventas?.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono font-bold text-xs text-primary">{v.codigo_negociacion}</TableCell>
                        <TableCell className="font-medium">
                          {v.cliente?.nombres ? `${v.cliente.nombres} ${v.cliente.apellidos}` : 'Cliente'}
                        </TableCell>
                        <TableCell>{v.lote?.codigo_unico || 'Lote'}</TableCell>
                        <TableCell className="font-bold">Q{Number(v.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-emerald-600 font-semibold">Q{Number(v.enganche_pagado || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-amber-600">Q{Number(v.monto_financiado || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{v.plazo_meses} meses ({v.tasa_interes_anual}% anual)</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{v.estado}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB COBRANZA */}
        <TabsContent value="cobranza">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Seguimiento de Cartera & Amortizaciones</CardTitle>
                <CardDescription className="text-xs">Saldos pendientes y estado de mora</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar('/reportes-inmobiliarios/cobranza', 'pdf', 'cartera-terrenos.pdf')}>PDF</Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar('/reportes-inmobiliarios/cobranza', 'xlsx', 'cartera-terrenos.xlsx')}>Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="md:hidden divide-y">
                {cobranza?.contratos?.map((c: any) => (
                  <div key={c.id} className="py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold">{c.codigo_negociacion}</p>
                        <p className="font-medium truncate">{c.cliente?.nombres} {c.cliente?.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{c.cuotas_pagadas}/{c.plazo_meses} cuotas</p>
                      </div>
                      {c.dias_mora_actual > 0 ? (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 shrink-0">Mora: {c.dias_mora_actual} días</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">Al Día</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Pagado</p>
                        <p className="font-semibold text-emerald-600">Q{Number(c.total_capital_pagado || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo</p>
                        <p className="font-bold text-amber-600">Q{Number(c.saldo_capital_pendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Precio Total</TableHead>
                      <TableHead>Capital Pagado</TableHead>
                      <TableHead>Saldo Pendiente</TableHead>
                      <TableHead>Cuotas</TableHead>
                      <TableHead>Situación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cobranza?.contratos?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-bold text-xs">{c.codigo_negociacion}</TableCell>
                        <TableCell className="font-medium">{c.cliente?.nombres} {c.cliente?.apellidos}</TableCell>
                        <TableCell>Q{Number(c.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-emerald-600 font-semibold">Q{Number(c.total_capital_pagado || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-amber-600">Q{Number(c.saldo_capital_pendiente).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs">{c.cuotas_pagadas}/{c.plazo_meses}</TableCell>
                        <TableCell>
                          {c.dias_mora_actual > 0 ? (
                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Mora: {c.dias_mora_actual} días</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Al Día</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CAJA DIARIA */}
        <TabsContent value="caja">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recibos Emitidos Hoy en Caja ({ingresosHoy?.total_recibos || 0})</CardTitle>
                <CardDescription className="text-xs">Movimientos registrados en la jornada actual</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar('/reportes-inmobiliarios/ingresos-diarios', 'pdf', 'ingresos-terrenos.pdf')}>PDF</Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => descargar('/reportes-inmobiliarios/ingresos-diarios', 'xlsx', 'ingresos-terrenos.xlsx')}>Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              {ingresosHoy?.pagos?.length > 0 ? (
                <>
                <div className="md:hidden divide-y">
                  {ingresosHoy.pagos.map((p: any) => (
                    <div key={p.id} className="py-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-primary">{p.numero_recibo}</p>
                          <p className="font-medium truncate">{p.cliente?.nombres} {p.cliente?.apellidos}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.concepto}</p>
                          <p className="text-xs text-muted-foreground capitalize">{format(new Date(p.fecha_pago), 'HH:mm')} · {p.metodo_pago}</p>
                        </div>
                        <p className="font-bold text-emerald-600 shrink-0">
                          Q{Number(p.monto_total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recibo No.</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Monto Cobrado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingresosHoy.pagos.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-bold text-xs text-primary">{p.numero_recibo}</TableCell>
                          <TableCell className="text-xs">{format(new Date(p.fecha_pago), 'HH:mm')}</TableCell>
                          <TableCell className="font-medium">{p.cliente?.nombres} {p.cliente?.apellidos}</TableCell>
                          <TableCell className="text-xs">{p.concepto}</TableCell>
                          <TableCell className="capitalize text-xs font-semibold">{p.metodo_pago}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            Q{Number(p.monto_total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No se han registrado pagos en caja el día de hoy.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
