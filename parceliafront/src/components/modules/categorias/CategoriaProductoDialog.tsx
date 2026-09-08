import { useState, useEffect } from 'react'
import { CategoriaProducto } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { DynamicFieldsManager } from './DynamicFieldsManager' // Funcionalidad deshabilitada
// import { Separator } from '@/components/ui/separator' // Funcionalidad deshabilitada

interface CategoriaProductoDialogProps {
  abierto: boolean
  onCerrar: () => void
  onGuardar: (categoria: CategoriaProducto) => Promise<void>
  categoria?: CategoriaProducto
}

export function CategoriaProductoDialog({ abierto, onCerrar, onGuardar, categoria }: CategoriaProductoDialogProps) {
  const [formData, setFormData] = useState<Partial<CategoriaProducto>>({
    codigo: '',
    nombre: '',
    descripcion: '',
    color: '#3B82F6',
    icono: '',
    orden: 0,
    activa: true,
    camposDinamicos: [],
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (categoria) {
      setFormData(categoria)
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        icono: '',
        orden: 0,
        activa: true,
        camposDinamicos: [],
      })
    }
    setErrores({})
  }, [categoria, abierto])

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {}

    if (!formData.nombre?.trim()) nuevosErrores.nombre = 'Requerido'
    if (formData.color && !/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      nuevosErrores.color = 'Color inválido (formato: #RRGGBB)'
    }
    if (formData.orden !== undefined && formData.orden < 0) {
      nuevosErrores.orden = 'El orden debe ser mayor o igual a 0'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return

    const categoriaData: CategoriaProducto = {
      id: categoria?.id || `categoria-${Date.now()}`,
      codigo: formData.codigo || '',
      nombre: formData.nombre!,
      descripcion: formData.descripcion,
      color: formData.color,
      icono: formData.icono,
      orden: formData.orden ?? 0,
      activa: formData.activa ?? true,
      camposDinamicos: formData.camposDinamicos || [],
      creadoEn: categoria?.creadoEn || new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    }

    setGuardando(true)
    try {
      await onGuardar(categoriaData)
    } finally {
      setGuardando(false)
    }
  }

  const coloresPredefinidos = [
    { nombre: 'Azul', valor: '#3B82F6' },
    { nombre: 'Verde', valor: '#10B981' },
    { nombre: 'Rojo', valor: '#EF4444' },
    { nombre: 'Amarillo', valor: '#F59E0B' },
    { nombre: 'Púrpura', valor: '#8B5CF6' },
    { nombre: 'Rosa', valor: '#EC4899' },
    { nombre: 'Cian', valor: '#06B6D4' },
    { nombre: 'Naranja', valor: '#F97316' },
  ]

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-[90vw] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            {categoria ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-sm sm:text-base">
                Código {!categoria && <span className="text-xs text-muted-foreground">(Auto-generado)</span>}
              </Label>
              <Input
                id="codigo"
                value={formData.codigo || ''}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                className={`text-sm sm:text-base ${errores.codigo ? 'border-destructive' : ''}`}
                placeholder={categoria ? "CAT-001" : "Se generará automáticamente"}
                maxLength={20}
                disabled={!categoria}
                readOnly={!categoria}
              />
              {errores.codigo && <p className="text-xs text-destructive">{errores.codigo}</p>}
              {!categoria && (
                <p className="text-xs text-muted-foreground">
                  El código se generará automáticamente al guardar
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm sm:text-base">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className={`text-sm sm:text-base ${errores.nombre ? 'border-destructive' : ''}`}
                placeholder="Electrónica, Joyería, etc."
              />
              {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-sm sm:text-base">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="text-sm sm:text-base resize-none"
              placeholder="Descripción de la categoría..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="color" className="text-sm sm:text-base">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color || '#3B82F6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color || '#3B82F6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className={`flex-1 text-sm sm:text-base ${errores.color ? 'border-destructive' : ''}`}
                  placeholder="#3B82F6"
                  maxLength={7}
                />
              </div>
              {errores.color && <p className="text-xs text-destructive">{errores.color}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {coloresPredefinidos.map((color) => (
                  <button
                    key={color.valor}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.valor })}
                    className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.valor }}
                    title={color.nombre}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icono" className="text-sm sm:text-base">Icono</Label>
              <Input
                id="icono"
                value={formData.icono}
                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                className="text-sm sm:text-base"
                placeholder="Tag, Package, etc."
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Nombre del icono (opcional, para uso futuro)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="orden" className="text-sm sm:text-base">Orden</Label>
              <Input
                id="orden"
                type="number"
                value={formData.orden ?? 0}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                className={`text-sm sm:text-base ${errores.orden ? 'border-destructive' : ''}`}
                min="0"
              />
              {errores.orden && <p className="text-xs text-destructive">{errores.orden}</p>}
              <p className="text-xs text-muted-foreground">
                Orden de visualización (menor número = primero)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activa" className="text-sm sm:text-base">Estado</Label>
              <Select
                value={formData.activa ? 'activa' : 'inactiva'}
                onValueChange={(value) => setFormData({ ...formData, activa: value === 'activa' })}
              >
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa" className="text-sm sm:text-base">Activa</SelectItem>
                  <SelectItem value="inactiva" className="text-sm sm:text-base">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Funcionalidad de campos dinámicos deshabilitada
          <Separator className="my-6" />

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Campos Dinámicos</h3>
            <p className="text-sm text-muted-foreground">
              Define campos adicionales que se pedirán al registrar prendas de esta categoría
            </p>
            <DynamicFieldsManager
              fields={formData.camposDinamicos || []}
              onChange={(fields) => setFormData({ ...formData, camposDinamicos: fields })}
            />
          </div>
          */}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCerrar}
              disabled={guardando}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {guardando ? 'Guardando...' : (categoria ? 'Guardar Cambios' : 'Crear Categoría')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


