/**
 * MapPickerField — usa tiles gratuitos y open-source:
 *   - Primario:  OpenFreeMap  https://openfreemap.org/
 *   - Respaldo:  OpenStreetMap https://www.openstreetmap.org/
 * No requiere API key ni cuenta de pago.
 */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MapPin, Crosshair, Copy, Check } from '@phosphor-icons/react'

// Fix default marker icons for Vite/bundler environments
import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaPng from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIconRetinaPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

export interface GeoCoords {
  lat: number
  lng: number
}

interface MapPickerFieldProps {
  label: string
  requerido?: boolean
  value?: GeoCoords | null
  onChange: (coords: GeoCoords) => void
}

// Default center: Guatemala City
const DEFAULT_CENTER: [number, number] = [14.6349, -90.5069]
const DEFAULT_ZOOM = 12

export function MapPickerField({ label, requerido, value, onChange }: MapPickerFieldProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [copied, setCopied] = useState(false)

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const initialCenter: [number, number] = value
      ? [value.lat, value.lng]
      : DEFAULT_CENTER

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: value ? 15 : DEFAULT_ZOOM,
      zoomControl: true,
    })

    // Tiles gratuitos de OpenFreeMap (https://openfreemap.org/)
    // Respaldo: OpenStreetMap (https://www.openstreetmap.org/)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | ' +
        'Tiles por <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a>',
      maxZoom: 19,
    })

    const openFreeMapLayer = L.tileLayer(
      'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> | ' +
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
        errorTileUrl: '', // si falla un tile no rompe el mapa
      }
    )

    // Intentar OpenFreeMap primero; si falla cargar el tile, usar OSM como respaldo
    openFreeMapLayer.on('tileerror', () => {
      if (!map.hasLayer(osmLayer)) {
        map.removeLayer(openFreeMapLayer)
        osmLayer.addTo(map)
      }
    })

    openFreeMapLayer.addTo(map)

    // Agregar control de capas (opcional, permite al usuario cambiar entre proveedores)
    L.control
      .layers(
        {
          'OpenFreeMap (libre)': openFreeMapLayer,
          'OpenStreetMap (libre)': osmLayer,
        },
        {},
        { position: 'topright', collapsed: true }
      )
      .addTo(map)

    // Place initial marker if coords exist
    if (value) {
      const marker = L.marker([value.lat, value.lng], { draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })
      })
      markerRef.current = marker
    }

    // Click to place/move marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      const coords: GeoCoords = {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng])
      } else {
        const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map)
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })
        })
        markerRef.current = marker
      }
      onChange(coords)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync marker when value changes externally
  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return

    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng])
    } else {
      const marker = L.marker([value.lat, value.lng], { draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })
      })
      markerRef.current = marker
    }
    map.setView([value.lat, value.lng], map.getZoom())
  }, [value?.lat, value?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error')
      return
    }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GeoCoords = {
          lat: parseFloat(position.coords.latitude.toFixed(6)),
          lng: parseFloat(position.coords.longitude.toFixed(6)),
        }
        const map = mapRef.current
        if (map) {
          map.setView([coords.lat, coords.lng], 17)
          if (markerRef.current) {
            markerRef.current.setLatLng([coords.lat, coords.lng])
          } else {
            const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map)
            marker.on('dragend', () => {
              const pos = marker.getLatLng()
              onChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })
            })
            markerRef.current = marker
          }
        }
        onChange(coords)
        setGeoStatus('idle')
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCopyCoords = () => {
    if (!value) return
    const text = `${value.lat}, ${value.lng}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const googleMapsUrl = value
    ? `https://www.google.com/maps?q=${value.lat},${value.lng}`
    : null

  return (
    <div className="space-y-2 md:col-span-2">
      <Label className="text-sm font-medium flex items-center gap-1">
        <MapPin className="h-4 w-4 text-primary" />
        {label} {requerido && <span className="text-destructive">*</span>}
      </Label>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeolocate}
          disabled={geoStatus === 'loading'}
          className="flex items-center gap-2"
        >
          <Crosshair className={`h-4 w-4 ${geoStatus === 'loading' ? 'animate-spin' : ''}`} />
          {geoStatus === 'loading' ? 'Obteniendo...' : 'Mi Ubicación'}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyCoords}
            className="flex items-center gap-2 text-muted-foreground"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar coords'}
          </Button>
        )}
      </div>

      {geoStatus === 'error' && (
        <p className="text-xs text-destructive">
          No se pudo obtener la ubicación. Verifica los permisos del navegador.
        </p>
      )}

      {/* Map container */}
      <div
        className="rounded-lg border border-border overflow-hidden shadow-sm"
        style={{ height: '320px', width: '100%' }}
      >
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para marcar la ubicación o arrastra el pin para ajustarlo.
      </p>

      {/* Coordinate display */}
      {value ? (
        <div className="flex flex-wrap gap-3 text-sm bg-muted/40 rounded-md px-3 py-2 border border-border/50">
          <span className="font-medium text-muted-foreground">Coordenadas:</span>
          <span className="font-mono">{value.lat}, {value.lng}</span>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80 ml-auto"
            >
              Ver en Google Maps ↗
            </a>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Sin ubicación seleccionada todavía.
        </p>
      )}
    </div>
  )
}
