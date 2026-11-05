import React, { useState, useEffect, useMemo } from 'react'
import {
  UsersThree,
  UserPlus,
  Phone,
  WhatsappLogo,
  WarningCircle,
  ClockCountdown,
  MagnifyingGlass,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
  CalendarCheck,
  FunnelSimple,
  CurrencyDollar,
  Buildings,
  MapPin,
  CaretRight,
  CaretLeft,
  ChatCircleText,
  Handshake,
  UserCheck,
  IdentificationCard,
  HouseLine,
  UploadSimple,
  DownloadSimple,
  ShareNetwork,
  Copy,
  Plus,
  Compass,
  ArrowSquareOut,
  FileXls,
  FileArrowDown,
  Table,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { formatCurrency } from '@/lib/helpers'
import { usePermissions } from '@/hooks/use-permissions'
import { EVENTO_NAVEGAR_MODULO } from '@/hooks/use-navigate-module'
import { api, geoNamesService, Departamento, Municipio } from '@/lib/api'
import {
  prospectoService,
  Prospecto,
  EstadoProspecto,
  FiltrosProspectos,
  ProspectoEstadisticas,
} from '@/services/prospectoService'

interface FincaOption {
  id: number
  nombre: string
}

interface LoteOption {
  id: number
  numero_lote: string
  codigo_unico: string
  finca_id?: number
  precio_venta?: number
}

interface AsesorOption {
  id: number
  name: string
  email: string
}

const COLUMNAS_KANBAN: { id: EstadoProspecto; titulo: string; color: string; badgeClass: string }[] = [
  { id: 'nuevo', titulo: 'Nuevos Leads', color: 'border-t-blue-500', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { id: 'contactado', titulo: 'Contactados', color: 'border-t-indigo-500', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  { id: 'visita_agendada', titulo: 'Visita Agendada', color: 'border-t-purple-500', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { id: 'negociacion', titulo: 'En Negociación', color: 'border-t-amber-500', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { id: 'ganado', titulo: 'Venta Concretada', color: 'border-t-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { id: 'perdido', titulo: 'Descartados / Perdidos', color: 'border-t-rose-500', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
]

export interface ProspectosModuleProps {
  userSession?: any
}

export function ProspectosModule({ userSession }: ProspectosModuleProps = {}) {
  // Resolver permisos: prop userSession, kv:user-session, o fallback seguro
  const sessionData = useMemo(() => {
    if (userSession?.userData) return userSession.userData
    if (userSession) {
      return {
        ...userSession,
        rol: userSession.role || userSession.rol || 'administrador',
      }
    }
    try {
      const kv = localStorage.getItem('kv:user-session')
      if (kv) {
        const parsed = JSON.parse(kv)
        const u = parsed?.userData || parsed
        return {
          ...u,
          rol: u?.role || u?.rol || 'administrador',
        }
      }
    } catch {}
    return { rol: 'administrador' }
  }, [userSession])

  const { hasPermission, isAdmin } = usePermissions(sessionData)

  // Control estricto de permisos para funciones del CRM
  const puedeVer = isAdmin || hasPermission('prospectos', 'ver')
  const puedeCrear = isAdmin || hasPermission('prospectos', 'crear')
  const puedeEditar = isAdmin || hasPermission('prospectos', 'editar')
  const puedeEliminar = isAdmin || hasPermission('prospectos', 'eliminar')
  const puedeCambiarEstado = isAdmin || hasPermission('prospectos', 'cambiar_estado')
  const puedeAsignar = isAdmin || hasPermission('prospectos', 'asignar')
  const puedeImportar = isAdmin || hasPermission('prospectos', 'crear')
  const puedeExportar = isAdmin || hasPermission('prospectos', 'ver')

  // Estado general
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [estadisticas, setEstadisticas] = useState<ProspectoEstadisticas | null>(null)
  const [cargando, setCargando] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [fincaFiltro, setFincaFiltro] = useState<string>('')
  const [asesorFiltro, setAsesorFiltro] = useState<string>('')
  const [soloSinSeguimiento, setSoloSinSeguimiento] = useState(false)

  // Catálogos auxiliares
  const [fincas, setFincas] = useState<FincaOption[]>([])
  const [lotes, setLotes] = useState<LoteOption[]>([])
  const [asesores, setAsesores] = useState<AsesorOption[]>([])

  // Departamentos y Municipios para prospectos (igual que en clientes)
  const DEPARTAMENTOS_GT_FALLBACK = useMemo(() => [
    'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso',
    'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
    'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez', 'San Marcos',
    'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'
  ], [])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false)
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false)
  const [departamentoSeleccionadoId, setDepartamentoSeleccionadoId] = useState<number | null>(null)

  // Archivo para carga masiva
  const [nombreArchivoCargado, setNombreArchivoCargado] = useState<string>('')
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [tabFormulario, setTabFormulario] = useState('personales')

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    nombre_completo: '',
    dpi: '',
    nit: 'CF',
    fecha_nacimiento: '1990-01-01',
    genero: 'masculino' as 'masculino' | 'femenino' | 'otro',
    estado_civil: 'soltero',
    profesion: 'comerciante',
    telefono: '',
    telefono_secundario: '',
    email: '',
    direccion: 'Ciudad de Guatemala',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    finca_id: '',
    lote_id: '',
    asesor_id: '',
    estado: 'nuevo' as EstadoProspecto,
    origen: 'whatsapp',
    presupuesto_estimado: '',
    notas: '',
    fecha_proximo_contacto: '',
  })

  // Modal Registrar Contacto
  const [modalContactoAbierto, setModalContactoAbierto] = useState(false)
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState<Prospecto | null>(null)
  const [formContacto, setFormContacto] = useState({
    tipo_interaccion: 'llamada' as const,
    detalle: '',
    fecha_proximo_contacto: '',
    nuevo_estado: '' as EstadoProspecto | '',
  })

  // Modal Convertir a Comprador Oficial (Venta)
  const [modalConvertirAbierto, setModalConvertirAbierto] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [formConvertir, setFormConvertir] = useState({
    prospecto_id: 0,
    nombres: '',
    apellidos: '',
    dpi: '',
    nit: 'CF',
    telefono: '',
    telefono_secundario: '',
    email: '',
    direccion: 'Ciudad de Guatemala',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    genero: 'masculino',
    fecha_nacimiento: '1990-01-01',
    estado_civil: 'soltero',
    profesion: 'comerciante',
    finca_id: '',
    lote_id: '',
  })

  // Modal Carga Masiva de Prospectos
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false)
  const [tabImportacion, setTabImportacion] = useState<'csv' | 'pegar'>('pegar')
  const [textoMasivo, setTextoMasivo] = useState('')
  const [asesorImportacion, setAsesorImportacion] = useState('')
  const [distribuirEquitativo, setDistribuirEquitativo] = useState(true)
  const [fincaImportacion, setFincaImportacion] = useState('')
  const [origenImportacion, setOrigenImportacion] = useState('importacion_masiva')
  const [importandoMasivo, setImportandoMasivo] = useState(false)

  // Modal Formulario de Captura para Redes Sociales
  const [modalRedesAbierto, setModalRedesAbierto] = useState(false)
  const [canalRed, setCanalRed] = useState('facebook')
  const [formPruebaRed, setFormPruebaRed] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    departamento_interes: 'Guatemala',
    presupuesto_estimado: '',
    medio_contacto_preferido: 'whatsapp',
    mensaje: '',
  })
  const [enviandoRed, setEnviandoRed] = useState(false)

  // Carga inicial
  useEffect(() => {
    cargarCatalogos()
    cargarProspectos()
  }, [])

  // Recarga al cambiar filtros clave
  useEffect(() => {
    cargarProspectos()
  }, [fincaFiltro, asesorFiltro, soloSinSeguimiento])

  const cargarCatalogos = async () => {
    try {
      // Fincas
      const resFincas = await api.get<any>('/fincas')
      const itemsFincas = resFincas.data?.data || resFincas.data || []
      setFincas(itemsFincas.map((f: any) => ({ id: f.id, nombre: f.nombre })))

      // Lotes disponibles
      const resLotes = await api.get<any>('/lotes?estado=disponible')
      const itemsLotes = resLotes.data?.data || resLotes.data || []
      setLotes(
        itemsLotes.map((l: any) => ({
          id: l.id,
          numero_lote: l.numero_lote,
          codigo_unico: l.codigo_unico,
          finca_id: l.parcela?.finca_id,
          precio_venta: l.precio_venta,
        }))
      )

      // Asesores / Usuarios
      const resUsers = await api.get<any>('/usuarios')
      const itemsUsers = resUsers.data?.data || resUsers.data || []
      setAsesores(
        itemsUsers.map((u: any) => ({
          id: u.id,
          name: u.name || u.nombre,
          email: u.email,
        }))
      )

      // Cargar Departamentos oficiales de Guatemala
      setCargandoDepartamentos(true)
      geoNamesService.getDepartamentos()
        .then(res => {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setDepartamentos(res.data)
            const deptoGuate = res.data.find((d: any) => d.name?.toLowerCase() === 'guatemala')
            if (deptoGuate) {
              setDepartamentoSeleccionadoId(deptoGuate.geonameId)
              cargarMunicipios(deptoGuate.geonameId)
            }
          }
        })
        .catch(err => console.error('Error cargando departamentos:', err))
        .finally(() => setCargandoDepartamentos(false))
    } catch {
      // Catálogos auxiliares opcionales
    }
  }

  // Cargar Municipios según departamento seleccionado
  const cargarMunicipios = async (departamentoId: number) => {
    setCargandoMunicipios(true)
    try {
      const res = await geoNamesService.getMunicipios(departamentoId)
      if (res.success && Array.isArray(res.data)) {
        setMunicipios(res.data)
      }
    } catch (e) {
      console.error('Error cargando municipios:', e)
    } finally {
      setCargandoMunicipios(false)
    }
  }

  const handleDepartamentoChange = (deptoNombreOrId: string) => {
    if (!deptoNombreOrId) {
      setDepartamentoSeleccionadoId(null)
      setFormData(prev => ({ ...prev, departamento: '', municipio: '' }))
      setMunicipios([])
      return
    }

    const deptoEncontrado = departamentos.find(
      d => String(d.geonameId) === deptoNombreOrId || d.name.toLowerCase() === deptoNombreOrId.toLowerCase()
    )

    if (deptoEncontrado) {
      setDepartamentoSeleccionadoId(deptoEncontrado.geonameId)
      setFormData(prev => ({
        ...prev,
        departamento: deptoEncontrado.name,
        municipio: '',
      }))
      cargarMunicipios(deptoEncontrado.geonameId)
    } else {
      setDepartamentoSeleccionadoId(null)
      setFormData(prev => ({
        ...prev,
        departamento: deptoNombreOrId,
        municipio: '',
      }))
      setMunicipios([])
    }
  }

  const handleMunicipioChange = (munNombreOrId: string) => {
    const munEncontrado = municipios.find(
      m => String(m.geonameId) === munNombreOrId || m.name.toLowerCase() === munNombreOrId.toLowerCase()
    )
    setFormData(prev => ({
      ...prev,
      municipio: munEncontrado ? munEncontrado.name : munNombreOrId,
    }))
  }

  const cargarProspectos = async () => {
    if (!puedeVer) return
    setCargando(true)
    try {
      const filtros: FiltrosProspectos = {}
      if (fincaFiltro) filtros.finca_id = Number(fincaFiltro)
      if (asesorFiltro) filtros.asesor_id = Number(asesorFiltro)
      if (soloSinSeguimiento) filtros.solo_sin_seguimiento = true
      if (busqueda.trim()) filtros.busqueda = busqueda.trim()

      const res = await prospectoService.getProspectos(filtros)
      setProspectos(res.data || [])
      setEstadisticas(res.estadisticas || null)
    } catch (err: any) {
      toast.error('Error al cargar prospectos: ' + (err.message || 'Error de conexión'))
    } finally {
      setCargando(false)
    }
  }

  // Filtrado local por búsqueda de texto
  const prospectosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return prospectos
    const q = busqueda.toLowerCase().trim()
    return prospectos.filter(
      p =>
        p.nombre_completo.toLowerCase().includes(q) ||
        p.telefono.toLowerCase().includes(q) ||
        (p.dpi && p.dpi.toLowerCase().includes(q)) ||
        (p.finca && p.finca.nombre.toLowerCase().includes(q)) ||
        (p.lote && p.lote.numero_lote.toLowerCase().includes(q))
    )
  }, [prospectos, busqueda])

  // Lotes filtrados por la finca seleccionada en el formulario
  const lotesDisponiblesForm = useMemo(() => {
    if (!formData.finca_id) return lotes
    return lotes.filter(l => !l.finca_id || l.finca_id === Number(formData.finca_id))
  }, [lotes, formData.finca_id])

  // Manejador apertura nuevo
  const abrirModalNuevo = () => {
    setEditandoId(null)
    setTabFormulario('personales')
    setFormData({
      nombres: '',
      apellidos: '',
      nombre_completo: '',
      dpi: '',
      nit: 'CF',
      fecha_nacimiento: '1990-01-01',
      genero: 'masculino',
      estado_civil: 'soltero',
      profesion: 'comerciante',
      telefono: '',
      telefono_secundario: '',
      email: '',
      direccion: 'Ciudad de Guatemala',
      municipio: 'Guatemala',
      departamento: 'Guatemala',
      finca_id: fincas[0] ? String(fincas[0].id) : '',
      lote_id: '',
      asesor_id: '',
      estado: 'nuevo',
      origen: 'whatsapp',
      presupuesto_estimado: '',
      notas: '',
      fecha_proximo_contacto: '',
    })
    const deptoGuate = departamentos.find(d => d.name.toLowerCase() === 'guatemala')
    if (deptoGuate) {
      setDepartamentoSeleccionadoId(deptoGuate.geonameId)
      cargarMunicipios(deptoGuate.geonameId)
    }
    setModalAbierto(true)
  }

  // Manejador apertura editar
  const abrirModalEditar = (p: Prospecto) => {
    setEditandoId(p.id)
    setTabFormulario('personales')

    // Si no tiene nombres separados, dividirlos de nombre_completo
    let nombres = p.nombres || ''
    let apellidos = p.apellidos || ''
    if (!nombres && p.nombre_completo) {
      const partes = p.nombre_completo.trim().split(/\s+/)
      nombres = partes[0] || ''
      apellidos = partes.slice(1).join(' ') || ''
    }

    const deptoExistente = departamentos.find(d => d.name.toLowerCase() === (p.departamento || '').toLowerCase())
    if (deptoExistente) {
      setDepartamentoSeleccionadoId(deptoExistente.geonameId)
      cargarMunicipios(deptoExistente.geonameId)
    }

    setFormData({
      nombres,
      apellidos,
      nombre_completo: p.nombre_completo,
      dpi: p.dpi || '',
      nit: p.nit || 'CF',
      fecha_nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : '1990-01-01',
      genero: (p.genero as any) || 'masculino',
      estado_civil: p.estado_civil || 'soltero',
      profesion: p.profesion || 'comerciante',
      telefono: p.telefono,
      telefono_secundario: p.telefono_secundario || '',
      email: p.email || '',
      direccion: p.direccion || 'Ciudad de Guatemala',
      municipio: p.municipio || 'Guatemala',
      departamento: p.departamento || 'Guatemala',
      finca_id: p.finca_id ? String(p.finca_id) : '',
      lote_id: p.lote_id ? String(p.lote_id) : '',
      asesor_id: p.asesor_id ? String(p.asesor_id) : '',
      estado: p.estado,
      origen: p.origen || 'otro',
      presupuesto_estimado: p.presupuesto_estimado ? String(p.presupuesto_estimado) : '',
      notas: p.notas || '',
      fecha_proximo_contacto: p.fecha_proximo_contacto ? p.fecha_proximo_contacto.slice(0, 16) : '',
    })
    setModalAbierto(true)
  }

  // Guardar Prospecto (Crear o Editar)
  const handleSubmitProspecto = async (e: React.FormEvent) => {
    e.preventDefault()
    const nombreCompleto =
      formData.nombre_completo.trim() ||
      `${formData.nombres.trim()} ${formData.apellidos.trim()}`.trim()

    if (!nombreCompleto || !formData.telefono.trim()) {
      toast.error('El nombre del prospecto y el teléfono son campos obligatorios.')
      return
    }

    setGuardando(true)
    try {
      const payload: any = {
        nombre_completo: nombreCompleto,
        nombres: formData.nombres.trim() || null,
        apellidos: formData.apellidos.trim() || null,
        dpi: formData.dpi.trim().replace(/\D/g, '') || null,
        nit: formData.nit.trim() || 'CF',
        telefono: formData.telefono.trim(),
        telefono_secundario: formData.telefono_secundario.trim() || null,
        email: formData.email.trim() || null,
        direccion: formData.direccion.trim() || null,
        municipio: formData.municipio.trim() || null,
        departamento: formData.departamento.trim() || null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        genero: formData.genero,
        estado_civil: formData.estado_civil || null,
        profesion: formData.profesion || null,
        finca_id: formData.finca_id ? Number(formData.finca_id) : null,
        lote_id: formData.lote_id ? Number(formData.lote_id) : null,
        asesor_id: formData.asesor_id ? Number(formData.asesor_id) : null,
        estado: formData.estado,
        origen: formData.origen,
        presupuesto_estimado: formData.presupuesto_estimado ? Number(formData.presupuesto_estimado) : null,
        notas: formData.notas.trim() || null,
        fecha_proximo_contacto: formData.fecha_proximo_contacto || null,
      }

      if (editandoId) {
        await prospectoService.updateProspecto(editandoId, payload)
        toast.success('Prospecto actualizado exitosamente con datos de cliente.')
      } else {
        await prospectoService.createProspecto(payload)
        toast.success('Prospecto registrado en el CRM con éxito.')
      }

      setModalAbierto(false)
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar el prospecto')
    } finally {
      setGuardando(false)
    }
  }

  // Cambiar de estado en el Kanban
  const handleMoverEstado = async (p: Prospecto, nuevoEstado: EstadoProspecto) => {
    if (!puedeCambiarEstado) {
      toast.error('No tienes permisos para cambiar el estado de los prospectos.')
      return
    }

    try {
      await prospectoService.cambiarEstado(p.id, nuevoEstado)
      toast.success(`Prospecto movido a ${nuevoEstado.replace('_', ' ')}`)
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al cambiar estado')
    }
  }

  // Abrir Modal Registrar Contacto
  const abrirModalContacto = (p: Prospecto) => {
    setProspectoSeleccionado(p)
    setFormContacto({
      tipo_interaccion: 'llamada',
      detalle: '',
      fecha_proximo_contacto: '',
      nuevo_estado: '',
    })
    setModalContactoAbierto(true)
  }

  // Enviar Contacto
  const handleGuardarContacto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prospectoSeleccionado) return
    if (!formContacto.detalle.trim()) {
      toast.error('Debes ingresar el resumen de la conversación o interacción.')
      return
    }

    try {
      await prospectoService.registrarContacto(prospectoSeleccionado.id, {
        tipo_interaccion: formContacto.tipo_interaccion,
        detalle: formContacto.detalle.trim(),
        fecha_proximo_contacto: formContacto.fecha_proximo_contacto || undefined,
        nuevo_estado: (formContacto.nuevo_estado as EstadoProspecto) || undefined,
      })

      toast.success('Contacto registrado. El cronómetro de seguimiento se ha reiniciado.')
      setModalContactoAbierto(false)
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al registrar contacto')
    }
  }

  // Abrir Modal Convertir a Comprador Oficial
  const abrirModalConvertir = (p: Prospecto) => {
    let nombres = p.nombres || ''
    let apellidos = p.apellidos || ''

    if (!nombres && p.nombre_completo) {
      const partes = (p.nombre_completo || '').trim().split(/\s+/)
      if (partes.length === 1) {
        nombres = partes[0]
        apellidos = 'López'
      } else if (partes.length === 2) {
        nombres = partes[0]
        apellidos = partes[1]
      } else if (partes.length === 3) {
        nombres = partes[0]
        apellidos = partes.slice(1).join(' ')
      } else {
        nombres = partes.slice(0, 2).join(' ')
        apellidos = partes.slice(2).join(' ')
      }
    }

    // Limpiar DPI (remover espacios y guiones)
    const dpiLimpio = (p.dpi || '').replace(/\D/g, '')

    setFormConvertir({
      prospecto_id: p.id,
      nombres,
      apellidos,
      dpi: dpiLimpio,
      nit: p.nit || 'CF',
      telefono: p.telefono || '',
      telefono_secundario: p.telefono_secundario || '',
      email: p.email || '',
      direccion: p.direccion || 'Ciudad de Guatemala',
      municipio: p.municipio || 'Guatemala',
      departamento: p.departamento || 'Guatemala',
      genero: (p.genero as any) || 'masculino',
      fecha_nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : '1990-01-01',
      estado_civil: p.estado_civil || 'soltero',
      profesion: p.profesion || 'comerciante',
      finca_id: p.finca_id ? String(p.finca_id) : '',
      lote_id: p.lote_id ? String(p.lote_id) : '',
    })
    setProspectoSeleccionado(p)
    setModalConvertirAbierto(true)
  }

  // Ejecutar Conversión a Comprador Oficial
  const handleConvertirCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formConvertir.dpi || formConvertir.dpi.length !== 13) {
      toast.error('El DPI debe contener exactamente 13 dígitos numéricos.')
      return
    }

    setConvirtiendo(true)
    try {
      // 1. Crear cliente formal
      const resCliente = await api.post<any>('/clientes', {
        nombres: formConvertir.nombres.trim(),
        apellidos: formConvertir.apellidos.trim(),
        dpi: formConvertir.dpi.trim(),
        nit: formConvertir.nit.trim() || 'CF',
        telefono: formConvertir.telefono.trim(),
        telefono_secundario: formConvertir.telefono_secundario?.trim() || null,
        email: formConvertir.email.trim() || null,
        direccion: formConvertir.direccion.trim() || 'Ciudad de Guatemala',
        municipio: formConvertir.municipio?.trim() || 'Guatemala',
        genero: formConvertir.genero,
        fecha_nacimiento: formConvertir.fecha_nacimiento,
        estado_civil: formConvertir.estado_civil,
        profesion: formConvertir.profesion,
        tipo_cliente: 'regular',
        estado: 'activo',
      })

      const clienteCreado = resCliente.data?.data || resCliente.data

      // 2. Marcar prospecto como ganado (cerrado exitosamente)
      await prospectoService.cambiarEstado(
        formConvertir.prospecto_id,
        'ganado',
        undefined,
        `Convertido en Comprador Oficial (ID #${clienteCreado?.id || ''} - ${clienteCreado?.codigo_cliente || ''})`
      )

      toast.success('¡Prospecto convertido con éxito a Comprador Oficial!')
      setModalConvertirAbierto(false)
      cargarProspectos()

      // 3. Ofrecer redirección a Ventas & Contratos
      if (window.confirm('¿Deseas ir al módulo de Ventas & Contratos para iniciar la promesa de venta de este cliente?')) {
        window.dispatchEvent(new CustomEvent(EVENTO_NAVEGAR_MODULO, { detail: { modulo: 'negociaciones' } }))
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al convertir en comprador'
      toast.error(msg)
    } finally {
      setConvirtiendo(false)
    }
  }

  // Eliminar Prospecto
  const handleEliminar = async (id: number) => {
    if (!puedeEliminar) {
      toast.error('No tienes permisos para eliminar prospectos.')
      return
    }
    if (!window.confirm('¿Estás seguro de eliminar este prospecto del embudo comercial?')) return

    try {
      await prospectoService.deleteProspecto(id)
      toast.success('Prospecto eliminado del sistema.')
      cargarProspectos()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al eliminar')
    }
  }

  // Enlace directo WhatsApp
  const handleAbrirWhatsApp = (prospecto: Prospecto) => {
    let clean = prospecto.telefono.replace(/\D/g, '')
    if (clean.length === 8) clean = '502' + clean
    const texto = encodeURIComponent(
      `¡Hola ${prospecto.nombre_completo}! Te saludamos de Parcelia. ¿Tienes alguna consulta sobre nuestros lotes y facilidades de pago?`
    )
    window.open(`https://wa.me/${clean}?text=${texto}`, '_blank')
  }

  // Descargar plantilla oficial en formato Microsoft Excel (.xlsx) con columnas completas
  const handleDescargarPlantillaExcel = async () => {
    try {
      // 1. Intentar descargar mediante el endpoint oficial de backend (genera .xlsx binario estilizado con PhpSpreadsheet)
      await prospectoService.descargarPlantillaExcel()
      toast.success('Plantilla oficial de Excel (.xlsx) descargada correctamente.')
    } catch {
      // 2. Fallback de cliente con SheetJS generando un auténtico libro Microsoft Excel (.xlsx)
      try {
        const headers = [
          'nombre_completo',
          'nombres',
          'apellidos',
          'telefono',
          'telefono_secundario',
          'email',
          'dpi',
          'nit',
          'departamento',
          'municipio',
          'direccion',
          'presupuesto_estimado',
          'notas'
        ]

        const sampleRows = [
          [
            'Carlos Estuardo Morales Lopez',
            'Carlos Estuardo',
            'Morales Lopez',
            '55443322',
            '44332211',
            'carlos.morales@ejemplo.com',
            '2456789010101',
            '1234567-8',
            'Guatemala',
            'Guatemala',
            'Zona 10, Edificio Reforma',
            75000,
            'Interesado en lote esquinero con facilidades de pago'
          ],
          [
            'Maria Eugenia Perez Hernandez',
            'Maria Eugenia',
            'Perez Hernandez',
            '33221100',
            '',
            'maria.perez@ejemplo.com',
            '1987654320101',
            'CF',
            'Sacatepéquez',
            'Antigua Guatemala',
            'Calle Ancha #14',
            60000,
            'Pregunto por Facebook sobre enganche fraccionado'
          ],
          [
            'Jose Fernando Alvarez Ruiz',
            'Jose Fernando',
            'Alvarez Ruiz',
            '58990011',
            '',
            'jose.alvarez@ejemplo.com',
            '',
            'CF',
            'Escuintla',
            'Santa Lucía Cotzumalguapa',
            'Barrio El Carmen',
            50000,
            'Lead captado en feria inmobiliaria'
          ]
        ]

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
        ws['!cols'] = [
          { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
          { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 22 },
          { wch: 30 }, { wch: 20 }, { wch: 45 }
        ]
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Prospectos')
        XLSX.writeFile(wb, 'plantilla_prospectos_parcelia.xlsx')
        toast.success('Plantilla oficial de Excel (.xlsx) generada correctamente.')
      } catch (clientErr) {
        console.error('Error generando Excel:', clientErr)
        toast.error('Error al generar la plantilla Excel.')
      }
    }
  }

  // Cargar archivo Microsoft Excel (.xlsx, .xls) o CSV seleccionado por el usuario
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNombreArchivoCargado(file.name)
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const worksheet = wb.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(worksheet)
        setTextoMasivo(csv.trim())
        const rowCount = csv.split('\n').filter(l => l.trim().length > 0).length - 1
        toast.success(`Libro Excel "${file.name}" cargado (${Math.max(0, rowCount)} filas detectadas).`)
      } catch (err) {
        console.error('Error leyendo archivo Excel:', err)
        toast.error('Error al procesar el archivo Excel. Verifica que sea un formato válido.')
      }
    } else {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        if (text) {
          setTextoMasivo(text.trim())
          const count = text.split('\n').filter(l => l.trim().length > 0).length - 1
          toast.success(`Archivo "${file.name}" cargado (${Math.max(0, count)} filas detectadas).`)
        }
      }
      reader.onerror = () => {
        toast.error('Error al leer el archivo seleccionado.')
      }
      reader.readAsText(file, 'UTF-8')
    }
  }

  // Exportar prospectos actuales a Microsoft Excel (.xlsx)
  const handleExportarExcel = async () => {
    if (prospectosFiltrados.length === 0) {
      toast.error('No hay prospectos para exportar con los filtros seleccionados.')
      return
    }

    try {
      // 1. Intentar descargar mediante el endpoint de backend oficial
      await prospectoService.exportarExcel({
        finca_id: fincaFiltro !== 'todas' ? fincaFiltro : undefined,
        asesor_id: asesorFiltro !== 'todos' ? asesorFiltro : undefined,
        estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
        buscar: busquedaFiltro || undefined
      })
      toast.success(`${prospectosFiltrados.length} prospectos exportados a Excel (.xlsx) correctamente.`)
    } catch {
      // 2. Fallback de cliente con SheetJS generando auténtico .xlsx
      try {
        const headers = [
          'ID',
          'Fecha Registro',
          'Nombre Completo',
          'Nombres',
          'Apellidos',
          'Teléfono Principal',
          'Teléfono Secundario',
          'Correo',
          'DPI',
          'NIT',
          'Departamento',
          'Municipio',
          'Dirección Domiciliar',
          'Finca de Interés',
          'Lote',
          'Asesor Asignado',
          'Estado CRM',
          'Origen de Captación',
          'Presupuesto Estimado (Q)',
          'Notas',
          'Último Contacto'
        ]

        const rows = prospectosFiltrados.map(p => [
          p.id,
          p.created_at ? p.created_at.substring(0, 10) : '',
          p.nombre_completo || '',
          p.nombres || '',
          p.apellidos || '',
          p.telefono || '',
          p.telefono_secundario || '',
          p.email || '',
          p.dpi || '',
          p.nit || '',
          p.departamento || '',
          p.municipio || '',
          p.direccion || '',
          p.finca?.nombre || '',
          p.lote?.numero_lote || '',
          p.asesor?.name || 'Sin Asignar',
          p.estado,
          p.origen || '',
          p.presupuesto_estimado ?? '',
          p.notas || '',
          p.ultimo_contacto_at ? p.ultimo_contacto_at.substring(0, 16) : ''
        ])

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = [
          { wch: 6 }, { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
          { wch: 16 }, { wch: 16 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
          { wch: 16 }, { wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 10 },
          { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 35 },
          { wch: 18 }
        ]
        XLSX.utils.book_append_sheet(wb, ws, 'Prospectos CRM')
        XLSX.writeFile(wb, `prospectos_crm_parcelia_${new Date().toISOString().slice(0, 10)}.xlsx`)
        toast.success(`${prospectosFiltrados.length} prospectos exportados a Excel (.xlsx) correctamente.`)
      } catch (err) {
        console.error('Error exportando Excel:', err)
        toast.error('Error al exportar prospectos a Excel.')
      }
    }
  }

  // Procesar importación masiva con asignación equitativa
  const handleProcesarCargaMasiva = async () => {
    if (!textoMasivo.trim()) {
      toast.error('Debes cargar un archivo o pegar al menos una fila con el nombre y teléfono del prospecto.')
      return
    }

    setImportandoMasivo(true)
    try {
      const lineas = textoMasivo.split('\n').filter(l => l.trim().length > 0)
      if (lineas.length === 0) {
        toast.error('No se detectaron líneas válidas.')
        return
      }

      // Omitir cabecera si viene incluida
      const primerLinea = lineas[0].toLowerCase()
      const lineasProcesar = (primerLinea.includes('nombre') || primerLinea.includes('telefono'))
        ? lineas.slice(1)
        : lineas

      const prospectosRows = lineasProcesar
        .map(linea => {
          const separador = linea.includes('\t') ? '\t' : (linea.includes(';') ? ';' : ',')
          const partes = linea.split(separador).map(p => p.trim().replace(/^["']|["']$/g, ''))

          // Detección inteligente si trae nombres separados (columna 3 es teléfono) o directo (columna 1 es teléfono)
          const esFormatoExtendido = partes.length >= 8 && /\d{7,}/.test(partes[3] || '')

          if (esFormatoExtendido) {
            return {
              nombre_completo: partes[0] || `${partes[1]} ${partes[2]}`.trim(),
              nombres: partes[1] || undefined,
              apellidos: partes[2] || undefined,
              telefono: partes[3] || '',
              telefono_secundario: partes[4] || undefined,
              email: partes[5] || undefined,
              dpi: partes[6] ? partes[6].replace(/\D/g, '') : undefined,
              nit: partes[7] || undefined,
              departamento: partes[8] || undefined,
              municipio: partes[9] || undefined,
              direccion: partes[10] || undefined,
              presupuesto_estimado: partes[11] ? Number(partes[11].replace(/[^\d.]/g, '')) : undefined,
              notas: partes[12] || undefined,
              finca_id: fincaImportacion ? Number(fincaImportacion) : undefined,
            }
          }

          return {
            nombre_completo: partes[0] || '',
            telefono: partes[1] || '',
            telefono_secundario: partes[2] || undefined,
            email: partes[3] || undefined,
            dpi: partes[4] ? partes[4].replace(/\D/g, '') : undefined,
            presupuesto_estimado: partes[5] ? Number(partes[5].replace(/[^\d.]/g, '')) : undefined,
            notas: partes[6] || undefined,
            finca_id: fincaImportacion ? Number(fincaImportacion) : undefined,
          }
        })
        .filter(p => p.nombre_completo && p.telefono)

      if (prospectosRows.length === 0) {
        toast.error('No se detectaron filas válidas con Nombre y Teléfono.')
        return
      }

      const res = await prospectoService.cargaMasiva({
        prospectos: prospectosRows,
        asesor_id: asesorImportacion ? Number(asesorImportacion) : undefined,
        distribuir_equitativo: distribuirEquitativo,
        asesores_ids: asesores.map(a => a.id),
        finca_id: fincaImportacion ? Number(fincaImportacion) : undefined,
        origen: origenImportacion,
      })

      if (res.success) {
        toast.success(`¡Éxito! Se importaron ${res.total_importados} prospectos correctamente.`)
        setTextoMasivo('')
        setNombreArchivoCargado('')
        setModalImportarAbierto(false)
        cargarProspectos()
      } else {
        toast.error(res.message || 'Error en la importación masiva.')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al procesar la carga masiva')
    } finally {
      setImportandoMasivo(false)
    }
  }

  // Enviar lead de prueba redes
  const handleEnviarLeadPrueba = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPruebaRed.nombre_completo.trim() || !formPruebaRed.telefono.trim()) {
      toast.error('Nombre y teléfono son obligatorios.')
      return
    }

    setEnviandoRed(true)
    try {
      await prospectoService.enviarFormularioRedes({
        nombre_completo: formPruebaRed.nombre_completo.trim(),
        telefono: formPruebaRed.telefono.trim(),
        email: formPruebaRed.email.trim() || undefined,
        departamento_interes: formPruebaRed.departamento_interes,
        presupuesto_estimado: formPruebaRed.presupuesto_estimado ? Number(formPruebaRed.presupuesto_estimado) : undefined,
        red_social: canalRed,
        medio_contacto_preferido: formPruebaRed.medio_contacto_preferido,
        mensaje: formPruebaRed.mensaje.trim() || undefined,
      })

      toast.success('¡Prospecto captado exitosamente desde Redes Sociales!')
      setFormPruebaRed({
        nombre_completo: '',
        telefono: '',
        email: '',
        departamento_interes: 'Guatemala',
        presupuesto_estimado: '',
        medio_contacto_preferido: 'whatsapp',
        mensaje: '',
      })
      cargarProspectos()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al procesar formulario')
    } finally {
      setEnviandoRed(false)
    }
  }

  if (!puedeVer) {
    return (
      <div className="p-8 text-center bg-card border rounded-xl max-w-lg mx-auto my-12 space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <WarningCircle size={28} />
        </div>
        <h2 className="text-lg font-bold">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground">
          No tienes permisos para visualizar o gestionar el Embudo de Prospectos & CRM. Consulta con el administrador del sistema.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <UsersThree size={28} weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Embudo Comercial & CRM
              {estadisticas && estadisticas.total_sin_seguimiento > 0 && (
                <Badge variant="destructive" className="animate-pulse text-xs font-semibold gap-1 px-2">
                  <WarningCircle size={14} weight="fill" />
                  {estadisticas.total_sin_seguimiento} desatendidos (&gt;48h)
                </Badge>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gestiona prospectos con los mismos datos oficiales del cliente, programa visitas y monitorea tiempos de atención.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarProspectos} disabled={cargando} className="gap-1.5 text-xs h-9">
            <ArrowsClockwise size={15} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </Button>

          {puedeExportar && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarExcel}
              className="gap-1.5 text-xs h-9 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"
              title="Descargar todos los prospectos filtrados en formato Excel"
            >
              <FileXls size={16} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
              Exportar Excel
            </Button>
          )}

          {puedeImportar && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalImportarAbierto(true)}
              className="gap-1.5 text-xs h-9 hover:border-emerald-500 hover:text-emerald-600"
            >
              <UploadSimple size={15} weight="bold" />
              Importar Leads
            </Button>
          )}

          {puedeCrear && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRedesAbierto(true)}
              className="gap-1.5 text-xs h-9 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50/50"
            >
              <ShareNetwork size={15} weight="bold" />
              Formulario Redes
            </Button>
          )}

          {puedeCrear && (
            <Button
              size="sm"
              onClick={abrirModalNuevo}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm px-3.5"
            >
              <UserPlus size={16} weight="bold" />
              + Nuevo Prospecto
            </Button>
          )}
        </div>
      </div>

      {/* METRICAS DEL PIPELINE */}
      {estadisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prospectos Activos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{estadisticas.total_prospectos_activos}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">En proceso de atención</p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <UsersThree size={24} weight="duotone" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monto en Pipeline</p>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatCurrency(estadisticas.monto_pipeline_estimado)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Presupuesto estimado acumulado</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CurrencyDollar size={24} weight="duotone" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border shadow-xs cursor-pointer transition-all ${
              soloSinSeguimiento
                ? 'ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                : 'hover:border-rose-300'
            }`}
            onClick={() => setSoloSinSeguimiento(!soloSinSeguimiento)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <WarningCircle size={14} weight="fill" /> Sin Contacto (+48h)
                </p>
                <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {estadisticas.total_sin_seguimiento}
                </h3>
                <p className="text-xs text-rose-500/80 mt-0.5">
                  {soloSinSeguimiento ? '✓ Filtrando desatendidos' : 'Click para filtrar urgentes'}
                </p>
              </div>
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg animate-pulse">
                <ClockCountdown size={24} weight="bold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cierres Exitosos</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {estadisticas.conteos_por_estado?.ganado || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ventas formalizadas</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CheckCircle size={24} weight="duotone" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-card p-4 rounded-xl border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, teléfono, DPI o lote..."
              className="pl-9 text-xs sm:text-sm h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={fincaFiltro}
              onChange={e => setFincaFiltro(e.target.value)}
              aria-label="Filtrar por Proyecto o Finca"
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todas las Fincas</option>
              {fincas.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>

            <select
              value={asesorFiltro}
              onChange={e => setAsesorFiltro(e.target.value)}
              aria-label="Filtrar por Asesor Comercial"
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos los Asesores</option>
              {asesores.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <Button
              variant={soloSinSeguimiento ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setSoloSinSeguimiento(!soloSinSeguimiento)}
              className="h-9 text-xs gap-1.5"
            >
              <ClockCountdown size={14} weight="bold" />
              {soloSinSeguimiento ? 'Mostrando desatendidos' : 'Solo sin contacto (+48h)'}
            </Button>
          </div>
        </div>
      </div>

      {/* TABLERO KANBAN */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1280px]">
          {COLUMNAS_KANBAN.map(col => {
            const prospectosEnCol = prospectosFiltrados.filter(p => p.estado === col.id)
            return (
              <div
                key={col.id}
                className={`flex-1 min-w-[280px] max-w-[320px] bg-muted/40 rounded-xl border border-t-4 ${col.color} p-3 flex flex-col gap-3 min-h-[500px]`}
              >
                {/* Cabecera de Columna */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs uppercase tracking-wide text-foreground">
                      {col.titulo}
                    </span>
                    <Badge variant="secondary" className={`text-xs px-2 py-0.5 font-bold ${col.badgeClass}`}>
                      {prospectosEnCol.length}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditandoId(null)
                      setTabFormulario('personales')
                      setFormData(prev => ({ ...prev, estado: col.id }))
                      setModalAbierto(true)
                    }}
                    title={`Añadir prospecto a ${col.titulo}`}
                    className="h-6 w-6 p-0 hover:bg-background/80 text-muted-foreground hover:text-foreground"
                  >
                    <Plus size={14} weight="bold" />
                  </Button>
                </div>

                {/* Lista de Tarjetas */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-1">
                  {prospectosEnCol.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/70 rounded-lg text-xs text-muted-foreground text-center p-3">
                      <span>Sin prospectos en esta etapa</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditandoId(null)
                          setTabFormulario('personales')
                          setFormData(prev => ({ ...prev, estado: col.id }))
                          setModalAbierto(true)
                        }}
                        className="h-7 text-[11px] gap-1 border-dashed hover:border-emerald-500 hover:text-emerald-600"
                      >
                        <UserPlus size={13} /> + Registrar Lead
                      </Button>
                    </div>
                  ) : (
                    prospectosEnCol.map(p => {
                      const requiereAtencion = p.requiere_seguimiento
                      return (
                        <div
                          key={p.id}
                          className={`bg-card p-3.5 rounded-lg border shadow-xs transition-all hover:shadow-md space-y-2.5 ${
                            requiereAtencion
                              ? 'border-rose-400 dark:border-rose-600/80 ring-1 ring-rose-400/40 bg-rose-50/20 dark:bg-rose-950/10'
                              : 'border-border'
                          }`}
                        >
                          {/* ALERTA DE INACTIVIDAD (+48H) */}
                          {requiereAtencion && (
                            <div className="bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-2 py-1 rounded text-[11px] font-semibold flex items-center justify-between animate-pulse">
                              <span className="flex items-center gap-1">
                                <WarningCircle size={13} weight="fill" />
                                Sin contacto (+{p.horas_sin_contacto}h)
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => abrirModalContacto(p)}
                                className="h-5 px-1.5 text-[10px] bg-rose-200/80 hover:bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100"
                              >
                                Atender
                              </Button>
                            </div>
                          )}

                          {/* Nombre del Prospecto y Origen */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1">
                                {p.nombre_completo}
                              </h4>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <span className="capitalize">{p.origen.replace('_', ' ')}</span>
                                {p.dpi && <span>· DPI: {p.dpi}</span>}
                              </p>
                              {p.direccion && (
                                <p className="text-[10px] text-muted-foreground/80 truncate">
                                  📍 {p.direccion}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {puedeEditar && (
                                <button
                                  onClick={() => abrirModalEditar(p)}
                                  aria-label="Editar prospecto"
                                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                                >
                                  <PencilSimple size={13} />
                                </button>
                              )}
                              {puedeEliminar && (
                                <button
                                  onClick={() => handleEliminar(p.id)}
                                  aria-label="Eliminar prospecto"
                                  className="text-muted-foreground hover:text-rose-600 p-1 rounded"
                                >
                                  <Trash size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Lote / Finca de Interés */}
                          {(p.finca || p.lote) && (
                            <div className="p-2 bg-muted/60 rounded text-[11px] space-y-0.5">
                              {p.finca && (
                                <div className="flex items-center gap-1 text-foreground font-medium">
                                  <Buildings size={12} className="text-emerald-600" />
                                  <span className="truncate">{p.finca.nombre}</span>
                                </div>
                              )}
                              {p.lote && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin size={12} />
                                  <span>Lote {p.lote.numero_lote} ({p.lote.codigo_unico})</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Presupuesto */}
                          {p.presupuesto_estimado && (
                            <div className="text-[11px] flex justify-between items-center text-muted-foreground">
                              <span>Presupuesto:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(p.presupuesto_estimado)}
                              </span>
                            </div>
                          )}

                          {/* Asesor asignado */}
                          {p.asesor && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              Asesor: <strong className="text-foreground">{p.asesor.name}</strong>
                            </div>
                          )}

                          {/* Teléfono y Botones de Acción */}
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${p.telefono}`}
                                className="h-7 px-2 text-[11px] inline-flex items-center gap-1 rounded bg-muted hover:bg-muted/80 text-foreground"
                                title="Llamar"
                              >
                                <Phone size={12} /> {p.telefono}
                              </a>

                              <button
                                onClick={() => handleAbrirWhatsApp(p)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Abrir WhatsApp"
                              >
                                <WhatsappLogo size={14} weight="fill" />
                              </button>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalContacto(p)}
                              className="h-7 px-2 text-[11px] gap-1"
                              title="Registrar llamada o reunión"
                            >
                              <ChatCircleText size={13} />
                              Seguimiento
                            </Button>
                          </div>

                          {/* BOTON CONVERTIR A COMPRADOR / INICIAR VENTA */}
                          {puedeCrear && p.estado !== 'ganado' && (
                            <div className="pt-1">
                              <Button
                                size="sm"
                                onClick={() => abrirModalConvertir(p)}
                                className="w-full h-7 text-[11px] gap-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-medium shadow-2xs"
                                title="Registrar como comprador oficial e iniciar contrato de venta"
                              >
                                <UserCheck size={14} weight="bold" />
                                Convertir a Comprador Oficial
                              </Button>
                            </div>
                          )}

                          {/* Movimiento entre columnas (Avanzar / Retroceder) */}
                          {puedeCambiarEstado && (
                            <div className="flex justify-between items-center pt-1 text-[11px]">
                              {col.id !== 'nuevo' ? (
                                <button
                                  onClick={() => {
                                    const currentIndex = COLUMNAS_KANBAN.findIndex(c => c.id === col.id)
                                    if (currentIndex > 0) {
                                      handleMoverEstado(p, COLUMNAS_KANBAN[currentIndex - 1].id)
                                    }
                                  }}
                                  className="text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                                >
                                  <CaretLeft size={11} /> Atrás
                                </button>
                              ) : <span />}

                              {col.id !== 'ganado' && col.id !== 'perdido' && (
                                <button
                                  onClick={() => {
                                    const currentIndex = COLUMNAS_KANBAN.findIndex(c => c.id === col.id)
                                    if (currentIndex < COLUMNAS_KANBAN.length - 2) {
                                      handleMoverEstado(p, COLUMNAS_KANBAN[currentIndex + 1].id)
                                    } else {
                                      handleMoverEstado(p, 'ganado')
                                    }
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                                >
                                  Avanzar <CaretRight size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR PROSPECTO CON PESTAÑAS COMPLETAS */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <UserPlus size={20} className="text-emerald-600" />
              {editandoId ? 'Editar Prospecto & Datos de Cliente' : 'Nuevo Prospecto (Perfil de Cliente Completo)'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitProspecto} className="space-y-4 pt-1">
            <Tabs value={tabFormulario} onValueChange={setTabFormulario} className="w-full">
              <TabsList className="grid grid-cols-3 w-full h-9 mb-3">
                <TabsTrigger value="personales" className="text-xs gap-1.5">
                  <IdentificationCard size={15} />
                  1. Identificación
                </TabsTrigger>
                <TabsTrigger value="contacto" className="text-xs gap-1.5">
                  <HouseLine size={15} />
                  2. Contacto & Domicilio
                </TabsTrigger>
                <TabsTrigger value="interes" className="text-xs gap-1.5">
                  <Buildings size={15} />
                  3. Interés Inmobiliario
                </TabsTrigger>
              </TabsList>

              {/* PESTAÑA 1: IDENTIFICACIÓN Y DATOS PERSONALES */}
              <TabsContent value="personales" className="space-y-3.5 focus-visible:outline-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Nombres *</label>
                    <Input
                      required
                      value={formData.nombres}
                      onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                      placeholder="Ej. Juan Carlos"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Apellidos *</label>
                    <Input
                      required
                      value={formData.apellidos}
                      onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                      placeholder="Ej. Pérez Morales"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">DPI / CUI (13 dígitos)</label>
                    <Input
                      maxLength={13}
                      value={formData.dpi}
                      onChange={e => setFormData({ ...formData, dpi: e.target.value.replace(/\D/g, '') })}
                      placeholder="Ej. 2450123450101"
                      className="h-9 text-xs sm:text-sm font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">{formData.dpi.length}/13 dígitos</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">NIT</label>
                    <Input
                      value={formData.nit}
                      onChange={e => setFormData({ ...formData, nit: e.target.value })}
                      placeholder="CF o número de NIT"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Género</label>
                    <select
                      value={formData.genero}
                      onChange={e => setFormData({ ...formData, genero: e.target.value as any })}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Fecha Nacimiento</label>
                    <Input
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Estado Civil</label>
                    <select
                      value={formData.estado_civil}
                      onChange={e => setFormData({ ...formData, estado_civil: e.target.value })}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="soltero">Soltero(a)</option>
                      <option value="casado">Casado(a)</option>
                      <option value="unido">Unido(a)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Profesión u Oficio</label>
                  <Input
                    value={formData.profesion}
                    onChange={e => setFormData({ ...formData, profesion: e.target.value })}
                    placeholder="Ej. Comerciante, Perito Contador, Agricultor..."
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>
              </TabsContent>

              {/* PESTAÑA 2: CONTACTO Y DOMICILIO */}
              <TabsContent value="contacto" className="space-y-3.5 focus-visible:outline-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Teléfono Principal (WhatsApp) *</label>
                    <Input
                      required
                      value={formData.telefono}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="Ej. 5555-1234"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Teléfono Secundario / Casa</label>
                    <Input
                      value={formData.telefono_secundario}
                      onChange={e => setFormData({ ...formData, telefono_secundario: e.target.value })}
                      placeholder="Ej. 7777-8899"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Correo Electrónico</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@ejemplo.com"
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Dirección Domiciliar</label>
                  <Input
                    value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Ej. Cantón Central, Lote 5, Zona 1"
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Departamento *</span>
                      {cargandoDepartamentos && <span className="text-[10px] text-muted-foreground animate-pulse">Cargando...</span>}
                    </label>
                    <select
                      value={
                        departamentos.find(d => d.name === formData.departamento || String(d.geonameId) === String(departamentoSeleccionadoId))
                          ? String(departamentos.find(d => d.name === formData.departamento || String(d.geonameId) === String(departamentoSeleccionadoId))?.geonameId)
                          : formData.departamento
                      }
                      onChange={e => handleDepartamentoChange(e.target.value)}
                      disabled={cargandoDepartamentos}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">{cargandoDepartamentos ? 'Cargando departamentos...' : '-- Seleccionar Departamento --'}</option>
                      {departamentos.length > 0 ? (
                        departamentos.map(d => (
                          <option key={d.geonameId} value={String(d.geonameId)}>
                            {d.name}
                          </option>
                        ))
                      ) : (
                        DEPARTAMENTOS_GT_FALLBACK.map(dep => (
                          <option key={dep} value={dep}>
                            {dep}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Municipio</span>
                      {cargandoMunicipios && <span className="text-[10px] text-muted-foreground animate-pulse">Cargando...</span>}
                    </label>
                    {municipios.length > 0 ? (
                      <select
                        value={
                          municipios.find(m => m.name.toLowerCase() === formData.municipio.toLowerCase())?.name || formData.municipio
                        }
                        onChange={e => handleMunicipioChange(e.target.value)}
                        disabled={cargandoMunicipios}
                        className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">{cargandoMunicipios ? 'Cargando municipios...' : '-- Seleccionar Municipio --'}</option>
                        {municipios.map(m => (
                          <option key={m.geonameId} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={formData.municipio}
                        onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                        placeholder={cargandoMunicipios ? 'Cargando municipios...' : 'Ej. Guatemala, Quetzaltenango...'}
                        className="h-9 text-xs sm:text-sm"
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* PESTAÑA 3: INTERÉS INMOBILIARIO Y SEGUIMIENTO */}
              <TabsContent value="interes" className="space-y-3.5 focus-visible:outline-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Proyecto / Finca de Interés</label>
                    <select
                      value={formData.finca_id}
                      onChange={e => setFormData({ ...formData, finca_id: e.target.value, lote_id: '' })}
                      className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Seleccione Finca...</option>
                      {fincas.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Lote Específico</label>
                    <select
                      value={formData.lote_id}
                      onChange={e => setFormData({ ...formData, lote_id: e.target.value })}
                      className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Sin lote específico / Indeciso</option>
                      {lotesDisponiblesForm.map(l => (
                        <option key={l.id} value={l.id}>
                          Lote {l.numero_lote} ({l.codigo_unico}) {l.precio_venta ? ` - Q ${Number(l.precio_venta).toLocaleString()}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Origen del Lead</label>
                    <select
                      value={formData.origen}
                      onChange={e => setFormData({ ...formData, origen: e.target.value })}
                      className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="redes_sociales">Redes Sociales (Facebook / Instagram)</option>
                      <option value="recomendado">Recomendado / Familiar</option>
                      <option value="rotulo_campo">Rótulo en Terreno / Campo</option>
                      <option value="visita_oficina">Visita en Oficina</option>
                      <option value="otro">Otro medio</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Presupuesto Estimado (Q)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.presupuesto_estimado}
                      onChange={e => setFormData({ ...formData, presupuesto_estimado: e.target.value })}
                      placeholder="Ej. 85000"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Asesor Comercial Asignado</label>
                    <select
                      value={formData.asesor_id}
                      onChange={e => setFormData({ ...formData, asesor_id: e.target.value })}
                      className="w-full h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Asignar automáticamente a mí</option>
                      {asesores.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Fecha Próximo Contacto</label>
                    <Input
                      type="datetime-local"
                      value={formData.fecha_proximo_contacto}
                      onChange={e => setFormData({ ...formData, fecha_proximo_contacto: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Notas y Requerimientos</label>
                  <textarea
                    rows={3}
                    value={formData.notas}
                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Detalla lo que busca: medidas preferidas, enganche disponible, facilidades de pago..."
                    className="w-full p-2.5 text-xs sm:text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {guardando ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Registrar Prospecto Completo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR CONTACTO / SEGUIMIENTO */}
      <Dialog open={modalContactoAbierto} onOpenChange={setModalContactoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <ChatCircleText size={20} className="text-emerald-600" />
              Registrar Contacto de Seguimiento
            </DialogTitle>
          </DialogHeader>

          {prospectoSeleccionado && (
            <form onSubmit={handleGuardarContacto} className="space-y-4 pt-1">
              <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">{prospectoSeleccionado.nombre_completo}</p>
                <p className="text-muted-foreground">Teléfono: {prospectoSeleccionado.telefono}</p>
                {prospectoSeleccionado.finca && (
                  <p className="text-muted-foreground">Interés: {prospectoSeleccionado.finca.nombre}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Tipo de Interacción *</label>
                <select
                  value={formContacto.tipo_interaccion}
                  onChange={e => setFormContacto({ ...formContacto, tipo_interaccion: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="llamada">Llamada Telefónica</option>
                  <option value="whatsapp">Mensaje por WhatsApp</option>
                  <option value="visita">Visita al Terreno / Finca</option>
                  <option value="reunion_oficina">Reunión en Oficina</option>
                  <option value="correo">Correo Electrónico</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Resumen de la Conversación *</label>
                <textarea
                  required
                  rows={3}
                  value={formContacto.detalle}
                  onChange={e => setFormContacto({ ...formContacto, detalle: e.target.value })}
                  placeholder="Ej. Se le compartieron las fotos del lote 14. Indica que viajará el sábado para verlo en persona..."
                  className="w-full p-2.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Mover a Nueva Etapa (Opcional)</label>
                <select
                  value={formContacto.nuevo_estado}
                  onChange={e => setFormContacto({ ...formContacto, nuevo_estado: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Mantener en etapa actual ({prospectoSeleccionado.estado})</option>
                  <option value="contactado">Mover a Contactado</option>
                  <option value="visita_agendada">Mover a Visita Agendada</option>
                  <option value="negociacion">Mover a En Negociación</option>
                  <option value="ganado">Cerrar como Venta Ganada</option>
                  <option value="perdido">Marcar como Descartado / Perdido</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Fecha Próximo Contacto (Opcional)</label>
                <Input
                  type="datetime-local"
                  value={formContacto.fecha_proximo_contacto}
                  onChange={e => setFormContacto({ ...formContacto, fecha_proximo_contacto: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalContactoAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Registrar & Reiniciar 48h
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CONVERTIR PROSPECTO EN COMPRADOR OFICIAL */}
      <Dialog open={modalConvertirAbierto} onOpenChange={setModalConvertirAbierto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Handshake size={22} weight="duotone" />
              Convertir Prospecto a Comprador Oficial
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConvertirCliente} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Se creará la ficha formal del cliente en la base de datos de compradores para habilitar contratos, planes de amortización y facturación.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Nombres *</label>
                <Input
                  required
                  value={formConvertir.nombres}
                  onChange={e => setFormConvertir({ ...formConvertir, nombres: e.target.value })}
                  placeholder="Ej. Juan Carlos"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Apellidos *</label>
                <Input
                  required
                  value={formConvertir.apellidos}
                  onChange={e => setFormConvertir({ ...formConvertir, apellidos: e.target.value })}
                  placeholder="Ej. Pérez Morales"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">DPI / CUI (13 dígitos) *</label>
                <Input
                  required
                  maxLength={13}
                  value={formConvertir.dpi}
                  onChange={e => setFormConvertir({ ...formConvertir, dpi: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ej. 2450123450101"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
                <span className="text-[10px] text-muted-foreground">{formConvertir.dpi.length}/13 dígitos</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">NIT (Opcional)</label>
                <Input
                  value={formConvertir.nit}
                  onChange={e => setFormConvertir({ ...formConvertir, nit: e.target.value })}
                  placeholder="CF o número de NIT"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Teléfono Principal *</label>
                <Input
                  required
                  value={formConvertir.telefono}
                  onChange={e => setFormConvertir({ ...formConvertir, telefono: e.target.value })}
                  placeholder="Ej. 55551234"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Teléfono Secundario</label>
                <Input
                  value={formConvertir.telefono_secundario}
                  onChange={e => setFormConvertir({ ...formConvertir, telefono_secundario: e.target.value })}
                  placeholder="Ej. 77778899"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Correo Electrónico</label>
              <Input
                type="email"
                value={formConvertir.email}
                onChange={e => setFormConvertir({ ...formConvertir, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Género *</label>
                <select
                  value={formConvertir.genero}
                  onChange={e => setFormConvertir({ ...formConvertir, genero: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Fecha Nacimiento *</label>
                <Input
                  type="date"
                  required
                  value={formConvertir.fecha_nacimiento}
                  onChange={e => setFormConvertir({ ...formConvertir, fecha_nacimiento: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Estado Civil</label>
                <select
                  value={formConvertir.estado_civil}
                  onChange={e => setFormConvertir({ ...formConvertir, estado_civil: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="soltero">Soltero(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="unido">Unido(a)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Profesión u Oficio</label>
              <Input
                value={formConvertir.profesion}
                onChange={e => setFormConvertir({ ...formConvertir, profesion: e.target.value })}
                placeholder="Ej. Comerciante"
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Dirección Domiciliar *</label>
              <Input
                required
                value={formConvertir.direccion}
                onChange={e => setFormConvertir({ ...formConvertir, direccion: e.target.value })}
                placeholder="Ej. Cantón Central, Lote 5, Zona 1"
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg text-xs space-y-1 border border-emerald-200 dark:border-emerald-800">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle size={15} weight="bold" />
                Interés Inmobiliario Vinculado
              </p>
              <p className="text-muted-foreground">
                Proyecto: <strong>{prospectoSeleccionado?.finca?.nombre || 'General'}</strong> · Lote: <strong>{prospectoSeleccionado?.lote ? `Lote ${prospectoSeleccionado.lote.numero_lote} (${prospectoSeleccionado.lote.codigo_unico})` : 'Por definir en contrato'}</strong>
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalConvertirAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={convirtiendo} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                {convirtiendo ? 'Procesando conversión...' : 'Confirmar Comprador & Crear Venta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CARGA MASIVA DE PROSPECTOS & ASIGNACIÓN A ASESORES */}
      <Dialog open={modalImportarAbierto} onOpenChange={setModalImportarAbierto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base sm:text-lg font-bold">
              <span className="flex items-center gap-2">
                <UploadSimple size={20} weight="bold" className="text-emerald-600" />
                Carga Masiva de Leads & Asignación
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDescargarPlantillaExcel}
                className="text-xs gap-1.5 h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                title="Descargar archivo plantilla oficial en Microsoft Excel (.xlsx)"
              >
                <FileXls size={15} weight="bold" className="text-emerald-600" /> Descargar Plantilla Excel (.xlsx)
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Table size={15} className="text-blue-600" />
                  Estructura Oficial para Microsoft Excel (.xlsx):
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300 font-mono">
                  13 Columnas Compatibles
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Descarga la plantilla oficial en Excel (.xlsx) con el botón superior, llénala con los datos de tus prospectos y selecciónala aquí abajo.
                <br />
                <strong>Columnas:</strong> <code>nombre_completo, nombres, apellidos, telefono, telefono_secundario, email, dpi, nit, departamento, municipio, direccion, presupuesto_estimado, notas</code>
              </p>
            </div>

            {/* Selector de Archivo Excel / CSV */}
            <div className="p-3 bg-muted/30 border border-dashed border-border/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UploadSimple size={15} className="text-emerald-600" />
                  Opción 1: Seleccionar Archivo Excel desde tu Equipo (.xlsx / .xls / .csv)
                </span>
                {nombreArchivoCargado && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                    Cargado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="input-archivo-leads"
                  ref={fileInputRef}
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 gap-1.5 text-xs border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <FileArrowDown size={14} weight="bold" /> Seleccionar Archivo
                </Button>
                <span className="text-xs text-muted-foreground truncate">
                  {nombreArchivoCargado || 'Ningún archivo seleccionado todavía'}
                </span>
              </div>
            </div>

            {/* Parámetros de Asignación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Asignar a Asesor</label>
                <select
                  value={asesorImportacion}
                  onChange={e => setAsesorImportacion(e.target.value)}
                  disabled={distribuirEquitativo}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background disabled:opacity-60"
                >
                  <option value="">-- Sin asesor inicial --</option>
                  {asesores.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Proyecto o Finca de Interés</label>
                <select
                  value={fincaImportacion}
                  onChange={e => setFincaImportacion(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
                >
                  <option value="">-- Asignar Finca General --</option>
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 pt-1 flex items-center justify-between border-t border-border/60">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={distribuirEquitativo}
                      onChange={e => setDistribuirEquitativo(e.target.checked)}
                      className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                    />
                    Distribuir equitativamente (Round-Robin) entre asesores
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Reparte los prospectos uno por uno entre todos los asesores activos para equilibrar la carga.
                  </p>
                </div>

                <select
                  value={origenImportacion}
                  onChange={e => setOrigenImportacion(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background"
                >
                  <option value="facebook_ads">Campaña Facebook</option>
                  <option value="feria_inmobiliaria">Feria Inmobiliaria</option>
                  <option value="base_datos_whatsapp">Base WhatsApp</option>
                  <option value="importacion_masiva">Importación General</option>
                </select>
              </div>
            </div>

            {/* Área de Texto Masivo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Opción 2: O Pegar Filas Directamente (Copiar desde Excel / Google Sheets) *
                </label>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {textoMasivo.split('\n').filter(l => l.trim().length > 0).length} filas detectadas
                </span>
              </div>
              <textarea
                rows={8}
                value={textoMasivo}
                onChange={e => setTextoMasivo(e.target.value)}
                placeholder={`Ejemplo:\nJuan Perez, 55443322, 44332211, juan@gmail.com, 2456789010101, 75000, Interesado en lote esquinero\nMaria Gomez, 33221100, , maria@gmail.com, 1987654320101, 60000, Pregunto por Facebook`}
                className="w-full p-3 font-mono text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalImportarAbierto(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleProcesarCargaMasiva}
              disabled={importandoMasivo || !textoMasivo.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {importandoMasivo ? 'Importando en base de datos...' : 'Importar & Asignar Prospectos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: FORMULARIO DE CAPTURA PARA REDES SOCIALES (LEAD MAGNET) */}
      <Dialog open={modalRedesAbierto} onOpenChange={setModalRedesAbierto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base sm:text-lg font-bold">
              <span className="flex items-center gap-2">
                <ShareNetwork size={20} weight="bold" className="text-blue-600" />
                Formulario Seguro para Redes Sociales
              </span>
              <Badge className="bg-blue-600 text-white text-[10px]">
                Protección Anti-Bot Activa
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/60 rounded-xl border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Canal de Campaña:</span>
                <div className="flex items-center gap-1.5">
                  {['facebook', 'instagram', 'tiktok', 'whatsapp'].map(c => (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      variant={canalRed === c ? 'default' : 'outline'}
                      onClick={() => setCanalRed(c)}
                      className={`h-7 px-2 text-[11px] capitalize ${canalRed === c ? 'bg-blue-600 text-white' : ''}`}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Opción 1: Formulario directo para redes (Landing ultraligera) */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShareNetwork size={14} className="text-blue-600" />
                    Enlace al Formulario Directo (Recomendado para Anuncios):
                  </span>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                    Mayor conversión
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/registro?origen=${canalRed}`}
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/registro?origen=${canalRed}`)
                      toast.success(`Enlace de formulario copiado (${canalRed.toUpperCase()}).`)
                    }}
                    className="h-8 gap-1 text-xs shrink-0"
                    title="Copiar enlace"
                  >
                    <Copy size={14} /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => window.open(`/registro?origen=${canalRed}`, '_blank')}
                    className="h-8 gap-1 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                    title="Abrir en pestaña nueva"
                  >
                    <ArrowSquareOut size={14} /> Abrir
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Lleva al visitante directamente a un formulario móvil rápido sin distracciones, ideal para campañas de Meta Ads y TikTok.
                </p>
              </div>

              {/* Opción 2: Catálogo interactivo completo */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Compass size={14} className="text-emerald-600" />
                    Enlace al Catálogo Público Completo con Lotes:
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                    Interactivo
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/catalogo?origen=${canalRed}`}
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/catalogo?origen=${canalRed}`)
                      toast.success(`Enlace del catálogo copiado (${canalRed.toUpperCase()}).`)
                    }}
                    className="h-8 gap-1 text-xs shrink-0"
                    title="Copiar enlace"
                  >
                    <Copy size={14} /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/catalogo?origen=${canalRed}`, '_blank')}
                    className="h-8 gap-1 text-xs shrink-0 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                    title="Abrir en pestaña nueva"
                  >
                    <ArrowSquareOut size={14} /> Abrir
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Muestra la galería de fincas, filtros de precios y medidas, cotizador público y botón de contacto por WhatsApp.
                </p>
              </div>
            </div>

            {/* Formulario de Prueba en Vivo */}
            <form onSubmit={handleEnviarLeadPrueba} className="p-4 bg-card rounded-xl border space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <ChatCircleText size={15} className="text-blue-600" />
                Prueba del Formulario de Captura (Simulador de Lead)
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Nombre Completo *</label>
                  <Input
                    required
                    placeholder="Ej. Sofía Hernández"
                    value={formPruebaRed.nombre_completo}
                    onChange={e => setFormPruebaRed({ ...formPruebaRed, nombre_completo: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Teléfono / WhatsApp *</label>
                  <Input
                    required
                    placeholder="Ej. 55667788"
                    value={formPruebaRed.telefono}
                    onChange={e => setFormPruebaRed({ ...formPruebaRed, telefono: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Zona o Departamento</label>
                  <Input
                    placeholder="Ej. San Lucas, Sacatepéquez"
                    value={formPruebaRed.departamento_interes}
                    onChange={e => setFormPruebaRed({ ...formPruebaRed, departamento_interes: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Presupuesto Estimado (Q)</label>
                  <Input
                    type="number"
                    placeholder="Ej. 70000"
                    value={formPruebaRed.presupuesto_estimado}
                    onChange={e => setFormPruebaRed({ ...formPruebaRed, presupuesto_estimado: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Mensaje o Consulta</label>
                <Input
                  placeholder="Ej. Deseo información de enganche fraccionado en Finca El Roble"
                  value={formPruebaRed.mensaje}
                  onChange={e => setFormPruebaRed({ ...formPruebaRed, mensaje: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={enviandoRed}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 gap-1.5 shadow-sm"
              >
                {enviandoRed ? 'Procesando captura...' : `Enviar Prospecto de Prueba (${canalRed.toUpperCase()})`}
              </Button>
            </form>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalRedesAbierto(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProspectosModule
