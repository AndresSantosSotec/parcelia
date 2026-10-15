import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { api, fincaService, financistaService, type FinancistaItem, type Finca } from '@/lib/api'
import { usePermissions } from '@/hooks/use-permissions'
import { AccionesRegistro, PaginacionLista } from './AccionesRegistro'

const q = (n: number | string | null | undefined) =>
  `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fecha = (v?: string | null) => (v ? String(v).slice(0, 10) : '')
const campo = 'mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'
const campoFiltro = 'flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'
const PASO: Record<string, number> = { mensual: 1, bimensual: 2, trimestral: 3, semestral: 6, anual: 12 }

function num(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function redondear(n: number) {
  return Math.round(n * 100) / 100
}

function sumarMeses(iso: string, meses: number) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const resultante = new Date(anio, mes - 1 + meses, dia)
  const mm = String(resultante.getMonth() + 1).padStart(2, '0')
  const dd = String(resultante.getDate()).padStart(2, '0')
  return `${resultante.getFullYear()}-${mm}-${dd}`
}

function repartir(total: number, partes: number) {
  if (partes < 1) return []
  const base = redondear(total / partes)
  const filas = Array(partes).fill(base)
  filas[partes - 1] = redondear(total - base * (partes - 1))
  return filas
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function armarPlan(datos: { monto: string; tasa_anual: string; plazo: string; frecuencia: string; fecha_inicio: string; capital_al_vencimiento: boolean; esquema?: string }) {
  const monto = num(datos.monto)
  const tasa = num(datos.tasa_anual)
  const plazo = Number(datos.plazo) || 0
  const paso = PASO[datos.frecuencia] || 1
  const n = plazo > 0 ? Math.ceil(plazo / paso) : 0
  const interes = tasa > 0 && plazo > 0 ? redondear(monto * (tasa / 100) * (plazo / 12)) : 0
  const capitales = repartir(datos.capital_al_vencimiento ? 0 : monto, n)
  const intereses = repartir(interes, n)
  if (datos.capital_al_vencimiento && n > 0) capitales[n - 1] = redondear(monto)
  const inicio = datos.fecha_inicio || hoy()
  const cuotas = capitales.map((capital, indice) => ({
    numero: indice + 1,
    fecha: sumarMeses(inicio, Math.min(plazo, (indice + 1) * paso)),
    capital,
    interes: intereses[indice] || 0,
  }))
  let cuota = n > 0 ? redondear((datos.capital_al_vencimiento ? interes : monto + interes) / n) : 0
  if (datos.esquema === 'particular_anual' && n === 1) cuota = redondear(monto + interes)
  return { interes, n, cuota, vencimiento: plazo > 0 ? sumarMeses(inicio, plazo) : '', cuotas }
}

const ESQUEMA: Record<string, string> = {
  particular_anual: 'Particular, un pago al año',
  cooperativa_mensual: 'Cooperativa, cuotas mensuales',
  libre: 'Otro esquema',
}

const formVacio = {
  finca_id: '',
  esquema: 'particular_anual',
  tipo: 'particular',
  nombre: '',
  dpi: '',
  destino: 'compra',
  monto: '',
  tasa_anual: '',
  plazo: '12',
  frecuencia: 'anual',
  fecha_inicio: '',
  capital_al_vencimiento: true,
}

export function FinancistasModule({ userSession }: { userSession?: { userData?: { rol?: string; permisos?: unknown } | null } }) {
  const { hasPermission } = usePermissions(userSession?.userData)
  const puedeEditar = hasPermission('financistas', 'editar')
  const puedePagar = hasPermission('financistas', 'pagar')
  const puedeReportes = hasPermission('financistas', 'reportes')
  const [fincas, setFincas] = useState<Finca[]>([])
  const [items, setItems] = useState<FinancistaItem[]>([])
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAviso, setFiltroAviso] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [form, setForm] = useState(formVacio)
  const [editId, setEditId] = useState<number | null>(null)
  const [vista, setVista] = useState<'lista' | 'form' | 'ver' | 'pago'>('lista')
  const [visto, setVisto] = useState<FinancistaItem | null>(null)
  const [pagoItem, setPagoItem] = useState<FinancistaItem | null>(null)
  const [pagoFecha, setPagoFecha] = useState(hoy())
  const [pagoCalc, setPagoCalc] = useState({ capital: 0, interes: 0, mora: 0, nota: '' })
  const [descuento, setDescuento] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [recibo, setRecibo] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [concepto, setConcepto] = useState('')
  const [busquedaPago, setBusquedaPago] = useState('')
  const [planFilas, setPlanFilas] = useState<Array<{ numero: number; fecha: string; capital: number; interes: number; total: number; estado: string }>>([])
  const [verPlan, setVerPlan] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      fincaService.getAll(),
      financistaService.listar(filtro ? Number(filtro) : undefined),
    ])
    setFincas(a.data || [])
    setItems(b.data || [])
  }, [filtro])

  useEffect(() => {
    cargar().catch(() => toast.error('No se pudieron cargar los financiamientos'))
  }, [cargar])

  useEffect(() => {
    if (vista !== 'pago' || !pagoItem || !pagoFecha) return
    let vigente = true
    financistaService.previewPago(pagoItem.id, pagoFecha)
      .then((res) => { if (vigente && res.data) setPagoCalc(res.data) })
      .catch(() => { if (vigente) toast.error('No se pudo calcular el pago para esa fecha') })
    return () => { vigente = false }
  }, [vista, pagoItem, pagoFecha])

  const plan = useMemo(() => armarPlan(form), [form])

  async function bajar(url: string, nombre: string) {
    try {
      await api.downloadFile(url, nombre)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo descargar')
    }
  }

  function volver() {
    setVista('lista')
    setEditId(null)
    setVisto(null)
    setPagoItem(null)
    setForm(formVacio)
  }

  function abrirPago(item: FinancistaItem | null) {
    setPagoItem(item)
    setPagoFecha(hoy())
    setDescuento('')
    setArchivo(null)
    setRecibo('')
    setMetodo('efectivo')
    setConcepto(item ? `PAGO DE FINANCIAMIENTO A NOMBRE DE ${item.nombre.toUpperCase()}` : '')
    setPagoCalc({ capital: 0, interes: 0, mora: 0, nota: '' })
    setPlanFilas([])
    setVerPlan(false)
    setBusquedaPago('')
    setVista('pago')
  }

  function aplicarEsquema(esquema: string) {
    if (esquema === 'particular_anual') {
      setForm({ ...form, esquema, tipo: 'particular', frecuencia: 'anual', capital_al_vencimiento: true, plazo: form.plazo || '12' })
      return
    }
    if (esquema === 'cooperativa_mensual') {
      setForm({ ...form, esquema, tipo: 'cooperativa', frecuencia: 'mensual', capital_al_vencimiento: false, plazo: form.plazo || '12' })
      return
    }
    setForm({ ...form, esquema: 'libre' })
  }

  const textoPago = busquedaPago.trim().toLowerCase()
  const candidatosPago = items.filter((f) => {
    if (f.estado === 'liquidado') return false
    if (!textoPago) return true
    return [f.nombre, f.dpi, f.finca?.nombre, f.finca?.codigo].some((valor) => String(valor || '').toLowerCase().includes(textoPago))
  })
  const totalPagar = redondear(pagoCalc.capital + pagoCalc.interes + pagoCalc.mora - num(descuento))

  const alertas = items.filter((f) => f.alerta_vencimiento)
  const financiamientosVisibles = items.filter((f) => {
    const texto = busqueda.trim().toLowerCase()
    const coincideTexto = !texto || [f.nombre, f.dpi, f.finca?.nombre, f.finca?.codigo, f.tipo, f.esquema].some((valor) => String(valor || '').toLowerCase().includes(texto))
    const coincideTipo = !filtroTipo || f.tipo === filtroTipo
    const coincideAviso = filtroAviso === '' || (filtroAviso === 'por_vencer' ? f.alerta_vencimiento : f.saldo_capital > 0)
    return coincideTexto && coincideTipo && coincideAviso
  })
  const paginasFin = Math.max(1, Math.ceil(financiamientosVisibles.length / porPagina))
  const paginaFin = Math.min(pagina, paginasFin)
  const financiamientosPagina = financiamientosVisibles.slice((paginaFin - 1) * porPagina, paginaFin * porPagina)

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Financiamientos</h1>
          <p className="text-sm text-muted-foreground">El dinero que entra por un financiamiento se queda en este módulo. No se suma a las ventas de lotes. El pago al financista sí sale de esas ventas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vista !== 'lista' && <Button size="sm" variant="outline" onClick={volver}>Volver al listado</Button>}
          {vista === 'lista' && puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/reporte?formato=pdf${filtro ? `&finca_id=${filtro}` : ''}`, 'financiamientos.pdf')}>Listado PDF</Button>}
          {vista === 'lista' && puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/reporte?formato=xlsx${filtro ? `&finca_id=${filtro}` : ''}`, 'financiamientos.xlsx')}>Listado Excel</Button>}
          {vista === 'lista' && puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/financistas/reporte-vencimientos?formato=pdf', 'vencimientos.pdf')}>Por vencer</Button>}
          {vista === 'lista' && puedePagar && <Button size="sm" variant="outline" onClick={() => abrirPago(null)}>Registrar pago</Button>}
          {vista === 'lista' && puedeEditar && <Button size="sm" onClick={() => { setEditId(null); setForm({ ...formVacio, fecha_inicio: hoy() }); setVista('form') }}>Nuevo financiamiento</Button>}
          {vista === 'lista' && <Button size="sm" variant="outline" onClick={() => bajar('/financistas/requisitos', 'registro-modulos.pdf')}>Registro PDF</Button>}
        </div>
      </div>

      {vista === 'lista' && alertas.length > 0 && (
        <Card className="border-amber-400">
          <CardContent className="py-3 text-sm">
            {alertas.map((f) => (
              <p key={f.id}>{f.finca?.nombre}: {f.nombre} vence el {fecha(f.fecha_vencimiento)}. Saldo {q(f.saldo_capital)}.</p>
            ))}
          </CardContent>
        </Card>
      )}

      {vista === 'lista' && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Registrados</CardTitle>
            <div className="grid w-full gap-2 sm:grid-cols-4">
              <Input placeholder="Buscar por nombre, DPI o finca" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }} />
              <select className={campoFiltro} value={filtro} onChange={(e) => { setFiltro(e.target.value); setPagina(1) }}>
                <option value="">Todas las fincas</option>
                {fincas.map((f) => <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>)}
              </select>
              <select className={campoFiltro} value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1) }}>
                <option value="">Todos los tipos</option>
                <option value="banco">Banco</option>
                <option value="cooperativa">Cooperativa</option>
                <option value="particular">Particular</option>
                <option value="otro">Otro</option>
              </select>
              <select className={campoFiltro} value={filtroAviso} onChange={(e) => { setFiltroAviso(e.target.value); setPagina(1) }}>
                <option value="">Todos</option>
                <option value="por_vencer">Por vencer</option>
                <option value="con_saldo">Con saldo</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finca</TableHead>
                  <TableHead>Financiamiento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="w-px"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financiamientosPagina.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.finca?.nombre}</TableCell>
                    <TableCell>{f.nombre}{f.alerta_vencimiento && <Badge className="ml-2" variant="destructive">Por vencer</Badge>}</TableCell>
                    <TableCell>{ESQUEMA[f.esquema || ''] || f.tipo} · {f.frecuencia}</TableCell>
                    <TableCell>{q(f.monto)}</TableCell>
                    <TableCell>{q(f.saldo_capital)}</TableCell>
                    <TableCell>{q(f.cuota)}</TableCell>
                    <TableCell>{fecha(f.fecha_vencimiento)}</TableCell>
                    <TableCell className="w-px whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {puedePagar && f.estado !== 'liquidado' && (
                          <Button type="button" size="sm" variant="outline" onClick={() => abrirPago(f)}>Pago</Button>
                        )}
                        <AccionesRegistro
                          onVer={() => { setVisto(f); setVista('ver') }}
                          onDescargar={puedeReportes ? () => bajar(`/financistas/${f.id}/reporte?formato=pdf`, `estado-financista-${f.id}.pdf`) : undefined}
                          onEditar={puedeEditar ? () => {
                            setEditId(f.id)
                            setVista('form')
                            setForm({
                              finca_id: String(f.finca_id),
                              esquema: f.esquema || (f.tipo === 'particular' ? 'particular_anual' : f.tipo === 'cooperativa' ? 'cooperativa_mensual' : 'libre'),
                              tipo: f.tipo,
                              nombre: f.nombre,
                              dpi: f.dpi || '',
                              destino: f.destino,
                              monto: String(f.monto),
                              tasa_anual: f.tasa_anual != null ? String(f.tasa_anual) : '',
                              plazo: f.plazo != null ? String(f.plazo) : '',
                              frecuencia: f.frecuencia || 'mensual',
                              fecha_inicio: fecha(f.fecha_inicio) || hoy(),
                              capital_al_vencimiento: f.capital_al_vencimiento,
                            })
                          } : undefined}
                          onEliminar={puedeEditar ? () => {
                            if (!window.confirm(`Eliminar el financiamiento ${f.nombre}? Solo procede si no tiene pagos.`)) return
                            financistaService.eliminar(f.id).then((res) => {
                              toast.success(res.message || 'Financiamiento eliminado')
                              cargar()
                            }).catch((e: any) => toast.error(e?.message || 'No se pudo eliminar'))
                          } : undefined}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {financiamientosVisibles.length === 0 && <TableRow><TableCell colSpan={8}>Todavía no hay financiamientos registrados.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <PaginacionLista
              total={financiamientosVisibles.length}
              pagina={paginaFin}
              porPagina={porPagina}
              onPagina={setPagina}
              onPorPagina={(cantidad) => { setPorPagina(cantidad); setPagina(1) }}
            />
          </CardContent>
        </Card>
      )}

      {vista === 'ver' && visto && (
        <Card>
          <CardHeader><CardTitle>{visto.finca?.nombre}</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-3">
            <p>Financiamiento: {visto.nombre}</p>
            <p>Tipo: {visto.tipo} · {visto.destino}</p>
            <p>Capital: {q(visto.monto)} · saldo {q(visto.saldo_capital)}</p>
            <p>Tasa: {visto.tasa_anual ?? '—'}% · interés {q(visto.interes_total)}</p>
            <p>Plazo: {visto.plazo || '—'} meses · {visto.numero_cuotas || '—'} cuotas {visto.frecuencia}</p>
            <p>Cuota: {q(visto.cuota)} · vence {fecha(visto.fecha_vencimiento) || '—'}</p>
            <p>Interés pendiente: {q(visto.interes_pendiente)}</p>
            <p>Estado: {visto.estado}</p>
            <div className="flex flex-wrap gap-2">
              {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/${visto.id}/reporte?formato=pdf`, `estado-financista-${visto.id}.pdf`)}>Estado de cuenta</Button>}
              {puedePagar && visto.estado !== 'liquidado' && <Button size="sm" onClick={() => abrirPago(visto)}>Registrar pago</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {vista === 'form' && puedeEditar && (
        <Card>
          <CardHeader>
            <CardTitle>{editId ? 'Editar financiamiento' : 'Nuevo financiamiento'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Finca</Label>
              <select className={campo} value={form.finca_id} onChange={(e) => setForm({ ...form, finca_id: e.target.value })}>
                <option value="">Elegir finca</option>
                {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label>Nombre de quien financia</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Carlos Gómez" />
            </div>
            <div>
              <Label>DPI</Label>
              <Input value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} placeholder="Para buscarlo al pagar" />
            </div>
            <div className="md:col-span-3">
              <Label>Esquema</Label>
              <select className={campo} value={form.esquema} onChange={(e) => aplicarEsquema(e.target.value)}>
                <option value="particular_anual">Particular: un solo pago al cumplir el año</option>
                <option value="cooperativa_mensual">Cooperativa: amortización mensual</option>
                <option value="libre">Otro (banco u otra frecuencia)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.esquema === 'particular_anual' && 'Ejemplo: Q100,000 al 10% por un año. Al vencer se paga en una sola cuota el capital más el interés. Ese ingreso no se mezcla con las ventas.'}
                {form.esquema === 'cooperativa_mensual' && 'Ejemplo: faltan Q500,000 para la finca y la cooperativa los presta. Capital e interés se pagan cada mes.'}
                {form.esquema === 'libre' && 'Úsalo solo si el contrato no es ni el particular anual ni la cooperativa mensual.'}
              </p>
            </div>
            {form.esquema === 'libre' && (
            <div>
              <Label>Tipo</Label>
              <select className={campo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="banco">Banco</option>
                <option value="cooperativa">Cooperativa</option>
                <option value="particular">Particular</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            )}
            <div>
              <Label>Destino</Label>
              <select className={campo} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}>
                <option value="compra">Compra de la finca</option>
                <option value="urbanizacion">Urbanización</option>
              </select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </div>
            <div>
              <Label>Tasa anual %</Label>
              <Input type="number" value={form.tasa_anual} onChange={(e) => setForm({ ...form, tasa_anual: e.target.value })} />
            </div>
            <div>
              <Label>Plazo en meses</Label>
              <Input type="number" min={1} value={form.plazo} onChange={(e) => setForm({ ...form, plazo: e.target.value })} />
            </div>
            {form.esquema === 'libre' && (
            <div>
              <Label>Forma de pago</Label>
              <select className={campo} value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            )}
            <div>
              <Label>Fecha de inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            {form.esquema === 'libre' && (
            <label className="flex items-center gap-2 text-sm md:col-span-3">
              <input type="checkbox" checked={form.capital_al_vencimiento} onChange={(e) => setForm({ ...form, capital_al_vencimiento: e.target.checked })} />
              El capital se paga al vencimiento y el interés en cada cuota
            </label>
            )}
            <div className="md:col-span-3 rounded-md border p-3 text-sm">
              <p>Interés calculado: <strong>{q(plan.interes)}</strong></p>
              <p>{plan.n || 0} cuotas · cuota {q(plan.cuota)} · vence el {plan.vencimiento || '—'}</p>
              <p className="text-muted-foreground">El plazo en meses se parte según la forma de pago. El vencimiento es la fecha de inicio más esos meses.</p>
              {plan.cuotas.length > 0 && (
                <div className="mt-3 max-h-56 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cuota</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Capital</TableHead>
                        <TableHead>Interés</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.cuotas.map((cuota) => (
                        <TableRow key={cuota.numero}>
                          <TableCell>{cuota.numero}</TableCell>
                          <TableCell>{cuota.fecha}</TableCell>
                          <TableCell>{q(cuota.capital)}</TableCell>
                          <TableCell>{q(cuota.interes)}</TableCell>
                          <TableCell>{q(cuota.capital + cuota.interes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <Button disabled={guardando} onClick={async () => {
              if (!form.finca_id || !form.nombre || !form.plazo || !form.fecha_inicio) {
                toast.error('Elige la finca, el nombre, el plazo y la fecha de inicio')
                return
              }
              try {
                setGuardando(true)
                const payload = {
                  finca_id: Number(form.finca_id),
                  esquema: form.esquema,
                  tipo: form.tipo,
                  nombre: form.nombre,
                  dpi: form.dpi || null,
                  destino: form.destino,
                  monto: num(form.monto),
                  tasa_anual: form.tasa_anual === '' ? null : num(form.tasa_anual),
                  plazo: Number(form.plazo),
                  frecuencia: form.frecuencia,
                  fecha_inicio: form.fecha_inicio,
                  capital_al_vencimiento: form.capital_al_vencimiento,
                }
                if (editId) await financistaService.actualizar(editId, payload)
                else await financistaService.crear(payload)
                await cargar()
                volver()
                toast.success(editId ? 'Financiamiento actualizado' : 'Financiamiento registrado')
              } catch (e: any) {
                toast.error(e?.message || 'No se pudo registrar')
              } finally {
                setGuardando(false)
              }
            }}>{editId ? 'Guardar cambios' : 'Registrar'}</Button>
          </CardContent>
        </Card>
      )}

      {vista === 'pago' && (
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Pago al financista</CardTitle>
            <p className="text-sm text-muted-foreground">Busca a la persona por nombre o DPI. El pago es una salida: se debita de las ventas de lotes y no se mezcla con el dinero que esa persona aportó.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Nombre o DPI" value={busquedaPago} onChange={(e) => setBusquedaPago(e.target.value)} />
              <Button type="button" className="bg-amber-400 text-black hover:bg-amber-500" onClick={() => {
                const uno = candidatosPago[0]
                if (!textoPago) {
                  toast.error('Escribe el nombre o el DPI')
                  return
                }
                if (!uno) {
                  toast.error('No hay un financiamiento activo con ese nombre o DPI')
                  return
                }
                abrirPago(uno)
                setBusquedaPago(textoPago)
              }}>Buscar financiamiento</Button>
            </div>
            {textoPago && candidatosPago.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {candidatosPago.slice(0, 8).map((f) => (
                  <Button key={f.id} type="button" size="sm" variant={pagoItem?.id === f.id ? 'default' : 'outline'} onClick={() => abrirPago(f)}>
                    {f.nombre}{f.dpi ? ` · ${f.dpi}` : ''} · {f.finca?.nombre}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          {pagoItem && (
          <CardContent className="space-y-4">
            <div className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white">
              {pagoItem.nombre}{pagoItem.dpi ? ` · DPI ${pagoItem.dpi}` : ''} · {pagoItem.finca?.codigo || 'Finca'} {pagoItem.finca?.nombre}
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {[
                ['Código', `FIN-${pagoItem.id}`],
                ['Capital', q(pagoItem.monto)],
                ['Saldo capital', q(pagoItem.saldo_capital)],
                ['Interés', `${pagoItem.tasa_anual ?? 0}%`],
                ['Fecha de desembolso', fecha(pagoItem.fecha_inicio) || '—'],
                ['Saldo interés', q(pagoItem.interes_pendiente)],
                ['Tipo', ESQUEMA[pagoItem.esquema || ''] || pagoItem.tipo],
                ['Período', pagoItem.frecuencia || '—'],
                ['Cuotas', String(pagoItem.numero_cuotas || '—')],
                ['Vencimiento', fecha(pagoItem.fecha_vencimiento) || '—'],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex items-center justify-between rounded-md bg-green-700 px-3 py-2 text-sm text-white">
                  <span>{etiqueta}</span>
                  <strong>{valor}</strong>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Detalle del pago</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>No. recibo</Label>
                  <Input value={recibo} placeholder="Se asigna si lo dejas vacío" onChange={(e) => setRecibo(e.target.value)} />
                </div>
                <div>
                  <Label>Método de pago</Label>
                  <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                    <option value="efectivo">Pago en efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="deposito">Depósito</option>
                  </select>
                </div>
                <div>
                  <Label>Fecha de pago</Label>
                  <Input type="date" value={pagoFecha} onChange={(e) => setPagoFecha(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Concepto</Label>
                <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
              </div>
              <div>
                <Label>Comprobante (opcional)</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="mb-2 font-medium">Pagos pendientes</p>
              <p className="mb-2 text-muted-foreground">{pagoCalc.nota || 'Elige la fecha para calcular la cuota.'}</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <div><span className="text-muted-foreground">Capital</span><div>{q(pagoCalc.capital)}</div></div>
                <div><span className="text-muted-foreground">Interés</span><div>{q(pagoCalc.interes)}</div></div>
                <div><span className="text-muted-foreground">Mora</span><div>{q(pagoCalc.mora)}</div></div>
                <div>
                  <Label>Descuento</Label>
                  <Input type="number" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
                </div>
                <div><span className="text-muted-foreground">Total cuota</span><div className="font-semibold">{q(Math.max(0, totalPagar))}</div></div>
              </div>
            </div>

            <div className="rounded-md bg-blue-600 px-4 py-3 text-white">
              <p className="text-sm">Total a pagar</p>
              <p className="text-2xl font-semibold">{q(Math.max(0, totalPagar))}</p>
            </div>

            {verPlan && (
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Interés</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planFilas.map((fila) => (
                      <TableRow key={fila.numero}>
                        <TableCell>{fila.numero}</TableCell>
                        <TableCell>{fila.fecha}</TableCell>
                        <TableCell>{q(fila.capital)}</TableCell>
                        <TableCell>{q(fila.interes)}</TableCell>
                        <TableCell>{q(fila.total)}</TableCell>
                        <TableCell>{fila.estado}</TableCell>
                      </TableRow>
                    ))}
                    {planFilas.length === 0 && <TableRow><TableCell colSpan={6}>Este financiamiento todavía no tiene plan de cuotas.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button disabled={guardando || totalPagar <= 0} onClick={async () => {
                if (!pagoFecha) return
                try {
                  setGuardando(true)
                  const res = await financistaService.pagar(pagoItem.id, {
                    fecha: pagoFecha,
                    monto_capital: pagoCalc.capital,
                    monto_interes: pagoCalc.interes,
                    monto_mora: pagoCalc.mora,
                    descuento_interes: num(descuento),
                    numero_recibo: recibo,
                    metodo_pago: metodo,
                    concepto,
                    archivo,
                  })
                  await cargar()
                  volver()
                  toast.success(res.message || 'Pago registrado')
                } catch (e: any) {
                  toast.error(e?.message || 'No se pudo pagar')
                } finally {
                  setGuardando(false)
                }
              }}>Pagar</Button>
              <Button type="button" variant="outline" onClick={async () => {
                try {
                  const res = await financistaService.estado(pagoItem.id)
                  setPlanFilas(res.data?.plan || [])
                  setVerPlan(true)
                } catch (e: any) {
                  toast.error(e?.message || 'No se pudo consultar el plan')
                }
              }}>Consultar plan de pago</Button>
              {puedeReportes && (
                <Button type="button" variant="outline" onClick={() => bajar(`/financistas/${pagoItem.id}/reporte?formato=pdf`, `estado-financista-${pagoItem.id}.pdf`)}>Estado de cuenta</Button>
              )}
              <Button type="button" variant="outline" onClick={() => abrirPago(null)}>Cancelar</Button>
              <Button type="button" variant="ghost" onClick={volver}>Salir</Button>
            </div>
          </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
