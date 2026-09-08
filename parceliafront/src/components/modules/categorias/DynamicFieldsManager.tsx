import { useState } from 'react'
import { CampoDinamico } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

interface DynamicFieldsManagerProps {
  fields: CampoDinamico[]
  onChange: (fields: CampoDinamico[]) => void
}

const tiposCampo = [
  { value: 'texto', label: 'Texto Corto' },
  { value: 'texto_largo', label: 'Texto Largo' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'booleano', label: 'Sí/No' },
  { value: 'seleccion', label: 'Selección' },
]

export function DynamicFieldsManager({ fields, onChange }: DynamicFieldsManagerProps) {
  const [editingField, setEditingField] = useState<CampoDinamico | null>(null)
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<CampoDinamico['tipo']>('texto')
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')

  const resetForm = () => {
    setEditingField(null)
    setFieldName('')
    setFieldType('texto')
    setFieldRequired(false)
    setFieldOptions([])
    setNewOption('')
  }

  const handleAddField = () => {
    if (!fieldName.trim()) return

    const newField: CampoDinamico = {
      nombre: fieldName,
      tipo: fieldType,
      requerido: fieldRequired,
      opciones: fieldType === 'seleccion' ? fieldOptions : undefined,
    }

    if (editingField) {
      // Editar campo existente
      const updatedFields = fields.map(f => 
        f.nombre === editingField.nombre ? newField : f
      )
      onChange(updatedFields)
    } else {
      // Agregar nuevo campo
      onChange([...fields, newField])
    }

    resetForm()
  }

  const handleEditField = (field: CampoDinamico) => {
    setEditingField(field)
    setFieldName(field.nombre)
    setFieldType(field.tipo)
    setFieldRequired(field.requerido)
    setFieldOptions(field.opciones || [])
  }

  const handleDeleteField = (fieldName: string) => {
    onChange(fields.filter(f => f.nombre !== fieldName))
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return
    setFieldOptions([...fieldOptions, newOption])
    setNewOption('')
  }

  const handleRemoveOption = (index: number) => {
    setFieldOptions(fieldOptions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingField ? 'Editar Campo Dinámico' : 'Agregar Campo Dinámico'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Nombre del Campo *</Label>
              <Input
                id="field-name"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="Ej: Marca, Modelo, Serie"
                disabled={!!editingField}
              />
              {editingField && (
                <p className="text-xs text-muted-foreground">
                  No se puede cambiar el nombre de un campo existente
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Tipo de Campo *</Label>
              <Select value={fieldType} onValueChange={(v: any) => setFieldType(v)}>
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposCampo.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="field-required"
              checked={fieldRequired}
              onChange={(e) => setFieldRequired(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="field-required" className="cursor-pointer">
              Campo requerido
            </Label>
          </div>

          {fieldType === 'seleccion' && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <Label>Opciones de Selección</Label>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Nueva opción..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                />
                <Button type="button" size="sm" onClick={handleAddOption}>
                  <Plus size={16} />
                </Button>
              </div>
              {fieldOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {fieldOptions.map((option, index) => (
                    <Badge key={index} variant="secondary" className="pl-2 pr-1">
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {fieldOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Agrega al menos una opción para campos de selección
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {editingField && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button 
              type="button" 
              onClick={handleAddField}
              disabled={!fieldName.trim() || (fieldType === 'seleccion' && fieldOptions.length === 0)}
            >
              <Plus size={16} className="mr-1" />
              {editingField ? 'Actualizar Campo' : 'Agregar Campo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campos Configurados ({fields.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fields.map((field) => (
                <div 
                  key={field.nombre} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.nombre}</span>
                      <Badge variant="outline" className="text-xs">
                        {tiposCampo.find(t => t.value === field.tipo)?.label}
                      </Badge>
                      {field.requerido && (
                        <Badge variant="destructive" className="text-xs">
                          Requerido
                        </Badge>
                      )}
                    </div>
                    {field.opciones && field.opciones.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.opciones.map((opt, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditField(field)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteField(field.nombre)}
                    >
                      <Trash size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
