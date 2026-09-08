import { CreditoPrendario, EstadoCreditoPrendario } from '@/types/creditoPrendario.types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { 
  Eye, CreditCard as CreditCardIcon, Calendar, 
  User, Package, ClockCounterClockwise 
} from '@phosphor-icons/react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface CreditoCardProps {
  credito: CreditoPrendario
  onVerDetalle: (credito: CreditoPrendario) => void
}

const ESTADO_COLORS: Record<EstadoCreditoPrendario, string> = {
  solicitado: 'bg-blue-500',
  en_analisis: 'bg-yellow-500',
  aprobado: 'bg-green-500',
  rechazado: 'bg-red-500',
  vigente: 'bg-emerald-500',
  vencido: 'bg-orange-500',
  renovado: 'bg-purple-500',
  pagado: 'bg-green-600',
  en_mora: 'bg-red-600',
  incobrable: 'bg-gray-600',
  cancelado: 'bg-gray-500',
  prenda_vendida: 'bg-indigo-500',
  vendido: 'bg-indigo-400',
  rescatado: 'bg-teal-500',
  rematado: 'bg-red-700',
  en_inventario: 'bg-slate-500',
  anulado: 'bg-zinc-500'
}

const ESTADO_LABELS: Record<EstadoCreditoPrendario, string> = {
  solicitado: 'Solicitado',
  en_analisis: 'En Análisis',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  vigente: 'Vigente',
  vencido: 'Vencido',
  renovado: 'Renovado',
  pagado: 'Pagado',
  en_mora: 'En Mora',
  incobrable: 'Incobrable',
  cancelado: 'Cancelado',
  prenda_vendida: 'Prenda Vendida',
  vendido: 'Vendido',
  rescatado: 'Rescatado',
  rematado: 'Rematado',
  en_inventario: 'En Inventario',
  anulado: 'Anulado'
}

export function CreditoCard({ credito, onVerDetalle }: CreditoCardProps) {
  const diasVencimiento = credito.fecha_vencimiento 
    ? differenceInDays(new Date(credito.fecha_vencimiento), new Date())
    : null

  const saldoTotal = (credito.capital_pendiente || 0) + (credito.intereses_pendientes || 0) + (credito.mora_pendiente || 0)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Indicador de estado (barra lateral en móvil, badge en desktop) */}
          <div className={`hidden sm:block w-1 h-16 rounded-full ${ESTADO_COLORS[credito.estado] || 'bg-gray-500'}`} />
          
          {/* Información principal */}
          <div className="flex-1 space-y-2">
            {/* Header: Código y Estado */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-semibold">{credito.codigo_credito || credito.numero_credito || 'Sin código'}</span>
                </div>
                <Badge className={`sm:hidden mt-1 ${ESTADO_COLORS[credito.estado] || 'bg-gray-500'} text-white`}>
                  {ESTADO_LABELS[credito.estado] || credito.estado}
                </Badge>
              </div>
              <Badge className={`hidden sm:inline-flex ${ESTADO_COLORS[credito.estado] || 'bg-gray-500'} text-white`}>
                {ESTADO_LABELS[credito.estado] || credito.estado}
              </Badge>
            </div>

            {/* Cliente */}
            {credito.cliente && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {credito.cliente.nombres || ''} {credito.cliente.apellidos || ''}
                </span>
                {credito.cliente.codigo_cliente && (
                  <span className="text-muted-foreground">({credito.cliente.codigo_cliente})</span>
                )}
              </div>
            )}

            {/* Prendas */}
            {credito.prendas && credito.prendas.length > 0 && (() => {
              const primeraPrenda = credito.prendas[0]
              const descripcion = primeraPrenda?.descripcion_general || primeraPrenda?.descripcion || ''
              const descripcionCorta = descripcion ? (descripcion.length > 40 ? descripcion.substring(0, 40) + '...' : descripcion) : ''
              
              return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>
                    {credito.prendas.length} {credito.prendas.length === 1 ? 'prenda' : 'prendas'}
                    {descripcionCorta && `: ${descripcionCorta}`}
                  </span>
                </div>
              )
            })()}

            {/* Fechas */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {credito.fecha_desembolso && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Desembolso: {format(new Date(credito.fecha_desembolso), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>
              )}
              {credito.fecha_vencimiento && (
                <div className="flex items-center gap-1">
                  <ClockCounterClockwise className="h-3 w-3" />
                  <span className={diasVencimiento !== null && diasVencimiento < 0 ? 'text-red-600 font-medium' : ''}>
                    Vence: {format(new Date(credito.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                    {diasVencimiento !== null && (
                      <span className="ml-1">
                        ({diasVencimiento > 0 ? `${diasVencimiento} días` : `Vencido hace ${Math.abs(diasVencimiento)} días`})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {credito.fecha_solicitud && !credito.fecha_desembolso && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Solicitado: {format(new Date(credito.fecha_solicitud), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Montos y acciones */}
          <div className="flex flex-col sm:items-end gap-2">
            {/* Montos */}
            <div className="space-y-1">
              {credito.monto_desembolsado && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Desembolsado: </span>
                  <MoneyDisplay 
                    amount={credito.monto_desembolsado} 
                    className="font-semibold text-green-600"
                  />
                </div>
              )}
              {credito.estado === 'vigente' || credito.estado === 'vencido' || credito.estado === 'en_mora' ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">Saldo: </span>
                  <MoneyDisplay 
                    amount={saldoTotal}
                    className="font-bold text-lg"
                  />
                </div>
              ) : null}
              {credito.estado === 'solicitado' && credito.monto_solicitado && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Solicitado: </span>
                  <MoneyDisplay 
                    amount={credito.monto_solicitado}
                    className="font-semibold"
                  />
                </div>
              )}
            </div>

            {/* Botón ver detalle */}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onVerDetalle(credito)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalle
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
