import { useState, useEffect } from 'react'
import { PlanInteresCategoria, CategoriaProducto } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PlanInteresDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: PlanInteresCategoria
  onGuardar: (plan: any) => void
  categorias: CategoriaProducto[]
}

export function PlanInteresDialog({ open, onOpenChange, plan, onGuardar, categorias }: PlanInteresDialogProps) {
  const unidadPorPeriodo = (periodo: string): 'semanas' | 'quincenas' | 'meses' => {
    switch (periodo) {
      case 'semanal':
        return 'semanas'
      case 'quincenal':
        return 'quincenas'
      case 'mensual':
      default:
        return 'meses'
    }
  }

  const [formData, setFormData] = useState({
    categoria_ids: [] as number[],
    nombre: '',
    descripcion: '',
    tipo_periodo: 'mensual',
    plazo_numero: 1,
    plazo_unidad: 'meses',
    tasa_interes: 10,
    tasa_almacenaje: 5,
    tasa_moratorios: 3,
    tipo_mora: 'porcentaje' as 'porcentaje' | 'monto_fijo',
    mora_monto_fijo: null as number | null,
    porcentaje_prestamo: 70,
    monto_minimo: null as number | null,
    monto_maximo: null as number | null,
    dias_gracia: 0,
    dias_enajenacion: 30,
    activo: true,
    es_default: false,
  })

  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (plan) {
      let catIds: number[] = []
      if ((plan as any).categorias_ids && (plan as any).categorias_ids.length > 0) {
        catIds = (plan as any).categorias_ids.map(Number)
      } else if ((plan as any).categorias && (plan as any).categorias.length > 0) {
        catIds = (plan as any).categorias.map((c: any) => Number(c.id))
      } else if (plan.categoria_producto_id) {
        catIds = [Number(plan.categoria_producto_id)]
      }

      setFormData({
        categoria_ids: catIds,
        nombre: plan.nombre,
        descripcion: plan.descripcion || '',
        tipo_periodo: plan.tipo_periodo,
        plazo_numero: plan.plazo_numero,
        plazo_unidad: plan.plazo_unidad,
        tasa_interes: Number(plan.tasa_interes),
        tasa_almacenaje: Number(plan.tasa_almacenaje),
        tasa_moratorios: Number(plan.tasa_moratorios),
        tipo_mora: (plan as any).tipo_mora ?? 'porcentaje',
        mora_monto_fijo: (plan as any).mora_monto_fijo != null ? Number((plan as any).mora_monto_fijo) : null,
        porcentaje_prestamo: Number(plan.porcentaje_prestamo),
        monto_minimo: plan.monto_minimo ? Number(plan.monto_minimo) : null,
        monto_maximo: plan.monto_maximo ? Number(plan.monto_maximo) : null,
        dias_gracia: plan.dias_gracia,
        dias_enajenacion: plan.dias_enajenacion,
        activo: plan.activo,
        es_default: plan.es_default,
      })
    } else {
      setFormData({
        categoria_ids: [],
        nombre: '',
        descripcion: '',
        tipo_periodo: 'mensual',
        plazo_numero: 1,
        plazo_unidad: 'meses',
        tasa_interes: 10,
        tasa_almacenaje: 5,
        tasa_moratorios: 3,
        tipo_mora: 'porcentaje',
        mora_monto_fijo: null,
        porcentaje_prestamo: 70,
        monto_minimo: null,
        monto_maximo: null,
        dias_gracia: 0,
        dias_enajenacion: 30,
        activo: true,
        es_default: false,
      })
    }
    setErrores({})
  }, [plan, open])

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {}

    if (!formData.nombre?.trim()) nuevosErrores.nombre = 'Requerido'
    if (isNaN(formData.tasa_interes) || formData.tasa_interes <= 0) {
      nuevosErrores.tasa_interes = 'Debe ser un número mayor a 0'
    }
    if (formData.porcentaje_prestamo <= 0 || formData.porcentaje_prestamo > 100) {
      nuevosErrores.porcentaje_prestamo = 'Debe estar entre 0 y 100'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return

    const planData = {
      ...formData,
      plazo_unidad: unidadPorPeriodo(formData.tipo_periodo),
      categoria_ids: formData.categoria_ids,
      categoria_producto_id: formData.categoria_ids.length > 0 ? formData.categoria_ids[0] : null,
      plazo_numero: parseInt(String(formData.plazo_numero)) || 1,
      tasa_interes: parseFloat(String(formData.tasa_interes)) || 0,
      tasa_almacenaje: parseFloat(String(formData.tasa_almacenaje)) || 0,
      tasa_moratorios: parseFloat(String(formData.tasa_moratorios)) || 0,
      tipo_mora: formData.tipo_mora ?? 'porcentaje',
      mora_monto_fijo: formData.mora_monto_fijo != null ? parseFloat(String(formData.mora_monto_fijo)) : null,
      porcentaje_prestamo: parseFloat(String(formData.porcentaje_prestamo)) || 0,
      dias_gracia: parseInt(String(formData.dias_gracia)) || 0,
      dias_enajenacion: parseInt(String(formData.dias_enajenacion)) || 0,
      monto_minimo: formData.monto_minimo ? parseFloat(String(formData.monto_minimo)) : null,
      monto_maximo: formData.monto_maximo ? parseFloat(String(formData.monto_maximo)) : null,
      activo: Boolean(formData.activo),
      es_default: Boolean(formData.es_default),
      permite_refrendos: true,
      numero_refrendos_permitidos: 3,
    }

    console.log('Datos a enviar:', planData) // Debug
    onGuardar(plan ? { id: plan.id, ...planData } : planData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            {plan ? 'Editar Producto Crediticio' : 'Nuevo Producto Crediticio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="tasas">Tasas</TabsTrigger>
              <TabsTrigger value="configuracion">Configuración</TabsTrigger>
            </TabsList>

            {/* TAB BÁSICO */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="nombre">Nombre del Plan *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={errores.nombre ? 'border-destructive' : ''}
                    placeholder="Plan Estándar Joyería"
                  />
                  {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-sm font-semibold flex items-center justify-between">
                    <span>Categorías de Producto Asociadas</span>
                    <span className="text-xs text-muted-foreground">
                      {formData.categoria_ids.length === 0 
                        ? 'Genérico (Todas las categorías)' 
                        : `${formData.categoria_ids.length} seleccionada(s)`}
                    </span>
                  </Label>
                  <div className="border rounded-lg p-4 bg-background/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <input
                        type="checkbox"
                        id="select_all_cats"
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        checked={formData.categoria_ids.length === categorias.length && categorias.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              categoria_ids: categorias.map(c => Number(c.id))
                            })
                          } else {
                            setFormData({
                              ...formData,
                              categoria_ids: []
                            })
                          }
                        }}
                      />
                      <label htmlFor="select_all_cats" className="text-sm font-medium text-primary cursor-pointer select-none">
                        Marcar todas (Producto Genérico)
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[160px] overflow-y-auto pt-1">
                      {categorias.map((cat) => {
                        const isChecked = formData.categoria_ids.includes(Number(cat.id))
                        return (
                          <div key={cat.id} className="flex items-center gap-2 hover:bg-muted/50 p-1.5 rounded transition-all">
                            <input
                              type="checkbox"
                              id={`cat_${cat.id}`}
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              checked={isChecked}
                              onChange={() => {
                                let newIds = [...formData.categoria_ids]
                                if (isChecked) {
                                  newIds = newIds.filter(id => id !== Number(cat.id))
                                } else {
                                  newIds.push(Number(cat.id))
                                }
                                setFormData({
                                  ...formData,
                                  categoria_ids: newIds
                                })
                              }}
                            />
                            <label htmlFor={`cat_${cat.id}`} className="text-sm cursor-pointer select-none truncate">
                              {cat.nombre}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      * Si no seleccionas ninguna categoría (o marcas todas), el producto se considerará <strong>Genérico</strong> y se podrá aplicar a cualquier prenda.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción del plan de crédito"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_periodo">Tipo de Período</Label>
                  <Select 
                    value={formData.tipo_periodo} 
                    onValueChange={(value: any) =>
                      setFormData({
                        ...formData,
                        tipo_periodo: value,
                        plazo_unidad: unidadPorPeriodo(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazo_numero">Plazo (Cantidad)</Label>
                  <Input
                    id="plazo_numero"
                    type="number"
                    min="1"
                    value={formData.plazo_numero}
                    onChange={(e) => setFormData({ ...formData, plazo_numero: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazo_unidad">Unidad de Plazo</Label>
                  <Select 
                    value={formData.plazo_unidad} 
                    onValueChange={(value: any) => setFormData({ ...formData, plazo_unidad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanas">Semanas</SelectItem>
                      <SelectItem value="quincenas">Quincenas</SelectItem>
                      <SelectItem value="meses">Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB TASAS */}
            <TabsContent value="tasas" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tasa_interes">Tasa de Interés (%) *</Label>
                  <Input
                    id="tasa_interes"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tasa_interes}
                    onChange={(e) => {
                      const valor = e.target.value
                      // Permitir campo vacío mientras el usuario escribe
                      const tasaInteres = valor === '' ? 0 : (parseFloat(valor) || 0)
                      setFormData({ ...formData, tasa_interes: tasaInteres })
                    }}
                    className={errores.tasa_interes ? 'border-destructive' : ''}
                  />
                  {errores.tasa_interes && <p className="text-xs text-destructive">{errores.tasa_interes}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tasa_almacenaje">Tasa de Almacenaje (%)</Label>
                  <Input
                    id="tasa_almacenaje"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tasa_almacenaje}
                    onChange={(e) => setFormData({ ...formData, tasa_almacenaje: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de mora</Label>
                  <Select
                    value={formData.tipo_mora}
                    onValueChange={(value: 'porcentaje' | 'monto_fijo') =>
                      setFormData({ ...formData, tipo_mora: value, ...(value === 'porcentaje' ? { mora_monto_fijo: null } : {}) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porcentaje">Porcentaje (% sobre saldo)</SelectItem>
                      <SelectItem value="monto_fijo">Monto fijo por día</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.tipo_mora === 'monto_fijo' ? (
                  <div className="space-y-2">
                    <Label htmlFor="mora_monto_fijo">Monto fijo por día (Q)</Label>
                    <Input
                      id="mora_monto_fijo"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.mora_monto_fijo ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, mora_monto_fijo: e.target.value ? parseFloat(e.target.value) : null })
                      }
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="tasa_moratorios">Tasa de Moratorios (%)</Label>
                    <Input
                      id="tasa_moratorios"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tasa_moratorios}
                      onChange={(e) => setFormData({ ...formData, tasa_moratorios: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="porcentaje_prestamo">% del Avalúo a Prestar *</Label>
                  <Input
                    id="porcentaje_prestamo"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.porcentaje_prestamo}
                    onChange={(e) => setFormData({ ...formData, porcentaje_prestamo: parseFloat(e.target.value) || 0 })}
                    className={errores.porcentaje_prestamo ? 'border-destructive' : ''}
                  />
                  {errores.porcentaje_prestamo && <p className="text-xs text-destructive">{errores.porcentaje_prestamo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monto_minimo">Monto Mínimo (opcional)</Label>
                  <Input
                    id="monto_minimo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto_minimo || ''}
                    onChange={(e) => setFormData({ ...formData, monto_minimo: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Sin límite mínimo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monto_maximo">Monto Máximo (opcional)</Label>
                  <Input
                    id="monto_maximo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto_maximo || ''}
                    onChange={(e) => setFormData({ ...formData, monto_maximo: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Sin límite máximo"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB CONFIGURACIÓN */}
            <TabsContent value="configuracion" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dias_gracia">Días de Gracia</Label>
                  <Input
                    id="dias_gracia"
                    type="number"
                    min="0"
                    value={formData.dias_gracia}
                    onChange={(e) => setFormData({ ...formData, dias_gracia: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Días sin cobro de intereses</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dias_enajenacion">Días de Enajenación</Label>
                  <Input
                    id="dias_enajenacion"
                    type="number"
                    min="0"
                    value={formData.dias_enajenacion}
                    onChange={(e) => setFormData({ ...formData, dias_enajenacion: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Días para vender la prenda</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="activo">Plan Activo</Label>
                    <p className="text-sm text-muted-foreground">
                      El plan estará disponible para nuevos créditos
                    </p>
                  </div>
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="es_default">Plan Predeterminado</Label>
                    <p className="text-sm text-muted-foreground">
                      Se seleccionará automáticamente para esta categoría
                    </p>
                  </div>
                  <Switch
                    id="es_default"
                    checked={formData.es_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, es_default: checked })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {plan ? 'Actualizar' : 'Crear'} Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
