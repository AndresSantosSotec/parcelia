<?php

namespace App\Http\Requests\Concerns;

trait NormalizesClienteIdentidad
{
    protected function prepareForValidation(): void
    {
        $dpi = $this->input('dpi');
        if (is_string($dpi)) {
            $digits = preg_replace('/\D+/', '', $dpi) ?? '';
            $this->merge(['dpi' => $digits === '' ? null : $digits]);
        }

        foreach (['telefono', 'telefono_secundario'] as $campo) {
            $valor = $this->input($campo);
            if (is_string($valor)) {
                $trimmed = trim($valor);
                $hasPlus = str_starts_with($trimmed, '+');
                $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
                if ($digits === '') {
                    $this->merge([$campo => null]);
                } else {
                    $this->merge([$campo => ($hasPlus ? '+' : '') . $digits]);
                }
            }
        }

        foreach (['nombres', 'apellidos', 'direccion', 'municipio', 'profesion', 'estado_civil', 'notas'] as $campo) {
            if (!$this->exists($campo)) {
                continue;
            }
            $valor = $this->input($campo);
            if (is_string($valor)) {
                $this->merge([$campo => trim(strip_tags($valor))]);
            }
        }
    }
}
