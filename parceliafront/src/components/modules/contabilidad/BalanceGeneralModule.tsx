import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FilePdf, MagnifyingGlass, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/helpers';

interface CuentaBalance {
    id: number;
    codigo_cuenta: string;
    nombre_cuenta: string;
    tipo: string;
    total_debe: number;
    total_haber: number;
    saldo: number;
}

interface Totales {
    total_activos: number;
    total_pasivos: number;
    total_patrimonio: number;
    total_pasivo_y_patrimonio: number;
    diferencia: number;
    cuadrado: boolean;
}

interface BalanceGeneralData {
    activos: CuentaBalance[];
    pasivos: CuentaBalance[];
    patrimonio: CuentaBalance[];
    totales: Totales;
    fecha_corte: string;
}

const hoy = new Date().toISOString().split('T')[0];

function CuentasSection({
    titulo,
    cuentas,
    total,
    colorClass,
}: {
    titulo: string;
    cuentas: CuentaBalance[];
    total: number;
    colorClass: string;
}) {
    return (
        <div className="border rounded-lg overflow-hidden mb-4">
            <div className={`${colorClass} text-white px-3 py-2 flex items-center justify-between`}>
                <span className="font-semibold text-sm uppercase tracking-wide">{titulo}</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 font-mono">
                    {formatCurrency(total)}
                </Badge>
            </div>
            {cuentas.length === 0 ? (
                <p className="text-center text-muted-foreground italic py-3 text-sm">
                    Sin cuentas con movimientos
                </p>
            ) : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-muted text-muted-foreground text-xs">
                            <th className="text-left px-3 py-1.5 font-medium w-28">Código</th>
                            <th className="text-left px-3 py-1.5 font-medium">Cuenta</th>
                            <th className="text-right px-3 py-1.5 font-medium w-28">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cuentas.map((c, i) => (
                            <tr key={c.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                <td className="px-3 py-1.5 font-mono text-xs">{c.codigo_cuenta}</td>
                                <td className="px-3 py-1.5">{c.nombre_cuenta}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(c.saldo)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div className="px-3 py-2 bg-muted/50 flex justify-between text-xs font-bold border-t">
                <span>TOTAL {titulo}</span>
                <span className="font-mono">{formatCurrency(total)}</span>
            </div>
        </div>
    );
}

export function BalanceGeneralModule() {
    const [fechaCorte, setFechaCorte] = useState(hoy);
    const [resultado, setResultado] = useState<BalanceGeneralData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const aplicarFiltros = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ fecha_corte: fechaCorte });
            const resp = await api.get(`/contabilidad/balance-general?${params}`) as any;
            setResultado(resp.data);
        } catch (e: any) {
            setError(e?.message ?? 'Error al cargar datos');
        } finally {
            setIsLoading(false);
        }
    }, [fechaCorte]);

    const descargarPdf = () => {
        const params = new URLSearchParams({ fecha_corte: fechaCorte });
        const apiUrl = import.meta.env.VITE_API_URL ?? '';
        window.open(`${apiUrl}/contabilidad/balance-general/pdf?${params.toString()}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/40 rounded-lg border">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="fecha_corte" className="text-xs">Fecha de corte</Label>
                    <Input
                        id="fecha_corte"
                        type="date"
                        value={fechaCorte}
                        onChange={e => setFechaCorte(e.target.value)}
                        className="h-8 w-40 text-sm"
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
                    Error al cargar el Balance General. Verifique los filtros.
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="text-center text-muted-foreground py-12 text-sm animate-pulse">
                    Calculando Balance General...
                </div>
            )}

            {resultado && !isLoading && (
                <>
                    {/* Indicador de balance */}
                    <div className={`flex items-center justify-between px-5 py-4 rounded-xl border-2 ${resultado.totales.cuadrado
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-700'}`}>
                        <div className="flex items-center gap-3">
                            {resultado.totales.cuadrado
                                ? <CheckCircle size={28} weight="fill" className="text-green-600" />
                                : <XCircle size={28} weight="fill" className="text-red-600" />
                            }
                            <div>
                                <p className="font-bold text-base">
                                    {resultado.totales.cuadrado ? 'Balance Cuadrado' : 'Balance Descuadrado'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Al {new Date(resultado.fecha_corte + 'T00:00:00').toLocaleDateString('es-GT')}
                                    {!resultado.totales.cuadrado && ` — Diferencia: ${formatCurrency(Math.abs(resultado.totales.diferencia))}`}
                                </p>
                            </div>
                        </div>
                        <div className="hidden md:flex gap-6 text-sm">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Total Activos</p>
                                <p className="font-bold font-mono">{formatCurrency(resultado.totales.total_activos)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Pasivo + Patrimonio</p>
                                <p className="font-bold font-mono">{formatCurrency(resultado.totales.total_pasivo_y_patrimonio)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dos columnas: Activos | Pasivos + Patrimonio */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* ACTIVOS */}
                        <div>
                            <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 px-1">
                                Activos
                            </h3>
                            <CuentasSection
                                titulo="Activos"
                                cuentas={resultado.activos}
                                total={resultado.totales.total_activos}
                                colorClass="bg-blue-700 dark:bg-blue-900"
                            />
                            {/* Grand total activos */}
                            <div className="flex justify-between items-center px-4 py-3 bg-blue-700 dark:bg-blue-900 text-white rounded-lg font-bold">
                                <span className="text-sm uppercase tracking-wide">TOTAL ACTIVOS</span>
                                <span className="font-mono text-lg">{formatCurrency(resultado.totales.total_activos)}</span>
                            </div>
                        </div>

                        {/* PASIVOS + PATRIMONIO */}
                        <div>
                            <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 px-1">
                                Pasivos y Patrimonio
                            </h3>
                            <CuentasSection
                                titulo="Pasivos"
                                cuentas={resultado.pasivos}
                                total={resultado.totales.total_pasivos}
                                colorClass="bg-orange-600 dark:bg-orange-800"
                            />
                            <CuentasSection
                                titulo="Patrimonio"
                                cuentas={resultado.patrimonio}
                                total={resultado.totales.total_patrimonio}
                                colorClass="bg-purple-700 dark:bg-purple-900"
                            />
                            {/* Grand total pasivo + patrimonio */}
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-700 dark:bg-slate-800 text-white rounded-lg font-bold">
                                <span className="text-sm uppercase tracking-wide">TOTAL PASIVO + PATRIMONIO</span>
                                <span className="font-mono text-lg">{formatCurrency(resultado.totales.total_pasivo_y_patrimonio)}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default BalanceGeneralModule;
