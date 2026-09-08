import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShoppingCart, Tag, CreditCard, CurrencyDollar, Receipt, User } from '@phosphor-icons/react'
import { Prenda, Venta, FormaPago, Apartado, PlanPago, Cuota } from '@/lib/types'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { calcularIntereses, calcularFechaVencimiento } from '@/lib/helpers'
import { clienteService, api } from '@/lib/api'

interface VentaDialogProps {
  prenda: Prenda
  open: boolean
  onOpenChange: (open: boolean) => void
  onVentaCompleta: () => void
}

export function VentaDialog({ prenda, open, onOpenChange, onVentaCompleta }: VentaDialogProps) {
  const [prendas, setPrendas] = useKV<Prenda[]>('prendas', [])
  const [ventas, setVentas] = useKV<Venta[]>('ventas', [])
  const [apartados, setApartados] = useKV<Apartado[]>('apartados', [])
  const [planesPago, setPlanesPago] = useKV<PlanPago[]>('planes-pago', [])
  const [creditos] = useKV<any[]>('creditos', [])
  
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'apartado' | 'credito'>('contado')
  const [clienteId, setClienteId] = useState('')
  const [clientes, setClientes] = useState<any[]>([])
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [compradorNombre, setCompradorNombre] = useState('')
  const [compradorDPI, setCompradorDPI] = useState('')
  const [compradorTelefono, setCompradorTelefono] = useState('')
  const [descuento, setDescuento] = useState('0')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoTarjeta, setMontoTarjeta] = useState('')
  const [montoTransferencia, setMontoTransferencia] = useState('')
  const [enganche, setEnganche] = useState('')
  const [plazoApartado, setPlazoApartado] = useState('7')
  const [numeroCuotas, setNumeroCuotas] = useState('3')
  const [tasaInteresPlan, setTasaInteresPlan] = useState('5')
  const [session] = useKV<any>('user-session', null)
  const [configVentas, setConfigVentas] = useState<{apartado_habilitado: boolean | null}>({
    apartado_habilitado: null
  })

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const query = new URLSearchParams()
        const userSucursalId = session?.userData?.sucursal_id || session?.sucursal_id
        if (userSucursalId) {
          query.append('sucursal_id', String(userSucursalId))
        }

        const queryString = query.toString()
        const response = await api.get('/contabilidad/parametrizacion-mora/activa' + (queryString ? `?${queryString}` : '')) as any
        const data = response.data?.data || response.data
        if (data) {
          setConfigVentas({
            apartado_habilitado: data.apartado_habilitado === true || data.apartado_habilitado === 1 || data.apartado_habilitado === '1' || data.apartado_habilitado === 'true'
          })
        } else {
          setConfigVentas({ apartado_habilitado: true })
        }
      } catch (error) {
        console.error('Error cargando configuración:', error)
        setConfigVentas({ apartado_habilitado: false })
      }
    }
    cargarConfig()
  }, [session])

  useEffect(() => {
    if (open) {
      cargarClientes()
    }
  }, [open])

  const cargarClientes = async () => {
    try {
      const resultado = await clienteService.getActivos()
      if (resultado.success && resultado.data) {
        setClientes(resultado.data)
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast.error('Error al cargar clientes')
    }
  }

  // Manejar la selección de un cliente
  const handleSeleccionarCliente = (id: string) => {
    setClienteId(id)
    const cliente = clientes.find(c => c.id === id || c.id === Number(id))
    if (cliente) {
      setCompradorNombre(`${cliente.nombres} ${cliente.apellidos}`.trim())
      setCompradorDPI(cliente.dpi || '')
      setCompradorTelefono(cliente.telefono || '')
      toast.success(`Cliente seleccionado: ${cliente.nombres} ${cliente.apellidos}`)
    }
  }

  const credito = creditos?.find(c => c.id === prenda.creditoId)
  const costoPrenda = credito?.montoPrestado || prenda.avaluo * 0.6
  
  const descuentoNum = parseFloat(descuento) || 0
  const precioConDescuento = prenda.precioVenta * (1 - descuentoNum / 100)
  const utilidad = precioConDescuento - costoPrenda

  const efectivo = parseFloat(montoEfectivo) || 0
  const tarjeta = parseFloat(montoTarjeta) || 0
  const transferencia = parseFloat(montoTransferencia) || 0
  const totalPagado = efectivo + tarjeta + transferencia

  const engancheNum = parseFloat(enganche) || 0
  const saldoApartado = precioConDescuento - engancheNum

  const enganchePlanNum = parseFloat(enganche) || 0
  const montoFinanciar = precioConDescuento - enganchePlanNum
  const cuotasNum = parseInt(numeroCuotas) || 1
  const tasaPlan = parseFloat(tasaInteresPlan) || 0
  const interesesPlan = calcularIntereses(montoFinanciar, tasaPlan, cuotasNum)
  const totalConIntereses = montoFinanciar + interesesPlan
  const montoCuota = totalConIntereses / cuotasNum

  // Filtrar clientes por búsqueda local
  const clientesFiltrados = clientes.filter(c => {
    const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase()
    const dpi = c.dpi?.toLowerCase() || ''
    const search = busquedaCliente.toLowerCase()
    return nombreCompleto.includes(search) || dpi.includes(search)
  })

  const validarDescuento = () => {
    if (descuentoNum > prenda.descuentoMaximo) {
      toast.error(`Descuento máximo permitido: ${prenda.descuentoMaximo}%`)
      return false
    }
    if (precioConDescuento < prenda.precioMinimo) {
      toast.error(`Precio no puede ser menor a Q ${prenda.precioMinimo.toFixed(2)}`)
      return false
    }
    return true
  }

  const procesarVentaContado = () => {
    if (!validarDescuento()) return
    if (!clienteId) {
      toast.error('Debe seleccionar un cliente para la venta')
      return
    }
    if (totalPagado < precioConDescuento) {
      toast.error(`Falta pagar Q ${(precioConDescuento - totalPagado).toFixed(2)}`)
      return
    }

    const formasPago: FormaPago[] = []
    if (efectivo > 0) formasPago.push({ tipo: 'efectivo', monto: efectivo })
    if (tarjeta > 0) formasPago.push({ tipo: 'tarjeta', monto: tarjeta })
    if (transferencia > 0) formasPago.push({ tipo: 'transferencia', monto: transferencia })

    const venta: Venta = {
      id: `vta-${Date.now()}`,
      numero: `V${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
      prendaId: prenda.id,
      prenda: {
        descripcion: prenda.descripcion,
        categoria: prenda.categoria,
        fotos: prenda.fotos
      },
      compradorNombre: compradorNombre || 'Cliente general',
      compradorDPI,
      compradorTelefono,
      precioOriginal: prenda.precioVenta,
      descuentoAplicado: descuentoNum,
      precioFinal: precioConDescuento,
      formasPago,
      tipoVenta: 'contado',
      estadoVenta: 'completada',
      fechaVenta: new Date().toISOString(),
      vendedorId: 'usuario-actual',
      utilidad,
      costoPrenda
    }

    setVentas((current = []) => [...current, venta])
    setPrendas((current = []) => 
      current.map(p => p.id === prenda.id ? { ...p, estado: 'vendido' as const, fechaVenta: new Date().toISOString() } : p)
    )

    toast.success(`Venta completada. Utilidad: Q ${utilidad.toFixed(2)}`)
    onVentaCompleta()
  }

  const procesarApartado = () => {
    if (!validarDescuento()) return
    if (!compradorNombre || !compradorTelefono) {
      toast.error('Complete nombre y teléfono del comprador')
      return
    }
    if (engancheNum < precioConDescuento * 0.2) {
      toast.error('Enganche mínimo: 20% del precio')
      return
    }

    const apartado: Apartado = {
      id: `apt-${Date.now()}`,
      prendaId: prenda.id,
      compradorNombre,
      compradorTelefono,
      precioTotal: precioConDescuento,
      enganche: engancheNum,
      saldoPendiente: saldoApartado,
      fechaApartado: new Date().toISOString(),
      fechaLimite: calcularFechaVencimiento(new Date().toISOString(), 0, parseInt(plazoApartado)),
      estado: 'activo',
      pagosRealizados: [{
        id: `pag-${Date.now()}`,
        monto: engancheNum,
        fecha: new Date().toISOString(),
        formaPago: 'efectivo',
        usuarioId: 'usuario-actual'
      }],
      vendedorId: 'usuario-actual'
    }

    setApartados((current = []) => [...current, apartado])
    setPrendas((current = []) => 
      current.map(p => p.id === prenda.id ? { ...p, estado: 'apartado' as const } : p)
    )

    toast.success('Prenda apartada correctamente')
    onVentaCompleta()
  }

  const procesarPlanPago = () => {
    if (!validarDescuento()) return
    if (!compradorNombre || !compradorDPI || !compradorTelefono) {
      toast.error('Complete todos los datos del comprador')
      return
    }
    if (enganchePlanNum < precioConDescuento * 0.3) {
      toast.error('Enganche mínimo para plan de pago: 30% del precio')
      return
    }

    const cuotas: Cuota[] = []
    for (let i = 1; i <= cuotasNum; i++) {
      cuotas.push({
        numero: i,
        monto: montoCuota,
        fechaVencimiento: calcularFechaVencimiento(new Date().toISOString(), i),
        estado: 'pendiente'
      })
    }

    const planPago: PlanPago = {
      id: `plan-${Date.now()}`,
      ventaId: `vta-plan-${Date.now()}`,
      prendaId: prenda.id,
      deudorNombre: compradorNombre,
      deudorDPI: compradorDPI,
      deudorTelefono: compradorTelefono,
      montoTotal: precioConDescuento,
      enganche: enganchePlanNum,
      montoFinanciar,
      tasaInteres: tasaPlan,
      numeroCuotas: cuotasNum,
      montoCuota,
      fechaInicio: new Date().toISOString(),
      cuotas,
      estado: 'activo',
      vendedorId: 'usuario-actual'
    }

    const venta: Venta = {
      id: planPago.ventaId,
      numero: `VP${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
      prendaId: prenda.id,
      prenda: {
        descripcion: prenda.descripcion,
        categoria: prenda.categoria,
        fotos: prenda.fotos
      },
      compradorNombre,
      compradorDPI,
      compradorTelefono,
      precioOriginal: prenda.precioVenta,
      descuentoAplicado: descuentoNum,
      precioFinal: precioConDescuento,
      formasPago: [{ tipo: 'efectivo', monto: enganchePlanNum }],
      tipoVenta: 'credito',
      estadoVenta: 'credito_activo',
      fechaVenta: new Date().toISOString(),
      vendedorId: 'usuario-actual',
      utilidad: precioConDescuento + interesesPlan - costoPrenda,
      costoPrenda
    }

    setPlanesPago((current = []) => [...current, planPago])
    setVentas((current = []) => [...current, venta])
    setPrendas((current = []) => 
      current.map(p => p.id === prenda.id ? { ...p, estado: 'vendido' as const, fechaVenta: new Date().toISOString() } : p)
    )

    toast.success(`Plan de pago creado: ${cuotasNum} cuotas de Q ${montoCuota.toFixed(2)}`)
    onVentaCompleta()
  }

  const handleProcesar = () => {
    if (tipoVenta === 'contado') {
      procesarVentaContado()
    } else if (tipoVenta === 'apartado') {
      procesarApartado()
    } else {
      procesarPlanPago()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="text-primary" />
            Procesar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{prenda.descripcion}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Precio:</span>
                <MoneyDisplay amount={prenda.precioVenta} size="md" />
              </div>
              <div>
                <span className="text-muted-foreground">Descuento:</span>
                <span className="font-semibold">{descuentoNum}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <MoneyDisplay amount={precioConDescuento} size="md" className="text-accent" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descuento">Descuento (%)</Label>
            <Input
              id="descuento"
              type="number"
              step="1"
              max={prenda.descuentoMaximo}
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Máximo: {prenda.descuentoMaximo}% | Precio mínimo: Q {prenda.precioMinimo.toFixed(2)}
            </p>
          </div>

          <Tabs value={tipoVenta} onValueChange={(v) => setTipoVenta(v as any)}>
            <TabsList className={`grid w-full ${configVentas.apartado_habilitado === true ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="contado">
                <Receipt size={16} className="mr-2" />
                Contado
              </TabsTrigger>
              {configVentas.apartado_habilitado === true && (
                <TabsTrigger value="apartado">
                  <Tag size={16} className="mr-2" />
                  Apartado
                </TabsTrigger>
              )}
              <TabsTrigger value="credito">
                <CreditCard size={16} className="mr-2" />
                Plan Pago
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contado" className="space-y-4">
              {/* Selector de Cliente */}
              <div className="space-y-2 border rounded-lg p-4 bg-blue-50">
                <Label className="flex items-center gap-2 text-blue-900">
                  <User className="h-4 w-4" />
                  Cliente (Requerido)
                </Label>
                <Select value={clienteId} onValueChange={handleSeleccionarCliente}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccione un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Buscar por nombre o DPI..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2"
                      />
                    </div>
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {busquedaCliente ? 'No se encontraron clientes con ese criterio' : 'No hay clientes activos'}
                      </div>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombres} {cliente.apellidos} {cliente.dpi ? `(DPI: ${cliente.dpi})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre (Opcional)</Label>
                  <Input
                    id="nombre"
                    value={compradorNombre}
                    onChange={(e) => setCompradorNombre(e.target.value)}
                    placeholder="Cliente general"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                  <Input
                    id="telefono"
                    value={compradorTelefono}
                    onChange={(e) => setCompradorTelefono(e.target.value)}
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-semibold">Formas de Pago</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="efectivo">
                      <CurrencyDollar size={16} className="inline mr-1" />
                      Efectivo (Q)
                    </Label>
                    <Input
                      id="efectivo"
                      type="number"
                      step="0.01"
                      value={montoEfectivo}
                      onChange={(e) => setMontoEfectivo(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tarjeta">Tarjeta (Q)</Label>
                    <Input
                      id="tarjeta"
                      type="number"
                      step="0.01"
                      value={montoTarjeta}
                      onChange={(e) => setMontoTarjeta(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transferencia">Transferencia (Q)</Label>
                    <Input
                      id="transferencia"
                      type="number"
                      step="0.01"
                      value={montoTransferencia}
                      onChange={(e) => setMontoTransferencia(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center bg-muted p-3 rounded">
                  <span>Total a Pagar:</span>
                  <MoneyDisplay amount={precioConDescuento} size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Pagado:</span>
                  <MoneyDisplay 
                    amount={totalPagado} 
                    size="lg" 
                    className={totalPagado >= precioConDescuento ? 'text-accent' : 'text-destructive'} 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="apartado" className="space-y-4">
              {/* Selector de Cliente para Apartado */}
              <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
                <Label className="flex items-center gap-2 text-blue-900">
                  <User className="h-4 w-4" />
                  Seleccionar Cliente Existente
                </Label>
                <Select value={clienteId} onValueChange={handleSeleccionarCliente}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="(Opcional) Seleccione un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Buscar por nombre o DPI..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2"
                      />
                    </div>
                    {clientesFiltrados.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombres} {cliente.apellidos} {cliente.dpi ? `(DPI: ${cliente.dpi})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre-apt">Nombre *</Label>
                  <Input
                    id="nombre-apt"
                    value={compradorNombre}
                    onChange={(e) => setCompradorNombre(e.target.value)}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono-apt">Teléfono *</Label>
                  <Input
                    id="telefono-apt"
                    value={compradorTelefono}
                    onChange={(e) => setCompradorTelefono(e.target.value)}
                    placeholder="12345678"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="enganche">Enganche (Q) *</Label>
                  <Input
                    id="enganche"
                    type="number"
                    step="0.01"
                    value={enganche}
                    onChange={(e) => setEnganche(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo: 20% (Q {(precioConDescuento * 0.2).toFixed(2)})
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plazo">Plazo (días)</Label>
                  <Input
                    id="plazo"
                    type="number"
                    value={plazoApartado}
                    onChange={(e) => setPlazoApartado(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-accent/10 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span>Precio Total:</span>
                  <MoneyDisplay amount={precioConDescuento} size="md" />
                </div>
                <div className="flex justify-between">
                  <span>Enganche:</span>
                  <MoneyDisplay amount={engancheNum} size="md" />
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Saldo Pendiente:</span>
                  <MoneyDisplay amount={saldoApartado} size="lg" className="text-warning" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credito" className="space-y-4">
              {/* Selector de Cliente para Plan de Pago */}
              <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
                <Label className="flex items-center gap-2 text-blue-900">
                  <User className="h-4 w-4" />
                  Seleccionar Cliente Existente
                </Label>
                <Select value={clienteId} onValueChange={handleSeleccionarCliente}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="(Opcional) Seleccione un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Buscar por nombre o DPI..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2"
                      />
                    </div>
                    {clientesFiltrados.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombres} {cliente.apellidos} {cliente.dpi ? `(DPI: ${cliente.dpi})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre-plan">Nombre *</Label>
                  <Input
                    id="nombre-plan"
                    value={compradorNombre}
                    onChange={(e) => setCompradorNombre(e.target.value)}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpi-plan">DPI *</Label>
                  <Input
                    id="dpi-plan"
                    value={compradorDPI}
                    onChange={(e) => setCompradorDPI(e.target.value)}
                    placeholder="1234567890123"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono-plan">Teléfono *</Label>
                <Input
                  id="telefono-plan"
                  value={compradorTelefono}
                  onChange={(e) => setCompradorTelefono(e.target.value)}
                  placeholder="12345678"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="enganche-plan">Enganche (Q) *</Label>
                  <Input
                    id="enganche-plan"
                    type="number"
                    step="0.01"
                    value={enganche}
                    onChange={(e) => setEnganche(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo: 30% (Q {(precioConDescuento * 0.3).toFixed(2)})
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuotas">Número de Cuotas</Label>
                  <Input
                    id="cuotas"
                    type="number"
                    value={numeroCuotas}
                    onChange={(e) => setNumeroCuotas(e.target.value)}
                    min="2"
                    max="12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tasa-plan">Tasa de Interés Mensual (%)</Label>
                <Input
                  id="tasa-plan"
                  type="number"
                  step="0.5"
                  value={tasaInteresPlan}
                  onChange={(e) => setTasaInteresPlan(e.target.value)}
                />
              </div>

              <div className="bg-primary/10 p-4 rounded space-y-2">
                <h4 className="font-semibold mb-2">Resumen del Plan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Precio Total:</span>
                    <MoneyDisplay amount={precioConDescuento} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span>Enganche:</span>
                    <MoneyDisplay amount={enganchePlanNum} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span>A Financiar:</span>
                    <MoneyDisplay amount={montoFinanciar} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span>Intereses ({tasaPlan}% x {cuotasNum} meses):</span>
                    <MoneyDisplay amount={interesesPlan} size="sm" />
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Total con Intereses:</span>
                    <MoneyDisplay amount={totalConIntereses} size="md" />
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Cuota Mensual:</span>
                    <MoneyDisplay amount={montoCuota} size="lg" className="text-accent" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleProcesar} className="flex-1">
              {tipoVenta === 'contado' && <Receipt weight="bold" />}
              {tipoVenta === 'apartado' && <Tag weight="bold" />}
              {tipoVenta === 'credito' && <CreditCard weight="bold" />}
              Procesar {tipoVenta === 'contado' ? 'Venta' : tipoVenta === 'apartado' ? 'Apartado' : 'Plan de Pago'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
