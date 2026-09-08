import { useState } from 'react'
import { CreditoPrendario } from '@/types/creditoPrendario.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Trash, Eye, CreditCard as CreditCardIcon, Image as ImageIcon } from '@phosphor-icons/react'
import { ImagenPrendaViewer } from './ImagenPrendaViewer'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

interface CreditosTableProps {
  creditos: CreditoPrendario[]
  onVerDetalle: (credito: CreditoPrendario) => void
  onEditar: (credito: CreditoPrendario) => void
  onEliminar: (credito: CreditoPrendario) => void
  loading?: boolean
  totalRegistros: number
  paginaActual: number
  registrosPorPagina: number
  onCambiarPagina: (pagina: number) => void
  onCambiarRegistrosPorPagina: (valor: number) => void
}

export function CreditosTable({ 
  creditos, 
  onVerDetalle, 
  onEditar, 
  onEliminar, 
  loading,
  totalRegistros,
  paginaActual,
  registrosPorPagina,
  onCambiarPagina,
  onCambiarRegistrosPorPagina
}: CreditosTableProps) {
  const [imagenesAbiertas, setImagenesAbiertas] = useState(false)
  const [imagenesActuales, setImagenesActuales] = useState<string[]>([])

  const abrirImagenes = (credito: CreditoPrendario) => {
    const imagenes: string[] = []
    credito.prendas?.forEach(prenda => {
      if ((prenda as any).foto_url) {
        imagenes.push((prenda as any).foto_url)
      }
    })
    
    if (imagenes.length > 0) {
      setImagenesActuales(imagenes)
      setImagenesAbiertas(true)
    }
  }
  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      solicitado: { label: 'Solicitado', variant: 'secondary' },
      en_analisis: { label: 'En Análisis', variant: 'outline' },
      aprobado: { label: 'Aprobado', variant: 'default' },
      vigente: { label: 'Vigente', variant: 'default' },
      vencido: { label: 'Vencido', variant: 'destructive' },
      en_mora: { label: 'En Mora', variant: 'destructive' },
      pagado: { label: 'Pagado', variant: 'outline' },
      rechazado: { label: 'Rechazado', variant: 'destructive' },
      en_inventario: { label: 'En Inventario', variant: 'secondary' },
      anulado: { label: 'Anulado', variant: 'outline' },
    }
    
    const estadoInfo = estados[estado] || { label: estado, variant: 'outline' as const }
    return <Badge variant={estadoInfo.variant}>{estadoInfo.label}</Badge>
  }

  const formatFecha = (fecha: string | undefined) => {
    if (!fecha) return '-'
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
    } catch {
      return '-'
    }
  }

  const getDiasVencimiento = (fechaVencimiento: string | undefined) => {
    if (!fechaVencimiento) return null
    try {
      const fecha = new Date(fechaVencimiento)
      const ahora = new Date()
      const diffTime = fecha.getTime() - ahora.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Cargando créditos...</p>
      </div>
    )
  }

  // Se renderizan directamente todos los registros pasados por props ya que vienen paginados del servidor
  const creditosPaginados = creditos

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Prenda(s)</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="text-right">Monto Solicitado</TableHead>
              <TableHead className="text-right">Capital Pendiente</TableHead>
              <TableHead className="w-[140px]">Fechas</TableHead>
              <TableHead className="w-[150px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creditosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <CreditCardIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No hay créditos para mostrar</p>
                </TableCell>
              </TableRow>
            ) : (
              creditosPaginados.map((credito) => {
              // Calcular variables para cada crédito
              const diasVencimiento = getDiasVencimiento(credito.fecha_vencimiento)
              const capitalPendiente = Number(credito.capital_pendiente) || 0
              const montoSolicitado = Number(credito.monto_solicitado) || 0
              const prendasCount = credito.prendas?.length || 0
              const primeraPrenda = credito.prendas?.[0]
              const nombreCliente = credito.cliente 
                ? `${credito.cliente.nombres} ${credito.cliente.apellidos}`
                : 'Cliente desconocido'
              
              const tieneImagenes = credito.prendas?.some(p => (p as any).foto_url) || false

              return (
                <TableRow key={credito.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono font-semibold">
                    {credito.codigo_credito || credito.numero_credito}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{nombreCliente}</span>
                      {credito.cliente?.telefono && (
                        <span className="text-xs text-muted-foreground">{credito.cliente.telefono}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {prendasCount === 0 ? (
                        <span className="text-sm text-muted-foreground italic">Sin prendas asociadas</span>
                      ) : (
                        <>
                          <span className="text-sm font-medium">
                            {prendasCount} prenda{prendasCount !== 1 ? 's' : ''}
                          </span>
                          {credito.prendas && credito.prendas.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                              {credito.prendas.slice(0, 2).map((prenda, idx) => (
                                <span key={prenda.id || idx} className="text-xs text-muted-foreground">
                                  • {prenda.descripcion || prenda.descripcion_general || 'Sin descripción'}
                                  {prenda.marca && ` (${prenda.marca})`}
                                </span>
                              ))}
                              {credito.prendas.length > 2 && (
                                <span className="text-xs text-muted-foreground font-medium">
                                  + {credito.prendas.length - 2} más
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getEstadoBadge(credito.estado)}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay amount={montoSolicitado} className="font-semibold" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay amount={capitalPendiente} className="font-semibold" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="text-muted-foreground">
                        Solicitado: {formatFecha(credito.fecha_solicitud)}
                      </span>
                      {credito.fecha_vencimiento && (
                        <span className={diasVencimiento && diasVencimiento < 0 ? 'text-destructive font-medium' : ''}>
                          {diasVencimiento && diasVencimiento < 0 ? 'Vencido' : 'Vence'}: {formatFecha(credito.fecha_vencimiento)}
                          {diasVencimiento && diasVencimiento > 0 && ` (${diasVencimiento} días)`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onVerDetalle(credito)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {tieneImagenes && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => abrirImagenes(credito)}
                          title="Ver imágenes"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditar(credito)}
                        title="Editar crédito"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onEliminar(credito)}
                        title="Eliminar crédito"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      </div>



      <DataTablePagination
        totalRegistros={totalRegistros}
        paginaActual={paginaActual}
        registrosPorPagina={registrosPorPagina}
        onCambiarPagina={onCambiarPagina}
        onCambiarRegistrosPorPagina={(valor) => onCambiarRegistrosPorPagina(Number(valor))}
      />

      <ImagenPrendaViewer
        imagenes={imagenesActuales}
        abierto={imagenesAbiertas}
        onCerrar={() => setImagenesAbiertas(false)}
      />
    </div>
  )
}
