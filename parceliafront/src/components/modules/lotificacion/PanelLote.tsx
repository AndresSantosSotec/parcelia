import { useEffect, useState } from 'react'
import { Calculator, Handshake, BookmarkSimple, Receipt, X, Lock } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { negociacionService, type LotePlano, type TasaInmobiliaria } from '@/lib/api'
import { estadoLote, ESTADOS_NEGOCIACION, quetzales } from './estadosLote'

export interface CondicionesSimulacion {
  enganche: number
  plazo_meses: number
  tasa_interes_id: string
  tasa_interes_anual: number
  metodo: 'frances' | 'aleman' | 'americano' | 'plano'
}

interface PanelLoteProps {
  lote: LotePlano
  tasas: TasaInmobiliaria[]
  puedeSimular: boolean
  puedeVender: boolean
  puedeVerVentas: boolean
  onCerrar: () => void
  onIniciarVenta: (tipo: 'credito' | 'contado' | 'reserva', condiciones: CondicionesSimulacion, tasaAplicada: number) => void
  onVerNegociacion: (id: number) => void
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className="text-sm font-medium text-foreground break-words">{valor ?? '—'}</p>
    </div>
  )
}

export function PanelLote({ lote, tasas, puedeSimular, puedeVender, puedeVerVentas, onCerrar, onIniciarVenta, onVerNegociacion }: PanelLoteProps) {
  const estado = estadoLote(lote.estado)
  const precio = Number(lote.precio_venta ?? 0)
  const sinPrecio = precio <= 0
  const libre = lote.estado === 'disponible' && !lote.negociacion && !sinPrecio

  const [cond, setCond] = useState<CondicionesSimulacion>({
    enganche: Math.round(precio * 0.15),
    plazo_meses: 24,
    tasa_interes_id: tasas[0] ? String(tasas[0].id) : '',
    tasa_interes_anual: tasas[0] ? Number(tasas[0].porcentaje_anual) : 12,
    metodo: 'frances',
  })
  const [sim, setSim] = useState<any>(null)
  const [error, setError] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [tablaCompleta, setTablaCompleta] = useState(false)

  useEffect(() => {
    setCond((c) => ({
      ...c,
      enganche: Math.round(precio * 0.15),
      tasa_interes_id: c.tasa_interes_id || (tasas[0] ? String(tasas[0].id) : ''),
      tasa_interes_anual: c.tasa_interes_id ? c.tasa_interes_anual : (tasas[0] ? Number(tasas[0].porcentaje_anual) : c.tasa_interes_anual),
    }))
    setSim(null)
    setTablaCompleta(false)
  }, [lote.id, tasas])

  useEffect(() => {
    if (!libre || !puedeSimular || !lote.visible || precio <= 0) return
    const t = setTimeout(async () => {
      setCalculando(true)
      setError('')
      try {
        const res = await negociacionService.simular({
          lote_id: lote.id,
          enganche: cond.enganche,
          plazo_meses: cond.plazo_meses,
          metodo: cond.metodo,
          ...(cond.tasa_interes_id
            ? { tasa_interes_id: Number(cond.tasa_interes_id) }
            : { tasa_interes_anual: cond.tasa_interes_anual }),
        })
        if (res.success) setSim(res.data)
      } catch (e: any) {
        setSim(null)
        setError(e?.message || 'No se pudo calcular la proyección')
      } finally {
        setCalculando(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [lote.id, libre, puedeSimular, lote.visible, precio, cond])

  const cuotas: any[] = sim?.cuotas ?? []
  const filas = tablaCompleta ? cuotas : cuotas.slice(0, 6)
  const tasaAplicada = Number(sim?.tasa_anual ?? cond.tasa_interes_anual)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{lote.parcela?.nombre ?? 'Sin manzana'}</p>
          <h3 className="text-lg font-bold text-foreground truncate">Lote {lote.numero_lote}</h3>
          <p className="text-xs font-mono text-muted-foreground">{lote.codigo_unico}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge style={{ backgroundColor: `${estado.color}26`, color: estado.color, borderColor: `${estado.color}66` }} className="border">
            {estado.etiqueta}
          </Badge>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCerrar} title="Cerrar ficha">
            <X size={16} />
          </Button>
        </div>
      </div>

      {!lote.visible ? (
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-sm text-muted-foreground flex gap-3">
          <Lock size={20} className="shrink-0 mt-0.5" />
          Este lote no está asignado a tu cartera. Solo puedes ver su estado en el plano.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/80 bg-card/60 p-4">
            <Dato etiqueta="Área" valor={`${Number(lote.area_m2 ?? 0).toLocaleString('es-GT')} m²`} />
            <Dato etiqueta="Medidas" valor={lote.frente_metros && lote.fondo_metros ? `${Number(lote.frente_metros)} × ${Number(lote.fondo_metros)} m` : '—'} />
            <Dato etiqueta="Precio de venta" valor={<span className="text-primary">{quetzales(precio)}</span>} />
            <Dato etiqueta="Precio por m²" valor={lote.precio_m2 ? quetzales(lote.precio_m2) : '—'} />
            <Dato etiqueta="Tipo de terreno" valor={lote.tipo_terreno || '—'} />
            <Dato etiqueta="Vendedor asignado" valor={lote.vendedor || 'Sin asignar'} />
            {lote.colindancias && <div className="col-span-2"><Dato etiqueta="Colindancias" valor={lote.colindancias} /></div>}
            {lote.observaciones && <div className="col-span-2"><Dato etiqueta="Observaciones" valor={lote.observaciones} /></div>}
            {!!lote.servicios?.length && (
              <div className="col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Servicios</p>
                <div className="flex flex-wrap gap-1.5">
                  {lote.servicios.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{s.nombre}{s.estado ? ` · ${s.estado}` : ''}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {lote.negociacion && (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2"><Handshake size={16} className="text-primary" /> Operación vigente</p>
              <div className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Código" valor={lote.negociacion.codigo} />
                <Dato etiqueta="Estado" valor={ESTADOS_NEGOCIACION[lote.negociacion.estado] ?? lote.negociacion.estado} />
                <Dato etiqueta="Tipo" valor={lote.negociacion.tipo} />
                {lote.negociacion.comprador && <Dato etiqueta="Comprador" valor={lote.negociacion.comprador} />}
              </div>
              {puedeVerVentas && (
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => onVerNegociacion(lote.negociacion!.id)}>
                  <Receipt size={16} /> Ver estado de cuenta en Ventas
                </Button>
              )}
            </div>
          )}

          {libre && puedeSimular && (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Calculator size={16} className="text-primary" /> Proyección de financiamiento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Enganche (Q)</Label>
                  <Input type="number" min={0} value={cond.enganche} onChange={(e) => setCond({ ...cond, enganche: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Plazo (meses)</Label>
                  <Input type="number" min={1} max={240} value={cond.plazo_meses} onChange={(e) => setCond({ ...cond, plazo_meses: Math.min(240, Math.max(1, Number(e.target.value) || 1)) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tasa de interés</Label>
                  {tasas.length > 0 ? (
                    <select
                      value={cond.tasa_interes_id}
                      onChange={(e) => {
                        const t = tasas.find((x) => String(x.id) === e.target.value)
                        setCond({ ...cond, tasa_interes_id: e.target.value, tasa_interes_anual: t ? Number(t.porcentaje_anual) : cond.tasa_interes_anual })
                      }}
                      className="w-full bg-background border rounded-lg h-9 px-2 text-sm"
                    >
                      {tasas.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre} ({Number(t.porcentaje_anual)}%)</option>
                      ))}
                    </select>
                  ) : (
                    <Input type="number" min={0} max={100} step="0.01" value={cond.tasa_interes_anual} onChange={(e) => setCond({ ...cond, tasa_interes_anual: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amortización</Label>
                  <select value={cond.metodo} onChange={(e) => setCond({ ...cond, metodo: e.target.value as CondicionesSimulacion['metodo'] })} className="w-full bg-background border rounded-lg h-9 px-2 text-sm">
                    <option value="frances">Francés (cuota fija)</option>
                    <option value="aleman">Alemán (capital fijo)</option>
                    <option value="americano">Americano</option>
                    <option value="plano">Interés plano</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
              {sim && (
                <div className={`space-y-3 ${calculando ? 'opacity-60' : ''}`}>
                  <div className="grid grid-cols-2 gap-3">
                    <Dato etiqueta="Cuota mensual" valor={<span className="text-primary text-base">{quetzales(sim.cuota_mensual)}</span>} />
                    <Dato etiqueta="Monto financiado" valor={quetzales(sim.monto_financiado)} />
                    <Dato etiqueta="Intereses proyectados" valor={quetzales(sim.total_intereses)} />
                    <Dato etiqueta="Total financiado + intereses" valor={quetzales(sim.total_a_pagar)} />
                  </div>
                  {cuotas.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-border/80">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5 text-left">#</th>
                            <th className="px-2 py-1.5 text-left">Vence</th>
                            <th className="px-2 py-1.5 text-right">Capital</th>
                            <th className="px-2 py-1.5 text-right">Interés</th>
                            <th className="px-2 py-1.5 text-right">Cuota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filas.map((c) => (
                            <tr key={c.numero_cuota} className="border-t border-border/60">
                              <td className="px-2 py-1">{c.numero_cuota}</td>
                              <td className="px-2 py-1">{c.fecha_vencimiento}</td>
                              <td className="px-2 py-1 text-right">{quetzales(c.cuota_capital)}</td>
                              <td className="px-2 py-1 text-right">{quetzales(c.cuota_interes)}</td>
                              <td className="px-2 py-1 text-right font-medium">{quetzales(c.cuota_monto_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {cuotas.length > 6 && (
                    <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setTablaCompleta(!tablaCompleta)}>
                      {tablaCompleta ? 'Mostrar menos cuotas' : `Ver las ${cuotas.length} cuotas`}
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Proyección informativa calculada en el servidor con el precio vigente del lote. No reserva el lote ni registra cobros.
                  </p>
                </div>
              )}
            </div>
          )}

          {libre && puedeVender && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button className="gap-2" onClick={() => onIniciarVenta('credito', cond, tasaAplicada)}>
                <Handshake size={16} /> Iniciar venta
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => onIniciarVenta('reserva', cond, tasaAplicada)}>
                <BookmarkSimple size={16} /> Reservar
              </Button>
            </div>
          )}
          {libre && !puedeVender && (
            <p className="text-xs text-muted-foreground">No tienes permiso para registrar ventas o reservas.</p>
          )}
          {sinPrecio && lote.estado === 'disponible' && !lote.negociacion && (
            <p className="text-xs text-amber-500">El lote no tiene precio de venta. Asígnalo en Fincas & Lotes para poder proyectar y venderlo.</p>
          )}
          {!libre && !sinPrecio && !lote.negociacion && (
            <p className="text-xs text-muted-foreground">Este lote no está disponible para una nueva venta.</p>
          )}
        </>
      )}
    </div>
  )
}
