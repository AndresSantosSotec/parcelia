<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoteImagen extends Model
{
    use HasFactory;

    protected $table = 'lote_imagenes';

    protected $fillable = [
        'lote_id',
        'url',
        'descripcion',
        'es_principal',
        'orden',
    ];

    protected $casts = [
        'es_principal' => 'boolean',
        'orden' => 'integer',
    ];

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
