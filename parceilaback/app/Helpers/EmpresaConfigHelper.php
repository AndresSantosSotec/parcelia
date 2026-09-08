<?php

namespace App\Helpers;

use App\Models\ConfiguracionSistema;

class EmpresaConfigHelper
{
    public const DEFAULT_CONFIG = [
        'nombreEmpresa' => 'TerraCloud',
        'slogan' => 'Solución Cloud de Parcelamiento & Financiamiento',
        'logoUrl' => null,
        'nit' => '1098472-9',
        'telefono' => '(502) 2334-8900',
        'email' => 'contacto@terracloud.gt',
        'direccion' => 'Avenida Reforma 12-40, Zona 10, Edificio Reforma Montúfar',
        'sitioWeb' => 'www.terracloud.gt',
        'monedaSimbolo' => 'Q',
        'monedaCodigo' => 'GTQ',
        'piePaginaDocumentos' => 'Documento oficial emitido por TerraCloud SaaS · Válido según la legislación vigente.',
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
