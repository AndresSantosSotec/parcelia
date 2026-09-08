import { useState } from 'react'
import { CreditoPrendario } from '@/types/creditoPrendario.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'

interface EliminarCreditoModalProps {
  credito: CreditoPrendario | null
  abierto: boolean
  onCerrar: () => void
  onEliminado: () => void
}

export function EliminarCreditoModal({ credito, abierto, onCerrar, onEliminado }: EliminarCreditoModalProps) {
  const [loading, setLoading] = useState(false)

  const handleEliminar = async () => {
    if (!credito) return

    try {
      setLoading(true)
      
      await creditoPrendarioService.delete(credito.id)

      toast.success('Crédito eliminado exitosamente')
      onEliminado()
      onCerrar()
    } catch (error: any) {
      console.error('Error al eliminar crédito:', error)
      toast.error(error.message || 'Error al eliminar el crédito')
    } finally {
      setLoading(false)
    }
  }

  if (!credito) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Crédito Prendario</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert variant="destructive">
            <Warning className="h-4 w-4" />
            <AlertTitle>Confirmar Eliminación</AlertTitle>
            <AlertDescription>
              ¿Estás seguro de que deseas eliminar el crédito{' '}
              <strong>{credito.codigo_credito || credito.numero_credito}</strong>?
              <br />
              <br />
              Cliente: {credito.cliente?.nombres} {credito.cliente?.apellidos}
              <br />
              Monto: Q {credito.monto_solicitado?.toLocaleString('es-GT') || '0.00'}
              <br />
              <br />
              Esta acción marcará el crédito como eliminado y no podrá ser recuperado.
              <br />
              <br />
              <span className="text-xs opacity-90 block border-t pt-2 mt-2">
                <strong>Nota:</strong> Si el crédito ya tiene movimientos registrados (pagos, refrendos, etc.), la eliminación fallará. Utilice la opción de <strong>Anular Crédito</strong> desde la vista de detalle en su lugar.
              </span>
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
