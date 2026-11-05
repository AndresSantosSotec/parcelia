<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionSistema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConfiguracionSistemaController extends Controller
{
    /**
     * Obtener todas las configuraciones del sistema (o filtradas por grupo).
     * GET /api/v1/configuraciones-sistema
     * GET /api/v1/configuraciones-sistema?grupo=caja
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        $query = ConfiguracionSistema::query();

        if ($request->filled('grupo')) {
            $query->where('grupo', $request->grupo);
        }

        $configs = $query->orderBy('grupo')->orderBy('clave')->get();

        // Castear los valores en la respuesta
        $configs->each(function (ConfiguracionSistema $c) {
            $c->append('valor_casteado');
        });

        return response()->json([
            'success' => true,
            'data'    => $configs,
        ]);
    }

    /**
     * Obtener una configuración por clave.
     * GET /api/v1/configuraciones-sistema/{clave}
     */
    public function show(string $clave): JsonResponse
    {
        $config = ConfiguracionSistema::where('clave', $clave)->firstOrFail();
        $config->append('valor_casteado');

        return response()->json([
            'success' => true,
            'data'    => $config,
        ]);
    }

    /**
     * Actualizar una o varias configuraciones del sistema.
     * PUT /api/v1/configuraciones-sistema
     *
     * Body: { configuraciones: [ { clave, valor }, ... ] }
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user || !in_array($user->rol, ['superadmin', 'administrador'])) {
            return response()->json(['error' => 'No tienes permisos para modificar configuraciones del sistema.'], 403);
        }

        $request->validate([
            'configuraciones'         => 'required|array|min:1',
            'configuraciones.*.clave' => 'required|string',
            'configuraciones.*.valor' => 'present',
        ]);

        $actualizadas = [];

        foreach ($request->configuraciones as $item) {
            $config = ConfiguracionSistema::where('clave', $item['clave'])->first();

            if (!$config) {
                continue; // Solo actualizamos claves existentes, no creamos nuevas vía API
            }

            if (!$config->editable_por_usuario) {
                continue; // Respetar restricción de edición
            }

            // Normalizar valor booleano
            $valor = $item['valor'];
            if ($config->tipo === 'boolean') {
                $valor = filter_var($valor, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
            }

            $config->valor = (string) $valor;
            $config->save();
            $config->append('valor_casteado');
            $actualizadas[] = $config;
        }

        return response()->json([
            'success'     => true,
            'message'     => 'Configuraciones actualizadas correctamente.',
            'actualizadas' => $actualizadas,
        ]);
    }

    /**
     * Endpoint rápido para el estado de integración Caja-Bóveda.
     * GET /api/v1/configuraciones-sistema/cash-vault-integration
     */
    public function cashVaultIntegration(): JsonResponse
    {
        $activa = ConfiguracionSistema::integracionCajaBovedaActiva();

        return response()->json([
            'success'                        => true,
            'cash_vault_integration_enabled' => $activa,
        ]);
    }

    /**
     * Activar/Desactivar integración Caja-Bóveda.
     * POST /api/v1/configuraciones-sistema/cash-vault-integration/toggle
     */
    public function toggleCashVaultIntegration(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user || !in_array($user->rol, ['superadmin', 'administrador'])) {
            return response()->json(['error' => 'No tienes permisos para modificar esta configuración.'], 403);
        }

        $request->validate([
            'activo' => 'required|boolean',
        ]);

        ConfiguracionSistema::setIntegracionCajaBoveda((bool) $request->activo);

        return response()->json([
            'success'                        => true,
            'message'                        => 'Integración Caja-Bóveda ' . ($request->activo ? 'activada' : 'desactivada') . ' correctamente.',
            'cash_vault_integration_enabled' => (bool) $request->activo,
        ]);
    }

    /**
     * Obtener configuración de empresa / marca (Logo, nombres, NIT, etc.)
     * GET /api/v1/empresa-config
     */
    public function getEmpresaConfig(): JsonResponse
    {
        $config = \App\Helpers\EmpresaConfigHelper::getConfig();

        return response()->json([
            'success' => true,
            'data'    => $config,
        ]);
    }

    /**
     * Guardar configuración de empresa / marca
     * POST /api/v1/empresa-config
     */
    public function updateEmpresaConfig(Request $request): JsonResponse
    {
        $user = Auth::user();

        $esAdmin = $user && (
            in_array($user->rol, ['superadmin', 'administrador', 'admin', 'gerente'], true) ||
            (method_exists($user, 'normalizedRole') && in_array($user->normalizedRole(), ['superadmin', 'administrador'], true))
        );

        if (!$esAdmin) {
            return response()->json(['error' => 'Solo administradores pueden cambiar la configuración de la empresa.'], 403);
        }

        $data = $request->all();

        // Si se envió un logo en Base64, guardar en disco público y asignar URL estática
        if (!empty($data['logoUrl']) && str_starts_with($data['logoUrl'], 'data:image/')) {
            try {
                if (preg_match('/^data:image\/(\w+);base64,/', $data['logoUrl'], $type)) {
                    $imageData = substr($data['logoUrl'], strpos($data['logoUrl'], ',') + 1);
                    $extension = strtolower($type[1]);
                    if ($extension === 'jpeg') $extension = 'jpg';
                    $decoded = base64_decode($imageData);
                    if ($decoded !== false) {
                        \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory('logos');
                        $filename = 'logo_oficial.' . $extension;
                        $path = 'logos/' . $filename;
                        \Illuminate\Support\Facades\Storage::disk('public')->put($path, $decoded);
                        // Convertir a URL pública para que no sature la base de datos ni el localStorage
                        $data['logoUrl'] = url('storage/' . $path) . '?v=' . time();
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('No se pudo guardar respaldo de logo en disco: ' . $e->getMessage());
            }
        }

        $guardado = \App\Helpers\EmpresaConfigHelper::setConfig($data);

        return response()->json([
            'success' => true,
            'data'    => $guardado,
            'message' => 'Configuración de empresa y logo guardada exitosamente.',
        ]);
    }

    /**
     * Subir archivo de logo oficial de la empresa vía multipart/form-data
     * POST /api/v1/empresa-config/logo
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $user = Auth::user();

        $esAdmin = $user && (
            in_array($user->rol, ['superadmin', 'administrador', 'admin', 'gerente'], true) ||
            (method_exists($user, 'normalizedRole') && in_array($user->normalizedRole(), ['superadmin', 'administrador'], true))
        );

        if (!$esAdmin) {
            return response()->json(['error' => 'Solo administradores pueden cambiar el logo de la empresa.'], 403);
        }

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,webp,svg|max:4096',
        ]);

        $file = $request->file('logo');
        $ext = $file->getClientOriginalExtension() ?: 'png';
        $filename = 'logo_oficial.' . $ext;

        \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory('logos');
        $path = $file->storeAs('logos', $filename, 'public');

        $url = url('storage/' . $path) . '?v=' . time();

        // Actualizar la configuración en BD
        $config = \App\Helpers\EmpresaConfigHelper::getConfig();
        $config['logoUrl'] = $url;
        \App\Helpers\EmpresaConfigHelper::setConfig($config);

        return response()->json([
            'success' => true,
            'message' => 'Logo oficial actualizado correctamente.',
            'logoUrl' => $url,
            'data'    => $config,
        ]);
    }
}
