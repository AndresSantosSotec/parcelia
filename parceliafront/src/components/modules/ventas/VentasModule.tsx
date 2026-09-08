import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShoppingCart, Tag, Calendar, TrendUp, CreditCard, ArrowsClockwise, Plus } from '@phosphor-icons/react'
import { InventarioVentas } from './InventarioVentas'
import { ApartadosLista } from './ApartadosLista'
import { PlanesPago } from './PlanesPago'
import { ListadoVentas } from './ListadoVentas'
import { NuevaVenta } from './NuevaVenta'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { prendaService } from '@/services/prenda.service'
import { Skeleton } from '@/components/ui/skeleton'
import { useKV } from '@/hooks/use-kv'
import { api } from '@/lib/api'

interface EstadisticasVentas {
  en_venta: number
  apartados: number
  planes_pago: number
  ventas_hoy: number
  total_ventas_hoy: number
  utilidad_hoy: number
}

export function VentasModule() {
  const [session] = useKV<any>('user-session', null)
  const [stats, setStats] = useState<EstadisticasVentas>({
    en_venta: 0,
    apartados: 0,
    planes_pago: 0,
    ventas_hoy: 0,
    total_ventas_hoy: 0,
    utilidad_hoy: 0
  })
  const [loading, setLoading] = useState(true)
  const [configVentas, setConfigVentas] = useState<{apartado_habilitado: boolean | null}>({
    apartado_habilitado: null // null significa cargando
  })
  const [tabActiva, setTabActiva] = useState('inventario')
  const [vistaActiva, setVistaActiva] = useState<'modulo' | 'nueva-venta'>('modulo')

  // Cargar estadísticas desde la API
  const cargarEstadisticas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await prendaService.getEstadisticas()
      //console.log('Estadísticas de prendas:', response)

      // La API retorna { success: true, data: { en_venta, vendidas, etc } }
      const data = response as any
      setStats({
        en_venta: data?.en_venta || 0,
        apartados: 0, // Por implementar en backend
        planes_pago: 0, // Por implementar
        ventas_hoy: data?.vendidas || 0,
        total_ventas_hoy: data?.valor_total_vendido || 0,
        utilidad_hoy: 0 // Calcular si hay datos
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarEstadisticas()
    
    // Cargar configuración de ventas
    const cargarConfig = async () => {
      try {
        const query = new URLSearchParams()
        const userSucursalId = session?.userData?.sucursal_id || session?.sucursal_id
        if (userSucursalId) {
          query.append('sucursal_id', String(userSucursalId))
        }

        const queryString = query.toString()
        const response = await api.get('/contabilidad/parametrizacion-mora/activa' + (queryString ? `?${queryString}` : '')) as any
        const data = response.data?.data || response.data
        
        if (data) {
          setConfigVentas({
            apartado_habilitado: data.apartado_habilitado === true || data.apartado_habilitado === 1 || data.apartado_habilitado === '1'
          })
        } else {
          // Si no hay configuración, por defecto es true según migración
          setConfigVentas({
            apartado_habilitado: true
          })
        }
      } catch (error) {
        console.error('Error cargando configuración:', error)
        setConfigVentas({ apartado_habilitado: true }) // Fallback
      }
    }
    cargarConfig()
  }, [cargarEstadisticas, session])

  // Si está en la vista de nueva venta, mostrarla
  if (vistaActiva === 'nueva-venta') {
    return <NuevaVenta onVolver={() => setVistaActiva('modulo')} onVentaRegistrada={() => {
      setVistaActiva('modulo')
      cargarEstadisticas() // Recargar stats después de crear venta
    }} />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Módulo de Ventas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión de venta de prendas en estado "en_venta"
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setVistaActiva('nueva-venta')}
            className="gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Registrar Nueva Venta</span>
            <span className="sm:hidden">Nueva Venta</span>
          </Button>
          <Button variant="outline" size="sm" onClick={cargarEstadisticas} disabled={loading}>
            <ArrowsClockwise size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-2 ${configVentas.apartado_habilitado ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">En Venta</span>
              <span className="sm:hidden">Venta</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{stats.en_venta}</div>
            )}
          </CardContent>
        </Card>

        {configVentas.apartado_habilitado === true && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag size={16} />
                <span className="hidden sm:inline">Apartados</span>
                <span className="sm:hidden">Apart.</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className="text-2xl sm:text-3xl font-bold text-warning">{stats.apartados}</div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard size={16} />
              <span className="hidden sm:inline">Planes Pago</span>
              <span className="sm:hidden">Planes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-accent">{stats.planes_pago}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar size={16} />
              <span className="hidden sm:inline">Ventas Hoy</span>
              <span className="sm:hidden">Hoy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <MoneyDisplay amount={stats.total_ventas_hoy} size="lg" className="text-2xl sm:text-3xl" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendUp size={16} />
              <span className="hidden sm:inline">Utilidad Hoy</span>
              <span className="sm:hidden">Util.</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <MoneyDisplay amount={stats.utilidad_hoy} size="lg" className="text-accent text-2xl sm:text-3xl" />
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList className={`grid w-full gap-1 ${configVentas.apartado_habilitado === true ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
          <TabsTrigger value="inventario" className="text-xs sm:text-sm">
            <ShoppingCart size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Inventario</span>
            <span className="sm:hidden">Invent.</span>
          </TabsTrigger>
          {configVentas.apartado_habilitado === true && (
            <TabsTrigger value="apartados" className="text-xs sm:text-sm">
              <Tag size={16} className="mr-1 sm:mr-2" />
              Apartados
            </TabsTrigger>
          )}
          <TabsTrigger value="planes" className="text-xs sm:text-sm">
            <CreditCard size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Planes Pago</span>
            <span className="sm:hidden">Planes</span>
          </TabsTrigger>
          <TabsTrigger value="realizadas" className="text-xs sm:text-sm">
            <Calendar size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Realizadas</span>
            <span className="sm:hidden">Ventas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="mt-4 sm:mt-6">
          <InventarioVentas onRegistrarVenta={() => setVistaActiva('nueva-venta')} />
        </TabsContent>

        {configVentas.apartado_habilitado === true && (
          <TabsContent value="apartados" className="mt-4 sm:mt-6">
            <ApartadosLista />
          </TabsContent>
        )}

        <TabsContent value="planes" className="mt-4 sm:mt-6">
          <PlanesPago />
        </TabsContent>

        <TabsContent value="realizadas" className="mt-4 sm:mt-6">
          <ListadoVentas />
        </TabsContent>
      </Tabs>
    </div>
  )
}
