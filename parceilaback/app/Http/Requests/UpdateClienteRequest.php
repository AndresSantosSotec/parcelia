<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesClienteIdentidad;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClienteRequest extends FormRequest
{
    use NormalizesClienteIdentidad;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $clienteId = $this->route('cliente') ?? $this->route('id');

        return [
            'nombres' => 'sometimes|required|string|max:255',
            'apellidos' => 'sometimes|required|string|max:255',
            'dpi' => [
                'sometimes',
                'required',
                'string',
                'size:13',
                'regex:/^\d{13}$/',
                Rule::unique('clientes', 'dpi')
                    ->ignore($clienteId)
                    ->where('eliminado', 0),
            ],
            'nit' => 'nullable|string|max:20',
            'fecha_nacimiento' => 'sometimes|required|date|before:today',
            'genero' => 'sometimes|required|in:masculino,femenino,otro',
            'estado_civil' => 'nullable|string|max:100',
            'profesion' => 'nullable|string|max:150',
            'telefono' => 'sometimes|required|string|regex:/^\+?\d{7,16}$/',
            'telefono_secundario' => 'nullable|string|regex:/^\+?\d{7,16}$/',
            'email' => 'nullable|email|max:255',
            'direccion' => 'sometimes|required|string',
            'municipio' => 'nullable|string|max:255',
            'departamento_geoname_id' => 'nullable|integer',
            'municipio_geoname_id' => 'nullable|integer',
            'fotografia' => 'nullable|string',
            'estado' => 'nullable|in:activo,inactivo',
            'sucursal' => 'nullable|string|max:255',
            'tipo_cliente' => 'nullable|in:regular,vip',
            'notas' => 'nullable|string',
            'referencias' => 'sometimes|array',
            'referencias.*.nombre' => 'required_with:referencias.*.telefono|string|max:255',
            'referencias.*.telefono' => 'required_with:referencias.*.nombre|string|max:20',
            'referencias.*.relacion' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'nombres.required' => 'Los nombres son obligatorios',
            'nombres.max' => 'Los nombres no pueden exceder 255 caracteres',
            'apellidos.required' => 'Los apellidos son obligatorios',
            'apellidos.max' => 'Los apellidos no pueden exceder 255 caracteres',
            'dpi.required' => 'El DPI es obligatorio',
            'dpi.size' => 'El DPI debe tener 13 dígitos',
            'dpi.regex' => 'El DPI debe contener únicamente 13 dígitos',
            'dpi.unique' => 'Ya existe otro cliente registrado con este número de DPI. Por favor, verifique el número ingresado.',
            'nit.max' => 'El NIT no puede exceder 20 caracteres',
            'fecha_nacimiento.required' => 'La fecha de nacimiento es obligatoria',
            'fecha_nacimiento.date' => 'La fecha de nacimiento debe ser una fecha válida',
            'fecha_nacimiento.before' => 'La fecha de nacimiento debe ser anterior a hoy',
            'genero.required' => 'El género es obligatorio',
            'genero.in' => 'El género debe ser: masculino, femenino u otro',
            'telefono.required' => 'El teléfono es obligatorio',
            'telefono.regex' => 'El teléfono debe tener entre 8 y 15 dígitos',
            'telefono_secundario.regex' => 'El teléfono secundario debe tener entre 8 y 15 dígitos',
            'email.email' => 'El correo electrónico no tiene un formato válido',
            'email.max' => 'El correo electrónico no puede exceder 255 caracteres',
            'direccion.required' => 'La dirección es obligatoria',
            'municipio.max' => 'El municipio no puede exceder 255 caracteres',
            'estado.in' => 'El estado debe ser: activo o inactivo',
            'tipo_cliente.in' => 'El tipo de cliente debe ser: regular o vip',
        ];
    }

    public function attributes(): array
    {
        return [
            'dpi' => 'DPI',
            'nit' => 'NIT',
            'email' => 'correo electrónico',
        ];
    }
}
