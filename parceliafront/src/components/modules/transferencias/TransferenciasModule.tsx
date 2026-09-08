import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@/hooks/use-kv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  ArrowsLeftRight,
  MagnifyingGlass,
  ArrowClockwise,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Package,
  CaretLeft,
  CaretRight,
  Info,
} from '@phosphor-icons/react'
import {
  transferenciaService,
  Transferencia,
  TransferenciaEstadisticas,
  EstadoTransferencia,
} from '@/services/transferencia.service'
import { sucursalService } from '@/lib/api'
import { BuscadorPrendasTabla } from './BuscadorPrendasTabla'

export function TransferenciasModule() {
  const [tabActiva, setTabActiva] = useState('pendientes')
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Transferencias
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  // Estadísticas
  const [stats, setStats] = useState<TransferenciaEstadisticas | null>(null)

  // Nueva transferencia
  const [mostrarNueva, setMostrarNueva] = useState(false)
  const [sucursales, setSucursales] = useState<Array<{ id: string; codigo: string; nombre: string }>>([])
  const [refrescarSucursalesTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)
  const [formNueva, setFormNueva] = useState({
    prenda_id: '',
    sucursal_origen_id: '',
    sucursal_destino_id: '',
    motivo: '',
  })
  const [enviandoNueva, setEnviandoNueva] = useState(false)

  // Buscador de prendas
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<any>(null)

  // Modales de acción
  const [accionModal, setAccionModal] = useState<{
    tipo: 'autorizar' | 'enviar' | 'recibir' | 'rechazar'
    transferencia: Transferencia
  } | null>(null)
  const [observacionesAccion, setObservacionesAccion] = useState('')

  const cargarEstadisticas = useCallback(async () => {
    try {
      const resp = await transferenciaService.obtenerEstadisticas()
      if (resp.success && resp.data) setStats(resp.data)
    } catch { /* silenciar */ }
  }, [])

  const cargarTransferencias = useCallback(async () => {
    setCargando(true)
    try {
      const estadoFiltro = tabActiva === 'pendientes'
        ? (filtroEstado || undefined)
        : (filtroEstado || undefined)

      const resp = await transferenciaService.listar({
        estado: estadoFiltro,
        search: busqueda || undefined,
        page: pagina,
        per_page: 15,
      })
      if (resp.success && resp.data) {
        setTransferencias(resp.data.data || [])
        setTotalPaginas(resp.data.last_page || 1)
      }
    } catch (err: any) {
      toast.error('Error al cargar transferencias: ' + err.message)
    } finally {
      setCargando(false)
    }
  }, [tabActiva, filtroEstado, busqueda, pagina])

  const cargarSucursales = useCallback(async () => {
    try {
      const resp = await sucursalService.getActivas()
      if (resp.data) setSucursales(resp.data as any)
    } catch { /* silenciar */ }
  }, [refrescarSucursalesTrigger])

  const seleccionarPrenda = (prenda: any) => {
    setPrendaSeleccionada(prenda)
    const sucursalOrigenId = prenda.sucursal_id ?? prenda.sucursal?.id ?? ''
    setFormNueva(prev => ({ ...prev, prenda_id: String(prenda.id), sucursal_origen_id: String(sucursalOrigenId) }))
  }

  useEffect(() => { cargarEstadisticas() }, [cargarEstadisticas])
  useEffect(() => { cargarTransferencias() }, [cargarTransferencias])
  useEffect(() => {
    if (mostrarNueva && sucursales.length === 0) cargarSucursales()
  }, [mostrarNueva, sucursales.length, cargarSucursales])

  const handleCrearTransferencia = async () => {
    if (!formNueva.prenda_id || !formNueva.sucursal_destino_id || !formNueva.motivo.trim()) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    setEnviandoNueva(true)
    try {
      const resp = await transferenciaService.solicitar({
        prenda_id: formNueva.prenda_id,
        sucursal_origen_id: formNueva.sucursal_origen_id || undefined,
        sucursal_destino_id: formNueva.sucursal_destino_id,
        motivo: formNueva.motivo,
      })
      if (resp.success) {
        toast.success('Transferencia solicitada exitosamente')
        setMostrarNueva(false)
        setFormNueva({ prenda_id: '', sucursal_origen_id: '', sucursal_destino_id: '', motivo: '' })
        cargarTransferencias()
        cargarEstadisticas()
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setEnviandoNueva(false)
    }
  }

  const ejecutarAccion = async () => {
    if (!accionModal) return
    const { tipo, transferencia } = accionModal
    try {
      let resp
      switch (tipo) {
        case 'autorizar':
          resp = await transferenciaService.autorizar(transferencia.id, observacionesAccion)
          break
        case 'enviar':
          resp = await transferenciaService.enviar(transferencia.id)
          break
        case 'recibir':
          resp = await transferenciaService.recibir(transferencia.id, observacionesAccion)
          break
        case 'rechazar':
          if (!observacionesAccion.trim()) {
            toast.error('El motivo de rechazo es obligatorio')
            return
          }
          resp = await transferenciaService.rechazar(transferencia.id, observacionesAccion)
          break
      }
      if (resp?.success) {
        const mensajes: Record<string, string> = {
          autorizar: 'Transferencia autorizada',
          enviar: 'Prenda marcada como en tránsito',
          recibir: 'Prenda recibida exitosamente',
          rechazar: 'Transferencia rechazada',
        }
        toast.success(mensajes[tipo])
        setAccionModal(null)
        setObservacionesAccion('')
        cargarTransferencias()
        cargarEstadisticas()
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const estadoBadge = (estado: EstadoTransferencia) => {
    const map: Record<EstadoTransferencia, { clase: string; icono: any }> = {
      solicitada: { clase: 'bg-blue-100 text-blue-800', icono: <Clock size={12} /> },
      autorizada: { clase: 'bg-green-100 text-green-800', icono: <CheckCircle size={12} /> },
      en_transito: { clase: 'bg-purple-100 text-purple-800', icono: <Truck size={12} /> },
      recibida: { clase: 'bg-emerald-100 text-emerald-800', icono: <Package size={12} /> },
      rechazada: { clase: 'bg-red-100 text-red-800', icono: <XCircle size={12} /> },
      cancelada: { clase: 'bg-gray-100 text-gray-800', icono: <XCircle size={12} /> },
    }
    const conf = map[estado] || map.cancelada
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${conf.clase}`}>
        {conf.icono}
        {estado.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
      </span>
    )
  }

  const botonesAccion = (t: Transferencia) => {
    const btns: React.ReactElement[] = []
    if (t.estado === 'solicitada') {
      btns.push(
        <Button key="auth" size="sm" variant="default" onClick={() => setAccionModal({ tipo: 'autorizar', transferencia: t })}>
          <CheckCircle size={14} className="mr-1" /> Autorizar
        </Button>,
        <Button key="rej" size="sm" variant="outline" className="text-red-600" onClick={() => setAccionModal({ tipo: 'rechazar', transferencia: t })}>
          <XCircle size={14} className="mr-1" /> Rechazar
        </Button>
      )
    }
    if (t.estado === 'autorizada') {
      btns.push(
        <Button key="env" size="sm" variant="default" onClick={() => setAccionModal({ tipo: 'enviar', transferencia: t })}>
          <PaperPlaneTilt size={14} className="mr-1" /> Enviar
        </Button>
      )
    }
    if (t.estado === 'en_transito' || t.estado === 'autorizada') {
      btns.push(
        <Button key="rec" size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => setAccionModal({ tipo: 'recibir', transferencia: t })}>
          <Package size={14} className="mr-1" /> Recibir
        </Button>
      )
    }
    return btns.length > 0 ? <div className="flex gap-1 flex-wrap">{btns}</div> : <span className="text-muted-foreground text-xs">—</span>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowsLeftRight size={28} weight="duotone" />
            Transferencias Inter-Sucursales
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de envío y recepción de prendas entre sucursales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { cargarEstadisticas(); cargarTransferencias() }}>
            <ArrowClockwise size={16} className="mr-1" /> Actualizar
          </Button>
          <Button size="sm" onClick={() => setMostrarNueva(true)}>
            <PaperPlaneTilt size={16} className="mr-1" /> Nueva Transferencia
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock size={24} className="mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{stats.solicitadas}</p>
              <p className="text-xs text-muted-foreground">Solicitadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Truck size={24} className="mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">{stats.en_transito}</p>
              <p className="text-xs text-muted-foreground">En Tránsito</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{stats.recibidas}</p>
              <p className="text-xs text-muted-foreground">Recibidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Info size={24} className="mx-auto mb-1 text-gray-500" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o prenda..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }}
        >
          <option value="">Todos los estados</option>
          <option value="solicitada">Solicitada</option>
          <option value="autorizada">Autorizada</option>
          <option value="en_transito">En Tránsito</option>
          <option value="recibida">Recibida</option>
          <option value="rechazada">Rechazada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Tabla */}
      {cargando ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando transferencias...</CardContent></Card>
      ) : transferencias.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No se encontraron transferencias
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium">Código</th>
                  <th className="p-3 font-medium">Prenda</th>
                  <th className="p-3 font-medium">Origen</th>
                  <th className="p-3 font-medium">Destino</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Fecha Solicitud</th>
                  <th className="p-3 font-medium">Motivo</th>
                  <th className="p-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">{t.codigo_transferencia}</td>
                    <td className="p-3 text-xs">
                      {t.prenda?.descripcion?.slice(0, 35) || `Prenda #${t.prenda_id}`}
                    </td>
                    <td className="p-3 text-xs">{t.sucursal_origen?.nombre || `Suc. #${t.sucursal_origen_id}`}</td>
                    <td className="p-3 text-xs">{t.sucursal_destino?.nombre || `Suc. #${t.sucursal_destino_id}`}</td>
                    <td className="p-3">{estadoBadge(t.estado)}</td>
                    <td className="p-3">{t.fecha_solicitud ? new Date(t.fecha_solicitud).toLocaleDateString('es-GT') : '-'}</td>
                    <td className="p-3 text-xs max-w-[200px] truncate">{t.motivo}</td>
                    <td className="p-3">{botonesAccion(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              <CaretLeft size={14} />
            </Button>
            <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
            <Button size="sm" variant="outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              <CaretRight size={14} />
            </Button>
          </div>
        </>
      )}

      {/* ===== MODAL: NUEVA TRANSFERENCIA ===== */}
      {mostrarNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <PaperPlaneTilt size={20} />
                Nueva Transferencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabla de prendas con búsqueda y filtros */}
              <div>
                <label className="text-sm font-medium mb-2 block">Seleccionar Prenda *</label>
                <BuscadorPrendasTabla
                  onSeleccionar={seleccionarPrenda}
                  prendaSeleccionada={prendaSeleccionada}
                />
              </div>

              {/* Resumen de prenda seleccionada */}
              {prendaSeleccionada && (
                <div className="rounded-lg border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/40 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} weight="fill" className="text-green-600" />
                    <span className="text-xs font-semibold text-green-800 dark:text-green-300">Prenda seleccionada para transferir</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Código:</span>
                      <span className="ml-1 font-mono font-bold text-blue-600">{prendaSeleccionada.codigo_prenda}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground">Descripción:</span>
                      <span className="ml-1">{(prendaSeleccionada.descripcion || '—').slice(0, 40)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ubicación:</span>
                      <span className="ml-1 font-bold text-blue-700 dark:text-blue-400">
                        {typeof prendaSeleccionada.sucursal === 'object' ? prendaSeleccionada.sucursal?.nombre : prendaSeleccionada.sucursal || '—'}
                      </span>
                    </div>
                    {prendaSeleccionada.valor_tasacion && (
                      <div>
                        <span className="text-muted-foreground">Tasación:</span>
                        <span className="ml-1 font-bold text-green-700 dark:text-green-400">
                          Q{Number(prendaSeleccionada.valor_tasacion).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sucursal destino y motivo en una fila */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sucursal Destino *</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1"
                    value={formNueva.sucursal_destino_id}
                    onChange={(e) => setFormNueva({ ...formNueva, sucursal_destino_id: e.target.value })}
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Motivo *</label>
                  <Input
                    className="mt-1"
                    placeholder="Motivo de la transferencia"
                    value={formNueva.motivo}
                    onChange={(e) => setFormNueva({ ...formNueva, motivo: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setMostrarNueva(false); setPrendaSeleccionada(null); setFormNueva({ prenda_id: '', sucursal_origen_id: '', sucursal_destino_id: '', motivo: '' }) }}>Cancelar</Button>
                <Button disabled={enviandoNueva} onClick={handleCrearTransferencia}>
                  {enviandoNueva ? 'Enviando...' : 'Solicitar Transferencia'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== MODAL: ACCIÓN (autorizar/enviar/recibir/rechazar) ===== */}
      {accionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="capitalize">
                {accionModal.tipo === 'rechazar' ? 'Rechazar' : accionModal.tipo.charAt(0).toUpperCase() + accionModal.tipo.slice(1)} Transferencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-mono">{accionModal.transferencia.codigo_transferencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prenda:</span>
                  <span>{accionModal.transferencia.prenda?.descripcion?.slice(0, 30) || `#${accionModal.transferencia.prenda_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origen → Destino:</span>
                  <span>
                    {accionModal.transferencia.sucursal_origen?.nombre || `#${accionModal.transferencia.sucursal_origen_id}`}
                    {' → '}
                    {accionModal.transferencia.sucursal_destino?.nombre || `#${accionModal.transferencia.sucursal_destino_id}`}
                  </span>
                </div>
              </div>

              {(accionModal.tipo === 'autorizar' || accionModal.tipo === 'recibir' || accionModal.tipo === 'rechazar') && (
                <div>
                  <label className="text-sm font-medium">
                    {accionModal.tipo === 'rechazar' ? 'Motivo de rechazo *' : 'Observaciones'}
                  </label>
                  <Input
                    placeholder={accionModal.tipo === 'rechazar' ? 'Ingrese el motivo...' : 'Observaciones (opcional)'}
                    value={observacionesAccion}
                    onChange={(e) => setObservacionesAccion(e.target.value)}
                  />
                </div>
              )}

              {accionModal.tipo === 'enviar' && (
                <p className="text-sm text-muted-foreground">
                  La prenda será marcada como <strong>en tránsito</strong> hacia la sucursal destino.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setAccionModal(null); setObservacionesAccion('') }}>
                  Cancelar
                </Button>
                <Button
                  variant={accionModal.tipo === 'rechazar' ? 'destructive' : 'default'}
                  onClick={ejecutarAccion}
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
