import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MagnifyingGlass,
  FunnelSimple,
  ArrowsClockwise,
  ShieldCheck,
  Calendar as CalendarIcon,
  User,
  Storefront,
  CaretLeft,
  CaretRight,
  ChartBar,
  Eye,
  DownloadSimple,
  X,
  ArrowRight,
  Info,
  Clock,
  Globe,
  Desktop,
  ListBullets,
  Rows
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { auditoriaService, AuditoriaLog, AuditoriaFilters, AuditoriaEstadisticas } from '@/lib/auditoria-api'
import { SystemErrors } from './SystemErrors'
import { LaravelLogsViewer } from './LaravelLogsViewer'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

// Componente para comparar JSON (datos anteriores vs nuevos) - Versión compacta
function JsonDiff({ anterior, nuevo }: { anterior: any; nuevo: any }) {
  const [showAll, setShowAll] = useState(false)
  const [onlyChanges, setOnlyChanges] = useState(true)

  if (!anterior && !nuevo) return <span className="text-muted-foreground text-xs">Sin cambios registrados</span>

  const allKeys = Array.from(new Set([
    ...Object.keys(anterior || {}),
    ...Object.keys(nuevo || {})
  ])).filter(key => key !== '_error_respuesta').sort()

  // Identificar cambios
  const changedKeys = allKeys.filter(key =>
    JSON.stringify(anterior?.[key]) !== JSON.stringify(nuevo?.[key])
  )

  const keysToShow = onlyChanges ? changedKeys : allKeys
  const maxVisible = 6
  const visibleKeys = showAll ? keysToShow : keysToShow.slice(0, maxVisible)
  const hiddenCount = keysToShow.length - maxVisible

  // Formatear valor (truncar si es muy largo)
  const fmt = (val: any): string => {
    if (val === undefined || val === null) return 'null'
    const s = JSON.stringify(val)
    return s.length > 40 ? s.slice(0, 37) + '…' : s
  }

  return (
    <div className="space-y-1.5">
      {/* Header con stats y toggle */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
        <div className="flex gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600">
            {changedKeys.length} cambios
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {allKeys.length} total
          </span>
        </div>
        <button
          onClick={() => setOnlyChanges(!onlyChanges)}
          className="text-[10px] text-primary hover:underline"
        >
          {onlyChanges ? 'Ver todos' : 'Solo cambios'}
        </button>
      </div>

      {/* Lista de campos */}
      <div className="space-y-0.5 max-h-[180px] overflow-y-auto pr-1">
        {visibleKeys.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-2 text-center">
            {onlyChanges ? 'No hay cambios' : 'No hay datos'}
          </p>
        ) : (
          visibleKeys.map((key) => {
            const prev = anterior?.[key]
            const next = nuevo?.[key]
            const changed = JSON.stringify(prev) !== JSON.stringify(next)

            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[90px_1fr] gap-1 px-1 py-0.5 rounded text-[10px]",
                  changed ? "bg-yellow-500/10" : "bg-transparent"
                )}
              >
                <span className="font-mono truncate text-muted-foreground" title={key}>
                  {key}
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  {changed ? (
                    <>
                      <span className="text-red-400 line-through truncate" title={JSON.stringify(prev)}>
                        {fmt(prev)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-400 truncate" title={JSON.stringify(next)}>
                        {fmt(next)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground truncate" title={JSON.stringify(next ?? prev)}>
                      {fmt(next ?? prev)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Expandir/Colapsar */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-[10px] text-center py-1 text-primary hover:underline border-t border-border/50"
        >
          {showAll ? '▲ Menos' : `▼ ${hiddenCount} más`}
        </button>
      )}
    </div>
  )
}

// Componente DateRangePicker
function DateRangePicker({
  value,
  onChange
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon size={16} className="mr-2" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "dd/MM/yy")} - {format(value.to, "dd/MM/yy")}
              </>
            ) : (
              format(value.from, "dd/MM/yyyy")
            )
          ) : (
            "Seleccionar fechas"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={(range) => {
            onChange(range)
            if (range?.from && range?.to) setOpen(false)
          }}
          numberOfMonths={2}
          locale={es}
        />
        <div className="flex gap-2 p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ from: subDays(new Date(), 7), to: new Date() })}
          >
            Últimos 7 días
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ from: subDays(new Date(), 30), to: new Date() })}
          >
            Últimos 30 días
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            Limpiar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function AuditoriaModule() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AuditoriaFilters>({
    page: 1,
    per_page: 20,
  })
  const [modulos, setModulos] = useState<string[]>([])
  const [acciones, setAcciones] = useState<string[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [estadisticas, setEstadisticas] = useState<AuditoriaEstadisticas | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [activeTab, setActiveTab] = useState<'operaciones' | 'errores' | 'laravel'>('operaciones')

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    cargarLogs()
  }, [filters])

  useEffect(() => {
    if (dateRange?.from) {
      setFilters(prev => ({
        ...prev,
        fecha_desde: format(startOfDay(dateRange.from!), 'yyyy-MM-dd'),
        fecha_hasta: dateRange.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : undefined,
        page: 1
      }))
    } else {
      setFilters(prev => {
        const { fecha_desde, fecha_hasta, ...rest } = prev
        return { ...rest, page: 1 }
      })
    }
  }, [dateRange])

  const cargarDatos = async () => {
    await Promise.all([cargarLogs(), cargarModulos(), cargarAcciones(), cargarEstadisticas()])
  }

  const cargarLogs = async () => {
    setLoading(true)
    try {
      const response = await auditoriaService.getLogs(filters)
      if (response.success) {
        setLogs(response.data)
        setTotalPages(response.pagination?.last_page || 1)
        setTotalItems(response.pagination?.total || 0)
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar logs de auditoría')
    } finally {
      setLoading(false)
    }
  }

  const cargarModulos = async () => {
    try {
      const response = await auditoriaService.getModulos()
      if (response.success) {
        setModulos(response.data)
      }
    } catch (error) {
      console.error('Error cargando módulos:', error)
    }
  }

  const cargarAcciones = async () => {
    try {
      const response = await auditoriaService.getAcciones()
      if (response.success) {
        setAcciones(response.data)
      }
    } catch (error) {
      console.error('Error cargando acciones:', error)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const response = await auditoriaService.getEstadisticas()
      if (response.success) {
        setEstadisticas(response.data)
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const handleBuscar = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }, [])

  const handleFiltrarModulo = (modulo: string) => {
    setFilters(prev => ({ ...prev, modulo: modulo === 'todos' ? undefined : modulo, page: 1 }))
  }

  const handleFiltrarAccion = (accion: string) => {
    setFilters(prev => ({ ...prev, accion: accion === 'todas' ? undefined : accion, page: 1 }))
  }

  const handleFiltrarEstado = (estado: string) => {
    setFilters(prev => ({ ...prev, estado: estado === 'todos' ? undefined : estado as 'exito' | 'error', page: 1 }))
  }

  const handlePaginaAnterior = () => {
    if (filters.page && filters.page > 1) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))
    }
  }

  const handlePaginaSiguiente = () => {
    if (filters.page && filters.page < totalPages) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))
    }
  }

  const handleVerDetalle = (log: AuditoriaLog) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  const handleLimpiarFiltros = () => {
    setFilters({ page: 1, per_page: 20 })
    setDateRange(undefined)
  }

  const handleExportarCSV = () => {
    if (logs.length === 0) {
      toast.warning('No hay datos para exportar')
      return
    }

    const headers = ['Fecha', 'Usuario', 'Módulo', 'Acción', 'Sucursal', 'Descripción', 'IP', 'Tabla', 'Registro ID']
    const rows = logs.map(log => [
      formatearFecha(log.created_at),
      log.usuario?.username || 'Sistema',
      log.modulo,
      log.accion,
      log.sucursal?.nombre || 'N/A',
      log.descripcion || '',
      log.ip_address || '',
      log.tabla || '',
      log.registro_id || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auditoria_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Exportación completada')
  }

  const formatearFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd MMM yyyy HH:mm:ss", { locale: es })
    } catch {
      return fecha
    }
  }

  const getAccionColor = (accion: string) => {
    const lowerAccion = accion.toLowerCase()
    if (lowerAccion.includes('login')) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
    if (lowerAccion.includes('logout')) return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30'
    if (lowerAccion.includes('crear') || lowerAccion.includes('apertura')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
    if (lowerAccion.includes('actual') || lowerAccion.includes('edit') || lowerAccion.includes('modific')) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
    if (lowerAccion.includes('elimin') || lowerAccion.includes('cancel')) return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
    if (lowerAccion.includes('export') || lowerAccion.includes('report')) return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30'
    if (lowerAccion.includes('pago') || lowerAccion.includes('abono')) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
    if (lowerAccion.includes('venta')) return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30'
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30'
  }

  const filtrosActivos = useMemo(() => {
    return [
      filters.modulo && `Módulo: ${filters.modulo}`,
      filters.accion && `Acción: ${filters.accion}`,
      filters.estado && `Estado: ${filters.estado === 'exito' ? 'Éxito' : 'Error'}`,
      filters.search && `Buscar: "${filters.search}"`,
      dateRange?.from && `Desde: ${format(dateRange.from, 'dd/MM/yy')}`,
      dateRange?.to && `Hasta: ${format(dateRange.to, 'dd/MM/yy')}`,
    ].filter(Boolean)
  }, [filters, dateRange])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck size={32} weight="duotone" />
            Auditoría del Sistema
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Supervisión y seguimiento de todas las operaciones del sistema
          </p>
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'operaciones' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('operaciones')}
          >
            Bitácora de Operaciones
          </Button>
          <Button
            variant={activeTab === 'errores' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('errores')}
          >
            Errores de Servidor
          </Button>
          <Button
            variant={activeTab === 'laravel' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('laravel')}
            title="Ver los logs del backend Laravel"
          >
            Terminal Laravel
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarCSV}
            disabled={loading || logs.length === 0}
          >
            <DownloadSimple size={16} className="mr-1" />
            Exportar CSV
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none h-9 w-9"
              onClick={() => setViewMode('table')}
            >
              <Rows size={16} />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none h-9 w-9"
              onClick={() => setViewMode('cards')}
            >
              <ListBullets size={16} />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => cargarDatos()}
            disabled={loading}
          >
            <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {activeTab === 'errores' ? (
        <SystemErrors />
      ) : activeTab === 'laravel' ? (
        <LaravelLogsViewer />
      ) : (
        <>
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FunnelSimple size={20} />
                  Filtros
                </CardTitle>
                {filtrosActivos.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleLimpiarFiltros}>
                    <X size={14} className="mr-1" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
              {filtrosActivos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filtrosActivos.map((filtro, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {filtro}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder="Buscar usuario, descripción..."
                    className="pl-10"
                    onChange={(e) => handleBuscar(e.target.value)}
                  />
                </div>
                <Select onValueChange={handleFiltrarModulo} value={filters.modulo || 'todos'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los módulos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los módulos</SelectItem>
                    {modulos.map((modulo) => (
                      <SelectItem key={modulo} value={modulo}>
                        {modulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={handleFiltrarAccion} value={filters.accion || 'todas'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las acciones</SelectItem>
                    {acciones.map((accion) => (
                      <SelectItem key={accion} value={accion}>
                        {accion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={handleFiltrarEstado} value={filters.estado || 'todos'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="exito">Éxito</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas rápidas */}
          {estadisticas && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ChartBar size={24} className="text-primary" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{estadisticas.total_acciones.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total acciones</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ListBullets size={24} className="text-blue-500" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{estadisticas.por_modulo?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Módulos activos</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <User size={24} className="text-green-500" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{estadisticas.por_usuario?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Usuarios activos</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Storefront size={24} className="text-purple-500" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{estadisticas.por_sucursal?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Sucursales</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Tabla de logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Registros de Auditoría ({totalItems.toLocaleString()})</span>
              </CardTitle>
              <CardDescription>
                Página {filters.page} de {totalPages} • {logs.length} registros mostrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Fecha/Hora</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="max-w-[200px]">Descripción</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          </TableRow>
                        ))
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No se encontraron registros
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleVerDetalle(log)}
                          >
                            <TableCell className="whitespace-nowrap text-xs">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-muted-foreground" />
                                {formatearFecha(log.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-muted-foreground" />
                                <span className="text-sm font-medium">{log.usuario?.username || 'Sistema'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.modulo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("border", getAccionColor(log.accion))}>
                                {log.accion}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.codigo_respuesta ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    log.codigo_respuesta >= 200 && log.codigo_respuesta < 300
                                      ? "bg-green-500/10 text-green-700 border-green-500/30"
                                      : log.codigo_respuesta >= 400
                                        ? "bg-red-500/10 text-red-700 border-red-500/30"
                                        : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                                  )}
                                >
                                  {log.codigo_respuesta}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {log.descripcion || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleVerDetalle(log)
                                }}
                              >
                                <Eye size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Vista de tarjetas para móvil */
                <div className="space-y-3">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i} className="p-4">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-2/3" />
                      </Card>
                    ))
                  ) : logs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No se encontraron registros
                    </div>
                  ) : (
                    logs.map((log) => (
                      <Card
                        key={log.id}
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleVerDetalle(log)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{log.modulo}</Badge>
                              <Badge className={cn("border", getAccionColor(log.accion))}>{log.accion}</Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{log.descripcion || 'Sin descripción'}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {log.usuario?.username || 'Sistema'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatearFecha(log.created_at)}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <Eye size={16} />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Paginación */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                <p className="text-sm text-muted-foreground">
                  Mostrando {logs.length} de {totalItems.toLocaleString()} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePaginaAnterior}
                    disabled={!filters.page || filters.page === 1 || loading}
                  >
                    <CaretLeft size={16} />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>
                  <span className="text-sm px-3 py-1 bg-muted rounded">
                    {filters.page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePaginaSiguiente}
                    disabled={!filters.page || filters.page === totalPages || loading}
                  >
                    <span className="hidden sm:inline mr-1">Siguiente</span>
                    <CaretRight size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dialog de detalle - Optimizado para contenido largo */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
              <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-3 border-b">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Info size={18} />
                  Detalle de Auditoría
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Registro #{selectedLog?.id}
                </DialogDescription>
              </DialogHeader>

              {selectedLog && (
                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                  <div className="space-y-3">
                    {/* Info general - Layout ultra compacto */}
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Fecha:</span>{' '}
                        <span className="font-medium">{formatearFecha(selectedLog.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Usuario:</span>{' '}
                        <span className="font-medium">{selectedLog.usuario?.username || 'Sistema'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP:</span>{' '}
                        <span className="font-mono">{selectedLog.ip_address || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Badges de info */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-5">{selectedLog.modulo}</Badge>
                      <Badge className={cn("text-[10px] h-5", getAccionColor(selectedLog.accion))}>{selectedLog.accion}</Badge>
                      {selectedLog.tabla && (
                        <Badge variant="secondary" className="text-[10px] h-5 font-mono">{selectedLog.tabla}</Badge>
                      )}
                      {selectedLog.registro_id && (
                        <Badge variant="secondary" className="text-[10px] h-5 font-mono">ID:{selectedLog.registro_id}</Badge>
                      )}
                      {selectedLog.codigo_respuesta && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-5",
                            selectedLog.codigo_respuesta >= 200 && selectedLog.codigo_respuesta < 300
                              ? "bg-green-500/15 text-green-600 border-green-500/30"
                              : "bg-red-500/15 text-red-600 border-red-500/30"
                          )}
                        >
                          {selectedLog.codigo_respuesta}
                        </Badge>
                      )}
                      {selectedLog.tiempo_respuesta_ms != null && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {selectedLog.tiempo_respuesta_ms.toFixed(0)}ms
                        </Badge>
                      )}
                    </div>

                    {/* Descripción */}
                    {selectedLog.descripcion && (
                      <div className="text-xs bg-muted/50 p-2 rounded border">
                        {selectedLog.descripcion}
                      </div>
                    )}

                    {/* URL (truncada) */}
                    {selectedLog.url && (
                      <div className="text-[10px] font-mono bg-muted p-1.5 rounded truncate" title={selectedLog.url}>
                        {selectedLog.metodo_http && <span className="text-primary mr-1">{selectedLog.metodo_http}</span>}
                        {selectedLog.url}
                      </div>
                    )}

                    {/* User Agent - Colapsable */}
                    {selectedLog.user_agent && (
                      <details className="text-[10px]">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          ▸ Navegador/Dispositivo
                        </summary>
                        <p className="bg-muted p-1.5 rounded font-mono break-all mt-1">
                          {selectedLog.user_agent}
                        </p>
                      </details>
                    )}

                    {/* Detalles de error de respuesta de la API */}
                    {selectedLog.datos_nuevos?._error_respuesta && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                          <X size={14} className="text-red-500 font-bold" />
                          Detalle del Error de la API
                        </p>
                        <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 p-2.5 rounded text-xs space-y-1.5">
                          <p className="font-semibold">
                            Mensaje: {selectedLog.datos_nuevos._error_respuesta.mensaje}
                          </p>
                          {selectedLog.datos_nuevos._error_respuesta.transiciones_validas && (
                            <p className="font-mono text-[10px]">
                              Transiciones válidas: {JSON.stringify(selectedLog.datos_nuevos._error_respuesta.transiciones_validas)}
                            </p>
                          )}
                          {selectedLog.datos_nuevos._error_respuesta.errores_validacion && (
                            <div className="mt-1 space-y-1">
                              <p className="font-medium underline">Errores de Validación:</p>
                              <ul className="list-disc list-inside pl-1 space-y-0.5 font-mono text-[10px]">
                                {Object.entries(selectedLog.datos_nuevos._error_respuesta.errores_validacion).map(([campo, msgs]: any) => (
                                  <li key={campo}>
                                    <strong>{campo}</strong>: {Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Diagnóstico sugerido en UI */}
                        {selectedLog.datos_nuevos._error_respuesta.diagnostico_sugerido && (
                          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 p-2.5 rounded text-xs space-y-1">
                            <p className="font-semibold flex items-center gap-1">
                              <Info size={14} /> Solución Recomendada:
                            </p>
                            <p>{selectedLog.datos_nuevos._error_respuesta.diagnostico_sugerido}</p>
                          </div>
                        )}

                        {/* Prompt para copiar y pegar a la IA */}
                        <details className="text-[10px]">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                            ▸ Prompt para Copiar y Pegar a la IA (Gemini/ChatGPT)
                          </summary>
                          <div className="mt-2 space-y-2">
                            <textarea
                              readOnly
                              className="w-full h-36 bg-slate-950 text-slate-300 p-2 rounded text-[10px] font-mono border"
                              value={`Hola IA, obtuve un error en mi sistema y necesito tu ayuda para solucionarlo.
Detalles del error:
- Ruta: [${selectedLog.metodo_http || 'N/A'}] ${selectedLog.url || 'N/A'}
- Código HTTP: ${selectedLog.codigo_respuesta || 'N/A'}
- Módulo: ${selectedLog.modulo || 'N/A'}
- Acción: ${selectedLog.accion || 'N/A'}
- Descripción: ${selectedLog.descripcion || 'N/A'}
- Tabla afectada: ${selectedLog.tabla || 'N/A'} (ID Registro: ${selectedLog.registro_id || 'N/A'})

Datos anteriores en Base de Datos:
${selectedLog.datos_anteriores ? JSON.stringify(selectedLog.datos_anteriores, null, 2) : 'null'}

Datos enviados en la Solicitud:
${JSON.stringify(selectedLog.datos_nuevos, null, 2)}

¿Podrías decirme qué significa este error y darme las instrucciones paso a paso sobre cómo resolverlo tanto a nivel de código como en la base de datos o en la configuración del sistema?`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] w-full"
                              onClick={() => {
                                const promptText = `Hola IA, obtuve un error en mi sistema y necesito tu ayuda para solucionarlo.
Detalles del error:
- Ruta: [${selectedLog.metodo_http || 'N/A'}] ${selectedLog.url || 'N/A'}
- Código HTTP: ${selectedLog.codigo_respuesta || 'N/A'}
- Módulo: ${selectedLog.modulo || 'N/A'}
- Acción: ${selectedLog.accion || 'N/A'}
- Descripción: ${selectedLog.descripcion || 'N/A'}
- Tabla afectada: ${selectedLog.tabla || 'N/A'} (ID Registro: ${selectedLog.registro_id || 'N/A'})

Datos anteriores en Base de Datos:
${selectedLog.datos_anteriores ? JSON.stringify(selectedLog.datos_anteriores, null, 2) : 'null'}

Datos enviados en la Solicitud:
${JSON.stringify(selectedLog.datos_nuevos, null, 2)}

¿Podrías decirme qué significa este error y darme las instrucciones paso a paso sobre cómo resolverlo tanto a nivel de código como en la base de datos o en la configuración del sistema?`;
                                navigator.clipboard.writeText(promptText);
                                toast.success('Prompt copiado al portapapeles');
                              }}
                            >
                              Copiar Prompt de Diagnóstico para la IA
                            </Button>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Cambios en datos */}
                    {((selectedLog.datos_anteriores && Object.keys(selectedLog.datos_anteriores).length > 0) ||
                      (selectedLog.datos_nuevos && Object.keys(selectedLog.datos_nuevos).filter(k => k !== '_error_respuesta').length > 0)) && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium mb-2">Cambios realizados</p>
                        <div className="bg-muted/20 p-2 rounded border">
                          <JsonDiff
                            anterior={selectedLog.datos_anteriores}
                            nuevo={selectedLog.datos_nuevos}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
