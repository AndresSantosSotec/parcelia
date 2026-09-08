import { useEffect, useState, useMemo } from "react"

// Breakpoints siguiendo convención de Tailwind
export const BREAKPOINTS = {
  xs: 0,      // < 480px: teléfonos pequeños
  sm: 480,    // >= 480px: teléfonos grandes
  md: 768,    // >= 768px: tablets
  lg: 1024,   // >= 1024px: laptops
  xl: 1280,   // >= 1280px: desktops
  '2xl': 1536 // >= 1536px: monitores grandes
} as const

export type Breakpoint = keyof typeof BREAKPOINTS
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

interface ResponsiveState {
  width: number
  height: number
  breakpoint: Breakpoint
  deviceType: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isPortrait: boolean
  isLandscape: boolean
  isTouchDevice: boolean
}

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.sm) return 'xs'
  if (width < BREAKPOINTS.md) return 'sm'
  if (width < BREAKPOINTS.lg) return 'md'
  if (width < BREAKPOINTS.xl) return 'lg'
  if (width < BREAKPOINTS['2xl']) return 'xl'
  return '2xl'
}

function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.md) return 'mobile'
  if (width < BREAKPOINTS.lg) return 'tablet'
  return 'desktop'
}

/**
 * Hook principal para responsividad.
 * Detecta tamaño de pantalla, tipo de dispositivo y orientación.
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    const height = typeof window !== 'undefined' ? window.innerHeight : 768
    const breakpoint = getBreakpoint(width)
    const deviceType = getDeviceType(width)
    
    return {
      width,
      height,
      breakpoint,
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isPortrait: height > width,
      isLandscape: width > height,
      isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
  })

  useEffect(() => {
    let rafId: number
    
    const handleResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        const breakpoint = getBreakpoint(width)
        const deviceType = getDeviceType(width)
        
        setState({
          width,
          height,
          breakpoint,
          deviceType,
          isMobile: deviceType === 'mobile',
          isTablet: deviceType === 'tablet',
          isDesktop: deviceType === 'desktop',
          isPortrait: height > width,
          isLandscape: width > height,
          isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
        })
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Initial call
    
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return state
}

/**
 * Hook simplificado para detectar si es móvil (mantiene compatibilidad)
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive()
  return isMobile
}

/**
 * Hook para detectar si es tablet
 */
export function useIsTablet(): boolean {
  const { isTablet } = useResponsive()
  return isTablet
}

/**
 * Hook para detectar si es desktop
 */
export function useIsDesktop(): boolean {
  const { isDesktop } = useResponsive()
  return isDesktop
}

/**
 * Hook para media queries personalizadas
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Hook para obtener clases CSS según el breakpoint
 */
export function useBreakpointClass<T extends Record<Breakpoint, string>>(classes: Partial<T>): string {
  const { breakpoint } = useResponsive()
  
  // Encuentra la clase más cercana hacia abajo
  const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
  const currentIndex = breakpoints.indexOf(breakpoint)
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpoints[i]
    if (classes[bp]) return classes[bp]!
  }
  
  return ''
}
