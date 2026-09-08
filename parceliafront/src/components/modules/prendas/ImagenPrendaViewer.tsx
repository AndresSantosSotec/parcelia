import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

interface ImagenPrendaViewerProps {
  imagenes: string[]
  abierto: boolean
  onCerrar: () => void
}

export function ImagenPrendaViewer({ imagenes, abierto, onCerrar }: ImagenPrendaViewerProps) {
  const [indiceActual, setIndiceActual] = useState(0)

  useEffect(() => {
    if (abierto && imagenes.length > 0) {
      setIndiceActual(0)
    }
  }, [abierto, imagenes])

  const imagenActual = imagenes[indiceActual]

  const imagenAnterior = () => {
    setIndiceActual((prev) => (prev > 0 ? prev - 1 : imagenes.length - 1))
  }

  const imagenSiguiente = () => {
    setIndiceActual((prev) => (prev < imagenes.length - 1 ? prev + 1 : 0))
  }

  if (!abierto || imagenes.length === 0) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>
            Imágenes de la Prenda ({indiceActual + 1} de {imagenes.length})
          </DialogTitle>
        </DialogHeader>

        <div className="relative px-6 pb-6">
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {imagenActual ? (
              <img
                src={imagenActual}
                alt={`Imagen ${indiceActual + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Imagen no disponible
              </div>
            )}

            {imagenes.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={imagenAnterior}
                >
                  <CaretLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={imagenSiguiente}
                >
                  <CaretRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {imagenes.length > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              {imagenes.map((_, index) => (
                <button
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === indiceActual ? 'bg-primary w-8' : 'bg-muted-foreground/30 w-2'
                  }`}
                  onClick={() => setIndiceActual(index)}
                  aria-label={`Ir a imagen ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
