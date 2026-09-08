import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bug, Clock, Globe, User, Terminal, XCircle, ArrowsClockwise } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export function SystemErrors() {
    const [errors, setErrors] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedError, setSelectedError] = useState<any>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const cargarErrores = async () => {
        setLoading(true)
        try {
            const res: any = await api.get(`/system-errors?page=${page}`)
            setErrors(res.data)
            setTotalPages(res.pagination.last_page)
        } catch (e) {
            toast.error('Error al cargar logs de errores')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarErrores()
    }, [page])

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                        <Bug size={24} />
                        Errores Críticos del Sistema
                    </CardTitle>
                    <CardDescription>
                        Fallas y excepciones no capturadas registradas en el servidor
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => cargarErrores()} disabled={loading}>
                    <ArrowsClockwise className={loading ? 'animate-spin' : ''} />
                </Button>
            </CardHeader>
            <CardContent className="overflow-hidden">
                <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[600px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Fecha</TableHead>
                                <TableHead>Excepción</TableHead>
                                <TableHead>Mensaje</TableHead>
                                <TableHead>Ruta</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {errors.map((error) => (
                                <TableRow key={error.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedError(error)}>
                                    <TableCell className="text-xs font-mono">
                                        {format(new Date(error.created_at), 'dd/MM/yy HH:mm:ss')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="destructive" className="text-[10px] font-mono">
                                            {error.exception.split('\\').pop()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-xs font-medium">
                                        {error.message}
                                    </TableCell>
                                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                                        <span className="font-bold">{error.method}</span> {error.url.split('/').pop() || '/'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Ver</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {errors.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No se han registrado errores críticos recientemente ✨
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginación simple */}
                <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                    </div>
                </div>
            </CardContent>

            {/* Modal de Detalle - responsive y sin desbordamiento */}
            <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
                    <DialogHeader className="flex-shrink-0 space-y-2">
                        <DialogTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg truncate min-w-0">
                            <Bug size={20} className="flex-shrink-0" />
                            <span className="truncate">Detalle de Excepción</span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedError && (
                        <ScrollArea className="flex-1 min-h-0 pr-2 -mr-2">
                            <div className="space-y-6 min-w-0 pb-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Excepción</p>
                                        <p className="font-mono text-xs break-all">{selectedError.exception}</p>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Fecha / Hora</p>
                                        <p className="text-xs break-words">{format(new Date(selectedError.created_at), 'PPPPpppp', { locale: es })}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md min-w-0 overflow-hidden">
                                    <p className="text-[10px] font-bold text-destructive uppercase mb-1">Mensaje de Error</p>
                                    <p className="text-sm font-medium break-words">{selectedError.message}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Archivo</p>
                                        <p className="text-xs font-mono break-all">{selectedError.file}:{selectedError.line}</p>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">URL / IP</p>
                                        <p className="text-xs font-mono break-all">[{selectedError.method}] {selectedError.url} - {selectedError.ip_address}</p>
                                    </div>
                                </div>

                                {selectedError.trace && (
                                    <div className="space-y-2 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                            <Terminal size={14} className="flex-shrink-0" />
                                            Stack Trace (Simplificado)
                                        </p>
                                        <div className="bg-slate-950 text-slate-300 p-4 rounded-md font-mono text-[10px] overflow-x-auto overflow-y-auto max-h-[40vh] whitespace-pre break-all">
                                            {selectedError.trace.map((t: any, i: number) => (
                                                <div key={i} className="mb-1 break-all">
                                                    <span className="text-slate-500">#{i}</span> {t.file?.split('\\').pop()}:{t.line} - <span className="text-blue-400">{t.function}</span>()
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedError.input_data && Object.keys(selectedError.input_data).length > 0 && (
                                    <div className="space-y-2 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Datos de Entrada</p>
                                        <pre className="bg-muted p-3 rounded text-[10px] overflow-auto max-h-[30vh] break-all whitespace-pre-wrap">
                                            {JSON.stringify(selectedError.input_data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
