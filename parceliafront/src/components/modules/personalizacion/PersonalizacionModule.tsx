import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useEmpresaConfig, EmpresaConfig } from '@/hooks/useEmpresaConfig'
import { toast } from 'sonner'
import {
  PaintBrush,
  Image as ImageIcon,
  Buildings,
  FileText,
  UploadSimple,
  Trash,
  CheckCircle,
  Eye,
  ArrowCounterClockwise,
  FloppyDisk,
  Sparkle,
  Phone,
  Envelope,
  MapPin,
  Globe,
  IdentificationBadge
} from '@phosphor-icons/react'

export function PersonalizacionModule() {
  const { config, updateConfig, resetConfig } = useEmpresaConfig()
  const [formData, setFormData] = useState<EmpresaConfig>(config)
  const [logoPreview, setLogoPreview] = useState<string | null>(config.logoUrl)
  const [guardando, setGuardando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manejar carga de archivo de logo y convertir a Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP)')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El tamaño de la imagen debe ser menor a 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setLogoPreview(base64)
      setFormData(prev => ({ ...prev, logoUrl: base64 }))
      toast.success('Logo cargado. Recuerda guardar los cambios.')
    }
    reader.readAsDataURL(file)
  }

  const handleEliminarLogo = () => {
    setLogoPreview(null)
    setFormData(prev => ({ ...prev, logoUrl: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.info('Logo removido. Guarda los cambios para aplicar.')
  }

  const handleGuardar = () => {
    setGuardando(true)
    setTimeout(() => {
      updateConfig(formData)
      setGuardando(false)
      toast.success('Configuración de marca y logo guardada exitosamente')
    }, 400)
  }

  const handleRestaurar = () => {
    if (window.confirm('¿Deseas restaurar la configuración por defecto de Parcelia?')) {
      resetConfig()
      setFormData(config)
      setLogoPreview(null)
      toast.info('Valores restaurados por defecto')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Encabezado del Módulo */}
      <div className="page-toolbar bg-card/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <PaintBrush size={26} weight="duotone" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold tracking-tight text-foreground">Personalización & Marca</h1>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 text-xs">
                Modo Standalone
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Configura el logo oficial para documentos, contratos, recibos y la identidad visual de Parcelia
            </p>
          </div>
        </div>

        <div className="page-toolbar-actions">
          <Button variant="outline" onClick={handleRestaurar} className="gap-2 border-border/70 hover:bg-muted">
            <ArrowCounterClockwise size={16} />
            Restaurar
          </Button>
          <Button onClick={handleGuardar} disabled={guardando} className="gap-2 modern-btn-primary px-5">
            {guardando ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Guardando...
              </span>
            ) : (
              <>
                <FloppyDisk size={18} weight="bold" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pestañas de Personalización */}
      <Tabs defaultValue="identidad" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-muted/60 p-1 rounded-xl h-auto border border-border/50">
          <TabsTrigger value="identidad" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg font-medium">
            <ImageIcon size={18} weight="duotone" />
            Logo & Identidad
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg font-medium">
            <Buildings size={18} weight="duotone" />
            Datos de la Empresa
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg font-medium">
            <FileText size={18} weight="duotone" />
            Vista de Documentos
          </TabsTrigger>
          <TabsTrigger value="apariencia" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg font-medium">
            <Sparkle size={18} weight="duotone" />
            Tema & Colores
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LOGO E IDENTIDAD */}
        <TabsContent value="identidad" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Carga de Logo */}
            <Card className="lg:col-span-5 border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon size={20} className="text-emerald-600" />
                  Logo Institucional
                </CardTitle>
                <CardDescription>
                  Este logotipo aparecerá en la cabecera, inicio de sesión y en todos los comprobantes impresos y contratos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors relative group">
                  {logoPreview ? (
                    <div className="space-y-4 text-center">
                      <div className="w-48 h-32 mx-auto rounded-xl bg-card border border-border/80 flex items-center justify-center p-3 shadow-inner overflow-hidden">
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-1.5 text-xs"
                        >
                          <UploadSimple size={14} />
                          Cambiar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleEliminarLogo}
                          className="gap-1.5 text-xs"
                        >
                          <Trash size={14} />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer space-y-3 text-center py-4"
                    >
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadSimple size={30} weight="duotone" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Haz clic para subir un logo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG o WebP (Máx. 2MB)</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                  <span>
                    <strong>Recomendación:</strong> Utiliza una imagen en formato PNG transparente o SVG horizontal para una nitidez óptima en documentos PDF.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Datos Principales */}
            <Card className="lg:col-span-7 border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <IdentificationBadge size={20} className="text-emerald-600" />
                  Nombres y Slogan Comercial
                </CardTitle>
                <CardDescription>
                  Define cómo se presentará la plataforma en pantallas y encabezados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombreEmpresa" className="text-sm font-medium">Nombre de la Empresa o Proyecto</Label>
                  <Input
                    id="nombreEmpresa"
                    value={formData.nombreEmpresa}
                    onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                    placeholder="Ej. Parcelia"
                    className="modern-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slogan" className="text-sm font-medium">Eslogan / Subtítulo</Label>
                  <Input
                    id="slogan"
                    value={formData.slogan}
                    onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                    placeholder="Ej. Sistema de Gestión & Parcelamientos"
                    className="modern-input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="monedaSimbolo" className="text-sm font-medium">Símbolo de Moneda</Label>
                    <Input
                      id="monedaSimbolo"
                      value={formData.monedaSimbolo}
                      onChange={(e) => setFormData({ ...formData, monedaSimbolo: e.target.value })}
                      placeholder="Q"
                      className="modern-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="monedaCodigo" className="text-sm font-medium">Código ISO Moneda</Label>
                    <Input
                      id="monedaCodigo"
                      value={formData.monedaCodigo}
                      onChange={(e) => setFormData({ ...formData, monedaCodigo: e.target.value })}
                      placeholder="GTQ"
                      className="modern-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: DATOS DE LA EMPRESA */}
        <TabsContent value="fiscal" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Buildings size={20} className="text-emerald-600" />
                Información Fiscal y de Contacto
              </CardTitle>
              <CardDescription>
                Estos datos se imprimirán en las cabeceras de boletas de pago, cotizaciones, liquidaciones y contratos oficiales.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="nit" className="text-sm font-medium flex items-center gap-1.5">
                  <IdentificationBadge size={16} className="text-emerald-600" />
                  Número de NIT / Registro Tributario
                </Label>
                <Input
                  id="nit"
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="1098472-9"
                  className="modern-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-sm font-medium flex items-center gap-1.5">
                  <Phone size={16} className="text-emerald-600" />
                  Teléfono de Atención
                </Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="(502) 2234-5678"
                  className="modern-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                  <Envelope size={16} className="text-emerald-600" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contacto@parcelia.gt"
                  className="modern-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sitioWeb" className="text-sm font-medium flex items-center gap-1.5">
                  <Globe size={16} className="text-emerald-600" />
                  Sitio Web Oficial
                </Label>
                <Input
                  id="sitioWeb"
                  value={formData.sitioWeb}
                  onChange={(e) => setFormData({ ...formData, sitioWeb: e.target.value })}
                  placeholder="www.parcelia.gt"
                  className="modern-input"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="direccion" className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin size={16} className="text-emerald-600" />
                  Dirección Principal / Sede Matriz
                </Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="6a Avenida 12-20, Zona 1, Ciudad de Guatemala"
                  className="modern-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: VISTA PREVIA DE DOCUMENTOS */}
        <TabsContent value="documentos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Editor de Textos de Documento */}
            <Card className="lg:col-span-5 border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  Leyendas y Textos de Documentos
                </CardTitle>
                <CardDescription>
                  Personaliza los textos legales que aparecerán al final de los contratos y recibos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="piePagina" className="text-sm font-medium">Pie de Página de Comprobantes</Label>
                  <Textarea
                    id="piePagina"
                    rows={3}
                    value={formData.piePaginaDocumentos}
                    onChange={(e) => setFormData({ ...formData, piePaginaDocumentos: e.target.value })}
                    placeholder="Texto al pie de boletas..."
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clausulas" className="text-sm font-medium">Cláusula General en Contratos</Label>
                  <Textarea
                    id="clausulas"
                    rows={5}
                    value={formData.clausulasContrato}
                    onChange={(e) => setFormData({ ...formData, clausulasContrato: e.target.value })}
                    placeholder="Cláusulas legales..."
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vista Previa Interactiva en Vivo */}
            <Card className="lg:col-span-7 border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye size={20} className="text-emerald-600" />
                    Vista Previa en Tiempo Real
                  </CardTitle>
                  <CardDescription>
                    Así lucirá el encabezado oficial de tus documentos y boletas impresas.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white">Vista Oficial</Badge>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-xl border border-gray-300 bg-white text-gray-900 shadow-md font-sans text-xs space-y-4">
                  {/* Encabezado del Documento */}
                  <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-3">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo Empresa"
                          className="h-14 max-w-[140px] object-contain"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                          {formData.nombreEmpresa.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h2 className="text-base font-bold text-emerald-950 uppercase tracking-tight">
                          {formData.nombreEmpresa || 'PARCELIA'}
                        </h2>
                        <p className="text-[11px] text-gray-500 font-medium">{formData.slogan}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">NIT: {formData.nit} · Tel: {formData.telefono}</p>
                        <p className="text-[10px] text-gray-500">{formData.direccion}</p>
                      </div>
                    </div>

                    <div className="text-right border-l border-gray-200 pl-4">
                      <div className="inline-block px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                        RECIBO / CONTRATO
                      </div>
                      <p className="text-[11px] font-mono font-bold text-gray-700 mt-1.5">No. 01300826-0042</p>
                      <p className="text-[10px] text-gray-500">{new Date().toLocaleDateString('es-GT', { dateStyle: 'long' })}</p>
                    </div>
                  </div>

                  {/* Cuerpo de Muestra */}
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><strong>Cliente:</strong> Carlos Roberto Mendoza Gómez</div>
                      <div><strong>DPI:</strong> 2987 12345 0101</div>
                      <div><strong>Operación:</strong> Contrato de Financiamiento / Empeño</div>
                      <div><strong>Monto:</strong> {formData.monedaSimbolo} 12,000.00</div>
                    </div>
                  </div>

                  {/* Cláusula y Pie */}
                  <div className="border-t border-gray-200 pt-3 space-y-2 text-[10px] text-gray-600">
                    <p className="italic">{formData.clausulasContrato}</p>
                    <div className="flex justify-between pt-6 text-center text-[10px]">
                      <div className="w-36 border-t border-gray-400 pt-1">Firma Cliente</div>
                      <div className="w-36 border-t border-gray-400 pt-1">Autorizado por {formData.nombreEmpresa}</div>
                    </div>
                    <p className="text-center text-[9px] text-gray-400 pt-2 border-t border-gray-100">
                      {formData.piePaginaDocumentos} · {formData.sitioWeb}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: APARIENCIA */}
        <TabsContent value="apariencia" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkle size={20} className="text-emerald-600" />
                Acentos de Color del Sistema
              </CardTitle>
              <CardDescription>
                Selecciona la variante de tono verde predominante para la interfaz de Parcelia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Opción 1: Verde Esmeralda */}
                <div
                  onClick={() => setFormData({ ...formData, temaColor: 'esmeralda' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.temaColor === 'esmeralda'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 shadow-sm" />
                    <div>
                      <p className="font-semibold text-sm">Verde Esmeralda</p>
                      <p className="text-xs text-muted-foreground">Clásico & Dinámico</p>
                    </div>
                  </div>
                  {formData.temaColor === 'esmeralda' && (
                    <Badge className="bg-emerald-600 text-white text-[10px] mt-1">Activo</Badge>
                  )}
                </div>

                {/* Opción 2: Verde Bosque */}
                <div
                  onClick={() => setFormData({ ...formData, temaColor: 'bosque' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.temaColor === 'bosque'
                      ? 'border-emerald-700 bg-emerald-700/10 shadow-md ring-2 ring-emerald-700/20'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-800 shadow-sm" />
                    <div>
                      <p className="font-semibold text-sm">Verde Jade Bosque</p>
                      <p className="text-xs text-muted-foreground">Sobrio & Corporativo</p>
                    </div>
                  </div>
                  {formData.temaColor === 'bosque' && (
                    <Badge className="bg-emerald-800 text-white text-[10px] mt-1">Activo</Badge>
                  )}
                </div>

                {/* Opción 3: Verde Menta */}
                <div
                  onClick={() => setFormData({ ...formData, temaColor: 'menta' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.temaColor === 'menta'
                      ? 'border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/20'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-teal-500 shadow-sm" />
                    <div>
                      <p className="font-semibold text-sm">Verde Menta</p>
                      <p className="text-xs text-muted-foreground">Fresco & Moderno</p>
                    </div>
                  </div>
                  {formData.temaColor === 'menta' && (
                    <Badge className="bg-teal-600 text-white text-[10px] mt-1">Activo</Badge>
                  )}
                </div>

                {/* Opción 4: Verde Oliva */}
                <div
                  onClick={() => setFormData({ ...formData, temaColor: 'oliva' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.temaColor === 'oliva'
                      ? 'border-lime-600 bg-lime-600/10 shadow-md ring-2 ring-lime-600/20'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-lime-700 shadow-sm" />
                    <div>
                      <p className="font-semibold text-sm">Verde Oliva</p>
                      <p className="text-xs text-muted-foreground">Tierra & Terrenos</p>
                    </div>
                  </div>
                  {formData.temaColor === 'oliva' && (
                    <Badge className="bg-lime-700 text-white text-[10px] mt-1">Activo</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
