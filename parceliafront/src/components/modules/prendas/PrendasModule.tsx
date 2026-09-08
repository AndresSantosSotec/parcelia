import { useState, useEffect } from 'react'
import { PrendaEmpenada } from '@/types/creditoPrendario.types'
import { prendaService } from '@/services/prenda.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Package, MagnifyingGlass, Funnel, ArrowsClockwise, Download } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { PrendasTable } from './PrendasTable'
import { EditarPrendaModal } from './EditarPrendaModal'
import { EliminarPrendaModal } from './EliminarPrendaModal'
import { DetalleCreditoModal } from './DetalleCreditoModal'
import { ProcesarVentaModal } from './ProcesarVentaModal'
import { cn } from '@/lib/utils'

export function PrendasModule() {
  const [prendas, setPrendas] = useState<PrendaEmpenada[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroSucursal, setFiltroSucursal] = useState<string>('todos')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')
  const [fechaVentaDesde, setFechaVentaDesde] = useState<string>('')
  const [fechaVentaHasta, setFechaVentaHasta] = useState<string>('')
  const [categorias, setCategorias] = useState<any[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [porPagina] = useState(10)
  const [total, setTotal] = useState(0)

  // Estados para modales
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<PrendaEmpenada | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [editarAbierto, setEditarAbierto] = useState(false)
  const [eliminarAbierto, setEliminarAbierto] = useState(false)
  const [prendaAEditar, setPrendaAEditar] = useState<PrendaEmpenada | null>(null)
  const [prendaAEliminar, setPrendaAEliminar] = useState<PrendaEmpenada | null>(null)
  const [procesarVentaAbierto, setProcesarVentaAbierto] = useState(false)
  const [prendasSeleccionadasVenta, setPrendasSeleccionadasVenta] = useState<PrendaEmpenada[]>([])
  const [tipoVentaModal, setTipoVentaModal] = useState<'contado' | 'apartado' | 'plan_pagos'>('contado')

  useEffect(() => {
    const fetchFiltrosData = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
        const headers = {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        }

        const resCategorias = await fetch(`${API_BASE_URL}/categorias-productos/activas`, { headers })
        const jsonCategorias = await resCategorias.json()
        if (jsonCategorias.success) setCategorias(Array.isArray(jsonCategorias.data) ? jsonCategorias.data : jsonCategorias.data.data)

        const resSucursales = await fetch(`${API_BASE_URL}/sucursales/activas`, { headers })
        const jsonSucursales = await resSucursales.json()
        if (jsonSucursales.success) setSucursales(Array.isArray(jsonSucursales.data) ? jsonSucursales.data : jsonSucursales.data.data)
      } catch (error) {
        console.error('Error fetching listados para filtros', error)
      }
    }
    fetchFiltrosData()
  }, [])

  useEffect(() => {
    cargarPrendas()
  }, [busqueda, filtroEstado, filtroCategoria, filtroSucursal, fechaDesde, fechaHasta, fechaVentaDesde, fechaVentaHasta, pagina, porPagina])

  const cargarPrendas = async () => {
    try {
      setLoading(true)

      // Llamar directamente a la API para evitar problemas con el wrapper del servicio
      const token = localStorage.getItem('auth_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

      const queryParams = new URLSearchParams()
      if (busqueda) queryParams.append('busqueda', busqueda)
      if (filtroEstado !== 'todos') queryParams.append('estado', filtroEstado)
      if (filtroCategoria !== 'todos') queryParams.append('categoria', filtroCategoria)
      if (filtroSucursal !== 'todos') queryParams.append('sucursal', filtroSucursal)
      if (fechaDesde) queryParams.append('fecha_desde', fechaDesde)
      if (fechaHasta) queryParams.append('fecha_hasta', fechaHasta)
      if (fechaVentaDesde) queryParams.append('fecha_venta_desde', fechaVentaDesde)
      if (fechaVentaHasta) queryParams.append('fecha_venta_hasta', fechaVentaHasta)
      if (pagina) queryParams.append('page', String(pagina))
      if (porPagina) queryParams.append('per_page', String(porPagina))

      const query = queryParams.toString()
      const url = `${API_BASE_URL}/prendas${query ? `?${query}` : ''}`

      //console.log('Llamando a:', url)

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      const result = await response.json()
      //console.log('Respuesta completa del backend:', result)

      if (result.success && result.data) {
        const prendasData = Array.isArray(result.data) ? result.data : []
        //console.log('Prendas cargadas (raw):', prendasData.length, prendasData)

        // Mapear los datos del PrendaResource al formato PrendaEmpenada esperado
        const prendasMapeadas: PrendaEmpenada[] = prendasData.map((p: any) => ({
          id: p.id,
          codigo_prenda: p.codigoPrenda || p.codigoQR || p.id,
          credito_prendario_id: p.creditoId || '',
          cliente_id: p.cliente?.id || '',
          codigo_cliente_propietario: '',
          categoria_producto_id: p.categoriaId || '',
          descripcion_general: p.descripcion || '',
          marca: p.marca || undefined,
          modelo: p.modelo || undefined,
          numero_serie: p.serie || undefined,
          color: p.color || undefined,
          material: undefined,
          tamano_peso: undefined,
          caracteristicas_especiales: undefined,
          condicion_fisica: p.condicion === 'excelente' ? 'excelente' :
            p.condicion === 'buena' ? 'buena' :
              p.condicion === 'regular' ? 'regular' :
                p.condicion === 'mala' ? 'mala' : 'buena',
          valor_tasacion: p.avaluo || 0,
          valor_prestamo: p.valorPrestamo || 0,
          valor_venta: p.precioVenta || undefined,
          valor_venta_final: undefined,
          seccion_almacen: undefined,
          estante: undefined,
          caja: undefined,
          ubicacion_detalle: p.ubicacionBodega || undefined,
          fotos: p.fotos || [],
          foto_principal: p.fotoPrincipal || undefined,
          estado: p.estado === 'empeniado' ? 'en_custodia' :
            p.estado === 'vencido' ? 'en_evaluacion' :
              p.estado === 'evaluacion_venta' ? 'en_evaluacion' :
                p.estado === 'en_venta' ? 'en_venta' :
                  p.estado === 'apartado' ? 'en_venta' :
                    p.estado === 'vendido' ? 'vendida' :
                      p.estado === 'recuperado' ? 'recuperada' :
                        p.estado === 'cancelado' ? 'extraviada' :
                          (p.estado || 'en_custodia') as any,
          en_plan_pagos: Boolean(p.enPlanPagos),
          fecha_ingreso: p.fechaIngreso || new Date().toISOString(),
          fecha_venta: p.fechaVenta || undefined,
          fecha_recuperacion: undefined,
          comprador_id: undefined,
          observaciones: p.observaciones || undefined,
          created_at: p.creadoEn || new Date().toISOString(),
          updated_at: p.actualizadoEn || new Date().toISOString(),
          deleted_at: undefined,
          categoria: p.categoria ? { id: p.categoriaId || '', nombre: p.categoria } : undefined,
          tasaciones: undefined,
          credito: p.credito || undefined,  // ✅ MANTENER datos del crédito desde backend
        }))

        //console.log('Prendas mapeadas:', prendasMapeadas.length, prendasMapeadas)
        setPrendas(prendasMapeadas)

        if (result.pagination) {
          setTotalPaginas(result.pagination.last_page || 1)
          setTotal(result.pagination.total || 0)
        } else {
          setTotal(prendasMapeadas.length)
          setTotalPaginas(1)
        }
      } else {
        console.warn('No se recibieron datos de prendas:', result)
        setPrendas([])
        setTotal(0)
        setTotalPaginas(1)
      }
    } catch (error) {
      console.error('Error al cargar prendas:', error)
      toast.error('Error al cargar prendas')
      setPrendas([])
      setTotal(0)
      setTotalPaginas(1)
    } finally {
      setLoading(false)
    }
  }

  const estadoColors: Record<string, string> = {
    empeniado: 'bg-primary text-primary-foreground',
    vencido: 'bg-destructive text-destructive-foreground',
    evaluacion_venta: 'bg-warning text-warning-foreground',
    en_venta: 'bg-accent text-accent-foreground',
    apartado: 'bg-warning text-warning-foreground',
    vendido: 'bg-muted text-muted-foreground',
    recuperado: 'bg-accent text-accent-foreground',
    cancelado: 'bg-muted text-muted-foreground',
  }

  const estadoLabels: Record<string, string> = {
    empeniado: 'Empeñado',
    vencido: 'Vencido',
    evaluacion_venta: 'Evaluación',
    en_venta: 'En Venta',
    apartado: 'Apartado',
    vendido: 'Vendido',
    recuperado: 'Recuperado',
    cancelado: 'Cancelado',
  }

  const handleVerDetalle = (prenda: PrendaEmpenada) => {
    setPrendaSeleccionada(prenda)
    setDetalleAbierto(true)
  }

  const handleEditar = (prenda: PrendaEmpenada) => {
    setPrendaAEditar(prenda)
    setEditarAbierto(true)
  }

  const handleEliminar = (prenda: PrendaEmpenada) => {
    setPrendaAEliminar(prenda)
    setEliminarAbierto(true)
  }

  const handlePrendaActualizado = () => {
    setEditarAbierto(false)
    setPrendaAEditar(null)
    cargarPrendas()
  }

  const handlePrendaEliminado = () => {
    setEliminarAbierto(false)
    setPrendaAEliminar(null)
    cargarPrendas()
  }

  const handleVender = (prenda: PrendaEmpenada) => {
    setPrendasSeleccionadasVenta([prenda])
    setTipoVentaModal('contado')
    setProcesarVentaAbierto(true)
  }

  const handleApartar = (prenda: PrendaEmpenada) => {
    setPrendasSeleccionadasVenta([prenda])
    setTipoVentaModal('apartado')
    setProcesarVentaAbierto(true)
  }

  const handlePlanPago = (prenda: PrendaEmpenada) => {
    setPrendasSeleccionadasVenta([prenda])
    setTipoVentaModal('plan_pagos')
    setProcesarVentaAbierto(true)
  }

  const descargarReporte = async (format: 'pdf' | 'xlsx') => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

      const queryParams = new URLSearchParams()
      if (busqueda) queryParams.append('busqueda', busqueda)
      if (filtroEstado !== 'todos') queryParams.append('estado', filtroEstado)
      if (filtroCategoria !== 'todos') queryParams.append('categoria', filtroCategoria)
      if (filtroSucursal !== 'todos') queryParams.append('sucursal', filtroSucursal)
      if (fechaDesde) queryParams.append('fecha_desde', fechaDesde)
      if (fechaHasta) queryParams.append('fecha_hasta', fechaHasta)
      if (fechaVentaDesde) queryParams.append('fecha_venta_desde', fechaVentaDesde)
      if (fechaVentaHasta) queryParams.append('fecha_venta_hasta', fechaVentaHasta)
      queryParams.append('format', format)

      const query = queryParams.toString()
      const url = `${API_BASE_URL}/prendas/reporte${query ? `?${query}` : ''}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al descargar el reporte')
      }

      const blob = await response.blob()

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `Reporte_Prendas_${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`

      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast.success(`Reporte ${format.toUpperCase()} descargado exitosamente`)
    } catch (error: any) {
      console.error('Error al descargar reporte:', error)
      toast.error(error.message || 'Error al descargar el reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prendas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Inventario de {total} prendas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => descargarReporte('xlsx')}
            disabled={loading}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => descargarReporte('pdf')}
            disabled={loading}
            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => cargarPrendas()}
            disabled={loading}
          >
            <ArrowsClockwise className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar por descripción, categoría o ID..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPagina(1) // Resetear a la primera página
            }}
            className="pl-10 h-11"
          />
        </div>
        <Button
          variant={mostrarFiltros ? 'default' : 'outline'}
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="w-full sm:w-auto"
        >
          <Funnel />
          Filtros
        </Button>
      </div>

      {mostrarFiltros && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={filtroEstado} onValueChange={(value) => {
                  setFiltroEstado(value)
                  setPagina(1) // Resetear a la primera página
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="en_custodia">En Custodia</SelectItem>
                    <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                    <SelectItem value="recuperada">Recuperada</SelectItem>
                    <SelectItem value="en_venta">En Venta</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                    <SelectItem value="extraviada">Extraviada</SelectItem>
                    <SelectItem value="danada">Dañada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select value={filtroCategoria} onValueChange={(value) => {
                  setFiltroCategoria(value)
                  setPagina(1)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {categorias?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sucursal</label>
                <Select value={filtroSucursal} onValueChange={(value) => {
                  setFiltroSucursal(value)
                  setPagina(1)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {sucursales?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Ingreso Desde</label>
                <Input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPagina(1) }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Ingreso Hasta</label>
                <Input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPagina(1) }} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full text-xs" onClick={() => {
                  setFiltroEstado('todos');
                  setFiltroCategoria('todos');
                  setFiltroSucursal('todos');
                  setFechaDesde('');
                  setFechaHasta('');
                  setFechaVentaDesde('');
                  setFechaVentaHasta('');
                  setBusqueda('');
                  setPagina(1)
                }}>
                  Limpiar Filtros
                </Button>
              </div>
            </div>

            {/* Fila 2: Filtros de Fecha de Venta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-3 border-t border-dashed border-emerald-200">
              <div className="lg:col-span-1 flex items-center">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  🟢 Filtrar por Fecha de Venta
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-emerald-700">Venta Desde</label>
                <Input
                  type="date"
                  value={fechaVentaDesde}
                  onChange={(e) => { setFechaVentaDesde(e.target.value); setPagina(1) }}
                  className="border-emerald-300 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-emerald-700">Venta Hasta</label>
                <Input
                  type="date"
                  value={fechaVentaHasta}
                  onChange={(e) => { setFechaVentaHasta(e.target.value); setPagina(1) }}
                  className="border-emerald-300 focus:border-emerald-500"
                />
              </div>
              {(fechaVentaDesde || fechaVentaHasta) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => { setFechaVentaDesde(''); setFechaVentaHasta(''); setPagina(1) }}
                  >
                    Limpiar fecha venta
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : prendas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron prendas</h3>
            <p className="text-muted-foreground">
              {busqueda || filtroEstado !== 'todos'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay prendas registradas en el sistema'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PrendasTable
            prendas={prendas}
            onVerDetalle={handleVerDetalle}
            onEditar={handleEditar}
            onEliminar={handleEliminar}

            loading={loading}
          />

          {/* Paginación mejorada */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((pagina - 1) * porPagina) + 1} a {Math.min(pagina * porPagina, total)} de {total} prendas
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(1)}
                  disabled={pagina === 1 || loading}
                >
                  Primera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1 || loading}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Página {pagina} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas || loading}
                >
                  Siguiente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina(totalPaginas)}
                  disabled={pagina === totalPaginas || loading}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalle de Prenda y Crédito */}
      <DetalleCreditoModal
        prenda={prendaSeleccionada}
        abierto={detalleAbierto}
        onCerrar={() => { setDetalleAbierto(false); setPrendaSeleccionada(null); }}
      />

      {/* Modal de Edición */}
      <EditarPrendaModal
        prenda={prendaAEditar}
        abierto={editarAbierto}
        onCerrar={() => { setEditarAbierto(false); setPrendaAEditar(null); }}
        onActualizado={handlePrendaActualizado}
      />

      {/* Modal de Eliminación */}
      <EliminarPrendaModal
        prenda={prendaAEliminar}
        abierto={eliminarAbierto}
        onCerrar={() => { setEliminarAbierto(false); setPrendaAEliminar(null); }}
        onEliminado={handlePrendaEliminado}
      />

      {/* Modal de Procesar Venta */}
      <ProcesarVentaModal
        prendas={prendasSeleccionadasVenta}
        abierto={procesarVentaAbierto}
        tipoVenta={tipoVentaModal}
        onCerrar={() => {
          setProcesarVentaAbierto(false);
          setPrendasSeleccionadasVenta([]);
        }}
        onVentaProcesada={() => {
          cargarPrendas(); // Recargar prendas después de venta
        }}
      />
    </div>
  )
}