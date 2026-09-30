import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, DownloadSimple, TreeStructure, CurrencyDollar, Calendar, Percent, Sparkle } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, loteService, Lote } from '@/lib/api'
import { toast } from 'sonner'

interface SimuladorModuleProps {
  sessionUser?: any
}

export function SimuladorModule(_props: SimuladorModuleProps = {}) {
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

  const handleDescargarCotizacion = async () => {
    if (!simulacion) return
    try {
      const nombre = (nombreProspecto || 'prospecto').replace(/\s+/g, '_')
      await api.downloadPost('/simulador/cotizacion-pdf', {
        precio_lote: precioLote,
        descuento,
        gastos_escrituracion: gastosEscrituracion,
        gastos_administrativos: gastosAdmin,
        enganche,
        plazo_meses: plazoMeses,
        tasa_interes_anual: tasaAnual,
        metodo,
        fecha_primer_pago: fechaPrimerPago,
        nombre_prospecto: nombreProspecto,
        telefono_prospecto: telefonoProspecto,
        lote_id: loteSeleccionadoId ? Number(loteSeleccionadoId) : null,
      }, `Cotizacion_${nombre}.pdf`)
    } catch {
      toast.error('No se pudo descargar la cotización')
    }
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
          <Button onClick={handleDescargarCotizacion} disabled={!simulacion} className="gap-2 shadow-sm">
            <DownloadSimple size={16} /> Cotización PDF
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
              <Button size="sm" variant="outline" onClick={handleDescargarCotizacion} disabled={!simulacion} className="gap-1.5 text-xs">
                <DownloadSimple size={14} /> PDF
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
