import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tag, CheckCircle, XCircle, Receipt, Spinner } from '@phosphor-icons/react'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { ventaService } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface VentaApartado {
  id: string
  codigo_venta: string
  cliente_nombre: string
  fecha_venta: string
  total_final: number
  total_pagado: number
  saldo_pendiente: number
  fecha_vencimiento?: string
  estado: string
  tipo_venta: 'apartado' | 'plan_pagos' | string
}

export function ApartadosLista() {
  const [apartados, setApartados] = useState<VentaApartado[]>([])
  const [loading, setLoading] = useState(false)
  const [apartadoSeleccionado, setApartadoSeleccionado] = useState<VentaApartado | null>(null)
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false)
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false)
  const [apartadoACancelar, setApartadoACancelar] = useState<VentaApartado | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [devolverAbono, setDevolverAbono] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [referenciaPago, setReferenciaPago] = useState('')
  const [bancoPago, setBancoPago] = useState('')
  const [registrandoPago, setRegistrandoPago] = useState(false)
  const [descargandoRecibo, setDescargandoRecibo] = useState<string | null>(null)

  const imprimirReciboApartado = async (apartadoId: string, codigoVenta: string) => {
    setDescargandoRecibo(apartadoId)
    try {
      const blob = await ventaService.generarReciboVenta(apartadoId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Recibo_Apartado_${codigoVenta}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast.error('No se pudo descargar el recibo del apartado')
    } finally {
      setDescargandoRecibo(null)
    }
  }

  const cargarApartados = async () => {
    try {
      setLoading(true)
      const response = await ventaService.getApartados()

      if (response?.success !== true) {
        setApartados([])
        return
      }

      let arr: any[] = []
      const raw = response.data
      if (Array.isArray(raw)) {
        arr = raw
      } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) {
        arr = (raw as any).data
      }

      const items = arr.map((v: any) => {
        const totalFinal = Number(v.total_final ?? 0)
        const totalPagado = Number(v.total_pagado ?? 0)
        const saldoApi = Number(v.saldo_pendiente ?? null)
        const saldoPendiente =
          saldoApi >= 0 && !Number.isNaN(saldoApi)
            ? saldoApi
            : Math.max(0, totalFinal - totalPagado)
        return {
          id: String(v.id),
          codigo_venta: v.codigo_venta,
          cliente_nombre: v.cliente_nombre ?? v.cliente?.nombre_completo ?? '—',
          fecha_venta: v.fecha_venta,
          total_final: totalFinal,
          total_pagado: totalPagado,
          saldo_pendiente: saldoPendiente,
          fecha_vencimiento: v.fecha_vencimiento,
          estado: v.estado ?? 'apartado',
          tipo_venta: v.tipo_venta ?? 'apartado',
        }
      })
      setApartados(items)
    } catch (error) {
      console.error('Error cargando apartados:', error)
      toast.error('Error al cargar apartados')
      setApartados([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarApartados()
  }, [])

  const formatFecha = (fecha?: string) => {
    if (!fecha) return '—'
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
    } catch {
      return fecha
    }
  }

  const abrirPago = (apartado: VentaApartado) => {
    setApartadoSeleccionado(apartado)
    setMontoPago((apartado.saldo_pendiente ?? 0).toString())
    setMetodoPago('efectivo')
    setReferenciaPago('')
    setBancoPago('')
    setModalPagoAbierto(true)
  }

  const cerrarPago = () => {
    if (registrandoPago) return
    setModalPagoAbierto(false)
    setApartadoSeleccionado(null)
    setMontoPago('')
    setReferenciaPago('')
    setBancoPago('')
  }

  const registrarPago = async () => {
    if (!apartadoSeleccionado) return

    const monto = parseFloat(montoPago)
    const saldo = apartadoSeleccionado.saldo_pendiente ?? 0

    if (isNaN(monto) || monto <= 0) {
      toast.error('Ingrese un monto válido')
      return
    }

    if (monto > saldo) {
      toast.error('El monto no puede ser mayor al saldo pendiente')
      return
    }

    try {
      setRegistrandoPago(true)
      const resp = await ventaService.registrarAbono(apartadoSeleccionado.id, {
        monto,
        metodo: metodoPago,
        referencia: referenciaPago || undefined,
        banco: bancoPago || undefined,
      })

      if (resp.success) {
        toast.success(resp.message || 'Pago registrado correctamente')
        cerrarPago()
        cargarApartados()
      } else {
        toast.error(resp.message || 'Error al registrar el pago')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el pago')
    } finally {
      setRegistrandoPago(false)
    }
  }

  const abrirCancelar = (apartado: VentaApartado) => {
    setApartadoACancelar(apartado)
    setMotivoCancelacion('')
    setModalCancelarAbierto(true)
  }

  const cerrarCancelar = () => {
    if (cancelando) return
    setModalCancelarAbierto(false)
    setApartadoACancelar(null)
    setMotivoCancelacion('')
    setDevolverAbono(false)
  }

  const confirmarCancelar = async () => {
    if (!apartadoACancelar) return
    const motivo = motivoCancelacion.trim()
    if (!motivo) {
      toast.error('Indique el motivo de cancelación')
      return
    }

    try {
      setCancelando(true)
      const resp = await ventaService.cancelar(apartadoACancelar.id, {
        motivo,
        devolver_abono: devolverAbono,
      })
      if (resp.success) {
        toast.success(resp.message || 'Apartado cancelado')
        cerrarCancelar()
        cargarApartados()
      } else {
        toast.error(resp.message || 'Error al cancelar')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar el apartado')
    } finally {
      setCancelando(false)
    }
  }

  if (!loading && apartados.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed border-muted-foreground/40 dark:border-slate-700">
        <Tag className="mx-auto mb-4 text-muted-foreground dark:text-slate-500" size={64} />
        <p className="text-lg font-medium mb-2">No hay apartados activos</p>
        <p className="text-muted-foreground text-sm sm:text-base">
          Los apartados aparecerán aquí cuando se generen
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Límite</TableHead>
                <TableHead className="text-center">Días</TableHead>
                <TableHead className="text-right">Precio total</TableHead>
                <TableHead className="text-right">Enganche pagado</TableHead>
                <TableHead className="text-right">Saldo pendiente</TableHead>
                <TableHead className="w-[200px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apartados.map(apartado => {
                const diasRestantes = apartado.fecha_vencimiento
                  ? Math.ceil(
                      (new Date(apartado.fecha_vencimiento).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null
                const saldoPendiente = apartado.saldo_pendiente ?? 0
                return (
                  <TableRow key={apartado.id}>
                    <TableCell className="font-medium">{apartado.cliente_nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {apartado.codigo_venta}
                    </TableCell>
                    <TableCell>{formatFecha(apartado.fecha_venta)}</TableCell>
                    <TableCell>{formatFecha(apartado.fecha_vencimiento)}</TableCell>
                    <TableCell className="text-center">
                      {diasRestantes !== null ? (
                        <Badge variant={diasRestantes > 3 ? 'secondary' : 'destructive'}>
                          {diasRestantes} días
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay amount={apartado.total_final} size="sm" />
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      <MoneyDisplay amount={apartado.total_pagado} size="sm" />
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">
                      <MoneyDisplay amount={saldoPendiente} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Reimprimir recibo"
                          onClick={() => imprimirReciboApartado(apartado.id, apartado.codigo_venta)}
                          disabled={descargandoRecibo === apartado.id}
                        >
                          {descargandoRecibo === apartado.id
                            ? <Spinner className="animate-spin" size={14} />
                            : <Receipt size={14} />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => abrirCancelar(apartado)}
                        >
                          <XCircle weight="bold" className="mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => abrirPago(apartado)}
                          disabled={saldoPendiente <= 0}
                        >
                          <CheckCircle weight="bold" className="mr-1" />
                          Registrar pago
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Registrar pago */}
      <Dialog
        open={modalPagoAbierto}
        onOpenChange={open => (!open ? cerrarPago() : setModalPagoAbierto(true))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago de apartado</DialogTitle>
            <DialogDescription>
              Registre un abono para completar o reducir el saldo pendiente de este apartado.
            </DialogDescription>
          </DialogHeader>

          {apartadoSeleccionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <p className="text-sm font-medium">{apartadoSeleccionado.cliente_nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {apartadoSeleccionado.codigo_venta}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <Label>Total venta</Label>
                  <MoneyDisplay amount={apartadoSeleccionado.total_final} className="font-semibold" />
                  <p className="text-xs text-muted-foreground">
                    Pagado:{' '}
                    <MoneyDisplay amount={apartadoSeleccionado.total_pagado} className="inline" />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <Label>Método de pago</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Monto a pagar</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montoPago}
                    onChange={e => setMontoPago(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Saldo pendiente:{' '}
                    <MoneyDisplay
                      amount={apartadoSeleccionado.saldo_pendiente || 0}
                      className="inline"
                    />
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Banco / referencia</Label>
                  <Input
                    placeholder="Opcional"
                    value={bancoPago}
                    onChange={e => setBancoPago(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Referencia</Label>
                <Input
                  placeholder="Ej. Abono apartado"
                  value={referenciaPago}
                  onChange={e => setReferenciaPago(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cerrarPago} disabled={registrandoPago}>
              Cerrar
            </Button>
            <Button onClick={registrarPago} disabled={registrandoPago || !apartadoSeleccionado}>
              {registrandoPago ? 'Registrando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Cancelar apartado */}
      <Dialog
        open={modalCancelarAbierto}
        onOpenChange={open => (!open ? cerrarCancelar() : setModalCancelarAbierto(true))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar apartado</DialogTitle>
            <DialogDescription>
              Al cancelar, la venta quedará anulada y los ítems volverán a estar disponibles. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {apartadoACancelar && (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">{apartadoACancelar.cliente_nombre}</span>{' '}
                <span className="text-muted-foreground">({apartadoACancelar.codigo_venta})</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="motivo-cancelar">Motivo de cancelación (obligatorio)</Label>
                <Textarea
                  id="motivo-cancelar"
                  placeholder="Ej: Cliente desistió, producto ya no disponible..."
                  value={motivoCancelacion}
                  onChange={e => setMotivoCancelacion(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              {apartadoACancelar.total_pagado > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 p-3">
                  <input
                    type="checkbox"
                    id="devolver-abono"
                    checked={devolverAbono}
                    onChange={e => setDevolverAbono(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="devolver-abono" className="cursor-pointer text-sm font-normal">
                    Devolver enganche al cliente (<MoneyDisplay amount={apartadoACancelar.total_pagado} size="sm" />). Se registrará un egreso en caja.
                  </Label>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cerrarCancelar} disabled={cancelando}>
              No cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarCancelar}
              disabled={cancelando || !motivoCancelacion.trim()}
            >
              {cancelando ? 'Cancelando...' : 'Sí, cancelar apartado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
