<?php

return [
    /*
    | Umbral IVE / Decreto 15-2026 art. 31: registro diario de efectivo
    | único o estructurado >= US$10,000 o equivalente.
    | El tipo de cambio es configurable; no se criminaliza el efectivo.
    */
    'aml' => [
        'umbral_usd' => (float) env('INMOBILIARIO_AML_UMBRAL_USD', 10000),
        'tipo_cambio_gtq' => (float) env('INMOBILIARIO_AML_TIPO_CAMBIO_GTQ', 7.80),
    ],
];
