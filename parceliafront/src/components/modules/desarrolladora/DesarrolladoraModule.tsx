import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  api,
  compraFincaService,
  fincaService,
  loteService,
  type CompraFincaListado,
  type CompraFincaPayload,
  type Finca,
} from '@/lib/api'
import { usePermissions } from '@/hooks/use-permissions'
import { AccionesRegistro, PaginacionLista } from './AccionesRegistro'
import { SelectorUbicacion } from '@/components/shared/SelectorUbicacion'

const q = (n: number | string | null | undefined) =>
  `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fecha = (v?: string | null) => (v ? String(v).slice(0, 10) : '')

const CATEGORIAS: Record<string, string> = {
  calle: 'Calles / vialidades',
  agua: 'Agua potable',
  energia: 'Energía eléctrica',
  otros: 'Otros',
  tecnico: 'Técnico / diseño',
  legal: 'Legal / trámites',
  infraestructura: 'Infraestructura / obra',
  administrativo: 'Admin / comercialización',
}

const TIPOS_LOTE = ['Comercial', 'Residencial', 'Mixto']

const campoSelect = 'mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'

function num(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function DesarrolladoraModule({ userSession }: { userSession?: { userData?: { rol?: string; permisos?: unknown } | null } }) {
  const { hasPermission } = usePermissions(userSession?.userData as any)
  const puedeCrear = hasPermission('compra_fincas', 'crear')
  const puedeEditar = hasPermission('compra_fincas', 'editar')
  const puedeEliminar = hasPermission('compra_fincas', 'eliminar')
  const puedeReportes = hasPermission('compra_fincas', 'reportes')
  const [vista, setVista] = useState<'lista' | 'ficha'>('lista')
  const [modo, setModo] = useState<'crear' | 'editar' | 'ver'>('ver')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [compras, setCompras] = useState<CompraFincaListado[]>([])
  const [fincas, setFincas] = useState<Finca[]>([])
  const [fincaId, setFincaId] = useState<number | ''>('')
  const formularioEditable = modo === 'ver' ? false : modo === 'crear' ? (puedeCrear || puedeEditar) : puedeEditar
  const [detalle, setDetalle] = useState<CompraFincaPayload | null>(null)
  const [cargando, setCargando] = useState(false)
  const [compra, setCompra] = useState({
    nombre: '',
    vendedor_nombre: '',
    vendedor_dpi: '',
    referencia: '',
    ubicacion: '',
    municipio: '',
    departamento: '',
    precio_compra: '',
    gastos_escrituracion: '',
    tipo_compra: 'pagos',
    enganche: '',
    numero_cuotas: '12',
    frecuencia_pago: 'mensual',
    fecha_inicio_pagos: '',
    porcentaje_utilidad: '30',
    area_negociable_m2: '',
    area_no_negociable_m2: '',
    area_vialidades_m2: '',
    area_verde_m2: '',
    area_tecnica_m2: '',
  })
  const [escritura, setEscritura] = useState({ numero_escritura: '', fecha_escritura: '', area_m2: '' })
  const [archivoEscritura, setArchivoEscritura] = useState<File | null>(null)
  const [gasto, setGasto] = useState({ categoria: 'calle', concepto: '', monto: '', fecha: '' })
  const [medidasFinca, setMedidasFinca] = useState<number | ''>('')
  const [medidas, setMedidas] = useState<Array<{ numero: string; area: string; tipo: string }>>([])
  const [pago, setPago] = useState({ cuotaId: 0, fecha: '', monto: '', origen: 'caja' })
  const [replan, setReplan] = useState({ cuotas: '', fecha: '' })
  const cargarFincas = useCallback(async () => {
    const res = await fincaService.getAll()
    setFincas(res.data || [])
  }, [])

  const cargarCompras = useCallback(async () => {
    const res = await compraFincaService.listar()
    setCompras(res.data || [])
  }, [])

  const cargarDetalle = useCallback(async (id: number) => {
    setCargando(true)
    try {
      const res = await compraFincaService.detalle(id)
      if (!res.data) return
      aplicar(res.data)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cargar la finca')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarFincas().catch(() => toast.error('No se pudieron cargar las fincas'))
    cargarCompras().catch(() => toast.error('No se pudieron cargar las compras'))
  }, [cargarFincas, cargarCompras])

  useEffect(() => {
    if (!fincaId) {
      setDetalle(null)
      return
    }
    cargarDetalle(fincaId)
  }, [fincaId, cargarDetalle])

  function aplicar(data: CompraFincaPayload) {
    setDetalle(data)
    const f = data.finca
    setCompra({
      nombre: f.nombre || '',
      vendedor_nombre: f.vendedor_nombre || '',
      vendedor_dpi: f.vendedor_dpi || '',
      referencia: f.referencia || '',
      ubicacion: f.ubicacion || '',
      municipio: f.municipio || '',
      departamento: f.departamento || '',
      precio_compra: String(f.precio_compra ?? ''),
      gastos_escrituracion: String(f.gastos_escrituracion ?? ''),
      tipo_compra: f.tipo_compra || 'contado',
      enganche: String(f.enganche ?? ''),
      numero_cuotas: String(f.numero_cuotas || 12),
      frecuencia_pago: f.frecuencia_pago || 'mensual',
      fecha_inicio_pagos: fecha(f.fecha_inicio_pagos),
      porcentaje_utilidad: String(f.porcentaje_utilidad ?? 30),
      area_negociable_m2: f.area_negociable_m2 != null ? String(f.area_negociable_m2) : '',
      area_no_negociable_m2: f.area_no_negociable_m2 != null ? String(f.area_no_negociable_m2) : '',
      area_vialidades_m2: f.area_vialidades_m2 != null ? String(f.area_vialidades_m2) : '',
      area_verde_m2: f.area_verde_m2 != null ? String(f.area_verde_m2) : '',
      area_tecnica_m2: f.area_tecnica_m2 != null ? String(f.area_tecnica_m2) : '',
    })
    if (f.id !== medidasFinca) {
      setMedidasFinca(f.id)
      setMedidas((data.lotes || []).map((l) => ({
        numero: l.numero_lote,
        area: String(l.area_m2),
        tipo: l.tipo_terreno || 'Residencial',
      })))
    }
  }

  function datosCompra(regenerar: boolean) {
    return {
        ...compra,
        precio_compra: num(compra.precio_compra),
        gastos_escrituracion: num(compra.gastos_escrituracion),
        enganche: num(compra.enganche),
        numero_cuotas: Number(compra.numero_cuotas) || 0,
        porcentaje_utilidad: num(compra.porcentaje_utilidad),
        area_negociable_m2: compra.area_negociable_m2 === '' ? null : num(compra.area_negociable_m2),
        area_no_negociable_m2: compra.area_no_negociable_m2 === '' ? null : num(compra.area_no_negociable_m2),
        area_vialidades_m2: compra.area_vialidades_m2 === '' ? null : num(compra.area_vialidades_m2),
        area_verde_m2: compra.area_verde_m2 === '' ? null : num(compra.area_verde_m2),
        area_tecnica_m2: compra.area_tecnica_m2 === '' ? null : num(compra.area_tecnica_m2),
        fecha_inicio_pagos: compra.fecha_inicio_pagos || null,
        regenerar_plan: regenerar,
    }
  }

  async function guardar(regenerar: boolean) {
    if (!formularioEditable) return
    if (!fincaId && (!compra.nombre.trim() || !compra.municipio.trim() || !compra.departamento.trim())) {
      toast.error('Escribe el nombre de la finca, el municipio y el departamento.')
      return
    }
    try {
      const res = fincaId
        ? await compraFincaService.guardar(fincaId, datosCompra(regenerar))
        : await compraFincaService.crear(datosCompra(regenerar))
      if (res.data) {
        aplicar(res.data)
        setFincaId(res.data.finca.id)
      }
      if (modo === 'crear' && puedeEditar) setModo('editar')
      await cargarFincas()
      await cargarCompras()
      toast.success(res.message || 'Compra guardada')
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar')
    }
  }

  const cuotaVista = useMemo(() => {
    if (compra.tipo_compra !== 'pagos') return 0
    const n = Number(compra.numero_cuotas) || 0
    if (n < 1) return 0
    return Math.max(0, num(compra.precio_compra) - num(compra.enganche)) / n
  }, [compra])

  async function bajar(url: string, nombre: string) {
    try {
      await api.downloadFile(url, nombre)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo descargar el archivo')
    }
  }

  const resumen = detalle?.resumen
  const comprasVisibles = compras.filter((c) => {
    const texto = busqueda.trim().toLowerCase()
    const coincideTexto = !texto || [c.codigo, c.nombre, c.vendedor_nombre, c.vendedor_dpi, c.municipio, c.departamento, c.estado]
      .some((valor) => String(valor || '').toLowerCase().includes(texto))
    const coincideTipo = !filtroTipo || c.tipo_compra === filtroTipo
    const coincideEstado = !filtroEstado || c.estado === filtroEstado
    return coincideTexto && coincideTipo && coincideEstado
  })
  const paginasCompra = Math.max(1, Math.ceil(comprasVisibles.length / porPagina))
  const paginaCompra = Math.min(pagina, paginasCompra)
  const comprasPagina = comprasVisibles.slice((paginaCompra - 1) * porPagina, paginaCompra * porPagina)
  const fincasParaAlta = fincas.filter((f) => !compras.some((c) => c.id === f.id))

  function abrirCrear() {
    setModo('crear')
    setVista('ficha')
    setFincaId('')
    setDetalle(null)
    setCompra({
      nombre: '',
      vendedor_nombre: '',
      vendedor_dpi: '',
      referencia: '',
      ubicacion: '',
      municipio: '',
      departamento: '',
      precio_compra: '',
      gastos_escrituracion: '',
      tipo_compra: 'pagos',
      enganche: '',
      numero_cuotas: '12',
      frecuencia_pago: 'mensual',
      fecha_inicio_pagos: '',
      porcentaje_utilidad: '30',
      area_negociable_m2: '',
      area_no_negociable_m2: '',
      area_vialidades_m2: '',
      area_verde_m2: '',
      area_tecnica_m2: '',
    })
  }

  function abrirFicha(id: number, siguiente: 'editar' | 'ver') {
    setModo(siguiente)
    setVista('ficha')
    setFincaId(id)
  }

  function volver() {
    setVista('lista')
    setFincaId('')
    setDetalle(null)
    cargarCompras().catch(() => toast.error('No se pudieron cargar las compras'))
  }

  async function eliminarCompra(fila: CompraFincaListado) {
    if (!window.confirm(`Eliminar la compra de ${fila.nombre}? La finca y sus lotes se quedan en el inventario.`)) return
    try {
      const res = await compraFincaService.eliminar(fila.id)
      toast.success(res.message || 'Compra eliminada')
      await cargarCompras()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo eliminar la compra')
    }
  }

  if (vista === 'lista') {
    return (
      <div className="space-y-4 p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Comprar</h1>
            <p className="text-sm text-muted-foreground">Paso 1. Al guardar se crea la finca. Desde Parcelar se divide en lotes y aparecen en Fincas y lotes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/reportes-compra-fincas/listado?formato=pdf', 'reporte-fincas.pdf')}>Listado PDF</Button>}
            {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/reportes-compra-fincas/listado?formato=xlsx', 'reporte-fincas.xlsx')}>Listado Excel</Button>}
            {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/reportes-compra-fincas/cuotas-pendientes?formato=pdf', 'cuotas-pendientes.pdf')}>Cuotas pendientes</Button>}
            {puedeReportes && <Button size="sm" variant="outline" onClick={() => bajar('/reportes-compra-fincas/urbanizacion?formato=pdf', 'urbanizacion.pdf')}>Urbanización</Button>}
            {puedeCrear && <Button size="sm" onClick={abrirCrear}>Nueva compra</Button>}
            <Button size="sm" variant="outline" onClick={() => bajar('/reportes-compra-fincas/requisitos', 'registro-modulos.pdf')}>Registro PDF</Button>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Buscar por código, finca, vendedor o municipio" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }} />
          <select className="flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground" value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1) }}>
            <option value="">Todos los tipos</option>
            <option value="contado">Contado</option>
            <option value="pagos">Por pagos</option>
          </select>
          <select className="flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }}>
            <option value="">Todos los estados</option>
            <option value="Vigente">Vigente</option>
            <option value="Cancelada">Cancelada</option>
            <option value="Sin precio">Sin precio</option>
          </select>
        </div>
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <TablaSimple
              headers={['Código', 'Finca', 'Vendedor', 'Lugar', 'Precio', 'Tipo', 'Pagado', 'Pendiente', 'Escrituras', 'Estado', '']}
              rows={comprasPagina.map((c) => [
                c.codigo,
                c.nombre,
                c.vendedor_nombre || '—',
                [c.municipio, c.departamento].filter(Boolean).join(', ') || '—',
                q(c.precio_compra),
                c.tipo_compra === 'pagos' ? `Pagos · ${c.numero_cuotas}` : 'Contado',
                q(c.pagado),
                q(c.pendiente),
                String(c.escrituras),
                c.estado,
                <AccionesRegistro
                  key={c.id}
                  onVer={() => abrirFicha(c.id, 'ver')}
                  onEditar={puedeEditar ? () => abrirFicha(c.id, 'editar') : undefined}
                  onDescargar={puedeReportes ? () => bajar(`/fincas/${c.id}/reportes/registro`, `registro-${c.codigo}.pdf`) : undefined}
                  onEliminar={puedeEliminar ? () => eliminarCompra(c) : undefined}
                />,
              ])}
            />
            <PaginacionLista
              total={comprasVisibles.length}
              pagina={paginaCompra}
              porPagina={porPagina}
              onPagina={setPagina}
              onPorPagina={(cantidad) => { setPorPagina(cantidad); setPagina(1) }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{modo === 'crear' ? 'Nueva compra' : modo === 'editar' ? 'Editar compra' : 'Detalle de la compra'}</h1>
          <p className="text-sm text-muted-foreground">La finca se crea aquí y queda en Fincas y lotes. Luego se parcela en lotes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={volver}>Volver al listado</Button>
          {puedeReportes && <Button size="sm" variant="outline" disabled={!fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/registro`, `registro-${detalle?.finca.codigo || 'finca'}.pdf`)}>Registro PDF</Button>}
        </div>
      </div>

      {modo === 'ver' && (
        <p className="text-sm text-muted-foreground">Estás consultando la compra. Para cambiarla usa Editar en el listado.</p>
      )}

      {resumen && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Resumen titulo="Inversión" valor={q(resumen.inversion)} nota="Compra + escrituración + urbanización" />
          <Resumen titulo="Costo por m²" valor={q(resumen.costo_m2)} nota={`${resumen.area_negociable_m2} m² negociables`} />
          <Resumen titulo="Precio sugerido / m²" valor={q(resumen.precio_sugerido_m2)} nota={`Utilidad ${resumen.porcentaje_utilidad}%`} />
          <Resumen titulo="Utilidad proyectada" valor={q(resumen.utilidad_proyectada)} nota="Suma de lotes al precio sugerido" />
        </div>
      )}

      <Tabs defaultValue="compra">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="compra">Compra</TabsTrigger>
          <TabsTrigger value="escrituras">Escrituras</TabsTrigger>
          <TabsTrigger value="urbanizacion">Urbanización</TabsTrigger>
          <TabsTrigger value="medidas">Parcelar</TabsTrigger>
          <TabsTrigger value="costeo">Costeo</TabsTrigger>
          <TabsTrigger value="plan">Plan de pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="compra">
          <Card>
            <CardHeader><CardTitle>{modo === 'crear' ? 'Registrar compra' : 'Datos de compra'}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {modo === 'crear' && !fincaId && fincasParaAlta.length > 0 && (
                <div className="md:col-span-2">
                  <Label>Finca que ya existe</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground"
                    value=""
                    onChange={(e) => setFincaId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Crear una finca nueva al guardar</option>
                    {fincasParaAlta.map((f) => (
                      <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-muted-foreground">Si la dejas vacía, al guardar se crea la finca en Fincas y lotes.</p>
                </div>
              )}
              {fincaId && (
                <p className="text-sm md:col-span-2">Finca: <strong>{detalle?.finca.codigo || 'Nueva'} — {compra.nombre || detalle?.finca.nombre}</strong></p>
              )}
              <Campo label="Nombre de la finca" value={compra.nombre} onChange={(v) => setCompra({ ...compra, nombre: v })} disabled={!formularioEditable} />
              <Campo label="Vendedor" value={compra.vendedor_nombre} onChange={(v) => setCompra({ ...compra, vendedor_nombre: v })} disabled={!formularioEditable} />
              <Campo label="DPI del vendedor" value={compra.vendedor_dpi} onChange={(v) => setCompra({ ...compra, vendedor_dpi: v })} disabled={!formularioEditable} />
              <Campo label="Dirección" value={compra.ubicacion} onChange={(v) => setCompra({ ...compra, ubicacion: v })} disabled={!formularioEditable} />
              <SelectorUbicacion
                departamento={compra.departamento}
                municipio={compra.municipio}
                disabled={!formularioEditable}
                onChange={(valor) => setCompra({ ...compra, departamento: valor.departamento, municipio: valor.municipio })}
              />
              <Campo label="Referencia" value={compra.referencia} onChange={(v) => setCompra({ ...compra, referencia: v })} disabled={!formularioEditable} />
              <Campo label="Precio de compra" type="number" value={compra.precio_compra} onChange={(v) => setCompra({ ...compra, precio_compra: v })} disabled={!formularioEditable} />
              <Campo label="Costo de escrituración" type="number" value={compra.gastos_escrituracion} onChange={(v) => setCompra({ ...compra, gastos_escrituracion: v })} disabled={!formularioEditable} />
              <div>
                <Label>Tipo de compra</Label>
                <select className={campoSelect} value={compra.tipo_compra} disabled={!formularioEditable} onChange={(e) => setCompra({ ...compra, tipo_compra: e.target.value })}>
                  <option value="contado">Contado</option>
                  <option value="pagos">Por pagos, sin interés</option>
                </select>
              </div>
              <Campo label="% de utilidad para precio sugerido" type="number" value={compra.porcentaje_utilidad} onChange={(v) => setCompra({ ...compra, porcentaje_utilidad: v })} disabled={!formularioEditable} />
              {compra.tipo_compra === 'pagos' && (
                <>
                  <Campo label="Enganche" type="number" value={compra.enganche} onChange={(v) => setCompra({ ...compra, enganche: v })} disabled={!formularioEditable} />
                  <Campo label="Número de cuotas" type="number" value={compra.numero_cuotas} onChange={(v) => setCompra({ ...compra, numero_cuotas: v })} disabled={!formularioEditable} />
                  <div>
                    <Label>Frecuencia</Label>
                    <select className={campoSelect} value={compra.frecuencia_pago} disabled={!formularioEditable} onChange={(e) => setCompra({ ...compra, frecuencia_pago: e.target.value })}>
                      <option value="mensual">Mensual</option>
                      <option value="bimensual">Bimensual</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <Campo label="Inicio de pagos" type="date" value={compra.fecha_inicio_pagos} onChange={(v) => setCompra({ ...compra, fecha_inicio_pagos: v })} disabled={!formularioEditable} />
                  <p className="text-sm md:col-span-2">Cuota calculada: <strong>{q(cuotaVista)}</strong>. El saldo es precio menos enganche, sin interés.</p>
                </>
              )}
              <Campo label="m² negociables (lotes)" type="number" value={compra.area_negociable_m2} onChange={(v) => setCompra({ ...compra, area_negociable_m2: v })} disabled={!formularioEditable} />
              <Campo label="m² no negociables" type="number" value={compra.area_no_negociable_m2} onChange={(v) => setCompra({ ...compra, area_no_negociable_m2: v })} disabled={!formularioEditable} />
              <p className="text-sm text-muted-foreground md:col-span-2">Calles, área verde y área técnica no entran al costo por metro. Si dejas los m² negociables vacíos, se usa la suma de los lotes.</p>
              {formularioEditable && (
                <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
                  <Button disabled={cargando} onClick={() => guardar(false)}>Guardar</Button>
                  <Button variant="outline" disabled={cargando} onClick={() => guardar(true)}>Guardar y rehacer plan</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escrituras">
          <Card>
            <CardHeader><CardTitle>Escrituras registradas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <TablaSimple
                headers={['Número', 'Fecha', 'm²', 'Documento', '']}
                rows={(detalle?.finca.escrituras || []).map((e) => [
                  e.numero_escritura,
                  fecha(e.fecha_escritura),
                  String(e.area_m2),
                  e.documento_nombre
                    ? <Button key={'doc'+e.id} size="sm" variant="outline" onClick={() => bajar(`/fincas/${fincaId}/escrituras/${e.id}/documento`, e.documento_nombre || 'escritura')}>{e.documento_nombre}</Button>
                    : (formularioEditable ? <input key={'up'+e.id} type="file" className="text-xs" onChange={async (ev) => {
                        const file = ev.target.files?.[0]
                        if (!file || !fincaId) return
                        try {
                          const res = await compraFincaService.adjuntarDocumento(fincaId, e.id, file)
                          if (res.data) aplicar(res.data)
                        } catch (err: any) { toast.error(err?.message || 'No se pudo adjuntar') }
                      }} /> : '—'),
                  formularioEditable ? <Button key={e.id} size="sm" variant="ghost" onClick={async () => {
                    if (!fincaId) return
                    const res = await compraFincaService.eliminarEscritura(fincaId, e.id)
                    if (res.data) aplicar(res.data)
                  }}>Quitar</Button> : '',
                ])}
              />
              <p className="text-sm">Área total por escrituras: <strong>{resumen?.area_escrituras ?? 0} m²</strong></p>
              {formularioEditable && (
                <div className="grid gap-3 md:grid-cols-5">
                  <Campo label="Número" value={escritura.numero_escritura} onChange={(v) => setEscritura({ ...escritura, numero_escritura: v })} />
                  <Campo label="Fecha" type="date" value={escritura.fecha_escritura} onChange={(v) => setEscritura({ ...escritura, fecha_escritura: v })} />
                  <Campo label="m²" type="number" value={escritura.area_m2} onChange={(v) => setEscritura({ ...escritura, area_m2: v })} />
                  <div>
                    <Label>Documento</Label>
                    <Input className="mt-1" type="file" onChange={(ev) => setArchivoEscritura(ev.target.files?.[0] || null)} />
                  </div>
                  <div className="flex items-end">
                    <Button disabled={!fincaId} onClick={async () => {
                      if (!fincaId) return
                      try {
                        const res = await compraFincaService.agregarEscritura(fincaId, {
                          numero_escritura: escritura.numero_escritura,
                          fecha_escritura: escritura.fecha_escritura || undefined,
                          area_m2: num(escritura.area_m2),
                        }, archivoEscritura)
                        if (res.data) aplicar(res.data)
                        setEscritura({ numero_escritura: '', fecha_escritura: '', area_m2: '' })
                        setArchivoEscritura(null)
                      } catch (e: any) { toast.error(e?.message || 'No se pudo agregar') }
                    }}>Agregar</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urbanizacion">
          <Card>
            <CardHeader><CardTitle>Gastos reales de urbanización</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Campo label="m² lotificados (venta)" type="number" value={compra.area_negociable_m2} onChange={(v) => setCompra({ ...compra, area_negociable_m2: v })} disabled={!formularioEditable} />
                <Campo label="Circulación y vialidades m²" type="number" value={compra.area_vialidades_m2} onChange={(v) => setCompra({ ...compra, area_vialidades_m2: v })} disabled={!formularioEditable} />
                <Campo label="Área verde m²" type="number" value={compra.area_verde_m2} onChange={(v) => setCompra({ ...compra, area_verde_m2: v })} disabled={!formularioEditable} />
                <Campo label="Área técnica m²" type="number" value={compra.area_tecnica_m2} onChange={(v) => setCompra({ ...compra, area_tecnica_m2: v })} disabled={!formularioEditable} />
                <p className="text-sm md:col-span-2">
                  Escrituras {resumen?.area_escrituras ?? 0} m² · lotificado {num(compra.area_negociable_m2)} m² · sin lotificar {num(compra.area_vialidades_m2) + num(compra.area_verde_m2) + num(compra.area_tecnica_m2)} m².
                  El costo usa solo el área lotificada. Inversión {q(resumen?.inversion)} = precio {q(resumen?.precio_compra)} + escrituración {q(resumen?.gastos_escrituracion)} + urbanización {q(resumen?.urbanizacion)}.
                </p>
              </div>
              {formularioEditable && <Button disabled={!fincaId} onClick={() => guardar(false)}>Guardar áreas</Button>}
              <TablaSimple
                headers={['Categoría', 'Concepto', 'Fecha', 'Monto', '']}
                rows={(detalle?.finca.gastos_urbanizacion || []).map((g) => [
                  CATEGORIAS[g.categoria] || g.categoria,
                  g.concepto,
                  fecha(g.fecha),
                  q(g.monto),
                  formularioEditable ? <Button key={g.id} size="sm" variant="ghost" onClick={async () => {
                    if (!fincaId) return
                    const res = await compraFincaService.eliminarGasto(fincaId, g.id)
                    if (res.data) aplicar(res.data)
                  }}>Quitar</Button> : '',
                ])}
              />
              {formularioEditable && (
                <div className="grid gap-3 md:grid-cols-5">
                  <div>
                    <Label>Categoría</Label>
                    <select className={campoSelect} value={gasto.categoria} onChange={(e) => setGasto({ ...gasto, categoria: e.target.value })}>
                      {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <Campo label="Concepto" value={gasto.concepto} onChange={(v) => setGasto({ ...gasto, concepto: v })} />
                  <Campo label="Monto" type="number" value={gasto.monto} onChange={(v) => setGasto({ ...gasto, monto: v })} />
                  <Campo label="Fecha" type="date" value={gasto.fecha} onChange={(v) => setGasto({ ...gasto, fecha: v })} />
                  <div className="flex items-end">
                    <Button disabled={!fincaId} onClick={async () => {
                      if (!fincaId) return
                      try {
                        const res = await compraFincaService.agregarGasto(fincaId, {
                          categoria: gasto.categoria,
                          concepto: gasto.concepto,
                          monto: num(gasto.monto),
                          fecha: gasto.fecha || undefined,
                        })
                        if (res.data) aplicar(res.data)
                        setGasto({ ...gasto, concepto: '', monto: '' })
                      } catch (e: any) { toast.error(e?.message || 'No se pudo agregar') }
                    }}>Agregar</Button>
                  </div>
                </div>
              )}
              <p className="text-sm">Total urbanización: <strong>{q(resumen?.urbanizacion)}</strong>. Se reparte solo entre los metros negociables.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medidas">
          <Card>
            <CardHeader><CardTitle>Parcelar en lotes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!fincaId && <p className="text-sm text-muted-foreground">Guarda la compra primero. Con eso se crea la finca y aquí puedes dividirla en lotes.</p>}
              <p className="text-sm text-muted-foreground">Cada fila crea o actualiza un lote. Al guardarlos quedan en Fincas y lotes, listos para la venta. El precio de venta no se cambia aquí.</p>
              {medidas.map((fila, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-4">
                  <Input value={fila.numero} placeholder="Número" onChange={(e) => setMedidas(medidas.map((m, j) => j === i ? { ...m, numero: e.target.value } : m))} />
                  <Input type="number" value={fila.area} placeholder="m²" onChange={(e) => setMedidas(medidas.map((m, j) => j === i ? { ...m, area: e.target.value } : m))} />
                  <select className={campoSelect} value={fila.tipo} onChange={(e) => setMedidas(medidas.map((m, j) => j === i ? { ...m, tipo: e.target.value } : m))}>
                    {TIPOS_LOTE.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <Button variant="ghost" onClick={() => setMedidas(medidas.filter((_, j) => j !== i))}>Quitar</Button>
                </div>
              ))}
              {formularioEditable && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setMedidas([...medidas, { numero: String(medidas.length + 1), area: '', tipo: 'Residencial' }])}>Agregar lote</Button>
                  <Button disabled={!fincaId} onClick={async () => {
                    if (!fincaId) return
                    try {
                      const res = await compraFincaService.sincronizarLotes(fincaId, medidas.filter((m) => m.numero && num(m.area) > 0).map((m) => ({
                        numero: m.numero,
                        area_m2: num(m.area),
                        tipo: m.tipo,
                      })))
                      if (res.data) {
                        aplicar(res.data)
                        setMedidasFinca(res.data.finca.id)
                        setMedidas((res.data.lotes || []).map((l) => ({
                          numero: l.numero_lote,
                          area: String(l.area_m2),
                          tipo: l.tipo_terreno || 'Residencial',
                        })))
                      }
                      toast.success(res.message || 'Lotes actualizados')
                    } catch (e: any) { toast.error(e?.message || 'No se pudieron crear los lotes') }
                  }}>Crear lotes en Fincas y lotes</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costeo">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Costo y precio sugerido por lote</CardTitle>
              <div className="flex flex-wrap gap-2">
                {puedeReportes && <Button size="sm" variant="outline" disabled={!fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/costeo?formato=pdf`, 'costeo.pdf')}>PDF</Button>}
                {puedeReportes && <Button size="sm" variant="outline" disabled={!fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/costeo?formato=xlsx`, 'costeo.xlsx')}>Excel</Button>}
              {formularioEditable && (
                <Button variant="outline" disabled={!fincaId} onClick={async () => {
                  if (!fincaId || !confirm('Esto reemplaza el precio de venta de cada lote por el precio sugerido.')) return
                  const res = await compraFincaService.aplicarPrecios(fincaId)
                  if (res.data) aplicar(res.data)
                  toast.success(res.message || 'Precios aplicados')
                }}>Usar precio sugerido como venta</Button>
              )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>m²</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Sugerido</TableHead>
                    <TableHead>Utilidad</TableHead>
                    <TableHead>Precio venta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detalle?.lotes || []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.codigo_unico}<div className="text-xs text-muted-foreground">{l.parcela}</div></TableCell>
                      <TableCell>
                        {formularioEditable ? (
                          <select className="h-8 rounded-md border border-input bg-popover px-2 text-sm text-popover-foreground" value={l.tipo_terreno || 'Residencial'} onChange={async (e) => {
                            await loteService.update(l.id, { tipo_terreno: e.target.value })
                            if (fincaId) cargarDetalle(fincaId)
                          }}>
                            {TIPOS_LOTE.map((t) => <option key={t}>{t}</option>)}
                            {l.tipo_terreno && !TIPOS_LOTE.includes(l.tipo_terreno) && <option>{l.tipo_terreno}</option>}
                          </select>
                        ) : l.tipo_terreno}
                      </TableCell>
                      <TableCell>{l.area_m2}</TableCell>
                      <TableCell>{q(l.costo_asignado)}</TableCell>
                      <TableCell>{q(l.precio_sugerido)}</TableCell>
                      <TableCell>{q(l.utilidad)}</TableCell>
                      <TableCell>{q(l.precio_venta)}<div className="text-xs text-muted-foreground">Margen actual {q(l.utilidad_venta)}</div></TableCell>
                    </TableRow>
                  ))}
                  {(detalle?.lotes || []).length === 0 && (
                    <TableRow><TableCell colSpan={7}>Esta finca todavía no tiene lotes. Créalos en Fincas y lotes.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Plan de la compra al vendedor</CardTitle>
              <div className="flex flex-wrap gap-2">
                {puedeReportes && <Button size="sm" variant="outline" disabled={!detalle || !fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/plan-compra?formato=pdf`, `plan-compra-${detalle?.finca.codigo}.pdf`)}>Plan PDF</Button>}
                {puedeReportes && <Button size="sm" variant="outline" disabled={!detalle || !fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/plan-compra?formato=xlsx`, `plan-compra-${detalle?.finca.codigo}.xlsx`)}>Plan Excel</Button>}
                {puedeReportes && <Button size="sm" variant="outline" disabled={!fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/estado-compra`, `estado-compra-${detalle?.finca.codigo}.pdf`)}>Estado de cuenta</Button>}
                {puedeReportes && <Button size="sm" variant="outline" disabled={!fincaId} onClick={() => bajar(`/fincas/${fincaId}/reportes/contrato-compra`, `contrato-compra-${detalle?.finca.codigo}.pdf`)}>Contrato</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumen?.deuda && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Resumen titulo="Deuda" valor={q(resumen.deuda.precio)} nota={`Enganche pactado ${q(resumen.deuda.enganche)}`} />
                  <Resumen titulo="Pagado" valor={q(resumen.deuda.pagado)} nota={`${resumen.deuda.cuotas_pagadas} cuotas liquidadas`} />
                  <Resumen titulo="Pendiente" valor={q(resumen.deuda.pendiente)} nota={`${resumen.deuda.cuotas_pendientes} cuotas por pagar`} />
                  <Resumen titulo="Próxima cuota" valor={q(resumen.deuda.cuota_proxima)} nota={resumen.deuda.fecha_proxima ? `Vence ${fecha(resumen.deuda.fecha_proxima)}` : 'Sin cuota abierta'} />
                </div>
              )}
              {resumen?.deuda && !resumen.deuda.cuadra && (
                <p className="text-sm text-amber-700 dark:text-amber-300">Las cuotas abiertas suman {q(resumen.deuda.saldo_plan)} y el estado de cuenta marca {q(resumen.deuda.pendiente)}. Rehace solo las cuotas sin abono para que cuadren.</p>
              )}
              {resumen?.deuda && resumen.deuda.cuadra && resumen.deuda.pendiente > 0 && (
                <p className="text-sm">El plan cuadra con el estado de cuenta: quedan {q(resumen.deuda.pendiente)} en {resumen.deuda.cuotas_pendientes} cuotas.</p>
              )}
              {resumen?.deuda && resumen.deuda.pendiente <= 0 && resumen.deuda.precio > 0 && (
                <p className="text-sm">La deuda de la finca está cubierta según el estado de cuenta.</p>
              )}
              {formularioEditable && detalle?.finca.tipo_compra === 'pagos' && resumen?.deuda && resumen.deuda.pendiente > 0 && (
                <div className="grid gap-3 md:grid-cols-4">
                  <Campo label="Cuotas para el pendiente" type="number" value={replan.cuotas} onChange={(v) => setReplan({ ...replan, cuotas: v })} />
                  <Campo label="Primera cuota nueva" type="date" value={replan.fecha} onChange={(v) => setReplan({ ...replan, fecha: v })} />
                  <p className="text-sm md:col-span-2">
                    {num(replan.cuotas) > 0
                      ? `El pendiente ${q(resumen.deuda.pendiente)} se pagaría en ${num(replan.cuotas)} cuotas de aproximadamente ${q(resumen.deuda.pendiente / num(replan.cuotas))}, sin interés. Las cuotas que ya tienen abono se quedan.`
                      : 'Indica en cuántas cuotas se va a pagar el saldo del estado de cuenta.'}
                  </p>
                  <Button disabled={!fincaId || num(replan.cuotas) < 1} onClick={async () => {
                    if (!fincaId) return
                    try {
                      const res = await compraFincaService.rehacerPendiente(fincaId, {
                        cuotas: num(replan.cuotas),
                        fecha_inicio: replan.fecha || undefined,
                      })
                      if (res.data) aplicar(res.data)
                      toast.success(res.message || 'Plan actualizado')
                    } catch (e: any) { toast.error(e?.message || 'No se pudo rehacer el plan') }
                  }}>Calcular cuotas del pendiente</Button>
                </div>
              )}
              {(detalle?.finca.pagos_compra || []).length > 0 && (
                <TablaSimple
                  headers={['Recibo', 'Fecha', 'Origen', 'Monto']}
                  rows={(detalle?.finca.pagos_compra || []).map((p) => [
                    p.numero_recibo,
                    fecha(p.fecha),
                    p.origen === 'boveda' ? 'Bóveda' : 'Caja',
                    q(p.monto),
                  ])}
                />
              )}
              <TablaSimple
                headers={['#', 'Vencimiento', 'Cuota', 'Pagado', 'Estado']}
                rows={(detalle?.finca.cuotas_compra || []).slice().sort((a, b) => a.numero_cuota - b.numero_cuota).map((c) => [
                  String(c.numero_cuota),
                  fecha(c.fecha_vencimiento),
                  q(c.monto),
                  q(c.monto_pagado),
                  c.estado,
                ])}
              />
              {formularioEditable && (
                <div className="grid gap-3 md:grid-cols-5">
                  <div>
                    <Label>Cuota</Label>
                    <select className={campoSelect} value={pago.cuotaId} onChange={(e) => {
                      const id = Number(e.target.value)
                      const cuota = (detalle?.finca.cuotas_compra || []).find((c) => c.id === id)
                      const pendiente = cuota ? Number(cuota.monto) - Number(cuota.monto_pagado) : 0
                      setPago({ ...pago, cuotaId: id, monto: pendiente > 0 ? pendiente.toFixed(2) : '' })
                    }}>
                      <option value={0}>Elegir</option>
                      {(detalle?.finca.cuotas_compra || []).filter((c) => c.estado !== 'pagada').map((c) => (
                        <option key={c.id} value={c.id}>Cuota {c.numero_cuota} · pendiente {q(Number(c.monto) - Number(c.monto_pagado))}</option>
                      ))}
                    </select>
                  </div>
                  <Campo label="Fecha" type="date" value={pago.fecha} onChange={(v) => setPago({ ...pago, fecha: v })} />
                  <Campo label="Cantidad" type="number" value={pago.monto} onChange={(v) => setPago({ ...pago, monto: v })} />
                  <div>
                    <Label>Sale de</Label>
                    <select className={campoSelect} value={pago.origen} onChange={(e) => setPago({ ...pago, origen: e.target.value })}>
                      <option value="caja">Caja</option>
                      <option value="boveda">Bóveda</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button disabled={!fincaId || !pago.cuotaId} onClick={async () => {
                      if (!fincaId || !pago.cuotaId) return
                      try {
                        const res = await compraFincaService.pagarCuota(fincaId, pago.cuotaId, {
                          monto: num(pago.monto),
                          fecha: pago.fecha || undefined,
                          origen: pago.origen as 'caja' | 'boveda',
                        })
                        if (res.data) aplicar(res.data)
                        if (puedeReportes && res.data?.pago_id) {
                          await bajar(`/fincas/${fincaId}/pagos-compra/${res.data.pago_id}/recibo`, `recibo-compra-${res.data.pago_id}.pdf`)
                        }
                        toast.success(res.message || 'Pago registrado')
                      } catch (e: any) { toast.error(e?.message || 'No se pudo abonar') }
                    }}>Registrar y recibo</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

function Resumen({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="text-xl font-semibold">{valor}</p>
        <p className="text-xs text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
  )
}

function Campo({ label, value, onChange, type = 'text', disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function TablaSimple({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>{headers.map((h, i) => <TableHead key={`${h}-${i}`} className={i === headers.length - 1 ? 'w-px' : undefined}>{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={headers.length}>Sin registros</TableCell></TableRow>}
        {rows.map((row, i) => (
          <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className={j === row.length - 1 ? 'w-px whitespace-nowrap text-right' : undefined}>{cell}</TableCell>)}</TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
