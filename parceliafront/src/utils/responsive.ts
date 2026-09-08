import { cn } from '@/lib/utils'
import { Breakpoint, BREAKPOINTS } from '@/hooks/use-mobile'

/**
 * Utilidades para generar clases responsive de forma programática
 */

/**
 * Genera clases para ocultar elementos debajo de un breakpoint
 */
export function hideBelow(breakpoint: Breakpoint): string {
  const classes: Record<Breakpoint, string> = {
    xs: '',
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
    '2xl': 'hidden 2xl:block',
  }
  return classes[breakpoint]
}

/**
 * Genera clases para mostrar elementos solo debajo de un breakpoint
 */
export function showOnlyBelow(breakpoint: Breakpoint): string {
  const classes: Record<Breakpoint, string> = {
    xs: 'block',
    sm: 'block sm:hidden',
    md: 'block md:hidden',
    lg: 'block lg:hidden',
    xl: 'block xl:hidden',
    '2xl': 'block 2xl:hidden',
  }
  return classes[breakpoint]
}

/**
 * Genera clases para texto responsive
 */
export function textResponsive(
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' = 'base'
): string {
  const sizeClasses = {
    xs: 'text-[10px] sm:text-xs',
    sm: 'text-xs sm:text-sm',
    base: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg md:text-xl',
    xl: 'text-lg sm:text-xl md:text-2xl',
    '2xl': 'text-xl sm:text-2xl md:text-3xl',
  }
  return sizeClasses[size]
}

/**
 * Genera clases para padding responsive
 */
export function paddingResponsive(
  direction: 'all' | 'x' | 'y' = 'all'
): string {
  const paddingClasses = {
    all: 'p-3 sm:p-4 md:p-6',
    x: 'px-3 sm:px-4 md:px-6',
    y: 'py-3 sm:py-4 md:py-6',
  }
  return paddingClasses[direction]
}

/**
 * Genera clases para gap responsive
 */
export function gapResponsive(
  size: 'sm' | 'md' | 'lg' = 'md'
): string {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 md:gap-6',
    lg: 'gap-4 sm:gap-6 md:gap-8',
  }
  return gapClasses[size]
}

/**
 * Genera clases para grid columns responsive
 */
export function gridColumnsResponsive(
  preset: 'stats' | 'cards' | 'form' | 'dashboard' = 'cards'
): string {
  const presetClasses = {
    stats: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    cards: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    form: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    dashboard: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }
  return presetClasses[preset]
}

/**
 * Genera clases para flex direction responsive
 */
export function flexDirectionResponsive(
  mobileDirection: 'row' | 'col' = 'col',
  desktopDirection: 'row' | 'col' = 'row'
): string {
  return `flex-${mobileDirection} md:flex-${desktopDirection}`
}

/**
 * Genera clases para un botón con texto truncado en móvil
 */
export function buttonTextResponsive(): string {
  return '[&>span]:hidden [&>span]:sm:inline'
}

/**
 * Genera clases para truncar texto de forma responsive
 */
export function truncateResponsive(maxWidth?: string): string {
  return cn(
    'truncate',
    maxWidth ? maxWidth : 'max-w-[120px] sm:max-w-[180px] md:max-w-none'
  )
}

/**
 * Objeto con todas las clases de utilidad comunes
 */
export const responsiveClasses = {
  // Contenedores
  container: 'w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 max-w-screen-xl',
  containerFull: 'w-full px-3 sm:px-4 md:px-6',
  
  // Espaciado
  sectionGap: 'space-y-4 sm:space-y-6',
  cardGap: 'space-y-3 sm:space-y-4',
  
  // Headers
  pageHeader: 'flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center',
  pageTitle: 'text-xl sm:text-2xl md:text-3xl font-bold tracking-tight',
  pageDescription: 'text-xs sm:text-sm md:text-base text-muted-foreground',
  
  // Cards
  cardContent: 'p-3 sm:p-4 md:p-6',
  cardHeader: 'pb-2 sm:pb-3',
  cardTitle: 'text-sm sm:text-base md:text-lg font-semibold',
  
  // Forms
  formGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
  formActions: 'flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4 border-t mt-4',
  
  // Buttons
  buttonGroup: 'flex flex-col sm:flex-row gap-2',
  buttonFull: 'w-full sm:w-auto',
  
  // Tables
  tableWrapper: 'overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0',
  tableScroll: 'min-w-[600px] sm:min-w-0',
  
  // Text sizes
  textXs: 'text-[10px] sm:text-xs',
  textSm: 'text-xs sm:text-sm',
  textBase: 'text-sm sm:text-base',
  textLg: 'text-base sm:text-lg md:text-xl',
  textXl: 'text-lg sm:text-xl md:text-2xl',
  text2xl: 'text-xl sm:text-2xl md:text-3xl',
  
  // Touch targets
  touchTarget: 'min-h-[44px] min-w-[44px]',
  
  // Icons
  iconSm: 'w-4 h-4 sm:w-5 sm:h-5',
  iconMd: 'w-5 h-5 sm:w-6 sm:h-6',
  iconLg: 'w-6 h-6 sm:w-8 sm:h-8',
}

/**
 * Helper para aplicar múltiples clases responsive
 */
export function applyResponsive(...classes: (string | undefined | null | false)[]): string {
  return cn(...classes)
}

export default {
  hideBelow,
  showOnlyBelow,
  textResponsive,
  paddingResponsive,
  gapResponsive,
  gridColumnsResponsive,
  flexDirectionResponsive,
  buttonTextResponsive,
  truncateResponsive,
  responsiveClasses,
  applyResponsive,
}
