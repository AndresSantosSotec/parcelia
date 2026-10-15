import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowsOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { LotePlano, PuntoPlano } from '@/lib/api'
import { estadoLote } from './estadosLote'

interface Caja { x: number; y: number; w: number; h: number }

export type ModoPlano = 'vista' | 'figura' | 'grupo'

export interface FiguraSuelta {
  id: string
  puntos: PuntoPlano[]
}

interface VisorPlanoProps {
  ancho: number
  alto: number
  imagenUrl: string | null
  lotes: LotePlano[]
  seleccionadoId: number | null
  atenuados: Set<number>
  dibujo: PuntoPlano[] | null
  modo?: ModoPlano
  figurasSueltas?: FiguraSuelta[]
  sueltaActivaId?: string | null
  onSeleccionar: (id: number) => void
  onAgregarPunto: (p: PuntoPlano) => void
  onSeleccionarSuelta?: (id: string) => void
  onMover?: (cambio: { lotes: { id: number; puntos: PuntoPlano[] }[]; sueltas: { id: string; puntos: PuntoPlano[] }[] }) => void
}

const UMBRAL_ARRASTRE = 5

function centroide(puntos: PuntoPlano[]): PuntoPlano {
  const x = puntos.reduce((s, p) => s + p[0], 0) / puntos.length
  const y = puntos.reduce((s, p) => s + p[1], 0) / puntos.length
  return [x, y]
}

function ladoMenor(puntos: PuntoPlano[]): number {
  const xs = puntos.map((p) => p[0])
  const ys = puntos.map((p) => p[1])
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

function redondear(n: number) {
  return Math.round(n * 100) / 100
}

function trasladar(grupos: PuntoPlano[][], dx: number, dy: number, ancho: number, alto: number): PuntoPlano[][] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  grupos.forEach((pts) => pts.forEach(([x, y]) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }))
  const dx2 = Math.min(ancho - maxX, Math.max(-minX, dx))
  const dy2 = Math.min(alto - maxY, Math.max(-minY, dy))
  return grupos.map((pts) => pts.map(([x, y]) => [redondear(x + dx2), redondear(y + dy2)] as PuntoPlano))
}

export function VisorPlano({
  ancho,
  alto,
  imagenUrl,
  lotes,
  seleccionadoId,
  atenuados,
  dibujo,
  modo = 'vista',
  figurasSueltas = [],
  sueltaActivaId = null,
  onSeleccionar,
  onAgregarPunto,
  onSeleccionarSuelta,
  onMover,
}: VisorPlanoProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [caja, setCaja] = useState<Caja>({ x: 0, y: 0, w: ancho, h: alto })
  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const gesto = useRef<{
    inicioX: number
    inicioY: number
    caja: Caja
    escala: number
    movido: boolean
    loteId: number | null
    sueltaId: string | null
    distancia?: number
    traslado?: {
      ancla: PuntoPlano
      lotes: { id: number; puntos: PuntoPlano[] }[]
      sueltas: { id: string; puntos: PuntoPlano[] }[]
    } | null
  } | null>(null)

  useEffect(() => {
    setCaja({ x: 0, y: 0, w: ancho, h: alto })
  }, [ancho, alto])

  const aPlano = useCallback((clientX: number, clientY: number): PuntoPlano | null => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(m.inverse())
    return [p.x, p.y]
  }, [])

  const zoomEn = useCallback((factor: number, centro?: PuntoPlano) => {
    setCaja((c) => {
      const minW = ancho / 25
      const maxW = ancho * 2
      const w = Math.min(maxW, Math.max(minW, c.w * factor))
      const real = w / c.w
      const [cx, cy] = centro ?? [c.x + c.w / 2, c.y + c.h / 2]
      return { x: cx - (cx - c.x) * real, y: cy - (cy - c.y) * real, w, h: c.h * real }
    })
  }, [ancho])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const alRueda = (e: WheelEvent) => {
      e.preventDefault()
      const p = aPlano(e.clientX, e.clientY)
      zoomEn(e.deltaY > 0 ? 1.15 : 1 / 1.15, p ?? undefined)
    }
    svg.addEventListener('wheel', alRueda, { passive: false })
    return () => svg.removeEventListener('wheel', alRueda)
  }, [aPlano, zoomEn])

  const distanciaPunteros = () => {
    const [a, b] = Array.from(punteros.current.values())
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const alPresionar = (e: React.PointerEvent<SVGSVGElement>) => {
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    svgRef.current?.setPointerCapture(e.pointerId)
    const escala = svgRef.current?.getScreenCTM()?.a ?? 1
    const destino = (e.target as Element).closest('[data-lote]')
    const suelta = (e.target as Element).closest('[data-extra]')
    const loteId = destino ? Number(destino.getAttribute('data-lote')) : null
    const sueltaId = suelta?.getAttribute('data-extra') ?? null
    const ancla = aPlano(e.clientX, e.clientY)
    let traslado: NonNullable<typeof gesto.current>['traslado'] = null
    if (!dibujo && ancla && (modo === 'grupo' || modo === 'figura')) {
      const conFigura = lotes.filter((l) => l.puntos && l.puntos.length >= 3)
      if (modo === 'grupo' && (conFigura.length > 0 || figurasSueltas.length > 0)) {
        traslado = {
          ancla,
          lotes: conFigura.map((l) => ({ id: l.id, puntos: l.puntos! })),
          sueltas: figurasSueltas.map((f) => ({ id: f.id, puntos: f.puntos })),
        }
      } else if (modo === 'figura' && loteId) {
        const lote = conFigura.find((l) => l.id === loteId)
        if (lote) traslado = { ancla, lotes: [{ id: lote.id, puntos: lote.puntos! }], sueltas: [] }
      } else if (modo === 'figura' && sueltaId) {
        const figura = figurasSueltas.find((f) => f.id === sueltaId)
        if (figura) traslado = { ancla, lotes: [], sueltas: [{ id: figura.id, puntos: figura.puntos }] }
      }
    }
    gesto.current = {
      inicioX: e.clientX,
      inicioY: e.clientY,
      caja,
      escala,
      movido: punteros.current.size > 1,
      loteId,
      sueltaId,
      distancia: punteros.current.size === 2 ? distanciaPunteros() : undefined,
      traslado,
    }
  }

  const alMover = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!punteros.current.has(e.pointerId) || !gesto.current) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesto.current

    if (punteros.current.size === 2 && g.distancia) {
      const actual = distanciaPunteros()
      const [a, b] = Array.from(punteros.current.values())
      const centro = aPlano((a.x + b.x) / 2, (a.y + b.y) / 2)
      if (actual > 0 && centro) zoomEn(g.distancia / actual, centro)
      g.distancia = actual
      g.movido = true
      return
    }

    const dx = e.clientX - g.inicioX
    const dy = e.clientY - g.inicioY
    if (!g.movido && Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return
    g.movido = true

    if (g.traslado && onMover) {
      const actual = aPlano(e.clientX, e.clientY)
      if (!actual) return
      const grupos = [...g.traslado.lotes.map((l) => l.puntos), ...g.traslado.sueltas.map((s) => s.puntos)]
      const movidos = trasladar(grupos, actual[0] - g.traslado.ancla[0], actual[1] - g.traslado.ancla[1], ancho, alto)
      const nLotes = g.traslado.lotes.length
      onMover({
        lotes: g.traslado.lotes.map((l, i) => ({ id: l.id, puntos: movidos[i] })),
        sueltas: g.traslado.sueltas.map((s, i) => ({ id: s.id, puntos: movidos[nLotes + i] })),
      })
      return
    }

    setCaja({ ...g.caja, x: g.caja.x - dx / g.escala, y: g.caja.y - dy / g.escala })
  }

  const alSoltar = (e: React.PointerEvent<SVGSVGElement>) => {
    punteros.current.delete(e.pointerId)
    const g = gesto.current
    if (punteros.current.size > 0) return
    gesto.current = null
    if (!g || g.movido) return

    if (g.traslado) {
      if (!g.movido && g.loteId) onSeleccionar(g.loteId)
      else if (!g.movido && g.sueltaId) onSeleccionarSuelta?.(g.sueltaId)
      return
    }

    if (dibujo) {
      const p = aPlano(e.clientX, e.clientY)
      if (!p) return
      onAgregarPunto([
        redondear(Math.min(ancho, Math.max(0, p[0]))),
        redondear(Math.min(alto, Math.max(0, p[1]))),
      ])
      return
    }
    if (g.loteId) onSeleccionar(g.loteId)
    else if (g.sueltaId) onSeleccionarSuelta?.(g.sueltaId)
  }

  const tamTexto = Math.max(ancho, alto) / 70
  const grosor = Math.max(ancho, alto) / 600

  const figuras = useMemo(() => lotes.filter((l) => l.puntos && l.puntos.length >= 3), [lotes])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/80 bg-muted/30">
      <svg
        ref={svgRef}
        viewBox={`${caja.x} ${caja.y} ${caja.w} ${caja.h}`}
        preserveAspectRatio="xMidYMid meet"
        className={`w-full h-full touch-none select-none ${dibujo ? 'cursor-crosshair' : modo === 'vista' ? 'cursor-grab active:cursor-grabbing' : 'cursor-move'}`}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={(e) => { punteros.current.delete(e.pointerId); gesto.current = null }}
        role="img"
        aria-label="Plano de lotificación"
      >
        <defs>
          <pattern id="cuadricula-plano" width={ancho / 20} height={ancho / 20} patternUnits="userSpaceOnUse">
            <path d={`M ${ancho / 20} 0 L 0 0 0 ${ancho / 20}`} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={grosor} />
          </pattern>
        </defs>

        <rect x={0} y={0} width={ancho} height={alto} className="text-muted-foreground" fill="url(#cuadricula-plano)" stroke="currentColor" strokeOpacity={0.3} strokeWidth={grosor * 2} />
        {imagenUrl && <image href={imagenUrl} x={0} y={0} width={ancho} height={alto} preserveAspectRatio="none" />}

        {figuras.map((l) => {
          const { color, etiqueta } = estadoLote(l.estado)
          const seleccionado = l.id === seleccionadoId
          const atenuado = atenuados.has(l.id)
          const [cx, cy] = centroide(l.puntos!)
          const fuente = Math.min(tamTexto * 3, Math.max(tamTexto * 0.6, ladoMenor(l.puntos!) * 0.22))
          return (
            <g key={l.id} data-lote={l.id} className="cursor-pointer" opacity={atenuado ? 0.18 : 1}>
              <title>{`Lote ${l.numero_lote} · ${l.codigo_unico} · ${etiqueta}`}</title>
              <polygon
                points={l.puntos!.map((p) => p.join(',')).join(' ')}
                fill={color}
                fillOpacity={seleccionado ? 0.7 : 0.45}
                stroke={seleccionado ? '#ffffff' : color}
                strokeWidth={seleccionado ? grosor * 4 : grosor * 1.5}
                strokeLinejoin="round"
                className="transition-[fill-opacity] hover:[fill-opacity:0.65]"
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fuente}
                fontWeight={700}
                fill="#ffffff"
                stroke="#000000"
                strokeOpacity={0.55}
                strokeWidth={fuente / 8}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {l.numero_lote}
              </text>
            </g>
          )
        })}

        {figurasSueltas.map((f, indice) => {
          const activa = f.id === sueltaActivaId
          const [cx, cy] = centroide(f.puntos)
          return (
            <g key={f.id} data-extra={f.id} className="cursor-move">
              <title>{`Figura ${indice + 1} sin asignar`}</title>
              <polygon
                points={f.puntos.map((p) => p.join(',')).join(' ')}
                fill="#f59e0b"
                fillOpacity={activa ? 0.55 : 0.35}
                stroke="#f59e0b"
                strokeWidth={grosor * 2}
                strokeDasharray={`${grosor * 6} ${grosor * 4}`}
              />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={tamTexto} fontWeight={700} fill="#fff" pointerEvents="none">
                {indice + 1}
              </text>
            </g>
          )
        })}

        {dibujo && dibujo.length > 0 && (
          <g pointerEvents="none">
            <polyline
              points={dibujo.map((p) => p.join(',')).join(' ')}
              fill={dibujo.length >= 3 ? '#38bdf8' : 'none'}
              fillOpacity={0.25}
              stroke="#38bdf8"
              strokeWidth={grosor * 3}
              strokeDasharray={`${grosor * 8} ${grosor * 5}`}
            />
            {dibujo.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={grosor * 6} fill={i === 0 ? '#facc15' : '#38bdf8'} stroke="#0f172a" strokeWidth={grosor} />
            ))}
          </g>
        )}
      </svg>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <Button type="button" size="icon" variant="secondary" className="h-9 w-9 shadow" onClick={() => zoomEn(1 / 1.3)} title="Acercar">
          <MagnifyingGlassPlus size={18} />
        </Button>
        <Button type="button" size="icon" variant="secondary" className="h-9 w-9 shadow" onClick={() => zoomEn(1.3)} title="Alejar">
          <MagnifyingGlassMinus size={18} />
        </Button>
        <Button type="button" size="icon" variant="secondary" className="h-9 w-9 shadow" onClick={() => setCaja({ x: 0, y: 0, w: ancho, h: alto })} title="Ver plano completo">
          <ArrowsOut size={18} />
        </Button>
      </div>
    </div>
  )
}
