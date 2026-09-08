import { useState, useEffect, useRef, useCallback } from 'react'
import { AprobarCreditoDTO } from '@/types/creditoPrendario.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard as CreditCardIcon, Calculator, Calendar, Percent, Package, Sliders, Info, CheckCircle, Lock } from '@phosphor-icons/react'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { GastosCreditoSelector } from '@/components/modules/gastos/GastosCreditoSelector'
import { planInteresService } from '@/services/planInteres.service'
import { PlanInteresCategoria } from '@/types/planInteres.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/** Días desde desembolso hasta la primera cuota según período de cobro */
function diasDesembolsoHastaPrimerPago(tipoInteres: string): number {
  switch (tipoInteres) {
    case 'semanal':
      return 7
    case 'quincenal':
      return 15
    case 'mensual':
    default:
      return 30
  }
}

function calcularFechaPrimerPagoDesdeDesembolso(fechaDesembolso: string, tipoInteres: string): string {
  const base = fechaDesembolso || new Date().toISOString().split('T')[0]
  const d = new Date(`${base}T12:00:00`)
  d.setDate(d.getDate() + diasDesembolsoHastaPrimerPago(tipoInteres))
  return d.toISOString().split('T')[0]
}

type ModoConfiguracion = 'libre' | 'producto'

interface PasoConfigurarCreditoProps {
  credito: Partial<AprobarCreditoDTO & { fecha_desembolso?: string; fecha_primer_pago?: string; gas_ids?: number[]; plan_interes_id?: number }> | null
  valorTasacion: number
  categoriaProductoId?: string | number | null
  onCreditoChange: (credito: Partial<AprobarCreditoDTO & { fecha_desembolso?: string; fecha_primer_pago?: string; gas_ids?: number[]; plan_interes_id?: number }>) => void
  onSiguiente: () => void
  onAnterior: () => void
  parametrosCategoria?: {
    tasa_interes?: number
    tasa_mora?: number
    tipo_mora?: 'porcentaje' | 'monto_fijo'
    mora_monto_fijo_default?: number | null
    plazo_maximo?: number
    porcentaje_prestamo_maximo?: number
    metodo_calculo?: 'francesa' | 'flat'
    afecta_interes_mensual?: boolean
    permite_pago_capital_diferente?: boolean
  } | null
  /** Sin este permiso, la tasa de interés % queda fija (categoría / producto). */
  canEditTasaInteres?: boolean
  /** Sin este permiso, mora queda fija (categoría / producto). */
  canEditMora?: boolean
}

export function PasoConfigurarCredito({
  credito,
  valorTasacion,
  categoriaProductoId,
  onCreditoChange,
  onSiguiente,
  onAnterior,
  parametrosCategoria,
  canEditTasaInteres = false,
  canEditMora = true,
}: PasoConfigurarCreditoProps) {
  // ==================== MODO DE CONFIGURACIÓN ====================
  const [modoConfig, setModoConfig] = useState<ModoConfiguracion>('libre')
  const [productosDisponibles, setProductosDisponibles] = useState<PlanInteresCategoria[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<PlanInteresCategoria | null>(null)
  const [cargandoProductos, setCargandoProductos] = useState(false)

  const [simulacion, setSimulacion] = useState<{
    cuotaPeriodica: number
    interesPorPeriodo: number
    capitalPorPeriodo: number
    totalIntereses: number
    totalAPagar: number
    periodoLabel: string
    totalGastos?: number
    gastosPorCuota?: number
  } | null>(null)

  // Estado para gastos
  const [totalGastos, setTotalGastos] = useState(0)

  // ==================== CARGAR PRODUCTOS CREDITICIOS ====================
  useEffect(() => {
    const cargarProductos = async () => {
      setCargandoProductos(true)
      try {
        // Si hay categoría, filtrar por ella; sino traer todos los activos
        const filtros: any = { activo: true }
        if (categoriaProductoId) {
          filtros.categoria_id = Number(categoriaProductoId)
        }
        const planes = await planInteresService.obtenerTodos(filtros)
        setProductosDisponibles(Array.isArray(planes) ? planes : [])
      } catch (error) {
        console.error('Error cargando productos crediticios:', error)
        setProductosDisponibles([])
      } finally {
        setCargandoProductos(false)
      }
    }
    cargarProductos()
  }, [categoriaProductoId])

  // ==================== APLICAR PRODUCTO SELECCIONADO ====================
  const aplicarProducto = useCallback((producto: PlanInteresCategoria) => {
    setProductoSeleccionado(producto)
    
    // Monto sugerido según porcentaje de préstamo del producto
    const montoSugerido = valorTasacion * (producto.porcentaje_prestamo / 100)
    
    // Mapear tipo_periodo del producto al tipo_interes del crédito
    const mapearPeriodo = (tipo: string): string => {
      switch (tipo) {
        case 'semanal': return 'semanal'
        case 'quincenal': return 'quincenal'
        case 'mensual': return 'mensual'
        default: return 'mensual'
      }
    }

    const tipoInteresProd = mapearPeriodo(producto.tipo_periodo)
    const fechaDes = (credito?.fecha_desembolso as string) || new Date().toISOString().split('T')[0]

    const creditoActualizado: any = {
      ...credito,
      plan_interes_id: producto.id,
      monto_aprobado: montoSugerido > 0 ? Math.round(montoSugerido * 100) / 100 : credito?.monto_aprobado,
      tasa_interes: producto.tasa_interes,
      tasa_mora: producto.tasa_moratorios ?? credito?.tasa_mora ?? 5,
      tipo_mora: (producto as any).tipo_mora ?? credito?.tipo_mora ?? 'porcentaje',
      mora_monto_fijo: (producto as any).mora_monto_fijo ?? credito?.mora_monto_fijo ?? null,
      tipo_interes: tipoInteresProd,
      fecha_primer_pago: calcularFechaPrimerPagoDesdeDesembolso(fechaDes, tipoInteresProd),
      numero_cuotas: producto.plazo_numero || credito?.numero_cuotas,
      dias_gracia: producto.dias_gracia || 0,
      metodo_calculo: 'flat',
    }

    onCreditoChange(creditoActualizado)
    toast.success(`Producto "${producto.nombre}" aplicado`)
  }, [credito, valorTasacion, onCreditoChange])

  // Establecer fechas por defecto y método de cálculo siempre como 'flat'
  // Usar useRef para rastrear si ya se aplicaron los valores por defecto
  const initializedRef = useRef(false)
  const tasaInicializadaRef = useRef(false)
  
  // Efecto para aplicar parámetros de categoría (solo una vez)
  useEffect(() => {
    if (!credito || !parametrosCategoria || initializedRef.current) return
    
    const updatedCredito: any = {}
    let hasChanges = false
    
    // Aplicar parámetros de categoría solo si no están definidos
    if (!credito.monto_aprobado && parametrosCategoria.porcentaje_prestamo_maximo) {
      updatedCredito.monto_aprobado = valorTasacion * (parametrosCategoria.porcentaje_prestamo_maximo / 100)
      hasChanges = true
    }
    if (!credito.tasa_interes && parametrosCategoria.tasa_interes !== undefined) {
      updatedCredito.tasa_interes = parametrosCategoria.tasa_interes
      hasChanges = true
    }
    if (!credito.tasa_mora && parametrosCategoria.tasa_mora !== undefined) {
      updatedCredito.tasa_mora = parametrosCategoria.tasa_mora
      hasChanges = true
    }
    if (!credito.tipo_mora && parametrosCategoria.tipo_mora !== undefined) {
      updatedCredito.tipo_mora = parametrosCategoria.tipo_mora
      hasChanges = true
    }
    if ((credito.mora_monto_fijo === undefined || credito.mora_monto_fijo === null) && parametrosCategoria.mora_monto_fijo_default !== undefined && parametrosCategoria.mora_monto_fijo_default !== null) {
      updatedCredito.mora_monto_fijo = parametrosCategoria.mora_monto_fijo_default
      hasChanges = true
    }
    if (!credito.plazo_dias && parametrosCategoria.plazo_maximo !== undefined) {
      updatedCredito.plazo_dias = parametrosCategoria.plazo_maximo
      hasChanges = true
    }
    if ((credito as any).afecta_interes_mensual === undefined && parametrosCategoria.afecta_interes_mensual !== undefined) {
      updatedCredito.afecta_interes_mensual = parametrosCategoria.afecta_interes_mensual
      hasChanges = true
    }
    if ((credito as any).permite_pago_capital_diferente === undefined && parametrosCategoria.permite_pago_capital_diferente !== undefined) {
      updatedCredito.permite_pago_capital_diferente = parametrosCategoria.permite_pago_capital_diferente
      hasChanges = true
    }
    
    if (hasChanges) {
      onCreditoChange({ ...credito, ...updatedCredito })
      initializedRef.current = true
    }
  }, [valorTasacion, parametrosCategoria]) // Solo cuando cambian estos valores
  
  // Efecto 2: Asegurar método flat y fechas por defecto (solo una vez)
  const initializedDefaultsRef = useRef(false)
  useEffect(() => {
    if (!credito || initializedDefaultsRef.current) return
    
    const updatedCredito: any = {}
    let hasChanges = false
    
    // Siempre establecer método de cálculo como 'flat'
    if ((credito as any)?.metodo_calculo !== 'flat') {
      updatedCredito.metodo_calculo = 'flat'
      hasChanges = true
    }
    
    // Establecer fechas si no están definidas (primer pago según tipo de período)
    const fechaHoy = new Date().toISOString().split('T')[0]
    const tipoIni = (credito.tipo_interes as string) || 'mensual'
    const fechaDesInicial = credito.fecha_desembolso || fechaHoy
    const fechaPrimerPagoInicial = calcularFechaPrimerPagoDesdeDesembolso(fechaDesInicial, tipoIni)

    if (!credito.fecha_desembolso) {
      updatedCredito.fecha_desembolso = fechaHoy
      hasChanges = true
    }
    if (!credito.fecha_primer_pago) {
      updatedCredito.fecha_primer_pago = fechaPrimerPagoInicial
      hasChanges = true
    }
    
    // Solo actualizar si hay cambios necesarios
    if (hasChanges) {
      onCreditoChange({ ...credito, ...updatedCredito })
    }
    initializedDefaultsRef.current = true
  }, []) // Solo se ejecuta una vez al montar

  // Solo semanal, quincenal y mensual: normalizar valores antiguos (NO diario, catorcenal, cada_28_dias)
  useEffect(() => {
    if (!credito?.tipo_interes) return
    const permitidos = ['semanal', 'quincenal', 'mensual'] as const
    if (!permitidos.includes(credito.tipo_interes as (typeof permitidos)[number])) {
      const fd = credito.fecha_desembolso || new Date().toISOString().split('T')[0]
      onCreditoChange({
        ...credito,
        tipo_interes: 'mensual',
        fecha_primer_pago: calcularFechaPrimerPagoDesdeDesembolso(fd, 'mensual'),
      })
    }
  }, [credito?.tipo_interes])

  // Sincronizar tasa de interés por defecto y controlar edición
  useEffect(() => {
    const tasaSugerida = productoSeleccionado?.tasa_interes ?? parametrosCategoria?.tasa_interes ?? 15.0

    if (!canEditTasaInteres) {
      // Para asesores (bloqueado): Forzar siempre la tasa sugerida/oficial
      if (credito?.tasa_interes !== tasaSugerida) {
        onCreditoChange({ ...credito, tasa_interes: tasaSugerida })
      }
    } else {
      // Para encargados/admins (libre): Inicializar solo una vez si está vacía
      if (!credito?.tasa_interes && !tasaInicializadaRef.current && !cargandoProductos) {
        tasaInicializadaRef.current = true
        onCreditoChange({ ...credito, tasa_interes: tasaSugerida })
      }
    }
  }, [canEditTasaInteres, productoSeleccionado?.tasa_interes, parametrosCategoria?.tasa_interes, credito?.tasa_interes, cargandoProductos])

  useEffect(() => {
    calcularSimulacion()
  }, [credito?.monto_aprobado, credito?.tasa_interes, credito?.numero_cuotas, credito?.tipo_interes, credito?.dias_gracia, (credito as any)?.afecta_interes_mensual, totalGastos])

  const calcularSimulacion = () => {
    if (!credito?.monto_aprobado || !credito?.tasa_interes || !credito?.numero_cuotas || !credito?.tipo_interes) {
      setSimulacion(null)
      return
    }

    const monto = credito.monto_aprobado
    const tipoInteres = credito.tipo_interes
    const numeroCuotas = credito.numero_cuotas
    const diasGracia = credito.dias_gracia || 0
    // Método de cálculo siempre es 'flat' para créditos prendarios
    const metodoCalculo = 'flat'
    const afectaInteresMensual = (credito as any)?.afecta_interes_mensual || false
    
    // Calcular tasa según el tipo de interés
    let tasaPeriodo: number
    let periodos: number
    let periodoLabel: string
    
    // La tasa ingresada es % MENSUAL (coherente con backend y etiquetas de pantalla)
    const tM = credito.tasa_interes / 100
    switch (tipoInteres) {
      case 'diario':
        tasaPeriodo = tM / 30
        periodos = numeroCuotas
        periodoLabel = 'diaria'
        break
      case 'semanal':
        tasaPeriodo = tM / 4
        periodos = numeroCuotas
        periodoLabel = 'semanal'
        break
      case 'catorcenal':
        tasaPeriodo = tM / 2.14
        periodos = numeroCuotas
        periodoLabel = 'catorcenal'
        break
      case 'quincenal':
        tasaPeriodo = tM / 2
        periodos = numeroCuotas
        periodoLabel = 'quincenal'
        break
      case 'cada_28_dias':
        tasaPeriodo = tM * (28 / 30)
        periodos = numeroCuotas
        periodoLabel = 'cada 28 días'
        break
      case 'mensual':
      default:
        tasaPeriodo = tM
        periodos = numeroCuotas
        periodoLabel = 'mensual'
        break
    }

    let cuotaPeriodica = 0
    let interesPorPeriodo = 0
    let capitalPorPeriodo = 0
    let totalAPagar = 0
    let totalIntereses = 0

    // Calcular según método de cálculo
    if (metodoCalculo === 'flat') {
      // MÉTODO FLAT/NIVELADO: Interés fijo sobre monto total, capital fijo
      // Fórmula según especificación:
      //   Interés_total = Monto × Tasa_mensual × Número_periodos
      //   Capital_por_cuota = Monto / Número_periodos
      //   Interés_por_cuota = Interés_total / Número_periodos
      //   Cuota = Capital_por_cuota + Interés_por_cuota
      
      // La tasa ingresada es % MENSUAL (ej. 2% mensual → 0.02). Se prorratea al período de cobro.
      const tasaMensual = credito.tasa_interes / 100
      let tasaPorPeriodo: number
      
      switch (tipoInteres) {
        case 'diario':
          // Tasa diaria = tasa mensual / 30
          tasaPorPeriodo = tasaMensual / 30
          break
        case 'semanal':
          // Tasa semanal = tasa mensual / 4 (aprox 4 semanas por mes)
          tasaPorPeriodo = tasaMensual / 4
          break
        case 'catorcenal':
          // Tasa catorcenal = tasa mensual / 2.14 (aprox 2.14 catorcenas por mes)
          tasaPorPeriodo = tasaMensual / 2.14
          break
        case 'quincenal':
          // Tasa quincenal = tasa mensual / 2
          tasaPorPeriodo = tasaMensual / 2
          break
        case 'cada_28_dias':
          // Tasa cada 28 días ≈ tasa mensual (28 días es casi un mes)
          tasaPorPeriodo = tasaMensual * (28 / 30)
          break
        case 'mensual':
        default:
          // Si es mensual, usar la tasa mensual directamente
          tasaPorPeriodo = tasaMensual
          break
      }
      
      // Interés_total = Monto × Tasa_por_periodo × Número_periodos
      const interesTotal = monto * tasaPorPeriodo * periodos
      
      // Capital_por_cuota = Monto / Número_periodos
      capitalPorPeriodo = Math.round((monto / periodos) * 100) / 100
      
      // Interés_por_cuota = Interés_total / Número_periodos = Monto × Tasa_por_periodo
      interesPorPeriodo = Math.round((monto * tasaPorPeriodo) * 100) / 100
      
      // Cuota = Capital_por_cuota + Interés_por_cuota
      cuotaPeriodica = Math.round((capitalPorPeriodo + interesPorPeriodo) * 100) / 100
      
      // Total a pagar = Cuota × Número_cuotas
      totalAPagar = Math.round(cuotaPeriodica * periodos * 100) / 100
      
      // Intereses totales = Interés_total
      totalIntereses = Math.round(interesTotal * 100) / 100
    } else {
      // MÉTODO FRANCESA: Amortización francesa
      if (tasaPeriodo > 0 && periodos > 0) {
        // Fórmula de amortización francesa
        // Cuota = Monto * (tasa * (1+tasa)^n) / ((1+tasa)^n - 1)
        const base = 1 + tasaPeriodo
        const baseElevado = Math.pow(base, periodos)
        
        // Calcular cuota exacta (sin redondeo intermedio)
        const cuotaExacta = (monto * tasaPeriodo * baseElevado) / (baseElevado - 1)
        
        // Redondear la cuota a 2 decimales para mostrar
        cuotaPeriodica = Math.round(cuotaExacta * 100) / 100
        
        // Calcular interés del primer período (sobre el capital inicial)
        interesPorPeriodo = Math.round((monto * tasaPeriodo) * 100) / 100
        
        // Calcular capital del primer período
        capitalPorPeriodo = Math.round((cuotaPeriodica - interesPorPeriodo) * 100) / 100
        
        // El total a pagar es la suma de todas las cuotas (amortización francesa)
        // Total = Cuota * número de cuotas
        totalAPagar = Math.round(cuotaPeriodica * periodos * 100) / 100
        
        // Calcular intereses totales: Total - Monto
        totalIntereses = Math.round((totalAPagar - monto) * 100) / 100
      } else {
        // Sin interés, solo capital
        cuotaPeriodica = Math.round((monto / periodos) * 100) / 100
        interesPorPeriodo = 0
        capitalPorPeriodo = cuotaPeriodica
        totalAPagar = monto
        totalIntereses = 0
      }
    }

    setSimulacion({
      cuotaPeriodica: isNaN(cuotaPeriodica) ? 0 : cuotaPeriodica,
      interesPorPeriodo: isNaN(interesPorPeriodo) ? 0 : interesPorPeriodo,
      capitalPorPeriodo: isNaN(capitalPorPeriodo) ? 0 : capitalPorPeriodo,
      totalIntereses: isNaN(totalIntereses) ? 0 : Math.max(0, totalIntereses),
      totalAPagar: isNaN(totalAPagar) ? 0 : totalAPagar + totalGastos,
      periodoLabel: periodoLabel,
      totalGastos: totalGastos,
      gastosPorCuota: credito?.numero_cuotas ? Math.round((totalGastos / credito.numero_cuotas) * 100) / 100 : 0,
    })
  }

  const handleSubmit = () => {
    if (!credito?.monto_aprobado || credito.monto_aprobado <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    if (credito.monto_aprobado > valorTasacion) {
      toast.error('El monto no puede ser mayor al valor de tasación')
      return
    }
    
    // Obtener tasa efectiva tomando de: crédito -> producto -> categoría -> fallback de 15.0 (placeholder)
    let tasaInteresEfectiva = 0
    if (credito?.tasa_interes !== undefined && credito?.tasa_interes !== null && (credito.tasa_interes as any) !== '') {
      tasaInteresEfectiva = Number(credito.tasa_interes)
    } else {
      tasaInteresEfectiva = Number(
        productoSeleccionado?.tasa_interes ??
        parametrosCategoria?.tasa_interes ??
        15.0
      )
    }

    // Si el usuario no tiene permiso de editar la tasa, no seleccionó producto ni categoría y la tasa es <= 0
    if (!canEditTasaInteres && tasaInteresEfectiva <= 0) {
      toast.error('Debe seleccionar un producto (Plan de Interés) para la parametrización de la tasa de interés.')
      return
    }

    // Validar que la tasa de interés sea un número válido y mayor a 0
    if (isNaN(tasaInteresEfectiva) || tasaInteresEfectiva <= 0) {
      toast.error('Ingresa una tasa de interés válida (mayor a 0)')
      return
    }
    if (!credito?.numero_cuotas || credito.numero_cuotas <= 0) {
      toast.error('Ingresa un número de cuotas válido')
      return
    }
    if (!credito?.tipo_interes) {
      toast.error('Selecciona un tipo de período')
      return
    }
    // Validar fechas - usar el valor del input si no está en el estado
    const fechaDesembolso = credito?.fecha_desembolso || fechaHoy
    const fechaPrimerPago = credito?.fecha_primer_pago || fechaPrimerPagoDefault
    
    if (!fechaDesembolso || fechaDesembolso.trim() === '') {
      toast.error('Selecciona una fecha de desembolso')
      return
    }
    if (!fechaPrimerPago || fechaPrimerPago.trim() === '') {
      toast.error('Selecciona una fecha de primer pago')
      return
    }
    
    // Asegurar que las fechas estén guardadas en el estado antes de continuar
    const creditoActualizado = {
      ...credito,
      tasa_interes: tasaInteresEfectiva,
      fecha_desembolso: fechaDesembolso,
      fecha_primer_pago: fechaPrimerPago
    }
    onCreditoChange(creditoActualizado)
    onSiguiente()
  }

  const montoSugerido = valorTasacion * 0.7

  // Establecer fechas por defecto si no están definidas
  const fechaHoy = new Date().toISOString().split('T')[0]
  const fechaPrimerPagoDefault =
    credito?.fecha_primer_pago ||
    calcularFechaPrimerPagoDesdeDesembolso(
      credito?.fecha_desembolso || fechaHoy,
      (credito?.tipo_interes as string) || 'mensual'
    )

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <CreditCardIcon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Configurar Crédito</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Define los términos del préstamo prendario
        </p>
      </div>

      {/* ==================== SELECTOR DE MODO ==================== */}
      <Card className="border-2">
        <CardContent className="p-4">
          <Label className="text-sm font-semibold mb-3 block">Tipo de Configuración</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setModoConfig('libre')
                setProductoSeleccionado(null)
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                modoConfig === 'libre'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                modoConfig === 'libre' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <Sliders size={24} weight="duotone" />
              </div>
              <span className="font-semibold text-sm">Configuración Libre</span>
              <span className="text-xs text-muted-foreground text-center">
                Define manualmente las tasas, plazos y condiciones
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModoConfig('producto')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all relative',
                modoConfig === 'producto'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50',
                productosDisponibles.length === 0 && 'opacity-60'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                modoConfig === 'producto' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <Package size={24} weight="duotone" />
              </div>
              <span className="font-semibold text-sm">Por Producto Crediticio</span>
              <span className="text-xs text-muted-foreground text-center">
                Usar configuración predefinida de un producto
              </span>
              {productosDisponibles.length > 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2">
                  {productosDisponibles.length}
                </Badge>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ==================== SELECTOR DE PRODUCTO ==================== */}
      {modoConfig === 'producto' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package size={20} />
              Seleccionar Producto Crediticio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cargandoProductos ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Cargando productos disponibles...
              </div>
            ) : productosDisponibles.length === 0 ? (
              <div className="text-center py-6">
                <Info size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay productos crediticios configurados{categoriaProductoId ? ' para esta categoría' : ''}.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Puedes crear productos desde el módulo "Productos Crediticios" o usar configuración libre.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setModoConfig('libre')
                    setProductoSeleccionado(null)
                  }}
                >
                  <Sliders size={16} className="mr-2" />
                  Usar Configuración Libre
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                {productosDisponibles.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => aplicarProducto(producto)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm',
                      productoSeleccionado?.id === producto.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border hover:border-primary/40 bg-background'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{producto.nombre}</span>
                          {producto.es_default && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              Predeterminado
                            </Badge>
                          )}
                          {productoSeleccionado?.id === producto.id && (
                            <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />
                          )}
                        </div>
                        {producto.categoria_producto_id === null ? (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                            Genérico (Todas las categorías)
                          </p>
                        ) : (producto as any).categorias && (producto as any).categorias.length > 0 ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(producto as any).categorias.map((c: any) => c.nombre).join(', ')}
                          </p>
                        ) : producto.categoria?.nombre ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {producto.categoria.nombre}
                          </p>
                        ) : (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                            Genérico (Todas las categorías)
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs">
                          <span>
                            <strong>Tasa:</strong> {producto.tasa_interes}% {producto.tipo_periodo}
                          </span>
                          <span>
                            <strong>Plazo:</strong> {producto.plazo_numero} {producto.plazo_unidad}
                          </span>
                          <span>
                            <strong>% Préstamo:</strong> {producto.porcentaje_prestamo}%
                          </span>
                          {producto.tasa_almacenaje > 0 && (
                            <span>
                              <strong>Almacenaje:</strong> {producto.tasa_almacenaje}%
                            </span>
                          )}
                          {producto.dias_gracia > 0 && (
                            <span>
                              <strong>Gracia:</strong> {producto.dias_gracia} días
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {productoSeleccionado && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                  <span className="font-medium text-emerald-800 dark:text-emerald-300">
                    Producto aplicado: <strong>{productoSeleccionado.nombre}</strong>
                  </span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Los campos se han llenado automáticamente. Puedes ajustarlos si es necesario.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {productoSeleccionado
                  ? `Monto sugerido (${productoSeleccionado.porcentaje_prestamo}%):`
                  : 'Monto sugerido (70%):'}
              </span>
            </div>
            <MoneyDisplay
              amount={productoSeleccionado
                ? valorTasacion * (productoSeleccionado.porcentaje_prestamo / 100)
                : montoSugerido}
              className="text-lg font-bold text-primary"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monto_aprobado" className="text-sm font-medium">
            Monto a Prestar (Q) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="monto_aprobado"
            type="number"
            step="0.01"
            min="0"
            max={valorTasacion}
            placeholder="0.00"
            value={credito?.monto_aprobado || ''}
            onChange={(e) => onCreditoChange({ ...credito, monto_aprobado: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Máximo: <MoneyDisplay amount={valorTasacion} />
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tasa_interes" className="text-sm font-medium">
            Tasa de interés mensual (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="tasa_interes"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="15.0"
              value={credito?.tasa_interes ?? productoSeleccionado?.tasa_interes ?? parametrosCategoria?.tasa_interes ?? ''}
              disabled={!canEditTasaInteres}
              readOnly={!canEditTasaInteres}
              className={!canEditTasaInteres ? 'opacity-90 bg-muted/50' : undefined}
              onChange={(e) => {
                const valor = e.target.value
                // Permitir campo vacío mientras el usuario escribe
                const tasaInteres = valor === '' ? '' : parseFloat(valor)
                onCreditoChange({ ...credito, tasa_interes: tasaInteres as any })
              }}
              onBlur={(e) => {
                const valor = e.target.value?.trim()
                const tasa = valor === '' ? NaN : Number(valor)

                // Regla solicitada: si se borra o queda en 0/negativo, volver a 15% por defecto.
                if (valor === '' || !Number.isFinite(tasa) || tasa <= 0) {
                  onCreditoChange({ ...credito, tasa_interes: 15 })
                }
              }}
            />
            {!canEditTasaInteres && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 shrink-0" weight="duotone" />
                Tasa fija según categoría o producto. Sin permiso «Modificar tasa de interés».
              </p>
            )}
            {parametrosCategoria?.tasa_interes && (
              <p className="text-xs text-muted-foreground mt-1">
                Valor sugerido por categoría: {parametrosCategoria.tasa_interes}%
              </p>
            )}
            {canEditTasaInteres && (
            <p className="text-xs text-muted-foreground mt-1">
              En configuración libre puede superar 100% si el cliente lo requiere.
            </p>
            )}
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo_interes" className="text-sm font-medium">
            Tipo de Período <span className="text-destructive">*</span>
          </Label>
          <Select
            value={credito?.tipo_interes || undefined}
            onValueChange={(v) => {
              const tipo = v as 'semanal' | 'quincenal' | 'mensual'
              const fd = credito?.fecha_desembolso || fechaHoy
              onCreditoChange({
                ...credito,
                tipo_interes: tipo,
                fecha_primer_pago: calcularFechaPrimerPagoDesdeDesembolso(fd, tipo),
              })
            }}
          >
            <SelectTrigger id="tipo_interes">
              <SelectValue placeholder="Selecciona tipo de período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quincenal">Quincenal (15 días)</SelectItem>
              <SelectItem value="mensual">Mensual (30 días)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Método de cálculo siempre es 'flat' para créditos prendarios - oculto */}
        <input type="hidden" value="flat" />
        
        {/* Campos eliminados según requerimiento - no se usan para calcular intereses y cuotas */}

        <div className="space-y-2">
          <Label htmlFor="numero_cuotas" className="text-sm font-medium">
            Número de Cuotas <span className="text-destructive">*</span>
          </Label>
          <Input
            id="numero_cuotas"
            type="number"
            min="1"
            placeholder="1"
            value={credito?.numero_cuotas || ''}
            onChange={(e) => onCreditoChange({ ...credito, numero_cuotas: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_desembolso" className="text-sm font-medium">
            Fecha de Desembolso <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="fecha_desembolso"
              type="date"
              min={fechaHoy}
              value={credito?.fecha_desembolso || fechaHoy}
              onChange={(e) => {
                const fd = e.target.value
                const tipo = (credito?.tipo_interes as string) || 'mensual'
                onCreditoChange({
                  ...credito,
                  fecha_desembolso: fd,
                  fecha_primer_pago: calcularFechaPrimerPagoDesdeDesembolso(fd, tipo),
                })
              }}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_primer_pago" className="text-sm font-medium">
            Fecha del Primer Pago <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="fecha_primer_pago"
              type="date"
              min={credito?.fecha_desembolso || fechaHoy}
              value={credito?.fecha_primer_pago || fechaPrimerPagoDefault}
              onChange={(e) => onCreditoChange({ ...credito, fecha_primer_pago: e.target.value })}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground">
            {credito?.fecha_desembolso && credito?.fecha_primer_pago && (() => {
              const fechaDesembolso = new Date(credito.fecha_desembolso)
              const fechaPrimerPago = new Date(credito.fecha_primer_pago)
              const diasDiferencia = Math.ceil((fechaPrimerPago.getTime() - fechaDesembolso.getTime()) / (1000 * 60 * 60 * 24))
              const esperados = diasDesembolsoHastaPrimerPago((credito.tipo_interes as string) || 'mensual')
              return `${diasDiferencia} día(s) desde el desembolso (sugerido para ${credito.tipo_interes || 'mensual'}: ${esperados} días)`
            })()}
          </p>
        </div>

        {/* Configuración de mora: porcentaje o monto fijo por día */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de mora</Label>
          {!canEditMora && (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 shrink-0" weight="duotone" />
              Mora fija según categoría o producto. Sin permiso «Modificar mora».
            </p>
          )}
          <Select
            value={(credito as any)?.tipo_mora ?? 'porcentaje'}
            disabled={!canEditMora}
            onValueChange={(value: 'porcentaje' | 'monto_fijo') =>
              onCreditoChange({ ...credito, tipo_mora: value, ...(value === 'porcentaje' ? { mora_monto_fijo: null } : { tasa_mora: 0 }) })
            }
          >
            <SelectTrigger className={!canEditMora ? 'opacity-90 bg-muted/50' : undefined}>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="porcentaje">Porcentaje (% sobre saldo)</SelectItem>
              <SelectItem value="monto_fijo">Monto fijo por día</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(credito as any)?.tipo_mora === 'monto_fijo' ? (
          <div className="space-y-2">
            <Label htmlFor="mora_monto_fijo" className="text-sm font-medium">
              Monto fijo por día (Q)
            </Label>
            <Input
              id="mora_monto_fijo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={(credito as any)?.mora_monto_fijo ?? ''}
              disabled={!canEditMora}
              readOnly={!canEditMora}
              className={!canEditMora ? 'opacity-90 bg-muted/50' : undefined}
              onChange={(e) =>
                onCreditoChange({ ...credito, mora_monto_fijo: e.target.value ? Number(e.target.value) : null })
              }
            />
            <p className="text-xs text-muted-foreground">
              Mora en quetzales por cada día de atraso después del vencimiento
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="tasa_mora" className="text-sm font-medium">
              Tasa de mora (% mensual)
            </Label>
            <Input
              id="tasa_mora"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="5"
              value={credito?.tasa_mora ?? ''}
              disabled={!canEditMora}
              readOnly={!canEditMora}
              className={!canEditMora ? 'opacity-90 bg-muted/50' : undefined}
              onChange={(e) => onCreditoChange({ ...credito, tasa_mora: Number(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Se convierte a tasa diaria para calcular mora por día de atraso
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="dias_gracia" className="text-sm font-medium">
            Días de Gracia (Opcional)
          </Label>
          <Input
            id="dias_gracia"
            type="number"
            min="0"
            max="30"
            placeholder="0"
            value={credito?.dias_gracia || ''}
            onChange={(e) => onCreditoChange({ ...credito, dias_gracia: Number(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground">
            Días adicionales antes de aplicar mora después del vencimiento
          </p>
        </div>
      </div>

      {/* Selector de Gastos Adicionales */}
      {credito?.monto_aprobado && credito.monto_aprobado > 0 && (
        <GastosCreditoSelector
          montoOtorgado={credito.monto_aprobado}
          gastosSeleccionados={(credito as any).gas_ids || []}
          onGastosChange={(gastoIds) => onCreditoChange({ ...credito, gas_ids: gastoIds } as any)}
          onTotalGastosChange={setTotalGastos}
          className="mt-4"
        />
      )}

      {simulacion && (
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Simulación del Crédito
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Tasa: {credito?.tasa_interes || 0}% mensual</strong> (aplicada {simulacion.periodoLabel}mente). 
              Los intereses se calculan sobre el monto total del crédito.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Desglose por período */}
            <div className="bg-background/80 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <h4 className="text-sm font-semibold mb-3 text-center">Desglose por Período ({simulacion.periodoLabel})</h4>
              <div className={`grid grid-cols-1 gap-3 ${simulacion.totalGastos && simulacion.totalGastos > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Interés {simulacion.periodoLabel}</p>
                  <MoneyDisplay amount={simulacion.interesPorPeriodo} className="text-base font-bold text-orange-600" />
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Capital {simulacion.periodoLabel}</p>
                  <MoneyDisplay amount={simulacion.capitalPorPeriodo} className="text-base font-bold text-blue-600" />
                </div>
                {simulacion.totalGastos && simulacion.totalGastos > 0 && (
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <p className="text-xs text-muted-foreground mb-1">Gastos {simulacion.periodoLabel}</p>
                    <MoneyDisplay amount={simulacion.gastosPorCuota || 0} className="text-base font-bold text-purple-600" />
                  </div>
                )}
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Cuota Total</p>
                  <MoneyDisplay amount={simulacion.cuotaPeriodica + (simulacion.gastosPorCuota || 0)} className="text-base font-bold text-primary" />
                </div>
              </div>
            </div>

            {/* Resumen total */}
            <div className={`grid grid-cols-1 gap-3 ${simulacion.totalGastos && simulacion.totalGastos > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Total Intereses</p>
                <MoneyDisplay amount={simulacion.totalIntereses} className="text-lg font-bold text-orange-600" />
                <p className="text-xs text-muted-foreground mt-1">
                  {credito?.numero_cuotas} {simulacion.periodoLabel}(es)
                </p>
              </div>
              {simulacion.totalGastos && simulacion.totalGastos > 0 && (
                <div className="p-3 bg-background rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Total Gastos</p>
                  <MoneyDisplay amount={simulacion.totalGastos} className="text-lg font-bold text-purple-600" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sin generar interés
                  </p>
                </div>
              )}
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Capital Inicial</p>
                <MoneyDisplay amount={credito?.monto_aprobado || 0} className="text-lg font-bold text-blue-600" />
              </div>
              <div className="p-3 bg-background rounded-lg border border-primary">
                <p className="text-xs text-muted-foreground mb-1">Total a Pagar</p>
                <MoneyDisplay amount={simulacion.totalAPagar} className="text-xl font-bold text-primary" />
                <p className="text-xs text-muted-foreground mt-1">
                  {credito?.numero_cuotas} cuotas
                </p>
              </div>
            </div>

            {credito?.dias_gracia && credito.dias_gracia > 0 && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-700 dark:text-blue-300">
                <strong>Días de gracia:</strong> {credito.dias_gracia} día(s) adicionales antes de aplicar mora
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onAnterior} size="lg" type="button">
          Anterior
        </Button>
        <Button onClick={handleSubmit} size="lg" type="button">
          Continuar
        </Button>
      </div>
    </div>
  )
}
