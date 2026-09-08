import { useState } from 'react'
import { PrendaEmpenada } from '@/types/creditoPrendario.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { prendaService } from '@/services/prenda.service'
import { MoneyDisplay } from '@/components/MoneyDisplay'

interface EliminarPrendaModalProps {
  prenda: PrendaEmpenada | null
  abierto: boolean
  onCerrar: () => void
  onEliminado: () => void
}

export function EliminarPrendaModal({ prenda, abierto, onCerrar, onEliminado }: EliminarPrendaModalProps) {
  const [loading, setLoading] = useState(false)

  const handleEliminar = async () => {
    if (!prenda) return

    try {
      setLoading(true)
      
      await prendaService.delete(prenda.id)

      toast.success('Prenda eliminada exitosamente')
      onEliminado()
      onCerrar()
    } catch (error: any) {
      console.error('Error al eliminar prenda:', error)
      toast.error(error.message || 'Error al eliminar la prenda')
    } finally {
      setLoading(false)
    }
  }

  if (!prenda) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Prenda</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert variant="destructive">
            <Warning className="h-4 w-4" />
            <AlertTitle>Confirmar Eliminación</AlertTitle>
            <AlertDescription>
              ¿Estás seguro de que deseas eliminar esta prenda?
              <br />
              <br />
              <strong>Descripción:</strong> {prenda.descripcion_general}
              <br />
              <strong>Categoría:</strong> {(prenda.categoria as any)?.nombre || (typeof prenda.categoria === 'string' ? prenda.categoria : 'N/A')}
              <br />
              <strong>Avalúo:</strong> <MoneyDisplay amount={prenda.valor_tasacion || 0} />
              <br />
              <strong>Estado:</strong> {prenda.estado}
              <br />
              <br />
              Esta acción marcará la prenda como eliminada y no podrá ser recuperada.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleEliminar} disabled={loading}>
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
