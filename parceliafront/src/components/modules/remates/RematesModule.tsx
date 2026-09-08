import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Gavel,
  MagnifyingGlass,
  ArrowClockwise,
  Warning,
  Package,
  CurrencyDollar,
  Clock,
  CheckCircle,
  XCircle,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import { remateService, Remate, CandidatoRemate, RemateEstadisticas } from '@/services/remate.service'

export function RematesModule() {
  const [tabActiva, setTabActiva] = useState('candidatos')
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Candidatos
  const [candidatos, setCandidatos] = useState<CandidatoRemate[]>([])
  const [paginaCandidatos, setPaginaCandidatos] = useState(1)
  const [totalPaginasCandidatos, setTotalPaginasCandidatos] = useState(1)

  // Historial de remates
  const [remates, setRemates] = useState<Remate[]>([])
  const [paginaRemates, setPaginaRemates] = useState(1)
  const [totalPaginasRemates, setTotalPaginasRemates] = useState(1)
  const [filtroEstado, setFiltroEstado] = useState('')

  // Estadísticas
  const [stats, setStats] = useState<RemateEstadisticas | null>(null)

  // Diálogo de confirmar remate
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState<CandidatoRemate | null>(null)
  const [motivoRemate, setMotivoRemate] = useState('')
  const [procesandoRemate, setProcesandoRemate] = useState(false)

  // Diálogo de cancelar remate
  const [remateACancelar, setRemateACancelar] = useState<Remate | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')

  const cargarEstadisticas = useCallback(async () => {
    try {
      const resp = await remateService.obtenerEstadisticas()
      if (resp.success && resp.data) {
        setStats(resp.data)
      }
    } catch (err: any) {
      console.error('Error cargando estadísticas:', err)
    }
  }, [])

  const cargarCandidatos = useCallback(async () => {
    setCargando(true)
    try {
      const resp = await remateService.obtenerCandidatos({
        page: paginaCandidatos,
        per_page: 15,
      })
      if (resp.success && resp.data) {
        setCandidatos(resp.data.data || [])
        setTotalPaginasCandidatos(resp.data.last_page || 1)
      }
    } catch (err: any) {
      toast.error('Error al cargar candidatos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }, [paginaCandidatos])

  const cargarRemates = useCallback(async () => {
    setCargando(true)
    try {
      const resp = await remateService.listar({
        estado: filtroEstado || undefined,
        search: busqueda || undefined,
        page: paginaRemates,
        per_page: 15,
      })
      if (resp.success && resp.data) {
        setRemates(resp.data.data || [])
        setTotalPaginasRemates(resp.data.last_page || 1)
      }
    } catch (err: any) {
      toast.error('Error al cargar remates: ' + err.message)
    } finally {
      setCargando(false)
    }
  }, [filtroEstado, busqueda, paginaRemates])

  useEffect(() => {
    cargarEstadisticas()
  }, [cargarEstadisticas])

  useEffect(() => {
    if (tabActiva === 'candidatos') cargarCandidatos()
  }, [tabActiva, cargarCandidatos])

  useEffect(() => {
    if (tabActiva === 'historial') cargarRemates()
  }, [tabActiva, cargarRemates])

  const handleEjecutarRemate = async () => {
    if (!candidatoSeleccionado) return
    setProcesandoRemate(true)
    try {
      const resp = await remateService.ejecutarRemate({
        credito_id: candidatoSeleccionado.id,
        motivo: motivoRemate || 'Remate manual por vencimiento',
      })
      if (resp.success) {
        toast.success('Remate ejecutado exitosamente')
        setCandidatoSeleccionado(null)
        setMotivoRemate('')
        cargarCandidatos()
        cargarEstadisticas()
      }
    } catch (err: any) {
      toast.error('Error al ejecutar remate: ' + err.message)
    } finally {
      setProcesandoRemate(false)
    }
  }

  const handleCancelarRemate = async () => {
    if (!remateACancelar || !motivoCancelacion.trim()) return
    try {
      const resp = await remateService.cancelarRemate(remateACancelar.id, motivoCancelacion)
      if (resp.success) {
        toast.success('Remate cancelado')
        setRemateACancelar(null)
        setMotivoCancelacion('')
        cargarRemates()
        cargarEstadisticas()
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    }
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      ejecutado: 'bg-blue-100 text-blue-800',
      vendido: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gavel size={28} weight="duotone" />
            Remates de Contratos Vencidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de remates para créditos vencidos que superan el plazo legal
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          cargarEstadisticas()
          if (tabActiva === 'candidatos') cargarCandidatos()
          else cargarRemates()
        }}>
          <ArrowClockwise size={16} className="mr-1" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Warning size={24} className="mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{stats.candidatos_remate}</p>
              <p className="text-xs text-muted-foreground">Candidatos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock size={24} className="mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.pendientes}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{stats.ejecutados + stats.vendidos}</p>
              <p className="text-xs text-muted-foreground">Ejecutados / Vendidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CurrencyDollar size={24} className="mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{formatMoney(stats.deuda_total_rematada)}</p>
              <p className="text-xs text-muted-foreground">Deuda Total Rematada</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList>
          <TabsTrigger value="candidatos">
            <Warning size={16} className="mr-1" /> Candidatos a Remate
          </TabsTrigger>
          <TabsTrigger value="historial">
            <Package size={16} className="mr-1" /> Historial de Remates
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB CANDIDATOS ===== */}
        <TabsContent value="candidatos" className="space-y-4">
          {cargando ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando candidatos...</CardContent></Card>
          ) : candidatos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                <p className="text-lg font-medium">Sin candidatos a remate</p>
                <p className="text-sm text-muted-foreground">No hay créditos que superen el plazo de vencimiento para remate</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-medium">Crédito</th>
                      <th className="p-3 font-medium">Cliente</th>
                      <th className="p-3 font-medium">Vencimiento</th>
                      <th className="p-3 font-medium text-right">Días Vencido</th>
                      <th className="p-3 font-medium text-right">Capital</th>
                      <th className="p-3 font-medium text-right">Deuda Total</th>
                      <th className="p-3 font-medium text-center">Prendas</th>
                      <th className="p-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatos.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs">{c.codigo_credito}</td>
                        <td className="p-3">
                          {c.cliente ? `${c.cliente.nombres} ${c.cliente.apellidos}` : 'N/A'}
                        </td>
                        <td className="p-3">{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-GT') : '-'}</td>
                        <td className="p-3 text-right">
                          <span className="text-red-600 font-bold">{c.dias_vencido}</span>
                        </td>
                        <td className="p-3 text-right">{formatMoney(c.capital_pendiente)}</td>
                        <td className="p-3 text-right font-semibold">{formatMoney(c.deuda_total)}</td>
                        <td className="p-3 text-center">{c.prendas?.length || 0}</td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setCandidatoSeleccionado(c)}
                          >
                            <Gavel size={14} className="mr-1" />
                            Rematar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación candidatos */}
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={paginaCandidatos <= 1}
                  onClick={() => setPaginaCandidatos((p) => p - 1)}
                >
                  <CaretLeft size={14} />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {paginaCandidatos} de {totalPaginasCandidatos}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={paginaCandidatos >= totalPaginasCandidatos}
                  onClick={() => setPaginaCandidatos((p) => p + 1)}
                >
                  <CaretRight size={14} />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== TAB HISTORIAL ===== */}
        <TabsContent value="historial" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código..."
                className="pl-9"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPaginaRemates(1) }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPaginaRemates(1) }}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="ejecutado">Ejecutado</option>
              <option value="vendido">Vendido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {cargando ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando remates...</CardContent></Card>
          ) : remates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No se encontraron remates
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-medium">Código</th>
                      <th className="p-3 font-medium">Tipo</th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium">Prenda</th>
                      <th className="p-3 font-medium text-right">Deuda Total</th>
                      <th className="p-3 font-medium text-right">Avalúo</th>
                      <th className="p-3 font-medium">Fecha</th>
                      <th className="p-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remates.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs">{r.codigo_remate}</td>
                        <td className="p-3">
                          <Badge variant={r.tipo === 'manual' ? 'default' : 'secondary'}>
                            {r.tipo === 'manual' ? 'Manual' : 'Automático'}
                          </Badge>
                        </td>
                        <td className="p-3">{estadoBadge(r.estado)}</td>
                        <td className="p-3 text-xs">
                          {r.prenda?.descripcion?.slice(0, 40) || `Prenda #${r.prenda_id}`}
                        </td>
                        <td className="p-3 text-right">{formatMoney(r.deuda_total)}</td>
                        <td className="p-3 text-right">{formatMoney(r.valor_avaluo)}</td>
                        <td className="p-3">{new Date(r.fecha_remate).toLocaleDateString('es-GT')}</td>
                        <td className="p-3 text-center">
                          {r.estado === 'pendiente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRemateACancelar(r)}
                              className="text-red-600"
                            >
                              <XCircle size={14} className="mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación remates */}
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={paginaRemates <= 1}
                  onClick={() => setPaginaRemates((p) => p - 1)}
                >
                  <CaretLeft size={14} />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {paginaRemates} de {totalPaginasRemates}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={paginaRemates >= totalPaginasRemates}
                  onClick={() => setPaginaRemates((p) => p + 1)}
                >
                  <CaretRight size={14} />
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== MODAL: CONFIRMAR REMATE ===== */}
      {candidatoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Gavel size={20} />
                Confirmar Remate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                  ¿Está seguro de rematar este crédito?
                </p>
                <p className="text-red-700 dark:text-red-300">
                  Las prendas asociadas se marcarán como disponibles para venta por remate.
                  Esta acción cambiará el estado del crédito a <strong>rematado</strong>.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito:</span>
                  <span className="font-mono">{candidatoSeleccionado.codigo_credito}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span>
                    {candidatoSeleccionado.cliente
                      ? `${candidatoSeleccionado.cliente.nombres} ${candidatoSeleccionado.cliente.apellidos}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Días vencido:</span>
                  <span className="text-red-600 font-bold">{candidatoSeleccionado.dias_vencido}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deuda total:</span>
                  <span className="font-bold">{formatMoney(candidatoSeleccionado.deuda_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prendas:</span>
                  <span>{candidatoSeleccionado.prendas?.length || 0}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <Input
                  placeholder="Motivo del remate..."
                  value={motivoRemate}
                  onChange={(e) => setMotivoRemate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCandidatoSeleccionado(null)
                    setMotivoRemate('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={procesandoRemate}
                  onClick={handleEjecutarRemate}
                >
                  {procesandoRemate ? 'Procesando...' : 'Confirmar Remate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== MODAL: CANCELAR REMATE ===== */}
      {remateACancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Cancelar Remate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cancelar el remate <strong>{remateACancelar.codigo_remate}</strong>.
                El crédito volverá a su estado anterior.
              </p>
              <div>
                <label className="text-sm font-medium">Motivo de cancelación *</label>
                <Input
                  placeholder="Ingrese el motivo..."
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRemateACancelar(null); setMotivoCancelacion('') }}>
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  disabled={!motivoCancelacion.trim()}
                  onClick={handleCancelarRemate}
                >
                  Confirmar Cancelación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
