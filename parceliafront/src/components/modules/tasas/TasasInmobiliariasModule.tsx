import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Percent, Plus, Pencil, Power } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  moraInmobiliariaService,
  ParametrizacionMoraInmo,
  tasaInmobiliariaService,
  TasaInmobiliaria,
} from '@/lib/api'

const TASA_VACIA: Partial<TasaInmobiliaria> = {
  nombre: '',
  porcentaje_anual: 6,
  tipo_calculo: 'sobre_saldos',
  periodicidad: 'mensual',
  activo: true,
  descripcion: '',
}

const MORA_VACIA: Partial<ParametrizacionMoraInmo> = {
  nombre: 'Mora terrenos',
  tipo_calculo: 'porcentaje_capital_vencido',
  porcentaje_diario: 0.05,
  monto_fijo_diario: 0,
  dias_gracia: 0,
  activo: true,
  descripcion: '',
}

export function TasasInmobiliariasModule() {
  const [tasas, setTasas] = useState<TasaInmobiliaria[]>([])
  const [moras, setMoras] = useState<ParametrizacionMoraInmo[]>([])
  const [cargando, setCargando] = useState(false)
  const [modalTasa, setModalTasa] = useState(false)
  const [modalMora, setModalMora] = useState(false)
  const [editandoTasa, setEditandoTasa] = useState<TasaInmobiliaria | null>(null)
  const [editandoMora, setEditandoMora] = useState<ParametrizacionMoraInmo | null>(null)
  const [formTasa, setFormTasa] = useState({ ...TASA_VACIA })
  const [formMora, setFormMora] = useState({ ...MORA_VACIA })

  const cargar = async () => {
    setCargando(true)
    try {
      const [resTasas, resMora] = await Promise.all([
        tasaInmobiliariaService.getAll(),
        moraInmobiliariaService.getAll(),
      ])
      if (resTasas.success && resTasas.data) setTasas(resTasas.data)
      if (resMora.success && resMora.data) setMoras(resMora.data)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cargar el catálogo')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirNuevaTasa = () => {
    setEditandoTasa(null)
    setFormTasa({ ...TASA_VACIA })
    setModalTasa(true)
  }

  const abrirEditarTasa = (tasa: TasaInmobiliaria) => {
    setEditandoTasa(tasa)
    setFormTasa({ ...tasa })
    setModalTasa(true)
  }

  const guardarTasa = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editandoTasa) {
        await tasaInmobiliariaService.update(editandoTasa.id, formTasa)
        toast.success('Tasa actualizada. Las ventas ya firmadas conservan su snapshot.')
      } else {
        await tasaInmobiliariaService.create(formTasa)
        toast.success('Tasa registrada')
      }
      setModalTasa(false)
      cargar()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar la tasa')
    }
  }

  const desactivarTasa = async (tasa: TasaInmobiliaria) => {
    try {
      await tasaInmobiliariaService.desactivar(tasa.id)
      toast.success('Tasa desactivada para nuevas negociaciones')
      cargar()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo desactivar')
    }
  }

  const abrirNuevaMora = () => {
    setEditandoMora(null)
    setFormMora({ ...MORA_VACIA })
    setModalMora(true)
  }

  const abrirEditarMora = (mora: ParametrizacionMoraInmo) => {
    setEditandoMora(mora)
    setFormMora({ ...mora })
    setModalMora(true)
  }

  const guardarMora = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editandoMora) {
        await moraInmobiliariaService.update(editandoMora.id, formMora)
        toast.success('Regla de mora actualizada. No altera contratos con snapshot previo.')
      } else {
        await moraInmobiliariaService.create({ ...formMora, activo: true })
        toast.success('Regla de mora activa. Se snapshot al firmar cada negociación.')
      }
      setModalMora(false)
      cargar()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar la mora')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="page-toolbar bg-card/70 p-4 sm:p-6 rounded-2xl border border-border/80">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <Percent size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
            <h1 className="font-bold tracking-tight">Tasas y mora de terrenos</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Catálogo para nuevas ventas. El contrato guarda un snapshot; editar aquí no recálcula histórico.
          </p>
        </div>
        <div className="page-toolbar-actions">
          <Button variant="outline" onClick={cargar} disabled={cargando}>Actualizar</Button>
        </div>
      </div>

      <Tabs defaultValue="tasas">
        <TabsList>
          <TabsTrigger value="tasas">Tasas de interés</TabsTrigger>
          <TabsTrigger value="mora">Mora operativa</TabsTrigger>
        </TabsList>

        <TabsContent value="tasas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Catálogo de tasas</CardTitle>
                <CardDescription>Frances por defecto en el simulador. La negociación copia porcentaje y vigencia.</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={abrirNuevaTasa}>
                <Plus size={16} /> Nueva tasa
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">% anual</TableHead>
                    <TableHead>Cálculo</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasas.map((tasa) => (
                    <TableRow key={tasa.id}>
                      <TableCell className="font-medium">{tasa.nombre}</TableCell>
                      <TableCell className="text-right">{Number(tasa.porcentaje_anual).toFixed(2)}%</TableCell>
                      <TableCell className="text-xs capitalize">{tasa.tipo_calculo.replace('_', ' ')}</TableCell>
                      <TableCell className="text-xs">
                        {tasa.vigencia_inicio || 'Sin inicio'} → {tasa.vigencia_fin || 'Abierta'}
                      </TableCell>
                      <TableCell>
                        {tasa.activo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Activa</Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => abrirEditarTasa(tasa)}>
                          <Pencil size={16} />
                        </Button>
                        {tasa.activo && (
                          <Button size="sm" variant="ghost" onClick={() => desactivarTasa(tasa)}>
                            <Power size={16} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {tasas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aún no hay tasas. Cree una para usarla al financiar un lote.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mora">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Regla de mora</CardTitle>
                <CardDescription>
                  Puede haber varias reglas activas (% diario o monto fijo). Al vender a crédito se elige cuál aplica y el contrato guarda un snapshot.
                </CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={abrirNuevaMora}>
                <Plus size={16} /> Nueva regla
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">% diario</TableHead>
                    <TableHead className="text-right">Monto fijo / día</TableHead>
                    <TableHead className="text-right">Gracia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moras.map((mora) => (
                    <TableRow key={mora.id}>
                      <TableCell className="font-medium">{mora.nombre}</TableCell>
                      <TableCell className="text-xs">
                        {mora.tipo_calculo === 'monto_fijo_diario' ? 'Monto fijo diario' : '% sobre capital vencido'}
                      </TableCell>
                      <TableCell className="text-right">{Number(mora.porcentaje_diario).toFixed(4)}</TableCell>
                      <TableCell className="text-right">Q{Number(mora.monto_fijo_diario).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{mora.dias_gracia} días</TableCell>
                      <TableCell>
                        {mora.activo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Vigente</Badge>
                        ) : (
                          <Badge variant="outline">Histórica</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => abrirEditarMora(mora)}>
                          <Pencil size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalTasa} onOpenChange={setModalTasa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoTasa ? 'Editar tasa' : 'Nueva tasa inmobiliaria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarTasa} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input required value={formTasa.nombre || ''} onChange={(e) => setFormTasa({ ...formTasa, nombre: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>% anual</Label>
                <Input type="number" step="0.01" required value={formTasa.porcentaje_anual ?? 0} onChange={(e) => setFormTasa({ ...formTasa, porcentaje_anual: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Cálculo</Label>
                <select className="w-full border rounded-md h-9 px-2 bg-background" value={formTasa.tipo_calculo} onChange={(e) => setFormTasa({ ...formTasa, tipo_calculo: e.target.value as TasaInmobiliaria['tipo_calculo'] })}>
                  <option value="sobre_saldos">Sobre saldos (francés)</option>
                  <option value="interes_plano">Interés plano</option>
                  <option value="fijo">Fijo</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalTasa(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalMora} onOpenChange={setModalMora}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoMora ? 'Editar regla de mora' : 'Nueva regla de mora'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarMora} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input required value={formMora.nombre || ''} onChange={(e) => setFormMora({ ...formMora, nombre: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Tipo de cálculo</Label>
              <select className="w-full border rounded-md h-9 px-2 bg-background" value={formMora.tipo_calculo} onChange={(e) => setFormMora({ ...formMora, tipo_calculo: e.target.value as ParametrizacionMoraInmo['tipo_calculo'] })}>
                <option value="porcentaje_capital_vencido">% diario sobre capital vencido</option>
                <option value="monto_fijo_diario">Monto fijo por día</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>% diario</Label>
                <Input type="number" step="0.0001" value={formMora.porcentaje_diario ?? 0} onChange={(e) => setFormMora({ ...formMora, porcentaje_diario: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Q / día</Label>
                <Input type="number" step="0.01" value={formMora.monto_fijo_diario ?? 0} onChange={(e) => setFormMora({ ...formMora, monto_fijo_diario: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Días gracia</Label>
                <Input type="number" value={formMora.dias_gracia ?? 0} onChange={(e) => setFormMora({ ...formMora, dias_gracia: parseInt(e.target.value, 10) || 0 })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalMora(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
