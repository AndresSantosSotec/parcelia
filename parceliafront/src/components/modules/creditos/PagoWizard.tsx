import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner, Money, Calculator, Receipt, Warning, CheckCircle, CalendarPlus, Info } from '@phosphor-icons/react'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { toast } from 'sonner'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'
import type { TipoPago, CalculoPagoResponse, EjecutarPagoDTO, OpcionAdelanto, OpcionCuotaAdelanto } from '@/types/creditoPrendario.types'

interface PagoWizardProps {
    creditoId: string
    open: boolean
    initialTab?: 'cuota' | 'renovacion' | 'adelanto' | 'abono' | 'liquidacion'
    initialMonto?: string
    onClose: () => void
    onSuccess: () => void
}

export function PagoWizard({ creditoId, open, initialTab, initialMonto, onClose, onSuccess }: PagoWizardProps) {
    const [step, setStep] = useState<'calculo' | 'confirmacion' | 'exito'>('calculo')

    // Mapear tab inicial a tipo de pago
    const getInitialTipoPago = (): TipoPago => {
        if (initialTab === 'cuota') return 'CUOTA'
        if (initialTab === 'renovacion') return 'RENOVACION'
        if (initialTab === 'adelanto') return 'ADELANTO'
        if (initialTab === 'abono') return 'PARCIAL'
        if (initialTab === 'liquidacion') return 'LIQUIDACION'
        return 'CUOTA'
    }

    const [tipoPago, setTipoPago] = useState<TipoPago>(getInitialTipoPago())
    const [loading, setLoading] = useState(false)
    const [calculoData, setCalculoData] = useState<CalculoPagoResponse | null>(null)
    const [montoPagar, setMontoPagar] = useState<string>('')
    const [observaciones, setObservaciones] = useState('')
    const [periodosRenovacion, setPeriodosRenovacion] = useState<number>(1)
    const [cuotasAdelantar, setCuotasAdelantar] = useState<number>(1)
    // Almacenar el movimiento generado para poder reimprimir recibo
    const [movimientoGenerado, setMovimientoGenerado] = useState<{ id: string; numero_movimiento: string } | null>(null)
    const [descargandoRecibo, setDescargandoRecibo] = useState(false)

    const getMontoSugeridoRenovacion = (data: CalculoPagoResponse, periodos: number): string => {
        const opcion = data.opciones_adelanto?.find((o: OpcionAdelanto) => o.periodos === periodos)
        if (opcion) {
            return opcion.monto_total.toFixed(2)
        }

        const minimoBase = Number(data.minimo_renovacion ?? 0)
        const interesExtra = Math.max(0, periodos - 1) * Number(data.interes_por_periodo ?? 0)
        return (minimoBase + interesExtra).toFixed(2)
    }

    useEffect(() => {
        if (open && creditoId) {
            cargarCalculo()
            // Resetear al abrir, respetando el initialTab si existe
            if (initialTab) {
                setTipoPago(getInitialTipoPago())
            }
        } else {
            resetState()
        }
    }, [open, creditoId, initialTab])

    const resetState = () => {
        setStep('calculo')
        // No reseteamos tipoPago aquí para que el useEffect lo maneje al abrir
        setCalculoData(null)
        setMontoPagar('')
        setObservaciones('')
        setPeriodosRenovacion(1)
        setCuotasAdelantar(1)
    }

    const cargarCalculo = async () => {
        setLoading(true)
        try {
            const data = await creditoPrendarioService.calcularPago(creditoId)
            setCalculoData(data)
            // Pre-seleccionar monto según el tipo inicial
            if (initialMonto) {
                setMontoPagar(initialMonto)
            } else if (tipoPago === 'CUOTA') {
                setMontoPagar(data.monto_cuota_actual?.toString() ?? '0')
            } else if (tipoPago === 'RENOVACION') {
                setMontoPagar(getMontoSugeridoRenovacion(data, periodosRenovacion))
            } else if (tipoPago === 'LIQUIDACION') {
                setMontoPagar(data.total_para_liquidar.toString())
            } else if (tipoPago === 'ADELANTO' && data.opciones_cuotas_adelanto?.[0]) {
                setMontoPagar(data.opciones_cuotas_adelanto[0].monto_total.toString())
            }
        } catch (error: any) {
            toast.error('Error al cargar datos de pago')
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const handleTipoChange = (value: string) => {
        const nuevoTipo = value as TipoPago
        setTipoPago(nuevoTipo)
        setPeriodosRenovacion(1) // Reset periodos
        setCuotasAdelantar(1) // Reset cuotas

        // Actualizar monto sugerido
        if (calculoData) {
            switch (nuevoTipo) {
                case 'CUOTA':
                    setMontoPagar(calculoData.monto_cuota_actual?.toString() ?? '0')
                    break
                case 'RENOVACION':
                    setMontoPagar(getMontoSugeridoRenovacion(calculoData, periodosRenovacion))
                    break
                case 'ADELANTO':
                    const primeraOpcion = calculoData.opciones_cuotas_adelanto?.[0]
                    setMontoPagar(primeraOpcion?.monto_total?.toString() ?? '0')
                    break
                case 'PARCIAL':
                    setMontoPagar('') // Usuario decide
                    break
                case 'LIQUIDACION':
                    setMontoPagar(calculoData.total_para_liquidar.toString())
                    break
            }
        }
    }

    const handlePeriodosRenovacionChange = (value: string) => {
        const periodos = parseInt(value)
        setPeriodosRenovacion(periodos)
        if (calculoData) {
            setMontoPagar(getMontoSugeridoRenovacion(calculoData, periodos))
        }
    }

    const handleCuotasAdelantarChange = (value: string) => {
        const cuotas = parseInt(value)
        setCuotasAdelantar(cuotas)

        if (calculoData?.opciones_cuotas_adelanto) {
            const opcion = calculoData.opciones_cuotas_adelanto.find((o: OpcionCuotaAdelanto) => o.cuotas === cuotas)
            if (opcion) {
                setMontoPagar(opcion.monto_total.toString())
            }
        }
    }

    const validarMonto = (): boolean => {
        const monto = parseFloat(montoPagar)
        if (isNaN(monto) || monto <= 0) {
            toast.error('Ingrese un monto válido')
            return false
        }

        if (tipoPago === 'CUOTA' && calculoData && monto < (calculoData.monto_cuota_actual - 0.10)) {
            toast.error(`Monto insuficiente. Cuota completa: Q${calculoData.monto_cuota_actual.toFixed(2)}`)
            return false
        }

        if (tipoPago === 'RENOVACION' && calculoData) {
            const montoMinimoRenovacion = Number(getMontoSugeridoRenovacion(calculoData, periodosRenovacion))
            if (monto < (montoMinimoRenovacion - 0.10)) {
                toast.error(`Monto insuficiente. Para ${periodosRenovacion} período(s) incluyendo otros cargos: Q${montoMinimoRenovacion.toFixed(2)}`)
                return false
            }
        }

        if (tipoPago === 'LIQUIDACION' && calculoData && monto < (calculoData.total_para_liquidar - 1)) {
            toast.error(`Para liquidar debe cubrir el total: Q${calculoData.total_para_liquidar.toFixed(2)}`)
            return false
        }

        // Validar exceso en parcial
        if (tipoPago === 'PARCIAL' && calculoData && monto > calculoData.total_para_liquidar) {
            toast.warning('El monto excede la deuda total, considere liquidar.')
        }

        return true
    }

    const onContinuar = () => {
        if (!validarMonto()) return
        setStep('confirmacion')
    }

    const ejecutarPago = async () => {
        setLoading(true)
        try {
            // Generar UUID válido
            const idempotencyKey = crypto.randomUUID()

            const payload: EjecutarPagoDTO = {
                tipo: tipoPago,
                monto: parseFloat(montoPagar),
                metodo_pago: 'efectivo',
                referencia: observaciones || '',
                observaciones,
                idempotency_key: idempotencyKey
            }

            // Agregar periodos si es renovación
            if (tipoPago === 'RENOVACION') {
                payload.periodos = periodosRenovacion
            }

            // Agregar cuotas si es adelanto
            if (tipoPago === 'ADELANTO') {
                payload.cuotas = cuotasAdelantar
            }

            const resultado = await creditoPrendarioService.ejecutarPago(creditoId, payload)
            if (resultado?.id) {
                const movId = String(resultado.id)
                const numMov = resultado.numero_movimiento ?? movId
                setMovimientoGenerado({ id: movId, numero_movimiento: numMov })
                // Descargar recibo automáticamente al momento del pago
                try {
                    await creditoPrendarioService.descargarReciboPago(creditoId, movId, numMov)
                } catch {
                    toast.error('Pago registrado, pero no se pudo descargar el recibo. Puede reimprimirlo desde el historial.')
                }
            }
            setStep('exito')
            toast.success('Pago registrado correctamente')
            onSuccess() // Notificamos al padre para recargar datos
        } catch (error: any) {
            console.error('Error al ejecutar pago:', error)

            // Si hay errores de validación, mostrarlos
            if (error.response?.data?.errors) {
                const errores = error.response.data.errors
                const mensajes = Object.entries(errores)
                    .map(([campo, mensajes]: [string, any]) => {
                        if (Array.isArray(mensajes)) {
                            return `${campo}: ${mensajes.join(', ')}`
                        }
                        return `${campo}: ${mensajes}`
                    })
                    .join('\n')
                toast.error(`Error de validación:\n${mensajes}`)
            } else {
                toast.error(error.message || 'Error al procesar el pago')
            }

            setStep('calculo') // Volver atrás en caso de error
        } finally {
            setLoading(false)
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Pago / Movimiento</DialogTitle>
                    <DialogDescription>
                        {calculoData ? `Deuda calculada al ${calculoData.fecha_calculo}` : 'Cargando información...'}
                    </DialogDescription>
                </DialogHeader>

                {loading && !calculoData ? (
                    <div className="flex justify-center py-8">
                        <Spinner className="animate-spin h-8 w-8 text-primary" />
                    </div>
                ) : step === 'calculo' ? (
                    <div className="space-y-4">
                        {/* Resumen Deuda */}
                        <div className="grid grid-cols-2 gap-2 text-sm bg-muted p-3 rounded-md">
                            <div className="text-muted-foreground">Capital Pendiente:</div>
                            <div className="text-right font-medium"><MoneyDisplay amount={calculoData?.capital_pendiente ?? 0} /></div>
                            <div className="text-muted-foreground">Interés Acumulado:</div>
                            <div className="text-right font-medium text-orange-600"><MoneyDisplay amount={calculoData?.interes_acumulado ?? 0} /></div>
                            <div className="text-muted-foreground">Mora Acumulada:</div>
                            <div className="text-right font-medium text-red-600"><MoneyDisplay amount={calculoData?.mora_acumulada ?? 0} /></div>
                            <div className="text-muted-foreground">Otros Cargos:</div>
                            <div className="text-right font-medium text-purple-600"><MoneyDisplay amount={calculoData?.otros_acumulados ?? 0} /></div>
                            {calculoData?.en_mora && (
                                <>
                                    <div className="text-muted-foreground text-red-600">Días en Mora:</div>
                                    <div className="text-right font-medium text-red-600">{calculoData?.dias_mora} días</div>
                                </>
                            )}
                            <div className="font-bold border-t pt-1 mt-1">Total Liquidación:</div>
                            <div className="text-right font-bold border-t pt-1 mt-1 text-primary"><MoneyDisplay amount={calculoData?.total_para_liquidar ?? 0} /></div>
                            <div className="text-muted-foreground text-xs col-span-2">
                                Tipo: {calculoData?.tipo_periodo} | Periodos transcurridos: {calculoData?.periodos_cobrados}
                            </div>
                        </div>

                        <Tabs value={tipoPago} onValueChange={handleTipoChange} className="w-full">
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="CUOTA" className="text-xs px-2">Cuota</TabsTrigger>
                                <TabsTrigger value="PARCIAL" className="text-xs px-2">Abono</TabsTrigger>
                                <TabsTrigger value="RENOVACION" className="text-xs px-2">Renovación</TabsTrigger>
                                <TabsTrigger value="ADELANTO" className="text-xs px-2">Adelantar</TabsTrigger>
                                <TabsTrigger value="LIQUIDACION" className="text-xs px-2">Liquidar</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Selector de períodos para Renovación */}
                        {tipoPago === 'RENOVACION' && calculoData?.opciones_adelanto && (
                            <div className="space-y-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                                    <CalendarPlus className="h-4 w-4" />
                                    <span>¿Cuántos períodos renovar?</span>
                                </div>
                                <Select value={periodosRenovacion.toString()} onValueChange={handlePeriodosRenovacionChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar períodos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {calculoData.opciones_adelanto.map((opcion: OpcionAdelanto) => (
                                            <SelectItem key={opcion.periodos} value={opcion.periodos.toString()}>
                                                {opcion.descripcion} - Q{opcion.monto_interes.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {calculoData.interes_por_periodo > 0 && (
                                    <div className="bg-white dark:bg-gray-900 p-2 rounded text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Interés por cuota:</span>
                                            <span className="font-bold text-blue-700">Q{calculoData.interes_por_periodo.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    Esto cubrirá intereses y otros cargos de {periodosRenovacion} período(s). El saldo NO disminuirá y se agregarán {periodosRenovacion} cuota(s) nueva(s).
                                </p>
                            </div>
                        )}

                        {/* Selector de cuotas para Adelanto */}
                        {tipoPago === 'ADELANTO' && calculoData?.opciones_cuotas_adelanto && calculoData.opciones_cuotas_adelanto.length > 0 && (
                            <div className="space-y-2 bg-purple-50 dark:bg-purple-950 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                                    <CalendarPlus className="h-4 w-4" />
                                    <span>¿Cuántas cuotas adelantar?</span>
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        max={calculoData.opciones_cuotas_adelanto.length}
                                        value={cuotasAdelantar}
                                        onChange={(e) => {
                                            const valor = parseInt(e.target.value) || 1
                                            const maxCuotas = calculoData.opciones_cuotas_adelanto?.length || 1
                                            const cuotasValidas = Math.max(1, Math.min(valor, maxCuotas))
                                            handleCuotasAdelantarChange(cuotasValidas.toString())
                                        }}
                                        className="w-full"
                                        placeholder="Ingrese cantidad de cuotas"
                                    />
                                    {calculoData.opciones_cuotas_adelanto.find(op => op.cuotas === cuotasAdelantar) && (
                                        <div className="text-sm bg-white dark:bg-gray-900 p-2 rounded border">
                                            <div className="font-medium text-purple-700 dark:text-purple-300">
                                                {calculoData.opciones_cuotas_adelanto.find(op => op.cuotas === cuotasAdelantar)?.descripcion}
                                            </div>
                                            <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                                Q{calculoData.opciones_cuotas_adelanto.find(op => op.cuotas === cuotasAdelantar)?.monto_total.toFixed(2)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    Pagará {cuotasAdelantar} cuota(s) completa(s). El saldo disminuirá Q{calculoData.opciones_cuotas_adelanto.find(o => o.cuotas === cuotasAdelantar)?.capital_total.toFixed(2)}.
                                </p>
                            </div>
                        )}

                        {/* Información de prelación para Abono */}
                        {tipoPago === 'PARCIAL' && calculoData && (
                            <div className="text-xs space-y-1 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                                <p className="font-semibold text-green-700 dark:text-green-300">Orden de aplicación del pago:</p>
                                <p className="text-green-600">1. Mora: Q{calculoData.mora_acumulada.toFixed(2)}</p>
                                <p className="text-green-600">2. Interés: Q{calculoData.interes_acumulado.toFixed(2)}</p>
                                <p className="text-green-600">3. Otros: Q{(calculoData.otros_acumulados ?? 0).toFixed(2)}</p>
                                <p className="text-green-600">4. Capital: Saldo Q{calculoData.capital_pendiente.toFixed(2)}</p>
                                <p className="pt-1 font-semibold text-green-700">Total liquidación: Q{calculoData.total_para_liquidar.toFixed(2)}</p>
                            </div>
                        )}

                        {/* Información detallada para Liquidación */}
                        {tipoPago === 'LIQUIDACION' && calculoData && (
                            <div className="text-xs space-y-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                                <p className="font-semibold text-blue-700 dark:text-blue-300">Desglose de liquidación:</p>
                                <div className="space-y-1 bg-white dark:bg-gray-900 p-2 rounded">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">1. Mora:</span>
                                        <span className="font-medium">Q{calculoData.mora_acumulada.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">2. Interés:</span>
                                        <span className="font-medium">Q{calculoData.interes_acumulado.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">3. Capital:</span>
                                        <span className="font-medium">Q{calculoData.capital_pendiente.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">4. Otros:</span>
                                        <span className="font-medium">Q{(calculoData.otros_acumulados ?? 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 mt-1">
                                        <span className="font-bold text-blue-700">Total liquidación:</span>
                                        <span className="font-bold text-blue-700">Q{calculoData.total_para_liquidar.toFixed(2)}</span>
                                    </div>
                                </div>
                                {calculoData.interes_por_periodo > 0 && (
                                    <p className="text-blue-600 dark:text-blue-400 text-xs italic">
                                        Interés por período: Q{calculoData.interes_por_periodo.toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Información para Cuota */}
                        {tipoPago === 'CUOTA' && calculoData && (
                            <div className="text-xs space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                                <p className="font-semibold text-gray-700 dark:text-gray-300">
                                    Pago de cuota {calculoData.cuota_numero ? `#${calculoData.cuota_numero}` : ''} completa programada
                                </p>
                                <div className="space-y-1 bg-white dark:bg-gray-800 p-2 rounded">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Capital:</span>
                                        <span className="font-medium">Q{(calculoData.cuota_capital ?? 0).toFixed(2)}</span>
                                    </div>
                                    {(calculoData.cuota_interes ?? 0) > 0 && (
                                        <div className="flex justify-between text-orange-600">
                                            <span>Interés:</span>
                                            <span className="font-medium">Q{(calculoData.cuota_interes ?? 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(calculoData.cuota_mora ?? 0) > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>Mora:</span>
                                            <span className="font-medium">Q{(calculoData.cuota_mora ?? 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(calculoData.cuota_gastos ?? 0) > 0 && (
                                        <div className="flex justify-between text-purple-600">
                                            <span>Otros cargos:</span>
                                            <span className="font-medium">Q{(calculoData.cuota_gastos ?? 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-1 mt-1">
                                        <span className="font-bold">Total cuota:</span>
                                        <span className="font-bold">Q{(calculoData.monto_cuota_actual ?? 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <p className="text-gray-600 mt-1">La cuota se marcará como PAGADA y el saldo disminuirá.</p>
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <Label htmlFor="monto">Monto a Pagar</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">Q</span>
                                    <Input
                                        id="monto"
                                        type="number"
                                        className="pl-8 text-lg font-bold"
                                        value={montoPagar}
                                        onChange={(e) => setMontoPagar(e.target.value)}
                                    />
                                </div>
                                {tipoPago === 'RENOVACION' && calculoData && (
                                    <p className="text-xs text-muted-foreground">
                                        Interés por período: Q{calculoData.interes_por_periodo.toFixed(2)}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="obs">Observaciones (Opcional)</Label>
                                <Input
                                    id="obs"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Ref. boleta, cheque, etc."
                                />
                            </div>
                        </div>
                    </div>
                ) : step === 'confirmacion' ? (
                    <div className="space-y-4 py-2">
                        <div className="rounded-md border p-4 bg-muted/50">
                            <div className="flex items-center gap-2 mb-4">
                                <Warning className="text-orange-500 h-5 w-5" />
                                <span className="font-semibold text-sm">Confirme los detalles del movimiento</span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Tipo de Operación:</span>
                                    <span className="font-medium">
                                        {tipoPago === 'CUOTA' ? 'Pago Cuota Completa' :
                                         tipoPago === 'PARCIAL' ? 'Abono Parcial' :
                                         tipoPago === 'RENOVACION' ? 'Renovación' :
                                         tipoPago === 'ADELANTO' ? 'Adelanto de Cuotas' :
                                         'Liquidación'}
                                    </span>
                                </div>
                                {tipoPago === 'RENOVACION' && periodosRenovacion > 0 && (
                                    <div className="flex justify-between text-blue-600">
                                        <span>Períodos a renovar:</span>
                                        <span className="font-medium">{periodosRenovacion} {periodosRenovacion === 1 ? 'período' : 'períodos'}</span>
                                    </div>
                                )}
                                {tipoPago === 'ADELANTO' && cuotasAdelantar > 0 && (
                                    <div className="flex justify-between text-purple-600">
                                        <span>Cuotas a adelantar:</span>
                                        <span className="font-medium">{cuotasAdelantar} {cuotasAdelantar === 1 ? 'cuota' : 'cuotas'}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Monto Total:</span>
                                    <span className="text-primary">Q {parseFloat(montoPagar).toFixed(2)}</span>
                                </div>
                                {tipoPago === 'CUOTA' && (
                                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                        Este pago cubrirá la cuota completa programada. La cuota se marcará como PAGADA y el saldo disminuirá.
                                    </div>
                                )}
                                {tipoPago === 'RENOVACION' && (
                                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                        Este pago cubrirá intereses y otros cargos de {periodosRenovacion} {periodosRenovacion === 1 ? 'período' : 'períodos'} y extenderá el plazo. El capital NO disminuirá. Se agregarán {periodosRenovacion} cuota(s) nueva(s).
                                    </div>
                                )}
                                {tipoPago === 'ADELANTO' && (
                                    <div className="mt-2 text-xs text-purple-600 bg-purple-50 p-2 rounded">
                                        Pagará {cuotasAdelantar} cuota(s) completa(s) por adelantado. El saldo disminuirá y las cuotas se marcarán como PAGADAS.
                                    </div>
                                )}
                                {tipoPago === 'PARCIAL' && (
                                    <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                                        El pago se aplicará con prelación: primero mora, luego interés, y finalmente capital. El saldo disminuirá según el monto abonado.
                                    </div>
                                )}
                                {tipoPago === 'LIQUIDACION' && (
                                    <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                                        Esto liquidará el crédito y liberará la prenda para su entrega.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <h3 className="text-xl font-bold">¡Pago Exitoso!</h3>
                        <p className="text-muted-foreground text-sm">
                            La transacción ha sido registrada correctamente.
                        </p>
                        {movimientoGenerado && (
                            <Button
                                variant="outline"
                                className="mt-4"
                                disabled={descargandoRecibo}
                                onClick={async () => {
                                    setDescargandoRecibo(true)
                                    try {
                                        await creditoPrendarioService.descargarReciboPago(
                                            creditoId,
                                            movimientoGenerado.id,
                                            movimientoGenerado.numero_movimiento
                                        )
                                    } catch {
                                        toast.error('Error al descargar el recibo de pago')
                                    } finally {
                                        setDescargandoRecibo(false)
                                    }
                                }}
                            >
                                <Receipt className="mr-2 h-4 w-4" />
                                {descargandoRecibo ? 'Descargando…' : 'Descargar Recibo PDF'}
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="mt-1" onClick={onClose}>
                            Cerrar
                        </Button>
                    </div>
                )}

                <DialogFooter className="sm:justify-between">
                    {step !== 'exito' && (
                        <Button variant="ghost" onClick={step === 'confirmacion' ? () => setStep('calculo') : onClose} disabled={loading}>
                            {step === 'confirmacion' ? 'Atrás' : 'Cancelar'}
                        </Button>
                    )}

                    {step === 'calculo' && (
                        <Button onClick={onContinuar} disabled={loading || !calculoData}>
                            Continuar
                        </Button>
                    )}

                    {step === 'confirmacion' && (
                        <Button onClick={ejecutarPago} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                            {loading ? <Spinner className="animate-spin h-4 w-4" /> : 'Confirmar y Pagar'}
                        </Button>
                    )}

                    {step === 'exito' && (
                        <Button onClick={onClose} className="ml-auto">
                            Cerrar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
