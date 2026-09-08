import { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { useResponsive, Breakpoint } from '@/hooks/use-mobile'

type ColumnsConfig = {
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
  '2xl'?: number
}

interface ResponsiveGridProps {
  children: ReactNode
  /** Configuración de columnas por breakpoint */
  columns?: ColumnsConfig
  /** Gap entre elementos */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** Clase CSS adicional */
  className?: string
  /** Tipo de grid predefinido */
  preset?: 'stats' | 'cards' | 'form' | 'dashboard'
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2 sm:gap-3',
  md: 'gap-3 sm:gap-4 md:gap-5',
  lg: 'gap-4 sm:gap-5 md:gap-6',
  xl: 'gap-5 sm:gap-6 md:gap-8',
}

const presetColumns: Record<string, ColumnsConfig> = {
  stats: { xs: 2, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  cards: { xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 5 },
  form: { xs: 1, sm: 1, md: 2, lg: 3, xl: 3, '2xl': 3 },
  dashboard: { xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 4 },
}

/**
 * Grid responsivo que adapta el número de columnas según el breakpoint
 */
export function ResponsiveGrid({
  children,
  columns,
  gap = 'md',
  className,
  preset,
}: ResponsiveGridProps) {
  const { breakpoint } = useResponsive()

  // Usar preset o configuración personalizada
  const colConfig = preset ? presetColumns[preset] : columns

  // Obtener número de columnas para el breakpoint actual
  const getColumns = (): number => {
    if (!colConfig) return 1

    const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    const currentIndex = breakpoints.indexOf(breakpoint)

    // Buscar hacia atrás para encontrar la configuración más cercana
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpoints[i]
      if (colConfig[bp] !== undefined) {
        return colConfig[bp]!
      }
    }

    return 1
  }

  const numColumns = getColumns()

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================
// RESPONSIVE FLEX - Flex container responsive
// ============================================

interface ResponsiveFlexProps {
  children: ReactNode
  /** Dirección en mobile */
  mobileDirection?: 'row' | 'column'
  /** Dirección en tablet+ */
  desktopDirection?: 'row' | 'column'
  /** Alineación de items */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  /** Justificación de contenido */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  /** Gap entre elementos */
  gap?: 'none' | 'sm' | 'md' | 'lg'
  /** Wrap en overflow */
  wrap?: boolean
  /** Clase CSS adicional */
  className?: string
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

export function ResponsiveFlex({
  children,
  mobileDirection = 'column',
  desktopDirection = 'row',
  align = 'start',
  justify = 'start',
  gap = 'md',
  wrap = false,
  className,
}: ResponsiveFlexProps) {
  const directionClasses = {
    'column-row': 'flex-col md:flex-row',
    'column-column': 'flex-col',
    'row-row': 'flex-row',
    'row-column': 'flex-row md:flex-col',
  }

  const directionKey = `${mobileDirection}-${desktopDirection}` as keyof typeof directionClasses

  return (
    <div
      className={cn(
        'flex',
        directionClasses[directionKey],
        alignClasses[align],
        justifyClasses[justify],
        gapClasses[gap],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// RESPONSIVE STACK - Stack vertical responsive
// ============================================

interface ResponsiveStackProps {
  children: ReactNode
  /** Espaciado entre elementos */
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Alineación horizontal */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Clase CSS adicional */
  className?: string
  /** Dividir con línea entre elementos */
  divider?: boolean
}

const stackSpacingClasses = {
  none: 'gap-0',
  xs: 'gap-1 sm:gap-1.5',
  sm: 'gap-2 sm:gap-2.5',
  md: 'gap-3 sm:gap-4',
  lg: 'gap-4 sm:gap-5 md:gap-6',
  xl: 'gap-6 sm:gap-8',
}

export function ResponsiveStack({
  children,
  spacing = 'md',
  align = 'stretch',
  className,
  divider = false,
}: ResponsiveStackProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        stackSpacingClasses[spacing],
        alignClasses[align],
        divider && 'divide-y divide-border [&>*:not(:first-child)]:pt-3 sm:[&>*:not(:first-child)]:pt-4',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// RESPONSIVE CONTAINER - Contenedor centrado responsive
// ============================================

interface ResponsiveContainerProps {
  children: ReactNode
  /** Ancho máximo */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** Padding horizontal */
  padding?: boolean
  /** Clase CSS adicional */
  className?: string
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
}

export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  padding = true,
  className,
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        padding && 'px-3 sm:px-4 md:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// HIDE/SHOW - Componentes para ocultar/mostrar
// ============================================

interface HideShowProps {
  children: ReactNode
  /** Breakpoint debajo del cual ocultar */
  below?: Breakpoint
  /** Breakpoint encima del cual ocultar */
  above?: Breakpoint
  /** Clase CSS adicional */
  className?: string
}

export function Hide({ children, below, above, className }: HideShowProps) {
  // Clases para ocultar debajo de cierto breakpoint
  const hideBelowClasses: Record<Breakpoint, string> = {
    xs: '',
    sm: 'hidden xs:block',
    md: 'hidden sm:block',
    lg: 'hidden md:block',
    xl: 'hidden lg:block',
    '2xl': 'hidden xl:block',
  }

  // Clases para ocultar encima de cierto breakpoint
  const hideAboveClasses: Record<Breakpoint, string> = {
    xs: 'xs:hidden',
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
    xl: 'xl:hidden',
    '2xl': '2xl:hidden',
  }

  return (
    <div
      className={cn(
        below && hideBelowClasses[below],
        above && hideAboveClasses[above],
        className
      )}
    >
      {children}
    </div>
  )
}

export function Show({ children, below, above, className }: HideShowProps) {
  // Invertir la lógica de Hide
  const showBelowClasses: Record<Breakpoint, string> = {
    xs: '',
    sm: 'block xs:hidden',
    md: 'block sm:hidden',
    lg: 'block md:hidden',
    xl: 'block lg:hidden',
    '2xl': 'block xl:hidden',
  }

  const showAboveClasses: Record<Breakpoint, string> = {
    xs: 'hidden xs:block',
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
    '2xl': 'hidden 2xl:block',
  }

  return (
    <div
      className={cn(
        below && showBelowClasses[below],
        above && showAboveClasses[above],
        className
      )}
    >
      {children}
    </div>
  )
}

export default {
  ResponsiveGrid,
  ResponsiveFlex,
  ResponsiveStack,
  ResponsiveContainer,
  Hide,
  Show,
}
