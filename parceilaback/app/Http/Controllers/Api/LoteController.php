<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lote;
use App\Models\LoteImagen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LoteController extends Controller
{
    public function index(Request $request)
    {
        $query = Lote::with(['parcela.finca', 'servicios', 'imagenes', 'negociacionActiva.comprador', 'vendedor'])
            ->visiblePara($request->user());

        if ($request->filled('estado') && $request->estado !== 'todos') {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('parcela_id')) {
            $query->where('parcela_id', $request->parcela_id);
        }

        if ($request->filled('finca_id')) {
            $query->whereHas('parcela', function ($q) use ($request) {
                $q->where('finca_id', $request->finca_id);
            });
        }

        if ($request->filled('vendedor_id') && $request->user()?->hasRole(['superadmin', 'administrador'])) {
            $query->where('vendedor_id', (int) $request->vendedor_id);
        }

        if ($request->filled('busqueda')) {
            $busqueda = $request->busqueda;
            $query->where(function ($q) use ($busqueda) {
                $q->where('numero_lote', 'like', "%{$busqueda}%")
                  ->orWhere('codigo_unico', 'like', "%{$busqueda}%");
            });
        }

        $perPage = min(200, max(10, (int) $request->input('per_page', 100)));
        $paginator = $query->orderBy('numero_lote')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => array_values($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function disponibles(Request $request)
    {
        $lotes = Lote::with(['parcela.finca', 'servicios', 'vendedor'])
            ->visiblePara($request->user())
            ->where('estado', 'disponible')
            ->orderBy('codigo_unico')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $lotes,
        ]);
    }

    public function show(Request $request, $id)
    {
        $lote = Lote::with([
            'parcela.finca',
            'servicios',
            'imagenes',
            'vendedor',
            'negociaciones.comprador',
            'negociaciones.planPagos',
            'negociaciones.pagos'
        ])->findOrFail($id);

        if (! $lote->esVisiblePara($request->user())) {
            return response()->json(['success' => false, 'message' => 'No tiene acceso a este lote.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $lote,
        ]);
    }

    public function update(Request $request, $id)
    {
        $lote = Lote::findOrFail($id);

        if (! $lote->esVisiblePara($request->user())) {
            return response()->json(['success' => false, 'message' => 'No tiene acceso a este lote.'], 403);
        }

        $validated = $request->validate([
            'numero_lote' => 'nullable|string|max:50|unique:lotes,numero_lote,'.$lote->id.',id,parcela_id,'.$lote->parcela_id,
            'tipo_terreno' => 'nullable|string|max:80',
            'area_m2' => 'nullable|numeric|min:0.01',
            'frente_metros' => 'nullable|numeric|min:0.01',
            'fondo_metros' => 'nullable|numeric|min:0.01',
            'colindancias' => 'nullable|string',
            'precio_venta' => 'nullable|numeric|min:0.01',
            'precio_m2' => 'nullable|numeric|min:0',
            'observaciones' => 'nullable|string',
            'latitud' => 'nullable|numeric|between:-90,90|required_with:longitud',
            'longitud' => 'nullable|numeric|between:-180,180|required_with:latitud',
            'altitud' => 'nullable|numeric',
            'precision_metros' => 'nullable|numeric|min:0',
            'referencia_geo' => 'nullable|string|max:255',
            'publicado' => 'nullable|boolean',
            'vendedor_id' => 'nullable|integer|exists:users,id',
        ]);

        if (isset($request['estado'])) {
            return response()->json([
                'success' => false,
                'message' => 'El estado del lote no se cambia desde el formulario. Sigue el flujo de negociación, enganche y pagos.',
            ], 422);
        }

        $user = $request->user();
        $esAdmin = $user && in_array($user->rol, ['superadmin', 'administrador'], true);
        if (! $esAdmin) {
            unset($validated['vendedor_id']);
        }

        $estadoService = app(\App\Services\Inmobiliario\LoteEstadoService::class);
        $camposInventario = ['numero_lote', 'area_m2', 'frente_metros', 'fondo_metros', 'precio_venta', 'precio_m2', 'tipo_terreno', 'colindancias'];
        $tocaInventario = collect($camposInventario)->contains(fn ($campo) => array_key_exists($campo, $validated));
        $puedeAjustar = $request->user()?->hasPermission('negociaciones', 'ajustar_condiciones');

        if ($tocaInventario && ! $estadoService->puedeEditarInventario($lote) && ! $puedeAjustar) {
            $validated = collect($validated)
                ->except($camposInventario)
                ->all();
        }

        if (!empty($validated['frente_metros']) && !empty($validated['fondo_metros']) && empty($request->input('area_m2'))) {
            $validated['area_m2'] = round((float) $validated['frente_metros'] * (float) $validated['fondo_metros'], 2);
        }

        if ($validated === []) {
            return response()->json([
                'success' => false,
                'message' => 'El lote ya está en operación. Precio o medidas posteriores requieren permiso especial.',
            ], 403);
        }

        if (empty($lote->token_publico)) {
            $validated['token_publico'] = (string) \Illuminate\Support\Str::ulid();
        }

        $lote->update($validated);

        return response()->json([
            'success' => true,
            'data' => $lote->fresh(['imagenes', 'parcela.finca', 'vendedor']),
            'area_aproximada_m2' => (!empty($lote->frente_metros) && !empty($lote->fondo_metros))
                ? round((float) $lote->frente_metros * (float) $lote->fondo_metros, 2)
                : null,
            'message' => 'Lote actualizado correctamente',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $lote = Lote::findOrFail($id);

        if (! $lote->esVisiblePara($request->user())) {
            return response()->json(['success' => false, 'message' => 'No tiene acceso a este lote.'], 403);
        }

        $estadoService = app(\App\Services\Inmobiliario\LoteEstadoService::class);

        if (! $estadoService->puedeEliminar($lote)) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden eliminar lotes disponibles o cancelados, sin negociación activa.',
            ], 422);
        }

        $lote->delete();

        return response()->json([
            'success' => true,
            'message' => 'Lote eliminado del inventario.',
        ]);
    }

    public function publico(string $token)
    {
        $lote = Lote::with(['imagenes', 'servicios', 'parcela.finca'])
            ->where('token_publico', $token)
            ->where('publicado', true)
            ->first();

        if (! $lote) {
            return response()->json([
                'success' => false,
                'message' => 'Este terreno no está publicado o el enlace no es válido.',
            ], 404);
        }

        $finca = $lote->parcela?->finca;
        $disponible = $lote->estado === 'disponible';

        return response()->json([
            'success' => true,
            'data' => [
                'numero_lote' => $lote->numero_lote,
                'codigo_unico' => $lote->codigo_unico,
                'area_m2' => $lote->area_m2,
                'frente_metros' => $lote->frente_metros,
                'fondo_metros' => $lote->fondo_metros,
                'colindancias' => $lote->colindancias,
                'tipo_terreno' => $lote->tipo_terreno,
                'precio_venta' => $lote->precio_venta,
                'precio_m2' => $lote->precio_m2,
                'observaciones' => $lote->observaciones,
                'latitud' => $lote->latitud,
                'longitud' => $lote->longitud,
                'altitud' => $lote->altitud,
                'referencia_geo' => $lote->referencia_geo,
                'disponible' => $disponible,
                'estado_comercial' => match ($lote->estado) {
                    'disponible' => 'Disponible',
                    'reservado' => 'Reservado',
                    'en_negociacion' => 'En negociación',
                    'vendido', 'pagado' => 'Ya no disponible',
                    default => 'No disponible',
                },
                'proyecto' => [
                    'nombre' => $finca?->nombre,
                    'municipio' => $finca?->municipio,
                    'departamento' => $finca?->departamento,
                    'ubicacion' => $finca?->ubicacion,
                ],
                'parcela' => $lote->parcela?->nombre_identificador,
                'servicios' => $lote->servicios->map(fn ($s) => [
                    'nombre' => $s->nombre_servicio,
                    'estado' => $s->estado,
                ])->values(),
                'imagenes' => $lote->imagenes->map(fn ($img) => [
                    'id' => $img->id,
                    'url' => $img->url_publica,
                    'descripcion' => $img->descripcion,
                    'es_principal' => (bool) $img->es_principal,
                ])->values(),
            ],
        ]);
    }

    public function storeServicio(Request $request, $loteId)
    {
        $lote = Lote::findOrFail($loteId);
        $estadoService = app(\App\Services\Inmobiliario\LoteEstadoService::class);

        if (!$estadoService->puedeEditarInventario($lote)) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden modificar servicios ni plusvalía de un lote ya comprometido o vendido. El precio de la venta queda histórico.',
            ], 422);
        }

        $validated = $request->validate([
            'catalogo_servicio_id' => 'nullable|exists:catalogo_servicios_inmobiliarios,id',
            'nombre_servicio' => 'required_without:catalogo_servicio_id|string|max:100',
            'estado' => 'required|in:disponible,en_proceso,no_disponible',
            'costo_adicional' => 'nullable|numeric|min:0',
            'descripcion' => 'nullable|string',
        ]);

        if (!empty($validated['catalogo_servicio_id'])) {
            $duplicado = $lote->servicios()->where('catalogo_servicio_id', $validated['catalogo_servicio_id'])->exists();
            if ($duplicado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ese servicio ya está asignado al lote.',
                ], 422);
            }
            $cat = \App\Models\CatalogoServicioInmobiliario::findOrFail($validated['catalogo_servicio_id']);
            $validated['nombre_servicio'] = $cat->nombre;
            if (!isset($validated['costo_adicional'])) {
                $validated['costo_adicional'] = $cat->costo_default;
            }
        } else {
            $duplicadoNombre = $lote->servicios()
                ->where('nombre_servicio', $validated['nombre_servicio'])
                ->exists();
            if ($duplicadoNombre) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ese servicio ya está asignado al lote.',
                ], 422);
            }
        }

        $servicio = $lote->servicios()->create($validated);

        $costo = (float) ($validated['costo_adicional'] ?? 0);
        if ($costo > 0) {
            if ($lote->precio_base === null) {
                $lote->precio_base = $lote->precio_venta;
            }
            $lote->plusvalia_servicios = round((float) $lote->plusvalia_servicios + $costo, 2);
            $lote->precio_venta = round((float) ($lote->precio_base ?? 0) + (float) $lote->plusvalia_servicios, 2);
            $lote->save();
        }

        return response()->json([
            'success' => true,
            'data' => $servicio,
            'lote' => $lote->fresh('servicios'),
            'message' => 'Servicio asignado. El precio de inventario incluye la plusvalía.',
        ]);
    }

    public function storeImagen(Request $request, $loteId)
    {
        try {
            $lote = Lote::findOrFail($loteId);
            $validated = $request->validate([
                'imagen' => 'required_without:archivo|nullable|string',
                'archivo' => 'required_without:imagen|nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
                'descripcion' => 'nullable|string|max:255',
                'es_principal' => 'nullable|boolean',
            ]);

            $relativePath = $request->hasFile('archivo')
                ? $request->file('archivo')->store('lotes/'.$lote->id, 'public')
                : $this->guardarImagenBase64($lote->id, $validated['imagen']);

            if (!empty($validated['es_principal'])) {
                $lote->imagenes()->update(['es_principal' => false]);
            }

            $orden = (int) $lote->imagenes()->max('orden') + 1;
            $imagen = $lote->imagenes()->create([
                'user_id' => $request->user()?->id,
                'url' => $relativePath,
                'descripcion' => $validated['descripcion'] ?? null,
                'es_principal' => (bool) ($validated['es_principal'] ?? false),
                'orden' => $orden,
            ]);

            return response()->json([
                'success' => true,
                'data' => $imagen,
                'message' => 'Imagen guardada en disco.',
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function destroyImagen($loteId, $imagenId)
    {
        $imagen = LoteImagen::where('lote_id', $loteId)->findOrFail($imagenId);
        $imagen->delete();

        return response()->json([
            'success' => true,
            'message' => 'Imagen desactivada.',
        ]);
    }

    private function guardarImagenBase64(int $loteId, string $base64): string
    {
        if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,/', $base64, $matches)) {
            throw new \InvalidArgumentException('La imagen debe ser JPEG, PNG o WebP en base64.');
        }

        $extension = $matches[1] === 'jpg' ? 'jpeg' : $matches[1];
        $imageData = base64_decode(substr($base64, strpos($base64, ',') + 1), true);
        if ($imageData === false || strlen($imageData) < 32) {
            throw new \InvalidArgumentException('La imagen no es válida.');
        }
        if (strlen($imageData) > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('La imagen supera 5 MB.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($imageData);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw new \InvalidArgumentException('El archivo no es una imagen permitida.');
        }

        $filename = 'lotes/'.$loteId.'/'.Str::uuid().'.'.$extension;
        Storage::disk('public')->put($filename, $imageData);

        return $filename;
    }

    public function media(int $id)
    {
        $imagen = LoteImagen::find($id);
        if (! $imagen || empty($imagen->url) || ! Storage::disk('public')->exists($imagen->url)) {
            return response()->json([
                'success' => false,
                'message' => 'La foto no está disponible.',
            ], 404);
        }

        $absolute = Storage::disk('public')->path($imagen->url);
        $mime = mime_content_type($absolute) ?: 'image/jpeg';

        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
