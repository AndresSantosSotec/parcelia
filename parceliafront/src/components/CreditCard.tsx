import { Card } from '@/components/ui/card'
import { MoneyDisplay } from './MoneyDisplay'
import { StatusBadge } from './StatusBadge'
import { calcularDiasRestantes, formatDate } from '@/lib/helpers'
import { Credito } from '@/lib/types'
import { Calendar, CreditCard as CreditCardIcon, TrendUp } from '@phosphor-icons/react'
import { Progress } from '@/components/ui/progress'

interface CreditCardProps {
  credito: Credito
  onClick?: () => void
  cliente?: { nombres: string; apellidos: string }
}

export function CreditCard({ credito, onClick, cliente }: CreditCardProps) {
  const diasRestantes = calcularDiasRestantes(credito.fechaVencimiento)
  const progreso = ((credito.montoPrestado - credito.saldoActual) / credito.montoPrestado) * 100

  return (
    <Card 
      className={`p-3 sm:p-4 hover:shadow-lg transition-shadow cursor-pointer ${diasRestantes < 0 ? 'border-destructive' : diasRestantes <= 7 ? 'border-warning' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CreditCardIcon className="text-primary shrink-0" weight="duotone" size={18} />
            <span className="font-mono text-xs sm:text-sm font-semibold truncate">{credito.numero}</span>
          </div>
          {cliente && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{cliente.nombres} {cliente.apellidos}</p>
          )}
        </div>
        <StatusBadge estado={credito.estado} pulse={diasRestantes <= 3 && diasRestantes >= 0} className="ml-2 shrink-0" />
      </div>

      <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
        <div className="flex justify-between text-xs sm:text-sm gap-2">
          <span className="text-muted-foreground shrink-0">Prenda:</span>
          <span className="font-medium truncate text-right">{credito.prenda.descripcion}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Prestado:</span>
          <MoneyDisplay amount={credito.montoPrestado} size="sm" />
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Saldo:</span>
          <MoneyDisplay amount={credito.saldoActual} size="sm" />
        </div>
      </div>

      <div className="mb-2 sm:mb-3">
        <Progress value={progreso} className="h-1.5" />
      </div>

      <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar size={14} className="shrink-0" />
          <span className="truncate">{formatDate(credito.fechaVencimiento)}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendUp size={14} className="shrink-0" />
          <span className="truncate">{diasRestantes < 0 ? `${Math.abs(diasRestantes)} días vencido` : `${diasRestantes} días restantes`}</span>
        </div>
      </div>
    </Card>
  )
}
