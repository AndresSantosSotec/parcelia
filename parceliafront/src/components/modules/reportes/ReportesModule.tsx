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
import { es } from 'date-fns/locale'
import { api } from '@/lib/api'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { imprimirDocumentoHTML } from '@/utils/impresionDocumentos'
import { toast } from 'sonner'

export function ReportesModule() {
  const { config: empresaConfig } = useEmpresaConfig()
  const [cargando, setCargando] = useState(true)

  // Datos reales desde Laravel
  const [inventario, setInventario] = useState<any>(null)
  const [ventas, setVentas] = useState<any>(null)
  const [cobranza, setCobranza] = useState<any>(null)
  const [ingresosHoy, setIngresosHoy] = useState<any>(null)

  const cargarReportes = async () => {
    setCargando(true)
    try {
      const [resInv, resVen, resCob, resIng] = await Promise.all([
        api.get<any>('/reportes-inmobiliarios/inventario').catch(() => null),
        api.get<any>('/reportes-inmobiliarios/ventas').catch(() => null),
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

  // Imprimir Reporte Consolidado
  const handleImprimirReporteGeneral = () => {
    const fechaHoy = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })
    const cuerpoHTML = `
      <h2 style="text-align: center; color: #047857; text-transform: uppercase; margin-bottom: 3px;">INFORME GENERAL DE GESTIÓN INMOBILIARIA</h2>
      <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">FECHA DE CORTE: ${fechaHoy.toUpperCase()}</p>
      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e5e7eb;" />

      <h3 style="color: #047857; font-size: 13px; margin-bottom: 8px;">1. RESUMEN DE INVENTARIO DE LOTES</h3>
      <table style="width: 100%; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <tr>
          <td style="padding: 10px;"><strong>Total Lotes:</strong><br />${inventario?.total_lotes || 0}</td>
          <td style="padding: 10px; color: #166534;"><strong>Disponibles:</strong><br />${inventario?.disponibles || 0}</td>
          <td style="padding: 10px; color: #0369a1;"><strong>Vendidos / Contratos:</strong><br />${inventario?.vendidos || 0}</td>
          <td style="padding: 10px; color: #a16207;"><strong>Reservados:</strong><br />${inventario?.reservados || 0}</td>
          <td style="padding: 10px;"><strong>Área Total:</strong><br />${inventario?.area_total_m2 || 0} m²</td>
        </tr>
      </table>

      <h3 style="color: #047857; font-size: 13px; margin-bottom: 8px;">2. RESUMEN FINANCIERO Y CARTERA</h3>
      <table style="width: 100%; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <tr>
          <td style="padding: 10px;"><strong>Contratos Activos:</strong><br />${cobranza?.total_contratos_activos || 0}</td>
          <td style="padding: 10px; color: #b91c1c; font-weight: bold;"><strong>Cartera por Cobrar:</strong><br />Q${Number(cobranza?.saldo_cartera_capital || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; color: #166534; font-weight: bold;"><strong>Capital Recuperado:</strong><br />Q${Number(cobranza?.capital_recuperado || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; color: #047857;"><strong>Intereses Cobrados:</strong><br />Q${Number(cobranza?.intereses_recaudados || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <h3 style="color: #047857; font-size: 13px; margin-bottom: 8px;">3. RECAUDACIÓN DEL DÍA EN CAJA</h3>
      <table class="data-table" style="font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr>
            <th>Concepto / Método</th>
            <th class="text-right">Monto Recaudado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Efectivo en Caja</td>
            <td class="text-right font-bold">Q${Number(ingresosHoy?.desglose_por_metodo?.efectivo || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Transferencias y Depósitos Bancarios</td>
            <td class="text-right font-bold">Q${Number((ingresosHoy?.desglose_por_metodo?.transferencia || 0) + (ingresosHoy?.desglose_por_metodo?.deposito || 0)).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background: #f0fdf4;">
            <td><strong>TOTAL INGRESOS HOY (${ingresosHoy?.total_recibos || 0} recibos)</strong></td>
            <td class="text-right font-bold" style="color: #047857; font-size: 13px;">Q${Number(ingresosHoy?.total_ingresos || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    `
    imprimirDocumentoHTML(`Reporte_General_${format(new Date(), 'yyyyMMdd')}`, cuerpoHTML, empresaConfig)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/70 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ChartBar size={28} className="text-primary" weight="duotone" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes & Estadísticas Inmobiliarias</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Información en tiempo real de inventario de lotes, ventas, cobranza de cartera e ingresos de caja.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarReportes} disabled={cargando} className="gap-2">
            <ArrowsClockwise size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </Button>
          <Button onClick={handleImprimirReporteGeneral} className="gap-2 shadow-sm">
            <Printer size={16} />
            Imprimir Informe
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
              {ventas?.total_contratos ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ventas?.ventas_credito ?? 0} a crédito · {ventas?.ventas_contado ?? 0} al contado
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
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Detalle de Lotes en Base de Datos ({inventario?.lotes?.length || 0})</CardTitle>
                <CardDescription className="text-xs">Estado de cada lote, área y precio de venta</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contratos Cerrados & Financiamientos</CardTitle>
              <CardDescription className="text-xs">Registro histórico de transacciones realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seguimiento de Cartera & Amortizaciones</CardTitle>
              <CardDescription className="text-xs">Saldos pendientes y estado de mora</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recibos Emitidos Hoy en Caja ({ingresosHoy?.total_recibos || 0})</CardTitle>
              <CardDescription className="text-xs">Movimientos registrados en la jornada actual</CardDescription>
            </CardHeader>
            <CardContent>
              {ingresosHoy?.pagos?.length > 0 ? (
                <div className="overflow-x-auto">
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
