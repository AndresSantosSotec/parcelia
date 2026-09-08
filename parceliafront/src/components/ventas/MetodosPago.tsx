import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CreditCard, DollarSign, Wallet, Plus, Trash2 } from 'lucide-react'

interface MetodosPagoProps {
  totalVenta: number
  onProcesarPago: (pagos: any[]) => Promise<void>
  loading?: boolean
}

interface Pago {
  id: string
  metodo: string
  monto: number
  referencia?: string
  banco?: string
  autorizacion?: string
}

const MetodosPago: React.FC<MetodosPagoProps> = ({ totalVenta, onProcesarPago, loading }) => {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [nuevoMetodo, setNuevoMetodo] = useState('efectivo')
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [banco, setBanco] = useState('')

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0)
  const cambio = totalPagado > totalVenta ? totalPagado - totalVenta : 0
  const faltante = totalVenta - totalPagado

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    }).format(amount)
  }

  const handleAgregarPago = () => {
    if (!nuevoMonto || parseFloat(nuevoMonto) <= 0) {
      alert('Debe ingresar un monto válido')
      return
    }

    const pago: Pago = {
      id: Date.now().toString(),
      metodo: nuevoMetodo,
      monto: parseFloat(nuevoMonto),
      referencia: referencia || undefined,
      banco: banco || undefined,
    }

    setPagos([...pagos, pago])
    
    // Limpiar formulario
    setNuevoMonto('')
    setReferencia('')
    setBanco('')
  }

  const handleEliminarPago = (id: string) => {
    setPagos(pagos.filter(p => p.id !== id))
  }

  const handleProcesar = async () => {
    if (faltante > 0) {
      const confirmar = window.confirm(
        `Falta pagar ${formatMoney(faltante)}. ¿Desea procesar de todos modos?`
      )
      if (!confirmar) return
    }

    await onProcesarPago(pagos)
  }

  // Autocompletar monto si es el primer pago
  useEffect(() => {
    if (pagos.length === 0 && !nuevoMonto) {
      setNuevoMonto(totalVenta.toFixed(2))
    }
  }, [totalVenta])

  const getMetodoIcon = (metodo: string) => {
    switch (metodo) {
      case 'efectivo':
        return <DollarSign className="h-4 w-4" />
      case 'tarjeta_debito':
      case 'tarjeta_credito':
        return <CreditCard className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  const getMetodoNombre = (metodo: string) => {
    const nombres: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta_debito: 'Tarjeta de Débito',
      tarjeta_credito: 'Tarjeta de Crédito',
      transferencia: 'Transferencia',
      cheque: 'Cheque',
      deposito: 'Depósito',
      qr: 'Código QR',
      otro: 'Otro',
    }
    return nombres[metodo] || metodo
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Métodos de Pago
        </CardTitle>
        <CardDescription>
          Puede utilizar múltiples métodos de pago para una misma venta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agregar nuevo pago */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metodo">Método de Pago</Label>
              <Select value={nuevoMetodo} onValueChange={setNuevoMetodo}>
                <SelectTrigger id="metodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta_debito">Tarjeta de Débito</SelectItem>
                  <SelectItem value="tarjeta_credito">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="qr">Código QR</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
              />
            </div>
          </div>

          {nuevoMetodo !== 'efectivo' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia</Label>
                <Input
                  id="referencia"
                  placeholder="No. de transacción, cheque, etc."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Input
                  id="banco"
                  placeholder="Nombre del banco"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button onClick={handleAgregarPago} variant="secondary" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Pago
          </Button>
        </div>

        {/* Lista de pagos agregados */}
        {pagos.length > 0 && (
          <div className="space-y-2">
            <Label>Pagos Registrados:</Label>
            {pagos.map((pago) => (
              <div key={pago.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getMetodoIcon(pago.metodo)}
                  <div>
                    <p className="font-medium">{getMetodoNombre(pago.metodo)}</p>
                    {pago.referencia && (
                      <p className="text-sm text-muted-foreground">
                        Ref: {pago.referencia}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">
                    {formatMoney(pago.monto)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEliminarPago(pago.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Resumen de pagos */}
        <div className="space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Total Venta:</span>
            <span className="font-mono">{formatMoney(totalVenta)}</span>
          </div>

          <div className="flex justify-between">
            <span>Total Pagado:</span>
            <span className="font-mono font-semibold text-green-600">
              {formatMoney(totalPagado)}
            </span>
          </div>

          {faltante > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Faltante:</span>
              <span className="font-mono font-semibold">
                {formatMoney(faltante)}
              </span>
            </div>
          )}

          {cambio > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Cambio:</span>
              <span className="font-mono font-semibold">
                {formatMoney(cambio)}
              </span>
            </div>
          )}
        </div>

        <Button
          onClick={handleProcesar}
          disabled={loading || pagos.length === 0}
          className="w-full"
          size="lg"
        >
          {loading ? 'Procesando...' : 'Finalizar Venta'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default MetodosPago
