import { useState, useEffect, useCallback, useMemo } from 'react'
import { Usuario, ROLES_DEFAULT } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, ShieldCheck, Pencil, Trash, Power, Lock,
  MagnifyingGlass, FunnelSimple, CaretUp, CaretDown,
  CaretLeft, CaretRight, Users, UserCheck, UserMinus,
  ArrowsClockwise, Buildings
} from '@phosphor-icons/react'
import { UsuarioDialog } from './UsuarioDialog'
import { PermisosDialog } from './PermisosDialog'
import { userService, UserFilters, PaginationInfo, UserStats, isAuthError } from '@/lib/api'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/helpers'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

interface UsuariosModuleProps {
  currentSessionUserId?: string
  onPermisosSavedForCurrentUser?: () => void | Promise<void>
}

export function UsuariosModule({
  currentSessionUserId,
  onPermisosSavedForCurrentUser,
}: UsuariosModuleProps = {}) {
  // Estados principales
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)

  // Estados de filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [ordenarPor, setOrdenarPor] = useState<'name' | 'email' | 'rol' | 'created_at'>('created_at')
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('desc')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  // Estados de diálogos
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | undefined>(undefined)
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null)
  const [permisosDialogAbierto, setPermisosDialogAbierto] = useState(false)
  const [usuarioPermisos, setUsuarioPermisos] = useState<{ id: string; nombre: string; rol: string } | null>(null)

  // Debounce para búsqueda
  const busquedaDebounced = useDebounce(busqueda, 300)

  // Cargar usuarios
  const cargarUsuarios = useCallback(async (forceReloadStats = false) => {
    setLoading(true)
    try {
      const filters: UserFilters = {
        page: pagina,
        per_page: porPagina,
        order_by: ordenarPor,
        order_dir: ordenDir,
      }

      if (busquedaDebounced) filters.busqueda = busquedaDebounced
      if (filtroRol !== 'todos') filters.rol = filtroRol
      if (filtroEstado === 'activos') filters.activo = true
      if (filtroEstado === 'inactivos') filters.activo = false

      const response = await userService.getAll(filters)

      if (response.success) {
        const data = response as any
        const usuariosMapeados: Usuario[] = (data.data || []).map((u: any) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          username: u.username,
          rol: u.rol,
          permisos: ROLES_DEFAULT.find(r => r.nombre === u.rol)?.permisos || [],
          activo: u.activo,
          sucursal_id: u.sucursal_id,
          sucursal: u.sucursal,
          creadoEn: u.creadoEn,
        }))
        setUsuarios(usuariosMapeados)
        setPagination(data.pagination || null)

        // Solo actualizar estadísticas si vienen en la respuesta
        // (no vienen cuando skip_stats=1 en páginas > 1)
        if (data.stats || forceReloadStats) {
          setStats(data.stats || null)
        }
      }
    } catch (error: any) {
      console.error('Error cargando usuarios:', error)
      if (!isAuthError(error)) {
        toast.error('Error al cargar usuarios')
      }
    } finally {
      setLoading(false)
    }
  }, [pagina, porPagina, ordenarPor, ordenDir, busquedaDebounced, filtroRol, filtroEstado])

  useEffect(() => {
    cargarUsuarios()
  }, [cargarUsuarios])

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPagina(1)
  }, [busquedaDebounced, filtroRol, filtroEstado])

  // Handlers
  const handleGuardar = async (usuarioData: Partial<Usuario> & { password?: string }, fotoFile?: File) => {
    try {
      let userId = usuarioEditar?.id

      if (userId) {
        await userService.update(userId, usuarioData)
        toast.success('Usuario actualizado exitosamente')
      } else {
        const response: any = await userService.create(usuarioData)
        if (response.success && response.data) {
          userId = response.data.id
          toast.success('Usuario creado exitosamente')
        }
      }

      if (userId && fotoFile) {
        await userService.uploadPhoto(userId, fotoFile)
      }

      await cargarUsuarios(true)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario')
      throw error
    }
  }

  const handleEliminar = async () => {
    if (!usuarioEliminar) return
    try {
      await userService.delete(usuarioEliminar.id)
      toast.success('Usuario eliminado exitosamente')
      setUsuarioEliminar(null)
      await cargarUsuarios(true)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario')
    }
  }

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      await userService.toggleActivo(usuario.id)
      toast.success(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} exitosamente`)
      await cargarUsuarios(true)
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado del usuario')
    }
  }

  const handleOrdenar = (campo: 'name' | 'email' | 'rol' | 'created_at') => {
    if (ordenarPor === campo) {
      setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(campo)
      setOrdenDir('asc')
    }
  }

  // Helpers
  const rolColors: Record<string, string> = {
    superadmin: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    administrador: 'bg-primary text-primary-foreground',
    cajero: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    tasador: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    supervisor: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    vendedor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  }

  const rolLabels: Record<string, string> = {
    superadmin: 'SuperAdmin',
    administrador: 'Administrador',
    cajero: 'Cajero',
    tasador: 'Tasador',
    supervisor: 'Supervisor',
    vendedor: 'Vendedor',
  }

  const getInitials = (nombre: string) => {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Componente de ordenamiento
  const SortHeader = ({ campo, label }: { campo: 'name' | 'email' | 'rol' | 'created_at'; label: string }) => (
    <th
      className="text-left p-3 font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={() => handleOrdenar(campo)}
    >
      <div className="flex items-center gap-1">
        {label}
        {ordenarPor === campo && (
          ordenDir === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />
        )}
      </div>
    </th>
  )

  // Skeleton loader
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b">
          <td className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </td>
          <td className="p-3"><Skeleton className="h-4 w-40" /></td>
          <td className="p-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
          <td className="p-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
          <td className="p-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
          <td className="p-3"><Skeleton className="h-4 w-24" /></td>
          <td className="p-3"><Skeleton className="h-8 w-32" /></td>
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con título y botón */}
      <div className="page-toolbar">
        <div className="min-w-0">
          <h1 className="font-bold tracking-tight">Usuarios y Roles</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de {stats?.total || 0} usuarios del sistema
          </p>
        </div>
        <div className="page-toolbar-actions">
          <Button
            variant="outline"
            size="icon"
            onClick={() => cargarUsuarios(true)}
            disabled={loading}
          >
            <ArrowsClockwise className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => { setUsuarioEditar(undefined); setDialogAbierto(true) }}>
            <Plus className="mr-1" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activos || 0}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <UserMinus size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.inactivos || 0}</p>
                <p className="text-xs text-muted-foreground">Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ShieldCheck size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.por_rol?.administrador || 0}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar por nombre, email o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por rol */}
            <Select value={filtroRol} onValueChange={setFiltroRol}>
              <SelectTrigger className="w-full md:w-[180px]">
                <FunnelSimple className="mr-2" size={16} />
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los roles</SelectItem>
                <SelectItem value="superadmin">SuperAdmin</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
                <SelectItem value="cajero">Cajero</SelectItem>
                <SelectItem value="tasador">Tasador</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por estado */}
            <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            {/* Items por página */}
            <Select value={String(porPagina)} onValueChange={(v) => { setPorPagina(Number(v)); setPagina(1) }}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / pág</SelectItem>
                <SelectItem value="25">25 / pág</SelectItem>
                <SelectItem value="50">50 / pág</SelectItem>
                <SelectItem value="100">100 / pág</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <SortHeader campo="name" label="Usuario" />
                  <SortHeader campo="email" label="Email" />
                  <SortHeader campo="rol" label="Rol" />
                  <th className="text-left p-3 font-medium">Sucursal</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <SortHeader campo="created_at" label="Creado" />
                  <th className="text-right p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos'
                        ? 'No se encontraron usuarios con los filtros aplicados'
                        : 'No hay usuarios registrados'}
                    </td>
                  </tr>
                ) : (
                  usuarios.map(usuario => (
                    <tr key={usuario.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={cn(
                              "text-sm font-medium",
                              usuario.activo ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {getInitials(usuario.nombre)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{usuario.nombre}</p>
                            <p className="text-xs text-muted-foreground">@{usuario.username || usuario.email.split('@')[0]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-muted-foreground">{usuario.email}</span>
                      </td>
                      <td className="p-3">
                        <Badge className={rolColors[usuario.rol]}>
                          {rolLabels[usuario.rol]}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {usuario.sucursal ? (
                          <div className="flex items-center gap-1.5">
                            <Buildings size={14} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{usuario.sucursal.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Todas las sucursales</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={usuario.activo ? "default" : "secondary"}
                          className={cn(
                            usuario.activo
                              ? "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30"
                              : "bg-red-500/20 text-red-600 dark:text-red-400"
                          )}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {usuario.creadoEn ? formatDateShort(usuario.creadoEn) : '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setUsuarioEditar(usuario); setDialogAbierto(true) }}
                                >
                                  <Pencil size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setUsuarioPermisos({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol })
                                    setPermisosDialogAbierto(true)
                                  }}
                                >
                                  <Lock size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Permisos</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActivo(usuario)}
                                  className={usuario.activo ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                                >
                                  <Power size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{usuario.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setUsuarioEliminar(usuario)}
                                >
                                  <Trash size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Mostrando {pagination.from} a {pagination.to} de {pagination.total} usuarios
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1 || loading}
                >
                  <CaretLeft size={16} />
                  Anterior
                </Button>

                {/* Números de página */}
                <div className="hidden sm:flex items-center gap-1">
                  {[...Array(Math.min(5, pagination.last_page))].map((_, i) => {
                    let pageNum: number
                    if (pagination.last_page <= 5) {
                      pageNum = i + 1
                    } else if (pagina <= 3) {
                      pageNum = i + 1
                    } else if (pagina >= pagination.last_page - 2) {
                      pageNum = pagination.last_page - 4 + i
                    } else {
                      pageNum = pagina - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pagina === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9"
                        onClick={() => setPagina(pageNum)}
                        disabled={loading}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <span className="sm:hidden text-sm">
                  Página {pagina} de {pagination.last_page}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(p => Math.min(pagination.last_page, p + 1))}
                  disabled={pagina === pagination.last_page || loading}
                >
                  Siguiente
                  <CaretRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de roles (colapsable en móvil) */}
      <details className="group" open>
        <summary className="flex items-center gap-2 cursor-pointer list-none text-lg font-semibold mb-3">
          <CaretRight size={20} className="transition-transform group-open:rotate-90" />
          Distribución por Roles
        </summary>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pl-7">
          {Object.entries(stats?.por_rol || {}).map(([rol, count]) => (
            <Card key={rol} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 text-center">
                <Badge className={cn("mb-2", rolColors[rol])}>{rolLabels[rol]}</Badge>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </details>

      {/* Diálogos */}
      <UsuarioDialog
        abierto={dialogAbierto}
        onCerrar={() => { setDialogAbierto(false); setUsuarioEditar(undefined) }}
        onGuardar={handleGuardar}
        usuario={usuarioEditar}
      />

      <AlertDialog open={!!usuarioEliminar} onOpenChange={(open) => !open && setUsuarioEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{usuarioEliminar?.nombre}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PermisosDialog
        abierto={permisosDialogAbierto}
        onCerrar={() => { setPermisosDialogAbierto(false); setUsuarioPermisos(null) }}
        usuario={usuarioPermisos}
        onActualizado={() => cargarUsuarios(true)}
        currentSessionUserId={currentSessionUserId}
        onPermisosSavedForCurrentUser={onPermisosSavedForCurrentUser}
      />
    </div>
  )
}
