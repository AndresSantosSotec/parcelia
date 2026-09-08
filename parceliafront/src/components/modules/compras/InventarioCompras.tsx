import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { MagnifyingGlass, Package, ArrowsClockwise, Tag } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { format } from 'date-fns'

interface PrendaCompra {
    id: number
    codigo_prenda: string
    descripcion: string
    categoria: string
    marca?: string
    modelo?: string
    estado: string
    precio_venta?: number
    avaluo?: number
    fecha_ingreso: string
    observaciones?: string
}

export function InventarioCompras() {
    const [prendas, setPrendas] = useState<PrendaCompra[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
    const [categorias, setCategorias] = useState<string[]>([])

    useEffect(() => {
        cargarInventario()
    }, [])

    const cargarInventario = async () => {
        try {
            setLoading(true)
            // Filtrar prendas con tipo_ingreso='compra_directa' y estado='en_venta'
            const params = new URLSearchParams({
                tipo_ingreso: 'compra_directa',
                estado: 'en_venta',
                per_page: '1000'
            })
            const response = await api.get<any>('/prendas?' + params.toString())

            if (response && response.data) {
                const prendasData = response.data?.data || response.data || []
                setPrendas(prendasData)
                
                // Extraer categorías únicas
                const cats = Array.from(new Set(prendasData.map((p: PrendaCompra) => p.categoria).filter(Boolean)))
                setCategorias(cats as string[])
            }
        } catch (error) {
            console.error('Error al cargar inventario:', error)
            toast.error('Error al cargar el inventario de compras')
        } finally {
            setLoading(false)
        }
    }

    const diasEnInventario = (fechaIngreso: string) => {
        if (!fechaIngreso) return 0
        const hoy = new Date()
        const ingreso = new Date(fechaIngreso)
        const diff = hoy.getTime() - ingreso.getTime()
        return Math.floor(diff / (1000 * 60 * 60 * 24))
    }

    const calcularMargen = (avaluo: number, precioVenta?: number) => {
        if (!precioVenta || !avaluo) return 0
        return ((precioVenta - avaluo) / avaluo) * 100
    }

    const prendasFiltradas = prendas.filter(prenda => {
        const matchBusqueda = busqueda === '' || 
            prenda.codigo_prenda.toLowerCase().includes(busqueda.toLowerCase()) ||
            prenda.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
            prenda.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
            prenda.modelo?.toLowerCase().includes(busqueda.toLowerCase())
        
        const matchCategoria = categoriaFiltro === 'todas' || prenda.categoria === categoriaFiltro
        
        return matchBusqueda && matchCategoria
    })

    if (loading) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Cargando inventario...</p>
                </CardContent>
            </Card>
        )
    }

    if (prendas.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package size={24} />
                        Inventario de Compras Directas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-12 text-center">
                    <Tag className="mx-auto mb-4 text-muted-foreground" size={64} />
                    <p className="text-lg font-medium mb-2">No hay productos en inventario</p>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Los productos adquiridos mediante compra directa que aún no se han vendido aparecerán aquí
                    </p>
                    <Button variant="outline" className="mt-4" onClick={cargarInventario}>
                        <ArrowsClockwise size={16} className="mr-2" />
                        Recargar
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Package size={24} />
                            Inventario de Compras Directas
                        </span>
                        <Button variant="outline" size="sm" onClick={cargarInventario}>
                            <ArrowsClockwise size={16} className="mr-2" />
                            Recargar
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <Input
                                    placeholder="Buscar por código, descripción, marca, modelo..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas las categorías</SelectItem>
                                {categorias.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Total Productos</p>
                                    <p className="text-2xl font-bold">{prendasFiltradas.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Inversión Total</p>
                                    <p className="text-2xl font-bold">
                                        <MoneyDisplay amount={prendasFiltradas.reduce((sum, p) => sum + (p.avaluo || 0), 0)} />
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Venta Potencial</p>
                                    <p className="text-2xl font-bold">
                                        <MoneyDisplay amount={prendasFiltradas.reduce((sum, p) => sum + (p.precio_venta || 0), 0)} />
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabla */}
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-center">Días</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">P. Venta</TableHead>
                                    <TableHead className="text-center">Margen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prendasFiltradas.map((prenda) => {
                                    const dias = diasEnInventario(prenda.fecha_ingreso)
                                    const margen = calcularMargen(prenda.avaluo || 0, prenda.precio_venta)
                                    
                                    return (
                                        <TableRow key={prenda.id}>
                                            <TableCell className="font-mono text-sm">
                                                {prenda.codigo_prenda}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{prenda.descripcion}</p>
                                                    {(prenda.marca || prenda.modelo) && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {[prenda.marca, prenda.modelo].filter(Boolean).join(' - ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">
                                                    {prenda.categoria || 'Sin categoría'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge 
                                                    variant={dias > 60 ? 'destructive' : dias > 30 ? 'default' : 'secondary'}
                                                    className="font-normal"
                                                >
                                                    {dias}d
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <MoneyDisplay amount={prenda.avaluo || 0} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {prenda.precio_venta ? (
                                                    <MoneyDisplay amount={prenda.precio_venta} />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Sin precio</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {prenda.precio_venta && prenda.avaluo ? (
                                                    <Badge 
                                                        variant={margen > 20 ? 'default' : margen > 0 ? 'secondary' : 'destructive'}
                                                        className="font-normal"
                                                    >
                                                        {margen > 0 ? '+' : ''}{margen.toFixed(1)}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {prendasFiltradas.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No se encontraron productos con los filtros aplicados</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
