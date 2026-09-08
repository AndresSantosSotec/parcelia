import { useState, useEffect, useCallback, useMemo } from 'react'
import { Cliente, Credito } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus, MagnifyingGlass, User, Pencil, Trash, Eye,
  CaretUp, CaretDown, CaretLeft, CaretRight,
  Users, Crown, Warning, ArrowsClockwise, Phone, Envelope, MapPin,
  IdentificationCard, FunnelSimple, X, UserCheck, UserMinus,
  DownloadSimple, FileCsv, Spinner
} from '@phosphor-icons/react'
import { ClienteDialog } from './ClienteDialog'
import { ClienteDetalle } from './ClienteDetalle'
import { clienteService, ClienteFilters, ClienteStats, PaginationInfo, isAuthError } from '@/lib/api'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useKV } from '@/hooks/use-kv'
import { getMediaUrl } from '@/utils/imageUrl'
import debounce from 'lodash/debounce'

type OrderField = 'nombres' | 'apellidos' | 'dpi' | 'created_at' | 'estado'
type OrderDir = 'asc' | 'desc'

export function ClientesModule() {
  // Estados para datos
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [stats, setStats] = useState<ClienteStats | null>(null)
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  // Estados para filtros
  const [busqueda, setBusqueda] = useState('')
  const [busquedaInput, setBusquedaInput] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroGenero, setFiltroGenero] = useState('todos')
  const [filtroSucursal, setFiltroSucursal] = useState('todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [tabActivo, setTabActivo] = useState('lista')
  const [clientesSeleccionados, setClientesSeleccionados] = useState<Set<string>>(new Set())
  const [accionMasivaLoading, setAccionMasivaLoading] = useState(false)
  const [descargandoReporte, setDescargandoReporte] = useState(false)

  // Estados para ordenamiento y paginación
  const [orderBy, setOrderBy] = useState<OrderField>('created_at')
  const [orderDir, setOrderDir] = useState<OrderDir>('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [clienteEditar, setClienteEditar] = useState<Cliente | undefined>()
  const [clienteEliminar, setClienteEliminar] = useState<Cliente | null>(null)
  const [clienteDetalle, setClienteDetalle] = useState<Cliente | null>(null)

  // Créditos para mostrar info adicional
  // const [creditos] = useKV<Credito[]>('creditos', []) // Ya no es necesario, viene en Cliente

  // Debounce para búsqueda
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

  // Cargar clientes
  const cargarClientes = useCallback(async () => {
    setLoading(true)
    try {
      const params: ClienteFilters = {
        busqueda: busqueda || undefined,
        estado: filtroEstado !== 'todos' ? filtroEstado : undefined,
        genero: filtroGenero !== 'todos' ? filtroGenero : undefined,
        sucursal: filtroSucursal !== 'todos' ? filtroSucursal : undefined,
        page,
        per_page: perPage,
        order_by: orderBy,
        order_dir: orderDir,
      }

      const response = await clienteService.getAll(params)
      if (response.success) {
        setClientes(response.data as any)
        if ((response as any).pagination) {
          setPagination((response as any).pagination)
        }
        if ((response as any).stats) {
          setStats((response as any).stats)
        }
        if ((response as any).sucursales) {
          setSucursalesDisponibles((response as any).sucursales)
        }
      }
    } catch (error: any) {
      console.error('Error cargando clientes:', error)
      if (!isAuthError(error)) {
        toast.error(error.message || 'Error al cargar clientes')
      }
    } finally {
      setLoading(false)
    }
  }, [busqueda, filtroEstado, filtroGenero, filtroSucursal, page, perPage, orderBy, orderDir])

  useEffect(() => {
    cargarClientes()
  }, [cargarClientes])

  // Handlers
  const handleSort = (field: OrderField) => {
    if (orderBy === field) {
      setOrderDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(field)
      setOrderDir('asc')
    }
    setPage(1)
  }

  const handleGuardar = async (cliente: Cliente) => {
    setDialogLoading(true)
    try {
      if (clienteEditar) {
        const response = await clienteService.update(cliente.id, cliente)
        if (response.success) {
          toast.success('Cliente actualizado correctamente')
        }
      } else {
        const response = await clienteService.create(cliente)
        if (response.success) {
          toast.success('Cliente creado correctamente')
        }
      }
      setDialogAbierto(false)
      setClienteEditar(undefined)
      cargarClientes()
    } catch (error: any) {
      if (!isAuthError(error)) {
        toast.error(error.message || 'Error al guardar cliente')
      }
    } finally {
      setDialogLoading(false)
    }
  }

  const handleEliminar = async () => {
    if (!clienteEliminar) return

    try {
      if (clienteEliminar.creditosInfo && clienteEliminar.creditosInfo.activos > 0) {
        toast.error('No se puede eliminar un cliente con créditos activos')
        setClienteEliminar(null)
        return
      }

      const response = await clienteService.delete(clienteEliminar.id)
      if (response.success) {
        toast.success('Cliente eliminado correctamente')
        cargarClientes()
      }
    } catch (error: any) {
      if (!isAuthError(error)) {
        toast.error(error.message || 'Error al eliminar cliente')
      }
    } finally {
      setClienteEliminar(null)
    }
  }

  const limpiarFiltros = () => {
    setBusquedaInput('')
    setBusqueda('')
    setFiltroEstado('todos')
    setFiltroGenero('todos')
    setFiltroSucursal('todos')
    setPage(1)
  }

  const filtrosActivos = [
    filtroEstado !== 'todos',
    filtroGenero !== 'todos',
    filtroSucursal !== 'todos',
    busqueda !== ''
  ].filter(Boolean).length

  // getCreditosCliente ya no es necesario ya que viene integrado en el objeto cliente

  const handleToggleMasivo = async (accion: 'activar' | 'desactivar') => {
    if (clientesSeleccionados.size === 0) return
    setAccionMasivaLoading(true)
    try {
      const response = await clienteService.toggleMasivo(Array.from(clientesSeleccionados), accion)
      if ((response as any).success) {
        toast.success(`${clientesSeleccionados.size} cliente(s) ${accion === 'activar' ? 'activados' : 'desactivados'} exitosamente`)
        setClientesSeleccionados(new Set())
        cargarClientes()
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la acción masiva')
    } finally {
      setAccionMasivaLoading(false)
    }
  }

  const toggleSeleccion = (id: string) => {
    setClientesSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSeleccionarTodos = () => {
    if (clientesSeleccionados.size === clientes.length) {
      setClientesSeleccionados(new Set())
    } else {
      setClientesSeleccionados(new Set(clientes.map(c => String(c.id))))
    }
  }

  const handleDescargarReporte = async (estadoFilter?: string) => {
    setDescargandoReporte(true)
    try {
      await clienteService.descargarReporte({ estado: estadoFilter ?? filtroEstado, busqueda })
      toast.success('Reporte descargado exitosamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al descargar el reporte')
    } finally {
      setDescargandoReporte(false)
    }
  }

  const SortIcon = ({ field }: { field: OrderField }) => {
    if (orderBy !== field) return null
    return orderDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />
  }

  // Si está mostrando detalle
  if (clienteDetalle) {
    return (
      <ClienteDetalle
        cliente={clienteDetalle}
        onVolver={() => setClienteDetalle(null)}
        onEditar={() => {
          setClienteEditar(clienteDetalle)
          setClienteDetalle(null)
          setDialogAbierto(true)
        }}
        onEliminar={() => {
          setClienteEliminar(clienteDetalle)
          setClienteDetalle(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión completa de clientes
          </p>
        </div>
        <Button onClick={() => { setClienteEditar(undefined); setDialogAbierto(true) }} className="w-full sm:w-auto">
          <Plus weight="bold" className="mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Tabs value={tabActivo} onValueChange={setTabActivo}>
        <TabsList className="mb-2">
          <TabsTrigger value="lista">
            <Users size={16} className="mr-2" />
            Lista de Clientes
          </TabsTrigger>
          <TabsTrigger value="reportes">
            <FileCsv size={16} className="mr-2" />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          {/* Stats Cards */}
          {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <User size={24} className="text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activos}</p>
                  <p className="text-xs text-muted-foreground">Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Crown size={24} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.vip}</p>
                  <p className="text-xs text-muted-foreground">Clientes VIP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <User size={24} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inactivos}</p>
                  <p className="text-xs text-muted-foreground">Inactivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Buscar por nombre, DPI, NIT, teléfono o email..."
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
            <div className="flex gap-2">
              <Button
                variant={mostrarFiltros ? 'default' : 'outline'}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                <FunnelSimple size={18} className="mr-2" />
                Filtros
                {filtrosActivos > 0 && (
                  <Badge variant="secondary" className="ml-2">{filtrosActivos}</Badge>
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={cargarClientes} disabled={loading}>
                <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {mostrarFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t">
              <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroGenero} onValueChange={(v) => { setFiltroGenero(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los géneros</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroSucursal} onValueChange={(v) => { setFiltroSucursal(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las sucursales</SelectItem>
                  {sucursalesDisponibles.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={limpiarFiltros}
                disabled={filtrosActivos === 0}
              >
                <X size={16} className="mr-2" />
                Limpiar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de clientes */}

      {/* Barra de acciones masivas */}
      {clientesSeleccionados.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">
            {clientesSeleccionados.size} cliente(s) seleccionado(s)
          </span>
          <Button
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700"
            onClick={() => handleToggleMasivo('activar')}
            disabled={accionMasivaLoading}
          >
            {accionMasivaLoading ? <Spinner size={14} className="mr-1 animate-spin" /> : <UserCheck size={14} className="mr-1" />}
            Activar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => handleToggleMasivo('desactivar')}
            disabled={accionMasivaLoading}
          >
            <UserMinus size={14} className="mr-1" />
            Desactivar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground"
            onClick={() => setClientesSeleccionados(new Set())}
          >
            <X size={14} className="mr-1" />
            Limpiar selección
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Lista de Clientes</CardTitle>
              <CardDescription>
                {pagination ? `${pagination.total} cliente${pagination.total !== 1 ? 's' : ''} encontrado${pagination.total !== 1 ? 's' : ''}` : 'Cargando...'}
              </CardDescription>
            </div>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-[130px]">
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
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={clientes.length > 0 && clientesSeleccionados.size === clientes.length}
                        onCheckedChange={toggleSeleccionarTodos}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead className="w-[280px]">Cliente</TableHead>
                    <TableHead className="w-[140px]">DPI / NIT</TableHead>
                    <TableHead className="w-[120px]">Contacto</TableHead>
                    <TableHead className="w-[80px] text-center">Estado</TableHead>
                    <TableHead className="w-[100px] text-center">Créditos</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-5 w-16 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-32 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12">
              <User size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No se encontraron clientes</p>
              <p className="text-muted-foreground mb-4">
                {filtrosActivos > 0 ? 'Intenta con otros filtros' : 'Comienza agregando tu primer cliente'}
              </p>
              {filtrosActivos > 0 ? (
                <Button variant="outline" onClick={limpiarFiltros}>
                  <X size={16} className="mr-2" />
                  Limpiar Filtros
                </Button>
              ) : (
                <Button onClick={() => setDialogAbierto(true)}>
                  <Plus weight="bold" className="mr-2" />
                  Crear Primer Cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={clientes.length > 0 && clientesSeleccionados.size === clientes.length}
                        onCheckedChange={toggleSeleccionarTodos}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead className="w-[280px]">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('nombres')}
                      >
                        Cliente
                        <SortIcon field="nombres" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[140px]">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('dpi')}
                      >
                        DPI / NIT
                        <SortIcon field="dpi" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[120px]">Contacto</TableHead>
                    <TableHead className="w-[80px] text-center">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors justify-center w-full"
                        onClick={() => handleSort('estado')}
                      >
                        Estado
                        <SortIcon field="estado" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[100px] text-center">Créditos</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => {
                    const creditosInfo = cliente.creditosInfo || { total: 0, activos: 0, vencidos: 0 }

                    return (
                      <TableRow
                        key={cliente.id}
                        className={creditosInfo.vencidos > 0 ? 'bg-destructive/5' : ''}
                      >
                        <TableCell className="w-10">
                          <Checkbox
                            checked={clientesSeleccionados.has(String(cliente.id))}
                            onCheckedChange={() => toggleSeleccion(String(cliente.id))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {(cliente.fotografia || (cliente as any).fotografia_url) ? (
                                <AvatarImage src={getMediaUrl(cliente.fotografia || (cliente as any).fotografia_url) || ''} alt={cliente.nombres} />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {cliente.nombres[0]}{cliente.apellidos[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {cliente.nombres} {cliente.apellidos}
                                </span>
                              </div>
                              {cliente.sucursal && (
                                <span className="text-xs text-muted-foreground">
                                  <MapPin size={12} className="inline mr-1" />
                                  {cliente.sucursal}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono text-sm">{cliente.dpi}</div>
                            {cliente.nit && (
                              <div className="text-xs text-muted-foreground">
                                NIT: {cliente.nit}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Phone size={12} className="text-muted-foreground" />
                              <span className="font-mono">{cliente.telefono}</span>
                            </div>
                            {cliente.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[140px]">
                                <Envelope size={12} />
                                <span className="truncate">{cliente.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={cliente.estado === 'activo' ? 'default' : 'secondary'}>
                            {cliente.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {creditosInfo.total > 0 ? (
                            <div className="space-y-1">
                              {creditosInfo.activos > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {creditosInfo.activos} activo{creditosInfo.activos !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {creditosInfo.vencidos > 0 && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <Warning size={10} />
                                  {creditosInfo.vencidos}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setClienteDetalle(cliente)}
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setClienteEditar(cliente)
                                setDialogAbierto(true)
                              }}
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setClienteEliminar(cliente)}
                              title="Eliminar"
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {pagination.from} a {pagination.to} de {pagination.total} clientes
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

        </TabsContent>

        <TabsContent value="reportes" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Reportes de Clientes</CardTitle>
              <CardDescription>Descarga reportes en formato CSV con la información de los clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileCsv size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Todos los clientes</p>
                      <p className="text-sm text-muted-foreground">Exportar lista completa de clientes</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDescargarReporte()}
                    disabled={descargandoReporte}
                  >
                    {descargandoReporte ? (
                      <Spinner size={16} className="mr-2 animate-spin" />
                    ) : (
                      <DownloadSimple size={16} className="mr-2" />
                    )}
                    Descargar CSV
                  </Button>
                </div>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <FileCsv size={24} className="text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Clientes activos</p>
                      <p className="text-sm text-muted-foreground">Solo clientes con estado activo</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDescargarReporte('activo')}
                    disabled={descargandoReporte}
                  >
                    {descargandoReporte ? (
                      <Spinner size={16} className="mr-2 animate-spin" />
                    ) : (
                      <DownloadSimple size={16} className="mr-2" />
                    )}
                    Descargar CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogos */}
      <ClienteDialog
        abierto={dialogAbierto}
        onCerrar={() => { setDialogAbierto(false); setClienteEditar(undefined) }}
        onGuardar={handleGuardar}
        cliente={clienteEditar}
        loading={dialogLoading}
      />

      <AlertDialog open={!!clienteEliminar} onOpenChange={() => setClienteEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el cliente "{clienteEliminar?.nombres} {clienteEliminar?.apellidos}" del sistema.
              Esta es una eliminación lógica y el registro se conservará en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
