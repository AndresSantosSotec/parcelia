<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNegociacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cliente_id' => 'required|exists:clientes,id',
            'lote_id' => 'required|exists:lotes,id',
            'tipo_negociacion' => 'required|in:contado,credito,reserva',
            'descuento' => 'nullable|numeric|min:0',
            'gastos_escrituracion' => 'nullable|numeric|min:0',
            'gastos_administrativos' => 'nullable|numeric|min:0',
            'enganche_pactado' => 'nullable|numeric|min:0',
            'plazo_meses' => 'required_if:tipo_negociacion,credito|nullable|integer|min:1|max:240',
            'periodo_pago' => 'nullable|in:mensual,bimestral,trimestral,cuatrimestral,quimestral,semestral,anual',
            'tasa_interes_id' => 'nullable|exists:tasas_interes_inmobiliarias,id',
            'parametrizacion_mora_id' => 'nullable|exists:parametrizacion_mora_inmobiliaria,id',
            'tasa_interes_anual' => 'nullable|numeric|min:0|max:100',
            'fecha_negociacion' => 'required|date',
            'fecha_primer_pago' => 'nullable|date|after_or_equal:fecha_negociacion',
            'observaciones' => 'nullable|string',
            'sistema_amortizacion' => 'nullable|string|in:frances,aleman,americano,plano',
            'politica_abono_extra' => 'nullable|string|in:reducir_plazo,reducir_cuota',
            'gas_ids' => 'nullable|array',
            'gas_ids.*' => 'integer|exists:gastos,id_gasto',
            'monto_pago' => 'nullable|numeric|min:0.01',
            'metodo_pago' => 'nullable|in:efectivo,transferencia,deposito,cheque,tarjeta',
            'origen_fondos' => 'nullable|string|max:255',
            'referencia_bancaria' => 'nullable|string|max:100',
        ];
    }
}
