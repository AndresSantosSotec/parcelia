import React, { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* NAVBAR PÚBLICO — APPLE FROSTED GLASS */}
      <header className="sticky top-0 z-40 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {empresaConfig.logoUrl ? (
            <img src={empresaConfig.logoUrl} alt="Logo" className="h-9 w-auto max-w-[130px] object-contain rounded-xl" />
          ) : (
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
              <HouseLine size={18} weight="bold" />
            </div>
          )}
          <div>
            <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white tracking-tight block leading-none">
              {empresaConfig.nombreEmpresa || 'Parcelia'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">
              Asesoría & Financiamiento Directo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onIrACatalogo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onIrACatalogo}
              className="rounded-full text-xs border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 gap-1.5 h-9 px-4 font-medium shadow-2xs"
            >
              <Compass size={15} weight="duotone" className="text-emerald-600" /> Ver Catálogo
            </Button>
          )}

          {onIrALogin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onIrALogin}
              className="rounded-full text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white gap-1 h-9 px-3"
            >
              <LockKey size={13} /> Acceso
            </Button>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL: FORMULARIO APPLE CUPERTINO CARD */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4 relative">
        <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-gradient-to-tr from-emerald-400/15 via-teal-300/10 to-transparent rounded-full blur-3xl" />

        <div className="max-w-xl w-full bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_rgb(0,0,0,0.06)] relative z-10 overflow-hidden">
          {!enviadoExitoso ? (
            <div className="space-y-6">
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                  <Sparkle size={13} weight="fill" className="text-emerald-500" />
                  Asesoría Gratuita & Financiamiento Propio
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                  Encuentra Tu Terreno Ideal en Guatemala
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Déjanos tus datos y un asesor te compartirá las opciones de terrenos con <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">enganche desde Q500</strong> y cuotas mensuales de hasta 10 años.
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

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">Nombre Completo *</label>
                    <Input
                      required
                      placeholder="Ej. Juan Carlos Morales"
                      value={nombreCompleto}
                      onChange={e => setNombreCompleto(e.target.value)}
                      className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">Teléfono / WhatsApp *</label>
                      <Input
                        required
                        placeholder="Ej. 5544-3322"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                        className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">Correo Electrónico (opcional)</label>
                      <Input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">Proyecto de Interés</label>
                      <select
                        aria-label="Proyecto de Interés"
                        value={fincaId}
                        onChange={e => setFincaId(e.target.value)}
                        className="w-full h-11 px-3.5 text-sm rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all"
                      >
                        <option value="">Todos los proyectos</option>
                        {fincas.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.nombre} ({f.municipio})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">Presupuesto Estimado (Q)</label>
                      <Input
                        type="number"
                        placeholder="Ej. 65000"
                        value={presupuesto}
                        onChange={e => setPresupuesto(e.target.value)}
                        className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15 tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Selector segmentado estilo iOS / macOS */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">¿Cómo prefieres ser contactado?</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.05]">
                      <button
                        type="button"
                        onClick={() => setMedioContacto('whatsapp')}
                        className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          medioContacto === 'whatsapp'
                            ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <WhatsappLogo size={16} weight="fill" /> Por WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setMedioContacto('llamada')}
                        className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          medioContacto === 'llamada'
                            ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <PhoneCall size={16} weight="fill" /> Llamada Telefónica
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5">Consulta o Mensaje (opcional)</label>
                    <Input
                      placeholder="Ej. Me interesa conocer las opciones de pago a 5 años"
                      value={mensaje}
                      onChange={e => setMensaje(e.target.value)}
                      className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border-black/[0.08] dark:border-white/[0.1] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={enviando}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-[0_8px_20px_rgba(16,185,129,0.3)] gap-2 mt-2 transition-all active:scale-[0.99]"
                >
                  <WhatsappLogo size={20} weight="fill" />
                  {enviando ? 'Enviando solicitud...' : 'Solicitar Información Inmediata'}
                </Button>

                <p className="text-[11px] text-center text-zinc-400 flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck size={15} weight="fill" className="text-emerald-500" />
                  Tus datos están 100% protegidos y no compartimos tu información.
                </p>
              </form>
            </div>
          ) : (
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle size={36} weight="fill" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  ¡Muchas Gracias, {nombreCompleto.split(' ')[0]}!
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Tu solicitud ha sido asignada a un asesor inmobiliario. Te contactaremos hoy mismo por {medioContacto === 'whatsapp' ? 'WhatsApp' : 'llamada telefónica'}.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  onClick={handleAbrirWhatsAppDirecto}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.3)]"
                >
                  <WhatsappLogo size={20} weight="fill" />
                  Abrir Chat de WhatsApp Ahora
                </Button>

                {onIrACatalogo && (
                  <Button
                    variant="outline"
                    onClick={onIrACatalogo}
                    className="w-full h-11 rounded-2xl border-black/[0.08] dark:border-white/[0.1] bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium gap-1.5"
                  >
                    <Compass size={16} /> Explorar Catálogo de Lotes
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 py-5 px-4 text-center text-[11px] text-zinc-400">
        © {new Date().getFullYear()} {empresaConfig.nombreEmpresa || 'Parcelia'} · Terrenos Urbanizados en Guatemala
      </footer>
    </div>
  )
}
