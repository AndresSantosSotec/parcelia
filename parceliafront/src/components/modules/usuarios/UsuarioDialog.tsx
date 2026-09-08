import { useState, useEffect } from 'react'
import { Usuario, ROLES_DEFAULT, Sucursal } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { sucursalService } from '@/lib/api'
import { useKV } from '@/hooks/use-kv'
import { Camera, Building2, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UsuarioDialogProps {
  abierto: boolean
  onCerrar: () => void
  onGuardar: (usuario: Partial<Usuario> & { password?: string }, fotoFile?: File) => Promise<void>
  usuario?: Usuario
}

export function UsuarioDialog({ abierto, onCerrar, onGuardar, usuario }: UsuarioDialogProps) {
  const [session] = useKV<any>('user-session', null)
  // Trigger compartido para refrescar sucursales cuando cambian en otros módulos
  const [refrescarSucursalesTrigger] = useKV<number>('refrescar-sucursales-trigger', 0)
  const userRole = session?.userData?.rol
  const canAssignBranch = userRole === 'superadmin' || userRole === 'administrador'
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cargandoSucursales, setCargandoSucursales] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    rol: 'cajero' as Usuario['rol'],
    activo: true,
    sucursal_id: undefined as number | string | undefined,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | undefined>(undefined)
  const [fotoPreview, setFotoPreview] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (usuario) {
      setFormData({
        name: usuario.nombre,
        username: usuario.email.split('@')[0] || '',
        email: usuario.email,
        password: '',
        password_confirmation: '',
        rol: usuario.rol,
        activo: usuario.activo,
        sucursal_id: usuario.sucursal_id,
      })
      setFotoPreview(usuario.foto_url)
      setFotoFile(undefined)
    } else {
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        rol: 'cajero',
        activo: true,
        sucursal_id: undefined,
      })
      setFotoPreview(undefined)
      setFotoFile(undefined)
    }
    setErrores({})
  }, [usuario, abierto])

  // Cargar sucursales disponibles (para superadmin y administrador)
  useEffect(() => {
    if (abierto && canAssignBranch) {
      const cargarSucursales = async () => {
        setCargandoSucursales(true)
        try {
          const response = await sucursalService.getActivas()

          // Verificar si la respuesta tiene el formato correcto
          if (response && Array.isArray(response)) {
            setSucursales(response as any)
          } else if (response && response.data && Array.isArray(response.data)) {
            setSucursales(response.data as any)
          } else {
            setSucursales([])
          }
        } catch (error) {
          console.error('Error cargando sucursales:', error)
          setSucursales([])
        } finally {
          setCargandoSucursales(false)
        }
      }
      cargarSucursales()
    }
  }, [abierto, canAssignBranch, refrescarSucursalesTrigger])

  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {}

    if (!formData.name?.trim()) nuevosErrores.name = 'Requerido'
    if (!formData.username?.trim()) nuevosErrores.username = 'Requerido'
    if (!formData.email?.trim()) {
      nuevosErrores.email = 'Requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'Email inválido'
    }

    if (!usuario) {
      if (!formData.password?.trim()) {
        nuevosErrores.password = 'Requerido'
      } else {
        if (formData.password.length < 8) {
          nuevosErrores.password = 'Mínimo 8 caracteres'
        } else if (!/[A-Z]/.test(formData.password)) {
          nuevosErrores.password = 'Debe incluir una mayúscula'
        } else if (!/[a-z]/.test(formData.password)) {
          nuevosErrores.password = 'Debe incluir una minúscula'
        } else if (!/[0-9]/.test(formData.password)) {
          nuevosErrores.password = 'Debe incluir un número'
        } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
          nuevosErrores.password = 'Debe incluir un símbolo (!@#$...)'
        }
      }

      if (formData.password !== formData.password_confirmation) {
        nuevosErrores.password_confirmation = 'Las contraseñas no coinciden'
      }
    } else if (formData.password) {
      if (formData.password.length < 8) {
        nuevosErrores.password = 'Mínimo 8 caracteres'
      } else if (!/[A-Z]/.test(formData.password)) {
        nuevosErrores.password = 'Debe incluir una mayúscula'
      } else if (!/[a-z]/.test(formData.password)) {
        nuevosErrores.password = 'Debe incluir una minúscula'
      } else if (!/[0-9]/.test(formData.password)) {
        nuevosErrores.password = 'Debe incluir un número'
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        nuevosErrores.password = 'Debe incluir un símbolo (!@#$...)'
      }
    }

    // Nota: La sucursal es obligatoria para roles que no son superadmin/administrador
    const rolPermiteSinSucursal = ['superadmin', 'administrador'].includes(formData.rol)
    if (canAssignBranch && !rolPermiteSinSucursal && !formData.sucursal_id) {
      nuevosErrores.sucursal_id = 'La sucursal es obligatoria para este rol'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return

    setLoading(true)
    try {
      const usuarioData: any = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        rol: formData.rol,
        activo: formData.activo,
      }

      // 🏢 Solo superadmin y administrador pueden asignar sucursal
      if (canAssignBranch) {
        usuarioData.sucursal_id = formData.sucursal_id || null
      }

      if (formData.password) {
        usuarioData.password = formData.password
        if (!usuario) {
          usuarioData.password_confirmation = formData.password_confirmation
        }
      }

      await onGuardar(usuarioData, fotoFile)
      onCerrar()
    } catch (error) {
      console.error('Error guardando usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">

            {/* Foto de Perfil */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('dialog-foto-upload')?.click()}>
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={fotoPreview} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-muted">
                    {formData.name ? formData.name.substring(0, 2).toUpperCase() : <User />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
                </div>
              </div>
              <Input
                id="dialog-foto-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setFotoFile(file)
                    setFotoPreview(URL.createObjectURL(file))
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Click para cambiar foto</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Información Personal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errores.name ? 'border-destructive' : ''}
                  />
                  {errores.name && <p className="text-xs text-destructive">{errores.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Usuario *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={errores.username ? 'border-destructive' : ''}
                    placeholder="nombre_usuario"
                  />
                  {errores.username && <p className="text-xs text-destructive">{errores.username}</p>}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errores.email ? 'border-destructive' : ''}
                    placeholder="correo@ejemplo.com"
                  />
                  {errores.email && <p className="text-xs text-destructive">{errores.email}</p>}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Credenciales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {usuario ? 'Nueva Contraseña' : 'Contraseña *'}
                    {usuario && <span className="text-muted-foreground text-xs ml-2">(dejar vacío para no cambiar)</span>}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={errores.password ? 'border-destructive' : ''}
                  />
                  {errores.password && <p className="text-xs text-destructive">{errores.password}</p>}
                </div>

                {!usuario && (
                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirmar Contraseña *</Label>
                    <Input
                      id="password_confirmation"
                      type="password"
                      value={formData.password_confirmation}
                      onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                      className={errores.password_confirmation ? 'border-destructive' : ''}
                    />
                    {errores.password_confirmation && (
                      <p className="text-xs text-destructive">{errores.password_confirmation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Configuración</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(value) => {
                      const nuevoRol = value as Usuario['rol']
                      const esRolAdmin = ['superadmin', 'administrador'].includes(nuevoRol)
                      setFormData({ 
                        ...formData, 
                        rol: nuevoRol,
                        // Si cambia a un rol que requiere sucursal y no tiene una, limpiar para forzar selección
                        sucursal_id: !esRolAdmin && !formData.sucursal_id ? undefined : formData.sucursal_id
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES_DEFAULT
                        .filter(rol => userRole === 'superadmin' || rol.nombre !== 'superadmin')
                        .map((rol) => (
                          <SelectItem key={rol.id} value={rol.nombre}>
                            {rol.descripcion}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 🏢 Selector de Sucursal - Visible para SuperAdmin y Administrador */}
                {canAssignBranch && (() => {
                  const rolPermiteSinSucursal = ['superadmin', 'administrador'].includes(formData.rol)
                  return (
                  <div className="space-y-2">
                    <Label htmlFor="sucursal_id" className="flex items-center gap-2">
                      <Building2 size={16} />
                      Sucursal {rolPermiteSinSucursal ? '(Opcional)' : '*'}
                      {cargandoSucursales && <span className="text-xs text-muted-foreground">(Cargando...)</span>}
                    </Label>
                    {sucursales.length === 0 && !cargandoSucursales ? (
                      <div className="p-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
                        ⚠️ No hay sucursales disponibles.{rolPermiteSinSucursal 
                          ? ' El usuario tendrá acceso a todas las sucursales.' 
                          : ' Debe crear una sucursal primero para asignar este rol.'}
                      </div>
                    ) : (
                      <>
                        <Select
                          value={formData.sucursal_id?.toString() || (rolPermiteSinSucursal ? 'todas' : '')}
                          onValueChange={(value) => setFormData({ ...formData, sucursal_id: value === 'todas' ? undefined : parseInt(value) })}
                          disabled={cargandoSucursales}
                        >
                          <SelectTrigger className={errores.sucursal_id ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Selecciona una sucursal" />
                          </SelectTrigger>
                          <SelectContent>
                            {rolPermiteSinSucursal && (
                              <SelectItem value="todas">
                                🌍 Sin sucursal (puede ver todas)
                              </SelectItem>
                            )}
                            {sucursales.map((sucursal) => (
                              <SelectItem key={sucursal.id} value={sucursal.id}>
                                {sucursal.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errores.sucursal_id && (
                          <p className="text-xs text-destructive">{errores.sucursal_id}</p>
                        )}
                        {!errores.sucursal_id && (
                          <p className="text-xs text-muted-foreground">
                            {formData.sucursal_id
                              ? 'El usuario solo verá datos de esta sucursal'
                              : rolPermiteSinSucursal
                                ? 'Sin sucursal asignada - el usuario verá TODAS las sucursales'
                                : 'Debe seleccionar una sucursal para este rol'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  )
                })()}

                <div className="space-y-2 flex items-center">
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="activo"
                      checked={formData.activo}
                      onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                    />
                    <Label htmlFor="activo" className="cursor-pointer">
                      Usuario Activo
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : usuario ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

