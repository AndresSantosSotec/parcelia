import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MagnifyingGlass,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Funnel,
  Package,
  MapPin,
} from '@phosphor-icons/react'
import { prendaService as prendaServiceApi, categoriaProductoService } from '@/lib/api'

interface BuscadorPrendasTablaProps {
  onSeleccionar: (prenda: any) => void
  prendaSeleccionada: any | null
}

export function BuscadorPrendasTabla({ onSeleccionar, prendaSeleccionada }: BuscadorPrendasTablaProps) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string }>>([])
  const [prendas, setPrendas] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 8

  const cargarCategorias = useCallback(async () => {
    try {
      const resp = await categoriaProductoService.getActivas()
      const data = (resp as any)?.data || []
      setCategorias(Array.isArray(data) ? data : [])
    } catch { /* silenciar */ }
  }, [])

  const cargarPrendas = useCallback(async () => {
    setCargando(true)
    try {
      const resp = await prendaServiceApi.getAll({
        busqueda: busqueda || undefined,
        estado: 'en_custodia',
        categoria: categoriaFiltro || undefined,
        page: pagina,
        per_page: perPage,
      })
      const data = (resp as any)
      if (data?.data) {
        setPrendas(Array.isArray(data.data) ? data.data : [])
        const pag = data.pagination || data
        setTotalPaginas(pag.last_page || 1)
        setTotal(pag.total || 0)
      }
    } catch {
      setPrendas([])
    } finally {
      setCargando(false)
    }
  }, [busqueda, categoriaFiltro, pagina])

  useEffect(() => { cargarCategorias() }, [cargarCategorias])
  useEffect(() => { cargarPrendas() }, [cargarPrendas])

  const handleBusqueda = (texto: string) => {
    setBusqueda(texto)
    setPagina(1)
  }

  const handleCategoria = (cat: string) => {
    setCategoriaFiltro(cat)
    setPagina(1)
  }

  const esSeleccionada = (prenda: any) => prendaSeleccionada?.id === prenda.id

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Código, descripción, marca, serie..."
            className="pl-8 h-9 text-sm"
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-2 py-1.5 text-xs bg-background min-w-[140px]"
            value={categoriaFiltro}
            onChange={(e) => handleCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" className="h-9 px-2" onClick={cargarPrendas}>
            <ArrowClockwise size={14} className={cargando ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Info de resultados */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Funnel size={12} />
          {total} prenda{total !== 1 ? 's' : ''} en custodia encontrada{total !== 1 ? 's' : ''}
        </p>
        {prendaSeleccionada && (
          <Badge variant="default" className="text-xs gap-1">
            <CheckCircle size={12} weight="fill" />
            {prendaSeleccionada.codigo_prenda} seleccionada
          </Badge>
        )}
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b">
                <th className="p-2 text-left font-medium w-8"></th>
                <th className="p-2 text-left font-medium">Código</th>
                <th className="p-2 text-left font-medium">Descripción</th>
                <th className="p-2 text-left font-medium">Categoría</th>
                <th className="p-2 text-left font-medium">Sucursal Actual</th>
                <th className="p-2 text-right font-medium">Tasación</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    <ArrowClockwise size={16} className="inline animate-spin mr-2" />
                    Cargando prendas...
                  </td>
                </tr>
              ) : prendas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    <Package size={20} className="inline mr-2 opacity-50" />
                    No se encontraron prendas en custodia
                  </td>
                </tr>
              ) : (
                prendas.map((p) => {
                  const seleccionada = esSeleccionada(p)
                  const categoriaNombre = typeof p.categoria === 'object' ? p.categoria?.nombre : p.categoria
                  const sucursalNombre = typeof p.sucursal === 'object' ? p.sucursal?.nombre : p.sucursal

                  return (
                    <tr
                      key={p.id}
                      className={`border-b cursor-pointer transition-colors ${
                        seleccionada
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => onSeleccionar(p)}
                    >
                      <td className="p-2 text-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          seleccionada
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {seleccionada && <CheckCircle size={10} weight="fill" className="text-white" />}
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {p.codigo_prenda}
                        </span>
                      </td>
                      <td className="p-2 max-w-[200px]">
                        <div className="truncate">{p.descripcion || 'Sin descripción'}</div>
                        {(p.marca || p.modelo) && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {[p.marca, p.modelo].filter(Boolean).join(' / ')}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {categoriaNombre || '—'}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-[11px] whitespace-nowrap">
                          <MapPin size={10} className="text-muted-foreground" />
                          {sucursalNombre || '—'}
                        </span>
                      </td>
                      <td className="p-2 text-right font-medium whitespace-nowrap">
                        {p.valor_tasacion
                          ? `Q${Number(p.valor_tasacion).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pagina <= 1}
              onClick={() => setPagina(p => p - 1)}
            >
              <CaretLeft size={12} />
            </Button>
            {/* Mostrar números de página cercanos */}
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              let num: number
              if (totalPaginas <= 5) {
                num = i + 1
              } else if (pagina <= 3) {
                num = i + 1
              } else if (pagina >= totalPaginas - 2) {
                num = totalPaginas - 4 + i
              } else {
                num = pagina - 2 + i
              }
              return (
                <Button
                  key={num}
                  variant={pagina === num ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 px-0 text-xs"
                  onClick={() => setPagina(num)}
                >
                  {num}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina(p => p + 1)}
            >
              <CaretRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
