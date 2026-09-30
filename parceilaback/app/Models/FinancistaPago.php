<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancistaPago extends Model
{
    protected $fillable = [
        'financista_id',
        'fecha',
        'monto_capital',
        'monto_interes',
        'monto_mora',
        'descuento_interes',
        'referencia',
        'user_id',
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto_capital' => 'decimal:2',
        'monto_interes' => 'decimal:2',
        'monto_mora' => 'decimal:2',
        'descuento_interes' => 'decimal:2',
    ];

    public function financista()
    {
        return $this->belongsTo(Financista::class);
    }
}
