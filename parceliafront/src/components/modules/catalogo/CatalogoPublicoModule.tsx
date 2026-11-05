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
} from '@phosphor-icons/react'

export function CatalogoPublicoModule() {
  const { config: empresaConfig } = useEmpresaConfig()
  const [fincas, setFincas] = useState<FincaPublica[]>([])
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Finca seleccionada
  const [fincaSeleccionadaId, setFincaSeleccionadaId] = useState<number | null>(null)
  const [detalleFinca, setDetalleFinca] = useState<DetalleFincaPublica | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [filtroSector, setFiltroSector] = useState<string>('todos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  // Modal Detalle de Lote y Apartado
  const [loteModal, setLoteModal] = useState<LotePublico | null>(null)
  const [nombreLead, setNombreLead] = useState('')
  const [telefonoLead, setTelefonoLead] = useState('')
  const [emailLead, setEmailLead] = useState('')
  const [enviandoLead, setEnviandoLead] = useState(false)

  // Cargar fincas públicas al montar
  useEffect(() => {
    cargarFincas()
  }, [])

  const cargarFincas = async () => {
    setCargando(true)
    try {
      const data = await catalogoService.getFincasPublicas()
      setFincas(data)
    } catch {
      toast.error('No se pudo conectar al catálogo público.')
    } finally {
      setCargando(false)
    }
  }

  // Cargar detalle de finca
  const handleSeleccionarFinca = async (id: number) => {
    setFincaSeleccionadaId(id)
    setCargandoDetalle(true)
    setFiltroSector('todos')
    setFiltroEstado('todos')
    try {
      const detalle = await catalogoService.getDetalleFinca(id)
      setDetalleFinca(detalle)
    } catch {
      toast.error('Error al cargar lotificación.')
      setFincaSeleccionadaId(null)
    } finally {
      setCargandoDetalle(false)
    }
  }

  // Fincas filtradas
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

  // Lotes filtrados dentro de la finca seleccionada
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

  // Formateadores
  const formatQ = (val: number) =>
    new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(val)

  // Enviar lead y abrir WhatsApp
  const handleApartarPorWhatsApp = async (lote: LotePublico) => {
    if (!nombreLead.trim() || !telefonoLead.trim()) {
      toast.error('Por favor escribe tu nombre y tu número de WhatsApp para reservar.')
      return
    }

    setEnviandoLead(true)
    try {
      // 1. Guardar prospecto en CRM
      await catalogoService.enviarProspectoWeb({
        nombre_completo: nombreLead.trim(),
        telefono: telefonoLead.trim(),
        email: emailLead.trim() || undefined,
        finca_id: fincaSeleccionadaId || undefined,
        lote_id: lote.id,
        origen: 'web_catalogo',
        mensaje: `Interés en apartar el Lote #${lote.numero_lote} (${lote.area_m2}m²) en ${detalleFinca?.finca.nombre}`,
      })

      // 2. Abrir WhatsApp oficial
      const whatsappOficial = empresaConfig.telefono?.replace(/\D/g, '') || ''
      const msg = encodeURIComponent(
        `¡Hola ${empresaConfig.nombreEmpresa || 'Parcelia'}! Mi nombre es ${nombreLead}. Estoy interesado en reservar el Lote #${lote.numero_lote} en ${detalleFinca?.finca.nombre} (${lote.area_m2}m² - ${formatQ(lote.precio_venta)}). Mi teléfono es ${telefonoLead}. ¿Cuáles son los pasos para dar mi anticipo de Q500?`
      )
      if (whatsappOficial) {
        window.open(`https://wa.me/${whatsappOficial}?text=${msg}`, '_blank')
      }

      toast.success('¡Solicitud enviada! Tu asesor se comunicará contigo de inmediato.')
      setLoteModal(null)
    } catch {
      toast.error('Ocurrió un error al enviar tu solicitud. Intenta de nuevo.')
    } finally {
      setEnviandoLead(false)
    }
  }

  // Copiar enlace para compartir
  const handleCompartirLote = (lote: LotePublico) => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success(`Enlace copiado al portapapeles. ¡Compártelo por WhatsApp!`)
  }

  return (
    <div className="space-y-6">
      {/* CABECERA SHOWCASE */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold backdrop-blur-xs border border-emerald-400/30">
            <Sparkle size={14} weight="fill" />
            Catálogo Oficial de Terrenos & Lotificaciones
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Descubre Tu Próximo Terreno con Financiamiento Directo
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
            Explora las fincas activas, consulta medidas exactas y disponibilidad en tiempo real. Sin trámites bancarios y con cuotas cómodas hasta 10 años.
          </p>
        </div>
      </div>

      {/* VISTA 1: LISTADO DE FINCAS / PROYECTOS */}
      {!fincaSeleccionadaId && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border">
            <div className="relative flex-1 w-full sm:w-auto">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de finca, municipio o departamento..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={cargarFincas} disabled={cargando} className="gap-1.5 text-xs h-9">
              <ArrowsClockwise size={14} className={cargando ? 'animate-spin' : ''} />
              Actualizar Catálogo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fincasFiltradas.map(f => (
              <Card
                key={f.id}
                className="overflow-hidden border hover:border-emerald-500/80 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
                onClick={() => handleSeleccionarFinca(f.id)}
              >
                <div>
                  <div className="h-40 bg-gradient-to-br from-emerald-800 to-teal-950 p-4 flex flex-col justify-between text-white relative">
                    <Badge className="self-start bg-emerald-500/90 text-white font-semibold text-[11px] shadow-sm">
                      {f.lotes_disponibles} lotes libres
                    </Badge>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white drop-shadow-xs">{f.nombre}</h3>
                      <p className="text-xs text-emerald-200 flex items-center gap-1 mt-0.5">
                        <MapPin size={14} weight="fill" /> {f.municipio}, {f.departamento}
                      </p>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">{f.descripcion}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-medium">Precios desde</span>
                        <p className="font-bold text-foreground text-sm">{formatQ(f.precio_desde)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-medium">Áreas desde</span>
                        <p className="font-bold text-foreground text-sm">{f.area_min_m2} m²</p>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Button className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9">
                    <HouseLine size={16} weight="bold" />
                    Explorar Lotes y Plano
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: EXPLORADOR DE LOTES DE LA FINCA SELECCIONADA */}
      {fincaSeleccionadaId && detalleFinca && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFincaSeleccionadaId(null)}
                className="h-8 gap-1 text-xs"
              >
                <ArrowLeft size={14} /> Volver a Proyectos
              </Button>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  {detalleFinca.finca.nombre}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={13} weight="fill" /> {detalleFinca.finca.municipio}, {detalleFinca.finca.departamento}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por sector"
                value={filtroSector}
                onChange={e => setFiltroSector(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-md border border-input bg-background"
              >
                <option value="todos">Todos los Sectores</option>
                {detalleFinca.sectores.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nombre} ({s.lotes.length} lotes)
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por estado"
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-md border border-input bg-background"
              >
                <option value="todos">Todos los Estados</option>
                <option value="disponible">🟢 Solo Disponibles</option>
                <option value="apartado">🟡 Apartados</option>
                <option value="vendido">🔴 Vendidos</option>
              </select>
            </div>
          </div>

          {/* GRID DE LOTES */}
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
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between ${
                    isDisp
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
                      : isApart
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 opacity-90'
                      : 'bg-muted/50 border-border opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{sectorNombre}</span>
                    <h4 className="font-extrabold text-sm sm:text-base text-foreground">
                      Lote {lote.numero_lote}
                    </h4>
                    <p className="text-[11px] font-medium text-muted-foreground">{lote.area_m2} m²</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-border/60">
                    <p className="text-xs font-bold text-foreground">{formatQ(lote.precio_venta)}</p>
                    <Badge
                      className={`text-[9px] mt-1 px-1.5 py-0 font-semibold ${
                        isDisp
                          ? 'bg-emerald-600 text-white'
                          : isApart
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-500 text-white'
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

      {/* MODAL FICHA TÉCNICA Y RESERVA POR WHATSAPP */}
      <Dialog open={!!loteModal} onOpenChange={open => !open && setLoteModal(null)}>
        {loteModal && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-lg font-bold">
                <span>Lote #{loteModal.numero_lote} - Ficha Técnica</span>
                <Badge
                  className={
                    loteModal.estado === 'disponible'
                      ? 'bg-emerald-600 text-white'
                      : loteModal.estado === 'apartado'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-500 text-white'
                  }
                >
                  {loteModal.estado.toUpperCase()}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Medidas y Precios */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/50 rounded-xl border text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px]">Área Total:</span>
                  <p className="font-bold text-sm text-foreground">{loteModal.area_m2} m²</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Dimensiones:</span>
                  <p className="font-bold text-sm text-foreground">
                    {loteModal.frente_metros}m frente × {loteModal.fondo_metros}m fondo
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Precio de Contado:</span>
                  <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                    {formatQ(loteModal.precio_venta)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Cuota Estimada (60 meses):</span>
                  <p className="font-extrabold text-base text-foreground">
                    {formatQ(Math.round((loteModal.precio_venta * 0.9) / 60))} / mes
                  </p>
                </div>
              </div>

              {/* Colindancias */}
              {loteModal.colindancias && (
                <div className="space-y-1.5 p-3 rounded-lg border bg-card text-xs">
                  <h5 className="font-semibold text-foreground flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    <Compass size={14} weight="bold" /> Colindancias Notariales
                  </h5>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground text-[11px]">
                    <p><strong>Norte:</strong> {loteModal.colindancias.norte || 'Calle principal'}</p>
                    <p><strong>Sur:</strong> {loteModal.colindancias.sur || 'Lote colindante'}</p>
                    <p><strong>Oriente:</strong> {loteModal.colindancias.oriente || 'Lote colindante'}</p>
                    <p><strong>Poniente:</strong> {loteModal.colindancias.poniente || 'Lote colindante'}</p>
                  </div>
                </div>
              )}

              {/* Formulario de Reserva Inmediata */}
              {loteModal.estado === 'disponible' ? (
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <WhatsappLogo size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                      Aparta este lote con Q500 por WhatsApp
                    </h5>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      Ingresa tus datos para contactar a tu asesor y asegurar este terreno antes de que se venda.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Tu nombre completo *"
                      value={nombreLead}
                      onChange={e => setNombreLead(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                    <Input
                      placeholder="Teléfono / WhatsApp *"
                      value={telefonoLead}
                      onChange={e => setTelefonoLead(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <Button
                    onClick={() => handleApartarPorWhatsApp(loteModal)}
                    disabled={enviandoLead}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
                  >
                    <WhatsappLogo size={18} weight="fill" />
                    {enviandoLead ? 'Registrando...' : 'Apartar vía WhatsApp Directo'}
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-xl text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Info size={16} />
                  Este lote se encuentra {loteModal.estado}. Puedes consultar otros lotes disponibles en este sector.
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCompartirLote(loteModal)}
                className="text-xs gap-1 h-8"
              >
                <ShareNetwork size={14} /> Compartir Lote
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLoteModal(null)} className="text-xs h-8">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

