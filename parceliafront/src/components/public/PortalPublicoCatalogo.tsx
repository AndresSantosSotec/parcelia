import React, { useState, useEffect, useMemo } from 'react'
import {
  catalogoService,
  FincaPublica,
  DetalleFincaPublica,
  LotePublico,
} from '@/services/catalogoService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import {
  HouseLine,
  MapPin,
  Compass,
  WhatsappLogo,
  PhoneCall,
  MagnifyingGlass,
  ArrowsClockwise,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  Info,
  Sparkle,
  ShareNetwork,
  ShieldCheck,
  User,
  Envelope,
  ChatCircleText,
  LockKey,
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
      window.scrollTo({ top: 300, behavior: 'smooth' })
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
    let lotes: { lote: LotePublico; sectorNombre: string }[] = []

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
      // 🛡️ Enviar lead con trampa Honeypot al backend
      await catalogoService.enviarProspectoWeb({
        nombre_completo: nombreLead.trim(),
        telefono: telefonoLead.trim(),
        email: emailLead.trim() || undefined,
        finca_id: fincaSeleccionadaId || undefined,
        lote_id: lote.id,
        origen: canalOrigen,
        mensaje: `Interés en apartar Lote #${lote.numero_lote} en ${detalleFinca?.finca.nombre} (${lote.area_m2}m²). Cuota est. ${formatQ(Math.round((lote.precio_venta * 0.9) / 60))}/mes.`,
      })

      // Redirigir a WhatsApp oficial con mensaje precargado
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* BARRA SUPERIOR PÚBLICA */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {empresaConfig.logoUrl ? (
              <img
                src={empresaConfig.logoUrl}
                alt="Logo"
                className="h-10 w-auto max-w-[140px] object-contain rounded-md"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <HouseLine size={20} weight="bold" />
              </div>
            )}
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block">
                {empresaConfig.nombreEmpresa || 'Parcelia'}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                {empresaConfig.slogan || 'Terrenos Urbanizados & Financiamiento Propio'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {empresaConfig.telefono && (
              <a
                href={`https://wa.me/${empresaConfig.telefono.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-semibold border border-emerald-500/30 transition-all"
              >
                <WhatsappLogo size={16} weight="fill" />
                WhatsApp: {empresaConfig.telefono}
              </a>
            )}

            {onIrAFormulario && (
              <Button
                variant="outline"
                size="sm"
                onClick={onIrAFormulario}
                className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:text-white gap-1.5 h-8"
              >
                <ChatCircleText size={14} /> Solicitar Asesoría
              </Button>
            )}

            {onIrALogin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onIrALogin}
                className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5 h-8"
              >
                <LockKey size={14} />
                {tieneSesionActiva ? 'Volver al Panel' : 'Acceso Asesores'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER SHOWCASE */}
      <section className="relative overflow-hidden py-12 sm:py-16 px-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Sparkle size={14} weight="fill" />
            Venta Directa de Terrenos y Parcelaciones
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Tu Lote Propio con Cuotas Accesibles <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Sin Trámites Bancarios en Guatemala
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Explora las lotificaciones activas, consulta medidas exactas y disponibilidad en tiempo real. 
            Aparta tu terreno hoy con solo <strong>Q500 de enganche</strong> y paga a plazos de hasta 10 años.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle size={15} weight="fill" /> Crédito Directo
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle size={15} weight="fill" /> Escrituración Inmediata
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle size={15} weight="fill" /> Pagos desde EE. UU. (Remesas)
            </span>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* BUSCADOR DE FINCAS */}
        {!fincaSeleccionadaId && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <div className="relative flex-1 w-full sm:w-auto">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar finca por municipio, departamento o nombre..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="pl-9 h-10 bg-slate-950 border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={cargarFincas}
                disabled={cargando}
                className="gap-1.5 text-xs h-10 border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-900"
              >
                <ArrowsClockwise size={14} className={cargando ? 'animate-spin' : ''} />
                Actualizar Disponibilidad
              </Button>
            </div>

            {/* LISTADO DE PROYECTOS / FINCAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fincasFiltradas.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleSeleccionarFinca(f.id)}
                  className="group bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-emerald-500/70 transition-all hover:shadow-xl hover:shadow-emerald-950/20 cursor-pointer overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs shadow-sm">
                          {f.lotes_disponibles} lotes disponibles
                        </Badge>
                        <span className="text-[11px] text-emerald-200 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                          {f.total_sectores} Sectores
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {f.nombre}
                        </h3>
                        <p className="text-xs text-emerald-200/90 flex items-center gap-1 mt-0.5">
                          <MapPin size={14} weight="fill" /> {f.municipio}, {f.departamento}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-xs text-slate-400 line-clamp-2">{f.descripcion}</p>

                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                            Precios Desde
                          </span>
                          <p className="font-extrabold text-emerald-400 text-sm">{formatQ(f.precio_desde)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                            Áreas Desde
                          </span>
                          <p className="font-extrabold text-white text-sm">{f.area_min_m2} m²</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs h-10 gap-1.5 shadow-md">
                      <HouseLine size={16} weight="bold" />
                      Explorar Lotes y Medidas
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
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFincaSeleccionadaId(null)}
                  className="h-9 gap-1 text-xs border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
                >
                  <ArrowLeft size={14} /> Volver a Proyectos
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {detalleFinca.finca.nombre}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={13} weight="fill" className="text-emerald-400" />
                    {detalleFinca.finca.municipio}, {detalleFinca.finca.departamento}
                  </p>
                </div>
              </div>

              {/* Filtros de sector y estado */}
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Filtrar por sector"
                  value={filtroSector}
                  onChange={e => setFiltroSector(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="h-9 px-3 text-xs rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="disponible">🟢 Solo Disponibles</option>
                  <option value="apartado">🟡 Apartados</option>
                  <option value="vendido">🔴 Vendidos</option>
                </select>
              </div>
            </div>

            {/* GRID DE LOTES DISPONIBLES */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer shadow-sm hover:scale-[1.02] flex flex-col justify-between ${
                      isDisp
                        ? 'bg-emerald-950/20 border-emerald-500/60 hover:border-emerald-400'
                        : isApart
                        ? 'bg-amber-950/20 border-amber-500/40 opacity-80'
                        : 'bg-slate-900/60 border-slate-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {sectorNombre}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">
                        Lote #{lote.numero_lote}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-300">{lote.area_m2} m²</p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                      <p className="text-xs font-bold text-emerald-400">{formatQ(lote.precio_venta)}</p>
                      <Badge
                        className={`text-[9px] mt-1.5 px-1.5 py-0 font-bold ${
                          isDisp
                            ? 'bg-emerald-500 text-slate-950'
                            : isApart
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-700 text-slate-300'
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

        {/* SECCIÓN LEAD MAGNET: FORMULARIO GENERAL PARA REDES SOCIALES */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center gap-2">
              <ChatCircleText size={24} className="text-emerald-400" />
              ¿Tienes Dudas o Buscas un Lote en Particular?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Déjanos tu número de WhatsApp y un asesor te enviará la lista completa de lotes disponibles con sus cuotas mensuales.
            </p>
          </div>

          <form onSubmit={handleEnviarContactoGeneral} className="max-w-3xl mx-auto space-y-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                required
                placeholder="Tu Nombre Completo *"
                value={formContactoGeneral.nombre_completo}
                onChange={e => setFormContactoGeneral({ ...formContactoGeneral, nombre_completo: e.target.value })}
                className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
              />
              <Input
                required
                placeholder="Teléfono / WhatsApp *"
                value={formContactoGeneral.telefono}
                onChange={e => setFormContactoGeneral({ ...formContactoGeneral, telefono: e.target.value })}
                className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
              />
              <Input
                placeholder="Lugar o Zona de Interés"
                value={formContactoGeneral.departamento_interes}
                onChange={e => setFormContactoGeneral({ ...formContactoGeneral, departamento_interes: e.target.value })}
                className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Mensaje o consulta sobre financiamiento (opcional)"
                value={formContactoGeneral.mensaje}
                onChange={e => setFormContactoGeneral({ ...formContactoGeneral, mensaje: e.target.value })}
                className="h-10 bg-slate-950 border-slate-700 text-xs text-white flex-1"
              />
              <Button
                type="submit"
                disabled={enviandoGeneral}
                className="h-10 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-6 shadow-md shrink-0"
              >
                {enviandoGeneral ? 'Enviando...' : 'Solicitar Información por WhatsApp'}
              </Button>
            </div>
          </form>
        </section>
      </main>

      {/* FOOTER PÚBLICO */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-400">
          © {new Date().getFullYear()} {empresaConfig.nombreEmpresa || 'Parcelia'}. Todos los derechos reservados.
        </p>
        <p className="text-[11px] text-slate-600">
          Plataforma Inmobiliaria Segura · Transacciones y Contratos respaldados bajo las Leyes de la República de Guatemala.
        </p>
      </footer>

      {/* MODAL FICHA TÉCNICA Y APARTADO DE LOTE */}
      <Dialog open={!!loteModal} onOpenChange={open => !open && setLoteModal(null)}>
        {loteModal && (
          <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base font-bold">
                <span>Lote #{loteModal.numero_lote} ({detalleFinca?.finca.nombre})</span>
                <Badge
                  className={
                    loteModal.estado === 'disponible'
                      ? 'bg-emerald-500 text-slate-950'
                      : loteModal.estado === 'apartado'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-700 text-slate-300'
                  }
                >
                  {loteModal.estado.toUpperCase()}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Medidas y Precios */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px]">Área Total:</span>
                  <p className="font-bold text-sm text-white">{loteModal.area_m2} m²</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Dimensiones:</span>
                  <p className="font-bold text-sm text-white">
                    {loteModal.frente_metros}m frente × {loteModal.fondo_metros}m fondo
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Precio de Contado:</span>
                  <p className="font-extrabold text-base text-emerald-400">{formatQ(loteModal.precio_venta)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Cuota Estimada (60m):</span>
                  <p className="font-extrabold text-base text-teal-300">
                    {formatQ(Math.round((loteModal.precio_venta * 0.9) / 60))} / mes
                  </p>
                </div>
              </div>

              {/* Colindancias */}
              {loteModal.colindancias && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Colindancias Notariales
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                    <p><strong>Norte:</strong> {loteModal.colindancias.norte || 'Calle principal'}</p>
                    <p><strong>Sur:</strong> {loteModal.colindancias.sur || 'Lote colindante'}</p>
                    <p><strong>Oriente:</strong> {loteModal.colindancias.oriente || 'Lote colindante'}</p>
                    <p><strong>Poniente:</strong> {loteModal.colindancias.poniente || 'Lote colindante'}</p>
                  </div>
                </div>
              )}

              {/* Formulario de Reserva */}
              {loteModal.estado === 'disponible' ? (
                <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2.5">
                  <h5 className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <WhatsappLogo size={16} weight="fill" className="text-emerald-400" />
                    Aparta este terreno con Q500 por WhatsApp
                  </h5>
                  <p className="text-[11px] text-slate-300">
                    Deja tus datos para que un asesor te asista de inmediato antes de que el lote sea reservado por otra persona.
                  </p>

                  <div className="space-y-2">
                    <Input
                      placeholder="Tu Nombre Completo *"
                      value={nombreLead}
                      onChange={e => setNombreLead(e.target.value)}
                      className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
                    />
                    <Input
                      placeholder="Teléfono / WhatsApp *"
                      value={telefonoLead}
                      onChange={e => setTelefonoLead(e.target.value)}
                      className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
                    />
                  </div>

                  <Button
                    onClick={() => handleApartarLote(loteModal)}
                    disabled={enviandoLead}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs h-9 gap-1.5 shadow-md"
                  >
                    <WhatsappLogo size={18} weight="fill" />
                    {enviandoLead ? 'Registrando...' : 'Apartar con Q500 por WhatsApp'}
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
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
                className="text-xs h-8 border-slate-700 bg-slate-950 text-slate-300"
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

