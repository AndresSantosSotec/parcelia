<?php

namespace App\Services\Inmobiliario;

class AmlTerrenoService
{
    public function umbralQuetzales(): float
    {
        $usd = (float) config('inmobiliario.aml.umbral_usd', 10000);
        $tc = (float) config('inmobiliario.aml.tipo_cambio_gtq', 7.80);

        return round($usd * $tc, 2);
    }

    public function esEfectivoReportable(string $metodoPago, float $monto): bool
    {
        return $metodoPago === 'efectivo' && $monto >= $this->umbralQuetzales();
    }

    /**
     * @return array{ok: bool, message?: string, reportable: bool, umbral_gtq: float}
     */
    public function validarContadoEfectivo(string $metodoPago, float $monto, ?string $dpi, ?string $origenFondos): array
    {
        $umbral = $this->umbralQuetzales();
        $reportable = $this->esEfectivoReportable($metodoPago, $monto);

        if ($reportable && (empty($dpi) || empty($origenFondos))) {
            return [
                'ok' => false,
                'reportable' => true,
                'umbral_gtq' => $umbral,
                'message' => "Pago en efectivo igual o mayor a Q".number_format($umbral, 2)." (equiv. US$10,000 IVE). Debe registrar DPI del comprador y origen de fondos.",
            ];
        }

        return [
            'ok' => true,
            'reportable' => $reportable,
            'umbral_gtq' => $umbral,
        ];
    }
}
