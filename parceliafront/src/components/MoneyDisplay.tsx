import { formatCurrency } from '@/lib/helpers'

interface MoneyDisplayProps {
  amount: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showSign?: boolean
  inline?: boolean
}

export function MoneyDisplay({ amount, className = '', size = 'md', showSign = false }: MoneyDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg'
  }

  const isNegative = amount < 0
  const displayAmount = Math.abs(amount)

  return (
    <span className={`font-mono font-medium ${sizeClasses[size]} ${isNegative ? 'text-destructive' : ''} ${className}`}>
      {showSign && (isNegative ? '-' : '+')} {formatCurrency(displayAmount)}
    </span>
  )
}
