import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CurrencyDollar,
  Percent,
  Receipt,
} from '@phosphor-icons/react'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import gastosService from '@/services/gastos.service'
import type { Gasto, GastoCalculado } from '@/types/gastos.types'

interface GastosCreditoSelectorProps {
  montoOtorgado: number
  gastosSeleccionados: number[]
  onGastosChange: (gastoIds: number[]) => void
  onTotalGastosChange?: (total: number) => void
  readonly?: boolean
  className?: string
}

/**
 * Componente para seleccionar gastos adicionales para un crédito prendario.
 * 
 * Los gastos:
 * - NO se suman al principal
 * - NO generan interés  
 * - SÍ se agregan al plan de pagos (prorrateados en las cuotas)
 */
export function GastosCreditoSelector({
  montoOtorgado,
  gastosSeleccionados,
  onGastosChange,
  onTotalGastosChange,
  readonly = false,
  className = '',
}: GastosCreditoSelectorProps) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [gastosCalculados, setGastosCalculados] = useState<GastoCalculado[]>([])
  const [loading, setLoading] = useState(true)
  const [totalGastos, setTotalGastos] = useState(0)

  // Cargar gastos disponibles
  useEffect(() => {
    const cargarGastos = async () => {
      try {
        setLoading(true)
        const gastosActivos = await gastosService.listarTodos()
        setGastos(gastosActivos)
      } catch (error) {
        console.error('Error cargando gastos:', error)
      } finally {
        setLoading(false)
      }
    }
    cargarGastos()
  }, [])

  // Calcular valores cuando cambia el monto o la selección
  useEffect(() => {
    if (gastos.length === 0 || montoOtorgado <= 0) {
      setGastosCalculados([])
      setTotalGastos(0)
      onTotalGastosChange?.(0)
      return
    }

    // Calcular preview con gastos seleccionados
    const calcularPreview = async () => {
      if (gastosSeleccionados.length === 0) {
        setGastosCalculados([])
        setTotalGastos(0)
        onTotalGastosChange?.(0)
        return
      }

      try {
        const response = await gastosService.previewGastos(gastosSeleccionados, montoOtorgado)
        if (response.success && response.data) {
          setGastosCalculados(response.data.gastos || [])
          setTotalGastos(response.data.total_gastos || 0)
          onTotalGastosChange?.(response.data.total_gastos || 0)
        }
      } catch (error) {
        console.error('Error calculando preview:', error)
        // Calcular localmente si falla el API
        let total = 0
        const calculados: GastoCalculado[] = gastosSeleccionados
          .map(id => {
            const gasto = gastos.find(g => g.id_gasto === id)
            if (!gasto) return null
            
            const valor = gasto.tipo === 'FIJO' 
              ? (gasto.monto || 0)
              : montoOtorgado * ((gasto.porcentaje || 0) / 100)
            
            total += valor
            
            return {
              id_gasto: gasto.id_gasto,
              nombre: gasto.nombre,
              tipo: gasto.tipo,
              porcentaje: gasto.porcentaje,
              monto: gasto.monto,
              valor_calculado: Math.round(valor * 100) / 100,
            }
          })
          .filter(Boolean) as GastoCalculado[]
        
        setGastosCalculados(calculados)
        setTotalGastos(Math.round(total * 100) / 100)
        onTotalGastosChange?.(Math.round(total * 100) / 100)
      }
    }

    calcularPreview()
  }, [gastos, gastosSeleccionados, montoOtorgado])

  const handleToggleGasto = (gastoId: number) => {
    if (readonly) return
    
    const nuevaSeleccion = gastosSeleccionados.includes(gastoId)
      ? gastosSeleccionados.filter(id => id !== gastoId)
      : [...gastosSeleccionados, gastoId]
    
    onGastosChange(nuevaSeleccion)
  }

  const calcularValorLocal = (gasto: Gasto): number => {
    if (gasto.tipo === 'FIJO') {
      return gasto.monto || 0
    }
    return montoOtorgado * ((gasto.porcentaje || 0) / 100)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-foreground dark:text-slate-100">
            <Receipt className="h-5 w-5" />
            Gastos Adicionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (gastos.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-foreground dark:text-slate-100">
            <Receipt className="h-5 w-5" />
            Gastos Adicionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-4">
            No hay gastos configurados en el catálogo.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-foreground dark:text-slate-100">
            <Receipt className="h-5 w-5" />
            Gastos Adicionales
          </CardTitle>
          {gastosSeleccionados.length > 0 && (
            <Badge variant="secondary">
              {gastosSeleccionados.length} seleccionado(s)
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
          Los gastos se prorratean en las cuotas y no generan interés.
        </p>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {!readonly && <TableHead className="w-[50px]"></TableHead>}
                <TableHead className="dark:text-slate-200">Gasto</TableHead>
                <TableHead className="w-[100px] dark:text-slate-200">Tipo</TableHead>
                <TableHead className="w-[120px] text-right dark:text-slate-200">Base</TableHead>
                <TableHead className="w-[120px] text-right dark:text-slate-200">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((gasto) => {
                const seleccionado = gastosSeleccionados.includes(gasto.id_gasto)
                const gastoCalc = gastosCalculados.find(g => g.id_gasto === gasto.id_gasto)
                const valorCalculado = gastoCalc?.valor_calculado ?? calcularValorLocal(gasto)

                return (
                  <TableRow 
                    key={gasto.id_gasto}
                    className={`${seleccionado ? 'bg-primary/5' : ''} ${!readonly ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => !readonly && handleToggleGasto(gasto.id_gasto)}
                  >
                    {!readonly && (
                      <TableCell>
                        <Checkbox
                          checked={seleccionado}
                          onCheckedChange={() => handleToggleGasto(gasto.id_gasto)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {gasto.nombre}
                      {gasto.descripcion && (
                        <p className="text-xs text-muted-foreground dark:text-slate-400 truncate max-w-[200px]">
                          {gasto.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={gasto.tipo === 'FIJO' ? 'default' : 'secondary'} className="text-xs">
                        {gasto.tipo === 'FIJO' ? (
                          <><CurrencyDollar className="h-3 w-3 mr-1" /> Fijo</>
                        ) : (
                          <><Percent className="h-3 w-3 mr-1" /> Var.</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {gasto.tipo === 'FIJO' ? (
                        <MoneyDisplay amount={gasto.monto || 0} />
                      ) : (
                        <span>{Number(gasto.porcentaje || 0).toFixed(2)}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <MoneyDisplay 
                        amount={seleccionado ? valorCalculado : 0} 
                        className={seleccionado ? 'text-primary' : 'text-muted-foreground'}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Resumen Total */}
        {gastosSeleccionados.length > 0 && (
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg dark:bg-primary/10 dark:border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium dark:text-slate-200">Total Gastos</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  Se dividirán entre las cuotas del crédito
                </p>
              </div>
              <MoneyDisplay 
                amount={totalGastos} 
                className="text-xl font-bold text-primary" 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
