import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { ventaService, api } from '@/lib/api'
import { VentaDetalleModal } from './VentaDetalleModal'
import {
  MagnifyingGlass,
  Eye,
  Trash,
  PencilSimple,
  FileText,
  FilePdf,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  Receipt
} from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface VentaDetalle {
  id: string
  prenda_id: string
  codigo: string
  descripcion: string
  ubicacion?: string
  precio_unitario: number
  descuento: number
  subtotal: number
}

interface VentaPago {
  id: string
  metodo: string
  monto: number
  referencia?: string
}

interface Venta {
  id: string
  codigo_venta: string
  cliente_id?: string
  cliente_nombre: string
  cliente_nit?: string
  tipo_venta: 'contado' | 'apartado' | 'plan_pagos'
  tipo_documento?: string
  numero_documento?: string
  estado: 'pendiente' | 'pagada' | 'apartado' | 'plan_pagos' | 'cancelada' | 'devuelta'
  fecha_venta: string
  subtotal: number
  total_descuentos: number
  total_final: number
  total_pagado: number
  saldo_pendiente?: number
  certificada: boolean
  facturada?: boolean
  no_autorizacion?: string
  detalles?: VentaDetalle[]
  pagos?: VentaPago[]
  vendedor?: { nombre: string; name: string }
  cliente?: { nombre: string }
}

export function ListadoVentas() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false)
  const [ventaAbono, setVentaAbono] = useState<Venta | null>(null)
  const [abonoOpen, setAbonoOpen] = useState(false)
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoAbono, setMetodoAbono] = useState('efectivo')
  const [referenciaAbono, setReferenciaAbono] = useState('')
  const [bancoAbono, setBancoAbono] = useState('')
  const [loadingAbono, setLoadingAbono] = useState(false)

  useEffect(() => {
    cargarVentas()
  }, [busqueda, filtroEstado, pagina])

  const cargarVentas = async () => {
    try {
      setLoading(true)
      const params: any = {
        busqueda,
        page: pagina,
        per_page: 20
      }

      if (filtroEstado !== 'todas') {
        params.estado = filtroEstado
      }

      const response = await ventaService.getAll(params)

      if (response && response.success && response.data) {
        setVentas(response.data)
        if (response.pagination) {
          setTotalPaginas(response.pagination.last_page || 1)
        }
      } else {
        setVentas([])
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error)
      toast.error('Error al cargar ventas')
      setVentas([])
    } finally {
      setLoading(false)
    }
  }

  const certificarVenta = async (ventaId: string) => {
    try {
      const resp = await ventaService.certificar(ventaId)
      if (resp.success) {
        toast.success('Factura certificada (FEL) exitosamente')
        cargarVentas()
      } else {
        toast.error(resp.message || 'Error al certificar factura')
      }
    } catch (e) {
      toast.error('Error de conexión al certificar factura')
    }
  }

  const verVenta = async (ventaId: string) => {
    try {
      const resp = await ventaService.getById(ventaId)
      if (resp.success) {
        setVentaSeleccionada(resp.data)
        setIsModalDetalleOpen(true)
      }
    } catch (e) {
      toast.error('Error al cargar detalle de venta')
    }
  }

  const handleEliminarVenta = async (ventaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta venta?')) return

    try {
      const response = await ventaService.delete(ventaId)
      if (response.success) {
        toast.success('Venta eliminada exitosamente')
        cargarVentas()
      } else {
        toast.error(response.message || 'Error al eliminar venta')
      }
    } catch (error) {
      toast.error('Error al eliminar venta')
    }
  }

  const imprimirFactura = async (ventaId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`${API_BASE_URL}/ventas/${ventaId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al generar el PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Venta_${ventaId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Comprobante PDF generado exitosamente')
    } catch (error: any) {
      console.error('Error al generar PDF:', error)
      toast.error('Error al generar el comprobante PDF')
    }
  }

  const imprimirReciboPOS = async (ventaId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`${API_BASE_URL}/ventas/${ventaId}/recibo-pos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al generar el recibo POS')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Abrir en ventana nueva y activar impresión automática
      const printWindow = window.open(url, '_blank')
      
      if (printWindow) {
        // Esperar a que el PDF cargue y activar impresión
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            // Limpiar URL después de un tiempo
            setTimeout(() => {
              window.URL.revokeObjectURL(url)
            }, 1000)
          }, 500)
        }
        
        toast.success('Abriendo vista de impresión...')
      } else {
        // Si no se pudo abrir ventana (bloqueador), descargar como fallback
        const a = document.createElement('a')
        a.href = url
        a.download = `Recibo_POS_${ventaId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.warning('No se pudo abrir ventana de impresión. Archivo descargado.')
      }
    } catch (error: any) {
      console.error('Error al generar recibo POS:', error)
      toast.error('Error al generar el recibo POS')
    }
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleTodos = () => {
    if (seleccionados.length === ventas.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(ventas.map(v => v.id))
    }
  }

  const exportarReporte = async (tipo: 'pdf' | 'excel') => {
    const params = new URLSearchParams()
    if (filtroEstado !== 'todas') params.append('estado', filtroEstado)
    if (busqueda) params.append('busqueda', busqueda)

    try {
      if (tipo === 'excel') {
        toast.info('Generando reporte Excel...')
        await api.downloadFile(`/ventas/exportar/excel?${params.toString()}`, `ventas-${Date.now()}.xlsx`)
        toast.success('Reporte Excel descargado')
      } else {
        toast.info('Generando reporte PDF...')
        await api.downloadFile(`/ventas/exportar/pdf?${params.toString()}`, `ventas-${Date.now()}.pdf`)
        toast.success('Reporte PDF descargado')
      }
    } catch (error: any) {
      console.error('Error al exportar:', error)
      toast.error(error.message || 'Error al generar el reporte')
    }
  }

  const abrirAbono = (venta: Venta) => {
    setVentaAbono(venta)
    setMontoAbono((venta.saldo_pendiente ?? 0).toString())
    setMetodoAbono('efectivo')
    setReferenciaAbono('')
    setBancoAbono('')
    setAbonoOpen(true)
  }

  const cerrarAbono = () => {
    if (loadingAbono) return
    setAbonoOpen(false)
    setVentaAbono(null)
    setMontoAbono('')
    setReferenciaAbono('')
    setBancoAbono('')
  }

  const registrarAbono = async () => {
    if (!ventaAbono) return

    const monto = parseFloat(montoAbono)

    if (isNaN(monto) || monto <= 0) {
      toast.error('Ingrese un monto válido')
      return
    }

    if (ventaAbono.saldo_pendiente && monto > ventaAbono.saldo_pendiente) {
      toast.error('El monto no puede ser mayor al saldo pendiente')
      return
    }

    try {
      setLoadingAbono(true)
      const resp = await ventaService.registrarAbono(ventaAbono.id, {
        monto,
        metodo: metodoAbono,
        referencia: referenciaAbono || undefined,
        banco: bancoAbono || undefined
      })

      if (resp.success) {
        toast.success(resp.message || 'Pago registrado correctamente')
        cerrarAbono()
        cargarVentas()
      } else {
        toast.error(resp.message || 'Error al registrar el pago')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el pago')
    } finally {
      setLoadingAbono(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const estados = {
      pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      pagada: { label: 'Pagada', className: 'bg-green-100 text-green-700 border-green-300' },
      apartado: { label: 'Apartado', className: 'bg-amber-100 text-amber-800 border-amber-300' },
      plan_pagos: { label: 'Plan Pagos', className: 'bg-purple-100 text-purple-700 border-purple-300' },
      cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-700 border-red-300' },
      devuelta: { label: 'Devuelta', className: 'bg-gray-100 text-gray-700 border-gray-300' }
    }
    const info = estados[estado as keyof typeof estados] || { label: estado, className: '' }

    return (
      <Badge variant="outline" className={`gap-1 ${info.className}`}>
        {estado === 'pagada' && <CheckCircle weight="fill" size={12} />}
        {estado === 'pendiente' && <Warning weight="fill" size={12} />}
        {info.label}
      </Badge>
    )
  }

  const formatFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), 'dd/MM/yyyy HH:mm', { locale: es })
    } catch {
      return fecha
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con botones de exportación y búsqueda */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col gap-3">
            {/* Búsqueda - primero en móvil */}
            <div className="relative w-full">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar por código, cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                onClick={() => exportarReporte('pdf')}
              >
                <FilePdf size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline">Reporte</span> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-1 sm:flex-none"
                onClick={() => exportarReporte('excel')}
              >
                <Receipt size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline">Reporte</span> Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={cargarVentas}
                disabled={loading}
              >
                <ArrowsClockwise size={16} className={`sm:w-[18px] sm:h-[18px] ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs para filtrar por estado */}
      <Tabs value={filtroEstado} onValueChange={setFiltroEstado} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="todas" className="text-xs sm:text-sm py-2">Todas</TabsTrigger>
          <TabsTrigger value="pendiente" className="text-xs sm:text-sm py-2">Pendientes</TabsTrigger>
          <TabsTrigger value="pagada" className="text-xs sm:text-sm py-2">Pagadas</TabsTrigger>
          <TabsTrigger value="cancelada" className="text-xs sm:text-sm py-2">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={filtroEstado} className="space-y-4 mt-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowsClockwise size={48} className="mx-auto mb-4 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">Cargando ventas...</p>
              </CardContent>
            </Card>
          ) : ventas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-semibold mb-2">No hay ventas</p>
                <p className="text-muted-foreground">
                  {busqueda || filtroEstado !== 'todas'
                    ? 'No se encontraron ventas con los filtros aplicados'
                    : 'No hay ventas registradas'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] hidden sm:table-cell">
                        <Checkbox
                          checked={seleccionados.length === ventas.length && ventas.length > 0}
                          onCheckedChange={toggleTodos}
                        />
                      </TableHead>
                      <TableHead className="w-[40px] sm:w-[60px]">#</TableHead>
                      <TableHead className="hidden md:table-cell">Tipo Doc</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                      <TableHead className="hidden xl:table-cell">Vendedor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">Certificada</TableHead>
                      <TableHead className="hidden sm:table-cell">Estado</TableHead>
                      <TableHead className="text-center w-[100px] sm:w-[200px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas.map((venta, index) => (
                      <TableRow key={venta.id}>
                        <TableCell className="hidden sm:table-cell">
                          <Checkbox
                            checked={seleccionados.includes(venta.id)}
                            onCheckedChange={() => toggleSeleccion(venta.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground text-xs sm:text-sm">
                          {index + 1 + (pagina - 1) * 20}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-semibold text-xs">
                            {venta.tipo_documento || 'NOTA'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                              {venta.cliente_nombre || 'Consumidor Final'}
                            </span>
                            {venta.codigo_venta && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {venta.codigo_venta}
                              </span>
                            )}
                            {/* Estado visible solo en móvil */}
                            <span className="sm:hidden mt-1">
                              {getEstadoBadge(venta.estado)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs whitespace-nowrap">
                            {formatFecha(venta.fecha_venta)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="text-sm">
                            {venta.vendedor?.nombre || venta.vendedor?.name || 'admin'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <MoneyDisplay amount={venta.total_final} className="font-semibold text-xs sm:text-sm" />
                            {venta.saldo_pendiente && venta.saldo_pendiente > 0 && (
                              <span className="text-[10px] sm:text-xs text-orange-600">
                                Saldo: <MoneyDisplay amount={venta.saldo_pendiente} />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          {venta.certificada || venta.facturada ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1">
                              <CheckCircle size={12} weight="fill" />
                              Sí
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No aplica</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {getEstadoBadge(venta.estado)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
                            {venta.saldo_pendiente && venta.saldo_pendiente > 0 && (venta.tipo_venta === 'apartado' || venta.tipo_venta === 'plan_pagos') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 sm:h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-1 sm:px-2 gap-1"
                                onClick={() => abrirAbono(venta)}
                                title="Registrar pago / abono"
                              >
                                <CheckCircle size={14} weight="bold" className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline text-[10px] sm:text-xs font-semibold">Abonar</span>
                              </Button>
                            )}

                            {venta.estado === 'pagada' && !venta.certificada && !venta.facturada && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 sm:h-8 text-red-600 hover:text-red-700 hover:bg-red-50 px-1 sm:px-2 gap-1"
                                onClick={() => certificarVenta(venta.id)}
                                title="Generar Factura FEL"
                              >
                                <FileText size={14} className="sm:w-4 sm:h-4" />
                                <span className="text-[10px] sm:text-xs font-semibold hidden sm:inline">Factura</span>
                              </Button>
                            )}

                            {(venta.certificada || venta.facturada) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 sm:h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1 sm:px-2"
                                onClick={() => imprimirFactura(venta.id)}
                                title="Imprimir PDF"
                              >
                                <FilePdf size={14} className="sm:w-4 sm:h-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 sm:h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-1 sm:px-2"
                              onClick={() => imprimirReciboPOS(venta.id)}
                              title="Recibo POS 80mm"
                            >
                              <Receipt size={14} className="sm:w-4 sm:h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => verVenta(venta.id)}
                              title="Ver detalles"
                            >
                              <Eye size={14} className="sm:w-[18px] sm:h-[18px]" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hidden sm:flex"
                              title="Editar"
                            >
                              <PencilSimple size={14} className="sm:w-[18px] sm:h-[18px]" />
                            </Button>

                            {!venta.certificada && !venta.facturada && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleEliminarVenta(venta.id)}
                                title="Eliminar"
                              >
                                <Trash size={14} className="sm:w-[18px] sm:h-[18px]" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t gap-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Página {pagina} de {totalPaginas}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-8"
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1 || loading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-8"
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas || loading}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <VentaDetalleModal
        isOpen={isModalDetalleOpen}
        onClose={() => {
          setIsModalDetalleOpen(false)
          setVentaSeleccionada(null)
        }}
        venta={ventaSeleccionada}
      />

      <Dialog open={abonoOpen} onOpenChange={open => (!open ? cerrarAbono() : setAbonoOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago de apartado</DialogTitle>
            <DialogDescription>
              Registre un abono para completar o reducir el saldo pendiente de esta venta.
            </DialogDescription>
          </DialogHeader>

          {ventaAbono && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <p className="text-sm font-medium">
                    {ventaAbono.cliente_nombre || 'Consumidor Final'}
                  </p>
                  {ventaAbono.codigo_venta && (
                    <p className="text-xs text-muted-foreground">
                      {ventaAbono.codigo_venta}
                    </p>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <Label>Total venta</Label>
                  <MoneyDisplay amount={ventaAbono.total_final} className="font-semibold" />
                  <p className="text-xs text-muted-foreground">
                    Pagado: <MoneyDisplay amount={ventaAbono.total_pagado} className="inline" />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <Label>Método de pago</Label>
                  <Select value={metodoAbono} onValueChange={setMetodoAbono}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Monto a pagar</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montoAbono}
                    onChange={e => setMontoAbono(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Saldo pendiente:{' '}
                    <MoneyDisplay amount={ventaAbono.saldo_pendiente || 0} className="inline" />
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Banco / referencia</Label>
                  <Input
                    placeholder="Opcional"
                    value={bancoAbono}
                    onChange={e => setBancoAbono(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Referencia</Label>
                <Input
                  placeholder="Ej. Abono apartado"
                  value={referenciaAbono}
                  onChange={e => setReferenciaAbono(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cerrarAbono} disabled={loadingAbono}>
              Cancelar
            </Button>
            <Button onClick={registrarAbono} disabled={loadingAbono || !ventaAbono}>
              {loadingAbono ? 'Registrando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
