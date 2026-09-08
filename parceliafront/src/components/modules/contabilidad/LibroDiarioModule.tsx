import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { contabilidadService } from '@/services/contabilidad.service';
import type { DiarioFilters } from '@/services/contabilidad.service';

interface MovimientoDiario {
  id: number;
  diario_id: number;
  cuenta_contable_id: number;
  debe: number;
  haber: number;
  glosa?: string;
  cuentaContable?: { id: number; codigo_cuenta: string; nombre_cuenta: string };
}

interface AsientoDiario {
  id: number;
  numero_comprobante: string;
  fecha_contabilizacion: string;
  glosa?: string;
  numero_documento?: string;
  estado?: string;
  total_debe?: number;
  total_haber?: number;
  cuadrado?: boolean;
  tipo_poliza?: { id: number; codigo: string; nombre: string };
  sucursal?: { id: number; nombre: string };
  usuario?: { id: number; name: string };
  movimientos?: MovimientoDiario[];
}

function formatFecha(f: string | null | undefined): string {
  if (!f) return '—';
  const d = new Date(f);
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoneda(n: number | undefined | null): string {
  if (n == null || n === undefined) return '0.00';
  return Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LibroDiarioModule() {
  const [asientos, setAsientos] = useState<AsientoDiario[]>([]);
  const [pagination, setPagination] = useState<{ total: number; per_page: number; current_page: number; last_page: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().slice(0, 10));
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [openAsientoId, setOpenAsientoId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const filters: DiarioFilters = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        page,
        per_page: 15,
      };
      if (busqueda.trim()) (filters as Record<string, string>).busqueda = busqueda.trim();
      const res = await contabilidadService.getDiario(filters) as any;
      const data = res?.data ?? [];
      const pag = res?.pagination ?? null;
      setAsientos(Array.isArray(data) ? data : []);
      setPagination(pag);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar el libro diario');
      setAsientos([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, page, busqueda]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleDescargarPdf = async () => {
    try {
      await contabilidadService.descargarLibroDiarioPDF({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      toast.success('Descarga iniciada');
    } catch (e) {
      toast.error('Error al generar PDF');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Libro Diario</CardTitle>
            <CardDescription>
              Asientos contables generados por desembolsos, pagos y otras operaciones
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleDescargarPdf}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="grid gap-2">
            <Label>Desde</Label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Buscar</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Comprobante, documento, glosa..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(1), cargar())}
                className="w-48"
              />
              <Button variant="secondary" size="icon" onClick={() => { setPage(1); cargar(); }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={cargar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Cargando asientos...
          </div>
        ) : asientos.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No hay asientos en el rango seleccionado. Los movimientos se generan al realizar desembolsos o pagos de créditos.
          </div>
        ) : (
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Glosa / Documento</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asientos.map((a) => (
                  <React.Fragment key={a.id}>
                    <TableRow className="align-top">
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setOpenAsientoId(openAsientoId === a.id ? null : a.id)}
                        >
                          {openAsientoId === a.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.numero_comprobante}</TableCell>
                      <TableCell>{formatFecha(a.fecha_contabilizacion)}</TableCell>
                      <TableCell>
                        {a.tipo_poliza ? (
                          <span className="text-muted-foreground">{a.tipo_poliza.codigo}</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={a.glosa || a.numero_documento || ''}>
                        {a.glosa || a.numero_documento || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatMoneda(a.total_debe)}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoneda(a.total_haber)}</TableCell>
                      <TableCell>
                        {a.cuadrado ? (
                          <Badge variant="secondary">Cuadrado</Badge>
                        ) : (
                          <Badge variant="outline">Descuadrado</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {openAsientoId === a.id && Array.isArray(a.movimientos) && a.movimientos.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/40 p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cuenta</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="text-right">Debe</TableHead>
                                <TableHead className="text-right">Haber</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {a.movimientos.map((m) => (
                                <TableRow key={m.id}>
                                  <TableCell className="font-mono text-sm">
                                    {m.cuentaContable?.codigo_cuenta ?? m.cuenta_contable_id}
                                  </TableCell>
                                  <TableCell>{m.cuentaContable?.nombre_cuenta ?? '—'}</TableCell>
                                  <TableCell className="text-right font-mono">{formatMoneda(m.debe)}</TableCell>
                                  <TableCell className="text-right font-mono">{formatMoneda(m.haber)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Página {pagination.current_page} de {pagination.last_page} ({pagination.total} asientos)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.current_page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
