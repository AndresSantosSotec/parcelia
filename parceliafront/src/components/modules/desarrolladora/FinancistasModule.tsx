import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { api, fincaService, financistaService, type FinancistaItem, type Finca } from '@/lib/api'
import { usePermissions } from '@/hooks/use-permissions'

const q = (n: number | string | null | undefined) =>
  `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fecha = (v?: string | null) => (v ? String(v).slice(0, 10) : '')
const campo = 'mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'

function num(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function FinancistasModule({ userSession }: { userSession?: { userData?: { rol?: string; permisos?: unknown } | null } }) {
  const { hasPermission } = usePermissions(userSession?.userData)
  const puedeEditar = hasPermission('financistas', 'editar')
  const puedePagar = hasPermission('financistas', 'pagar')
  const puedeReportes = hasPermission('financistas', 'reportes')
  const [fincas, setFincas] = useState<Finca[]>([])
  const [items, setItems] = useState<FinancistaItem[]>([])
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState({
    finca_id: '',
    tipo: 'banco',
    nombre: '',
    destino: 'compra',
    monto: '',
    tasa_anual: '',
    interes_total: '',
    plazo: '',
    frecuencia: 'mensual',
    cuota: '',
    fecha_vencimiento: '',
    capital_al_vencimiento: false,
  })
  const [pago, setPago] = useState({ id: 0, fecha: '', capital: '', interes: '', mora: '', descuento: '' })

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

  async function bajar(url: string, nombre: string) {
    try {
      await api.downloadFile(url, nombre)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo descargar')
    }
  }

  const alertas = items.filter((f) => f.alerta_vencimiento)

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Financiamientos</h1>
          <p className="text-sm text-muted-foreground">Préstamos de bancos, cooperativas o particulares ligados a una finca. No aumentan el costo del lote.</p>
        </div>
        {puedeReportes && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/reporte?formato=pdf${filtro ? `&finca_id=${filtro}` : ''}`, 'financiamientos.pdf')}>PDF</Button>
          <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/reporte?formato=xlsx${filtro ? `&finca_id=${filtro}` : ''}`, 'financiamientos.xlsx')}>Excel</Button>
        </div>
        )}
      </div>

      {alertas.length > 0 && (
        <Card className="border-amber-400">
          <CardContent className="py-3 text-sm">
            {alertas.map((f) => (
              <p key={f.id}>{f.nombre} ({f.finca?.nombre}) vence el {fecha(f.fecha_vencimiento)}. Saldo {q(f.saldo_capital)}.</p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Registrados</CardTitle>
          <select className={`${campo} sm:w-64`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas las fincas</option>
            {fincas.map((f) => <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>)}
          </select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Finca</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Interés</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.nombre}{f.alerta_vencimiento && <Badge className="ml-2" variant="destructive">Por vencer</Badge>}</TableCell>
                  <TableCell>{f.finca?.nombre}</TableCell>
                  <TableCell>{f.tipo} · {f.destino} · {f.frecuencia}</TableCell>
                  <TableCell>{q(f.monto)}</TableCell>
                  <TableCell>{q(f.saldo_capital)}</TableCell>
                  <TableCell>{q(f.interes_pendiente)}</TableCell>
                  <TableCell>{fecha(f.fecha_vencimiento)}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/${f.id}/reporte?formato=pdf`, `estado-financista-${f.id}.pdf`)}>PDF</Button>}
                    {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar(`/financistas/${f.id}/reporte?formato=xlsx`, `estado-financista-${f.id}.xlsx`)}>Excel</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={8}>Todavía no hay financiamientos registrados.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {puedeEditar && (
        <Card>
          <CardHeader><CardTitle>Registrar financiamiento</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Finca</Label>
              <select className={campo} value={form.finca_id} onChange={(e) => setForm({ ...form, finca_id: e.target.value })}>
                <option value="">Elegir</option>
                {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label>Tipo</Label>
              <select className={campo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="banco">Banco</option>
                <option value="cooperativa">Cooperativa</option>
                <option value="particular">Particular</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
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
              <Label>Interés total (vacío = se calcula)</Label>
              <Input type="number" value={form.interes_total} onChange={(e) => setForm({ ...form, interes_total: e.target.value })} />
            </div>
            <div>
              <Label>Plazo en meses</Label>
              <Input type="number" value={form.plazo} onChange={(e) => setForm({ ...form, plazo: e.target.value })} />
            </div>
            <div>
              <Label>Forma de pago</Label>
              <select className={campo} value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <Label>Cuota</Label>
              <Input type="number" value={form.cuota} onChange={(e) => setForm({ ...form, cuota: e.target.value })} />
            </div>
            <div>
              <Label>Vencimiento</Label>
              <Input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-3">
              <input type="checkbox" checked={form.capital_al_vencimiento} onChange={(e) => setForm({ ...form, capital_al_vencimiento: e.target.checked })} />
              El capital se paga al vencimiento (el interés se sigue pagando)
            </label>
            <Button onClick={async () => {
              if (!form.finca_id || !form.nombre) {
                toast.error('Elige la finca y el nombre')
                return
              }
              try {
                await financistaService.crear({
                  finca_id: Number(form.finca_id),
                  tipo: form.tipo,
                  nombre: form.nombre,
                  destino: form.destino,
                  monto: num(form.monto),
                  tasa_anual: form.tasa_anual === '' ? null : num(form.tasa_anual),
                  interes_total: form.interes_total === '' ? null : num(form.interes_total),
                  plazo: form.plazo === '' ? null : Number(form.plazo),
                  frecuencia: form.frecuencia,
                  cuota: num(form.cuota),
                  fecha_vencimiento: form.fecha_vencimiento || null,
                  capital_al_vencimiento: form.capital_al_vencimiento,
                })
                setForm({ ...form, nombre: '', monto: '', interes_total: '', cuota: '' })
                await cargar()
                toast.success('Financiamiento registrado')
              } catch (e: any) {
                toast.error(e?.message || 'No se pudo registrar')
              }
            }}>Registrar</Button>
          </CardContent>
        </Card>
      )}

      {puedePagar && (
        <Card>
          <CardHeader><CardTitle>Registrar un pago</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <div>
              <Label>Financiamiento</Label>
              <select className={campo} value={pago.id} onChange={(e) => setPago({ ...pago, id: Number(e.target.value) })}>
                <option value={0}>Elegir</option>
                {items.map((f) => <option key={f.id} value={f.id}>{f.nombre} · {f.finca?.nombre}</option>)}
              </select>
            </div>
            <div><Label>Fecha</Label><Input type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></div>
            <div><Label>Capital</Label><Input type="number" value={pago.capital} onChange={(e) => setPago({ ...pago, capital: e.target.value })} /></div>
            <div><Label>Interés</Label><Input type="number" value={pago.interes} onChange={(e) => setPago({ ...pago, interes: e.target.value })} /></div>
            <div><Label>Mora</Label><Input type="number" value={pago.mora} onChange={(e) => setPago({ ...pago, mora: e.target.value })} /></div>
            <div><Label>Descuento de interés</Label><Input type="number" value={pago.descuento} onChange={(e) => setPago({ ...pago, descuento: e.target.value })} /></div>
            <Button onClick={async () => {
              if (!pago.id) return
              try {
                await financistaService.pagar(pago.id, {
                  fecha: pago.fecha || new Date().toISOString().slice(0, 10),
                  monto_capital: num(pago.capital),
                  monto_interes: num(pago.interes),
                  monto_mora: num(pago.mora),
                  descuento_interes: num(pago.descuento),
                })
                await cargar()
                toast.success('Pago registrado')
              } catch (e: any) {
                toast.error(e?.message || 'No se pudo pagar')
              }
            }}>Guardar pago</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
