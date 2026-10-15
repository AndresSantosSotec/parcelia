<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Negociacion extends Model
{
    use HasFactory, SoftDeletes, Auditable;

    protected string $auditoriaModulo = 'negociaciones';

    protected $table = 'negociaciones';

    protected $fillable = [
        'codigo_negociacion',
        'cliente_id',
        'lote_id',
        'user_id',
        'sucursal_id',
        'tipo_negociacion',
        'precio_original',
        'descuento',
        'gastos_escrituracion',
        'gastos_administrativos',
        'precio_final',
        'enganche_pactado',
        'enganche_pagado',
        'monto_financiado',
        'tasa_interes_anual',
        'sistema_amortizacion',
        'politica_abono_extra',
        'tasa_interes_id',
        'parametrizacion_mora_id',
        'tipo_mora_aplicada',
        'mora_porcentaje_diario_snapshot',
        'mora_monto_fijo_diario_snapshot',
        'mora_dias_gracia_snapshot',
        'plazo_meses',
        'periodo_pago',
        'cuota_mensual',
        'total_intereses_proyectados',
        'total_a_pagar',
        'total_capital_pagado',
        'total_interes_pagado',
        'total_mora_pagada',
        'saldo_capital_pendiente',
        'cuotas_pagadas',
        'cuotas_pendientes',
        'dias_mora_actual',
        'fecha_negociacion',
        'fecha_primer_pago',
        'fecha_vencimiento_contrato',
        'estado',
        'observaciones',
        'motivo_rescision',
        'origen_fondos',
        'ive_efectivo_reportable',
    ];

    protected $casts = [
        'precio_original' => 'decimal:2',
        'descuento' => 'decimal:2',
        'gastos_escrituracion' => 'decimal:2',
        'gastos_administrativos' => 'decimal:2',
        'precio_final' => 'decimal:2',
        'enganche_pactado' => 'decimal:2',
        'enganche_pagado' => 'decimal:2',
        'monto_financiado' => 'decimal:2',
        'tasa_interes_anual' => 'decimal:2',
        'cuota_mensual' => 'decimal:2',
        'total_intereses_proyectados' => 'decimal:2',
        'total_a_pagar' => 'decimal:2',
        'total_capital_pagado' => 'decimal:2',
        'total_interes_pagado' => 'decimal:2',
        'total_mora_pagada' => 'decimal:2',
        'saldo_capital_pendiente' => 'decimal:2',
        'fecha_negociacion' => 'date',
        'fecha_primer_pago' => 'date',
        'fecha_vencimiento_contrato' => 'date',
    ];

    public function comprador()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }

    public function asesor()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comisiones()
    {
        return $this->hasMany(ComisionVenta::class, 'negociacion_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sucursal()
    {
        return $this->belongsTo(Sucursal::class, 'sucursal_id');
    }

    public function parametrizacionMora()
    {
        return $this->belongsTo(ParametrizacionMoraInmobiliaria::class, 'parametrizacion_mora_id');
    }

    public function planPagos()
    {
        return $this->hasMany(PlanPagoTerreno::class, 'negociacion_id')->orderBy('numero_cuota');
    }

    public function pagos()
    {
        return $this->hasMany(PagoTerreno::class, 'negociacion_id')->orderBy('fecha_pago', 'desc');
    }

    public function gastos()
    {
        return $this->belongsToMany(
            Gasto::class,
            'negociacion_gasto',
            'negociacion_id',
            'gasto_id'
        )
            ->withPivot('valor_calculado')
            ->withTimestamps();
    }
}
