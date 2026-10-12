<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FincaPlano extends Model
{
    protected $table = 'finca_planos';

    protected $fillable = [
        'finca_id',
        'imagen_path',
        'imagen_nombre',
        'ancho',
        'alto',
        'user_id',
    ];

    protected $casts = [
        'ancho' => 'integer',
        'alto' => 'integer',
    ];

    protected $hidden = ['imagen_path'];

    public function finca()
    {
        return $this->belongsTo(Finca::class, 'finca_id');
    }

    public function geometrias()
    {
        return $this->hasMany(LoteGeometria::class, 'finca_plano_id');
    }
}
