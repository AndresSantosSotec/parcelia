import { useEffect } from 'react'
import { useKV } from '@/hooks/use-kv'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useKV<Theme>('theme-preference', 'system')

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    const currentTheme = theme || 'system'
    
    if (currentTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(currentTheme)
    }
  }, [theme])

  return { theme, setTheme }
}
