<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLoteRequest;
use App\Models\Finca;
use App\Models\Parcela;
use App\Models\Lote;
use Illuminate\Http\Request;

class FincaController extends Controller
{
    public function index(Request $request)
    {
        $query = Finca::withCount([
            'parcelas',
            'lotes',
            'lotes as lotes_disponibles_count' => function ($lq) {
                $lq->where('estado', 'disponible');
            },
        ])
            ->with(['parcelas' => function ($q) {
                $q->withCount(['lotes', 'lotes as lotes_disponibles_count' => function ($lq) {
                    $lq->where('estado', 'disponible');
                }]);
            }]);

        if ($request->filled('busqueda')) {
            $busqueda = $request->busqueda;
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre', 'like', "%{$busqueda}%")
                  ->orWhere('codigo', 'like', "%{$busqueda}%")
                  ->orWhere('municipio', 'like', "%{$busqueda}%")
                  ->orWhere('departamento', 'like', "%{$busqueda}%");
            });
        }

        $fincas = $query->orderBy('nombre')->get();

        return response()->json([
            'success' => true,
            'data' => $fincas,
        ]);
    }

    public function show($id)
    {
        $finca = Finca::with(['parcelas.lotes.servicios', 'parcelas.lotes.imagenes'])
            ->withCount(['parcelas', 'lotes'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $finca,
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'nombre' => trim(strip_tags((string) $request->input('nombre', ''))),
            'codigo' => $request->filled('codigo') ? trim((string) $request->input('codigo')) : null,
        ]);

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo' => 'nullable|string|max:50|unique:fincas,codigo',
            'ubicacion' => 'nullable|string|max:255',
            'municipio' => 'required|string|max:100',
            'departamento' => 'required|string|max:100',
            'area_total_m2' => 'nullable|numeric|min:0.01',
            'numero_finca' => 'nullable|string|max:100',
            'folio' => 'nullable|string|max:100',
            'libro' => 'nullable|string|max:100',
            'descripcion' => 'nullable|string',
        ]);

        if (empty($validated['codigo'])) {
            $validated['codigo'] = $this->siguienteCodigoFinca();
        }

        $finca = Finca::create($validated);

        return response()->json([
            'success' => true,
            'data' => $finca,
            'message' => 'Finca registrada exitosamente',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $finca = Finca::findOrFail($id);
        $request->merge([
            'nombre' => $request->has('nombre') ? trim(strip_tags((string) $request->input('nombre', ''))) : $finca->nombre,
        ]);

        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'codigo' => 'sometimes|nullable|string|max:50|unique:fincas,codigo,'.$finca->id,
            'ubicacion' => 'nullable|string|max:255',
            'municipio' => 'sometimes|required|string|max:100',
            'departamento' => 'sometimes|required|string|max:100',
            'area_total_m2' => 'nullable|numeric|min:0.01',
            'numero_finca' => 'nullable|string|max:100',
            'folio' => 'nullable|string|max:100',
            'libro' => 'nullable|string|max:100',
            'descripcion' => 'nullable|string',
            'activo' => 'nullable|boolean',
        ]);

        $finca->update($validated);

        return response()->json([
            'success' => true,
            'data' => $finca->fresh(),
            'message' => 'Finca actualizada.',
        ]);
    }

    public function desactivar($id)
    {
        $finca = Finca::with('lotes')->findOrFail($id);
        $enOperacion = $finca->lotes()
            ->whereIn('estado', ['reservado', 'en_negociacion', 'vendido', 'pagado'])
            ->exists();

        if ($enOperacion) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede desactivar una finca con lotes reservados, vendidos o en negociación.',
            ], 422);
        }

        $finca->activo = false;
        $finca->save();

        return response()->json([
            'success' => true,
            'data' => $finca,
            'message' => 'Finca desactivada.',
        ]);
    }

    public function storeParcela(Request $request, $fincaId)
    {
        $finca = Finca::findOrFail($fincaId);
        $request->merge([
            'nombre_identificador' => trim(strip_tags((string) $request->input('nombre_identificador', ''))),
        ]);

        $validated = $request->validate([
            'nombre_identificador' => 'required|string|max:255|unique:parcelas,nombre_identificador,NULL,id,finca_id,'.$finca->id,
            'codigo' => 'nullable|string|max:50',
            'area_m2' => 'nullable|numeric|min:0.01',
            'medidas_perimetro' => 'nullable|string',
            'colindancias' => 'nullable|string',
            'tipo_terreno' => 'nullable|string',
            'descripcion' => 'nullable|string',
        ]);

        $parcela = $finca->parcelas()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $parcela,
            'message' => 'Parcela/Manzana agregada exitosamente',
        ], 201);
    }

    public function storeLote(StoreLoteRequest $request, $parcelaId)
    {
        $parcela = Parcela::with('finca')->findOrFail($parcelaId);

        $validated = $request->validated();

        if (empty($validated['area_m2']) && !empty($validated['frente_metros']) && !empty($validated['fondo_metros'])) {
            $validated['area_m2'] = round((float) $validated['frente_metros'] * (float) $validated['fondo_metros'], 2);
        }

        if (empty($validated['area_m2']) || (float) $validated['area_m2'] <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Indique el área o el frente y fondo para calcularla. El área debe ser mayor a cero.',
            ], 422);
        }

        $areaParcela = (float) $parcela->area_m2;
        if ($areaParcela > 0) {
            $areaUsada = (float) $parcela->lotes()->sum('area_m2');
            $areaNueva = (float) $validated['area_m2'];
            if (($areaUsada + $areaNueva) > ($areaParcela + 0.05)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La suma de áreas de los lotes supera el área disponible de la parcela.',
                    'area_parcela_m2' => $areaParcela,
                    'area_ya_asignada_m2' => round($areaUsada, 2),
                    'area_disponible_m2' => round(max(0, $areaParcela - $areaUsada), 2),
                ], 422);
            }
        }

        $areaAprox = (!empty($validated['frente_metros']) && !empty($validated['fondo_metros']))
            ? round((float) $validated['frente_metros'] * (float) $validated['fondo_metros'], 2)
            : null;

        if (empty($validated['codigo_unico'])) {
            $fincaCod = $parcela->finca->codigo ?? 'F1';
            $parcelaCod = $parcela->codigo ?? $parcela->nombre_identificador;
            $validated['codigo_unico'] = strtoupper("{$fincaCod}-{$parcelaCod}-L{$validated['numero_lote']}");
        }

        $validated['precio_base'] = $validated['precio_venta'];
        $validated['plusvalia_servicios'] = 0;
        $validated['token_publico'] = (string) \Illuminate\Support\Str::ulid();
        $validated['publicado'] = array_key_exists('publicado', $validated)
            ? (bool) $validated['publicado']
            : true;

        $user = $request->user();
        $esAdmin = $user && in_array($user->rol, ['superadmin', 'administrador'], true);
        if ($esAdmin && ! empty($validated['vendedor_id'])) {
            $validated['vendedor_id'] = (int) $validated['vendedor_id'];
        } else {
            $validated['vendedor_id'] = $user?->id;
        }

        $lote = $parcela->lotes()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $lote,
            'area_aproximada_m2' => $areaAprox,
            'message' => 'Lote registrado exitosamente',
        ], 201);
    }

    private function siguienteCodigoFinca(): string
    {
        $anio = date('Y');
        $ultimo = Finca::withTrashed()
            ->where('codigo', 'like', "FIN-{$anio}-%")
            ->orderByDesc('id')
            ->value('codigo');
        $n = 1;
        if ($ultimo && preg_match('/(\d+)$/', $ultimo, $m)) {
            $n = intval($m[1]) + 1;
        }

        return sprintf('FIN-%s-%03d', $anio, $n);
    }
}
