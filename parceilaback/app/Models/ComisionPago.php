<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComisionPago extends Model
{
    protected $fillable = [
        'comision_venta_id',
        'fecha',
        'monto',
        'referencia',
        'user_id',
        'movimiento_caja_id',
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
    ];

    public function comision()
    {
        return $this->belongsTo(ComisionVenta::class, 'comision_venta_id');
    }
}
