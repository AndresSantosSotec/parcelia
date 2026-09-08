import { ReactNode, useMemo } from 'react'
import { useResponsive } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

export interface Column<T> {
  /** Identificador único de la columna */
  id: string
  /** Texto del encabezado */
  header: string | ReactNode
  /** Función para obtener el valor de la celda */
  accessorFn: (row: T) => ReactNode
  /** Ancho de la columna en desktop (opcional) */
  width?: string
  /** Mostrar en vista móvil card (default: true) */
  showInMobile?: boolean
  /** Es columna principal (se muestra como título en card) */
  isPrimary?: boolean
  /** Habilitar ordenamiento */
  sortable?: boolean
  /** Alineación del texto */
  align?: 'left' | 'center' | 'right'
  /** Clase CSS adicional */
  className?: string
  /** Clase CSS adicional para header */
  headerClassName?: string
  /** Ocultar en ciertos breakpoints */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
}

interface ResponsiveTableProps<T> {
  /** Columnas de la tabla */
  columns: Column<T>[]
  /** Datos a mostrar */
  data: T[]
  /** Función para obtener una key única por fila */
  getRowKey: (row: T, index: number) => string | number
  /** Estado de carga */
  loading?: boolean
  /** Número de filas skeleton a mostrar */
  skeletonRows?: number
  /** Configuración de ordenamiento actual */
  sortConfig?: SortConfig
  /** Callback cuando se ordena por columna */
  onSort?: (column: string) => void
  /** Renderizar acciones por fila */
  renderActions?: (row: T) => ReactNode
  /** Callback al hacer clic en una fila */
  onRowClick?: (row: T) => void
  /** Clase CSS adicional para el contenedor */
  className?: string
  /** Clase CSS para las filas */
  rowClassName?: string | ((row: T) => string)
  /** Mensaje cuando no hay datos */
  emptyMessage?: string
  /** Renderizar contenido vacío personalizado */
  renderEmpty?: () => ReactNode
  /** Breakpoint para cambiar a vista card */
  mobileBreakpoint?: 'xs' | 'sm' | 'md'
}

/**
 * Tabla responsiva que se convierte en cards en dispositivos móviles
 */
export function ResponsiveTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  skeletonRows = 5,
  sortConfig,
  onSort,
  renderActions,
  onRowClick,
  className,
  rowClassName,
  emptyMessage = 'No hay datos para mostrar',
  renderEmpty,
  mobileBreakpoint = 'md',
}: ResponsiveTableProps<T>) {
  const { breakpoint, isMobile, isTablet } = useResponsive()

  // Determinar si mostrar vista móvil
  const showMobileView = useMemo(() => {
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    const currentIndex = breakpoints.indexOf(breakpoint)
    const thresholdIndex = breakpoints.indexOf(mobileBreakpoint)
    return currentIndex < thresholdIndex
  }, [breakpoint, mobileBreakpoint])

  // Filtrar columnas visibles según breakpoint
  const visibleColumns = useMemo(() => {
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    const currentIndex = breakpoints.indexOf(breakpoint)

    return columns.filter(col => {
      if (!col.hideBelow) return true
      const hideIndex = breakpoints.indexOf(col.hideBelow)
      return currentIndex >= hideIndex
    })
  }, [columns, breakpoint])

  // Columnas para vista móvil
  const mobileColumns = useMemo(() => {
    return columns.filter(col => col.showInMobile !== false)
  }, [columns])

  // Columna primaria para título en card
  const primaryColumn = useMemo(() => {
    return columns.find(col => col.isPrimary) || columns[0]
  }, [columns])

  // Renderizar skeleton
  if (loading) {
    if (showMobileView) {
      return (
        <div className={cn('space-y-3', className)}>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <div className="space-y-2">
                  {mobileColumns.slice(0, 4).map((col, j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    return (
      <div className={cn('table-responsive-wrapper rounded-md border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map(col => (
                <TableHead 
                  key={col.id} 
                  style={{ width: col.width }}
                  className={col.headerClassName}
                >
                  {col.header}
                </TableHead>
              ))}
              {renderActions && <TableHead className="w-[100px] text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i}>
                {visibleColumns.map(col => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-full max-w-[150px]" />
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Renderizar estado vacío
  if (data.length === 0) {
    if (renderEmpty) {
      return renderEmpty()
    }
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  // Vista móvil (cards)
  if (showMobileView) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((row, index) => {
          const key = getRowKey(row, index)
          const rowClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName

          return (
            <Card
              key={key}
              className={cn(
                onRowClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
                rowClass
              )}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-4">
                {/* Título principal */}
                <div className="flex justify-between items-start mb-3">
                  <div className="font-medium text-base">
                    {primaryColumn.accessorFn(row)}
                  </div>
                </div>

                {/* Campos secundarios */}
                <div className="space-y-2">
                  {mobileColumns
                    .filter(col => col.id !== primaryColumn.id)
                    .map(col => (
                      <div
                        key={col.id}
                        className="flex justify-between items-start text-sm"
                      >
                        <span className="text-muted-foreground flex-shrink-0 mr-2">
                          {typeof col.header === 'string' ? col.header : col.id}
                        </span>
                        <span className={cn('text-right', col.className)}>
                          {col.accessorFn(row)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Acciones */}
                {renderActions && (
                  <div
                    className="flex justify-end gap-2 pt-3 mt-3 border-t"
                    onClick={e => e.stopPropagation()}
                  >
                    {renderActions(row)}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Vista desktop (tabla)
  return (
    <div className={cn('table-responsive-wrapper rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map(col => (
              <TableHead
                key={col.id}
                style={{ width: col.width }}
                className={cn(
                  col.headerClassName,
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.sortable && onSort && 'cursor-pointer select-none hover:bg-muted/50'
                )}
                onClick={() => col.sortable && onSort?.(col.id)}
              >
                <div className={cn(
                  'flex items-center gap-1',
                  col.align === 'center' && 'justify-center',
                  col.align === 'right' && 'justify-end'
                )}>
                  {col.header}
                  {col.sortable && sortConfig?.column === col.id && (
                    sortConfig.direction === 'asc' 
                      ? <CaretUp size={14} weight="bold" />
                      : <CaretDown size={14} weight="bold" />
                  )}
                </div>
              </TableHead>
            ))}
            {renderActions && (
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => {
            const key = getRowKey(row, index)
            const rowClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName

            return (
              <TableRow
                key={key}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  rowClass
                )}
                onClick={() => onRowClick?.(row)}
              >
                {visibleColumns.map(col => (
                  <TableCell
                    key={col.id}
                    className={cn(
                      col.className,
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.accessorFn(row)}
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {renderActions(row)}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default ResponsiveTable
