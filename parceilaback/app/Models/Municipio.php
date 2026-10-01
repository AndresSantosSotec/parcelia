<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Municipio extends Model
{
    protected $table = 'municipios';

    protected $fillable = ['departamento_id', 'nombre'];

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class);
    }
}
