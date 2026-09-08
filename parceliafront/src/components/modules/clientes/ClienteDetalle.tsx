import { Cliente } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, User, PencilSimple, Phone, MapPin, Calendar, IdentificationCard, Trash, CaretDown, CaretUp, Eye, Package, CurrencyCircleDollar, Clock, CheckCircle, Warning, XCircle, DownloadSimple, TreeStructure, Handshake } from '@phosphor-icons/react'
import { formatDate } from '@/lib/helpers'
import { formatDateDMY } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useEffect, useMemo, useState } from 'react'
import { clienteService, negociacionService, Negociacion } from '@/lib/api'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SafeAvatar } from '@/components/shared/SafeAvatar'

interface ClienteDetalleProps {
  cliente: Cliente
  onVolver: () => void
  onEditar: () => void
  onEliminar: () => void
}

const etiquetaTipo = (tipo?: string) => {
  switch (tipo) {
    case 'credito':
      return 'Financiado'
    case 'contado':
      return 'Contado'
    case 'reserva':
      return 'Reserva'
    default:
      return tipo || 'Terreno'
  }
}

const getEstadoInfo = (estado: string) => {
  switch (estado) {
    case 'activa':
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Activa' }
    case 'reservada':
      return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Reservada' }
    case 'en_mora':
      return { icon: Warning, color: 'text-orange-600', bg: 'bg-orange-100', label: 'En mora' }
    case 'pagada_total':
      return { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Pagada' }
    case 'rescindida':
      return { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Rescindida' }
    case 'borrador':
      return { icon: Eye, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Borrador' }
    default:
      return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: estado }
  }
}

export function ClienteDetalle({ cliente, onVolver, onEditar, onEliminar }: ClienteDetalleProps) {
  const [negociaciones, setNegociaciones] = useState<Negociacion[]>([])
  const [loadingNegociaciones, setLoadingNegociaciones] = useState(false)
  const [clienteCardOpen, setClienteCardOpen] = useState(true)
  const [negociacionExpandida, setNegociacionExpandida] = useState<number | null>(null)
  const [ficha, setFicha] = useState<any | null>(null)
  const [loadingFicha, setLoadingFicha] = useState(false)
  const [descargandoPdf, setDescargandoPdf] = useState(false)

  const resumenTerrenos = cliente.negociacionesInfo || cliente.creditosInfo
  const terrenosActivos = resumenTerrenos?.activos || 0

  const handleDescargarFicha = async () => {
    try {
      setDescargandoPdf(true)
      await clienteService.descargarFichaPdf(cliente.id)
    } catch (error) {
      console.error('Error al descargar ficha:', error)
      alert('Error al descargar la ficha del comprador')
    } finally {
      setDescargandoPdf(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const cargar = async () => {
      try {
        setLoadingNegociaciones(true)
        const resp = await negociacionService.getAll({
          cliente_id: Number(cliente.id),
          per_page: 100,
        })
        if (!mounted) return
        setNegociaciones(resp.data || [])
      } catch (e) {
        console.error('[ClienteDetalle] Error al cargar terrenos:', e)
        if (!mounted) return
        setNegociaciones([])
      } finally {
        if (mounted) setLoadingNegociaciones(false)
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
  }, [cliente.id])

  const terrenosVigentes = useMemo(
    () => negociaciones.filter(n => ['activa', 'reservada', 'en_mora'].includes(n.estado)),
    [negociaciones]
  )
  const terrenosEnMora = useMemo(
    () => negociaciones.filter(n => n.estado === 'en_mora'),
    [negociaciones]
  )
  const terrenosPagados = useMemo(
    () => negociaciones.filter(n => n.estado === 'pagada_total'),
    [negociaciones]
  )

  const totales = useMemo(() => {
    return {
      montoTotal: negociaciones.reduce((sum, n) => sum + (Number(n.precio_final) || 0), 0),
      capitalPendiente: negociaciones
        .filter(n => ['activa', 'reservada', 'en_mora'].includes(n.estado))
        .reduce((sum, n) => sum + (Number(n.saldo_capital_pendiente) || 0), 0),
      financiados: negociaciones.filter(n => n.tipo_negociacion === 'credito').length,
    }
  }, [negociaciones])

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
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total contratado</span>
              <div className="flex items-baseline gap-1">
                <MoneyDisplay amount={ficha?.stats?.monto_total_prestado || 0} size="lg" className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
                <span className="text-[10px] text-muted-foreground font-bold">GTQ</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock size={12} />
                Historial de {ficha?.stats?.total_historial || 0} terrenos
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
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Saldo de terrenos</span>
              <div className="flex items-baseline gap-1">
                <MoneyDisplay amount={ficha?.stats?.saldo_pendiente_actual || 0} size="lg" className="text-2xl font-bold text-red-600 dark:text-red-400" />
                <span className="text-[10px] text-muted-foreground font-bold text-red-400">GTQ</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                <TreeStructure size={12} />
                {terrenosActivos} ventas activas
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
          <p className="text-sm sm:text-base text-muted-foreground">Información del comprador</p>
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

        {/* Card de terrenos solicitados y financiados */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Handshake size={20} />
                Terrenos solicitados y financiados
                <Badge variant="outline" className="ml-1">{negociaciones.length}</Badge>
              </CardTitle>
              {negociaciones.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="default" className="text-xs">{terrenosVigentes.length} activos</Badge>
                  {terrenosEnMora.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{terrenosEnMora.length} en mora</Badge>
                  )}
                  {terrenosPagados.length > 0 && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {terrenosPagados.length} pagados
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {negociaciones.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Contratado</p>
                  <MoneyDisplay amount={totales.montoTotal} className="font-semibold text-sm" />
                </div>
                <div className="text-center border-x">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <MoneyDisplay amount={totales.capitalPendiente} className="font-semibold text-sm text-orange-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Financiados</p>
                  <p className="font-semibold text-sm">{totales.financiados}</p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            {loadingNegociaciones ? (
              <div className="text-center py-12">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <p className="text-muted-foreground">Cargando terrenos...</p>
                </div>
              </div>
            ) : negociaciones.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {negociaciones.map((n) => {
                  const estadoInfo = getEstadoInfo(n.estado)
                  const IconoEstado = estadoInfo.icon
                  const isExpanded = negociacionExpandida === n.id
                  const loteLabel = n.lote?.codigo_unico || n.lote?.numero_lote || 'Lote'
                  const fincaLabel = n.lote?.parcela?.finca?.nombre

                  return (
                    <div
                      key={n.id}
                      className={`border rounded-lg overflow-hidden transition-all duration-200 ${n.estado === 'rescindida'
                          ? 'opacity-70 bg-muted/30 border-dashed'
                          : 'hover:border-primary/50 hover:shadow-sm'
                        }`}
                    >
                      <div
                        className="p-3 cursor-pointer"
                        onClick={() => setNegociacionExpandida(isExpanded ? null : n.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-full ${estadoInfo.bg} shrink-0`}>
                              <IconoEstado size={18} className={estadoInfo.color} weight="fill" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold ${n.estado === 'rescindida' ? 'line-through text-muted-foreground' : ''}`}>
                                  {n.codigo_negociacion}
                                </span>
                                <Badge
                                  variant={n.estado === 'activa' ? 'default' : n.estado === 'en_mora' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {estadoInfo.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {etiquetaTipo(n.tipo_negociacion)}
                                </Badge>
                              </div>

                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                <span>🏞️ {loteLabel}</span>
                                {fincaLabel && <span>· {fincaLabel}</span>}
                                {n.fecha_negociacion && (
                                  <span>📅 {formatDateDMY(n.fecha_negociacion)}</span>
                                )}
                                {n.plazo_meses > 0 && n.tipo_negociacion === 'credito' && (
                                  <span>📋 {n.cuotas_pagadas}/{n.plazo_meses} cuotas</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <MoneyDisplay
                                amount={Number(n.precio_final) || 0}
                                className="font-semibold text-sm"
                              />
                              {(Number(n.saldo_capital_pendiente) || 0) > 0 && (
                                <p className="text-xs text-orange-600">
                                  Saldo: <MoneyDisplay amount={Number(n.saldo_capital_pendiente) || 0} className="inline" />
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                              {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-muted/20 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Precio final</p>
                              <MoneyDisplay amount={Number(n.precio_final) || 0} className="font-medium" />
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Enganche pagado</p>
                              <MoneyDisplay amount={Number(n.enganche_pagado) || 0} className="font-medium" />
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Saldo capital</p>
                              <MoneyDisplay amount={Number(n.saldo_capital_pendiente) || 0} className="font-medium text-orange-600" />
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-muted-foreground">Financiado</p>
                              <MoneyDisplay amount={Number(n.monto_financiado) || 0} className="font-medium" />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            {n.lote?.area_m2 && (
                              <Badge variant="outline">{n.lote.area_m2} m²</Badge>
                            )}
                            {n.tipo_negociacion === 'credito' && n.tasa_interes_anual > 0 && (
                              <Badge variant="outline">{n.tasa_interes_anual}% anual</Badge>
                            )}
                            {n.cuota_mensual > 0 && (
                              <Badge variant="outline">
                                Cuota <MoneyDisplay amount={Number(n.cuota_mensual)} className="inline" />
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aún no hay terrenos solicitados o financiados</p>
                <p className="text-xs text-muted-foreground mt-1">Las negociaciones de lotes aparecerán aquí cuando se registren</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
