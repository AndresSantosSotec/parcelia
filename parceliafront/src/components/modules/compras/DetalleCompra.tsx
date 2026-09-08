import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    ArrowLeft,
    User,
    Package,
    CurrencyCircleDollar,
    CalendarBlank,
    MapPin,
    Receipt,
    TrendUp,
    Warning,
    CheckCircle,
    FilePdf,
    CaretUp,
    CaretDown
} from '@phosphor-icons/react'
import { compraService, type Compra } from '@/services/compraService'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface DetalleCompraProps {
    compraId: number
    onVolver: () => void
    onActualizar: () => void
}

export function DetalleCompra({ compraId, onVolver, onActualizar }: DetalleCompraProps) {
    const [compra, setCompra] = useState<Compra | null>(null)
    const [loading, setLoading] = useState(true)
    const [motivoCancelacion, setMotivoCancelacion] = useState('')
    const [procesando, setProcesando] = useState(false)
    const [seccionesAbiertas, setSeccionesAbiertas] = useState({
        cliente: true,
        producto: true,
        valores: true,
        tracking: true,
    })

    useEffect(() => {
        cargarDetalle()
    }, [compraId])

    const cargarDetalle = async () => {
        try {
            setLoading(true)
            const response = await compraService.obtenerDetalle(compraId)
            if (response.success && response.data) {
                console.log('📦 Detalle de compra recibido:', response.data)
                console.log('👤 Cliente nombre:', response.data.cliente_nombre)
                console.log('👤 Cliente objeto:', response.data.cliente)
                console.log('📋 Campos dinámicos:', response.data.campos_dinamicos)
                console.log('📋 Datos adicionales:', response.data.datos_adicionales)
                setCompra(response.data)
            } else {
                toast.error('No se pudo cargar el detalle de la compra')
                onVolver()
            }
        } catch (error) {
            toast.error('Error al cargar el detalle')
            onVolver()
        } finally {
            setLoading(false)
        }
    }

    const handleCancelar = async () => {
        if (!motivoCancelacion.trim()) {
            toast.error('Por favor ingrese un motivo de cancelación')
            return
        }

        try {
            setProcesando(true)
            const response = await compraService.cancelarCompra(compraId, motivoCancelacion)
            if (response.success) {
                toast.success('Compra cancelada exitosamente')
                onActualizar()
            } else {
                toast.error(response.message || 'Error al cancelar la compra')
            }
        } catch (error) {
            toast.error('Error al cancelar la compra')
        } finally {
            setProcesando(false)
        }
    }

    const toggleSeccion = (seccion: keyof typeof seccionesAbiertas) => {
        setSeccionesAbiertas(prev => ({ ...prev, [seccion]: !prev[seccion] }))
    }

    const handleDescargarPDF = async () => {
        if (!compra) return
        try {
            await compraService.descargarReciboPDF(compra.id)
            toast.success('Recibo descargado exitosamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al descargar el recibo')
        }
    }

    const handleDescargarContratoPDF = async () => {
        if (!compra) return
        try {
            await compraService.descargarContratoPDF(compra.id)
            toast.success('Contrato descargado exitosamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al descargar el contrato')
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <p>Cargando detalle...</p>
                </CardContent>
            </Card>
        )
    }

    if (!compra) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <p>No se encontró la compra</p>
                    <Button onClick={onVolver} className="mt-4">Volver</Button>
                </CardContent>
            </Card>
        )
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onVolver}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Detalle de Compra</h1>
                        <p className="text-muted-foreground font-mono">{compra.codigo_compra}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getBadgeEstado(compra.estado)}
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDescargarPDF}
                    >
                        <FilePdf size={16} className="mr-2" />
                        Descargar Recibo
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDescargarContratoPDF}
                    >
                        <FilePdf size={16} className="mr-2" />
                        Descargar Contrato
                    </Button>
                    {compra.estado === 'activa' && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Warning size={16} className="mr-2" />
                                    Cancelar Compra
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Cancelar esta compra?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción marcará la compra como cancelada. La prenda seguirá en inventario pero quedará registrado.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2 py-4">
                                    <Label htmlFor="motivo">Motivo de cancelación</Label>
                                    <Textarea
                                        id="motivo"
                                        placeholder="Ingrese el motivo de la cancelación..."
                                        value={motivoCancelacion}
                                        onChange={(e) => setMotivoCancelacion(e.target.value)}
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCancelar} disabled={procesando}>
                                        {procesando ? 'Procesando...' : 'Confirmar Cancelación'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Información del Cliente */}
                    <Collapsible open={seccionesAbiertas.cliente} onOpenChange={() => toggleSeccion('cliente')}>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <User size={20} />
                                            Información del Cliente/Vendedor
                                        </div>
                                        {seccionesAbiertas.cliente ? <CaretUp size={20} /> : <CaretDown size={20} />}
                                    </CardTitle>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Nombre</p>
                                        <p className="font-medium">
                                            {compra.cliente_nombre || compra.cliente?.nombre_completo || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Código Cliente</p>
                                        <p className="font-mono text-sm">
                                            {compra.cliente_codigo || compra.cliente?.codigo || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Documento</p>
                                        <p className="font-medium">{compra.cliente_documento || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Teléfono</p>
                                        <p className="font-medium">{compra.cliente_telefono || '-'}</p>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    {/* Detalles del Producto */}
                    <Collapsible open={seccionesAbiertas.producto} onOpenChange={() => toggleSeccion('producto')}>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package size={20} />
                                            Detalles del Producto Adquirido
                                        </div>
                                        {seccionesAbiertas.producto ? <CaretUp size={20} /> : <CaretDown size={20} />}
                                    </CardTitle>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Categoría</p>
                                        <p className="font-medium">{compra.categoria_nombre}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Descripción</p>
                                        <p className="font-medium">{compra.descripcion}</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Marca</p>
                                            <p className="font-medium">{compra.marca || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Modelo</p>
                                            <p className="font-medium">{compra.modelo || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Serie</p>
                                            <p className="font-mono text-sm">{compra.serie || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Color</p>
                                            <p className="font-medium">{compra.color || '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Condición</p>
                                        <Badge variant="outline" className="mt-1">
                                            {compra.condicion.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    {/* Campos Dinámicos desde tabla relacional */}
                    {compra.campos_dinamicos && compra.campos_dinamicos.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt size={20} />
                                    Información Adicional
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    {compra.campos_dinamicos.map((campo, idx) => (
                                        <div key={idx}>
                                            <p className="text-xs text-muted-foreground">{campo.campo_nombre}</p>
                                            <p className="font-medium">{campo.valor_formateado}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Datos Adicionales desde JSON */}
                    {compra.datos_adicionales && Object.keys(compra.datos_adicionales).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt size={20} />
                                    Datos Específicos del Producto
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(compra.datos_adicionales).map(([key, value]) => (
                                        <div key={key}>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="font-medium">{String(value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Observaciones */}
                    {compra.observaciones && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Observaciones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-line">{compra.observaciones}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Columna Derecha */}
                <div className="space-y-6">
                    {/* Valores Económicos */}
                    <Card className="border-primary/50">
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="flex items-center gap-2">
                                <CurrencyCircleDollar size={20} />
                                Valores de la Compra
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <span className="text-sm text-muted-foreground">Valor Tasación</span>
                                <span className="text-lg font-semibold">
                                    Q{compra.valor_tasacion.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                                <span className="text-sm font-medium text-red-800">Monto Pagado</span>
                                <span className="text-xl font-bold text-red-600">
                                    Q{compra.monto_pagado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-sm font-medium text-green-800">Precio Venta</span>
                                <span className="text-xl font-bold text-green-600">
                                    Q{compra.precio_venta_sugerido.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <Separator />

                            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <TrendUp size={20} />
                                    <span className="font-medium">Margen Esperado</span>
                                </div>
                                <span className="text-2xl font-bold text-primary">
                                    {compra.margen_esperado}%
                                </span>
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>• Método de pago: <span className="font-medium">{compra.metodo_pago}</span></p>
                                <p>• Afecta caja: <span className="font-medium">{compra.genera_egreso_caja ? 'Sí' : 'No'}</span></p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información de Tracking */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarBlank size={20} />
                                Tracking
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Fecha de Compra</p>
                                <p className="font-medium">{compra.fecha_compra_formateada}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-xs text-muted-foreground">Usuario</p>
                                <p className="font-medium">{compra.usuario?.nombre || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sucursal</p>
                                <p className="font-medium flex items-center gap-2">
                                    <MapPin size={14} />
                                    {compra.sucursal?.nombre || '-'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prenda Generada */}
                    {compra.prenda && (
                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-900">
                                    <CheckCircle size={20} />
                                    Prenda en Inventario
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div>
                                    <p className="text-xs text-blue-700">Código de Prenda</p>
                                    <p className="font-mono font-bold text-blue-900">{compra.prenda.codigo_prenda}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-700">Estado Actual</p>
                                    <Badge variant="outline" className="mt-1 border-blue-400 text-blue-800">
                                        {compra.prenda.estado}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
