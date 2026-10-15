<?php

namespace App\Support;

class AreaLote
{
    /**
     * Área de un lote de cuatro lados.
     * Norte y sur se toman como las bases del trapecio.
     * Si un lateral es perpendicular, el otro coincide con la hipotenusa
     * y el área es el promedio de las bases por esa altura.
     * En el plano de ejemplo: (200 + 150) / 2 = 175, y 175 × 100 = 17 500 m².
     *
     * @return array{area: float, altura: float, promedio: float}|null
     */
    public static function desdeLados(?float $norte, ?float $sur, ?float $este, ?float $oeste): ?array
    {
        foreach ([$norte, $sur, $este, $oeste] as $lado) {
            if ($lado === null || $lado <= 0) {
                return null;
            }
        }

        $diff = abs($norte - $sur);
        foreach ([[$oeste, $este], [$este, $oeste]] as [$altura, $inclinado]) {
            $esperado = sqrt(($altura ** 2) + ($diff ** 2));
            $tolerancia = max(0.5, $inclinado * 0.03);
            if (abs($esperado - $inclinado) <= $tolerancia) {
                $promedio = ($norte + $sur) / 2;

                return [
                    'area' => round($promedio * $altura, 2),
                    'altura' => round($altura, 2),
                    'promedio' => round($promedio, 2),
                ];
            }
        }

        $promedio = ($norte + $sur) / 2;
        $altura = ($este + $oeste) / 2;

        return [
            'area' => round($promedio * $altura, 2),
            'altura' => round($altura, 2),
            'promedio' => round($promedio, 2),
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
