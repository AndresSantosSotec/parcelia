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
import { AvisoCaja, useCajaOperable } from '@/components/shared/AvisoCaja'

const q = (n: number | string | null | undefined) =>
  `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fecha = (v?: string | null) => (v ? String(v).slice(0, 10) : '')
const campo = 'mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'

const MOMENTO: Record<string, string> = {
  al_contrato: 'Al firmar el contrato',
  al_enganche: 'Al cobrar el enganche',
  al_liquidar: 'Al liquidar la venta',
  proporcional: 'Conforme el comprador abona, hasta escriturar',
}
const BASE: Record<string, string> = {
  precio_final: 'Precio final de la venta',
  precio_venta: 'Precio de lista',
  enganche: 'Enganche',
  excedente: 'Excedente sobre el precio de lista',
}

export function ComisionistasModule({ userSession }: { userSession?: { userData?: { rol?: string; permisos?: unknown } | null } }) {
  const { hasPermission } = usePermissions(userSession?.userData)
  const puedeEditar = hasPermission('comisionistas', 'editar')
  const puedePagar = hasPermission('comisionistas', 'pagar')
  const puedeReglas = hasPermission('comisionistas', 'reglas')
  const puedeReportes = hasPermission('comisionistas', 'reportes')
  const { abierta: cajaAbierta } = useCajaOperable()
  const [personas, setPersonas] = useState<ComisionistaItem[]>([])
  const [reglas, setReglas] = useState<ComisionRegla[]>([])
  const [comisiones, setComisiones] = useState<ComisionItem[]>([])
  const [ventas, setVentas] = useState<Negociacion[]>([])
  const [persona, setPersona] = useState({ nombre: '', telefono: '', direccion: '', dpi: '' })
  const [regla, setRegla] = useState({ nombre: '', tipo: 'porcentaje', base: 'precio_final', valor: '', momento: 'al_contrato' })
  const [aplicar, setAplicar] = useState({ comisionista_id: '', negociacion_id: '', regla_id: '', monto: '' })
  const [pago, setPago] = useState({ id: 0, fecha: '', monto: '', referencia: '' })
  const [historialId, setHistorialId] = useState<number | null>(null)
  const [edicionPago, setEdicionPago] = useState<{ pagoId: number; fecha: string; monto: string; referencia: string } | null>(null)
  const [buscaComision, setBuscaComision] = useState('')
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
    const excedente = Math.max(0, Number(venta.precio_final) - Number(venta.precio_original))
    if (reglaSel.base === 'excedente') {
      if (reglaSel.tipo === 'porcentaje') return Math.round(excedente * (Number(reglaSel.valor) / 100) * 100) / 100
      return Math.round(excedente * 100) / 100
    }
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

  const historial = comisiones.find((c) => c.id === historialId) || null

  async function guardarEdicionPago(comisionId: number) {
    if (!edicionPago) return
    try {
      await comisionistaService.actualizarPago(comisionId, edicionPago.pagoId, {
        fecha: edicionPago.fecha,
        monto: Number(edicionPago.monto),
        referencia: edicionPago.referencia,
      })
      setEdicionPago(null)
      await cargar()
      toast.success('Pago actualizado. La caja quedó con el monto nuevo.')
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo actualizar el pago')
    }
  }

  async function eliminarPagoComision(comisionId: number, pagoId: number) {
    if (!window.confirm('Eliminar este pago? El dinero regresa a la caja abierta.')) return
    try {
      await comisionistaService.eliminarPago(comisionId, pagoId)
      await cargar()
      toast.success('Pago eliminado. El dinero volvió a la caja.')
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo eliminar el pago')
    }
  }

  function panelPagos(comision: ComisionItem) {
    const filas = Array.isArray(comision.pagos) ? comision.pagos : []
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {comision.comisionista?.nombre} · lote {comision.lote?.numero_lote || comision.lote?.codigo_unico || '—'} · comisión {q(comision.monto_comision)} · pagado {q(comision.pagado)} · pendiente {q(comision.pendiente)}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="w-px"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.id}>
                {edicionPago?.pagoId === fila.id ? (
                  <>
                    <TableCell><Input type="date" value={edicionPago.fecha} onChange={(e) => setEdicionPago({ ...edicionPago, fecha: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" value={edicionPago.monto} onChange={(e) => setEdicionPago({ ...edicionPago, monto: e.target.value })} /></TableCell>
                    <TableCell><Input value={edicionPago.referencia} onChange={(e) => setEdicionPago({ ...edicionPago, referencia: e.target.value })} /></TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="sm" disabled={cajaAbierta !== true} onClick={() => guardarEdicionPago(comision.id)}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEdicionPago(null)}>Cancelar</Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{fecha(fila.fecha)}</TableCell>
                    <TableCell>{q(fila.monto)}</TableCell>
                    <TableCell>{fila.referencia || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {puedePagar && (
                        <>
                          <Button size="sm" variant="outline" disabled={cajaAbierta !== true} onClick={() => setEdicionPago({
                            pagoId: fila.id,
                            fecha: fecha(fila.fecha),
                            monto: String(fila.monto),
                            referencia: fila.referencia || '',
                          })}>Editar</Button>
                          <Button size="sm" variant="ghost" disabled={cajaAbierta !== true} onClick={() => eliminarPagoComision(comision.id, fila.id)}>Eliminar</Button>
                        </>
                      )}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {filas.length === 0 && <TableRow><TableCell colSpan={4}>Esta comisión todavía no tiene pagos.</TableCell></TableRow>}
          </TableBody>
        </Table>
        {puedeReportes && (
          <Button size="sm" variant="outline" onClick={() => bajar(`/comisiones/${comision.id}/reporte?formato=pdf`, `estado-comision-${comision.id}.pdf`)}>Estado de cuenta</Button>
        )}
      </div>
    )
  }

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
          <p className="text-sm text-muted-foreground">Si el lote se vende por encima del precio de lista, la comisión es esa diferencia. El pago sale de la caja del día y no rebaja el precio de venta del lote.</p>
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
          <TabsTrigger value="ligar">Ligar comisión</TabsTrigger>
          <TabsTrigger value="pago">Pago de comisión</TabsTrigger>
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
                      <TableCell>{c.lote?.numero_lote || c.lote?.codigo_unico || '—'}</TableCell>
                      <TableCell>{c.regla?.nombre || c.descripcion || '—'}</TableCell>
                      <TableCell>{q(c.monto_comision)}</TableCell>
                      <TableCell>{q(c.pendiente)}</TableCell>
                      <TableCell>{c.estado}</TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setHistorialId(c.id)}>Pagos</Button>
                          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/comisiones/${c.id}/recibo-pdf`, `recibo-comision-${c.id}.pdf`)}>Recibo</Button>}
                          {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/comisiones/${c.id}/ticket-pdf`, `ticket-comision-${c.id}.pdf`)}>Ticket</Button>}
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
          {historial && (
            <Card>
              <CardHeader><CardTitle>Pagos realizados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <AvisoCaja abierta={cajaAbierta} />
                {panelPagos(historial)}
              </CardContent>
            </Card>
          )}

        </TabsContent>

        <TabsContent value="ligar" className="space-y-4">
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
                        {v.codigo_negociacion} · {v.lote?.numero_lote || v.lote?.codigo_unico || 'lote'} · {q(v.precio_final)}
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
                  {venta && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lista {q(venta.precio_original)} · vendido en {q(venta.precio_final)} · excedente {q(Math.max(0, Number(venta.precio_final) - Number(venta.precio_original)))}.
                      Un lote de 30,000 vendido en 35,000 deja 5,000 de comisión.
                    </p>
                  )}
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

        </TabsContent>

        <TabsContent value="pago" className="space-y-4">
          <AvisoCaja abierta={cajaAbierta} />
          {puedePagar && (
            <Card>
              <CardHeader>
                <CardTitle>Pago al comisionista</CardTitle>
                <p className="text-sm text-muted-foreground">Busca a la persona por nombre o DPI y abona lo que ya se liberó. Si el pendiente de ese lote llega a cero, desaparece de esta lista.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Nombre o DPI del comisionista" value={buscaComision} onChange={(e) => setBuscaComision(e.target.value)} />
                <div className="grid gap-2">
                  {comisiones
                    .filter((c) => c.pendiente > 0.009)
                    .filter((c) => {
                      const texto = buscaComision.trim().toLowerCase()
                      if (!texto) return false
                      return [c.comisionista?.nombre, c.comisionista?.dpi, c.lote?.codigo_unico, c.negociacion?.codigo_negociacion]
                        .some((valor) => String(valor || '').toLowerCase().includes(texto))
                    })
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-left text-sm ${pago.id === c.id ? 'border-blue-600 bg-blue-50' : ''}`}
                        onClick={() => {
                          setHistorialId(c.id)
                          setPago({
                            ...pago,
                            id: c.id,
                            monto: String(c.disponible ?? c.pendiente),
                          })
                        }}
                      >
                        <span className="font-medium">{c.comisionista?.nombre}</span>
                        {c.comisionista?.dpi ? ` · DPI ${c.comisionista.dpi}` : ''}
                        {' · '}{c.lote?.numero_lote || c.lote?.codigo_unico || c.negociacion?.codigo_negociacion}
                        <span className="mt-1 block text-muted-foreground">
                          Comisión {q(c.monto_comision)} · liberado {q(c.liberado ?? c.monto_comision)} · se puede pagar {q(c.disponible ?? c.pendiente)} · pendiente {q(c.pendiente)}
                        </span>
                      </button>
                    ))}
                </div>
                {pago.id > 0 && (
                  <div className="grid gap-3 md:grid-cols-4">
                    <div><Label>Fecha</Label><Input type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></div>
                    <div><Label>Monto a pagar ahora</Label><Input type="number" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} /></div>
                    <div><Label>Referencia</Label><Input value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} /></div>
                    <div className="flex items-end">
                      <Button onClick={async () => {
                        if (!pago.id || !pago.monto) return
                        try {
                          await comisionistaService.pagar(pago.id, {
                            fecha: pago.fecha || new Date().toISOString().slice(0, 10),
                            monto: Number(pago.monto),
                            referencia: pago.referencia,
                          })
                          const comisionId = pago.id
                          setPago({ id: 0, fecha: '', monto: '', referencia: '' })
                          setEdicionPago(null)
                          setBuscaComision('')
                          await cargar()
                          toast.success('Pago registrado. El formulario quedó en blanco para el siguiente.')
                          if (puedeReportes) {
                            bajar(`/comisiones/${comisionId}/recibo-pdf`, `recibo-comision-${comisionId}.pdf`).catch(() => {
                              toast.error('El pago se registró, pero no se pudo descargar el recibo')
                            })
                            bajar(`/comisiones/${comisionId}/ticket-pdf`, `ticket-comision-${comisionId}.pdf`).catch(() => {
                              toast.error('El pago se registró, pero no se pudo descargar el ticket')
                            })
                          }
                        } catch (e: any) {
                          toast.error(e?.response?.data?.message || e?.message || 'No se pudo pagar')
                        }
                      }} disabled={cajaAbierta !== true}>Pagar y recibo</Button>
                    </div>
                  </div>
                )}
                {historial && panelPagos(historial)}
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
                        {r.base === 'excedente' && r.tipo === 'monto_fijo'
                          ? 'El excedente de la venta'
                          : r.tipo === 'monto_fijo'
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
                <div>
                  <Label>Se calcula sobre</Label>
                  <select className={campo} value={regla.base} onChange={(e) => setRegla({
                    ...regla,
                    base: e.target.value,
                    momento: e.target.value === 'excedente' ? 'proporcional' : regla.momento,
                  })}>
                    <option value="precio_final">Precio final de la venta</option>
                    <option value="precio_venta">Precio de lista</option>
                    <option value="enganche">Enganche</option>
                    <option value="excedente">El excedente sobre el precio de lista</option>
                  </select>
                  {regla.base === 'excedente' && (
                    <p className="mt-1 text-xs text-muted-foreground">Lista 30,000 y venta en 35,000: la comisión es 5,000. Se va soltando conforme el comprador abona.</p>
                  )}
                </div>
                {!(regla.base === 'excedente' && regla.tipo === 'monto_fijo') && (
                <div>
                  <Label>{regla.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}</Label>
                  <Input type="number" value={regla.valor} onChange={(e) => setRegla({ ...regla, valor: e.target.value })} />
                </div>
                )}
                <div>
                  <Label>Cuándo se reconoce</Label>
                  <select className={campo} value={regla.momento} onChange={(e) => setRegla({ ...regla, momento: e.target.value })}>
                    <option value="al_contrato">Al firmar el contrato</option>
                    <option value="al_enganche">Al cobrar el enganche</option>
                    <option value="al_liquidar">Al liquidar la venta</option>
                    <option value="proporcional">Conforme abona el comprador, hasta escriturar</option>
                  </select>
                </div>
                <Button onClick={async () => {
                  const usaExcedente = regla.base === 'excedente' && regla.tipo === 'monto_fijo'
                  if (!regla.nombre || (!usaExcedente && !regla.valor)) return
                  try {
                    const payload = {
                      nombre: regla.nombre,
                      tipo: regla.tipo,
                      base: regla.base,
                      valor: usaExcedente ? 0 : Number(regla.valor),
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
