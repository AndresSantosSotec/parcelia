<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePagoTerrenoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'negociacion_id' => 'required|exists:negociaciones,id',
            'tipo_pago' => 'required|in:enganche,cuota_normal,pago_anticipado,abono_capital,pago_total,gastos_escritura,mora',
            'monto' => 'required|numeric|min:0.01|decimal:0,2',
            'metodo_pago' => 'required|in:efectivo,transferencia,deposito,cheque,tarjeta',
            'referencia_bancaria' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
            'origen_fondos' => 'nullable|string|max:255',
            'caja_apertura_cierre_id' => 'nullable|exists:caja_apertura_cierres,id',
            'idempotency_key' => 'nullable|string|max:64',
            'fecha_pago' => 'nullable|date',
            'mora' => 'nullable|numeric|min:0',
        ];
    }
}
