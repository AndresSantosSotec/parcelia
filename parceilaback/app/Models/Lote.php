<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lote extends Model
{
    use HasFactory, SoftDeletes, Auditable;

    protected string $auditoriaModulo = 'lotes';
    protected array $auditoriaIgnorar = ['updated_at'];

    protected $table = 'lotes';

    protected $fillable = [
        'parcela_id',
        'vendedor_id',
        'numero_lote',
        'codigo_unico',
        'area_m2',
        'frente_metros',
        'fondo_metros',
        'colindancias',
        'tipo_terreno',
        'precio_m2',
        'precio_base',
        'plusvalia_servicios',
        'precio_venta',
        'costo_asignado',
        'precio_sugerido',
        'estado',
        'negociacion_activa_id',
        'observaciones',
        'latitud',
        'longitud',
        'altitud',
        'precision_metros',
        'referencia_geo',
        'token_publico',
        'publicado',
    ];

    protected $casts = [
        'area_m2' => 'decimal:2',
        'frente_metros' => 'decimal:2',
        'fondo_metros' => 'decimal:2',
        'precio_m2' => 'decimal:2',
        'precio_base' => 'decimal:2',
        'plusvalia_servicios' => 'decimal:2',
        'precio_venta' => 'decimal:2',
        'costo_asignado' => 'decimal:2',
        'precio_sugerido' => 'decimal:2',
        'latitud' => 'decimal:7',
        'longitud' => 'decimal:7',
        'altitud' => 'decimal:2',
        'precision_metros' => 'decimal:2',
        'publicado' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Lote $lote) {
            if (empty($lote->token_publico)) {
                $lote->token_publico = (string) \Illuminate\Support\Str::ulid();
            }
            if ($lote->publicado === null) {
                $lote->publicado = true;
            }
        });
    }

    public function parcela()
    {
        return $this->belongsTo(Parcela::class, 'parcela_id');
    }

    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Admin/superadmin ven toda la cartera; el resto solo lotes asignados.
     */
    public function scopeVisiblePara($query, ?User $user)
    {
        if (! $user) {
            return $query->whereRaw('1 = 0');
        }

        if (in_array($user->rol, ['superadmin', 'administrador'], true)) {
            return $query;
        }

        return $query->where('vendedor_id', $user->id);
    }

    public function esVisiblePara(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if (in_array($user->rol, ['superadmin', 'administrador'], true)) {
            return true;
        }

        return (int) $this->vendedor_id === (int) $user->id;
    }

    public function servicios()
    {
        return $this->hasMany(LoteServicio::class, 'lote_id');
    }

    public function imagenes()
    {
        return $this->hasMany(LoteImagen::class, 'lote_id')->orderBy('orden');
    }

    public function geometria()
    {
        return $this->hasOne(LoteGeometria::class, 'lote_id');
    }

    public function ocupacion()
    {
        return $this->belongsTo(Negociacion::class, 'negociacion_activa_id');
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
