import { Cliente } from '@/lib/types'
import { CrearPrendaDTO, CrearTasacionDTO, AprobarCreditoDTO } from '@/types/creditoPrendario.types'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import {
  CheckCircle, User, Package, Scales,
  CreditCard as CreditCardIcon, Calendar, Percent,
  FilePdf, Barcode, Receipt, Download, Printer
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'
import { codigoPrereservadoService, CodigosReservados } from '@/services/codigoPrereservado.service'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import JsBarcode from 'jsbarcode'

interface PasoConfirmacionProps {
  cliente: Cliente
  prenda: Partial<CrearPrendaDTO>
  tasacion: Partial<CrearTasacionDTO>
  credito: Partial<AprobarCreditoDTO & {
    fecha_desembolso?: string
    fecha_primer_pago?: string
  }>
  onConfirmar: (codigosReservados?: CodigosReservados) => void
  onAnterior: () => void
  loading?: boolean
  /** Error del servidor mostrado en pantalla (p. ej. caja cerrada al desembolsar en efectivo). */
  mensajeErrorServidor?: string | null
}

export function PasoConfirmacion({
  cliente,
  prenda,
  tasacion,
  credito,
  onConfirmar,
  onAnterior,
  loading = false,
  mensajeErrorServidor = null
}: PasoConfirmacionProps) {
  const [descargandoRecibo, setDescargandoRecibo] = useState(false)
  const [descargandoContrato, setDescargandoContrato] = useState(false)
  const [descargandoPlanPagos, setDescargandoPlanPagos] = useState(false)
  const [generandoCodigoBarras, setGenerandoCodigoBarras] = useState(false)
  const [codigosReservados, setCodigosReservados] = useState<CodigosReservados | null>(null)
  const [cargandoCodigos, setCargandoCodigos] = useState(true)

  // Cargar códigos reservados de la BD al montar el componente
  useEffect(() => {
    const cargarCodigos = async () => {
      try {
        setCargandoCodigos(true)
        // Reservar códigos únicos desde el backend (se almacenan en BD)
        // Obtener sucursal_id del crédito o usar 1 por defecto
        const sucursalId = (credito as any).sucursal_id ? parseInt((credito as any).sucursal_id) : 1
        // No enviamos cliente_id porque la tabla clientes usa ID entero, no UUID
        const codigos = await codigoPrereservadoService.reservarCodigos(undefined, sucursalId)
        setCodigosReservados(codigos)
      } catch (error) {
        console.error('Error al reservar códigos:', error)
        toast.error('Error al generar códigos únicos')
      } finally {
        setCargandoCodigos(false)
      }
    }

    cargarCodigos()
  }, [])

  // Obtener los códigos (de BD o temporales como fallback)
  const numeroCreditoTemporal = codigosReservados?.codigo_credito || 'Cargando...'
  const codigoPrendaTemporal = codigosReservados?.codigo_prenda || 'Cargando...'

  // Obtener el plazo en días (ya sea el definido o calculado por cuotas)
  const getPlazoDias = () => {
    if (credito.plazo_dias) return credito.plazo_dias
    if (credito.numero_cuotas && credito.tipo_interes) {
      const mapeo: Record<string, number> = {
        semanal: 7,
        quincenal: 15,
        mensual: 30,
        catorcenal: 14,
        cada_28_dias: 28
      }
      return credito.numero_cuotas * (mapeo[credito.tipo_interes] || 30)
    }
    return 0
  }
  const plazoDiasEfectivo = getPlazoDias()

  const calcularFechaVencimiento = () => {
    const fechaBase = (credito as any).fecha_desembolso 
      ? new Date(`${(credito as any).fecha_desembolso}T12:00:00`) 
      : new Date()
    
    if (!plazoDiasEfectivo) return null
    
    const fecha = new Date(fechaBase)
    fecha.setDate(fecha.getDate() + plazoDiasEfectivo)
    return fecha
  }

  const fechaVencimiento = calcularFechaVencimiento()

  const handleDescargarRecibo = async () => {
    if (!codigosReservados) {
      toast.error('Esperando códigos únicos...')
      return
    }

    try {
      setDescargandoRecibo(true)

      const datosRecibo = {
        cliente: {
          id: cliente.id,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          dpi: cliente.dpi,
          telefono: cliente.telefono,
        },
        prenda: {
          descripcion_general: prenda.descripcion_general,
          marca: prenda.marca,
          modelo: prenda.modelo,
          codigo_prenda: codigoPrendaTemporal,
        },
        credito: {
          numero_credito: numeroCreditoTemporal,
          monto_aprobado: credito.monto_aprobado,
          tasa_interes: Number(credito.tasa_interes || 15),
          tipo_interes: credito.tipo_interes,
          plazo_dias: plazoDiasEfectivo,
          numero_cuotas: credito.numero_cuotas,
          fecha_desembolso: (credito as any).fecha_desembolso || new Date().toISOString().split('T')[0],
          fecha_primer_pago: (credito as any).fecha_primer_pago || null,
          fecha_vencimiento: fechaVencimiento?.toISOString().split('T')[0],
        },
        tasacion: {
          valor_mercado: tasacion.valor_mercado,
          valor_comercial: tasacion.valor_comercial,
        },
        sucursal: {
          id: '1', // TODO: Obtener de contexto
        },
      }

      await creditoPrendarioService.generarReciboPreliminar(datosRecibo)
      toast.success('Recibo descargado exitosamente')
    } catch (error: any) {
      console.error('Error al descargar recibo:', error)
      toast.error(error.message || 'Error al descargar el recibo')
    } finally {
      setDescargandoRecibo(false)
    }
  }

  const handleDescargarContrato = async () => {
    if (!codigosReservados) {
      toast.error('Esperando códigos únicos...')
      return
    }

    try {
      setDescargandoContrato(true)

      const datosContrato = {
        cliente: {
          id: cliente.id,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          dpi: cliente.dpi,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
        },
        prenda: {
          descripcion_general: prenda.descripcion_general,
          marca: prenda.marca,
          modelo: prenda.modelo,
        },
        credito: {
          numero_credito: numeroCreditoTemporal,
          monto_aprobado: credito.monto_aprobado,
          tasa_interes: Number(credito.tasa_interes || 15),
          tipo_interes: credito.tipo_interes,
          plazo_dias: plazoDiasEfectivo,
          numero_cuotas: credito.numero_cuotas,
          fecha_desembolso: (credito as any).fecha_desembolso || new Date().toISOString().split('T')[0],
          fecha_primer_pago: (credito as any).fecha_primer_pago || null,
          fecha_vencimiento: fechaVencimiento?.toISOString().split('T')[0],
          dias_gracia: credito.dias_gracia || 0,
        },
        tasacion: {
          valor_mercado: tasacion.valor_mercado,
        },
        sucursal: {
          id: '1', // TODO: Obtener de contexto
        },
      }

      await creditoPrendarioService.generarContratoPreliminar(datosContrato)
      toast.success('Contrato descargado exitosamente')
    } catch (error: any) {
      console.error('Error al descargar contrato:', error)
      toast.error(error.message || 'Error al descargar el contrato')
    } finally {
      setDescargandoContrato(false)
    }
  }

  const handleDescargarPlanPagos = async () => {
    if (!codigosReservados) {
      toast.error('Esperando códigos únicos...')
      return
    }

    try {
      setDescargandoPlanPagos(true)

      const datosPlan = {
        cliente: {
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          dpi: cliente.dpi,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
        },
        credito: {
          numero_credito: numeroCreditoTemporal,
          monto_aprobado: credito.monto_aprobado,
          tasa_interes: Number(credito.tasa_interes || 15),
          tipo_interes: credito.tipo_interes,
          numero_cuotas: credito.numero_cuotas,
          gas_ids: ((credito as any).gas_ids || []) as number[],
          dias_gracia: credito.dias_gracia || 0,
          fecha_desembolso: (credito as any).fecha_desembolso || new Date().toISOString().split('T')[0],
          fecha_primer_pago: (credito as any).fecha_primer_pago || null,
        },
        sucursal: {
          id: '1', // TODO: Obtener de contexto
        },
      }

      await creditoPrendarioService.generarPlanPagosPreliminar(datosPlan)
      toast.success('Plan de pagos descargado exitosamente')
    } catch (error: any) {
      console.error('Error al descargar plan de pagos:', error)
      toast.error(error.message || 'Error al descargar el plan de pagos')
    } finally {
      setDescargandoPlanPagos(false)
    }
  }

  const handleImprimirCodigoBarrasCredito = () => {
    if (!codigosReservados) {
      toast.error('Esperando códigos únicos...')
      return
    }

    try {
      setGenerandoCodigoBarras(true)

      // Crear canvas temporal para el código de barras
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, numeroCreditoTemporal, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
      })

      // Convertir canvas a imagen y descargar
      canvas.toBlob((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Codigo_Barras_Credito_${numeroCreditoTemporal}.png`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          toast.success('Código de barras de crédito generado exitosamente')
        }
      }, 'image/png')
    } catch (error: any) {
      console.error('Error al generar código de barras:', error)
      toast.error('Error al generar el código de barras')
    } finally {
      setGenerandoCodigoBarras(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-3">
          <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" weight="fill" />
        </div>
        <h3 className="text-xl font-semibold">Confirmación</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa todos los datos antes de crear el empeño
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre:</span>
            <span className="font-medium">{cliente.nombres} {cliente.apellidos}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DPI:</span>
            <span className="font-medium">{cliente.dpi}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Teléfono:</span>
            <span className="font-medium">{cliente.telefono}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Prenda Empeñada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descripción:</span>
            <span className="font-medium">{prenda.descripcion_general}</span>
          </div>
          {prenda.marca && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marca:</span>
              <span className="font-medium">{prenda.marca}</span>
            </div>
          )}
          {prenda.modelo && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo:</span>
              <span className="font-medium">{prenda.modelo}</span>
            </div>
          )}
          {prenda.condicion_fisica && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Condición:</span>
              <Badge variant="outline" className="capitalize">
                {prenda.condicion_fisica}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scales className="h-5 w-5 text-amber-600" />
            Tasación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor de Mercado:</span>
            <MoneyDisplay amount={tasacion.valor_mercado || 0} className="font-bold text-amber-600" />
          </div>
          {tasacion.valor_comercial && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Comercial:</span>
              <MoneyDisplay amount={tasacion.valor_comercial} className="font-medium" />
            </div>
          )}
          {tasacion.metodo_valuacion && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Método:</span>
              <Badge variant="outline" className="capitalize">
                {tasacion.metodo_valuacion}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader className="pb-3 bg-primary/5">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-primary" />
            Términos del Crédito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Monto a Desembolsar</p>
              <MoneyDisplay amount={credito.monto_aprobado || 0} className="text-xl font-bold text-primary" />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Plazo</p>
              <p className="text-xl font-bold">
                {credito.numero_cuotas} {credito.numero_cuotas === 1 ?
                  (credito.tipo_interes === 'semanal' ? 'semana' :
                      credito.tipo_interes === 'catorcenal' ? 'catorcena' :
                        credito.tipo_interes === 'quincenal' ? 'quincena' :
                          credito.tipo_interes === 'cada_28_dias' ? 'período' : 'mes') :
                  (credito.tipo_interes === 'semanal' ? 'semanas' :
                      credito.tipo_interes === 'catorcenal' ? 'catorcenas' :
                        credito.tipo_interes === 'quincenal' ? 'quincenas' :
                          credito.tipo_interes === 'cada_28_dias' ? 'períodos' : 'meses')}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tasa de Interés:</span>
              <span className="font-medium">{credito.tasa_interes}% mensual</span>
            </div>
            {((credito as any).tipo_mora === 'monto_fijo' && (credito as any).mora_monto_fijo != null) ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mora:</span>
                <span className="font-medium">Q {(credito as any).mora_monto_fijo} por día</span>
              </div>
            ) : credito.tasa_mora ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasa de Mora:</span>
                <span className="font-medium">{credito.tasa_mora}% (mensual, prorrateado a diario)</span>
              </div>
            ) : null}
            {credito.numero_cuotas && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número de Cuotas:</span>
                <span className="font-medium">{credito.numero_cuotas}</span>
              </div>
            )}
            {fechaVencimiento && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                <span className="font-medium">
                  {format(fechaVencimiento, 'dd/MM/yyyy', { locale: es })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader className="pb-3 bg-primary/5">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Documentos y Códigos
          </CardTitle>
          <CardDescription>
            Descarga los documentos antes de confirmar el empeño
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {cargandoCodigos && (
            <div className="text-sm text-muted-foreground text-center py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent inline-block mr-2" />
              Generando códigos únicos...
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handleDescargarRecibo}
              disabled={descargandoRecibo || loading || cargandoCodigos || !codigosReservados}
              className="flex items-center justify-center gap-2"
            >
              {descargandoRecibo ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generando...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  Descargar Recibo
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleDescargarContrato}
              disabled={descargandoContrato || loading || cargandoCodigos || !codigosReservados}
              className="flex items-center justify-center gap-2"
            >
              {descargandoContrato ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generando...
                </>
              ) : (
                <>
                  <FilePdf className="h-4 w-4" />
                  Descargar Contrato
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleDescargarPlanPagos}
              disabled={descargandoPlanPagos || loading || cargandoCodigos || !codigosReservados}
              className="flex items-center justify-center gap-2"
            >
              {descargandoPlanPagos ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Plan de Pagos
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleImprimirCodigoBarrasCredito}
              disabled={generandoCodigoBarras || loading || cargandoCodigos || !codigosReservados}
              className="flex items-center justify-center gap-2"
            >
              {generandoCodigoBarras ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generando...
                </>
              ) : (
                <>
                  <Barcode className="h-4 w-4" />
                  Código Barras Crédito
                </>
              )}
            </Button>
          </div>

          <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Información:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Número de crédito: <strong className="text-primary">{numeroCreditoTemporal}</strong></li>
              <li>Código de prenda: <strong className="text-primary">{codigoPrendaTemporal}</strong></li>
              <li>Los códigos son únicos y están reservados en el sistema</li>
              <li>Estos mismos códigos se usarán al crear el crédito</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Nota:</strong> Al confirmar se creará el crédito prendario y se registrará
          la prenda en custodia. Asegúrate de que todos los datos sean correctos.
          Puedes descargar el recibo, contrato y código de barras del crédito antes de confirmar.
        </p>
      </div>

      {mensajeErrorServidor ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle className="text-base font-semibold">Debes aperturar tu caja</AlertTitle>
          <AlertDescription className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {mensajeErrorServidor}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onAnterior} size="lg" type="button" disabled={loading}>
          Anterior
        </Button>
        <Button onClick={() => onConfirmar(codigosReservados || undefined)} size="lg" type="button" disabled={loading || cargandoCodigos}>
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creando...
            </>
          ) : cargandoCodigos ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Cargando códigos...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Confirmar y Crear Empeño
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
