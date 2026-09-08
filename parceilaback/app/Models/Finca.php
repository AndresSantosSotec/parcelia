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
    ];

    protected $casts = [
        'area_total_m2' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function parcelas()
    {
        return $this->hasMany(Parcela::class, 'finca_id');
    }

    public function lotes()
    {
        return $this->hasManyThrough(Lote::class, Parcela::class, 'finca_id', 'parcela_id');
    }
}
