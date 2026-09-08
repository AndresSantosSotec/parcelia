import { useState, useEffect } from 'react'
import { CreditoPrendario, CreditoPrendarioFiltros, CreditoPrendarioStats, EstadoCreditoPrendario } from '@/types/creditoPrendario.types'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, MagnifyingGlass, Funnel, ArrowsClockwise,
  CreditCard as CreditCardIcon, X, CaretLeft, CaretRight, Calculator, FilePdf, FileXls, Spinner
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { isAuthError } from '@/lib/api'
import { CreditoCard } from './CreditoCard'
import { CreditoStats } from './CreditoStats'
import { CreditoDetalle } from './CreditoDetalle'
import { NuevoCreditoWizard } from './NuevoCreditoWizard'
import { CreditosTable } from './CreditosTable'
import { EditarCreditoModal } from './EditarCreditoModal'
import { EliminarCreditoModal } from './EliminarCreditoModal'
import { SimuladorCredito } from './SimuladorCredito'
import type { UserWithPermissions } from '@/hooks/use-permissions'

export function CreditosModule({
  userId,
  sessionUser,
}: {
  userId?: string
  sessionUser?: UserWithPermissions | null
}) {
  const [creditos, setCreditos] = useState<CreditoPrendario[]>([])
  const [stats, setStats] = useState<CreditoPrendarioStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<CreditoPrendarioFiltros>({})
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCreditoPrendario | 'todos'>('todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  
  // Vista activa
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'wizard'>('lista')
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<CreditoPrendario | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [editarAbierto, setEditarAbierto] = useState(false)
  const [eliminarAbierto, setEliminarAbierto] = useState(false)
  const [creditoAEditar, setCreditoAEditar] = useState<CreditoPrendario | null>(null)
  const [creditoAEliminar, setCreditoAEliminar] = useState<CreditoPrendario | null>(null)
  const [simuladorAbierto, setSimuladorAbierto] = useState(false)

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [registrosPorPagina, setRegistrosPorPagina] = useState(15)

  useEffect(() => {
    if (vistaActiva === 'lista') {
      cargarCreditos()
      cargarEstadisticas()
    }
  }, [filtros, paginaActual, registrosPorPagina, vistaActiva])



  const cargarCreditos = async () => {
    try {
      setLoading(true)
      const response = await creditoPrendarioService.getAll({
        ...filtros,
        busqueda,
        estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
        page: paginaActual,
        per_page: registrosPorPagina,
      })
      setCreditos(Array.isArray(response?.data) ? response.data : [])
      setTotalPaginas(response?.pagination?.last_page || 1)
      setTotalRegistros(response?.pagination?.total || 0)
    } catch (error: any) {
      console.error('Error al cargar créditos:', error)
      if (!isAuthError(error)) {
        toast.error('Error al cargar créditos prendarios')
      }
      setCreditos([])
      setTotalPaginas(1)
      setTotalRegistros(0)
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const estadisticas = await creditoPrendarioService.getEstadisticas()
      setStats(estadisticas)
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleBuscar = () => {
    setPaginaActual(1)
    cargarCreditos()
  }

  const handleLimpiarFiltros = () => {
    setBusqueda('')
    setEstadoFiltro('todos')
    setFiltros({})
    setPaginaActual(1)
  }

  const handleVerDetalle = (credito: CreditoPrendario) => {
    setCreditoSeleccionado(credito)
    setDetalleAbierto(true)
  }

  const handleEditar = (credito: CreditoPrendario) => {
    setCreditoAEditar(credito)
    setEditarAbierto(true)
  }

  const handleEliminar = (credito: CreditoPrendario) => {
    setCreditoAEliminar(credito)
    setEliminarAbierto(true)
  }

  const handleCreditoEliminado = () => {
    setEliminarAbierto(false)
    setCreditoAEliminar(null)
    cargarCreditos()
    cargarEstadisticas()
  }

  const handleCreditoCreado = () => {
    setVistaActiva('lista')
    cargarCreditos()
    cargarEstadisticas()
    toast.success('Crédito prendario creado exitosamente')
  }

  const handleCreditoActualizado = () => {
    setDetalleAbierto(false)
    cargarCreditos()
    cargarEstadisticas()
  }

  // Si estamos en el wizard, mostrar la vista completa
  if (vistaActiva === 'wizard') {
    return (
      <NuevoCreditoWizard
        onCreditoCreado={handleCreditoCreado}
        onCancelar={() => setVistaActiva('lista')}
        userId={userId}
        sessionUser={sessionUser}
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con título y botón */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Créditos Prendarios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión de créditos prendarios y prendas en custodia
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="icon"
            onClick={() => { cargarCreditos(); cargarEstadisticas(); }}
            disabled={loading}
          >
            <ArrowsClockwise className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSimuladorAbierto(true)}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Simulador
          </Button>
          <Button onClick={() => setVistaActiva('wizard')}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo Crédito
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && <CreditoStats stats={stats} />}



      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Búsqueda y Filtros</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <Funnel className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Búsqueda rápida */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, cliente, DPI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="pl-9"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={(v) => {
              setEstadoFiltro(v as any)
              setPaginaActual(1)
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="solicitado">Solicitados</SelectItem>
                <SelectItem value="en_analisis">En Análisis</SelectItem>
                <SelectItem value="aprobado">Aprobados</SelectItem>
                <SelectItem value="vigente">Vigentes</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="en_mora">En Mora</SelectItem>
                <SelectItem value="pagado">Pagados</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleBuscar}>
              <MagnifyingGlass className="h-4 w-4" />
            </Button>
            {(busqueda || estadoFiltro !== 'todos' || Object.values(filtros).some(v => v !== undefined && v !== '')) && (
              <Button variant="outline" onClick={handleLimpiarFiltros}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filtros avanzados (colapsable) */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
              <div>
                <label className="text-sm font-medium">Monto desde</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filtros.monto_min || ''}
                  onChange={(e) => setFiltros({ ...filtros, monto_min: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monto hasta</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filtros.monto_max || ''}
                  onChange={(e) => setFiltros({ ...filtros, monto_max: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Solicitud Desde</label>
                <Input
                  type="date"
                  value={filtros.fecha_desde || ''}
                  onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Solicitud Hasta</label>
                <Input
                  type="date"
                  value={filtros.fecha_hasta || ''}
                  onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Vencimiento Desde</label>
                <Input
                  type="date"
                  value={filtros.fecha_vencimiento_desde || ''}
                  onChange={(e) => setFiltros({ ...filtros, fecha_vencimiento_desde: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Vencimiento Hasta</label>
                <Input
                  type="date"
                  value={filtros.fecha_vencimiento_hasta || ''}
                  onChange={(e) => setFiltros({ ...filtros, fecha_vencimiento_hasta: e.target.value || undefined })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (!creditos || creditos.length === 0) ? (
          <Card className="p-12 text-center">
            <CreditCardIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
            <p className="text-lg font-medium mb-2">No hay créditos prendarios</p>
            <p className="text-muted-foreground mb-4">
              {busqueda || estadoFiltro !== 'todos' 
                ? 'No se encontraron resultados con los filtros aplicados'
                : 'Comienza creando tu primer crédito prendario'
              }
            </p>
            {(!busqueda && estadoFiltro === 'todos') && (
              <Button onClick={() => setVistaActiva('wizard')}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Crédito
              </Button>
            )}
          </Card>
        ) : (
          <CreditosTable
            creditos={creditos}
            onVerDetalle={handleVerDetalle}
            onEditar={handleEditar}
            onEliminar={handleEliminar}
            loading={loading}
            totalRegistros={totalRegistros}
            paginaActual={paginaActual}
            registrosPorPagina={registrosPorPagina}
            onCambiarPagina={setPaginaActual}
            onCambiarRegistrosPorPagina={(n) => {
              setRegistrosPorPagina(n)
              setPaginaActual(1)
            }}
          />
        )}
      </div>

      {/* Detalle del Crédito */}
      {creditoSeleccionado && (
        <CreditoDetalle
          credito={creditoSeleccionado}
          abierto={detalleAbierto}
          onCerrar={() => { setDetalleAbierto(false); setCreditoSeleccionado(null); }}
          onActualizado={handleCreditoActualizado}
          sessionUser={sessionUser}
        />
      )}

      {/* Modal de Edición */}
      <EditarCreditoModal
        credito={creditoAEditar}
        abierto={editarAbierto}
        onCerrar={() => { setEditarAbierto(false); setCreditoAEditar(null); }}
        onActualizado={() => { 
          setEditarAbierto(false)
          setCreditoAEditar(null)
          handleCreditoActualizado()
        }}
      />

      {/* Modal de Eliminación */}
      <EliminarCreditoModal
        credito={creditoAEliminar}
        abierto={eliminarAbierto}
        onCerrar={() => { setEliminarAbierto(false); setCreditoAEliminar(null); }}
        onEliminado={handleCreditoEliminado}
      />

      {/* Simulador de Crédito */}
      <SimuladorCredito
        abierto={simuladorAbierto}
        onCerrar={() => setSimuladorAbierto(false)}
      />
    </div>
  )
}
