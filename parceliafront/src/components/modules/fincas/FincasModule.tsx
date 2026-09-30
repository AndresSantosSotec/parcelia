import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, TreeStructure, Compass, Camera, Trash, Pencil, Power, WarningCircle, MapPin, ShareNetwork, User, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { fincaService, loteService, userService, Finca, Parcela, Lote } from '@/lib/api'
import { MapPickerField, type GeoCoords } from '@/components/ui/MapPickerField'
import { urlFichaTerreno, urlFotoLote } from '@/lib/media'
import { usePermissions } from '@/hooks/use-permissions'

const PASOS_LOTE = [
  { id: 0, titulo: 'Identidad', desc: 'Número y tipo' },
  { id: 1, titulo: 'Medidas', desc: 'Área y precio' },
  { id: 2, titulo: 'Ubicación', desc: 'Fotos y mapa' },
  { id: 3, titulo: 'Publicación', desc: 'Ficha web' },
] as const

const formFincaVacio = {
  nombre: '',
  municipio: 'Guatemala',
  departamento: 'Guatemala',
  area_total_m2: 50000,
  ubicacion: '',
  numero_finca: '',
  folio: '',
  libro: '',
  descripcion: ''
}

const formLoteVacio = {
  numero_lote: '',
  area_m2: 200,
  frente_metros: 10,
  fondo_metros: 20,
  precio_m2: 450,
  precio_venta: 90000,
  tipo_terreno: 'Residencial',
  colindancias: '',
  observaciones: '',
  latitud: '' as number | '',
  longitud: '' as number | '',
  altitud: '' as number | '',
  precision_metros: '' as number | '',
  referencia_geo: '',
  publicado: true,
  vendedor_id: '' as number | '',
}

type UserSessionProp = {
  username: string
  role: string
  userData?: {
    id: string
    nombre: string
    username: string
    email: string
    rol: string
    activo: boolean
    permisos: any[]
  }
}

interface FincasModuleProps {
  userSession?: UserSessionProp
}

export function FincasModule({ userSession }: FincasModuleProps) {
  const { isAdmin } = usePermissions(userSession?.userData)
  const [fincas, setFincas] = useState<Finca[]>([])
  const [fincaSeleccionada, setFincaSeleccionada] = useState<Finca | null>(null)
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState<Parcela | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [pasoLote, setPasoLote] = useState(0)
  const [vendedores, setVendedores] = useState<Array<{ id: number; nombre: string; username: string; rol: string }>>([])

  // Modales
  const [modalFinca, setModalFinca] = useState(false)
  const [fincaEditando, setFincaEditando] = useState<Finca | null>(null)
  const [fincaADesactivar, setFincaADesactivar] = useState<Finca | null>(null)
  const [modalParcela, setModalParcela] = useState(false)
  const [modalLote, setModalLote] = useState(false)
  const [modalFotos, setModalFotos] = useState(false)
  const [loteFotos, setLoteFotos] = useState<Lote | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [fotosNuevoLote, setFotosNuevoLote] = useState<{ file: File; preview: string }[]>([])
  const [loteEditando, setLoteEditando] = useState<Lote | null>(null)
  const [loteAEliminar, setLoteAEliminar] = useState<Lote | null>(null)

  // Formularios
  const [formFinca, setFormFinca] = useState(formFincaVacio)

  const [formParcela, setFormParcela] = useState({
    nombre_identificador: '',
    codigo: '',
    area_m2: 10000,
    tipo_terreno: 'Plano',
    medidas_perimetro: '',
    colindancias: '',
    descripcion: ''
  })

  const [formLote, setFormLote] = useState(formLoteVacio)

  useEffect(() => {
    if (!isAdmin || !modalLote) return
    userService.getAll({ activo: '1', per_page: 100 })
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
        setVendedores(
          rows.map((u: any) => ({
            id: Number(u.id),
            nombre: u.nombre || u.name || u.username,
            username: u.username,
            rol: u.rol,
          }))
        )
      })
      .catch(() => setVendedores([]))
  }, [isAdmin, modalLote])

  const cargarFincas = async () => {
    setCargando(true)
    try {
      const res = await fincaService.getAll()
      if (res.success && res.data) {
        const lista = res.data
        setFincas(lista)
        setFincaSeleccionada((prev) => {
          if (lista.length === 0) return null
          if (!prev) {
            const first = lista[0]
            if (first.parcelas && first.parcelas.length > 0) {
              setParcelaSeleccionada(first.parcelas[0])
            }
            return first
          }
          const fresh = lista.find((f) => f.id === prev.id)
          if (!fresh) return prev
          setParcelaSeleccionada((parcelaPrev) => {
            if (!fresh.parcelas?.length) return null
            if (!parcelaPrev) return fresh.parcelas[0]
            return fresh.parcelas.find((p) => p.id === parcelaPrev.id) ?? fresh.parcelas[0]
          })
          return fresh
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  const cargarLotes = async () => {
    try {
      const res = await loteService.getAll({
        finca_id: fincaSeleccionada?.id,
        parcela_id: parcelaSeleccionada?.id,
        estado: filtroEstado
      })
      if (res.success && res.data) {
        setLotes(res.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    cargarFincas()
  }, [])

  useEffect(() => {
    if (fincaSeleccionada) {
      cargarLotes()
    }
  }, [fincaSeleccionada, parcelaSeleccionada, filtroEstado])

  const abrirNuevaFinca = () => {
    setFincaEditando(null)
    setFormFinca(formFincaVacio)
    setModalFinca(true)
  }

  const abrirEditarFinca = (finca: Finca, e: React.MouseEvent) => {
    e.stopPropagation()
    setFincaEditando(finca)
    setFormFinca({
      nombre: finca.nombre || '',
      municipio: finca.municipio || 'Guatemala',
      departamento: finca.departamento || 'Guatemala',
      area_total_m2: Number(finca.area_total_m2 || 0),
      ubicacion: finca.ubicacion || '',
      numero_finca: finca.numero_finca || '',
      folio: finca.folio || '',
      libro: finca.libro || '',
      descripcion: finca.descripcion || ''
    })
    setModalFinca(true)
  }

  const handleGuardarFinca = async (e: React.FormEvent) => {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    try {
      const res = fincaEditando
        ? await fincaService.update(fincaEditando.id, formFinca)
        : await fincaService.create(formFinca)
      if (res.success) {
        toast.success(fincaEditando ? 'Finca actualizada' : 'Finca registrada con éxito')
        setModalFinca(false)
        setFincaEditando(null)
        setFormFinca(formFincaVacio)
        await cargarFincas()
      }
    } catch (err: any) {
      toast.error(err?.message || (fincaEditando ? 'Error al actualizar la finca' : 'Error al registrar la finca'))
    } finally {
      setGuardando(false)
    }
  }

  const handleDesactivarFinca = async () => {
    if (!fincaADesactivar || guardando) return
    setGuardando(true)
    try {
      const res = await fincaService.desactivar(fincaADesactivar.id)
      if (res.success) {
        toast.success('Finca desactivada')
        setFincaADesactivar(null)
        await cargarFincas()
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo desactivar la finca')
    } finally {
      setGuardando(false)
    }
  }

  const handleReactivarFinca = async (finca: Finca, e: React.MouseEvent) => {
    e.stopPropagation()
    if (guardando) return
    setGuardando(true)
    try {
      const res = await fincaService.update(finca.id, { activo: true })
      if (res.success) {
        toast.success('Finca reactivada')
        await cargarFincas()
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo reactivar la finca')
    } finally {
      setGuardando(false)
    }
  }

  const handleCrearParcela = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fincaSeleccionada || guardando) return
    setGuardando(true)
    try {
      const res = await fincaService.createParcela(fincaSeleccionada.id, formParcela)
      if (res.success) {
        toast.success('Parcela / Manzana agregada exitosamente')
        setModalParcela(false)
        setFormParcela({ nombre_identificador: '', codigo: '', area_m2: 10000, tipo_terreno: 'Plano', medidas_perimetro: '', colindancias: '', descripcion: '' })
        cargarFincas()
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error al registrar la parcela')
    } finally {
      setGuardando(false)
    }
  }

  const limpiarFotosNuevoLote = () => {
    setFotosNuevoLote((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview))
      return []
    })
  }

  const abrirModalLote = () => {
    setLoteEditando(null)
    setPasoLote(0)
    setFormLote({
      ...formLoteVacio,
      vendedor_id: userSession?.userData?.id ? Number(userSession.userData.id) : '',
    })
    limpiarFotosNuevoLote()
    setModalLote(true)
  }

  const abrirEditarLote = (lote: Lote) => {
    setLoteEditando(lote)
    setPasoLote(0)
    setFormLote({
      ...formLoteVacio,
      numero_lote: lote.numero_lote,
      area_m2: Number(lote.area_m2) || 0,
      frente_metros: Number(lote.frente_metros) || 0,
      fondo_metros: Number(lote.fondo_metros) || 0,
      precio_m2: Number(lote.precio_m2) || 0,
      precio_venta: Number(lote.precio_venta) || 0,
      tipo_terreno: lote.tipo_terreno || 'Residencial',
      colindancias: lote.colindancias || '',
      observaciones: lote.observaciones || '',
      latitud: lote.latitud != null && lote.latitud !== '' ? Number(lote.latitud) : '',
      longitud: lote.longitud != null && lote.longitud !== '' ? Number(lote.longitud) : '',
      altitud: lote.altitud != null && lote.altitud !== '' ? Number(lote.altitud) : '',
      precision_metros: lote.precision_metros != null && lote.precision_metros !== '' ? Number(lote.precision_metros) : '',
      referencia_geo: lote.referencia_geo || '',
      publicado: lote.publicado !== false,
      vendedor_id: lote.vendedor_id != null ? Number(lote.vendedor_id) : '',
    })
    limpiarFotosNuevoLote()
    setModalLote(true)
  }

  const agregarFotosNuevoLote = (files: FileList | null) => {
    if (!files?.length) return
    const nuevas: { file: File; preview: string }[] = []
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} no es una imagen`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} supera 5 MB`)
        return
      }
      nuevas.push({ file, preview: URL.createObjectURL(file) })
    })
    if (nuevas.length) setFotosNuevoLote((prev) => [...prev, ...nuevas])
  }

  const quitarFotoNueva = (idx: number) => {
    setFotosNuevoLote((prev) => {
      const copy = [...prev]
      URL.revokeObjectURL(copy[idx].preview)
      copy.splice(idx, 1)
      return copy
    })
  }

  const payloadLote = (): Partial<Lote> => {
    const payload: Partial<Lote> = {
      numero_lote: formLote.numero_lote,
      area_m2: formLote.area_m2,
      frente_metros: formLote.frente_metros,
      fondo_metros: formLote.fondo_metros,
      precio_m2: formLote.precio_m2,
      precio_venta: formLote.precio_venta,
      tipo_terreno: formLote.tipo_terreno,
      colindancias: formLote.colindancias,
      observaciones: formLote.observaciones,
      publicado: formLote.publicado,
    }
    if (formLote.latitud !== '' && formLote.longitud !== '') {
      payload.latitud = formLote.latitud
      payload.longitud = formLote.longitud
    }
    if (formLote.altitud !== '') payload.altitud = formLote.altitud
    if (formLote.precision_metros !== '') payload.precision_metros = formLote.precision_metros
    payload.referencia_geo = formLote.referencia_geo.trim() || null
    if (isAdmin && formLote.vendedor_id !== '') {
      payload.vendedor_id = Number(formLote.vendedor_id)
    }
    return payload
  }

  const validarPasoLote = (paso: number): boolean => {
    if (paso === 0) {
      if (!formLote.numero_lote.trim()) {
        toast.error('Indica el número o identificador del lote')
        return false
      }
      return true
    }
    if (paso === 1) {
      if (!formLote.area_m2 || formLote.area_m2 <= 0) {
        toast.error('El área debe ser mayor a cero')
        return false
      }
      if (!formLote.precio_venta || formLote.precio_venta <= 0) {
        toast.error('Indica el precio de venta')
        return false
      }
      return true
    }
    return true
  }

  const subirFotosPendientes = async (loteId: number, yaTieneFotos: number) => {
    let fotosOk = 0
    for (let i = 0; i < fotosNuevoLote.length; i++) {
      try {
        await loteService.subirImagen(loteId, fotosNuevoLote[i].file, { es_principal: yaTieneFotos === 0 && i === 0 })
        fotosOk += 1
      } catch {
        toast.error(`No se pudo subir ${fotosNuevoLote[i].file.name}`)
      }
    }
    return fotosOk
  }

  const handleGuardarLote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loteEditando && !parcelaSeleccionada) {
      toast.error('Selecciona una parcela primero')
      return
    }
    if (guardando) return
    setGuardando(true)
    try {
      const payload = payloadLote()
      if (loteEditando) {
        const res = await loteService.update(loteEditando.id, payload)
        if (res.success && res.data) {
          const fotosOk = await subirFotosPendientes(res.data.id, loteEditando.imagenes?.length || 0)
          toast.success(fotosOk ? `Lote actualizado y ${fotosOk} foto(s) nuevas` : 'Lote actualizado')
          setModalLote(false)
          setLoteEditando(null)
          setFormLote(formLoteVacio)
          limpiarFotosNuevoLote()
          cargarLotes()
          cargarFincas()
        }
        return
      }

      const res = await fincaService.createLote(parcelaSeleccionada!.id, payload)
      if (res.success && res.data) {
        const fotosOk = await subirFotosPendientes(res.data.id, 0)
        toast.success(
          fotosNuevoLote.length
            ? `Lote registrado con ${fotosOk} foto${fotosOk === 1 ? '' : 's'}`
            : 'Lote registrado con éxito en el inventario'
        )
        setModalLote(false)
        setFormLote(formLoteVacio)
        limpiarFotosNuevoLote()
        cargarLotes()
        cargarFincas()
      }
    } catch (e: any) {
      toast.error(e?.message || (loteEditando ? 'Error al actualizar el lote' : 'Error al registrar el lote'))
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarLote = async () => {
    if (!loteAEliminar || guardando) return
    setGuardando(true)
    try {
      await loteService.eliminar(loteAEliminar.id)
      toast.success(`Lote ${loteAEliminar.numero_lote} eliminado`)
      setLoteAEliminar(null)
      cargarLotes()
      cargarFincas()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar el lote')
    } finally {
      setGuardando(false)
    }
  }

  const compartirLote = async (lote: Lote) => {
    if (!lote.token_publico) {
      toast.error('Este lote aún no tiene ficha pública. Edítalo y guarda de nuevo.')
      return
    }
    const url = urlFichaTerreno(lote.token_publico)
    window.open(url, '_blank', 'noopener,noreferrer')
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Ficha abierta y enlace copiado')
    } catch {
      toast.success('Ficha pública abierta')
    }
  }

  const urlFoto = (img: { id?: number; url: string; url_publica?: string }) => urlFotoLote(img)

  const abrirFotos = async (lote: Lote) => {
    try {
      const res = await loteService.getById(lote.id)
      setLoteFotos(res.success && res.data ? res.data : lote)
      setModalFotos(true)
    } catch {
      setLoteFotos(lote)
      setModalFotos(true)
    }
  }

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !loteFotos) return
    setSubiendoFoto(true)
    try {
      await loteService.subirImagen(loteFotos.id, file, { es_principal: (loteFotos.imagenes?.length || 0) === 0 })
      toast.success('Foto guardada en disco')
      const res = await loteService.getById(loteFotos.id)
      if (res.success && res.data) setLoteFotos(res.data)
      cargarLotes()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo subir la foto')
    } finally {
      setSubiendoFoto(false)
      e.target.value = ''
    }
  }

  const handleEliminarFoto = async (imagenId: number) => {
    if (!loteFotos) return
    try {
      await loteService.eliminarImagen(loteFotos.id, imagenId)
      toast.success('Foto desactivada')
      const res = await loteService.getById(loteFotos.id)
      if (res.success && res.data) setLoteFotos(res.data)
      cargarLotes()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo quitar la foto')
    }
  }

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Disponible</Badge>
      case 'reservado':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Reservado</Badge>
      case 'en_negociacion':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">En Negociación</Badge>
      case 'vendido':
        return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Vendido / Financiado</Badge>
      case 'pagado':
        return <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30">Escriturado / Pagado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-toolbar">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <TreeStructure size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
            <h1 className="font-bold tracking-tight">Fincas, Parcelas & Lotes</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Estructura jerárquica de proyectos inmobiliarios, administración territorial e inventario de terrenos.
          </p>
        </div>
        <div className="page-toolbar-actions">
          <Button onClick={abrirNuevaFinca} className="gap-2 shadow-sm">
            <Plus size={18} weight="bold" /> Nueva Finca
          </Button>
          {fincaSeleccionada && (
            <Button variant="outline" onClick={() => setModalParcela(true)} className="gap-2">
              <Plus size={18} weight="bold" /> Nueva Parcela
            </Button>
          )}
          {parcelaSeleccionada && (
            <Button variant="secondary" onClick={abrirModalLote} className="gap-2">
              <Plus size={18} weight="bold" /> Nuevo Lote
            </Button>
          )}
        </div>
      </div>

      {/* Selector de Fincas */}
      <div className="md:hidden space-y-2">
        {fincas.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No hay fincas registradas.</p>
        ) : fincas.map((finca) => {
          const isSelected = fincaSeleccionada?.id === finca.id
          const inactiva = finca.activo === false
          return (
            <div
              key={finca.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setFincaSeleccionada(finca)
                if (finca.parcelas && finca.parcelas.length > 0) {
                  setParcelaSeleccionada(finca.parcelas[0])
                } else {
                  setParcelaSeleccionada(null)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setFincaSeleccionada(finca)
                  if (finca.parcelas && finca.parcelas.length > 0) {
                    setParcelaSeleccionada(finca.parcelas[0])
                  } else {
                    setParcelaSeleccionada(null)
                  }
                }
              }}
              className={`w-full text-left rounded-lg border p-3 space-y-2 cursor-pointer ${isSelected ? 'bg-primary/10 border-primary/40' : 'bg-card'} ${inactiva ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[0.6875rem] text-primary">{finca.codigo}</p>
                  <p className="font-medium truncate">{finca.nombre}</p>
                  <p className="text-xs text-muted-foreground">{finca.municipio}, {finca.departamento}</p>
                </div>
                {inactiva && <Badge variant="outline" className="text-[10px] shrink-0">Inactiva</Badge>}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Number(finca.area_total_m2 || 0).toLocaleString()} m²</span>
                <span>{finca.parcelas_count ?? finca.parcelas?.length ?? 0} parcelas</span>
                <span className="text-emerald-600 font-semibold">{finca.lotes_disponibles_count ?? 0} lotes</span>
              </div>
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={(e) => abrirEditarFinca(finca, e)}>
                  <Pencil size={14} />
                </Button>
                {inactiva ? (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Reactivar" onClick={(e) => handleReactivarFinca(finca, e)}>
                    <Power size={14} className="text-emerald-600" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Desactivar"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFincaADesactivar(finca)
                    }}
                  >
                    <Power size={14} className="text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Finca</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Área m²</TableHead>
              <TableHead className="text-right">Parcelas</TableHead>
              <TableHead className="text-right">Lotes disp.</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fincas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay fincas registradas.
                </TableCell>
              </TableRow>
            ) : fincas.map((finca) => {
              const isSelected = fincaSeleccionada?.id === finca.id
              const inactiva = finca.activo === false
              return (
                <TableRow
                  key={finca.id}
                  onClick={() => {
                    setFincaSeleccionada(finca)
                    if (finca.parcelas && finca.parcelas.length > 0) {
                      setParcelaSeleccionada(finca.parcelas[0])
                    } else {
                      setParcelaSeleccionada(null)
                    }
                  }}
                  className={`cursor-pointer ${isSelected ? 'bg-primary/10' : ''} ${inactiva ? 'opacity-60' : ''}`}
                >
                  <TableCell className="font-mono text-xs">{finca.codigo}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{finca.nombre}</span>
                      {inactiva && <Badge variant="outline" className="text-[10px]">Inactiva</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {finca.municipio}, {finca.departamento}
                  </TableCell>
                  <TableCell className="text-right">{Number(finca.area_total_m2 || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{finca.parcelas_count ?? finca.parcelas?.length ?? 0}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-semibold">
                    {finca.lotes_disponibles_count ?? 0}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={(e) => abrirEditarFinca(finca, e)}>
                        <Pencil size={14} />
                      </Button>
                      {inactiva ? (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Reactivar" onClick={(e) => handleReactivarFinca(finca, e)}>
                          <Power size={14} className="text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="Desactivar"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFincaADesactivar(finca)
                          }}
                        >
                          <Power size={14} className="text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Contenedor Principal: Parcelas y Grid de Lotes */}
      {fincaSeleccionada && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Compass size={20} className="text-primary" weight="duotone" />
                  {fincaSeleccionada.nombre} — Parcelas y Lotes
                </CardTitle>
                <CardDescription className="text-xs">
                  {fincaSeleccionada.ubicacion || 'Ubicación sin especificar'} · Reg. Finca #{fincaSeleccionada.numero_finca || 'S/N'}, Folio {fincaSeleccionada.folio || '0'}, Libro {fincaSeleccionada.libro || '0'}
                </CardDescription>
              </div>

              {/* Filtro por estado de lote */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-muted-foreground">Estado:</span>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full sm:w-auto text-xs bg-background border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="todos">Todos los lotes</option>
                  <option value="disponible">Disponibles</option>
                  <option value="reservado">Reservados</option>
                  <option value="vendido">Vendidos / Financiados</option>
                  <option value="pagado">Pagados / Escriturados</option>
                </select>
              </div>
            </div>

            {/* Pestañas de Parcelas */}
            <div className="flex items-center gap-2 pt-3 overflow-x-auto">
              <button
                onClick={() => setParcelaSeleccionada(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  parcelaSeleccionada === null
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas las Parcelas ({lotes.length})
              </button>
              {fincaSeleccionada.parcelas?.map((par) => (
                <button
                  key={par.id}
                  onClick={() => setParcelaSeleccionada(par)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    parcelaSeleccionada?.id === par.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {par.nombre_identificador}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-6">
            {lotes.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <WarningCircle size={48} className="mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-base">No hay lotes registrados</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Agrega sectores o parcelas y registra lotes individuales para comenzar a comercializar.
                </p>
                {parcelaSeleccionada && (
                  <Button onClick={abrirModalLote} size="sm" className="gap-2">
                    <Plus size={16} /> Crear Primer Lote
                  </Button>
                )}
              </div>
            ) : (
              <>
              <div className="md:hidden space-y-3">
                {lotes.map((lote) => (
                  <div key={lote.id} className="border rounded-xl p-3 space-y-2 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {lote.imagenes?.[0] ? (
                          <img src={urlFoto(lote.imagenes[0])} alt="" className="h-12 w-12 rounded object-cover border shrink-0" />
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-mono font-semibold">{lote.numero_lote}</p>
                          <div className="mt-1">{getBadgeEstado(lote.estado)}</div>
                        </div>
                      </div>
                      <p className="font-medium text-sm whitespace-nowrap">
                        Q{Number(lote.precio_venta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lote.area_m2} m² · {lote.frente_metros || '—'} × {lote.fondo_metros || '—'} m
                    </p>
                    {isAdmin && (lote.vendedor || lote.vendedor_id) && (
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <User size={12} />
                        {lote.vendedor?.nombre || lote.vendedor?.name || lote.vendedor?.username || `Usuario #${lote.vendedor_id}`}
                      </p>
                    )}
                    {lote.latitud != null && lote.longitud != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${lote.latitud},${lote.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary"
                      >
                        <MapPin size={14} />
                        {Number(lote.latitud).toFixed(5)}, {Number(lote.longitud).toFixed(5)}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sin GPS</p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => abrirFotos(lote)}>
                        <Camera size={14} /> {lote.imagenes?.length ?? 0}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => abrirEditarLote(lote)}>
                        <Pencil size={14} /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => compartirLote(lote)}>
                        <ShareNetwork size={14} /> Ficha
                      </Button>
                      {['disponible', 'cancelado'].includes(lote.estado) && (
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-destructive" onClick={() => setLoteAEliminar(lote)}>
                          <Trash size={14} /> Borrar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo</TableHead>
                    {isAdmin && <TableHead>Vendedor</TableHead>}
                    <TableHead className="text-right">Área m²</TableHead>
                    <TableHead>Medidas</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Fotos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          {lote.imagenes?.[0] ? (
                            <img src={urlFoto(lote.imagenes[0])} alt="" className="h-10 w-10 rounded object-cover border" />
                          ) : null}
                          <span>{lote.numero_lote}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getBadgeEstado(lote.estado)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{lote.tipo_terreno}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-xs text-muted-foreground">
                          {lote.vendedor?.nombre || lote.vendedor?.name || lote.vendedor?.username || (lote.vendedor_id ? `#${lote.vendedor_id}` : '—')}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{lote.area_m2}</TableCell>
                      <TableCell className="text-xs">
                        {lote.frente_metros || '—'} m × {lote.fondo_metros || '—'} m
                      </TableCell>
                      <TableCell className="text-xs">
                        {lote.latitud != null && lote.longitud != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${lote.latitud},${lote.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin size={14} />
                            {Number(lote.latitud).toFixed(5)}, {Number(lote.longitud).toFixed(5)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Sin GPS</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Q{Number(lote.precio_venta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {lote.observaciones || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => abrirFotos(lote)}>
                          <Camera size={14} /> {lote.imagenes?.length ?? 0}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={() => abrirEditarLote(lote)}>
                            <Pencil size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Compartir ficha" onClick={() => compartirLote(lote)}>
                            <ShareNetwork size={14} />
                          </Button>
                          {['disponible', 'cancelado'].includes(lote.estado) && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Eliminar" onClick={() => setLoteAEliminar(lote)}>
                              <Trash size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Nueva / Editar Finca */}
      <Dialog open={modalFinca} onOpenChange={(open) => {
        setModalFinca(open)
        if (!open) {
          setFincaEditando(null)
          setFormFinca(formFincaVacio)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{fincaEditando ? 'Editar Finca' : 'Registrar Nueva Finca Matriz'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarFinca} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la Finca / Proyecto *</Label>
              <Input
                required
                placeholder="Ej. Finca Las Palmas"
                value={formFinca.nombre}
                onChange={(e) => setFormFinca({ ...formFinca, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Municipio</Label>
                <Input
                  value={formFinca.municipio}
                  onChange={(e) => setFormFinca({ ...formFinca, municipio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={formFinca.departamento}
                  onChange={(e) => setFormFinca({ ...formFinca, departamento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Total (m²)</Label>
                <Input
                  type="number"
                  value={formFinca.area_total_m2}
                  onChange={(e) => setFormFinca({ ...formFinca, area_total_m2: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>No. Finca / Registro</Label>
                <Input
                  placeholder="Ej. 1420"
                  value={formFinca.numero_finca}
                  onChange={(e) => setFormFinca({ ...formFinca, numero_finca: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ubicación / Dirección exacta</Label>
              <Input
                placeholder="Ej. Km 45 Carretera Principal"
                value={formFinca.ubicacion}
                onChange={(e) => setFormFinca({ ...formFinca, ubicacion: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalFinca(false)}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : (fincaEditando ? 'Guardar cambios' : 'Guardar Finca')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!fincaADesactivar} onOpenChange={(open) => { if (!open) setFincaADesactivar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar finca</AlertDialogTitle>
            <AlertDialogDescription>
              {fincaADesactivar
                ? `La finca «${fincaADesactivar.nombre}» dejará de estar activa. No se puede desactivar si tiene lotes reservados, vendidos o en negociación.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesactivarFinca} disabled={guardando}>
              {guardando ? 'Desactivando…' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Nueva Parcela */}
      <Dialog open={modalParcela} onOpenChange={setModalParcela}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Parcela / Manzana en {fincaSeleccionada?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearParcela} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre / Identificador del Sector *</Label>
              <Input
                required
                placeholder="Ej. Manzana A, Sector Los Pinos"
                value={formParcela.nombre_identificador}
                onChange={(e) => setFormParcela({ ...formParcela, nombre_identificador: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Estimada (m²)</Label>
                <Input
                  type="number"
                  value={formParcela.area_m2}
                  onChange={(e) => setFormParcela({ ...formParcela, area_m2: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Terreno</Label>
                <select
                  value={formParcela.tipo_terreno}
                  onChange={(e) => setFormParcela({ ...formParcela, tipo_terreno: e.target.value })}
                  className="w-full bg-background border rounded-lg p-2 text-sm"
                >
                  <option value="Plano">Plano</option>
                  <option value="Ondulado">Ondulado</option>
                  <option value="Inclinado">Inclinado con vista</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalParcela(false)}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar Parcela'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo / Editar Lote — wizard por pasos */}
      <Dialog open={modalLote} onOpenChange={(open) => {
        setModalLote(open)
        if (!open) {
          setLoteEditando(null)
          setPasoLote(0)
          setFormLote(formLoteVacio)
          limpiarFotosNuevoLote()
        }
      }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {loteEditando
                ? `Editar lote ${loteEditando.numero_lote}`
                : `Nuevo terreno · ${parcelaSeleccionada?.nombre_identificador || 'Parcela'}`}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Completa un paso a la vez.</p>
          </DialogHeader>

          <div className="flex gap-1 mb-2">
            {PASOS_LOTE.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (p.id < pasoLote || validarPasoLote(pasoLote)) setPasoLote(p.id)
                }}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  pasoLote === p.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : pasoLote > p.id
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700'
                      : 'border-border text-muted-foreground'
                }`}
              >
                <div className="text-[0.65rem] font-semibold uppercase tracking-wide">{p.titulo}</div>
                <div className="text-[0.65rem] opacity-80 hidden sm:block">{p.desc}</div>
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (pasoLote < PASOS_LOTE.length - 1) {
                if (validarPasoLote(pasoLote)) setPasoLote((p) => p + 1)
                return
              }
              if (!validarPasoLote(0) || !validarPasoLote(1)) {
                setPasoLote(0)
                return
              }
              handleGuardarLote(e)
            }}
            className="space-y-4 py-1"
          >
            {pasoLote === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número / Identificador *</Label>
                    <Input
                      required
                      placeholder="Ej. L-05"
                      value={formLote.numero_lote}
                      onChange={(e) => setFormLote({ ...formLote, numero_lote: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de terreno</Label>
                    <select
                      className="w-full bg-background border rounded-lg p-2 text-sm h-10"
                      value={formLote.tipo_terreno}
                      onChange={(e) => setFormLote({ ...formLote, tipo_terreno: e.target.value })}
                    >
                      <option value="Residencial">Residencial</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Colindancias</Label>
                  <Input
                    placeholder="Norte: Calle, Sur: Lote 10…"
                    value={formLote.colindancias}
                    onChange={(e) => setFormLote({ ...formLote, colindancias: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Input
                    placeholder="Acceso, pendiente, servicios cercanos…"
                    value={formLote.observaciones}
                    onChange={(e) => setFormLote({ ...formLote, observaciones: e.target.value })}
                  />
                </div>
              </div>
            )}

            {pasoLote === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frente (m)</Label>
                    <Input
                      type="number"
                      value={formLote.frente_metros}
                      onChange={(e) => {
                        const frente = parseFloat(e.target.value) || 0
                        const fondo = formLote.fondo_metros
                        const aprox = frente > 0 && fondo > 0 ? Math.round(frente * fondo * 100) / 100 : formLote.area_m2
                        setFormLote({
                          ...formLote,
                          frente_metros: frente,
                          area_m2: aprox,
                          precio_venta: aprox * formLote.precio_m2
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fondo (m)</Label>
                    <Input
                      type="number"
                      value={formLote.fondo_metros}
                      onChange={(e) => {
                        const fondo = parseFloat(e.target.value) || 0
                        const frente = formLote.frente_metros
                        const aprox = frente > 0 && fondo > 0 ? Math.round(frente * fondo * 100) / 100 : formLote.area_m2
                        setFormLote({
                          ...formLote,
                          fondo_metros: fondo,
                          area_m2: aprox,
                          precio_venta: aprox * formLote.precio_m2
                        })
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Área (m²) *</Label>
                    <Input
                      required
                      type="number"
                      value={formLote.area_m2}
                      onChange={(e) => {
                        const area = parseFloat(e.target.value) || 0
                        setFormLote({
                          ...formLote,
                          area_m2: area,
                          precio_venta: area * formLote.precio_m2
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio / m² (Q)</Label>
                    <Input
                      type="number"
                      value={formLote.precio_m2}
                      onChange={(e) => {
                        const pm2 = parseFloat(e.target.value) || 0
                        setFormLote({
                          ...formLote,
                          precio_m2: pm2,
                          precio_venta: formLote.area_m2 * pm2
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio venta (Q) *</Label>
                    <Input
                      required
                      type="number"
                      value={formLote.precio_venta}
                      onChange={(e) => setFormLote({ ...formLote, precio_venta: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-2">
                  Frente × fondo calcula el área. Puedes ajustar el área o el precio total a mano.
                </p>
              </div>
            )}

            {pasoLote === 2 && (
              <div className="space-y-4">
                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="flex items-center gap-2">
                    <Camera size={16} className="text-primary" />
                    Fotos del lote
                  </Label>
                  <p className="text-xs text-muted-foreground">JPEG, PNG o WebP hasta 5 MB.</p>
                  {fotosNuevoLote.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {fotosNuevoLote.map((foto, idx) => (
                        <div key={foto.preview} className="relative border rounded-lg overflow-hidden bg-muted">
                          <img src={foto.preview} alt={foto.file.name} className="h-24 w-full object-cover" />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="absolute top-1 right-1 h-7 w-7 p-0 bg-background/80"
                            onClick={() => quitarFotoNueva(idx)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Label className="cursor-pointer inline-flex">
                    <span className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2">
                      <Camera size={16} /> {fotosNuevoLote.length ? 'Agregar más' : 'Cargar fotos'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        agregarFotosNuevoLote(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </Label>
                </div>

                {modalLote && (
                  <MapPickerField
                    label="Geolocalización"
                    value={
                      formLote.latitud !== '' && formLote.longitud !== ''
                        ? { lat: Number(formLote.latitud), lng: Number(formLote.longitud) }
                        : null
                    }
                    onChange={(coords: GeoCoords) => {
                      setFormLote((prev) => ({
                        ...prev,
                        latitud: coords.lat,
                        longitud: coords.lng,
                        altitud: coords.altitud != null ? coords.altitud : prev.altitud,
                        precision_metros: coords.precision_metros != null ? coords.precision_metros : prev.precision_metros,
                      }))
                    }}
                    mapHeight={220}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitud</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formLote.latitud}
                      onChange={(e) => {
                        const v = e.target.value
                        setFormLote({ ...formLote, latitud: v === '' ? '' : parseFloat(v) })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitud</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formLote.longitud}
                      onChange={(e) => {
                        const v = e.target.value
                        setFormLote({ ...formLote, longitud: v === '' ? '' : parseFloat(v) })
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Referencia en campo</Label>
                  <Input
                    placeholder="Entrada principal, pinte rojo…"
                    value={formLote.referencia_geo}
                    onChange={(e) => setFormLote({ ...formLote, referencia_geo: e.target.value })}
                  />
                </div>
              </div>
            )}

            {pasoLote === 3 && (
              <div className="space-y-4">
                {isAdmin && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      Asignar a vendedor / asesor
                    </Label>
                    <select
                      className="w-full bg-background border rounded-lg p-2 text-sm h-10"
                      value={formLote.vendedor_id === '' ? '' : String(formLote.vendedor_id)}
                      onChange={(e) =>
                        setFormLote({
                          ...formLote,
                          vendedor_id: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">— Yo / sin reasignar —</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} ({v.username}) · {v.rol}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="publicado-lote"
                    type="checkbox"
                    checked={formLote.publicado}
                    onChange={(e) => setFormLote({ ...formLote, publicado: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="publicado-lote">Publicar ficha web (fotos y ubicación)</Label>
                </div>

                <div className="rounded-lg border p-3 text-xs space-y-1 bg-muted/30">
                  <p><strong>Resumen:</strong> Lote {formLote.numero_lote || '—'} · {formLote.tipo_terreno}</p>
                  <p>{formLote.area_m2} m² · Q{Number(formLote.precio_venta).toLocaleString('es-GT')}</p>
                  <p>{fotosNuevoLote.length} foto(s) · {formLote.latitud !== '' ? 'Con GPS' : 'Sin GPS'}</p>
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setModalLote(false)}>Cancelar</Button>
                {pasoLote > 0 && (
                  <Button type="button" variant="ghost" className="gap-1" onClick={() => setPasoLote((p) => p - 1)}>
                    <CaretLeft size={16} /> Atrás
                  </Button>
                )}
              </div>
              {pasoLote < PASOS_LOTE.length - 1 ? (
                <Button type="submit" className="gap-1">
                  Siguiente <CaretRight size={16} />
                </Button>
              ) : (
                <Button type="submit" disabled={guardando}>
                  {guardando ? 'Guardando…' : (loteEditando ? 'Guardar cambios' : 'Registrar terreno')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!loteAEliminar} onOpenChange={(open) => { if (!open) setLoteAEliminar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lote {loteAEliminar?.numero_lote}</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará del inventario. No se puede borrar si ya tiene una negociación activa o está vendido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminarLote} disabled={guardando}>
              {guardando ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={modalFotos} onOpenChange={setModalFotos}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Fotos del lote {loteFotos?.codigo_unico || loteFotos?.numero_lote}</DialogTitle>
          </DialogHeader>
          {loteFotos?.latitud != null && loteFotos?.longitud != null && (
            <p className="text-xs">
              <a
                href={`https://www.google.com/maps?q=${loteFotos.latitud},${loteFotos.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <MapPin size={14} />
                {Number(loteFotos.latitud).toFixed(6)}, {Number(loteFotos.longitud).toFixed(6)}
              </a>
              {loteFotos.referencia_geo ? ` · ${loteFotos.referencia_geo}` : ''}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Se guardan en disco, no en la base de datos. JPEG, PNG o WebP hasta 5 MB.</p>
          <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto py-2">
            {(loteFotos?.imagenes || []).map((img) => (
              <div key={img.id} className="relative border rounded-lg overflow-hidden bg-muted">
                <img src={urlFoto(img)} alt={img.descripcion || 'Lote'} className="h-36 w-full object-cover" />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-7 w-7 p-0 bg-background/80"
                  onClick={() => handleEliminarFoto(img.id)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-between">
            <Label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2">
                <Camera size={16} /> {subiendoFoto ? 'Subiendo…' : 'Subir foto'}
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={subiendoFoto} onChange={handleSubirFoto} />
            </Label>
            <Button type="button" variant="outline" onClick={() => setModalFotos(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
