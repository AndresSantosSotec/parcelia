import { useState, useEffect } from 'react'
import { Cliente } from '@/lib/types'
import { clienteService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MagnifyingGlass,
  Plus,
  User,
  X,
  ArrowCounterClockwise,
  NotePencil,
  Trash,
  Clock,
  CaretDown,
  CaretUp,
  CheckCircle,
} from '@phosphor-icons/react'
import { ClienteDialog } from '@/components/modules/clientes/ClienteDialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreditoDraft } from '@/hooks/useCreditoDrafts'

interface PasoSeleccionarClienteProps {
  clienteSeleccionado: Cliente | null
  onClienteSeleccionado: (cliente: Cliente) => void
  onDeseleccionarCliente: () => void
  onSiguiente: () => void
  borradores?: CreditoDraft[]
  onCargarBorrador?: (draft: CreditoDraft) => void
  onEliminarBorrador?: (id: string) => void
}

export function PasoSeleccionarCliente({
  clienteSeleccionado,
  onClienteSeleccionado,
  onDeseleccionarCliente,
  onSiguiente,
  borradores = [],
  onCargarBorrador,
  onEliminarBorrador,
}: PasoSeleccionarClienteProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [total, setTotal] = useState(0)

  // ── Borradores colapsible ─────────────────────────────────────────────────
  const [mostrarBorradores, setMostrarBorradores] = useState(borradores.length > 0)

  // ── Diálogo: Crear cliente (usa ClienteDialog completo) ─────────────────
  const [dlgNuevoCliente, setDlgNuevoCliente] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)

  const handleGuardarNuevoCliente = async (clienteData: Cliente) => {
    setDialogLoading(true)
    try {
      const response = await clienteService.create(clienteData) as any
      const nuevo: Cliente = response?.data ?? response
      toast.success('Cliente creado y seleccionado')
      setDlgNuevoCliente(false)
      onClienteSeleccionado(nuevo)
    } catch (e: any) {
      toast.error(e.message || 'Error al crear cliente')
    } finally {
      setDialogLoading(false)
    }
  }

  const columns: ColumnDef<Cliente>[] = [
    {
      accessorKey: 'nombres',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.nombres} {row.original.apellidos}
        </div>
      ),
    },
    {
      accessorKey: 'dpi',
      header: 'DPI',
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.estado === 'activo' ? 'default' : 'secondary'}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acción</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onClienteSeleccionado(row.original)
            }}
          >
            Seleccionar
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: clientes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPaginas,
  })

  useEffect(() => {
    cargarClientes()
  }, [busqueda, pagina, porPagina])

  const cargarClientes = async () => {
    try {
      setLoading(true)
      const response = await clienteService.getAll({ 
        busqueda: busqueda || undefined,
        page: pagina,
        per_page: porPagina
      })
      if (response && response.data) {
        const clientesData = Array.isArray(response.data) ? response.data : []
        setClientes(clientesData as Cliente[])
        if (response.pagination) {
          setTotalPaginas(response.pagination.last_page || 1)
          setTotal(response.pagination.total || 0)
        }
      } else {
        setClientes([])
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast.error('Error al cargar clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  const handlePaginaSiguiente = () => {
    if (pagina < totalPaginas) {
      setPagina(pagina + 1)
    }
  }

  const handlePaginaAnterior = () => {
    if (pagina > 1) {
      setPagina(pagina - 1)
    }
  }

  const handleCambioPorPagina = (value: string) => {
    setPorPagina(Number(value))
    setPagina(1)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const PASO_LABELS: Record<number, string> = {
    1: 'Cliente',
    2: 'Prenda',
    3: 'Tasación',
    4: 'Crédito',
    5: 'Confirmación',
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="text-center mb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Seleccionar Cliente</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Busca y selecciona el cliente que desea realizar el empeño
        </p>
      </div>

      {/* ── PANEL: Borradores guardados ──────────────────────────────────── */}
      {borradores.length > 0 && (
        <Card className="border-dashed border-amber-400 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="py-3 px-4">
            <button
              type="button"
              onClick={() => setMostrarBorradores(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="flex items-center gap-2 font-semibold text-sm text-amber-700 dark:text-amber-400">
                <NotePencil className="h-4 w-4" />
                Borradores guardados
                <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                  {borradores.length}/{3}
                </Badge>
              </span>
              {mostrarBorradores
                ? <CaretUp className="h-4 w-4 text-amber-600" />
                : <CaretDown className="h-4 w-4 text-amber-600" />}
            </button>
          </CardHeader>

          {mostrarBorradores && (
            <CardContent className="px-4 pb-4 space-y-2">
              {borradores
                .slice()
                .sort((a, b) => new Date(b.actualizadoEn).getTime() - new Date(a.actualizadoEn).getTime())
                .map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{draft.titulo}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        Paso {draft.paso}: {PASO_LABELS[draft.paso] ?? draft.paso}
                        {' · '}
                        {format(new Date(draft.actualizadoEn), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onCargarBorrador?.(draft)}
                      >
                        <ArrowCounterClockwise className="h-3.5 w-3.5 mr-1" />
                        Continuar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onEliminarBorrador?.(draft.id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              <p className="text-xs text-muted-foreground pt-1">
                Máximo 3 borradores por usuario. Al guardar un cuarto se elimina el más antiguo.
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Barra de búsqueda + botón Nuevo Cliente ───────────────────────── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, DPI, teléfono..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPagina(1)
            }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" type="button" onClick={() => setDlgNuevoCliente(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* ── Tarjeta: cliente seleccionado ────────────────────────────────── */}
      {clienteSeleccionado && (
        <Card className="border-primary border-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {clienteSeleccionado.nombres} {clienteSeleccionado.apellidos}
                  </CardTitle>
                  <CardDescription>DPI: {clienteSeleccionado.dpi}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Seleccionado
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Cambiar cliente"
                  onClick={onDeseleccionarCliente}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teléfono:</span>
              <span className="font-medium">{clienteSeleccionado.telefono}</span>
            </div>
            {clienteSeleccionado.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{clienteSeleccionado.email}</span>
              </div>
            )}
            {clienteSeleccionado.direccion && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dirección:</span>
                <span className="font-medium text-right">{clienteSeleccionado.direccion}</span>
              </div>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={onDeseleccionarCliente}
              >
                <ArrowCounterClockwise className="h-4 w-4 mr-2" />
                Cambiar cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* ── Tabla de clientes (solo cuando no hay seleccionado) ──────────── */}
      {!clienteSeleccionado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes Registrados</CardTitle>
            <CardDescription>
              Selecciona un cliente de la lista o busca por nombre, DPI o teléfono
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="text-sm text-muted-foreground mt-3">Cargando clientes...</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {busqueda ? 'Intenta con otros criterios de búsqueda' : 'No hay clientes registrados'}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setDlgNuevoCliente(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Crear cliente nuevo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onClienteSeleccionado(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((pagina - 1) * porPagina) + 1}–{Math.min(pagina * porPagina, total)} de {total} clientes
                    </p>
                    <Select value={porPagina.toString()} onValueChange={handleCambioPorPagina}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 por página</SelectItem>
                        <SelectItem value="25">25 por página</SelectItem>
                        <SelectItem value="50">50 por página</SelectItem>
                        <SelectItem value="100">100 por página</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Página {pagina} de {totalPaginas}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handlePaginaAnterior} disabled={pagina === 1 || loading}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={handlePaginaSiguiente} disabled={pagina === totalPaginas || loading}>
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Botón continuar ──────────────────────────────────────────────── */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSiguiente} disabled={!clienteSeleccionado} size="lg">
          Continuar
        </Button>
      </div>

      {/* ── DIÁLOGO: Crear cliente (formulario completo) ──────────────── */}
      <ClienteDialog
        abierto={dlgNuevoCliente}
        onCerrar={() => setDlgNuevoCliente(false)}
        onGuardar={handleGuardarNuevoCliente}
        loading={dialogLoading}
      />
    </div>
  )
}