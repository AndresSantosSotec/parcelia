/**
 * RefrendoModal - Modal para procesar refrendos de créditos prendarios
 * 
 * Flujo:
 * 1. Validar que el crédito pueda ser refrendado
 * 2. Seleccionar tipo de refrendo y calcular montos
 * 3. Confirmar y procesar refrendo
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, DollarSign, Calendar, TrendingUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { refrendoService } from '@/services/refrendo.service'
import {
  RefrendoState,
  TipoRefrendo,
  ValidacionRefrendoResponse,
  CalculoRefrendoResponse
} from '@/types/refrendo.types'
import { toast } from 'sonner'

const TIPOS_INTERES_REFRENDO = ['semanal', 'quincenal', 'mensual'] as const

function normalizarTipoInteresRefrendo(
  v: string | undefined | null
): (typeof TIPOS_INTERES_REFRENDO)[number] {
  if (v && (TIPOS_INTERES_REFRENDO as readonly string[]).includes(v)) {
    return v as (typeof TIPOS_INTERES_REFRENDO)[number]
  }
  return 'mensual'
}

interface RefrendoModalProps {
  creditoId: number
  numeroCredito: string
  clienteNombre: string
  capitalPendiente: number
  fechaVencimiento: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RefrendoModal({
  creditoId,
  numeroCredito,
  clienteNombre,
  capitalPendiente,
  fechaVencimiento,
  isOpen,
  onClose,
  onSuccess
}: RefrendoModalProps) {
  const [state, setState] = useState<RefrendoState>({
    paso: 1,
    validacion: null,
    calculo: null,
    formData: {
      tipoRefrendo: 'parcial',
      montoPagado: '',
      abonoCapital: '0',
      metodoPago: 'efectivo',
      observaciones: '',
      montoPrestamoNuevo: '',
      plazoDiasNuevo: '',
      tasaInteresNuevo: '',
      tipoInteresNuevo: 'mensual'
    },
    loading: false,
    error: null,
    reEmpenoUsarConfigAnterior: null
  })

  // Validar al abrir el modal
  useEffect(() => {
    if (isOpen) {
      validarRefrendo()
    }
  }, [isOpen, creditoId])

  /**
   * Paso 1: Validar que el crédito pueda ser refrendado
   */
  const validarRefrendo = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const validacion = await refrendoService.validarRefrendo(creditoId)
      
      if (validacion.valido) {
        setState(prev => ({
          ...prev,
          validacion,
          paso: 2,
          loading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          validacion,
          loading: false,
          error: validacion.mensaje
        }))
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al validar refrendo'
      }))
      toast.error(error.message || 'Error al validar refrendo')
    }
  }

  const esReEmpeno = state.validacion?.es_re_empeno === true

  /**
   * Paso 2: Calcular montos necesarios (o datos de re-empeño)
   */
  const calcularMontos = async () => {
    if (esReEmpeno) {
      const monto = parseFloat(state.formData.montoPrestamoNuevo || '') || 0
      const plazo = parseInt(state.formData.plazoDiasNuevo || '', 10) || 0
      if (monto <= 0 || plazo <= 0) {
        toast.error('Indique monto del nuevo préstamo y plazo en días')
        return
      }
      if (state.reEmpenoUsarConfigAnterior === false || (state.reEmpenoUsarConfigAnterior === null && !state.validacion?.config_anterior)) {
        const tasa = parseFloat(state.formData.tasaInteresNuevo || '')
        if (isNaN(tasa) || tasa < 0) {
          toast.error('Indique la tasa de interés por período (%)')
          return
        }
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const abonoCapital = parseFloat(state.formData.abonoCapital) || 0
      const tipoRefrendo = esReEmpeno ? 're_empeno' : state.formData.tipoRefrendo
      const opts = esReEmpeno
        ? {
            monto_prestamo_nuevo: parseFloat(state.formData.montoPrestamoNuevo || '') || 0,
            plazo_dias_nuevo: parseInt(state.formData.plazoDiasNuevo || '', 10) || 0,
            ...((state.reEmpenoUsarConfigAnterior === false || (state.reEmpenoUsarConfigAnterior === null && !state.validacion?.config_anterior)) && {
              tasa_interes_nuevo: parseFloat(state.formData.tasaInteresNuevo || '') || undefined,
              tipo_interes_nuevo: normalizarTipoInteresRefrendo(state.formData.tipoInteresNuevo)
            })
          }
        : undefined

      const calculo = await refrendoService.calcularRefrendo(
        creditoId,
        tipoRefrendo,
        abonoCapital,
        opts
      )

      setState(prev => ({
        ...prev,
        calculo,
        formData: {
          ...prev.formData,
          montoPagado: calculo.es_re_empeno ? '0' : calculo.monto_minimo.toString()
        },
        loading: false
      }))

      toast.success(calculo.es_re_empeno ? 'Datos de re-empeño listos' : 'Cálculo realizado correctamente')
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al calcular refrendo'
      }))
      toast.error(error.message || 'Error al calcular refrendo')
    }
  }

  /**
   * Paso 3: Procesar refrendo o re-empeño
   */
  const procesarRefrendo = async () => {
    if (!state.calculo) {
      toast.error('Debe calcular el refrendo primero')
      return
    }

    const montoPagado = parseFloat(state.formData.montoPagado) || 0
    if (!state.calculo.es_re_empeno && (isNaN(montoPagado) || montoPagado < state.calculo.monto_minimo)) {
      toast.error(`El monto mínimo es ${refrendoService.formatCurrency(state.calculo.monto_minimo)}`)
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    const payload: any = {
      tipo_refrendo: state.calculo.es_re_empeno ? 're_empeno' : state.formData.tipoRefrendo,
      monto_pagado: montoPagado,
      abono_capital: parseFloat(state.formData.abonoCapital) || 0,
      metodo_pago: state.formData.metodoPago,
      observaciones: state.formData.observaciones || undefined
    }
    if (state.calculo.es_re_empeno && state.calculo.monto_prestamo_nuevo != null && state.calculo.plazo_dias_nuevo != null) {
      payload.monto_prestamo_nuevo = state.calculo.monto_prestamo_nuevo
      payload.plazo_dias_nuevo = state.calculo.plazo_dias_nuevo
      if (state.calculo.tasa_interes != null) payload.tasa_interes_nuevo = state.calculo.tasa_interes
      if (state.calculo.tipo_interes_nuevo) payload.tipo_interes_nuevo = state.calculo.tipo_interes_nuevo
    }

    try {
      await refrendoService.procesarRefrendo(creditoId, payload)

      toast.success('¡Refrendo procesado exitosamente!')
      onSuccess()
      handleClose()
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al procesar refrendo'
      }))
      toast.error(error.message || 'Error al procesar refrendo')
    }
  }

  /**
   * Handlers de formulario
   */
  const handleTipoRefrendoChange = (tipo: TipoRefrendo) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        tipoRefrendo: tipo,
        abonoCapital: tipo === 'parcial' ? '0' : prev.formData.abonoCapital
      },
      calculo: null // Resetear cálculo al cambiar tipo
    }))
  }

  const handleClose = () => {
    setState({
      paso: 1,
      validacion: null,
      calculo: null,
      formData: {
        tipoRefrendo: 'parcial',
        montoPagado: '',
        abonoCapital: '0',
        metodoPago: 'efectivo',
        observaciones: '',
        montoPrestamoNuevo: '',
        plazoDiasNuevo: '',
        tasaInteresNuevo: '',
        tipoInteresNuevo: 'mensual'
      },
      loading: false,
      error: null,
      reEmpenoUsarConfigAnterior: null
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div>
            <h2 className="text-2xl font-bold">Procesar Refrendo</h2>
            <p className="text-blue-100 text-sm mt-1">
              Crédito: {numeroCredito} | Cliente: {clienteNombre}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition"
            disabled={state.loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
          <div className={`flex items-center ${state.paso >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              state.paso >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>
              {state.validacion?.valido ? '✓' : '1'}
            </div>
            <span className="ml-2 font-medium">Validar</span>
          </div>
          
          <div className="flex-1 h-1 mx-4 bg-gray-300">
            <div className={`h-full transition-all ${state.paso >= 2 ? 'bg-blue-600 w-full' : 'w-0'}`} />
          </div>

          <div className={`flex items-center ${state.paso >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              state.paso >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>
              {state.calculo ? '✓' : '2'}
            </div>
            <span className="ml-2 font-medium">Calcular</span>
          </div>

          <div className="flex-1 h-1 mx-4 bg-gray-300">
            <div className={`h-full transition-all ${state.paso >= 3 ? 'bg-blue-600 w-full' : 'w-0'}`} />
          </div>

          <div className={`flex items-center ${state.paso >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              state.paso >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Confirmar</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Error Alert */}
          {state.error && !state.validacion?.valido && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-red-900">No se puede refrendar</h4>
                <p className="text-red-700 text-sm mt-1">{state.error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {state.loading && state.paso === 1 && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600">Validando crédito...</p>
            </div>
          )}

          {/* Paso 1: Validación completada */}
          {state.validacion?.valido && state.paso >= 2 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-green-900">
                  {esReEmpeno ? 'Crédito pagado puede ser re-empeñado' : 'Crédito válido para refrendo'}
                </h4>
                <p className="text-green-700 text-sm mt-1">
                  {esReEmpeno
                    ? 'Se reactivará el crédito con nuevo monto y plazo (mismas prendas).'
                    : <>Refrendos disponibles: <span className="font-bold">
                        {state.validacion.refrendos_disponibles === 'ilimitado'
                          ? 'Ilimitado'
                          : state.validacion.refrendos_disponibles}
                      </span></>
                  }
                </p>
              </div>
            </div>
          )}

          {/* Paso 2: Configurar tipo de refrendo o re-empeño */}
          {state.paso >= 2 && (
            <div className="space-y-6">
              {/* Información del Crédito */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">{esReEmpeno ? 'Estado' : 'Capital Pendiente'}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {esReEmpeno ? 'Pagado (re-empeño)' : refrendoService.formatCurrency(capitalPendiente)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vencimiento Actual</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString('es-GT') : '—'}
                  </p>
                </div>
                {state.calculo && (
                  <div>
                    <p className="text-sm text-gray-600">Nuevo Vencimiento</p>
                    <p className="text-lg font-semibold text-green-700">
                      {new Date(state.calculo.nueva_fecha_vencimiento).toLocaleDateString('es-GT')}
                    </p>
                  </div>
                )}
              </div>

              {/* Re-empeño: elegir config anterior o nueva */}
              {esReEmpeno && !state.calculo && state.reEmpenoUsarConfigAnterior === null && state.validacion?.config_anterior && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Elija cómo reactivar el crédito:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const c = state.validacion!.config_anterior!
                        setState(prev => ({
                          ...prev,
                          reEmpenoUsarConfigAnterior: true,
                          formData: {
                            ...prev.formData,
                            montoPrestamoNuevo: String(c.monto_aprobado),
                            plazoDiasNuevo: String(c.plazo_dias)
                          }
                        }))
                      }}
                      className="p-4 border-2 border-emerald-300 rounded-lg text-left hover:border-emerald-500 hover:bg-emerald-50 transition"
                    >
                      <CheckCircle className="h-6 w-6 text-emerald-600 mb-2" />
                      <p className="font-semibold text-gray-900">Usar configuración anterior</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Q {state.validacion!.config_anterior!.monto_aprobado.toLocaleString('es-GT')} · {state.validacion!.config_anterior!.plazo_dias} días · {state.validacion!.config_anterior!.tasa_interes}% ({state.validacion!.config_anterior!.tipo_interes})
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const c = state.validacion?.config_anterior
                        setState(prev => ({
                          ...prev,
                          reEmpenoUsarConfigAnterior: false,
                          formData: {
                            ...prev.formData,
                            montoPrestamoNuevo: c ? String(c.monto_aprobado) : '',
                            plazoDiasNuevo: c ? String(c.plazo_dias) : '',
                            tasaInteresNuevo: c ? String(c.tasa_interes) : '',
                            tipoInteresNuevo: normalizarTipoInteresRefrendo(c?.tipo_interes)
                          }
                        }))
                      }}
                      className="p-4 border-2 border-blue-300 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <Calendar className="h-6 w-6 text-blue-600 mb-2" />
                      <p className="font-semibold text-gray-900">Configurar nuevo</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Definir monto, plazo, tasa de interés y tipo de período (como en Configurar Crédito).
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Re-empeño: monto y plazo (config anterior o ya elegido) */}
              {esReEmpeno && !state.calculo && state.reEmpenoUsarConfigAnterior === true && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Monto del nuevo préstamo (Q)</Label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={state.formData.montoPrestamoNuevo ?? ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        formData: { ...prev.formData, montoPrestamoNuevo: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mt-1"
                      placeholder="Ej. 1000.00"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Plazo (días)</Label>
                    <input
                      type="number"
                      min="1"
                      value={state.formData.plazoDiasNuevo ?? ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        formData: { ...prev.formData, plazoDiasNuevo: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mt-1"
                      placeholder="Ej. 30"
                    />
                  </div>
                </div>
              )}

              {/* Re-empeño: configurar nuevo (monto, plazo, tasa, tipo) */}
              {esReEmpeno && !state.calculo && (state.reEmpenoUsarConfigAnterior === false || (state.reEmpenoUsarConfigAnterior === null && !state.validacion?.config_anterior)) && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Define los términos del préstamo (igual que Configurar Crédito)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Monto del nuevo préstamo (Q) *</Label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={state.formData.montoPrestamoNuevo ?? ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, montoPrestamoNuevo: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mt-1"
                        placeholder="Ej. 1000.00"
                      />
                    </div>
                    <div>
                      <Label>Plazo (días) *</Label>
                      <input
                        type="number"
                        min="1"
                        value={state.formData.plazoDiasNuevo ?? ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, plazoDiasNuevo: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mt-1"
                        placeholder="Ej. 30"
                      />
                    </div>
                    <div>
                      <Label>Tasa de interés por período (%) *</Label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={state.formData.tasaInteresNuevo ?? ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, tasaInteresNuevo: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mt-1"
                        placeholder="Ej. 10 (tasa por período seleccionado)"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Puede superar 100% según necesidad del cliente.</p>
                    </div>
                    <div>
                      <Label>Tipo de período *</Label>
                      <Select
                        value={normalizarTipoInteresRefrendo(state.formData.tipoInteresNuevo)}
                        onValueChange={(v) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, tipoInteresNuevo: v }
                        }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quincenal">Quincenal (15 días)</SelectItem>
                          <SelectItem value="mensual">Mensual (30 días)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tipo de Refrendo (solo cuando no es re-empeño) */}
              {!esReEmpeno && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Refrendo
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['parcial', 'total', 'con_capital'] as TipoRefrendo[]).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => handleTipoRefrendoChange(tipo)}
                        disabled={state.loading}
                        className={`p-4 border-2 rounded-lg text-left transition ${
                          state.formData.tipoRefrendo === tipo
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">
                          {tipo === 'parcial' && 'Parcial'}
                          {tipo === 'total' && 'Total'}
                          {tipo === 'con_capital' && 'Con Capital'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {tipo === 'parcial' && 'Solo intereses'}
                          {tipo === 'total' && 'Intereses + capital'}
                          {tipo === 'con_capital' && '% mínimo capital'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Abono a Capital (solo refrendo normal) */}
              {!esReEmpeno && (state.formData.tipoRefrendo === 'total' || state.formData.tipoRefrendo === 'con_capital') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Abono a Capital {state.calculo?.requiere_capital && (
                      <span className="text-red-600">
                        (Mínimo: {refrendoService.formatCurrency(state.calculo.capital_minimo_requerido)})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={state.formData.abonoCapital}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      formData: { ...prev.formData, abonoCapital: e.target.value },
                      calculo: null
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Botón Calcular */}
              {!state.calculo && (
                <button
                  onClick={calcularMontos}
                  disabled={state.loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {state.loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Calculando...
                    </>
                    ) : (
                    <>
                      <DollarSign size={20} />
                      {esReEmpeno ? 'Calcular re-empeño' : 'Calcular Monto a Pagar'}
                    </>
                  )}
                </button>
              )}

              {/* Resultados del Cálculo */}
              {state.calculo && (
                <div className={`border-2 rounded-lg p-6 ${state.calculo.es_re_empeno ? 'border-violet-200 bg-violet-50' : 'border-blue-200 bg-blue-50'}`}>
                  <h3 className={`font-bold text-lg mb-4 ${state.calculo.es_re_empeno ? 'text-violet-900' : 'text-blue-900'}`}>
                    {state.calculo.es_re_empeno ? 'Resumen del Re-empeño' : 'Resumen del Refrendo'}
                  </h3>
                  
                  {state.calculo.es_re_empeno ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Nuevo monto del préstamo:</span>
                        <span className="font-semibold">{refrendoService.formatCurrency(state.calculo.monto_prestamo_nuevo ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plazo:</span>
                        <span className="font-semibold">{state.calculo.plazo_dias_nuevo ?? state.calculo.plazo_dias} días</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Nueva fecha de vencimiento:</span>
                        <span className="font-semibold">{new Date(state.calculo.nueva_fecha_vencimiento).toLocaleDateString('es-GT')}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Opcional: puede registrar un cargo por reactivación (ej. comisión).</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Intereses adeudados:</span>
                        <span className="font-semibold">{refrendoService.formatCurrency(state.calculo.interes_adeudado)}</span>
                      </div>
                      {state.calculo.mora_adeudada > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Mora adeudada:</span>
                          <span className="font-semibold">{refrendoService.formatCurrency(state.calculo.mora_adeudada)}</span>
                        </div>
                      )}
                      {state.calculo.otros_adeudados && state.calculo.otros_adeudados > 0 ? (
                        <div className="flex justify-between text-purple-600">
                          <span>Otros cargos adeudados:</span>
                          <span className="font-semibold">{refrendoService.formatCurrency(state.calculo.otros_adeudados)}</span>
                        </div>
                      ) : null}
                      {state.calculo.abono_capital > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Abono a capital:</span>
                          <span className="font-semibold">{refrendoService.formatCurrency(state.calculo.abono_capital)}</span>
                        </div>
                      )}
                      {state.calculo.descuento_aplicado > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Descuento (Promoción):</span>
                          <span className="font-semibold">-{refrendoService.formatCurrency(state.calculo.descuento_aplicado)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-blue-300 pt-3 mt-3">
                        <div className="flex justify-between text-lg">
                          <span className="font-bold text-gray-900">Total a Pagar:</span>
                          <span className="font-bold text-blue-700 text-xl">
                            {refrendoService.formatCurrency(state.calculo.monto_minimo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formulario de Pago */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {state.calculo.es_re_empeno ? 'Cargo por reactivación (opcional, Q)' : 'Monto a Pagar'}
                      </label>
                      <input
                        type="number"
                        min={state.calculo.es_re_empeno ? 0 : state.calculo.monto_minimo}
                        step="0.01"
                        value={state.formData.montoPagado}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, montoPagado: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        placeholder={state.calculo.es_re_empeno ? '0' : state.calculo.monto_minimo.toString()}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Método de Pago
                      </label>
                      <select
                        value={state.formData.metodoPago}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, metodoPago: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observaciones (Opcional)
                      </label>
                      <textarea
                        value={state.formData.observaciones}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          formData: { ...prev.formData, observaciones: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Notas adicionales..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={state.loading}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          
          {state.calculo && (
            <button
              onClick={procesarRefrendo}
              disabled={state.loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {state.loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Procesar Refrendo
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
