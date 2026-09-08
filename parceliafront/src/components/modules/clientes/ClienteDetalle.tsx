import { Cliente } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, User, PencilSimple, Phone, MapPin, Calendar, IdentificationCard, Trash, CaretDown, CaretUp, Eye, Package, CurrencyCircleDollar, Clock, Archive, CheckCircle, Warning, XCircle, DownloadSimple, TreeStructure, Handshake, FileText } from '@phosphor-icons/react'
import { formatDate } from '@/lib/helpers'
import { formatDateDMY } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useEffect, useMemo, useState } from 'react'
import { clienteService, api } from '@/lib/api'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SafeAvatar } from '@/components/shared/SafeAvatar'
import { getMediaUrl } from '@/utils/imageUrl'

interface ClienteDetalleProps {
  cliente: Cliente
  onVolver: () => void
  onEditar: () => void
  onEliminar: () => void
}

// Función para obtener icono y color según estado
const getEstadoInfo = (estado: string) => {
  switch (estado) {
    case 'vigente':
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Vigente' }
    case 'pagado':
      return { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Pagado' }
    case 'solicitado':
      return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Solicitado' }
    case 'en_analisis':
      return { icon: Eye, color: 'text-orange-600', bg: 'bg-orange-100', label: 'En Análisis' }
    case 'aprobado':
      return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Aprobado' }
    case 'vencido':
      return { icon: Warning, color: 'text-red-600', bg: 'bg-red-100', label: 'Vencido' }
    case 'en_mora':
      return { icon: Warning, color: 'text-orange-600', bg: 'bg-orange-100', label: 'En Mora' }
    case 'cancelado':
      return { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Cancelado' }
    case 'rechazado':
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Rechazado' }
    default:
      return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: estado }
  }
}

export function ClienteDetalle({ cliente, onVolver, onEditar, onEliminar }: ClienteDetalleProps) {
  const [creditosCliente, setCreditosCliente] = useState<any[]>([])
  const [loadingCreditos, setLoadingCreditos] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{ total: number; per_page: number; current_page: number; last_page: number } | null>(null)
  const [clienteCardOpen, setClienteCardOpen] = useState(true)
  const [creditoExpandido, setCreditoExpandido] = useState<string | null>(null)
  const [ficha, setFicha] = useState<any | null>(null)
  const [loadingFicha, setLoadingFicha] = useState(false)
  const [descargandoPdf, setDescargandoPdf] = useState(false)

  const handleDescargarFicha = async () => {
    try {
      setDescargandoPdf(true)
      await clienteService.descargarFichaPdf(cliente.id)
    } catch (error) {
      console.error('Error al descargar ficha:', error)
      alert('Error al descargar la ficha del cliente')
    } finally {
      setDescargandoPdf(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const cargar = async () => {
      try {
        setLoadingCreditos(true)
        const resp = await clienteService.getCreditosPrendarios(cliente.id, { page, per_page: 50 })
        if (!mounted) return
        // La respuesta viene directamente como { success, data, pagination }
        setCreditosCliente(resp.data || [])
        setPagination(resp.pagination || null)
      } catch (e) {
        console.error('[ClienteDetalle] Error al cargar créditos:', e)
        if (!mounted) return
        setCreditosCliente([])
        setPagination(null)
      } finally {
        if (mounted) setLoadingCreditos(false)
      }
    }
    const cargarFicha = async () => {
      try {
        setLoadingFicha(true)
        const resp = await clienteService.getFicha(cliente.id)
        if (mounted && resp.success) {
          setFicha(resp.data)
        }
      } catch (e) {
        console.error('Error al cargar ficha:', e)
      } finally {
        if (mounted) setLoadingFicha(false)
      }
    }

    cargar()
    cargarFicha()
    return () => { mounted = false }
  }, [cliente.id, page])

  const creditosActivos = useMemo(
    () => (creditosCliente || []).filter(c => ['vigente', 'aprobado', 'solicitado', 'en_analisis', 'en_mora'].includes(c.estado) && !c.eliminado),
    [creditosCliente]
  )
  const creditosVencidos = useMemo(
    () => (creditosCliente || []).filter(c => c.estado === 'vencido' && !c.eliminado),
    [creditosCliente]
  )
  const creditosArchivados = useMemo(
    () => (creditosCliente || []).filter(c => c.eliminado),
    [creditosCliente]
  )

  // Calcular totales
  const totales = useMemo(() => {
    const activos = creditosCliente.filter(c => !c.eliminado)
    return {
      montoTotal: activos.reduce((sum, c) => sum + (Number(c.monto_aprobado) || 0), 0),
      capitalPendiente: activos.reduce((sum, c) => sum + (Number(c.capital_pendiente) || 0), 0),
      totalPrendas: activos.reduce((sum, c) => sum + (c.prendas?.length || 0), 0),
    }
  }, [creditosCliente])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cards de Estado y Resumen (Ficha) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-blue-100 dark:border-blue-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <CurrencyCircleDollar size={64} weight="fill" className="text-blue-600 dark:text-blue-400" />
          </div>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Monto Total Prestado</span>
              <div className="flex items-baseline gap-1">
                <MoneyDisplay amount={ficha?.stats?.monto_total_prestado || 0} size="lg" className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
                <span className="text-[10px] text-muted-foreground font-bold">GTQ</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock size={12} />
                Historial de {ficha?.stats?.total_historial || 0} créditos
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-red-50 dark:border-red-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Warning size={64} weight="fill" className="text-red-600 dark:text-red-400" />
          </div>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Saldo Pendiente Actual</span>
              <div className="flex items-baseline gap-1">
                <MoneyDisplay amount={ficha?.stats?.saldo_pendiente_actual || 0} size="lg" className="text-2xl font-bold text-red-600 dark:text-red-400" />
                <span className="text-[10px] text-muted-foreground font-bold text-red-400">GTQ</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                <Package size={12} />
                {cliente.creditosInfo?.activos || 0} créditos activos
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-purple-50 dark:border-purple-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <CheckCircle size={64} weight="fill" className="text-purple-600 dark:text-purple-400" />
          </div>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Puntualidad</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {ficha?.comportamiento?.tasa_puntualidad ? `${Math.round(ficha.comportamiento.tasa_puntualidad)}%` : '—'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-400">
                <CheckCircle size={12} />
                {ficha?.comportamiento?.pagos_puntuales || 0} pagos a tiempo
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${ficha?.comportamiento?.comportamiento === 'Puntual' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-800' :
            ficha?.comportamiento?.comportamiento === 'Regular' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-100 dark:border-yellow-800' :
              'bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-800'
          } shadow-sm relative overflow-hidden`}>
          <CardContent className="pt-6">
            <div className="flex flex-col justify-center items-center h-full">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 text-center">Calificación de Riesgo</span>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-xl font-bold ${ficha?.comportamiento?.comportamiento === 'Puntual' ? 'text-emerald-700 dark:text-emerald-400' :
                    ficha?.comportamiento?.comportamiento === 'Regular' ? 'text-yellow-700 dark:text-yellow-400' :
                      'text-red-700 dark:text-red-400'
                  }`}>
                  {ficha?.comportamiento?.comportamiento || 'SIN DATOS'}
                </span>
                <Badge variant="outline" className="text-[10px] bg-white/50 dark:bg-gray-800/50">
                  Score: {Math.round(ficha?.comportamiento?.puntos || 0)}/100
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="outline" size="icon" onClick={onVolver} className="shrink-0">
          <ArrowLeft />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold truncate">{cliente.nombres} {cliente.apellidos}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Información del cliente</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleDescargarFicha} disabled={descargandoPdf} variant="outline" className="flex-1 sm:flex-none">
            <DownloadSimple weight="bold" />
            {descargandoPdf ? 'Descargando...' : 'Descargar PDF'}
          </Button>
          <Button onClick={onEditar} className="flex-1 sm:flex-none">
            <PencilSimple weight="bold" />
            Editar
          </Button>
          <Button variant="destructive" onClick={onEliminar} className="flex-1 sm:flex-none">
            <Trash weight="bold" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card del Cliente - Colapsable */}
        <div className="lg:col-span-1">
          <Collapsible open={clienteCardOpen} onOpenChange={setClienteCardOpen}>
            <Card className="overflow-hidden transition-all duration-300">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Mini avatar siempre visible */}
                      <SafeAvatar
                        src={cliente.fotografia || (cliente as any).fotografia_url}
                        alt={cliente.nombres}
                        className={`rounded-full object-cover transition-all duration-300 ${clienteCardOpen ? 'w-10 h-10' : 'w-16 h-16'}`}
                        iconSize={clienteCardOpen ? 20 : 32}
                      />
                      <div className={`transition-all duration-300 ${!clienteCardOpen ? 'flex-1' : ''}`}>
                        <CardTitle className="text-base sm:text-lg">
                          {clienteCardOpen ? 'Información Personal' : `${cliente.nombres} ${cliente.apellidos}`}
                        </CardTitle>
                        {!clienteCardOpen && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            DPI: {cliente.dpi} · {cliente.telefono}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      {clienteCardOpen ? <CaretUp size={20} /> : <CaretDown size={20} />}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent className="transition-all duration-300 ease-in-out data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                <CardContent className="space-y-4 pt-0">
                  {/* Foto grande */}
                  <div className="flex justify-center mb-4">
                    <SafeAvatar
                      src={cliente.fotografia || (cliente as any).fotografia_url}
                      alt={cliente.nombres}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-primary/20"
                      iconSize={56}
                      fallbackClassName="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/20 text-primary"
                    />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <IdentificationCard className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">DPI</p>
                        <p className="font-mono font-medium truncate">{cliente.dpi}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                      <div>
                        <p className="text-muted-foreground text-xs">Fecha de Nacimiento</p>
                        <p className="font-medium">{formatDate(cliente.fechaNacimiento)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                      <div>
                        <p className="text-muted-foreground text-xs">Género</p>
                        <p className="font-medium capitalize">{cliente.genero}</p>
                      </div>
                    </div>

                    {cliente.estadoCivil && (
                      <div className="flex items-start gap-3">
                        <User className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                        <div>
                          <p className="text-muted-foreground text-xs">Estado Civil</p>
                          <p className="font-medium capitalize">{cliente.estadoCivil}</p>
                        </div>
                      </div>
                    )}

                    {cliente.profesion && (
                      <div className="flex items-start gap-3">
                        <User className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                        <div>
                          <p className="text-muted-foreground text-xs">Profesión / Oficio</p>
                          <p className="font-medium">{cliente.profesion}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Phone className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                      <div>
                        <p className="text-muted-foreground text-xs">Teléfono</p>
                        <p className="font-medium">{cliente.telefono}</p>
                      </div>
                    </div>

                    {cliente.email && (
                      <div className="flex items-start gap-3">
                        <MapPin className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                        <div className="min-w-0">
                          <p className="text-muted-foreground text-xs">Correo</p>
                          <p className="font-medium truncate">{cliente.email}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <MapPin className="text-muted-foreground mt-0.5 shrink-0" size={20} />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">Dirección</p>
                        <p className="font-medium line-clamp-2">{cliente.direccion}</p>
                      </div>
                    </div>

                    {cliente.sucursal && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground text-xs">Sucursal Asignada</p>
                        <p className="font-medium">{cliente.sucursal}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Estado</span>
                      <Badge variant={cliente.estado === 'activo' ? 'default' : 'secondary'}>
                        {cliente.estado}
                      </Badge>
                    </div>

                    {cliente.tipoCliente && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Tipo</span>
                        <Badge variant={cliente.tipoCliente === 'vip' ? 'default' : 'secondary'}>
                          {cliente.tipoCliente === 'vip' ? 'VIP' : 'Regular'}
                        </Badge>
                      </div>
                    )}

                    {cliente.referencias && cliente.referencias.length > 0 && (
                      <div className="pt-3 border-t space-y-2">
                        <p className="text-muted-foreground text-xs">Referencias</p>
                        <div className="space-y-1">
                          {cliente.referencias.map((ref, idx) => (
                            <div key={ref.id || idx} className="text-xs">
                              <span className="font-medium">{ref.nombre}</span>
                              <span className="mx-1 text-muted-foreground">·</span>
                              <span className="font-mono">{ref.telefono}</span>
                              {ref.relacion && (
                                <span className="ml-1 text-muted-foreground">
                                  ({ref.relacion})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Card de Historial de Empeños */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Package size={20} />
                Historial de Empeños
                <Badge variant="outline" className="ml-1">{creditosCliente.length}</Badge>
              </CardTitle>
              {creditosCliente.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="default" className="text-xs">{creditosActivos.length} activos</Badge>
                  {creditosVencidos.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{creditosVencidos.length} vencidos</Badge>
                  )}
                  {creditosArchivados.length > 0 && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <Archive size={12} className="mr-1" />
                      {creditosArchivados.length} archivados
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Resumen de totales */}
            {creditosCliente.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Total Prestado</p>
                  <MoneyDisplay amount={totales.montoTotal} className="font-semibold text-sm" />
                </div>
                <div className="text-center border-x">
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <MoneyDisplay amount={totales.capitalPendiente} className="font-semibold text-sm text-orange-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Prendas</p>
                  <p className="font-semibold text-sm">{totales.totalPrendas}</p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            {loadingCreditos ? (
              <div className="text-center py-12">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <p className="text-muted-foreground">Cargando historial...</p>
                </div>
              </div>
            ) : creditosCliente.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {creditosCliente.map((c) => {
                  const estadoInfo = getEstadoInfo(c.estado)
                  const IconoEstado = estadoInfo.icon
                  const isExpanded = creditoExpandido === c.id

                  return (
                    <div
                      key={c.id}
                      className={`border rounded-lg overflow-hidden transition-all duration-200 ${c.eliminado
                          ? 'opacity-70 bg-muted/30 border-dashed'
                          : 'hover:border-primary/50 hover:shadow-sm'
                        }`}
                    >
                      {/* Header del crédito - siempre visible */}
                      <div
                        className="p-3 cursor-pointer"
                        onClick={() => setCreditoExpandido(isExpanded ? null : c.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Icono de estado */}
                            <div className={`p-2 rounded-full ${estadoInfo.bg} shrink-0`}>
                              <IconoEstado size={18} className={estadoInfo.color} weight="fill" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold ${c.eliminado ? 'line-through text-muted-foreground' : ''}`}>
                                  {c.numero_credito}
                                </span>
                                <Badge
                                  variant={c.estado === 'vigente' ? 'default' : c.estado === 'vencido' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {estadoInfo.label}
                                </Badge>
                                {c.eliminado && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Archive size={10} />
                                    Archivado
                                  </Badge>
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                {c.fecha_solicitud && (
                                  <span>📅 {formatDateDMY(c.fecha_solicitud)}</span>
                                )}
                                {c.fecha_vencimiento && (
                                  <span>⏰ Vence: {formatDateDMY(c.fecha_vencimiento)}</span>
                                )}
                                {c.prendas?.length > 0 && (
                                  <span>📦 {c.prendas.length} prenda{c.prendas.length > 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <MoneyDisplay
                                amount={Number(c.monto_aprobado) || 0}
                                className="font-semibold text-sm"
                              />
                              {(Number(c.capital_pendiente) || 0) > 0 && (
                                <p className="text-xs text-orange-600">
                                  Pend: <MoneyDisplay amount={Number(c.capital_pendiente) || 0} className="inline" />
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                              {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                          {/* Información financiera */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Monto Solicitado</p>
                              <MoneyDisplay amount={Number(c.monto_solicitado) || 0} className="font-medium" />
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Monto Aprobado</p>
                              <MoneyDisplay amount={Number(c.monto_aprobado) || 0} className="font-medium" />
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Capital Pendiente</p>
                              <MoneyDisplay amount={Number(c.capital_pendiente) || 0} className="font-medium text-orange-600" />
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Tasa Interés</p>
                              <p className="font-medium">{c.tasa_interes}% {c.tipo_interes}</p>
                            </div>
                          </div>

                          {/* Fechas adicionales */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {c.sucursal?.nombre && (
                              <Badge variant="outline">🏢 {c.sucursal.nombre}</Badge>
                            )}
                            {c.numero_cuotas && (
                              <Badge variant="outline">📋 {c.numero_cuotas} cuotas</Badge>
                            )}
                            {c.eliminado && c.fecha_eliminacion && (
                              <Badge variant="outline" className="text-muted-foreground">
                                🗑️ Archivado: {formatDateDMY(c.fecha_eliminacion)}
                              </Badge>
                            )}
                          </div>

                          {/* Lista de prendas */}
                          {Array.isArray(c.prendas) && c.prendas.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Package size={14} />
                                Prendas asociadas:
                              </p>
                              <div className="grid gap-1.5">
                                {c.prendas.map((p: any, idx: number) => (
                                  <div
                                    key={p.id || idx}
                                    className={`text-xs p-2 rounded border bg-background flex items-center justify-between ${p.eliminado ? 'opacity-60 border-dashed' : ''
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-mono text-primary">{p.codigo_prenda}</span>
                                      <span className="text-muted-foreground truncate">{p.descripcion}</span>
                                    </div>
                                    {p.eliminado && (
                                      <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                        <Archive size={10} className="mr-1" />
                                        Archivada
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Paginación */}
                {pagination && pagination.last_page > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {pagination.current_page} de {pagination.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                      disabled={page >= pagination.last_page}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No hay créditos registrados para este cliente</p>
                <p className="text-xs text-muted-foreground mt-1">Los empeños aparecerán aquí cuando se registren</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
