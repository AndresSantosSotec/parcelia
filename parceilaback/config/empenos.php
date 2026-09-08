<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Módulo de empeños
    |--------------------------------------------------------------------------
    |
    | En Parcelia el dominio operativo es terrenos. El código de empeños se
    | conserva, pero no se registra en la UI ni se expone por API mientras
    | esto esté en false. Para reactivarlo: EMPENOS_ENABLED=true
    |
    */

    'enabled' => filter_var(env('EMPENOS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    'hidden_modules' => [
        'categorias_productos',
        'creditos',
        'prendas',
        'ventas',
        'cotizaciones',
        'compras',
        'remates',
        'migracion',
        'cobros',
        'historial',
        'planes_interes',
        'transferencias',
        'refrendos',
    ],

    /*
     | Rutas (request->path()) que responden 404 si empeños está desactivado.
     | Caja, recibos, bóveda (usada por caja), clientes y contabilidad general
     | se mantienen.
     */
    'blocked_path_patterns' => [
        '#^api/ecommerce(/|$)#',
        '#^api/v1/creditos-prendarios(/|$)#',
        '#^api/v1/credigos-prendarios(/|$)#',
        '#^api/v1/creditos(/|$)#',
        '#^api/v1/prendas(/|$)#',
        '#^api/v1/imagenes/duplicados#',
        '#^api/v1/ventas(/|$)#',
        '#^api/v1/compras(/|$)#',
        '#^api/v1/cotizaciones(/|$)#',
        '#^api/v1/remates(/|$)#',
        '#^api/v1/transferencias-prendas(/|$)#',
        '#^api/v1/planes-interes(/|$)#',
        '#^api/v1/codigos-prereservados(/|$)#',
        '#^api/v1/migraciones(/|$)#',
        '#^api/v1/reportes/compras#',
        '#^api/v1/reportes/ventas#',
        '#^api/v1/reportes/creditos#',
        '#^api/v1/contabilidad/parametrizacion-mora#',
        '#^api/v1/clientes/[^/]+/creditos-prendarios#',
    ],
];
