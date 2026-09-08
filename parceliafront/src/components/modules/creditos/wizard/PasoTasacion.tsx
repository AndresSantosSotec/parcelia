import { useState, useEffect, useMemo } from 'react'
import { CrearTasacionDTO, CrearPrendaDTO } from '@/types/creditoPrendario.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scales, Calculator, TrendUp, Warning, Info } from '@phosphor-icons/react'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { toast } from 'sonner'
import { calcularTasacion, type FactoresTasacion, type ResultadoTasacion } from '@/lib/tasacionCalculator'
import { categoriaProductoService } from '@/lib/api'

interface PasoTasacionProps {
  tasacion: Partial<CrearTasacionDTO> | null
  prenda: Partial<CrearPrendaDTO> | null
  onTasacionChange: (tasacion: Partial<CrearTasacionDTO>) => void
  onSiguiente: () => void
  onAnterior: () => void
}

export function PasoTasacion({
  tasacion,
  prenda,
  onTasacionChange,
  onSiguiente,
  onAnterior
}: PasoTasacionProps) {
  const [categoriaNombre, setCategoriaNombre] = useState<string>('')
  const [antiguedad, setAntiguedad] = useState<number>(0)
  const [demandaLocal, setDemandaLocal] = useState<'alta' | 'media' | 'baja'>('media')
  const [riesgoAlmacenamiento, setRiesgoAlmacenamiento] = useState<'bajo' | 'medio' | 'alto'>('medio')
  const [dificultadReventa, setDificultadReventa] = useState<'baja' | 'media' | 'alta'>('media')
  const [ajusteManual, setAjusteManual] = useState<number>(0)

  // Cargar nombre de categoría
  useEffect(() => {
    if (prenda?.categoria_producto_id) {
      categoriaProductoService.getById(prenda.categoria_producto_id)
        .then(res => {
          if (res?.data?.nombre) {
            setCategoriaNombre(res.data.nombre)
          }
        })
        .catch(() => {})
    }
  }, [prenda?.categoria_producto_id])

  // Calcular tasación en tiempo real
  const resultadoTasacion: ResultadoTasacion | null = useMemo(() => {
    if (!tasacion?.valor_mercado || tasacion.valor_mercado <= 0) {
      return null
    }

    const factores: FactoresTasacion = {
      categoriaId: prenda?.categoria_producto_id,
      categoriaNombre,
      condicionFisica: prenda?.condicion_fisica as any,
      antiguedad,
      metodoValuacion: tasacion.metodo_valuacion as any,
      demandaLocal,
      riesgoAlmacenamiento,
      dificultadReventa,
      valorMercado: tasacion.valor_mercado
    }

    return calcularTasacion(tasacion.valor_mercado, factores)
  }, [
    tasacion?.valor_mercado,
    tasacion?.metodo_valuacion,
    prenda?.categoria_producto_id,
    categoriaNombre,
    prenda?.condicion_fisica,
    antiguedad,
    demandaLocal,
    riesgoAlmacenamiento,
    dificultadReventa
  ])

  // Aplicar ajuste manual al monto sugerido
  const montoFinal = resultadoTasacion 
    ? resultadoTasacion.montoSugerido * (1 + ajusteManual / 100)
    : 0

  const porcentajeFinalConAjuste = resultadoTasacion && tasacion?.valor_mercado
    ? (montoFinal / tasacion.valor_mercado) * 100
    : 0

  // Actualizar todos los datos de tasación cuando cambia el cálculo
  useEffect(() => {
    if (resultadoTasacion && tasacion?.valor_mercado) {
      onTasacionChange({
        ...tasacion,
        porcentaje_prestamo: porcentajeFinalConAjuste,
        valor_final_asignado: montoFinal,
        // Guardar factores de tasación
        antiguedad,
        demanda_local: demandaLocal,
        riesgo_almacenamiento: riesgoAlmacenamiento,
        dificultad_reventa: dificultadReventa,
        ajuste_manual: ajusteManual,
        // Guardar valores calculados
        valor_comercial: montoFinal,
        valor_liquidacion: montoFinal * 0.8, // 80% del valor para liquidación
        porcentaje_base: resultadoTasacion.porcentajeBase,
        factores_aplicados: JSON.stringify(resultadoTasacion.factores)
      })
    }
  }, [resultadoTasacion, montoFinal, porcentajeFinalConAjuste, antiguedad, demandaLocal, riesgoAlmacenamiento, dificultadReventa, ajusteManual])

  const handleSubmit = () => {
    if (!tasacion?.valor_mercado || tasacion.valor_mercado <= 0) {
      toast.error('Ingresa un valor de tasación válido')
      return
    }
    
    // Validar si el ajuste manual está fuera del rango recomendado
    if (Math.abs(ajusteManual) > 5 && !tasacion.observaciones?.trim()) {
      toast.error('Las observaciones son obligatorias cuando el ajuste manual supera ±5%')
      return
    }

    // Validar si el riesgo es alto y no hay observaciones
    if (resultadoTasacion?.factores.riesgo === 'alto' && !tasacion.observaciones?.trim()) {
      toast.error('Las observaciones son obligatorias para artículos de alto riesgo')
      return
    }

    onSiguiente()
  }

  const requiereObservaciones = 
    Math.abs(ajusteManual) > 5 || 
    resultadoTasacion?.factores.riesgo === 'alto' ||
    prenda?.condicion_fisica === 'regular'

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <Scales className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Tasación de la Prenda</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Determina el valor estimado del artículo con cálculo inteligente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label className="text-sm font-medium">Método de Valuación</Label>
          <Select
            value={tasacion?.metodo_valuacion || undefined}
            onValueChange={(v) => onTasacionChange({ ...tasacion, metodo_valuacion: v as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comparacion_mercado">Comparación de Mercado</SelectItem>
              <SelectItem value="valor_reposicion">Valor de Reposición</SelectItem>
              <SelectItem value="valor_liquidacion">Valor de Liquidación</SelectItem>
              <SelectItem value="pericial">Avalúo Pericial</SelectItem>
              <SelectItem value="catalogo">Catálogo</SelectItem>
              <SelectItem value="experiencia">Experiencia del Tasador</SelectItem>
              <SelectItem value="web">Búsqueda Web</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_mercado" className="text-sm font-medium">
            Valor de Mercado (Q) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="valor_mercado"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={tasacion?.valor_mercado || ''}
            onChange={(e) => onTasacionChange({ 
              ...tasacion, 
              valor_mercado: Number(e.target.value) 
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="antiguedad" className="text-sm font-medium">Antigüedad (años)</Label>
          <Input
            id="antiguedad"
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            value={antiguedad || ''}
            onChange={(e) => setAntiguedad(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Demanda Local</Label>
          <Select
            value={demandaLocal}
            onValueChange={(v) => setDemandaLocal(v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Riesgo de Almacenamiento</Label>
          <Select
            value={riesgoAlmacenamiento}
            onValueChange={(v) => setRiesgoAlmacenamiento(v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bajo">Bajo</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Dificultad de Reventa</Label>
          <Select
            value={dificultadReventa}
            onValueChange={(v) => setDificultadReventa(v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {resultadoTasacion && tasacion?.valor_mercado && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Cálculo del Préstamo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-background rounded">
                <span className="text-muted-foreground">Valor de mercado:</span>
                <MoneyDisplay amount={tasacion.valor_mercado} className="font-semibold" />
              </div>
              
              <div className="flex justify-between items-center p-2 bg-background rounded">
                <span className="text-muted-foreground">Categoría ({categoriaNombre || 'General'}):</span>
                <span className="font-semibold">{resultadoTasacion.porcentajeBase}%</span>
              </div>

              {resultadoTasacion.ajustes.condicion !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Estado {prenda?.condicion_fisica}:</span>
                  <span className={`font-semibold ${resultadoTasacion.ajustes.condicion > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {resultadoTasacion.ajustes.condicion > 0 ? '+' : ''}{resultadoTasacion.ajustes.condicion}%
                  </span>
                </div>
              )}

              {antiguedad > 0 && resultadoTasacion.ajustes.antiguedad !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Antigüedad ({antiguedad} años):</span>
                  <span className="font-semibold text-red-600">{resultadoTasacion.ajustes.antiguedad}%</span>
                </div>
              )}

              {resultadoTasacion.ajustes.liquidez !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Liquidez ({resultadoTasacion.factores.liquidez}):</span>
                  <span className="font-semibold text-red-600">{resultadoTasacion.ajustes.liquidez}%</span>
                </div>
              )}

              {resultadoTasacion.ajustes.metodo !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Método {tasacion.metodo_valuacion}:</span>
                  <span className={`font-semibold ${resultadoTasacion.ajustes.metodo > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {resultadoTasacion.ajustes.metodo > 0 ? '+' : ''}{resultadoTasacion.ajustes.metodo}%
                  </span>
                </div>
              )}

              {resultadoTasacion.ajustes.demanda !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Demanda {demandaLocal}:</span>
                  <span className={`font-semibold ${resultadoTasacion.ajustes.demanda > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {resultadoTasacion.ajustes.demanda > 0 ? '+' : ''}{resultadoTasacion.ajustes.demanda}%
                  </span>
                </div>
              )}

              {resultadoTasacion.ajustes.riesgo !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Riesgo almacenamiento:</span>
                  <span className="font-semibold text-red-600">{resultadoTasacion.ajustes.riesgo}%</span>
                </div>
              )}

              {resultadoTasacion.ajustes.reventa !== 0 && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-muted-foreground">Dificultad reventa:</span>
                  <span className="font-semibold text-red-600">{resultadoTasacion.ajustes.reventa}%</span>
                </div>
              )}

              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="font-medium">➡️ Porcentaje final:</span>
                  <span className="text-lg font-bold text-primary">{resultadoTasacion.porcentajeFinal.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-2 pt-2 border-t">
              <MoneyDisplay 
                amount={montoFinal} 
                className="text-3xl font-bold text-primary"
              />
              <span className="text-sm text-muted-foreground">
                ({porcentajeFinalConAjuste.toFixed(1)}% del valor de mercado)
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant={resultadoTasacion.factores.liquidez === 'alta' ? 'default' : 'secondary'}>
                Liquidez: {resultadoTasacion.factores.liquidez}
              </Badge>
              <Badge variant={resultadoTasacion.factores.riesgo === 'alto' ? 'destructive' : resultadoTasacion.factores.riesgo === 'medio' ? 'secondary' : 'default'}>
                Riesgo: {resultadoTasacion.factores.riesgo}
              </Badge>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Ajuste Manual (±5%)</Label>
                <span className={`text-sm font-semibold ${ajusteManual === 0 ? 'text-muted-foreground' : Math.abs(ajusteManual) > 5 ? 'text-destructive' : 'text-primary'}`}>
                  {ajusteManual > 0 ? '+' : ''}{ajusteManual.toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[ajusteManual]}
                onValueChange={([value]) => setAjusteManual(value)}
                min={-10}
                max={10}
                step={0.5}
                className="w-full"
              />
              {Math.abs(ajusteManual) > 5 && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950 rounded text-sm">
                  <Warning className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200">
                    Ajuste fuera del rango recomendado. Las observaciones son obligatorias.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="observaciones" className="text-sm font-medium">
            Observaciones de la Tasación
            {requiereObservaciones && <span className="text-destructive"> *</span>}
          </Label>
          {requiereObservaciones && (
            <Badge variant="destructive" className="text-xs">Obligatorio</Badge>
          )}
        </div>
        <Textarea
          id="observaciones"
          placeholder="Detalles sobre el estado, marca, modelo, defectos encontrados, comparativos utilizados, justificación del ajuste manual, etc."
          rows={5}
          value={tasacion?.observaciones || ''}
          onChange={(e) => onTasacionChange({ 
            ...tasacion, 
            observaciones: e.target.value 
          })}
          className={requiereObservaciones && !tasacion?.observaciones?.trim() ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">
          {requiereObservaciones 
            ? 'Las observaciones son obligatorias para justificar la tasación.'
            : 'Incluye información relevante que justifique la tasación realizada'}
        </p>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onAnterior} size="lg" type="button">
          Anterior
        </Button>
        <Button onClick={handleSubmit} size="lg" type="button">
          Continuar
        </Button>
      </div>
    </div>
  )
}
