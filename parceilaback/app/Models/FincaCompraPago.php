<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FincaCompraPago extends Model
{
    protected $table = 'finca_compra_pagos';

    protected $fillable = [
        'finca_id',
        'cuota_id',
        'fecha',
        'monto',
        'origen',
        'numero_recibo',
        'movimiento_caja_id',
        'boveda_movimiento_id',
        'user_id',
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
    ];

    public function finca()
    {
        return $this->belongsTo(Finca::class);
    }

    public function cuota()
    {
        return $this->belongsTo(FincaCuotaCompra::class, 'cuota_id');
    }
}
