import React, { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Cuenta {
  id: number;
  codigo_cuenta: string;
  nombre_cuenta: string;
}

interface TipoPoliza {
  id: number;
  codigo: string;
  nombre: string;
}

interface Parametrizacion {
  id: number;
  tipo_operacion: string;
  tipo_movimiento: 'debe' | 'haber';
  cuenta_contable_id: number;
  tipo_poliza_id: number | null;
  descripcion: string;
  activo: boolean;
  orden: number;
  cuenta_contable?: Cuenta;
  tipo_poliza?: TipoPoliza;
}

const TIPOS_OPERACION = [
  { value: 'credito_desembolso', label: 'Desembolso de Crédito' },
  { value: 'credito_pago_capital', label: 'Pago Capital Crédito' },
  { value: 'credito_pago_interes', label: 'Pago Interés Crédito' },
  { value: 'credito_pago_mora', label: 'Pago Mora Crédito' },
  { value: 'credito_pago_comision', label: 'Pago Comisiones' },
  { value: 'venta_contado', label: 'Venta al Contado' },
  { value: 'venta_enganche', label: 'Venta con Enganche' },
  { value: 'venta_abono', label: 'Abono a Venta' },
  { value: 'compra_directa', label: 'Compra Directa' },
  { value: 'caja_apertura', label: 'Apertura de Caja' },
  { value: 'caja_cierre', label: 'Cierre de Caja' },
  { value: 'boveda_ingreso', label: 'Ingreso a Bóveda' },
  { value: 'boveda_egreso', label: 'Egreso de Bóveda' },
  { value: 'gasto', label: 'Gasto' },
  { value: 'entrada_inventario', label: 'Entrada a Inventario' },
];

const ParametrizacionModule: React.FC = () => {
  const [parametrizaciones, setParametrizaciones] = useState<Parametrizacion[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [tiposPoliza, setTiposPoliza] = useState<TipoPoliza[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('__all__');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Parametrizacion>>({});

  useEffect(() => {
    cargarDatos();
  }, [filtroTipo]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const params = filtroTipo && filtroTipo !== '__all__' ? `?tipo_operacion=${filtroTipo}` : '';
      const [paramRes, cuentasRes, polizasRes] = await Promise.all([
        api.get(`/contabilidad/parametrizacion-cuentas${params}`),
        api.get('/contabilidad/nomenclatura?solo_detalle=true&estado=true'),
        api.get('/contabilidad/tipos-poliza'),
      ]);

      setParametrizaciones((paramRes as any).data || []);
      setCuentas((cuentasRes as any).data || []);
      setTiposPoliza((polizasRes as any).data || []);
    } catch (error) {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuardar = async () => {
    if (!formData.tipo_operacion || !formData.tipo_movimiento || !formData.cuenta_contable_id) {
      toast.error('Debe completar los campos requeridos');
      return;
    }

    setIsLoading(true);
    try {
      if (editando) {
        await api.put(`/contabilidad/parametrizacion-cuentas/${editando}`, formData);
        toast.success('Parametrización actualizada exitosamente');
      } else {
        await api.post('/contabilidad/parametrizacion-cuentas', formData);
        toast.success('Parametrización creada exitosamente');
      }
      setEditando(null);
      setFormData({});
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta parametrización?')) return;

    try {
      await api.delete(`/contabilidad/parametrizacion-cuentas/${id}`);
      toast.success('Parametrización eliminada');
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.post(`/contabilidad/parametrizacion-cuentas/${id}/toggle`);
      toast.success('Estado actualizado');
      cargarDatos();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const filtrarParametrizaciones = () => {
    return parametrizaciones.filter((p) => {
      const matchBusqueda = busqueda
        ? p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.cuenta_contable?.nombre_cuenta.toLowerCase().includes(busqueda.toLowerCase())
        : true;
      return matchBusqueda;
    });
  };

  return (
    <div className="p-6 space-y-6">
     <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Parametrización de Cuentas Contables
              </CardTitle>
              <CardDescription>
              Configura las cuentas contables para cada tipo de operación
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditando(null);
                setFormData({ activo: true, orden: 1 });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Parametrización
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label>Tipo de Operación</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {TIPOS_OPERACION.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por descripción o cuenta..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operación</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Cuenta Contable</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrarParametrizaciones().map((param) => (
                  <TableRow key={param.id}>
                    <TableCell className="font-medium">
                      {TIPOS_OPERACION.find((t) => t.value === param.tipo_operacion)?.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant={param.tipo_movimiento === 'debe' ? 'default' : 'secondary'}>
                        {param.tipo_movimiento.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {param.cuenta_contable?.codigo_cuenta} - {param.cuenta_contable?.nombre_cuenta}
                    </TableCell>
                    <TableCell>{param.descripcion}</TableCell>
                    <TableCell>
                      <Switch
                        checked={param.activo}
                        onCheckedChange={() => handleToggle(param.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditando(param.id);
                          setFormData(param);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminar(param.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edición/Creación */}
      {(editando !== null || Object.keys(formData).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{editando ? 'Editar' : 'Nueva'} Parametrización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Operación *</Label>
                <Select
                  value={formData.tipo_operacion}
                  onValueChange={(value) => setFormData({ ...formData, tipo_operacion: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OPERACION.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Movimiento *</Label>
                <Select
                  value={formData.tipo_movimiento}
                  onValueChange={(value: 'debe' | 'haber') =>
                    setFormData({ ...formData, tipo_movimiento: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debe">DEBE</SelectItem>
                    <SelectItem value="haber">HABER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cuenta Contable *</Label>
                <Select
                  value={formData.cuenta_contable_id?.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cuenta_contable_id: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map((cuenta) => (
                      <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                        {cuenta.codigo_cuenta} - {cuenta.nombre_cuenta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Póliza</Label>
                <Select
                  value={formData.tipo_poliza_id?.toString() || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_poliza_id: value ? parseInt(value) : null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposPoliza.map((poliza) => (
                      <SelectItem key={poliza.id} value={poliza.id.toString()}>
                        {poliza.codigo} - {poliza.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción de la parametrización..."
                />
              </div>

              <div>
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={formData.orden || 1}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.activo ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label>Activo</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditando(null);
                  setFormData({});
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleGuardar} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParametrizacionModule;
