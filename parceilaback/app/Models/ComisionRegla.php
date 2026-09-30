<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComisionRegla extends Model
{
    protected $table = 'comision_reglas';

    protected $fillable = [
        'nombre',
        'tipo',
        'base',
        'valor',
        'momento',
        'activo',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'activo' => 'boolean',
    ];
}
