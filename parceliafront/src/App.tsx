import { useState, useEffect, useCallback, useRef } from 'react'
import { MainApp } from './components/MainApp'
import { LoginScreen } from './components/LoginScreen'
import { TerrenoPublicoPage } from './components/modules/fincas/TerrenoPublicoPage'
import { Toaster } from '@/components/ui/sonner'
import { useKV } from '@/hooks/use-kv'
import { authService, api, resetAuthFlag } from '@/lib/api'
import { toast } from 'sonner'

interface UserSession {
  username: string
  role: string
  loginTime: number
  userData?: any
}

function App() {
    const publicToken = typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/t\/([A-Za-z0-9]+)/)?.[1]
      : undefined

    const [session, setSession] = useKV<UserSession | null>('user-session', null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
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
                // En modo standalone o con sesión activa válida
                if (api.hasValidToken() || session.username) {
                    if (!api.hasValidToken()) {
                        api.setToken('mock-jwt-token-parcelia-standalone-2026')
                    }
                    setIsAuthenticated(true)
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
                }, 1000) // Cooldown para evitar múltiples disparos
            }
        }

        window.addEventListener('auth:unauthorized', handleUnauthorized)
        
        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized)
        }
    }, [setSession, session, isAuthenticated])

    const handleLogin = (username: string, role: string, userData?: any) => {
        const newSession: UserSession = {
            username,
            role,
            loginTime: Date.now(),
            userData
        }
        setSession(newSession)
        setIsAuthenticated(true)
        logoutInProgressRef.current = false
        resetAuthFlag() // Resetear flag de evento no autorizado
    }

    /** Tras guardar permisos del usuario actual: refrescar userData (permisos) desde /auth/me */
    const refreshSessionUserFromApi = useCallback(async () => {
        try {
            const r = await authService.me()
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

    // Mostrar loading mientras se verifica la sesión
    if (isLoading && !publicToken) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <>
            {publicToken ? (
                <TerrenoPublicoPage token={publicToken} />
            ) : isAuthenticated && session ? (
                <MainApp
                    userSession={session}
                    onLogout={handleLogout}
                    onSessionUserRefresh={refreshSessionUserFromApi}
                />
            ) : (
                <LoginScreen onLogin={handleLogin} />
            )}
            <Toaster />
        </>
    )
}

export default App