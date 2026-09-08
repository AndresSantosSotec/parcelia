import { TableRow, TableCell } from '@/components/ui/table'

interface TableSkeletonProps {
  rows?: number
  columns: number
  columnsWidth?: string[]
}

/**
 * Skeleton loader para tablas.
 * Muestra filas con animación de carga tipo placeholder.
 * 
 * @param rows - Número de filas a mostrar (default: 5)
 * @param columns - Número de columnas por fila
 * @param columnsWidth - Array opcional con clases de ancho para cada columna (ej: ['w-3/4', 'w-16', 'w-20'])
 */
export function TableSkeleton({ rows = 5, columns, columnsWidth }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div 
                className={`h-4 bg-muted animate-pulse rounded ${
                  columnsWidth && columnsWidth[colIndex] 
                    ? columnsWidth[colIndex] 
                    : 'w-full'
                }`}
              ></div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
