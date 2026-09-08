import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, User, Tag, CurrencyCircleDollar, Warning, UserPlus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { clienteService, categoriaProductoService } from '@/lib/api'
import { compraService } from '@/services/compraService'
import { ClienteDialog } from '../clientes/ClienteDialog'
import type { Cliente } from '@/lib/types'
import { MapPickerField, type GeoCoords } from '@/components/ui/MapPickerField'

// Tipos para campos dinámicos de categoría
interface CamposFormulario {
    marca: boolean
    modelo: boolean
    numero_serie: boolean
    condicion_fisica: boolean
}

interface CampoDinamico {
    nombre: string
    label: string
    tipo: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'mapa'
    requerido: boolean
    opciones?: string[]
    placeholder?: string
    min?: number
    max?: number
    step?: number
}

interface Categoria {
    id: number
    codigo: string
    nombre: string
    campos_formulario?: CamposFormulario | null
    campos_adicionales?: CampoDinamico[] | null
    campos_dinamicos?: CampoDinamico[] | null  // Alias para compatibilidad
}

interface NuevaCompraProps {
    onVolver: () => void
    onCompraRegistrada: () => void
}

export function NuevaCompra({ onVolver, onCompraRegistrada }: NuevaCompraProps) {
    const [loading, setLoading] = useState(false)
    const [clientes, setClientes] = useState<any[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [modalCliente, setModalCliente] = useState(false)
    const [camposDinamicos, setCamposDinamicos] = useState<Record<string, any>>({})
    const [busquedaCliente, setBusquedaCliente] = useState('')

    // Form State
    const [formData, setFormData] = useState({
        cliente_id: 'consumidor_final',
        categoria_producto_id: '',
        descripcion: '',
        marca: '',
        modelo: '',
        serie: '',
        color: '',
        condicion: 'buena',
        valor_tasacion: '',
        monto_pagado: '',
        precio_venta: '',
        metodo_pago: 'efectivo',
        observaciones: ''
    })

    // Obtener categoría seleccionada
    const categoriaSeleccionada = useMemo(() => {
        return categorias.find(c => c.id.toString() === formData.categoria_producto_id)
    }, [categorias, formData.categoria_producto_id])

    // Configuración de campos base según categoría
    const camposFormulario = useMemo((): CamposFormulario => {
        const defaultCampos: CamposFormulario = {
            marca: true,
            modelo: true,
            numero_serie: true,
            condicion_fisica: true,
        }

        if (!categoriaSeleccionada?.campos_formulario) {
            return defaultCampos
        }

        return { ...defaultCampos, ...categoriaSeleccionada.campos_formulario }
    }, [categoriaSeleccionada])

    // Campos adicionales dinámicos de la categoría
    const camposAdicionales = useMemo((): CampoDinamico[] => {
        // Soportar ambos nombres de campo
        return categoriaSeleccionada?.campos_adicionales ||
            categoriaSeleccionada?.campos_dinamicos ||
            []
    }, [categoriaSeleccionada])

    // Filtrar clientes por búsqueda
    const clientesFiltrados = useMemo(() => {
        if (!busquedaCliente.trim()) return clientes

        const busqueda = busquedaCliente.toLowerCase()
        return clientes.filter(c => {
            const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.toLowerCase()
            const documento = (c.dpi || '').toLowerCase()
            return nombre.includes(busqueda) || documento.includes(busqueda)
        })
    }, [clientes, busquedaCliente])

    // Cliente actualmente seleccionado
    const clienteSeleccionado = useMemo(() => {
        if (!formData.cliente_id) return null
        return clientes.find(c => c.id.toString() === formData.cliente_id)
    }, [clientes, formData.cliente_id])

    useEffect(() => {
        cargarDatos()
    }, [])

    // Resetear campos dinámicos cuando cambia la categoría
    useEffect(() => {
        setCamposDinamicos({})
    }, [formData.categoria_producto_id])

    const cargarDatos = async () => {
        try {
            const [resClientes, resCategorias] = await Promise.all([
                clienteService.getActivos(),
                categoriaProductoService.getActivas()
            ])

            if (resClientes.success) {
                setClientes(resClientes.data || [])
            }

            if (resCategorias.success) {
                const catData = (resCategorias.data as any)?.data || resCategorias.data || []
                setCategorias(Array.isArray(catData) ? catData : [])
            }
        } catch (error) {
            toast.error('Error al cargar catálogos')
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCampoDinamicoChange = (nombre: string, valor: any) => {
        setCamposDinamicos(prev => ({ ...prev, [nombre]: valor }))
    }

    const handleClienteCreado = (nuevoCliente: Cliente) => {
        setClientes(prev => [...prev, nuevoCliente])
        setFormData(prev => ({ ...prev, cliente_id: nuevoCliente.id?.toString() || '' }))
        setModalCliente(false)
        toast.success('Cliente creado exitosamente')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validaciones básicas
        if (!formData.categoria_producto_id || !formData.descripcion || !formData.monto_pagado || !formData.precio_venta) {
            toast.error('Por favor complete todos los campos obligatorios')
            return
        }

        // Validar campos dinámicos requeridos
        for (const campo of camposAdicionales) {
            if (campo.requerido && !camposDinamicos[campo.nombre]) {
                toast.error(`El campo "${campo.label}" es requerido`)
                return
            }
        }

        try {
            setLoading(true)
            const data = {
                ...formData,
                cliente_id: formData.cliente_id && formData.cliente_id !== 'consumidor_final' ? Number(formData.cliente_id) : null,
                categoria_producto_id: Number(formData.categoria_producto_id),
                valor_tasacion: Number(formData.monto_pagado), // Ya no se pide "Valor de tasación", se iguala al monto pagado automáticamente.
                monto_pagado: Number(formData.monto_pagado),
                precio_venta: Number(formData.precio_venta),
                campos_dinamicos: Object.keys(camposDinamicos).length > 0 ? camposDinamicos : undefined
            }

            const response = await compraService.registrarCompra(data as any)

            toast.success('Compra registrada exitosamente. El producto ya está en el inventario.')
            onCompraRegistrada()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar la compra')
        } finally {
            setLoading(false)
        }
    }

    // Renderizar campo dinámico
    const renderCampoDinamico = (campo: CampoDinamico) => {
        const valor = camposDinamicos[campo.nombre] || ''

        switch (campo.tipo) {
            case 'text':
                return (
                    <div key={campo.nombre} className="space-y-2">
                        <Label htmlFor={campo.nombre}>
                            {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                            id={campo.nombre}
                            placeholder={campo.placeholder || `Ingresa ${campo.label.toLowerCase()}`}
                            value={valor}
                            onChange={(e) => handleCampoDinamicoChange(campo.nombre, e.target.value)}
                        />
                    </div>
                )

            case 'number':
                return (
                    <div key={campo.nombre} className="space-y-2">
                        <Label htmlFor={campo.nombre}>
                            {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                            id={campo.nombre}
                            type="number"
                            placeholder={campo.placeholder || `Ingresa ${campo.label.toLowerCase()}`}
                            value={valor}
                            min={campo.min}
                            max={campo.max}
                            step={campo.step || 1}
                            onChange={(e) => handleCampoDinamicoChange(campo.nombre, e.target.value ? Number(e.target.value) : '')}
                        />
                    </div>
                )

            case 'select':
                return (
                    <div key={campo.nombre} className="space-y-2">
                        <Label htmlFor={campo.nombre}>
                            {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
                        </Label>
                        <Select
                            value={valor || ""}
                            onValueChange={(v) => handleCampoDinamicoChange(campo.nombre, v)}
                        >
                            <SelectTrigger id={campo.nombre}>
                                <SelectValue placeholder={`Selecciona ${campo.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {campo.opciones?.map((opcion) => (
                                    <SelectItem key={opcion} value={opcion}>
                                        {opcion}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )

            case 'checkbox':
                return (
                    <div key={campo.nombre} className="flex items-center space-x-2 py-2">
                        <Checkbox
                            id={campo.nombre}
                            checked={valor === true}
                            onCheckedChange={(checked) => handleCampoDinamicoChange(campo.nombre, checked)}
                        />
                        <Label htmlFor={campo.nombre} className="cursor-pointer">
                            {campo.label}
                        </Label>
                    </div>
                )

            case 'textarea':
                return (
                    <div key={campo.nombre} className="space-y-2 md:col-span-2">
                        <Label htmlFor={campo.nombre}>
                            {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
                        </Label>
                        <Textarea
                            id={campo.nombre}
                            placeholder={campo.placeholder || `Ingresa ${campo.label.toLowerCase()}`}
                            value={valor}
                            onChange={(e) => handleCampoDinamicoChange(campo.nombre, e.target.value)}
                            rows={3}
                        />
                    </div>
                )

            case 'date':
                return (
                    <div key={campo.nombre} className="space-y-2">
                        <Label htmlFor={campo.nombre}>
                            {campo.label} {campo.requerido && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                            id={campo.nombre}
                            type="date"
                            value={valor}
                            onChange={(e) => handleCampoDinamicoChange(campo.nombre, e.target.value)}
                        />
                    </div>
                )

            case 'mapa':
                return (
                    <MapPickerField
                        key={campo.nombre}
                        label={campo.label}
                        requerido={campo.requerido}
                        value={valor as GeoCoords | null}
                        onChange={(coords) => handleCampoDinamicoChange(campo.nombre, coords)}
                    />
                )

            default:
                return null
        }
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información del Vendedor */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User size={20} />
                                Información del Vendedor (Cliente)
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setModalCliente(true)}
                            >
                                <UserPlus size={16} className="mr-2" />
                                Nuevo Cliente
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cliente_id">Seleccionar Cliente (Opcional)</Label>
                            <Select value={formData.cliente_id} onValueChange={(v) => handleSelectChange('cliente_id', v)}>
                                <SelectTrigger className="h-auto min-h-[2.5rem]">
                                    <SelectValue placeholder="Seleccionar... (Dejar vacío para Consumidor Final)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="px-2 pb-2">
                                        <Input
                                            placeholder="Buscar cliente..."
                                            value={busquedaCliente}
                                            onChange={(e) => setBusquedaCliente(e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <SelectItem value="consumidor_final">Consumidor Final (No registrado)</SelectItem>
                                    {clientesFiltrados.length === 0 ? (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                            No se encontraron clientes
                                        </div>
                                    ) : (
                                        clientesFiltrados.map(c => {
                                            const nombreCompleto = `${c.nombres || ''} ${c.apellidos || ''}`.trim()
                                            const dpi = c.dpi || 'N/A'
                                            return (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {nombreCompleto ? `${nombreCompleto} - DPI: ${dpi}` : `DPI: ${dpi}`}
                                                </SelectItem>
                                            )
                                        })
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="metodo_pago">Método de Pago*</Label>
                            <Select value={formData.metodo_pago} onValueChange={(v) => handleSelectChange('metodo_pago', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="efectivo">Efectivo (Egreso de Caja)</SelectItem>
                                    <SelectItem value="transferencia">Transferencia</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="mixto">Mixto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalles del Producto */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag size={20} />
                            Detalles del Producto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="categoria_producto_id">Categoría*</Label>
                                <Select
                                    value={formData.categoria_producto_id}
                                    onValueChange={(v) => handleSelectChange('categoria_producto_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descripcion">Descripción General*</Label>
                                <Input
                                    id="descripcion"
                                    name="descripcion"
                                    placeholder="Ej: Laptop HP 15'"
                                    value={formData.descripcion}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Campos base dinámicos según categoría */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {camposFormulario.marca && (
                                <div className="space-y-2">
                                    <Label htmlFor="marca">Marca</Label>
                                    <Input
                                        id="marca"
                                        name="marca"
                                        placeholder="Ej: HP, Samsung..."
                                        value={formData.marca}
                                        onChange={handleChange}
                                    />
                                </div>
                            )}

                            {camposFormulario.modelo && (
                                <div className="space-y-2">
                                    <Label htmlFor="modelo">Modelo</Label>
                                    <Input
                                        id="modelo"
                                        name="modelo"
                                        placeholder="Modelo del producto"
                                        value={formData.modelo}
                                        onChange={handleChange}
                                    />
                                </div>
                            )}

                            {camposFormulario.numero_serie && (
                                <div className="space-y-2">
                                    <Label htmlFor="serie">Número de Serie</Label>
                                    <Input
                                        id="serie"
                                        name="serie"
                                        placeholder="Serial del producto"
                                        value={formData.serie}
                                        onChange={handleChange}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <Input
                                    id="color"
                                    name="color"
                                    placeholder="Color del producto"
                                    value={formData.color}
                                    onChange={handleChange}
                                />
                            </div>

                            {camposFormulario.condicion_fisica && (
                                <div className="space-y-2">
                                    <Label htmlFor="condicion">Condición Física</Label>
                                    <Select value={formData.condicion} onValueChange={(v) => handleSelectChange('condicion', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="excelente">Excelente</SelectItem>
                                            <SelectItem value="muy_buena">Muy Buena</SelectItem>
                                            <SelectItem value="buena">Buena</SelectItem>
                                            <SelectItem value="regular">Regular</SelectItem>
                                            <SelectItem value="mala">Mala</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Campos adicionales dinámicos de la categoría */}
                        {camposAdicionales.length > 0 && (
                            <div className="space-y-4 border-t pt-4">
                                <h4 className="font-medium text-sm text-muted-foreground">Información Adicional</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {camposAdicionales.map((campo: CampoDinamico) => renderCampoDinamico(campo))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Valores de la Compra */}
                <Card className="border-primary/50 shadow-md">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2">
                            <CurrencyCircleDollar size={20} />
                            Valores de la Compra
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="monto_pagado">Monto a Pagar al Cliente*</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Q</span>
                                    <Input
                                        id="monto_pagado"
                                        name="monto_pagado"
                                        type="number"
                                        step="0.01"
                                        className="pl-8 text-lg font-bold text-destructive"
                                        placeholder="0.00"
                                        value={formData.monto_pagado}
                                        onChange={handleChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {formData.metodo_pago === 'efectivo'
                                        ? '⚠️ Egreso de caja'
                                        : 'No afecta caja'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="precio_venta">Precio de Venta Sugerido*</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Q</span>
                                    <Input
                                        id="precio_venta"
                                        name="precio_venta"
                                        type="number"
                                        step="0.01"
                                        className="pl-8 text-lg font-bold text-primary"
                                        placeholder="0.00"
                                        value={formData.precio_venta}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {formData.precio_venta && formData.monto_pagado && (
                            <div className="bg-primary/5 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Margen de Ganancia</p>
                                        <p className="text-2xl font-bold text-primary">
                                            Q {(Number(formData.precio_venta) - Number(formData.monto_pagado)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Porcentaje</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {((Number(formData.precio_venta) - Number(formData.monto_pagado)) / Number(formData.monto_pagado) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Textarea
                                id="observaciones"
                                name="observaciones"
                                rows={3}
                                placeholder="Notas adicionales..."
                                value={formData.observaciones}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Aviso y Botón */}
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-6">
                        <div className="flex gap-3 text-amber-800 mb-4">
                            <Warning size={24} className="shrink-0" />
                            <div className="text-sm">
                                <p className="font-bold mb-1">Aviso Importante</p>
                                <p>Al confirmar esta operación, el producto ingresará inmediatamente al inventario con estado "En Venta". Esta operación NO genera un contrato de empeño.</p>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                            {loading ? 'Procesando...' : 'Confirmar y Registrar Compra'}
                        </Button>
                    </CardContent>
                </Card>
            </form>

            {/* Modal de Nuevo Cliente */}
            <ClienteDialog
                abierto={modalCliente}
                onCerrar={() => setModalCliente(false)}
                onGuardar={handleClienteCreado}
            />
        </div>
    )
}
