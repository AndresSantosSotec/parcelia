import { DownloadSimple, Eye, Pencil, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function AccionesRegistro({
  onVer,
  onEditar,
  onDescargar,
  onEliminar,
}: {
  onVer?: () => void
  onEditar?: () => void
  onDescargar?: () => void
  onEliminar?: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onVer && (
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-sky-600 hover:bg-sky-500/15 hover:text-sky-700 dark:text-sky-400" title="Ver" onClick={onVer}>
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {onEditar && (
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-400" title="Editar" onClick={onEditar}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDescargar && (
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400" title="Descargar" onClick={onDescargar}>
          <DownloadSimple className="h-4 w-4" />
        </Button>
      )}
      {onEliminar && (
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-500/15 hover:text-red-700 dark:text-red-400" title="Eliminar" onClick={onEliminar}>
          <Trash className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function PaginacionLista({
  total,
  pagina,
  porPagina,
  onPagina,
  onPorPagina,
}: {
  total: number
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (cantidad: number) => void
}) {
  if (total === 0) return null
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const inicio = (pagina - 1) * porPagina
  return (
    <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {inicio + 1}–{Math.min(inicio + porPagina, total)} de {total}
      </p>
      <div className="flex items-center gap-2">
        <select
          className="h-8 rounded-md border border-input bg-popover px-2 text-sm text-popover-foreground"
          value={porPagina}
          onChange={(e) => onPorPagina(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <Button type="button" size="sm" variant="outline" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>Anterior</Button>
        <span className="text-sm">{Math.min(pagina, paginas)} / {paginas}</span>
        <Button type="button" size="sm" variant="outline" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}
