import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, ArrowClockwise } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const TIPO_STYLES: Record<string, string> = {
  activo:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  pasivo:        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  patrimonio:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  ingreso:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  gasto:         'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  costos:        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  cuentas_orden: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const TIPOS = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto', 'costos', 'cuentas_orden']

export default function PlanCuentasModule() {
  const [cuentas, setCuentas] = useState<any[]>([])
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [total, setTotal] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ per_page: '25', page: String(pagina) })
      if (busqueda) params.append('busqueda', busqueda)
      if (tipoFiltro) params.append('tipo', tipoFiltro)
      const resp = await api.get(`/contabilidad/nomenclatura?${params}`) as any
      setCuentas(resp.data || [])
      setTotalPaginas(resp.pagination?.last_page || 1)
      setTotal(resp.pagination?.total || 0)
    } catch (e: any) {
      toast.error('Error al cargar plan de cuentas: ' + e.message)
    } finally {
      setCargando(false)
    }
  }, [busqueda, tipoFiltro, pagina])

  useEffect(() => { setPagina(1) }, [busqueda, tipoFiltro])
  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            className="pl-8 h-9 text-sm"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" className="h-9 px-2" onClick={cargar} disabled={cargando}>
          <ArrowClockwise size={14} className={cargando ? 'animate-spin' : ''} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} cuenta{total !== 1 ? 's' : ''} en el plan de cuentas
      </p>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="border-b">
                <th className="p-2 text-left font-medium">Código</th>
                <th className="p-2 text-left font-medium">Nombre de Cuenta</th>
                <th className="p-2 text-center font-medium">Tipo</th>
                <th className="p-2 text-center font-medium">Nivel</th>
                <th className="p-2 text-center font-medium">Naturaleza</th>
                <th className="p-2 text-center font-medium">Acepta Mov.</th>
                <th className="p-2 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : cuentas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    No se encontraron cuentas
                  </td>
                </tr>
              ) : (
                cuentas.map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-2 font-mono font-bold text-primary whitespace-nowrap">{c.codigo_cuenta}</td>
                    <td className="p-2">
                      <span style={{ paddingLeft: `${(c.nivel - 1) * 14}px` }}>
                        {c.nombre_cuenta}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TIPO_STYLES[c.tipo] ?? 'bg-gray-100'}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="p-2 text-center text-muted-foreground">{c.nivel}</td>
                    <td className="p-2 text-center capitalize text-muted-foreground">{c.naturaleza}</td>
                    <td className="p-2 text-center">
                      {c.acepta_movimientos ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={c.estado ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {c.estado ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={pagina === 1}
            onClick={() => setPagina(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
