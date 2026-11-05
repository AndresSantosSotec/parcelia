<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Finca;
use App\Models\Lote;
use App\Models\Prospecto;
use App\Models\PlanoLotificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicCatalogoController extends Controller
{
    /**
     * Listado público de fincas activas disponibles para comercialización.
     */
    public function index(Request $request): JsonResponse
    {
        $fincas = Finca::where(function ($q) {
                $q->where('activo', true)->orWhereNull('activo');
            })
            ->withCount([
                'parcelas as total_sectores',
            ])
            ->get()
            ->map(function ($finca) {
                // Métricas públicas de lotes en la finca
                $lotesStats = Lote::whereHas('parcela', function ($q) use ($finca) {
                    $q->where('finca_id', $finca->id);
                })->selectRaw("
                    COUNT(*) as total_lotes,
                    SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as lotes_disponibles,
                    MIN(CASE WHEN estado = 'disponible' THEN precio_venta ELSE NULL END) as precio_desde,
                    MAX(CASE WHEN estado = 'disponible' THEN precio_venta ELSE NULL END) as precio_hasta,
                    MIN(CASE WHEN estado = 'disponible' THEN area_m2 ELSE NULL END) as area_min_m2,
                    MAX(CASE WHEN estado = 'disponible' THEN area_m2 ELSE NULL END) as area_max_m2
                ")->first();

                // Intentar obtener plano / imagen
                $plano = PlanoLotificacion::where('finca_id', $finca->id)->first();

                return [
                    'id' => $finca->id,
                    'nombre' => $finca->nombre,
                    'departamento' => $finca->departamento ?? 'Guatemala',
                    'municipio' => $finca->municipio ?? '',
                    'direccion' => $finca->ubicacion ?? "{$finca->municipio}, {$finca->departamento}",
                    'ubicacion' => $finca->ubicacion ?? '',
                    'descripcion' => $finca->descripcion ?? "Proyecto de lotificación urbanizada en {$finca->municipio}, {$finca->departamento}.",
                    'total_sectores' => (int) ($finca->total_sectores ?? 0),
                    'total_lotes' => (int) ($lotesStats->total_lotes ?? 0),
                    'lotes_disponibles' => (int) ($lotesStats->lotes_disponibles ?? 0),
                    'precio_desde' => (float) ($lotesStats->precio_desde ?? 0),
                    'precio_hasta' => (float) ($lotesStats->precio_hasta ?? 0),
                    'area_min_m2' => (float) ($lotesStats->area_min_m2 ?? 0),
                    'area_max_m2' => (float) ($lotesStats->area_max_m2 ?? 0),
                    'tiene_plano' => !empty($plano?->imagen_path),
                ];
            });

        $empresa = \App\Helpers\EmpresaConfigHelper::getConfig();

        return response()->json([
            'success' => true,
            'data' => $fincas,
            'empresa' => [
                'nombre' => $empresa['nombreEmpresa'] ?? 'Parcelia',
                'slogan' => $empresa['slogan'] ?? 'Venta de Terrenos & Financiamiento Propio',
                'logo_url' => $empresa['logoUrl'] ?? null,
                'telefono' => $empresa['telefono'] ?? '',
                'whatsapp' => preg_replace('/\D/', '', $empresa['telefono'] ?? ''),
                'email' => $empresa['email'] ?? '',
                'direccion' => $empresa['direccion'] ?? 'Guatemala',
            ],
        ]);
    }

    /**
     * Detalle público de una finca con sus sectores y lotes (para el plano interactivo).
     */
    public function showFinca(int $id): JsonResponse
    {
        $finca = Finca::where(function ($q) {
                $q->where('activo', true)->orWhereNull('activo');
            })
            ->with(['parcelas' => function ($q) {
                $q->select('id', 'finca_id', 'nombre_identificador', 'tipo_parcela')
                  ->with(['lotes' => function ($lq) {
                      $lq->select(
                          'id',
                          'parcela_id',
                          'numero_lote',
                          'codigo_unico',
                          'area_m2',
                          'frente_metros',
                          'fondo_metros',
                          'precio_venta',
                          'precio_m2',
                          'estado',
                          'tipo_terreno',
                          'colindancias',
                          'token_publico'
                      )->orderBy('numero_lote');
                  }]);
            }])
            ->findOrFail($id);

        $plano = PlanoLotificacion::where('finca_id', $finca->id)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => [
                    'id' => $finca->id,
                    'nombre' => $finca->nombre,
                    'departamento' => $finca->departamento ?? 'Guatemala',
                    'municipio' => $finca->municipio ?? '',
                    'direccion' => $finca->ubicacion ?? "{$finca->municipio}, {$finca->departamento}",
                    'ubicacion' => $finca->ubicacion ?? '',
                ],
                'plano' => [
                    'tiene_imagen' => !empty($plano?->imagen_path),
                    'ancho' => $plano?->ancho_px,
                    'alto' => $plano?->alto_px,
                    'geometrias' => $plano?->geometrias ?? [],
                ],
                'sectores' => $finca->parcelas->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'nombre' => $p->nombre_identificador,
                        'tipo' => $p->tipo_parcela,
                        'lotes' => $p->lotes->map(function ($l) {
                            return [
                                'id' => $l->id,
                                'numero_lote' => $l->numero_lote,
                                'codigo_unico' => $l->codigo_unico,
                                'area_m2' => (float) $l->area_m2,
                                'frente_metros' => (float) $l->frente_metros,
                                'fondo_metros' => (float) $l->fondo_metros,
                                'precio_venta' => (float) $l->precio_venta,
                                'estado' => $l->estado, // disponible, apartado, vendido
                                'colindancias' => $l->colindancias,
                                'token_publico' => $l->token_publico,
                            ];
                        }),
                    ];
                }),
            ],
        ]);
    }

    /**
     * Registro público de un lead/prospecto interesado desde el catálogo web.
     */
    public function storeLead(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre_completo' => 'required|string|min:3|max:200',
            'telefono' => 'required|string|min:8|max:20',
            'email' => 'nullable|email|max:100',
            'finca_id' => 'nullable|exists:fincas,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'mensaje' => 'nullable|string|max:1000',
            'origen' => 'nullable|string|max:50',
        ]);

        $prospecto = Prospecto::create([
            'nombre_completo' => trim($validated['nombre_completo']),
            'telefono' => trim($validated['telefono']),
            'email' => isset($validated['email']) ? trim($validated['email']) : null,
            'finca_id' => $validated['finca_id'] ?? null,
            'lote_id' => $validated['lote_id'] ?? null,
            'estado' => 'nuevo',
            'origen' => $validated['origen'] ?? 'web_catalogo',
            'notas' => $validated['mensaje'] ?? 'Prospecto generado desde el catálogo público web.',
            'fecha_proximo_contacto' => now()->addDay()->toDateString(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '¡Gracias por tu interés! Un asesor se comunicará contigo en breve.',
            'data' => [
                'id' => $prospecto->id,
                'nombre_completo' => $prospecto->nombre_completo,
            ],
        ], 201);
    }

    /**
     * Formulario público seguro para captura de prospectos desde campañas en Redes Sociales (Facebook, Instagram, TikTok)
     * Incluye protección Anti-Bot Honeypot y asignación automática (Round-Robin) a asesores de venta.
     */
    public function formularioRedes(Request $request): JsonResponse
    {
        // 🛡️ 1. Protección Anti-Spam Honeypot (campo oculto invisible para humanos)
        if ($request->filled('empresa_seguridad_bot') || $request->filled('website_url_check')) {
            // Trampa de bot activada: responder 200 sin insertar basura en la BD
            return response()->json([
                'success' => true,
                'message' => 'Solicitud procesada correctamente.',
            ]);
        }

        $validated = $request->validate([
            'nombre_completo' => 'required|string|min:3|max:150',
            'telefono' => 'required|string|min:8|max:20',
            'email' => 'nullable|email|max:100',
            'finca_id' => 'nullable|exists:fincas,id',
            'departamento_interes' => 'nullable|string|max:100',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'red_social' => 'nullable|string|in:facebook,instagram,tiktok,whatsapp,google,otro',
            'medio_contacto_preferido' => 'nullable|string|in:whatsapp,llamada,correo',
            'mensaje' => 'nullable|string|max:600',
        ]);

        // 🎯 2. Asignación automática equitativa a un asesor activo
        $asesoresDisponibles = \App\Models\User::where('activo', true)
            ->whereIn('rol', ['vendedor', 'cajero', 'supervisor', 'administrador'])
            ->pluck('id')
            ->toArray();

        $asesorAsignadoId = null;
        if (!empty($asesoresDisponibles)) {
            // Seleccionar al asesor con menor cantidad de prospectos nuevos en los últimos 7 días
            $asesorAsignadoId = \App\Models\Prospecto::whereIn('asesor_id', $asesoresDisponibles)
                ->where('created_at', '>=', now()->subDays(7))
                ->selectRaw('asesor_id, count(*) as total')
                ->groupBy('asesor_id')
                ->orderBy('total', 'asc')
                ->pluck('asesor_id')
                ->first() ?? $asesoresDisponibles[array_rand($asesoresDisponibles)];
        }

        $canal = $validated['red_social'] ?? 'redes_sociales';
        $medio = $validated['medio_contacto_preferido'] ?? 'whatsapp';
        $notasAdicionales = "Captado desde campaña de " . strtoupper($canal) . ". Preferencia de contacto: " . strtoupper($medio);
        if (!empty($validated['mensaje'])) {
            $notasAdicionales .= "\nConsulta: " . trim($validated['mensaje']);
        }
        if (!empty($validated['departamento_interes'])) {
            $notasAdicionales .= "\nZona/Lugar de interés: " . trim($validated['departamento_interes']);
        }

        $prospecto = Prospecto::create([
            'nombre_completo' => trim($validated['nombre_completo']),
            'telefono' => trim($validated['telefono']),
            'email' => isset($validated['email']) ? trim($validated['email']) : null,
            'finca_id' => $validated['finca_id'] ?? null,
            'asesor_id' => $asesorAsignadoId,
            'estado' => 'nuevo',
            'origen' => $canal,
            'presupuesto_estimado' => !empty($validated['presupuesto_estimado']) ? (float) $validated['presupuesto_estimado'] : null,
            'notas' => $notasAdicionales,
            'fecha_proximo_contacto' => now()->toDateString(), // Atención urgente mismo día
        ]);

        return response()->json([
            'success' => true,
            'message' => '¡Tus datos han sido recibidos! Un asesor se comunicará contigo hoy mismo.',
            'data' => [
                'id' => $prospecto->id,
                'nombre' => $prospecto->nombre_completo,
            ],
        ], 201);
    }
}
