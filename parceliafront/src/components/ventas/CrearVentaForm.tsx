import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShoppingCart, User, FileText, DollarSign, Plus, Trash2, Save } from 'lucide-react'
import { ventaService, type CrearVentaDTO, type Venta } from '@/services/venta.service'
import BuscarProducto from './BuscarProducto.tsx'
import ListaProductos from './ListaProductos.tsx'
import MetodosPago from './MetodosPago.tsx'
import TotalesVenta from './TotalesVenta.tsx'

interface CrearVentaFormProps {
  onVentaCreada?: (venta: Venta) => void
  onCancelar?: () => void
}

const CrearVentaForm: React.FC<CrearVentaFormProps> = ({ onVentaCreada, onCancelar }) => {
  // Estado de la venta
  const [venta, setVenta] = useState<Venta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Datos del formulario
  const [tipoDocumento, setTipoDocumento] = useState<'NOTA' | 'FACTURA' | 'RECIBO' | 'COTIZACION'>('NOTA')
  const [consumidorFinal, setConsumidorFinal] = useState(true)
  const [clienteId, setClienteId] = useState<number | undefined>()
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'apartado' | 'plan_pagos'>('contado')
  const [observaciones, setObservaciones] = useState('')

  // Paso del wizard
  const [paso, setPaso] = useState(1) // 1: Crear venta, 2: Agregar productos, 3: Procesar pago

  const handleCrearVenta = async () => {
    setLoading(true)
    setError(null)

    try {
      // Obtener datos del usuario y sucursal del localStorage o contexto
      const usuarioId = parseInt(localStorage.getItem('usuario_id') || '1')
      const sucursalId = parseInt(localStorage.getItem('sucursal_id') || '1')

      const datos: CrearVentaDTO = {
        tipo_documento: tipoDocumento,
        cliente_id: consumidorFinal ? undefined : clienteId,
        consumidor_final: consumidorFinal,
        moneda_id: 1, // GTQ por defecto
        tipo_venta: tipoVenta,
        vendedor_id: usuarioId,
        sucursal_id: sucursalId,
        observaciones: observaciones || undefined,
      }

      const venta = await ventaService.crear(datos)
      
      setVenta(venta)
      setSuccess('Venta creada exitosamente')
      setPaso(2)
    } catch (err: any) {
      setError(err.message || 'Error al crear la venta')
    } finally {
      setLoading(false)
    }
  }

  const handleAgregarProducto = async (producto: any) => {
    if (!venta) return

    setLoading(true)
    setError(null)

    try {
      const response = await ventaService.agregarProducto(venta.id, producto)
      
      setVenta(response.venta)
      setSuccess('Producto agregado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al agregar producto')
    } finally {
      setLoading(false)
    }
  }

  const handleQuitarProducto = async (detalleId: number) => {
    if (!venta) return

    setLoading(true)
    setError(null)

    try {
      const response = await ventaService.quitarProducto(venta.id, detalleId)
      
      setVenta(response.venta)
      setSuccess('Producto eliminado')
    } catch (err: any) {
      setError(err.message || 'Error al eliminar producto')
    } finally {
      setLoading(false)
    }
  }

  const handleProcesarPago = async (pagos: any[]) => {
    if (!venta) return

    setLoading(true)
    setError(null)

    try {
      const response = await ventaService.procesarPago(venta.id, { pagos })
      
      setSuccess(`Venta completada exitosamente. Cambio: Q${response.cambio.toFixed(2)}`)
      
      if (onVentaCreada) {
        onVentaCreada(response.venta)
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Nueva Venta
          </h1>
          <p className="text-muted-foreground">
            {paso === 1 && 'Paso 1: Información general'}
            {paso === 2 && 'Paso 2: Agregar productos'}
            {paso === 3 && 'Paso 3: Procesar pago'}
          </p>
        </div>
        
        {venta && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Documento</p>
            <p className="text-lg font-bold">{venta.numero_documento}</p>
          </div>
        )}
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Paso 1: Información General */}
      {paso === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información General
            </CardTitle>
            <CardDescription>
              Configure los datos básicos de la venta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                <Select value={tipoDocumento} onValueChange={(value: any) => setTipoDocumento(value)}>
                  <SelectTrigger id="tipo_documento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTA">Nota de Venta</SelectItem>
                    <SelectItem value="FACTURA">Factura</SelectItem>
                    <SelectItem value="RECIBO">Recibo</SelectItem>
                    <SelectItem value="COTIZACION">Cotización</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_venta">Tipo de Venta</Label>
                <Select value={tipoVenta} onValueChange={(value: any) => setTipoVenta(value)}>
                  <SelectTrigger id="tipo_venta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Contado</SelectItem>
                    <SelectItem value="apartado">Apartado</SelectItem>
                    <SelectItem value="plan_pagos">Plan de Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consumidor_final"
                checked={consumidorFinal}
                onCheckedChange={(checked) => setConsumidorFinal(checked as boolean)}
              />
              <Label htmlFor="consumidor_final" className="cursor-pointer">
                Consumidor Final (sin cliente registrado)
              </Label>
            </div>

            {!consumidorFinal && (
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                {/* Aquí iría un selector de clientes */}
                <Input
                  id="cliente"
                  placeholder="Buscar cliente..."
                  type="number"
                  value={clienteId || ''}
                  onChange={(e) => setClienteId(parseInt(e.target.value) || undefined)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales sobre la venta..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              {onCancelar && (
                <Button variant="outline" onClick={onCancelar}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleCrearVenta} disabled={loading}>
                {loading ? 'Creando...' : 'Crear Venta'}
                <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Agregar Productos */}
      {paso === 2 && venta && (
        <div className="space-y-6">
          <BuscarProducto onAgregar={handleAgregarProducto} loading={loading} />
          
          <ListaProductos
            detalles={venta.detalles || []}
            onEliminar={handleQuitarProducto}
            loading={loading}
          />

          <TotalesVenta venta={venta} />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPaso(1)}>
              Volver
            </Button>
            <Button
              onClick={() => setPaso(3)}
              disabled={!venta.detalles || venta.detalles.length === 0}
            >
              Procesar Pago
              <DollarSign className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 3: Procesar Pago */}
      {paso === 3 && venta && (
        <div className="space-y-6">
          <TotalesVenta venta={venta} />
          
          <MetodosPago
            totalVenta={venta.total_final}
            onProcesarPago={handleProcesarPago}
            loading={loading}
          />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPaso(2)}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrearVentaForm
