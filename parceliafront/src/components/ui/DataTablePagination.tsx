import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

interface DataTablePaginationProps {
  totalRegistros: number
  paginaActual: number
  registrosPorPagina: number
  onCambiarPagina: (pagina: number) => void
  onCambiarRegistrosPorPagina: (valor: string) => void
}

export function DataTablePagination({
  totalRegistros = 0,
  paginaActual = 1,
  registrosPorPagina = 10,
  onCambiarPagina,
  onCambiarRegistrosPorPagina
}: DataTablePaginationProps) {
  const safeRegistrosPorPagina = registrosPorPagina || 10
  const totalPaginas = Math.ceil(totalRegistros / safeRegistrosPorPagina)
  const indiceInicio = (paginaActual - 1) * safeRegistrosPorPagina
  const indiceFin = indiceInicio + safeRegistrosPorPagina

  if (!totalRegistros || totalRegistros === 0) return null

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Mostrando {indiceInicio + 1} - {Math.min(indiceFin, totalRegistros)} de {totalRegistros} registros
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página:</span>
          <Select value={safeRegistrosPorPagina.toString()} onValueChange={onCambiarRegistrosPorPagina}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onCambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
          >
            <CaretLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Página {paginaActual} de {totalPaginas}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onCambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
          >
            <CaretRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
