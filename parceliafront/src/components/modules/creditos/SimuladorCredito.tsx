import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { Calculator, X, Percent, Calendar, CreditCard } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SimuladorCreditoProps {
  abierto: boolean
  onCerrar: () => void
}

interface Cuota {
  numero: number
  fechaVencimiento: Date
  capital: number
  interes: number
  total: number
  saldoCapital: number
}

export function SimuladorCredito({ abierto, onCerrar }: SimuladorCreditoProps) {
  const [monto, setMonto] = useState<string>('1000')
  const [tasaInteres, setTasaInteres] = useState<string>('5')
  const [tipoInteres, setTipoInteres] = useState<'semanal' | 'catorcenal' | 'quincenal' | 'cada_28_dias' | 'mensual'>('mensual')
  const [numeroCuotas, setNumeroCuotas] = useState<string>('1')
  const [plazo, setPlazo] = useState<string>('30')
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [totales, setTotales] = useState({
    capital: 0,
    interes: 0,
    total: 0
  })

  const calcularPlanPagos = () => {
    const montoNum = parseFloat(monto) || 0
    const tasaNum = parseFloat(tasaInteres) || 0
    const cuotasNum = parseInt(numeroCuotas) || 1
    const plazoNum = parseInt(plazo) || 30

    if (montoNum <= 0 || cuotasNum <= 0) {
      return
    }

    // La tasa ingresada YA es la tasa por período (ej: 15% mensual = 15% por mes)
    const tasaPorPeriodo = tasaNum / 100

    // Calcular días entre cuotas
    const diasEntreCuotas = Math.ceil(plazoNum / cuotasNum)

    // ========================================
    // CRÉDITO FLAT PRENDARIO
    // ========================================
    // Interés total = monto × tasa (fijo, independiente del número de cuotas)
    // Interés por cuota = interés total / número de cuotas
    // Capital por cuota = monto / número de cuotas
    //
    // Ejemplo Q1,000 al 15%:
    //   1 cuota:  interés total = Q150, por cuota = Q150
    //   2 cuotas: interés total = Q150, por cuota = Q75
    //   3 cuotas: interés total = Q150, por cuota = Q50

    const interesTotal = montoNum * tasaPorPeriodo
    const interesPorCuota = interesTotal / cuotasNum
    const capitalPorCuota = montoNum / cuotasNum
    let saldoCapital = montoNum

    const nuevasCuotas: Cuota[] = []
    let totalCapital = 0
    let totalInteres = 0

    const fechaInicio = new Date()

    for (let i = 1; i <= cuotasNum; i++) {
      // Fecha de vencimiento
      const fechaVencimiento = new Date(fechaInicio)
      fechaVencimiento.setDate(fechaVencimiento.getDate() + (diasEntreCuotas * i))

      // Última cuota: ajustar capital e interés por redondeo
      const capitalCuota = i === cuotasNum ? saldoCapital : capitalPorCuota
      const interesCuota = i === cuotasNum ? (interesTotal - totalInteres) : interesPorCuota

      nuevasCuotas.push({
        numero: i,
        fechaVencimiento,
        capital: capitalCuota,
        interes: interesCuota,
        total: capitalCuota + interesCuota,
        saldoCapital: Math.max(0, saldoCapital - capitalCuota)
      })

      totalCapital += capitalCuota
      totalInteres += interesCuota
      saldoCapital -= capitalCuota
    }

    setCuotas(nuevasCuotas)
    setTotales({
      capital: totalCapital,
      interes: totalInteres,
      total: totalCapital + totalInteres
    })
  }

  const limpiar = () => {
    setMonto('1000')
    setTasaInteres('5')
    setTipoInteres('mensual')
    setNumeroCuotas('1')
    setPlazo('30')
    setCuotas([])
    setTotales({ capital: 0, interes: 0, total: 0 })
  }

  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Simulador de Créditos
          </DialogTitle>
          <DialogDescription>
            Calcule rápidamente el monto de préstamo e intereses. Los resultados son temporales y no se guardan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de entrada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del Crédito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monto">Monto a Prestar (Q)</Label>
                <Input
                  id="monto"
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="1000"
                  min="0"
                  step="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tasa">Tasa de Interés por Período (%)</Label>
                <Input
                  id="tasa"
                  type="number"
                  value={tasaInteres}
                  onChange={(e) => setTasaInteres(e.target.value)}
                  placeholder="5"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Interés</Label>
                <Select value={tipoInteres} onValueChange={(value: any) => setTipoInteres(value)}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="catorcenal">Catorcenal (14 días)</SelectItem>
                    <SelectItem value="quincenal">Quincenal (15 días)</SelectItem>
                    <SelectItem value="cada_28_dias">Cada 28 días</SelectItem>
                    <SelectItem value="mensual">Mensual (30 días)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plazo">Plazo Total (días)</Label>
                <Input
                  id="plazo"
                  type="number"
                  value={plazo}
                  onChange={(e) => setPlazo(e.target.value)}
                  placeholder="30"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuotas">Número de Cuotas</Label>
                <Input
                  id="cuotas"
                  type="number"
                  value={numeroCuotas}
                  onChange={(e) => setNumeroCuotas(e.target.value)}
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={calcularPlanPagos} className="flex-1">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular
                </Button>
                <Button onClick={limpiar} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen del Préstamo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monto Prestado</p>
                  <MoneyDisplay amount={parseFloat(monto) || 0} className="text-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total a Pagar</p>
                  <MoneyDisplay amount={totales.total} className="text-xl font-bold text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Percent className="h-4 w-4" />
                    Total Intereses
                  </p>
                  <MoneyDisplay amount={totales.interes} className="text-lg font-semibold text-orange-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Plazo
                  </p>
                  <p className="text-lg font-semibold">{plazo} días</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Cuotas
                  </p>
                  <p className="text-lg font-semibold">{numeroCuotas} cuota{parseInt(numeroCuotas) > 1 ? 's' : ''}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cuota Promedio</p>
                  <MoneyDisplay
                    amount={parseInt(numeroCuotas) > 0 ? totales.total / parseInt(numeroCuotas) : 0}
                    className="text-lg font-semibold text-blue-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de cuotas */}
        {cuotas.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Plan de Pagos Proyectado</CardTitle>
              <CardDescription>
                Este es un cálculo estimado. Los valores reales pueden variar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Cuota</TableHead>
                      <TableHead>Fecha Vencimiento</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Saldo Capital</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota) => (
                      <TableRow key={cuota.numero}>
                        <TableCell className="font-medium">#{cuota.numero}</TableCell>
                        <TableCell>{formatearFecha(cuota.fechaVencimiento)}</TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={cuota.capital} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={cuota.interes} className="text-orange-600" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={cuota.total} className="font-semibold" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={cuota.saldoCapital} className="text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>TOTALES</TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={totales.capital} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={totales.interes} className="text-orange-600" />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={totales.total} className="font-bold text-primary" />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={0} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
