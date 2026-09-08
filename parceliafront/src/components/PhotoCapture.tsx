import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PhotoCaptureProps {
  value?: string
  onChange: (base64: string) => void
  label?: string
}

export function PhotoCapture({ value, onChange, label = 'Fotografía' }: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (value) {
      setPreview(value)
    }
  }, [value])

  // Limpiar stream cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe exceder 5MB')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setPreview(base64)
      onChange(base64)
    }
    reader.readAsDataURL(file)
  }

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCapturing(true)
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      console.error('Error accediendo a la cámara:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const base64 = canvas.toDataURL('image/jpeg', 0.8)
    setPreview(base64)
    onChange(base64)
    stopCamera()
  }

  const removePhoto = () => {
    setPreview(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>
      
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      {!preview && !isCapturing && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={startCamera}
            className="flex items-center gap-2"
          >
            <Camera size={20} />
            Abrir Cámara
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload size={20} />
            Cargar Imagen
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      <Dialog open={isCapturing} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Capturar Fotografía</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                style={{ maxHeight: '70vh' }}
              />
              {!streamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Camera size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Iniciando cámara...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={stopCamera}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={!streamRef.current}
                className="min-w-[120px]"
              >
                <Camera size={20} className="mr-2" />
                Capturar Foto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {preview && !isCapturing && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="relative bg-muted rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-80 object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={removePhoto}
                className="flex items-center gap-2"
              >
                <X size={20} />
                Eliminar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={startCamera}
                className="flex items-center gap-2"
              >
                <Camera size={20} />
                Tomar Otra
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload size={20} />
                Cambiar Imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </Card>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

