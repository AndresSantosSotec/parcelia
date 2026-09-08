<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Parcela extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'parcelas';

    protected $fillable = [
        'finca_id',
        'nombre_identificador',
        'codigo',
        'area_m2',
        'medidas_perimetro',
        'colindancias',
        'tipo_terreno',
        'descripcion',
        'activo',
    ];

    protected $casts = [
        'area_m2' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function finca()
    {
        return $this->belongsTo(Finca::class, 'finca_id');
    }

    public function lotes()
    {
        return $this->hasMany(Lote::class, 'parcela_id');
    }
}
