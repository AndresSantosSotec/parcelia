<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Departamento extends Model
{
    protected $table = 'departamentos';

    protected $fillable = ['codigo', 'nombre'];

    public function municipios(): HasMany
    {
        return $this->hasMany(Municipio::class)->orderBy('nombre');
    }
}
