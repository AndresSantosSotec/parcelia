import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AvisoCaja, useCajaOperable } from '@/components/shared/AvisoCaja'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Pencil,
  Trash,
  ArrowDown,
  ArrowUp,
  Receipt,
  CurrencyDollar,
  Tag,
  ArrowsClockwise,
  Warning,
  CheckCircle,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { otrosGastosService } from '@/services/otrosGastos.service'
import { contabilidadService } from '@/services/contabilidad.service'
import type {
  OtroGastoTipo,
  OtroGastoMovimiento,
  CrearTipoDTO,
  CrearMovimientoDTO,
  TipoMovimiento,
} from '@/types/otrosGastos.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoneda(v: number) {
  return `Q ${Number(v).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

// ─── Componente principal ─────────────────────────────────────────────────────

export function OtrosGastosModule() {
  const { abierta: cajaAbierta } = useCajaOperable()
  const now = new Date()
  const [tab, setTab] = useState<'movimientos' | 'catalogo'>('movimientos')

  // ── Filtros de mes ────────────────────────────────────────────────────────
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  const irMesAnterior = () => {
    if (mes === 1) { setMes(12); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }
  const irMesSiguiente = () => {
    const hoy = new Date()
    if (anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1)) return
    if (mes === 12) { setMes(1); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  // ── Movimientos ───────────────────────────────────────────────────────────
  const [movimientos, setMovimientos] = useState<OtroGastoMovimiento[]>([])
  const [loadingMovs, setLoadingMovs] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalMovs, setTotalMovs] = useState(0)
  const [totales, setTotales] = useState({ total_ingresos: 0, total_egresos: 0, total_registros: 0 })
  const [filtroTipoMov, setFiltroTipoMov] = useState<'todos' | TipoMovimiento>('todos')
  const [buscarMov, setBuscarMov] = useState('')

  // ── Tipos (catálogo) ──────────────────────────────────────────────────────
  const [tipos, setTipos] = useState<OtroGastoTipo[]>([])
  const [loadingTipos, setLoadingTipos] = useState(false)

  // ── Diálogo: nuevo movimiento ─────────────────────────────────────────────
  const [dlgMovimiento, setDlgMovimiento] = useState(false)
  const [guardandoMov, setGuardandoMov] = useState(false)
  const [formMov, setFormMov] = useState<{
    otro_gasto_tipo_id: string
    monto: string
    concepto: string
    descripcion: string
    fecha: string
    numero_recibo: string
    forma_pago: string
  }>({
    otro_gasto_tipo_id: '',
    monto: '',
    concepto: '',
    descripcion: '',
    fecha: format(now, 'yyyy-MM-dd'),
    numero_recibo: '',
    forma_pago: 'efectivo',
  })

  // Cuando se selecciona un tipo, auto-completar concepto
  const tipoMovSeleccionado = useMemo(
    () => tipos.find(t => String(t.id) === formMov.otro_gasto_tipo_id),
    [tipos, formMov.otro_gasto_tipo_id]
  )

  useEffect(() => {
    if (tipoMovSeleccionado && !formMov.concepto) {
      setFormMov(f => ({ ...f, concepto: tipoMovSeleccionado.nombre }))
    }
  }, [tipoMovSeleccionado]) // eslint-disable-line

  // ── Diálogo: nuevo/editar tipo ────────────────────────────────────────────
  const [dlgTipo, setDlgTipo] = useState(false)
  const [tipoEditando, setTipoEditando] = useState<OtroGastoTipo | null>(null)
  const [guardandoTipo, setGuardandoTipo] = useState(false)
  const [cuentasContables, setCuentasContables] = useState<Array<{ id: number; codigo_cuenta: string; nombre_cuenta: string }>>([])
  const [loadingCuentas, setLoadingCuentas] = useState(false)
  const [formTipo, setFormTipo] = useState<CrearTipoDTO & { activo: boolean }>({
    nombre: '',
    tipo: 'egreso',
    nomenclatura: '',
    tipo_linea: 'servicio',
    descripcion: '',
    activo: true,
  })

  // ── Anular movimiento ─────────────────────────────────────────────────────
  const [anulando, setAnulando] = useState<OtroGastoMovimiento | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  // ─────────────────────────────────────────────────────────────────────────

  const cargarTipos = useCallback(async () => {
    setLoadingTipos(true)
    try {
      const res = await otrosGastosService.listarTipos({ all: true, activos: false })
      setTipos(res.data)
    } catch {
      toast.error('Error cargando tipos de gasto')
    } finally {
      setLoadingTipos(false)
    }
  }, [])

  const cargarMovimientos = useCallback(async () => {
    setLoadingMovs(true)
    try {
      const res = await otrosGastosService.listarMovimientos({
        mes,
        anio,
        page: pagina,
        per_page: 15,
        tipo: filtroTipoMov === 'todos' ? undefined : filtroTipoMov,
      })
      setMovimientos(res.data)
      setTotalPaginas(res.meta.last_page)
      setTotalMovs(res.meta.total)
      setTotales(res.totales ?? { total_ingresos: 0, total_egresos: 0, total_registros: 0 })
    } catch {
      toast.error('Error cargando movimientos')
    } finally {
      setLoadingMovs(false)
    }
  }, [mes, anio, pagina, filtroTipoMov])

  useEffect(() => { cargarTipos() }, [cargarTipos])
  useEffect(() => { setPagina(1) }, [mes, anio, filtroTipoMov])
  useEffect(() => { cargarMovimientos() }, [cargarMovimientos])

  // ── Guardar movimiento ────────────────────────────────────────────────────
  const handleGuardarMovimiento = async () => {
    if (!formMov.otro_gasto_tipo_id) { toast.error('Selecciona el tipo de gasto'); return }
    if (!formMov.monto || Number(formMov.monto) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (!formMov.concepto.trim()) { toast.error('Ingresa un concepto'); return }

    setGuardandoMov(true)
    try {
      const payload: CrearMovimientoDTO = {
        otro_gasto_tipo_id: Number(formMov.otro_gasto_tipo_id),
        monto: Number(formMov.monto),
        concepto: formMov.concepto,
        descripcion: formMov.descripcion || undefined,
        fecha: formMov.fecha || undefined,
        numero_recibo: formMov.numero_recibo || undefined,
        forma_pago: formMov.forma_pago as any,
      }
      const res = await otrosGastosService.registrarMovimiento(payload)
      toast.success(res.message)
      if (res.aplico_en_caja) toast.info('El movimiento fue aplicado a tu caja abierta')
      setDlgMovimiento(false)
      resetFormMov()
      cargarMovimientos()
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar')
    } finally {
      setGuardandoMov(false)
    }
  }

  const resetFormMov = () => setFormMov({
    otro_gasto_tipo_id: '',
    monto: '',
    concepto: '',
    descripcion: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    numero_recibo: '',
    forma_pago: 'efectivo',
  })

  // ── Anular ────────────────────────────────────────────────────────────────
  const handleAnular = async () => {
    if (!anulando || !motivoAnulacion.trim()) return
    try {
      const res = await otrosGastosService.anularMovimiento(anulando.id, motivoAnulacion)
      toast.success(res.message)
      setAnulando(null)
      setMotivoAnulacion('')
      cargarMovimientos()
    } catch (e: any) {
      toast.error(e.message || 'Error al anular')
    }
  }

  // ── Guardar tipo ──────────────────────────────────────────────────────────
  const handleGuardarTipo = async () => {
    if (!formTipo.nombre.trim()) { toast.error('Ingresa el nombre'); return }
    setGuardandoTipo(true)
    try {
      if (tipoEditando) {
        await otrosGastosService.actualizarTipo(tipoEditando.id, formTipo)
        toast.success('Tipo actualizado')
      } else {
        await otrosGastosService.crearTipo(formTipo)
        toast.success('Tipo creado')
      }
      setDlgTipo(false)
      cargarTipos()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setGuardandoTipo(false)
    }
  }

  const cargarCuentasContables = useCallback(async () => {
    setLoadingCuentas(true)
    try {
      const res = await contabilidadService.getCuentas({
        per_page: 500,
      }) as { data?: Array<{ id: number; codigo_cuenta: string; nombre_cuenta: string }> }
      const list = Array.isArray(res?.data) ? res.data : (res as any)?.data?.data ?? []
      setCuentasContables(list)
    } catch {
      setCuentasContables([])
    } finally {
      setLoadingCuentas(false)
    }
  }, [])

  const abrirEditarTipo = (t: OtroGastoTipo) => {
    setTipoEditando(t)
    setFormTipo({
      nombre: t.nombre,
      tipo: t.tipo,
      nomenclatura: t.nomenclatura ?? '',
      tipo_linea: t.tipo_linea,
      descripcion: t.descripcion ?? '',
      activo: t.activo,
    })
    setDlgTipo(true)
    cargarCuentasContables()
  }

  const abrirNuevoTipo = () => {
    setTipoEditando(null)
    setFormTipo({ nombre: '', tipo: 'egreso', nomenclatura: '', tipo_linea: 'servicio', descripcion: '', activo: true })
    setDlgTipo(true)
    cargarCuentasContables()
  }

  // ── Filtrar movimientos por búsqueda local ────────────────────────────────
  const movsFiltrados = useMemo(() => {
    const q = buscarMov.toLowerCase().trim()
    if (!q) return movimientos
    return movimientos.filter(m =>
      m.concepto.toLowerCase().includes(q) ||
      m.tipo_gasto?.nombre.toLowerCase().includes(q) ||
      (m.numero_recibo ?? '').toLowerCase().includes(q)
    )
  }, [movimientos, buscarMov])

  // ─────────────────────────────────────────────────────────────────────────

  const netBalance = totales.total_ingresos - totales.total_egresos

  return (
    <div className="space-y-4 p-1">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Otros ingresos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingresos y egresos adicionales que afectan la caja diaria, sin lote ni contrato.
          </p>
          <AvisoCaja abierta={cajaAbierta} />
        </div>
        <Button onClick={() => setDlgMovimiento(true)} disabled={cajaAbierta !== true} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Registrar Movimiento
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="movimientos" className="flex items-center gap-1.5">
            <CurrencyDollar className="h-4 w-4" />Movimientos
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" />Catálogo de Tipos
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: MOVIMIENTOS ─────────────────────────────────────────────── */}
        <TabsContent value="movimientos" className="space-y-4 mt-4">
          {/* Navegador de mes */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={irMesAnterior}>
                <CaretLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-semibold min-w-[130px] text-center">
                {MESES[mes - 1]} {anio}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={irMesSiguiente}>
                <CaretRight className="h-4 w-4" />
              </Button>
            </div>

            <Select value={filtroTipoMov} onValueChange={(v) => setFiltroTipoMov(v as any)}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ingreso">Solo Ingresos</SelectItem>
                <SelectItem value="egreso">Solo Egresos</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[180px]">
              <MagnifyingGlass className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar concepto..."
                value={buscarMov}
                onChange={(e) => setBuscarMov(e.target.value)}
                className="pl-8 h-9"
              />
              {buscarMov && (
                <button onClick={() => setBuscarMov('')} className="absolute right-2.5 top-2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <Button variant="outline" size="icon" className="h-9 w-9" onClick={cargarMovimientos}>
              <ArrowsClockwise className={`h-4 w-4 ${loadingMovs ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Ingresos</p>
                <p className="text-xl font-bold text-green-600">{formatMoneda(totales.total_ingresos)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Egresos</p>
                <p className="text-xl font-bold text-red-600">{formatMoneda(totales.total_egresos)}</p>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${netBalance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance Neto</p>
                <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatMoneda(netBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de movimientos */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {totalMovs} movimiento{totalMovs !== 1 ? 's' : ''} en {MESES[mes - 1]} {anio}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[100px]">Fecha</TableHead>
                    <TableHead>Concepto / Tipo</TableHead>
                    <TableHead>Forma de Pago</TableHead>
                    <TableHead>Recibo</TableHead>
                    <TableHead className="text-right">Ingreso</TableHead>
                    <TableHead className="text-right">Egreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMovs ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted animate-pulse rounded" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : movsFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        <CalendarBlank className="mx-auto h-8 w-8 mb-2 opacity-30" />
                        <p>Sin movimientos para {MESES[mes - 1]} {anio}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movsFiltrados.map((mov) => {
                      const fechaVal = mov.fecha ? (mov.fecha.includes('T') ? mov.fecha : mov.fecha + 'T00:00:00') : null
                      const fechaDate = fechaVal ? new Date(fechaVal) : null
                      const fechaFormateada = fechaDate && !Number.isNaN(fechaDate.getTime())
                        ? format(fechaDate, 'dd/MM/yyyy', { locale: es })
                        : '—'
                      return (
                      <TableRow key={mov.id} className={mov.estado === 'anulado' ? 'opacity-50' : ''}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {fechaFormateada}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{mov.concepto}</p>
                          <p className="text-xs text-muted-foreground">{mov.tipo_gasto?.nombre}</p>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{mov.forma_pago}</TableCell>
                        <TableCell className="text-sm">{mov.numero_recibo ?? '—'}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {mov.tipo === 'ingreso' ? formatMoneda(mov.monto) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {mov.tipo === 'egreso' ? formatMoneda(mov.monto) : '—'}
                        </TableCell>
                        <TableCell>
                          {mov.estado === 'aplicado' ? (
                            <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />Aplicado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-400 text-red-500 text-xs">
                              <Warning className="h-3 w-3 mr-1" />Anulado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {mov.estado === 'aplicado' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => { setAnulando(mov); setMotivoAnulacion('') }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Página {pagina} de {totalPaginas}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>
                    <CaretLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>
                    <CaretRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB: CATÁLOGO ─────────────────────────────────────────────────── */}
        <TabsContent value="catalogo" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-base">Tipos de Gasto</CardTitle>
              <Button size="sm" onClick={abrirNuevoTipo}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo Tipo
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nomenclatura</TableHead>
                    <TableHead>Tipo Línea</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTipos ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : tipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Sin tipos registrados. Crea el primero.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tipos.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.nombre}</TableCell>
                        <TableCell>
                          <Badge variant={t.tipo === 'ingreso' ? 'default' : 'destructive'} className="text-xs">
                            {t.tipo === 'ingreso'
                              ? <><ArrowUp className="h-3 w-3 mr-1 inline" />Ingreso</>
                              : <><ArrowDown className="h-3 w-3 mr-1 inline" />Egreso</>}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{t.nomenclatura ?? '—'}</TableCell>
                        <TableCell className="text-sm capitalize">{t.tipo_linea}</TableCell>
                        <TableCell>
                          <Badge variant={t.activo ? 'outline' : 'secondary'} className="text-xs">
                            {t.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => abrirEditarTipo(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DIÁLOGO: Registrar movimiento ────────────────────────────────────── */}
      <Dialog open={dlgMovimiento} onOpenChange={(o) => { setDlgMovimiento(o); if (!o) resetFormMov() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrar Movimiento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tipo de gasto */}
            <div className="space-y-1.5">
              <Label>Tipo de Gasto *</Label>
              <Select
                value={formMov.otro_gasto_tipo_id}
                onValueChange={(v) => {
                  const t = tipos.find(x => String(x.id) === v)
                  setFormMov(f => ({ ...f, otro_gasto_tipo_id: v, concepto: t?.nombre ?? f.concepto }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.filter(t => t.activo).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span className="flex items-center gap-2">
                        {t.tipo === 'ingreso'
                          ? <ArrowUp className="h-3.5 w-3.5 text-green-500" />
                          : <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
                        {t.nombre}
                        {t.grupo && <span className="text-xs text-muted-foreground">({t.grupo})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoMovSeleccionado && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {tipoMovSeleccionado.tipo === 'egreso'
                    ? <><ArrowDown className="h-3 w-3 text-red-500" /> Este tipo <b>resta</b> de caja (egreso)</>
                    : <><ArrowUp className="h-3 w-3 text-green-500" /> Este tipo <b>suma</b> a caja (ingreso)</>}
                </p>
              )}
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <Label>Monto (Q) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={formMov.monto}
                onChange={(e) => setFormMov(f => ({ ...f, monto: e.target.value }))}
              />
            </div>

            {/* Concepto */}
            <div className="space-y-1.5">
              <Label>Concepto *</Label>
              <Input
                placeholder="Descripción corta del movimiento"
                value={formMov.concepto}
                onChange={(e) => setFormMov(f => ({ ...f, concepto: e.target.value }))}
              />
            </div>

            {/* Fecha + Forma de pago (en fila) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formMov.fecha}
                  onChange={(e) => setFormMov(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Pago</Label>
                <Select value={formMov.forma_pago} onValueChange={(v) => setFormMov(f => ({ ...f, forma_pago: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Número de recibo */}
            <div className="space-y-1.5">
              <Label>N° Recibo / Factura</Label>
              <Input
                placeholder="Opcional"
                value={formMov.numero_recibo}
                onChange={(e) => setFormMov(f => ({ ...f, numero_recibo: e.target.value }))}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label>Descripción adicional</Label>
              <Textarea
                placeholder="Detalles opcionales..."
                value={formMov.descripcion}
                onChange={(e) => setFormMov(f => ({ ...f, descripcion: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgMovimiento(false)}>Cancelar</Button>
            <Button onClick={handleGuardarMovimiento} disabled={guardandoMov}>
              {guardandoMov ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: Tipo de gasto ───────────────────────────────────────────── */}
      <Dialog open={dlgTipo} onOpenChange={setDlgTipo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tipoEditando ? 'Editar Tipo' : 'Nuevo Tipo de Gasto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={formTipo.nombre} onChange={(e) => setFormTipo(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo (Ingreso/Egreso)</Label>
                <Select value={formTipo.tipo} onValueChange={(v) => setFormTipo(f => ({ ...f, tipo: v as TipoMovimiento }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo Línea</Label>
                <Select value={formTipo.tipo_linea} onValueChange={(v) => setFormTipo(f => ({ ...f, tipo_linea: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="bien">Bien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cuenta contable (nomenclatura)</Label>
              <Select
                value={formTipo.nomenclatura && formTipo.nomenclatura !== '__ninguna__' ? formTipo.nomenclatura : '__ninguna__'}
                onValueChange={(v) => setFormTipo(f => ({ ...f, nomenclatura: v === '__ninguna__' ? '' : v }))}
                disabled={loadingCuentas}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCuentas ? 'Cargando cuentas...' : 'Seleccione cuenta contable'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ninguna__">
                    Sin cuenta contable
                  </SelectItem>
                  {cuentasContables.map((c) => (
                    <SelectItem key={c.id} value={c.codigo_cuenta}>
                      {c.codigo_cuenta} — {c.nombre_cuenta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Opcional. Relaciona este tipo de gasto con una cuenta del plan contable.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea value={formTipo.descripcion ?? ''} onChange={(e) => setFormTipo(f => ({ ...f, descripcion: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgTipo(false)}>Cancelar</Button>
            <Button onClick={handleGuardarTipo} disabled={guardandoTipo}>
              {guardandoTipo ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: Anular movimiento ───────────────────────────────────────── */}
      <AlertDialog open={!!anulando} onOpenChange={(o) => { if (!o) setAnulando(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Movimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. El efecto en caja se revertirá con un movimiento inverso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-3">
            <Label>Motivo de anulación *</Label>
            <Textarea
              className="mt-1.5"
              placeholder="Escribe el motivo..."
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!motivoAnulacion.trim()}
              onClick={handleAnular}
              className="bg-destructive hover:bg-destructive/90"
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
