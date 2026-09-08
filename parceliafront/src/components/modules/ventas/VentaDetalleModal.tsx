import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    X,
    User,
    Storefront,
    CurrencyCircleDollar,
    FileText,
    CalendarBlank,
    Package,
    CreditCard,
    IdentificationCard,
    CheckCircle,
    Clock,
    XCircle,
    ArrowsClockwise
} from '@phosphor-icons/react'

interface VentaDetalleModalProps {
    isOpen: boolean
    onClose: () => void
    venta: any
}

export function VentaDetalleModal({ isOpen, onClose, venta }: VentaDetalleModalProps) {
    if (!venta) return null

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'pagada':
                return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle weight="fill" /> Pagada</Badge>
            case 'pendiente':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1"><Clock weight="fill" /> Pendiente</Badge>
            case 'cancelada':
                return <Badge variant="destructive" className="gap-1"><XCircle weight="fill" /> Cancelada</Badge>
            case 'devuelta':
                return <Badge variant="secondary" className="gap-1"><ArrowsClockwise weight="fill" /> Devuelta</Badge>
            default:
                return <Badge variant="outline">{estado}</Badge>
        }
    }

    const formatFecha = (fecha: string) => {
        try {
            return format(new Date(fecha), "dd/MM/yyyy HH:mm:ss", { locale: es })
        } catch {
            return fecha
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <DialogTitle className="text-xl font-bold">Vista de venta</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Información de Venta */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Información de Venta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Vendedor</Label>
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                    <User size={18} className="text-muted-foreground" />
                                    <span className="text-sm">{venta.vendedor?.nombre || 'admin'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Sucursal</Label>
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                    <Storefront size={18} className="text-muted-foreground" />
                                    <span className="text-sm">{venta.sucursal?.nombre || 'Tienda Principal'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Moneda</Label>
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                    <CurrencyCircleDollar size={18} className="text-muted-foreground" />
                                    <span className="text-sm">{venta.moneda?.nombre || 'Quetzal'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo comprobante</Label>
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                    <FileText size={18} className="text-muted-foreground" />
                                    <span className="text-sm">{venta.tipo_documento || 'Nota'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>NIT</Label>
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                    <IdentificationCard size={18} className="text-muted-foreground" />
                                    <span className="text-sm">{venta.cliente_nit || 'C/F'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                    <User size={18} className="text-muted-foreground" />
                                    <span className="text-sm font-medium">{venta.cliente_nombre || 'Cliente General'}</span>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-3 flex items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch checked={venta.consumidor_final} disabled />
                                    <Label>Usar Consumidor Final</Label>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Estado</Label>
                                        <div className="flex gap-2">
                                            {getEstadoBadge(venta.estado)}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Fecha y Hora Venta</Label>
                                        <div className="p-2 border rounded-md bg-muted/30 text-sm">
                                            {formatFecha(venta.fecha_venta)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Información de productos */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Información de productos</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-center w-[80px]">Cantidad</TableHead>
                                        <TableHead className="text-center w-[120px]">Precio Unit.</TableHead>
                                        <TableHead className="text-center w-[100px]">Desc.</TableHead>
                                        <TableHead className="text-center w-[120px]">Costo (Compra)</TableHead>
                                        <TableHead className="text-center w-[100px]">% Margen</TableHead>
                                        <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {venta.detalles && venta.detalles.length > 0 ? (
                                        venta.detalles.map((detalle: any) => {
                                            const precioCompra = detalle.prenda?.valor_prestamo
                                                ? parseFloat(detalle.prenda.valor_prestamo)
                                                : detalle.compra?.monto_pagado
                                                    ? parseFloat(detalle.compra.monto_pagado)
                                                    : 0
                                            
                                            const cantidad = detalle.cantidad || 1
                                            const costoTotalItem = precioCompra * cantidad
                                            const subtotalItem = parseFloat(detalle.subtotal || 0)
                                            const diferencia = subtotalItem - costoTotalItem
                                            const margen = costoTotalItem > 0 ? (diferencia / costoTotalItem) * 100 : 0

                                            return (
                                                <TableRow key={detalle.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{detalle.prenda?.descripcion || 'Sin descripción'}</span>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                ({detalle.prenda?.codigo_prenda || 'N/A'})
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">{cantidad}</TableCell>
                                                    <TableCell className="text-center">
                                                        <MoneyDisplay amount={detalle.precio_unitario} className="text-sm" />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <MoneyDisplay amount={detalle.descuento} className="text-sm text-red-500" />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <MoneyDisplay amount={precioCompra} className="text-sm" />
                                                    </TableCell>
                                                    <TableCell className={`text-center font-medium ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {margen.toFixed(2)}%
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <MoneyDisplay amount={detalle.subtotal} className="font-semibold text-sm" />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                                                No hay productos registrados
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Impuestos (Simulados según Imagen) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label>Impuestos</Label>
                                <div className="p-2 border rounded-md bg-muted/30 text-sm">Tasa 12.00%</div>
                            </div>
                            <div className="space-y-2">
                                <Label>Monto Gravable</Label>
                                <div className="p-2 border rounded-md bg-muted/30 text-sm">
                                    <MoneyDisplay amount={(venta.total_final || 0) / 1.12} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>IVA</Label>
                                <div className="p-2 border rounded-md bg-muted/30 text-sm">
                                    <MoneyDisplay amount={(venta.total_final || 0) - ((venta.total_final || 0) / 1.12)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Totales */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Totales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Descuentos</Label>
                                <div className="p-2 border rounded-md bg-muted/30 text-sm font-medium text-red-600">
                                    <MoneyDisplay amount={venta.total_descuentos || 0} />
                                </div>
                            </div>
                            <div className="space-y-2 text-right">
                                <Label>Total</Label>
                                <div className="p-2 border-2 border-primary/20 rounded-md bg-primary/5 text-lg font-bold">
                                    <MoneyDisplay amount={venta.total_final || 0} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Métodos de Pago */}
                    <section className="space-y-4 pb-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Métodos de Pago</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Método</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead>Referencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {venta.pagos && venta.pagos.length > 0 ? (
                                        venta.pagos.map((pago: any) => (
                                            <TableRow key={pago.id}>
                                                <TableCell className="capitalize">{pago.metodo}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <MoneyDisplay amount={pago.monto} />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{pago.referencia || '—'}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-4">
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                                    {venta.estado === 'pendiente' ? 'Esperando pago' : 'No se registraron pagos'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Total Pagado</Label>
                                <div className="p-2 border rounded-md bg-muted/30 text-lg font-bold text-green-600">
                                    <MoneyDisplay amount={venta.total_pagado || 0} />
                                </div>
                            </div>
                            <div className="space-y-2 text-right">
                                <Label>Cambio a Devolver</Label>
                                <div className="p-2 border rounded-md bg-muted/30 text-lg font-bold text-blue-600">
                                    <MoneyDisplay amount={venta.cambio_devuelto || 0} />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    {venta.estado === 'pendiente' && (
                        <Button>Finalizar Venta</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
