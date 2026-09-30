<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FincaEscritura extends Model
{
    protected $table = 'finca_escrituras';

    protected $fillable = [
        'finca_id',
        'numero_escritura',
        'fecha_escritura',
        'area_m2',
        'documento_path',
        'documento_nombre',
    ];

    protected $casts = [
        'fecha_escritura' => 'date',
        'area_m2' => 'decimal:2',
    ];

    public function finca()
    {
        return $this->belongsTo(Finca::class);
    }
}
