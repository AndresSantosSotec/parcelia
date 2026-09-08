import { useState } from 'react'
import { CampoDinamico } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ListBullets, Pencil, Trash, Plus, FloppyDisk, X } from '@phosphor-icons/react'
import { DynamicFieldsManager } from './DynamicFieldsManager'

interface VerCamposDinamicosDialogProps {
  abierto: boolean
  onCerrar: () => void
  campos: CampoDinamico[]
  nombreCategoria: string
  categoriaId?: string
  onGuardar?: (campos: CampoDinamico[]) => Promise<void>
}

const tiposCampo = {
  texto: 'Texto Corto',
  texto_largo: 'Texto Largo',
  numero: 'Número',
  fecha: 'Fecha',
  booleano: 'Sí/No',
  seleccion: 'Selección',
}

export function VerCamposDinamicosDialog({ 
  abierto, 
  onCerrar, 
  campos, 
  nombreCategoria,
  categoriaId,
  onGuardar 
}: VerCamposDinamicosDialogProps) {
  const [modoEdicion, setModoEdicion] = useState(false)
  const [camposEditados, setCamposEditados] = useState<CampoDinamico[]>(campos)
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    if (!onGuardar) return
    setGuardando(true)
    try {
      await onGuardar(camposEditados)
      setModoEdicion(false)
    } catch (error) {
      console.error('Error al guardar campos:', error)
    } finally {
      setGuardando(false)
    }
  }

  const handleCancelar = () => {
    setCamposEditados(campos)
    setModoEdicion(false)
  }

  const handleCerrar = () => {
    if (modoEdicion) {
      setCamposEditados(campos)
      setModoEdicion(false)
    }
    onCerrar()
  }

  // Actualizar camposEditados cuando cambian los campos externos
  useState(() => {
    setCamposEditados(campos)
  })

  return (
    <Dialog open={abierto} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Campos Dinámicos - {nombreCategoria}
            </DialogTitle>
            {onGuardar && !modoEdicion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModoEdicion(true)}
              >
                <Pencil size={16} className="mr-2" />
                Editar Campos
              </Button>
            )}
          </div>
        </DialogHeader>

        {modoEdicion ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Modo Edición:</strong> Puedes agregar, editar o eliminar campos dinámicos. Los cambios se guardarán cuando presiones "Guardar Cambios".
              </p>
            </div>

            <DynamicFieldsManager
              fields={camposEditados}
              onChange={setCamposEditados}
            />
          </div>
        ) : campos.length === 0 ? (
          <div className="p-12 text-center">
            <ListBullets size={64} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay campos dinámicos configurados</p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Esta categoría no tiene campos personalizados.
            </p>
            {onGuardar && (
              <Button onClick={() => setModoEdicion(true)}>
                <Plus size={16} className="mr-2" />
                Agregar Campos
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Total de campos configurados: <span className="font-medium">{campos.length}</span>
            </p>
            {campos.map((campo, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-base">{campo.nombre}</h4>
                        {campo.requerido && (
                          <Badge variant="destructive" className="text-xs">
                            <CheckCircle size={12} className="mr-1" />
                            Obligatorio
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {tiposCampo[campo.tipo] || campo.tipo}
                        </Badge>
                      </div>
                      
                      {campo.opciones && campo.opciones.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-2">Opciones disponibles:</p>
                          <div className="flex flex-wrap gap-1">
                            {campo.opciones.map((opcion, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {opcion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          {modoEdicion ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelar}
                disabled={guardando}
              >
                <X size={16} className="mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={guardando}
              >
                <FloppyDisk size={16} className="mr-2" />
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleCerrar}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
