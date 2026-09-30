<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FincaGastoUrbanizacion extends Model
{
    protected $table = 'finca_gastos_urbanizacion';

    protected $fillable = [
        'finca_id',
        'categoria',
        'concepto',
        'monto',
        'fecha',
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
    ];

    public function finca()
    {
        return $this->belongsTo(Finca::class);
    }
}
