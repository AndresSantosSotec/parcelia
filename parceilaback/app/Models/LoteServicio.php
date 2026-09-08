<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoteServicio extends Model
{
    use HasFactory;

    protected $table = 'lote_servicios';

    protected $fillable = [
        'lote_id',
        'nombre_servicio',
        'estado',
        'costo_adicional',
        'descripcion',
    ];

    protected $casts = [
        'costo_adicional' => 'decimal:2',
    ];

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
