import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Chats, X, PaperPlaneRight, Robot, User } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import {
  buscarRespuestaLocal,
  contextoParaIA,
  corregirOrtografia,
  esContextoValido,
  mensajeFueraDeContexto,
  mensajeSinRespuesta,
  normalizarRol,
  saludoInicial,
  type RolChatbot,
} from '@/lib/chatbotParcelia'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

interface ChatbotHelperProps {
  rol?: string
}

export function ChatbotHelper({ rol }: ChatbotHelperProps) {
  const { config } = useEmpresaConfig()
  const empresa = config.nombreEmpresa || 'TerraCloud'
  const rolNorm: RolChatbot = normalizarRol(rol)

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoadingIA, setIsLoadingIA] = useState(false)
  const [intentosFallidos, setIntentosFallidos] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: saludoInicial(rolNorm, empresa),
      timestamp: new Date(),
    }])
  }, [rolNorm, empresa])

  const consultarIA = async (mensaje: string): Promise<string | null> => {
    try {
      setIsLoadingIA(true)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${apiBase}/chatbot/consultar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          mensaje,
          contexto: contextoParaIA(rolNorm),
          rol: rolNorm,
        }),
      })

      if (!response.ok) return null
      const data = await response.json()
      if (data.success && data.respuesta) return data.respuesta
      return null
    } catch {
      return null
    } finally {
      setIsLoadingIA(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoadingIA) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    const mensajeUsuario = input.trim()
    setInput('')

    const mensajeCorregido = corregirOrtografia(mensajeUsuario)

    if (!esContextoValido(mensajeCorregido)) {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: mensajeFueraDeContexto(empresa),
          timestamp: new Date(),
        }])
      }, 300)
      return
    }

    const respuestaIA = await consultarIA(mensajeCorregido)

    if (respuestaIA) {
      setIntentosFallidos(0)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: respuestaIA,
        timestamp: new Date(),
      }])
      return
      }

    setTimeout(() => {
      const answer = buscarRespuestaLocal(mensajeCorregido, rolNorm, empresa)
        if (answer) {
          setIntentosFallidos(0)
        setMessages((prev) => [...prev, {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: answer,
          timestamp: new Date(),
        }])
        return
      }

      const nuevoIntentos = intentosFallidos + 1
      setIntentosFallidos(nuevoIntentos >= 3 ? 0 : nuevoIntentos)
      setMessages((prev) => [...prev, {
            id: (Date.now() + 1).toString(),
            type: 'bot',
        content: mensajeSinRespuesta(mensajeUsuario, nuevoIntentos, rolNorm),
        timestamp: new Date(),
      }])
      }, 300)
  }

  useEffect(() => {
    const abrir = () => setIsOpen(true)
    window.addEventListener('terracloud-chat', abrir)
    return () => window.removeEventListener('terracloud-chat', abrir)
  }, [])

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="max-lg:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-[100]"
          size="icon"
        >
          <Chats className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed inset-x-2 top-16 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:inset-auto lg:bottom-6 lg:right-6 lg:top-auto lg:w-96 lg:h-[600px] lg:max-h-[min(600px,calc(100dvh-2rem))] shadow-2xl z-[100] flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-300">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Robot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Asistente {empresa}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                    Terrenos · {rolNorm}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-2', msg.type === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.type === 'bot' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Robot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 max-w-[80%]',
                    msg.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.type === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoadingIA && handleSend()}
                placeholder={isLoadingIA ? 'Consultando…' : 'Pregunta sobre lotes, ventas o caja…'}
                className="flex-1"
                disabled={isLoadingIA}
              />
              <Button onClick={handleSend} size="icon" disabled={isLoadingIA}>
                {isLoadingIA ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PaperPlaneRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {isLoadingIA ? 'Procesando…' : 'Enter para enviar · solo temas de terrenos'}
            </p>
          </div>
        </Card>
      )}
    </>
  )
}
