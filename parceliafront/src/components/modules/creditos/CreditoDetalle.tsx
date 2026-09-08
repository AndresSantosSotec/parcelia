import { CreditoPrendario } from '@/types/creditoPrendario.types'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatDateDMY, parseDateLocal } from '@/lib/utils'
import {
  Receipt, CreditCard as CreditCardIcon,
  Package, User, Calendar, FilePdf, Download,
  Spinner, ArrowsClockwise, ClockCounterClockwise,
  CheckCircle, Warning, Info, Percent, CalendarCheck,
  Money, Bank, Images, X as XIcon
} from '@phosphor-icons/react'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { PagoWizard } from './PagoWizard'
import { HistorialPagos } from './HistorialPagos'
import { RefrendoModal } from './RefrendoModal'
import { cn } from '@/lib/utils'
import { usePermissions, type UserWithPermissions } from '@/hooks/use-permissions'

interface CreditoDetalleProps {
  credito: CreditoPrendario
  abierto: boolean
  onCerrar: () => void
  onActualizado: () => void
  sessionUser?: UserWithPermissions | null
}

export function CreditoDetalle({ credito, abierto, onCerrar, onActualizado, sessionUser }: CreditoDetalleProps) {
  const [isDownloadingPlan, setIsDownloadingPlan] = useState(false)
  const [isDownloadingContrato, setIsDownloadingContrato] = useState(false)
  const [isDownloadingRecibo, setIsDownloadingRecibo] = useState(false)
  const [mostrarWizardPago, setMostrarWizardPago] = useState(false)
  const [mostrarHistorialPagos, setMostrarHistorialPagos] = useState(false)
  const [wizardTab, setWizardTab] = useState<'renovacion' | 'abono' | 'liquidacion'>('abono')
  const [wizardMonto, setWizardMonto] = useState<string>('')
  const [creditoCompleto, setCreditoCompleto] = useState<CreditoPrendario | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [galeriaAbierta, setGaleriaAbierta] = useState(false)
  const [imagenesGaleria, setImagenesGaleria] = useState<string[]>([])
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<string>('')
  const [imagenActiva, setImagenActiva] = useState(0)
  const [imagenCargando, setImagenCargando] = useState(true)
  const [imagenError, setImagenError] = useState(false)
  const [mostrarRefrendoModal, setMostrarRefrendoModal] = useState(false)
  
  // Anulación del crédito
  const [mostrarDialogAnular, setMostrarDialogAnular] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [anulandoCredito, setAnulandoCredito] = useState(false)

  const { hasPermission } = usePermissions(sessionUser)
  
  const handleAnularCredito = async () => {
    if (!motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo para la anulación')
      return
    }

    try {
      setAnulandoCredito(true)
      await creditoPrendarioService.update(creditoActual.id, {
        estado: 'anulado',
        observaciones: motivoAnulacion
      })
      toast.success('Crédito anulado exitosamente')
      setMostrarDialogAnular(false)
      setMotivoAnulacion('')
      onActualizado() // Recargar datos
    } catch (error: any) {
      console.error('Error al anular crédito:', error)
      toast.error(error.message || 'Error al anular el crédito')
    } finally {
      setAnulandoCredito(false)
    }
  }

  // Cargar datos completos del crédito cuando se abre el modal
  useEffect(() => {
    if (abierto && credito?.id) {
      cargarCreditoCompleto()
    }
  }, [abierto, credito?.id])

  const cargarCreditoCompleto = async () => {
    try {
      setCargandoDetalle(true)
      const creditoDetallado = await creditoPrendarioService.getById(credito.id)
      setCreditoCompleto(creditoDetallado)
    } catch (error) {
      console.error('Error al cargar detalle del crédito:', error)
      toast.error('Error al cargar los detalles del crédito')
      // Si falla, usar el crédito básico que ya tenemos
      setCreditoCompleto(credito)
    } finally {
      setCargandoDetalle(false)
    }
  }

  // Usar creditoCompleto si está disponible, sino usar el crédito básico
  const creditoActual = creditoCompleto || credito

  const creditoFinalizado = ['pagado', 'liquidado', 'rechazado', 'anulado', 'vendido'].includes(creditoActual.estado)

  // El refrendo solo aplica cuando el crédito está vencido (pasó la fecha de vencimiento)
  const creditoVencido = !!creditoActual.fecha_vencimiento && parseDateLocal(creditoActual.fecha_vencimiento) < new Date()

  const abrirGaleria = (imagenes: string[], prendaDesc: string) => {
    console.log('Abriendo galería con imágenes:', imagenes)
    setImagenesGaleria(imagenes)
    setPrendaSeleccionada(prendaDesc)
    setImagenActiva(0)
    setImagenCargando(true)
    setImagenError(false)
    setGaleriaAbierta(true)
  }

  // Calcular saldos de forma segura, manejando valores undefined/NaN
  const capitalPendiente = Number(creditoActual.capital_pendiente) || 0
  const interesesPendientes = Number(creditoActual.intereses_pendientes) || 0
  const moraPendiente = Number(creditoActual.mora_pendiente) || 0
  const saldoTotal = capitalPendiente + interesesPendientes + moraPendiente

  const handleDescargarPlanPagos = async () => {
    try {
      setIsDownloadingPlan(true)
      await creditoPrendarioService.descargarPlanPagos(creditoActual.id)
      toast.success('Plan de pagos descargado exitosamente')
    } catch (error: any) {
      console.error('Error al descargar plan de pagos:', error)
      toast.error(error.message || 'Error al descargar el plan de pagos')
    } finally {
      setIsDownloadingPlan(false)
    }
  }

  const handleDescargarContrato = async () => {
    try {
      setIsDownloadingContrato(true)
      await creditoPrendarioService.descargarContrato(credito.id)
      toast.success('Contrato descargado exitosamente')
    } catch (error: any) {
      console.error('Error al descargar contrato:', error)
      toast.error(error.message || 'Error al descargar el contrato')
    } finally {
      setIsDownloadingContrato(false)
    }
  }

  const handleDescargarRecibo = async () => {
    try {
      setIsDownloadingRecibo(true)
      await creditoPrendarioService.descargarRecibo(credito.id)
      toast.success('Recibo descargado exitosamente')
    } catch (error: any) {
      console.error('Error al descargar recibo:', error)
      toast.error(error.message || 'Error al descargar el recibo')
    } finally {
      setIsDownloadingRecibo(false)
    }
  }

  const handleReactivar = () => {
    setMostrarRefrendoModal(true)
  }

  return (
    <Sheet open={abierto} onOpenChange={onCerrar}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            {creditoActual.codigo_credito}
          </SheetTitle>
          <SheetDescription>
            Detalle completo del crédito prendario
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Información del cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Nombre: </span>
                <span className="text-sm">{creditoActual.cliente?.nombres} {creditoActual.cliente?.apellidos}</span>
              </div>
              {creditoActual.cliente?.codigo_cliente && (
                <div>
                  <span className="text-sm font-medium">Código: </span>
                  <span className="text-sm font-mono">{creditoActual.cliente.codigo_cliente}</span>
                </div>
              )}
              {creditoActual.cliente?.telefono && (
                <div>
                  <span className="text-sm font-medium">Teléfono: </span>
                  <span className="text-sm">{creditoActual.cliente.telefono}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prendas - Tabla */}
          {creditoActual.prendas && creditoActual.prendas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Prendas Empeñadas ({creditoActual.prendas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Descripción</th>
                        <th className="text-left p-2 text-sm font-medium">Categoría</th>
                        <th className="text-right p-2 text-sm font-medium">Valor Tasación</th>
                        <th className="text-right p-2 text-sm font-medium">Valor Préstamo</th>
                        <th className="text-center p-2 text-sm font-medium">Estado</th>
                        <th className="text-center p-2 text-sm font-medium">Fotos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditoActual.prendas.map((prenda) => {
                        // Procesar imágenes de forma robusta
                        let imagenes: string[] = [];
                        
                        // Primero intentar con imágenes normalizadas
                        if (prenda.imagenes && Array.isArray(prenda.imagenes) && prenda.imagenes.length > 0) {
                          imagenes = prenda.imagenes
                            .map(img => {
                              // Si es objeto con url
                              if (typeof img === 'object' && img !== null && 'url' in img) {
                                return img.url;
                              }
                              // Si es string directo
                              if (typeof img === 'string') {
                                return img;
                              }
                              return null;
                            })
                            .filter((url): url is string => url !== null && url !== '');
                        }
                        
                        // Fallback a fotos legacy
                        if (imagenes.length === 0 && prenda.fotos) {
                          if (Array.isArray(prenda.fotos)) {
                            imagenes = (prenda.fotos as any[])
                              .map(foto => {
                                // Si es objeto con url
                                if (typeof foto === 'object' && foto !== null && 'url' in foto) {
                                  return (foto as any).url as string;
                                }
                                // Si es string directo
                                if (typeof foto === 'string') {
                                  return foto;
                                }
                                return null;
                              })
                              .filter((url): url is string => url !== null && url !== '');
                          }
                        }
                        
                        // Validar que las URLs de base64 estén completas
                        imagenes = imagenes.map(url => {
                          if (url && url.startsWith('data:image')) {
                            return url;
                          }
                          // Si la URL no empieza con data: ni http, podría ser una ruta relativa
                          if (url && !url.startsWith('http') && !url.startsWith('/')) {
                            return `/storage/${url}`;
                          }
                          return url;
                        }).filter(url => url && url.trim() !== '');

                        return (
                          <tr key={prenda.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm">
                              {prenda.descripcion_general || prenda.descripcion || 'N/A'}
                              {prenda.marca && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {prenda.marca}
                                  {prenda.modelo && ` - ${prenda.modelo}`}
                                </div>
                              )}
                              {/* Mostrar datos adicionales normalizados si existen */}
                              {prenda.datos_adicionales_normalizados && prenda.datos_adicionales_normalizados.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {prenda.datos_adicionales_normalizados.slice(0, 3).map((dato, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {dato.label}: {dato.valor}
                                    </Badge>
                                  ))}
                                  {prenda.datos_adicionales_normalizados.length > 3 && (
                                    <span className="text-xs text-muted-foreground">+{prenda.datos_adicionales_normalizados.length - 3} más</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {typeof prenda.categoria === 'object' ? prenda.categoria?.nombre : (prenda.categoria || 'N/A')}
                            </td>
                            <td className="p-2 text-sm text-right">
                              {prenda.valor_tasacion ? (
                                <MoneyDisplay amount={prenda.valor_tasacion} className="text-sm" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-2 text-sm text-right">
                              {prenda.valor_prestamo ? (
                                <MoneyDisplay amount={prenda.valor_prestamo} className="text-sm font-semibold" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {prenda.estado ? (
                                <Badge variant="outline" className="text-xs">{prenda.estado}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {imagenes.length > 0 ? (
                                <div className="flex flex-col gap-1 items-center">
                                  <div className="flex gap-1 justify-center">
                                    {imagenes.slice(0, 2).map((foto, idx) => (
                                      <img
                                        key={idx}
                                        src={foto}
                                        alt={`Foto ${idx + 1}`}
                                        className="w-10 h-10 object-cover rounded border cursor-pointer hover:opacity-80"
                                        onClick={() => abrirGaleria(imagenes, prenda.descripcion_general || prenda.descripcion || 'Prenda')}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => abrirGaleria(imagenes, prenda.descripcion_general || prenda.descripcion || 'Prenda')}
                                  >
                                    <Images className="h-3 w-3 mr-1" />
                                    Ver {imagenes.length} foto{imagenes.length !== 1 ? 's' : ''}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin fotos</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen Financiero */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Resumen Financiero
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarHistorialPagos(true)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                >
                  <ClockCounterClockwise className="h-4 w-4 mr-1" />
                  Historial
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Información del crédito */}
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tasa Interés:</span>
                  <span className="font-medium">{creditoActual.tasa_interes}%</span>
                  <Badge variant="outline" className="text-xs">{creditoActual.tipo_interes || 'mensual'}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Plazo:</span>
                  <span className="font-medium">{creditoActual.plazo_dias} días</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Desembolso:</span>
                  <span className="font-medium">{formatDateDMY(creditoActual.fecha_desembolso)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Warning className={cn("h-4 w-4", creditoActual.fecha_vencimiento && parseDateLocal(creditoActual.fecha_vencimiento) < new Date() ? "text-red-500" : "text-muted-foreground")} />
                  <span className="text-muted-foreground">Vencimiento:</span>
                  <span className={cn("font-medium", creditoActual.fecha_vencimiento && parseDateLocal(creditoActual.fecha_vencimiento) < new Date() && "text-red-600")}>
                    {formatDateDMY(creditoActual.fecha_vencimiento)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Montos */}
              {creditoActual.monto_desembolsado && (
                <div className="flex justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Bank className="h-4 w-4 text-blue-500" />
                    Monto desembolsado:
                  </span>
                  <MoneyDisplay amount={creditoActual.monto_desembolsado} className="font-semibold" />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm">Capital pendiente:</span>
                <MoneyDisplay amount={capitalPendiente} className="font-semibold" />
              </div>
              {creditoActual.capital_pagado && Number(creditoActual.capital_pagado) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Capital pagado:
                  </span>
                  <MoneyDisplay amount={Number(creditoActual.capital_pagado)} className="font-semibold" />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm">Intereses pendientes:</span>
                <MoneyDisplay amount={interesesPendientes} className="font-semibold text-orange-600" />
              </div>
              {creditoActual.interes_pagado && Number(creditoActual.interes_pagado) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Intereses pagados:
                  </span>
                  <MoneyDisplay amount={Number(creditoActual.interes_pagado)} className="font-semibold" />
                </div>
              )}
              {moraPendiente > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <Warning className="h-3 w-3" />
                    Mora pendiente:
                  </span>
                  <MoneyDisplay amount={moraPendiente} className="font-semibold text-red-600" />
                </div>
              )}
              {creditoActual.mora_pagada && Number(creditoActual.mora_pagada) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Mora pagada:
                  </span>
                  <MoneyDisplay amount={Number(creditoActual.mora_pagada)} className="font-semibold" />
                </div>
              )}
              <div className="pt-2 border-t flex justify-between">
                <span className="font-medium">TOTAL A PAGAR:</span>
                <MoneyDisplay amount={saldoTotal} className="font-bold text-lg" />
              </div>

              {/* Progress de pago si hay capital pagado */}
              {creditoActual.monto_desembolsado && Number(creditoActual.capital_pagado || 0) > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progreso del capital</span>
                    <span>{Math.round((Number(creditoActual.capital_pagado || 0) / Number(creditoActual.monto_desembolsado)) * 100)}%</span>
                  </div>
                  <Progress
                    value={(Number(creditoActual.capital_pagado || 0) / Number(creditoActual.monto_desembolsado)) * 100}
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan de Pagos */}
          {creditoActual.plan_pagos && creditoActual.plan_pagos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Plan de Pagos ({creditoActual.plan_pagos.length} cuotas)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDescargarPlanPagos}
                    disabled={isDownloadingPlan}
                    title="Descargar plan de pagos en PDF"
                  >
                    {isDownloadingPlan ? (
                      <Spinner className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FilePdf className="h-4 w-4 mr-1" />
                    )}
                    PDF
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {creditoActual.plan_pagos
                    .sort((a, b) => a.numero_cuota - b.numero_cuota)
                    .map((cuota) => {
                    // Usar los campos correctos que envía el backend
                    const totalCuota = Number((cuota as any).cuota_total) || Number(cuota.monto_cuota_proyectado) || 0
                    const totalPagado = Number(cuota.monto_total_pagado) || 0
                    const capitalPagadoCuota = Number(cuota.capital_pagado) || 0
                    const interesPagadoCuota = Number(cuota.interes_pagado) || 0
                    const moraPagadaCuota = Number(cuota.mora_pagada) || 0
                    const moraProyectada = Number(cuota.mora_proyectada) || Number((cuota as any).mora) || 0
                    const interesPendienteCuota = Number(cuota.interes_pendiente) || 0
                    const moraPendienteCuota = Number(cuota.mora_pendiente) || 0
                    const saldoPendienteCuota = Number(cuota.monto_pendiente) || (totalCuota - totalPagado)
                    // Comparar solo fechas sin hora para evitar problemas de timezone
                    const fechaVencimiento = parseDateLocal(cuota.fecha_vencimiento)
                    const hoy = new Date()
                    hoy.setHours(0, 0, 0, 0)
                    const vencida = fechaVencimiento < hoy && cuota.estado !== 'pagada'
                    const enMora = (cuota.estado as string) === 'en_mora' || (cuota.estado as string) === 'vencida' && moraProyectada > 0
                    const porcentajePagado = totalCuota > 0 ? Math.round((totalPagado / totalCuota) * 100) : 0

                    return (
                      <div
                        key={cuota.numero_cuota}
                        className={cn(
                          "p-3 border rounded-lg",
                          cuota.estado === 'pagada' && "bg-green-50 dark:bg-green-950 border-green-200",
                          enMora && "bg-red-50 dark:bg-red-950 border-red-300",
                          !enMora && vencida && "bg-orange-50 dark:bg-orange-950 border-orange-200",
                          cuota.estado === 'parcial' && "bg-yellow-50 dark:bg-yellow-950 border-yellow-200"
                        )}
                      >
                        {/* Header de la cuota */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">Cuota {cuota.numero_cuota}</span>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              Vence: {formatDateDMY(cuota.fecha_vencimiento)}
                              {enMora && <Badge variant="destructive" className="text-xs ml-1">En Mora</Badge>}
                              {!enMora && vencida && <Badge variant="destructive" className="text-xs ml-1">Vencida</Badge>}
                            </div>
                            {cuota.dias_mora > 0 && (
                              <div className="text-xs text-red-600 mt-0.5">
                                {cuota.dias_mora} días de mora
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <MoneyDisplay amount={totalCuota} className="font-semibold" />
                            <Badge
                              variant={
                                cuota.estado === 'pagada' 
                                  ? 'default' 
                                  : cuota.estado === 'parcial' || (cuota.estado as string) === 'pagada_parcial'
                                  ? 'secondary'
                                  : (cuota.estado as string) === 'en_mora'
                                  ? 'destructive'
                                  : (cuota.estado as string) === 'renovada'
                                  ? 'outline'
                                  : 'outline'
                              }
                              className={cn(
                                "ml-2 text-xs",
                                cuota.estado === 'pagada' && "bg-green-600",
                                (cuota.estado as string) === 'renovada' && "bg-blue-50 dark:bg-blue-950 border-blue-300 text-blue-700 dark:text-blue-400"
                              )}
                            >
                              {cuota.estado === 'pagada' ? (
                                <><CheckCircle className="h-3 w-3 mr-1" />Pagada</>
                              ) : cuota.estado === 'parcial' || (cuota.estado as string) === 'pagada_parcial' ? (
                                'Parcial'
                              ) : (cuota.estado as string) === 'en_mora' ? (
                                <><Warning className="h-3 w-3 mr-1" />En Mora</>
                              ) : (cuota.estado as string) === 'vencida' ? (
                                'Vencida'
                              ) : (cuota.estado as string) === 'renovada' ? (
                                'Renovada'
                              ) : (
                                'Pendiente'
                              )}
                            </Badge>
                          </div>
                        </div>

                        {/* Desglose de la cuota */}
                        <div className="grid grid-cols-4 gap-2 text-xs bg-muted/50 p-2 rounded mb-2">
                          <div>
                            <span className="text-muted-foreground block">Capital</span>
                            <MoneyDisplay amount={Number(cuota.capital_proyectado) || 0} className="font-medium" />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Interés</span>
                            <MoneyDisplay amount={Number(cuota.interes_proyectado) || 0} className="font-medium text-orange-600" />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Mora</span>
                            <MoneyDisplay amount={moraProyectada} className={cn("font-medium", moraProyectada > 0 && "text-red-600")} />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Otros</span>
                            <MoneyDisplay amount={Number(cuota.gastos_proyectado) || 0} className="font-medium text-purple-600" />
                          </div>
                        </div>

                        {/* Si hay pagos en esta cuota, mostrar desglose */}
                        {totalPagado > 0 && (
                          <div className="border-t pt-2">
                            <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">Pagado:</span>
                              <MoneyDisplay amount={totalPagado} className="font-semibold" />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {capitalPagadoCuota > 0 && (
                                <div className="text-green-600">
                                  <span className="text-muted-foreground">Capital: </span>
                                  <MoneyDisplay amount={capitalPagadoCuota} />
                                </div>
                              )}
                              {interesPagadoCuota > 0 && (
                                <div className="text-green-600">
                                  <span className="text-muted-foreground">Interés: </span>
                                  <MoneyDisplay amount={interesPagadoCuota} />
                                </div>
                              )}
                              {moraPagadaCuota > 0 && (
                                <div className="text-green-600">
                                  <span className="text-muted-foreground">Mora: </span>
                                  <MoneyDisplay amount={moraPagadaCuota} />
                                </div>
                              )}
                            </div>
                            {/* Progress bar del pago */}
                            {cuota.estado !== 'pagada' && porcentajePagado > 0 && (
                              <div className="mt-2">
                                <Progress value={porcentajePagado} className="h-1.5" />
                                <span className="text-xs text-muted-foreground">{porcentajePagado}% pagado</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Saldo pendiente si no está pagada */}
                        {cuota.estado !== 'pagada' && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Saldo pendiente: </span>
                              <MoneyDisplay
                                amount={saldoPendienteCuota}
                                className="font-semibold text-primary"
                              />
                            </div>

                            {/* Desglose de pendientes: interés y mora */}
                            {(interesPendienteCuota > 0 || moraPendienteCuota > 0) && !creditoFinalizado && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {interesPendienteCuota > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                                    onClick={() => {
                                      setWizardTab('abono')
                                      setWizardMonto(interesPendienteCuota.toFixed(2))
                                      setMostrarWizardPago(true)
                                    }}
                                  >
                                    <Percent className="h-3 w-3 mr-1" />
                                    Pagar Interés (Q{interesPendienteCuota.toFixed(2)})
                                  </Button>
                                )}
                                {moraPendienteCuota > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    onClick={() => {
                                      setWizardTab('abono')
                                      setWizardMonto(moraPendienteCuota.toFixed(2))
                                      setMostrarWizardPago(true)
                                    }}
                                  >
                                    <Warning className="h-3 w-3 mr-1" />
                                    Pagar Mora (Q{moraPendienteCuota.toFixed(2)})
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDescargarRecibo}
                disabled={isDownloadingRecibo}
              >
                {isDownloadingRecibo ? (
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4 mr-2" />
                )}
                Descargar Recibo
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDescargarPlanPagos}
                disabled={isDownloadingPlan}
              >
                {isDownloadingPlan ? (
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FilePdf className="h-4 w-4 mr-2" />
                )}
                Plan de Pagos
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDescargarContrato}
                disabled={isDownloadingContrato}
              >
                {isDownloadingContrato ? (
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar Contrato
              </Button>
            </div>
            <div className="flex gap-2">
              {creditoFinalizado ? (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleReactivar}
                >
                  <ArrowsClockwise className="h-4 w-4 mr-2" />
                  Reactivar / Re-empeñar
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={creditoFinalizado}
                    onClick={() => {
                      setWizardTab('renovacion')
                      setWizardMonto('')
                      setMostrarWizardPago(true)
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Renovar
                  </Button>
                  {creditoVencido && (
                    <Button
                      variant="outline"
                      className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                      disabled={creditoFinalizado}
                      onClick={() => setMostrarRefrendoModal(true)}
                    >
                      <ArrowsClockwise className="h-4 w-4 mr-2" />
                      Refrendo
                    </Button>
                  )}
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={creditoFinalizado}
                    onClick={() => {
                      setWizardTab('abono')
                      setWizardMonto('')
                      setMostrarWizardPago(true)
                    }}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                </>
              )}
            </div>
            {!creditoFinalizado && hasPermission('creditos', 'cancelar') && (
              <div className="pt-2 border-t mt-1">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setMostrarDialogAnular(true)}
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Anular Crédito
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Wizard de Pagos - Renderizado condicionalmente para resetear estado al abrir */}
        {mostrarWizardPago && (
          <PagoWizard
            creditoId={creditoActual.id}
            open={mostrarWizardPago}
            initialTab={wizardTab}
            initialMonto={wizardMonto}
            onClose={() => setMostrarWizardPago(false)}
            onSuccess={() => {
              setMostrarWizardPago(false)
              onActualizado() // Recargar datos del crédito
            }}
          />
        )}

        {/* Historial de Pagos */}
        <HistorialPagos
          creditoId={creditoActual.id}
          codigoCredito={creditoActual.codigo_credito}
          open={mostrarHistorialPagos}
          onClose={() => setMostrarHistorialPagos(false)}
          sessionUser={sessionUser}
          onActualizado={cargarCreditoCompleto}
        />

        {/* Modal de Refrendo / Re-empeño */}
        <RefrendoModal
          creditoId={Number(creditoActual.id)}
          numeroCredito={creditoActual.codigo_credito}
          clienteNombre={creditoActual.cliente ? `${creditoActual.cliente.nombres} ${creditoActual.cliente.apellidos}` : 'Cliente'}
          capitalPendiente={capitalPendiente}
          fechaVencimiento={creditoActual.fecha_vencimiento || ''}
          isOpen={mostrarRefrendoModal}
          onClose={() => setMostrarRefrendoModal(false)}
          onSuccess={() => {
            setMostrarRefrendoModal(false)
            onActualizado()
          }}
        />

        {/* Galería de Fotos */}
        <Dialog open={galeriaAbierta} onOpenChange={setGaleriaAbierta}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <Images className="h-5 w-5" />
                Fotos de: {prendaSeleccionada}
              </DialogTitle>
              <DialogDescription>
                Imagen {imagenActiva + 1} de {imagenesGaleria.length}
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative bg-muted/30">
              {/* Imagen principal */}
              <div className="flex items-center justify-center min-h-[400px] max-h-[500px] p-4">
                {imagenesGaleria.length > 0 ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {imagenCargando && !imagenError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    )}
                    {imagenError ? (
                      <div className="flex flex-col items-center gap-4 p-8 text-center">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                          <Images className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">No se pudo cargar la imagen</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            La imagen puede estar corrupta o no disponible
                          </p>
                        </div>
                        {imagenesGaleria.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            Intenta navegar a otra imagen usando las flechas
                          </p>
                        )}
                      </div>
                    ) : (
                      <img
                        src={imagenesGaleria[imagenActiva]}
                        alt={`Foto ${imagenActiva + 1}`}
                        className={cn(
                          "max-w-full max-h-[500px] object-contain rounded-lg transition-opacity",
                          imagenCargando ? "opacity-0" : "opacity-100"
                        )}
                        onLoad={() => {
                          console.log('Imagen cargada exitosamente:', imagenesGaleria[imagenActiva].substring(0, 50))
                          setImagenCargando(false)
                          setImagenError(false)
                        }}
                        onError={(e) => {
                          console.error('Error al cargar imagen:', imagenesGaleria[imagenActiva].substring(0, 100))
                          setImagenCargando(false)
                          setImagenError(true)
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    No hay imágenes disponibles
                  </div>
                )}
              </div>

              {/* Botones de navegación */}
              {imagenesGaleria.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                    onClick={() => {
                      setImagenActiva((prev) => (prev === 0 ? imagenesGaleria.length - 1 : prev - 1))
                      setImagenCargando(true)
                      setImagenError(false)
                    }}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                    onClick={() => {
                      setImagenActiva((prev) => (prev === imagenesGaleria.length - 1 ? 0 : prev + 1))
                      setImagenCargando(true)
                      setImagenError(false)
                    }}
                  >
                    →
                  </Button>
                </>
              )}
            </div>

            {/* Miniaturas */}
            {imagenesGaleria.length > 1 && (
              <div className="p-4 pt-2">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {imagenesGaleria.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setImagenActiva(idx)
                        setImagenCargando(true)
                        setImagenError(false)
                      }}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all relative",
                        imagenActiva === idx 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-transparent hover:border-primary/50"
                      )}
                    >
                      <img
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.placeholder-icon')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'placeholder-icon absolute inset-0 flex items-center justify-center bg-muted';
                            placeholder.innerHTML = '<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Anular Crédito */}
        <Dialog open={mostrarDialogAnular} onOpenChange={setMostrarDialogAnular}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Warning className="h-5 w-5" />
                Anular Crédito Prendario
              </DialogTitle>
              <DialogDescription>
                Esta acción cambiará el estado del crédito a <strong>Anulado</strong> y desactivará sus operaciones. Los movimientos registrados se conservarán como historial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo de la Anulación</label>
                <textarea
                  className="w-full min-h-[80px] p-2 border rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background text-foreground"
                  placeholder="Escribe la razón por la cual estás anulando este crédito..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMostrarDialogAnular(false)
                  setMotivoAnulacion('')
                }}
                disabled={anulandoCredito}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnularCredito}
                disabled={anulandoCredito || !motivoAnulacion.trim()}
              >
                {anulandoCredito ? 'Anulando...' : 'Confirmar Anulación'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}
