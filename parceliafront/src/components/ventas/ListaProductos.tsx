import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Package } from 'lucide-react'
import { type VentaDetalle } from '@/services/venta.service'

interface ListaProductosProps {
  detalles: VentaDetalle[]
  onEliminar: (detalleId: number) => Promise<void>
  loading?: boolean
}

const ListaProductos: React.FC<ListaProductosProps> = ({ detalles, onEliminar, loading }) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    }).format(amount)
  }

  if (!detalles || detalles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold">No hay productos en la venta</p>
          <p className="text-sm">Agregue productos para continuar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos en la Venta
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {detalles.length} {detalles.length === 1 ? 'producto' : 'productos'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalles.map((detalle) => (
              <TableRow key={detalle.id}>
                <TableCell className="font-mono text-sm">
                  {detalle.codigo}
                </TableCell>
                <TableCell>{detalle.descripcion}</TableCell>
                <TableCell className="text-right">{detalle.cantidad}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(detalle.precio_unitario)}
                </TableCell>
                <TableCell className="text-right">
                  {detalle.descuento > 0 && formatMoney(detalle.descuento)}
                  {detalle.descuento_porcentaje > 0 && `${detalle.descuento_porcentaje}%`}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(detalle.total)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEliminar(detalle.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default ListaProductos
