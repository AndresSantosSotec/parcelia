import { API_BASE_URL } from './config'

function apiOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '')
}

export function resolveMediaUrl(u?: string | null): string {
  if (!u) return ''
  if (u.startsWith('http') || u.startsWith('data:') || u.startsWith('blob:')) return u
  const origin = apiOrigin()
  if (u.startsWith('/api/')) return `${origin}${u}`
  if (u.startsWith('/')) return `${origin}${u}`
  return `${origin}/storage/${u}`
}

export function urlFotoLote(img?: { id?: number; url?: string; url_publica?: string } | null): string {
  if (!img) return ''
  if (img.id) return `${API_BASE_URL}/publico/media/lotes/${img.id}`
  return resolveMediaUrl(img.url_publica || img.url)
}

export function urlFichaTerreno(token?: string | null): string {
  if (!token) return ''
  return `${window.location.origin}/t/${token}`
}
