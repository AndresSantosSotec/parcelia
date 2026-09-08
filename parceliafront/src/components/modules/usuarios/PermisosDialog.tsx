import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowCounterClockwise, FloppyDisk, Warning } from '@phosphor-icons/react'
import { permissionService, Permiso } from '@/lib/api'
import { toast } from 'sonner'
import { 
  MODULOS, 
  ACCIONES_POR_MODULO, 
  MODULO_LABELS, 
  ACCION_LABELS,
  Modulo 
} from '@/hooks/use-permissions'

// Permisos por defecto según el rol (copia de seguridad local)
const PERMISOS_POR_ROL: Record<string, Permiso[]> = {
  administrador: MODULOS.map(modulo => ({
    modulo,
    acciones: ACCIONES_POR_MODULO[modulo],
  })),
  cajero: [
    { modulo: 'dashboard', acciones: ['ver'] },
    { modulo: 'clientes', acciones: ['ver', 'crear'] },
    { modulo: 'creditos', acciones: ['ver', 'crear'] },
    { modulo: 'refrendos', acciones: ['ver', 'validar', 'calcular', 'procesar'] },
    { modulo: 'compras', acciones: ['ver', 'crear'] },
    { modulo: 'caja', acciones: ['abrir', 'cerrar', 'ver_movimientos'] },
    { modulo: 'prendas', acciones: ['ver'] },
    { modulo: 'gastos', acciones: ['ver', 'asignar_credito'] },
    { modulo: 'cobros', acciones: ['realizar', 'ver', 'imprimir_recibo'] },
    { modulo: 'recibos', acciones: ['ver', 'crear', 'imprimir'] },
    { modulo: 'historial', acciones: ['ver'] },
    { modulo: 'otros_gastos', acciones: ['ver', 'crear'] },
    { modulo: 'planes_interes', acciones: ['ver'] },
  ],
  tasador: [
    { modulo: 'dashboard', acciones: ['ver'] },
    { modulo: 'clientes', acciones: ['ver'] },
    { modulo: 'simulador', acciones: ['usar', 'imprimir', 'guardar'] },
    { modulo: 'prendas', acciones: ['ver'] },
    { modulo: 'ventas', acciones: ['ver', 'tasar'] },
    { modulo: 'compras', acciones: ['ver', 'crear'] },
    { modulo: 'planes_interes', acciones: ['ver'] },
    { modulo: 'historial', acciones: ['ver'] },
  ],
  vendedor: [
    { modulo: 'dashboard', acciones: ['ver'] },
    { modulo: 'clientes', acciones: ['ver', 'crear'] },
    { modulo: 'ventas', acciones: ['ver', 'vender', 'apartar', 'crear_plan_pago', 'aplicar_descuento'] },
    { modulo: 'compras', acciones: ['ver'] },
    { modulo: 'prendas', acciones: ['ver'] },
    { modulo: 'cotizaciones', acciones: ['ver', 'crear', 'editar'] },
    { modulo: 'caja', acciones: ['abrir', 'cerrar', 'ver_movimientos'] },
    { modulo: 'cobros', acciones: ['realizar', 'ver', 'imprimir_recibo'] },
    { modulo: 'recibos', acciones: ['ver', 'crear', 'imprimir'] },
    { modulo: 'historial', acciones: ['ver'] },
  ],
  supervisor: [
    { modulo: 'dashboard', acciones: ['ver'] },
    { modulo: 'clientes', acciones: ['ver'] },
    { modulo: 'refrendos', acciones: ['ver', 'validar', 'calcular', 'procesar'] },
    { modulo: 'creditos', acciones: ['ver', 'renovar'] },
    { modulo: 'compras', acciones: ['ver', 'crear', 'editar'] },
    { modulo: 'prendas', acciones: ['ver', 'cambiar_estado'] },
    { modulo: 'ventas', acciones: ['ver', 'modificar_precio', 'aplicar_descuento'] },
    { modulo: 'reportes', acciones: ['generar', 'exportar'] },
    { modulo: 'remates', acciones: ['ver'] },
    { modulo: 'caja', acciones: ['ver_movimientos'] },
    { modulo: 'categorias_productos', acciones: ['ver', 'crear', 'editar'] },
    { modulo: 'gastos', acciones: ['ver', 'crear', 'editar', 'asignar_credito'] },
    { modulo: 'cobros', acciones: ['realizar', 'ver', 'imprimir_recibo'] },
    { modulo: 'recibos', acciones: ['ver', 'crear', 'imprimir', 'anular'] },
    { modulo: 'historial', acciones: ['ver'] },
    { modulo: 'otros_gastos', acciones: ['ver', 'crear', 'anular'] },
    { modulo: 'cotizaciones', acciones: ['ver', 'crear', 'editar', 'eliminar', 'convertir'] },
    { modulo: 'planes_interes', acciones: ['ver'] },
    { modulo: 'transferencias', acciones: ['ver'] },
  ],
}

interface PermisosDialogProps {
  abierto: boolean
  onCerrar: () => void
  usuario: {
    id: string
    nombre: string
    rol: string
  } | null
  onActualizado?: () => void
  /** Si coincide con usuario.id, tras guardar se refresca la sesión (permisos en caliente). */
  currentSessionUserId?: string
  onPermisosSavedForCurrentUser?: () => void | Promise<void>
}

export function PermisosDialog({
  abierto,
  onCerrar,
  usuario,
  onActualizado,
  currentSessionUserId,
  onPermisosSavedForCurrentUser,
}: PermisosDialogProps) {
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [permisosOriginales, setPermisosOriginales] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [usandoLocal, setUsandoLocal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto && usuario) {
      cargarPermisos()
    }
  }, [abierto, usuario])

  const cargarPermisosLocales = () => {
    if (!usuario) return
    // Cargar permisos por defecto del rol desde la definición local
    const permisosRol = PERMISOS_POR_ROL[usuario.rol] || PERMISOS_POR_ROL['cajero']
    setPermisos(JSON.parse(JSON.stringify(permisosRol)))
    setPermisosOriginales(JSON.parse(JSON.stringify(permisosRol)))
    setUsandoLocal(true)
  }

  const cargarPermisos = async () => {
    if (!usuario) return
    setLoading(true)
    setError(null)
    setUsandoLocal(false)
    
    try {
      const response = await permissionService.getUserPermissions(usuario.id)
      if (response.success && response.data) {
        // Si hay permisos del servidor, usarlos
        if (response.data.length > 0) {
          setPermisos(response.data)
          setPermisosOriginales(JSON.parse(JSON.stringify(response.data)))
        } else {
          // Si no hay permisos asignados, cargar los por defecto del rol
          cargarPermisosLocales()
        }
      }
    } catch (error: any) {
      console.error('Error cargando permisos:', error)
      // Si hay error (ej: tabla no existe), usar permisos locales
      if (error.message?.includes('doesn\'t exist') || error.message?.includes('not found')) {
        setError('La tabla de permisos no está configurada. Se muestran los permisos por defecto del rol.')
        cargarPermisosLocales()
      } else {
        setError(error.message || 'Error al cargar permisos')
        cargarPermisosLocales()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAccion = (modulo: Modulo, accion: string) => {
    setPermisos(prev => {
      const newPermisos = [...prev]
      const moduloIndex = newPermisos.findIndex(p => p.modulo === modulo)
      
      if (moduloIndex >= 0) {
        const accionIndex = newPermisos[moduloIndex].acciones.indexOf(accion)
        if (accionIndex >= 0) {
          // Remover acción
          newPermisos[moduloIndex].acciones = newPermisos[moduloIndex].acciones.filter(a => a !== accion)
          // Si no quedan acciones, remover el módulo
          if (newPermisos[moduloIndex].acciones.length === 0) {
            newPermisos.splice(moduloIndex, 1)
          }
        } else {
          // Agregar acción
          newPermisos[moduloIndex].acciones.push(accion)
        }
      } else {
        // Agregar módulo con la acción
        newPermisos.push({ modulo, acciones: [accion] })
      }
      
      return newPermisos
    })
  }

  const handleToggleModulo = (modulo: Modulo) => {
    const accionesModulo = ACCIONES_POR_MODULO[modulo]
    const permisoModulo = permisos.find(p => p.modulo === modulo)
    const tieneTodasAcciones = permisoModulo?.acciones.length === accionesModulo.length

    setPermisos(prev => {
      const newPermisos = prev.filter(p => p.modulo !== modulo)
      
      if (!tieneTodasAcciones) {
        // Agregar todas las acciones
        newPermisos.push({ modulo, acciones: [...accionesModulo] })
      }
      
      return newPermisos
    })
  }

  const tieneAccion = (modulo: Modulo, accion: string): boolean => {
    const permisoModulo = permisos.find(p => p.modulo === modulo)
    return permisoModulo?.acciones.includes(accion) || false
  }

  const tieneModuloCompleto = (modulo: Modulo): boolean => {
    const permisoModulo = permisos.find(p => p.modulo === modulo)
    return permisoModulo?.acciones.length === ACCIONES_POR_MODULO[modulo].length
  }

  const tieneModuloParcial = (modulo: Modulo): boolean => {
    const permisoModulo = permisos.find(p => p.modulo === modulo)
    return (permisoModulo?.acciones.length || 0) > 0 && !tieneModuloCompleto(modulo)
  }

  const handleGuardar = async () => {
    if (!usuario) return
    
    // Si estamos usando permisos locales, solo mostrar mensaje informativo
    if (usandoLocal) {
      toast.info('Los permisos se guardarán cuando la base de datos esté configurada. Ejecuta las migraciones de Laravel.')
      onCerrar()
      return
    }
    
    setSaving(true)
    try {
      await permissionService.updateUserPermissions(usuario.id, permisos)
      toast.success('Permisos actualizados correctamente')
      if (
        currentSessionUserId &&
        onPermisosSavedForCurrentUser &&
        String(usuario.id) === String(currentSessionUserId)
      ) {
        await Promise.resolve(onPermisosSavedForCurrentUser())
      }
      onActualizado?.()
      onCerrar()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar permisos')
    } finally {
      setSaving(false)
    }
  }

  const handleResetear = async () => {
    if (!usuario) return
    
    // Si estamos usando permisos locales, simplemente restablecer localmente
    if (usandoLocal) {
      cargarPermisosLocales()
      toast.success('Permisos restablecidos a los valores por defecto del rol')
      return
    }
    
    setSaving(true)
    try {
      const response = await permissionService.resetToDefault(usuario.id)
      if (response.success && response.data) {
        setPermisos(response.data)
        setPermisosOriginales(JSON.parse(JSON.stringify(response.data)))
        toast.success('Permisos restablecidos a los valores por defecto')
        if (
          currentSessionUserId &&
          onPermisosSavedForCurrentUser &&
          String(usuario.id) === String(currentSessionUserId)
        ) {
          await Promise.resolve(onPermisosSavedForCurrentUser())
        }
      }
    } catch (error: any) {
      // Si falla, restablecer localmente
      cargarPermisosLocales()
      toast.info('Permisos restablecidos localmente')
    } finally {
      setSaving(false)
    }
  }

  const hayCambios = JSON.stringify(permisos) !== JSON.stringify(permisosOriginales)

  if (!usuario) return null

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gestión de Permisos</DialogTitle>
          <DialogDescription>
            Configurar permisos para <strong>{usuario.nombre}</strong> (Rol: {usuario.rol})
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
            <Warning size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Cargando permisos...
          </div>
        ) : (
          <Tabs defaultValue="modulos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modulos">Por Módulo</TabsTrigger>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
            </TabsList>

            <TabsContent value="modulos">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {MODULOS.map(modulo => (
                    <Card key={modulo}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`modulo-${modulo}`}
                              checked={tieneModuloCompleto(modulo)}
                              ref={(el) => {
                                if (el) {
                                  (el as any).indeterminate = tieneModuloParcial(modulo)
                                }
                              }}
                              onCheckedChange={() => handleToggleModulo(modulo)}
                            />
                            <Label htmlFor={`modulo-${modulo}`} className="font-semibold cursor-pointer">
                              {MODULO_LABELS[modulo]}
                            </Label>
                          </div>
                          <Badge variant="outline">
                            {permisos.find(p => p.modulo === modulo)?.acciones.length || 0}/{ACCIONES_POR_MODULO[modulo].length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="flex flex-wrap gap-3">
                          {ACCIONES_POR_MODULO[modulo].map(accion => (
                            <div key={accion} className="flex items-center gap-2">
                              <Checkbox
                                id={`${modulo}-${accion}`}
                                checked={tieneAccion(modulo, accion)}
                                onCheckedChange={() => handleToggleAccion(modulo, accion)}
                              />
                              <Label htmlFor={`${modulo}-${accion}`} className="text-sm cursor-pointer">
                                {ACCION_LABELS[accion] || accion}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="resumen">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {permisos.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No hay permisos asignados
                    </div>
                  ) : (
                    permisos.map(permiso => (
                      <div key={permiso.modulo} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{MODULO_LABELS[permiso.modulo as Modulo] || permiso.modulo}</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {permiso.acciones.map(accion => (
                            <Badge key={accion} variant="secondary" className="text-xs">
                              {ACCION_LABELS[accion] || accion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleResetear}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            <ArrowCounterClockwise size={16} />
            Restablecer por Defecto
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" onClick={onCerrar} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving || !hayCambios} className="flex-1 sm:flex-none">
              <FloppyDisk size={16} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
