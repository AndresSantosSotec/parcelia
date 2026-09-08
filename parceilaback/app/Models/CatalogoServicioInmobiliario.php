<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class CatalogoServicioInmobiliario extends Model
{
    use Auditable;

    protected string $auditoriaModulo = 'lotes';
    protected $table = 'catalogo_servicios_inmobiliarios';

    protected $fillable = [
        'codigo',
        'nombre',
        'costo_default',
        'activo',
        'descripcion',
    ];

    protected $casts = [
        'costo_default' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function asignaciones()
    {
        return $this->hasMany(LoteServicio::class, 'catalogo_servicio_id');
    }
}
