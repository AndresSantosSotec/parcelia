import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, TreeStructure, Compass, MapPin, CurrencyDollar, CheckCircle, WarningCircle, Drop, Lightning, RoadHorizon, ArrowsOutLineVertical, Tag } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { fincaService, loteService, Finca, Parcela, Lote } from '@/lib/api'

export function FincasModule() {
  const [fincas, setFincas] = useState<Finca[]>([])
  const [fincaSeleccionada, setFincaSeleccionada] = useState<Finca | null>(null)
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState<Parcela | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cargando, setCargando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  // Modales
  const [modalFinca, setModalFinca] = useState(false)
  const [modalParcela, setModalParcela] = useState(false)
  const [modalLote, setModalLote] = useState(false)

  // Formularios
  const [formFinca, setFormFinca] = useState({
    nombre: '',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    area_total_m2: 50000,
    ubicacion: '',
    numero_finca: '',
    folio: '',
    libro: '',
    descripcion: ''
  })

  const [formParcela, setFormParcela] = useState({
    nombre_identificador: '',
    codigo: '',
    area_m2: 10000,
    tipo_terreno: 'Plano',
    medidas_perimetro: '',
    colindancias: '',
    descripcion: ''
  })

  const [formLote, setFormLote] = useState({
    numero_lote: '',
    area_m2: 200,
    frente_metros: 10,
    fondo_metros: 20,
    precio_m2: 450,
    precio_venta: 90000,
    tipo_terreno: 'Residencial',
    colindancias: '',
    observaciones: ''
  })

  const cargarFincas = async () => {
    setCargando(true)
    try {
      const res = await fincaService.getAll()
      if (res.success && res.data) {
        setFincas(res.data)
        if (res.data.length > 0 && !fincaSeleccionada) {
          setFincaSeleccionada(res.data[0])
          if (res.data[0].parcelas && res.data[0].parcelas.length > 0) {
            setParcelaSeleccionada(res.data[0].parcelas[0])
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  const cargarLotes = async () => {
    try {
      const res = await loteService.getAll({
        finca_id: fincaSeleccionada?.id,
        parcela_id: parcelaSeleccionada?.id,
        estado: filtroEstado
      })
      if (res.success && res.data) {
        setLotes(res.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    cargarFincas()
  }, [])

  useEffect(() => {
    if (fincaSeleccionada) {
      cargarLotes()
    }
  }, [fincaSeleccionada, parcelaSeleccionada, filtroEstado])

  const handleCrearFinca = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fincaService.create(formFinca)
      if (res.success) {
        toast.success('Finca registrada con éxito')
        setModalFinca(false)
        setFormFinca({ nombre: '', municipio: 'Guatemala', departamento: 'Guatemala', area_total_m2: 50000, ubicacion: '', numero_finca: '', folio: '', libro: '', descripcion: '' })
        cargarFincas()
      }
    } catch (e: any) {
      toast.error('Error al registrar la finca')
    }
  }

  const handleCrearParcela = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fincaSeleccionada) return
    try {
      const res = await fincaService.createParcela(fincaSeleccionada.id, formParcela)
      if (res.success) {
        toast.success('Parcela / Manzana agregada exitosamente')
        setModalParcela(false)
        setFormParcela({ nombre_identificador: '', codigo: '', area_m2: 10000, tipo_terreno: 'Plano', medidas_perimetro: '', colindancias: '', descripcion: '' })
        cargarFincas()
      }
    } catch (e: any) {
      toast.error('Error al registrar la parcela')
    }
  }

  const handleCrearLote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parcelaSeleccionada) {
      toast.error('Selecciona una parcela primero')
      return
    }
    try {
      const res = await fincaService.createLote(parcelaSeleccionada.id, formLote)
      if (res.success) {
        toast.success('Lote registrado con éxito en el inventario')
        setModalLote(false)
        setFormLote({ numero_lote: '', area_m2: 200, frente_metros: 10, fondo_metros: 20, precio_m2: 450, precio_venta: 90000, tipo_terreno: 'Residencial', colindancias: '', observaciones: '' })
        cargarLotes()
        cargarFincas()
      }
    } catch (e: any) {
      toast.error('Error al registrar el lote')
    }
  }

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Disponible</Badge>
      case 'reservado':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Reservado</Badge>
      case 'en_negociacion':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">En Negociación</Badge>
      case 'vendido':
        return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Vendido / Financiado</Badge>
      case 'pagado':
        return <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30">Escriturado / Pagado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TreeStructure size={28} className="text-primary" weight="duotone" />
            <h1 className="text-2xl font-bold tracking-tight">Fincas, Parcelas & Lotes</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Estructura jerárquica de proyectos inmobiliarios, administración territorial e inventario de terrenos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setModalFinca(true)} className="gap-2 shadow-sm">
            <Plus size={18} weight="bold" /> Nueva Finca
          </Button>
          {fincaSeleccionada && (
            <Button variant="outline" onClick={() => setModalParcela(true)} className="gap-2">
              <Plus size={18} weight="bold" /> Nueva Parcela
            </Button>
          )}
          {parcelaSeleccionada && (
            <Button variant="secondary" onClick={() => setModalLote(true)} className="gap-2">
              <Plus size={18} weight="bold" /> Nuevo Lote
            </Button>
          )}
        </div>
      </div>

      {/* Selector de Fincas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fincas.map((finca) => {
          const isSelected = fincaSeleccionada?.id === finca.id
          return (
            <Card
              key={finca.id}
              onClick={() => {
                setFincaSeleccionada(finca)
                if (finca.parcelas && finca.parcelas.length > 0) {
                  setParcelaSeleccionada(finca.parcelas[0])
                } else {
                  setParcelaSeleccionada(null)
                }
              }}
              className={`cursor-pointer transition-all border-2 ${
                isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border/60 hover:border-primary/40'
              }`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {finca.codigo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {finca.parcelas_count ?? finca.parcelas?.length ?? 0} Sectores
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground line-clamp-1">{finca.nombre}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
                  <MapPin size={14} className="shrink-0 text-primary" /> {finca.municipio}, {finca.departamento}
                </p>
                <div className="pt-2 border-t flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Área: {Number(finca.area_total_m2 || 0).toLocaleString()} m²</span>
                  <span className="text-emerald-600 font-semibold">{finca.lotes_disponibles_count ?? 0} Disp.</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Contenedor Principal: Parcelas y Grid de Lotes */}
      {fincaSeleccionada && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Compass size={20} className="text-primary" weight="duotone" />
                  {fincaSeleccionada.nombre} — Parcelas y Lotes
                </CardTitle>
                <CardDescription className="text-xs">
                  {fincaSeleccionada.ubicacion || 'Ubicación sin especificar'} · Reg. Finca #{fincaSeleccionada.numero_finca || 'S/N'}, Folio {fincaSeleccionada.folio || '0'}, Libro {fincaSeleccionada.libro || '0'}
                </CardDescription>
              </div>

              {/* Filtro por estado de lote */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Estado:</span>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="text-xs bg-background border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="todos">Todos los lotes</option>
                  <option value="disponible">Disponibles</option>
                  <option value="reservado">Reservados</option>
                  <option value="vendido">Vendidos / Financiados</option>
                  <option value="pagado">Pagados / Escriturados</option>
                </select>
              </div>
            </div>

            {/* Pestañas de Parcelas */}
            <div className="flex items-center gap-2 pt-3 overflow-x-auto">
              <button
                onClick={() => setParcelaSeleccionada(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  parcelaSeleccionada === null
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas las Parcelas ({lotes.length})
              </button>
              {fincaSeleccionada.parcelas?.map((par) => (
                <button
                  key={par.id}
                  onClick={() => setParcelaSeleccionada(par)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    parcelaSeleccionada?.id === par.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {par.nombre_identificador}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {lotes.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <WarningCircle size={48} className="mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-base">No hay lotes registrados</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Agrega sectores o parcelas y registra lotes individuales para comenzar a comercializar.
                </p>
                {parcelaSeleccionada && (
                  <Button onClick={() => setModalLote(true)} size="sm" className="gap-2">
                    <Plus size={16} /> Crear Primer Lote
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {lotes.map((lote) => (
                  <div
                    key={lote.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all hover:shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-foreground bg-muted px-2 py-0.5 rounded">
                        {lote.numero_lote}
                      </span>
                      {getBadgeEstado(lote.estado)}
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-foreground">
                        Q{Number(lote.precio_venta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Q{Number(lote.precio_m2 || 0).toLocaleString()} / m²
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                      <div className="bg-muted/40 p-2 rounded-lg">
                        <span className="text-muted-foreground block text-[0.6875rem]">Área</span>
                        <span className="font-semibold text-foreground">{lote.area_m2} m²</span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-lg">
                        <span className="text-muted-foreground block text-[0.6875rem]">Dimensiones</span>
                        <span className="font-semibold text-foreground">
                          {lote.frente_metros || '—'}m x {lote.fondo_metros || '—'}m
                        </span>
                      </div>
                    </div>

                    {/* Servicios del Lote */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span title="Agua Potable" className="p-1 rounded bg-blue-500/10 text-blue-600">
                        <Drop size={14} weight="fill" />
                      </span>
                      <span title="Energía Eléctrica" className="p-1 rounded bg-amber-500/10 text-amber-600">
                        <Lightning size={14} weight="fill" />
                      </span>
                      <span title="Acceso Vial" className="p-1 rounded bg-emerald-500/10 text-emerald-600">
                        <RoadHorizon size={14} weight="fill" />
                      </span>
                      <span className="text-[0.6875rem] text-muted-foreground ml-auto">
                        {lote.tipo_terreno}
                      </span>
                    </div>

                    {lote.observaciones && (
                      <p className="text-[0.6875rem] text-muted-foreground line-clamp-1 italic">
                        {lote.observaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Nueva Finca */}
      <Dialog open={modalFinca} onOpenChange={setModalFinca}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Finca Matriz</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearFinca} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la Finca / Proyecto *</Label>
              <Input
                required
                placeholder="Ej. Finca Las Palmas"
                value={formFinca.nombre}
                onChange={(e) => setFormFinca({ ...formFinca, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Municipio</Label>
                <Input
                  value={formFinca.municipio}
                  onChange={(e) => setFormFinca({ ...formFinca, municipio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={formFinca.departamento}
                  onChange={(e) => setFormFinca({ ...formFinca, departamento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Total (m²)</Label>
                <Input
                  type="number"
                  value={formFinca.area_total_m2}
                  onChange={(e) => setFormFinca({ ...formFinca, area_total_m2: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>No. Finca / Registro</Label>
                <Input
                  placeholder="Ej. 1420"
                  value={formFinca.numero_finca}
                  onChange={(e) => setFormFinca({ ...formFinca, numero_finca: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ubicación / Dirección exacta</Label>
              <Input
                placeholder="Ej. Km 45 Carretera Principal"
                value={formFinca.ubicacion}
                onChange={(e) => setFormFinca({ ...formFinca, ubicacion: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalFinca(false)}>Cancelar</Button>
              <Button type="submit">Guardar Finca</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nueva Parcela */}
      <Dialog open={modalParcela} onOpenChange={setModalParcela}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Parcela / Manzana en {fincaSeleccionada?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearParcela} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre / Identificador del Sector *</Label>
              <Input
                required
                placeholder="Ej. Manzana A, Sector Los Pinos"
                value={formParcela.nombre_identificador}
                onChange={(e) => setFormParcela({ ...formParcela, nombre_identificador: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Estimada (m²)</Label>
                <Input
                  type="number"
                  value={formParcela.area_m2}
                  onChange={(e) => setFormParcela({ ...formParcela, area_m2: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Terreno</Label>
                <select
                  value={formParcela.tipo_terreno}
                  onChange={(e) => setFormParcela({ ...formParcela, tipo_terreno: e.target.value })}
                  className="w-full bg-background border rounded-lg p-2 text-sm"
                >
                  <option value="Plano">Plano</option>
                  <option value="Ondulado">Ondulado</option>
                  <option value="Inclinado">Inclinado con vista</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalParcela(false)}>Cancelar</Button>
              <Button type="submit">Guardar Parcela</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo Lote */}
      <Dialog open={modalLote} onOpenChange={setModalLote}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Registrar Lote en {parcelaSeleccionada?.nombre_identificador}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearLote} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número / Identificador de Lote *</Label>
                <Input
                  required
                  placeholder="Ej. L-05"
                  value={formLote.numero_lote}
                  onChange={(e) => setFormLote({ ...formLote, numero_lote: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Área Total (m²) *</Label>
                <Input
                  required
                  type="number"
                  value={formLote.area_m2}
                  onChange={(e) => {
                    const area = parseFloat(e.target.value) || 0
                    setFormLote({
                      ...formLote,
                      area_m2: area,
                      precio_venta: area * formLote.precio_m2
                    })
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frente (metros)</Label>
                <Input
                  type="number"
                  value={formLote.frente_metros}
                  onChange={(e) => setFormLote({ ...formLote, frente_metros: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fondo (metros)</Label>
                <Input
                  type="number"
                  value={formLote.fondo_metros}
                  onChange={(e) => setFormLote({ ...formLote, fondo_metros: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio por m² (Q)</Label>
                <Input
                  type="number"
                  value={formLote.precio_m2}
                  onChange={(e) => {
                    const pm2 = parseFloat(e.target.value) || 0
                    setFormLote({
                      ...formLote,
                      precio_m2: pm2,
                      precio_venta: formLote.area_m2 * pm2
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio de Venta Total (Q) *</Label>
                <Input
                  required
                  type="number"
                  value={formLote.precio_venta}
                  onChange={(e) => setFormLote({ ...formLote, precio_venta: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Colindancias y Límites</Label>
              <Input
                placeholder="Norte: Calle, Sur: Lote 10, Este: Lote 6, Oeste: Lote 4"
                value={formLote.colindancias}
                onChange={(e) => setFormLote({ ...formLote, colindancias: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalLote(false)}>Cancelar</Button>
              <Button type="submit">Registrar Lote</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
