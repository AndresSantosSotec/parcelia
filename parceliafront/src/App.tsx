import { useState, useEffect, useCallback, useRef } from 'react'
import { MainApp } from './components/MainApp'
import { LoginScreen } from './components/LoginScreen'
import { TerrenoPublicoPage } from './components/modules/fincas/TerrenoPublicoPage'
import { PortalPublicoCatalogo } from './components/public/PortalPublicoCatalogo'
import { FormularioPublicoLead } from './components/public/FormularioPublicoLead'
import { Toaster } from '@/components/ui/sonner'
import { useKV } from '@/hooks/use-kv'
import { authService, api, resetAuthFlag, STANDALONE_MODE } from '@/lib/api'
import { toast } from 'sonner'

interface UserSession {
  username: string
  role: string
  loginTime: number
  userData?: any
}

function App() {
    // 1. Detectar ficha pública de terreno específico (/t/{token})
    const publicToken = typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/t\/([A-Za-z0-9]+)/)?.[1]
      : undefined

    // 2. Detectar si el enlace apunta exclusivamente al formulario de captura / lead magnet
    const [esFormularioPublico, setEsFormularioPublico] = useState<boolean>(() => {
      if (typeof window === 'undefined') return false
      const path = window.location.pathname.toLowerCase()
      const search = window.location.search.toLowerCase()
      return (
        path.startsWith('/registro') ||
        path.startsWith('/interes') ||
        path.startsWith('/lead') ||
        path.startsWith('/contacto') ||
        search.includes('view=form') ||
        search.includes('view=registro')
      )
    })

    // 3. Detectar si el usuario visita el catálogo público externo desde redes o enlace web
    const [esRutaCatalogo, setEsRutaCatalogo] = useState<boolean>(() => {
      if (typeof window === 'undefined') return false
      const path = window.location.pathname.toLowerCase()
      const search = window.location.search.toLowerCase()
      return (
        path.startsWith('/catalogo') ||
        path.startsWith('/lotes') ||
        path.startsWith('/proyectos') ||
        path.startsWith('/terrenos') ||
        search.includes('public=catalogo') ||
        search.includes('origen=')
      )
    })

    const [modoLogin, setModoLogin] = useState(false)

    const [session, setSession] = useKV<UserSession | null>('user-session', null)
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(session && (api.hasValidToken() || session.username)))
    const [isLoading, setIsLoading] = useState(false)
    const logoutInProgressRef = useRef(false)

    // Manejar cierre de sesión
    const handleLogout = useCallback(async () => {
        if (logoutInProgressRef.current) return
        logoutInProgressRef.current = true
        
        try {
            await authService.logout()
        } catch (error) {
            console.error('Error al cerrar sesión:', error)
        }
        setSession(null)
        setIsAuthenticated(false)
        logoutInProgressRef.current = false
    }, [setSession])

    useEffect(() => {
        // Verificar sesión al iniciar
        const checkSession = () => {
            if (session) {
                if (STANDALONE_MODE) {
                    if (!api.hasValidToken()) {
                        api.setToken('mock-jwt-token-parcelia-standalone-2026')
                    }
                    setIsAuthenticated(true)
                } else if (api.hasValidToken()) {
                    setIsAuthenticated(true)
                    if (api.isTokenExpiringSoon()) {
                        void api.checkAndRefreshToken()
                    }
                } else {
                    console.warn('Token inválido o expirado')
                    setSession(null)
                    setIsAuthenticated(false)
                }
            } else {
                setIsAuthenticated(false)
            }
            setIsLoading(false)
        }
        
        checkSession()
    }, [session, setSession])

    // Refresco periódico del token en segundo plano para mantener la sesión viva mientras el usuario esté activo
    useEffect(() => {
        if (!isAuthenticated || STANDALONE_MODE) return
        const interval = setInterval(() => {
            if (api.hasValidToken() && api.isTokenExpiringSoon()) {
                void api.checkAndRefreshToken()
            }
        }, 10 * 60 * 1000) // cada 10 minutos
        return () => clearInterval(interval)
    }, [isAuthenticated])

    // Escuchar evento de autenticación fallida
    useEffect(() => {
        const handleUnauthorized = () => {
            // Evitar procesar si ya estamos cerrando sesión
            if (logoutInProgressRef.current) return
            
            // Solo procesar si hay sesión activa (evitar loops)
            if (session && isAuthenticated) {
                console.warn('Sesión expirada o no autorizada')
                logoutInProgressRef.current = true
                toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
                setSession(null)
                setIsAuthenticated(false)
                setTimeout(() => {
                    logoutInProgressRef.current = false
                }, 1000)
            }
        }

        window.addEventListener('auth:unauthorized', handleUnauthorized)
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }, [session, isAuthenticated, setSession])

    // Manejar login exitoso
    const handleLogin = (username: string, role: string, userData?: any) => {
        const newSession: UserSession = {
            username,
            role,
            loginTime: Date.now(),
            userData
        }
        setSession(newSession)
        setIsAuthenticated(true)
        setModoLogin(false)
        setEsRutaCatalogo(false)
        setEsFormularioPublico(false)
    }

    /** Tras guardar permisos del usuario actual: refrescar userData (permisos) desde /auth/me */
    const refreshSessionUserFromApi = useCallback(async () => {
        if (STANDALONE_MODE) return
        try {
            const r = await api.get<{ rol: string; sucursal_id?: string; permisos: unknown[] }>('/auth/me')
            if (!r.success || !r.data) return
            setSession((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    userData: {
                        ...(prev.userData || {}),
                        ...r.data,
                    },
                }
            })
        } catch (e) {
            console.error('No se pudo refrescar la sesión:', e)
        }
    }, [setSession])

    if (isLoading && !publicToken) return null

    return (
        <>
            {/* 1. Ficha individual de terreno público por token (/t/{token}) */}
            {publicToken ? (
                <TerrenoPublicoPage token={publicToken} />
            ) : esFormularioPublico && !modoLogin ? (
                /* 2. Formulario Lead Magnet exclusivo para campañas de Redes Sociales (Facebook Ads, TikTok) */
                <FormularioPublicoLead
                    onIrACatalogo={() => {
                        setEsFormularioPublico(false)
                        setEsRutaCatalogo(true)
                    }}
                    onIrALogin={() => setModoLogin(true)}
                />
            ) : esRutaCatalogo && !modoLogin ? (
                /* 3. Portal Público de Catálogo & Lotes (100% independiente del login) */
                <PortalPublicoCatalogo
                    tieneSesionActiva={Boolean(isAuthenticated && session)}
                    onIrALogin={() => setModoLogin(true)}
                    onIrAFormulario={() => {
                        setEsRutaCatalogo(false)
                        setEsFormularioPublico(true)
                    }}
                />
            ) : isAuthenticated && session ? (
                /* 4. Usuario con sesión activa: Panel interno administrativo */
                <MainApp
                    userSession={session}
                    onLogout={handleLogout}
                    onSessionUserRefresh={refreshSessionUserFromApi}
                />
            ) : (
                /* 5. Pantalla de Login para colaboradores */
                <LoginScreen
                    onLogin={handleLogin}
                    onVerCatalogo={() => {
                        setModoLogin(false)
                        setEsRutaCatalogo(true)
                    }}
                />
            )}
            <Toaster />
        </>
    )
}

export default App
