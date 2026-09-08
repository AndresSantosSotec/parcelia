import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Plus, Barcode } from 'lucide-react'
import { type AgregarProductoDTO } from '@/services/venta.service'

interface BuscarProductoProps {
  onAgregar: (producto: AgregarProductoDTO) => Promise<void>
  loading?: boolean
}

const BuscarProducto: React.FC<BuscarProductoProps> = ({ onAgregar, loading }) => {
  const [busqueda, setBusqueda] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio] = useState('')
  const [descuento, setDescuento] = useState('')
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<any>(null)

  const handleBuscar = () => {
    // Implementar búsqueda de prendas/productos
    console.log('Buscando:', busqueda)
  }

  const handleAgregar = async () => {
    if (!precio) {
      alert('Debe ingresar un precio')
      return
    }

    const producto: AgregarProductoDTO = {
      prenda_id: prendaSeleccionada?.id,
      cantidad: cantidad,
      precio_unitario: parseFloat(precio),
      descuento: descuento ? parseFloat(descuento) : 0,
      tipo_precio: 'normal',
    }

    await onAgregar(producto)

    // Limpiar formulario
    setBusqueda('')
    setCantidad(1)
    setPrecio('')
    setDescuento('')
    setPrendaSeleccionada(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Producto / Prenda
        </CardTitle>
        <CardDescription>
          Escanee el código de barras o busque por descripción
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </div>
          <Button onClick={handleBuscar} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Barcode className="h-4 w-4" />
          </Button>
        </div>

        {prendaSeleccionada && (
          <div className="p-4 border rounded-lg bg-muted">
            <p className="font-semibold">{prendaSeleccionada.descripcion}</p>
            <p className="text-sm text-muted-foreground">
              Código: {prendaSeleccionada.codigo}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input
              id="cantidad"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio Unitario</Label>
            <Input
              id="precio"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descuento">Descuento</Label>
            <Input
              id="descuento"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleAgregar}
          disabled={loading || !precio}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar a la Venta
        </Button>
      </CardContent>
    </Card>
  )
}

export default BuscarProducto
