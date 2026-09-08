import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, Eye, EyeSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { authService } from '@/lib/api'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'

interface LoginScreenProps {
  onLogin: (username: string, role: string, userData?: any) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { config: empresaConfig } = useEmpresaConfig()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Intentar login con API si está disponible
      const response = await authService.login(username, password)

      if (response.success && response.data) {
        const user = response.data.user
        const rolLabels: Record<string, string> = {
          superadmin: 'Soporte',
          administrador: 'Administrador',
          cajero: 'Cajero',
          tasador: 'Tasador',
          supervisor: 'Supervisor',
          vendedor: 'Vendedor',
        }
        toast.success(`Bienvenido, ${rolLabels[user.rol] || user.rol}`)
        onLogin(user.username || user.email, rolLabels[user.rol] || user.rol, user)
      } else {
        toast.error(response.message || 'Usuario o contraseña incorrectos')
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo iniciar sesión. Verifica el servidor y tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-background">
      <div className="login-card">
        <div className="p-6 sm:p-8 pb-0 space-y-5 text-center">
          {empresaConfig.logoUrl ? (
            <div className="h-20 max-w-[200px] mx-auto flex items-center justify-center p-2 rounded-2xl bg-card border border-border/80 shadow-md overflow-hidden">
              <img src={empresaConfig.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="login-logo-ring">
              <Wallet className="text-white" size={28} weight="duotone" />
            </div>
          )}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{empresaConfig.nombreEmpresa || 'Parcelia'}</h1>
            <p className="text-sm text-muted-foreground">{empresaConfig.slogan || 'Sistema de Gestión · Plataforma UI'}</p>
          </div>
        </div>
        <div className="p-6 sm:p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="modern-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="modern-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="modern-btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
          <p className="text-center text-[0.6875rem] text-muted-foreground/60 mt-6">
            Sistema protegido · Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
