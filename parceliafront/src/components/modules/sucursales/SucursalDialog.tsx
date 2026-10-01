import { useState, useEffect } from 'react'
import { Sucursal } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { geoNamesService, Departamento, Municipio } from '@/lib/api'

interface SucursalDialogProps {
  abierto: boolean
  onCerrar: () => void
  onGuardar: (sucursal: Sucursal, dataParaBackend?: any) => void
  sucursal?: Sucursal
}

export function SucursalDialog({ abierto, onCerrar, onGuardar, sucursal }: SucursalDialogProps) {
  const [formData, setFormData] = useState<Partial<Sucursal>>({
    codigo: '',
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    ciudad: '',
    departamento: '',
    descripcion: '',
    activa: true,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false)
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false)
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<number | null>(null)

  const limpiarNombreDepartamento = (nombre: string): string => {
    // Remover "Departamento de " del inicio del nombre
    return nombre.replace(/^Departamento de\s+/i, '').trim()
  }

  const cargarMunicipios = async (departamentoId: number) => {
    setCargandoMunicipios(true)
    setMunicipios([])
    try {
      const response = await geoNamesService.getMunicipios(departamentoId)
      if (response.success && response.data) {
        const municipiosData = Array.isArray(response.data) ? response.data : (response.data as any).data || []
        setMunicipios(municipiosData)
        setFormData((prev) => {
          if (prev.municipioGeonameId && municipiosData.some((item: Municipio) => item.geonameId === prev.municipioGeonameId)) {
            return prev
          }
          const encontrado = municipiosData.find((item: Municipio) => item.name.toLowerCase() === (prev.municipio || '').toLowerCase())
          if (!encontrado) return prev
          return { ...prev, municipioGeonameId: encontrado.geonameId, municipio: encontrado.name }
        })
      }
    } catch (error) {
      console.error('Error cargando municipios:', error)
    } finally {
      setCargandoMunicipios(false)
    }
  }

  const handleDepartamentoChange = (geonameId: string) => {
    const id = parseInt(geonameId)
    const departamento = departamentos.find(d => d.geonameId === id)
    const nombreLimpio = departamento ? limpiarNombreDepartamento(departamento.name) : ''
    setDepartamentoSeleccionado(id)
    setFormData({ 
      ...formData, 
      departamentoGeonameId: id,
      departamento: nombreLimpio,
      municipio: '',
      municipioGeonameId: undefined
    })
    if (id) {
      cargarMunicipios(id)
    } else {
      setMunicipios([])
    }
  }

  const handleMunicipioChange = (geonameId: string) => {
    const id = parseInt(geonameId)
    const municipio = municipios.find(m => m.geonameId === id)
    setFormData({ 
      ...formData, 
      municipioGeonameId: id,
      municipio: municipio?.name || ''
    })
  }

  useEffect(() => {
    if (abierto) {
      // Cargar departamentos
      setCargandoDepartamentos(true)
      geoNamesService.getDepartamentos()
        .then(response => {
          if (response.success && response.data) {
            // El backend devuelve { data: Departamento[] } dentro de response.data
            const departamentosData = Array.isArray(response.data) ? response.data : (response.data as any).data || []
            setDepartamentos(departamentosData)
            const porId = sucursal?.departamentoGeonameId && departamentosData.some((item: Departamento) => item.geonameId === sucursal.departamentoGeonameId)
              ? sucursal.departamentoGeonameId
              : departamentosData.find((item: Departamento) => item.name.toLowerCase() === (sucursal?.departamento || '').toLowerCase())?.geonameId
            if (porId) {
              setDepartamentoSeleccionado(porId)
              if (porId !== sucursal?.departamentoGeonameId) {
                setFormData((prev) => ({ ...prev, departamentoGeonameId: porId, departamento: departamentosData.find((item: Departamento) => item.geonameId === porId)?.name || prev.departamento }))
              }
              cargarMunicipios(porId)
            }
          }
        })
        .catch(error => {
          console.error('Error cargando departamentos:', error)
        })
        .finally(() => {
          setCargandoDepartamentos(false)
        })
    }
  }, [abierto])

  useEffect(() => {
    if (sucursal) {
      setFormData({
        ...sucursal,
        pais: sucursal.pais || 'Guatemala',
        paisGeonameId: sucursal.paisGeonameId || 3595528,
      })
      // Si la sucursal tiene departamento, cargar sus municipios
      if (sucursal.departamentoGeonameId) {
        setDepartamentoSeleccionado(sucursal.departamentoGeonameId)
        cargarMunicipios(sucursal.departamentoGeonameId)
      }
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        ciudad: '',
        departamento: '',
        descripcion: '',
        activa: true,
        pais: 'Guatemala',
        paisGeonameId: 3595528,
      })
      setDepartamentoSeleccionado(null)
      setMunicipios([])
    }
    setErrores({})
  }, [sucursal, abierto])

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {}

    // Solo validar código si es edición (en creación se auto-genera)
    if (sucursal && !formData.codigo?.trim()) nuevosErrores.codigo = 'Requerido'
    if (!formData.nombre?.trim()) nuevosErrores.nombre = 'Requerido'
    // Departamento y municipio son opcionales pero recomendados
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'Email inválido'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return

    // Obtener nombre del departamento y municipio desde GeoNames
    const departamentoRaw = departamentos.find(d => d.geonameId === formData.departamentoGeonameId)?.name || formData.departamento || ''
    const departamentoNombre = limpiarNombreDepartamento(departamentoRaw)
    const municipioNombre = municipios.find(m => m.geonameId === formData.municipioGeonameId)?.name || formData.municipio || ''

    // Preparar datos para el backend (convertir camelCase a snake_case)
    const sucursalDataParaBackend: any = {
      nombre: formData.nombre!,
      activa: formData.activa ?? true,
    }

    // Agregar campos opcionales solo si tienen valor
    if (formData.codigo?.trim()) {
      sucursalDataParaBackend.codigo = formData.codigo.trim()
    }
    if (formData.direccion?.trim()) {
      sucursalDataParaBackend.direccion = formData.direccion.trim()
    }
    if (formData.telefono?.trim()) {
      sucursalDataParaBackend.telefono = formData.telefono.trim()
    }
    if (formData.email?.trim()) {
      sucursalDataParaBackend.email = formData.email.trim()
    }
    if (formData.ciudad?.trim()) {
      sucursalDataParaBackend.ciudad = formData.ciudad.trim()
    }
    if (departamentoNombre?.trim()) {
      sucursalDataParaBackend.departamento = departamentoNombre.trim()
    }
    if (municipioNombre?.trim()) {
      sucursalDataParaBackend.municipio = municipioNombre.trim()
    }
    if (formData.descripcion?.trim()) {
      sucursalDataParaBackend.descripcion = formData.descripcion.trim()
    }

    // Campos de geonames - siempre enviar (pueden ser null)
    sucursalDataParaBackend.departamento_geoname_id = formData.departamentoGeonameId 
      ? parseInt(String(formData.departamentoGeonameId), 10) 
      : null
    sucursalDataParaBackend.municipio_geoname_id = formData.municipioGeonameId 
      ? parseInt(String(formData.municipioGeonameId), 10) 
      : null

    // País siempre se envía
    sucursalDataParaBackend.pais = formData.pais || 'Guatemala'
    sucursalDataParaBackend.pais_geoname_id = parseInt(String(formData.paisGeonameId || 3595528), 10)

    // Mantener el objeto Sucursal para el frontend
    const sucursalData: Sucursal = {
      id: sucursal?.id || `sucursal-${Date.now()}`,
      codigo: formData.codigo || '',
      nombre: formData.nombre!,
      direccion: formData.direccion,
      telefono: formData.telefono,
      email: formData.email,
      ciudad: formData.ciudad,
      departamento: departamentoNombre,
      municipio: municipioNombre,
      departamentoGeonameId: formData.departamentoGeonameId,
      municipioGeonameId: formData.municipioGeonameId,
      pais: formData.pais || 'Guatemala',
      paisGeonameId: formData.paisGeonameId || 3595528,
      descripcion: formData.descripcion,
      activa: formData.activa ?? true,
      creadoEn: sucursal?.creadoEn || new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    }

    // Pasar los datos convertidos al handler
    onGuardar(sucursalData, sucursalDataParaBackend)
  }

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] max-h-[98vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            {sucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-sm sm:text-base">
                Código {!sucursal && <span className="text-xs text-muted-foreground">(Auto-generado)</span>}
              </Label>
              <Input
                id="codigo"
                value={formData.codigo || ''}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                className={`text-sm sm:text-base ${errores.codigo ? 'border-destructive' : ''}`}
                placeholder={sucursal ? "SUC-001" : "Se generará automáticamente"}
                maxLength={20}
                disabled={!sucursal}
                readOnly={!sucursal}
              />
              {errores.codigo && <p className="text-xs text-destructive">{errores.codigo}</p>}
              {!sucursal && (
                <p className="text-xs text-muted-foreground">
                  El código se generará automáticamente al guardar
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm sm:text-base">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className={`text-sm sm:text-base ${errores.nombre ? 'border-destructive' : ''}`}
                placeholder="Sucursal Central"
              />
              {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion" className="text-sm sm:text-base">Dirección</Label>
            <Textarea
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              rows={2}
              className="text-sm sm:text-base resize-none"
              placeholder="Dirección completa de la sucursal"
            />
          </div>

          <div className="space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-sm sm:text-base font-semibold">Ubicación Geográfica</Label>
              <p className="text-xs text-muted-foreground">Categorización por país, departamento y municipio</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pais" className="text-sm sm:text-base">País</Label>
              <Input
                id="pais"
                value="Guatemala"
                disabled
                className="bg-muted text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">Sistema configurado para Guatemala</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="departamento" className="text-sm sm:text-base">Departamento *</Label>
                <Select
                  value={formData.departamentoGeonameId ? String(formData.departamentoGeonameId) : ''}
                  onValueChange={handleDepartamentoChange}
                  disabled={cargandoDepartamentos}
                >
                  <SelectTrigger className={`text-sm sm:text-base ${errores.departamento ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder={cargandoDepartamentos ? "Cargando..." : "Seleccionar departamento"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] sm:max-h-[300px]">
                    {departamentos.map((depto) => {
                      const nombreLimpio = limpiarNombreDepartamento(depto.name)
                      return (
                        <SelectItem key={depto.geonameId} value={String(depto.geonameId)} className="text-sm sm:text-base">
                          {nombreLimpio}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errores.departamento && <p className="text-xs text-destructive">{errores.departamento}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipio" className="text-sm sm:text-base">Municipio *</Label>
                <Select
                  value={formData.municipioGeonameId ? String(formData.municipioGeonameId) : ''}
                  onValueChange={handleMunicipioChange}
                  disabled={!departamentoSeleccionado || cargandoMunicipios}
                >
                  <SelectTrigger className={`text-sm sm:text-base ${errores.municipio ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder={
                      !departamentoSeleccionado 
                        ? "Selecciona un departamento primero" 
                        : cargandoMunicipios 
                          ? "Cargando..." 
                          : "Seleccionar municipio"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] sm:max-h-[300px]">
                    {municipios.map((mun) => (
                      <SelectItem key={mun.geonameId} value={String(mun.geonameId)} className="text-sm sm:text-base">
                        {mun.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errores.municipio && <p className="text-xs text-destructive">{errores.municipio}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-sm sm:text-base">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="text-sm sm:text-base"
                placeholder="12345678"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`text-sm sm:text-base ${errores.email ? 'border-destructive' : ''}`}
                placeholder="sucursal@ejemplo.com"
              />
              {errores.email && <p className="text-xs text-destructive">{errores.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-sm sm:text-base">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="text-sm sm:text-base resize-none"
              placeholder="Información adicional sobre la sucursal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activa" className="text-sm sm:text-base">Estado</Label>
            <Select
              value={formData.activa ? 'activa' : 'inactiva'}
              onValueChange={(value) => setFormData({ ...formData, activa: value === 'activa' })}
            >
              <SelectTrigger className="text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activa" className="text-sm sm:text-base">Activa</SelectItem>
                <SelectItem value="inactiva" className="text-sm sm:text-base">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCerrar}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {sucursal ? 'Guardar Cambios' : 'Crear Sucursal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

