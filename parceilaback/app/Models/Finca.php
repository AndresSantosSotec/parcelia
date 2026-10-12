<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Finca extends Model
{
    use HasFactory, SoftDeletes, Auditable;

    protected string $auditoriaModulo = 'fincas';

    protected $table = 'fincas';

    protected $fillable = [
        'nombre',
        'codigo',
        'ubicacion',
        'municipio',
        'departamento',
        'area_total_m2',
        'numero_finca',
        'folio',
        'libro',
        'descripcion',
        'plano_url',
        'activo',
        'vendedor_nombre',
        'vendedor_dpi',
        'referencia',
        'precio_compra',
        'gastos_escrituracion',
        'tipo_compra',
        'enganche',
        'numero_cuotas',
        'frecuencia_pago',
        'fecha_inicio_pagos',
        'cuota_compra',
        'porcentaje_utilidad',
        'area_negociable_m2',
        'area_no_negociable_m2',
        'area_vialidades_m2',
        'area_verde_m2',
        'area_tecnica_m2',
    ];

    protected $casts = [
        'area_total_m2' => 'decimal:2',
        'activo' => 'boolean',
        'precio_compra' => 'decimal:2',
        'gastos_escrituracion' => 'decimal:2',
        'enganche' => 'decimal:2',
        'cuota_compra' => 'decimal:2',
        'porcentaje_utilidad' => 'decimal:2',
        'area_negociable_m2' => 'decimal:2',
        'area_no_negociable_m2' => 'decimal:2',
        'area_vialidades_m2' => 'decimal:2',
        'area_verde_m2' => 'decimal:2',
        'area_tecnica_m2' => 'decimal:2',
        'fecha_inicio_pagos' => 'date',
    ];

    public function parcelas()
    {
        return $this->hasMany(Parcela::class, 'finca_id');
    }

    public function plano()
    {
        return $this->hasOne(FincaPlano::class, 'finca_id');
    }

    public function lotes()
    {
        return $this->hasManyThrough(Lote::class, Parcela::class, 'finca_id', 'parcela_id');
    }

    public function escrituras()
    {
        return $this->hasMany(FincaEscritura::class);
    }

    public function cuotasCompra()
    {
        return $this->hasMany(FincaCuotaCompra::class);
    }

    public function pagosCompra()
    {
        return $this->hasMany(FincaCompraPago::class);
    }

    public function gastosUrbanizacion()
    {
        return $this->hasMany(FincaGastoUrbanizacion::class);
    }

    public function financistas()
    {
        return $this->hasMany(Financista::class);
    }
}
