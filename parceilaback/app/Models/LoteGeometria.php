<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoteGeometria extends Model
{
    protected $table = 'lote_geometrias';

    protected $fillable = [
        'finca_plano_id',
        'lote_id',
        'puntos',
    ];

    protected $casts = [
        'puntos' => 'array',
    ];

    public function plano()
    {
        return $this->belongsTo(FincaPlano::class, 'finca_plano_id');
    }

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
