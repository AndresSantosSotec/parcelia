import { useState, useEffect } from 'react'
import { PrendaEmpenada } from '@/types/creditoPrendario.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Trash, Plus, ShoppingCart, User, MapPin } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { clienteService } from '@/lib/api'

interface ItemVenta {
  prenda_id: string
  codigo: string
  descripcion: string
  ubicacion?: string
  precio_unitario: number
  descuento: number
  subtotal: number
  descuento_max_pct?: number
  precio_minimo?: number
}

interface PagoVenta {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
  monto: number
  referencia?: string
}

interface ProcesarVentaModalProps {
  prendas: PrendaEmpenada[]
  abierto: boolean
  tipoVenta: 'contado' | 'apartado' | 'plan_pagos'
  onCerrar: () => void
  onVentaProcesada?: () => void
}

export function ProcesarVentaModal({ 
  prendas, 
  abierto, 
  tipoVenta, 
  onCerrar, 
  onVentaProcesada 
}: ProcesarVentaModalProps) {
  const [items, setItems] = useState<ItemVenta[]>([])
  const [pagos, setPagos] = useState<PagoVenta[]>([])
  const [clienteId, setClienteId] = useState<string>('')
  const [clientes, setClientes] = useState<any[]>([])
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  // Datos para apartado
  const [nombreApartado, setNombreApartado] = useState('')
  const [telefonoApartado, setTelefonoApartado] = useState('')
  const [enganche, setEnganche] = useState(0)
  const [plazoApartado, setPlazoApartado] = useState(30)

  // Datos para plan de pago
  const [nombrePlan, setNombrePlan] = useState('')
  const [dpiPlan, setDpiPlan] = useState('')
  const [telefonoPlan, setTelefonoPlan] = useState('')
  const [enganchePlan, setEnganchePlan] = useState(0)
  const [cuotas, setCuotas] = useState(12)
  const [tasaInteres, setTasaInteres] = useState(2.5)

  // Cargar clientes activos al abrir el modal
  useEffect(() => {
    if (abierto) {
      cargarClientes()
    }
  }, [abierto])

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

  // Filtrar clientes por búsqueda local
  const clientesFiltrados = clientes.filter(c => {
    const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase()
    const dpi = c.dpi?.toLowerCase() || ''
    const search = busquedaCliente.toLowerCase()
    return nombreCompleto.includes(search) || dpi.includes(search)
  })

  useEffect(() => {
    if (abierto && prendas.length > 0) {
      // Mapear prendas a items
      const itemsIniciales: ItemVenta[] = prendas.map(p => {
        // Prioridad: precio_venta editado manualmente > valor_venta calculado > 130% del avalúo
        const precioBase = p.valor_venta || (p.valor_tasacion || 0) * 1.3
        
        return {
          prenda_id: p.id,
          codigo: p.codigo_prenda || p.id,
          descripcion: p.descripcion_general || 'Sin descripción',
          ubicacion: p.ubicacion_detalle || 'Sin ubicación',
          precio_unitario: precioBase,
          descuento: 0,
          subtotal: precioBase,
          descuento_max_pct: 20, // Por defecto 20%, debería venir del backend
          precio_minimo: precioBase * 0.8 // 80% del precio por defecto
        }
      })
      
      setItems(itemsIniciales)
      
      // Inicializar pago según tipo
      if (tipoVenta === 'contado') {
        const total = itemsIniciales.reduce((sum, item) => sum + item.subtotal, 0)
        setPagos([{ metodo: 'efectivo', monto: total }])
      } else {
        setPagos([])
      }
    }
  }, [abierto, prendas, tipoVenta])

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + item.precio_unitario, 0)
    const totalDescuentos = items.reduce((sum, item) => sum + item.descuento, 0)
    const total = subtotal - totalDescuentos
    const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0)
    const cambio = Math.max(0, totalPagado - total)
    
    return { subtotal, totalDescuentos, total, totalPagado, cambio }
  }

  const actualizarDescuento = (index: number, descuento: number) => {
    const item = items[index]
    const descuentoMaxQ = item.precio_unitario * ((item.descuento_max_pct || 20) / 100)
    const descuentoAplicar = Math.min(descuento, descuentoMaxQ)
    const nuevoSubtotal = item.precio_unitario - descuentoAplicar
    
    // Validar precio mínimo
    if (item.precio_minimo && nuevoSubtotal < item.precio_minimo) {
      toast.error(`El precio no puede ser menor a Q${item.precio_minimo.toFixed(2)}`)
      return
    }
    
    const nuevosItems = [...items]
    nuevosItems[index] = {
      ...item,
      descuento: descuentoAplicar,
      subtotal: nuevoSubtotal
    }
    setItems(nuevosItems)
  }

  const eliminarItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Debe haber al menos un ítem en la venta')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const agregarPago = () => {
    setPagos([...pagos, { metodo: 'efectivo', monto: 0 }])
  }

  const actualizarPago = (index: number, campo: keyof PagoVenta, valor: any) => {
    const nuevosPagos = [...pagos]
    nuevosPagos[index] = { ...nuevosPagos[index], [campo]: valor }
    setPagos(nuevosPagos)
  }

  const eliminarPago = (index: number) => {
    if (pagos.length === 1) {
      toast.error('Debe haber al menos un método de pago')
      return
    }
    setPagos(pagos.filter((_, i) => i !== index))
  }

  const procesarVenta = async () => {
    const totales = calcularTotales()
    
    // Validación de cliente requerido
    if (!clienteId) {
      toast.error('Debe seleccionar un cliente para la venta')
      return
    }
    
    // Validaciones según tipo
    if (tipoVenta === 'contado') {
      if (totales.totalPagado < totales.total) {
        toast.error('El monto pagado debe ser mayor o igual al total')
        return
      }
    } else if (tipoVenta === 'apartado') {
      if (!nombreApartado || !telefonoApartado) {
        toast.error('Complete nombre y teléfono para apartado')
        return
      }
      if (enganche < totales.total * 0.2) {
        toast.error('El enganche mínimo es 20%')
        return
      }
    } else if (tipoVenta === 'plan_pagos') {
      if (!nombrePlan || !dpiPlan || !telefonoPlan) {
        toast.error('Complete todos los datos para plan de pago')
        return
      }
      if (enganchePlan < totales.total * 0.3) {
        toast.error('El enganche mínimo es 30%')
        return
      }
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

      // Preparar datos
      const ventaData = {
        tipo_venta: tipoVenta,
        cliente_id: clienteId || null,
        items: items.map(item => ({
          prenda_id: item.prenda_id,
          descuento: item.descuento
        })),
        pagos: tipoVenta === 'contado' ? pagos : [],
        observaciones
      }

      const response = await fetch(`${API_BASE_URL}/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ventaData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Venta procesada exitosamente')
        onVentaProcesada?.()
        onCerrar()
      } else {
        toast.error(result.message || 'Error al procesar venta')
      }
    } catch (error: any) {
      console.error('Error al procesar venta:', error)
      toast.error('Error al procesar venta')
    } finally {
      setLoading(false)
    }
  }

  const totales = calcularTotales()

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Procesar Venta - {items.length} {items.length === 1 ? 'Prenda' : 'Prendas'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={tipoVenta} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contado">Contado</TabsTrigger>
            <TabsTrigger value="apartado">Apartado</TabsTrigger>
            <TabsTrigger value="plan_pagos">Plan de Pagos</TabsTrigger>
          </TabsList>

          {/* TAB CONTADO */}
          <TabsContent value="contado" className="space-y-4">
            {/* Carrito de items */}
            {/* Selector de Cliente */}
            <div className="space-y-2 border rounded-lg p-4 bg-blue-50">
              <Label className="flex items-center gap-2 text-blue-900">
                <User className="h-4 w-4" />
                Cliente (Requerido)
              </Label>
              <Select value={clienteId} onValueChange={setClienteId}>
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
                      {busquedaCliente ? 'No se encontraron clientes' : 'No hay clientes activos'}
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

            {/* Carrito de items */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="flex items-center gap-1"><MapPin className="h-3 w-3" />Ubicación</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-right w-[120px]">Descuento</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.prenda_id}>
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">{item.descripcion}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.ubicacion}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={item.precio_unitario} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={item.precio_unitario}
                          step="0.01"
                          value={item.descuento}
                          onChange={(e) => actualizarDescuento(index, parseFloat(e.target.value) || 0)}
                          className="w-full text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <MoneyDisplay amount={item.subtotal} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => eliminarItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Formas de Pago</Label>
                <Button variant="outline" size="sm" onClick={agregarPago}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              
              {pagos.map((pago, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select
                    value={pago.metodo}
                    onValueChange={(v: any) => actualizarPago(index, 'metodo', v)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Monto"
                    value={pago.monto}
                    onChange={(e) => actualizarPago(index, 'monto', parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  {pago.metodo !== 'efectivo' && (
                    <Input
                      type="text"
                      placeholder="Referencia"
                      value={pago.referencia || ''}
                      onChange={(e) => actualizarPago(index, 'referencia', e.target.value)}
                      className="flex-1"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarPago(index)}
                    disabled={pagos.length === 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <MoneyDisplay amount={totales.subtotal} />
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Descuento:</span>
                <MoneyDisplay amount={totales.totalDescuentos} />
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <MoneyDisplay amount={totales.total} />
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Total Pagado:</span>
                <MoneyDisplay amount={totales.totalPagado} />
              </div>
              {totales.cambio > 0 && (
                <div className="flex justify-between text-sm font-semibold text-blue-600">
                  <span>Cambio:</span>
                  <MoneyDisplay amount={totales.cambio} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB APARTADO */}
          <TabsContent value="apartado" className="space-y-4">
            {/* Selector de Cliente */}
            <div className="space-y-2 border rounded-lg p-4 bg-blue-50">
              <Label className="flex items-center gap-2 text-blue-900">
                <User className="h-4 w-4" />
                Cliente (Requerido)
              </Label>
              <Select value={clienteId} onValueChange={setClienteId}>
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
                      {busquedaCliente ? 'No se encontraron clientes' : 'No hay clientes activos'}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={nombreApartado} onChange={(e) => setNombreApartado(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input value={telefonoApartado} onChange={(e) => setTelefonoApartado(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Enganche (Mín. 20%)</Label>
                <Input 
                  type="number" 
                  min={totales.total * 0.2}
                  value={enganche} 
                  onChange={(e) => setEnganche(parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Plazo (días)</Label>
                <Input 
                  type="number" 
                  value={plazoApartado} 
                  onChange={(e) => setPlazoApartado(parseInt(e.target.value) || 30)} 
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Total:</span>
                <MoneyDisplay amount={totales.total} className="font-bold" />
              </div>
              <div className="flex justify-between mb-2">
                <span>Enganche:</span>
                <MoneyDisplay amount={enganche} className="text-green-600" />
              </div>
              <div className="flex justify-between font-bold">
                <span>Saldo Pendiente:</span>
                <MoneyDisplay amount={Math.max(0, totales.total - enganche)} />
              </div>
            </div>
          </TabsContent>

          {/* TAB PLAN DE PAGO */}
          <TabsContent value="plan_pagos" className="space-y-4">
            {/* Selector de Cliente */}
            <div className="space-y-2 border rounded-lg p-4 bg-blue-50">
              <Label className="flex items-center gap-2 text-blue-900">
                <User className="h-4 w-4" />
                Cliente (Requerido)
              </Label>
              <Select value={clienteId} onValueChange={setClienteId}>
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
                      {busquedaCliente ? 'No se encontraron clientes' : 'No hay clientes activos'}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={nombrePlan} onChange={(e) => setNombrePlan(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>DPI *</Label>
                <Input value={dpiPlan} onChange={(e) => setDpiPlan(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input value={telefonoPlan} onChange={(e) => setTelefonoPlan(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Enganche (Mín. 30%)</Label>
                <Input 
                  type="number" 
                  min={totales.total * 0.3}
                  value={enganchePlan} 
                  onChange={(e) => setEnganchePlan(parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Número de Cuotas</Label>
                <Input 
                  type="number" 
                  value={cuotas} 
                  onChange={(e) => setCuotas(parseInt(e.target.value) || 12)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Tasa Interés Mensual (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={tasaInteres} 
                  onChange={(e) => setTasaInteres(parseFloat(e.target.value) || 2.5)} 
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Total:</span>
                <MoneyDisplay amount={totales.total} className="font-bold" />
              </div>
              <div className="flex justify-between mb-2">
                <span>Enganche:</span>
                <MoneyDisplay amount={enganchePlan} className="text-green-600" />
              </div>
              <div className="flex justify-between mb-2">
                <span>Saldo a Financiar:</span>
                <MoneyDisplay amount={Math.max(0, totales.total - enganchePlan)} />
              </div>
              <div className="flex justify-between font-bold">
                <span>Cuota Mensual (aprox):</span>
                <MoneyDisplay 
                  amount={(totales.total - enganchePlan) * (1 + (tasaInteres / 100) * cuotas) / cuotas} 
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={procesarVenta} disabled={loading}>
            {loading ? 'Procesando...' : 'Procesar Venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
