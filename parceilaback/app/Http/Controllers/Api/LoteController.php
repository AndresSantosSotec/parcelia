<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lote;
use App\Models\LoteServicio;
use App\Models\LoteImagen;
use Illuminate\Http\Request;

class LoteController extends Controller
{
    public function index(Request $request)
    {
        $query = Lote::with(['parcela.finca', 'servicios', 'imagenes', 'negociacionActiva.comprador']);

        if ($request->filled('estado')) {
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

        if ($request->filled('busqueda')) {
            $busqueda = $request->busqueda;
            $query->where(function ($q) use ($busqueda) {
                $q->where('numero_lote', 'like', "%{$busqueda}%")
                  ->orWhere('codigo_unico', 'like', "%{$busqueda}%");
            });
        }

        $lotes = $query->orderBy('numero_lote')->get();

        return response()->json([
            'success' => true,
            'data' => $lotes,
        ]);
    }

    public function disponibles()
    {
        $lotes = Lote::with(['parcela.finca', 'servicios'])
            ->where('estado', 'disponible')
            ->orderBy('codigo_unico')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $lotes,
        ]);
    }

    public function show($id)
    {
        $lote = Lote::with([
            'parcela.finca',
            'servicios',
            'imagenes',
            'negociaciones.comprador',
            'negociaciones.planPagos',
            'negociaciones.pagos'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $lote,
        ]);
    }

    public function update(Request $request, $id)
    {
        $lote = Lote::findOrFail($id);

        $validated = $request->validate([
            'area_m2' => 'nullable|numeric|min:1',
            'frente_metros' => 'nullable|numeric|min:0',
            'fondo_metros' => 'nullable|numeric|min:0',
            'colindancias' => 'nullable|string',
            'precio_venta' => 'nullable|numeric|min:0',
            'precio_m2' => 'nullable|numeric|min:0',
            'estado' => 'nullable|in:disponible,reservado,en_negociacion,vendido,pagado,cancelado',
            'observaciones' => 'nullable|string',
        ]);

        $lote->update($validated);

        return response()->json([
            'success' => true,
            'data' => $lote,
            'message' => 'Lote actualizado correctamente',
        ]);
    }

    public function storeServicio(Request $request, $loteId)
    {
        $lote = Lote::findOrFail($loteId);

        $validated = $request->validate([
            'nombre_servicio' => 'required|string|max:100',
            'estado' => 'required|in:disponible,en_proceso,no_disponible',
            'costo_adicional' => 'nullable|numeric|min:0',
            'descripcion' => 'nullable|string',
        ]);

        $servicio = $lote->servicios()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $servicio,
            'message' => 'Servicio asignado al lote',
        ]);
    }
}
