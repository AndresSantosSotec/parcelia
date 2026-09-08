<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogoServicioInmobiliario;
use App\Models\ParametrizacionMoraInmobiliaria;
use App\Models\TasaInteres;
use Illuminate\Http\Request;

class InmobiliarioCatalogoController extends Controller
{
    public function servicios()
    {
        return response()->json([
            'success' => true,
            'data' => CatalogoServicioInmobiliario::where('activo', true)->orderBy('nombre')->get(),
        ]);
    }

    public function moraIndex(Request $request)
    {
        $query = ParametrizacionMoraInmobiliaria::query()->orderByDesc('activo')->orderBy('id');
        if ($request->boolean('solo_activas')) {
            $query->where('activo', true);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
            'vigente' => ParametrizacionMoraInmobiliaria::vigente(),
        ]);
    }

    public function moraStore(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:120',
            'tipo_calculo' => 'required|in:porcentaje_capital_vencido,monto_fijo_diario',
            'porcentaje_diario' => 'nullable|numeric|min:0|max:100',
            'monto_fijo_diario' => 'nullable|numeric|min:0',
            'dias_gracia' => 'nullable|integer|min:0|max:90',
            'sucursal_id' => 'nullable|exists:sucursales,id',
            'descripcion' => 'nullable|string',
            'activo' => 'nullable|boolean',
        ]);

        $config = ParametrizacionMoraInmobiliaria::create($validated);

        return response()->json(['success' => true, 'data' => $config], 201);
    }

    public function moraUpdate(Request $request, $id)
    {
        $config = ParametrizacionMoraInmobiliaria::findOrFail($id);
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:120',
            'tipo_calculo' => 'sometimes|in:porcentaje_capital_vencido,monto_fijo_diario',
            'porcentaje_diario' => 'nullable|numeric|min:0|max:100',
            'monto_fijo_diario' => 'nullable|numeric|min:0',
            'dias_gracia' => 'nullable|integer|min:0|max:90',
            'descripcion' => 'nullable|string',
            'activo' => 'nullable|boolean',
        ]);
        $config->update($validated);

        return response()->json(['success' => true, 'data' => $config]);
    }

    public function tasasIndex(Request $request)
    {
        $query = TasaInteres::query()->orderByDesc('activo')->orderBy('nombre');
        if ($request->boolean('solo_activas')) {
            $query->where('activo', true);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function tasasStore(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:120',
            'porcentaje_anual' => 'required|numeric|min:0|max:100',
            'tipo_calculo' => 'nullable|in:fijo,sobre_saldos,interes_plano',
            'periodicidad' => 'nullable|in:mensual,quincenal,anual',
            'vigencia_inicio' => 'nullable|date',
            'vigencia_fin' => 'nullable|date|after_or_equal:vigencia_inicio',
            'activo' => 'nullable|boolean',
            'descripcion' => 'nullable|string',
        ]);

        $tasa = TasaInteres::create($validated);

        return response()->json(['success' => true, 'data' => $tasa], 201);
    }

    public function tasasUpdate(Request $request, $id)
    {
        $tasa = TasaInteres::findOrFail($id);
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:120',
            'porcentaje_anual' => 'sometimes|numeric|min:0|max:100',
            'tipo_calculo' => 'sometimes|in:fijo,sobre_saldos,interes_plano',
            'periodicidad' => 'sometimes|in:mensual,quincenal,anual',
            'vigencia_inicio' => 'nullable|date',
            'vigencia_fin' => 'nullable|date|after_or_equal:vigencia_inicio',
            'activo' => 'nullable|boolean',
            'descripcion' => 'nullable|string',
        ]);

        $tasa->update($validated);

        return response()->json([
            'success' => true,
            'data' => $tasa,
            'message' => 'Tasa actualizada. Las negociaciones históricas conservan su snapshot.',
        ]);
    }

    public function tasasDesactivar($id)
    {
        $tasa = TasaInteres::findOrFail($id);
        $tasa->activo = false;
        $tasa->save();

        return response()->json([
            'success' => true,
            'data' => $tasa,
            'message' => 'Tasa desactivada. No se aplicará a nuevas negociaciones.',
        ]);
    }
}
