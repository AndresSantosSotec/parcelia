import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tag } from '@phosphor-icons/react'
import { Prenda, TasacionVenta } from '@/lib/types'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { MoneyDisplay } from '@/components/MoneyDisplay'

interface TasacionDialogProps {
  prenda: Prenda
  open: boolean
  onOpenChange: (open: boolean) => void
  onTasacionCompleta: () => void
}

export function TasacionDialog({ prenda, open, onOpenChange, onTasacionCompleta }: TasacionDialogProps) {
  const [prendas, setPrendas] = useKV<Prenda[]>('prendas', [])
  const [creditos] = useKV<any[]>('creditos', [])

  const credito = creditos?.find(c => c.id === prenda.creditoId)
  const montoPrestado = credito?.montoPrestado || prenda.avaluo * 0.6

  const precioSugeridoCalc = prenda.avaluo * 1.25
  const [precioVenta, setPrecioVenta] = useState(precioSugeridoCalc.toFixed(2))
  const [precioMinimo, setPrecioMinimo] = useState((precioSugeridoCalc * 0.8).toFixed(2))
  const [descuentoMaximo, setDescuentoMaximo] = useState('20')
  const [observaciones, setObservaciones] = useState('')

  const margen = parseFloat(precioVenta) - montoPrestado
  const margenPorcentaje = (margen / montoPrestado) * 100

  const handleGuardar = () => {
    const prendaActualizada: Prenda = {
      ...prenda,
      precioVenta: parseFloat(precioVenta),
      precioMinimo: parseFloat(precioMinimo),
      descuentoMaximo: parseFloat(descuentoMaximo),
      estado: 'en_venta',
      fechaPasaVenta: new Date().toISOString(),
      tasadorId: 'usuario-actual'
    }

    setPrendas((current = []) =>
      current.map(p => p.id === prenda.id ? prendaActualizada : p)
    )

    toast.success('Prenda tasada y disponible para venta')
    onTasacionCompleta()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="text-primary" />
            Tasación para Venta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">{prenda.descripcion}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Avalúo Original:</span>
                <MoneyDisplay amount={prenda.avaluo} size="md" className="font-semibold" />
              </div>
              <div>
                <span className="text-muted-foreground">Monto Prestado:</span>
                <MoneyDisplay amount={montoPrestado} size="md" className="font-semibold" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="precio-venta">Precio de Venta (Q)</Label>
              <Input
                id="precio-venta"
                type="number"
                step="0.01"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sugerido: Q {precioSugeridoCalc.toFixed(2)} (125% del avalúo)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio-minimo">Precio Mínimo (Q)</Label>
              <Input
                id="precio-minimo"
                type="number"
                step="0.01"
                value={precioMinimo}
                onChange={(e) => setPrecioMinimo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Precio por debajo del cual no se puede vender
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descuento-max">Descuento Máximo Permitido (%)</Label>
            <Input
              id="descuento-max"
              type="number"
              step="1"
              value={descuentoMaximo}
              onChange={(e) => setDescuentoMaximo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Estado físico, detalles importantes..."
              rows={3}
            />
          </div>

          <div className="bg-accent/10 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold">Proyección de Utilidad</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Costo (Préstamo):</span>
                <MoneyDisplay amount={montoPrestado} size="md" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Precio Venta:</span>
                <MoneyDisplay amount={parseFloat(precioVenta) || 0} size="md" />
              </div>
              <div className="col-span-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Utilidad Esperada:</span>
                <div className="flex items-center gap-2">
                  <MoneyDisplay amount={margen} size="lg" className="text-accent" />
                  <span className="text-sm text-muted-foreground">
                    ({margenPorcentaje.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleGuardar} className="flex-1">
              <Tag weight="bold" />
              Guardar y Poner en Venta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
