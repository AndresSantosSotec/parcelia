<?php

namespace App\Models;

use App\Traits\Auditable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Prospecto extends Model
{
    use HasFactory, SoftDeletes, Auditable;

    protected string $auditoriaModulo = 'prospectos';

    protected $table = 'prospectos';

    protected $fillable = [
        'sucursal_id',
        'nombre_completo',
        'telefono',
        'email',
        'dpi',
        'finca_id',
        'lote_id',
        'asesor_id',
        'estado',
        'origen',
        'presupuesto_estimado',
        'notas',
        'ultimo_contacto_at',
        'fecha_proximo_contacto',
        'motivo_perdido',
        'activo',
        'created_by',
    ];

    protected $casts = [
        'presupuesto_estimado' => 'decimal:2',
        'ultimo_contacto_at' => 'datetime',
        'fecha_proximo_contacto' => 'datetime',
        'activo' => 'boolean',
    ];

    protected $appends = [
        'requiere_seguimiento',
        'horas_sin_contacto',
    ];

    /**
     * Evalúa si el prospecto requiere seguimiento urgente (+48h sin contacto)
     * Aplica sólo a estados activos (no cerrado como ganado ni perdido).
     */
    public function getRequiereSeguimientoAttribute(): bool
    {
        if (in_array($this->estado, ['ganado', 'perdido'], true)) {
            return false;
        }

        $referencia = $this->ultimo_contacto_at ?? $this->created_at;
        if (! $referencia) {
            return true;
        }

        return Carbon::parse($referencia)->addHours(48)->isPast();
    }

    /**
     * Horas transcurridas desde el último contacto
     */
    public function getHorasSinContactoAttribute(): int
    {
        $referencia = $this->ultimo_contacto_at ?? $this->created_at;
        if (! $referencia) {
            return 999;
        }

        return (int) Carbon::parse($referencia)->diffInHours(now());
    }

    public function sucursal()
    {
        return $this->belongsTo(Sucursal::class, 'sucursal_id');
    }

    public function finca()
    {
        return $this->belongsTo(Finca::class, 'finca_id');
    }

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }

    public function asesor()
    {
        return $this->belongsTo(User::class, 'asesor_id');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

