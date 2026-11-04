import React, { useState, useEffect, useMemo } from 'react'
import {
  UsersThree,
  UserPlus,
  Phone,
  WhatsappLogo,
  WarningCircle,
  ClockCountdown,
  MagnifyingGlass,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
  CalendarCheck,
  FunnelSimple,
  CurrencyDollar,
  Buildings,
  MapPin,
  CaretRight,
  CaretLeft,
  ChatCircleText,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/helpers'
import { usePermissions } from '@/hooks/use-permissions'
import { api } from '@/lib/api'
import {
  prospectoService,
  Prospecto,
  EstadoProspecto,
  FiltrosProspectos,
  ProspectoEstadisticas,
} from '@/services/prospectoService'

interface FincaOption {
  id: number
  nombre: string
}

interface LoteOption {
  id: number
  numero_lote: string
  codigo_unico: string
  finca_id?: number
  precio_venta?: number
}

interface AsesorOption {
  id: number
  name: string
  email: string
}

const COLUMNAS_KANBAN: { id: EstadoProspecto; titulo: string; color: string; badgeClass: string }[] = [
  { id: 'nuevo', titulo: 'Nuevos Leads', color: 'border-t-blue-500', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { id: 'contactado', titulo: 'Contactados', color: 'border-t-indigo-500', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  { id: 'visita_agendada', titulo: 'Visita Agendada', color: 'border-t-purple-500', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { id: 'negociacion', titulo: 'En Negociación', color: 'border-t-amber-500', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { id: 'ganado', titulo: 'Venta Concretada', color: 'border-t-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { id: 'perdido', titulo: 'Descartados / Perdidos', color: 'border-t-rose-500', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
]

export function ProspectosModule() {
  const { hasPermission } = usePermissions()

  const puedeVer = hasPermission('prospectos', 'ver')
  const puedeCrear = hasPermission('prospectos', 'crear')
  const puedeEditar = hasPermission('prospectos', 'editar')
  const puedeEliminar = hasPermission('prospectos', 'eliminar')
  const puedeCambiarEstado = hasPermission('prospectos', 'cambiar_estado')

  // Estado general
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [estadisticas, setEstadisticas] = useState<ProspectoEstadisticas | null>(null)
  const [cargando, setCargando] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [fincaFiltro, setFincaFiltro] = useState<string>('')
  const [asesorFiltro, setAsesorFiltro] = useState<string>('')
  const [soloSinSeguimiento, setSoloSinSeguimiento] = useState(false)

  // Catálogos auxiliares
  const [fincas, setFincas] = useState<FincaOption[]>([])
  const [lotes, setLotes] = useState<LoteOption[]>([])
  const [asesores, setAsesores] = useState<AsesorOption[]>([])

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    dpi: '',
    finca_id: '',
    lote_id: '',
    asesor_id: '',
    estado: 'nuevo' as EstadoProspecto,
    origen: 'whatsapp',
    presupuesto_estimado: '',
    notas: '',
    fecha_proximo_contacto: '',
  })

  // Modal Registrar Contacto
  const [modalContactoAbierto, setModalContactoAbierto] = useState(false)
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState<Prospecto | null>(null)
  const [formContacto, setFormContacto] = useState({
    tipo_interaccion: 'llamada' as const,
    detalle: '',
    fecha_proximo_contacto: '',
    nuevo_estado: '' as EstadoProspecto | '',
  })

  // Carga inicial
  useEffect(() => {
    cargarCatalogos()
    cargarProspectos()
  }, [])

  // Recarga al cambiar filtros clave
  useEffect(() => {
    cargarProspectos()
  }, [fincaFiltro, asesorFiltro, soloSinSeguimiento])

  const cargarCatalogos = async () => {
    try {
      // Fincas
      const resFincas = await api.get<any>('/fincas')
      const itemsFincas = resFincas.data?.data || resFincas.data || []
      setFincas(itemsFincas.map((f: any) => ({ id: f.id, nombre: f.nombre })))

      // Lotes disponibles
      const resLotes = await api.get<any>('/lotes?estado=disponible')
      const itemsLotes = resLotes.data?.data || resLotes.data || []
      setLotes(
        itemsLotes.map((l: any) => ({
          id: l.id,
          numero_lote: l.numero_lote,
          codigo_unico: l.codigo_unico,
          finca_id: l.parcela?.finca_id,
          precio_venta: l.precio_venta,
        }))
      )

      // Asesores / Usuarios
      const resUsers = await api.get<any>('/usuarios')
      const itemsUsers = resUsers.data?.data || resUsers.data || []
      setAsesores(
        itemsUsers.map((u: any) => ({
          id: u.id,
          name: u.name || u.nombre,
          email: u.email,
        }))
      )
    } catch {
      // Catálogos opcionales si falla alguna petición secundaria
    }
  }

  const cargarProspectos = async () => {
    if (!puedeVer) return
    setCargando(true)
    try {
      const filtros: FiltrosProspectos = {}
      if (fincaFiltro) filtros.finca_id = Number(fincaFiltro)
      if (asesorFiltro) filtros.asesor_id = Number(asesorFiltro)
      if (soloSinSeguimiento) filtros.solo_sin_seguimiento = true
      if (busqueda.trim()) filtros.busqueda = busqueda.trim()

      const res = await prospectoService.getProspectos(filtros)
      setProspectos(res.data || [])
      setEstadisticas(res.estadisticas || null)
    } catch (err: any) {
      toast.error('Error al cargar prospectos: ' + (err.message || 'Error de conexión'))
    } finally {
      setCargando(false)
    }
  }

  // Filtrado local por búsqueda de texto
  const prospectosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return prospectos
    const q = busqueda.toLowerCase().trim()
    return prospectos.filter(
      p =>
        p.nombre_completo.toLowerCase().includes(q) ||
        p.telefono.toLowerCase().includes(q) ||
        (p.dpi && p.dpi.toLowerCase().includes(q)) ||
        (p.finca && p.finca.nombre.toLowerCase().includes(q)) ||
        (p.lote && p.lote.numero_lote.toLowerCase().includes(q))
    )
  }, [prospectos, busqueda])

  // Lotes filtrados por la finca seleccionada en el formulario
  const lotesDisponiblesForm = useMemo(() => {
    if (!formData.finca_id) return lotes
    return lotes.filter(l => !l.finca_id || l.finca_id === Number(formData.finca_id))
  }, [lotes, formData.finca_id])

  // Manejador apertura nuevo
  const abrirModalNuevo = () => {
    setEditandoId(null)
    setFormData({
      nombre_completo: '',
      telefono: '',
      email: '',
      dpi: '',
      finca_id: fincas[0] ? String(fincas[0].id) : '',
      lote_id: '',
      asesor_id: '',
      estado: 'nuevo',
      origen: 'whatsapp',
      presupuesto_estimado: '',
      notas: '',
      fecha_proximo_contacto: '',
    })
    setModalAbierto(true)
  }

  // Manejador apertura editar
  const abrirModalEditar = (p: Prospecto) => {
    setEditandoId(p.id)
    setFormData({
      nombre_completo: p.nombre_completo,
      telefono: p.telefono,
      email: p.email || '',
      dpi: p.dpi || '',
      finca_id: p.finca_id ? String(p.finca_id) : '',
      lote_id: p.lote_id ? String(p.lote_id) : '',
      asesor_id: p.asesor_id ? String(p.asesor_id) : '',
      estado: p.estado,
      origen: p.origen || 'otro',
      presupuesto_estimado: p.presupuesto_estimado ? String(p.presupuesto_estimado) : '',
      notas: p.notas || '',
      fecha_proximo_contacto: p.fecha_proximo_contacto ? p.fecha_proximo_contacto.slice(0, 16) : '',
    })
    setModalAbierto(true)
  }

  // Guardar Prospecto (Crear o Editar)
  const handleSubmitProspecto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre_completo.trim() || !formData.telefono.trim()) {
      toast.error('El nombre y el teléfono son campos obligatorios.')
      return
    }

    setGuardando(true)
    try {
      const payload: any = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim() || null,
        dpi: formData.dpi.trim() || null,
        finca_id: formData.finca_id ? Number(formData.finca_id) : null,
        lote_id: formData.lote_id ? Number(formData.lote_id) : null,
        asesor_id: formData.asesor_id ? Number(formData.asesor_id) : null,
        estado: formData.estado,
        origen: formData.origen,
        presupuesto_estimado: formData.presupuesto_estimado ? Number(formData.presupuesto_estimado) : null,
        notas: formData.notas.trim() || null,
        fecha_proximo_contacto: formData.fecha_proximo_contacto || null,
      }

      if (editandoId) {
        await prospectoService.updateProspecto(editandoId, payload)
        toast.success('Prospecto actualizado exitosamente.')
      } else {
        await prospectoService.createProspecto(payload)
        toast.success('Prospecto registrado en el CRM con éxito.')
      }

      setModalAbierto(false)
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar el prospecto')
    } finally {
      setGuardando(false)
    }
  }

  // Cambiar de estado en el Kanban
  const handleMoverEstado = async (p: Prospecto, nuevoEstado: EstadoProspecto) => {
    if (!puedeCambiarEstado) {
      toast.error('No tienes permisos para cambiar el estado de los prospectos.')
      return
    }

    try {
      await prospectoService.cambiarEstado(p.id, nuevoEstado)
      toast.success(`Prospecto movido a ${nuevoEstado.replace('_', ' ')}`)
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al cambiar estado')
    }
  }

  // Abrir Modal Registrar Contacto
  const abrirModalContacto = (p: Prospecto) => {
    setProspectoSeleccionado(p)
    setFormContacto({
      tipo_interaccion: 'llamada',
      detalle: '',
      fecha_proximo_contacto: '',
      nuevo_estado: '',
    })
    setModalContactoAbierto(true)
  }

  // Enviar Contacto
  const handleGuardarContacto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prospectoSeleccionado) return
    if (!formContacto.detalle.trim()) {
      toast.error('Debes ingresar el resumen de la conversación o interacción.')
      return
    }

    try {
      await prospectoService.registrarContacto(prospectoSeleccionado.id, {
        tipo_interaccion: formContacto.tipo_interaccion,
        detalle: formContacto.detalle.trim(),
        fecha_proximo_contacto: formContacto.fecha_proximo_contacto || undefined,
        nuevo_estado: (formContacto.nuevo_estado as EstadoProspecto) || undefined,
      })

      toast.success('Contacto registrado. El cronómetro de seguimiento se ha reiniciado.')
      setModalContactoAbierto(false)
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al registrar contacto')
    }
  }

  // Eliminar Prospecto
  const handleEliminar = async (id: number) => {
    if (!puedeEliminar) {
      toast.error('No tienes permisos para eliminar prospectos.')
      return
    }
    if (!window.confirm('¿Estás seguro de eliminar este prospecto del embudo comercial?')) return

    try {
      await prospectoService.deleteProspecto(id)
      toast.success('Prospecto eliminado del sistema.')
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al eliminar')
    }
  }

  // Enlace directo WhatsApp
  const handleAbrirWhatsApp = (prospecto: Prospecto) => {
    let clean = prospecto.telefono.replace(/\D/g, '')
    if (clean.length === 8) clean = '502' + clean
    const texto = encodeURIComponent(
      `¡Hola ${prospecto.nombre_completo}! Te saludamos de Parcelia. ¿Tienes alguna consulta sobre nuestros lotes y facilidades de pago?`
    )
    window.open(`https://wa.me/${clean}?text=${texto}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <UsersThree size={28} weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Embudo Comercial & CRM
              {estadisticas && estadisticas.total_sin_seguimiento > 0 && (
                <Badge variant="destructive" className="animate-pulse text-xs font-semibold gap-1 px-2">
                  <WarningCircle size={14} weight="fill" />
                  {estadisticas.total_sin_seguimiento} desatendidos (&gt;48h)
                </Badge>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gestiona prospectos, programa visitas y monitorea la atención de tus asesores en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={cargarProspectos} disabled={cargando} className="gap-1.5 text-xs h-9">
            <ArrowsClockwise size={15} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </Button>

          {puedeCrear && (
            <Button size="sm" onClick={abrirModalNuevo} className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              <UserPlus size={16} weight="bold" />
              Nuevo Prospecto
            </Button>
          )}
        </div>
      </div>

      {/* METRICAS DEL PIPELINE */}
      {estadisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prospectos Activos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{estadisticas.total_prospectos_activos}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">En proceso de atención</p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <UsersThree size={24} weight="duotone" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monto en Pipeline</p>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatCurrency(estadisticas.monto_pipeline_estimado)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Presupuesto estimado acumulado</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CurrencyDollar size={24} weight="duotone" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border shadow-xs cursor-pointer transition-all ${
              soloSinSeguimiento
                ? 'ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                : 'hover:border-rose-300'
            }`}
            onClick={() => setSoloSinSeguimiento(!soloSinSeguimiento)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <WarningCircle size={14} weight="fill" /> Sin Contacto (+48h)
                </p>
                <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {estadisticas.total_sin_seguimiento}
                </h3>
                <p className="text-xs text-rose-500/80 mt-0.5">
                  {soloSinSeguimiento ? '✓ Filtrando desatendidos' : 'Click para filtrar urgentes'}
                </p>
              </div>
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg animate-pulse">
                <ClockCountdown size={24} weight="bold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cierres Exitosos</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {estadisticas.conteos_por_estado?.ganado || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ventas formalizadas</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CheckCircle size={24} weight="duotone" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-card p-4 rounded-xl border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, teléfono, DPI o lote..."
              className="pl-9 text-xs sm:text-sm h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={fincaFiltro}
              onChange={e => setFincaFiltro(e.target.value)}
              aria-label="Filtrar por Proyecto o Finca"
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todas las Fincas</option>
              {fincas.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>

            <select
              value={asesorFiltro}
              onChange={e => setAsesorFiltro(e.target.value)}
              aria-label="Filtrar por Asesor Comercial"
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos los Asesores</option>
              {asesores.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <Button
              variant={soloSinSeguimiento ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setSoloSinSeguimiento(!soloSinSeguimiento)}
              className="h-9 text-xs gap-1.5"
            >
              <ClockCountdown size={14} weight="bold" />
              {soloSinSeguimiento ? 'Mostrando desatendidos' : 'Solo sin contacto (+48h)'}
            </Button>
          </div>
        </div>
      </div>

      {/* TABLERO KANBAN */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1280px]">
          {COLUMNAS_KANBAN.map(col => {
            const prospectosEnCol = prospectosFiltrados.filter(p => p.estado === col.id)
            return (
              <div
                key={col.id}
                className={`flex-1 min-w-[280px] max-w-[320px] bg-muted/40 rounded-xl border border-t-4 ${col.color} p-3 flex flex-col gap-3 min-h-[500px]`}
              >
                {/* Cabecera de Columna */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs uppercase tracking-wide text-foreground">
                      {col.titulo}
                    </span>
                    <Badge variant="secondary" className={`text-xs px-2 py-0.5 font-bold ${col.badgeClass}`}>
                      {prospectosEnCol.length}
                    </Badge>
                  </div>
                </div>

                {/* Lista de Tarjetas */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-1">
                  {prospectosEnCol.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-border/60 rounded-lg text-xs text-muted-foreground text-center p-3">
                      Sin prospectos en esta etapa
                    </div>
                  ) : (
                    prospectosEnCol.map(p => {
                      const requiereAtencion = p.requiere_seguimiento
                      return (
                        <div
                          key={p.id}
                          className={`bg-card p-3.5 rounded-lg border shadow-xs transition-all hover:shadow-md space-y-2.5 ${
                            requiereAtencion
                              ? 'border-rose-400 dark:border-rose-600/80 ring-1 ring-rose-400/40 bg-rose-50/20 dark:bg-rose-950/10'
                              : 'border-border'
                          }`}
                        >
                          {/* ALERTA DE INACTIVIDAD (+48H) */}
                          {requiereAtencion && (
                            <div className="bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-2 py-1 rounded text-[11px] font-semibold flex items-center justify-between animate-pulse">
                              <span className="flex items-center gap-1">
                                <WarningCircle size={13} weight="fill" />
                                Sin contacto (+{p.horas_sin_contacto}h)
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => abrirModalContacto(p)}
                                className="h-5 px-1.5 text-[10px] bg-rose-200/80 hover:bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100"
                              >
                                Atender
                              </Button>
                            </div>
                          )}

                          {/* Nombre del Prospecto y Origen */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1">
                                {p.nombre_completo}
                              </h4>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <span className="capitalize">{p.origen.replace('_', ' ')}</span>
                                {p.dpi && <span>· DPI: {p.dpi}</span>}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              {puedeEditar && (
                                <button
                                  onClick={() => abrirModalEditar(p)}
                                  aria-label="Editar prospecto"
                                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                                >
                                  <PencilSimple size={13} />
                                </button>
                              )}
                              {puedeEliminar && (
                                <button
                                  onClick={() => handleEliminar(p.id)}
                                  aria-label="Eliminar prospecto"
                                  className="text-muted-foreground hover:text-rose-600 p-1 rounded"
                                >
                                  <Trash size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Lote / Finca de Interés */}
                          {(p.finca || p.lote) && (
                            <div className="p-2 bg-muted/60 rounded text-[11px] space-y-0.5">
                              {p.finca && (
                                <div className="flex items-center gap-1 text-foreground font-medium">
                                  <Buildings size={12} className="text-emerald-600" />
                                  <span className="truncate">{p.finca.nombre}</span>
                                </div>
                              )}
                              {p.lote && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin size={12} />
                                  <span>Lote {p.lote.numero_lote} ({p.lote.codigo_unico})</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Presupuesto */}
                          {p.presupuesto_estimado && (
                            <div className="text-[11px] flex justify-between items-center text-muted-foreground">
                              <span>Presupuesto:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(p.presupuesto_estimado)}
                              </span>
                            </div>
                          )}

                          {/* Asesor asignado */}
                          {p.asesor && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              Asesor: <strong className="text-foreground">{p.asesor.name}</strong>
                            </div>
                          )}

                          {/* Teléfono y Botones de Acción */}
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${p.telefono}`}
                                className="h-7 px-2 text-[11px] inline-flex items-center gap-1 rounded bg-muted hover:bg-muted/80 text-foreground"
                                title="Llamar"
                              >
                                <Phone size={12} /> {p.telefono}
                              </a>

                              <button
                                onClick={() => handleAbrirWhatsApp(p)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Abrir WhatsApp"
                              >
                                <WhatsappLogo size={14} weight="fill" />
                              </button>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalContacto(p)}
                              className="h-7 px-2 text-[11px] gap-1"
                              title="Registrar llamada o reunión"
                            >
                              <ChatCircleText size={13} />
                              Seguimiento
                            </Button>
                          </div>

                          {/* Movimiento entre columnas (Avanzar / Retroceder) */}
                          {puedeCambiarEstado && (
                            <div className="flex justify-between items-center pt-1 text-[11px]">
                              {col.id !== 'nuevo' ? (
                                <button
                                  onClick={() => {
                                    const currentIndex = COLUMNAS_KANBAN.findIndex(c => c.id === col.id)
                                    if (currentIndex > 0) {
                                      handleMoverEstado(p, COLUMNAS_KANBAN[currentIndex - 1].id)
                                    }
                                  }}
                                  className="text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                                >
                                  <CaretLeft size={11} /> Atrás
                                </button>
                              ) : <span />}

                              {col.id !== 'ganado' && col.id !== 'perdido' && (
                                <button
                                  onClick={() => {
                                    const currentIndex = COLUMNAS_KANBAN.findIndex(c => c.id === col.id)
                                    if (currentIndex < COLUMNAS_KANBAN.length - 2) {
                                      handleMoverEstado(p, COLUMNAS_KANBAN[currentIndex + 1].id)
                                    } else {
                                      handleMoverEstado(p, 'ganado')
                                    }
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                                >
                                  Avanzar <CaretRight size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR PROSPECTO */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editandoId ? 'Editar Prospecto' : 'Registrar Nuevo Prospecto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitProspecto} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nombre Completo *</label>
              <Input
                required
                value={formData.nombre_completo}
                onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                placeholder="Ej. Juan Carlos López"
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Teléfono / WhatsApp *</label>
                <Input
                  required
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej. 5555-1234"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">DPI / CUI</label>
                <Input
                  value={formData.dpi}
                  onChange={e => setFormData({ ...formData, dpi: e.target.value })}
                  placeholder="Ej. 2450 12345 0101"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Correo Electrónico</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@ejemplo.com"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Origen del Lead</label>
                <select
                  value={formData.origen}
                  onChange={e => setFormData({ ...formData, origen: e.target.value })}
                  className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="redes_sociales">Redes Sociales (Facebook / Instagram)</option>
                  <option value="recomendado">Recomendado / Familiar</option>
                  <option value="rotulo_campo">Rótulo en Terreno / Campo</option>
                  <option value="visita_oficina">Visita en Oficina</option>
                  <option value="otro">Otro medio</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Proyecto / Finca de Interés</label>
                <select
                  value={formData.finca_id}
                  onChange={e => setFormData({ ...formData, finca_id: e.target.value, lote_id: '' })}
                  className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Seleccione Finca...</option>
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Lote Específico</label>
                <select
                  value={formData.lote_id}
                  onChange={e => setFormData({ ...formData, lote_id: e.target.value })}
                  className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Sin lote específico / Indeciso</option>
                  {lotesDisponiblesForm.map(l => (
                    <option key={l.id} value={l.id}>
                      Lote {l.numero_lote} ({l.codigo_unico}) {l.precio_venta ? ` - Q ${Number(l.precio_venta).toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Presupuesto Estimado (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.presupuesto_estimado}
                  onChange={e => setFormData({ ...formData, presupuesto_estimado: e.target.value })}
                  placeholder="Ej. 85000"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Asesor Comercial Asignado</label>
                <select
                  value={formData.asesor_id}
                  onChange={e => setFormData({ ...formData, asesor_id: e.target.value })}
                  className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Asignar automáticamente a mí</option>
                  {asesores.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Notas y Requerimientos del Cliente</label>
              <textarea
                rows={3}
                value={formData.notas}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Detalla lo que busca: medidas preferidas, enganche disponible, plazo deseado..."
                className="w-full p-2.5 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {guardando ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Registrar Prospecto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR CONTACTO / SEGUIMIENTO */}
      <Dialog open={modalContactoAbierto} onOpenChange={setModalContactoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <ChatCircleText size={20} className="text-emerald-600" />
              Registrar Contacto de Seguimiento
            </DialogTitle>
          </DialogHeader>

          {prospectoSeleccionado && (
            <form onSubmit={handleGuardarContacto} className="space-y-4 pt-1">
              <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">{prospectoSeleccionado.nombre_completo}</p>
                <p className="text-muted-foreground">Teléfono: {prospectoSeleccionado.telefono}</p>
                {prospectoSeleccionado.finca && (
                  <p className="text-muted-foreground">Interés: {prospectoSeleccionado.finca.nombre}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Tipo de Interacción *</label>
                <select
                  value={formContacto.tipo_interaccion}
                  onChange={e => setFormContacto({ ...formContacto, tipo_interaccion: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="llamada">Llamada Telefónica</option>
                  <option value="whatsapp">Mensaje por WhatsApp</option>
                  <option value="visita">Visita al Terreno / Finca</option>
                  <option value="reunion_oficina">Reunión en Oficina</option>
                  <option value="correo">Correo Electrónico</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Resumen de la Conversación *</label>
                <textarea
                  required
                  rows={3}
                  value={formContacto.detalle}
                  onChange={e => setFormContacto({ ...formContacto, detalle: e.target.value })}
                  placeholder="Ej. Se le compartieron las fotos del lote 14. Indica que viajará el sábado para verlo en persona..."
                  className="w-full p-2.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Mover a Nueva Etapa (Opcional)</label>
                <select
                  value={formContacto.nuevo_estado}
                  onChange={e => setFormContacto({ ...formContacto, nuevo_estado: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Mantener en etapa actual ({prospectoSeleccionado.estado})</option>
                  <option value="contactado">Mover a Contactado</option>
                  <option value="visita_agendada">Mover a Visita Agendada</option>
                  <option value="negociacion">Mover a En Negociación</option>
                  <option value="ganado">Cerrar como Venta Ganada</option>
                  <option value="perdido">Marcar como Descartado / Perdido</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Fecha Próximo Contacto (Opcional)</label>
                <Input
                  type="datetime-local"
                  value={formContacto.fecha_proximo_contacto}
                  onChange={e => setFormContacto({ ...formContacto, fecha_proximo_contacto: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalContactoAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Registrar & Reiniciar 48h
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ProspectosModule

