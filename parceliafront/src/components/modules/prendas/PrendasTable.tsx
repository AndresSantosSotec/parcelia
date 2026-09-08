import { useState } from 'react'
import { PrendaEmpenada } from '@/types/creditoPrendario.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Trash, Eye, Package, Image as ImageIcon, ShoppingCart, ClipboardText, CreditCard } from '@phosphor-icons/react'
import { ImagenPrendaViewer } from './ImagenPrendaViewer'

interface PrendasTableProps {
  prendas: PrendaEmpenada[]
  onVerDetalle: (prenda: PrendaEmpenada) => void
  onEditar: (prenda: PrendaEmpenada) => void
  onEliminar: (prenda: PrendaEmpenada) => void
  onVender?: (prenda: PrendaEmpenada) => void
  onApartar?: (prenda: PrendaEmpenada) => void
  onPlanPago?: (prenda: PrendaEmpenada) => void
  loading?: boolean
}

export function PrendasTable({
  prendas,
  onVerDetalle,
  onEditar,
  onEliminar,
  onVender,
  onApartar,
  onPlanPago,
  loading
}: PrendasTableProps) {
  const [imagenesAbiertas, setImagenesAbiertas] = useState(false)
  const [imagenesActuales, setImagenesActuales] = useState<string[]>([])
  const abrirImagenes = (prenda: PrendaEmpenada) => {
    if (prenda.fotos && prenda.fotos.length > 0) {
      setImagenesActuales(prenda.fotos.map(f => typeof f === 'string' ? f : (f as any).url))
      setImagenesAbiertas(true)
    }
  }

  const getEstadoBadge = (estado: string, enPlanPagos?: boolean) => {
    if (enPlanPagos) {
      return <Badge variant="secondary">En plan de pagos</Badge>
    }

    const estados: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      en_custodia: { label: 'En Custodia', variant: 'secondary' },
      en_evaluacion: { label: 'En Evaluación', variant: 'outline' },
      recuperada: { label: 'Recuperada', variant: 'secondary' },
      en_venta: { label: 'En Venta', variant: 'default' },
      vendida: { label: 'Vendida', variant: 'outline' },
      extraviada: { label: 'Extraviada', variant: 'destructive' },
      danada: { label: 'Dañada', variant: 'destructive' },
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Cargando prendas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Código / Crédito</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="text-right">Avalúo</TableHead>
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="w-[110px]">Fecha Ingreso</TableHead>
              <TableHead className="w-[110px]">Fecha Venta</TableHead>
              <TableHead className="w-[250px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No hay prendas para mostrar</p>
                </TableCell>
              </TableRow>
            ) : (
              prendas.map((prenda) => {
                const tieneImagenes = prenda.fotos && prenda.fotos.length > 0
                const precioVenta = prenda.valor_venta || prenda.valor_venta_final || 0
                const avaluo = prenda.valor_tasacion || 0
                const ubicacion = prenda.ubicacion_detalle ||
                  (prenda.seccion_almacen && prenda.estante && prenda.caja
                    ? `${prenda.seccion_almacen} - Estante ${prenda.estante}, Caja ${prenda.caja}`
                    : prenda.seccion_almacen || '-')

                return (
                  <TableRow key={prenda.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold text-xs">
                          {prenda.codigo_prenda || prenda.id.slice(0, 8).toUpperCase()}
                        </span>
                        {prenda.credito?.numero_credito && (
                          <span className="text-[10px] text-muted-foreground border border-muted bg-muted/30 px-1 py-0.5 rounded w-fit mt-1 flex items-center gap-1" title="Crédito asociado">
                            {prenda.credito.numero_credito}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[250px]">
                        <span className="font-medium truncate">{prenda.descripcion_general}</span>
                        {prenda.marca && (
                          <span className="text-xs text-muted-foreground">{prenda.marca}{prenda.modelo ? ` - ${prenda.modelo}` : ''}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{(prenda.categoria as any)?.nombre || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(prenda.estado || '', prenda.en_plan_pagos)}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay amount={avaluo} className="font-semibold" />
                    </TableCell>
                    <TableCell className="text-right">
                      {precioVenta > 0 ? (
                        <MoneyDisplay amount={precioVenta} className="font-semibold text-accent" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{ubicacion}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{formatFecha(prenda.fecha_ingreso)}</span>
                    </TableCell>
                    <TableCell>
                      {prenda.estado === 'vendida' && prenda.fecha_venta ? (
                        <span className="text-xs font-medium text-emerald-600">{formatFecha(prenda.fecha_venta)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 flex-wrap">


                        {/* Acciones generales */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onVerDetalle(prenda)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {tieneImagenes && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirImagenes(prenda)}
                            title="Ver imágenes"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEditar(prenda)}
                          title="Editar prenda"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onEliminar(prenda)}
                          title="Eliminar prenda"
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

      <ImagenPrendaViewer
        imagenes={imagenesActuales}
        abierto={imagenesAbiertas}
        onCerrar={() => setImagenesAbiertas(false)}
      />
    </div>
  )
}
