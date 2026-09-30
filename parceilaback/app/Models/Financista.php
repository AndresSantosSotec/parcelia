<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Financista extends Model
{
    protected $fillable = [
        'finca_id',
        'tipo',
        'nombre',
        'destino',
        'monto',
        'tasa_anual',
        'interes_total',
        'plazo',
        'frecuencia',
        'fecha_inicio',
        'fecha_vencimiento',
        'cuota',
        'capital_al_vencimiento',
        'estado',
        'observaciones',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'tasa_anual' => 'decimal:2',
        'interes_total' => 'decimal:2',
        'cuota' => 'decimal:2',
        'fecha_inicio' => 'date',
        'fecha_vencimiento' => 'date',
        'capital_al_vencimiento' => 'boolean',
    ];

    public function finca()
    {
        return $this->belongsTo(Finca::class);
    }

    public function pagos()
    {
        return $this->hasMany(FinancistaPago::class);
    }
}
