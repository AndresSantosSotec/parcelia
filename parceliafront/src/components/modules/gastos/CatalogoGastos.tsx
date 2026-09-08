import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Pencil,
  Trash,
  ArrowsCounterClockwise,
  MagnifyingGlass,
  CurrencyDollar,
  Percent,
  CaretUp,
  CaretDown,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { TableEmptyState } from '@/components/ui/TableEmptyState'
import gastosService from '@/services/gastos.service'
import type { Gasto, TipoGasto, CrearGastoDTO, ActualizarGastoDTO } from '@/types/gastos.types'
import debounce from 'lodash/debounce'

interface FormData {
  nombre: string
  tipo: TipoGasto
  porcentaje: number | null
  monto: number | null
  descripcion: string
  activo: boolean
}

const initialFormData: FormData = {
  nombre: '',
  tipo: 'FIJO',
  porcentaje: null,
  monto: null,
  descripcion: '',
  activo: true,
}

export function CatalogoGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10)
  const [totalRegistros, setTotalRegistros] = useState(0)
  
  // Filtros y búsqueda
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroBuscar, setFiltroBuscar] = useState('')
  const [busquedaInput, setBusquedaInput] = useState('')
  const [filtroActivos, setFiltroActivos] = useState<boolean | undefined>(true)
  
  // Ordenamiento
  type CampoOrden = 'nombre' | 'tipo' | 'monto' | 'porcentaje' | 'activo'
  const [ordenarPor, setOrdenarPor] = useState<CampoOrden>('nombre')
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc')
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [guardando, setGuardando] = useState(false)

  // Confirmar eliminación
  const [confirmarEliminar, setConfirmarEliminar] = useState<Gasto | null>(null)

  // Búsqueda con debounce
  const debouncedSearch = useCallback(
    debounce((valor: string) => {
      setFiltroBuscar(valor)
      setPaginaActual(1)
    }, 500),
    []
  )

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setBusquedaInput(valor)
    debouncedSearch(valor)
  }

  useEffect(() => {
    cargarGastos()
  }, [paginaActual, registrosPorPagina, filtroTipo, filtroActivos, filtroBuscar, ordenarPor, direccionOrden])

  const cargarGastos = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: paginaActual,
        per_page: registrosPorPagina,
        orden_campo: ordenarPor,
        orden_direccion: direccionOrden,
      }
      
      if (filtroTipo !== 'todos') {
        params.tipo = filtroTipo
      }
      if (filtroBuscar.trim()) {
        params.buscar = filtroBuscar.trim()
      }
      if (filtroActivos !== undefined) {
        params.activos = filtroActivos
      }

      const response = await gastosService.listar(params)
      setGastos(response.data || [])
      setTotalRegistros(response.total || response.data?.length || 0)
    } catch (error: any) {
      console.error('Error cargando gastos:', error)
      toast.error(error.message || 'Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }

  const toggleOrden = (campo: CampoOrden) => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(campo)
      setDireccionOrden('asc')
    }
    setPaginaActual(1)
  }

  const IconoOrden = ({ campo }: { campo: CampoOrden }) => {
    if (ordenarPor !== campo) return null
    return direccionOrden === 'asc' ? (
      <CaretUp className="h-3 w-3 inline ml-1" />
    ) : (
      <CaretDown className="h-3 w-3 inline ml-1" />
    )
  }

  const buscar = () => {
    setPaginaActual(1)
    cargarGastos()
  }

  const abrirModalCrear = () => {
    setGastoEditando(null)
    setFormData(initialFormData)
    setModalAbierto(true)
  }

  const abrirModalEditar = (gasto: Gasto) => {
    setGastoEditando(gasto)
    setFormData({
      nombre: gasto.nombre,
      tipo: gasto.tipo,
      porcentaje: gasto.porcentaje,
      monto: gasto.monto,
      descripcion: gasto.descripcion || '',
      activo: gasto.activo,
    })
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setGastoEditando(null)
    setFormData(initialFormData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('Ingresa un nombre para el gasto')
      return
    }
    
    if (formData.tipo === 'FIJO') {
      if (!formData.monto || formData.monto <= 0) {
        toast.error('Ingresa un monto válido para el gasto fijo')
        return
      }
    } else {
      if (!formData.porcentaje || formData.porcentaje <= 0 || formData.porcentaje > 100) {
        toast.error('Ingresa un porcentaje válido (entre 0 y 100)')
        return
      }
    }

    try {
      setGuardando(true)

      if (gastoEditando) {
        // Actualizar
        const updateData: ActualizarGastoDTO = {
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          descripcion: formData.descripcion.trim() || undefined,
          activo: formData.activo,
        }
        
        if (formData.tipo === 'FIJO') {
          updateData.monto = formData.monto!
          updateData.porcentaje = undefined
        } else {
          updateData.porcentaje = formData.porcentaje!
          updateData.monto = undefined
        }

        await gastosService.actualizar(gastoEditando.id_gasto, updateData)
        toast.success('Gasto actualizado exitosamente')
      } else {
        // Crear
        const createData: CrearGastoDTO = {
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          descripcion: formData.descripcion.trim() || undefined,
          activo: formData.activo,
        }
        
        if (formData.tipo === 'FIJO') {
          createData.monto = formData.monto!
        } else {
          createData.porcentaje = formData.porcentaje!
        }

        await gastosService.crear(createData)
        toast.success('Gasto creado exitosamente')
      }

      cerrarModal()
      cargarGastos()
    } catch (error: any) {
      console.error('Error guardando gasto:', error)
      toast.error(error.message || 'Error al guardar el gasto')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!confirmarEliminar) return

    try {
      const response = await gastosService.eliminar(confirmarEliminar.id_gasto)
      
      if (response.soft_delete) {
        toast.success('Gasto desactivado (tiene créditos asociados)')
      } else {
        toast.success('Gasto eliminado exitosamente')
      }
      
      setConfirmarEliminar(null)
      cargarGastos()
    } catch (error: any) {
      console.error('Error eliminando gasto:', error)
      toast.error(error.message || 'Error al eliminar el gasto')
    }
  }

  const handleRestaurar = async (gasto: Gasto) => {
    try {
      await gastosService.restaurar(gasto.id_gasto)
      toast.success('Gasto restaurado exitosamente')
      cargarGastos()
    } catch (error: any) {
      console.error('Error restaurando gasto:', error)
      toast.error(error.message || 'Error al restaurar el gasto')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CurrencyDollar className="h-5 w-5" />
                Catálogo de Gastos
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? 'Cargando...' : `${totalRegistros} gasto${totalRegistros !== 1 ? 's' : ''} encontrado${totalRegistros !== 1 ? 's' : ''}`}
              </p>
            </div>
            <Button onClick={abrirModalCrear}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros y Búsqueda */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre (búsqueda automática)..."
                  value={busquedaInput}
                  onChange={handleBusquedaChange}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPaginaActual(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Tipos</SelectItem>
                <SelectItem value="FIJO">Fijo</SelectItem>
                <SelectItem value="VARIABLE">Variable</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filtroActivos === undefined ? 'todos' : filtroActivos ? 'activos' : 'inactivos'} 
              onValueChange={(v) => { setFiltroActivos(v === 'todos' ? undefined : v === 'activos'); setPaginaActual(1) }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Estados</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla con Ordenamiento */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleOrden('nombre')}
                  >
                    Nombre <IconoOrden campo="nombre" />
                  </TableHead>
                  <TableHead 
                    className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleOrden('tipo')}
                  >
                    Tipo <IconoOrden campo="tipo" />
                  </TableHead>
                  <TableHead 
                    className="text-right w-[150px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleOrden('monto')}
                  >
                    Valor <IconoOrden campo="monto" />
                  </TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead 
                    className="w-[100px] text-center cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleOrden('activo')}
                  >
                    Estado <IconoOrden campo="activo" />
                  </TableHead>
                  <TableHead className="w-[120px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton 
                    rows={5} 
                    columns={6}
                    columnsWidth={['w-3/4', 'w-16', 'w-20', 'w-full', 'w-16', 'w-24']}
                  />
                ) : gastos.length === 0 ? (
                  <TableEmptyState
                    colSpan={6}
                    icon={<CurrencyDollar className="h-12 w-12" />}
                    title="No se encontraron gastos"
                    description={
                      filtroBuscar || filtroTipo !== 'todos' || filtroActivos !== true
                        ? 'Intenta ajustar los filtros de búsqueda'
                        : 'Comienza creando tu primer gasto'
                    }
                    showCreateButton={!filtroBuscar && filtroTipo === 'todos' && filtroActivos === true}
                    createButtonText="Crear Primer Gasto"
                    onCreateClick={abrirModalCrear}
                  />
                ) : (
                  gastos.map((gasto) => (
                    <TableRow key={gasto.id_gasto} className={!gasto.activo ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{gasto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={gasto.tipo === 'FIJO' ? 'default' : 'secondary'}>
                          {gasto.tipo === 'FIJO' ? (
                            <><CurrencyDollar className="h-3 w-3 mr-1" /> Fijo</>
                          ) : (
                            <><Percent className="h-3 w-3 mr-1" /> Variable</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {gasto.tipo === 'FIJO' ? (
                          <MoneyDisplay amount={gasto.monto || 0} />
                        ) : (
                          <span>{Number(gasto.porcentaje || 0).toFixed(2)}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {gasto.descripcion || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={gasto.activo ? 'default' : 'outline'}>
                          {gasto.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirModalEditar(gasto)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {gasto.deleted_at ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestaurar(gasto)}
                              title="Restaurar"
                            >
                              <ArrowsCounterClockwise className="h-4 w-4 text-blue-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmarEliminar(gasto)}
                              title="Eliminar"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
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

          {/* Paginación */}
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
        </CardContent>
      </Card>

      {/* Modal Crear/Editar */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {gastoEditando ? 'Editar Gasto' : 'Nuevo Gasto'}
            </DialogTitle>
            <DialogDescription>
              {gastoEditando 
                ? 'Modifica los datos del gasto.'
                : 'Crea un nuevo tipo de gasto para asociar a créditos prendarios.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Seguro de prenda, Gastos administrativos..."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Gasto <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    tipo: v as TipoGasto,
                    // Limpiar el campo opuesto
                    porcentaje: v === 'FIJO' ? null : formData.porcentaje,
                    monto: v === 'VARIABLE' ? null : formData.monto,
                  })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">
                      <div className="flex items-center gap-2">
                        <CurrencyDollar className="h-4 w-4" />
                        <span>Fijo (Monto en Q)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="VARIABLE">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        <span>Variable (% del monto)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'FIJO' ? (
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (Q) <span className="text-destructive">*</span></Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.monto ?? ''}
                    onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) || null })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este monto se aplicará igual sin importar el valor del crédito.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="porcentaje">Porcentaje (%) <span className="text-destructive">*</span></Label>
                  <Input
                    id="porcentaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={formData.porcentaje ?? ''}
                    onChange={(e) => setFormData({ ...formData, porcentaje: Number(e.target.value) || null })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se calculará como porcentaje del monto otorgado del crédito.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción o notas sobre este gasto..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo" className="cursor-pointer">
                  Gasto activo (disponible para asociar a créditos)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : gastoEditando ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación */}
      <Dialog open={!!confirmarEliminar} onOpenChange={() => setConfirmarEliminar(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el gasto "{confirmarEliminar?.nombre}"?
              {confirmarEliminar?.creditos_count && confirmarEliminar.creditos_count > 0 && (
                <p className="mt-2 text-amber-600">
                  Este gasto tiene {confirmarEliminar.creditos_count} crédito(s) asociado(s). 
                  Se desactivará en lugar de eliminarse permanentemente.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminar}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
