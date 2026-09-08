<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Finca;
use App\Models\Parcela;
use App\Models\Lote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FincaController extends Controller
{
    public function index(Request $request)
    {
        $query = Finca::withCount(['parcelas', 'lotes'])
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
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:50|unique:fincas,codigo',
            'ubicacion' => 'nullable|string|max:255',
            'municipio' => 'required|string|max:100',
            'departamento' => 'required|string|max:100',
            'area_total_m2' => 'nullable|numeric|min:0',
            'numero_finca' => 'nullable|string|max:100',
            'folio' => 'nullable|string|max:100',
            'libro' => 'nullable|string|max:100',
            'descripcion' => 'nullable|string',
        ]);

        $finca = Finca::create($validated);

        return response()->json([
            'success' => true,
            'data' => $finca,
            'message' => 'Finca registrada exitosamente',
        ], 201);
    }

    public function storeParcela(Request $request, $fincaId)
    {
        $finca = Finca::findOrFail($fincaId);

        $validated = $request->validate([
            'nombre_identificador' => 'required|string|max:255',
            'codigo' => 'nullable|string|max:50',
            'area_m2' => 'nullable|numeric|min:0',
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

    public function storeLote(Request $request, $parcelaId)
    {
        $parcela = Parcela::with('finca')->findOrFail($parcelaId);

        $validated = $request->validate([
            'numero_lote' => 'required|string|max:50',
            'codigo_unico' => 'nullable|string|max:100|unique:lotes,codigo_unico',
            'area_m2' => 'required|numeric|min:1',
            'frente_metros' => 'nullable|numeric|min:0',
            'fondo_metros' => 'nullable|numeric|min:0',
            'colindancias' => 'nullable|string',
            'tipo_terreno' => 'nullable|string',
            'precio_m2' => 'nullable|numeric|min:0',
            'precio_venta' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string',
        ]);

        if (empty($validated['codigo_unico'])) {
            $fincaCod = $parcela->finca->codigo ?? 'F1';
            $parcelaCod = $parcela->codigo ?? $parcela->nombre_identificador;
            $validated['codigo_unico'] = strtoupper("{$fincaCod}-{$parcelaCod}-L{$validated['numero_lote']}");
        }

        $lote = $parcela->lotes()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $lote,
            'message' => 'Lote registrado exitosamente',
        ], 201);
    }
}
