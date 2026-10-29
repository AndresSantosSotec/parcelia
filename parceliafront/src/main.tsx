import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { instalarRecuperacionDeChunks } from './lib/chunk-reload'

import "./main.css"
import "./styles/theme.css"
import "./index.css"
import "./styles/responsive-enhanced.css"

instalarRecuperacionDeChunks()

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      let recargando = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recargando) return
        recargando = true
        window.location.reload()
      })
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    })
  } else {
    navigator.serviceWorker.getRegistrations()
      .then((registros) => Promise.all(registros.map((registro) => registro.unregister())))
      .catch(() => undefined)
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
