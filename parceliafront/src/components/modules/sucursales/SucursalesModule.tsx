import { useState, useEffect, useCallback } from 'react'
import { Sucursal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, Pencil, Trash, Power, 
  MagnifyingGlass, FunnelSimple, CaretUp, CaretDown,
  CaretLeft, CaretRight, Storefront, CheckCircle, XCircle,
  ArrowsClockwise, MapPin, Phone, Envelope, CircleNotch
} from '@phosphor-icons/react'
import { SucursalDialog } from './SucursalDialog'
import { sucursalService, SucursalFilters, PaginationInfo, SucursalStats, isAuthError } from '@/lib/api'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/helpers'
import { useKV } from '@/hooks/use-kv'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export function SucursalesModule() {
  // Estados principales
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [stats, setStats] = useState<SucursalStats | null>(null)
  
  // Estados de filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activas' | 'inactivas'>('todos')
  const [ordenarPor, setOrdenarPor] = useState<'codigo' | 'nombre' | 'ciudad' | 'activa' | 'created_at'>('created_at')
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('desc')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  
  // Estados de diálogos
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [sucursalEditar, setSucursalEditar] = useState<Sucursal | undefined>(undefined)
  const [sucursalEliminar, setSucursalEliminar] = useState<Sucursal | null>(null)
  const [guardando, setGuardando] = useState(false)
  
  // Estado para toggle en progreso
  const [togglendoIds, setTogglingIds] = useState<Set<string>>(new Set())
  
  // Trigger para refrescar sucursales en MainApp (selector de sucursales)
  const [, setRefrescarTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)
  
  // Debounce para búsqueda
  const busquedaDebounced = useDebounce(busqueda, 300)

  // Cargar sucursales
  const cargarSucursales = useCallback(async () => {
    setLoading(true)
    try {
      const filters: SucursalFilters = {
        page: pagina,
        per_page: porPagina,
        order_by: ordenarPor,
        order_dir: ordenDir,
      }
      
      if (busquedaDebounced) filters.busqueda = busquedaDebounced
      if (filtroEstado === 'activas') filters.activa = true
      if (filtroEstado === 'inactivas') filters.activa = false
      
      const response = await sucursalService.getAll(filters)
      
      console.log('🔍 DEBUG SUCURSALES:')
      console.log('1. Response completa:', response)
      console.log('2. response.success:', response.success)
      console.log('3. response.data (tipo):', typeof response.data, Array.isArray(response.data))
      console.log('4. response.data (contenido):', response.data)
      
      if (response.success) {
        const data = response as any
        console.log('5. Entrando a mapeo...')
        console.log('6. data.data:', data.data)
        console.log('7. Array.isArray(data.data):', Array.isArray(data.data))
        console.log('8. data.data.length:', data.data?.length)
        
        const sucursalesMapeadas: Sucursal[] = (data.data || []).map((s: any) => ({
          id: s.id,
          codigo: s.codigo,
          nombre: s.nombre,
          direccion: s.direccion,
          telefono: s.telefono,
          email: s.email,
          ciudad: s.ciudad,
          departamento: s.departamento,
          descripcion: s.descripcion,
          activa: s.activa,
          creadoEn: s.creadoEn,
          actualizadoEn: s.actualizadoEn,
        }))
        
        console.log('9. Sucursales mapeadas:', sucursalesMapeadas)
        console.log('10. Total mapeadas:', sucursalesMapeadas.length)
        
        setSucursales(sucursalesMapeadas)
        setPagination(data.pagination || null)
        setStats(data.stats || null)
        
        console.log('11. Estado actualizado - pagination:', data.pagination)
        console.log('12. Estado actualizado - stats:', data.stats)
      }
    } catch (error: any) {
      console.error('Error cargando sucursales:', error)
      if (!isAuthError(error)) {
        toast.error('Error al cargar sucursales')
      }
    } finally {
      setLoading(false)
    }
  }, [pagina, porPagina, ordenarPor, ordenDir, busquedaDebounced, filtroEstado])

  useEffect(() => {
    cargarSucursales()
  }, [cargarSucursales])

  const handleNuevo = () => {
    setSucursalEditar(undefined)
    setDialogAbierto(true)
  }

  const handleEditar = (sucursal: Sucursal) => {
    setSucursalEditar(sucursal)
    setDialogAbierto(true)
  }

  const handleEliminar = async () => {
    if (!sucursalEliminar) return

    const sucursalAEliminar = sucursalEliminar
    const sucursalesBackup = sucursales
    const statsBackup = stats

    // ACTUALIZACIÓN OPTIMISTA: eliminar de la UI inmediatamente
    setSucursales(prev => prev.filter(s => s.id !== sucursalAEliminar.id))
    if (stats) {
      setStats(prev => prev ? {
        ...prev,
        total: prev.total - 1,
        activas: sucursalAEliminar.activa ? prev.activas - 1 : prev.activas,
        inactivas: !sucursalAEliminar.activa ? prev.inactivas - 1 : prev.inactivas
      } : null)
    }
    setSucursalEliminar(null)
    toast.success('Sucursal eliminada exitosamente')

    try {
      const response = await sucursalService.delete(sucursalAEliminar.id)
      if (response.success) {
        // Notificar a MainApp para refrescar selector de sucursales
        setRefrescarTrigger(Date.now())
        // Recargar en segundo plano para sincronizar paginación/stats
        cargarSucursales()
      } else {
        // Revertir cambio optimista
        setSucursales(sucursalesBackup)
        setStats(statsBackup)
        toast.error(response.message || 'Error al eliminar sucursal')
      }
    } catch (error: any) {
      // Revertir cambio optimista
      setSucursales(sucursalesBackup)
      setStats(statsBackup)
      toast.error(error.message || 'Error al eliminar sucursal')
    }
  }

  const handleToggleActiva = async (sucursal: Sucursal) => {
    // Evitar doble click
    if (togglendoIds.has(sucursal.id)) return
    
    // Marcar como en progreso
    setTogglingIds(prev => new Set(prev).add(sucursal.id))
    
    // Actualización optimista - cambiar UI inmediatamente
    const nuevoEstado = !sucursal.activa
    setSucursales(prev => prev.map(s => 
      s.id === sucursal.id ? { ...s, activa: nuevoEstado } : s
    ))
    
    // Actualizar stats optimistamente
    if (stats) {
      setStats(prev => prev ? {
        ...prev,
        activas: nuevoEstado ? prev.activas + 1 : prev.activas - 1,
        inactivas: nuevoEstado ? prev.inactivas - 1 : prev.inactivas + 1
      } : null)
    }
    
    try {
      const response = await sucursalService.toggleActiva(sucursal.id)
      if (response.success) {
        toast.success(response.message || (nuevoEstado ? 'Sucursal activada' : 'Sucursal desactivada'))
        // Notificar a MainApp para refrescar selector de sucursales
        setRefrescarTrigger(Date.now())
      } else {
        // Revertir cambio optimista
        setSucursales(prev => prev.map(s => 
          s.id === sucursal.id ? { ...s, activa: sucursal.activa } : s
        ))
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            activas: sucursal.activa ? prev.activas : prev.activas - 1,
            inactivas: sucursal.activa ? prev.inactivas - 1 : prev.inactivas
          } : null)
        }
        toast.error((response as any).message || 'Error al cambiar estado de la sucursal')
      }
    } catch (error: any) {
      // Revertir cambio optimista
      setSucursales(prev => prev.map(s => 
        s.id === sucursal.id ? { ...s, activa: sucursal.activa } : s
      ))
      if (stats) {
        setStats(prev => prev ? {
          ...prev,
          activas: sucursal.activa ? prev.activas : prev.activas - 1,
          inactivas: sucursal.activa ? prev.inactivas - 1 : prev.inactivas
        } : null)
      }
      console.error('Error toggleActiva:', error)
      toast.error(error.message || 'Error al cambiar estado de la sucursal')
    } finally {
      // Quitar de loading
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(sucursal.id)
        return next
      })
    }
  }

  const handleGuardar = async (sucursal: Sucursal, dataParaBackend?: any) => {
    setGuardando(true)
    const sucursalesBackup = sucursales
    const statsBackup = stats

    try {
      // Usar dataParaBackend si está disponible, sino convertir sucursal
      const datosParaEnviar = dataParaBackend || convertirASnakeCase(sucursal)
      
      if (sucursal.id && sucursalEditar) {
        // ACTUALIZACIÓN OPTIMISTA: actualizar en la UI inmediatamente
        setSucursales(prev => prev.map(s => s.id === sucursal.id ? sucursal : s))
        setDialogAbierto(false)
        toast.success('Sucursal actualizada exitosamente')

        // Actualizar
        const response = await sucursalService.update(sucursal.id, datosParaEnviar)
        if (response.success) {
          // Notificar a MainApp para refrescar selector de sucursales
          setRefrescarTrigger(Date.now())
          // Recargar en segundo plano para sincronizar
          cargarSucursales()
        } else {
          // Revertir cambio optimista
          setSucursales(sucursalesBackup)
          setDialogAbierto(true)
          const errorMsg = (response as any).errors ? formatearErrores((response as any).errors) : (response as any).message
          toast.error(errorMsg || 'Error al actualizar sucursal')
        }
      } else {
        // ACTUALIZACIÓN OPTIMISTA: agregar a la UI inmediatamente con ID temporal
        const idTemporal = `temp-${Date.now()}`
        const sucursalOptimista = { ...sucursal, id: idTemporal }
        setSucursales(prev => [sucursalOptimista, ...prev])
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            total: prev.total + 1,
            activas: sucursal.activa ? prev.activas + 1 : prev.activas,
            inactivas: !sucursal.activa ? prev.inactivas + 1 : prev.inactivas
          } : null)
        }
        setDialogAbierto(false)
        toast.success('Sucursal creada exitosamente')

        // Crear
        const response = await sucursalService.create(datosParaEnviar)
        if (response.success) {
          // Notificar a MainApp para refrescar selector de sucursales
          setRefrescarTrigger(Date.now())
          // Recargar en segundo plano para obtener el ID real y datos completos
          cargarSucursales()
        } else {
          // Revertir cambio optimista
          setSucursales(sucursalesBackup)
          setStats(statsBackup)
          setDialogAbierto(true)
          const errorMsg = (response as any).errors ? formatearErrores((response as any).errors) : (response as any).message
          toast.error(errorMsg || 'Error al crear sucursal')
        }
      }
    } catch (error: any) {
      // Revertir cambios optimistas en caso de error
      setSucursales(sucursalesBackup)
      setStats(statsBackup)
      setDialogAbierto(true)
      const errorMsg = error.errors ? formatearErrores(error.errors) : error.message
      toast.error(errorMsg || 'Error al guardar sucursal')
    } finally {
      setGuardando(false)
    }
  }

  // Función para formatear errores de validación
  const formatearErrores = (errors: Record<string, string[]>) => {
    const mensajes = Object.entries(errors).map(([campo, mensajes]) => {
      return `${campo}: ${mensajes.join(', ')}`
    })
    return mensajes.join(' | ')
  }

  // Función auxiliar para convertir camelCase a snake_case
  const convertirASnakeCase = (obj: any): any => {
    const result: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        // Solo incluir campos que no sean del frontend (id, creadoEn, actualizadoEn)
        if (!['id', 'creadoEn', 'actualizadoEn'].includes(key)) {
          result[snakeKey] = obj[key]
        }
      }
    }
    return result
  }

  const handleSort = (field: typeof ordenarPor) => {
    if (ordenarPor === field) {
      setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(field)
      setOrdenDir('asc')
    }
    setPagina(1)
  }

  const SortIcon = ({ field }: { field: typeof ordenarPor }) => {
    if (ordenarPor !== field) return null
    return ordenDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sucursales</h1>
          <p className="text-muted-foreground mt-1">
            Gestión completa de sucursales del sistema
          </p>
        </div>
        <Button onClick={handleNuevo} className="w-full sm:w-auto">
          <Plus size={18} className="mr-2" />
          Nueva Sucursal
        </Button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Sucursales registradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activas}</div>
              <p className="text-xs text-muted-foreground mt-1">En operación</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactivas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.inactivas}</div>
              <p className="text-xs text-muted-foreground mt-1">Deshabilitadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Buscar por código, nombre, ciudad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroEstado} onValueChange={(v: any) => { setFiltroEstado(v); setPagina(1) }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activas">Activas</SelectItem>
                <SelectItem value="inactivas">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(porPagina)} onValueChange={(v) => { setPorPagina(Number(v)); setPagina(1) }}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sucursales.length === 0 ? (
            <div className="p-12 text-center">
              <Storefront size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay sucursales</p>
              <p className="text-sm text-muted-foreground mt-1">
                {busqueda || filtroEstado !== 'todos' 
                  ? 'No se encontraron sucursales con los filtros aplicados'
                  : 'Comienza creando tu primera sucursal'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('codigo')}>
                      <div className="flex items-center gap-2">
                        Código
                        <SortIcon field="codigo" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nombre')}>
                      <div className="flex items-center gap-2">
                        Nombre
                        <SortIcon field="nombre" />
                      </div>
                    </TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('activa')}>
                      <div className="flex items-center gap-2">
                        Estado
                        <SortIcon field="activa" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-2">
                        Creada
                        <SortIcon field="created_at" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sucursales.map((sucursal) => (
                    <TableRow key={sucursal.id}>
                      <TableCell className="font-mono font-medium">{sucursal.codigo}</TableCell>
                      <TableCell className="font-medium">{sucursal.nombre}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(sucursal.municipio || sucursal.departamento || sucursal.pais) && (
                            <div className="flex items-start gap-1.5 text-sm">
                              <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col gap-0.5">
                                {sucursal.municipio && (
                                  <span className="font-medium">{sucursal.municipio}</span>
                                )}
                                {sucursal.departamento && (
                                  <span className="text-muted-foreground">{sucursal.departamento}</span>
                                )}
                                {sucursal.pais && (
                                  <span className="text-xs text-muted-foreground">{sucursal.pais}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {sucursal.direccion && (
                            <p className="text-xs text-muted-foreground mt-1">{sucursal.direccion}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {sucursal.telefono && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone size={14} className="text-muted-foreground" />
                              <span>{sucursal.telefono}</span>
                            </div>
                          )}
                          {sucursal.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Envelope size={14} className="text-muted-foreground" />
                              <span className="text-xs">{sucursal.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={sucursal.activa ? "default" : "secondary"}
                          className={cn(
                            "cursor-pointer transition-all duration-200",
                            togglendoIds.has(sucursal.id) && "opacity-70 pointer-events-none",
                            sucursal.activa ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"
                          )}
                          onClick={() => handleToggleActiva(sucursal)}
                        >
                          {togglendoIds.has(sucursal.id) ? (
                            <>
                              <CircleNotch size={14} className="mr-1 animate-spin" />
                              Cambiando...
                            </>
                          ) : sucursal.activa ? (
                            <>
                              <CheckCircle size={14} className="mr-1" />
                              Activa
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="mr-1" />
                              Inactiva
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateShort(sucursal.creadoEn)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditar(sucursal)}
                                >
                                  <Pencil size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSucursalEliminar(sucursal)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {pagination.from} a {pagination.to} de {pagination.total} sucursales
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              <CaretLeft size={16} />
            </Button>
            <span className="text-sm">
              Página {pagination.current_page} de {pagination.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina(p => Math.min(pagination.last_page, p + 1))}
              disabled={pagina === pagination.last_page}
            >
              <CaretRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Diálogos */}
      <SucursalDialog
        abierto={dialogAbierto}
        onCerrar={() => {
          setDialogAbierto(false)
          setSucursalEditar(undefined)
        }}
        onGuardar={handleGuardar}
        sucursal={sucursalEditar}
      />

      <AlertDialog open={!!sucursalEliminar} onOpenChange={(open) => !open && setSucursalEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La sucursal "{sucursalEliminar?.nombre}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

