import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ArrowClockwise,
  CheckCircle,
  XCircle,
  Receipt,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const fmt = (v: number) =>
  'Q ' + (v ?? 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TIPO_LABELS: Record<string, string> = {
  credito_prendario: 'Crédito Prendario',
  venta_prenda: 'Venta de Prenda',
  caja: 'Caja',
  compra: 'Compra',
  compra_directa: 'Compra Directa',
  gasto: 'Gasto',
  ajuste: 'Ajuste',
  cierre: 'Cierre',
  apertura: 'Apertura',
  otro: 'Otro',
}

const POLIZA_COLORS: Record<string, string> = {
  PI: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  PE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  PD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  PC: 'bg-purple-100 text-purple-800',
  PT: 'bg-orange-100 text-orange-800',
}

export default function ResumenContableModule() {
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const resp = await api.get('/contabilidad/dashboard') as any
      setData(resp.data)
    } catch (e: any) {
      toast.error('Error al cargar resumen contable: ' + e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const totales = data?.totales_mes ?? {}
  const porTipo = data?.por_tipo_origen ?? []
  const ultimosAsientos = data?.ultimos_asientos ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Resumen Contable del Mes</h2>
          <p className="text-xs text-muted-foreground">Período actual en curso</p>
        </div>
        <Button variant="ghost" size="sm" onClick={cargar} disabled={cargando}>
          <ArrowClockwise size={16} className={cargando ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cargando ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : (
          <>
            <Card>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp size={12} className="text-blue-500" weight="bold" />
                  Total Debe (Mes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-blue-600">{fmt(totales.total_debe ?? 0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown size={12} className="text-orange-500" weight="bold" />
                  Total Haber (Mes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-orange-600">{fmt(totales.total_haber ?? 0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Receipt size={12} />
                  Asientos del Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totales.total_asientos ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs text-muted-foreground">Estado</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {totales.cuadrado ? (
                  <>
                    <CheckCircle size={22} weight="fill" className="text-green-500" />
                    <span className="text-sm font-semibold text-green-600">Cuadrado</span>
                  </>
                ) : (
                  <>
                    <XCircle size={22} weight="fill" className="text-red-500" />
                    <span className="text-sm font-semibold text-red-600">Descuadrado</span>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Por tipo de origen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Asientos por Tipo de Operación</CardTitle>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : porTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos este mes</p>
            ) : (
              <div className="space-y-2">
                {porTipo.map((t: any) => (
                  <div key={t.tipo_origen} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span className="text-sm">{TIPO_LABELS[t.tipo_origen] ?? t.tipo_origen ?? '—'}</span>
                    <Badge variant="secondary">{t.cantidad}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos asientos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Últimos Asientos Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : ultimosAsientos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin asientos registrados</p>
            ) : (
              <div className="space-y-2">
                {ultimosAsientos.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-primary">{a.numero_comprobante}</p>
                      <p className="text-muted-foreground truncate">{a.glosa ?? a.numero_documento ?? '—'}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${POLIZA_COLORS[a.tipo_poliza?.codigo ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                        {a.tipo_poliza?.codigo ?? '—'}
                      </span>
                      <p className="text-muted-foreground mt-0.5">{a.fecha_contabilizacion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
