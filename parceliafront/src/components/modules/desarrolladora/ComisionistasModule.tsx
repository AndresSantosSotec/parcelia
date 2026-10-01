import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  api,
  comisionistaService,
  negociacionService,
  type ComisionItem,
  type ComisionistaItem,
  type ComisionRegla,
  type Negociacion,
} from '@/lib/api'
import { usePermissions } from '@/hooks/use-permissions'
import { AccionesRegistro, PaginacionLista } from './AccionesRegistro'

const q = (n: number | string | null | undefined) =>
  `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const campo = 'mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'

const MOMENTO: Record<string, string> = {
  al_contrato: 'Al firmar el contrato',
  al_enganche: 'Al cobrar el enganche',
  al_liquidar: 'Al liquidar la venta',
}
const BASE: Record<string, string> = {
  precio_final: 'Precio final de la venta',
  precio_venta: 'Precio de lista',
  enganche: 'Enganche',
}

export function ComisionistasModule({ userSession }: { userSession?: { userData?: { rol?: string; permisos?: unknown } | null } }) {
  const { hasPermission } = usePermissions(userSession?.userData)
  const puedeEditar = hasPermission('comisionistas', 'editar')
  const puedePagar = hasPermission('comisionistas', 'pagar')
  const puedeReglas = hasPermission('comisionistas', 'reglas')
  const puedeReportes = hasPermission('comisionistas', 'reportes')
  const [personas, setPersonas] = useState<ComisionistaItem[]>([])
  const [reglas, setReglas] = useState<ComisionRegla[]>([])
  const [comisiones, setComisiones] = useState<ComisionItem[]>([])
  const [ventas, setVentas] = useState<Negociacion[]>([])
  const [persona, setPersona] = useState({ nombre: '', telefono: '', direccion: '', dpi: '' })
  const [regla, setRegla] = useState({ nombre: '', tipo: 'porcentaje', base: 'precio_final', valor: '', momento: 'al_contrato' })
  const [aplicar, setAplicar] = useState({ comisionista_id: '', negociacion_id: '', regla_id: '', monto: '' })
  const [pago, setPago] = useState({ id: 0, fecha: '', monto: '', referencia: '' })
  const [personaId, setPersonaId] = useState<number | null>(null)
  const [mostrarPersona, setMostrarPersona] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [reglaId, setReglaId] = useState<number | null>(null)
  const [mostrarRegla, setMostrarRegla] = useState(false)
  const [textoCom, setTextoCom] = useState('')
  const [estadoCom, setEstadoCom] = useState('')
  const [paginaCom, setPaginaCom] = useState(1)
  const [porCom, setPorCom] = useState(10)
  const [textoPer, setTextoPer] = useState('')
  const [paginaPer, setPaginaPer] = useState(1)
  const [porPer, setPorPer] = useState(10)
  const [textoReg, setTextoReg] = useState('')
  const [estadoReg, setEstadoReg] = useState('')
  const [paginaReg, setPaginaReg] = useState(1)
  const [porReg, setPorReg] = useState(10)

  const cargar = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      comisionistaService.listar(),
      comisionistaService.reglas(),
      comisionistaService.comisiones(),
      negociacionService.getAll({ per_page: 200 }),
    ])
    setPersonas(a.data || [])
    setReglas(b.data || [])
    setComisiones(c.data || [])
    setVentas(Array.isArray(d.data) ? d.data : [])
  }, [])

  useEffect(() => {
    cargar().catch(() => toast.error('No se pudo cargar comisionistas'))
  }, [cargar])

  const venta = useMemo(
    () => ventas.find((v) => String(v.id) === aplicar.negociacion_id),
    [ventas, aplicar.negociacion_id],
  )
  const reglaSel = useMemo(
    () => reglas.find((r) => String(r.id) === aplicar.regla_id),
    [reglas, aplicar.regla_id],
  )
  const calculada = useMemo(() => {
    if (!venta || !reglaSel) return 0
    if (reglaSel.tipo === 'monto_fijo') return Number(reglaSel.valor)
    const base = reglaSel.base === 'precio_venta'
      ? Number(venta.precio_original)
      : reglaSel.base === 'enganche'
        ? Number(venta.enganche_pactado)
        : Number(venta.precio_final)
    return Math.round(base * (Number(reglaSel.valor) / 100) * 100) / 100
  }, [venta, reglaSel])

  const comisionesVisibles = comisiones.filter((c) => {
    const texto = textoCom.trim().toLowerCase()
    const coincideTexto = !texto || [c.comisionista?.nombre, c.negociacion?.codigo_negociacion, c.lote?.codigo_unico, c.regla?.nombre, c.estado]
      .some((valor) => String(valor || '').toLowerCase().includes(texto))
    return coincideTexto && (!estadoCom || c.estado === estadoCom)
  })
  const paginasCom = Math.max(1, Math.ceil(comisionesVisibles.length / porCom))
  const paginaComSegura = Math.min(paginaCom, paginasCom)
  const comisionesPagina = comisionesVisibles.slice((paginaComSegura - 1) * porCom, paginaComSegura * porCom)

  const personasVisibles = personas.filter((p) => {
    const texto = textoPer.trim().toLowerCase()
    if (!texto) return true
    return [p.nombre, p.telefono, p.direccion, p.dpi].some((valor) => String(valor || '').toLowerCase().includes(texto))
  })
  const paginasPer = Math.max(1, Math.ceil(personasVisibles.length / porPer))
  const paginaPerSegura = Math.min(paginaPer, paginasPer)
  const personasPagina = personasVisibles.slice((paginaPerSegura - 1) * porPer, paginaPerSegura * porPer)

  const reglasVisibles = reglas.filter((r) => {
    const texto = textoReg.trim().toLowerCase()
    const coincideTexto = !texto || r.nombre.toLowerCase().includes(texto)
    const coincideEstado = !estadoReg || (estadoReg === 'activa' ? r.activo : !r.activo)
    return coincideTexto && coincideEstado
  })
  const paginasReg = Math.max(1, Math.ceil(reglasVisibles.length / porReg))
  const paginaRegSegura = Math.min(paginaReg, paginasReg)
  const reglasPagina = reglasVisibles.slice((paginaRegSegura - 1) * porReg, paginaRegSegura * porReg)

  async function bajar(url: string, nombre: string) {
    try {
      await api.downloadFile(url, nombre)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo descargar')
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Comisionistas</h1>
          <p className="text-sm text-muted-foreground">Paso 3. Comisión de la venta, después de comprar la finca y registrar su financiamiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/comisiones/reporte-pendientes?formato=pdf', 'comisiones-pendientes.pdf')}>Pendientes</Button>}
          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/comisionistas/reporte?formato=pdf', 'comisionistas.pdf')}>Listado PDF</Button>}
          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/comisionistas/reporte?formato=xlsx', 'comisionistas.xlsx')}>Listado Excel</Button>}
          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/comisiones/reporte?formato=pdf', 'comisiones.pdf')}>Comisiones PDF</Button>}
          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/comisiones/reporte?formato=xlsx', 'comisiones.xlsx')}>Comisiones Excel</Button>}
          <Button size="sm" variant="outline" onClick={() => bajar('/comisionistas/requisitos', 'registro-modulos.pdf')}>Registro PDF</Button>
        </div>
      </div>

      <Tabs defaultValue="comisiones">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="comisiones">Comisiones de ventas</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="reglas">Reglas</TabsTrigger>
        </TabsList>

        <TabsContent value="comisiones" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Comisiones registradas</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                <Input placeholder="Buscar persona, venta o lote" value={textoCom} onChange={(e) => { setTextoCom(e.target.value); setPaginaCom(1) }} />
                <select className={campo} value={estadoCom} onChange={(e) => { setEstadoCom(e.target.value); setPaginaCom(1) }}>
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="parcial">Parcial</option>
                  <option value="pagada">Pagada</option>
                </select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Venta</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Regla</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-px"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comisionesPagina.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.comisionista?.nombre}</TableCell>
                      <TableCell>{c.negociacion?.codigo_negociacion || '—'}</TableCell>
                      <TableCell>{c.lote?.codigo_unico || '—'}</TableCell>
                      <TableCell>{c.regla?.nombre || c.descripcion || '—'}</TableCell>
                      <TableCell>{q(c.monto_comision)}</TableCell>
                      <TableCell>{q(c.pendiente)}</TableCell>
                      <TableCell>{c.estado}</TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/comisiones/${c.id}/recibo-pdf`, `recibo-comision-${c.id}.pdf`)}>Recibo</Button>}
                          <AccionesRegistro
                            onVer={puedeReportes ? () => bajar(`/comisiones/${c.id}/reporte?formato=pdf`, `estado-comision-${c.id}.pdf`) : undefined}
                            onDescargar={puedeReportes ? () => bajar(`/comisiones/${c.id}/reporte?formato=pdf`, `estado-comision-${c.id}.pdf`) : undefined}
                            onEliminar={puedeEditar ? () => {
                              if (!window.confirm('Eliminar esta comisión? Solo procede si todavía no tiene pagos.')) return
                              comisionistaService.eliminarComision(c.id).then((res) => {
                                toast.success(res.message || 'Comisión eliminada')
                                cargar()
                              }).catch((e: any) => toast.error(e?.message || 'No se pudo eliminar'))
                            } : undefined}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {comisionesVisibles.length === 0 && <TableRow><TableCell colSpan={8}>Todavía no hay comisiones ligadas a ventas.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <PaginacionLista
                total={comisionesVisibles.length}
                pagina={paginaComSegura}
                porPagina={porCom}
                onPagina={setPaginaCom}
                onPorPagina={(cantidad) => { setPorCom(cantidad); setPaginaCom(1) }}
              />
            </CardContent>
          </Card>

          {puedeEditar && (
            <Card>
              <CardHeader><CardTitle>Ligar una comisión a una venta</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Venta de terreno</Label>
                  <select className={campo} value={aplicar.negociacion_id} onChange={(e) => setAplicar({ ...aplicar, negociacion_id: e.target.value })}>
                    <option value="">Elegir</option>
                    {ventas.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.codigo_negociacion} · {v.lote?.codigo_unico || 'lote'} · {q(v.precio_final)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Comisionista</Label>
                    {puedeEditar && <Button type="button" size="sm" variant="outline" onClick={() => setAltaRapida((v) => !v)}>Crear y seleccionar</Button>}
                  </div>
                  <select className={campo} value={aplicar.comisionista_id} onChange={(e) => setAplicar({ ...aplicar, comisionista_id: e.target.value })}>
                    <option value="">Elegir</option>
                    {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {altaRapida && (
                    <div className="mt-2 grid gap-2">
                      <Input placeholder="Nombre completo" value={persona.nombre} onChange={(e) => setPersona({ ...persona, nombre: e.target.value })} />
                      <Input placeholder="Teléfono" value={persona.telefono} onChange={(e) => setPersona({ ...persona, telefono: e.target.value })} />
                      <Input placeholder="Dirección" value={persona.direccion} onChange={(e) => setPersona({ ...persona, direccion: e.target.value })} />
                      <Input placeholder="DPI" value={persona.dpi} onChange={(e) => setPersona({ ...persona, dpi: e.target.value })} />
                      <Button type="button" size="sm" onClick={async () => {
                        if (!persona.nombre.trim()) return
                        try {
                          const res = await comisionistaService.crear(persona)
                          const id = res.data?.id
                          setPersona({ nombre: '', telefono: '', direccion: '', dpi: '' })
                          setAltaRapida(false)
                          await cargar()
                          if (id) setAplicar((prev) => ({ ...prev, comisionista_id: String(id) }))
                          toast.success('Comisionista creado y seleccionado')
                        } catch (e: any) {
                          toast.error(e?.message || 'No se pudo crear')
                        }
                      }}>Guardar y usar</Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Regla</Label>
                  <select className={campo} value={aplicar.regla_id} onChange={(e) => setAplicar({ ...aplicar, regla_id: e.target.value, monto: '' })}>
                    <option value="">Monto manual</option>
                    {reglas.filter((r) => r.activo).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Monto de la comisión</Label>
                  <Input
                    type="number"
                    value={aplicar.regla_id ? String(calculada || '') : aplicar.monto}
                    readOnly={Boolean(aplicar.regla_id)}
                    onChange={(e) => setAplicar({ ...aplicar, monto: e.target.value })}
                  />
                  {aplicar.regla_id && <p className="mt-1 text-xs text-muted-foreground">Calculado con la regla sobre la venta.</p>}
                </div>
                <Button onClick={async () => {
                  if (!aplicar.negociacion_id || !aplicar.comisionista_id) {
                    toast.error('Elige la venta y el comisionista')
                    return
                  }
                  try {
                    await comisionistaService.aplicar({
                      negociacion_id: Number(aplicar.negociacion_id),
                      comisionista_id: Number(aplicar.comisionista_id),
                      regla_id: aplicar.regla_id ? Number(aplicar.regla_id) : null,
                      monto_comision: aplicar.regla_id ? null : Number(aplicar.monto),
                    })
                    setAplicar({ comisionista_id: '', negociacion_id: '', regla_id: '', monto: '' })
                    await cargar()
                    toast.success('Comisión ligada a la venta')
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || e?.message || 'No se pudo registrar')
                  }
                }}>Registrar comisión</Button>
              </CardContent>
            </Card>
          )}

          {puedePagar && (
            <Card>
              <CardHeader><CardTitle>Pago de una comisión</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <div>
                  <Label>Comisión</Label>
                  <select className={campo} value={pago.id} onChange={(e) => setPago({ ...pago, id: Number(e.target.value) })}>
                    <option value={0}>Elegir</option>
                    {comisiones.filter((c) => c.estado !== 'pagada').map((c) => (
                      <option key={c.id} value={c.id}>{c.comisionista?.nombre} · {c.negociacion?.codigo_negociacion || c.lote?.codigo_unico} · pendiente {q(c.pendiente)}</option>
                    ))}
                  </select>
                </div>
                <div><Label>Fecha</Label><Input type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></div>
                <div><Label>Monto</Label><Input type="number" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} /></div>
                <div><Label>Referencia</Label><Input value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} /></div>
                <Button onClick={async () => {
                  if (!pago.id || !pago.monto) return
                  try {
                    await comisionistaService.pagar(pago.id, {
                      fecha: pago.fecha || new Date().toISOString().slice(0, 10),
                      monto: Number(pago.monto),
                      referencia: pago.referencia,
                    })
                    await cargar()
                    if (puedeReportes) await bajar(`/comisiones/${pago.id}/recibo-pdf`, `recibo-comision-${pago.id}.pdf`)
                    toast.success('Pago registrado')
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || e?.message || 'No se pudo pagar')
                  }
                }}>Guardar pago y recibo</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personas registradas</CardTitle>
              {puedeEditar && <Button size="sm" onClick={() => { setPersonaId(null); setPersona({ nombre: '', telefono: '', direccion: '', dpi: '' }); setMostrarPersona(true) }}>Nueva persona</Button>}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Input className="mb-3" placeholder="Buscar nombre, teléfono o DPI" value={textoPer} onChange={(e) => { setTextoPer(e.target.value); setPaginaPer(1) }} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>DPI</TableHead>
                    <TableHead>Comisiones</TableHead>
                    <TableHead className="w-px"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personasPagina.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.nombre}</TableCell>
                      <TableCell>{p.telefono || '—'}</TableCell>
                      <TableCell>{p.direccion || '—'}</TableCell>
                      <TableCell>{p.dpi || '—'}</TableCell>
                      <TableCell>{p.comisiones_count ?? 0}</TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <AccionesRegistro
                          onDescargar={puedeReportes ? () => bajar(`/comisiones/reporte?formato=pdf&comisionista_id=${p.id}`, `comisiones-${p.id}.pdf`) : undefined}
                          onEditar={puedeEditar ? () => {
                            setPersonaId(p.id)
                            setPersona({ nombre: p.nombre, telefono: p.telefono || '', direccion: p.direccion || '', dpi: p.dpi || '' })
                            setMostrarPersona(true)
                          } : undefined}
                          onEliminar={puedeEditar ? () => {
                            if (!window.confirm(`Eliminar a ${p.nombre}? Solo procede si no tiene comisiones.`)) return
                            comisionistaService.eliminar(p.id).then((res) => {
                              toast.success(res.message || 'Comisionista eliminado')
                              cargar()
                            }).catch((e: any) => toast.error(e?.message || 'No se pudo eliminar'))
                          } : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {personasVisibles.length === 0 && <TableRow><TableCell colSpan={6}>No hay comisionistas.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <PaginacionLista
                total={personasVisibles.length}
                pagina={paginaPerSegura}
                porPagina={porPer}
                onPagina={setPaginaPer}
                onPorPagina={(cantidad) => { setPorPer(cantidad); setPaginaPer(1) }}
              />
            </CardContent>
          </Card>
          {puedeEditar && mostrarPersona && (
            <Card>
              <CardHeader><CardTitle>{personaId ? 'Editar persona' : 'Nueva persona'}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <div><Label>Nombre</Label><Input value={persona.nombre} onChange={(e) => setPersona({ ...persona, nombre: e.target.value })} /></div>
                <div><Label>Teléfono</Label><Input value={persona.telefono} onChange={(e) => setPersona({ ...persona, telefono: e.target.value })} /></div>
                <div><Label>Dirección</Label><Input value={persona.direccion} onChange={(e) => setPersona({ ...persona, direccion: e.target.value })} /></div>
                <div><Label>DPI</Label><Input value={persona.dpi} onChange={(e) => setPersona({ ...persona, dpi: e.target.value })} /></div>
                <Button onClick={async () => {
                  if (!persona.nombre.trim()) return
                  try {
                    if (personaId) await comisionistaService.actualizar(personaId, persona)
                    else await comisionistaService.crear(persona)
                    setPersona({ nombre: '', telefono: '', direccion: '', dpi: '' })
                    setPersonaId(null)
                    setMostrarPersona(false)
                    await cargar()
                    toast.success(personaId ? 'Comisionista actualizado' : 'Comisionista registrado')
                  } catch (e: any) {
                    toast.error(e?.message || 'No se pudo crear')
                  }
                }}>{personaId ? 'Guardar cambios' : 'Agregar'}</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reglas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reglas vigentes</CardTitle>
              {puedeReglas && <Button size="sm" onClick={() => { setReglaId(null); setRegla({ nombre: '', tipo: 'porcentaje', base: 'precio_final', valor: '', momento: 'al_contrato' }); setMostrarRegla(true) }}>Nueva regla</Button>}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                <Input placeholder="Buscar regla" value={textoReg} onChange={(e) => { setTextoReg(e.target.value); setPaginaReg(1) }} />
                <select className={campo} value={estadoReg} onChange={(e) => { setEstadoReg(e.target.value); setPaginaReg(1) }}>
                  <option value="">Todas</option>
                  <option value="activa">Activas</option>
                  <option value="inactiva">Inactivas</option>
                </select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cálculo</TableHead>
                    <TableHead>Se reconoce</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-px"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reglasPagina.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.nombre}</TableCell>
                      <TableCell>
                        {r.tipo === 'monto_fijo'
                          ? `Monto fijo ${q(r.valor)}`
                          : `${r.valor}% sobre ${BASE[r.base] || r.base}`}
                      </TableCell>
                      <TableCell>{MOMENTO[r.momento] || r.momento}</TableCell>
                      <TableCell>{r.activo ? 'Activa' : 'Inactiva'}</TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <AccionesRegistro
                          onEditar={puedeReglas ? () => {
                            setReglaId(r.id)
                            setRegla({ nombre: r.nombre, tipo: r.tipo, base: r.base, valor: String(r.valor), momento: r.momento })
                            setMostrarRegla(true)
                          } : undefined}
                          onEliminar={puedeReglas ? () => {
                            if (!window.confirm(`Quitar la regla ${r.nombre}? Si ya se usó, solo se desactiva.`)) return
                            comisionistaService.eliminarRegla(r.id).then((res) => {
                              toast.success(res.message || 'Regla actualizada')
                              cargar()
                            }).catch((e: any) => toast.error(e?.message || 'No se pudo eliminar'))
                          } : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {reglasVisibles.length === 0 && <TableRow><TableCell colSpan={5}>Crea una regla para calcular la comisión al ligarla a una venta.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <PaginacionLista
                total={reglasVisibles.length}
                pagina={paginaRegSegura}
                porPagina={porReg}
                onPagina={setPaginaReg}
                onPorPagina={(cantidad) => { setPorReg(cantidad); setPaginaReg(1) }}
              />
            </CardContent>
          </Card>
          {puedeReglas && mostrarRegla && (
            <Card>
              <CardHeader><CardTitle>{reglaId ? 'Editar regla' : 'Nueva regla'}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div><Label>Nombre</Label><Input value={regla.nombre} onChange={(e) => setRegla({ ...regla, nombre: e.target.value })} placeholder="Ej. 5% al contrato" /></div>
                <div>
                  <Label>Tipo</Label>
                  <select className={campo} value={regla.tipo} onChange={(e) => setRegla({ ...regla, tipo: e.target.value })}>
                    <option value="porcentaje">Porcentaje</option>
                    <option value="monto_fijo">Monto fijo</option>
                  </select>
                </div>
                {regla.tipo === 'porcentaje' && (
                  <div>
                    <Label>Se calcula sobre</Label>
                    <select className={campo} value={regla.base} onChange={(e) => setRegla({ ...regla, base: e.target.value })}>
                      <option value="precio_final">Precio final de la venta</option>
                      <option value="precio_venta">Precio de lista</option>
                      <option value="enganche">Enganche</option>
                    </select>
                  </div>
                )}
                <div>
                  <Label>{regla.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}</Label>
                  <Input type="number" value={regla.valor} onChange={(e) => setRegla({ ...regla, valor: e.target.value })} />
                </div>
                <div>
                  <Label>Cuándo se reconoce</Label>
                  <select className={campo} value={regla.momento} onChange={(e) => setRegla({ ...regla, momento: e.target.value })}>
                    <option value="al_contrato">Al firmar el contrato</option>
                    <option value="al_enganche">Al cobrar el enganche</option>
                    <option value="al_liquidar">Al liquidar la venta</option>
                  </select>
                </div>
                <Button onClick={async () => {
                  if (!regla.nombre || !regla.valor) return
                  try {
                    const payload = {
                      nombre: regla.nombre,
                      tipo: regla.tipo,
                      base: regla.base,
                      valor: Number(regla.valor),
                      momento: regla.momento,
                    }
                    if (reglaId) await comisionistaService.actualizarRegla(reglaId, payload)
                    else await comisionistaService.crearRegla(payload)
                    setRegla({ nombre: '', tipo: 'porcentaje', base: 'precio_final', valor: '', momento: 'al_contrato' })
                    setReglaId(null)
                    setMostrarRegla(false)
                    await cargar()
                    toast.success(reglaId ? 'Regla actualizada' : 'Regla registrada')
                  } catch (e: any) {
                    toast.error(e?.message || 'No se pudo crear la regla')
                  }
                }}>{reglaId ? 'Guardar cambios' : 'Guardar regla'}</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
