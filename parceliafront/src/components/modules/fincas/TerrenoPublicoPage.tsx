import { useEffect, useState } from 'react'
import { MapPin, TreeStructure, WhatsappLogo, Copy, Check, ArrowLeft } from '@phosphor-icons/react'
import { MapPickerField } from '@/components/ui/MapPickerField'
import { loteService, type TerrenoPublico } from '@/lib/api'
import { urlFotoLote } from '@/lib/media'
import { Button } from '@/components/ui/button'

export function TerrenoPublicoPage({ token }: { token: string }) {
  const [terreno, setTerreno] = useState<TerrenoPublico | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [fotoActiva, setFotoActiva] = useState(0)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let cancel = false
    setCargando(true)
    loteService.getPublico(token)
      .then((res) => {
        if (cancel) return
        if (res.success && res.data) {
          setTerreno(res.data)
          setError(null)
        } else {
          setError(res.message || 'No se encontró este terreno.')
        }
      })
      .catch((err: any) => {
        if (!cancel) setError(err?.message || 'No se pudo cargar la ficha del terreno.')
      })
      .finally(() => {
        if (!cancel) setCargando(false)
      })
    return () => { cancel = true }
  }, [token])

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !terreno) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
        <TreeStructure size={48} className="text-muted-foreground" />
        <h1 className="text-xl font-semibold">Terreno no disponible</h1>
        <p className="text-sm text-muted-foreground max-w-md">{error || 'El enlace no es válido o el lote ya no está publicado.'}</p>
        <a href="/" className="text-primary text-sm underline">Volver al inicio</a>
      </div>
    )
  }

  const fotos = terreno.imagenes || []
  const principal = fotos[fotoActiva] || fotos[0]
  const lat = terreno.latitud != null ? Number(terreno.latitud) : null
  const lng = terreno.longitud != null ? Number(terreno.longitud) : null
  const precio = Number(terreno.precio_venta || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })
  const textoWhatsapp = encodeURIComponent(
    `Te comparto este terreno ${terreno.numero_lote} en ${terreno.proyecto?.nombre || 'TerraCloud'} — Q${precio}. ${window.location.href}`
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TreeStructure size={22} className="text-primary shrink-0" weight="duotone" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">TerraCloud</p>
              <h1 className="text-sm sm:text-base font-semibold truncate">
                {terreno.proyecto?.nombre || 'Terreno'} · {terreno.numero_lote}
              </h1>
            </div>
          </div>
          <a href="/" className="text-xs sm:text-sm text-muted-foreground inline-flex items-center gap-1 shrink-0">
            <ArrowLeft size={14} /> Inicio
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border bg-muted aspect-[4/3]">
              {principal ? (
                <img
                  src={urlFotoLote(principal)}
                  alt={principal.descripcion || terreno.numero_lote}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sin fotografías todavía
                </div>
              )}
            </div>
            {fotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {fotos.map((foto, idx) => (
                  <button
                    key={`${foto.url}-${idx}`}
                    type="button"
                    onClick={() => setFotoActiva(idx)}
                    className={`shrink-0 h-16 w-20 rounded-md overflow-hidden border ${idx === fotoActiva ? 'ring-2 ring-primary' : ''}`}
                  >
                    <img src={urlFotoLote(foto)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {terreno.parcela} · {terreno.tipo_terreno}
              </p>
              <h2 className="text-2xl font-bold mt-1">Lote {terreno.numero_lote}</h2>
              <p className="text-3xl font-semibold text-primary mt-2">Q{precio}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {terreno.disponible ? 'Disponible para venta' : terreno.estado_comercial}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <dt className="text-muted-foreground text-xs">Área</dt>
                <dd className="font-medium">{Number(terreno.area_m2).toLocaleString('es-GT')} m²</dd>
              </div>
              <div className="border rounded-lg p-3">
                <dt className="text-muted-foreground text-xs">Medidas</dt>
                <dd className="font-medium">{terreno.frente_metros || '—'} × {terreno.fondo_metros || '—'} m</dd>
              </div>
              <div className="border rounded-lg p-3 col-span-2">
                <dt className="text-muted-foreground text-xs">Ubicación</dt>
                <dd className="font-medium">
                  {[terreno.proyecto?.ubicacion, terreno.proyecto?.municipio, terreno.proyecto?.departamento]
                    .filter(Boolean)
                    .join(' · ') || 'Guatemala'}
                </dd>
              </div>
            </dl>

            {terreno.colindancias && (
              <p className="text-sm"><span className="text-muted-foreground">Colindancias: </span>{terreno.colindancias}</p>
            )}
            {terreno.observaciones && (
              <p className="text-sm text-muted-foreground">{terreno.observaciones}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={copiarEnlace} variant="outline" className="gap-2">
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? 'Enlace copiado' : 'Copiar ficha'}
              </Button>
              <a
                href={`https://wa.me/?text=${textoWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-[#25D366] text-white text-sm font-medium"
              >
                <WhatsappLogo size={16} /> WhatsApp
              </a>
              {lat != null && lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm"
                >
                  <MapPin size={16} /> Google Maps
                </a>
              )}
            </div>
          </div>
        </div>

        {lat != null && lng != null ? (
          <div className="border rounded-xl p-3 sm:p-4">
            <MapPickerField
              label={terreno.referencia_geo || 'Geolocalización del terreno'}
              value={{ lat, lng }}
              onChange={() => {}}
              readOnly
              mapHeight={280}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Este lote aún no tiene coordenadas GPS.</p>
        )}
      </main>
    </div>
  )
}
