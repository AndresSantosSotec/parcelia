/**
 * Resuelve la URL absoluta para imágenes y documentos almacenados en Laravel
 */
export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string' || path.trim() === '') return null
  if (path.startsWith('data:image') || path.startsWith('blob:')) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  if (cleanPath.startsWith('storage/')) {
    return `http://127.0.0.1:8000/${cleanPath}`
  }
  return `http://127.0.0.1:8000/storage/${cleanPath}`
}
