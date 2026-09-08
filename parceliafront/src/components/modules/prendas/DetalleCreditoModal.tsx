import { PrendaEmpenada } from '@/types/creditoPrendario.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DetalleCreditoModalProps {
  prenda: PrendaEmpenada | null
  abierto: boolean
  onCerrar: () => void
}

export function DetalleCreditoModal({ prenda, abierto, onCerrar }: DetalleCreditoModalProps) {
  if (!prenda) return null

  const credito = prenda.credito
  const tieneCredito = prenda.credito_prendario_id && credito

  const formatFecha = (fecha: string | undefined) => {
    if (!fecha) return '-'
    try {
      return format(new Date(fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
      return '-'
    }
  }

  const getEstadoBadge = (estado: string | undefined) => {
    if (!estado) return <Badge variant="outline">Sin estado</Badge>

    const estados: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      vigente: { label: 'Vigente', variant: 'default' },
      vencido: { label: 'Vencido', variant: 'destructive' },
      en_mora: { label: 'En Mora', variant: 'destructive' },
      pagado: { label: 'Pagado', variant: 'secondary' },
      cancelado: { label: 'Cancelado', variant: 'outline' },
      incobrable: { label: 'Incobrable', variant: 'destructive' },
    }
    
    const estadoInfo = estados[estado] || { label: estado, variant: 'outline' as const }
    return <Badge variant={estadoInfo.variant}>{estadoInfo.label}</Badge>
  }

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Prenda y Crédito</DialogTitle>
          <DialogDescription>
            Información completa de la prenda {prenda.codigo_prenda}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la Prenda */}
          <div>
            <h3 className="font-semibold text-lg mb-3 border-b pb-2">📦 Información de la Prenda</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-mono font-semibold">{prenda.codigo_prenda}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium">{prenda.estado}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-medium">{prenda.descripcion_general || '-'}</p>
              </div>
              {prenda.marca && (
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{prenda.marca}</p>
                </div>
              )}
              {prenda.modelo && (
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{prenda.modelo}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{typeof prenda.categoria === 'object' ? prenda.categoria?.nombre : prenda.categoria || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avalúo</p>
                <MoneyDisplay amount={prenda.valor_tasacion || 0} className="font-semibold text-lg" />
              </div>
              {prenda.valor_venta && (
                <div>
                  <p className="text-sm text-muted-foreground">Precio de Venta</p>
                  <MoneyDisplay amount={prenda.valor_venta} className="font-semibold text-lg text-green-600" />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                <p className="font-medium">{formatFecha(prenda.fecha_ingreso)}</p>
              </div>
            </div>
          </div>

          {/* Información del Crédito */}
          {tieneCredito ? (
            <div>
              <h3 className="font-semibold text-lg mb-3 border-b pb-2">💰 Información del Crédito</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Crédito</p>
                  <p className="font-mono font-semibold">{credito.numero_credito || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado del Crédito</p>
                  {getEstadoBadge(credito.estado)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Aprobado</p>
                  <MoneyDisplay amount={credito.monto_aprobado || 0} className="font-semibold text-lg" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capital Pendiente</p>
                  <MoneyDisplay 
                    amount={credito.capital_pendiente || 0} 
                    className={`font-semibold text-lg ${(credito.capital_pendiente || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} 
                  />
                </div>
                {credito.fecha_desembolso && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Desembolso</p>
                    <p className="font-medium">{formatFecha(credito.fecha_desembolso)}</p>
                  </div>
                )}
                {credito.fecha_vencimiento && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                    <p className={`font-medium ${new Date(credito.fecha_vencimiento) < new Date() ? 'text-red-600' : ''}`}>
                      {formatFecha(credito.fecha_vencimiento)}
                      {new Date(credito.fecha_vencimiento) < new Date() && ' ⚠️ (Vencido)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ Esta prenda no tiene un crédito asociado
              </p>
            </div>
          )}

          {/* Ubicación */}
          {prenda.ubicacion_detalle && (
            <div>
              <h3 className="font-semibold text-lg mb-3 border-b pb-2">📍 Ubicación</h3>
              <p className="font-medium">{prenda.ubicacion_detalle}</p>
            </div>
          )}

          {/* Observaciones */}
          {prenda.observaciones && (
            <div>
              <h3 className="font-semibold text-lg mb-3 border-b pb-2">📝 Observaciones</h3>
              <p className="text-sm">{prenda.observaciones}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
