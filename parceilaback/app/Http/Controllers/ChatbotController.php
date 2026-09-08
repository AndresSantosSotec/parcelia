<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ChatbotController extends Controller
{
    private $groqApiKey;
    private $groqModel = 'llama-3.1-8b-instant'; // Rápido y gratis

    public function __construct()
    {
        $this->groqApiKey = env('GROQ_API_KEY');
    }

    /**
     * Procesar consulta del chatbot usando GROQ AI
     */
    public function consultar(Request $request)
    {
        $request->validate([
            'mensaje' => 'required|string|max:500',
            'contexto' => 'required|string|max:50000',
            'rol' => 'nullable|string|max:50',
        ]);

        $mensaje = $request->input('mensaje');
        $contextoSistema = $request->input('contexto');
        $rol = strtolower((string) $request->input('rol', $request->user()?->rol ?? 'cajero'));

        if ($this->esPreguntaFueraDeContexto($mensaje)) {
            return response()->json([
                'success' => true,
                'respuesta' => '😅 Solo puedo ayudarte con TerraCloud: fincas, lotes, negociaciones, caja y cobros de terreno. ¿En qué te ayudo?',
                'fuente' => 'filtro'
            ]);
        }

        if (!config('empenos.enabled') && $this->preguntaDeEmpeno($mensaje)) {
            return response()->json([
                'success' => true,
                'respuesta' => "Este sistema opera venta de terrenos (fincas, lotes y negociaciones). El módulo de empeños, prendas y remates no está disponible en la operación actual.\n\n¿Te ayudo a registrar un lote, armar una venta o cobrar una cuota?",
                'fuente' => 'filtro'
            ]);
        }

        $cacheKey = 'chatbot_parcelia_v1_'.md5($mensaje.'|'.$rol);

        if (Cache::has($cacheKey)) {
            return response()->json([
                'success' => true,
                'respuesta' => Cache::get($cacheKey),
                'fuente' => 'cache'
            ]);
        }

        try {
            // Llamar a GROQ API
            /** @var \Illuminate\Http\Client\Response $response */
            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->groqApiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => $this->groqModel,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $this->construirPromptSistema($contextoSistema, $rol)
                        ],
                        [
                            'role' => 'user',
                            'content' => $mensaje
                        ]
                    ],
                    'temperature' => 0.2, // MUY IMPORTANTE: Baja temperatura = menos invención
                    'max_tokens' => 600,
                    'top_p' => 0.9,
                    'frequency_penalty' => 0.3,
                    'presence_penalty' => 0.1,
                ]);

            if ($response->failed()) {
                Log::error('GROQ API Error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Error al conectar con el servicio de IA',
                    'fallback' => true
                ], 500);
            }

            $data = $response->json();
            $respuestaIA = $data['choices'][0]['message']['content'] ?? null;

            if (!$respuestaIA) {
                throw new \Exception('Respuesta vacía de GROQ');
            }

            // Guardar en cache por 1 hora
            Cache::put($cacheKey, $respuestaIA, 3600);

            // Log para monitoreo
            Log::info('Chatbot IA - Consulta procesada', [
                'mensaje_length' => strlen($mensaje),
                'respuesta_length' => strlen($respuestaIA),
                'tokens_usados' => $data['usage']['total_tokens'] ?? 0
            ]);

            return response()->json([
                'success' => true,
                'respuesta' => $respuestaIA,
                'fuente' => 'ia',
                'tokens_usados' => $data['usage']['total_tokens'] ?? 0
            ]);

        } catch (\Exception $e) {
            Log::error('Chatbot IA - Error', [
                'mensaje' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar consulta',
                'fallback' => true,
                'mensaje_error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Detectar preguntas fuera de contexto OBVIAS
     */
    private function esPreguntaFueraDeContexto(string $mensaje): bool
    {
        $mensajeLower = mb_strtolower($mensaje);

        // Palabras clave DEFINITIVAMENTE fuera de contexto
        $palabrasInvalidas = [
            'receta', 'cocina', 'comida', 'pizza', 'pasta', 'postre',
            'futbol', 'fútbol', 'mundial', 'partido', 'gol', 'barcelona', 'madrid',
            'película', 'pelicula', 'serie', 'netflix', 'actor', 'actriz',
            'youtube', 'tiktok', 'instagram', 'facebook', 'snapchat',
            'clima', 'tiempo', 'temperatura', 'lluvia',
            'chiste', 'broma', 'gracioso', 'meme',
            'juego', 'videojuego', 'gta', 'minecraft', 'fortnite', 'valorant',
            'medicina', 'enfermedad', 'doctor', 'hospital', 'pastilla',
            'política', 'presidente', 'elecciones', 'diputado',
            'religión', 'dios', 'biblia', 'iglesia',
            'amor', 'novia', 'novio', 'cita', 'beso',
            'matemática', 'física', 'química', 'tarea', 'examen'
        ];

        foreach ($palabrasInvalidas as $palabra) {
            if (strpos($mensajeLower, $palabra) !== false) {
                Log::info('Chatbot - Pregunta rechazada (fuera de contexto)', [
                    'mensaje' => $mensaje,
                    'palabra_detectada' => $palabra
                ]);
                return true;
            }
        }

        return false;
    }

    private function preguntaDeEmpeno(string $mensaje): bool
    {
        $mensajeLower = mb_strtolower($mensaje);
        foreach (['empeño', 'empeno', 'prendario', 'prenda', 'refrendo', 'remate', 'digiprenda'] as $palabra) {
            if (str_contains($mensajeLower, $palabra)) {
                return true;
            }
        }

        return false;
    }

    private function alcanceRol(string $rol): string
    {
        return match ($rol) {
            'superadmin' => 'SOPORTE: auditoría (bitácora, errores HTTP, laravel.log), generador de formularios y toda la operación inmobiliaria. Es quien depura caídas.',
            'administrador' => 'Puede todo lo inmobiliario: editar/desactivar fincas, rescindir, tasas y mora, usuarios. NO ve auditoría ni el generador de formularios (eso es de superadmin de soporte).',
            'vendedor' => 'Puede crear/editar fincas y lotes (no desactivar), armar negociaciones y cobrar. NO puede rescindir ni configurar mora.',
            'cajero' => 'Puede caja, cobros TER y ver negociaciones. NO arma contratos ni edita inventario.',
            'tasador' => 'En esta operación usa el simulador de cuotas. No hay tasación de prendas.',
            'supervisor' => 'Consulta y reportes. No desactiva fincas ni rescinde salvo autorización.',
            default => 'Limitarse a lo que un cajero o asesor puede hacer; si duda, remitir al administrador.',
        };
    }

    /**
     * Prompt TerraCloud / Parcelia (venta de terrenos). No enseñar empeños.
     */
    private function construirPromptSistema(string $contextoSistema, string $rol): string
    {
        $alcance = $this->alcanceRol($rol);

        return <<<PROMPT
Eres el asistente oficial de TerraCloud (Parcelia): administración y venta de terrenos en Guatemala.

DOMINIO:
Finca → Parcela → Lote → Negociación → Plan de pagos → Pago de terreno.
NO es un sistema de empeños. No expliques créditos prendarios, prendas, remates ni refrendos.
Si preguntan por empeño: di que no está en operación y redirige a lotes/negociaciones.

REGLAS DE NEGOCIO:
- Crédito: negociación → enganche → plan → lote vendido.
- Contado: en_negociacion → vendido → cobro caja → pagado.
- Reserva: lote reservado; hay que rescindir antes de vender a otro.
- Mora de terrenos: % diario sobre capital vencido O monto fijo por día + gracia. Snapshot al crear la venta.
- Prelación de cobro: mora → interés → cargos → capital.
- Un recibo serie TER por cobro. Caja debe estar abierta.
- No desactivar finca con lotes reservados, en negociación, vendidos o pagados.
- Un lote ocupado no se vende dos veces.
- Rescisión: admin; el vendedor recibe 403.

ROL DEL USUARIO: {$rol}
ALCANCE: {$alcance}
Responde según ese rol. Si pide algo que su rol no puede, dilo claro y indica que lo haga un administrador.
Si el rol es superadmin: es soporte. Puede usar Auditoría (bitácora, errores HTTP, laravel.log) y Formularios (campos dinámicos) para depurar caídas. El administrador operativo NO tiene esas pantallas.

CONOCIMIENTO ENVIADO POR LA APP:
{$contextoSistema}

REGLAS DE RESPUESTA:
1. Solo TerraCloud (terrenos, caja, compradores, reportes inmobiliarios).
2. No inventes módulos ni tasas.
3. Máximo 15 líneas. Pasos numerados. Español.
4. No menciones que eres una IA ni a Digiprenda.
5. Ortografía incorrecta: entiende la intención y responde sin corregir al usuario.
6. Si no está en el conocimiento: "No tengo ese detalle. ¿Te ayudo con vender un lote, cobrar o abrir caja?"
PROMPT;
    }

    /**
     * Obtener estadísticas de uso del chatbot
     */
    public function estadisticas()
    {
        // Aquí podrías agregar métricas de uso
        return response()->json([
            'total_consultas_hoy' => Cache::get('chatbot_consultas_hoy', 0),
            'limite_diario' => 14400, // GROQ free tier
            'disponible' => true
        ]);
    }
}
