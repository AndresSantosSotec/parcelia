import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FilePdf, ArrowClockwise, CheckCircle, XCircle } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/config'
import { toast } from 'sonner'

const fmt = (v: number) =>
  'Q ' + (v ?? 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TIPO_STYLES: Record<string, string> = {
  activo:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  pasivo:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  patrimonio: 'bg-purple-100 text-purple-800',
  ingreso:    'bg-green-100 text-green-800',
  gasto:      'bg-orange-100 text-orange-800',
  costos:     'bg-yellow-100 text-yellow-800',
}

export default function BalanceComprobacionModule() {
  const today = new Date().toISOString().split('T')[0]
  const yearStart = `${new Date().getFullYear()}-01-01`

  const [fechaInicio, setFechaInicio] = useState(yearStart)
  const [fechaFin, setFechaFin] = useState(today)
  const [datos, setDatos] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      const resp = await api.get(`/contabilidad/balance-comprobacion?${params}`) as any
      setDatos(resp.data)
    } catch (e: any) {
      toast.error('Error al cargar balance: ' + e.message)
    } finally {
      setCargando(false)
    }
  }, [fechaInicio, fechaFin])

  const descargarPdf = async () => {
    setDescargando(true)
    try {
      const token = api.getToken()
      if (!token) throw new Error('Sin sesión activa')
      const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      const resp = await fetch(`${API_BASE_URL}/contabilidad/balance-comprobacion/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf, application/json' },
        credentials: 'include',
      })
      if (!resp.ok) throw new Error(`Error HTTP ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `balance-comprobacion-${fechaInicio}-${fechaFin}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + e.message)
    } finally {
      setDescargando(false)
    }
  }

  const cuentas = datos?.cuentas ?? []
  const totales = datos?.totales ?? {}

  return (
    <div className="space-y-4">
      {/* Filtros y controles */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
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
            <Button onClick={cargar} disabled={cargando} size="sm" className="h-9">
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

          {/* Totales resumen */}
          {datos && (
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t items-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Debe</p>
                <p className="text-lg font-bold text-blue-600">{fmt(totales.total_debe ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Haber</p>
                <p className="text-lg font-bold text-orange-600">{fmt(totales.total_haber ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`text-lg font-bold ${(totales.diferencia ?? 0) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(totales.diferencia ?? 0)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {totales.cuadrado ? (
                  <>
                    <CheckCircle size={20} weight="fill" className="text-green-500" />
                    <span className="text-sm font-semibold text-green-600">Cuadrado</span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} weight="fill" className="text-red-500" />
                    <span className="text-sm font-semibold text-red-600">Descuadrado</span>
                  </>
                )}
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Período: {datos.periodo?.fecha_inicio} al {datos.periodo?.fecha_fin}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
      {!datos && !cargando ? (
        <div className="flex items-center justify-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Seleccione un período y presione "Consultar"</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="border-b">
                  <th className="p-2 text-left font-medium">Código</th>
                  <th className="p-2 text-left font-medium">Nombre de Cuenta</th>
                  <th className="p-2 text-center font-medium">Tipo</th>
                  <th className="p-2 text-right font-medium text-blue-700">Debe</th>
                  <th className="p-2 text-right font-medium text-orange-700">Haber</th>
                  <th className="p-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : cuentas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No hay movimientos en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  cuentas.map((c: any) => {
                    const saldo = Number(c.saldo ?? (c.total_debe - c.total_haber))
                    return (
                      <tr key={c.id ?? c.codigo_cuenta} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-2 font-mono font-bold text-primary whitespace-nowrap">{c.codigo_cuenta}</td>
                        <td className="p-2">{c.nombre_cuenta}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TIPO_STYLES[c.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                            {c.tipo}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">{fmt(c.total_debe ?? 0)}</td>
                        <td className="p-2 text-right font-mono">{fmt(c.total_haber ?? 0)}</td>
                        <td className={`p-2 text-right font-mono font-bold ${saldo >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                          {fmt(Math.abs(saldo))}{saldo < 0 ? ' (H)' : ''}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Fila de totales */}
              {datos && cuentas.length > 0 && (
                <tfoot className="bg-muted/70 border-t-2 border-border">
                  <tr>
                    <td colSpan={3} className="p-2 text-right text-xs font-bold uppercase tracking-wide">
                      Totales
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-blue-700">
                      {fmt(totales.total_debe ?? 0)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-orange-700">
                      {fmt(totales.total_haber ?? 0)}
                    </td>
                    <td className={`p-2 text-right font-mono font-bold ${(totales.diferencia ?? 0) < 0.01 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(totales.diferencia ?? 0)}
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
