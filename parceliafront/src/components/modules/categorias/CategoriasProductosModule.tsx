import { useState, useEffect, useCallback } from 'react'
import { CategoriaProducto, CampoDinamico } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, Pencil, Trash, Power, 
  MagnifyingGlass, FunnelSimple, CaretUp, CaretDown,
  CaretLeft, CaretRight, Tag, CheckCircle, XCircle,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { CategoriaProductoDialog } from './CategoriaProductoDialog'
// import { VerCamposDinamicosDialog } from './VerCamposDinamicosDialog' // Funcionalidad deshabilitada
import { categoriaProductoService, CategoriaProductoFilters } from '@/lib/api'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/helpers'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
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

export function CategoriasProductosModule() {
  // Estados principales
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  
  // Estados de filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activas' | 'inactivas'>('todos')
  const [ordenarPor, setOrdenarPor] = useState<'codigo' | 'nombre' | 'orden' | 'activa' | 'created_at'>('orden')
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('asc')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  
  // Estados de diálogos
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [categoriaEditar, setCategoriaEditar] = useState<CategoriaProducto | undefined>(undefined)
  const [categoriaEliminar, setCategoriaEliminar] = useState<CategoriaProducto | null>(null)
  // const [categoriaVerCampos, setCategoriaVerCampos] = useState<CategoriaProducto | null>(null) // Funcionalidad deshabilitada
  
  // Debounce para búsqueda
  const busquedaDebounced = useDebounce(busqueda, 300)

  // Cargar categorías
  const cargarCategorias = useCallback(async () => {
    setLoading(true)
    try {
      const filters: CategoriaProductoFilters = {
        page: pagina,
        per_page: porPagina,
        order_by: ordenarPor,
        order_dir: ordenDir,
      }
      
      if (busquedaDebounced) filters.busqueda = busquedaDebounced
      if (filtroEstado === 'activas') filters.activa = true
      if (filtroEstado === 'inactivas') filters.activa = false
      
      const response = await categoriaProductoService.getAll(filters)
      
      if (response.success) {
        const data = response as any
        const categoriasMapeadas: CategoriaProducto[] = (data.data || []).map((c: any) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          descripcion: c.descripcion,
          color: c.color,
          icono: c.icono,
          orden: c.orden,
          activa: c.activa,
          camposDinamicos: c.campos_dinamicos || c.camposDinamicos || [],
          creadoEn: c.creadoEn,
          actualizadoEn: c.actualizadoEn,
        }))
        setCategorias(categoriasMapeadas)
        setPagination(data.pagination || null)
        setStats(data.stats || null)
      }
    } catch (error: any) {
      console.error('Error cargando categorías:', error)
      toast.error('Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }, [pagina, porPagina, ordenarPor, ordenDir, busquedaDebounced, filtroEstado])

  useEffect(() => {
    cargarCategorias()
  }, [cargarCategorias])

  const handleSort = (field: string) => {
    if (ordenarPor === field) {
      setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(field as any)
      setOrdenDir('asc')
    }
    setPagina(1)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (ordenarPor !== field) return null
    return ordenDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />
  }

  const handleGuardar = async (categoria: CategoriaProducto) => {
    try {
      if (categoriaEditar) {
        await categoriaProductoService.update(categoria.id, categoria)
        toast.success('Categoría actualizada exitosamente')
      } else {
        await categoriaProductoService.create(categoria)
        toast.success('Categoría creada exitosamente')
      }
      setDialogAbierto(false)
      setCategoriaEditar(undefined)
      cargarCategorias()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar categoría')
    }
  }

  const handleEliminar = async () => {
    if (!categoriaEliminar) return
    try {
      await categoriaProductoService.delete(categoriaEliminar.id)
      toast.success('Categoría eliminada exitosamente')
      setCategoriaEliminar(null)
      cargarCategorias()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar categoría')
    }
  }

  const handleToggleActiva = async (categoria: CategoriaProducto) => {
    try {
      await categoriaProductoService.toggleActiva(categoria.id)
      toast.success(categoria.activa ? 'Categoría desactivada' : 'Categoría activada')
      cargarCategorias()
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado')
    }
  }

  /* Funcionalidad de campos dinámicos deshabilitada
  const handleGuardarCamposDinamicos = async (campos: CampoDinamico[]) => {
    if (!categoriaVerCampos) return
    try {
      const categoriaActualizada = {
        ...categoriaVerCampos,
        camposDinamicos: campos,
      }
      await categoriaProductoService.update(categoriaVerCampos.id, categoriaActualizada)
      toast.success('Campos dinámicos actualizados exitosamente')
      setCategoriaVerCampos(null)
      cargarCategorias()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar campos dinámicos')
      throw error
    }
  }
  */

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Categorías de Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión completa de categorías de productos de empeños
          </p>
        </div>
        <Button onClick={() => { setCategoriaEditar(undefined); setDialogAbierto(true) }}>
          <Plus size={20} className="mr-2" />
          Nueva Categoría
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
              <p className="text-xs text-muted-foreground mt-1">Categorías registradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activas}</div>
              <p className="text-xs text-muted-foreground mt-1">En uso</p>
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
                  placeholder="Buscar por código, nombre..."
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroEstado} onValueChange={(v: any) => { setFiltroEstado(v); setPagina(1) }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <FunnelSimple size={16} className="mr-2" />
                <SelectValue />
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
            <Button variant="outline" onClick={cargarCategorias} disabled={loading}>
              <ArrowsClockwise size={18} className={cn(loading && 'animate-spin')} />
            </Button>
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
          ) : categorias.length === 0 ? (
            <div className="p-12 text-center">
              <Tag size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay categorías</p>
              <p className="text-sm text-muted-foreground mt-1">
                {busqueda || filtroEstado !== 'todos' 
                  ? 'No se encontraron categorías con los filtros aplicados'
                  : 'Comienza creando tu primera categoría'}
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
                    <TableHead>Color/Icono</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('orden')}>
                      <div className="flex items-center gap-2">
                        Orden
                        <SortIcon field="orden" />
                      </div>
                    </TableHead>
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
                  {categorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-mono font-medium">{categoria.codigo}</TableCell>
                      <TableCell className="font-medium">{categoria.nombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {categoria.color && (
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-border" 
                              style={{ backgroundColor: categoria.color }}
                            />
                          )}
                          {categoria.icono && (
                            <span className="text-sm">{categoria.icono}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{categoria.orden}</TableCell>
                      <TableCell>
                        <Badge variant={categoria.activa ? 'default' : 'secondary'}>
                          {categoria.activa ? (
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
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateShort(categoria.creadoEn)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setCategoriaEditar(categoria); setDialogAbierto(true) }}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActiva(categoria)}
                          >
                            <Power size={16} className={categoria.activa ? 'text-orange-500' : 'text-green-500'} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCategoriaEliminar(categoria)}
                          >
                            <Trash size={16} className="text-destructive" />
                          </Button>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {pagination.from} a {pagination.to} de {pagination.total} categorías
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(pagina - 1)}
                  disabled={pagina === 1}
                >
                  <CaretLeft size={16} />
                </Button>
                <div className="text-sm">
                  Página {pagination.current_page} de {pagination.last_page}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(pagina + 1)}
                  disabled={pagina === pagination.last_page}
                >
                  <CaretRight size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogos */}
      <CategoriaProductoDialog
        abierto={dialogAbierto}
        onCerrar={() => { setDialogAbierto(false); setCategoriaEditar(undefined) }}
        onGuardar={handleGuardar}
        categoria={categoriaEditar}
      />

      <AlertDialog open={!!categoriaEliminar} onOpenChange={(open) => !open && setCategoriaEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la categoría "{categoriaEliminar?.nombre}".
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

      {/* Funcionalidad de campos dinámicos deshabilitada
      <VerCamposDinamicosDialog
        abierto={!!categoriaVerCampos}
        onCerrar={() => setCategoriaVerCampos(null)}
        campos={categoriaVerCampos?.camposDinamicos || []}
        nombreCategoria={categoriaVerCampos?.nombre || ''}
        categoriaId={categoriaVerCampos?.id}
        onGuardar={handleGuardarCamposDinamicos}
      />
      */}
    </div>
  )
}


