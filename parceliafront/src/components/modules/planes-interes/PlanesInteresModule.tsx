import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlanInteresCategoria, CategoriaProducto } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Trash, Power, Plus, Pencil,
  MagnifyingGlass, ArrowsClockwise, Star, CheckCircle, XCircle,
  Percent, CaretLeft, CaretRight, X
} from '@phosphor-icons/react'
import debounce from 'lodash/debounce'
import { PlanInteresDialog } from './PlanInteresDialog'
import { planInteresService } from '@/services/planInteres.service'
import { categoriaProductoService } from '@/lib/api'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PlanesInteresModule() {
  const [planes, setPlanes] = useState<PlanInteresCategoria[]>([])
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([])
  const [loading, setLoading] = useState(true)
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [pagination, setPagination] = useState<{ total: number; last_page: number; from: number; to: number; current_page: number } | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [planEditar, setPlanEditar] = useState<PlanInteresCategoria | undefined>(undefined)
  const [planEliminar, setPlanEliminar] = useState<PlanInteresCategoria | null>(null)

  const debouncedSetBusqueda = useMemo(
    () => debounce((value: string) => {
      setBusqueda(value)
      setPage(1)
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSetBusqueda(busquedaInput)
    return () => debouncedSetBusqueda.cancel()
  }, [busquedaInput, debouncedSetBusqueda])

  // Cargar categorías
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const response = await categoriaProductoService.getActivas()
        if (response && response.data && Array.isArray(response.data)) {
          setCategorias(response.data as any)
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
    }
    cargarCategorias()
  }, [])

  // Cargar planes
  const cargarPlanes = useCallback(async () => {
    setLoading(true)
    try {
      const filtros: Record<string, any> = {}
      if (busqueda) filtros.busqueda = busqueda
      if (filtroActivo !== 'todos') filtros.activo = filtroActivo === 'activo' ? 1 : 0
      if (filtroCategoria !== 'todos') filtros.categoria_id = filtroCategoria

      const result = await planInteresService.obtenerPaginados(filtros, page, perPage)
      setPlanes(result.data)
      setPagination(result.pagination)
    } catch (error: any) {
      console.error('Error cargando planes:', error)
      toast.error('Error al cargar planes de interés')
    } finally {
      setLoading(false)
    }
  }, [busqueda, filtroActivo, filtroCategoria, page, perPage])

  useEffect(() => {
    cargarPlanes()
  }, [cargarPlanes])

  const handleEliminar = async () => {
    if (!planEliminar?.id) return
    try {
      await planInteresService.eliminar(planEliminar.id)
      toast.success('Plan eliminado exitosamente')
      setPlanEliminar(null)
      cargarPlanes()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar plan')
    }
  }

  const handleToggleActivo = async (plan: PlanInteresCategoria) => {
    try {
      await planInteresService.toggleActivo(plan.id)
      toast.success(plan.activo ? 'Plan desactivado' : 'Plan activado')
      cargarPlanes()
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado')
    }
  }

  const handleSetDefault = async (plan: PlanInteresCategoria) => {
    try {
      await planInteresService.setDefault(plan.id)
      toast.success('Plan establecido como predeterminado')
      cargarPlanes()
    } catch (error: any) {
      toast.error(error.message || 'Error al establecer como predeterminado')
    }
  }

  const handleGuardar = async (planData: any) => {
    try {
      if (planEditar) {
        await planInteresService.actualizar(planEditar.id, planData)
        toast.success('Producto crediticio actualizado exitosamente')
      } else {
        await planInteresService.crear(planData)
        toast.success('Producto crediticio creado exitosamente')
      }
      setDialogAbierto(false)
      setPlanEditar(undefined)
      cargarPlanes()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar producto crediticio')
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Productos Crediticios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de productos de crédito configurables por categoría de prendas
          </p>
        </div>
        <Button onClick={() => { setPlanEditar(undefined); setDialogAbierto(true) }}>
          <Plus size={20} className="mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Planes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total ?? planes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos (pág.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {planes.filter(p => p.activo).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactivos (pág.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {planes.filter(p => !p.activo).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorías Cubiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(
                planes.flatMap(p => {
                  const ids = (p as any).categorias?.map((c: any) => Number(c.id)) || [];
                  if (p.categoria_producto_id) ids.push(Number(p.categoria_producto_id));
                  return ids;
                })
              ).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Buscar por nombre, código..."
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                className="pl-10"
              />
              {busquedaInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => { setBusquedaInput(''); setBusqueda('') }}
                >
                  <X size={16} />
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={cargarPlanes} disabled={loading}>
              <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filtroActivo} onValueChange={(v) => { setFiltroActivo(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCategoria} onValueChange={(v) => { setFiltroCategoria(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorías</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de planes */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Tasa Interés</TableHead>
                  <TableHead>Tasa Almacenaje</TableHead>
                  <TableHead>Predeterminado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : planes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron planes de interés
                    </TableCell>
                  </TableRow>
                ) : (
                  planes.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.nombre}
                        {plan.codigo && (
                          <div className="text-xs text-muted-foreground">{plan.codigo}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {plan.categoria_producto_id === null ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                              Genérico (Todas)
                            </Badge>
                          ) : (plan as any).categorias && (plan as any).categorias.length > 0 ? (
                            (plan as any).categorias.map((cat: any) => (
                              <Badge key={cat.id} variant="outline" className="text-[10px]">
                                {cat.nombre}
                              </Badge>
                            ))
                          ) : plan.categoria?.nombre ? (
                            <Badge variant="outline">
                              {plan.categoria.nombre}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                              Genérico (Todas)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {plan.plazo_numero} {plan.plazo_unidad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>
                          <Percent size={14} className="mr-1" />
                          {plan.tasa_interes}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {plan.tasa_almacenaje}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.es_default ? (
                          <Badge variant="default" className="bg-yellow-500">
                            <Star size={14} className="mr-1" />
                            Default
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {plan.activo ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle size={14} className="mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle size={14} className="mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {!plan.es_default && plan.activo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(plan)}
                              title="Establecer como predeterminado"
                            >
                              <Star size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActivo(plan)}
                            title={plan.activo ? 'Desactivar' : 'Activar'}
                          >
                            <Power size={16} className={cn(plan.activo && 'text-green-600')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setPlanEditar(plan); setDialogAbierto(true) }}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPlanEliminar(plan)}
                          >
                            <Trash size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Paginación */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {pagination.from} a {pagination.to} de {pagination.total} planes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  Primera
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <CaretLeft size={16} />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="font-medium">{page}</span>
                  <span className="text-muted-foreground">de</span>
                  <span className="font-medium">{pagination.last_page}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                  disabled={page === pagination.last_page}
                >
                  <CaretRight size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.last_page)}
                  disabled={page === pagination.last_page}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de edición/creación */}
      <PlanInteresDialog
        open={dialogAbierto}
        onOpenChange={setDialogAbierto}
        plan={planEditar}
        onGuardar={handleGuardar}
        categorias={categorias}
      />

      {/* Diálogo de eliminación */}
      <AlertDialog open={!!planEliminar} onOpenChange={() => setPlanEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el producto crediticio "{planEliminar?.nombre}". 
              Si hay créditos usando este producto, la eliminación podría fallar.
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
