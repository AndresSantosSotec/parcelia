import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import {
  Receipt,
  Clock,
  CurrencyDollar,
  User,
  Calendar,
  ArrowUp,
  ArrowDown,
  Spinner,
  FilePdf,
  Download,
  CheckCircle,
  Warning,
  XCircle,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'
import { cn } from '@/lib/utils'
import { usePermissions, type UserWithPermissions } from '@/hooks/use-permissions'

interface Movimiento {
  id: string
  numero_movimiento?: string
  numero_recibo?: string
  tipo_movimiento: string
  numero_cuota?: number
  fecha_movimiento: string
  fecha_registro: string
  monto_total: number
  capital: number
  interes: number
  mora: number
  otros_cargos: number
  saldo_capital: number
  saldo_interes?: number
  saldo_mora?: number
  forma_pago?: string
  concepto?: string
  observaciones?: string
  estado: string
  usuario?: {
    id: string
    nombre: string
  }
}

interface HistorialPagosProps {
  creditoId: string
  codigoCredito: string
  open: boolean
  onClose: () => void
  sessionUser?: UserWithPermissions | null
  onActualizado?: () => void
}

const tipoMovimientoLabels: Record<string, string> = {
  desembolso: 'Desembolso',
  pago: 'Pago/Renovación',
  pago_interes: 'Pago de Intereses',
  pago_parcial: 'Abono Parcial',
  pago_total: 'Liquidación Total',
  cargo_administrativo: 'Cargo Administrativo',
  descuento: 'Descuento',
  reversa: 'Reversa',
  ajuste: 'Ajuste',
}

const tipoMovimientoColors: Record<string, string> = {
  desembolso: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pago: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pago_interes: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  pago_parcial: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  pago_total: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  cargo_administrativo: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  descuento: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  reversa: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ajuste: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export function HistorialPagos({ creditoId, codigoCredito, open, onClose, sessionUser, onActualizado }: HistorialPagosProps) {
  const [loading, setLoading] = useState(false)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [descargandoRecibo, setDescargandoRecibo] = useState<string | null>(null)

  // Anulación de movimientos
  const [movimientoAnular, setMovimientoAnular] = useState<Movimiento | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [anulando, setAnulando] = useState(false)

  const { hasPermission } = usePermissions(sessionUser)

  const handleAnularMovimiento = async () => {
    if (!movimientoAnular) return
    if (!motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo para la anulación')
      return
    }

    try {
      setAnulando(true)
      const idempotencyKey = crypto.randomUUID()
      await creditoPrendarioService.anularMovimiento(creditoId, movimientoAnular.id, {
        motivo: motivoAnulacion,
        idempotency_key: idempotencyKey
      })
      toast.success('Movimiento anulado exitosamente')
      setMovimientoAnular(null)
      setMotivoAnulacion('')
      cargarMovimientos()
      if (onActualizado) {
        onActualizado()
      }
    } catch (error: any) {
      console.error('Error al anular movimiento:', error)
      toast.error(error.message || 'Error al anular el movimiento')
    } finally {
      setAnulando(false)
    }
  }

  const descargarReciboPago = async (mov: Movimiento) => {
    setDescargandoRecibo(mov.id)
    try {
      await creditoPrendarioService.descargarReciboPago(creditoId, mov.id, mov.numero_movimiento)
      toast.success('Recibo descargado')
    } catch {
      toast.error('Error al descargar el recibo')
    } finally {
      setDescargandoRecibo(null)
    }
  }

  useEffect(() => {
    if (open && creditoId) {
      cargarMovimientos()
    }
  }, [open, creditoId])

  const cargarMovimientos = async () => {
    try {
      setLoading(true)
      const response = await creditoPrendarioService.getMovimientos(creditoId)

      // La respuesta es ApiResponse<T> que tiene { data, message?, errors? }
      if (response?.data && Array.isArray(response.data)) {
        setMovimientos(response.data as Movimiento[])
      } else if (Array.isArray(response)) {
        // En caso de que el servicio devuelva directamente el array
        setMovimientos(response as Movimiento[])
      } else {
        setMovimientos([])
      }
    } catch (error: any) {
      console.error('Error al cargar movimientos:', error)
      toast.error('Error al cargar el historial de pagos')
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  const descargarHistorialPdf = async () => {
    try {
      setIsDownloadingPdf(true)
      // Asumimos que existe o crearemos este endpoint
      await creditoPrendarioService.descargarHistorialPagos(creditoId)
      toast.success('Historial de pagos descargado')
    } catch (error: any) {
      console.error('Error al descargar PDF:', error)
      toast.error('Error al descargar el historial')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Calcular totales
  const totales = movimientos.reduce((acc, mov) => {
    if (mov.estado === 'activo' && mov.tipo_movimiento !== 'desembolso') {
      acc.totalPagado += mov.monto_total
      acc.capitalPagado += mov.capital
      acc.interesPagado += mov.interes
      acc.moraPagada += mov.mora
    }
    if (mov.tipo_movimiento === 'desembolso') {
      acc.totalDesembolsado += mov.monto_total
    }
    return acc
  }, { totalPagado: 0, capitalPagado: 0, interesPagado: 0, moraPagada: 0, totalDesembolsado: 0 })

  const cantidadPagos = movimientos.filter(m => m.estado === 'activo' && m.tipo_movimiento !== 'desembolso').length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Pagos - {codigoCredito}
          </DialogTitle>
          <DialogDescription>
            Registro completo de todos los movimientos financieros del crédito
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de totales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-y">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Pagado</p>
            <MoneyDisplay amount={totales.totalPagado} className="font-bold text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Capital</p>
            <MoneyDisplay amount={totales.capitalPagado} className="font-semibold" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Intereses</p>
            <MoneyDisplay amount={totales.interesPagado} className="font-semibold text-orange-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Mora</p>
            <MoneyDisplay amount={totales.moraPagada} className="font-semibold text-red-600" />
          </div>
        </div>

        {/* Barra de acciones */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {cantidadPagos} pago(s) registrado(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cargarMovimientos}
              disabled={loading}
            >
              <ArrowsClockwise className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={descargarHistorialPdf}
              disabled={isDownloadingPdf || loading}
            >
              {isDownloadingPdf ? (
                <Spinner className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FilePdf className="h-4 w-4 mr-1" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {/* Lista de movimientos */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay movimientos registrados</p>
            </div>
          ) : (
            movimientos.map((mov, index) => (
              <Card
                key={mov.id}
                className={cn(
                  "relative overflow-hidden",
                  mov.estado !== 'activo' && "opacity-60 border-dashed"
                )}
              >
                {/* Indicador lateral de tipo */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  mov.tipo_movimiento === 'desembolso' ? "bg-blue-500" :
                    mov.tipo_movimiento === 'pago_total' ? "bg-emerald-500" :
                      mov.tipo_movimiento.includes('pago') ? "bg-green-500" :
                        mov.estado === 'anulado' ? "bg-red-500" :
                          "bg-gray-400"
                )} />

                <CardContent className="p-3 pl-4">
                  {/* Encabezado */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", tipoMovimientoColors[mov.tipo_movimiento] || tipoMovimientoColors.ajuste)}>
                        {tipoMovimientoLabels[mov.tipo_movimiento] || mov.tipo_movimiento}
                      </Badge>
                      {mov.estado === 'anulado' && (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Anulado
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-bold text-lg",
                        mov.tipo_movimiento === 'desembolso' ? "text-blue-600" : "text-green-600"
                      )}>
                        {mov.tipo_movimiento === 'desembolso' ? '-' : '+'}
                        <MoneyDisplay amount={mov.monto_total} />
                      </span>
                    </div>
                  </div>

                  {/* Desglose */}
                  {mov.tipo_movimiento !== 'desembolso' && (
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2 bg-muted/50 p-2 rounded">
                      <div>
                        <span className="text-muted-foreground">Capital:</span>
                        <MoneyDisplay amount={mov.capital} className="ml-1 font-medium" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interés:</span>
                        <MoneyDisplay amount={mov.interes} className="ml-1 font-medium text-orange-600" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mora:</span>
                        <MoneyDisplay amount={mov.mora} className="ml-1 font-medium text-red-600" />
                      </div>
                    </div>
                  )}

                  {/* Información adicional */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(mov.fecha_movimiento).toLocaleDateString('es-GT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {mov.numero_recibo && (
                      <span className="flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        #{mov.numero_recibo}
                      </span>
                    )}
                    {mov.usuario && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {mov.usuario.nombre}
                      </span>
                    )}
                    {mov.forma_pago && (
                      <Badge variant="outline" className="text-xs">
                        {mov.forma_pago}
                      </Badge>
                    )}
                  </div>

                  {/* Saldo después */}
                  <div className="mt-2 pt-2 border-t text-xs">
                    <span className="text-muted-foreground">Saldo capital después: </span>
                    <MoneyDisplay amount={mov.saldo_capital} className="font-semibold" />
                  </div>

                  {/* Observaciones */}
                  {mov.observaciones && (
                    <p className="mt-2 text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      {mov.observaciones}
                    </p>
                  )}

                  {/* Botón reimprimir recibo y anular (solo para movimientos de pago no anulados) */}
                  {mov.tipo_movimiento !== 'desembolso' && mov.estado !== 'anulado' && (
                    <div className="mt-2 flex justify-end gap-2">
                      {hasPermission('creditos', 'cancelar') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setMovimientoAnular(mov)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Anular
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        disabled={descargandoRecibo === mov.id}
                        onClick={() => descargarReciboPago(mov)}
                      >
                        {descargandoRecibo === mov.id ? (
                          <Spinner className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Receipt className="h-3 w-3 mr-1" />
                        )}
                        Reimprimir Recibo
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        disabled={descargandoRecibo === `ticket-${mov.id}`}
                        onClick={() => creditoPrendarioService.descargarTicketPago(creditoId, mov.id, mov.numero_movimiento)}
                      >
                        Ticket
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialog Anular Movimiento */}
        <Dialog open={!!movimientoAnular} onOpenChange={(open) => !open && setMovimientoAnular(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Warning className="h-5 w-5" />
                Anular Movimiento Financiero
              </DialogTitle>
              <DialogDescription>
                Esta acción cambiará el estado del movimiento a <strong>Anulado</strong>, reversará su aplicación a las cuotas y recalculará los saldos del crédito.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo de la Anulación</label>
                <textarea
                  className="w-full min-h-[80px] p-2 border rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background text-foreground"
                  placeholder="Escribe la razón por la cual estás anulando este movimiento..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMovimientoAnular(null)
                  setMotivoAnulacion('')
                }}
                disabled={anulando}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnularMovimiento}
                disabled={anulando || !motivoAnulacion.trim()}
              >
                {anulando ? 'Anulando...' : 'Confirmar Anulación'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
