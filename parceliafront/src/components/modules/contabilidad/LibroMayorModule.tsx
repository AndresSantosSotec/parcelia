import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MagnifyingGlass, ArrowClockwise, FilePdf } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/config'
import { toast } from 'sonner'

const fmt = (v: number) =>
  'Q ' + (v ?? 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function LibroMayorModule() {
  const today = new Date().toISOString().split('T')[0]
  const yearStart = `${new Date().getFullYear()}-01-01`

  // Selector de cuenta
  const [cuentas, setCuentas] = useState<any[]>([])
  const [cuentaId, setCuentaId] = useState('')
  const [busquedaCuenta, setBusquedaCuenta] = useState('')
  const [cargandoCuentas, setCargandoCuentas] = useState(false)

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState(yearStart)
  const [fechaFin, setFechaFin] = useState(today)

  // Datos del reporte
  const [datos, setDatos] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const cargarCuentas = useCallback(async () => {
    setCargandoCuentas(true)
    try {
      const params = new URLSearchParams({ con_movimientos: 'true', per_page: '200', activas: 'true' })
      if (busquedaCuenta) params.append('busqueda', busquedaCuenta)
      const resp = await api.get(`/contabilidad/nomenclatura?${params}`) as any
      setCuentas(resp.data ?? [])
    } catch { /* silenciar */ } finally {
      setCargandoCuentas(false)
    }
  }, [busquedaCuenta])

  useEffect(() => { cargarCuentas() }, [cargarCuentas])

  const cargar = async () => {
    if (!cuentaId) { toast.error('Seleccione una cuenta contable'); return }
    setCargando(true)
    setDatos(null)
    try {
      const params = new URLSearchParams({ cuenta_id: cuentaId, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      const resp = await api.get(`/contabilidad/libro-mayor?${params}`) as any
      setDatos(resp.data)
    } catch (e: any) {
      toast.error('Error al cargar libro mayor: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const descargarPdf = async () => {
    if (!cuentaId) { toast.error('Seleccione una cuenta contable'); return }
    setDescargando(true)
    try {
      const token = api.getToken()
      if (!token) throw new Error('Sin sesión activa')
      const params = new URLSearchParams({ cuenta_id: cuentaId, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      const resp = await fetch(`${API_BASE_URL}/contabilidad/libro-mayor/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf, application/json' },
        credentials: 'include',
      })
      if (!resp.ok) throw new Error(`Error HTTP ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `libro-mayor-${datos?.cuenta?.codigo_cuenta ?? cuentaId}-${fechaFin}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + e.message)
    } finally {
      setDescargando(false)
    }
  }

  const movimientos = datos?.movimientos ?? []
  const cuentaInfo = datos?.cuenta

  return (
    <div className="space-y-4">
      {/* Panel de filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Selector de cuenta con búsqueda */}
            <div className="flex-1 min-w-[260px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Cuenta Contable
              </label>
              <div className="relative mb-1.5">
                <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar cuentas..."
                  className="pl-8 h-8 text-xs"
                  value={busquedaCuenta}
                  onChange={e => setBusquedaCuenta(e.target.value)}
                />
              </div>
              <select
                className="border rounded-md px-2 py-1.5 text-xs bg-background w-full"
                value={cuentaId}
                onChange={e => { setCuentaId(e.target.value); setDatos(null) }}
                disabled={cargandoCuentas}
              >
                <option value="">— Seleccione una cuenta —</option>
                {cuentas.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo_cuenta} — {c.nombre_cuenta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Desde</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="h-9 text-sm w-36"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Hasta</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="h-9 text-sm w-36"
              />
            </div>

            <Button onClick={cargar} disabled={cargando || !cuentaId} size="sm" className="h-9">
              <ArrowClockwise size={14} className={`mr-1.5 ${cargando ? 'animate-spin' : ''}`} />
              {cargando ? 'Cargando...' : 'Consultar'}
            </Button>

            {datos && (
              <Button variant="outline" size="sm" className="h-9" onClick={descargarPdf} disabled={descargando}>
                <FilePdf size={14} className="mr-1.5 text-red-500" />
                {descargando ? 'Generando...' : 'Descargar PDF'}
              </Button>
            )}
          </div>

          {/* Info de la cuenta y saldos */}
          {datos && (
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t items-start">
              <div>
                <p className="text-xs text-muted-foreground">Cuenta</p>
                <p className="font-mono font-bold text-primary">{cuentaInfo?.codigo_cuenta}</p>
                <p className="text-sm">{cuentaInfo?.nombre_cuenta}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {cuentaInfo?.tipo} · {cuentaInfo?.naturaleza}
                </p>
              </div>
              <div className="border-l pl-6">
                <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                <p className={`text-base font-bold ${(datos.saldo_inicial ?? 0) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                  {fmt(datos.saldo_inicial ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Debe</p>
                <p className="text-base font-bold text-blue-600">{fmt(datos.totales?.total_debe ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Haber</p>
                <p className="text-base font-bold text-orange-600">{fmt(datos.totales?.total_haber ?? 0)}</p>
              </div>
              <div className="border-l pl-6">
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className={`text-base font-bold ${(datos.saldo_final ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(datos.saldo_final ?? 0)}
                </p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground self-center">
                {datos.periodo?.fecha_inicio} al {datos.periodo?.fecha_fin}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de movimientos */}
      {!datos && !cargando ? (
        <div className="flex items-center justify-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Seleccione una cuenta y presione "Consultar"</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="border-b">
                  <th className="p-2 text-left font-medium whitespace-nowrap">Fecha</th>
                  <th className="p-2 text-left font-medium whitespace-nowrap">Comprobante</th>
                  <th className="p-2 text-left font-medium">Descripción</th>
                  <th className="p-2 text-right font-medium text-blue-700">Debe</th>
                  <th className="p-2 text-right font-medium text-orange-700">Haber</th>
                  <th className="p-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {/* Fila de saldo inicial */}
                {datos && (
                  <tr className="bg-blue-50 dark:bg-blue-950/20 border-b font-medium">
                    <td colSpan={5} className="p-2 text-muted-foreground text-xs">
                      Saldo inicial al {datos.periodo?.fecha_inicio}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {fmt(datos.saldo_inicial ?? 0)}
                    </td>
                  </tr>
                )}

                {cargando ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      Sin movimientos en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-2 whitespace-nowrap text-muted-foreground">{m.fecha}</td>
                      <td className="p-2 font-mono font-bold text-primary whitespace-nowrap">{m.numero_comprobante}</td>
                      <td className="p-2 max-w-xs">
                        <p className="truncate" title={m.detalle || m.glosa || '—'}>
                          {m.detalle || m.glosa || '—'}
                        </p>
                        {m.numero_documento && (
                          <p className="text-muted-foreground text-[10px]">{m.numero_documento}</p>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {m.debe > 0 ? fmt(m.debe) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {m.haber > 0 ? fmt(m.haber) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={`p-2 text-right font-mono font-bold ${(m.saldo ?? 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                        {fmt(m.saldo ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Fila de totales finales */}
              {datos && movimientos.length > 0 && (
                <tfoot className="bg-muted/70 border-t-2 border-border sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="p-2 text-right text-xs font-bold uppercase tracking-wide">
                      Saldo Final
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-blue-700">
                      {fmt(datos.totales?.total_debe ?? 0)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-orange-700">
                      {fmt(datos.totales?.total_haber ?? 0)}
                    </td>
                    <td className={`p-2 text-right font-mono font-bold ${(datos.saldo_final ?? 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                      {fmt(datos.saldo_final ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
