import { Badge } from '@/components/ui/badge'
import { getEstadoColor, getEstadoTexto } from '@/lib/helpers'

interface StatusBadgeProps {
  estado: string
  className?: string
  pulse?: boolean
}

export function StatusBadge({ estado, className = '', pulse = false }: StatusBadgeProps) {
  return (
    <Badge className={`${getEstadoColor(estado)} ${pulse ? 'animate-pulse' : ''} ${className}`}>
      {getEstadoTexto(estado)}
    </Badge>
  )
}
