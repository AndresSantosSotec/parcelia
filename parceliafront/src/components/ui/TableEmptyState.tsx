import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus } from '@phosphor-icons/react'
import { ReactNode } from 'react'

interface TableEmptyStateProps {
  colSpan: number
  icon?: ReactNode
  title: string
  description: string
  showCreateButton?: boolean
  createButtonText?: string
  onCreateClick?: () => void
  className?: string
}

/**
 * Estado vacío para tablas.
 * Muestra un mensaje informativo cuando no hay datos.
 * 
 * @param colSpan - Número de columnas a abarcar
 * @param icon - Icono a mostrar (componente de Phosphor Icons)
 * @param title - Título del mensaje
 * @param description - Descripción del mensaje
 * @param showCreateButton - Mostrar botón de creación (default: false)
 * @param createButtonText - Texto del botón de creación
 * @param onCreateClick - Callback al hacer clic en crear
 */
export function TableEmptyState({
  colSpan,
  icon,
  title,
  description,
  showCreateButton = false,
  createButtonText = 'Crear Registro',
  onCreateClick,
  className = ''
}: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={`text-center py-12 ${className}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {icon && <div className="opacity-50">{icon}</div>}
          <p className="text-lg font-medium">{title}</p>
          <p className="text-sm">{description}</p>
          {showCreateButton && onCreateClick && (
            <Button onClick={onCreateClick} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              {createButtonText}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
