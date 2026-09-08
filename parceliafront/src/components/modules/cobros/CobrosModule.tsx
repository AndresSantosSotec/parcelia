import { useState } from 'react'
import { useKV } from '@/hooks/use-kv'
import { Credito, Cliente, Pago } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { StatusBadge } from '@/components/StatusBadge'
import { Receipt, MagnifyingGlass, CheckCircle, Printer } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

export function CobrosModule() {
  const [creditos, setCreditos] = useKV<Credito[]>('creditos', [])
  const [clientes] = useKV<Cliente[]>('clientes', [])
  const [pagos, setPagos] = useKV<Pago[]>('pagos', [])
  const [busqueda, setBusqueda] = useState('')
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<Credito | null>(null)
  const [montoPago, setMontoPago] = useState('')
  const [dialogPago, setDialogPago] = useState(false)
  const [dialogRecibo, setDialogRecibo] = useState(false)
  const [ultimoPago, setUltimoPago] = useState<Pago | null>(null)

  const creditosActivos = (creditos || []).filter(c =>
    c.estado === 'activo' || c.estado === 'vencido'
  )

  const buscarCredito = () => {
    const termino = busqueda.trim()

    if (!termino) {
      toast.error('Ingresa un número de crédito o DPI')
      return
    }

    const credito = creditosActivos.find(c =>
      c.numero === termino ||
      clientes?.find(cl => cl.id === c.clienteId)?.dpi === termino
    )

    if (credito) {
      setCreditoSeleccionado(credito)
      setDialogPago(true)
    } else {
      toast.error('No se encontró ningún crédito activo con ese número o DPI')
    }
  }

  const calcularInteres = (credito: Credito): number => {
    const diasTranscurridos = differenceInDays(new Date(), new Date(credito.fechaCreacion))
    const mesesTranscurridos = diasTranscurridos / 30
    return credito.montoPrestado * (credito.tasaInteres / 100) * mesesTranscurridos
  }

  const calcularMora = (credito: Credito): number => {
    if (credito.estado !== 'vencido') return 0

    const diasVencidos = differenceInDays(new Date(), new Date(credito.fechaVencimiento))
    const tasaMora = 0.05
    return credito.saldoActual * (tasaMora / 100) * diasVencidos
  }

  const registrarPago = () => {
    if (!creditoSeleccionado) return

    const monto = parseFloat(montoPago)
    if (isNaN(monto) || monto <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    const interes = calcularInteres(creditoSeleccionado)
    const mora = calcularMora(creditoSeleccionado)
    const totalAdeudado = creditoSeleccionado.saldoActual + interes + mora

    if (monto > totalAdeudado * 1.1) {
      toast.error('El monto ingresado es demasiado alto')
      return
    }

    let interesPagado = 0
    let moraPagado = 0
    let capitalPagado = 0
    let montoRestante = monto

    if (mora > 0) {
      moraPagado = Math.min(montoRestante, mora)
      montoRestante -= moraPagado
    }

    if (montoRestante > 0) {
      interesPagado = Math.min(montoRestante, interes)
      montoRestante -= interesPagado
    }

    if (montoRestante > 0) {
      capitalPagado = Math.min(montoRestante, creditoSeleccionado.saldoActual)
    }

    const nuevoSaldo = creditoSeleccionado.saldoActual - capitalPagado

    const nuevoPago: Pago = {
      id: `pago-${Date.now()}`,
      creditoId: creditoSeleccionado.id,
      monto,
      fecha: new Date().toISOString(),
      interesPagado,
      moraPagado,
      capitalPagado,
      saldoRestante: nuevoSaldo,
      usuarioId: 'Usuario Actual'
    }

    setPagos(pagos => [...(pagos || []), nuevoPago])

    const nuevoEstado = nuevoSaldo <= 0 ? 'cancelado' : creditoSeleccionado.estado

    setCreditos((creditos || []).map(c =>
      c.id === creditoSeleccionado.id
        ? { ...c, saldoActual: nuevoSaldo, estado: nuevoEstado }
        : c
    ))

    setUltimoPago(nuevoPago)
    setDialogPago(false)
    setDialogRecibo(true)
    setMontoPago('')

    if (nuevoSaldo <= 0) {
      toast.success('Crédito liquidado completamente')
    } else {
      toast.success('Pago registrado correctamente')
    }
  }

  const cliente = creditoSeleccionado
    ? clientes?.find(c => c.id === creditoSeleccionado.clienteId)
    : null

  const interes = creditoSeleccionado ? calcularInteres(creditoSeleccionado) : 0
  const mora = creditoSeleccionado ? calcularMora(creditoSeleccionado) : 0
  const totalAdeudado = creditoSeleccionado
    ? creditoSeleccionado.saldoActual + interes + mora
    : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cobros</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Registro de pagos de créditos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Crédito</CardTitle>
          <CardDescription>Ingresa el número de crédito o DPI del cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Número de crédito o DPI"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarCredito()}
                className="h-11"
              />
            </div>
            <Button onClick={buscarCredito} className="h-11 w-full sm:w-auto">
              <MagnifyingGlass />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Créditos Pendientes</CardTitle>
          <CardDescription>
            {creditosActivos.length} créditos con saldo pendiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {creditosActivos.slice(0, 5).map(credito => {
              const clienteCredito = clientes?.find(c => c.id === credito.clienteId)
              return (
                <div
                  key={credito.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setCreditoSeleccionado(credito)
                    setDialogPago(true)
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium">{credito.numero}</span>
                      <StatusBadge estado={credito.estado} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {clienteCredito ? `${clienteCredito.nombres} ${clienteCredito.apellidos}` : 'Cliente no encontrado'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <MoneyDisplay amount={credito.saldoActual} size="lg" />
                  </div>
                </div>
              )
            })}
            {creditosActivos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay créditos pendientes de pago</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogPago} onOpenChange={setDialogPago}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Crédito {creditoSeleccionado?.numero}
            </DialogDescription>
          </DialogHeader>

          {creditoSeleccionado && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">
                    {cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">DPI</p>
                  <p className="font-mono">{cliente?.dpi || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prenda</p>
                  <p className="font-medium">{creditoSeleccionado.prenda.descripcion}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento</p>
                  <p>{format(new Date(creditoSeleccionado.fechaVencimiento), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Capital Pendiente</span>
                  <MoneyDisplay amount={creditoSeleccionado.saldoActual} size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Intereses</span>
                  <MoneyDisplay amount={interes} className="text-warning" />
                </div>
                {mora > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mora</span>
                    <MoneyDisplay amount={mora} className="text-destructive" />
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total a Pagar</span>
                  <MoneyDisplay amount={totalAdeudado} size="lg" className="text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="montoPago">Monto a Pagar</Label>
                <Input
                  id="montoPago"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="h-12 text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Puedes ingresar un pago parcial o total
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPago(false)}>
              Cancelar
            </Button>
            <Button onClick={registrarPago}>
              <CheckCircle />
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogRecibo} onOpenChange={setDialogRecibo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recibo de Pago</DialogTitle>
            <DialogDescription>
              Pago registrado exitosamente
            </DialogDescription>
          </DialogHeader>

          {ultimoPago && creditoSeleccionado && (
            <div className="space-y-4">
              <div className="text-center p-6 bg-accent/10 rounded-lg border-2 border-accent">
                <CheckCircle size={48} className="mx-auto mb-3 text-accent" />
                <p className="text-sm text-muted-foreground mb-1">Monto Pagado</p>
                <MoneyDisplay amount={ultimoPago.monto} size="lg" className="text-accent" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span>{format(new Date(ultimoPago.fecha), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito</span>
                  <span className="font-mono">{creditoSeleccionado.numero}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital Pagado</span>
                  <MoneyDisplay amount={ultimoPago.capitalPagado} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Intereses Pagados</span>
                  <MoneyDisplay amount={ultimoPago.interesPagado} />
                </div>
                {ultimoPago.moraPagado > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mora Pagada</span>
                    <MoneyDisplay amount={ultimoPago.moraPagado} />
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Saldo Restante</span>
                  <MoneyDisplay amount={ultimoPago.saldoRestante} />
                </div>
              </div>

              <Button className="w-full" variant="outline">
                <Printer />
                Imprimir Recibo
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDialogRecibo(false)} className="w-full">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
