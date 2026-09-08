'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '@/lib/api'
import { bovedaService, Boveda, BovedaMovimiento, BovedaStats } from '@/lib/services/boveda.service'
import { denominacionService, Denominacion, DenominacionesResponse } from '@/lib/services/denominacion.service'
import { sucursalService, Sucursal } from '@/lib/services/sucursal.service'
import { useKV } from '@/hooks/use-kv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
  Building,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Settings
} from 'lucide-react'

// Interfaces para desglose de denominaciones
interface DesgloseItem {
  denominacion_id: number
  valor: number
  tipo: 'billete' | 'moneda'
  descripcion: string
  cantidad: number
  subtotal: number
}

export function BovedaModule({ sessionUser }: { sessionUser?: any }) {
  const [activeTab, setActiveTab] = useState('lista')
  
  // Configuración de etiquetas dinámicas
  const [configLabels, setConfigLabels] = useState<{[key: string]: string}>({
    boveda_label_entrada: 'Entrada',
    boveda_label_salida: 'Salida',
    boveda_label_transferencia_entrada: 'Transferencia Entrada',
    boveda_label_transferencia_salida: 'Transferencia Salida',
    boveda_label_ingreso_cierre_diario: 'Ingreso por Cierre Diario',
  })

  const loadConfiguraciones = async () => {
    try {
      const response = await api.get<any>('/configuraciones-sistema?grupo=boveda')
      if (response && response.success && Array.isArray(response.data)) {
        const configMap: any = {}
        response.data.forEach((item: any) => {
          configMap[item.clave] = item.valor
        })
        setConfigLabels(prev => ({
          ...prev,
          ...configMap
        }))
      }
    } catch (error) {
      console.error('Error al cargar configuraciones de etiquetas:', error)
    }
  }

  const handleGuardarConfiguraciones = async () => {
    try {
      setLoadingForm(true)
      const payload = {
        configuraciones: Object.entries(configLabels).map(([clave, valor]) => ({
          clave,
          valor
        }))
      }
      await api.put('/configuraciones-sistema', payload)
      toast.success('Etiquetas de movimientos actualizadas correctamente')
      await loadConfiguraciones()
      loadBovedas()
      if (bovedaSeleccionada) {
        loadBovedaDetalles(bovedaSeleccionada.id)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar las etiquetas')
    } finally {
      setLoadingForm(false)
    }
  }
  const [bovedas, setBovedas] = useState<Boveda[]>([])
  const [bovedaSeleccionada, setBovedaSeleccionada] = useState<Boveda | null>(null)
  const [movimientos, setMovimientos] = useState<BovedaMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingForm, setLoadingForm] = useState(false)
  const [stats, setStats] = useState<BovedaStats | null>(null)

  // Datos maestros
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([])
  const [denominacionesData, setDenominacionesData] = useState<DenominacionesResponse | null>(null)

  // Trigger para refrescar sucursales cuando cambien en el módulo de sucursales
  const [refrescarSucursalesTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)

  // Dialog states
  const [dialogCrearBoveda, setDialogCrearBoveda] = useState(false)
  const [dialogEditarBoveda, setDialogEditarBoveda] = useState(false)
  const [dialogMovimiento, setDialogMovimiento] = useState(false)

  // Form states - Crear/Editar Bóveda
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    sucursal_id: '',
    saldo_inicial: '',
    tipo: 'general',
    responsable_id: '',
  })

  // Form states - Movimiento con desglose obligatorio
  const [movimientoData, setMovimientoData] = useState({
    tipo_movimiento: 'entrada',
    concepto: '',
    boveda_destino_id: '',
    referencia: '',
  })

  // Desglose de denominaciones (opcional)
  const [desglose, setDesglose] = useState<{ [key: number]: number }>({})
  const [usarDesglose, setUsarDesglose] = useState(true)
  const [montoDirecto, setMontoDirecto] = useState('')

  // Dialog para editar movimiento
  const [dialogEditarMovimiento, setDialogEditarMovimiento] = useState(false)
  const [movimientoParaEditar, setMovimientoParaEditar] = useState<BovedaMovimiento | null>(null)
  const [editMovimientoData, setEditMovimientoData] = useState({ concepto: '', referencia: '' })

  // Cargar datos iniciales
  useEffect(() => {
    loadDatosMaestros()
    loadBovedas()
  }, [refrescarSucursalesTrigger])

  const loadDatosMaestros = async () => {
    try {
      // Cargar sucursales y denominaciones en paralelo
      const [sucursalesData, denominacionesRes] = await Promise.all([
        sucursalService.getActivas(),
        denominacionService.getMonedaBase()
      ])

      setSucursales(sucursalesData)
      setDenominacionesData(denominacionesRes)
      // Usar todas las denominaciones ordenadas (billetes + monedas)
      setDenominaciones(denominacionesRes.todas || [])

      // Cargar configuraciones de etiquetas
      await loadConfiguraciones()

    } catch (error: any) {
      console.error('Error al cargar datos maestros:', error)
      // No mostrar error de toast si es problema de autenticación (ya se maneja globalmente)
      if (!error.message?.includes('Unauthenticated') && !error.message?.includes('401')) {
        toast.error('Error al cargar datos del sistema')
      }
    }
  }

  const loadBovedas = async () => {
    try {
      setLoading(true)
      const response = await bovedaService.getBovedas()
      setBovedas(response.bovedas || response || [])
    } catch (error) {
      toast.error('Error al cargar bóvedas')
    } finally {
      setLoading(false)
    }
  }

  const loadBovedaDetalles = async (id: number) => {
    try {
      setLoading(true)
      const response = await bovedaService.getBoveda(id)
      setBovedaSeleccionada(response.boveda || response)
      setStats(response.estadisticas || null)

      // Cargar historial de movimientos
      const historialResponse = await bovedaService.getHistorialMovimientos(id)
      setMovimientos(historialResponse.data || historialResponse.movimientos || [])
    } catch (error) {
      toast.error('Error al cargar detalles de bóveda')
    } finally {
      setLoading(false)
    }
  }

  // Calcular total del desglose
  const totalDesglose = useMemo(() => {
    return Object.entries(desglose).reduce((total, [denomId, cantidad]) => {
      const denom = denominaciones.find(d => d.id === parseInt(denomId))
      return total + (denom ? denom.valor * cantidad : 0)
    }, 0)
  }, [desglose, denominaciones])

  // Actualizar concepto automáticamente cuando cambia el tipo de movimiento o el monto
  useEffect(() => {
    const montoActual = usarDesglose ? totalDesglose : (parseFloat(montoDirecto) || 0)
    if (dialogMovimiento && montoActual > 0) {
      const conceptoAuto = generateAutoConcepto(movimientoData.tipo_movimiento, montoActual)
      setMovimientoData(prev => ({
        ...prev,
        concepto: conceptoAuto
      }))
    }
  }, [movimientoData.tipo_movimiento, totalDesglose, montoDirecto, usarDesglose, dialogMovimiento])

  // Obtener desglose formateado para enviar al API
  const getDesgloseParaAPI = useCallback(() => {
    const desgloseObj: { [key: string]: number } = {}
    Object.entries(desglose).forEach(([denomId, cantidad]) => {
      if (cantidad > 0) {
        const denom = denominaciones.find(d => d.id === parseInt(denomId))
        if (denom) {
          desgloseObj[denom.valor.toString()] = cantidad
        }
      }
    })
    return desgloseObj
  }, [desglose, denominaciones])

  // Handlers
  const handleCrearBoveda = async () => {
    if (!formData.nombre || !formData.sucursal_id) {
      toast.error('Completa los campos requeridos')
      return
    }

    // Calcular saldo inicial: desde desglose o monto directo
    const saldoInicial = usarDesglose ? totalDesglose : (parseFloat(montoDirecto) || 0)

    if (saldoInicial < 0) {
      toast.error('El saldo inicial no puede ser negativo')
      return
    }

    try {
      setLoadingForm(true)
      await bovedaService.createBoveda({
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        sucursal_id: parseInt(formData.sucursal_id),
        saldo_inicial: saldoInicial,
        tipo: formData.tipo as any,
        requiere_aprobacion: false,
        responsable_id: formData.responsable_id ? parseInt(formData.responsable_id) : undefined,
        desglose_denominaciones: usarDesglose && totalDesglose > 0 ? getDesgloseParaAPI() : undefined,
      })

      toast.success('Bóveda creada correctamente')
      setDialogCrearBoveda(false)
      resetForm()
      loadBovedas()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear bóveda')
    } finally {
      setLoadingForm(false)
    }
  }

  const handleEditarBoveda = async () => {
    if (!bovedaSeleccionada || !formData.nombre) {
      toast.error('Completa los campos requeridos')
      return
    }

    try {
      setLoadingForm(true)
      await bovedaService.updateBoveda(bovedaSeleccionada.id, {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        tipo: formData.tipo as any,
        activa: bovedaSeleccionada.activa,
        requiere_aprobacion: false,
        responsable_id: formData.responsable_id ? parseInt(formData.responsable_id) : undefined,
      })

      toast.success('Bóveda actualizada correctamente')
      setDialogEditarBoveda(false)
      loadBovedas()
      if (bovedaSeleccionada) {
        loadBovedaDetalles(bovedaSeleccionada.id)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar bóveda')
    } finally {
      setLoadingForm(false)
    }
  }

  const handleRegistrarMovimiento = async () => {
    if (!bovedaSeleccionada) {
      toast.error('Selecciona una bóveda')
      return
    }

    const montoFinal = usarDesglose ? totalDesglose : (parseFloat(montoDirecto) || 0)

    if (montoFinal <= 0) {
      toast.error(usarDesglose ? 'Debes ingresar al menos una denominación' : 'Ingresa un monto válido')
      return
    }

    // Validar transferencia
    if (movimientoData.tipo_movimiento === 'transferencia_salida' && !movimientoData.boveda_destino_id) {
      toast.error('Selecciona una bóveda destino para la transferencia')
      return
    }

    // Validar que hay suficiente saldo para salidas
    if (['salida', 'transferencia_salida'].includes(movimientoData.tipo_movimiento)) {
      if (montoFinal > bovedaSeleccionada.saldo_actual) {
        toast.error('Saldo insuficiente en la bóveda')
        return
      }
    }

    try {
      setLoadingForm(true)
      const data: any = {
        tipo_movimiento: movimientoData.tipo_movimiento,
        monto: montoFinal,
        concepto: movimientoData.concepto,
        referencia: movimientoData.referencia,
        desglose_denominaciones: usarDesglose && totalDesglose > 0 ? getDesgloseParaAPI() : undefined,
      }

      if (movimientoData.tipo_movimiento === 'transferencia_salida') {
        data.boveda_destino_id = parseInt(movimientoData.boveda_destino_id)
      }

      await bovedaService.registrarMovimiento(bovedaSeleccionada.id, data)

      toast.success('Movimiento registrado correctamente')
      setDialogMovimiento(false)
      resetMovimientoForm()
      loadBovedaDetalles(bovedaSeleccionada.id)
      loadBovedas() // Recargar lista de bóvedas para actualizar saldos
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar movimiento')
    } finally {
      setLoadingForm(false)
    }
  }

  const handleAbrirEditarMovimiento = (movimiento: BovedaMovimiento) => {
    setMovimientoParaEditar(movimiento)
    setEditMovimientoData({
      concepto: movimiento.concepto || '',
      referencia: movimiento.referencia || '',
    })
    setDialogEditarMovimiento(true)
  }

  const handleGuardarEditarMovimiento = async () => {
    if (!movimientoParaEditar) return
    if (!editMovimientoData.concepto.trim()) {
      toast.error('El concepto es obligatorio')
      return
    }

    try {
      setLoadingForm(true)
      await bovedaService.actualizarMovimiento(movimientoParaEditar.id, {
        concepto: editMovimientoData.concepto,
        referencia: editMovimientoData.referencia || undefined
      })
      toast.success('Movimiento actualizado correctamente')
      setDialogEditarMovimiento(false)
      setMovimientoParaEditar(null)
      if (bovedaSeleccionada) {
        loadBovedaDetalles(bovedaSeleccionada.id)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar el movimiento')
    } finally {
      setLoadingForm(false)
    }
  }

  const handleEliminarBoveda = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta bóveda? Esta acción no se puede deshacer.')) return

    try {
      await bovedaService.deleteBoveda(id)
      toast.success('Bóveda eliminada correctamente')
      setBovedaSeleccionada(null)
      loadBovedas()
      setActiveTab('lista')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar bóveda')
    }
  }

  // Utilidades
  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      sucursal_id: '',
      saldo_inicial: '',
      tipo: 'general',
      responsable_id: '',
    })
    setDesglose({})
    setUsarDesglose(true)
    setMontoDirecto('')
  }

  const resetMovimientoForm = () => {
    setMovimientoData({
      tipo_movimiento: 'entrada',
      concepto: '',
      boveda_destino_id: '',
      referencia: '',
    })
    setDesglose({})
    setUsarDesglose(true)
    setMontoDirecto('')
  }

  // Genera un concepto automático basado en el tipo de movimiento y el monto
  const generateAutoConcepto = (tipo: string, monto: number): string => {
    const fecha = new Date().toLocaleDateString('es-GT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    const montoFormateado = new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto)

    switch (tipo) {
      case 'entrada':
        return `Ingreso de ${montoFormateado} en efectivo - ${fecha}`
      case 'salida':
        return `Egreso de ${montoFormateado} en efectivo - ${fecha}`
      case 'transferencia_salida':
        return `Transferencia de ${montoFormateado} a otra bóveda - ${fecha}`
      default:
        return `Movimiento de ${montoFormateado} - ${fecha}`
    }
  }

  const updateDesglose = (denominacionId: number, cantidad: number) => {
    setDesglose(prev => ({
      ...prev,
      [denominacionId]: Math.max(0, cantidad)
    }))
  }

  const openEditDialog = (boveda: Boveda) => {
    setBovedaSeleccionada(boveda)
    setFormData({
      nombre: boveda.nombre,
      descripcion: boveda.descripcion || '',
      sucursal_id: boveda.sucursal_id.toString(),
      saldo_inicial: '',
      tipo: boveda.tipo,
      responsable_id: boveda.responsable_id?.toString() || '',
    })
    setDialogEditarBoveda(true)
  }

  const openMovimientoDialog = () => {
    resetMovimientoForm()
    setDialogMovimiento(true)
  }

  // Separar billetes y monedas para el grid de desglose
  const billetes = useMemo(() =>
    denominaciones.filter(d => d.tipo === 'billete').sort((a, b) => b.valor - a.valor),
    [denominaciones]
  )
  const monedas = useMemo(() =>
    denominaciones.filter(d => d.tipo === 'moneda').sort((a, b) => b.valor - a.valor),
    [denominaciones]
  )

  // Render function de desglose (NO es un componente para evitar pérdida de foco)
  const renderDesgloseGrid = (readOnly = false) => (
    <div className="space-y-4">
      {/* Billetes */}
      {billetes.length > 0 && (
        <div>
          <Label className="text-sm font-semibold text-green-700 mb-2 block">💵 Billetes</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {billetes.map(denom => {
              const cantidad = desglose[denom.id] || 0
              const subtotal = denom.valor * cantidad
              return (
                <div key={denom.id} className="flex flex-col p-2 border rounded-lg bg-green-50">
                  <span className="text-sm font-medium text-green-800">
                    {denom.descripcion || `Q${denom.valor}`}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="0"
                      className="w-20 h-8 text-center"
                      value={cantidad || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                        updateDesglose(denom.id, value)
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10) || 0
                        updateDesglose(denom.id, Math.max(0, value))
                      }}
                      disabled={readOnly}
                    />
                    {cantidad > 0 && (
                      <span className="text-xs text-green-700">
                        = Q{subtotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monedas */}
      {monedas.length > 0 && (
        <div>
          <Label className="text-sm font-semibold text-amber-700 mb-2 block">🪙 Monedas</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {monedas.map(denom => {
              const cantidad = desglose[denom.id] || 0
              const subtotal = denom.valor * cantidad
              return (
                <div key={denom.id} className="flex flex-col p-2 border rounded-lg bg-amber-50">
                  <span className="text-sm font-medium text-amber-800">
                    {denom.descripcion || `Q${denom.valor}`}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="0"
                      className="w-20 h-8 text-center"
                      value={cantidad || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                        updateDesglose(denom.id, value)
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10) || 0
                        updateDesglose(denom.id, Math.max(0, value))
                      }}
                      disabled={readOnly}
                    />
                    {cantidad > 0 && (
                      <span className="text-xs text-amber-700">
                        = Q{subtotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-end items-center p-3 bg-muted rounded-lg">
        <span className="text-lg font-semibold">Total:</span>
        <span className="text-2xl font-bold ml-3 text-blue-600">
          {bovedaService.formatMonto(totalDesglose)}
        </span>
      </div>
    </div>
  )

  // Render principal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-slate-100">Gestión de Bóvedas</h1>
          <p className="text-muted-foreground dark:text-slate-400">Administra las bóvedas de seguridad y sus movimientos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => bovedaService.exportarBovedas()}
            disabled={loading || bovedas.length === 0}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => loadBovedas()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => { resetForm(); setDialogCrearBoveda(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Bóveda
          </Button>
        </div>
      </div>

      {/* Tabs simplificados: sin aprobaciones */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista">Bóvedas</TabsTrigger>
          <TabsTrigger value="detalles" disabled={!bovedaSeleccionada}>Detalles</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          {(sessionUser?.rol === 'superadmin' || sessionUser?.rol === 'administrador') && (
            <TabsTrigger value="configuracion">
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </TabsTrigger>
          )}
        </TabsList>

        {/* Lista de Bóvedas */}
        <TabsContent value="lista" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : bovedas.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground dark:text-slate-400">No hay bóvedas registradas</p>
                <Button className="mt-4" onClick={() => { resetForm(); setDialogCrearBoveda(true) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera bóveda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bovedas.map((boveda) => (
                <Card key={boveda.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-foreground dark:text-slate-100">{boveda.nombre}</CardTitle>
                      <Badge variant={boveda.activa ? 'default' : 'secondary'}>
                        {boveda.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 dark:text-slate-400">
                      <Building className="h-4 w-4" />
                      {boveda.sucursal?.nombre || `Sucursal #${boveda.sucursal_id}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground dark:text-slate-400">Saldo actual:</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          {bovedaService.formatMonto(boveda.saldo_actual)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground dark:text-slate-400">Tipo:</span>
                        <Badge variant="outline">
                          {bovedaService.getTipoBovedaLabel(boveda.tipo)}
                        </Badge>
                      </div>

                      {boveda.responsable && (
                        <div className="flex items-center text-sm text-muted-foreground dark:text-slate-400">
                          <User className="h-4 w-4 mr-1" />
                          {boveda.responsable.name}
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => {
                            setBovedaSeleccionada(boveda)
                            loadBovedaDetalles(boveda.id)
                            setActiveTab('detalles')
                          }}
                        >
                          Ver detalles
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(boveda)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEliminarBoveda(boveda.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Detalles de Bóveda */}
        <TabsContent value="detalles" className="space-y-4">
          {bovedaSeleccionada ? (
            <div className="space-y-6">
              {/* Información general */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {bovedaSeleccionada.nombre}
                        <Badge variant={bovedaSeleccionada.activa ? 'default' : 'secondary'}>
                          {bovedaSeleccionada.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 dark:text-slate-400">
                        <Building className="h-4 w-4" />
                        {bovedaSeleccionada.sucursal?.nombre}
                        {bovedaSeleccionada.codigo && ` • ${bovedaSeleccionada.codigo}`}
                      </CardDescription>
                    </div>
                    <Button onClick={openMovimientoDialog}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Registrar Movimiento
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg dark:border dark:border-green-800/40">
                      <Label className="text-sm text-muted-foreground dark:text-slate-400">Saldo Actual</Label>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {bovedaService.formatMonto(bovedaSeleccionada.saldo_actual)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg dark:border dark:border-slate-700">
                      <Label className="text-sm text-muted-foreground dark:text-slate-400">Tipo</Label>
                      <div className="text-lg text-foreground dark:text-slate-200">
                        {bovedaService.getTipoBovedaLabel(bovedaSeleccionada.tipo)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estadísticas */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <div className="ml-4">
                          <p className="text-sm text-muted-foreground dark:text-slate-400">Total Entradas</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {bovedaService.formatMonto(stats.total_entradas)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center">
                        <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                        <div className="ml-4">
                          <p className="text-sm text-muted-foreground dark:text-slate-400">Total Salidas</p>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {bovedaService.formatMonto(stats.total_salidas)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <div className="ml-4">
                          <p className="text-sm text-muted-foreground dark:text-slate-400">Balance</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {bovedaService.formatMonto(stats.total_entradas - stats.total_salidas)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Historial de movimientos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground dark:text-slate-100">Historial de Movimientos</CardTitle>
                      <CardDescription className="dark:text-slate-400">Últimos movimientos registrados en esta bóveda</CardDescription>
                    </div>
                    {movimientos.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bovedaService.exportarMovimientos(bovedaSeleccionada.id)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Excel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bovedaService.exportarMovimientosPDF(bovedaSeleccionada.id)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {movimientos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No hay movimientos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {movimientos.map((movimiento) => {
                        const esEntrada = ['entrada', 'transferencia_entrada', 'ingreso_cierre_diario'].includes(movimiento.tipo_movimiento)
                        return (
                          <div key={movimiento.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${esEntrada ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                {esEntrada ? (
                                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{movimiento.concepto}</p>
                                <p className="text-sm text-muted-foreground">
                                  {movimiento.usuario?.name} • {new Date(movimiento.created_at).toLocaleString('es-GT')}
                                </p>
                                {movimiento.referencia && (
                                  <p className="text-xs text-muted-foreground">Ref: {movimiento.referencia}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className={`font-bold text-lg ${esEntrada ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                  {esEntrada ? '+' : '-'}
                                  {bovedaService.formatMonto(movimiento.monto)}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {movimiento.tipo_movimiento_label || bovedaService.getTipoMovimientoLabel(movimiento.tipo_movimiento)}
                                </Badge>
                              </div>
                              {(sessionUser?.rol === 'superadmin' || sessionUser?.rol === 'administrador') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-slate-700"
                                  onClick={() => handleAbrirEditarMovimiento(movimiento)}
                                  title="Editar Concepto / Referencia"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground dark:text-slate-400">Selecciona una bóveda para ver sus detalles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reportes */}
        <TabsContent value="reportes">
          <ReportesBovedaTab bovedas={bovedas} />
        </TabsContent>

        {/* Configuración */}
        <TabsContent value="configuracion">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground dark:text-slate-100">Configuración de Etiquetas de Bóveda</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Personaliza los nombres que se muestran en el sistema para cada tipo de movimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label-entrada">Entrada</Label>
                  <Input
                    id="label-entrada"
                    value={configLabels.boveda_label_entrada}
                    onChange={(e) => setConfigLabels({ ...configLabels, boveda_label_entrada: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label-salida">Salida</Label>
                  <Input
                    id="label-salida"
                    value={configLabels.boveda_label_salida}
                    onChange={(e) => setConfigLabels({ ...configLabels, boveda_label_salida: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label-transferencia-entrada">Transferencia Entrada</Label>
                  <Input
                    id="label-transferencia-entrada"
                    value={configLabels.boveda_label_transferencia_entrada}
                    onChange={(e) => setConfigLabels({ ...configLabels, boveda_label_transferencia_entrada: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label-transferencia-salida">Transferencia Salida</Label>
                  <Input
                    id="label-transferencia-salida"
                    value={configLabels.boveda_label_transferencia_salida}
                    onChange={(e) => setConfigLabels({ ...configLabels, boveda_label_transferencia_salida: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="label-cierre">Ingreso por Cierre Diario</Label>
                  <Input
                    id="label-cierre"
                    value={configLabels.boveda_label_ingreso_cierre_diario}
                    onChange={(e) => setConfigLabels({ ...configLabels, boveda_label_ingreso_cierre_diario: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={handleGuardarConfiguraciones}
                disabled={loadingForm}
              >
                {loadingForm ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =============== DIALOGS =============== */}

      {/* Dialog Crear Bóveda */}
      <Dialog open={dialogCrearBoveda} onOpenChange={setDialogCrearBoveda}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Bóveda</DialogTitle>
            <DialogDescription>
              Registra una nueva bóveda de seguridad. Si indicas un saldo inicial, debes desglosar las denominaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Bóveda Principal"
                />
              </div>
              <div>
                <Label>Sucursal *</Label>
                <Select
                  value={formData.sucursal_id}
                  onValueChange={(value) => setFormData({ ...formData, sucursal_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map(sucursal => (
                      <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                        {sucursal.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción detallada de la bóveda"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Saldo inicial */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base font-semibold">Saldo Inicial</Label>
                  <p className="text-sm text-muted-foreground">
                    {usarDesglose ? 'Ingresa las denominaciones' : 'Ingresa el monto total directamente'}. Puedes dejar en 0 para crear sin saldo.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Monto directo</Label>
                  <Button
                    type="button"
                    variant={usarDesglose ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => {
                      setUsarDesglose(!usarDesglose)
                      if (usarDesglose) {
                        setDesglose({})
                      } else {
                        setMontoDirecto('')
                      }
                    }}
                  >
                    {usarDesglose ? 'Q' : '✓ Directo'}
                  </Button>
                </div>
              </div>

              {usarDesglose ? (
                renderDesgloseGrid()
              ) : (
                <div className="space-y-2">
                  <Label>Monto Total</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={montoDirecto}
                    onChange={(e) => setMontoDirecto(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  {parseFloat(montoDirecto) > 0 && (
                    <div className="flex justify-end p-3 bg-gray-100 rounded-lg">
                      <span className="text-lg font-semibold">Total: </span>
                      <span className="text-2xl font-bold ml-3 text-blue-600">
                        {bovedaService.formatMonto(parseFloat(montoDirecto) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogCrearBoveda(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearBoveda} disabled={loadingForm}>
              {loadingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Bóveda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Bóveda */}
      <Dialog open={dialogEditarBoveda} onOpenChange={setDialogEditarBoveda}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Bóveda</DialogTitle>
            <DialogDescription>
              Modifica los datos de la bóveda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Bóveda Principal"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción detallada de la bóveda"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogEditarBoveda(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarBoveda} disabled={loadingForm}>
              {loadingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Movimiento */}
      <Dialog open={dialogMovimiento} onOpenChange={setDialogMovimiento}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              Registra un movimiento en {bovedaSeleccionada?.nombre}. El monto se calcula automáticamente del desglose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Movimiento *</Label>
                <Select
                  value={movimientoData.tipo_movimiento}
                  onValueChange={(value) => setMovimientoData({ ...movimientoData, tipo_movimiento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center">
                        <ArrowDownCircle className="h-4 w-4 mr-2 text-green-600" />
                        {configLabels.boveda_label_entrada || 'Entrada'}
                      </div>
                    </SelectItem>
                    <SelectItem value="salida">
                      <div className="flex items-center">
                        <ArrowUpCircle className="h-4 w-4 mr-2 text-red-600" />
                        {configLabels.boveda_label_salida || 'Salida'}
                      </div>
                    </SelectItem>
                    <SelectItem value="transferencia_salida">
                      <div className="flex items-center">
                        <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-600" />
                        {configLabels.boveda_label_transferencia_salida || 'Transferencia'}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {movimientoData.tipo_movimiento === 'transferencia_salida' && (
                <div>
                  <Label>Bóveda Destino *</Label>
                  <Select
                    value={movimientoData.boveda_destino_id}
                    onValueChange={(value) => setMovimientoData({ ...movimientoData, boveda_destino_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona bóveda destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {bovedas.filter(b => b.id !== bovedaSeleccionada?.id && b.activa).map(boveda => (
                        <SelectItem key={boveda.id} value={boveda.id.toString()}>
                          {boveda.nombre} - {boveda.sucursal?.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Concepto</Label>
              <Textarea
                value={movimientoData.concepto}
                onChange={(e) => setMovimientoData({ ...movimientoData, concepto: e.target.value })}
                placeholder="Se genera automáticamente, pero puedes editarlo"
                className="resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                El concepto se genera automáticamente según el tipo de movimiento y monto. Puedes editarlo si lo necesitas.
              </p>
            </div>

            <div>
              <Label>Referencia</Label>
              <Input
                value={movimientoData.referencia}
                onChange={(e) => setMovimientoData({ ...movimientoData, referencia: e.target.value })}
                placeholder="Número de comprobante o referencia"
              />
            </div>

            {/* Desglose o monto directo */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base font-semibold">Monto del Movimiento *</Label>
                  <p className="text-sm text-muted-foreground">
                    {usarDesglose ? 'Ingresa las denominaciones' : 'Ingresa el monto total directamente'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Monto directo</Label>
                  <Button
                    type="button"
                    variant={usarDesglose ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => {
                      setUsarDesglose(!usarDesglose)
                      if (usarDesglose) {
                        setDesglose({})
                      } else {
                        setMontoDirecto('')
                      }
                    }}
                  >
                    {usarDesglose ? 'Q' : '✓ Directo'}
                  </Button>
                </div>
              </div>

              {usarDesglose ? (
                renderDesgloseGrid()
              ) : (
                <div className="space-y-2">
                  <Label>Monto Total</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={montoDirecto}
                    onChange={(e) => setMontoDirecto(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  {parseFloat(montoDirecto) > 0 && (
                    <div className="flex justify-end p-3 bg-gray-100 rounded-lg">
                      <span className="text-lg font-semibold">Total: </span>
                      <span className="text-2xl font-bold ml-3 text-blue-600">
                        {bovedaService.formatMonto(parseFloat(montoDirecto) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Validaciones visuales */}
            {['salida', 'transferencia_salida'].includes(movimientoData.tipo_movimiento) &&
              bovedaSeleccionada &&
              (usarDesglose ? totalDesglose : (parseFloat(montoDirecto) || 0)) > bovedaSeleccionada.saldo_actual && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  ⚠️ El monto ({bovedaService.formatMonto(usarDesglose ? totalDesglose : (parseFloat(montoDirecto) || 0))}) excede el saldo disponible ({bovedaService.formatMonto(bovedaSeleccionada.saldo_actual)})
                </div>
              )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogMovimiento(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarMovimiento}
              disabled={loadingForm || (usarDesglose ? totalDesglose <= 0 : (parseFloat(montoDirecto) || 0) <= 0)}
            >
              {loadingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Movimiento */}
      <Dialog open={dialogEditarMovimiento} onOpenChange={setDialogEditarMovimiento}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Movimiento</DialogTitle>
            <DialogDescription>
              Modifica los detalles del concepto y referencia para fines de auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-concepto">Concepto *</Label>
              <Textarea
                id="edit-concepto"
                value={editMovimientoData.concepto}
                onChange={(e) => setEditMovimientoData({ ...editMovimientoData, concepto: e.target.value })}
                placeholder="Escribe el concepto del movimiento"
                className="resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-referencia">Referencia</Label>
              <Input
                id="edit-referencia"
                value={editMovimientoData.referencia}
                onChange={(e) => setEditMovimientoData({ ...editMovimientoData, referencia: e.target.value })}
                placeholder="Número de comprobante o referencia (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogEditarMovimiento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarEditarMovimiento} disabled={loadingForm || !editMovimientoData.concepto.trim()}>
              {loadingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============== COMPONENTE DE REPORTES ===============
interface ReportesBovedaTabProps {
  bovedas: Boveda[]
}

function ReportesBovedaTab({ bovedas }: ReportesBovedaTabProps) {
  const [bovedaSeleccionada, setBovedaSeleccionada] = useState<string>('')
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [fechaFin, setFechaFin] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [movimientos, setMovimientos] = useState<BovedaMovimiento[]>([])
  const [loading, setLoading] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)

  // Estadísticas calculadas
  const estadisticas = useMemo(() => {
    const entradas = movimientos.filter(m => ['entrada', 'transferencia_entrada', 'ingreso_cierre_diario'].includes(m.tipo_movimiento))
    const salidas = movimientos.filter(m => ['salida', 'transferencia_salida'].includes(m.tipo_movimiento))

    const totalEntradas = entradas.reduce((sum, m) => sum + Number(m.monto), 0)
    const totalSalidas = salidas.reduce((sum, m) => sum + Number(m.monto), 0)

    return {
      totalMovimientos: movimientos.length,
      totalEntradas,
      totalSalidas,
      balance: totalEntradas - totalSalidas,
      numeroEntradas: entradas.length,
      numeroSalidas: salidas.length,
    }
  }, [movimientos])

  const handleGenerarReporte = async () => {
    if (!bovedaSeleccionada) {
      toast.error('Selecciona una bóveda')
      return
    }

    if (!fechaInicio || !fechaFin) {
      toast.error('Selecciona el rango de fechas')
      return
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha fin')
      return
    }

    try {
      setLoading(true)
      const response = await bovedaService.getHistorialMovimientos(
        parseInt(bovedaSeleccionada),
        {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado: 'aprobado' // Solo movimientos aprobados
        }
      )

      setMovimientos(response.data || response.movimientos || [])
      setMostrarResultados(true)
      toast.success('Reporte generado correctamente')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  const handleExportarExcel = () => {
    if (!bovedaSeleccionada) {
      toast.error('Selecciona una bóveda primero')
      return
    }

    bovedaService.exportarMovimientos(parseInt(bovedaSeleccionada), {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: 'aprobado'
    })
    toast.success('Descargando archivo Excel...')
  }

  const handleExportarPDF = () => {
    if (!bovedaSeleccionada) {
      toast.error('Selecciona una bóveda primero')
      return
    }

    bovedaService.exportarMovimientosPDF(parseInt(bovedaSeleccionada), {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: 'aprobado'
    })
    toast.success('Descargando archivo PDF...')
  }

  const handleCancelar = () => {
    setMostrarResultados(false)
    setMovimientos([])
  }

  const boveda = bovedas.find(b => b.id === parseInt(bovedaSeleccionada))

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta - Movimientos de Bóveda</CardTitle>
          <CardDescription>
            Genera reportes detallados de movimientos de bóveda por rango de fechas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selector de Bóveda */}
            <div className="space-y-2">
              <Label htmlFor="boveda-select">Bóveda</Label>
              <Select value={bovedaSeleccionada} onValueChange={setBovedaSeleccionada}>
                <SelectTrigger id="boveda-select">
                  <SelectValue placeholder="Selecciona una bóveda" />
                </SelectTrigger>
                <SelectContent>
                  {bovedas.filter(b => b.activa).map(boveda => (
                    <SelectItem key={boveda.id} value={boveda.id.toString()}>
                      {boveda.codigo} - {boveda.nombre} ({boveda.sucursal?.nombre})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rango de Fechas */}
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="fecha-inicio" className="text-xs text-muted-foreground">
                    Inicio:
                  </Label>
                  <Input
                    id="fecha-inicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-fin" className="text-xs text-muted-foreground">
                    Fin:
                  </Label>
                  <Input
                    id="fecha-fin"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleGenerarReporte}
              disabled={loading || !bovedaSeleccionada}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Ver en pantalla
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportarExcel}
              disabled={!mostrarResultados || movimientos.length === 0}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              📊 Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleExportarPDF}
              disabled={!mostrarResultados || movimientos.length === 0}
              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
            >
              📄 PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelar}
              disabled={!mostrarResultados}
            >
              ❌ Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {mostrarResultados && (
        <>
          {/* Estadísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Movimientos</p>
                  <p className="text-3xl font-bold text-blue-600">{estadisticas.totalMovimientos}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Entradas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {bovedaService.formatMonto(estadisticas.totalEntradas)}
                  </p>
                  <p className="text-xs text-muted-foreground">({estadisticas.numeroEntradas} movimientos)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Salidas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {bovedaService.formatMonto(estadisticas.totalSalidas)}
                  </p>
                  <p className="text-xs text-muted-foreground">({estadisticas.numeroSalidas} movimientos)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {bovedaService.formatMonto(estadisticas.balance)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Movimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Movimientos</CardTitle>
              <CardDescription>
                {boveda?.nombre} ({boveda?.codigo}) • {new Date(fechaInicio).toLocaleDateString('es-GT')} - {new Date(fechaFin).toLocaleDateString('es-GT')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movimientos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No se encontraron movimientos en el rango de fechas seleccionado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">Fecha</th>
                        <th className="text-left p-3 font-semibold">Tipo</th>
                        <th className="text-left p-3 font-semibold">Concepto</th>
                        <th className="text-left p-3 font-semibold">Usuario</th>
                        <th className="text-right p-3 font-semibold">Entradas</th>
                        <th className="text-right p-3 font-semibold">Salidas</th>
                        <th className="text-left p-3 font-semibold">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((movimiento, index) => {
                        const esEntrada = ['entrada', 'transferencia_entrada', 'ingreso_cierre_diario'].includes(movimiento.tipo_movimiento)
                        return (
                          <tr key={movimiento.id} className={`border-b hover:bg-muted/30 dark:hover:bg-muted/10 ${index % 2 === 0 ? 'bg-background text-foreground' : 'bg-muted/10 text-foreground'} dark:border-slate-800`}>
                            <td className="p-3 text-sm">
                              {new Date(movimiento.created_at).toLocaleDateString('es-GT')}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {new Date(movimiento.created_at).toLocaleTimeString('es-GT')}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs dark:border-slate-700">
                                {movimiento.tipo_movimiento_label || bovedaService.getTipoMovimientoLabel(movimiento.tipo_movimiento)}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm max-w-xs">
                              {movimiento.concepto}
                              {movimiento.bovedaDestino && (
                                <span className="block text-xs text-muted-foreground">
                                  → Bóveda destino: {movimiento.bovedaDestino.codigo}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {movimiento.usuario?.name || 'N/A'}
                            </td>
                            <td className="p-3 text-right font-semibold text-green-600">
                              {esEntrada ? bovedaService.formatMonto(movimiento.monto) : '-'}
                            </td>
                            <td className="p-3 text-right font-semibold text-red-600">
                              {!esEntrada ? bovedaService.formatMonto(movimiento.monto) : '-'}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {movimiento.referencia || '-'}
                            </td>
                          </tr>
                        )
                      })}
                      {/* Fila de totales */}
                      <tr className="border-t-2 border-gray-300 dark:border-slate-700 bg-muted/50 font-bold text-foreground">
                        <td colSpan={4} className="p-3 text-right">
                          TOTALES:
                        </td>
                        <td className="p-3 text-right text-green-600 dark:text-green-400">
                          {bovedaService.formatMonto(estadisticas.totalEntradas)}
                        </td>
                        <td className="p-3 text-right text-red-600 dark:text-red-400">
                          {bovedaService.formatMonto(estadisticas.totalSalidas)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                      <tr className="bg-blue-50/20 dark:bg-blue-950/20 font-bold text-foreground">
                        <td colSpan={4} className="p-3 text-right">
                          BALANCE:
                        </td>
                        <td colSpan={2} className={`p-3 text-right text-xl ${estadisticas.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {bovedaService.formatMonto(estadisticas.balance)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
