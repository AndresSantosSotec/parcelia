import { useState, useEffect } from 'react'
import { PrendaEmpenada } from '@/types/creditoPrendario.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { prendaService } from '@/services/prenda.service'

interface EditarPrendaModalProps {
  prenda: PrendaEmpenada | null
  abierto: boolean
  onCerrar: () => void
  onActualizado: () => void
}

export function EditarPrendaModal({ prenda, abierto, onCerrar, onActualizado }: EditarPrendaModalProps) {
  const [loading, setLoading] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [avaluo, setAvaluo] = useState<string>('')
  const [precioVenta, setPrecioVenta] = useState<string>('')
  const [estado, setEstado] = useState('')
  const [ubicacionBodega, setUbicacionBodega] = useState('')

  // Verificar si la prenda está en estado no editable
  const esNoEditable = (prenda?.estado as string) === 'pagada' || prenda?.estado === 'recuperada' || prenda?.estado === 'vendida'

  useEffect(() => {
    if (prenda) {
      // 🔍 DEBUG: Ver datos completos de la prenda
      console.log('🔍 DEBUG EditarPrendaModal - Datos de prenda:', {
        id: prenda.id,
        codigo_prenda: prenda.codigo_prenda,
        estado: prenda.estado,
        credito_prendario_id: prenda.credito_prendario_id,
        credito: prenda.credito,
        credito_estado: prenda.credito?.estado,
        credito_fecha_vencimiento: prenda.credito?.fecha_vencimiento
      })
      
      setDescripcion(prenda.descripcion_general || '')
      setCategoria(prenda.categoria_producto_id || '')
      setAvaluo(String(prenda.valor_tasacion || ''))
      setPrecioVenta(String(prenda.valor_venta || prenda.valor_venta_final || ''))
      setEstado(prenda.estado || '')
      setUbicacionBodega(prenda.ubicacion_detalle || '')
    }
  }, [prenda])

  const handleGuardar = async () => {
    if (!prenda) return

    if (!descripcion.trim()) {
      toast.error('La descripción es requerida')
      return
    }

    if (!avaluo || Number(avaluo) <= 0) {
      toast.error('El avalúo debe ser mayor a cero')
      return
    }

    // Validación: Permitir en_venta si el crédito está vencido o en mora
    if (estado === 'en_venta' && prenda.credito_prendario_id) {
      // Si la prenda YA ESTÁ en venta, permitir (no validar)
      if (prenda.estado !== 'en_venta') {
        const estadoCredito = prenda.credito?.estado
        const fechaVencimiento = prenda.credito?.fecha_vencimiento
        const estadosPermitidos = ['vencido', 'en_mora', 'cancelado', 'incobrable']
        
        // ⚠️ LÓGICA MEJORADA: Verificar si está vencido por fecha aunque diga "vigente"
        const estaVencidoPorFecha = fechaVencimiento && new Date(fechaVencimiento) < new Date()
        
        if (!estadoCredito) {
          toast.warning('No se puede verificar el estado del crédito. Refrescando datos...')
          onActualizado() // Refrescar datos
          return
        }
        
        // Si el estado no está en la lista permitida Y tampoco está vencido por fecha
        if (!estadosPermitidos.includes(estadoCredito) && !estaVencidoPorFecha) {
          toast.error(`No se puede marcar como "En Venta". El crédito está "${estadoCredito}" y no ha vencido. Primero cambie el estado del crédito o espere a la fecha de vencimiento.`)
          return
        }
        
        // ✅ Si está vencido por fecha, permitir (backend actualizará el estado automáticamente)
        if (estadoCredito === 'vigente' && estaVencidoPorFecha) {
          toast.info('El crédito está vencido por fecha. El sistema actualizará el estado automáticamente.')
        }
      }
    }

    try {
      setLoading(true)

      await prendaService.update(prenda.id, {
        descripcion_general: descripcion,
        categoria_producto_id: categoria || undefined,
        valor_tasacion: Number(avaluo),
        precio_venta: precioVenta ? Number(precioVenta) : undefined,
        estado: estado as any,
        ubicacion_bodega: ubicacionBodega || undefined
      } as any)

      toast.success('Prenda actualizada exitosamente')
      onActualizado()
      onCerrar()
    } catch (error: any) {
      console.error('Error al actualizar prenda:', error)
      toast.error(error.message || 'Error al actualizar la prenda')
    } finally {
      setLoading(false)
    }
  }

  if (!prenda) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esNoEditable ? 'Ver Prenda (No Editable)' : 'Editar Prenda'}
          </DialogTitle>
          <DialogDescription>
            {esNoEditable 
              ? `Esta prenda está en estado "${prenda?.estado}" y no puede ser editada. Solo puede ser eliminada.`
              : 'Modifica los datos de la prenda'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción de la prenda"
                disabled={esNoEditable}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Categoría"
                disabled={esNoEditable}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={estado} onValueChange={setEstado} disabled={esNoEditable}>
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_custodia">En Custodia</SelectItem>
                  <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                  <SelectItem value="recuperada">Recuperada</SelectItem>
                  <SelectItem 
                    value="en_venta" 
                    disabled={
                      !!prenda?.credito_prendario_id && 
                      prenda?.estado !== 'en_venta' && 
                      !['vencido', 'en_mora', 'cancelado', 'incobrable'].includes(prenda?.credito?.estado || '') &&
                      !(prenda?.credito?.fecha_vencimiento && new Date(prenda.credito.fecha_vencimiento) < new Date())
                    }
                  >
                    En Venta {
                      prenda?.credito_prendario_id && 
                      prenda?.estado !== 'en_venta' &&
                      !['vencido', 'en_mora', 'cancelado', 'incobrable'].includes(prenda?.credito?.estado || '') &&
                      !(prenda?.credito?.fecha_vencimiento && new Date(prenda.credito.fecha_vencimiento) < new Date())
                        ? '(No disponible - Crédito activo sin vencer)' 
                        : ''
                    }
                  </SelectItem>
                  <SelectItem value="vendida">Vendida</SelectItem>
                  <SelectItem value="extraviada">Extraviada</SelectItem>
                  <SelectItem value="danada">Dañada</SelectItem>
                </SelectContent>
              </Select>
              {(() => {
                const estadoCredito = prenda?.credito?.estado
                const fechaVencimiento = prenda?.credito?.fecha_vencimiento
                const estaVencidoPorFecha = fechaVencimiento && new Date(fechaVencimiento) < new Date()
                const estadosPermitidos = ['vencido', 'en_mora', 'cancelado', 'incobrable']
                
                // Si tiene crédito y NO está en venta actualmente
                if (prenda?.credito_prendario_id && prenda?.estado !== 'en_venta') {
                  // Crédito vencido por estado o por fecha
                  if (estadosPermitidos.includes(estadoCredito || '') || estaVencidoPorFecha) {
                    return (
                      <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                        ✓ {estaVencidoPorFecha && estadoCredito === 'vigente' 
                          ? `Crédito vencido (${fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString() : ''})` 
                          : `Crédito ${estadoCredito}`}: Prenda puede marcarse "En Venta"
                      </p>
                    )
                  }
                  // Crédito activo y no vencido
                  return (
                    <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                      ⚠️ Crédito activo ({estadoCredito || 'desconocido'}){fechaVencimiento ? ` - Vence: ${new Date(fechaVencimiento).toLocaleDateString()}` : ''}. Para marcar "En Venta", espere al vencimiento o cambie el estado del crédito.
                    </p>
                  )
                }
                return null
              })()}
              {prenda?.estado === 'en_venta' && (
                <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">
                  ℹ️ Prenda actualmente en venta. Puede cambiar a otro estado si es necesario.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="avaluo">Avalúo (Q) *</Label>
              <Input
                id="avaluo"
                type="number"
                step="0.01"
                min="0"
                value={avaluo}
                onChange={(e) => setAvaluo(e.target.value)}
                placeholder="0.00"
                disabled={esNoEditable}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precioVenta">Precio Venta (Q)</Label>
              <Input
                id="precioVenta"
                type="number"
                step="0.01"
                min="0"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                placeholder="0.00"
                disabled={esNoEditable}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="ubicacionBodega">Ubicación en Bodega</Label>
              <Input
                id="ubicacionBodega"
                value={ubicacionBodega}
                onChange={(e) => setUbicacionBodega(e.target.value)}
                placeholder="Ej: Estante A-3, Caja 15"
                disabled={esNoEditable}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={loading}>
            {esNoEditable ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!esNoEditable && (
            <Button onClick={handleGuardar} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
