<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComisionVenta extends Model
{
    protected $fillable = [
        'comisionista_id',
        'lote_id',
        'negociacion_id',
        'regla_id',
        'descripcion',
        'monto_venta',
        'monto_comision',
        'estado',
    ];

    protected $casts = [
        'monto_venta' => 'decimal:2',
        'monto_comision' => 'decimal:2',
    ];

    public function comisionista()
    {
        return $this->belongsTo(Comisionista::class);
    }

    public function lote()
    {
        return $this->belongsTo(Lote::class);
    }

    public function negociacion()
    {
        return $this->belongsTo(Negociacion::class);
    }

    public function regla()
    {
        return $this->belongsTo(ComisionRegla::class, 'regla_id');
    }

    public function pagos()
    {
        return $this->hasMany(ComisionPago::class);
    }
}
