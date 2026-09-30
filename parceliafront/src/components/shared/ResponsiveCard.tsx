import { ReactNode, ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

interface ResponsiveCardProps extends ComponentProps<typeof Card> {
  children: ReactNode
  /** Padding responsive automático */
  responsivePadding?: boolean
}

/**
 * Card con padding y estilos responsivos automáticos
 */
export function ResponsiveCard({ 
  children, 
  className,
  responsivePadding = true,
  ...props 
}: ResponsiveCardProps) {
  return (
    <Card 
      className={cn(
        responsivePadding && 'p-responsive',
        className
      )} 
      {...props}
    >
      {children}
    </Card>
  )
}

interface ResponsiveCardHeaderProps extends ComponentProps<typeof CardHeader> {
  children: ReactNode
}

export function ResponsiveCardHeader({ 
  children, 
  className,
  ...props 
}: ResponsiveCardHeaderProps) {
  return (
    <CardHeader 
      className={cn(
        'pb-2 sm:pb-3',
        className
      )} 
      {...props}
    >
      {children}
    </CardHeader>
  )
}

interface ResponsiveCardTitleProps extends ComponentProps<typeof CardTitle> {
  children: ReactNode
}

export function ResponsiveCardTitle({ 
  children, 
  className,
  ...props 
}: ResponsiveCardTitleProps) {
  return (
    <CardTitle 
      className={cn(
        'text-base sm:text-lg',
        className
      )} 
      {...props}
    >
      {children}
    </CardTitle>
  )
}

interface ResponsiveCardDescriptionProps extends ComponentProps<typeof CardDescription> {
  children: ReactNode
}

export function ResponsiveCardDescription({ 
  children, 
  className,
  ...props 
}: ResponsiveCardDescriptionProps) {
  return (
    <CardDescription 
      className={cn(
        'text-xs sm:text-sm',
        className
      )} 
      {...props}
    >
      {children}
    </CardDescription>
  )
}

interface ResponsiveCardContentProps extends ComponentProps<typeof CardContent> {
  children: ReactNode
  /** Usar padding cero (útil para tablas) */
  noPadding?: boolean
}

export function ResponsiveCardContent({ 
  children, 
  className,
  noPadding = false,
  ...props 
}: ResponsiveCardContentProps) {
  return (
    <CardContent 
      className={cn(
        noPadding ? 'p-0' : 'px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4',
        className
      )} 
      {...props}
    >
      {children}
    </CardContent>
  )
}

interface ResponsiveCardFooterProps extends ComponentProps<typeof CardFooter> {
  children: ReactNode
}

export function ResponsiveCardFooter({ 
  children, 
  className,
  ...props 
}: ResponsiveCardFooterProps) {
  return (
    <CardFooter 
      className={cn(
        'flex-col sm:flex-row gap-2 pt-3 sm:pt-4',
        className
      )} 
      {...props}
    >
      {children}
    </CardFooter>
  )
}

// ============================================
// STAT CARD - Tarjeta de estadística responsive
// ============================================

interface StatCardProps {
  /** Título de la estadístico */
  title: string
  /** Valor a mostrar */
  value: ReactNode
  /** Ícono (componente PhosphorIcon) */
  icon?: ReactNode
  /** Color del valor ('default' | 'success' | 'warning' | 'danger' | 'muted') */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
  /** Texto secundario/subtítulo */
  subtitle?: string
  /** Tendencia o cambio */
  trend?: {
    value: number
    label?: string
  }
  /** Mostrar skeleton de carga */
  loading?: boolean
  /** Clase CSS adicional */
  className?: string
  /** Click handler */
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  icon,
  variant = 'default',
  subtitle,
  trend,
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  const variantClasses = {
    default: '',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    muted: 'text-muted-foreground',
  }

  return (
    <Card 
      className={cn(
        onClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-1 sm:pb-2 px-3 pt-3 sm:px-4 sm:pt-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="min-w-0 leading-tight">
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
        {loading ? (
          <div className="h-7 sm:h-9 w-16 sm:w-20 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className={cn(
              'text-xl sm:text-2xl md:text-3xl font-bold',
              variantClasses[variant]
            )}>
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                'text-xs mt-1 flex items-center gap-1',
                trend.value >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                <span>{trend.value >= 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
                {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default {
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
  ResponsiveCardDescription,
  ResponsiveCardContent,
  ResponsiveCardFooter,
  StatCard,
}
