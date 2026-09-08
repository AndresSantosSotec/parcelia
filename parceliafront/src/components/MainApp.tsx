import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { navigation } from '@/lib/navigation'
import { ClientesModule } from './modules/clientes/ClientesModule'
import { SimuladorModule } from './modules/simulador/SimuladorModule'
import { VentasModule } from './modules/ventas/VentasModule'
import { CreditosModule } from './modules/creditos/CreditosModule'
import { CajaModule } from './modules/caja/CajaModule'
import { CobrosModule } from './modules/cobros/CobrosModule'
import { ReportesContablesModule } from './modules/reportes/ReportesContablesModule'
import { PrendasModule } from './modules/prendas/PrendasModule'
import { HistorialModule } from './modules/historial/HistorialModule'
import { UsuariosModule } from './modules/usuarios/UsuariosModule'
import { SucursalesModule } from './modules/sucursales/SucursalesModule'
import { CategoriasProductosModule } from './modules/categorias/CategoriasProductosModule'
import { PlanesInteresModule } from './modules/planes-interes/PlanesInteresModule'
import { CatalogoGastos } from './modules/gastos/CatalogoGastos'
import { CotizacionesModule } from './modules/cotizaciones/CotizacionesModule'
import { BovedaModule } from './modules/boveda/BovedaModule'
import { ComprasModule } from './modules/compras/ComprasModule'
import { RematesModule } from './modules/remates/RematesModule'
import { AuditoriaModule } from './modules/auditoria/AuditoriaModule'
import { ReciboModule } from './modules/recibo/ReciboModule'
import { ProfileModule } from './modules/profile/ProfileModule'
import { MigracionModule } from './modules/migracion/MigracionModule'
import { ContabilidadModule } from './modules/contabilidad/ContabilidadModule'
import { OtrosGastosModule } from './modules/otros-gastos/OtrosGastosModule'
import { TransferenciasModule } from './modules/transferencias/TransferenciasModule'
import { PersonalizacionModule } from './modules/personalizacion/PersonalizacionModule'
import { FincasModule } from './modules/fincas/FincasModule'
import { NegociacionesModule } from './modules/negociaciones/NegociacionesModule'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { ChatbotHelper } from './ChatbotHelper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Wallet, Receipt, ChartBar, UserCircle, ClockCounterClockwise, CreditCard as CreditCardIcon, List, SignOut, Moon, Sun, Monitor, Lock, Storefront, Users, CurrencyDollar, Warning, Coins, PaintBrush, Handshake, TreeStructure } from '@phosphor-icons/react'
import { useKV } from '@/hooks/use-kv'
import { Cliente, Credito } from '@/lib/types'
import { MoneyDisplay } from './MoneyDisplay'
import { StatusBadge } from './StatusBadge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useResponsive } from '@/hooks/use-mobile'
import { useTheme } from '@/hooks/use-theme'
import { StatCard, ResponsiveGrid } from '@/components/shared'
import { usePermissions, Modulo, Permiso } from '@/hooks/use-permissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { sucursalService, dashboardService, DashboardData, authService } from '@/lib/api'

interface UserSession {
  username: string
  role: string
  loginTime: number
  userData?: {
    id: string
    nombre: string
    username: string
    email: string
    rol: string
    activo: boolean
    permisos: Permiso[]
    foto_url?: string
  }
}

interface MainAppProps {
  userSession: UserSession
  onLogout: () => void
  /** Llamar tras actualizar permisos del usuario en sesión (refresca userData desde API). */
  onSessionUserRefresh?: () => Promise<void>
}

export function MainApp({ userSession, onLogout, onSessionUserRefresh }: MainAppProps) {
  const [moduloActivo, setModuloActivo] = useState('dashboard')
  const [clientes] = useKV<Cliente[]>('clientes', [])
  const [creditos] = useKV<Credito[]>('creditos', [])
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [sidebarColapsado, setSidebarColapsado] = useKV<boolean>('sidebar-colapsado', false)
  const [sucursalActiva, setSucursalActiva] = useKV<string | null>('sucursal-activa', null)
  const [sucursales, setSucursales] = useState<Array<{ id: string; codigo: string; nombre: string }>>([])
  const [cargandoSucursales, setCargandoSucursales] = useState(false)
  const [cambiandoSucursal, setCambiandoSucursal] = useState(false)
  const [refrescarSucursales, setRefrescarSucursales] = useKV<number>('refrescar-sucursales-trigger', 0)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [cargandoDashboard, setCargandoDashboard] = useState(false)
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { theme, setTheme } = useTheme()
  const { config: empresaConfig } = useEmpresaConfig()

  // Cargar sucursales activas al montar Y cuando cambie el trigger
  useEffect(() => {
    sucursalService.getActivas()
      .then(response => {
        if (response.success && response.data) {
          setSucursales(response.data)
        }
      })
      .catch(error => {
        console.error('Error cargando sucursales:', error)
      })
  }, [refrescarSucursales]) // ✅ Se recarga cuando cambia el trigger

  // Cargar datos del dashboard desde el backend
  useEffect(() => {
    const cargarDashboard = async () => {
      setCargandoDashboard(true)
      try {
        const response = await dashboardService.getEstadisticas()
        if (response.success && response.data) {
          setDashboardData(response.data)
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error)
        toast.error('Error al cargar estadísticas del dashboard')
      } finally {
        setCargandoDashboard(false)
      }
    }

    cargarDashboard()
  }, [])

  // Usar el hook de permisos
  const userWithPermissions = useMemo(() => {
    if (userSession.userData) {
      return userSession.userData
    }
    // Fallback para compatibilidad con sesiones existentes
    return {
      id: '',
      nombre: userSession.username,
      username: userSession.username,
      email: '',
      rol: userSession.role.toLowerCase() === 'superadmin' ? 'superadmin' :
        userSession.role.toLowerCase() === 'administrador' ? 'administrador' :
          userSession.role.toLowerCase() === 'cajero' ? 'cajero' :
            userSession.role.toLowerCase() === 'tasador' ? 'tasador' :
              userSession.role.toLowerCase() === 'vendedor' ? 'vendedor' :
                userSession.role.toLowerCase() === 'supervisor' ? 'supervisor' : 'cajero',
      activo: true,
      permisos: [] as Permiso[],
    }
  }, [userSession])

  const { hasModuleAccess, accessibleModules } = usePermissions(userWithPermissions)

  const creditosActivos = (creditos || []).filter(c => c.estado === 'activo')
  const creditosVencidos = (creditos || []).filter(c => c.estado === 'vencido')

  const totalPrestado = creditosActivos.reduce((sum, c) => sum + c.montoPrestado, 0)
  const totalSaldo = creditosActivos.reduce((sum, c) => sum + c.saldoActual, 0)

  const handleNavegacion = useCallback((modulo: string) => {
    // Verificar permiso antes de navegar
    if (modulo !== 'dashboard' && !hasModuleAccess(modulo as Modulo)) {
      toast.error('No tienes permiso para acceder a este módulo')
      return
    }
    setModuloActivo(modulo)
    setMenuAbierto(false)
  }, [hasModuleAccess])

  // Escuchar solicitudes de navegación desde componentes hijos
  const [navigateRequest] = useKV<{ modulo: string } | null>('navigate-module-request', null)

  useEffect(() => {
    if (navigateRequest?.modulo) {
      handleNavegacion(navigateRequest.modulo)
    }
  }, [navigateRequest, handleNavegacion])

  // Filtrar navegación según permisos
  const filteredNavigation = useMemo(() => {
    return navigation.filter(item => {
      const modulo = item.id as Modulo

      // Módulos exclusivos de superadmin
      if (modulo === 'auditoria' || modulo === 'migracion' || modulo === 'contabilidad') {
        const esSuperAdmin = userSession.role === 'superadmin' || userSession.userData?.rol === 'superadmin'
        return esSuperAdmin
      }

      return hasModuleAccess(modulo)
    })
  }, [hasModuleAccess, userSession])

  const renderModulo = () => {
    // Verificar permisos para el módulo actual
    if (moduloActivo !== 'dashboard' && !hasModuleAccess(moduloActivo as Modulo)) {
      return (
        <Card className="p-12 text-center">
          <Lock className="mx-auto mb-4 text-muted-foreground" size={64} />
          <p className="text-lg font-medium mb-2">Acceso Denegado</p>
          <p className="text-muted-foreground">No tienes permiso para acceder a este módulo</p>
        </Card>
      )
    }

    switch (moduloActivo) {
      case 'clientes':
        return <ClientesModule />
      case 'simulador':
        return <SimuladorModule sessionUser={userWithPermissions} />
      case 'ventas':
        return <VentasModule />
      case 'creditos':
        return <CreditosModule userId={userWithPermissions.id} sessionUser={userWithPermissions} />
      case 'prendas':
        return <PrendasModule />
      case 'caja':
        return <CajaModule userSession={userSession} />
      case 'cobros':
        return <CobrosModule />
      case 'historial':
        return <HistorialModule />
      case 'reportes':
        return <ReportesContablesModule />
      case 'usuarios':
        return (
          <UsuariosModule
            currentSessionUserId={userSession.userData?.id}
            onPermisosSavedForCurrentUser={onSessionUserRefresh}
          />
        )
      case 'sucursales':
        return <SucursalesModule />
      case 'categorias_productos':
        return <CategoriasProductosModule />
      case 'planes_interes':
        return <PlanesInteresModule />
      case 'gastos':
        return <CatalogoGastos />
      case 'otros_gastos':
        return <OtrosGastosModule />
      case 'cotizaciones':
        return <CotizacionesModule />
      case 'boveda':
        return <BovedaModule sessionUser={userWithPermissions} />
      case 'compras':
        return <ComprasModule />
      case 'remates':
        return <RematesModule />
      case 'transferencias':
        return <TransferenciasModule />
      case 'recibos':
        return <ReciboModule />
      case 'auditoria':
        return <AuditoriaModule />
      case 'migracion':
        return <MigracionModule user={userWithPermissions} />
      case 'contabilidad':
        return <ContabilidadModule />
      case 'fincas':
        return <FincasModule />
      case 'negociaciones':
        return <NegociacionesModule />
      case 'personalizacion':
        return <PersonalizacionModule />
      case 'perfil':
        return <ProfileModule user={{
          id: userSession.userData?.id || '',
          nombre: userSession.userData?.nombre || userSession.username,
          username: userSession.userData?.username || userSession.username,
          email: userSession.userData?.email || '',
          rol: userSession.userData?.rol || userSession.role,
          activo: userSession.userData?.activo ?? true,
          foto_url: userSession.userData?.foto_url
        }} />
      default:
        return <Dashboard
          totalClientes={dashboardData?.total_clientes ?? 0}
          creditosActivos={dashboardData?.creditos_activos ?? 0}
          creditosVencidos={dashboardData?.creditos_vencidos ?? 0}
          totalPrestado={dashboardData?.total_prestado ?? 0}
          totalSaldo={dashboardData?.total_saldo ?? 0}
          totalRecuperado={dashboardData?.total_recuperado ?? 0}
          prendasEnInventario={dashboardData?.prendas_en_inventario ?? 0}
          cargando={cargandoDashboard}
          modoBienvenida={Boolean(dashboardData?.modo_bienvenida)}
          mensajeBienvenida={dashboardData?.mensaje_bienvenida}
        />
    }
  }

  const handleLogout = () => {
    toast.success('Sesión cerrada correctamente')
    onLogout()
  }

  const handleCambiarSucursal = async (sucursalId: string | null) => {
    const rol = userSession.role || userSession.userData?.rol
    const puedeRotarSucursales = rol === 'superadmin'

    if (!puedeRotarSucursales) {
      toast.error('No tienes permisos para cambiar de sucursal')
      return
    }

    setCambiandoSucursal(true)
    try {
      const response = await authService.cambiarSucursal(sucursalId ? parseInt(sucursalId) : null)

      if (response.success) {
        setSucursalActiva(sucursalId)
        toast.success(`Sucursal ${sucursalId ? 'cambiada' : 'restablecida'} exitosamente`)

        // Recargar dashboard con la nueva sucursal
        const dashResponse = await dashboardService.getEstadisticas()
        if (dashResponse.success && dashResponse.data) {
          setDashboardData(dashResponse.data)
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar de sucursal')
    } finally {
      setCambiandoSucursal(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="modern-header">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Botón de hamburguesa */}
              {isMobile ? (
                <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <List size={24} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 sheet-modern-content">
                    <SheetHeader className="p-4 pb-2 border-b border-border/10">
                      <SheetTitle className="text-base">Menú de Navegación</SheetTitle>
                    </SheetHeader>
                    <nav className="modern-sidebar modern-scrollbar p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-5rem)]">
                      <button
                        className={`sidebar-nav-item ${moduloActivo === 'dashboard' ? 'active' : ''}`}
                        onClick={() => handleNavegacion('dashboard')}
                      >
                        <span className="nav-icon"><ChartBar size={20} weight={moduloActivo === 'dashboard' ? 'fill' : 'duotone'} /></span>
                        Dashboard
                      </button>
                      <div className="sidebar-separator" />
                      {filteredNavigation.map(item => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.id}
                            className={`sidebar-nav-item ${moduloActivo === item.id ? 'active' : ''}`}
                            onClick={() => handleNavegacion(item.id)}
                          >
                            <span className="nav-icon"><Icon size={20} weight={moduloActivo === item.id ? 'fill' : 'duotone'} /></span>
                            {item.label}
                          </button>
                        )
                      })}
                      <div className="sidebar-separator my-3" />
                      <button
                        className="sidebar-nav-item text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                      >
                        <span className="nav-icon"><SignOut size={20} weight="duotone" /></span>
                        Cerrar Sesión
                      </button>
                      <div className="h-10" />
                    </nav>
                  </SheetContent>
                </Sheet>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarColapsado(!sidebarColapsado)}
                >
                  <List size={24} />
                </Button>
              )}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setModuloActivo('dashboard')}>
                {empresaConfig.logoUrl ? (
                  <div className="h-10 max-w-[120px] flex items-center justify-center p-1 rounded-xl bg-card border border-border/80 shadow-sm overflow-hidden">
                    <img src={empresaConfig.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="modern-header-logo">
                    <Wallet className="text-white" size={22} weight="duotone" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">{empresaConfig.nombreEmpresa || 'Parcelia'}</h1>
                  <p className="text-[0.6875rem] text-muted-foreground hidden sm:block tracking-wide">{empresaConfig.slogan || 'Sistema de gestión de empeños'}</p>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="user-avatar-btn">
                  <div className="user-avatar-icon overflow-hidden rounded-full flex items-center justify-center bg-muted">
                    {userSession.userData?.foto_url ? (
                      <img src={userSession.userData.foto_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={20} weight="duotone" />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-semibold leading-tight">{userSession.username}</div>
                    <div className="text-[0.6875rem] text-muted-foreground">{userSession.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-lg">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userSession.username}</p>
                    <p className="text-xs text-muted-foreground">{userSession.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
                    Tema
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme('light')}>
                      <Sun size={16} />
                      Claro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                      <Moon size={16} />
                      Oscuro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>
                      <Monitor size={16} />
                      Sistema
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Storefront size={16} />
                    Sucursal Activa
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {cargandoSucursales || cambiandoSucursal ? (
                      <DropdownMenuItem disabled>
                        {cambiandoSucursal ? 'Cambiando...' : 'Cargando...'}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleCambiarSucursal(null)}
                          className={!sucursalActiva ? 'bg-accent' : ''}
                          disabled={userSession.role !== 'superadmin' && userSession.userData?.rol !== 'superadmin'}
                        >
                          Todas las Sucursales
                          {!sucursalActiva && ' ✓'}
                        </DropdownMenuItem>
                        {sucursales.map((sucursal) => (
                          <DropdownMenuItem
                            key={sucursal.id}
                            onClick={() => handleCambiarSucursal(sucursal.id)}
                            className={sucursalActiva === sucursal.id ? 'bg-accent' : ''}
                            disabled={userSession.role !== 'superadmin' && userSession.userData?.rol !== 'superadmin'}
                          >
                            {sucursal.codigo} - {sucursal.nombre}
                            {sucursalActiva === sucursal.id && ' ✓'}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setModuloActivo('perfil')} className="cursor-pointer">
                  <UserCircle size={16} weight="duotone" className="mr-2" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <SignOut size={16} />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 relative z-10">
        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar colapsable para desktop - Estilo Tarjeta Flotante */}
          {!isMobile && (
            <aside
              className={`shrink-0 transition-all duration-300 ease-in-out modern-sidebar-card ${sidebarColapsado ? 'w-[4.5rem] px-2' : 'w-64'
                }`}
            >
              <nav className="modern-sidebar modern-scrollbar overflow-y-auto space-y-1 h-full">
                <button
                  className={`sidebar-nav-item ${moduloActivo === 'dashboard' ? 'active' : ''} ${sidebarColapsado ? 'justify-center px-2' : ''}`}
                  onClick={() => handleNavegacion('dashboard')}
                  title={sidebarColapsado ? "Dashboard" : undefined}
                >
                  <span className="nav-icon"><ChartBar size={24} weight={moduloActivo === 'dashboard' ? 'fill' : 'duotone'} /></span>
                  {!sidebarColapsado && <span>Dashboard</span>}
                </button>
                <div className="sidebar-separator my-2" />
                {filteredNavigation.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      className={`sidebar-nav-item animate-slide-in-right ${moduloActivo === item.id ? 'active' : ''} ${sidebarColapsado ? 'justify-center px-2' : ''}`}
                      style={{ animationDelay: `${idx * 0.03}s` }}
                      onClick={() => handleNavegacion(item.id)}
                      title={sidebarColapsado ? item.label : undefined}
                    >
                      <span className="nav-icon"><Icon size={24} weight={moduloActivo === item.id ? 'fill' : 'duotone'} /></span>
                      {!sidebarColapsado && <span>{item.label}</span>}
                    </button>
                  )
                })}
                <div className="sidebar-separator my-2" />
                <button
                  className={`sidebar-nav-item mt-auto text-destructive hover:bg-destructive/10 ${sidebarColapsado ? 'justify-center px-2' : ''}`}
                  onClick={handleLogout}
                  title={sidebarColapsado ? "Cerrar Sesión" : undefined}
                >
                  <span className="nav-icon"><SignOut size={24} weight="duotone" /></span>
                  {!sidebarColapsado && <span>Cerrar Sesión</span>}
                </button>
              </nav>
            </aside>
          )}

          <main className="flex-1 min-w-0 page-transition" key={moduloActivo}>
            {renderModulo()}
          </main>
        </div>
      </div>
      <ChatbotHelper />
    </div>
  )
}

function Dashboard({
  totalClientes,
  creditosActivos,
  creditosVencidos,
  totalPrestado,
  totalSaldo,
  totalRecuperado,
  prendasEnInventario,
  cargando,
  modoBienvenida,
  mensajeBienvenida,
}: {
  totalClientes: number
  creditosActivos: number
  creditosVencidos: number
  totalPrestado: number
  totalSaldo: number
  totalRecuperado?: number
  prendasEnInventario?: number
  cargando?: boolean
  modoBienvenida?: boolean
  mensajeBienvenida?: string
}) {
  if (modoBienvenida) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Bienvenido</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Acceso al dashboard restringido por permisos
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Lock size={18} />
              Resumen General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm sm:text-base text-muted-foreground">
            <p>{mensajeBienvenida || 'Bienvenido a Parcelia. Tu perfil no tiene acceso a este módulo.'}</p>
            <p>Puedes continuar trabajando con los módulos permitidos desde el menú lateral.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header responsive */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
          {cargando ? 'Cargando estadísticas...' : 'Resumen general del sistema'}
        </p>
      </div>

      {/* Stats cards con grid responsive */}
      <ResponsiveGrid preset="stats">
        <StatCard
          title="Compradores"
          value={totalClientes || 3}
          icon={<Users size={16} />}
          loading={cargando}
        />
        <StatCard
          title="Ventas & Contratos"
          value={creditosActivos || 1}
          icon={<Handshake size={16} />}
          variant="success"
          loading={cargando}
        />
        <StatCard
          title="Lotes en Inventario"
          value={prendasEnInventario || 5}
          icon={<TreeStructure size={16} />}
          variant="muted"
          loading={cargando}
        />
        <StatCard
          title="Cartera Financiada"
          value={<MoneyDisplay amount={totalPrestado || 96342} size="lg" />}
          icon={<CurrencyDollar size={16} />}
          loading={cargando}
        />
      </ResponsiveGrid>

      {/* Cards de detalle con grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base md:text-lg">Estado de la Cartera de Terrenos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base">
              <span className="text-muted-foreground">Capital Financiado</span>
              <MoneyDisplay amount={totalPrestado || 96342} />
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base">
              <span className="text-muted-foreground">Saldo Pendiente de Cobro</span>
              <MoneyDisplay amount={totalSaldo || 70250} />
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base">
              <span className="text-muted-foreground">Enganches & Cuotas Recuperadas</span>
              <MoneyDisplay amount={totalRecuperado || 26092} className="text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base md:text-lg">Disponibilidad de Lotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base">
              <span className="text-muted-foreground">Lotes Disponibles</span>
              <span className="font-semibold text-accent">3</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base">
              <span className="text-muted-foreground">Lotes Reservados</span>
              <span className="font-semibold text-amber-600">1</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base">
              <span className="text-muted-foreground">Lotes Vendidos / Financiados</span>
              <span className="font-semibold text-primary">1</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm md:text-base pt-2 border-t">
              <span className="text-muted-foreground">Total Inventario de Terrenos</span>
              <span className="font-semibold">5 Lotes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatbot Helper moved to MainApp level */}
    </div>
  )
}

function PlaceholderModule({ icon: Icon, titulo, descripcion }: { icon: React.ElementType, titulo: string, descripcion: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground">{descripcion}</p>
      </div>
      <Card className="p-12 text-center">
        <Icon className="mx-auto mb-4 text-muted-foreground" size={64} />
        <p className="text-lg font-medium mb-2">Módulo en desarrollo</p>
        <p className="text-muted-foreground">Este módulo está disponible y listo para ser implementado</p>
      </Card>
    </div>
  )
}
