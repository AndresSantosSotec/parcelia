<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PagoTerreno extends Model
{
    use HasFactory;

    protected $table = 'pago_terrenos';

    protected $fillable = [
        'numero_recibo',
        'negociacion_id',
        'cliente_id',
        'lote_id',
        'caja_apertura_cierre_id',
        'user_id',
        'tipo_pago',
        'monto_total',
        'distribucion_capital',
        'distribucion_interes',
        'distribucion_mora',
        'distribucion_gastos',
        'saldo_anterior',
        'saldo_posterior',
        'metodo_pago',
        'referencia_bancaria',
        'fecha_pago',
        'concepto',
        'observaciones',
        'anulado',
        'motivo_anulacion',
    ];

    protected $casts = [
        'monto_total' => 'decimal:2',
        'distribucion_capital' => 'decimal:2',
        'distribucion_interes' => 'decimal:2',
        'distribucion_mora' => 'decimal:2',
        'distribucion_gastos' => 'decimal:2',
        'saldo_anterior' => 'decimal:2',
        'saldo_posterior' => 'decimal:2',
        'fecha_pago' => 'datetime',
        'anulado' => 'boolean',
    ];

    public function negociacion()
    {
        return $this->belongsTo(Negociacion::class, 'negociacion_id');
    }

    public function comprador()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function caja()
    {
        return $this->belongsTo(CajaAperturaCierre::class, 'caja_apertura_cierre_id');
    }
}
