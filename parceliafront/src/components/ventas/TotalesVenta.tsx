import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DollarSign, TrendingDown, TrendingUp, Percent } from 'lucide-react'
import { type Venta } from '@/services/venta.service'

interface TotalesVentaProps {
  venta: Venta
}

const TotalesVenta: React.FC<TotalesVentaProps> = ({ venta }) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Resumen de la Venta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-mono">{formatMoney(venta.subtotal)}</span>
        </div>

        {venta.total_descuentos > 0 && (
          <div className="flex justify-between items-center text-destructive">
            <span className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Descuentos:
            </span>
            <span className="font-mono">-{formatMoney(venta.total_descuentos)}</span>
          </div>
        )}

        {venta.total_impuestos > 0 && (
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Impuestos:
            </span>
            <span className="font-mono">{formatMoney(venta.total_impuestos)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center text-lg font-bold">
          <span>TOTAL:</span>
          <span className="font-mono text-primary">
            {formatMoney(venta.total_final)}
          </span>
        </div>

        {venta.total_pagado > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center text-green-600">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Pagado:
              </span>
              <span className="font-mono">{formatMoney(venta.total_pagado)}</span>
            </div>

            {venta.total_final > venta.total_pagado && (
              <div className="flex justify-between items-center text-amber-600">
                <span>Saldo Pendiente:</span>
                <span className="font-mono">
                  {formatMoney(venta.total_final - venta.total_pagado)}
                </span>
              </div>
            )}

            {venta.cambio_devuelto > 0 && (
              <div className="flex justify-between items-center text-blue-600">
                <span>Cambio:</span>
                <span className="font-mono">{formatMoney(venta.cambio_devuelto)}</span>
              </div>
            )}
          </>
        )}

        {venta.numero_documento && (
          <>
            <Separator />
            <div className="text-center text-sm text-muted-foreground">
              Documento: <span className="font-mono">{venta.numero_documento}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TotalesVenta
