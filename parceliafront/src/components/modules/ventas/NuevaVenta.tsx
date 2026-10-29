import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Trash,
  User,
  Barcode,
  CurrencyCircleDollar,
  FileText,
  CalendarBlank,
  MagnifyingGlass,
  Receipt
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { clienteService, prendaService, ventaService, isAuthError, api } from '@/lib/api'
import { format, addMonths, addWeeks, addDays } from 'date-fns'
import { useKV } from '@/hooks/use-kv'
import { usePermissions } from '@/hooks/use-permissions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { sucursalService } from '@/lib/api'
import { GastosCreditoSelector } from '@/components/modules/gastos/GastosCreditoSelector'

interface NuevaVentaProps {
  onVolver: () => void
  onVentaRegistrada: () => void
}

interface ClienteLocal {
  id: number
  nombres: string
  apellidos: string
  dpi: string
  nit?: string
  telefono?: string
}

interface Producto {
  codigo: string
  descripcion: string
  precio_unitario: number
  tipo_precio: 'normal' | 'promocion'
}

interface ItemVenta {
  codigo: string
  producto: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
  /** ID numérico de la prenda en BD (requerido para POST /ventas) */
  prendaId?: number
}

interface MetodoPago {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
  monto: number
  referencia: string
}

export function NuevaVenta({ onVolver, onVentaRegistrada }: NuevaVentaProps) {
  const [loading, setLoading] = useState(false)

  // Estados del formulario
  const [session] = useKV<any>('user-session', null)
  const [vendedor] = useState(session?.username || 'Cajero')
  const [sucursalId, setSucursalId] = useState<string>('')
  const [moneda] = useState('Quetzal')
  const [tipoComprobante, setTipoComprobante] = useState('FEL')
  const [nit, setNit] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'credito' | 'apartado'>('contado')
  const [estadoVenta, setEstadoVenta] = useState<'pendiente' | 'pagada' | 'apartado' | 'plan_pagos'>('pendiente')
  const [fechaFactura, setFechaFactura] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  
  // Estado para Consumidor Final
  const [consumidorFinal, setConsumidorFinal] = useState(false)
  const [searchingNit, setSearchingNit] = useState(false)
  const [searchingCui, setSearchingCui] = useState(false)
  
  // Estados para venta a CRÉDITO
  const [enganche, setEnganche] = useState(0)
  const [numeroCuotas, setNumeroCuotas] = useState(3)
  const [tasaInteresMensual, setTasaInteresMensual] = useState(5) // 5% mensual por defecto
  
  // Gastos adicionales para crédito
  const [gastosCredito, setGastosCredito] = useState({
    seguro: 0,
    estudio: 0,
    apertura: 0,
    otros: 0
  })
  const [gastosCatalogoSeleccionados, setGastosCatalogoSeleccionados] = useState<number[]>([])
  const [totalGastosCatalogo, setTotalGastosCatalogo] = useState(0)
  
  // Frecuencia de crédito
  const [tipoInteresCredito, setTipoInteresCredito] = useState<'semanal' | 'quincenal' | 'mensual'>('mensual')
  const [diasGracia, setDiasGracia] = useState(0)
  const [configVentas, setConfigVentas] = useState<{
    apartado_habilitado: boolean | null,
    dias_gracia: number,
    frecuencia_defecto: 'semanal' | 'quincenal' | 'mensual',
    tasa_interes_defecto: number
  }>({
    apartado_habilitado: null, // null indica que se está cargando
    dias_gracia: 0,
    frecuencia_defecto: 'mensual',
    tasa_interes_defecto: 5.00
  })

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const query = new URLSearchParams()
        // Priorizar la sucursal seleccionada en el formulario, luego la de la sesión
        const sucursalActual = sucursalId || session?.userData?.sucursal_id || session?.sucursal_id
        
        if (sucursalActual) {
          query.append('sucursal_id', String(sucursalActual))
        }

        const queryString = query.toString()
        const response = await api.get('/contabilidad/parametrizacion-mora/activa' + (queryString ? `?${queryString}` : '')) as any
        const data = response.data?.data || response.data
        
        if (data) {
          const isApartadoEnabled = data.apartado_habilitado === true || data.apartado_habilitado === 1 || data.apartado_habilitado === '1' || data.apartado_habilitado === 'true'
          setConfigVentas({
            apartado_habilitado: isApartadoEnabled,
            dias_gracia: data.dias_gracia || 0,
            frecuencia_defecto: data.frecuencia_defecto || 'mensual',
            tasa_interes_defecto: parseFloat(data.tasa_interes_defecto) || 5.00
          })
          setDiasGracia(data.dias_gracia || 0)
          setTipoInteresCredito(data.frecuencia_defecto || 'mensual')
          setTasaInteresMensual(parseFloat(data.tasa_interes_defecto) || 5.00)
        } else {
          // Si no hay data, por defecto habilitamos (comportamiento base)
          setConfigVentas(prev => ({ ...prev, apartado_habilitado: true }))
        }
      } catch (error) {
        console.error('Error cargando configuración de venta:', error)
        // En caso de error, dejamos como deshabilitado para evitar inconsistencias
        setConfigVentas(prev => ({ ...prev, apartado_habilitado: false }))
      }
    }
    cargarConfig()
  }, [session, sucursalId])
  
  // Estados para APARTADO
  const [anticipoApartado, setAnticipoApartado] = useState(0)
  const [diasApartado, setDiasApartado] = useState(15) // 15 días por defecto

  // Datos
  const [clientes, setClientes] = useState<ClienteLocal[]>([])
  const [prendasDisponibles, setPrendasDisponibles] = useState<any[]>([])
  const [items, setItems] = useState<ItemVenta[]>([])
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([{
    metodo: 'efectivo',
    monto: 0,
    referencia: ''
  }])

  // Estado para creación rápida de cliente
  const [openCrearCliente, setOpenCrearCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombres: '',
    apellidos: '',
    dpi: '',
    nit: '',
    fecha_nacimiento: format(new Date(1990, 0, 1), 'yyyy-MM-dd'),
    genero: 'masculino',
    telefono: '',
    email: '',
    direccion: 'Ciudad',
    sucursal: '', // Se llenará en useEffect
    tipo_cliente: 'regular'
  })

  // Cargar sucursales al inicio (para selector de venta y modal de cliente)
  const [sucursales, setSucursales] = useState<any[]>([])
  const [refrescarSucursalesTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)
  
  useEffect(() => {
    // Cargar sucursales al montar el componente
    const cargarSucursales = async () => {
      try {
        const res = await sucursalService.getActivas()
        if (res.success && res.data) {
          setSucursales(res.data)
          // Seleccionar la primera sucursal por defecto
          if (res.data.length > 0 && !sucursalId) {
            setSucursalId(res.data[0].id.toString())
          }
        }
      } catch (error) {
        console.error('Error cargando sucursales:', error)
      }
    }
    cargarSucursales()
  }, [refrescarSucursalesTrigger])

  // Permiso para aplicar descuento (parametrizable por admin)
  const { hasPermission } = usePermissions(session?.userData ?? null)
  const puedeAplicarDescuento = hasPermission('ventas', 'aplicar_descuento')

  // Tipo de descuento: por porcentaje (%) o por nivel básico (monto fijo en Q)
  const [tipoDescuentoItem, setTipoDescuentoItem] = useState<'porcentaje' | 'monto'>('monto')
  const [tipoDescuentoGeneral, setTipoDescuentoGeneral] = useState<'porcentaje' | 'monto'>('monto')

  // Estados temporales para agregar productos
  const [codigoProducto, setCodigoProducto] = useState('')
  const [descripcionProducto, setDescripcionProducto] = useState('')
  const [cantidadProducto, setCantidadProducto] = useState(1)
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [descuentoItem, setDescuentoItem] = useState(0)

  // Totales (descuento general: valor en % o en Q según tipoDescuentoGeneral)
  const [descuentoGeneral, setDescuentoGeneral] = useState(0)

  const calcularSubtotal = (precio: number, cantidad: number, descuentoMonto: number) => {
    return (precio * cantidad) - descuentoMonto
  }

  const subtotalItems = items.reduce((sum, item) => sum + item.subtotal, 0)
  const descuentoGeneralMonto = tipoDescuentoGeneral === 'porcentaje'
    ? subtotalItems * (descuentoGeneral / 100)
    : descuentoGeneral
  const totalVenta = subtotalItems - descuentoGeneralMonto
  const totalPagado = metodosPago.reduce((sum, mp) => sum + mp.monto, 0)
  const cambioDevolver = totalPagado - totalVenta
  
  // Cálculos para venta a crédito (después de totalVenta)
  const totalGastosCredito = gastosCredito.seguro + gastosCredito.estudio + gastosCredito.apertura + gastosCredito.otros
  const saldoFinanciar = totalVenta - enganche
  const interesTotal = saldoFinanciar * (tasaInteresMensual / 100) * numeroCuotas
  const totalCredito = saldoFinanciar + interesTotal + totalGastosCredito
  const cuotaMensual = numeroCuotas > 0 ? totalCredito / numeroCuotas : 0
  const gastosPorCuota = numeroCuotas > 0 ? totalGastosCredito / numeroCuotas : 0
  
  // Cálculos para apartado
  const saldoApartado = totalVenta - anticipoApartado
  const fechaLimiteApartado = new Date()
  fechaLimiteApartado.setDate(fechaLimiteApartado.getDate() + diasApartado)

  // Calcular estado automáticamente según tipo de venta y pago
  useEffect(() => {
    let nuevoEstado: 'pendiente' | 'pagada' | 'apartado' | 'plan_pagos' = 'pendiente'
    
    if (tipoVenta === 'contado') {
      // Contado: pagada si se cubre el total, pendiente si no
      nuevoEstado = totalPagado >= totalVenta && totalVenta > 0 ? 'pagada' : 'pendiente'
    } else if (tipoVenta === 'credito') {
      // Crédito: plan_pagos si se cubre el enganche, pendiente si no
      nuevoEstado = totalPagado >= enganche && enganche > 0 ? 'plan_pagos' : 'pendiente'
    } else if (tipoVenta === 'apartado') {
      // Apartado: apartado si se cubre el anticipo, pendiente si no
      nuevoEstado = totalPagado >= anticipoApartado && anticipoApartado > 0 ? 'apartado' : 'pendiente'
    }
    
    setEstadoVenta(nuevoEstado)
  }, [tipoVenta, totalPagado, totalVenta, enganche, anticipoApartado])

  // Sincronizar total de gastos provenientes del catálogo con el estado interno de gastos de crédito
  useEffect(() => {
    setGastosCredito(prev => ({
      ...prev,
      // Por ahora acumulamos todos los gastos seleccionados en "otros"
      otros: totalGastosCatalogo
    }))
  }, [totalGastosCatalogo])

  useEffect(() => {
    cargarClientes()
    cargarPrendas()
  }, [])

  const cargarPrendas = async (reintentar = false) => {
    try {
      // Usar endpoint de ventas que excluye prendas ya vendidas/apartadas/en plan de pago
      const response = await ventaService.getPrendasDisponibles({ per_page: 200 })
      const data = response?.data

      if (response?.success && data != null) {
        const lista = Array.isArray(data) ? data : []
        setPrendasDisponibles(lista)
        if (lista.length > 0) {
          toast.success(`${lista.length} productos disponibles para vender`)
        } else if (!reintentar) {
          // Reintentar una vez por si el token no estaba listo al primer request
          await new Promise(r => setTimeout(r, 400))
          await cargarPrendas(true)
        } else {
          toast.info('No hay productos disponibles. Agregue prendas en venta (Créditos) o compras activas (Compras).')
        }
      } else {
        setPrendasDisponibles([])
        if (!reintentar) {
          await new Promise(r => setTimeout(r, 400))
          await cargarPrendas(true)
        }
      }
    } catch (error: any) {
      console.error('❌ Error al cargar prendas:', error)
      if (!reintentar) {
        await new Promise(r => setTimeout(r, 400))
        try {
          await cargarPrendas(true)
          return
        } catch {
          // fall-through al mensaje de error
        }
      }
      if (!isAuthError(error)) {
        toast.error(error?.message || 'Error al cargar inventario de productos')
      }
      setPrendasDisponibles([])
    }
  }

  const cargarClientes = async () => {
    try {
      const resultado = await clienteService.getActivos()
      if (resultado.success && resultado.data) {
        // Convertir Cliente (API) a ClienteLocal
        const clientesLocales: ClienteLocal[] = resultado.data.map(c => ({
          id: Number(c.id),
          nombres: c.nombres,
          apellidos: c.apellidos,
          dpi: c.dpi,
          nit: c.nit,
          telefono: c.telefono
        }))
        setClientes(clientesLocales)
      }
    } catch (error: any) {
      console.error('Error al cargar clientes:', error)
      if (!isAuthError(error)) {
        toast.error('Error al cargar lista de clientes')
      }
    }
  }

  const buscarNitEnSat = async () => {
    const nitLimpio = nit.trim()
    if (!nitLimpio) {
      toast.error('Ingrese un NIT válido')
      return
    }

    try {
      setSearchingNit(true)
      const res = await api.get(`/clientes/consulta-nit/${nitLimpio}`) as any
      if (res.success && res.nombre) {
        toast.success(`Contribuyente encontrado: ${res.nombre}`)
        
        // Tratar de buscar si ya existe un cliente local con ese NIT
        const clienteExistente = clientes.find(
          c => c.nit?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === nitLimpio.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        )
        if (clienteExistente) {
          setClienteId(clienteExistente.id)
          setBusquedaCliente(`${clienteExistente.nombres} ${clienteExistente.apellidos}`)
        } else {
          // Si no existe, preguntar si desea crearlo rápido y precargar los datos
          const nombresApellidos = res.nombre.split(',')
          let nombres = res.nombre
          let apellidos = ''
          if (nombresApellidos.length > 1) {
            apellidos = nombresApellidos[0].trim()
            nombres = nombresApellidos[1].trim()
          }
          setNuevoCliente(prev => ({
            ...prev,
            nombres,
            apellidos,
            nit: nitLimpio
          }))
          setOpenCrearCliente(true)
          toast.info('Contribuyente no registrado localmente. Se abrió el formulario de creación rápida.')
        }
      } else {
        toast.error(res.message || 'NIT no encontrado en la SAT')
      }
    } catch (error: any) {
      console.error('Error al buscar NIT:', error)
      toast.error(error?.message || 'Error al buscar el NIT en la SAT')
    } finally {
      setSearchingNit(false)
    }
  }

  const buscarCuiEnSat = async () => {
    const cuiLimpio = nuevoCliente.dpi.trim()
    if (!cuiLimpio || cuiLimpio.length < 13) {
      toast.error('Ingrese un CUI de 13 dígitos')
      return
    }

    try {
      setSearchingCui(true)
      const res = await api.get(`/clientes/consulta-cui/${cuiLimpio}`) as any
      if (res.success && res.nombre) {
        if (res.fallecido) {
          toast.warning(`Atención: El ciudadano ${res.nombre} aparece como FALLECIDO en RENAP.`)
        } else {
          toast.success(`CUI verificado: ${res.nombre}`)
        }
        const nombresApellidos = res.nombre.split(',')
        let nombres = res.nombre
        let apellidos = ''
        if (nombresApellidos.length > 1) {
          apellidos = nombresApellidos[0].trim()
          nombres = nombresApellidos[1].trim()
        }
        setNuevoCliente(prev => ({
          ...prev,
          nombres,
          apellidos
        }))
      } else {
        toast.error(res.message || 'CUI no encontrado')
      }
    } catch (error: any) {
      console.error('Error al buscar CUI:', error)
      toast.error(error?.message || 'Error al buscar el CUI')
    } finally {
      setSearchingCui(false)
    }
  }

  const clientesFiltrados = clientes.filter(c => {
    const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase()
    const dpi = c.dpi?.toLowerCase() || ''
    return nombreCompleto.includes(busquedaCliente.toLowerCase()) || dpi.includes(busquedaCliente.toLowerCase())
  })

  // Filtro de búsqueda para prendas
  const [busquedaPrenda, setBusquedaPrenda] = useState('')

  const prendasFiltradasEnSelect = prendasDisponibles.filter(p => {
    // Excluir prendas ya agregadas al carrito
    if (items.some(item => item.codigo === p.codigoPrenda)) return false

    // Aplicar filtro de búsqueda
    if (!busquedaPrenda.trim()) return true

    const busqueda = busquedaPrenda.toLowerCase()
    const codigo = p.codigoPrenda?.toLowerCase() || ''
    const descripcion = p.descripcion?.toLowerCase() || ''

    return codigo.includes(busqueda) || descripcion.includes(busqueda)
  })

  const handleSelectPrenda = (codigoPrenda: string) => {
    const prenda = prendasDisponibles.find(p => p.codigoPrenda === codigoPrenda)

    if (prenda) {
      // Verificar si ya está en el carrito
      if (items.some(item => item.codigo === prenda.codigoPrenda)) {
        toast.error('Este producto ya está en el carrito')
        return
      }

      setCodigoProducto(prenda.codigoPrenda)
      setDescripcionProducto(prenda.descripcion)
      setPrecioUnitario(prenda.precioVenta || prenda.valorVenta || 0)
      setCantidadProducto(1)
      setDescuentoItem(0)
      setBusquedaPrenda('') // Limpiar búsqueda

      // Sucursal ya se selecciona del dropdown - no es necesario asignarla desde la prenda

      toast.success(`Prenda seleccionada: ${prenda.descripcion}`)
    }
  }

  const buscarPrendaPorCodigo = () => {
    if (!codigoProducto.trim()) {
      toast.error('Ingrese un código de producto')
      return
    }

    const prenda = prendasDisponibles.find(p =>
      p.codigoPrenda.toLowerCase() === codigoProducto.toLowerCase().trim()
    )

    if (prenda) {
      handleSelectPrenda(prenda.codigoPrenda)
    } else {
      toast.error('Producto no encontrado en el inventario de ventas')
      setDescripcionProducto('')
      setPrecioUnitario(0)
    }
  }

  const handleCodigoKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarPrendaPorCodigo()
    }
  }

  const agregarProducto = () => {
    if (!codigoProducto || !descripcionProducto || precioUnitario <= 0 || cantidadProducto <= 0) {
      toast.error('Complete todos los campos del producto')
      return
    }

    const prenda = prendasDisponibles.find(p =>
      (p.codigoPrenda || p.codigo_prenda || '').toString().toLowerCase() === codigoProducto.trim().toLowerCase()
    )
    const prendaId = prenda != null ? Number(prenda.id) : undefined
    if (prendaId == null || isNaN(prendaId)) {
      toast.error('No se encontró el ID de la prenda. Recargue la lista de productos e intente de nuevo.')
      return
    }

    const base = precioUnitario * cantidadProducto
    const descuentoMonto = tipoDescuentoItem === 'porcentaje'
      ? base * (descuentoItem / 100)
      : Math.min(descuentoItem, base)

    const nuevoItem: ItemVenta = {
      codigo: codigoProducto,
      producto: descripcionProducto,
      cantidad: cantidadProducto,
      precio_unitario: precioUnitario,
      descuento: descuentoMonto,
      subtotal: calcularSubtotal(precioUnitario, cantidadProducto, descuentoMonto),
      prendaId
    }

    setItems([...items, nuevoItem])

    // Limpiar campos
    setCodigoProducto('')
    setDescripcionProducto('')
    setCantidadProducto(1)
    setPrecioUnitario(0)
    setDescuentoItem(0)

    toast.success('Producto agregado al carrito')
  }

  const handleCrearClienteRapido = async () => {
    if (!nuevoCliente.nombres || !nuevoCliente.apellidos) {
      toast.error('Complete los campos obligatorios del cliente (Nombres y Apellidos)')
      return
    }

    try {
      setLoading(true)
      const response = await clienteService.create({
        ...nuevoCliente,
        fechaNacimiento: nuevoCliente.fecha_nacimiento,
        genero: nuevoCliente.genero,
        nit: nuevoCliente.nit || 'C/F',
        email: nuevoCliente.email,
        estado: 'activo',
        tipoCliente: nuevoCliente.tipo_cliente,
        sucursal_id: parseInt(sucursalId) || null
      })

      if (response.success && response.data) {
        toast.success('Cliente creado correctamente')
        setOpenCrearCliente(false)
        await cargarClientes()
        setClienteId(Number(response.data.id))
        if (response.data.nit) setNit(response.data.nit)
      }
    } catch (error) {
      console.error('Error al crear cliente:', error)
      toast.error('Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleSeleccionarCliente = (id: string) => {
    const numericId = Number(id)
    setClienteId(numericId)

    // Auto-completar datos del cliente
    const cliente = clientes.find(c => c.id === numericId)
    if (cliente) {
      setNit(cliente.nit || 'C/F')
      toast.success(`Cliente seleccionado: ${cliente.nombres} ${cliente.apellidos}`)
    }

    // Al seleccionar cliente, si no hay montos en pagos y la venta tiene total, 
    // rellenar con el total si es venta al contado
    if (tipoVenta === 'contado' && metodosPago.length === 1 && metodosPago[0].monto === 0 && totalVenta > 0) {
      const nuevosMetodos = [...metodosPago]
      nuevosMetodos[0].monto = totalVenta
      setMetodosPago(nuevosMetodos)
    }
    
    // Desactivar consumidor final al seleccionar cliente
    setConsumidorFinal(false)
  }

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
    toast.info('Producto eliminado')
  }

  const agregarMetodoPago = () => {
    setMetodosPago([...metodosPago, {
      metodo: 'efectivo',
      monto: 0,
      referencia: ''
    }])
  }

  const eliminarMetodoPago = (index: number) => {
    if (metodosPago.length === 1) {
      toast.error('Debe haber al menos un método de pago')
      return
    }
    setMetodosPago(metodosPago.filter((_, i) => i !== index))
  }

  const actualizarMetodoPago = (index: number, campo: keyof MetodoPago, valor: any) => {
    const nuevosMetodos = [...metodosPago]
    nuevosMetodos[index] = { ...nuevosMetodos[index], [campo]: valor }
    setMetodosPago(nuevosMetodos)
  }

  const procesarVenta = async () => {
    if (items.length === 0) {
      toast.error('Debe agregar al menos un producto')
      return
    }

    // Validar cliente solo si no es consumidor final
    if (!consumidorFinal && !clienteId) {
      toast.error('Debe seleccionar un cliente o marcar como Consumidor Final')
      return
    }
    
    // Validar sucursal
    if (!sucursalId) {
      toast.error('Debe seleccionar una sucursal')
      return
    }

    // Validaciones según tipo de venta
    if (tipoVenta === 'contado') {
      if (totalPagado < totalVenta) {
        toast.error(`El total pagado (Q${totalPagado.toFixed(2)}) no cubre el monto de la venta (Q${totalVenta.toFixed(2)})`)
        return
      }
    } else if (tipoVenta === 'credito') {
      if (enganche <= 0) {
        toast.error('El crédito requiere un enganche mayor a 0')
        return
      }
      if (enganche >= totalVenta) {
        toast.error('El enganche no puede ser igual o mayor al total de la venta')
        return
      }
      if (numeroCuotas < 1 || numeroCuotas > 24) {
        toast.error('El número de cuotas debe estar entre 1 y 24')
        return
      }
      // Validar que el pago cubra al menos el enganche
      if (totalPagado < enganche) {
        toast.error(`Debe pagar al menos el enganche (Q${enganche.toFixed(2)})`)
        return
      }
    } else if (tipoVenta === 'apartado') {
      if (anticipoApartado <= 0) {
        toast.error('El apartado requiere un anticipo mayor a 0')
        return
      }
      if (anticipoApartado >= totalVenta) {
        toast.error('El anticipo no puede ser igual o mayor al total de la venta')
        return
      }
      // Validar que el pago cubra al menos el anticipo
      if (totalPagado < anticipoApartado) {
        toast.error(`Debe pagar al menos el anticipo (Q${anticipoApartado.toFixed(2)})`)
        return
      }
    }

    setLoading(true)

    try {
      // Preparar datos según tipo de venta
      const datosVenta: any = {
        cliente_id: consumidorFinal ? null : clienteId,
        consumidor_final: consumidorFinal,
        tipo_venta: tipoVenta,
        estado: estadoVenta,
        tipo_comprobante: tipoComprobante,
        nit: consumidorFinal ? 'C/F' : nit,
        sucursal_id: parseInt(sucursalId),
        fecha_factura: fechaFactura,
        items: items.map(item => {
          const id = item.prendaId ?? prendasDisponibles.find(p =>
            (p.codigoPrenda || p.codigo_prenda || '').toString() === item.codigo
          )?.id
          const prendaIdNum = id != null ? Number(id) : NaN
          if (isNaN(prendaIdNum)) {
            throw new Error(`Prenda "${item.codigo}" sin ID. Recargue la lista de productos.`)
          }
          return {
            prenda_id: prendaIdNum,
            precio_unitario: item.precio_unitario,
            descuento: item.descuento || 0
          }
        }),
        pagos: metodosPago.filter(mp => mp.monto > 0).map(mp => ({
          metodo: mp.metodo,
          monto: mp.monto,
          referencia: mp.referencia
        })),
        descuento_general: descuentoGeneralMonto,
        observaciones: `Venta ${tipoVenta.toUpperCase()} generada desde módulo ventas por ${vendedor}`
      }
      
      // Agregar campos específicos según tipo de venta
      if (tipoVenta === 'credito') {
        datosVenta.enganche = enganche
        datosVenta.numero_cuotas = numeroCuotas
        datosVenta.tasa_interes_mensual = tasaInteresMensual
        datosVenta.saldo_financiar = saldoFinanciar
        datosVenta.interes_total = interesTotal
        datosVenta.total_credito = totalCredito
        datosVenta.cuota_mensual = cuotaMensual
        datosVenta.frecuencia_pago = tipoInteresCredito
        datosVenta.dias_gracia = diasGracia
        // Enviamos el detalle de gastos provenientes del catálogo
        datosVenta.gasto_seguro = gastosCredito.seguro
        datosVenta.gasto_estudio = gastosCredito.estudio
        datosVenta.gasto_apertura = gastosCredito.apertura
        datosVenta.gasto_otros = gastosCredito.otros
        datosVenta.gastos_ids = gastosCatalogoSeleccionados
      } else if (tipoVenta === 'apartado') {
        datosVenta.anticipo = anticipoApartado
        datosVenta.saldo_pendiente = saldoApartado
        datosVenta.dias_apartado = diasApartado
        datosVenta.fecha_limite = fechaLimiteApartado.toISOString().split('T')[0]
      }

      const response = await ventaService.store(datosVenta)

      if (response.success) {
        toast.success('Venta registrada exitosamente')
        cargarPrendas() // Actualizar lista para que las prendas vendidas desaparezcan del selector

        // Descargar recibo automáticamente al registrar la venta
        const ventaId = response.data?.id ?? (response as any).id
        if (ventaId) {
          try {
            const blob = await ventaService.generarReciboVenta(String(ventaId))
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Recibo_Venta_${response.data?.codigo_venta ?? ventaId}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          } catch {
            toast.warning('Venta registrada. No se pudo descargar el recibo — puede reimprimirlo desde el listado.')
          }
        }

        onVentaRegistrada()
      } else {
        toast.error(response.message || 'Error al registrar la venta')
      }
    } catch (error: any) {
      console.error('Error al procesar venta:', error)
      toast.error(error.message || 'Error al procesar la venta')
    } finally {
      setLoading(false)
    }
  }

  const crearYCrearOtra = async () => {
    await procesarVenta()
    // Limpiar formulario y refrescar prendas disponibles para otra venta
    setItems([])
    setMetodosPago([{ metodo: 'efectivo', monto: 0, referencia: '' }])
    setDescuentoGeneral(0)
    setNit('')
    setClienteId(null)
    setBusquedaCliente('')
    cargarPrendas()
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onVolver}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Crear Venta</h1>
            <p className="text-sm text-muted-foreground">Registro de venta de múltiples productos. Considere abonos, ventas apartadas y ventas al crédito.</p>
          </div>
        </div>
      </div>

      {/* Información de Venta */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Venta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendedor*</Label>
              <Input value={vendedor} disabled />
            </div>
            <div className="space-y-2">
              <Label>Sucursal*</Label>
              <Select value={sucursalId} onValueChange={setSucursalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map(suc => (
                    <SelectItem key={suc.id} value={suc.id.toString()}>
                      {suc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={moneda} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quetzal">Quetzal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NIT*</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ingrese NIT Para BUSCAR"
                  value={consumidorFinal ? 'C/F' : nit}
                  onChange={(e) => setNit(e.target.value)}
                  disabled={consumidorFinal}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={buscarNitEnSat}
                  disabled={consumidorFinal || searchingNit || !nit.trim()}
                >
                  {searchingNit ? 'Buscando...' : 'Buscar SAT'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User size={16} />
                Cliente {!consumidorFinal && '*'}
              </Label>
              <div className="relative">
                <Input
                  placeholder="Buscar por nombre o DPI..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="mb-2"
                  disabled={consumidorFinal}
                />
                <Select
                  value={clienteId?.toString() || ''}
                  onValueChange={handleSeleccionarCliente}
                  disabled={consumidorFinal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={consumidorFinal ? 'Consumidor Final' : 'Seleccione un cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesFiltrados.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id.toString()}>
                        {cliente.nombres} {cliente.apellidos} (DPI: {cliente.dpi})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-primary text-primary hover:bg-primary/5"
                  onClick={() => setOpenCrearCliente(true)}
                  disabled={consumidorFinal}
                >
                  <Plus size={16} className="mr-2" />
                  Crear Cliente
                </Button>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consumidorFinal}
                    onChange={(e) => {
                      setConsumidorFinal(e.target.checked)
                      if (e.target.checked) {
                        setClienteId(null)
                        setNit('C/F')
                        setBusquedaCliente('')
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Consumidor Final</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Comprobante*</Label>
              <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEL">Factura Electrónica (FEL)</SelectItem>
                  <SelectItem value="RECIBO">Recibo</SelectItem>
                  <SelectItem value="NOTA">Nota de Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Venta*</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={tipoVenta === 'contado' ? 'default' : 'outline'}
                  onClick={() => {
                    setTipoVenta('contado')
                    if (totalVenta > 0 && metodosPago.length === 1 && metodosPago[0].monto === 0) {
                      actualizarMetodoPago(0, 'monto', totalVenta)
                    }
                  }}
                  className="flex-1 min-w-[80px]"
                >
                  Contado
                </Button>
                <Button
                  type="button"
                  variant={tipoVenta === 'credito' ? 'default' : 'outline'}
                  onClick={() => {
                    setTipoVenta('credito')
                    setTipoInteresCredito('mensual')
                    setNumeroCuotas(3)
                  }}
                  className="flex-1 min-w-[80px]"
                >
                  Crédito
                </Button>
                {configVentas.apartado_habilitado === true && (
                  <Button
                    type="button"
                    variant={tipoVenta === 'apartado' ? 'default' : 'outline'}
                    onClick={() => setTipoVenta('apartado')}
                    className="flex-1 min-w-[80px]"
                  >
                    Apartado
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado de Venta</Label>
              <div className={`
                flex items-center gap-2 px-3 py-2 rounded-md border font-medium
                ${estadoVenta === 'pagada' ? 'border-green-500 bg-green-50 text-green-700' : ''}
                ${estadoVenta === 'pendiente' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
                ${estadoVenta === 'plan_pagos' ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}
                ${estadoVenta === 'apartado' ? 'border-amber-500 bg-amber-50 text-amber-700' : ''}
              `}>
                <span className={`w-3 h-3 rounded-full 
                  ${estadoVenta === 'pagada' ? 'bg-green-500' : ''}
                  ${estadoVenta === 'pendiente' ? 'bg-yellow-500' : ''}
                  ${estadoVenta === 'plan_pagos' ? 'bg-blue-500' : ''}
                  ${estadoVenta === 'apartado' ? 'bg-amber-500' : ''}
                `}></span>
                <span>
                  {estadoVenta === 'pendiente' && 'Pendiente'}
                  {estadoVenta === 'pagada' && 'Pagada'}
                  {estadoVenta === 'plan_pagos' && 'Plan de Pagos'}
                  {estadoVenta === 'apartado' && 'Apartado'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Se calcula automáticamente según tipo y pago
              </p>
            </div>
          </div>

          {/* Mensaje informativo cuando se selecciona crédito o apartado sin productos */}
          {(tipoVenta === 'credito' || tipoVenta === 'apartado') && items.length === 0 && (
            <div className={`p-3 rounded-lg border ${
              tipoVenta === 'credito' 
                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <p className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart size={16} />
                Agregue productos primero
              </p>
              <p className="text-xs mt-1">
                La configuración de {tipoVenta === 'credito' ? 'crédito' : 'apartado'} aparecerá después de agregar productos a la venta.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarBlank size={16} />
              Fecha y Hora Factura*
            </Label>
            <Input
              type="datetime-local"
              value={fechaFactura}
              onChange={(e) => setFechaFactura(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Información de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Información de productos</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {prendasDisponibles.length} productos disponibles en venta
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Prenda */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ShoppingCart size={16} />
              Seleccionar Producto en Venta*
            </Label>
            <div className="space-y-2">
              <Input
                placeholder="Buscar por código o descripción..."
                value={busquedaPrenda}
                onChange={(e) => setBusquedaPrenda(e.target.value)}
              />
              <Select
                value={codigoProducto}
                onValueChange={handleSelectPrenda}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un producto del inventario" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {prendasFiltradasEnSelect.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {busquedaPrenda ? 'No se encontraron productos con ese criterio' : 'No hay más productos disponibles para venta'}
                    </div>
                  ) : (
                    prendasFiltradasEnSelect.map(prenda => (
                      <SelectItem key={prenda.id} value={prenda.codigoPrenda}>
                        <div className="flex flex-col">
                          <span className="font-medium">{prenda.codigoPrenda} - {prenda.descripcion}</span>
                          <span className="text-xs text-muted-foreground">
                            Precio: Q {(prenda.precioVenta || prenda.valorVenta || 0).toFixed(2)} |
                            Estado: {prenda.estado}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Detalles del producto seleccionado */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Barcode size={16} />
                Código de Prenda
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Código de barras"
                  value={codigoProducto}
                  onChange={(e) => setCodigoProducto(e.target.value)}
                  onKeyPress={handleCodigoKeyPress}
                  disabled
                  className="bg-muted"
                />
                <Button
                  type="button"
                  onClick={buscarPrendaPorCodigo}
                  variant="secondary"
                  size="icon"
                  disabled
                >
                  <MagnifyingGlass size={20} />
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descripción del Producto</Label>
              <Input
                placeholder="Se autocompleta al seleccionar"
                value={descripcionProducto}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={1}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio Unit.</Label>
              <Input
                type="number"
                placeholder="Q"
                value={precioUnitario}
                disabled
                className="bg-muted"
              />
            </div>
            {puedeAplicarDescuento && (
              <>
                <div className="space-y-2">
                  <Label>Tipo descuento</Label>
                  <RadioGroup
                    value={tipoDescuentoItem}
                    onValueChange={(v: 'porcentaje' | 'monto') => setTipoDescuentoItem(v)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="porcentaje" id="desc-item-pct" />
                      <Label htmlFor="desc-item-pct" className="font-normal">Porcentaje (%)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="monto" id="desc-item-monto" />
                      <Label htmlFor="desc-item-monto" className="font-normal">Nivel básico (Q)</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Descuento {tipoDescuentoItem === 'porcentaje' ? '(%)' : '(Q)'}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    max={tipoDescuentoItem === 'porcentaje' ? 100 : undefined}
                    step={tipoDescuentoItem === 'porcentaje' ? 1 : 0.01}
                    value={descuentoItem}
                    onChange={(e) => setDescuentoItem(Number(e.target.value) || 0)}
                  />
                </div>
              </>
            )}
          </div>

          <Button onClick={agregarProducto} className="w-full">
            <Plus size={20} className="mr-2" />
            Añadir Producto al Carrito
          </Button>

          {/* Tabla de productos */}
          {items.length > 0 && (
            <div className="border rounded-lg overflow-hidden mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    {puedeAplicarDescuento && <TableHead className="text-right">Descuento</TableHead>}
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell>{item.producto}</TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={item.precio_unitario} />
                      </TableCell>
                      {puedeAplicarDescuento && (
                        <TableCell className="text-right">
                          <MoneyDisplay amount={item.descuento} />
                        </TableCell>
                      )}
                      <TableCell className="text-right font-semibold">
                        <MoneyDisplay amount={item.subtotal} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarItem(index)}
                        >
                          <Trash size={16} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de CRÉDITO - después de agregar productos */}
      {tipoVenta === 'credito' && items.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-slate-600 dark:bg-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-800 dark:text-blue-200">Configuración del Crédito</CardTitle>
            <p className="text-xs text-muted-foreground dark:text-slate-300">Configure los términos del crédito para esta venta</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground dark:text-slate-200">Enganche (Q)*</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={enganche}
                  onChange={(e) => setEnganche(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  Mín. recomendado: Q{(totalVenta * 0.2).toFixed(2)} (20%)
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-slate-200">Frecuencia de Pago*</Label>
                <Select 
                  value={tipoInteresCredito} 
                  onValueChange={(v: any) => {
                    setTipoInteresCredito(v)
                    // Ajustar cuotas por defecto según frecuencia para que sea ~3 meses
                    if (v === 'mensual') setNumeroCuotas(3)
                    else if (v === 'quincenal') setNumeroCuotas(6)
                    else if (v === 'semanal') setNumeroCuotas(12)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-slate-200">Número de Cuotas (Máx 3 meses)*</Label>
                <Select value={numeroCuotas.toString()} onValueChange={(v) => setNumeroCuotas(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoInteresCredito === 'mensual' && [1, 2, 3].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} meses</SelectItem>
                    ))}
                    {tipoInteresCredito === 'quincenal' && [1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} quincenas</SelectItem>
                    ))}
                    {tipoInteresCredito === 'semanal' && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} semanas</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-slate-200">Tasa Interés Mensual (%)*</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={tasaInteresMensual}
                  onChange={(e) => setTasaInteresMensual(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-slate-200">Días de Gracia</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={diasGracia}
                  onChange={(e) => setDiasGracia(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-[10px] text-muted-foreground dark:text-slate-400">
                  Días adicionales antes de aplicar mora
                </p>
              </div>
            </div>
            
            {/* Gastos Adicionales: ahora usando catálogo de gastos de crédito existente */}
            <GastosCreditoSelector
              montoOtorgado={saldoFinanciar}
              gastosSeleccionados={gastosCatalogoSeleccionados}
              onGastosChange={setGastosCatalogoSeleccionados}
              onTotalGastosChange={setTotalGastosCatalogo}
              className="mt-2"
            />
            
            {/* Resumen financiero */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-blue-200 dark:border-slate-600">
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-300">Saldo a Financiar</p>
                <MoneyDisplay amount={saldoFinanciar} className="font-bold dark:text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-300">Interés Total</p>
                <MoneyDisplay amount={interesTotal} className="font-bold text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-300">Gastos</p>
                <MoneyDisplay amount={totalGastosCredito} className="font-bold text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-300">Total Crédito</p>
                <MoneyDisplay amount={totalCredito} className="font-bold dark:text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-300">Cuota Mensual</p>
                <MoneyDisplay amount={cuotaMensual} className="font-bold text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-300">Días Gracia</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">{diasGracia} días</p>
              </div>
            </div>

            {/* Preview del Plan de Pagos */}
            {enganche > 0 && numeroCuotas > 0 && (
              <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold mb-3 text-blue-800 dark:text-blue-300">Preview del Plan de Pagos</h4>
                <div className="max-h-[300px] overflow-y-auto border rounded-lg dark:border-slate-700">
                  <Table>
                    <TableHeader className="sticky top-0 bg-blue-100 dark:bg-blue-900/50">
                      <TableRow>
                        <TableHead className="text-center dark:text-slate-300">#</TableHead>
                        <TableHead className="dark:text-slate-300">Fecha Vencimiento</TableHead>
                        <TableHead className="text-right dark:text-slate-300">Capital</TableHead>
                        <TableHead className="text-right dark:text-slate-300">Interés</TableHead>
                        <TableHead className="text-right dark:text-slate-300">Gastos</TableHead>
                        <TableHead className="text-right dark:text-slate-300">Cuota</TableHead>
                        <TableHead className="text-right dark:text-slate-300">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: numeroCuotas }, (_, i) => {
                        const numeroCuota = i + 1
                        let fechaVencimiento = new Date()
                        
                        if (tipoInteresCredito === 'mensual') {
                          fechaVencimiento = addMonths(new Date(), numeroCuota)
                        } else if (tipoInteresCredito === 'quincenal') {
                          fechaVencimiento = addDays(new Date(), numeroCuota * 15)
                        } else if (tipoInteresCredito === 'semanal') {
                          fechaVencimiento = addWeeks(new Date(), numeroCuota)
                        }
                        
                        const capitalPorCuota = saldoFinanciar / numeroCuotas
                        const interesPorCuota = interesTotal / numeroCuotas
                        const saldoDespues = saldoFinanciar - (capitalPorCuota * numeroCuota)
                        
                        return (
                          <TableRow key={i} className={i % 2 === 0 ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'dark:bg-slate-900/20'}>
                            <TableCell className="text-center font-medium dark:text-slate-200">{numeroCuota}</TableCell>
                            <TableCell className="text-sm dark:text-slate-300">
                              <div>{format(fechaVencimiento, 'dd/MM/yyyy')}</div>
                              {diasGracia > 0 && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                  + {diasGracia} días gracia
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm dark:text-slate-300">
                              <MoneyDisplay amount={capitalPorCuota} />
                            </TableCell>
                            <TableCell className="text-right text-sm text-blue-600 dark:text-blue-400">
                              <MoneyDisplay amount={interesPorCuota} />
                            </TableCell>
                            <TableCell className="text-right text-sm text-amber-600 dark:text-amber-400">
                              <MoneyDisplay amount={gastosPorCuota} />
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm dark:text-green-400">
                              <MoneyDisplay amount={cuotaMensual} />
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground dark:text-slate-400">
                              <MoneyDisplay amount={Math.max(0, saldoDespues)} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">
                  * Las fechas son estimadas (mes calendario). El enganche se paga al momento de la venta.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuración de APARTADO - después de agregar productos */}
      {tipoVenta === 'apartado' && items.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-800 dark:text-amber-200">Configuración del Apartado</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure los términos del apartado para esta venta
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Anticipo (Q)*</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={anticipoApartado}
                  onChange={(e) => setAnticipoApartado(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Mín. recomendado: Q{(totalVenta * 0.1).toFixed(2)} (10%)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Días para liquidar*</Label>
                <Select value={diasApartado.toString()} onValueChange={(v) => setDiasApartado(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[7, 15, 30, 45, 60, 90].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} días</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-200 dark:border-amber-700/60">
              <div>
                <p className="text-xs text-muted-foreground dark:text-amber-200/80">Saldo Pendiente</p>
                <MoneyDisplay amount={saldoApartado} className="font-bold text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-amber-200/80">Fecha Límite</p>
                <p className="font-bold dark:text-amber-100">{format(fechaLimiteApartado, 'dd/MM/yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totales */}
      <Card>
        <CardHeader>
          <CardTitle>Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {puedeAplicarDescuento && (
              <div className="space-y-2">
                <Label>Tipo descuento total</Label>
                <RadioGroup
                  value={tipoDescuentoGeneral}
                  onValueChange={(v: 'porcentaje' | 'monto') => setTipoDescuentoGeneral(v)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="porcentaje" id="desc-gen-pct" />
                    <Label htmlFor="desc-gen-pct" className="font-normal">Porcentaje (%)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="monto" id="desc-gen-monto" />
                    <Label htmlFor="desc-gen-monto" className="font-normal">Nivel básico (Q)</Label>
                  </div>
                </RadioGroup>
                <Label>Descuento {tipoDescuentoGeneral === 'porcentaje' ? '(%)' : '(Q)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={tipoDescuentoGeneral === 'porcentaje' ? 100 : undefined}
                  step={tipoDescuentoGeneral === 'porcentaje' ? 1 : 0.01}
                  value={descuentoGeneral}
                  onChange={(e) => setDescuentoGeneral(Number(e.target.value) || 0)}
                />
                {descuentoGeneral > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equivale a: <MoneyDisplay amount={descuentoGeneralMonto} />
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Total</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted">
                <MoneyDisplay amount={totalVenta} className="font-bold text-lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métodos de Pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CurrencyCircleDollar size={20} />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metodosPago.map((mp, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Método*</Label>
                <Select
                  value={mp.metodo}
                  onValueChange={(val: any) => actualizarMetodoPago(index, 'metodo', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto*</Label>
                <Input
                  type="number"
                  placeholder="Q"
                  value={mp.monto}
                  onChange={(e) => actualizarMetodoPago(index, 'monto', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  placeholder="Número de referencia"
                  value={mp.referencia}
                  onChange={(e) => actualizarMetodoPago(index, 'referencia', e.target.value)}
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => eliminarMetodoPago(index)}
                disabled={metodosPago.length === 1}
              >
                <Trash size={16} />
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={agregarMetodoPago} className="w-full">
            <Plus size={20} className="mr-2" />
            Añadir a métodos de Pago
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Total Pagado</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted">
                <MoneyDisplay amount={totalPagado} className="font-bold text-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cambio a Devolver</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted">
                <MoneyDisplay
                  amount={cambioDevolver >= 0 ? cambioDevolver : 0}
                  className="font-bold text-lg text-accent"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={onVolver}>
          Cancelar
        </Button>
        <Button
          variant="secondary"
          onClick={crearYCrearOtra}
          disabled={loading}
        >
          <FileText size={20} className="mr-2" />
          Crear y crear otro
        </Button>
        <Button
          onClick={procesarVenta}
          disabled={loading}
        >
          <ShoppingCart size={20} className="mr-2" />
          {loading ? 'Procesando...' : 'Crear'}
        </Button>
      </div>

      {/* Modal Crear Cliente Rápido */}
      <Dialog open={openCrearCliente} onOpenChange={setOpenCrearCliente}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Crear Cliente Rápido</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="personales" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="personales">Datos Personales</TabsTrigger>
              <TabsTrigger value="contacto">Ubicación y Otros</TabsTrigger>
            </TabsList>

            <TabsContent value="personales" className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres *</Label>
                  <Input
                    id="nombres"
                    value={nuevoCliente.nombres}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                    placeholder="Ej. Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    value={nuevoCliente.apellidos}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                    placeholder="Ej. Pérez"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dpi">DPI / CUI (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="dpi"
                      value={nuevoCliente.dpi}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, dpi: e.target.value })}
                      placeholder="0000000000000"
                      maxLength={13}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={buscarCuiEnSat}
                      disabled={searchingCui || !nuevoCliente.dpi.trim()}
                    >
                      {searchingCui ? 'Validando...' : 'Validar CUI'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT (Opcional)</Label>
                  <Input
                    id="nit"
                    value={nuevoCliente.nit}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nit: e.target.value })}
                    placeholder="Ej. 1234567-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">Fecha Nacimiento</Label>
                  <Input
                    id="fecha_nacimiento"
                    type="date"
                    value={nuevoCliente.fecha_nacimiento}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, fecha_nacimiento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">Género</Label>
                  <Select
                    value={nuevoCliente.genero}
                    onValueChange={(val) => setNuevoCliente({ ...nuevoCliente, genero: val })}
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
              </div>
            </TabsContent>

            <TabsContent value="contacto" className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                  <Input
                    id="telefono"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                    placeholder="Ej. 12345678 o 15551234567"
                    maxLength={15}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo (Opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección *</Label>
                <Input
                  id="direccion"
                  value={nuevoCliente.direccion}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                  placeholder="Dirección del cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sucursal</Label>
                  <Select
                    value={nuevoCliente.sucursal}
                    onValueChange={(val) => setNuevoCliente({ ...nuevoCliente, sucursal: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales.map(s => (
                        <SelectItem key={s.id} value={s.codigo}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo Cliente</Label>
                  <Select
                    value={nuevoCliente.tipo_cliente}
                    onValueChange={(val) => setNuevoCliente({ ...nuevoCliente, tipo_cliente: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenCrearCliente(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearClienteRapido} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
