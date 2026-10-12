import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function tipoDe(archivo: Blob, nombre: string) {
  const mime = archivo.type || ''
  const extension = nombre.split('.').pop()?.toLowerCase() || ''
  if (mime.includes('pdf') || extension === 'pdf') return 'pdf'
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) return 'imagen'
  return 'otro'
}

export function MarcoDocumento({ archivo, nombre, alto = 'h-[70vh]' }: { archivo: Blob; nombre: string; alto?: string }) {
  const [url, setUrl] = useState('')
  const tipo = tipoDe(archivo, nombre)

  useEffect(() => {
    const blob = tipo === 'pdf' && archivo.type !== 'application/pdf' ? new Blob([archivo], { type: 'application/pdf' }) : archivo
    const enlace = URL.createObjectURL(blob)
    setUrl(enlace)
    return () => URL.revokeObjectURL(enlace)
  }, [archivo, tipo])

  if (!url) return null
  if (tipo === 'pdf') return <iframe title={nombre} src={url} className={`w-full rounded-md border ${alto}`} />
  if (tipo === 'imagen') return <img src={url} alt={nombre} className={`mx-auto max-w-full rounded-md border object-contain ${alto}`} />
  return (
    <div className="rounded-md border p-4 text-sm">
      <p>Este tipo de archivo no se puede mostrar aquí.</p>
      <a className="text-primary underline" href={url} download={nombre}>Descargar {nombre}</a>
    </div>
  )
}

export function VistaPreviaDocumento({
  abierto,
  onCerrar,
  archivo,
  nombre,
  onDescargar,
  acciones,
}: {
  abierto: boolean
  onCerrar: () => void
  archivo: Blob | null
  nombre: string
  onDescargar?: () => void
  acciones?: ReactNode
}) {
  return (
    <Dialog open={abierto} onOpenChange={(valor) => { if (!valor) onCerrar() }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{nombre}</DialogTitle>
        </DialogHeader>
        {archivo ? <MarcoDocumento archivo={archivo} nombre={nombre} /> : <p className="text-sm text-muted-foreground">Cargando documento...</p>}
        {(onDescargar || acciones) && (
          <div className="flex justify-end gap-2">
            {onDescargar && <Button size="sm" variant="outline" onClick={onDescargar}>Descargar</Button>}
            {acciones}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
