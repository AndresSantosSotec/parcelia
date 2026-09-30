<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Comisionista extends Model
{
    protected $fillable = [
        'nombre',
        'telefono',
        'direccion',
        'dpi',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function comisiones()
    {
        return $this->hasMany(ComisionVenta::class);
    }
}
