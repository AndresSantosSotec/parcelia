<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TasaInteres extends Model
{
    use HasFactory;

    protected $table = 'tasas_interes_inmobiliarias';

    protected $fillable = [
        'nombre',
        'porcentaje_anual',
        'tipo_calculo',
        'periodicidad',
        'vigencia_inicio',
        'vigencia_fin',
        'activo',
        'descripcion',
    ];

    protected $casts = [
        'porcentaje_anual' => 'decimal:2',
        'activo' => 'boolean',
        'vigencia_inicio' => 'date',
        'vigencia_fin' => 'date',
    ];
}
