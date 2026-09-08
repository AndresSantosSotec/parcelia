<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class ParametrizacionMoraInmobiliaria extends Model
{
    use Auditable;

    protected string $auditoriaModulo = 'tasas_inmobiliarias';
    protected $table = 'parametrizacion_mora_inmobiliaria';

    protected $fillable = [
        'sucursal_id',
        'nombre',
        'tipo_calculo',
        'porcentaje_diario',
        'monto_fijo_diario',
        'dias_gracia',
        'activo',
        'descripcion',
    ];

    protected $casts = [
        'porcentaje_diario' => 'decimal:4',
        'monto_fijo_diario' => 'decimal:2',
        'dias_gracia' => 'integer',
        'activo' => 'boolean',
    ];

    public static function vigente(?int $sucursalId = null): ?self
    {
        if ($sucursalId) {
            $local = static::where('sucursal_id', $sucursalId)->where('activo', true)->first();
            if ($local) {
                return $local;
            }
        }

        return static::whereNull('sucursal_id')->where('activo', true)->latest('id')->first();
    }
}
