import { useState, useEffect } from 'react'

export interface ResponsiveBreakpoints {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isXs: boolean // < 480px
  isSm: boolean // >= 480px && < 768px
  isMd: boolean // >= 768px && < 1024px
  isLg: boolean // >= 1024px && < 1280px
  isXl: boolean // >= 1280px && < 1536px
  is2xl: boolean // >= 1536px
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
  isTouchDevice: boolean
}

/**
 * Hook para detectar responsividad y breakpoints
 * 
 * @returns Objeto con información detallada sobre el dispositivo y breakpoints
 * 
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop, width } = useResponsive()
 * 
 * return (
 *   <div>
 *     {isMobile && <MobileMenu />}
 *     {isDesktop && <DesktopSidebar />}
 *     <p>Ancho: {width}px</p>
 *   </div>
 * )
 * ```
 */
export function useResponsive(): ResponsiveBreakpoints {
  const [breakpoints, setBreakpoints] = useState<ResponsiveBreakpoints>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    const height = typeof window !== 'undefined' ? window.innerHeight : 768
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isXs: width < 480,
      isSm: width >= 480 && width < 768,
      isMd: width >= 768 && width < 1024,
      isLg: width >= 1024 && width < 1280,
      isXl: width >= 1280 && width < 1536,
      is2xl: width >= 1536,
      width,
      height,
      orientation: width > height ? 'landscape' : 'portrait',
      isTouchDevice: typeof window !== 'undefined' 
        ? ('ontouchstart' in window || navigator.maxTouchPoints > 0)
        : false,
    }
  })

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setBreakpoints({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isXs: width < 480,
        isSm: width >= 480 && width < 768,
        isMd: width >= 768 && width < 1024,
        isLg: width >= 1024 && width < 1280,
        isXl: width >= 1280 && width < 1536,
        is2xl: width >= 1536,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      })
    }

    // Actualizar inmediatamente
    updateBreakpoints()

    // Debounce para performance
    let timeoutId: NodeJS.Timeout
    const debouncedUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateBreakpoints, 150)
    }

    window.addEventListener('resize', debouncedUpdate)
    window.addEventListener('orientationchange', updateBreakpoints)

    return () => {
      window.removeEventListener('resize', debouncedUpdate)
      window.removeEventListener('orientationchange', updateBreakpoints)
      clearTimeout(timeoutId)
    }
  }, [])

  return breakpoints
}

/**
 * Hook simple para detectar si es móvil (< 768px)
 * 
 * @returns true si el ancho es menor a 768px
 * 
 * @example
 * ```tsx
 * const isMobile = useIsMobile()
 * 
 * return (
 *   <div>
 *     {isMobile ? <MobileView /> : <DesktopView />}
 *   </div>
 * )
 * ```
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive()
  return isMobile
}

/**
 * Hook para detectar si es tablet (768px - 1023px)
 */
export function useIsTablet(): boolean {
  const { isTablet } = useResponsive()
  return isTablet
}

/**
 * Hook para detectar si es desktop (>= 1024px)
 */
export function useIsDesktop(): boolean {
  const { isDesktop } = useResponsive()
  return isDesktop
}

/**
 * Hook para detectar dispositivo táctil
 */
export function useIsTouchDevice(): boolean {
  const { isTouchDevice } = useResponsive()
  return isTouchDevice
}

/**
 * Hook para obtener dimensiones de ventana
 */
export function useWindowSize() {
  const { width, height } = useResponsive()
  return { width, height }
}

/**
 * Hook para detectar orientación del dispositivo
 */
export function useOrientation() {
  const { orientation } = useResponsive()
  return orientation
}
