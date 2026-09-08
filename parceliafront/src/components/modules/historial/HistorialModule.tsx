import { useState } from 'react'
import { useKV } from '@/hooks/use-kv'
import { Credito, Cliente, Venta, Pago, EventoHistorial } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { ClockCounterClockwise, MagnifyingGlass, CreditCard as CreditCardIcon, Receipt, Package, CheckCircle, ArrowsClockwise, ShoppingCart } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function HistorialModule() {
  const [creditos] = useKV<Credito[]>('creditos', [])
  const [clientes] = useKV<Cliente[]>('clientes', [])
  const [ventas] = useKV<Venta[]>('ventas', [])
  const [pagos] = useKV<Pago[]>('pagos', [])
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  const construirEventos = (): EventoHistorial[] => {
    const eventos: EventoHistorial[] = []
    const creditosList = creditos || []
    
    creditosList.forEach(credito => {
      const cliente = clientes?.find(c => c.id === credito.clienteId)
      eventos.push({
        id: `credito-${credito.id}`,
        tipo: 'credito_creado',
        creditoId: credito.id,
        clienteId: credito.clienteId,
        fecha: credito.fechaCreacion,
        hora: new Date(credito.fechaCreacion).toLocaleTimeString('es-GT'),
        descripcion: `Crédito ${credito.numero} creado para ${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'cliente'}`,
        monto: credito.montoPrestado,
        usuarioId: 'sistema'
      })

      if (credito.renovaciones > 0) {
        eventos.push({
          id: `renovacion-${credito.id}`,
          tipo: 'renovacion',
          creditoId: credito.id,
          clienteId: credito.clienteId,
          fecha: credito.fechaCreacion,
          hora: new Date().toLocaleTimeString('es-GT'),
          descripcion: `Crédito ${credito.numero} renovado ${credito.renovaciones} veces`,
          usuarioId: 'sistema'
        })
      }

      if (credito.estado === 'cancelado') {
        eventos.push({
          id: `cancelado-${credito.id}`,
          tipo: 'credito_cancelado',
          creditoId: credito.id,
          clienteId: credito.clienteId,
          fecha: credito.fechaCreacion,
          hora: new Date().toLocaleTimeString('es-GT'),
          descripcion: `Crédito ${credito.numero} cancelado - prenda recuperada`,
          usuarioId: 'sistema'
        })
      }
    })

    const pagosList = pagos || []
    pagosList.forEach(pago => {
      const credito = creditos?.find(c => c.id === pago.creditoId)
      const cliente = credito ? clientes?.find(c => c.id === credito.clienteId) : null
      eventos.push({
        id: `pago-${pago.id}`,
        tipo: 'pago_realizado',
        creditoId: pago.creditoId,
        clienteId: cliente?.id,
        fecha: pago.fecha.split('T')[0],
        hora: new Date(pago.fecha).toLocaleTimeString('es-GT'),
        descripcion: `Pago registrado para crédito ${credito?.numero || 'N/A'} - Saldo restante: Q${pago.saldoRestante.toFixed(2)}`,
        monto: pago.monto,
        usuarioId: pago.usuarioId
      })
    })

    const ventasList = ventas || []
    ventasList.filter(v => v.estadoVenta === 'completada').forEach(venta => {
      eventos.push({
        id: `venta-${venta.id}`,
        tipo: 'prenda_vendida',
        ventaId: venta.id,
        clienteId: venta.clienteId,
        fecha: venta.fechaVenta,
        hora: new Date(venta.fechaVenta).toLocaleTimeString('es-GT'),
        descripcion: `Prenda vendida: ${venta.prenda.descripcion} - Utilidad: Q${venta.utilidad.toFixed(2)}`,
        monto: venta.precioFinal,
        usuarioId: venta.vendedorId
      })
    })

    return eventos.sort((a, b) => {
      const fechaA = new Date(`${a.fecha} ${a.hora}`)
      const fechaB = new Date(`${b.fecha} ${b.hora}`)
      return fechaB.getTime() - fechaA.getTime()
    })
  }

  const eventos = construirEventos()

  const eventosFiltrados = eventos.filter(evento => {
    const cumpleTipo = filtroTipo === 'todos' || evento.tipo === filtroTipo
    
    if (!busqueda) return cumpleTipo

    const termino = busqueda.toLowerCase()
    const cumpleBusqueda = (
      evento.descripcion.toLowerCase().includes(termino) ||
      (evento.creditoId && evento.creditoId.toLowerCase().includes(termino)) ||
      (evento.clienteId && clientes?.find(c => c.id === evento.clienteId)?.dpi.includes(termino))
    )
    
    return cumpleTipo && cumpleBusqueda
  })

  const iconoEvento = (tipo: string) => {
    switch (tipo) {
      case 'credito_creado':
        return <CreditCardIcon size={20} className="text-primary" />
      case 'pago_realizado':
        return <Receipt size={20} className="text-accent" />
      case 'renovacion':
        return <ArrowsClockwise size={20} className="text-warning" />
      case 'prenda_vendida':
        return <ShoppingCart size={20} className="text-accent" />
      case 'credito_cancelado':
        return <CheckCircle size={20} className="text-accent" />
      case 'prenda_recuperada':
        return <Package size={20} className="text-accent" />
      default:
        return <ClockCounterClockwise size={20} className="text-muted-foreground" />
    }
  }

  const etiquetaEvento = (tipo: string) => {
    switch (tipo) {
      case 'credito_creado':
        return 'Crédito Creado'
      case 'pago_realizado':
        return 'Pago'
      case 'renovacion':
        return 'Renovación'
      case 'prenda_vendida':
        return 'Venta'
      case 'credito_cancelado':
        return 'Cancelado'
      case 'prenda_recuperada':
        return 'Recuperado'
      default:
        return tipo
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registro de {eventosFiltrados.length} eventos
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar por descripción, crédito o DPI..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="credito_creado">Créditos</SelectItem>
              <SelectItem value="pago_realizado">Pagos</SelectItem>
              <SelectItem value="renovacion">Renovaciones</SelectItem>
              <SelectItem value="prenda_vendida">Ventas</SelectItem>
              <SelectItem value="credito_cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {eventosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClockCounterClockwise size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron eventos</h3>
            <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Línea de Tiempo</CardTitle>
            <CardDescription>Eventos ordenados cronológicamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventosFiltrados.map((evento, index) => (
                <div key={evento.id}>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                        {iconoEvento(evento.tipo)}
                      </div>
                      {index < eventosFiltrados.length - 1 && (
                        <div className="w-px h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {etiquetaEvento(evento.tipo)}
                          </Badge>
                          <p className="text-sm">{evento.descripcion}</p>
                        </div>
                        {evento.monto && (
                          <MoneyDisplay 
                            amount={evento.monto} 
                            className={
                              evento.tipo === 'credito_creado' ? 'text-primary' :
                              evento.tipo === 'pago_realizado' || evento.tipo === 'prenda_vendida' ? 'text-accent' :
                              ''
                            }
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(evento.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })} • {evento.hora}
                      </p>
                    </div>
                  </div>
                  {index < eventosFiltrados.length - 1 && index % 10 === 9 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
