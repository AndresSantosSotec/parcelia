<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $parcelaId = $this->route('parcelaId');

        return [
            'numero_lote' => 'required|string|max:50|unique:lotes,numero_lote,NULL,id,parcela_id,'.$parcelaId,
            'codigo_unico' => 'nullable|string|max:100|unique:lotes,codigo_unico',
            'area_m2' => 'nullable|numeric|min:0.01',
            'frente_metros' => 'nullable|numeric|min:0.01',
            'fondo_metros' => 'nullable|numeric|min:0.01',
            'lado_norte' => 'nullable|numeric|min:0.01',
            'lado_sur' => 'nullable|numeric|min:0.01',
            'lado_este' => 'nullable|numeric|min:0.01',
            'lado_oeste' => 'nullable|numeric|min:0.01',
            'colindancias' => 'nullable|string',
            'tipo_terreno' => 'nullable|string',
            'precio_m2' => 'nullable|numeric|min:0',
            'precio_venta' => 'required|numeric|min:0.01',
            'observaciones' => 'nullable|string',
            'latitud' => 'nullable|numeric|between:-90,90|required_with:longitud',
            'longitud' => 'nullable|numeric|between:-180,180|required_with:latitud',
            'altitud' => 'nullable|numeric',
            'precision_metros' => 'nullable|numeric|min:0',
            'referencia_geo' => 'nullable|string|max:255',
            'publicado' => 'nullable|boolean',
            'vendedor_id' => 'nullable|integer|exists:users,id',
        ];
    }
}
