import { useState, useEffect } from 'react'
import { usePermissions, type UserWithPermissions } from '@/hooks/use-permissions'
import { Cliente } from '@/lib/types'
import { CrearPrendaDTO, CrearTasacionDTO, AprobarCreditoDTO } from '@/types/creditoPrendario.types'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'
import { CodigosReservados } from '@/services/codigoPrereservado.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, ArrowLeft, FloppyDisk, Info } from '@phosphor-icons/react'
import { PasoSeleccionarCliente } from './wizard/PasoSeleccionarCliente'
import { PasoRegistrarPrenda } from './wizard/PasoRegistrarPrenda'
import { PasoTasacion } from './wizard/PasoTasacion'
import { PasoConfigurarCredito } from './wizard/PasoConfigurarCredito'
import { PasoConfirmacion } from './wizard/PasoConfirmacion'
import { useCreditoDrafts } from '@/hooks/useCreditoDrafts'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface NuevoCreditoWizardProps {
  onCreditoCreado: () => void
  onCancelar: () => void
  userId?: string
  /** Usuario con permisos (API); bloquea tasa/mora en el paso de configuración si no aplica. */
  sessionUser?: UserWithPermissions | null
}

/** Respuesta del API cuando falta caja para desembolso en efectivo (título del toast / detección). */
function esErrorRequiereAperturaCaja(texto: string): boolean {
  if (!texto) return false
  const t = texto.toLowerCase()
  return (
    t.includes('caja abierta') ||
    t.includes('aperturar caja') ||
    (t.includes('desembolso') && t.includes('efectivo') && t.includes('caja'))
  )
}

/**
 * Extensión local para el wizard:
 * - Estos campos se usan en esta vista aunque no existan en AprobarCreditoDTO
 * - Si ya existen en tu DTO real, no pasa nada: TS los unifica.
 */
type WizardCreditoDTO = Partial<
  AprobarCreditoDTO & {
    fecha_desembolso?: string
    fecha_primer_pago?: string
    monto_cuota?: number
    observaciones?: string
    afecta_interes_mensual?: boolean
    permite_pago_capital_diferente?: boolean
    metodo_calculo?: 'francesa' | 'flat'
    gas_ids?: number[]
    plan_interes_id?: number
  }
>

export function NuevoCreditoWizard({
  onCreditoCreado,
  onCancelar,
  userId = '',
  sessionUser = null,
}: NuevoCreditoWizardProps) {
  const { isSuperAdmin, hasPermission } = usePermissions(sessionUser ?? undefined)
  const canEditTasaInteres = isSuperAdmin || hasPermission('creditos', 'editar_tasa_interes')
  const canEditMora = isSuperAdmin || hasPermission('creditos', 'editar_mora')

  const [paso, setPaso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [draftId, setDraftId] = useState<string | undefined>(undefined)
  /** Error persistente en pantalla de confirmación (p. ej. caja cerrada). */
  const [mensajeErrorConfirmacion, setMensajeErrorConfirmacion] = useState<string | null>(null)

  // Borradores por usuario
  const { borradores, guardarBorrador, eliminarBorrador } = useCreditoDrafts(userId)

  // Estados del wizard
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [datosPrenda, setDatosPrenda] = useState<Partial<CrearPrendaDTO> | null>(null)
  const [datosTasacion, setDatosTasacion] = useState<Partial<CrearTasacionDTO> | null>(null)
  const [datosCredito, setDatosCredito] = useState<WizardCreditoDTO | null>(null)

  const handleCreditoChange = (next: WizardCreditoDTO | null) => {
    setDatosCredito((prev) => {
      if (!next) return prev
      return {
        ...(prev ?? {}),
        ...next,
      }
    })
  }

  const [parametrosCategoria, setParametrosCategoria] = useState<{
    tasa_interes?: number
    tasa_mora?: number
    plazo_maximo?: number
    porcentaje_prestamo_maximo?: number
    metodo_calculo?: 'francesa' | 'flat'
    afecta_interes_mensual?: boolean
    permite_pago_capital_diferente?: boolean
  } | null>(null)

  // Estado para auto-guardado
  const [autoSaveData, setAutoSaveData] = useState<any | null>(null)
  const autoSaveKey = `credito-auto-save:${userId || 'default'}`

  // 1. Cargar auto-save al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(autoSaveKey)
      if (raw) {
        setAutoSaveData(JSON.parse(raw))
      }
    } catch (error) {
      console.error('Error al cargar auto-guardado:', error)
    }
  }, [autoSaveKey])

  // 2. Efecto reactivo para guardar progreso en segundo plano
  useEffect(() => {
    // Evitar auto-guardar si todo está en su estado inicial vacío
    if (!clienteSeleccionado && !datosPrenda && !datosTasacion && !datosCredito) {
      return
    }

    const data = {
      paso,
      cliente: clienteSeleccionado,
      prenda: datosPrenda,
      tasacion: datosTasacion,
      credito: datosCredito,
      parametrosCategoria,
      fechaAutoSave: new Date().toISOString()
    }

    try {
      localStorage.setItem(autoSaveKey, JSON.stringify(data))
    } catch (error) {
      console.error('Error al guardar borrador automático:', error)
    }
  }, [paso, clienteSeleccionado, datosPrenda, datosTasacion, datosCredito, parametrosCategoria, autoSaveKey])

  // ── Guardar borrador ────────────────────────────────────────────────────
  const handleGuardarBorrador = () => {
    const titulo = clienteSeleccionado
      ? `${clienteSeleccionado.nombres} ${clienteSeleccionado.apellidos} · Paso ${paso} · ${format(new Date(), 'dd MMM HH:mm', { locale: es })}`
      : `Nuevo crédito · ${format(new Date(), 'dd MMM HH:mm', { locale: es })}`

    const id = guardarBorrador({
      id: draftId,
      titulo,
      paso,
      cliente: clienteSeleccionado,
      prenda: datosPrenda,
      tasacion: datosTasacion,
      credito: datosCredito as any,
      parametrosCategoria: parametrosCategoria as any,
    })
    setDraftId(id)
    toast.success('Borrador guardado', {
      description: `"${titulo}"`,
    })
  }

  // ── Cargar borrador ─────────────────────────────────────────────────────
  const handleCargarBorrador = (draft: import('@/hooks/useCreditoDrafts').CreditoDraft) => {
    setDraftId(draft.id)
    setPaso(draft.paso)
    setClienteSeleccionado(draft.cliente)
    setDatosPrenda(draft.prenda)
    setDatosTasacion(draft.tasacion)
    setDatosCredito(draft.credito as WizardCreditoDTO)
    setParametrosCategoria(draft.parametrosCategoria)
    toast.info(`Borrador cargado: "${draft.titulo}"`)
  }

  const pasos = [
    { numero: 1, titulo: 'Cliente', descripcion: 'Seleccionar o crear cliente' },
    { numero: 2, titulo: 'Prenda', descripcion: 'Registrar artículo a empeñar' },
    { numero: 3, titulo: 'Tasación', descripcion: 'Evaluar valor de la prenda' },
    { numero: 4, titulo: 'Crédito', descripcion: 'Configurar términos del préstamo' },
    { numero: 5, titulo: 'Confirmación', descripcion: 'Revisar y desembolsar' }
  ]

  const handleConfirmarCredito = async (codigosReservados?: CodigosReservados) => {
    setMensajeErrorConfirmacion(null)
    if (!clienteSeleccionado || !datosPrenda || !datosTasacion || !datosCredito) {
      toast.error('Faltan datos requeridos')
      return
    }

    // Validaciones adicionales
    if (!datosPrenda.categoria_producto_id) {
      toast.error('Selecciona una categoría para la prenda')
      return
    }
    if (!datosPrenda.descripcion_general?.trim()) {
      toast.error('Ingresa una descripción para la prenda')
      return
    }
    if (!datosCredito.monto_aprobado || datosCredito.monto_aprobado <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    try {
      setLoading(true)

      const creditoDTO: any = {
        cliente_id: clienteSeleccionado.id,
        sucursal_id: '1', // TODO: Obtener de contexto

        // Plan de interés seleccionado (si se usó producto crediticio)
        plan_interes_id: (datosCredito as any).plan_interes_id || null,

        // Códigos pre-reservados del wizard (si existen)
        numero_credito: codigosReservados?.codigo_credito || null,
        codigo_prenda: codigosReservados?.codigo_prenda || null,
        session_token: codigosReservados?.session_token || null,

        // Montos
        monto_solicitado: datosCredito.monto_aprobado!,
        monto_aprobado: datosCredito.monto_aprobado!,
        valor_tasacion:
          datosTasacion?.valor_final_asignado ||
          datosTasacion?.valor_comercial ||
          datosTasacion?.valor_mercado ||
          null,

        // Tasas y plazos
        tasa_interes: Number(datosCredito.tasa_interes || 15),
        tasa_mora: datosCredito.tasa_mora ?? (datosCredito.tipo_mora === 'monto_fijo' ? 0 : 5),
        tipo_mora: (datosCredito as any).tipo_mora ?? 'porcentaje',
        mora_monto_fijo: (datosCredito as any).mora_monto_fijo ?? null,
        tipo_interes: datosCredito.tipo_interes || 'mensual',

        // Siempre 'flat' para créditos prendarios
        metodo_calculo: 'flat',
        afecta_interes_mensual: datosCredito.afecta_interes_mensual ?? false,
        permite_pago_capital_diferente: datosCredito.permite_pago_capital_diferente ?? false,

        // Calcular plazo_dias a partir de fecha_desembolso, fecha_primer_pago y número de cuotas
        plazo_dias: (() => {
          const fechaDesembolso = datosCredito.fecha_desembolso
            ? new Date(datosCredito.fecha_desembolso)
            : new Date()

          const fechaPrimerPago = datosCredito.fecha_primer_pago
            ? new Date(datosCredito.fecha_primer_pago)
            : new Date()

          const diasEntreDesembolsoYPrimerPago = Math.ceil(
            (fechaPrimerPago.getTime() - fechaDesembolso.getTime()) / (1000 * 60 * 60 * 24)
          )

          const numeroCuotas = datosCredito.numero_cuotas || 1
          const tipoInteres = datosCredito.tipo_interes || 'mensual'

          // Calcular días por período según tipo de interés
          let diasPorPeriodo = 30
          switch (tipoInteres) {
            case 'semanal':
              diasPorPeriodo = 7
              break
            case 'quincenal':
              diasPorPeriodo = 15
              break
            case 'mensual':
            default:
              diasPorPeriodo = 30
              break
          }

          // Plazo total = días hasta primer pago + (número de cuotas - 1) * días por período
          return diasEntreDesembolsoYPrimerPago + (numeroCuotas - 1) * diasPorPeriodo
        })(),

        dias_gracia: datosCredito.dias_gracia ?? 0,
        numero_cuotas: datosCredito.numero_cuotas || null,
        monto_cuota: datosCredito.monto_cuota ?? null,

        // Fechas
        fecha_desembolso: datosCredito.fecha_desembolso || null,
        fecha_primer_pago: datosCredito.fecha_primer_pago || null,

        // Gastos adicionales (si hay)
        gas_ids: Array.isArray((datosCredito as any).gas_ids)
          ? (datosCredito as any).gas_ids.map((id: any) => Number(id)).filter((id: number) => id > 0)
          : [],

        // Observaciones que combinan tasación y crédito
        observaciones: [datosTasacion?.observaciones, datosCredito.observaciones]
          .filter(Boolean)
          .join(' | ') || null,

        // Datos de tasación
        tasacion: datosTasacion
          ? {
              valor_mercado: datosTasacion.valor_mercado,
              valor_comercial: datosTasacion.valor_comercial || datosTasacion.valor_final_asignado,
              valor_liquidacion: datosTasacion.valor_liquidacion,
              porcentaje_prestamo: datosTasacion.porcentaje_prestamo,
              metodo_valuacion: datosTasacion.metodo_valuacion,
              observaciones: datosTasacion.observaciones,
              antiguedad: datosTasacion.antiguedad,
              demanda_local: datosTasacion.demanda_local,
              riesgo_almacenamiento: datosTasacion.riesgo_almacenamiento,
              dificultad_reventa: datosTasacion.dificultad_reventa,
              ajuste_manual: datosTasacion.ajuste_manual,
              porcentaje_base: datosTasacion.porcentaje_base,
              factores_aplicados: datosTasacion.factores_aplicados
            }
          : null,

        // Prendas
        prendas: [
          {
            categoria_producto_id: datosPrenda.categoria_producto_id!,
            descripcion_general: datosPrenda.descripcion_general!.trim(),
            marca: datosPrenda.marca || null,
            modelo: datosPrenda.modelo || null,
            numero_serie: datosPrenda.numero_serie || null,
            condicion_fisica: datosPrenda.condicion_fisica || 'bueno',
            fotos: Array.isArray(datosPrenda.fotos) ? datosPrenda.fotos : [],

            // Valores de tasación para la prenda
            valor_estimado_cliente: datosTasacion?.valor_mercado || null,
            valor_tasacion: datosTasacion?.valor_comercial || datosTasacion?.valor_final_asignado || null,
            valor_prestamo: datosCredito.monto_aprobado || null,
            porcentaje_prestamo: datosTasacion?.porcentaje_prestamo || null
          }
        ]
      }

      const response = await creditoPrendarioService.create(creditoDTO)

      // Soporta ambos formatos:
      // - service retorna CreditoPrendario directamente
      // - o retorna AxiosResponse<{...}>
      const credito: any = (response as any)?.data ? (response as any).data : response

      const creditoId = credito?.id
      const numeroCredito = credito?.numero_credito ?? 'N/A'

      toast.success('Crédito prendario creado exitosamente', {
        description: `Número de crédito: ${numeroCredito}`,
        action: {
          label: 'Descargar Recibo',
          onClick: async () => {
            try {
              if (!creditoId) {
                toast.error('No se pudo determinar el ID del crédito para descargar el recibo')
                return
              }
              await creditoPrendarioService.descargarRecibo(creditoId)
              toast.success('Recibo descargado exitosamente')
            } catch (error: any) {
              toast.error('Error al descargar el recibo: ' + (error.message || 'Error desconocido'))
            }
          }
        },
        duration: 10000
      })

      // Eliminar auto-guardado ya que el crédito se creó con éxito
      localStorage.removeItem(autoSaveKey)

      onCreditoCreado()
    } catch (error: any) {
      console.error('Error completo al crear crédito:', error)
      console.error('Detalles del error:', JSON.stringify({
        message: error.message,
        status: error.status,
        errors: error.response?.data?.errors,
        data: error.response?.data,
      }, null, 2))

      let errorMessage = 'Error al crear el crédito prendario'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      const requiereCaja = esErrorRequiereAperturaCaja(errorMessage)
      const textoAccionCaja =
        'Para completar esta operación debes aperturar tu caja: entra al módulo Caja y usa «Aperturar caja». Después vuelve aquí y pulsa de nuevo «Confirmar y Crear Empeño».'

      if (requiereCaja) {
        setMensajeErrorConfirmacion(`${errorMessage}\n\n${textoAccionCaja}`)
        toast.error('Debes aperturar tu caja', {
          description: `${errorMessage}\n\n${textoAccionCaja}`,
          duration: 16000,
        })
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        const errorList = Object.entries(errors)
          .map(([key, value]) => `• ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n')
        toast.error(errorMessage, { description: errorList, duration: 12000 })
      } else {
        toast.error(errorMessage, { duration: 12000 })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onCancelar}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Nuevo Crédito Prendario</h1>
                <p className="text-sm text-muted-foreground">
                  Paso {paso} de 5: {pasos[paso - 1].descripcion}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGuardarBorrador}
              className="flex items-center gap-1.5 text-muted-foreground"
              title="Guardar borrador para continuar después"
            >
              <FloppyDisk className="h-4 w-4" />
              <span className="hidden sm:inline">Guardar borrador</span>
            </Button>
          </div>

          {/* Indicador de pasos */}
          <div className="flex items-center gap-2">
            {pasos.map((p, index) => (
              <div key={p.numero} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      p.numero < paso
                        ? 'bg-emerald-600 text-white'
                        : p.numero === paso
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.numero < paso ? <Check className="h-5 w-5" weight="bold" /> : p.numero}
                  </div>
                  <span
                    className={`text-xs mt-1 text-center hidden sm:block ${
                      p.numero === paso ? 'font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {p.titulo}
                  </span>
                </div>
                {index < pasos.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${p.numero < paso ? 'bg-emerald-600' : 'bg-muted'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          
          {autoSaveData && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
              <div className="flex items-start gap-3">
                <Info size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" weight="duotone" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Empeño en progreso detectado
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Tienes un borrador guardado automáticamente el{' '}
                    <strong>
                      {format(new Date(autoSaveData.fechaAutoSave), 'dd/MM/yyyy HH:mm')}
                    </strong>{' '}
                    para el cliente{' '}
                    <strong>
                      {autoSaveData.cliente
                        ? `${autoSaveData.cliente.nombres} ${autoSaveData.cliente.apellidos}`
                        : 'No seleccionado'}
                    </strong>
                    . ¿Deseas continuar donde lo dejaste?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50 text-xs font-medium"
                  onClick={() => {
                    localStorage.removeItem(autoSaveKey)
                    setAutoSaveData(null)
                    toast.info('Borrador automático descartado')
                  }}
                >
                  Descartar
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-sm"
                  onClick={() => {
                    setPaso(autoSaveData.paso)
                    setClienteSeleccionado(autoSaveData.cliente)
                    setDatosPrenda(autoSaveData.prenda)
                    setDatosTasacion(autoSaveData.tasacion)
                    setDatosCredito(autoSaveData.credito)
                    setParametrosCategoria(autoSaveData.parametrosCategoria)
                    setAutoSaveData(null)
                    toast.success('Borrador automático recuperado')
                  }}
                >
                  Recuperar Progreso
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              {paso === 1 && (
                <PasoSeleccionarCliente
                  clienteSeleccionado={clienteSeleccionado}
                  onClienteSeleccionado={setClienteSeleccionado}
                  onDeseleccionarCliente={() => setClienteSeleccionado(null)}
                  onSiguiente={() => setPaso(2)}
                  borradores={borradores}
                  onCargarBorrador={handleCargarBorrador as any}
                  onEliminarBorrador={eliminarBorrador}
                />
              )}

              {paso === 2 && (
                <PasoRegistrarPrenda
                  prenda={datosPrenda}
                  onPrendaChange={setDatosPrenda}
                  onSiguiente={() => setPaso(3)}
                  onAnterior={() => setPaso(1)}
                  onParametrosCategoria={(params) => {
                    setParametrosCategoria(params)

                    // Aplicar parámetros al crédito si no tiene valores
                    if (!datosCredito || !datosCredito.tasa_interes) {
                      setDatosCredito({
                        ...(datosCredito ?? {}),
                        tasa_interes: params.tasa_interes,
                        tasa_mora: params.tasa_mora,
                        metodo_calculo: params.metodo_calculo,
                        afecta_interes_mensual: params.afecta_interes_mensual,
                        permite_pago_capital_diferente: params.permite_pago_capital_diferente
                      })
                    }
                  }}
                />
              )}

              {paso === 3 && (
                <PasoTasacion
                  tasacion={datosTasacion}
                  prenda={datosPrenda}
                  onTasacionChange={setDatosTasacion}
                  onSiguiente={() => setPaso(4)}
                  onAnterior={() => setPaso(2)}
                />
              )}

              {paso === 4 && (
                <PasoConfigurarCredito
                  credito={datosCredito}
                  valorTasacion={datosTasacion?.valor_mercado || 0}
                  categoriaProductoId={datosPrenda?.categoria_producto_id}
                  onCreditoChange={handleCreditoChange}
                  onSiguiente={() => setPaso(5)}
                  onAnterior={() => setPaso(3)}
                  parametrosCategoria={parametrosCategoria}
                  canEditTasaInteres={canEditTasaInteres}
                  canEditMora={canEditMora}
                />
              )}

              {paso === 5 && clienteSeleccionado && datosPrenda && datosTasacion && datosCredito && (
                <PasoConfirmacion
                  cliente={clienteSeleccionado}
                  prenda={datosPrenda}
                  tasacion={datosTasacion}
                  credito={datosCredito}
                  onConfirmar={handleConfirmarCredito}
                  onAnterior={() => {
                    setMensajeErrorConfirmacion(null)
                    setPaso(4)
                  }}
                  loading={loading}
                  mensajeErrorServidor={mensajeErrorConfirmacion}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
