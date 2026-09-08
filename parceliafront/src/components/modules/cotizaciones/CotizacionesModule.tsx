'use client'

import { useState, useEffect } from 'react'
import { useKV } from '@/hooks/use-kv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  FileText, Plus, Eye, FilePdf, Trash, MagnifyingGlass, ShoppingCart, Calculator, ArrowsClockwise, Pencil
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { format } from 'date-fns'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { api, clienteService, sucursalService, isAuthError } from '@/lib/api'
import { cotizacionService, type Cotizacion, type ProductoCotizacion, type PlanPagos } from '@/services/cotizacion.service'

interface ClienteLocal {
  id: number
  nombres: string
  apellidos: string
  dpi: string
  nit?: string
  telefono?: string
}

interface PrendaVenta {
  id: number
  codigoPrenda: string
  descripcion: string
  categoria: string
  precio_venta?: number
  avaluo?: number
}

export function CotizacionesModule() {
  const [vistaActual, setVistaActual] = useState<'lista' | 'nueva'>('lista')
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [prendasDisponibles, setPrendasDisponibles] = useState<PrendaVenta[]>([])
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoCotizacion[]>([])
  const [busquedaPrenda, setBusquedaPrenda] = useState('')
  const [loading, setLoading] = useState(false)

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10)
  const [totalRegistros, setTotalRegistros] = useState(0)

  // Modal de confirmación de eliminación
  const [confirmarEliminar, setConfirmarEliminar] = useState<Cotizacion | null>(null)
  const [cotizacionEditar, setCotizacionEditar] = useState<Cotizacion | null>(null)

  // Estados para clientes
  const [clientes, setClientes] = useState<ClienteLocal[]>([])
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [openCrearCliente, setOpenCrearCliente] = useState(false)
  const [refrescarSucursalesTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)
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
    sucursal: '',
    tipo_cliente: 'regular'
  })
  const [sucursales, setSucursales] = useState<any[]>([])

  // Formulario nueva cotización
  const [formCotizacion, setFormCotizacion] = useState<{
    cliente_id?: number
    cliente_nombre: string
    tipo_venta: 'contado' | 'credito'
    descuento: number
    observaciones: string
    numero_cuotas: number
    tasa_interes: number
  }>({
    cliente_nombre: '',
    tipo_venta: 'contado',
    descuento: 0,
    observaciones: '',
    numero_cuotas: 1,
    tasa_interes: 0
  })

  useEffect(() => {
    if (vistaActual === 'nueva') {
      cargarPrendasDisponibles()
      cargarClientes()
    } else {
      cargarCotizaciones()
    }
  }, [vistaActual])

  // Recargar cotizaciones cuando cambia la paginación
  useEffect(() => {
    if (vistaActual === 'lista') {
      cargarCotizaciones()
    }
  }, [paginaActual, registrosPorPagina])

  // Cargar sucursales para el modal de cliente
  useEffect(() => {
    if (openCrearCliente) {
      sucursalService.getActivas().then(res => {
        if (res.success && res.data) setSucursales(res.data)
      })
    }
  }, [openCrearCliente, refrescarSucursalesTrigger])

  const cargarPrendasDisponibles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        estado: 'en_venta',
        per_page: '100'
      })
      const response = await api.get<any>('/prendas?' + params.toString())
      
      if (response && response.data) {
        const prendasData = response.data?.data || response.data || []
        setPrendasDisponibles(prendasData)
      }
    } catch (error: any) {
      console.error('Error al cargar prendas:', error)
      if (!isAuthError(error)) {
        toast.error('Error al cargar productos disponibles')
      }
    } finally {
      setLoading(false)
    }
  }

  const cargarCotizaciones = async () => {
    try {
      setLoading(true)
      const data = await cotizacionService.getCotizaciones({
        per_page: registrosPorPagina,
        page: paginaActual
      }) as any
      
      if (data) {
        // Verificar si es una respuesta paginada
        if (data.data && Array.isArray(data.data)) {
          setCotizaciones(data.data as Cotizacion[])
          setTotalRegistros(data.total || data.data.length)
        } else if (Array.isArray(data)) {
          setCotizaciones(data as Cotizacion[])
          setTotalRegistros(data.length)
        } else {
          setCotizaciones([])
          setTotalRegistros(0)
        }
      }
    } catch (error: any) {
      console.error('Error al cargar cotizaciones:', error)
      if (!isAuthError(error)) {
        toast.error('Error al cargar el historial')
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para eliminar cotización
  const handleEliminarCotizacion = async () => {
    if (!confirmarEliminar) return

    try {
      await cotizacionService.deleteCotizacion(confirmarEliminar.id)
      toast.success('Cotización eliminada exitosamente')
      setConfirmarEliminar(null)
      cargarCotizaciones()
    } catch (error: any) {
      console.error('Error al eliminar cotización:', error)
      toast.error(error.message || 'Error al eliminar la cotización')
    }
  }

  // Función para ir a editar cotización (redirigir a vista nueva con datos precargados)
  const handleEditarCotizacion = async (cotizacion: Cotizacion) => {
    try {
      // Cargar los detalles completos de la cotización
      const detalle = await cotizacionService.getCotizacion(cotizacion.id) as Cotizacion
      
      if (detalle) {
        // Precargar datos en el formulario
        setFormCotizacion({
          cliente_id: detalle.cliente_id,
          cliente_nombre: detalle.cliente_nombre || '',
          tipo_venta: detalle.tipo_venta,
          descuento: detalle.descuento || 0,
          observaciones: detalle.observaciones || '',
          numero_cuotas: detalle.plan_pagos?.numero_cuotas || 1,
          tasa_interes: detalle.plan_pagos?.tasa_interes || 0
        })
        
        // Cargar productos
        if (detalle.productos && Array.isArray(detalle.productos)) {
          setProductosSeleccionados(detalle.productos)
        }
        
        // Guardar referencia de la cotización que se edita
        setCotizacionEditar(cotizacion)
        
        // Cambiar a vista de edición
        setVistaActual('nueva')
        toast.info('Editando cotización: ' + cotizacion.numero_cotizacion)
      }
    } catch (error: any) {
      console.error('Error al cargar cotización para editar:', error)
      toast.error('Error al cargar los datos de la cotización')
    }
  }

  const cargarClientes = async () => {
    try {
      const resultado = await clienteService.getActivos()
      if (resultado.success && resultado.data) {
        // Convertir a ClienteLocal
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
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast.error('Error al cargar lista de clientes')
    }
  }

  const clientesFiltrados = clientes.filter(c => {
    const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase()
    const dpi = c.dpi?.toLowerCase() || ''
    return nombreCompleto.includes(busquedaCliente.toLowerCase()) || dpi.includes(busquedaCliente.toLowerCase())
  })

  const handleSeleccionarCliente = (id: string) => {
    const numericId = Number(id)
    setClienteId(numericId)

    // Auto-completar datos del cliente
    const cliente = clientes.find(c => c.id === numericId)
    if (cliente) {
      setFormCotizacion(prev => ({
        ...prev,
        cliente_id: numericId,
        cliente_nombre: `${cliente.nombres} ${cliente.apellidos}`
      }))
      toast.success(`Cliente seleccionado: ${cliente.nombres} ${cliente.apellidos}`)
    }
  }

  const handleCrearClienteRapido = async () => {
    if (!nuevoCliente.nombres || !nuevoCliente.apellidos || !nuevoCliente.dpi || !nuevoCliente.telefono) {
      toast.error('Complete los campos obligatorios del cliente')
      return
    }

    try {
      setLoading(true)
      const response = await clienteService.create({
        ...nuevoCliente,
        fechaNacimiento: nuevoCliente.fecha_nacimiento,
        genero: nuevoCliente.genero,
        tipoCliente: nuevoCliente.tipo_cliente
      })

      if (response.success && response.data) {
        toast.success('Cliente creado exitosamente')
        await cargarClientes()
        setOpenCrearCliente(false)
        
        // Seleccionar el cliente recién creado
        const nuevoId = Number(response.data.id)
        setClienteId(nuevoId)
        setFormCotizacion(prev => ({
          ...prev,
          cliente_id: nuevoId,
          cliente_nombre: `${nuevoCliente.nombres} ${nuevoCliente.apellidos}`
        }))
        
        // Limpiar formulario de nuevo cliente
        setNuevoCliente({
          nombres: '',
          apellidos: '',
          dpi: '',
          nit: '',
          fecha_nacimiento: format(new Date(1990, 0, 1), 'yyyy-MM-dd'),
          genero: 'masculino',
          telefono: '',
          email: '',
          direccion: 'Ciudad',
          sucursal: '',
          tipo_cliente: 'regular'
        })
      } else {
        toast.error(response.message || 'Error al crear el cliente')
      }
    } catch (error: any) {
      console.error('Error al crear cliente:', error)
      toast.error(error.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const agregarProducto = (prenda: PrendaVenta) => {
    console.log('🔍 Objeto prenda completo:', prenda)
    console.log('🔍 codigoPrenda:', prenda.codigoPrenda)
    
    const precio = prenda.precio_venta || prenda.avaluo || 0
    
    if (precio <= 0) {
      toast.error('Este producto no tiene precio de venta asignado')
      return
    }

    const yaExiste = productosSeleccionados.find(p => p.prenda_id === prenda.id)
    
    if (yaExiste) {
      toast.warning('Este producto ya está en la cotización')
      return
    }

    // Buscar el código de prenda en varios campos posibles
    const codigoPrenda = prenda.codigoPrenda || (prenda as any).codigo_prenda || (prenda as any).codigo || `PRD-${prenda.id}`
    console.log('✅ codigo_prenda a usar:', codigoPrenda)

    const nuevoProducto: ProductoCotizacion = {
      prenda_id: prenda.id,
      codigo_prenda: codigoPrenda,
      descripcion: prenda.descripcion,
      precio_unitario: precio,
      cantidad: 1
    }

    console.log('📦 Nuevo producto creado:', nuevoProducto)
    setProductosSeleccionados([...productosSeleccionados, nuevoProducto])
    toast.success('Producto agregado a la cotización')
  }

  const quitarProducto = (prenda_id: number) => {
    setProductosSeleccionados(productosSeleccionados.filter(p => p.prenda_id !== prenda_id))
  }

  const calcularSubtotal = () => {
    return productosSeleccionados.reduce((sum, p) => sum + (p.precio_unitario * p.cantidad), 0)
  }

  const calcularTotal = () => {
    const subtotal = calcularSubtotal()
    return subtotal - formCotizacion.descuento
  }

  const calcularPlanPagos = () => {
    const total = calcularTotal()
    const tasaMensual = formCotizacion.tasa_interes / 100
    const nCuotas = formCotizacion.numero_cuotas

    if (tasaMensual === 0) {
      return {
        monto_cuota: total / nCuotas,
        total_con_intereses: total
      }
    }

    // Fórmula de cuota fija con interés
    const montoCuota = total * (tasaMensual * Math.pow(1 + tasaMensual, nCuotas)) / 
                       (Math.pow(1 + tasaMensual, nCuotas) - 1)
    
    return {
      monto_cuota: montoCuota,
      total_con_intereses: montoCuota * nCuotas
    }
  }

  const guardarCotizacion = async () => {
    if (productosSeleccionados.length === 0) {
      toast.error('Agrega al menos un producto a la cotización')
      return
    }

    try {
      const subtotal = calcularSubtotal()
      const total = calcularTotal()
      
      let planPagos: PlanPagos | undefined = undefined
      if (formCotizacion.tipo_venta === 'credito') {
        const plan = calcularPlanPagos()
        planPagos = {
          numero_cuotas: formCotizacion.numero_cuotas,
          tasa_interes: formCotizacion.tasa_interes,
          monto_cuota: plan.monto_cuota,
          total_con_intereses: plan.total_con_intereses
        }
      }

      console.log('🛒 Productos seleccionados antes de mapear:', productosSeleccionados)

      const data = {
        cliente_nombre: formCotizacion.cliente_nombre || 'Cliente General',
        cliente_id: formCotizacion.cliente_id,
        tipo_venta: formCotizacion.tipo_venta,
        productos: productosSeleccionados.map(p => ({
          prenda_id: p.prenda_id,
          codigo_prenda: p.codigo_prenda,
          descripcion: p.descripcion,
          precio_unitario: p.precio_unitario,
          cantidad: p.cantidad
        })),
        subtotal,
        descuento: formCotizacion.descuento || 0,
        total,
        plan_pagos: planPagos,
        observaciones: formCotizacion.observaciones,
        vigencia_dias: 15
      }

      console.log('📤 Datos a enviar:', JSON.stringify(data, null, 2))

      const result = await cotizacionService.createCotizacion(data)
      
      toast.success('Cotización generada exitosamente')
      
      // Descargar PDF automáticamente
      if (result && (result as any).id) {
        setTimeout(() => {
          cotizacionService.descargarPDF((result as any).id)
        }, 500)
      }
      
      // Resetear formulario
      setProductosSeleccionados([])
      setFormCotizacion({
        cliente_nombre: '',
        tipo_venta: 'contado',
        descuento: 0,
        observaciones: '',
        numero_cuotas: 1,
        tasa_interes: 0
      })
      
      setVistaActual('lista')
    } catch (error: any) {
      console.error('Error al guardar cotización:', error)
      
      // Mostrar errores de validación específicos
      if (error.errors) {
        console.error('Errores de validación:', error.errors)
        const errores = Object.entries(error.errors)
          .map(([campo, mensajes]: [string, any]) => `${campo}: ${Array.isArray(mensajes) ? mensajes.join(', ') : mensajes}`)
          .join('\n')
        toast.error(`Errores de validación:\n${errores}`)
      } else {
        const mensaje = error.message || 'Error al generar la cotización'
        toast.error(mensaje)
      }
    }
  }

  const descargarPDF = async (id: number) => {
    try {
      await cotizacionService.descargarPDF(id)
      toast.success('PDF descargado')
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      toast.error('Error al descargar PDF')
    }
  }

  const prendasFiltradas = prendasDisponibles.filter(p => 
    busquedaPrenda === '' ||
    p.codigoPrenda.toLowerCase().includes(busquedaPrenda.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(busquedaPrenda.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(busquedaPrenda.toLowerCase())
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cotizaciones de Venta</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Genera cotizaciones de productos con opciones de pago al contado y crédito
          </p>
        </div>
        <div className="flex gap-2">
          {vistaActual === 'lista' ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => setVistaActual('nueva')}
              className="gap-2"
            >
              <Plus size={16} />
              Nueva Cotización
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVistaActual('lista')}
              className="gap-2"
            >
              <FileText size={16} />
              Ver Historial
            </Button>
          )}
        </div>
      </div>

      {/* Vista Lista */}
      {vistaActual === 'lista' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText size={24} />
                Historial de Cotizaciones
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={cargarCotizaciones}
              >
                <ArrowsClockwise size={16} className="mr-2" />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando cotizaciones...</p>
              </div>
            ) : cotizaciones.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No hay cotizaciones registradas</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setVistaActual('nueva')}
                >
                  Crear Primera Cotización
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Cotización</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cotizaciones.map((cot) => (
                    <TableRow key={cot.id}>
                      <TableCell className="font-mono">{cot.numero_cotizacion}</TableCell>
                      <TableCell>{format(new Date(cot.fecha), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{cot.cliente_nombre || 'General'}</TableCell>
                      <TableCell>
                        <Badge variant={cot.tipo_venta === 'credito' ? 'default' : 'secondary'}>
                          {cot.tipo_venta === 'credito' ? 'Crédito' : 'Contado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={cot.total} />
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {cot.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarCotizacion(cot)}
                            title="Editar cotización"
                            disabled={cot.estado === 'convertida'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => descargarPDF(cot.id)}
                            title="Descargar PDF"
                          >
                            <FilePdf className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmarEliminar(cot)}
                            title="Eliminar cotización"
                            disabled={cot.estado === 'convertida'}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Paginación */}
            {cotizaciones.length > 0 && (
              <DataTablePagination
                totalRegistros={totalRegistros}
                paginaActual={paginaActual}
                registrosPorPagina={registrosPorPagina}
                onCambiarPagina={setPaginaActual}
                onCambiarRegistrosPorPagina={(v) => {
                  setRegistrosPorPagina(Number(v))
                  setPaginaActual(1)
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista Nueva Cotización */}
      {vistaActual === 'nueva' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel Izquierdo: Selección de Productos */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart size={24} />
                  Productos Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Buscar por código, descripción o categoría..."
                    value={busquedaPrenda}
                    onChange={(e) => setBusquedaPrenda(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell>
                        </TableRow>
                      ) : prendasFiltradas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No hay productos disponibles
                          </TableCell>
                        </TableRow>
                      ) : (
                        prendasFiltradas.map((prenda) => (
                          <TableRow key={prenda.id}>
                            <TableCell className="font-mono text-sm">{prenda.codigoPrenda}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{prenda.descripcion}</p>
                                <p className="text-xs text-muted-foreground">{prenda.categoria}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <MoneyDisplay amount={prenda.precio_venta || prenda.avaluo || 0} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => agregarProducto(prenda)}
                              >
                                <Plus size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel Derecho: Cotización */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator size={24} />
                  Detalle de Cotización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selector de cliente */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Cliente (Opcional)
                  </Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar por nombre o DPI..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                    />
                    <Select
                      value={clienteId?.toString() || ''}
                      onValueChange={handleSeleccionarCliente}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientesFiltrados.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No se encontraron clientes
                          </div>
                        ) : (
                          clientesFiltrados.map(cliente => (
                            <SelectItem key={cliente.id} value={cliente.id.toString()}>
                              {cliente.nombres} {cliente.apellidos} (DPI: {cliente.dpi})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-primary text-primary hover:bg-primary/5"
                      onClick={() => setOpenCrearCliente(true)}
                      type="button"
                    >
                      <Plus size={16} className="mr-2" />
                      Crear Nuevo Cliente
                    </Button>
                  </div>
                </div>

                {/* Tipo de venta */}
                <div className="space-y-2">
                  <Label>Tipo de Venta</Label>
                  <Select 
                    value={formCotizacion.tipo_venta} 
                    onValueChange={(val: 'contado' | 'credito') => setFormCotizacion({ ...formCotizacion, tipo_venta: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Al Contado</SelectItem>
                      <SelectItem value="credito">A Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan de pagos si es crédito */}
                {formCotizacion.tipo_venta === 'credito' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Número de Cuotas</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formCotizacion.numero_cuotas}
                        onChange={(e) => setFormCotizacion({ ...formCotizacion, numero_cuotas: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tasa Interés % Mensual</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formCotizacion.tasa_interes}
                        onChange={(e) => setFormCotizacion({ ...formCotizacion, tasa_interes: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}

                {/* Productos seleccionados */}
                <div className="space-y-2">
                  <Label>Productos Seleccionados ({productosSeleccionados.length})</Label>
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    {productosSeleccionados.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No hay productos seleccionados
                      </div>
                    ) : (
                      <Table>
                        <TableBody>
                          {productosSeleccionados.map((prod) => (
                            <TableRow key={prod.prenda_id}>
                              <TableCell className="font-mono text-xs">{prod.codigo_prenda}</TableCell>
                              <TableCell className="text-sm">{prod.descripcion}</TableCell>
                              <TableCell className="text-right text-sm">
                                <MoneyDisplay amount={prod.precio_unitario} />
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => quitarProducto(prod.prenda_id)}
                                >
                                  <Trash size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                {/* Descuento */}
                <div className="space-y-2">
                  <Label>Descuento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCotizacion.descuento}
                    onChange={(e) => setFormCotizacion({ ...formCotizacion, descuento: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    placeholder="Observaciones adicionales..."
                    value={formCotizacion.observaciones}
                    onChange={(e) => setFormCotizacion({ ...formCotizacion, observaciones: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Resumen de totales */}
                <div className="space-y-2 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <MoneyDisplay amount={calcularSubtotal()} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Descuento:</span>
                    <MoneyDisplay amount={formCotizacion.descuento} />
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <MoneyDisplay amount={calcularTotal()} />
                  </div>

                  {formCotizacion.tipo_venta === 'credito' && productosSeleccionados.length > 0 && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground mb-2">Plan de Pagos:</p>
                        <div className="flex justify-between text-sm">
                          <span>Cuota Mensual:</span>
                          <MoneyDisplay amount={calcularPlanPagos().monto_cuota} />
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Total con Intereses:</span>
                          <MoneyDisplay amount={calcularPlanPagos().total_con_intereses} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setVistaActual('lista')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={guardarCotizacion}
                    disabled={productosSeleccionados.length === 0}
                  >
                    Generar Cotización
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal para crear cliente */}
      <Dialog open={openCrearCliente} onOpenChange={setOpenCrearCliente}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Complete la información del cliente para agregarlo al sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombres *</Label>
              <Input
                value={nuevoCliente.nombres}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                placeholder="Nombres del cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Apellidos *</Label>
              <Input
                value={nuevoCliente.apellidos}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                placeholder="Apellidos del cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label>DPI *</Label>
              <Input
                value={nuevoCliente.dpi}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, dpi: e.target.value })}
                placeholder="Número de DPI"
              />
            </div>
            
            <div className="space-y-2">
              <Label>NIT</Label>
              <Input
                value={nuevoCliente.nit}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nit: e.target.value })}
                placeholder="NIT (opcional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                placeholder="Número de teléfono"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fecha de Nacimiento</Label>
              <Input
                type="date"
                value={nuevoCliente.fecha_nacimiento}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, fecha_nacimiento: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Género</Label>
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
            
            <div className="space-y-2">
              <Label>Sucursal *</Label>
              <Select 
                value={nuevoCliente.sucursal} 
                onValueChange={(val) => setNuevoCliente({ ...nuevoCliente, sucursal: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((suc) => (
                    <SelectItem key={suc.id} value={suc.nombre}>
                      {suc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
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
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={nuevoCliente.direccion}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenCrearCliente(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearClienteRapido}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación */}
      <Dialog open={!!confirmarEliminar} onOpenChange={() => setConfirmarEliminar(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la cotización "{confirmarEliminar?.numero_cotizacion}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminarCotizacion}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
