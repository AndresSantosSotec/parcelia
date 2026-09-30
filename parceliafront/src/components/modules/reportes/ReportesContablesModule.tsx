import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import {
  ChartBar,
  FilePdf,
  FileXls,
  Calendar as CalendarIcon,
  Storefront,
  CurrencyDollar,
  Receipt,
  Wallet,
  Package,
  ShoppingCart,
  Vault,
  CreditCard,
  Spinner,
  CheckCircle,
  WarningCircle,
  Book,
  ArrowUp,
  ArrowDown,
  Archive,
  ListNumbers,
  MagnifyingGlass,
  CaretUp,
  CaretDown,
  ArrowClockwise,
  TrendUp,
  TrendDown,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/lib/config'
import { api, sucursalService } from '@/lib/api'

// Períodos predefinidos
const PERIODOS_RAPIDOS = [
  { label: 'Hoy', days: 0 },
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Este mes', type: 'month' as const },
  { label: 'Mes anterior', type: 'lastMonth' as const },
  { label: 'Últimos 3 meses', months: 3 },
]

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface TipoReporte {
  id: string
  nombre: string
  descripcion: string
  icon: React.ReactNode
  endpoints: {
    pdf?: string
    excel?: string
    vistaPrevia?: string
  }
  parametros?: string[]
}

// ─── Reportes de Libros Contables ───────────────────────────────────────────

const REPORTES_BOVEDA: TipoReporte[] = [
  {
    id: 'bovedas',
    nombre: 'Estado de Bóvedas',
    descripcion: 'Saldos y estado de todas las bóvedas',
    icon: <Vault size={20} />,
    endpoints: {
      excel: '/bovedas/exportar',
    },
  },
  {
    id: 'consolidacion',
    nombre: 'Consolidación de Bóvedas',
    descripcion: 'Reporte consolidado de bóvedas',
    icon: <CurrencyDollar size={20} />,
    endpoints: {
      pdf: '/bovedas/consolidacion/pdf',
      excel: '/bovedas/consolidacion/exportar',
    },
  },
]

const REPORTES_LIBROS: TipoReporte[] = [
  {
    id: 'libro-diario',
    nombre: 'Libro Diario',
    descripcion: 'Registro cronológico de todas las transacciones contables',
    icon: <Book size={20} />,
    endpoints: {
      pdf: '/contabilidad/libro-diario/pdf',
    },
  },
  {
    id: 'balance-comprobacion',
    nombre: 'Balance de Comprobación',
    descripcion: 'Sumas y saldos de todas las cuentas contables',
    icon: <ListNumbers size={20} />,
    endpoints: {
      pdf: '/contabilidad/balance-comprobacion/pdf',
    },
  },
  {
    id: 'libro-mayor',
    nombre: 'Libro Mayor',
    descripcion: 'Movimientos detallados por cuenta contable',
    icon: <Archive size={20} />,
    endpoints: {
      pdf: '/contabilidad/libro-mayor/pdf',
    },
    parametros: ['cuenta_id=1'],
  },
]

// ─── Utilidades ─────────────────────────────────────────────────────────────

function formatMoney(value: any): string {
  const num = parseFloat(value)
  if (isNaN(num)) return String(value ?? '-')
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 }).format(num)
}

function formatDate(value: any): string {
  if (!value) return '-'
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es })
  } catch {
    return String(value)
  }
}

const MONEY_KEYS = ['monto', 'saldo', 'total', 'precio', 'monto_pagado', 'precio_venta_sugerido', 'saldo_inicial', 'saldo_final', 'diferencia', 'total_ingresos', 'total_egresos', 'total_esperado', 'valor_inventario', 'total_invertido', 'total_final', 'total_descuentos', 'saldo_pendiente', 'ticket_promedio', 'precio_compra', 'precio_venta', 'utilidad']
const DATE_KEYS = ['created_at', 'updated_at', 'fecha_compra', 'fecha_apertura', 'fecha_cierre', 'fecha', 'fecha_venta', 'fecha_desembolso', 'fecha_vencimiento']

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (typeof value === 'object') return '-'
  if (key === 'margen') {
    const num = parseFloat(value)
    if (!isNaN(num)) return num.toFixed(2) + '%'
  }
  if (MONEY_KEYS.some(k => key.toLowerCase().includes(k))) {
    const num = parseFloat(value)
    if (!isNaN(num)) return formatMoney(num)
  }
  if (DATE_KEYS.some(k => key.toLowerCase().includes(k))) {
    return formatDate(value)
  }
  return String(value)
}

function formatColumnName(key: string): string {
  const labels: Record<string, string> = {
    id: 'ID',
    created_at: 'Fecha/Hora',
    updated_at: 'Actualizado',
    tipo: 'Tipo',
    concepto: 'Concepto',
    monto: 'Monto',
    estado: 'Estado',
    saldo_inicial: 'Saldo Inicial',
    saldo_final: 'Saldo Final',
    diferencia: 'Diferencia',
    fecha_apertura: 'Apertura',
    fecha_cierre: 'Cierre',
    total_ingresos: 'Total Ingresos',
    total_egresos: 'Total Egresos',
    total_esperado: 'Esperado',
    total_movimientos: 'Movimientos',
    codigo_compra: 'Código',
    descripcion: 'Artículo (Descripción)',
    monto_pagado: 'Monto Pagado',
    precio_venta_sugerido: 'Precio Venta',
    fecha_compra: 'Fecha Compra',
    condicion: 'Condición',
    metodo_pago: 'Método Pago',
    // Ventas
    codigo_venta: 'Código Venta',
    tipo_venta: 'Tipo',
    cliente: 'Cliente',
    vendedor: 'Vendedor',
    sucursal: 'Sucursal',
    total_final: 'Total',
    total_descuentos: 'Descuentos',
    total_pagado: 'Pagado',
    saldo_pendiente: 'Saldo Pendiente',
    fecha_venta: 'Fecha Venta',
    precio_compra: 'P. Compra (Costo)',
    precio_original: 'P. Lista (Original)',
    descuento: 'Descuento',
    precio_final: 'P. Final (Cobrado)',
    precio_venta: 'P. Venta',
    utilidad: 'Utilidad',
    margen: '% Margen',
    porcentaje_diferencia: '% Diferencia',
    numero_credito: 'No. Crédito',
    estado_corte: 'Estado al Corte',
    articulos: 'Artículos',
    monto_otorgado: 'Monto Otorgado',
    capital_cobrado: 'Capital Cobrado',
    capital_pendiente: 'Capital Pendiente',
    interes_generado: 'Interés Generado',
    interes_cobrado: 'Interés Cobrado',
    interes_pendiente: 'Interés Pendiente',
    fecha_desembolso: 'Fecha Desembolso',
    fecha_vencimiento: 'Fecha Vencimiento',
  }
  return labels[key] ?? key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Qué columnas mostrar para cada tipo de reporte (para no mostrar todo)
const CAJA_COLS = ['id', 'tipo', 'concepto', 'monto', 'estado', 'created_at']
const CAJA_CONSOLIDADO_COLS = ['id', 'estado', 'saldo_inicial', 'saldo_final', 'diferencia', 'total_ingresos', 'total_egresos', 'total_movimientos', 'fecha_apertura']
const COMPRAS_COLS = ['codigo_compra', 'descripcion', 'monto_pagado', 'precio_venta_sugerido', 'estado', 'condicion', 'metodo_pago', 'fecha_compra']
const CREDITOS_VIGENTES_COLS = ['numero_credito', 'cliente', 'sucursal', 'estado_corte', 'fecha_desembolso', 'fecha_vencimiento', 'articulos', 'monto_otorgado', 'capital_cobrado', 'capital_pendiente', 'interes_generado', 'interes_cobrado', 'interes_pendiente', 'total_cobrado']

// ─── DateRangePicker ─────────────────────────────────────────────────────────

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  const handlePeriodoRapido = (periodo: (typeof PERIODOS_RAPIDOS)[0]) => {
    const today = new Date()
    let from: Date
    let to: Date = today

    if ('type' in periodo && periodo.type === 'month') {
      from = startOfMonth(today)
      to = endOfMonth(today)
    } else if ('type' in periodo && periodo.type === 'lastMonth') {
      from = startOfMonth(subMonths(today, 1))
      to = endOfMonth(subMonths(today, 1))
    } else if ('months' in periodo && periodo.months) {
      from = startOfMonth(subMonths(today, periodo.months - 1))
    } else {
      from = subDays(today, periodo.days || 0)
    }

    onChange({ from, to })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full sm:w-[280px] justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, 'dd/MM/yy', { locale: es })} –{' '}
                {format(value.to, 'dd/MM/yy', { locale: es })}
              </>
            ) : (
              format(value.from, 'dd/MM/yy', { locale: es })
            )
          ) : (
            <span>Seleccionar fechas</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            {PERIODOS_RAPIDOS.map(periodo => (
              <Button
                key={periodo.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handlePeriodoRapido(periodo)}
              >
                {periodo.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={1}
            locale={es}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── DataTable Genérico con columnas explícitas ───────────────────────────────

function DataTable({
  data,
  columns,
  loading,
}: {
  data: any[]
  columns?: string[]
  loading?: boolean
}) {
  const [paginaActual, setPaginaActual] = useState(1)
  const [registrosPorPagina, setRegistrosPorPagina] = useState(15)
  const [busqueda, setBusqueda] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<string | null>(null)
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc')

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ChartBar size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm">No hay registros para el período seleccionado</p>
      </div>
    )
  }

  // Determinar columnas a mostrar
  const allKeys =
    columns ??
    Array.from(
      new Set(data.flatMap(item => (typeof item === 'object' && item !== null ? Object.keys(item) : [])))
    )

  // Filtrar
  const datosFiltrados = data.filter(row => {
    if (!busqueda.trim()) return true
    const searchLower = busqueda.toLowerCase()
    return allKeys.some(key => {
      return formatValue(key, row[key]).toLowerCase().includes(searchLower)
    })
  })

  // Ordenar
  const datosOrdenados = [...datosFiltrados]
  if (ordenarPor) {
    datosOrdenados.sort((a, b) => {
      const aVal = a[ordenarPor]
      const bVal = b[ordenarPor]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direccionOrden === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return direccionOrden === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }

  // Paginar
  const totalRegistros = datosOrdenados.length
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosOrdenados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleOrden = (key: string) => {
    if (ordenarPor === key) {
      setDireccionOrden(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdenarPor(key)
      setDireccionOrden('asc')
    }
  }

  const isMoneyCol = (key: string) => MONEY_KEYS.some(k => key.toLowerCase().includes(k))
  const isTrendPositive = (key: string, val: any) => isMoneyCol(key) && typeof val === 'number' && val > 0

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'}
          </Badge>
          {busqueda && (
            <Badge variant="outline" className="text-xs">
              Filtrado: {datosFiltrados.length}
            </Badge>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar en resultados..."
            value={busqueda}
            onChange={e => {
              setBusqueda(e.target.value)
              setPaginaActual(1)
            }}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {allKeys.map(key => (
                  <TableHead
                    key={key}
                    className="font-semibold cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap text-xs"
                    onClick={() => toggleOrden(key)}
                  >
                    <div className="flex items-center gap-1">
                      {formatColumnName(key)}
                      {ordenarPor === key &&
                        (direccionOrden === 'asc' ? (
                          <CaretUp size={13} className="text-primary" />
                        ) : (
                          <CaretDown size={13} className="text-primary" />
                        ))}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {datosPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={allKeys.length} className="text-center py-10 text-muted-foreground text-sm">
                    No se encontraron coincidencias
                  </TableCell>
                </TableRow>
              ) : (
                datosPaginados.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                    {allKeys.map(key => {
                      const raw = row[key]
                      const formatted = formatValue(key, raw)
                      const isMoney = isMoneyCol(key) && typeof raw === 'number'
                      const isPositive = isTrendPositive(key, raw)
                      return (
                        <TableCell key={`${idx}-${key}`} className="text-xs whitespace-nowrap">
                          {isMoney ? (
                            <span className={cn('font-medium tabular-nums', raw < 0 ? 'text-destructive' : raw > 0 ? 'text-emerald-600 dark:text-emerald-400' : '')}>
                              {formatted}
                            </span>
                          ) : key === 'estado' ? (
                            <Badge
                              variant={
                                raw === 'abierta' || raw === 'activa' || raw === 'completada'
                                  ? 'default'
                                  : raw === 'cerrada' || raw === 'cancelada' || raw === 'vendida'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-xs"
                            >
                              {formatted}
                            </Badge>
                          ) : (
                            <span className="text-foreground/80">{formatted}</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginación */}
      {totalRegistros > 0 && (
        <DataTablePagination
          paginaActual={paginaActual}
          totalRegistros={totalRegistros}
          registrosPorPagina={registrosPorPagina}
          onCambiarPagina={p => {
            if (p >= 1 && p <= totalPaginas) setPaginaActual(p)
          }}
          onCambiarRegistrosPorPagina={v => {
            setRegistrosPorPagina(Number(v))
            setPaginaActual(1)
          }}
        />
      )}
    </div>
  )
}

// ─── Tarjeta de estadística ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'default',
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | null
  color?: 'default' | 'success' | 'danger' | 'warning'
}) {
  const colorCls = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-destructive',
    warning: 'text-amber-500',
  }[color]

  return (
    <Card className="border hover:border-primary/40 transition-colors">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className={cn('text-xl font-bold tabular-nums', colorCls)}>{value}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs', trend === 'up' ? 'text-emerald-500' : 'text-destructive')}>
            {trend === 'up' ? <TrendUp size={12} /> : <TrendDown size={12} />}
            <span>{trend === 'up' ? 'Ingresos' : 'Egresos'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tab de Caja ─────────────────────────────────────────────────────────────

function TabCaja({
  fechas,
  sucursalId,
  onDescargarPDF,
  onDescargarExcel,
}: {
  fechas: DateRange | undefined
  sucursalId: string
  onDescargarPDF: (endpoint: string, body?: any) => Promise<void>
  onDescargarExcel: (endpoint: string, params: Record<string, string>) => Promise<void>
}) {
  const [subTab, setSubTab] = useState<'movimientos' | 'consolidado'>('movimientos')
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [consolidado, setConsolidado] = useState<any[]>([])
  const [statsMovimientos, setStatsMovimientos] = useState<any>(null)
  const [statsConsolidado, setStatsConsolidado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {}
    if (fechas?.from) params.fecha_desde = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_hasta = format(fechas.to, 'yyyy-MM-dd')
    if (fechas?.from) params.fecha_inicio = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_fin = format(fechas.to, 'yyyy-MM-dd')
    if (sucursalId !== 'todas') params.sucursal_id = sucursalId
    return params
  }, [fechas, sucursalId])

  const cargarMovimientos = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams()
      const qs = new URLSearchParams(params).toString()
      const res = await api.get<any>(`/reportes/caja/movimientos?${qs}`)
      const raw = (res as any)
      const movs = raw.movimientos ?? raw.data ?? []
      const resumen = raw.resumen ?? null
      setMovimientos(Array.isArray(movs) ? movs : [])
      setStatsMovimientos(resumen)
    } catch (e: any) {
      toast.error('Error al cargar movimientos de caja: ' + (e.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const cargarConsolidado = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams()
      params.incluir_movimientos = '1'
      const qs = new URLSearchParams(params).toString()
      const res = await api.get<any>(`/reportes/caja/consolidado?${qs}`)
      const raw = (res as any)
      const cajas = raw.cajas ?? raw.data ?? []
      const estadisticas = raw.estadisticas ?? null
      setConsolidado(Array.isArray(cajas) ? cajas : [])
      setStatsConsolidado(estadisticas)
    } catch (e: any) {
      toast.error('Error al cargar consolidado de caja: ' + (e.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    if (subTab === 'movimientos') {
      cargarMovimientos()
    } else {
      cargarConsolidado()
    }
  }, [subTab, cargarMovimientos, cargarConsolidado])

  const handlePDF = async () => {
    setLoadingPDF(true)
    try {
      const params = buildParams()
      if (subTab === 'movimientos') {
        await onDescargarPDF('/reportes/caja/pdf', params)
      } else {
        await onDescargarPDF('/reportes/caja/consolidado-pdf', params)
      }
    } finally {
      setLoadingPDF(false)
    }
  }

  const handleExcel = async () => {
    setLoadingExcel(true)
    try {
      await onDescargarExcel('/reportes/caja/excel', buildParams())
    } finally {
      setLoadingExcel(false)
    }
  }

  const datos = subTab === 'movimientos' ? movimientos : consolidado
  const cols = subTab === 'movimientos' ? CAJA_COLS : CAJA_CONSOLIDADO_COLS
  const stats = subTab === 'movimientos' ? statsMovimientos : statsConsolidado

  return (
    <div className="space-y-5">
      {/* Header de acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={subTab === 'movimientos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubTab('movimientos')}
          >
            <Receipt size={15} className="mr-1.5" />
            Movimientos
          </Button>
          <Button
            variant={subTab === 'consolidado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubTab('consolidado')}
          >
            <Wallet size={15} className="mr-1.5" />
            Consolidado
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={subTab === 'movimientos' ? cargarMovimientos : cargarConsolidado}
            disabled={loading}
          >
            <ArrowClockwise size={15} className={cn('mr-1', loading && 'animate-spin')} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleExcel}
            disabled={loadingExcel || loading}
          >
            {loadingExcel ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FileXls size={15} className="mr-1.5" />}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handlePDF}
            disabled={loadingPDF || loading}
          >
            {loadingPDF ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FilePdf size={15} className="mr-1.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {subTab === 'movimientos' ? (
            <>
              <StatCard label="Total Movimientos" value={stats.total_movimientos ?? 0} icon={<Receipt size={18} />} />
              <StatCard label="Total Ingresos" value={formatMoney(stats.total_ingresos ?? 0)} icon={<ArrowUp size={18} />} color="success" trend="up" />
              <StatCard label="Total Egresos" value={formatMoney(stats.total_egresos ?? 0)} icon={<ArrowDown size={18} />} color="danger" trend="down" />
              <StatCard label="Saldo Neto" value={formatMoney(stats.saldo_neto ?? 0)} icon={<CurrencyDollar size={18} />} color={(stats.saldo_neto ?? 0) >= 0 ? 'success' : 'danger'} />
            </>
          ) : (
            <>
              <StatCard label="Total Cajas" value={stats.total_cajas ?? 0} icon={<Wallet size={18} />} />
              <StatCard label="Cajas Abiertas" value={stats.cajas_abiertas ?? 0} icon={<CheckCircle size={18} />} color="success" />
              <StatCard label="Total Ingresos" value={formatMoney(stats.total_ingresos ?? 0)} icon={<ArrowUp size={18} />} color="success" />
              <StatCard label="Total Egresos" value={formatMoney(stats.total_egresos ?? 0)} icon={<ArrowDown size={18} />} color="danger" />
            </>
          )}
        </div>
      )}

      {/* Tabla de datos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {subTab === 'movimientos' ? <Receipt size={17} /> : <Wallet size={17} />}
            {subTab === 'movimientos' ? 'Movimientos de Caja' : 'Consolidado de Cajas'}
          </CardTitle>
          <CardDescription className="text-xs">
            {fechas?.from && fechas?.to
              ? `${format(fechas.from, 'dd/MM/yyyy', { locale: es })} — ${format(fechas.to, 'dd/MM/yyyy', { locale: es })}`
              : 'Todos los registros'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={datos} columns={cols} loading={loading} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab de Compras ───────────────────────────────────────────────────────────

function TabCompras({
  fechas,
  sucursalId,
  onDescargarPDF,
  onDescargarExcel,
}: {
  fechas: DateRange | undefined
  sucursalId: string
  onDescargarPDF: (endpoint: string, body?: any) => Promise<void>
  onDescargarExcel: (endpoint: string, params: Record<string, string>) => Promise<void>
}) {
  const [compras, setCompras] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('all')

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {}
    if (fechas?.from) params.fecha_desde = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_hasta = format(fechas.to, 'yyyy-MM-dd')
    if (sucursalId !== 'todas') params.sucursal_id = sucursalId
    if (filtroEstado !== 'all') params.estado = filtroEstado
    return params
  }, [fechas, sucursalId, filtroEstado])

  const cargarCompras = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams()
      const qs = new URLSearchParams(params).toString()
      const res = await api.get<any>(`/reportes/compras/vista-previa?${qs}`)
      const raw = (res as any)
      // La API devuelve { success, data: { compras, estadisticas, total_registros } }
      const inner = raw.data ?? raw
      const comps = inner.compras ?? inner.data ?? []
      const stats = inner.estadisticas ?? null
      setCompras(Array.isArray(comps) ? comps : [])
      setEstadisticas(stats)
    } catch (e: any) {
      toast.error('Error al cargar compras: ' + (e.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    cargarCompras()
  }, [cargarCompras])

  const handlePDF = async () => {
    setLoadingPDF(true)
    try {
      await onDescargarPDF('/reportes/compras/pdf', buildParams())
    } finally {
      setLoadingPDF(false)
    }
  }

  const handleExcel = async () => {
    setLoadingExcel(true)
    try {
      await onDescargarExcel('/reportes/compras/excel', buildParams())
    } finally {
      setLoadingExcel(false)
    }
  }

  // Aplanar objeto de compra para mostrar en tabla (evitar objetos anidados)
  const comprasAplanadas = compras.map(c => {
    const flat: Record<string, any> = {}
    COMPRAS_COLS.forEach(key => {
      if (key in c) {
        flat[key] = c[key]
      }
    })
    // Campos de relaciones
    if (c.cliente) flat['cliente'] = `${c.cliente.nombres ?? ''} ${c.cliente.apellidos ?? ''}`.trim() || c.cliente.codigo_cliente
    if (c.categoria_producto) flat['categoria'] = c.categoria_producto.nombre
    return flat
  })

  const displayCols = [...COMPRAS_COLS, 'cliente', 'categoria'].filter(k =>
    comprasAplanadas.some(c => k in c)
  )

  return (
    <div className="space-y-5">
      {/* Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filtroEstado} onValueChange={v => { setFiltroEstado(v) }}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="vendida">Vendida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={cargarCompras} disabled={loading}>
            <ArrowClockwise size={15} className={cn('mr-1', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleExcel}
            disabled={loadingExcel || loading}
          >
            {loadingExcel ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FileXls size={15} className="mr-1.5" />}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handlePDF}
            disabled={loadingPDF || loading}
          >
            {loadingPDF ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FilePdf size={15} className="mr-1.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Compras" value={estadisticas.total_compras ?? 0} icon={<ShoppingCart size={18} />} />
          <StatCard label="Total Invertido" value={formatMoney(estadisticas.total_invertido ?? 0)} icon={<CurrencyDollar size={18} />} color="warning" />
          <StatCard label="Valor Inventario" value={formatMoney(estadisticas.valor_inventario ?? 0)} icon={<Package size={18} />} color="success" />
          <StatCard label="Compras Activas" value={estadisticas.compras_activas ?? 0} icon={<CheckCircle size={18} />} color="success" />
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart size={17} />
            Compras Directas
          </CardTitle>
          <CardDescription className="text-xs">
            {fechas?.from && fechas?.to
              ? `${format(fechas.from, 'dd/MM/yyyy', { locale: es })} — ${format(fechas.to, 'dd/MM/yyyy', { locale: es })}`
              : 'Todos los registros'}
            {filtroEstado !== 'all' && ` · Estado: ${filtroEstado}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={comprasAplanadas} columns={displayCols} loading={loading} />
        </CardContent>
      </Card>
    </div>
  )
}

// Columnas a mostrar en la tabla de ventas del reporte:
// Incluye precio_original, descuento y precio_final para ver el desglose completo
const VENTAS_COLS = [
  'codigo_venta',
  'fecha_venta',
  'cliente',
  'descripcion',
  'precio_compra',
  'precio_original',
  'descuento',
  'precio_final',
  'utilidad',
  'margen',
  'estado',
]

// ─── Tab de Ventas ────────────────────────────────────────────────────────────

function TabVentas({
  fechas,
  sucursalId,
  onDescargarPDF,
  onDescargarExcel,
}: {
  fechas: DateRange | undefined
  sucursalId: string
  onDescargarPDF: (endpoint: string, body?: any) => Promise<void>
  onDescargarExcel: (endpoint: string, params: Record<string, string>) => Promise<void>
}) {
  const [ventas, setVentas] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroTipo, setFiltroTipo] = useState('all')

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {}
    if (fechas?.from) params.fecha_desde = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_hasta = format(fechas.to, 'yyyy-MM-dd')
    if (sucursalId !== 'todas') params.sucursal_id = sucursalId
    if (filtroEstado !== 'all') params.estado = filtroEstado
    if (filtroTipo !== 'all') params.tipo_venta = filtroTipo
    return params
  }, [fechas, sucursalId, filtroEstado, filtroTipo])

  const cargarVentas = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams(buildParams()).toString()
      const res = await api.get<any>(`/reportes/ventas/vista-previa?${qs}`)
      const inner = (res as any).data ?? res
      setVentas(Array.isArray(inner.ventas) ? inner.ventas : [])
      setEstadisticas(inner.estadisticas ?? null)
    } catch (e: any) {
      toast.error('Error al cargar ventas: ' + (e.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    cargarVentas()
  }, [cargarVentas])

  const handlePDF = async () => {
    setLoadingPDF(true)
    try {
      await onDescargarPDF('/reportes/ventas/pdf', buildParams())
    } finally {
      setLoadingPDF(false)
    }
  }

  const handleExcel = async () => {
    setLoadingExcel(true)
    try {
      await onDescargarExcel('/reportes/ventas/excel', buildParams())
    } finally {
      setLoadingExcel(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filtroEstado} onValueChange={v => setFiltroEstado(v)}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pagada">Pagada</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v)}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="contado">Contado</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="apartado">Apartado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={cargarVentas} disabled={loading}>
            <ArrowClockwise size={15} className={cn('mr-1', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleExcel}
            disabled={loadingExcel || loading}
          >
            {loadingExcel ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FileXls size={15} className="mr-1.5" />}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handlePDF}
            disabled={loadingPDF || loading}
          >
            {loadingPDF ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FilePdf size={15} className="mr-1.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Ventas" value={estadisticas.total_ventas ?? 0} icon={<CreditCard size={18} />} />
          <StatCard label="Total Ingresos" value={formatMoney(estadisticas.total_ingresos ?? 0)} icon={<CurrencyDollar size={18} />} color="success" trend="up" />
          <StatCard label="Total Descuentos" value={formatMoney(estadisticas.total_descuentos ?? 0)} icon={<ArrowDown size={18} />} color="warning" />
          <StatCard label="Ticket Promedio" value={formatMoney(estadisticas.ticket_promedio ?? 0)} icon={<TrendUp size={18} />} color="default" />
        </div>
      )}

      {estadisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Contado" value={estadisticas.ventas_contado ?? 0} icon={<Wallet size={18} />} color="success" />
          <StatCard label="Crédito" value={estadisticas.ventas_credito ?? 0} icon={<CreditCard size={18} />} color="warning" />
          <StatCard label="Apartado" value={estadisticas.ventas_apartado ?? 0} icon={<Package size={18} />} color="default" />
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={17} />
            Ventas
          </CardTitle>
          <CardDescription className="text-xs">
            {fechas?.from && fechas?.to
              ? `${format(fechas.from, 'dd/MM/yyyy', { locale: es })} — ${format(fechas.to, 'dd/MM/yyyy', { locale: es })}`
              : 'Todos los registros'}
            {filtroEstado !== 'all' && ` · Estado: ${filtroEstado}`}
            {filtroTipo !== 'all' && ` · Tipo: ${filtroTipo}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={ventas} columns={VENTAS_COLS} loading={loading} />
        </CardContent>
      </Card>
    </div>
  )
}

function TabCreditosVigentes({
  fechas,
  sucursalId,
  onDescargarPDF,
  onDescargarExcel,
}: {
  fechas: DateRange | undefined
  sucursalId: string
  onDescargarPDF: (endpoint: string, body?: any) => Promise<void>
  onDescargarExcel: (endpoint: string, params: Record<string, string>) => Promise<void>
}) {
  const [creditos, setCreditos] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {}
    if (fechas?.from) params.fecha_desde = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_hasta = format(fechas.to, 'yyyy-MM-dd')
    if (fechas?.from) params.fecha_inicio = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_fin = format(fechas.to, 'yyyy-MM-dd')

    const fechaCorte = fechas?.to ?? fechas?.from ?? new Date()
    params.fecha_corte = format(fechaCorte, 'yyyy-MM-dd')

    if (sucursalId !== 'todas') params.sucursal_id = sucursalId
    return params
  }, [fechas, sucursalId])

  const cargarCreditos = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams(buildParams()).toString()
      const res = await api.get<any>(`/reportes/creditos/vigentes/vista-previa?${qs}`)
      const inner = (res as any).data ?? res
      setCreditos(Array.isArray(inner.creditos) ? inner.creditos : [])
      setEstadisticas(inner.estadisticas ?? null)
    } catch (e: any) {
      toast.error('Error al cargar créditos vigentes: ' + (e.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    cargarCreditos()
  }, [cargarCreditos])

  const handlePDF = async () => {
    setLoadingPDF(true)
    try {
      await onDescargarPDF('/reportes/creditos/vigentes/pdf', buildParams())
    } finally {
      setLoadingPDF(false)
    }
  }

  const handleExcel = async () => {
    setLoadingExcel(true)
    try {
      await onDescargarExcel('/reportes/creditos/vigentes/excel', buildParams())
    } finally {
      setLoadingExcel(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Badge variant="secondary" className="h-9 px-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            Corte al {format(fechas?.to ?? fechas?.from ?? new Date(), 'dd/MM/yyyy', { locale: es })}
          </Badge>
          <Button variant="ghost" size="sm" onClick={cargarCreditos} disabled={loading}>
            <ArrowClockwise size={15} className={cn('mr-1', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleExcel}
            disabled={loadingExcel || loading}
          >
            {loadingExcel ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FileXls size={15} className="mr-1.5" />}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handlePDF}
            disabled={loadingPDF || loading}
          >
            {loadingPDF ? <Spinner size={14} className="animate-spin mr-1.5" /> : <FilePdf size={15} className="mr-1.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {estadisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Créditos Vigentes" value={estadisticas.total_creditos ?? 0} icon={<CreditCard size={18} />} />
          <StatCard label="Capital Pendiente" value={formatMoney(estadisticas.capital_pendiente ?? 0)} icon={<WarningCircle size={18} />} color="warning" />
          <StatCard label="Interés Generado" value={formatMoney(estadisticas.interes_generado ?? 0)} icon={<TrendUp size={18} />} color="success" />
          <StatCard label="Interés Cobrado" value={formatMoney(estadisticas.interes_cobrado ?? 0)} icon={<CurrencyDollar size={18} />} color="default" />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={17} />
            Créditos Vigentes al Corte
          </CardTitle>
          <CardDescription className="text-xs">
            Saldo e intereses calculados con fecha de corte histórica usando la fecha final del período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={creditos} columns={CREDITOS_VIGENTES_COLS} loading={loading} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab de Libros Contables simple ──────────────────────────────────────────

function ReporteCardSimple({
  reporte,
  fechas,
  onDescargarPDF,
}: {
  reporte: TipoReporte
  fechas: DateRange | undefined
  onDescargarPDF: (endpoint: string, params?: Record<string, string>) => Promise<void>
}) {
  const [loadingPDF, setLoadingPDF] = useState(false)

  const buildParams = () => {
    const params: Record<string, string> = {}
    if (fechas?.from) params.fecha_inicio = format(fechas.from, 'yyyy-MM-dd')
    if (fechas?.to) params.fecha_fin = format(fechas.to, 'yyyy-MM-dd')
    if (reporte.parametros) {
      reporte.parametros.forEach(p => {
        const [k, v] = p.split('=')
        params[k] = v
      })
    }
    return params
  }

  const handlePDF = async () => {
    setLoadingPDF(true)
    try {
      await onDescargarPDF(reporte.endpoints.pdf!, buildParams())
    } finally {
      setLoadingPDF(false)
    }
  }

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {reporte.icon}
          {reporte.nombre}
        </CardTitle>
        <CardDescription className="text-xs">{reporte.descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {reporte.endpoints.pdf && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              disabled={loadingPDF}
              onClick={handlePDF}
            >
              {loadingPDF ? <Spinner className="animate-spin mr-1" size={14} /> : <FilePdf size={14} className="mr-1" />}
              Descargar PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function ReportesContablesModule() {
  const [fechas, setFechas] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }))
  const [sucursalId, setSucursalId] = useState<string>('todas')
  const [sucursales, setSucursales] = useState<Array<{ id: string; codigo: string; nombre: string }>>([])
  const [loadingSucursales, setLoadingSucursales] = useState(true)

  // Cargar sucursales al montar
  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await sucursalService.getActivas()
        if (response.data) {
          setSucursales(response.data as any)
        }
      } catch (err) {
        console.error('Error al cargar sucursales:', err)
      } finally {
        setLoadingSucursales(false)
      }
    }
    cargar()
  }, [])

  // ─ Descarga PDF (POST o GET) ──────────────────────────────────────────────
  const handleDescargarPDF = useCallback(
    async (endpoint: string, paramsOrBody?: Record<string, string>) => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Sin sesión activa')
        return
      }
      try {
        // Para caja usamos POST, para el resto GET
        const isPost = endpoint.includes('caja') && endpoint.includes('pdf')
        let response: Response
        if (isPost) {
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(paramsOrBody ?? {}),
          })
        } else {
          const qs = paramsOrBody ? `?${new URLSearchParams(paramsOrBody).toString()}` : ''
          response = await fetch(`${API_BASE_URL}${endpoint}${qs}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
          })
        }

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const cd = response.headers.get('Content-Disposition')
        const match = cd?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        a.download = match ? match[1].replace(/['"]/g, '') : `reporte_${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('PDF descargado exitosamente')
      } catch (e: any) {
        toast.error('Error al descargar PDF: ' + (e.message ?? ''))
      }
    },
    []
  )

  // ─ Descarga Excel (GET) ───────────────────────────────────────────────────
  const handleDescargarExcel = useCallback(
    async (endpoint: string, params: Record<string, string>) => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Sin sesión activa')
        return
      }
      try {
        const qs = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : ''
        const response = await fetch(`${API_BASE_URL}${endpoint}${qs}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv' },
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const cd = response.headers.get('Content-Disposition')
        const match = cd?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        const ext = blob.type.includes('csv') ? '.csv' : '.xlsx'
        a.download = match ? match[1].replace(/['"]/g, '') : `reporte_${Date.now()}${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Excel descargado exitosamente')
      } catch (e: any) {
        toast.error('Error al descargar Excel: ' + (e.message ?? ''))
      }
    },
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChartBar size={28} />
            Reportes Contables
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visualiza y exporta reportes financieros y operativos del sistema
          </p>
        </div>
      </div>

      {/* Filtros globales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Parámetros del Reporte</CardTitle>
          <CardDescription className="text-xs">Configura el período y sucursal para filtrar los datos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Período</label>
              <DateRangePicker value={fechas} onChange={setFechas} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sucursal</label>
              <Select value={sucursalId} onValueChange={setSucursalId} disabled={loadingSucursales}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder={loadingSucursales ? 'Cargando...' : 'Todas las sucursales'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">
                    <div className="flex items-center gap-2">
                      <Storefront size={14} />
                      Todas las sucursales
                    </div>
                  </SelectItem>
                  {sucursales.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <div className="flex items-center gap-2">
                        <Storefront size={14} />
                        {s.codigo} – {s.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fechas?.from && fechas?.to && (
              <div className="flex items-end">
                <Badge variant="secondary" className="h-10 px-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  {format(fechas.from, 'dd MMM', { locale: es })} – {format(fechas.to, 'dd MMM yyyy', { locale: es })}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs principales */}
      <Tabs defaultValue="caja" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="caja" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <Wallet size={16} />
            <span>Caja</span>
          </TabsTrigger>
          <TabsTrigger value="ventas" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <CreditCard size={16} />
            <span>Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="creditos" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <Receipt size={16} />
            <span>Créditos</span>
          </TabsTrigger>
          <TabsTrigger value="compras" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <ShoppingCart size={16} />
            <span>Compras</span>
          </TabsTrigger>
          <TabsTrigger value="boveda" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <Vault size={16} />
            <span>Bóveda</span>
          </TabsTrigger>
          <TabsTrigger value="libros" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <Book size={16} />
            <span>Libros</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Caja */}
        <TabsContent value="caja">
          <TabCaja
            fechas={fechas}
            sucursalId={sucursalId}
            onDescargarPDF={handleDescargarPDF}
            onDescargarExcel={handleDescargarExcel}
          />
        </TabsContent>

        {/* Tab Ventas */}
        <TabsContent value="ventas">
          <TabVentas
            fechas={fechas}
            sucursalId={sucursalId}
            onDescargarPDF={handleDescargarPDF}
            onDescargarExcel={handleDescargarExcel}
          />
        </TabsContent>

        <TabsContent value="creditos">
          <TabCreditosVigentes
            fechas={fechas}
            sucursalId={sucursalId}
            onDescargarPDF={handleDescargarPDF}
            onDescargarExcel={handleDescargarExcel}
          />
        </TabsContent>

        {/* Tab Compras */}
        <TabsContent value="compras">
          <TabCompras
            fechas={fechas}
            sucursalId={sucursalId}
            onDescargarPDF={handleDescargarPDF}
            onDescargarExcel={handleDescargarExcel}
          />
        </TabsContent>

        {/* Tab Bóveda */}
        <TabsContent value="boveda">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Reportes de Bóveda</h3>
              <p className="text-sm text-muted-foreground">Estados y consolidados de bóvedas de sucursales</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTES_BOVEDA.map(r => (
                <Card key={r.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {r.icon}
                      {r.nombre}
                    </CardTitle>
                    <CardDescription className="text-xs">{r.descripcion}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {r.endpoints.pdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-red-600 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const p: Record<string, string> = {}
                            if (fechas?.from) p.fecha_inicio = format(fechas.from, 'yyyy-MM-dd')
                            if (fechas?.to) p.fecha_fin = format(fechas.to, 'yyyy-MM-dd')
                            if (sucursalId !== 'todas') p.sucursal_id = sucursalId
                            handleDescargarPDF(r.endpoints.pdf!, p)
                          }}
                        >
                          <FilePdf size={14} className="mr-1" /> PDF
                        </Button>
                      )}
                      {r.endpoints.excel && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-green-600 text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const p: Record<string, string> = {}
                            if (fechas?.from) p.fecha_inicio = format(fechas.from, 'yyyy-MM-dd')
                            if (fechas?.to) p.fecha_fin = format(fechas.to, 'yyyy-MM-dd')
                            if (sucursalId !== 'todas') p.sucursal_id = sucursalId
                            handleDescargarExcel(r.endpoints.excel!, p)
                          }}
                        >
                          <FileXls size={14} className="mr-1" /> Excel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab Libros Contables */}
        <TabsContent value="libros">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Libros Contables</h3>
              <p className="text-sm text-muted-foreground">Libro diario, balance de comprobación y libro mayor</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTES_LIBROS.map(r => (
                <ReporteCardSimple
                  key={r.id}
                  reporte={r}
                  fechas={fechas}
                  onDescargarPDF={handleDescargarPDF}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
