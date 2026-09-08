import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MagnifyingGlass, ShoppingCart, Tag, ArrowsClockwise, MapPin } from '@phosphor-icons/react'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { VentaDialog } from './VentaDialog'
import { TasacionDialog } from './TasacionDialog'
import { prendaService } from '@/services/prenda.service'
import { toast } from 'sonner'

// Tipo para las prendas que vienen de la API
interface PrendaEnVenta {
  id: number
  codigoPrenda: string
  descripcion: string
  categoria: string
  categoriaId: number
  estado: string
  avaluo: number
  valorVenta?: number
  precioVenta?: number
  precioMinimo?: number
  fechaIngreso: string
  fotos?: string[]
  fotoPrincipal?: string
  cliente?: {
    id: number
    nombres: string
    apellidos: string
    dpi: string
  }
  observaciones?: string
}


interface InventarioVentasProps {
  onRegistrarVenta?: () => void
}

export function InventarioVentas({ onRegistrarVenta }: InventarioVentasProps) {
  const [prendas, setPrendas] = useState<PrendaEnVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<PrendaEnVenta | null>(null)
  const [dialogVentaAbierto, setDialogVentaAbierto] = useState(false)
  const [dialogTasacionAbierto, setDialogTasacionAbierto] = useState(false)
  const [preciosEditables, setPreciosEditables] = useState<Record<number, number>>({})

  // Estado de paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [totalPrendas, setTotalPrendas] = useState(0)
  const [ultimaPagina, setUltimaPagina] = useState(1)

  // Función para actualizar precio de venta y ubicación
  const actualizarPrecioVenta = async (prendaId: number, nuevoPrecio: number) => {
    try {
      const token = localStorage.getItem('auth_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

      const payload = { precio_venta: nuevoPrecio }
      console.log('🔧 Actualizando precio_venta:', {
        prendaId,
        payload,
        url: `${API_BASE_URL}/prendas/${prendaId}`
      })

      const response = await fetch(`${API_BASE_URL}/prendas/${prendaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('📥 Respuesta del servidor:', result)

      if (response.ok) {
        toast.success('Precio de venta actualizado')
        cargarPrendas()
        setPreciosEditables(prev => {
          const nuevo = { ...prev }
          delete nuevo[prendaId]
          return nuevo
        })
      } else {
        console.error('❌ Error del servidor:', result)
        toast.error(result.message || 'Error al actualizar precio')
      }
    } catch (error) {
      console.error('❌ Error de red:', error)
      toast.error('Error al actualizar precio')
    }
  }

  // Cargar prendas en venta desde la API
  const cargarPrendas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await prendaService.getEnVenta({
        page: paginaActual,
        per_page: porPagina,
        busqueda: busqueda,
        categoria: categoriaFiltro
      })

      const prendasData = response.data || []
      setPrendas(prendasData)

      if (response.pagination) {
        setTotalPrendas(response.pagination.total)
        setUltimaPagina(response.pagination.last_page)
      }
    } catch (error) {
      console.error('Error cargando prendas en venta:', error)
      toast.error('Error al cargar las prendas en venta')
      setPrendas([])
    } finally {
      setLoading(false)
    }
  }, [paginaActual, porPagina, busqueda, categoriaFiltro])

  useEffect(() => {
    // Resetear a página 1 cuando cambia el filtro o búsqueda
    setPaginaActual(1)
  }, [busqueda, categoriaFiltro])

  useEffect(() => {
    cargarPrendas()
  }, [cargarPrendas])

  // Obtener categorías únicas de las prendas (este paso podría ser optimizado si el backend las enviara)
  // Por ahora lo dejamos igual o lo obtenemos de las que ya cargamos
  const [categoriasLista, setCategoriasLista] = useState<string[]>([])

  useEffect(() => {
    if (prendas.length > 0) {
      const cats = Array.from(new Set(prendas.map(p => p.categoria))).filter(Boolean)
      if (cats.length > 0) {
        setCategoriasLista(prev => Array.from(new Set([...prev, ...cats])))
      }
    }
  }, [prendas])

  // Calcular días en inventario
  const diasEnInventario = (fechaIngreso: string) => {
    if (!fechaIngreso) return 0
    const hoy = new Date()
    const ingreso = new Date(fechaIngreso)
    const diff = hoy.getTime() - ingreso.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'vencido':
        return <Badge variant="destructive">Vencido - Requiere Tasación</Badge>
      case 'evaluacion_venta':
        return <Badge variant="outline" className="border-warning text-warning">En Evaluación</Badge>
      case 'en_venta':
        return <Badge variant="default" className="bg-accent">Disponible para Venta</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const handleVender = (prenda: PrendaEnVenta) => {
    if (prenda.estado === 'vencido' || prenda.estado === 'evaluacion_venta') {
      setPrendaSeleccionada(prenda)
      setDialogTasacionAbierto(true)
    } else {
      setPrendaSeleccionada(prenda)
      setDialogVentaAbierto(true)
    }
  }

  const handleVentaCompleta = () => {
    setDialogVentaAbierto(false)
    setPrendaSeleccionada(null)
    cargarPrendas() // Recargar la lista
    toast.success('Venta registrada correctamente')
  }

  const handleTasacionCompleta = () => {
    setDialogTasacionAbierto(false)
    setPrendaSeleccionada(null)
    cargarPrendas() // Recargar la lista
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Avalúo</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-right">Precio Mín.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base sm:text-lg">Filtros e Inventario</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Mostrar:</span>
              <Select
                value={porPagina.toString()}
                onValueChange={(v) => {
                  setPorPagina(parseInt(v))
                  setPaginaActual(1)
                }}
              >
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue placeholder="20" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={cargarPrendas} className="h-8">
                <ArrowsClockwise size={16} className="mr-1" />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>


              {onRegistrarVenta && (
                <Button
                  onClick={onRegistrarVenta}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 gap-2 ml-2 shadow-sm"
                  size="sm"
                >
                  <ShoppingCart size={16} />
                  <span className="hidden sm:inline">Nueva Venta</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="Buscar por descripción o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  variant={categoriaFiltro === 'todas' ? 'default' : 'outline'}
                  onClick={() => setCategoriaFiltro('todas')}
                  size="sm"
                  className="h-9 whitespace-nowrap"
                >
                  Todas
                </Button>
                {categoriasLista.map(cat => (
                  <Button
                    key={cat}
                    variant={categoriaFiltro === cat ? 'default' : 'outline'}
                    onClick={() => setCategoriaFiltro(cat)}
                    size="sm"
                    className="h-9 whitespace-nowrap"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {prendas.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="mx-auto mb-4 text-muted-foreground" size={64} />
            <p className="text-lg font-medium mb-2">No hay prendas en venta</p>
            <p className="text-muted-foreground text-sm sm:text-base">
              Las prendas con estado "en_venta" aparecerán aquí
            </p>
            <Button variant="outline" className="mt-4" onClick={cargarPrendas}>
              <ArrowsClockwise size={16} className="mr-2" />
              Recargar
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead className="min-w-[200px]">Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Avalúo</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Precio Mín.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prendas.map(prenda => {
                      const dias = diasEnInventario(prenda.fechaIngreso)
                      const precioPendiente = prenda.estado === 'vencido' || prenda.estado === 'evaluacion_venta'
                      const precioVenta = prenda.precioVenta || prenda.avaluo * 1.3
                      const precioMinimo = prenda.precioMinimo || prenda.avaluo

                      return (
                        <TableRow key={prenda.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs font-semibold">{prenda.codigoPrenda}</TableCell>
                          <TableCell>
                            <div className="font-medium line-clamp-2">{prenda.descripcion}</div>
                            {prenda.cliente && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <span className="opacity-70">Cliente:</span>
                                <span className="truncate">{prenda.cliente.nombres} {prenda.cliente.apellidos}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            <Badge variant="outline" className="font-normal">
                              {prenda.categoria || 'Sin categoría'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <MoneyDisplay amount={prenda.avaluo || 0} />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {precioPendiente ? (
                              <span className="text-xs text-warning">Pendiente tasación</span>
                            ) : preciosEditables[prenda.id] !== undefined ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  value={preciosEditables[prenda.id]}
                                  onChange={(e) => setPreciosEditables(prev => ({
                                    ...prev,
                                    [prenda.id]: parseFloat(e.target.value) || 0
                                  }))}
                                  className="w-24 h-8 text-right p-1"
                                  min={precioMinimo}
                                  step="0.01"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-success"
                                  onClick={() => actualizarPrecioVenta(prenda.id, preciosEditables[prenda.id])}
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => setPreciosEditables(prev => {
                                    const nuevo = { ...prev }
                                    delete nuevo[prenda.id]
                                    return nuevo
                                  })}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="font-bold text-accent cursor-pointer hover:underline flex items-center justify-end gap-1"
                                title="Click para editar precio"
                                onClick={() => setPreciosEditables(prev => ({
                                  ...prev,
                                  [prenda.id]: precioVenta
                                }))}
                              >
                                <MoneyDisplay amount={precioVenta} />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <MoneyDisplay amount={precioMinimo} className="text-sm text-muted-foreground" />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {getEstadoBadge(prenda.estado)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={dias > 90 ? 'destructive' : dias > 30 ? 'outline' : 'secondary'} className="text-xs">
                              {dias}d
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              {precioPendiente ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVender(prenda)}
                                  className="h-8"
                                >
                                  <Tag className="h-4 w-4 mr-1" />
                                  Tasar
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  Disponible
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Controles de Paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{prendas.length}</span> de <span className="font-medium">{totalPrendas}</span> prendas
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                  disabled={paginaActual === 1 || loading}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  <span className="text-sm font-medium">Página {paginaActual}</span>
                  <span className="text-sm text-muted-foreground text-xs">de {ultimaPagina}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(prev => Math.min(ultimaPagina, prev + 1))}
                  disabled={paginaActual === ultimaPagina || loading}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div >

      {prendaSeleccionada && (
        <>
          <TasacionDialog
            prenda={prendaSeleccionada as any}
            open={dialogTasacionAbierto}
            onOpenChange={setDialogTasacionAbierto}
            onTasacionCompleta={handleTasacionCompleta}
          />
          <VentaDialog
            prenda={prendaSeleccionada as any}
            open={dialogVentaAbierto}
            onOpenChange={setDialogVentaAbierto}
            onVentaCompleta={handleVentaCompleta}
          />
        </>
      )
      }
    </>
  )
}
