<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lote extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'lotes';

    protected $fillable = [
        'parcela_id',
        'numero_lote',
        'codigo_unico',
        'area_m2',
        'frente_metros',
        'fondo_metros',
        'colindancias',
        'tipo_terreno',
        'precio_m2',
        'precio_venta',
        'estado',
        'observaciones',
    ];

    protected $casts = [
        'area_m2' => 'decimal:2',
        'frente_metros' => 'decimal:2',
        'fondo_metros' => 'decimal:2',
        'precio_m2' => 'decimal:2',
        'precio_venta' => 'decimal:2',
    ];

    public function parcela()
    {
        return $this->belongsTo(Parcela::class, 'parcela_id');
    }

    public function servicios()
    {
        return $this->hasMany(LoteServicio::class, 'lote_id');
    }

    public function imagenes()
    {
        return $this->hasMany(LoteImagen::class, 'lote_id')->orderBy('orden');
    }

    public function negociaciones()
    {
        return $this->hasMany(Negociacion::class, 'lote_id');
    }

    public function negociacionActiva()
    {
        return $this->hasOne(Negociacion::class, 'lote_id')->whereIn('estado', ['activa', 'reservada', 'en_mora']);
    }
}
