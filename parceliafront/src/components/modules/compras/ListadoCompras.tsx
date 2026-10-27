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
import { Eye, MagnifyingGlass, X, Package, TrendUp, TrendDown, FilePdf, PencilSimple, Trash, FileXls, Funnel } from '@phosphor-icons/react'
import { compraService, type Compra } from '@/services/compraService'
import { categoriaProductoService } from '@/lib/api'
import { toast } from 'sonner'
import { DetalleCompra } from './DetalleCompra'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { DotsThreeVertical } from '@phosphor-icons/react'

export function ListadoCompras() {
    const [compras, setCompras] = useState<Compra[]>([])
    const [loading, setLoading] = useState(false)
    const [filtros, setFiltros] = useState({
        search: '',
        estado: '',
        fecha_desde: '',
        fecha_hasta: '',
        categoria_id: [] as number[]
    })
    const [paginacion, setPaginacion] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0
    })

    const [compraSeleccionada, setCompraSeleccionada] = useState<number | null>(null)
    const [compraAEliminar, setCompraAEliminar] = useState<Compra | null>(null)
    const [eliminando, setEliminando] = useState(false)
    const [categorias, setCategorias] = useState<Array<{ id: number, nombre: string }>>([])
    const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)

    useEffect(() => {
        cargarCompras()
    }, [paginacion.current_page, filtros.estado])

    useEffect(() => {
        cargarCategorias()
    }, [])

    const cargarCategorias = async () => {
        try {
            const response = await categoriaProductoService.getActivas()
            if (response.success && response.data) {
                const categoriasData = Array.isArray(response.data.data) 
                    ? response.data.data 
                    : Array.isArray(response.data) 
                    ? response.data 
                    : []
                setCategorias(categoriasData.map(cat => ({ id: parseInt(cat.id), nombre: cat.nombre })))
            }
        } catch (error) {
            toast.error('Error al cargar categorías')
        }
    }

    const cargarCompras = async () => {
        try {
            setLoading(true)
            const response = await compraService.listarCompras({
                ...filtros,
                page: paginacion.current_page,
                per_page: paginacion.per_page
            })

            if (response.success && response.data) {
                const comprasData = Array.isArray(response.data) ? response.data : []
                setCompras(comprasData)
                if (response.meta) {
                    setPaginacion(response.meta)
                }
            }
        } catch (error) {
            toast.error('Error al cargar el historial de compras')
        } finally {
            setLoading(false)
        }
    }

    const handleBuscar = () => {
        setPaginacion(prev => ({ ...prev, current_page: 1 }))
        cargarCompras()
    }

    const handleLimpiarFiltros = () => {
        setFiltros({
            search: '',
            estado: '',
            fecha_desde: '',
            fecha_hasta: '',
            categoria_id: []
        })
        setPaginacion(prev => ({ ...prev, current_page: 1 }))
        setTimeout(() => cargarCompras(), 100)
    }

    const handleDescargarReportePDF = async () => {
        try {
            const filtrosReporte = {
                ...filtros,
                categoria_id: filtros.categoria_id.length > 0 ? filtros.categoria_id : undefined
            }
            await compraService.descargarReportePDF(filtrosReporte)
            toast.success('Reporte PDF descargado exitosamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al generar reporte PDF')
        }
    }

    const handleDescargarReporteExcel = async () => {
        try {
            const filtrosReporte = {
                ...filtros,
                categoria_id: filtros.categoria_id.length > 0 ? filtros.categoria_id : undefined
            }
            await compraService.descargarReporteExcel(filtrosReporte)
            toast.success('Reporte Excel descargado exitosamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al generar reporte Excel')
        }
    }

    const handleDescargarPDF = async (compraId: number) => {
        try {
            await compraService.descargarReciboPDF(compraId)
            toast.success('Recibo descargado exitosamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al descargar el recibo')
        }
    }

    const handleDescargarContratoPDF = async (compraId: number) => {
        try {
            await compraService.descargarContratoPDF(compraId)
            toast.success('Contrato descargado exitosamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al descargar el contrato')
        }
    }

    const handleEliminar = async () => {
        if (!compraAEliminar) return

        try {
            setEliminando(true)
            const response = await compraService.eliminarCompra(compraAEliminar.id)
            if (response.success) {
                toast.success('Compra eliminada exitosamente')
                setCompraAEliminar(null)
                cargarCompras()
            } else {
                toast.error(response.message || 'Error al eliminar la compra')
            }
        } catch (error) {
            toast.error('Error al eliminar la compra')
        } finally {
            setEliminando(false)
        }
    }

    const getBadgeEstado = (estado: string) => {
        switch (estado) {
            case 'activa':
                return <Badge variant="default" className="bg-green-500">Activa</Badge>
            case 'vendida':
                return <Badge variant="default" className="bg-blue-500">Vendida</Badge>
            case 'cancelada':
                return <Badge variant="destructive">Cancelada</Badge>
            default:
                return <Badge variant="secondary">{estado}</Badge>
        }
    }

    if (compraSeleccionada) {
        return (
            <DetalleCompra
                compraId={compraSeleccionada}
                onVolver={() => setCompraSeleccionada(null)}
                onActualizar={() => {
                    setCompraSeleccionada(null)
                    cargarCompras()
                }}
            />
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package size={24} />
                    Lista General de Compras
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filtros Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <Input
                            placeholder="Buscar por código, cliente, descripción..."
                            value={filtros.search}
                            onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                        />
                    </div>

                    <Select
                        value={filtros.estado}
                        onValueChange={(value) => setFiltros({ ...filtros, estado: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="activa">Activas</SelectItem>
                            <SelectItem value="vendida">Vendidas</SelectItem>
                            <SelectItem value="cancelada">Canceladas</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        <Button onClick={handleBuscar} className="gap-2">
                            <MagnifyingGlass size={16} />
                            Buscar
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                        >
                            <Funnel size={16} />
                        </Button>
                        <Button variant="outline" onClick={handleLimpiarFiltros}>
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                {/* Filtros Avanzados - Colapsables */}
                {mostrarFiltrosAvanzados && (
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Funnel size={16} />
                            Filtros Avanzados
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Filtro por Fecha Desde */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Fecha Desde</label>
                                <Input
                                    type="date"
                                    value={filtros.fecha_desde}
                                    onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                                />
                            </div>

                            {/* Filtro por Fecha Hasta */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Fecha Hasta</label>
                                <Input
                                    type="date"
                                    value={filtros.fecha_hasta}
                                    onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                                />
                            </div>

                            {/* Filtro por Categorías (MultiSelect) */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Categorías</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            {filtros.categoria_id.length === 0
                                                ? 'Todas las categorías'
                                                : `${filtros.categoria_id.length} seleccionada(s)`}
                                            <Funnel size={14} className="ml-2" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-sm">Seleccionar Categorías</h4>
                                                {filtros.categoria_id.length > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setFiltros({ ...filtros, categoria_id: [] })}
                                                    >
                                                        Limpiar
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {categorias.map((categoria) => (
                                                    <div key={categoria.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`cat-${categoria.id}`}
                                                            checked={filtros.categoria_id.includes(categoria.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setFiltros({
                                                                        ...filtros,
                                                                        categoria_id: [...filtros.categoria_id, categoria.id]
                                                                    })
                                                                } else {
                                                                    setFiltros({
                                                                        ...filtros,
                                                                        categoria_id: filtros.categoria_id.filter(id => id !== categoria.id)
                                                                    })
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`cat-${categoria.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            {categoria.nombre}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Botones de Reportes */}
                        <div className="flex gap-2 pt-2 border-t">
                            <Button onClick={handleDescargarReportePDF} variant="outline" className="gap-2">
                                <FilePdf size={16} />
                                Descargar Reporte PDF
                            </Button>
                            <Button onClick={handleDescargarReporteExcel} variant="outline" className="gap-2">
                                <FileXls size={16} />
                                Descargar Reporte Excel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total Compras</p>
                        <p className="text-xl font-bold">{paginacion.total}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">En esta página</p>
                        <p className="text-xl font-bold">{compras.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Página</p>
                        <p className="text-xl font-bold">{paginacion.current_page} / {paginacion.last_page}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Por página</p>
                        <p className="text-xl font-bold">{paginacion.per_page}</p>
                    </div>
                </div>

                {/* Tabla */}
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Monto Pagado</TableHead>
                                <TableHead className="text-right">P. Venta</TableHead>
                                <TableHead className="text-center">Margen</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        Cargando...
                                    </TableCell>
                                </TableRow>
                            ) : compras.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No se encontraron compras
                                    </TableCell>
                                </TableRow>
                            ) : (
                                compras.map((compra) => (
                                    <TableRow key={compra.id}>
                                        <TableCell className="font-mono text-xs">
                                            {compra.codigo_compra}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {compra.fecha_compra_formateada}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p className="font-medium">{compra.cliente_nombre}</p>
                                                {compra.cliente_codigo && (
                                                    <p className="text-xs text-muted-foreground">{compra.cliente_codigo}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[200px]">
                                                <p className="text-sm font-medium truncate">{compra.descripcion}</p>
                                                <p className="text-xs text-muted-foreground">{compra.categoria_nombre}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            Q{compra.monto_pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            Q{compra.precio_venta_sugerido.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {compra.margen_esperado >= 0 ? (
                                                <div className="flex items-center justify-center gap-1 text-green-600">
                                                    <TrendUp size={14} />
                                                    <span className="text-xs font-semibold">{compra.margen_esperado}%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1 text-red-600">
                                                    <TrendDown size={14} />
                                                    <span className="text-xs font-semibold">{compra.margen_esperado}%</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getBadgeEstado(compra.estado)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="ghost">
                                                        <DotsThreeVertical size={16} weight="bold" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setCompraSeleccionada(compra.id)}>
                                                        <Eye size={16} className="mr-2" />
                                                        Ver Detalle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDescargarPDF(compra.id)}>
                                                        <FilePdf size={16} className="mr-2" />
                                                        Descargar Recibo PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => compraService.descargarTicketPDF(compra.id).then(() => toast.success('Ticket descargado')).catch((error: any) => toast.error(error.message || 'Error al descargar el ticket'))}>
                                                        <FilePdf size={16} className="mr-2" />
                                                        Descargar Ticket
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDescargarContratoPDF(compra.id)}>
                                                        <FilePdf size={16} className="mr-2" />
                                                        Descargar Contrato PDF
                                                    </DropdownMenuItem>
                                                    {compra.estado === 'activa' && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => toast.info('Función de edición próximamente')}
                                                                disabled
                                                            >
                                                                <PencilSimple size={16} className="mr-2" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setCompraAEliminar(compra)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash size={16} className="mr-2" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginación */}
                {paginacion.last_page > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={paginacion.current_page === 1}
                            onClick={() => setPaginacion({ ...paginacion, current_page: paginacion.current_page - 1 })}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Página {paginacion.current_page} de {paginacion.last_page}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={paginacion.current_page === paginacion.last_page}
                            onClick={() => setPaginacion({ ...paginacion, current_page: paginacion.current_page + 1 })}
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
            </CardContent>

            {/* Dialog de confirmación de eliminación */}
            <AlertDialog open={!!compraAEliminar} onOpenChange={(open) => !open && setCompraAEliminar(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta compra?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la compra <strong>{compraAEliminar?.codigo_compra}</strong> y la prenda asociada del inventario.
                            <br /><br />
                            <span className="text-destructive font-semibold">Esta acción no se puede deshacer.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleEliminar}
                            disabled={eliminando}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {eliminando ? 'Eliminando...' : 'Eliminar Compra'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
