<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FincaCuotaCompra extends Model
{
    protected $table = 'finca_cuotas_compra';

    protected $fillable = [
        'finca_id',
        'numero_cuota',
        'fecha_vencimiento',
        'monto',
        'monto_pagado',
        'estado',
    ];

    protected $casts = [
        'fecha_vencimiento' => 'date',
        'monto' => 'decimal:2',
        'monto_pagado' => 'decimal:2',
    ];

    public function finca()
    {
        return $this->belongsTo(Finca::class);
    }
}
