import { useState, useEffect, useMemo } from 'react'
import { CrearPrendaDTO } from '@/types/creditoPrendario.types'
import { categoriaProductoService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Camera, Trash, Package, Buildings, CaretDown, CaretUp } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { MapPickerField, type GeoCoords } from '@/components/ui/MapPickerField'

// Configuración de campos base del formulario
interface CamposFormulario {
  marca: boolean
  modelo: boolean
  numero_serie: boolean
  condicion_fisica: boolean
}

// Campo adicional dinámico
interface CampoAdicional {
  nombre: string
  label: string
  tipo: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'mapa'
  requerido: boolean
  opciones?: string[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

interface Categoria {
  id: string | number
  codigo: string
  nombre: string
  color?: string
  icono?: string
  tasa_interes_default?: number | null
  tasa_mora_default?: number | null
  plazo_maximo_dias?: number | null
  porcentaje_prestamo_maximo?: number | null
  metodo_calculo_default?: 'francesa' | 'flat'
  afecta_interes_mensual?: boolean
  permite_pago_capital_diferente?: boolean
  campos_formulario?: CamposFormulario | null
  campos_adicionales?: CampoAdicional[] | null
}

interface PasoRegistrarPrendaProps {
  prenda: Partial<CrearPrendaDTO> | null
  onPrendaChange: (prenda: Partial<CrearPrendaDTO>) => void
  onSiguiente: () => void
  onAnterior: () => void
  onParametrosCategoria?: (parametros: {
    tasa_interes?: number
    tasa_mora?: number
    plazo_maximo?: number
    porcentaje_prestamo_maximo?: number
    metodo_calculo?: 'francesa' | 'flat'
    afecta_interes_mensual?: boolean
    permite_pago_capital_diferente?: boolean
  }) => void
}

export function PasoRegistrarPrenda({
  prenda,
  onPrendaChange,
  onSiguiente,
  onAnterior,
  onParametrosCategoria
}: PasoRegistrarPrendaProps) {
  const [fotos, setFotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargandoCategorias, setCargandoCategorias] = useState(false)
  const [datosAdicionales, setDatosAdicionales] = useState<Record<string, any>>({})
  const [camposExpandidos, setCamposExpandidos] = useState(true)

  // Obtener la categoría seleccionada — normalizar a string para comparar
  // (la API devuelve id como número aunque la interfaz diga string)
  const categoriaSeleccionada = useMemo(() => {
    return categorias.find(c => String(c.id) === String(prenda?.categoria_producto_id ?? ''))
  }, [categorias, prenda?.categoria_producto_id])

  // ¿Es Inmueble? — para mostrar panel especial
  const esInmueble = useMemo(() => {
    return categoriaSeleccionada?.nombre?.toLowerCase().includes('inmueble')
  }, [categoriaSeleccionada])

  // Obtener configuración de campos para la categoría actual
  const camposFormulario = useMemo((): CamposFormulario => {
    // Default: todos los campos visibles
    const defaultCampos: CamposFormulario = {
      marca: true,
      modelo: true,
      numero_serie: true,
      condicion_fisica: true,
    }
    
    if (!categoriaSeleccionada?.campos_formulario) {
      return defaultCampos
    }
    
    return { ...defaultCampos, ...categoriaSeleccionada.campos_formulario }
  }, [categoriaSeleccionada])

  // Obtener campos adicionales para la categoría
  const camposAdicionales = useMemo((): CampoAdicional[] => {
    return categoriaSeleccionada?.campos_adicionales || []
  }, [categoriaSeleccionada])

  useEffect(() => {
    cargarCategorias()
  }, [])

  // Cuando cambia la categoría, resetear datos adicionales
  useEffect(() => {
    setDatosAdicionales({})
  }, [prenda?.categoria_producto_id])

  const cargarCategorias = async () => {
    try {
      setCargandoCategorias(true)
      const response = await categoriaProductoService.getActivas()
      if (response && response.data && Array.isArray(response.data)) {
        setCategorias(response.data)
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error)
      toast.error('Error al cargar categorías')
    } finally {
      setCargandoCategorias(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + fotos.length > 5) {
      toast.error('Máximo 5 fotos permitidas')
      return
    }

    setFotos([...fotos, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const handleDatoAdicionalChange = (nombre: string, valor: any) => {
    setDatosAdicionales(prev => ({ ...prev, [nombre]: valor }))
  }

  const handleSubmit = () => {
    if (!prenda?.descripcion_general?.trim()) {
      toast.error('Ingresa una descripción de la prenda')
      return
    }
    if (!prenda?.categoria_producto_id) {
      toast.error('Selecciona una categoría')
      return
    }

    // Validar campos adicionales requeridos
    for (const campo of camposAdicionales) {
      if (campo.requerido && !datosAdicionales[campo.nombre]) {
        toast.error(`El campo "${campo.label}" es requerido`)
        return
      }
    }
    
    // Guardar las fotos en base64 y datos adicionales en el estado de la prenda
    const prendaActualizada = {
      ...prenda,
      fotos: previews.length > 0 ? previews : [],
      datos_adicionales: datosAdicionales
    }
    
    onPrendaChange(prendaActualizada)
    onSiguiente()
  }

  // Renderizar un campo adicional dinámico
  const renderCampoAdicional = (campo: CampoAdicional) => {
    const valor = datosAdicionales[campo.nombre] || ''
    
    switch (campo.tipo) {
      case 'text':
        return (
          <div key={campo.nombre} className="space-y-2">
            <Label htmlFor={campo.nombre} className="text-sm font-medium">
              {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={campo.nombre}
              placeholder={campo.placeholder || `Ingresa ${campo.label.toLowerCase()}`}
              value={valor}
              onChange={(e) => handleDatoAdicionalChange(campo.nombre, e.target.value)}
            />
          </div>
        )
      
      case 'number':
        return (
          <div key={campo.nombre} className="space-y-2">
            <Label htmlFor={campo.nombre} className="text-sm font-medium">
              {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={campo.nombre}
              type="number"
              placeholder={campo.placeholder || `Ingresa ${campo.label.toLowerCase()}`}
              value={valor}
              min={campo.min}
              max={campo.max}
              step={campo.step || 1}
              onChange={(e) => handleDatoAdicionalChange(campo.nombre, e.target.value ? Number(e.target.value) : '')}
            />
          </div>
        )
      
      case 'select':
        return (
          <div key={campo.nombre} className="space-y-2">
            <Label htmlFor={campo.nombre} className="text-sm font-medium">
              {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={valor || ""}
              onValueChange={(v) => handleDatoAdicionalChange(campo.nombre, v)}
            >
              <SelectTrigger id={campo.nombre}>
                <SelectValue placeholder={`Selecciona ${campo.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {campo.opciones?.map((opcion) => (
                  <SelectItem key={opcion} value={opcion}>
                    {opcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'checkbox':
        return (
          <div key={campo.nombre} className="flex items-center space-x-2 py-2">
            <Checkbox
              id={campo.nombre}
              checked={valor === true}
              onCheckedChange={(checked) => handleDatoAdicionalChange(campo.nombre, checked)}
            />
            <Label htmlFor={campo.nombre} className="text-sm font-medium cursor-pointer">
              {campo.label}
            </Label>
          </div>
        )
      
      case 'textarea':
        return (
          <div key={campo.nombre} className="space-y-2 md:col-span-2">
            <Label htmlFor={campo.nombre} className="text-sm font-medium">
              {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={campo.nombre}
              placeholder={campo.placeholder || `Ingresa ${campo.label.toLowerCase()}`}
              value={valor}
              onChange={(e) => handleDatoAdicionalChange(campo.nombre, e.target.value)}
              rows={3}
            />
          </div>
        )
      
      case 'date':
        return (
          <div key={campo.nombre} className="space-y-2">
            <Label htmlFor={campo.nombre} className="text-sm font-medium">
              {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={campo.nombre}
              type="date"
              value={valor}
              onChange={(e) => handleDatoAdicionalChange(campo.nombre, e.target.value)}
            />
          </div>
        )

      case 'mapa':
        return (
          <MapPickerField
            key={campo.nombre}
            label={campo.label}
            requerido={campo.requerido}
            value={valor as GeoCoords | null}
            onChange={(coords) => handleDatoAdicionalChange(campo.nombre, coords)}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Registrar Prenda</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ingresa los detalles del artículo a empeñar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoria" className="text-sm font-medium">
            Categoría <span className="text-destructive">*</span>
          </Label>
          <Select
            value={prenda?.categoria_producto_id ? String(prenda.categoria_producto_id) : ""}
            onValueChange={(v) => {
              const categoriaSeleccionada = categorias.find(c => String(c.id) === v)
              onPrendaChange({ ...prenda, categoria_producto_id: v })
              
              // Pasar parámetros de la categoría al wizard
              if (categoriaSeleccionada && onParametrosCategoria) {
                onParametrosCategoria({
                  tasa_interes: categoriaSeleccionada.tasa_interes_default ?? undefined,
                  tasa_mora: categoriaSeleccionada.tasa_mora_default ?? undefined,
                  plazo_maximo: categoriaSeleccionada.plazo_maximo_dias ?? undefined,
                  porcentaje_prestamo_maximo: categoriaSeleccionada.porcentaje_prestamo_maximo ?? undefined,
                  metodo_calculo: 'flat', // Siempre 'flat' para créditos prendarios
                  afecta_interes_mensual: categoriaSeleccionada.afecta_interes_mensual ?? false,
                  permite_pago_capital_diferente: categoriaSeleccionada.permite_pago_capital_diferente ?? false,
                })
              }
            }}
            disabled={cargandoCategorias || categorias.length === 0}
          >
            <SelectTrigger id="categoria">
              <SelectValue 
                placeholder={
                  cargandoCategorias 
                    ? "Cargando categorías..." 
                    : categorias.length === 0 
                      ? "No hay categorías disponibles"
                      : "Selecciona una categoría"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {cargandoCategorias ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                  Cargando categorías...
                </div>
              ) : categorias.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                  No hay categorías disponibles
                </div>
              ) : (
                categorias.map((categoria) => (
                  <SelectItem key={String(categoria.id)} value={String(categoria.id)}>
                    <span className="flex items-center gap-2">
                      {categoria.color && (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: categoria.color }}
                        />
                      )}
                      {categoria.nombre}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion_general" className="text-sm font-medium">
            Descripción General <span className="text-destructive">*</span>
          </Label>
          <Input
            id="descripcion_general"
            placeholder="Ej: Laptop HP 15'"
            value={prenda?.descripcion_general || ''}
            onChange={(e) => onPrendaChange({ ...prenda, descripcion_general: e.target.value })}
          />
        </div>

        {/* Campos base dinámicos según la categoría */}
        {camposFormulario.marca && (
          <div className="space-y-2">
            <Label htmlFor="marca" className="text-sm font-medium">Marca</Label>
            <Input
              id="marca"
              placeholder="Ej: HP, Samsung, etc."
              value={prenda?.marca || ''}
              onChange={(e) => onPrendaChange({ ...prenda, marca: e.target.value })}
            />
          </div>
        )}

        {camposFormulario.modelo && (
          <div className="space-y-2">
            <Label htmlFor="modelo" className="text-sm font-medium">Modelo</Label>
            <Input
              id="modelo"
              placeholder="Ej: Pavilion 15-cs3000"
              value={prenda?.modelo || ''}
              onChange={(e) => onPrendaChange({ ...prenda, modelo: e.target.value })}
            />
          </div>
        )}

        {camposFormulario.numero_serie && (
          <div className="space-y-2">
            <Label htmlFor="numero_serie" className="text-sm font-medium">Número de Serie</Label>
            <Input
              id="numero_serie"
              placeholder="Serial del producto"
              value={prenda?.numero_serie || ''}
              onChange={(e) => onPrendaChange({ ...prenda, numero_serie: e.target.value })}
            />
          </div>
        )}

        {camposFormulario.condicion_fisica && (
          <div className="space-y-2">
            <Label htmlFor="condicion_fisica" className="text-sm font-medium">Condición Física</Label>
            <Select
              value={prenda?.condicion_fisica || ""}
              onValueChange={(v) => onPrendaChange({ ...prenda, condicion_fisica: v as any })}
            >
              <SelectTrigger id="condicion_fisica">
                <SelectValue placeholder="Selecciona estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excelente">Excelente</SelectItem>
                <SelectItem value="bueno">Bueno</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="deteriorado">Deteriorado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Campos adicionales dinámicos — panel especial para Inmuebles, inline para el resto */}
        {camposAdicionales.length > 0 && (
          esInmueble ? (
            <div className="md:col-span-2">
              {/* Panel colapsable con borde izquierdo de color categoría */}
              <div
                className="rounded-lg border border-border overflow-hidden shadow-sm"
                style={{
                  borderLeft: `4px solid ${categoriaSeleccionada?.color ?? '#0D9488'}`,
                }}
              >
                {/* Header del panel */}
                <button
                  type="button"
                  onClick={() => setCamposExpandidos(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Buildings
                      className="h-4 w-4"
                      style={{ color: categoriaSeleccionada?.color ?? '#0D9488' }}
                    />
                    Datos del Inmueble
                    <span
                      className="text-xs font-normal px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: categoriaSeleccionada?.color ?? '#0D9488' }}
                    >
                      {camposAdicionales.length} campos
                    </span>
                  </span>
                  {camposExpandidos
                    ? <CaretUp className="h-4 w-4 text-muted-foreground" />
                    : <CaretDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Contenido expandible */}
                {camposExpandidos && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {camposAdicionales.map(campo => renderCampoAdicional(campo))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {camposAdicionales.map(campo => renderCampoAdicional(campo))}
            </>
          )
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Fotografías (máx. 5)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {previews.map((preview, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <img 
                  src={preview} 
                  alt={`Foto ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  type="button"
                  className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveFoto(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {fotos.length < 5 && (
            <label className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Agregar foto</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {fotos.length} de 5 fotos agregadas
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
