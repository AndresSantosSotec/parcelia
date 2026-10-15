import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MapTrifold, PencilSimple, UploadSimple, FloppyDisk, ArrowCounterClockwise, Trash, Polygon, GridFour, Check, X, MagnifyingGlass, Hand, ArrowsOutCardinal, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  fincaService,
  planoLotificacionService,
  tasaInmobiliariaService,
  type Finca,
  type LotePlano,
  type PlanoFinca,
  type PuntoPlano,
  type TasaInmobiliaria,
} from '@/lib/api'
import { usePermissions } from '@/hooks/use-permissions'
import { useNavigateModule } from '@/hooks/use-navigate-module'
import { VisorPlano, type FiguraSuelta, type ModoPlano } from './VisorPlano'
import { PanelLote, type CondicionesSimulacion } from './PanelLote'
import { ESTADOS_LOTE, estadoLote, CLAVE_VENTA_DESDE_PLANO, CLAVE_VER_NEGOCIACION } from './estadosLote'

const CLAVE_FINCA = 'parcelia_plano_finca'

interface PlanoLotesModuleProps {
  sessionUser?: any
}

function cuadricula(lotes: LotePlano[], ancho: number, alto: number): Record<number, PuntoPlano[]> {
  const n = lotes.length
  if (!n) return {}
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * ancho) / alto)))
  const filas = Math.ceil(n / cols)
  const margen = Math.min(ancho, alto) * 0.04
  const celdaW = (ancho - margen * 2) / cols
  const celdaH = (alto - margen * 2) / filas
  const hueco = Math.min(celdaW, celdaH) * 0.08
  const r = (v: number) => Math.round(v * 100) / 100
  const salida: Record<number, PuntoPlano[]> = {}
  lotes.forEach((l, i) => {
    const x = margen + (i % cols) * celdaW + hueco
    const y = margen + Math.floor(i / cols) * celdaH + hueco
    const w = celdaW - hueco * 2
    const h = celdaH - hueco * 2
    salida[l.id] = [[r(x), r(y)], [r(x + w), r(y)], [r(x + w), r(y + h)], [r(x), r(y + h)]]
  })
  return salida
}

export function PlanoLotesModule({ sessionUser }: PlanoLotesModuleProps) {
  const { hasPermission } = usePermissions(sessionUser)
  const { navigate } = useNavigateModule()
  const puedeEditar = hasPermission('fincas', 'editar')
  const puedeSimular = hasPermission('negociaciones', 'ver')
  const puedeVender = hasPermission('negociaciones', 'crear')

  const [fincas, setFincas] = useState<Finca[]>([])
  const [fincaId, setFincaId] = useState<number | null>(() => Number(localStorage.getItem(CLAVE_FINCA)) || null)
  const [datos, setDatos] = useState<PlanoFinca | null>(null)
  const [cargando, setCargando] = useState(false)
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const [tasas, setTasas] = useState<TasaInmobiliaria[]>([])

  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)
  const [fichaAbierta, setFichaAbierta] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [editando, setEditando] = useState(false)
  const [cambios, setCambios] = useState<Record<number, PuntoPlano[] | null>>({})
  const [dibujandoId, setDibujandoId] = useState<number | null>(null)
  const [dibujoLibre, setDibujoLibre] = useState(false)
  const [puntosDibujo, setPuntosDibujo] = useState<PuntoPlano[]>([])
  const [sueltas, setSueltas] = useState<FiguraSuelta[]>([])
  const [sueltaActivaId, setSueltaActivaId] = useState<string | null>(null)
  const [modo, setModo] = useState<ModoPlano>('vista')
  const [guardando, setGuardando] = useState(false)
  const inputImagen = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fincaService.getAll().then((res) => {
      if (!res.success || !res.data) return
      const lista = Array.isArray(res.data) ? res.data : []
      setFincas(lista)
      setFincaId((actual) => (actual && lista.some((f) => f.id === actual) ? actual : lista[0]?.id ?? null))
    }).catch(() => toast.error('No se pudieron cargar las fincas'))

    if (hasPermission('tasas_inmobiliarias', 'ver')) {
      tasaInmobiliariaService.getAll(true).then((res) => {
        if (res.success && Array.isArray(res.data)) setTasas(res.data)
      }).catch(() => {})
    }
  }, [])

  const cargarPlano = async (id: number) => {
    setCargando(true)
    try {
      const res = await planoLotificacionService.get(id)
      if (res.success && res.data) setDatos(res.data)
    } catch (e: any) {
      setDatos(null)
      toast.error(e?.message || 'No se pudo cargar el plano')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!fincaId) return
    localStorage.setItem(CLAVE_FINCA, String(fincaId))
    setSeleccionadoId(null)
    setFichaAbierta(false)
    setCambios({})
    setEditando(false)
    setDibujandoId(null)
    setDibujoLibre(false)
    setPuntosDibujo([])
    setSueltas([])
    setSueltaActivaId(null)
    setModo('vista')
    cargarPlano(fincaId)
  }, [fincaId])

  useEffect(() => {
    if (!fincaId || !datos?.plano.tiene_imagen) {
      setImagenUrl(null)
      return
    }
    let url: string | null = null
    let vigente = true
    planoLotificacionService.imagen(fincaId).then((blob) => {
      if (!vigente) return
      url = URL.createObjectURL(blob)
      setImagenUrl(url)
    }).catch(() => setImagenUrl(null))
    return () => {
      vigente = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [fincaId, datos?.plano.tiene_imagen, datos?.plano.actualizado])

  const lotes = useMemo<LotePlano[]>(() => {
    if (!datos) return []
    return datos.lotes.map((l) => (l.id in cambios ? { ...l, puntos: cambios[l.id] } : l))
  }, [datos, cambios])

  const conteo = useMemo(() => {
    const c: Record<string, number> = {}
    lotes.forEach((l) => { c[l.estado] = (c[l.estado] ?? 0) + 1 })
    return c
  }, [lotes])

  const coincide = (l: LotePlano) => {
    if (filtroEstado && l.estado !== filtroEstado) return false
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return l.numero_lote.toLowerCase().includes(q) || l.codigo_unico.toLowerCase().includes(q) || (l.parcela?.nombre ?? '').toLowerCase().includes(q)
  }

  const atenuados = useMemo(() => new Set(lotes.filter((l) => !coincide(l)).map((l) => l.id)), [lotes, filtroEstado, busqueda])
  const listados = lotes.filter(coincide)
  const sinFigura = lotes.filter((l) => !l.puntos || l.puntos.length < 3)
  const seleccionado = lotes.find((l) => l.id === seleccionadoId) ?? null
  const pendientes = Object.keys(cambios).length

  const iniciarVenta = (tipo: 'credito' | 'contado' | 'reserva', cond: CondicionesSimulacion, tasaAplicada: number) => {
    if (!seleccionado) return
    sessionStorage.setItem(CLAVE_VENTA_DESDE_PLANO, JSON.stringify({
      lote_id: seleccionado.id,
      tipo_negociacion: tipo,
      enganche_pactado: cond.enganche,
      plazo_meses: cond.plazo_meses,
      tasa_interes_anual: tasaAplicada,
      sistema_amortizacion: cond.metodo,
    }))
    navigate('negociaciones')
  }

  const verNegociacion = (id: number) => {
    sessionStorage.setItem(CLAVE_VER_NEGOCIACION, String(id))
    navigate('negociaciones')
  }

  const modoEfectivo: ModoPlano = editando && !dibujandoId && !dibujoLibre ? modo : 'vista'

  const elegirLote = (id: number) => {
    setSeleccionadoId(id)
    setSueltaActivaId(null)
    if (modoEfectivo === 'vista') setFichaAbierta(true)
  }

  const empezarDibujo = (id: number) => {
    setDibujoLibre(false)
    setDibujandoId(id)
    setPuntosDibujo([])
    setSeleccionadoId(id)
    setFichaAbierta(false)
    setModo('vista')
  }

  const empezarFiguraLibre = () => {
    setDibujandoId(null)
    setDibujoLibre(true)
    setPuntosDibujo([])
    setFichaAbierta(false)
    setModo('vista')
  }

  const terminarDibujo = () => {
    if (puntosDibujo.length < 3) {
      toast.error('Marca al menos 3 esquinas para cerrar la figura')
      return
    }
    if (dibujoLibre) {
      const id = crypto.randomUUID()
      setSueltas((lista) => [...lista, { id, puntos: puntosDibujo }])
      setSueltaActivaId(id)
      setDibujoLibre(false)
      setPuntosDibujo([])
      setModo('figura')
      toast.success('Figura agregada. Asígnale un lote en el panel de la derecha.')
      return
    }
    if (!dibujandoId) return
    setCambios((c) => ({ ...c, [dibujandoId]: puntosDibujo }))
    setDibujandoId(null)
    setPuntosDibujo([])
    setModo('figura')
  }

  const asignarFigura = (figuraId: string, loteId: number) => {
    const figura = sueltas.find((f) => f.id === figuraId)
    const lote = lotes.find((l) => l.id === loteId)
    if (!figura || !lote) return
    const tiene = !!lote.puntos && lote.puntos.length >= 3
    if (tiene && !window.confirm(`El lote ${lote.numero_lote} ya tiene una figura. ¿Reemplazarla?`)) return
    setCambios((c) => ({ ...c, [loteId]: figura.puntos }))
    setSueltas((lista) => lista.filter((f) => f.id !== figuraId))
    setSueltaActivaId(null)
    setSeleccionadoId(loteId)
    toast.success(`Figura asignada al lote ${lote.numero_lote}`)
  }

  const moverFiguras = (cambio: { lotes: { id: number; puntos: PuntoPlano[] }[]; sueltas: { id: string; puntos: PuntoPlano[] }[] }) => {
    if (cambio.lotes.length) {
      setCambios((c) => {
        const siguiente = { ...c }
        cambio.lotes.forEach((l) => { siguiente[l.id] = l.puntos })
        return siguiente
      })
    }
    if (cambio.sueltas.length) {
      setSueltas((lista) => lista.map((f) => cambio.sueltas.find((s) => s.id === f.id) ?? f))
    }
  }

  const quitarFigura = (id: number) => {
    const original = datos?.lotes.find((l) => l.id === id)
    setCambios((c) => {
      const n = { ...c }
      if (original?.puntos) n[id] = null
      else delete n[id]
      return n
    })
  }

  const acomodar = () => {
    if (!datos || !sinFigura.length) return
    setCambios((c) => ({ ...c, ...cuadricula(sinFigura, datos.plano.ancho, datos.plano.alto) }))
    setModo('grupo')
    toast.success(`${sinFigura.length} lote(s) en cuadrícula. Arrastra el plano para moverlos juntos, o cambia a «Mover figura».`)
  }

  const guardar = async () => {
    if (!fincaId || !pendientes) return
    setGuardando(true)
    try {
      const res = await planoLotificacionService.guardarGeometrias(
        fincaId,
        Object.entries(cambios).map(([id, puntos]) => ({ lote_id: Number(id), puntos })),
      )
      if (res.success) {
        toast.success(res.message || 'Plano guardado')
        setCambios({})
        await cargarPlano(fincaId)
      }
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar el plano')
    } finally {
      setGuardando(false)
    }
  }

  const salirEdicion = () => {
    const pendientesSalida = pendientes + sueltas.length
    if (pendientesSalida && !window.confirm(`Hay ${pendientesSalida} cambio(s) sin guardar. ¿Descartarlos?`)) return
    setCambios({})
    setDibujandoId(null)
    setDibujoLibre(false)
    setPuntosDibujo([])
    setSueltas([])
    setSueltaActivaId(null)
    setModo('vista')
    setEditando(false)
  }

  const subirImagen = async (archivo: File | undefined) => {
    if (!archivo || !fincaId) return
    try {
      const res = await planoLotificacionService.subirImagen(fincaId, archivo)
      if (res.success) {
        toast.success('Imagen del plano actualizada')
        await cargarPlano(fincaId)
      }
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo subir la imagen')
    } finally {
      if (inputImagen.current) inputImagen.current.value = ''
    }
  }

  return (
    <div className="space-y-4 animate-fade-in-up pb-10">
      <div className="page-toolbar bg-card/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <MapTrifold size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
            <h1 className="font-bold tracking-tight text-foreground">Plano de lotificación</h1>
          </div>
          <p className="text-muted-foreground text-sm">Consulta la disponibilidad sobre el plano, proyecta el financiamiento y lleva el lote al flujo de ventas.</p>
        </div>
        <div className="page-toolbar-actions flex-wrap">
          <select
            value={fincaId ?? ''}
            onChange={(e) => {
              if ((pendientes || sueltas.length) && !window.confirm('Hay cambios del plano sin guardar. ¿Cambiar de finca y descartarlos?')) return
              setFincaId(Number(e.target.value) || null)
            }}
            className="bg-background border rounded-lg h-9 px-3 text-sm min-w-[220px]"
            aria-label="Finca o proyecto"
          >
            {fincas.length === 0 && <option value="">Sin fincas</option>}
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}{f.codigo ? ` · ${f.codigo}` : ''}</option>
            ))}
          </select>
          {puedeEditar && datos && (
            editando ? (
              <Button variant="outline" className="gap-2" onClick={salirEdicion}><X size={16} /> Salir de edición</Button>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setEditando(true)}><PencilSimple size={16} /> Editar plano</Button>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(ESTADOS_LOTE).map(([clave, { etiqueta, color }]) => {
          const activo = filtroEstado === clave
          return (
            <button
              key={clave}
              type="button"
              onClick={() => setFiltroEstado(activo ? null : clave)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${activo ? 'border-primary bg-primary/10 text-foreground' : 'border-border/80 text-muted-foreground hover:text-foreground'}`}
            >
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
              {etiqueta}
              <span className="font-semibold text-foreground">{conteo[clave] ?? 0}</span>
            </button>
          )
        })}
        <div className="relative ml-auto w-full sm:w-64">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar lote, código o manzana" className="pl-8 h-9" />
        </div>
      </div>

      <div className={`flex flex-col gap-4 ${editando ? 'md:flex-row md:items-start' : ''}`}>
        <Card className="border-border/80 shadow-sm overflow-hidden min-w-0 flex-1">
          <CardContent className="p-2 sm:p-3">
            <div className="w-full h-[calc(100vh-240px)] min-h-[480px]">
              {datos ? (
                <VisorPlano
                  ancho={datos.plano.ancho}
                  alto={datos.plano.alto}
                  imagenUrl={imagenUrl}
                  lotes={lotes}
                  seleccionadoId={seleccionadoId}
                  atenuados={atenuados}
                  dibujo={dibujandoId || dibujoLibre ? puntosDibujo : null}
                  modo={editando && !dibujandoId && !dibujoLibre ? modo : 'vista'}
                  figurasSueltas={sueltas}
                  sueltaActivaId={sueltaActivaId}
                  onSeleccionar={elegirLote}
                  onSeleccionarSuelta={setSueltaActivaId}
                  onMover={editando ? moverFiguras : undefined}
                  onAgregarPunto={(p) => setPuntosDibujo((ps) => [...ps, p])}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  {cargando ? 'Cargando plano…' : 'Selecciona una finca para ver su plano.'}
                </div>
              )}
            </div>
            {datos && !editando && (
              <p className="text-xs text-muted-foreground mt-2 px-1">
                Pulsa un lote en el plano o en la lista para abrir su ficha técnica.
                {sinFigura.length > 0 && ` ${sinFigura.length} lote(s) aún no están dibujados y solo aparecen en la lista.`}
                {puedeEditar && sinFigura.length > 0 && ' Usa «Editar plano» para ubicarlos.'}
              </p>
            )}
          </CardContent>
        </Card>

        {editando && datos && (
        <Card className="border-border/80 shadow-sm w-full md:w-[22rem] md:sticky md:top-3 shrink-0 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Edición del plano</p>
                  <p className="text-xs text-muted-foreground">
                    {datos.plano.tiene_imagen ? `Imagen: ${datos.plano.imagen_nombre}` : 'Sin imagen: se usa una cuadrícula de referencia.'} · {datos.plano.ancho} × {datos.plano.alto}
                  </p>
                </div>

                <input ref={inputImagen} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => subirImagen(e.target.files?.[0])} />
                <Button variant="outline" size="sm" className="w-full gap-2" disabled={pendientes > 0} onClick={() => inputImagen.current?.click()}>
                  <UploadSimple size={16} /> {datos.plano.tiene_imagen ? 'Reemplazar imagen del plano' : 'Subir imagen del plano'}
                </Button>
                {pendientes > 0 && <p className="text-[11px] text-muted-foreground -mt-2">Guarda los cambios antes de cambiar la imagen.</p>}

                <div className="grid grid-cols-3 gap-1">
                  {([
                    ['vista', 'Vista', Hand],
                    ['figura', 'Figura', ArrowsOutCardinal],
                    ['grupo', 'Cuadrícula', GridFour],
                  ] as const).map(([clave, etiqueta, Icono]) => (
                    <Button key={clave} type="button" size="sm" variant={modo === clave ? 'default' : 'outline'} className="gap-1 px-2" disabled={!!dibujandoId || dibujoLibre} onClick={() => setModo(clave)}>
                      <Icono size={14} /> {etiqueta}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground -mt-2">
                  En Vista, un clic abre la ficha del lote y arrastrar desplaza el plano. Figura mueve una sola. Cuadrícula mueve juntas todas las que están encima.
                </p>

                {dibujandoId || dibujoLibre ? (
                  <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 space-y-2">
                    <p className="text-sm font-medium">{dibujoLibre ? 'Nueva figura' : `Dibujando lote ${lotes.find((l) => l.id === dibujandoId)?.numero_lote}`}</p>
                    <p className="text-xs text-muted-foreground">Clic en cada esquina ({puntosDibujo.length}). Puedes agregar varias y después asignarlas.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-1" onClick={terminarDibujo}><Check size={14} /> Terminar figura</Button>
                      <Button size="sm" variant="outline" className="gap-1" disabled={!puntosDibujo.length} onClick={() => setPuntosDibujo((p) => p.slice(0, -1))}>
                        <ArrowCounterClockwise size={14} /> Deshacer punto
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDibujandoId(null); setDibujoLibre(false); setPuntosDibujo([]) }}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={empezarFiguraLibre}>
                      <Plus size={16} /> Agregar figura
                    </Button>
                    <Button variant="outline" size="sm" className="w-full gap-2" disabled={!sinFigura.length} onClick={acomodar}>
                      <GridFour size={16} /> Acomodar {sinFigura.length} lote(s) sin figura
                    </Button>
                  </div>
                )}

                {sueltas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Figuras sin asignar ({sueltas.length})</p>
                    {sueltas.map((f, indice) => (
                      <div key={f.id} className={`rounded-lg border p-2 space-y-1 ${f.id === sueltaActivaId ? 'border-amber-500' : 'border-border/70'}`}>
                        <div className="flex items-center justify-between text-sm">
                          <button type="button" className="font-medium" onClick={() => setSueltaActivaId(f.id)}>Figura {indice + 1}</button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Quitar figura" onClick={() => setSueltas((lista) => lista.filter((x) => x.id !== f.id))}>
                            <Trash size={14} />
                          </Button>
                        </div>
                        <select
                          className="bg-background border rounded-lg h-8 px-2 text-xs w-full"
                          defaultValue=""
                          onChange={(e) => {
                            const loteId = Number(e.target.value)
                            e.target.value = ''
                            if (loteId) asignarFigura(f.id, loteId)
                          }}
                        >
                          <option value="">Asignar a un lote</option>
                          {lotes.map((l) => (
                            <option key={l.id} value={l.id}>{l.numero_lote}{l.parcela?.nombre ? ` · ${l.parcela.nombre}` : ''}{l.puntos && l.puntos.length >= 3 ? ' (reemplaza)' : ''}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="max-h-[38vh] overflow-y-auto space-y-1 pr-1">
                  {lotes.map((l) => {
                    const tiene = !!l.puntos && l.puntos.length >= 3
                    return (
                      <div key={l.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${l.id === seleccionadoId ? 'border-primary' : 'border-border/60'}`}>
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: estadoLote(l.estado).color }} />
                        <button type="button" className="min-w-0 flex-1 text-left truncate" onClick={() => elegirLote(l.id)}>
                          {l.numero_lote} <span className="text-xs text-muted-foreground">{l.parcela?.nombre}</span>
                        </button>
                        {l.id in cambios && <span className="text-[10px] text-amber-500">sin guardar</span>}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title={tiene ? 'Redibujar' : 'Dibujar'} onClick={() => empezarDibujo(l.id)}>
                          <Polygon size={15} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Quitar figura" disabled={!tiene} onClick={() => quitarFigura(l.id)}>
                          <Trash size={15} />
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" disabled={!pendientes || guardando} onClick={guardar}>
                    <FloppyDisk size={16} /> {guardando ? 'Guardando…' : `Guardar cambios (${pendientes})`}
                  </Button>
                  <Button variant="ghost" disabled={(!pendientes && !sueltas.length) || guardando} onClick={() => { setCambios({}); setSueltas([]); setSueltaActivaId(null) }}>Descartar</Button>
                </div>
              </div>
          </CardContent>
        </Card>
        )}
      </div>

      <Dialog open={fichaAbierta && !!seleccionado} onOpenChange={(abierto) => { if (!abierto) setFichaAbierta(false) }}>
        <DialogContent className="sm:max-w-xl [&>button]:hidden">
          <DialogTitle className="sr-only">Ficha técnica del lote</DialogTitle>
          {seleccionado && (
            <PanelLote
              key={seleccionado.id}
              lote={seleccionado}
              tasas={tasas}
              puedeSimular={puedeSimular}
              puedeVender={puedeVender}
              puedeVerVentas={puedeSimular}
              onCerrar={() => setFichaAbierta(false)}
              onIniciarVenta={iniciarVenta}
              onVerNegociacion={verNegociacion}
            />
          )}
        </DialogContent>
      </Dialog>

      {datos && (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Lotes ({listados.length} de {lotes.length})</p>
            <div className="flex flex-wrap gap-2">
              {listados.map((l) => {
                const { color, etiqueta } = estadoLote(l.estado)
                const tiene = !!l.puntos && l.puntos.length >= 3
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => elegirLote(l.id)}
                    title={`${l.codigo_unico} · ${etiqueta}${tiene ? '' : ' · sin figura en el plano'}`}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${l.id === seleccionadoId ? 'border-primary bg-primary/10' : 'border-border/80 hover:bg-muted/50'} ${tiene ? '' : 'border-dashed'}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="font-medium">{l.numero_lote}</span>
                    <span className="text-muted-foreground">{l.parcela?.nombre}</span>
                  </button>
                )
              })}
              {!listados.length && <p className="text-xs text-muted-foreground">No hay lotes que coincidan con el filtro.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
