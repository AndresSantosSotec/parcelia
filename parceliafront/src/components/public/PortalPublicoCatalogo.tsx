import React, { useState, useEffect, useMemo } from 'react'
import {
  catalogoService,
  FincaPublica,
  DetalleFincaPublica,
  LotePublico,
} from '@/services/catalogoService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import {
  HouseLine,
  MapPin,
  WhatsappLogo,
  MagnifyingGlass,
  ArrowsClockwise,
  ArrowLeft,
  CheckCircle,
  Info,
  Sparkle,
  ShieldCheck,
  ChatCircleText,
  LockKey,
  CaretRight,
  Ruler,
  Tag,
} from '@phosphor-icons/react'

interface PortalPublicoCatalogoProps {
  onIrALogin?: () => void
  onIrAFormulario?: () => void
  tieneSesionActiva?: boolean
}

export function PortalPublicoCatalogo({ onIrALogin, onIrAFormulario, tieneSesionActiva }: PortalPublicoCatalogoProps) {
  const { config: empresaConfig } = useEmpresaConfig()

  // Detectar canal de red social desde la URL (?origen=facebook | instagram | tiktok | etc.)
  const canalOrigen = useMemo(() => {
    if (typeof window === 'undefined') return 'redes_sociales'
    const params = new URLSearchParams(window.location.search)
    return params.get('origen') || 'web_catalogo'
  }, [])

  const [fincas, setFincas] = useState<FincaPublica[]>([])
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Finca seleccionada para explorar
  const [fincaSeleccionadaId, setFincaSeleccionadaId] = useState<number | null>(null)
  const [detalleFinca, setDetalleFinca] = useState<DetalleFincaPublica | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [filtroSector, setFiltroSector] = useState<string>('todos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  // Modal Ficha Técnica y Reserva
  const [loteModal, setLoteModal] = useState<LotePublico | null>(null)
  const [nombreLead, setNombreLead] = useState('')
  const [telefonoLead, setTelefonoLead] = useState('')
  const [emailLead, setEmailLead] = useState('')
  const [honeypotBot, setHoneypotBot] = useState('') // 🛡️ Trampa Anti-Spam invisible
  const [enviandoLead, setEnviandoLead] = useState(false)

  // Formulario General de Contacto al pie de página
  const [formContactoGeneral, setFormContactoGeneral] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    departamento_interes: 'Guatemala',
    presupuesto_estimado: '',
    mensaje: '',
  })
  const [enviandoGeneral, setEnviandoGeneral] = useState(false)

  useEffect(() => {
    cargarFincas()
  }, [])

  const cargarFincas = async () => {
    setCargando(true)
    try {
      const data = await catalogoService.getFincasPublicas()
      setFincas(data)
    } catch {
      toast.error('No se pudo conectar con el catálogo de terrenos.')
    } finally {
      setCargando(false)
    }
  }

  const handleSeleccionarFinca = async (id: number) => {
    setFincaSeleccionadaId(id)
    setCargandoDetalle(true)
    setFiltroSector('todos')
    setFiltroEstado('todos')
    try {
      const detalle = await catalogoService.getDetalleFinca(id)
      setDetalleFinca(detalle)
      window.scrollTo({ top: 280, behavior: 'smooth' })
    } catch {
      toast.error('Error al cargar la información del proyecto.')
      setFincaSeleccionadaId(null)
    } finally {
      setCargandoDetalle(false)
    }
  }

  const formatQ = (val: number) =>
    new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(val)

  // Filtrado de fincas
  const fincasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return fincas
    const q = busqueda.toLowerCase().trim()
    return fincas.filter(
      f =>
        f.nombre.toLowerCase().includes(q) ||
        f.municipio.toLowerCase().includes(q) ||
        f.departamento.toLowerCase().includes(q)
    )
  }, [fincas, busqueda])

  // Lotes filtrados dentro de la finca
  const lotesMostrados = useMemo(() => {
    if (!detalleFinca) return []
    const lotes: { lote: LotePublico; sectorNombre: string }[] = []

    detalleFinca.sectores.forEach(sec => {
      if (filtroSector !== 'todos' && String(sec.id) !== filtroSector) return
      sec.lotes.forEach(l => {
        if (filtroEstado !== 'todos' && l.estado !== filtroEstado) return
        lotes.push({ lote: l, sectorNombre: sec.nombre })
      })
    })

    return lotes
  }, [detalleFinca, filtroSector, filtroEstado])

  // Apartado vía WhatsApp con Honeypot anti-spam
  const handleApartarLote = async (lote: LotePublico) => {
    if (!nombreLead.trim() || !telefonoLead.trim()) {
      toast.error('Por favor escribe tu nombre y teléfono para apartar el lote.')
      return
    }

    setEnviandoLead(true)
    try {
      await catalogoService.enviarProspectoWeb({
        nombre_completo: nombreLead.trim(),
        telefono: telefonoLead.trim(),
        email: emailLead.trim() || undefined,
        finca_id: fincaSeleccionadaId || undefined,
        lote_id: lote.id,
        origen: canalOrigen,
        mensaje: `Interés en apartar Lote #${lote.numero_lote} en ${detalleFinca?.finca.nombre} (${lote.area_m2}m²). Cuota est. ${formatQ(Math.round((lote.precio_venta * 0.9) / 60))}/mes.`,
      })

      const whatsappOficial = empresaConfig.telefono?.replace(/\D/g, '') || ''
      const texto = encodeURIComponent(
        `¡Hola ${empresaConfig.nombreEmpresa || 'Parcelia'}! Mi nombre es ${nombreLead.trim()}. ` +
        `Deseo apartar el Lote #${lote.numero_lote} en ${detalleFinca?.finca.nombre} ` +
        `(${lote.area_m2}m² - Precio: ${formatQ(lote.precio_venta)}). Mi teléfono es ${telefonoLead.trim()}. ` +
        `¿Cómo procedo con el anticipo de Q500 para reservarlo?`
      )
      if (whatsappOficial) {
        window.open(`https://wa.me/${whatsappOficial}?text=${texto}`, '_blank')
      }

      toast.success('¡Solicitud registrada! Tu asesor se comunicará contigo de inmediato.')
      setLoteModal(null)
    } catch {
      toast.error('Error al procesar la reserva. Por favor intenta de nuevo.')
    } finally {
      setEnviandoLead(false)
    }
  }

  // Enviar formulario general de contacto (Lead Magnet de Redes Sociales)
  const handleEnviarContactoGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formContactoGeneral.nombre_completo.trim() || !formContactoGeneral.telefono.trim()) {
      toast.error('Por favor ingresa tu nombre y número de teléfono.')
      return
    }

    setEnviandoGeneral(true)
    try {
      await catalogoService.enviarProspectoWeb({
        nombre_completo: formContactoGeneral.nombre_completo.trim(),
        telefono: formContactoGeneral.telefono.trim(),
        email: formContactoGeneral.email.trim() || undefined,
        origen: canalOrigen,
        mensaje: `Solicitud de asesoría desde ${canalOrigen.toUpperCase()}. Zona de interés: ${formContactoGeneral.departamento_interes}. Presupuesto: Q${formContactoGeneral.presupuesto_estimado || 'Por definir'}. Nota: ${formContactoGeneral.mensaje}`,
      })

      toast.success('¡Gracias por comunicarte! Un asesor inmobiliario te escribirá hoy mismo por WhatsApp.')
      setFormContactoGeneral({
        nombre_completo: '',
        telefono: '',
        email: '',
        departamento_interes: 'Guatemala',
        presupuesto_estimado: '',
        mensaje: '',
      })
    } catch {
      toast.error('Hubo un inconveniente al enviar tus datos. Inténtalo de nuevo.')
    } finally {
      setEnviandoGeneral(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* BARRA SUPERIOR PÚBLICA — APPLE FROSTED GLASS */}
      <header className="sticky top-0 z-40 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {empresaConfig.logoUrl ? (
              <img
                src={empresaConfig.logoUrl}
                alt="Logo"
                className="h-10 w-auto max-w-[140px] object-contain rounded-xl"
              />
            ) : (
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
                <HouseLine size={20} weight="bold" />
              </div>
            )}
            <div>
              <span className="font-semibold text-[15px] sm:text-base tracking-tight text-zinc-900 dark:text-white block leading-snug">
                {empresaConfig.nombreEmpresa || 'Parcelia'}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium tracking-wide block">
                {empresaConfig.slogan || 'Terrenos Urbanizados & Financiamiento Propio'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {empresaConfig.telefono && (
              <a
                href={`https://wa.me/${empresaConfig.telefono.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <WhatsappLogo size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                {empresaConfig.telefono}
              </a>
            )}

            {onIrAFormulario && (
              <Button
                variant="outline"
                size="sm"
                onClick={onIrAFormulario}
                className="rounded-full text-xs border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1.5 h-9 px-4 font-medium shadow-xs transition-all active:scale-[0.98]"
              >
                <ChatCircleText size={15} weight="duotone" className="text-emerald-600" /> Solicitar Asesoría
              </Button>
            )}

            {onIrALogin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onIrALogin}
                className="rounded-full text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] gap-1.5 h-9 px-3.5 font-medium"
              >
                <LockKey size={14} />
                {tieneSesionActiva ? 'Volver al Panel' : 'Acceso'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER — APPLE CUPERTINO SHOWCASE */}
      <section className="relative overflow-hidden py-14 sm:py-20 px-4 bg-gradient-to-b from-white via-[#F5F5F7] to-[#F5F5F7] dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 border-b border-black/[0.05] dark:border-white/[0.06]">
        {/* Ambient radial glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[320px] bg-gradient-to-tr from-emerald-400/15 via-teal-300/10 to-transparent rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgb(0,0,0,0.03)] text-xs font-semibold tracking-tight">
            <Sparkle size={14} weight="fill" className="text-emerald-500" />
            Venta Directa de Terrenos y Parcelaciones
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-[54px] font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.08]">
            Tu Lote Propio con Cuotas Accesibles. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
              Sin Trámites Bancarios.
            </span>
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
            Explora lotificaciones activas en Guatemala, consulta medidas exactas y disponibilidad en tiempo real. Aparta tu terreno hoy con solo <strong className="font-semibold text-zinc-900 dark:text-white">Q500 de enganche</strong> y plazos de hasta 10 años.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-black/[0.05] dark:border-white/[0.06] font-medium shadow-2xs">
              <CheckCircle size={15} weight="fill" className="text-emerald-500" /> Crédito Directo
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-black/[0.05] dark:border-white/[0.06] font-medium shadow-2xs">
              <CheckCircle size={15} weight="fill" className="text-emerald-500" /> Escrituración Inmediata
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-black/[0.05] dark:border-white/[0.06] font-medium shadow-2xs">
              <CheckCircle size={15} weight="fill" className="text-emerald-500" /> Pagos con Remesas (EE. UU.)
            </span>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-10">
        {/* BUSCADOR Y BENTO GRID DE FINCAS */}
        {!fincaSeleccionadaId && (
          <div className="space-y-8">
            {/* Barra de búsqueda estilo Spotlight / Apple Store */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="relative flex-1 w-full">
                <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar proyecto por municipio, departamento o nombre..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500/60 focus-visible:ring-4 focus-visible:ring-emerald-500/10 transition-all"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={cargarFincas}
                disabled={cargando}
                className="w-full sm:w-auto gap-2 text-xs h-11 px-4 rounded-xl border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium shadow-2xs transition-all active:scale-[0.98]"
              >
                <ArrowsClockwise size={15} className={cargando ? 'animate-spin text-emerald-600' : 'text-zinc-500'} />
                Actualizar Disponibilidad
              </Button>
            </div>

            {/* Estado vacío elegante si no hay fincas */}
            {!cargando && fincasFiltradas.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-black/[0.05] dark:border-white/[0.08] p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.03)] max-w-lg mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <HouseLine size={24} weight="duotone" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {busqueda.trim() ? 'No encontramos proyectos con ese criterio' : 'Catálogo en actualización'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {busqueda.trim()
                    ? 'Intenta buscar con otro departamento o municipio, o solicita asesoría personalizada abajo.'
                    : 'Déjanos tus datos en el formulario inferior para enviarte el listado actualizado de terrenos disponibles directamente a tu WhatsApp.'}
                </p>
              </div>
            )}

            {/* BENTO CARDS DE PROYECTOS / FINCAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fincasFiltradas.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleSeleccionarFinca(f.id)}
                  className="group bg-white dark:bg-zinc-900 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Cabecera visual del proyecto */}
                    <div className="h-48 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 p-6 flex flex-col justify-between relative overflow-hidden">
                      <div className="pointer-events-none absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-500" />

                      <div className="flex items-center justify-between relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-emerald-900 font-semibold text-[11px] shadow-sm tabular-nums">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {f.lotes_disponibles} lotes disponibles
                        </span>
                        <span className="text-[11px] text-white/90 font-medium bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 tabular-nums">
                          {f.total_sectores} Sectores
                        </span>
                      </div>

                      <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white tracking-tight group-hover:translate-x-0.5 transition-transform">
                          {f.nombre}
                        </h3>
                        <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-1 font-medium">
                          <MapPin size={14} weight="fill" className="text-emerald-300 shrink-0" />
                          {f.municipio}, {f.departamento}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 space-y-5">
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {f.descripcion || 'Proyecto urbanizado con acceso vehicular, mojones definidos y financiamiento propio inmediato.'}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl">
                          <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider flex items-center gap-1">
                            <Tag size={12} /> Precios Desde
                          </span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5 tabular-nums">
                            {formatQ(f.precio_desde)}
                          </p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl">
                          <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider flex items-center gap-1">
                            <Ruler size={12} /> Áreas Desde
                          </span>
                          <p className="font-bold text-zinc-900 dark:text-white text-base mt-0.5 tabular-nums">
                            {f.area_min_m2} m²
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-0">
                    <Button className="w-full rounded-2xl bg-zinc-900 hover:bg-emerald-600 dark:bg-white dark:hover:bg-emerald-500 text-white dark:text-zinc-900 font-semibold text-xs h-11 gap-2 shadow-xs transition-all duration-200 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400">
                      <span>Explorar Lotes y Medidas</span>
                      <CaretRight size={14} weight="bold" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA DETALLE DE LA FINCA CON GRID DE LOTES */}
        {fincaSeleccionadaId && detalleFinca && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFincaSeleccionadaId(null)}
                  className="h-10 px-4 rounded-xl gap-1.5 text-xs font-medium border-black/[0.08] dark:border-white/[0.1] bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100"
                >
                  <ArrowLeft size={14} weight="bold" /> Proyectos
                </Button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {detalleFinca.finca.nombre}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={13} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                    {detalleFinca.finca.municipio}, {detalleFinca.finca.departamento}
                  </p>
                </div>
              </div>

              {/* Filtros de sector y estado estilo Apple Pill */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <select
                  aria-label="Filtrar por sector"
                  value={filtroSector}
                  onChange={e => setFiltroSector(e.target.value)}
                  className="h-10 px-3.5 text-xs font-medium rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-zinc-100/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500"
                >
                  <option value="todos">Todos los Sectores</option>
                  {detalleFinca.sectores.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      {s.nombre} ({s.lotes.length} lotes)
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filtrar por estado de disponibilidad"
                  value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value)}
                  className="h-10 px-3.5 text-xs font-medium rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-zinc-100/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="disponible">🟢 Solo Disponibles</option>
                  <option value="apartado">🟡 Apartados</option>
                  <option value="vendido">🔴 Vendidos</option>
                </select>
              </div>
            </div>

            {/* GRID DE LOTES DISPONIBLES */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {lotesMostrados.map(({ lote, sectorNombre }) => {
                const isDisp = lote.estado === 'disponible'
                const isApart = lote.estado === 'apartado'

                return (
                  <div
                    key={lote.id}
                    onClick={() => {
                      setLoteModal(lote)
                      setNombreLead('')
                      setTelefonoLead('')
                      setEmailLead('')
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isDisp
                        ? 'bg-white dark:bg-zinc-900 border-emerald-500/30 hover:border-emerald-500 shadow-[0_4px_16px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_25px_rgba(16,185,129,0.12)] hover:-translate-y-0.5'
                        : isApart
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-500/30 opacity-85'
                        : 'bg-zinc-100/70 dark:bg-zinc-900/40 border-black/[0.05] dark:border-white/[0.05] opacity-55'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
                        {sectorNombre}
                      </span>
                      <h4 className="font-bold text-base text-zinc-900 dark:text-white tracking-tight tabular-nums">
                        Lote #{lote.numero_lote}
                      </h4>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">{lote.area_m2} m²</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatQ(lote.precio_venta)}
                      </p>
                      <Badge
                        className={`text-[9px] mt-1.5 px-2 py-0.5 rounded-full font-semibold border-0 ${
                          isDisp
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : isApart
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {isDisp ? 'DISPONIBLE' : isApart ? 'APARTADO' : 'VENDIDO'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN LEAD MAGNET: FORMULARIO GENERAL PARA REDES SOCIALES (APPLE CARD) */}
        <section className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-10 rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.05)] space-y-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="max-w-2xl mx-auto text-center space-y-2 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <ChatCircleText size={24} weight="duotone" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              ¿Tienes Dudas o Buscas un Lote en Particular?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Déjanos tu número de WhatsApp y un asesor te enviará la lista completa de lotes disponibles con sus cuotas mensuales.
            </p>
          </div>

          <form onSubmit={handleEnviarContactoGeneral} className="max-w-3xl mx-auto space-y-3.5 relative z-10">
            {/* 🛡️ Trampa Honeypot invisible para Bots de Spam */}
            <input
              type="text"
              name="website_url_check"
              value={honeypotBot}
              onChange={e => setHoneypotBot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">Nombre Completo *</label>
                <Input
                  required
                  placeholder="Ej. María Fernanda López"
                  value={formContactoGeneral.nombre_completo}
                  onChange={e => setFormContactoGeneral({ ...formContactoGeneral, nombre_completo: e.target.value })}
                  className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">Teléfono / WhatsApp *</label>
                <Input
                  required
                  placeholder="Ej. 5544-3322"
                  value={formContactoGeneral.telefono}
                  onChange={e => setFormContactoGeneral({ ...formContactoGeneral, telefono: e.target.value })}
                  className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">Departamento o Zona</label>
                <Input
                  placeholder="Ej. Guatemala, Escuintla..."
                  value={formContactoGeneral.departamento_interes}
                  onChange={e => setFormContactoGeneral({ ...formContactoGeneral, departamento_interes: e.target.value })}
                  className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-1">
              <Input
                placeholder="Mensaje o consulta sobre financiamiento (opcional)..."
                value={formContactoGeneral.mensaje}
                onChange={e => setFormContactoGeneral({ ...formContactoGeneral, mensaje: e.target.value })}
                className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15 flex-1"
              />
              <Button
                type="submit"
                disabled={enviandoGeneral}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-6 shadow-[0_4px_14px_rgba(16,185,129,0.35)] gap-2 shrink-0 transition-all active:scale-[0.98]"
              >
                <WhatsappLogo size={18} weight="fill" />
                {enviandoGeneral ? 'Enviando...' : 'Solicitar Información por WhatsApp'}
              </Button>
            </div>

            <p className="text-[11px] text-center text-zinc-400 flex items-center justify-center gap-1 pt-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              Atención directa y confidencial por asesores autorizados.
            </p>
          </form>
        </section>
      </main>

      {/* FOOTER PÚBLICO */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 py-8 px-4 text-center text-xs text-zinc-500 space-y-1.5">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">
          © {new Date().getFullYear()} {empresaConfig.nombreEmpresa || 'Parcelia'}. Todos los derechos reservados.
        </p>
        <p className="text-[11px] text-zinc-400">
          Plataforma Inmobiliaria Segura · Transacciones y Contratos respaldados bajo las Leyes de la República de Guatemala.
        </p>
      </footer>

      {/* MODAL FICHA TÉCNICA Y APARTADO DE LOTE — APPLE SHEET DIALOG */}
      <Dialog open={!!loteModal} onOpenChange={open => !open && setLoteModal(null)}>
        {loteModal && (
          <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-white shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-lg font-bold tracking-tight">
                <span>Lote #{loteModal.numero_lote} · {detalleFinca?.finca.nombre}</span>
                <Badge
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border-0 ${
                    loteModal.estado === 'disponible'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : loteModal.estado === 'apartado'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600'
                  }`}
                >
                  {loteModal.estado.toUpperCase()}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Medidas y Precios */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#F5F5F7] dark:bg-zinc-800/70 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Área Total</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white tabular-nums mt-0.5">{loteModal.area_m2} m²</p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Dimensiones</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white tabular-nums mt-0.5">
                    {loteModal.frente_metros}m × {loteModal.fondo_metros}m
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Precio de Contado</span>
                  <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                    {formatQ(loteModal.precio_venta)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Cuota Estimada (60m)</span>
                  <p className="font-extrabold text-base text-teal-600 dark:text-teal-400 tabular-nums mt-0.5">
                    {formatQ(Math.round((loteModal.precio_venta * 0.9) / 60))} / mes
                  </p>
                </div>
              </div>

              {/* Colindancias */}
              {loteModal.colindancias && (
                <div className="p-3.5 bg-[#F5F5F7] dark:bg-zinc-800/70 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Colindancias Notariales
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                    <p><strong className="text-zinc-900 dark:text-white">Norte:</strong> {loteModal.colindancias.norte || 'Calle principal'}</p>
                    <p><strong className="text-zinc-900 dark:text-white">Sur:</strong> {loteModal.colindancias.sur || 'Lote colindante'}</p>
                    <p><strong className="text-zinc-900 dark:text-white">Oriente:</strong> {loteModal.colindancias.oriente || 'Lote colindante'}</p>
                    <p><strong className="text-zinc-900 dark:text-white">Poniente:</strong> {loteModal.colindancias.poniente || 'Lote colindante'}</p>
                  </div>
                </div>
              )}

              {/* Formulario de Reserva */}
              {loteModal.estado === 'disponible' ? (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/25 rounded-2xl space-y-3">
                  <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <WhatsappLogo size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                    Aparta este terreno con Q500 por WhatsApp
                  </h5>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Deja tus datos para que un asesor te asista de inmediato antes de que el lote sea reservado por otra persona.
                  </p>

                  <div className="space-y-2.5">
                    <Input
                      placeholder="Tu Nombre Completo *"
                      value={nombreLead}
                      onChange={e => setNombreLead(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-900 border-black/[0.1] dark:border-white/[0.1] text-zinc-900 dark:text-white"
                    />
                    <Input
                      placeholder="Teléfono / WhatsApp *"
                      value={telefonoLead}
                      onChange={e => setTelefonoLead(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-900 border-black/[0.1] dark:border-white/[0.1] text-zinc-900 dark:text-white"
                    />
                  </div>

                  <Button
                    onClick={() => handleApartarLote(loteModal)}
                    disabled={enviandoLead}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 gap-1.5 shadow-sm"
                  >
                    <WhatsappLogo size={18} weight="fill" />
                    {enviandoLead ? 'Registrando...' : 'Apartar con Q500 por WhatsApp'}
                  </Button>
                </div>
              ) : (
                <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                  <Info size={16} />
                  Este lote se encuentra {loteModal.estado}. Puedes consultar otros lotes disponibles en este sector.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLoteModal(null)}
                className="rounded-xl text-xs h-9 px-4 border-black/[0.08] dark:border-white/[0.1]"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
