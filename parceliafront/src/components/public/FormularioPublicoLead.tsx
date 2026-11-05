import React, { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { catalogoService, FincaPublica } from '@/services/catalogoService'
import {
  HouseLine,
  WhatsappLogo,
  PhoneCall,
  CheckCircle,
  Sparkle,
  ShieldCheck,
  Compass,
  LockKey,
} from '@phosphor-icons/react'

interface FormularioPublicoLeadProps {
  onIrACatalogo?: () => void
  onIrALogin?: () => void
}

export function FormularioPublicoLead({ onIrACatalogo, onIrALogin }: FormularioPublicoLeadProps) {
  const { config: empresaConfig } = useEmpresaConfig()

  // Detectar canal de red social desde la URL (?origen=facebook | instagram | tiktok | whatsapp)
  const canalOrigen = useMemo(() => {
    if (typeof window === 'undefined') return 'redes_sociales'
    const params = new URLSearchParams(window.location.search)
    return params.get('origen') || 'facebook'
  }, [])

  const [fincas, setFincas] = useState<FincaPublica[]>([])
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [fincaId, setFincaId] = useState('')
  const [departamento, setDepartamento] = useState('Guatemala')
  const [presupuesto, setPresupuesto] = useState('')
  const [medioContacto, setMedioContacto] = useState('whatsapp')
  const [mensaje, setMensaje] = useState('')
  const [honeypotBot, setHoneypotBot] = useState('') // 🛡️ Trampa Anti-Spam invisible
  const [enviando, setEnviando] = useState(false)
  const [enviadoExitoso, setEnviadoExitoso] = useState(false)

  useEffect(() => {
    catalogoService.getFincasPublicas()
      .then(data => setFincas(data))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreCompleto.trim() || !telefono.trim()) {
      toast.error('Por favor escribe tu nombre y tu número de teléfono.')
      return
    }

    setEnviando(true)
    try {
      await catalogoService.enviarProspectoWeb({
        nombre_completo: nombreCompleto.trim(),
        telefono: telefono.trim(),
        email: email.trim() || undefined,
        finca_id: fincaId ? Number(fincaId) : undefined,
        origen: canalOrigen,
        mensaje: `Campaña ${canalOrigen.toUpperCase()}. Preferencia: ${medioContacto.toUpperCase()}. Presupuesto: Q${presupuesto || 'Por definir'}. Zona: ${departamento}. Consulta: ${mensaje}`,
      })

      setEnviadoExitoso(true)
      toast.success('¡Solicitud recibida! Un asesor inmobiliario te atenderá en breve.')
    } catch {
      toast.error('Ocurrió un error al enviar tu información. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const handleAbrirWhatsAppDirecto = () => {
    const whatsappOficial = empresaConfig.telefono?.replace(/\D/g, '') || ''
    const texto = encodeURIComponent(
      `¡Hola ${empresaConfig.nombreEmpresa || 'Parcelia'}! Mi nombre es ${nombreCompleto.trim()}. Acabo de llenar el formulario desde ${canalOrigen.toUpperCase()} y deseo asesoría sobre lotes disponibles con facilidades de pago.`
    )
    if (whatsappOficial) {
      window.open(`https://wa.me/${whatsappOficial}?text=${texto}`, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      {/* NAVBAR PÚBLICO ULTRA LIMPIO */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {empresaConfig.logoUrl ? (
            <img src={empresaConfig.logoUrl} alt="Logo" className="h-9 w-auto max-w-[130px] object-contain rounded" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <HouseLine size={18} weight="bold" />
            </div>
          )}
          <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
            {empresaConfig.nombreEmpresa || 'Parcelia'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onIrACatalogo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onIrACatalogo}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 gap-1.5 h-8"
            >
              <Compass size={14} weight="bold" /> Ver Catálogo Completo
            </Button>
          )}

          {onIrALogin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onIrALogin}
              className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1 h-8"
            >
              <LockKey size={13} /> Asesores
            </Button>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL: FORMULARIO HIGH-CONVERSION */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Luz decorativa */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

          {!enviadoExitoso ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                  <Sparkle size={13} weight="fill" />
                  Asesoría Gratuita & Financiamiento Propio
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Encuentra Tu Terreno Ideal en Guatemala
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  Déjanos tus datos y un asesor te compartirá las opciones de terrenos con <strong>enganche desde Q500</strong> y cuotas mensuales hasta 10 años.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 🛡️ Trampa Honeypot invisible para Bots de Spam */}
                <input
                  type="text"
                  name="website_url_check"
                  value={honeypotBot}
                  onChange={e => setHoneypotBot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200">Nombre Completo *</label>
                    <Input
                      required
                      placeholder="Ej. Juan Carlos Morales"
                      value={nombreCompleto}
                      onChange={e => setNombreCompleto(e.target.value)}
                      className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200">Teléfono / WhatsApp *</label>
                      <Input
                        required
                        placeholder="Ej. 55443322"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                        className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200">Correo Electrónico (opcional)</label>
                      <Input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200">Proyecto de Interés</label>
                      <select
                        value={fincaId}
                        onChange={e => setFincaId(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-md border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- Ver todos los proyectos --</option>
                        {fincas.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.nombre} ({f.municipio})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200">Presupuesto Estimado (Q)</label>
                      <Input
                        type="number"
                        placeholder="Ej. 65000"
                        value={presupuesto}
                        onChange={e => setPresupuesto(e.target.value)}
                        className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200">¿Cómo prefieres ser contactado?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={medioContacto === 'whatsapp' ? 'default' : 'outline'}
                        onClick={() => setMedioContacto('whatsapp')}
                        className={`h-9 text-xs gap-1.5 ${
                          medioContacto === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'border-slate-700 bg-slate-950 text-slate-300'
                        }`}
                      >
                        <WhatsappLogo size={16} weight="fill" /> Por WhatsApp
                      </Button>
                      <Button
                        type="button"
                        variant={medioContacto === 'llamada' ? 'default' : 'outline'}
                        onClick={() => setMedioContacto('llamada')}
                        className={`h-9 text-xs gap-1.5 ${
                          medioContacto === 'llamada' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'border-slate-700 bg-slate-950 text-slate-300'
                        }`}
                      >
                        <PhoneCall size={16} weight="fill" /> Llamada Telefónica
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200">Consulta o Mensaje (opcional)</label>
                    <Input
                      placeholder="Ej. Me interesa conocer las opciones de pago a 5 años"
                      value={mensaje}
                      onChange={e => setMensaje(e.target.value)}
                      className="h-10 bg-slate-950 border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={enviando}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-sm shadow-lg gap-2 mt-2"
                >
                  <WhatsappLogo size={20} weight="fill" />
                  {enviando ? 'Enviando solicitud...' : 'Solicitar Información Inmediata'}
                </Button>

                <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Tus datos están 100% protegidos y no compartimos tu información.
                </p>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle size={36} weight="fill" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-white">¡Muchas Gracias, {nombreCompleto.split(' ')[0]}!</h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                  Tu solicitud ha sido asignada a un asesor inmobiliario. Te contactaremos hoy mismo por {medioContacto === 'whatsapp' ? 'WhatsApp' : 'llamada'}.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleAbrirWhatsAppDirecto}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-sm gap-2 shadow-lg"
                >
                  <WhatsappLogo size={20} weight="fill" />
                  Abrir Chat de WhatsApp Ahora
                </Button>

                {onIrACatalogo && (
                  <Button
                    variant="outline"
                    onClick={onIrACatalogo}
                    className="w-full h-10 border-slate-700 bg-slate-950 text-slate-300 text-xs gap-1.5 hover:text-white"
                  >
                    <Compass size={15} /> Explorar Catálogo de Lotes
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} {empresaConfig.nombreEmpresa || 'Parcelia'} · Terrenos Urbanizados en Guatemala
      </footer>
    </div>
  )
}

