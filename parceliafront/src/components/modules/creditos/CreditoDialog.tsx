import { useState, useEffect } from 'react'
import { useKV } from '@/hooks/use-kv'
import { Cliente, Credito } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { calcularMontoPrestamo, calcularIntereses, calcularFechaVencimiento } from '@/lib/helpers'
import { clienteService } from '@/lib/api'

interface CreditoDialogProps {
  abierto: boolean
  onCerrar: () => void
  onGuardar: (credito: Credito) => void
}

export function CreditoDialog({ abierto, onCerrar, onGuardar }: CreditoDialogProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargandoClientes, setCargandoClientes] = useState(false)
  const [creditos] = useKV<Credito[]>('creditos', [])
  
  const [formData, setFormData] = useState({
    clienteId: '',
    descripcionPrenda: '',
    categoriaPrenda: '',
    avaluo: '',
    montoComercial: '',
    montoPrestado: '',
    tasaInteres: '10',
    plazoMeses: '1',
    fotos: [] as string[],
    fotoUrl: ''
  })

  const [errores, setErrores] = useState<Record<string, string>>({})

  // Cargar clientes activos cuando se abre el diálogo
  useEffect(() => {
    if (abierto) {
      setCargandoClientes(true)
      setClientes([]) // Limpiar clientes anteriores
      clienteService.getActivos()
        .then(response => {
          if (response.success && response.data) {
            // El API devuelve { success: true, data: Cliente[] }
            const clientesData = response.data
            if (Array.isArray(clientesData)) {
              setClientes(clientesData)
            } else {
              console.warn('Respuesta del API no es un array:', clientesData)
              setClientes([])
            }
          } else {
            setClientes([])
          }
        })
        .catch(error => {
          console.error('Error cargando clientes:', error)
          const errorMsg = error.message || 'Error al cargar clientes'
          toast.error(errorMsg)
          setClientes([])
        })
        .finally(() => {
          setCargandoClientes(false)
        })
    } else {
      // Limpiar clientes cuando se cierra el diálogo
      setClientes([])
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) {
      setFormData({
        clienteId: '',
        descripcionPrenda: '',
        categoriaPrenda: '',
        avaluo: '',
        montoComercial: '',
        montoPrestado: '',
        tasaInteres: '10',
        plazoMeses: '1',
        fotos: [],
        fotoUrl: ''
      })
      setErrores({})
    }
  }, [abierto])

  useEffect(() => {
    if (formData.avaluo) {
      const avaluoNum = parseFloat(formData.avaluo)
      const montoMax = calcularMontoPrestamo(avaluoNum, 0.6)
      setFormData(prev => ({
        ...prev,
        montoComercial: avaluoNum.toString(),
        montoPrestado: montoMax.toString()
      }))
    }
  }, [formData.avaluo])

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {}

    if (!formData.clienteId) nuevosErrores.clienteId = 'Debe seleccionar un cliente'
    if (!formData.descripcionPrenda.trim()) nuevosErrores.descripcionPrenda = 'Requerido'
    if (!formData.categoriaPrenda) nuevosErrores.categoriaPrenda = 'Requerido'
    if (!formData.avaluo || parseFloat(formData.avaluo) <= 0) nuevosErrores.avaluo = 'Debe ser mayor a 0'
    if (!formData.montoPrestado || parseFloat(formData.montoPrestado) <= 0) nuevosErrores.montoPrestado = 'Debe ser mayor a 0'

    const avaluoNum = parseFloat(formData.avaluo)
    const montoPrestadoNum = parseFloat(formData.montoPrestado)
    const montoMaximo = calcularMontoPrestamo(avaluoNum, 0.6)

    if (montoPrestadoNum > montoMaximo) {
      nuevosErrores.montoPrestado = `No puede exceder el 60% del avalúo (Q${montoMaximo.toFixed(2)})`
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleAgregarFoto = () => {
    if (formData.fotoUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        fotos: [...prev.fotos, prev.fotoUrl],
        fotoUrl: ''
      }))
    }
  }

  const handleEliminarFoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return

    const avaluoNum = parseFloat(formData.avaluo)
    const montoComercialNum = parseFloat(formData.montoComercial)
    const montoPrestadoNum = parseFloat(formData.montoPrestado)
    const tasaInteresNum = parseFloat(formData.tasaInteres)
    const plazoMesesNum = parseInt(formData.plazoMeses)

    const fechaCreacion = new Date().toISOString()
    const fechaVencimiento = calcularFechaVencimiento(fechaCreacion, plazoMesesNum)
    const numeroCredito = `CR-${Date.now()}`

    const credito: Credito = {
      id: `credito-${Date.now()}`,
      numero: numeroCredito,
      clienteId: formData.clienteId,
      prenda: {
        descripcion: formData.descripcionPrenda,
        categoria: formData.categoriaPrenda,
        fotos: formData.fotos,
        avaluo: avaluoNum
      },
      montoComercial: montoComercialNum,
      montoPrestado: montoPrestadoNum,
      tasaInteres: tasaInteresNum,
      plazoMeses: plazoMesesNum,
      fechaCreacion,
      fechaVencimiento,
      estado: 'activo',
      saldoActual: montoPrestadoNum + calcularIntereses(montoPrestadoNum, tasaInteresNum, plazoMesesNum),
      renovaciones: 0
    }

    onGuardar(credito)
    toast.success(`Crédito ${numeroCredito} creado correctamente`)
  }

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Crédito Prendario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Información del Cliente</h3>
              <div className="space-y-2">
                <Label htmlFor="clienteId">Cliente *</Label>
                {clientes.length === 0 && !cargandoClientes ? (
                  <div className="p-3 border border-destructive/50 rounded-md bg-destructive/10">
                    <p className="text-sm text-destructive">
                      No hay clientes activos disponibles. Por favor, crea un cliente primero.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={formData.clienteId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                    disabled={cargandoClientes || clientes.length === 0}
                  >
                    <SelectTrigger className={errores.clienteId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={cargandoClientes ? "Cargando clientes..." : "Selecciona un cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombres} {cliente.apellidos} - {cliente.dpi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errores.clienteId && <p className="text-xs text-destructive">{errores.clienteId}</p>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Información de la Prenda</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="descripcionPrenda">Descripción de la Prenda *</Label>
                  <Textarea
                    id="descripcionPrenda"
                    value={formData.descripcionPrenda}
                    onChange={(e) => setFormData({ ...formData, descripcionPrenda: e.target.value })}
                    className={errores.descripcionPrenda ? 'border-destructive' : ''}
                    placeholder="Ej: Anillo de oro 18k con diamante central"
                    rows={3}
                  />
                  {errores.descripcionPrenda && <p className="text-xs text-destructive">{errores.descripcionPrenda}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoriaPrenda">Categoría *</Label>
                  <Select
                    value={formData.categoriaPrenda}
                    onValueChange={(value) => setFormData({ ...formData, categoriaPrenda: value })}
                  >
                    <SelectTrigger className={errores.categoriaPrenda ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="joyeria">Joyería</SelectItem>
                      <SelectItem value="electronica">Electrónica</SelectItem>
                      <SelectItem value="herramientas">Herramientas</SelectItem>
                      <SelectItem value="vehiculos">Vehículos</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                  {errores.categoriaPrenda && <p className="text-xs text-destructive">{errores.categoriaPrenda}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avaluo">Avalúo *</Label>
                  <Input
                    id="avaluo"
                    type="number"
                    step="0.01"
                    value={formData.avaluo}
                    onChange={(e) => setFormData({ ...formData, avaluo: e.target.value })}
                    className={errores.avaluo ? 'border-destructive' : ''}
                    placeholder="0.00"
                  />
                  {errores.avaluo && <p className="text-xs text-destructive">{errores.avaluo}</p>}
                </div>

                <div className="col-span-2">
                  <Label>Fotos de la Prenda</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="url"
                      value={formData.fotoUrl}
                      onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAgregarFoto} disabled={!formData.fotoUrl.trim()}>
                      Agregar
                    </Button>
                  </div>
                  {formData.fotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.fotos.map((foto, index) => (
                        <div key={index} className="relative">
                          <img src={foto} alt={`Foto ${index + 1}`} className="w-20 h-20 object-cover rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => handleEliminarFoto(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Términos del Crédito</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="montoComercial">Monto Comercial</Label>
                  <Input
                    id="montoComercial"
                    type="number"
                    step="0.01"
                    value={formData.montoComercial}
                    onChange={(e) => setFormData({ ...formData, montoComercial: e.target.value })}
                    placeholder="0.00"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montoPrestado">Monto Prestado * (Max: 60% del avalúo)</Label>
                  <Input
                    id="montoPrestado"
                    type="number"
                    step="0.01"
                    value={formData.montoPrestado}
                    onChange={(e) => setFormData({ ...formData, montoPrestado: e.target.value })}
                    className={errores.montoPrestado ? 'border-destructive' : ''}
                    placeholder="0.00"
                  />
                  {errores.montoPrestado && <p className="text-xs text-destructive">{errores.montoPrestado}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tasaInteres">Tasa de Interés (%) *</Label>
                  <Input
                    id="tasaInteres"
                    type="number"
                    step="0.1"
                    value={formData.tasaInteres}
                    onChange={(e) => setFormData({ ...formData, tasaInteres: e.target.value })}
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazoMeses">Plazo (Meses) *</Label>
                  <Select
                    value={formData.plazoMeses}
                    onValueChange={(value) => setFormData({ ...formData, plazoMeses: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mes</SelectItem>
                      <SelectItem value="2">2 meses</SelectItem>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.montoPrestado && formData.tasaInteres && formData.plazoMeses && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Interés Total:</span>
                    <span className="font-mono font-medium">
                      Q{calcularIntereses(
                        parseFloat(formData.montoPrestado),
                        parseFloat(formData.tasaInteres),
                        parseInt(formData.plazoMeses)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total a Pagar:</span>
                    <span className="font-mono">
                      Q{(
                        parseFloat(formData.montoPrestado) +
                        calcularIntereses(
                          parseFloat(formData.montoPrestado),
                          parseFloat(formData.tasaInteres),
                          parseInt(formData.plazoMeses)
                        )
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Crédito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
