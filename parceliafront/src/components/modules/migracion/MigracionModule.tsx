import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { UploadSimple, FileXls, CheckCircle, Warning, XCircle, Database, DownloadSimple, Star, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { migracionService, MigracionLog, ValidationResult } from '@/lib/migracion-api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function MigracionModule({ user }: { user: any }) {
    const [activeTab, setActiveTab] = useState<'importar' | 'historial'>('importar')
    const [modelo, setModelo] = useState<string>('maestro')
    const [file, setFile] = useState<File | null>(null)
    const [validation, setValidation] = useState<ValidationResult | null>(null)
    const [tempPath, setTempPath] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState<MigracionLog[]>([])

    // Verificar superadmin
    if (user?.rol !== 'superadmin') {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/20">
                    <XCircle size={48} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Acceso Restringido</h2>
                <p className="text-muted-foreground">
                    Este módulo está reservado exclusivamente para Super Administradores.
                </p>
            </div>
        )
    }

    useEffect(() => {
        if (activeTab === 'historial') {
            cargarLogs()
        }
    }, [activeTab])

    const cargarLogs = async () => {
        try {
            const data: any = await migracionService.getLogs()
            setLogs(data.data || [])
        } catch (e) {
            toast.error('Error cargando historial de migraciones')
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setValidation(null)
            setTempPath(null)
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setLoading(true)
        try {
            const res: any = await migracionService.uploadFile(file, modelo)
            if (res.success) {
                setValidation(res.validation)
                setTempPath(res.temp_path)
                if (res.validation.valido) {
                    toast.success('Archivo validado sin errores. Listo para importar.')
                } else {
                    toast.warning(`Se encontraron ${res.validation.errores_count} errores de validación.`)
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar y validar el archivo')
        } finally {
            setLoading(false)
        }
    }

    const handleExecute = async () => {
        if (!tempPath) return
        setLoading(true)
        try {
            const res: any = await migracionService.executeImport(tempPath, modelo)
            if (res.success) {
                toast.success('Migración masiva de datos completada exitosamente')
                setFile(null)
                setValidation(null)
                setTempPath(null)
                setActiveTab('historial')
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error durante la ejecución de la migración')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Database size={32} className="text-primary" />
                        Migración de Datos Históricos
                    </h1>
                    <p className="text-muted-foreground">
                        Importación masiva e integral de información relacional desde plantillas Excel
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'importar' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('importar')}
                    >
                        Nueva Importación
                    </Button>
                    <Button
                        variant={activeTab === 'historial' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('historial')}
                    >
                        Historial Auditoría
                    </Button>
                </div>
            </div>

            {activeTab === 'importar' ? (
                <div className="grid gap-6 lg:grid-cols-2 items-start">
                    <Card className="modern-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                                Selección de Plantilla y Archivo
                            </CardTitle>
                            <CardDescription>Selecciona el módulo de datos a importar o la plantilla Libro Maestro</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center justify-between">
                                    <span>Modelo / Pestaña de Datos</span>
                                    <Badge variant="outline" className="text-[10px] uppercase bg-primary/5 text-primary border-primary/20">
                                        Formato XLSX
                                    </Badge>
                                </label>
                                <Select value={modelo} onValueChange={(val) => { setModelo(val); setValidation(null); setFile(null); setTempPath(null); }}>
                                    <SelectTrigger className="modern-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maestro" className="font-semibold text-primary">
                                            <span className="flex items-center gap-2">
                                                <Star size={16} weight="fill" className="text-amber-500" />
                                                ⭐ Libro Maestro Multi-Hoja (Todas las Tablas - Recomendado)
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="clientes">1. Clientes (Directorio General)</SelectItem>
                                        <SelectItem value="creditos">2. Créditos Prendarios</SelectItem>
                                        <SelectItem value="prendas">3. Prendas de Garantía</SelectItem>
                                        <SelectItem value="pagos">4. Historial de Pagos / Abonos</SelectItem>
                                        <SelectItem value="compras">5. Compras e Inventario Directo</SelectItem>
                                        <SelectItem value="ventas">6. Ventas Históricas</SelectItem>
                                        <SelectItem value="ctb_nomenclatura">7. Nomenclatura Contable (Cuentas)</SelectItem>
                                        <SelectItem value="ctb_diario">8. Partidas / Asientos Contables</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {modelo === 'maestro' && (
                                <Alert className="bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30">
                                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <AlertTitle className="text-blue-900 dark:text-blue-300 font-semibold text-xs">Libro Maestro Integrado</AlertTitle>
                                    <AlertDescription className="text-blue-800 dark:text-blue-400 text-xs">
                                        Descarga un solo libro de Excel con pestañas independientes para cada tabla relacional. El sistema procesará secuencialmente: <strong>Clientes → Créditos → Prendas → Pagos → Compras → Ventas → Contabilidad</strong>.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="relative">
                                <Input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center hover:bg-muted/50 transition-all hover:border-primary/50"
                                >
                                    <div className="p-3 rounded-full bg-muted">
                                        <UploadSimple size={32} className="text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-semibold">Click para seleccionar archivo Excel</span>
                                        <p className="text-xs text-muted-foreground">O arrastra el archivo aquí (.xlsx)</p>
                                    </div>
                                    {file && <Badge variant="secondary" className="mt-2 py-1 px-3 bg-primary/10 text-primary border-primary/20">{file.name}</Badge>}
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="h-11"
                                    onClick={() => migracionService.downloadTemplate(modelo)}
                                >
                                    <DownloadSimple size={20} className="mr-2" />
                                    Descargar Plantilla
                                </Button>
                                <Button
                                    className="h-11 shadow-md"
                                    disabled={!file || loading}
                                    onClick={handleUpload}
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            <span>Analizando...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={20} />
                                            <span>Validar Estructura</span>
                                        </div>
                                    )}
                                </Button>
                            </div>

                            <Alert className="bg-amber-50/50 border-amber-200">
                                <FileXls className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Instrucciones de Llenado</AlertTitle>
                                <AlertDescription className="text-amber-700 text-xs">
                                    • Utilice las plantillas descargadas. No modifique los encabezados de la fila 1.<br />
                                    • Ingrese los datos a partir de la <strong>FILA 3</strong>.<br />
                                    • Las fechas deben estar estrictamente en formato <strong>YYYY-MM-DD</strong>.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card className="modern-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                                Análisis y Resultado de Validación
                            </CardTitle>
                            <CardDescription>
                                {validation ? 'Diagnóstico preliminar del archivo antes de aplicar a la base de datos' : 'Sube un archivo y presiona Validar para ver los resultados'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!validation ? (
                                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground/60 text-sm border-2 border-dashed rounded-xl bg-muted/20">
                                    <Database size={48} weight="thin" className="mb-2 opacity-20" />
                                    Esperando análisis de archivo...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-xl bg-muted/40 p-4 text-center border">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Registros</p>
                                            <p className="text-2xl font-black">{validation.total_filas}</p>
                                        </div>
                                        <div className={`rounded-xl p-4 border text-center ${validation.valido ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Errores</p>
                                            <p className={`text-2xl font-black ${validation.valido ? 'text-green-600' : 'text-red-600'}`}>
                                                {validation.errores_count}
                                            </p>
                                        </div>
                                    </div>

                                    {validation.errores_muestra.length > 0 && (
                                        <div className="rounded-xl border overflow-hidden">
                                            <div className="bg-muted/30 px-4 py-2 border-b text-xs font-bold flex justify-between items-center">
                                                <span>Detalle de Errores Detectados</span>
                                                <Badge variant="destructive" className="text-[10px]">
                                                    {validation.errores_muestra.length} Muestras
                                                </Badge>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto modern-scrollbar">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[120px] text-[10px] uppercase font-bold">Ubicación</TableHead>
                                                            <TableHead className="text-[10px] uppercase font-bold">Inconsistencia</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {validation.errores_muestra.map((err, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-mono text-xs font-bold">{err.fila}</TableCell>
                                                                <TableCell className="text-red-600 text-xs">
                                                                    <ul className="list-disc pl-4 space-y-0.5">
                                                                        {err.errores.map((e, j) => <li key={j}>{e}</li>)}
                                                                    </ul>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 text-lg font-bold shadow-lg"
                                        variant={validation.valido ? "default" : "secondary"}
                                        disabled={!validation.valido || loading}
                                        onClick={handleExecute}
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                <span>Ejecutando Transacción...</span>
                                            </div>
                                        ) : validation.valido ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={24} />
                                                Ejecutar Importación Masiva
                                            </div>
                                        ) : 'Corrige los errores en el Excel para continuar'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="modern-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-bold">Historial Auditado de Migraciones</CardTitle>
                            <CardDescription>Registro histórico de importaciones masivas ejecutadas en la base de datos</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {logs.length} Operaciones Registradas
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border overflow-hidden bg-background">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold">Fecha y Hora</TableHead>
                                        <TableHead className="font-bold">Responsable</TableHead>
                                        <TableHead className="font-bold">Modelo / Entidad</TableHead>
                                        <TableHead className="font-bold">Estado</TableHead>
                                        <TableHead className="text-right font-bold">Registros Insertados</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                        {(log.usuario?.name || 'AD').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {log.usuario?.name || log.usuario?.username || 'SuperAdmin'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                                    {log.tabla_destino}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={log.estado === 'completado'
                                                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shadow-none capitalize'
                                                        : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 shadow-none capitalize'}
                                                >
                                                    {log.estado}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold tabular-nums">
                                                        {log.filas_insertadas} / {log.total_filas}
                                                    </span>
                                                    <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${log.total_filas > 0 ? (log.filas_insertadas / log.total_filas) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-16 text-muted-foreground bg-muted/5">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Database size={40} weight="thin" className="opacity-20" />
                                                    <p className="font-medium">No se han registrado migraciones previamente</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
