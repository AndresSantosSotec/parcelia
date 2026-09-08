import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, Printer, TreeStructure, CurrencyDollar, Calendar, Percent, Sparkle } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, loteService, Lote } from '@/lib/api'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { imprimirDocumentoHTML } from '@/utils/impresionDocumentos'
import { toast } from 'sonner'

interface SimuladorModuleProps {
  sessionUser?: any
}

export function SimuladorModule(_props: SimuladorModuleProps = {}) {
  const { config: empresaConfig } = useEmpresaConfig()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<string>('')
  
  // Parámetros de simulación
  const [precioLote, setPrecioLote] = useState(120000)
  const [descuento, setDescuento] = useState(5000)
  const [gastosEscrituracion, setGastosEscrituracion] = useState(3500)
  const [gastosAdmin, setGastosAdmin] = useState(500)
  const [enganche, setEnganche] = useState(15000)
  const [plazoMeses, setPlazoMeses] = useState(36)
  const [tasaAnual, setTasaAnual] = useState(6.0)
  const [metodo, setMetodo] = useState('frances')
  const [fechaPrimerPago, setFechaPrimerPago] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  )

  // Datos del cliente prospecto para la cotización
  const [nombreProspecto, setNombreProspecto] = useState('Cliente Prospecto')
  const [telefonoProspecto, setTelefonoProspecto] = useState('')

  // Resultado
  const [simulacion, setSimulacion] = useState<any>(null)
  const [cargando, setCargando] = useState(false)

  // Cargar lotes disponibles
  useEffect(() => {
    loteService.getDisponibles().then(res => {
      if (res.success && res.data) {
        setLotes(res.data)
      }
    }).catch(() => {})
  }, [])

  // Al seleccionar un lote, auto-rellenar precio
  const handleSelectLote = (id: string) => {
    setLoteSeleccionadoId(id)
    const lote = lotes.find(l => String(l.id) === id)
    if (lote) {
      const precio = Number(lote.precio_venta || 100000)
      setPrecioLote(precio)
      setEnganche(Math.round(precio * 0.10)) // 10% de enganche sugerido
    }
  }

  // Ejecutar simulación
  const ejecutarSimulacion = async () => {
    setCargando(true)
    try {
      const res = await api.post<any>('/simulador/calcular', {
        precio_lote: precioLote,
        descuento: descuento,
        gastos_escrituracion: gastosEscrituracion,
        gastos_administrativos: gastosAdmin,
        enganche: enganche,
        plazo_meses: plazoMeses,
        tasa_interes_anual: tasaAnual,
        metodo: metodo,
        fecha_primer_pago: fechaPrimerPago,
      })

      if (res.success && res.data) {
        setSimulacion(res.data)
      }
    } catch (e) {
      toast.error('Error al calcular simulación')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    ejecutarSimulacion()
  }, [precioLote, descuento, gastosEscrituracion, gastosAdmin, enganche, plazoMeses, tasaAnual, metodo, fechaPrimerPago])

  // Imprimir Cotización Membretada con Logo
  const handleImprimirCotizacion = () => {
    if (!simulacion) return
    const lote = lotes.find(l => String(l.id) === loteSeleccionadoId)

    const cuerpoHTML = `
      <h2 style="text-align: center; color: #047857; text-transform: uppercase; margin-bottom: 3px;">COTIZACIÓN DE FINANCIAMIENTO INMOBILIARIO</h2>
      <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">PROPUESTA COMERCIAL & PLAN DE PAGOS</p>
      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e5e7eb;" />

      <table style="width: 100%; margin-bottom: 20px; font-size: 11px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <strong style="color: #047857;">PROSPECTO / COMPRADOR:</strong><br />
            <strong>Nombre:</strong> ${nombreProspecto || 'Cliente Prospecto'}<br />
            <strong>Teléfono:</strong> ${telefonoProspecto || '—'}<br />
            <strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-GT')}
          </td>
          <td style="width: 50%; vertical-align: top;">
            <strong style="color: #047857;">DATOS DEL TERRENO COTIZADO:</strong><br />
            <strong>Lote:</strong> ${lote ? `${lote.codigo_unico} (${lote.numero_lote})` : 'Lote Personalizado'}<br />
            <strong>Finca / Ubicación:</strong> ${lote?.parcela?.finca?.nombre || 'Desarrollo Campestre'}<br />
            <strong>Área:</strong> ${lote?.area_m2 || 0} m²
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <tr>
          <td style="padding: 10px;"><strong>Precio Base:</strong><br />Q${Number(simulacion.precio_original).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; color: #047857;"><strong>Descuento:</strong><br />Q${Number(simulacion.descuento).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px;"><strong>Precio Final:</strong><br />Q${Number(simulacion.precio_final).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; color: #166534; font-weight: bold;"><strong>Enganche Requerido:</strong><br />Q${Number(simulacion.enganche).toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${simulacion.porcentaje_enganche}%)</td>
        </tr>
      </table>

      <div style="background: #ecfdf5; border: 2px solid #a7f3d0; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
        <div style="font-size: 11px; color: #065f46; font-weight: bold; text-transform: uppercase;">Cuota Mensual Nivelada</div>
        <div style="font-size: 26px; font-weight: 900; color: #047857;">Q${Number(simulacion.cuota_mensual).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
        <div style="font-size: 11px; color: #047857;">Financiamiento a <strong>${simulacion.plazo_meses} meses</strong> · Tasa de Interés: <strong>${simulacion.tasa_anual}% anual</strong></div>
      </div>

      <h3 style="color: #047857; font-size: 13px; margin-bottom: 8px;">TABLA DE AMORTIZACIÓN PROYECTADA</h3>
      <table class="data-table" style="font-size: 10px;">
        <thead>
          <tr>
            <th>Cuota</th>
            <th>Vencimiento</th>
            <th class="text-right">Capital</th>
            <th class="text-right">Interés</th>
            <th class="text-right">Cuota Total</th>
            <th class="text-right">Saldo Restante</th>
          </tr>
        </thead>
        <tbody>
          ${(simulacion.cuotas || []).slice(0, 36).map((c: any) => `
            <tr>
              <td>Cuota #${c.numero_cuota}</td>
              <td>${c.fecha_vencimiento}</td>
              <td class="text-right">Q${Number(c.cuota_capital).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">Q${Number(c.cuota_interes).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-right font-bold">Q${Number(c.cuota_monto_total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">Q${Number(c.saldo_capital_restante).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${simulacion.cuotas?.length > 36 ? `<p style="font-size: 9px; color: #666; text-align: center; margin-top: 5px;">(Se muestran las primeras 36 cuotas de ${simulacion.cuotas.length} totales)</p>` : ''}
    `
    imprimirDocumentoHTML(`Cotizacion_${nombreProspecto.replace(/\s+/g, '_')}`, cuerpoHTML, empresaConfig)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Header */}
      <div className="page-toolbar bg-card/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <Calculator size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
            <h1 className="font-bold tracking-tight text-foreground">Simulador de Financiamiento de Terrenos</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Cotizador interactivo en tiempo real con amortización sobre saldos, cálculo de cuotas y emisión de cotizaciones oficiales.
          </p>
        </div>
        <div className="page-toolbar-actions">
          <Button onClick={handleImprimirCotizacion} className="gap-2 shadow-sm">
            <Printer size={16} /> Imprimir Cotización
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Parámetros */}
        <Card className="lg:col-span-1 border-border/80 shadow-sm space-y-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkle size={18} className="text-primary" /> Parámetros del Lote
            </CardTitle>
            <CardDescription className="text-xs">Selecciona un lote o ingresa valores personalizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lote Predefinido */}
            <div className="space-y-2">
              <Label className="text-xs">Seleccionar Lote en Inventario (Opcional)</Label>
              <select
                value={loteSeleccionadoId}
                onChange={(e) => handleSelectLote(e.target.value)}
                className="w-full bg-background border rounded-lg p-2.5 text-xs font-medium"
              >
                <option value="">-- Ingreso Manual de Precio --</option>
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.codigo_unico} ({l.parcela?.finca?.nombre}) - Q{Number(l.precio_venta).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Datos del Prospecto */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nombre Prospecto</Label>
                <Input
                  value={nombreProspecto}
                  onChange={(e) => setNombreProspecto(e.target.value)}
                  className="text-xs h-8"
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={telefonoProspecto}
                  onChange={(e) => setTelefonoProspecto(e.target.value)}
                  className="text-xs h-8"
                  placeholder="5555-4444"
                />
              </div>
            </div>

            {/* Precios y Descuentos */}
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Precio Base del Lote (Q)</Label>
                <Input
                  type="number"
                  value={precioLote}
                  onChange={(e) => setPrecioLote(parseFloat(e.target.value) || 0)}
                  className="font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Descuento (Q)</Label>
                  <Input
                    type="number"
                    value={descuento}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Enganche (Q)</Label>
                  <Input
                    type="number"
                    value={enganche}
                    onChange={(e) => setEnganche(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Escrituración (Q)</Label>
                  <Input
                    type="number"
                    value={gastosEscrituracion}
                    onChange={(e) => setGastosEscrituracion(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gastos Admin (Q)</Label>
                  <Input
                    type="number"
                    value={gastosAdmin}
                    onChange={(e) => setGastosAdmin(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Sistema de amortización */}
              <div className="space-y-1">
                <Label className="text-xs">Sistema de amortización</Label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="w-full bg-background border rounded-lg p-2 text-xs font-semibold"
                >
                  <option value="frances">Francés (cuota fija) — recomendado</option>
                  <option value="aleman">Alemán (capital fijo, cuota decreciente)</option>
                  <option value="americano">Americano (intereses + capital al final)</option>
                </select>
              </div>

              {/* Plazo y Tasa */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Plazo en Meses</Label>
                  <select
                    value={plazoMeses}
                    onChange={(e) => setPlazoMeses(parseInt(e.target.value) || 12)}
                    className="w-full bg-background border rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value={12}>12 meses (1 año)</option>
                    <option value={24}>24 meses (2 años)</option>
                    <option value={36}>36 meses (3 años)</option>
                    <option value={48}>48 meses (4 años)</option>
                    <option value={60}>60 meses (5 años)</option>
                    <option value={72}>72 meses (6 años)</option>
                    <option value={84}>84 meses (7 años)</option>
                    <option value={120}>120 meses (10 años)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tasa Anual (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tasaAnual}
                    onChange={(e) => setTasaAnual(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel Derecho: Resultado y Tabla */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Resumen de Cuota */}
          {simulacion && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-5 text-center">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Cuota Mensual Nivelada
                  </div>
                  <div className="text-3xl font-black text-emerald-600 mt-1">
                    Q{Number(simulacion.cuota_mensual).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {simulacion.plazo_meses} cuotas mensuales
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 text-center">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Monto Financiado
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    Q{Number(simulacion.monto_financiado).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Enganche: Q{Number(simulacion.enganche).toLocaleString()} ({simulacion.porcentaje_enganche}%)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 text-center">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Intereses
                  </div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    Q{Number(simulacion.total_intereses).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total a pagar: Q{Number(simulacion.total_a_pagar).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabla de Amortización */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Tabla de Amortización Proyectada ({simulacion?.cuotas?.length || 0} cuotas)</CardTitle>
                <CardDescription className="text-xs">Desglose mensual de capital, interés y saldo deudor</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleImprimirCotizacion} className="gap-1.5 text-xs">
                <Printer size={14} /> Imprimir
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto border rounded-xl">
                <Table>
                  <TableHeader className="bg-muted/60 sticky top-0 border-b">
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Fecha Vencimiento</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      <TableHead className="text-right">Cuota Total</TableHead>
                      <TableHead className="text-right">Saldo Restante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulacion?.cuotas?.map((c: any) => (
                      <TableRow key={c.numero_cuota}>
                        <TableCell className="font-mono font-bold text-xs text-primary">#{c.numero_cuota}</TableCell>
                        <TableCell className="text-xs">{c.fecha_vencimiento}</TableCell>
                        <TableCell className="text-right font-medium">Q{Number(c.cuota_capital).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-muted-foreground">Q{Number(c.cuota_interes).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold text-foreground">Q{Number(c.cuota_monto_total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-xs">Q{Number(c.saldo_capital_restante).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
