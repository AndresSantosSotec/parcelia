import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, ArrowsClockwise, DownloadSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { auditoriaService } from '@/lib/auditoria-api'

export function LaravelLogsViewer() {
    const [logs, setLogs] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [lines, setLines] = useState(500)

    const cargarLogs = async () => {
        setLoading(true)
        try {
            const response = await auditoriaService.getLaravelLogs(lines)
            if (response.success && response.data) {
                setLogs(response.data)
            } else {
                setLogs('No se pudo cargar el archivo de logs.')
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al obtener los logs del servidor')
            setLogs('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarLogs()
    }, [lines])

    const handleDownload = () => {
        if (!logs) return
        const blob = new Blob([logs], { type: 'text/plain;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `laravel_logs_${new Date().getTime()}.log`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <Card className="flex flex-col h-[calc(100vh-220px)] border-primary/20 bg-black/95 text-green-400">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-primary/20">
                <div>
                    <CardTitle className="flex items-center gap-2 text-white text-lg">
                        <Terminal size={24} weight="duotone" className="text-primary" />
                        Logs de Laravel (laravel.log)
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Vista en tiempo real de los últimos registros del servidor backend.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <select
                        className="bg-black text-green-400 border border-green-800 rounded px-2 py-1 text-sm outline-none"
                        value={lines}
                        onChange={(e) => setLines(Number(e.target.value))}
                    >
                        <option value={100}>Últimas 100 líneas</option>
                        <option value={500}>Últimas 500 líneas</option>
                        <option value={1000}>Últimas 1000 líneas</option>
                        <option value={5000}>Últimas 5000 líneas</option>
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        disabled={!logs || loading}
                        className="bg-black hover:bg-green-900 border-green-800 text-green-400 hover:text-green-300"
                    >
                        <DownloadSimple size={16} className="mr-1" />
                        Descargar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={cargarLogs}
                        disabled={loading}
                        className="bg-black hover:bg-green-900 border-green-800 text-green-400 hover:text-green-300"
                    >
                        <ArrowsClockwise size={16} className={loading ? 'animate-spin mr-1' : 'mr-1'} />
                        Recargar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full w-full p-4">
                    {loading && !logs ? (
                        <div className="flex items-center justify-center h-full text-green-600">
                            <ArrowsClockwise size={32} className="animate-spin" />
                        </div>
                    ) : (
                        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                            {logs || 'El archivo de logs está vacío o no se encontró.'}
                        </pre>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
