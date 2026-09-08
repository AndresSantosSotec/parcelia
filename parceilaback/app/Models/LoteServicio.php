<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class LoteServicio extends Model
{
    use HasFactory, Auditable;

    protected $table = 'lote_servicios';

    protected $fillable = [
        'lote_id',
        'catalogo_servicio_id',
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
