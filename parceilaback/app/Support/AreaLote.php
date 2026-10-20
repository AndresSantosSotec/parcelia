<?php

namespace App\Support;

class AreaLote
{
    /**
     * Misma estimación que la hoja "Conversión de Medidas".
     * Largo = (norte + sur) / 2. Ancho = (oriente + poniente) / 2. Área = largo × ancho.
     * Una cuerda equivale a 400 m².
     *
     * @return array{area: float, altura: float, promedio: float, cuerdas: float}|null
     */
    public static function desdeLados(?float $norte, ?float $sur, ?float $este, ?float $oeste): ?array
    {
        foreach ([$norte, $sur, $este, $oeste] as $lado) {
            if ($lado === null || $lado <= 0) {
                return null;
            }
        }

        $largo = ($norte + $sur) / 2;
        $ancho = ($este + $oeste) / 2;
        $area = $largo * $ancho;

        return [
            'area' => round($area, 2),
            'promedio' => round($largo, 2),
            'altura' => round($ancho, 2),
            'cuerdas' => round($area / 400, 2),
        ];
    }

    public static function aplicar(array $datos): array
    {
        $medidas = self::desdeLados(
            isset($datos['lado_norte']) ? (float) $datos['lado_norte'] : null,
            isset($datos['lado_sur']) ? (float) $datos['lado_sur'] : null,
            isset($datos['lado_este']) ? (float) $datos['lado_este'] : null,
            isset($datos['lado_oeste']) ? (float) $datos['lado_oeste'] : null,
        );
        if (! $medidas) {
            return $datos;
        }

        $datos['frente_metros'] = $medidas['promedio'];
        $datos['fondo_metros'] = $medidas['altura'];
        if (empty($datos['area_m2'])) {
            $datos['area_m2'] = $medidas['area'];
        }

        return $datos;
    }
}
