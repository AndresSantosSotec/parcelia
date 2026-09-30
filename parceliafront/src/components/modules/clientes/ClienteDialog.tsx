import { useState, useEffect, useRef, useCallback } from 'react'
import { Cliente, ClienteReferencia } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validarDPI, validarTelefono } from '@/lib/helpers'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Camera, Upload, X, User, Aperture, VideoCamera, FloppyDisk, Trash, Clock, CaretDown, CaretUp } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sucursalService, geoNamesService, Departamento, Municipio, clienteDraftService, ClienteBorrador } from '@/lib/api'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ClienteDialogProps {
  abierto: boolean
  onCerrar: () => void
  onGuardar: (cliente: Cliente) => void
  cliente?: Cliente
  loading?: boolean
}

export function ClienteDialog({ abierto, onCerrar, onGuardar, cliente, loading }: ClienteDialogProps) {
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nombres: '',
    apellidos: '',
    dpi: '',
    nit: '',
    fechaNacimiento: '',
    genero: 'masculino',
    estadoCivil: '',
    profesion: '',
    telefono: '',
    telefonoSecundario: '',
    email: '',
    direccion: '',
    fotografia: '',
    estado: 'activo',
    sucursal: '',
    tipoCliente: 'regular',
    notas: '',
    referencias: [],
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [capturandoFoto, setCapturandoFoto] = useState(false)
  const [camaraLista, setCamaraLista] = useState(false)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [sucursales, setSucursales] = useState<Array<{ id: string; codigo: string; nombre: string }>>([])
  const [cargandoSucursales, setCargandoSucursales] = useState(false)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false)
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false)
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<number | null>(null)
  
  // Obtener sucursal activa del usuario desde localStorage
  const [sucursalActiva] = useKV<string | null>('sucursal-activa', null)
  // Trigger compartido para refrescar sucursales cuando cambian en otros módulos
  const [refrescarSucursalesTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)
  
  // ── Borradores ───────────────────────────────────────────────────────────
  const [borradores, setBorradores] = useState<ClienteBorrador[]>([])
  const [borradorActualId, setBorradorActualId] = useState<number | null>(null)
  const [guardandoBorrador, setGuardandoBorrador] = useState(false)
  const [mostrarBorradores, setMostrarBorradores] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cargar borradores al abrir (solo en modo creación)
  useEffect(() => {
    if (abierto && !cliente) {
      clienteDraftService.getAll()
        .then((res: any) => {
          const lista: ClienteBorrador[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
          setBorradores(lista)
          if (lista.length > 0) setMostrarBorradores(true)
        })
        .catch(() => setBorradores([]))
    }
    if (!abierto) {
      setBorradores([])
      setBorradorActualId(null)
      setMostrarBorradores(false)
    }
  }, [abierto, cliente])

  const handleGuardarBorrador = useCallback(async () => {
    setGuardandoBorrador(true)
    try {
      const datos = { ...formData, _fotoPreview: fotoPreview }
      let res: any
      if (borradorActualId) {
        res = await clienteDraftService.update(borradorActualId, datos)
      } else {
        res = await clienteDraftService.create(datos)
      }
      const guardado: ClienteBorrador = res?.data ?? res
      setBorradorActualId(guardado.id)
      setBorradores(prev => {
        const filtered = prev.filter(b => b.id !== guardado.id)
        return [guardado, ...filtered]
      })
      toast.success('Borrador guardado')
    } catch {
      toast.error('Error al guardar borrador')
    } finally {
      setGuardandoBorrador(false)
    }
  }, [formData, fotoPreview, borradorActualId])

  const handleCargarBorrador = (borrador: ClienteBorrador) => {
    const { _fotoPreview, ...datos } = borrador.datos as any
    setFormData(datos)
    if (_fotoPreview) setFotoPreview(_fotoPreview)
    setBorradorActualId(borrador.id)
    setMostrarBorradores(false)
    toast.success(`Borrador "${borrador.titulo}" cargado`)
  }

  const handleEliminarBorrador = async (id: number) => {
    try {
      await clienteDraftService.delete(id)
      setBorradores(prev => prev.filter(b => b.id !== id))
      if (borradorActualId === id) setBorradorActualId(null)
      toast.success('Borrador eliminado')
    } catch {
      toast.error('Error al eliminar borrador')
    }
  }

  // Cargar sucursales activas y departamentos
  useEffect(() => {
    if (abierto) {
      // Cargar sucursales
      setCargandoSucursales(true)
      sucursalService.getActivas()
        .then(response => {
          if (response.success && response.data) {
            // La respuesta es { success: true, data: [...] }
            const listaSucursales = Array.isArray(response.data) ? response.data : []
            // console.log('Sucursales cargadas:', listaSucursales)
            setSucursales(listaSucursales)
            // Si hay sucursal activa del usuario y no hay sucursal seleccionada, seleccionarla
            if (sucursalActiva && !formData.sucursal && listaSucursales.length > 0) {
              const sucursalEncontrada = listaSucursales.find((s: any) => s.codigo === sucursalActiva)
              if (sucursalEncontrada) {
                setFormData(prev => ({ ...prev, sucursal: sucursalActiva }))
              }
            }
          } else {
            console.warn('Respuesta de sucursales sin datos:', response)
            setSucursales([])
          }
        })
        .catch(error => {
          console.error('Error cargando sucursales:', error)
          setSucursales([])
        })
        .finally(() => {
          setCargandoSucursales(false)
        })

      // Cargar departamentos de Guatemala
      setCargandoDepartamentos(true)
      geoNamesService.getDepartamentos()
        .then(response => {
          if (response.success && response.data) {
            setDepartamentos(response.data)
          }
        })
        .catch(error => {
          console.error('Error cargando departamentos:', error)
        })
        .finally(() => {
          setCargandoDepartamentos(false)
        })
    }
  }, [abierto, refrescarSucursalesTrigger])

  const cargarMunicipios = async (departamentoId: number) => {
    setCargandoMunicipios(true)
    try {
      const response = await geoNamesService.getMunicipios(departamentoId)
      if (response.success && response.data) {
        setMunicipios(response.data)
      }
    } catch (error) {
      console.error('Error cargando municipios:', error)
    } finally {
      setCargandoMunicipios(false)
    }
  }

  const handleDepartamentoChange = (geonameId: string) => {
    if (geonameId === 'ninguno') {
      setDepartamentoSeleccionado(null)
      setFormData({ 
        ...formData, 
        departamentoGeonameId: undefined,
        municipioGeonameId: undefined,
        municipio: undefined
      })
      setMunicipios([])
      return
    }

    const id = parseInt(geonameId)
    setDepartamentoSeleccionado(id)
    setFormData({ 
      ...formData, 
      departamentoGeonameId: id,
      municipioGeonameId: undefined,
      municipio: undefined
    })
    setMunicipios([])
    if (id) {
      cargarMunicipios(id)
    }
  }

  const handleMunicipioChange = (geonameId: string) => {
    if (geonameId === 'ninguno') {
      setFormData({ 
        ...formData, 
        municipioGeonameId: undefined,
        municipio: undefined
      })
      return
    }

    const id = parseInt(geonameId)
    const municipio = municipios.find(m => m.geonameId === id)
    setFormData({ 
      ...formData, 
      municipioGeonameId: id,
      municipio: municipio?.name || ''
    })
  }

  useEffect(() => {
    if (cliente) {
      setFormData(cliente)
      setFotoPreview(cliente.fotografia || null)
    } else {
      setFormData({
        nombres: '',
        apellidos: '',
        dpi: '',
        nit: '',
        fechaNacimiento: '',
        genero: 'masculino',
        estadoCivil: '',
        profesion: '',
        telefono: '',
        telefonoSecundario: '',
        email: '',
        direccion: '',
        fotografia: '',
        estado: 'activo',
        sucursal: '',
        tipoCliente: 'regular',
        notas: '',
        referencias: [],
      })
      setFotoPreview(null)
      setDepartamentoSeleccionado(null)
      setMunicipios([])
    }
    setErrores({})
    setErrorFoto(null)
    setCapturandoFoto(false)
    setCamaraLista(false)
  }, [cliente, abierto])

  // Limpiar stream cuando el componente se desmonte o se cierre el modal
  useEffect(() => {
    if (!abierto && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setCapturandoFoto(false)
      setCamaraLista(false)
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [abierto])

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {}
    
    if (!formData.nombres?.trim()) nuevosErrores.nombres = 'Requerido'
    if (!formData.apellidos?.trim()) nuevosErrores.apellidos = 'Requerido'
    if (!formData.dpi?.trim()) {
      nuevosErrores.dpi = 'Requerido'
    } else if (!validarDPI(formData.dpi)) {
      nuevosErrores.dpi = 'DPI inválido (13 dígitos)'
    }
    if (!formData.fechaNacimiento) nuevosErrores.fechaNacimiento = 'Requerido'
    if (!formData.telefono?.trim()) {
      nuevosErrores.telefono = 'Requerido'
    } else if (!validarTelefono(formData.telefono)) {
      nuevosErrores.telefono = 'Teléfono inválido (8 dígitos)'
    }
    if (!formData.direccion?.trim()) nuevosErrores.direccion = 'Requerido'

    // Validar referencias: si se llena alguno de los campos, nombre y teléfono son obligatorios
    if (Array.isArray(formData.referencias)) {
      formData.referencias.forEach((ref, index) => {
        const nombre = ref?.nombre?.trim() || ''
        const telefono = ref?.telefono?.trim() || ''

        if (nombre === '' && telefono === '' && !(ref?.relacion?.trim())) {
          return
        }

        if (nombre === '') {
          nuevosErrores[`referencia_nombre_${index}`] = 'Nombre requerido'
        }
        if (telefono === '') {
          nuevosErrores[`referencia_telefono_${index}`] = 'Teléfono requerido'
        } else if (!validarTelefono(telefono)) {
          nuevosErrores[`referencia_telefono_${index}`] = 'Teléfono inválido (8 dígitos)'
        }
      })
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return

    const referenciasLimpias: ClienteReferencia[] = Array.isArray(formData.referencias)
      ? formData.referencias
          .map(ref => ({
            nombre: (ref?.nombre || '').trim(),
            telefono: (ref?.telefono || '').trim(),
            relacion: ref?.relacion?.trim() || undefined,
          }))
          .filter(ref => ref.nombre !== '' && ref.telefono !== '')
      : []

    const clienteData: Cliente = {
      id: cliente?.id || `cliente-${Date.now()}`,
      nombres: formData.nombres!,
      apellidos: formData.apellidos!,
      dpi: formData.dpi!,
      nit: formData.nit,
      fechaNacimiento: formData.fechaNacimiento!,
      genero: formData.genero as 'masculino' | 'femenino' | 'otro',
      estadoCivil: formData.estadoCivil,
      profesion: formData.profesion,
      telefono: formData.telefono!,
      telefonoSecundario: formData.telefonoSecundario,
      email: formData.email,
      direccion: formData.direccion!,
      fotografia: fotoPreview || formData.fotografia,
      estado: formData.estado as 'activo' | 'inactivo',
      sucursal: formData.sucursal,
      tipoCliente: formData.tipoCliente as 'regular' | 'vip',
      notas: formData.notas,
      referencias: referenciasLimpias,
      eliminado: false,
      creadoEn: cliente?.creadoEn || new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    }

    // Auto-eliminar el borrador si el cliente se guardó exitosamente
    if (borradorActualId) {
      clienteDraftService.delete(borradorActualId).catch(() => {})
      setBorradorActualId(null)
    }

    onGuardar(clienteData)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorFoto('Por favor selecciona un archivo de imagen')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorFoto('La imagen no debe exceder 5MB')
      return
    }

    setErrorFoto(null)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setFotoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const startCamera = async () => {
    try {
      setErrorFoto(null)
      setCamaraLista(false)
      setCapturandoFoto(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setCamaraLista(true)
        }
      }
    } catch (err) {
      setErrorFoto('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
      setCapturandoFoto(false)
      console.error('Error accediendo a la cámara:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCapturandoFoto(false)
    setCamaraLista(false)
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

    const base64 = canvas.toDataURL('image/jpeg', 0.9)
    setFotoPreview(base64)
    stopCamera()
  }

  const removePhoto = () => {
    setFotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="!w-[min(1200px,calc(100vw-1rem))] !max-w-[calc(100vw-1rem)] !max-h-[92dvh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            {!cliente && (
              <div className="flex items-center gap-2 shrink-0">
                {borradores.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-amber-600 border-amber-400 hover:bg-amber-50"
                    onClick={() => setMostrarBorradores(v => !v)}
                  >
                    <Clock size={15} />
                    Borradores
                    <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs px-1.5 py-0">
                      {borradores.length}
                    </Badge>
                    {mostrarBorradores ? <CaretUp size={13} /> : <CaretDown size={13} />}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleGuardarBorrador}
                  disabled={guardandoBorrador}
                >
                  <FloppyDisk size={15} />
                  {guardandoBorrador ? 'Guardando...' : borradorActualId ? 'Actualizar borrador' : 'Guardar borrador'}
                </Button>
              </div>
            )}
          </div>

          {/* Panel de borradores */}
          {!cliente && mostrarBorradores && borradores.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Borradores guardados ({borradores.length}/{6}) — haz clic en uno para continuar
              </p>
              {borradores.map(b => (
                <div key={b.id} className="flex items-center gap-2 rounded-md bg-background border px-3 py-2 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{b.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.updated_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleCargarBorrador(b)}
                  >
                    Continuar
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleEliminarBorrador(b.id)}
                  >
                    <Trash size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="datos" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0">
              <TabsTrigger value="datos" className="text-xs sm:text-sm">Datos Personales</TabsTrigger>
              <TabsTrigger value="contacto" className="text-xs sm:text-sm">Contacto</TabsTrigger>
              <TabsTrigger value="referencias" className="text-xs sm:text-sm">Referencias</TabsTrigger>
              <TabsTrigger value="adicional" className="text-xs sm:text-sm">Adicional y Foto</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2">
              <TabsContent value="datos" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombres">Nombres *</Label>
                    <Input
                      id="nombres"
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      className={errores.nombres ? 'border-destructive' : ''}
                      placeholder="Juan Carlos"
                    />
                    {errores.nombres && <p className="text-xs text-destructive">{errores.nombres}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellidos">Apellidos *</Label>
                    <Input
                      id="apellidos"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      className={errores.apellidos ? 'border-destructive' : ''}
                      placeholder="Pérez López"
                    />
                    {errores.apellidos && <p className="text-xs text-destructive">{errores.apellidos}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dpi">DPI *</Label>
                    <Input
                      id="dpi"
                      value={formData.dpi}
                      onChange={(e) => setFormData({ ...formData, dpi: e.target.value })}
                      placeholder="1234567890123"
                      maxLength={13}
                      className={errores.dpi ? 'border-destructive' : ''}
                    />
                    {errores.dpi && <p className="text-xs text-destructive">{errores.dpi}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nit">NIT</Label>
                    <Input
                      id="nit"
                      value={formData.nit}
                      onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      placeholder="12345678-9 o CF"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">Opcional</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      className={errores.fechaNacimiento ? 'border-destructive' : ''}
                    />
                    {errores.fechaNacimiento && <p className="text-xs text-destructive">{errores.fechaNacimiento}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genero">Género *</Label>
                    <Select
                      value={formData.genero}
                      onValueChange={(value) => setFormData({ ...formData, genero: value as 'masculino' | 'femenino' | 'otro' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estadoCivil">Estado Civil</Label>
                    <Select
                      value={formData.estadoCivil || undefined}
                      onValueChange={(value) => setFormData({ ...formData, estadoCivil: value })}
                    >
                      <SelectTrigger id="estadoCivil">
                        <SelectValue placeholder="Seleccionar estado civil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soltero">Soltero(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viudo">Viudo(a)</SelectItem>
                        <SelectItem value="unido">Unido(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profesion">Profesión / Oficio</Label>
                    <Input
                      id="profesion"
                      value={formData.profesion || ''}
                      onChange={(e) => setFormData({ ...formData, profesion: e.target.value })}
                      placeholder="Ej. Administrador, Comerciante"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contacto" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono Principal *</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="12345678"
                      maxLength={8}
                      className={errores.telefono ? 'border-destructive' : ''}
                    />
                    {errores.telefono && <p className="text-xs text-destructive">{errores.telefono}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefonoSecundario">Teléfono Secundario</Label>
                    <Input
                      id="telefonoSecundario"
                      value={formData.telefonoSecundario}
                      onChange={(e) => setFormData({ ...formData, telefonoSecundario: e.target.value })}
                      placeholder="12345678"
                      maxLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sucursal">Sucursal</Label>
                    {cargandoSucursales ? (
                      <div className="p-2 text-sm text-muted-foreground border rounded-md">
                        Cargando sucursales...
                      </div>
                    ) : sucursales.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground border rounded-md">
                        No hay sucursales disponibles
                      </div>
                    ) : (
                      <Select
                        value={formData.sucursal || undefined}
                        onValueChange={(value) => setFormData({ ...formData, sucursal: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                          {sucursales
                            .sort((a, b) => {
                              // Mostrar primero la sucursal activa del usuario
                              if (a.codigo === sucursalActiva) return -1
                              if (b.codigo === sucursalActiva) return 1
                              return 0
                            })
                            .map((sucursal) => (
                              <SelectItem key={sucursal.id} value={sucursal.codigo || sucursal.id}>
                                {sucursal.codigo} - {sucursal.nombre}
                                {sucursal.codigo === sucursalActiva && ' (Activa)'}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">Opcional. Asignar cliente a una sucursal</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departamento">Departamento</Label>
                    <Select
                      value={formData.departamentoGeonameId ? String(formData.departamentoGeonameId) : undefined}
                      onValueChange={handleDepartamentoChange}
                      disabled={cargandoDepartamentos}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={cargandoDepartamentos ? "Cargando..." : "Seleccionar departamento"} />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map((depto) => (
                          <SelectItem key={depto.geonameId} value={String(depto.geonameId)}>
                            {depto.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="municipio">Municipio</Label>
                    <Select
                      value={formData.municipioGeonameId ? String(formData.municipioGeonameId) : undefined}
                      onValueChange={handleMunicipioChange}
                      disabled={!departamentoSeleccionado || cargandoMunicipios}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !departamentoSeleccionado 
                            ? "Selecciona un departamento primero" 
                            : cargandoMunicipios 
                              ? "Cargando..." 
                              : "Seleccionar municipio"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {municipios.map((mun) => (
                          <SelectItem key={mun.geonameId} value={String(mun.geonameId)}>
                            {mun.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 xl:col-span-2 space-y-2">
                    <Label htmlFor="direccion">Dirección *</Label>
                    <Textarea
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className={errores.direccion ? 'border-destructive' : ''}
                      rows={2}
                      placeholder="Dirección completa del cliente (calle, número, zona, etc.)"
                    />
                    {errores.direccion && <p className="text-xs text-destructive">{errores.direccion}</p>}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="referencias" className="mt-0 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-sm font-medium">Referencias personales / laborales</Label>
                    <p className="text-xs text-muted-foreground">
                      Agrega una o varias personas como referencia para este cliente (nombre y teléfono).
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const actuales = Array.isArray(formData.referencias) ? formData.referencias : []
                      setFormData({
                        ...formData,
                        referencias: [
                          ...actuales,
                          { nombre: '', telefono: '', relacion: '' },
                        ],
                      })
                    }}
                  >
                    Agregar referencia
                  </Button>
                </div>

                <div className="space-y-3">
                  {Array.isArray(formData.referencias) && formData.referencias.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay referencias registradas. Usa el botón &quot;Agregar referencia&quot; para añadir una.
                    </p>
                  )}

                  {Array.isArray(formData.referencias) && formData.referencias.map((ref, index) => (
                    <Card key={index} className="p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Referencia #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const nuevas = [...(formData.referencias || [])]
                            nuevas.splice(index, 1)
                            setFormData({ ...formData, referencias: nuevas })
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Nombre *</Label>
                          <Input
                            value={ref?.nombre || ''}
                            onChange={(e) => {
                              const nuevas = [...(formData.referencias || [])]
                              nuevas[index] = {
                                ...nuevas[index],
                                nombre: e.target.value,
                              }
                              setFormData({ ...formData, referencias: nuevas })
                            }}
                            className={errores[`referencia_nombre_${index}`] ? 'border-destructive' : ''}
                            placeholder="Nombre completo"
                          />
                          {errores[`referencia_nombre_${index}`] && (
                            <p className="text-xs text-destructive">
                              {errores[`referencia_nombre_${index}`]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono *</Label>
                          <Input
                            value={ref?.telefono || ''}
                            onChange={(e) => {
                              const nuevas = [...(formData.referencias || [])]
                              nuevas[index] = {
                                ...nuevas[index],
                                telefono: e.target.value,
                              }
                              setFormData({ ...formData, referencias: nuevas })
                            }}
                            maxLength={8}
                            className={errores[`referencia_telefono_${index}`] ? 'border-destructive' : ''}
                            placeholder="12345678"
                          />
                          {errores[`referencia_telefono_${index}`] && (
                            <p className="text-xs text-destructive">
                              {errores[`referencia_telefono_${index}`]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Relación</Label>
                          <Input
                            value={ref?.relacion || ''}
                            onChange={(e) => {
                              const nuevas = [...(formData.referencias || [])]
                              nuevas[index] = {
                                ...nuevas[index],
                                relacion: e.target.value,
                              }
                              setFormData({ ...formData, referencias: nuevas })
                            }}
                            placeholder="Familiar, trabajo, vecino..."
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="adicional" className="mt-0">
                {/* Layout responsivo: columna única en móvil, 2 columnas en desktop */}
                <div className="flex flex-col 2xl:flex-row gap-6">
                  
                  {/* Columna izquierda - Datos adicionales */}
                  <div className="w-full 2xl:w-[350px] 2xl:flex-shrink-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Select
                          value={formData.estado}
                          onValueChange={(value) => setFormData({ ...formData, estado: value as 'activo' | 'inactivo' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notas">Notas</Label>
                      <Textarea
                        id="notas"
                        value={formData.notas}
                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                        rows={4}
                        placeholder="Observaciones o notas adicionales..."
                      />
                    </div>
                  </div>

                  {/* Columna derecha - Fotografía (más grande) */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <Label className="text-base font-semibold">Fotografía del Cliente</Label>
                    
                    {errorFoto && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                        {errorFoto}
                      </div>
                    )}

                    {/* Área de captura de foto */}
                    <Card className="overflow-hidden border-2">
                      {capturandoFoto ? (
                        /* Vista de cámara activa - PANTALLA COMPLETA */
                        <div className="relative bg-black">
                          {/* Video container */}
                          <div className="relative w-full" style={{ minHeight: '350px', maxHeight: '450px' }}>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                              style={{ minHeight: '350px', maxHeight: '450px' }}
                            />
                            
                            {/* Overlay de carga */}
                            {!camaraLista && (
                              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-10">
                                <VideoCamera size={56} className="animate-pulse mb-3" />
                                <p className="text-lg font-medium">Iniciando cámara...</p>
                                <p className="text-sm text-white/70">Permite el acceso a la cámara</p>
                              </div>
                            )}
                            
                            {/* Guía de encuadre cuando está lista */}
                            {camaraLista && (
                              <div className="absolute inset-0 pointer-events-none z-10">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white/40 rounded-full" />
                              </div>
                            )}
                          </div>
                          
                          {/* Barra de controles SIEMPRE VISIBLE */}
                          <div className="bg-gradient-to-t from-black via-black/90 to-black/70 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={stopCamera}
                                className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20"
                              >
                                <X size={18} className="mr-2" />
                                Cancelar
                              </Button>
                              
                              {/* Botón de captura GRANDE Y PROMINENTE */}
                              <Button
                                type="button"
                                size="lg"
                                onClick={capturePhoto}
                                disabled={!camaraLista}
                                className="w-full sm:w-auto h-14 px-8 text-base sm:text-lg font-bold bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Aperture size={24} className="mr-2 sm:mr-3" weight="bold" />
                                CAPTURAR FOTO
                              </Button>
                            </div>
                            
                            {camaraLista && (
                              <p className="text-center text-white/70 text-sm mt-3">
                                Presiona el botón rojo para tomar la fotografía
                              </p>
                            )}
                          </div>
                        </div>
                      ) : fotoPreview ? (
                        /* Vista de preview de foto */
                        <div>
                          <div className="relative bg-muted flex items-center justify-center" style={{ minHeight: '280px', maxHeight: '400px' }}>
                            <img
                              src={fotoPreview}
                              alt="Preview"
                              className="max-w-full max-h-[400px] object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                                setErrorFoto('Error al cargar la imagen')
                              }}
                            />
                            {/* Badge de preview */}
                            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
                              ✓ Foto cargada
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-4 bg-muted/30">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removePhoto}
                            >
                              <X size={16} className="mr-1" />
                              Eliminar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={startCamera}
                            >
                              <Camera size={16} className="mr-1" />
                              Tomar Otra
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload size={16} className="mr-1" />
                              Cambiar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Vista sin foto - área para agregar */
                        <div className="p-6 sm:p-8">
                          <div className="flex flex-col items-center justify-center text-center gap-5 py-8 sm:py-12 border-2 border-dashed rounded-xl bg-muted/20">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center">
                              <User size={40} className="text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-base sm:text-lg font-medium mb-1">Sin fotografía</p>
                              <p className="text-sm text-muted-foreground max-w-xs">
                                Captura una foto con la cámara o carga una imagen
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0">
                              <Button
                                type="button"
                                size="lg"
                                onClick={startCamera}
                                className="w-full sm:w-auto"
                              >
                                <Camera size={20} className="mr-2" />
                                Abrir Cámara
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full sm:w-auto"
                              >
                                <Upload size={20} className="mr-2" />
                                Subir Imagen
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : cliente ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
