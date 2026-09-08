import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Database,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Migracion {
  id: number;
  migration: string;
  batch: number;
  ran_at: string | null;
  status: 'pending' | 'executed' | 'failed';
}

const MigracionesModule: React.FC = () => {
  const [migraciones, setMigraciones] = useState<Migracion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ejecutando, setEjecutando] = useState<number | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    cargarMigraciones();
  }, []);

  const cargarMigraciones = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/migraciones');
      setMigraciones((response as any).data || []);
    } catch (error: any) {
      if (error.status === 403) {
        setAccessDenied(true);
        toast.error('Acceso denegado. Solo Super Administradores pueden acceder a este módulo');
      } else {
        toast.error(error.response?.data?.message || 'No se pudieron cargar las migraciones');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEjecutar = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de ejecutar la migración "${nombre}"?\n\nEsta acción modificará la estructura de la base de datos.`)) {
      return;
    }

    setEjecutando(id);
    try {
      await api.post(`/migraciones/${id}/ejecutar`);
      toast.success(`La migración "${nombre}" se ejecutó correctamente`);
      cargarMigraciones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error desconocido');
    } finally {
      setEjecutando(null);
    }
  };

  const handleRollback = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de revertir la migración "${nombre}"?\n\n⚠️ ADVERTENCIA: Esta acción puede eliminar datos.`)) {
      return;
    }

    setEjecutando(id);
    try {
      await api.post(`/migraciones/${id}/rollback`);
      toast.success(`La migración "${nombre}" se revirtió correctamente`);
      cargarMigraciones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error desconocido');
    } finally {
      setEjecutando(null);
    }
  };

  if (accessDenied) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <Shield className="h-5 w-5" />
              Acceso Denegado
            </CardTitle>
            <CardDescription>
              Este módulo está restringido solo para Super Administradores
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Migraciones de Base de Datos
              </CardTitle>
              <CardDescription>
                Gestiona las migraciones de la base de datos
                <span className="ml-2 text-red-500 font-semibold">
                  (⚠️ Solo Super Administradores)
                </span>
              </CardDescription>
            </div>
            <Button onClick={cargarMigraciones} disabled={isLoading}>
              <RotateCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Migración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Fecha de Ejecución</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {migraciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No hay migraciones disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  migraciones.map((migracion) => (
                    <TableRow key={migracion.id}>
                      <TableCell className="font-mono text-sm">
                        {migracion.migration}
                      </TableCell>
                      <TableCell>
                        {migracion.status === 'executed' && (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ejecutada
                          </Badge>
                        )}
                        {migracion.status === 'pending' && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                        {migracion.status === 'failed' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Fallida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {migracion.batch ? `#${migracion.batch}` : '-'}
                      </TableCell>
                      <TableCell>
                        {migracion.ran_at
                          ? new Date(migracion.ran_at).toLocaleString('es-GT')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {migracion.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleEjecutar(migracion.id, migracion.migration)}
                            disabled={ejecutando === migracion.id}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Ejecutar
                          </Button>
                        )}
                        {migracion.status === 'executed' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRollback(migracion.id, migracion.migration)}
                            disabled={ejecutando === migracion.id}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Revertir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Advertencia */}
          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Advertencia Importante</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Las migraciones modifican directamente la estructura de la base de datos. 
                  Asegúrese de tener un respaldo antes de ejecutar o revertir migraciones.
                  Esta acción es <strong>irreversible</strong> sin un backup.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigracionesModule;
