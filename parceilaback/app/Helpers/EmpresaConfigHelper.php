<?php

namespace App\Helpers;

use App\Models\ConfiguracionSistema;

class EmpresaConfigHelper
{
    public const DEFAULT_CONFIG = [
        'nombreEmpresa' => 'Parcelia',
        'slogan' => 'Venta de Terrenos & Financiamiento Propio',
        'logoUrl' => null,
        'nit' => '',
        'telefono' => '',
        'email' => '',
        'direccion' => 'Guatemala',
        'sitioWeb' => '',
        'monedaSimbolo' => 'Q',
        'monedaCodigo' => 'GTQ',
        'piePaginaDocumentos' => 'Documento oficial · Válido según la legislación vigente.',
        'clausulasContrato' => 'El comprador acepta formalmente los términos y condiciones de la operación, comprometiéndose al cumplimiento de los pagos en los plazos estipulados.',
        'temaColor' => 'esmeralda',
    ];

    /**
     * Obtiene la configuración de empresa actual más reciente desde la BD
     */
    public static function getConfig(): array
    {
        try {
            $guardado = ConfiguracionSistema::obtener('empresa_config', null);
            if ($guardado && is_array($guardado)) {
                return array_merge(self::DEFAULT_CONFIG, $guardado);
            }
        } catch (\Throwable $e) {
            // Fallback silencioso a defaults si la tabla o conexión no estuviera disponible
        }

        return self::DEFAULT_CONFIG;
    }

    /**
     * Guarda la configuración de empresa en la BD
     */
    public static function setConfig(array $data): array
    {
        $current = self::getConfig();
        $merged = array_merge($current, $data);

        ConfiguracionSistema::updateOrCreate(
            ['clave' => 'empresa_config'],
            [
                'valor' => json_encode($merged),
                'tipo' => 'json',
                'grupo' => 'general',
                'descripcion' => 'Configuración de marca, logo y datos fiscales de la empresa',
                'editable_por_usuario' => true,
            ]
        );

        return $merged;
    }
}
