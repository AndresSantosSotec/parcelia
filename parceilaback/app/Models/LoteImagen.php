<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Auditable;

class LoteImagen extends Model
{
    use HasFactory, SoftDeletes, Auditable;

    protected $table = 'lote_imagenes';

    protected $fillable = [
        'lote_id',
        'user_id',
        'url',
        'descripcion',
        'es_principal',
        'orden',
    ];

    protected $appends = ['url_publica'];

    protected $casts = [
        'es_principal' => 'boolean',
        'orden' => 'integer',
    ];

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getUrlPublicaAttribute(): string
    {
        if (str_starts_with((string) $this->url, 'http')) {
            return $this->url;
        }

        return '/api/v1/publico/media/lotes/'.$this->id;
    }
}
