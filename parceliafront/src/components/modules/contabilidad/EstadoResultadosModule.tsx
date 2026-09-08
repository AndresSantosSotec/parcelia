import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FilePdf, MagnifyingGlass, TrendUp, TrendDown, Warning } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/helpers';

interface CuentaResultado {
    id: number;
    codigo_cuenta: string;
    nombre_cuenta: string;
    tipo: string;
    total_debe: number;
    total_haber: number;
    saldo: number;
}

interface Totales {
    total_ingresos: number;
    total_costos: number;
    total_gastos: number;
    utilidad_bruta: number;
    utilidad_neta: number;
}

interface EstadoResultadosData {
    ingresos: CuentaResultado[];
    costos: CuentaResultado[];
    gastos: CuentaResultado[];
    totales: Totales;
    periodo: { fecha_inicio: string; fecha_fin: string };
}

const hoy = new Date().toISOString().split('T')[0];
const inicioAnio = new Date().getFullYear() + '-01-01';

function CuentasTable({ cuentas }: { cuentas: CuentaResultado[] }) {
    if (cuentas.length === 0) {
        return (
            <p className="text-center text-muted-foreground italic py-4 text-sm">
                Sin movimientos en el período
            </p>
        );
    }
    return (
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="bg-muted text-muted-foreground text-xs">
                    <th className="text-left px-3 py-2 font-medium w-28">Código</th>
                    <th className="text-left px-3 py-2 font-medium">Nombre de Cuenta</th>
                    <th className="text-right px-3 py-2 font-medium w-32">Saldo</th>
                </tr>
            </thead>
            <tbody>
                {cuentas.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-3 py-2 font-mono text-xs">{c.codigo_cuenta}</td>
                        <td className="px-3 py-2">{c.nombre_cuenta}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(c.saldo)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function EstadoResultadosModule() {
    const [fechaInicio, setFechaInicio] = useState(inicioAnio);
    const [fechaFin, setFechaFin] = useState(hoy);
    const [resultado, setResultado] = useState<EstadoResultadosData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const aplicarFiltros = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
            const resp = await api.get(`/contabilidad/estado-resultados?${params}`) as any;
            setResultado(resp.data);
        } catch (e: any) {
            setError(e?.message ?? 'Error al cargar datos');
        } finally {
            setIsLoading(false);
        }
    }, [fechaInicio, fechaFin]);

    const descargarPdf = () => {
        const params = new URLSearchParams({
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
        });
        const apiUrl = import.meta.env.VITE_API_URL ?? '';
        window.open(`${apiUrl}/contabilidad/estado-resultados/pdf?${params.toString()}`, '_blank');
    };

    const utilidadNeta = resultado?.totales.utilidad_neta ?? 0;
    const esPositiva = utilidadNeta >= 0;

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/40 rounded-lg border">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="fecha_inicio" className="text-xs">Fecha inicio</Label>
                    <Input
                        id="fecha_inicio"
                        type="date"
                        value={fechaInicio}
                        onChange={e => setFechaInicio(e.target.value)}
                        className="h-8 w-38 text-sm"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label htmlFor="fecha_fin" className="text-xs">Fecha fin</Label>
                    <Input
                        id="fecha_fin"
                        type="date"
                        value={fechaFin}
                        onChange={e => setFechaFin(e.target.value)}
                        className="h-8 w-38 text-sm"
                    />
                </div>
                <Button size="sm" onClick={aplicarFiltros} disabled={isLoading}>
                    <MagnifyingGlass size={14} className="mr-1" />
                    Generar
                </Button>
                <Button size="sm" variant="outline" onClick={descargarPdf} disabled={!resultado}>
                    <FilePdf size={14} className="mr-1" />
                    Exportar PDF
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <Warning size={16} />
                    Error al cargar el Estado de Resultados. Verifique los filtros.
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="text-center text-muted-foreground py-12 text-sm animate-pulse">
                    Calculando Estado de Resultados...
                </div>
            )}

            {resultado && !isLoading && (
                <>
                    {/* Resumen top */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-xs text-green-700 dark:text-green-400 font-medium uppercase tracking-wide">Total Ingresos</p>
                            <p className="text-xl font-bold text-green-800 dark:text-green-300 mt-1">
                                {formatCurrency(resultado.totales.total_ingresos)}
                            </p>
                        </div>
                        {resultado.totales.total_costos > 0 && (
                            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium uppercase tracking-wide">Total Costos</p>
                                <p className="text-xl font-bold text-orange-800 dark:text-orange-300 mt-1">
                                    {formatCurrency(resultado.totales.total_costos)}
                                </p>
                            </div>
                        )}
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <p className="text-xs text-red-700 dark:text-red-400 font-medium uppercase tracking-wide">Total Gastos</p>
                            <p className="text-xl font-bold text-red-800 dark:text-red-300 mt-1">
                                {formatCurrency(resultado.totales.total_gastos)}
                            </p>
                        </div>
                        <div className={`border rounded-lg p-4 ${esPositiva
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                            <p className={`text-xs font-medium uppercase tracking-wide ${esPositiva
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-red-700 dark:text-red-400'}`}>
                                Utilidad Neta
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                                {esPositiva
                                    ? <TrendUp size={18} className="text-blue-600 dark:text-blue-400" />
                                    : <TrendDown size={18} className="text-red-600 dark:text-red-400" />
                                }
                                <p className={`text-xl font-bold ${esPositiva
                                    ? 'text-blue-800 dark:text-blue-300'
                                    : 'text-red-800 dark:text-red-300'}`}>
                                    {esPositiva ? '' : '('}{formatCurrency(Math.abs(utilidadNeta))}{esPositiva ? '' : ')'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* INGRESOS */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-700 dark:bg-green-900 text-white px-4 py-2 flex items-center justify-between">
                            <span className="font-semibold text-sm uppercase tracking-wide">Ingresos</span>
                            <Badge variant="secondary" className="bg-green-600 text-white border-0">
                                {formatCurrency(resultado.totales.total_ingresos)}
                            </Badge>
                        </div>
                        <CuentasTable cuentas={resultado.ingresos} />
                        <div className="bg-green-50 dark:bg-green-950/30 px-3 py-2 flex justify-between text-sm font-semibold border-t">
                            <span>Total Ingresos</span>
                            <span className="font-mono text-green-700 dark:text-green-400">
                                {formatCurrency(resultado.totales.total_ingresos)}
                            </span>
                        </div>
                    </div>

                    {/* COSTOS */}
                    {resultado.costos.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-orange-600 dark:bg-orange-900 text-white px-4 py-2 flex items-center justify-between">
                                <span className="font-semibold text-sm uppercase tracking-wide">Costos de Ventas / Servicios</span>
                                <Badge variant="secondary" className="bg-orange-500 text-white border-0">
                                    {formatCurrency(resultado.totales.total_costos)}
                                </Badge>
                            </div>
                            <CuentasTable cuentas={resultado.costos} />
                            <div className="bg-orange-50 dark:bg-orange-950/30 px-3 py-2 flex justify-between text-sm font-semibold border-t">
                                <span>Total Costos</span>
                                <span className="font-mono text-orange-700 dark:text-orange-400">
                                    {formatCurrency(resultado.totales.total_costos)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* UTILIDAD BRUTA (solo si hay costos) */}
                    {resultado.totales.total_costos > 0 && (
                        <div className="flex justify-between items-center px-4 py-3 bg-muted border rounded-lg font-semibold">
                            <span>Utilidad Bruta</span>
                            <span className={`font-mono text-lg ${resultado.totales.utilidad_bruta >= 0
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-red-700 dark:text-red-400'}`}>
                                {formatCurrency(resultado.totales.utilidad_bruta)}
                            </span>
                        </div>
                    )}

                    {/* GASTOS */}
                    {resultado.gastos.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-red-700 dark:bg-red-900 text-white px-4 py-2 flex items-center justify-between">
                                <span className="font-semibold text-sm uppercase tracking-wide">Gastos Operativos</span>
                                <Badge variant="secondary" className="bg-red-600 text-white border-0">
                                    {formatCurrency(resultado.totales.total_gastos)}
                                </Badge>
                            </div>
                            <CuentasTable cuentas={resultado.gastos} />
                            <div className="bg-red-50 dark:bg-red-950/30 px-3 py-2 flex justify-between text-sm font-semibold border-t">
                                <span>Total Gastos</span>
                                <span className="font-mono text-red-700 dark:text-red-400">
                                    {formatCurrency(resultado.totales.total_gastos)}
                                </span>
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* UTILIDAD NETA — bloque final */}
                    <div className={`flex justify-between items-center px-6 py-4 rounded-xl border-2 ${esPositiva
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-700'}`}>
                        <div>
                            <p className="text-xs uppercase tracking-widest font-medium text-muted-foreground">Resultado del Período</p>
                            <p className="text-base font-bold mt-0.5">UTILIDAD NETA</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {esPositiva
                                ? <TrendUp size={22} className="text-blue-600" />
                                : <TrendDown size={22} className="text-red-600" />
                            }
                            <span className={`text-2xl font-bold font-mono ${esPositiva
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-red-700 dark:text-red-300'}`}>
                                {esPositiva ? '' : '('}{formatCurrency(Math.abs(utilidadNeta))}{esPositiva ? '' : ')'}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default EstadoResultadosModule;
