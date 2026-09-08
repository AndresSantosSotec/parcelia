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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Warning, CheckCircle, Info, ShoppingCart } from '@phosphor-icons/react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ParametrizacionMoraData {
  id?: number;
  sucursal_id: string | null;
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
  max_dias_mora: number;
  aplicar_tope_mora: boolean;
  dias_tope_mora: number;
  aplicar_mora_completa: boolean;
  dias_para_mora_completa: number;
  apartado_habilitado: boolean;
  dias_gracia: number;
  frecuencia_defecto: 'semanal' | 'quincenal' | 'mensual';
  tasa_interes_defecto: number;
  activo: boolean;
  notas: string;
  sucursal?: { id: string; nombre: string } | null;
}

interface Sucursal {
  id: string;
  nombre: string;
}

const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lunes', short: 'Lun' },
  { key: 'martes', label: 'Martes', short: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'jueves', label: 'Jueves', short: 'Jue' },
  { key: 'viernes', label: 'Viernes', short: 'Vie' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb' },
  { key: 'domingo', label: 'Domingo', short: 'Dom' },
] as const;

const defaultConfig: ParametrizacionMoraData = {
  sucursal_id: null,
  lunes: true,
  martes: true,
  miercoles: true,
  jueves: true,
  viernes: true,
  sabado: true,
  domingo: false,
  max_dias_mora: 0,
  aplicar_tope_mora: false,
  dias_tope_mora: 0,
  aplicar_mora_completa: false,
  dias_para_mora_completa: 27,
  apartado_habilitado: true,
  dias_gracia: 0,
  frecuencia_defecto: 'mensual',
  tasa_interes_defecto: 5.00,
  activo: true,
  notas: '',
};

const ParametrizacionMoraModule: React.FC = () => {
  const [config, setConfig] = useState<ParametrizacionMoraData>(defaultConfig);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>('__global__');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configuraciones, setConfiguraciones] = useState<ParametrizacionMoraData[]>([]);

  useEffect(() => {
    cargarSucursales();
    cargarConfiguraciones();
  }, []);

  useEffect(() => {
    cargarConfigActiva();
  }, [sucursalSeleccionada]);

  const cargarSucursales = async () => {
    try {
      const response = await api.get('/sucursales') as any;
      const data = response.data || response;
      setSucursales(Array.isArray(data) ? data : (data.data || []));
    } catch {
      // No bloquear si falla
    }
  };

  const cargarConfiguraciones = async () => {
    try {
      const response = await api.get('/contabilidad/parametrizacion-mora') as any;
      const data = response.data?.data || response.data || [];
      setConfiguraciones(Array.isArray(data) ? data : []);
    } catch {
      // Primera vez, no hay configs
    }
  };

  const cargarConfigActiva = async () => {
    setIsLoading(true);
    try {
      const params = sucursalSeleccionada !== '__global__' ? `?sucursal_id=${sucursalSeleccionada}` : '';
      const response = await api.get(`/contabilidad/parametrizacion-mora/activa${params}`) as any;
      const data = response.data?.data || response.data || null;

      if (data) {
        setConfig({
          ...data,
          sucursal_id: data.sucursal_id ? String(data.sucursal_id) : null,
          notas: data.notas || '',
        });
      } else {
        setConfig({
          ...defaultConfig,
          sucursal_id: sucursalSeleccionada !== '__global__' ? sucursalSeleccionada : null,
        });
      }
    } catch {
      setConfig({
        ...defaultConfig,
        sucursal_id: sucursalSeleccionada !== '__global__' ? sucursalSeleccionada : null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDia = (dia: string) => {
    setConfig(prev => ({ ...prev, [dia]: !prev[dia as keyof ParametrizacionMoraData] }));
  };

  const diasActivos = DIAS_SEMANA.filter(d => config[d.key as keyof ParametrizacionMoraData]).length;

  const guardar = async () => {
    if (diasActivos === 0) {
      toast.error('Debe seleccionar al menos un día laboral');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        sucursal_id: sucursalSeleccionada !== '__global__' ? sucursalSeleccionada : null,
        lunes: config.lunes,
        martes: config.martes,
        miercoles: config.miercoles,
        jueves: config.jueves,
        viernes: config.viernes,
        sabado: config.sabado,
        domingo: config.domingo,
        max_dias_mora: config.max_dias_mora,
        aplicar_tope_mora: config.aplicar_tope_mora,
        dias_tope_mora: config.dias_tope_mora,
        aplicar_mora_completa: config.aplicar_mora_completa,
        dias_para_mora_completa: config.dias_para_mora_completa,
        apartado_habilitado: config.apartado_habilitado,
        dias_gracia: config.dias_gracia,
        frecuencia_defecto: config.frecuencia_defecto,
        tasa_interes_defecto: config.tasa_interes_defecto,
        notas: config.notas || null,
      };

      if (config.id) {
        await api.put(`/contabilidad/parametrizacion-mora/${config.id}`, payload);
      } else {
        const response = await api.post('/contabilidad/parametrizacion-mora', payload) as any;
        const newData = response.data?.data || response.data;
        if (newData?.id) {
          setConfig(prev => ({ ...prev, id: newData.id }));
        }
      }

      toast.success('Configuración de mora guardada correctamente');
      cargarConfiguraciones();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock size={24} className="text-red-500" />
            Parametrización de Mora
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure los días laborales y reglas de cálculo de mora para la casa de empeño
          </p>
        </div>
        {sucursales.length > 0 && (
          <Select value={sucursalSeleccionada} onValueChange={setSucursalSeleccionada}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Seleccionar sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__global__">Global (todas las sucursales)</SelectItem>
              {sucursales.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Cargando configuración...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Días Laborales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={18} />
                Días Laborales
              </CardTitle>
              <CardDescription>
                Seleccione los días en que la casa de empeño opera.
                Los días no laborales no se contarán para el cálculo de mora.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {DIAS_SEMANA.map(dia => (
                  <div
                    key={dia.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      config[dia.key as keyof ParametrizacionMoraData]
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{dia.label}</span>
                      <Badge variant={config[dia.key as keyof ParametrizacionMoraData] ? 'default' : 'destructive'} className="text-xs">
                        {config[dia.key as keyof ParametrizacionMoraData] ? 'Laboral' : 'No laboral'}
                      </Badge>
                    </div>
                    <Switch
                      checked={config[dia.key as keyof ParametrizacionMoraData] as boolean}
                      onCheckedChange={() => toggleDia(dia.key)}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center gap-2 text-sm">
                <Info size={16} className="text-blue-500" />
                <span className="text-muted-foreground">
                  {diasActivos} de 7 días activos.
                  {diasActivos < 7 && ` Los ${7 - diasActivos} día(s) no laborales no generarán mora.`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Reglas de Tope de Mora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Warning size={18} className="text-orange-500" />
                Reglas de Tope de Mora
              </CardTitle>
              <CardDescription>
                Configure límites para el cálculo de mora después de ciertos días laborales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Máximo de días de mora */}
              <div className="space-y-2">
                <Label htmlFor="max_dias_mora" className="text-sm font-medium">
                  Máximo de días de mora a cobrar
                </Label>
                <Input
                  id="max_dias_mora"
                  type="number"
                  min="0"
                  value={config.max_dias_mora}
                  onChange={e => setConfig(prev => ({ ...prev, max_dias_mora: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de días laborales que se cobrarán de mora. 0 = sin límite.
                </p>
              </div>

              <Separator />

              {/* Tope personalizado */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Aplicar tope de mora</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Después de X días laborales, dejar de contar mora
                    </p>
                  </div>
                  <Switch
                    checked={config.aplicar_tope_mora}
                    onCheckedChange={v => setConfig(prev => ({ ...prev, aplicar_tope_mora: v }))}
                  />
                </div>

                {config.aplicar_tope_mora && (
                  <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Label htmlFor="dias_tope_mora" className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      Días laborales de tope
                    </Label>
                    <Input
                      id="dias_tope_mora"
                      type="number"
                      min="1"
                      value={config.dias_tope_mora}
                      onChange={e => setConfig(prev => ({ ...prev, dias_tope_mora: parseInt(e.target.value) || 0 }))}
                      className="w-full"
                    />
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Después de {config.dias_tope_mora || 0} días laborales de mora, se dejará de acumular mora adicional.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Mora completa después de X días */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Mora completa después de X días</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Después de ciertos días calendario desde el vencimiento, cobrar mora todos los días incluyendo no laborales
                    </p>
                  </div>
                  <Switch
                    checked={config.aplicar_mora_completa}
                    onCheckedChange={v => setConfig(prev => ({ ...prev, aplicar_mora_completa: v }))}
                  />
                </div>

                {config.aplicar_mora_completa && (
                  <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <Label htmlFor="dias_para_mora_completa" className="text-sm font-medium text-red-700 dark:text-red-300">
                      Días calendario para activar mora completa
                    </Label>
                    <Input
                      id="dias_para_mora_completa"
                      type="number"
                      min="1"
                      value={config.dias_para_mora_completa}
                      onChange={e => setConfig(prev => ({ ...prev, dias_para_mora_completa: parseInt(e.target.value) || 27 }))}
                      className="w-full"
                    />
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Si una cuota lleva {config.dias_para_mora_completa || 27} días calendario vencida, la mora se cobrará por <strong>todos los días</strong> incluyendo los no laborales (ej. domingos).
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Ejemplo visual */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <Info size={16} />
                  Ejemplo de cálculo
                </p>
                <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <p>Con la configuración actual:</p>
                  <p>
                    • Se cuentan <strong>{diasActivos} días</strong> por semana como laborales
                  </p>
                  {!config.domingo && (
                    <p>• Los domingos <strong>no</strong> generan mora</p>
                  )}
                  {!config.sabado && (
                    <p>• Los sábados <strong>no</strong> generan mora</p>
                  )}
                  {config.aplicar_tope_mora && config.dias_tope_mora > 0 && (
                    <p>• La mora se detiene después de <strong>{config.dias_tope_mora} días laborales</strong></p>
                  )}
                  {config.aplicar_mora_completa && config.dias_para_mora_completa > 0 && (
                    <p>• Después de <strong>{config.dias_para_mora_completa} días calendario</strong> vencida, la mora se cobra <strong>todos los días</strong> (incluyendo no laborales)</p>
                  )}
                  {config.max_dias_mora > 0 && (
                    <p>• Máximo <strong>{config.max_dias_mora} días</strong> de mora se cobran</p>
                  )}
                  {!config.aplicar_tope_mora && config.max_dias_mora === 0 && (
                    <p>• Sin límite en la acumulación de mora</p>
                  )}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notas" className="text-sm font-medium">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  value={config.notas}
                  onChange={e => setConfig(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas sobre esta configuración..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuración de Ventas y Crédito */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart size={18} />
                Ventas y Crédito
              </CardTitle>
              <CardDescription>
                Parámetros para el proceso de ventas y otorgamiento de crédito.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="apartado-mode">Habilitar Opción de Apartado</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite a los clientes reservar productos con un anticipo en el módulo de ventas.
                  </p>
                </div>
                <Switch
                  id="apartado-mode"
                  checked={config.apartado_habilitado}
                  onCheckedChange={(checked) => setConfig({ ...config, apartado_habilitado: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="gracia" className="text-sm font-medium">Días de Gracia (Créditos)</Label>
                <Input
                  id="gracia"
                  type="number"
                  min="0"
                  max="30"
                  value={config.dias_gracia}
                  onChange={(e) => setConfig({ ...config, dias_gracia: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Días adicionales que se otorgan al cliente antes de que la cuota se considere en mora.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frecuencia_defecto" className="text-sm font-medium">Frecuencia por Defecto</Label>
                  <Select 
                    value={config.frecuencia_defecto} 
                    onValueChange={(v: any) => setConfig({ ...config, frecuencia_defecto: v })}
                  >
                    <SelectTrigger id="frecuencia_defecto">
                      <SelectValue placeholder="Seleccione frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tasa_defecto" className="text-sm font-medium">Tasa Interés Defecto (%)</Label>
                  <Input
                    id="tasa_defecto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.tasa_interes_defecto}
                    onChange={(e) => setConfig({ ...config, tasa_interes_defecto: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={isSaving || isLoading} size="lg">
          {isSaving ? (
            <>Guardando...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>

      {/* Configuraciones existentes */}
      {configuraciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuraciones Guardadas</CardTitle>
            <CardDescription>Resumen de configuraciones de mora por sucursal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configuraciones.map(cfg => (
                <div
                  key={cfg.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSucursalSeleccionada(cfg.sucursal_id ? String(cfg.sucursal_id) : '__global__');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={cfg.activo ? 'default' : 'secondary'}>
                      {cfg.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <span className="font-medium text-sm">
                      {cfg.sucursal?.nombre || 'Global (todas las sucursales)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {DIAS_SEMANA.filter(d => cfg[d.key as keyof ParametrizacionMoraData]).length} días laborales
                    </span>
                    {cfg.aplicar_tope_mora && (
                      <Badge variant="outline" className="text-xs">
                        Tope: {cfg.dias_tope_mora} días
                      </Badge>
                    )}
                    {cfg.aplicar_mora_completa && (
                      <Badge variant="outline" className="text-xs text-red-600">
                        Mora completa: {cfg.dias_para_mora_completa} días
                      </Badge>
                    )}
                    {cfg.max_dias_mora > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Máx: {cfg.max_dias_mora} días
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParametrizacionMoraModule;
