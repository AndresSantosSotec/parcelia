import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ShoppingCart, MagnifyingGlass, Receipt, CreditCard, Tag } from '@phosphor-icons/react'
import { useKV } from '@/hooks/use-kv'
import { Venta, Prenda } from '@/lib/types'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { formatDate, formatDateTime } from '@/lib/helpers'

export function VentasRealizadas() {
  const [ventas] = useKV<Venta[]>('ventas', [])
  const [prendas] = useKV<Prenda[]>('prendas', [])
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todas')

  const ventasFiltradas = (ventas || []).filter(v => {
    const matchBusqueda = v.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.prenda.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.compradorNombre?.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = filtroTipo === 'todas' || v.tipoVenta === filtroTipo
    return matchBusqueda && matchTipo
  }).sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())

  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.precioFinal, 0)
  const totalUtilidad = ventasFiltradas.reduce((sum, v) => sum + v.utilidad, 0)

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'contado':
        return <Receipt size={16} />
      case 'apartado':
        return <Tag size={16} />
      case 'credito':
        return <CreditCard size={16} />
      default:
        return <ShoppingCart size={16} />
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada':
        return <Badge className="bg-accent">Completada</Badge>
      case 'apartada':
        return <Badge variant="outline" className="border-warning text-warning">Apartada</Badge>
      case 'credito_activo':
        return <Badge variant="outline" className="border-primary text-primary">Crédito Activo</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  if (!ventas || ventas.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ShoppingCart className="mx-auto mb-4 text-muted-foreground" size={64} />
        <p className="text-lg font-medium mb-2">No hay ventas registradas</p>
        <p className="text-muted-foreground text-sm sm:text-base">
          Las ventas aparecerán aquí cuando se completen
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{ventasFiltradas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={totalVentas} size="lg" className="text-2xl sm:text-3xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Total</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={totalUtilidad} size="lg" className="text-accent text-2xl sm:text-3xl" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Buscar venta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtroTipo === 'todas' ? 'default' : 'outline'}
                onClick={() => setFiltroTipo('todas')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filtroTipo === 'contado' ? 'default' : 'outline'}
                onClick={() => setFiltroTipo('contado')}
                size="sm"
              >
                <Receipt size={16} className="mr-1" />
                Contado
              </Button>
              <Button
                variant={filtroTipo === 'apartado' ? 'default' : 'outline'}
                onClick={() => setFiltroTipo('apartado')}
                size="sm"
              >
                <Tag size={16} className="mr-1" />
                Apartado
              </Button>
              <Button
                variant={filtroTipo === 'credito' ? 'default' : 'outline'}
                onClick={() => setFiltroTipo('credito')}
                size="sm"
              >
                <CreditCard size={16} className="mr-1" />
                Crédito
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {ventasFiltradas.map(venta => (
          <Card key={venta.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getTipoIcon(venta.tipoVenta)}
                        <span className="font-mono text-sm text-muted-foreground">
                          {venta.numero}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base sm:text-lg">
                        {venta.prenda.descripcion}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {venta.prenda.categoria}
                      </p>
                    </div>
                    {getEstadoBadge(venta.estadoVenta)}
                  </div>

                  {venta.compradorNombre && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Comprador:</p>
                      <p className="font-medium">{venta.compradorNombre}</p>
                      {venta.compradorTelefono && (
                        <p className="text-xs text-muted-foreground">{venta.compradorTelefono}</p>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(venta.fechaVenta)}
                  </div>
                </div>

                <div className="sm:border-l sm:pl-4 space-y-2 sm:min-w-[200px]">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio:</span>
                      <MoneyDisplay amount={venta.precioOriginal} size="sm" />
                    </div>
                    {venta.descuentoAplicado > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Descuento:</span>
                        <span>-{venta.descuentoAplicado}%</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Total:</span>
                      <MoneyDisplay amount={venta.precioFinal} size="md" />
                    </div>
                    <div className="flex justify-between text-accent pt-1 border-t">
                      <span>Utilidad:</span>
                      <MoneyDisplay amount={venta.utilidad} size="sm" className="font-semibold" />
                    </div>
                  </div>

                  {venta.formasPago && venta.formasPago.length > 0 && (
                    <div className="text-xs pt-2 border-t">
                      <p className="text-muted-foreground mb-1">Formas de Pago:</p>
                      {venta.formasPago.map((fp, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="capitalize">{fp.tipo}:</span>
                          <MoneyDisplay amount={fp.monto} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
