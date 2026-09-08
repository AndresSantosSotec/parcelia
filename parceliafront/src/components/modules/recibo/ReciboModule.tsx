'use client'

import { useState, useEffect, useCallback } from 'react'
import { reciboService, Recibo, Cliente, ReciboCreateRequest } from '@/lib/services/recibo.service'
import { denominacionService, Denominacion } from '@/lib/services/denominacion.service'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Receipt, CaretDown, ListBullets, PlusCircle, Printer, Eye, 
  FilePdf, MagnifyingGlass, ArrowUp, ArrowDown, Warning, XCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ConteoEfectivo {
  [key: string]: number
}

// Tipos de vista del módulo
type VistaActual = 'lista' | 'nuevo' | 'detalle' | 'reporte'

export function ReciboModule() {
  // Estados principales
  const [vistaActual, setVistaActual] = useState<VistaActual>('lista')
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [reciboSeleccionado, setReciboSeleccionado] = useState<Recibo | null>(null)
  const [loading, setLoading] = useState(true)

  // Denominaciones
  const [billetes, setBilletes] = useState<Denominacion[]>([])
  const [monedas, setMonedas] = useState<Denominacion[]>([])
  const [simboloMoneda, setSimboloMoneda] = useState('Q')

  // Búsqueda de cliente
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  // Formulario nuevo recibo
  const [formRecibo, setFormRecibo] = useState({
    tipo: 'ingreso' as 'ingreso' | 'egreso',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    concepto: '',
    observaciones: ''
  })
  const [conteoRecibo, setConteoRecibo] = useState<ConteoEfectivo>({})
  const [usarDesglose, setUsarDesglose] = useState(true)
  const [montoDirecto, setMontoDirecto] = useState('')
  const [siguienteNumero, setSiguienteNumero] = useState('')

  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd')
  })

  // Dialog anular
  const [dialogAnular, setDialogAnular] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  // ===== CARGA DE DATOS =====
  const loadDenominaciones = useCallback(async () => {
    try {
      const data = await denominacionService.getMonedaBase()
      if (data?.billetes && data?.monedas) {
        setBilletes(data.billetes.map((d: any) => ({ ...d, valor: Number(d.valor) })))
        setMonedas(data.monedas.map((d: any) => ({ ...d, valor: Number(d.valor) })))
        setSimboloMoneda(data.moneda?.simbolo || 'Q')
      }
    } catch (error) {
      console.error('Error cargando denominaciones:', error)
      // Fallback
      setBilletes([
        { id: 1, moneda_id: 1, valor: 200, tipo: 'billete', descripcion: 'Q200', orden: 1, activa: true },
        { id: 2, moneda_id: 1, valor: 100, tipo: 'billete', descripcion: 'Q100', orden: 2, activa: true },
        { id: 3, moneda_id: 1, valor: 50, tipo: 'billete', descripcion: 'Q50', orden: 3, activa: true },
        { id: 4, moneda_id: 1, valor: 20, tipo: 'billete', descripcion: 'Q20', orden: 4, activa: true },
        { id: 5, moneda_id: 1, valor: 10, tipo: 'billete', descripcion: 'Q10', orden: 5, activa: true },
        { id: 6, moneda_id: 1, valor: 5, tipo: 'billete', descripcion: 'Q5', orden: 6, activa: true },
      ])
      setMonedas([
        { id: 7, moneda_id: 1, valor: 1.00, tipo: 'moneda', descripcion: 'Q1.00', orden: 7, activa: true },
        { id: 8, moneda_id: 1, valor: 0.50, tipo: 'moneda', descripcion: 'Q0.50', orden: 8, activa: true },
        { id: 9, moneda_id: 1, valor: 0.25, tipo: 'moneda', descripcion: 'Q0.25', orden: 9, activa: true },
      ])
    }
  }, [])

  const loadRecibos = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {
        fecha_inicio: filtros.fecha_inicio,
        fecha_fin: filtros.fecha_fin
      }
      if (filtros.tipo !== 'todos') {
        filters.tipo = filtros.tipo
      }
      
      const data = await reciboService.getRecibos(filters)
      setRecibos(data.data || [])
    } catch (error) {
      console.error('Error cargando recibos:', error)
      setRecibos([])
    } finally {
      setLoading(false)
    }
  }, [filtros])

  const loadSiguienteNumero = async () => {
    try {
      const data = await reciboService.getSiguienteNumero()
      setSiguienteNumero(data.numero_recibo)
    } catch (error) {
      console.error('Error obteniendo siguiente número:', error)
    }
  }

  const buscarClientes = async (query: string) => {
    if (query.length < 2) {
      setClientesEncontrados([])
      return
    }

    try {
      const data = await reciboService.buscarCliente(query)
      setClientesEncontrados(data.clientes || [])
    } catch (error) {
      console.error('Error buscando clientes:', error)
    }
  }

  useEffect(() => {
    loadDenominaciones()
  }, [loadDenominaciones])

  useEffect(() => {
    loadRecibos()
  }, [loadRecibos])

  useEffect(() => {
    if (vistaActual === 'nuevo') {
      loadSiguienteNumero()
    }
  }, [vistaActual])

  // ===== CÁLCULOS =====
  const calcularTotalRecibo = () => {
    return Object.entries(conteoRecibo).reduce((sum, [valor, cant]) => sum + (parseFloat(valor) * cant), 0)
  }

  // ===== HANDLERS =====
  const handleBuscarCliente = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setBusquedaCliente(query)
    buscarClientes(query)
  }

  const handleSeleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente)
    setBusquedaCliente(`${cliente.codigo} - ${cliente.nombre} ${cliente.apellidos}`)
    setClientesEncontrados([])
  }

  const handleCrearRecibo = async () => {
    let monto: number
    let desglose: { [key: string]: number } | undefined

    if (usarDesglose) {
      monto = calcularTotalRecibo()
      if (monto <= 0) {
        toast.error('Ingresa al menos una denominación')
        return
      }
      desglose = { ...conteoRecibo }
    } else {
      monto = parseFloat(montoDirecto)
      if (isNaN(monto) || monto <= 0) {
        toast.error('Monto inválido')
        return
      }
    }

    if (!formRecibo.concepto.trim()) {
      toast.error('El concepto es obligatorio')
      return
    }

    try {
      const data: ReciboCreateRequest = {
        tipo: formRecibo.tipo,
        fecha: formRecibo.fecha,
        monto: monto,
        concepto: formRecibo.concepto,
        observaciones: formRecibo.observaciones || undefined,
        cliente_id: clienteSeleccionado?.id,
        desglose_denominaciones: desglose
      }

      const response = await reciboService.createRecibo(data)
      
      toast.success(`Recibo ${response.numero_recibo} emitido correctamente`)
      
      // Resetear formulario
      setFormRecibo({ tipo: 'ingreso', fecha: format(new Date(), 'yyyy-MM-dd'), concepto: '', observaciones: '' })
      setConteoRecibo({})
      setMontoDirecto('')
      setClienteSeleccionado(null)
      setBusquedaCliente('')
      
      setVistaActual('lista')
      loadRecibos()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear recibo')
    }
  }

  const handleAnularRecibo = async () => {
    if (!reciboSeleccionado || !motivoAnulacion.trim()) {
      toast.error('Ingresa el motivo de anulación')
      return
    }

    try {
      await reciboService.anularRecibo(reciboSeleccionado.id, motivoAnulacion)
      toast.success('Recibo anulado correctamente')
      setDialogAnular(false)
      setMotivoAnulacion('')
      setReciboSeleccionado(null)
      loadRecibos()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al anular recibo')
    }
  }

  const handleImprimirRecibo = async (recibo: Recibo) => {
    try {
      // Descargar PDF con autenticación
      await api.downloadFile(reciboService.getPDFUrl(recibo.id), `recibo_${recibo.numero_recibo}.pdf`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al descargar el recibo')
    }
  }

  // ===== HELPERS =====
  const updateConteoRecibo = (valor: number, cantidad: number) => {
    setConteoRecibo(prev => ({ ...prev, [valor.toString()]: cantidad }))
  }

  // ===== LOADING =====
  if (loading && vistaActual === 'lista') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== RENDER =====
  return (
    <div className="space-y-4">
      {/* Header con título y menú de acciones */}
      <div className="page-toolbar pb-4 border-b">
        <div className="min-w-0">
          <h1 className="font-bold tracking-tight">RECIBOS</h1>
          <p className="text-sm text-muted-foreground">Emisión y control de recibos de caja</p>
        </div>

        {/* Menú de acciones estilo MicroSystem */}
        <div className="page-toolbar-actions">
          {/* Dropdown Acciones con Recibos */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="gap-2">
                <Receipt size={18} />
                Acciones con Recibos
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setVistaActual('nuevo')}
                className="gap-2"
              >
                <PlusCircle size={16} />
                Recibo individual
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled
                className="gap-2"
              >
                <ListBullets size={16} />
                Recibos Grupales
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Consultas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ListBullets size={18} />
                Consultas
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setVistaActual('lista')}
                className="gap-2"
              >
                <Receipt size={16} />
                Lista de Recibos
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setVistaActual('reporte')}
                className="gap-2"
              >
                <FilePdf size={16} />
                Reporte de Recibos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contenido según la vista actual */}
      {vistaActual === 'lista' && (
        <VistaListaRecibos
          recibos={recibos}
          filtros={filtros}
          setFiltros={setFiltros}
          simboloMoneda={simboloMoneda}
          onVer={(r) => {
            setReciboSeleccionado(r)
            setVistaActual('detalle')
          }}
          onAnular={(r) => {
            setReciboSeleccionado(r)
            setDialogAnular(true)
          }}
          onImprimir={handleImprimirRecibo}
          onBuscar={loadRecibos}
        />
      )}

      {vistaActual === 'nuevo' && (
        <VistaNuevoRecibo
          formRecibo={formRecibo}
          setFormRecibo={setFormRecibo}
          billetes={billetes}
          monedas={monedas}
          simboloMoneda={simboloMoneda}
          conteoRecibo={conteoRecibo}
          usarDesglose={usarDesglose}
          setUsarDesglose={setUsarDesglose}
          montoDirecto={montoDirecto}
          setMontoDirecto={setMontoDirecto}
          siguienteNumero={siguienteNumero}
          calcularTotalRecibo={calcularTotalRecibo}
          updateConteoRecibo={updateConteoRecibo}
          busquedaCliente={busquedaCliente}
          handleBuscarCliente={handleBuscarCliente}
          clientesEncontrados={clientesEncontrados}
          handleSeleccionarCliente={handleSeleccionarCliente}
          clienteSeleccionado={clienteSeleccionado}
          onCrear={handleCrearRecibo}
          onCancelar={() => setVistaActual('lista')}
        />
      )}

      {vistaActual === 'detalle' && reciboSeleccionado && (
        <VistaDetalleRecibo
          recibo={reciboSeleccionado}
          simboloMoneda={simboloMoneda}
          onVolver={() => {
            setReciboSeleccionado(null)
            setVistaActual('lista')
          }}
          onAnular={() => setDialogAnular(true)}
          onImprimir={() => handleImprimirRecibo(reciboSeleccionado)}
        />
      )}

      {/* Dialog Anular */}
      <Dialog open={dialogAnular} onOpenChange={setDialogAnular}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle size={24} />
              Anular Recibo
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El recibo quedará marcado como anulado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reciboSeleccionado && (
              <Alert variant="destructive">
                <Warning className="h-4 w-4" />
                <AlertTitle>Recibo a anular</AlertTitle>
                <AlertDescription>
                  {reciboSeleccionado.numero_recibo} - {simboloMoneda}{Number(reciboSeleccionado.monto).toFixed(2)}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Motivo de anulación <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Explica el motivo de la anulación..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAnular(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleAnularRecibo} disabled={!motivoAnulacion.trim()}>
              <XCircle className="mr-2" size={18} />
              Anular Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// COMPONENTES DE VISTAS
// ============================================

function VistaListaRecibos({
  recibos, filtros, setFiltros, simboloMoneda,
  onVer, onAnular, onImprimir, onBuscar
}: any) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filtros.tipo} onValueChange={(val) => setFiltros({ ...filtros, tipo: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ingreso">Ingresos</SelectItem>
                  <SelectItem value="egreso">Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input 
                type="date" 
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input 
                type="date" 
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
              />
            </div>
            <Button onClick={onBuscar}>
              <MagnifyingGlass className="mr-2" size={18} />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de recibos */}
      <Card>
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg py-3">
          <CardTitle className="text-base">Recibos Emitidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {recibos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Receipt size={40} className="mx-auto mb-3 opacity-50" />
                <p>No hay recibos para mostrar</p>
              </div>
            ) : recibos.map((recibo: Recibo) => (
              <div key={recibo.id} className={`p-3 space-y-2 ${recibo.estado === 'anulado' ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-medium text-sm">{recibo.numero_recibo}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(recibo.fecha), 'dd/MM/yyyy')}</p>
                    <p className="text-sm truncate">
                      {recibo.cliente ? `${recibo.cliente.nombre} ${recibo.cliente.apellidos}` : 'Sin cliente'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{recibo.concepto}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={recibo.tipo === 'ingreso' ? 'default' : 'destructive'}>
                      {reciboService.getTipoLabel(recibo.tipo)}
                    </Badge>
                    <Badge variant={
                      recibo.estado === 'emitido' ? 'default' :
                      recibo.estado === 'anulado' ? 'destructive' : 'secondary'
                    }>
                      {reciboService.getEstadoLabel(recibo.estado)}
                    </Badge>
                  </div>
                </div>
                <p className={`text-right font-bold ${recibo.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                  {simboloMoneda} {Number(recibo.monto).toFixed(2)}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => onVer(recibo)}>
                    <Eye size={14} className="mr-1" /> Ver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onImprimir(recibo)}>
                    <Printer size={14} className="mr-1" /> Imprimir
                  </Button>
                  {recibo.estado === 'emitido' ? (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => onAnular(recibo)}>
                      <XCircle size={14} className="mr-1" /> Anular
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">No. Recibo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recibos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay recibos para mostrar</p>
                  </TableCell>
                </TableRow>
              ) : (
                recibos.map((recibo: Recibo) => (
                  <TableRow key={recibo.id} className={recibo.estado === 'anulado' ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono font-medium">{recibo.numero_recibo}</TableCell>
                    <TableCell>{format(new Date(recibo.fecha), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={recibo.tipo === 'ingreso' ? 'default' : 'destructive'}>
                        {recibo.tipo === 'ingreso' ? <ArrowUp className="mr-1" size={12} /> : <ArrowDown className="mr-1" size={12} />}
                        {reciboService.getTipoLabel(recibo.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {recibo.cliente 
                        ? `${recibo.cliente.nombre} ${recibo.cliente.apellidos}` 
                        : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{recibo.concepto}</TableCell>
                    <TableCell className={`text-right font-bold ${
                      recibo.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {simboloMoneda} {Number(recibo.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        recibo.estado === 'emitido' ? 'default' :
                        recibo.estado === 'anulado' ? 'destructive' : 'secondary'
                      }>
                        {reciboService.getEstadoLabel(recibo.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onVer(recibo)}>
                          <Eye size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onImprimir(recibo)}>
                          <Printer size={16} />
                        </Button>
                        {recibo.estado === 'emitido' && (
                          <Button size="sm" variant="ghost" onClick={() => onAnular(recibo)}>
                            <XCircle size={16} className="text-red-500" />
                          </Button>
                        )}
                      </div>
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
  )
}

function VistaNuevoRecibo({
  formRecibo, setFormRecibo, billetes, monedas, simboloMoneda,
  conteoRecibo, usarDesglose, setUsarDesglose, montoDirecto, setMontoDirecto,
  siguienteNumero, calcularTotalRecibo, updateConteoRecibo,
  busquedaCliente, handleBuscarCliente, clientesEncontrados, handleSeleccionarCliente,
  clienteSeleccionado, onCrear, onCancelar
}: any) {
  const totalDesglose = calcularTotalRecibo()

  return (
    <div className="space-y-4">
      <div className="page-toolbar">
        <h2 className="text-xl font-bold">Nuevo Recibo Individual</h2>
        <div className="page-toolbar-actions">
          <Button variant="outline" onClick={onCancelar}>← Cancelar</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-blue-600 text-white rounded-t-lg py-3">
          <CardTitle className="text-base text-center">EMISIÓN DE RECIBO</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Número de recibo */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm text-muted-foreground">Número de Recibo</Label>
            <p className="text-2xl font-bold text-primary">{siguienteNumero || 'Generando...'}</p>
          </div>

          {/* Info básica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formRecibo.fecha}
                onChange={(e) => setFormRecibo({ ...formRecibo, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Recibo</Label>
              <Select 
                value={formRecibo.tipo} 
                onValueChange={(val: 'ingreso' | 'egreso') => setFormRecibo({ ...formRecibo, tipo: val })}
              >
                <SelectTrigger className={formRecibo.tipo === 'ingreso' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">
                    <span className="flex items-center gap-2">
                      <ArrowUp className="text-green-600" size={16} /> Ingreso
                    </span>
                  </SelectItem>
                  <SelectItem value="egreso">
                    <span className="flex items-center gap-2">
                      <ArrowDown className="text-red-600" size={16} /> Egreso
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buscar Cliente (opcional)</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar por nombre, CUI o código..."
                  value={busquedaCliente}
                  onChange={handleBuscarCliente}
                />
                {clientesEncontrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                    {clientesEncontrados.map((cliente: Cliente) => (
                      <div
                        key={cliente.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer"
                        onClick={() => handleSeleccionarCliente(cliente)}
                      >
                        <p className="font-medium">{cliente.codigo} - {cliente.nombre} {cliente.apellidos}</p>
                        <p className="text-sm text-muted-foreground">CUI: {cliente.cui || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label>Concepto <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe el concepto del recibo..."
              value={formRecibo.concepto}
              onChange={(e) => setFormRecibo({ ...formRecibo, concepto: e.target.value })}
            />
          </div>

          {/* Toggle desglose */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="font-medium">Desglosar Monto</Label>
              <p className="text-sm text-muted-foreground">Ingresar por denominaciones</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={!usarDesglose ? 'font-bold' : 'text-muted-foreground'}>No</span>
              <Switch checked={usarDesglose} onCheckedChange={setUsarDesglose} />
              <span className={usarDesglose ? 'font-bold' : 'text-muted-foreground'}>Sí</span>
            </div>
          </div>

          {usarDesglose ? (
            <Card className="border-green-200">
              <CardHeader className="bg-green-600 text-white py-2 rounded-t-lg">
                <CardTitle className="text-center text-sm">Denominaciones posibles</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-center text-sm text-muted-foreground mb-4">
                  Ingrese la cantidad para cada denominación.
                </p>
                <p className="text-center mb-4">
                  Total: <span className="text-xl font-bold text-green-600">{simboloMoneda} {totalDesglose.toFixed(2)}</span>
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Billetes */}
                  <div>
                    <div className="bg-green-600 text-white p-2 text-center font-bold text-sm rounded-t">
                      Billetes
                    </div>
                    <div className="border border-t-0 rounded-b p-3 space-y-2">
                      {billetes.map((d: Denominacion) => (
                        <div key={d.id} className="grid grid-cols-3 gap-2 items-center">
                          <span className="font-bold text-green-700">{simboloMoneda} {d.valor.toFixed(2)}</span>
                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min="0"
                              className="h-8 text-center"
                              value={conteoRecibo[d.valor] || ''}
                              onChange={(e) => updateConteoRecibo(d.valor, parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="text-right text-sm">
                            Subtotal: <span className="font-bold">{simboloMoneda} {((conteoRecibo[d.valor] || 0) * d.valor).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monedas */}
                  <div>
                    <div className="bg-amber-600 text-white p-2 text-center font-bold text-sm rounded-t">
                      Monedas
                    </div>
                    <div className="border border-t-0 rounded-b p-3 space-y-2">
                      {monedas.map((d: Denominacion) => (
                        <div key={d.id} className="grid grid-cols-3 gap-2 items-center">
                          <span className="font-bold text-amber-700">{simboloMoneda} {d.valor.toFixed(2)}</span>
                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min="0"
                              className="h-8 text-center"
                              value={conteoRecibo[d.valor] || ''}
                              onChange={(e) => updateConteoRecibo(d.valor, parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="text-right text-sm">
                            Subtotal: <span className="font-bold">{simboloMoneda} {((conteoRecibo[d.valor] || 0) * d.valor).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-w-xs">
              <Label>Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">{simboloMoneda}</span>
                <Input
                  type="number"
                  className="pl-8 text-lg font-bold"
                  placeholder="0.00"
                  value={montoDirecto}
                  onChange={(e) => setMontoDirecto(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea
              placeholder="Observaciones adicionales..."
              value={formRecibo.observaciones}
              onChange={(e) => setFormRecibo({ ...formRecibo, observaciones: e.target.value })}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-center gap-4 pt-4 border-t">
            <Button variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button onClick={onCrear} className="bg-green-600 hover:bg-green-700 px-8">
              <Printer className="mr-2" size={18} />
              Imprimir resumen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VistaDetalleRecibo({
  recibo, simboloMoneda, onVolver, onAnular, onImprimir
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Detalle de Recibo</h2>
        <Button variant="outline" onClick={onVolver}>← Volver</Button>
      </div>

      <Card>
        <CardHeader className={`${recibo.estado === 'anulado' ? 'bg-red-100' : 'bg-blue-100'} rounded-t-lg`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Recibo No.</p>
              <CardTitle className="text-2xl">{recibo.numero_recibo}</CardTitle>
            </div>
            <Badge 
              variant={recibo.estado === 'emitido' ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {reciboService.getEstadoLabel(recibo.estado)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Fecha</Label>
              <p className="font-medium">{format(new Date(recibo.fecha), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tipo</Label>
              <Badge variant={recibo.tipo === 'ingreso' ? 'default' : 'destructive'}>
                {reciboService.getTipoLabel(recibo.tipo)}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Usuario</Label>
              <p className="font-medium">{recibo.usuario?.name || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Sucursal</Label>
              <p className="font-medium">{recibo.sucursal?.nombre || 'N/A'}</p>
            </div>
          </div>

          {recibo.cliente && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground">Cliente</Label>
              <p className="font-medium text-lg">{recibo.cliente.nombre} {recibo.cliente.apellidos}</p>
              <p className="text-sm text-muted-foreground">CUI: {recibo.cliente.cui || 'N/A'}</p>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Concepto</Label>
            <p className="font-medium">{recibo.concepto}</p>
          </div>

          {recibo.observaciones && (
            <div>
              <Label className="text-muted-foreground">Observaciones</Label>
              <p>{recibo.observaciones}</p>
            </div>
          )}

          <div className={`p-6 rounded-lg text-center ${recibo.tipo === 'ingreso' ? 'bg-green-50' : 'bg-red-50'}`}>
            <Label className="text-muted-foreground">Monto</Label>
            <p className={`text-4xl font-bold ${recibo.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
              {simboloMoneda} {Number(recibo.monto).toFixed(2)}
            </p>
          </div>

          {recibo.estado === 'anulado' && (
            <Alert variant="destructive">
              <Warning className="h-4 w-4" />
              <AlertTitle>Recibo Anulado</AlertTitle>
              <AlertDescription>
                <p><strong>Motivo:</strong> {recibo.motivo_anulacion}</p>
                <p className="text-sm mt-1">
                  Anulado el {format(new Date(recibo.fecha_anulacion), 'dd/MM/yyyy HH:mm')} 
                  por {recibo.anulador?.name || 'Usuario'}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones */}
          <div className="flex justify-center gap-4 pt-4 border-t">
            <Button variant="outline" onClick={onImprimir}>
              <Printer className="mr-2" size={18} />
              Reimprimir
            </Button>
            {recibo.estado === 'emitido' && (
              <Button variant="destructive" onClick={onAnular}>
                <XCircle className="mr-2" size={18} />
                Anular
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
