const CACHE = 'terracloud-shell-v3'
const SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.webmanifest']).catch(() => undefined))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/storage')) return
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@')) return

  if (request.mode === 'navigate') {
    event.respondWith(abrirAplicacion(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(desdeCache(request))
  }
})

async function abrirAplicacion(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(SHELL, response.clone()).catch(() => undefined)
    return response
  } catch {
    return (await cache.match(SHELL)) || (await cache.match('/')) || fetch(request)
  }
}

async function desdeCache(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  // Solo cachear archivos reales (no el index.html que devuelve el servidor cuando el chunk ya no existe)
  const tipo = response.headers.get('content-type') || ''
  if (response.ok && !tipo.includes('text/html')) {
    cache.put(request, response.clone()).catch(() => undefined)
  }
  return response
}
