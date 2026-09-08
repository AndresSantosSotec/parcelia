"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { User, ShieldCheck, Key, UserCircle, Buildings, IdentificationCard, EnvelopeSimple, Camera } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authService, userService } from "@/lib/api"
import { cn } from "@/lib/utils"

// Schema de validación para cambio de password
const passwordSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
})

interface ProfileModuleProps {
    user: {
        id: string
        nombre: string
        username: string
        email: string
        rol: string
        activo: boolean
        foto_url?: string
    }
}

export function ProfileModule({ user }: ProfileModuleProps) {
    const [activeTab, setActiveTab] = useState("general")
    const [loading, setLoading] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // Handler para subir foto
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validación simple frontend
        if (!file.type.startsWith('image/')) {
            toast.error('El archivo debe ser una imagen')
            return
        }

        setUploadingPhoto(true)
        try {
            const response = await userService.uploadPhoto(user.id, file)
            if (response.success) {
                toast.success('Foto de perfil actualizada')
                // Recargar para ver cambios
                window.location.reload()
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al subir la foto')
        } finally {
            setUploadingPhoto(false)
        }
    }

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
    })

    const onSubmitPassword = async (data: z.infer<typeof passwordSchema>) => {
        setLoading(true)
        try {
            const response = await authService.changePassword(
                data.currentPassword,
                data.newPassword,
                data.confirmPassword
            )

            if (response.success) {
                toast.success("Contraseña actualizada correctamente")
                reset()
            } else {
                toast.error(response.message || "Error al actualizar contraseña")
            }
        } catch (error: any) {
            toast.error(error.message || "Ocurrió un error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container max-w-5xl mx-auto py-8 space-y-8 animate-fade-in-up">
            {/* Header de Perfil */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 border border-border/50 backdrop-blur-md shadow-lg">
                <div className="relative group cursor-pointer" onClick={() => !uploadingPhoto && document.getElementById('photo-upload')?.click()}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative w-24 h-24 rounded-full bg-card flex items-center justify-center border-4 border-background shadow-xl overflow-hidden">
                        {user.foto_url ? (
                            <img src={user.foto_url} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                            <UserCircle className="w-full h-full text-muted-foreground/50" weight="light" />
                        )}

                        {/* Overlay upload */}
                        <div className={cn("absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300", uploadingPhoto ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                            {uploadingPhoto ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Camera className="text-white w-8 h-8" weight="duotone" />
                            )}
                        </div>
                    </div>
                    <input
                        id="photo-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                    />
                </div>

                <div className="flex-1 text-center md:text-left space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary/80">
                        {user.nombre}
                    </h1>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <User className="w-4 h-4" />
                        {user.username}
                        <span className="mx-2 text-border">|</span>
                        <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                            {user.rol}
                        </span>
                    </p>
                </div>
            </div>

            <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
                        Información General
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
                        Seguridad y Cuenta
                    </TabsTrigger>
                </TabsList>

                {/* Tab Información General */}
                <TabsContent value="general" className="mt-0 space-y-6 animate-fade-in-up">
                    <Card className="modern-card border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <IdentificationCard className="w-5 h-5 text-primary" />
                                Datos Personales
                            </CardTitle>
                            <CardDescription>
                                Información básica de tu cuenta de usuario. Contacta al administrador para modificar estos datos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Nombre Completo</Label>
                                <div className="font-medium text-lg p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3">
                                    <User size={18} className="text-primary/70" />
                                    {user.nombre}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Correo Electrónico</Label>
                                <div className="font-medium text-lg p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3">
                                    <EnvelopeSimple size={18} className="text-primary/70" />
                                    {user.email}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Rol de Usuario</Label>
                                <div className="font-medium text-lg p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3">
                                    <ShieldCheck size={18} className="text-primary/70" />
                                    <span className="capitalize">{user.rol}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Estado de Cuenta</Label>
                                <div className="font-medium text-lg p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3">
                                    <div className={cn("w-2.5 h-2.5 rounded-full", user.activo ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                                    {user.activo ? "Activa" : "Inactiva"}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab Seguridad */}
                <TabsContent value="security" className="mt-0 space-y-6 animate-fade-in-up">
                    <Card className="modern-card border-none shadow-lg max-w-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5 text-primary" />
                                Cambiar Contraseña
                            </CardTitle>
                            <CardDescription>
                                Asegura tu cuenta utilizando una contraseña fuerte. Se recomienda incluir números y caracteres especiales.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="modern-input bg-background/50"
                                        {...register("currentPassword")}
                                    />
                                    {errors.currentPassword && (
                                        <p className="text-sm text-destructive font-medium animate-slide-in-right">{errors.currentPassword.message}</p>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            className="modern-input bg-background/50"
                                            {...register("newPassword")}
                                        />
                                        {errors.newPassword && (
                                            <p className="text-sm text-destructive font-medium animate-slide-in-right">{errors.newPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            className="modern-input bg-background/50"
                                            {...register("confirmPassword")}
                                        />
                                        {errors.confirmPassword && (
                                            <p className="text-sm text-destructive font-medium animate-slide-in-right">{errors.confirmPassword.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        type="submit"
                                        className="modern-btn-primary min-w-[140px]"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Guardando...
                                            </div>
                                        ) : (
                                            "Actualizar Contraseña"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
