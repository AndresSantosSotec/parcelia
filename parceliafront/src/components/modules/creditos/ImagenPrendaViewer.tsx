import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, CaretLeft, CaretRight, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'

interface ImagenPrendaViewerProps {
  imagenes: string[]
  abierto: boolean
  onCerrar: () => void
  indiceInicial?: number
}

export function ImagenPrendaViewer({ imagenes, abierto, onCerrar, indiceInicial = 0 }: ImagenPrendaViewerProps) {
  const [indiceActual, setIndiceActual] = useState(indiceInicial)
  const [zoom, setZoom] = useState(100)

  const irAnterior = () => {
    setIndiceActual((prev) => (prev > 0 ? prev - 1 : imagenes.length - 1))
    setZoom(100)
  }

  const irSiguiente = () => {
    setIndiceActual((prev) => (prev < imagenes.length - 1 ? prev + 1 : 0))
    setZoom(100)
  }

  const aumentarZoom = () => {
    setZoom((prev) => Math.min(prev + 25, 200))
  }

  const disminuirZoom = () => {
    setZoom((prev) => Math.max(prev - 25, 50))
  }

  if (imagenes.length === 0) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Imagen {indiceActual + 1} de {imagenes.length}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative flex flex-col items-center justify-center">
          {/* Controles de zoom */}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={disminuirZoom}
              disabled={zoom <= 50}
            >
              <MagnifyingGlassMinus className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium bg-background px-3 py-2 rounded-md border">
              {zoom}%
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={aumentarZoom}
              disabled={zoom >= 200}
            >
              <MagnifyingGlassPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Imagen */}
          <div className="overflow-auto max-h-[60vh] w-full flex items-center justify-center bg-muted/50 rounded-lg p-4">
            <img
              src={imagenes[indiceActual]}
              alt={`Imagen ${indiceActual + 1}`}
              style={{ 
                transform: `scale(${zoom / 100})`,
                transition: 'transform 0.2s ease-in-out',
                maxWidth: '100%',
                height: 'auto'
              }}
              className="rounded-md"
            />
          </div>

          {/* Navegación */}
          {imagenes.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={irAnterior}
              >
                <CaretLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <div className="flex gap-2">
                {imagenes.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIndiceActual(idx)
                      setZoom(100)
                    }}
                    className={`h-2 w-2 rounded-full transition-all ${
                      idx === indiceActual 
                        ? 'bg-primary w-6' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={irSiguiente}
              >
                Siguiente
                <CaretRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
