import { useState, useEffect } from 'react'
import { CreditoPrendario } from '@/types/creditoPrendario.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { creditoPrendarioService } from '@/services/creditoPrendario.service'

interface EditarCreditoModalProps {
  credito: CreditoPrendario | null
  abierto: boolean
  onCerrar: () => void
  onActualizado: () => void
}

export function EditarCreditoModal({ credito, abierto, onCerrar, onActualizado }: EditarCreditoModalProps) {
  const [loading, setLoading] = useState(false)
  const [montoAprobado, setMontoAprobado] = useState<string>('')
  const [tasaInteres, setTasaInteres] = useState<string>('')
  const [estado, setEstado] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')
  const [esSoloLectura, setEsSoloLectura] = useState(false)

  const [transicionesDisponibles, setTransicionesDisponibles] = useState<any[]>([])

  const cargarTransiciones = async (creditoId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/creditos-prendarios/${creditoId}/transiciones`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        }
      })
      const json = await res.json()
      if (json.success && json.data) {
        setTransicionesDisponibles(json.data.transiciones_disponibles || [])
      }
    } catch (err) {
      console.error('Error al cargar transiciones del crédito:', err)
    }
  }

  useEffect(() => {
    if (credito) {
      setMontoAprobado(String(credito.monto_aprobado || credito.monto_solicitado || ''))
      setTasaInteres(String(credito.tasa_interes || ''))
      setEstado(credito.estado || '')
      setObservaciones(credito.observaciones || '')

      const tienePrendasVendidas = credito.prendas?.some((p: any) => p.estado === 'vendida' || p.estado === 'rematada')
      const estadoFinal = ['vendido', 'rematado', 'incobrable'].includes(credito.estado || '')
      setEsSoloLectura(tienePrendasVendidas || estadoFinal)

      cargarTransiciones(credito.id)
    }
  }, [credito])

  const handleGuardar = async () => {
    if (!credito) return

    try {
      setLoading(true)

      // Actualizar crédito usando el endpoint
      await creditoPrendarioService.update(credito.id, {
        estado: estado as any,
        observaciones
      })

      toast.success('Crédito actualizado exitosamente')
      onActualizado()
      onCerrar()
    } catch (error: any) {
      console.error('Error al actualizar crédito:', error)
      toast.error(error.message || 'Error al actualizar el crédito')
    } finally {
      setLoading(false)
    }
  }

  if (!credito) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Crédito Prendario</DialogTitle>
          <DialogDescription>
            Modifica los datos del crédito {credito.codigo_credito || credito.numero_credito}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {esSoloLectura && (
            <div className="bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200 p-3 rounded text-sm" role="alert">
              <strong>Modo solo lectura:</strong> Este crédito no puede ser modificado porque contiene prendas que ya han sido vendidas o su estado es final. Se conserva únicamente como histórico.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto_aprobado">Monto Aprobado (Q)</Label>
              <Input
                id="monto_aprobado"
                type="number"
                step="0.01"
                min="0"
                value={montoAprobado}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tasa_interes">Tasa de Interés por Período (%)</Label>
              <Input
                id="tasa_interes"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={tasaInteres}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={estado} onValueChange={setEstado} disabled={esSoloLectura}>
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
               <SelectContent>
                  {/* Incluir siempre el estado actual para visualizarlo correctamente si no se cambia */}
                  {credito && (
                    <SelectItem value={credito.estado}>
                      {credito.estado.charAt(0).toUpperCase() + credito.estado.slice(1).replace('_', ' ')} (Actual)
                    </SelectItem>
                  )}
                  {transicionesDisponibles.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales..."
              disabled={esSoloLectura}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={loading}>
            {esSoloLectura ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!esSoloLectura && (
            <Button onClick={handleGuardar} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
