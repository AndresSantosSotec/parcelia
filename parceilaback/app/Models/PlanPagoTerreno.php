<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlanPagoTerreno extends Model
{
    use HasFactory;

    protected $table = 'plan_pagos_terrenos';

    protected $fillable = [
        'negociacion_id',
        'numero_cuota',
        'tipo_cuota',
        'fecha_vencimiento',
        'saldo_inicial',
        'cuota_capital',
        'cuota_interes',
        'otros_cargos',
        'cuota_monto_total',
        'saldo_capital_restante',
        'monto_pagado',
        'capital_pagado',
        'interes_pagado',
        'mora_pagada',
        'mora_proyectada',
        'otros_cargos_pagados',
        'fecha_pagado',
        'estado',
    ];

    protected $casts = [
        'cuota_capital' => 'decimal:2',
        'cuota_interes' => 'decimal:2',
        'otros_cargos' => 'decimal:2',
        'otros_cargos_pagados' => 'decimal:2',
        'cuota_monto_total' => 'decimal:2',
        'saldo_inicial' => 'decimal:2',
        'saldo_capital_restante' => 'decimal:2',
        'monto_pagado' => 'decimal:2',
        'capital_pagado' => 'decimal:2',
        'interes_pagado' => 'decimal:2',
        'mora_pagada' => 'decimal:2',
        'mora_proyectada' => 'decimal:2',
        'fecha_vencimiento' => 'date',
        'fecha_pagado' => 'date',
    ];

    public function negociacion()
    {
        return $this->belongsTo(Negociacion::class, 'negociacion_id');
    }
}
