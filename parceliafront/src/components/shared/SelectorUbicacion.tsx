import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { geoNamesService, type Departamento, type Municipio } from '@/lib/api'

const campo = 'mt-1 flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm text-popover-foreground'

function normalizar(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function listaDe<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data
  }
  return []
}

export function claveUbicacion(campo: { nombre: string; label?: string }): 'departamento' | 'municipio' | null {
  const texto = `${campo.nombre} ${campo.label || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (texto.includes('departamento')) return 'departamento'
  if (texto.includes('municipio')) return 'municipio'
  return null
}

export function SelectorUbicacion({
  departamento,
  municipio,
  onChange,
  disabled,
  requerido,
}: {
  departamento: string
  municipio: string
  onChange: (valor: { departamento: string; municipio: string }) => void
  disabled?: boolean
  requerido?: boolean
}) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [municipioId, setMunicipioId] = useState<number | ''>('')

  useEffect(() => {
    geoNamesService.getDepartamentos()
      .then((res) => setDepartamentos(listaDe<Departamento>(res.data)))
      .catch(() => setDepartamentos([]))
  }, [])

  useEffect(() => {
    if (!departamentos.length) return
    const encontrado = departamentos.find((item) => normalizar(item.name) === normalizar(departamento || ''))
    if (!encontrado) {
      setDepartamentoId('')
      setMunicipios([])
      setMunicipioId('')
      return
    }
    if (departamentoId === encontrado.geonameId) return
    setDepartamentoId(encontrado.geonameId)
    geoNamesService.getMunicipios(encontrado.geonameId)
      .then((res) => {
        const lista = listaDe<Municipio>(res.data)
        setMunicipios(lista)
        const muni = lista.find((item) => normalizar(item.name) === normalizar(municipio || ''))
        setMunicipioId(muni?.geonameId || '')
      })
      .catch(() => setMunicipios([]))
  }, [departamento, departamentos])

  useEffect(() => {
    if (!municipios.length || !municipio) return
    const muni = municipios.find((item) => normalizar(item.name) === normalizar(municipio))
    if (muni) setMunicipioId(muni.geonameId)
  }, [municipio, municipios])

  async function cambiarDepartamento(id: string) {
    const numero = Number(id)
    const elegido = departamentos.find((item) => item.geonameId === numero)
    setDepartamentoId(numero || '')
    setMunicipioId('')
    setMunicipios([])
    onChange({ departamento: elegido?.name || '', municipio: '' })
    if (!numero) return
    const res = await geoNamesService.getMunicipios(numero)
    setMunicipios(listaDe<Municipio>(res.data))
  }

  function cambiarMunicipio(id: string) {
    const numero = Number(id)
    const elegido = municipios.find((item) => item.geonameId === numero)
    setMunicipioId(numero || '')
    onChange({ departamento, municipio: elegido?.name || '' })
  }

  return (
    <>
      <div>
        <Label>Departamento{requerido ? ' *' : ''}</Label>
        <select className={campo} value={departamentoId} disabled={disabled || departamentos.length === 0} onChange={(e) => cambiarDepartamento(e.target.value)}>
          <option value="">{departamentos.length === 0 ? 'Cargando departamentos...' : 'Selecciona el departamento'}</option>
          {departamento && !departamentoId && <option value="actual">{departamento}</option>}
          {departamentos.map((item) => (
            <option key={item.geonameId} value={item.geonameId}>{item.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Municipio{requerido ? ' *' : ''}</Label>
        <select className={campo} value={municipioId} disabled={disabled || !departamentoId} onChange={(e) => cambiarMunicipio(e.target.value)}>
          <option value="">{departamentoId ? 'Selecciona el municipio' : 'Primero elige el departamento'}</option>
          {municipio && !municipioId && <option value="actual">{municipio}</option>}
          {municipios.map((item) => (
            <option key={item.geonameId} value={item.geonameId}>{item.name}</option>
          ))}
        </select>
      </div>
    </>
  )
}
