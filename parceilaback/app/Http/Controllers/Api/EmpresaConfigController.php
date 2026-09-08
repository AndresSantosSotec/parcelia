<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\EmpresaConfigHelper;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmpresaConfigController extends Controller
{
    /**
     * GET /api/v1/empresa-config
     * Obtiene la configuración de empresa y logo más reciente
     */
    public function show(): JsonResponse
    {
        $config = EmpresaConfigHelper::getConfig();
        return response()->json([
            'success' => true,
            'data' => $config,
        ]);
    }

    /**
     * POST /api/v1/empresa-config
     * Actualiza la configuración de empresa, logo y membretes
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombreEmpresa' => 'nullable|string|max:255',
            'slogan' => 'nullable|string|max:255',
            'logoUrl' => 'nullable|string', // Base64 o URL
            'nit' => 'nullable|string|max:50',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|string|max:100',
            'direccion' => 'nullable|string|max:255',
            'sitioWeb' => 'nullable|string|max:100',
            'monedaSimbolo' => 'nullable|string|max:10',
            'monedaCodigo' => 'nullable|string|max:10',
            'piePaginaDocumentos' => 'nullable|string|max:500',
            'clausulasContrato' => 'nullable|string|max:2000',
            'temaColor' => 'nullable|string|max:50',
        ]);

        $updated = EmpresaConfigHelper::setConfig($validated);

        return response()->json([
            'success' => true,
            'message' => 'Configuración de empresa y logo actualizada exitosamente',
            'data' => $updated,
        ]);
    }
}
