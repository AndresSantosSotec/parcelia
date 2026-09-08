<?php

namespace App\Services\Inmobiliario;

use App\Models\Negociacion;
use App\Models\PlanPagoTerreno;
use App\Models\PagoTerreno;
use Carbon\Carbon;

class AccountStatementService
{
    /**
     * Genera el Estado de Cuenta consolidado y cronológico para una negociación.
     */
    public function generarEstadoCuenta(int $negociacionId): array
    {
        $negociacion = Negociacion::with(['cliente', 'lote.parcela.finca', 'user', 'sucursal'])
            ->findOrFail($negociacionId);

        $planPagos = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->orderBy('numero_cuota', 'asc')
            ->get();

        $pagos = PagoTerreno::where('negociacion_id', $negociacion->id)
            ->with('user')
            ->orderBy('fecha_pago', 'asc')
            ->get();

        // 1. Resumen General
        $resumen = [
            'negociacion_id' => $negociacion->id,
            'codigo_negociacion' => $negociacion->codigo_negociacion,
            'fecha_negociacion' => $negociacion->fecha_negociacion?->format('Y-m-d'),
            'estado' => $negociacion->estado,
            'tipo_negociacion' => $negociacion->tipo_negociacion,
            
            // Datos del Comprador
            'cliente' => [
                'id' => $negociacion->cliente->id,
                'codigo' => $negociacion->cliente->codigo_cliente,
                'nombre_completo' => $negociacion->cliente->nombres . ' ' . $negociacion->cliente->apellidos,
                'dpi' => $negociacion->cliente->dpi,
                'nit' => $negociacion->cliente->nit,
                'telefono' => $negociacion->cliente->telefono,
                'direccion' => $negociacion->cliente->direccion,
            ],

            // Datos del Inmueble
            'inmueble' => [
                'finca' => $negociacion->lote->parcela->finca->nombre,
                'numero_finca' => $negociacion->lote->parcela->finca->numero_finca,
                'folio' => $negociacion->lote->parcela->finca->folio,
                'libro' => $negociacion->lote->parcela->finca->libro,
                'parcela' => $negociacion->lote->parcela->nombre_identificador,
                'numero_lote' => $negociacion->lote->numero_lote,
                'codigo_unico' => $negociacion->lote->codigo_unico,
                'area_m2' => (float) $negociacion->lote->area_m2,
                'frente_metros' => (float) $negociacion->lote->frente_metros,
                'fondo_metros' => (float) $negociacion->lote->fondo_metros,
            ],

            // Resumen Financiero
            'financiero' => [
                'precio_original' => (float) $negociacion->precio_original,
                'descuento' => (float) $negociacion->descuento,
                'gastos_escrituracion' => (float) $negociacion->gastos_escrituracion,
                'gastos_administrativos' => (float) $negociacion->gastos_administrativos,
                'precio_final' => (float) $negociacion->precio_final,
                'enganche_pactado' => (float) $negociacion->enganche_pactado,
                'enganche_pagado' => (float) $negociacion->enganche_pagado,
                'monto_financiado' => (float) $negociacion->monto_financiado,
                'tasa_interes_anual' => (float) $negociacion->tasa_interes_anual,
                'plazo_meses' => (int) $negociacion->plazo_meses,
                'cuota_mensual' => (float) $negociacion->cuota_mensual,
                'total_capital_pagado' => (float) $negociacion->total_capital_pagado,
                'total_interes_pagado' => (float) $negociacion->total_interes_pagado,
                'total_mora_pagada' => (float) $negociacion->total_mora_pagada,
                'saldo_capital_pendiente' => (float) $negociacion->saldo_capital_pendiente,
                'cuotas_pagadas' => (int) $negociacion->cuotas_pagadas,
                'cuotas_pendientes' => (int) $negociacion->cuotas_pendientes,
                'porcentaje_pagado' => $negociacion->precio_final > 0 
                    ? round((($negociacion->enganche_pagado + $negociacion->total_capital_pagado) / $negociacion->precio_final) * 100, 2)
                    : 0
            ]
        ];

        // 2. Historial Cronológico de Movimientos (Kardex Financiero)
        $movimientos = [];
        
        // Agregar cargo inicial por venta
        $movimientos[] = [
            'fecha' => $negociacion->fecha_negociacion?->format('Y-m-d') ?? Carbon::now()->format('Y-m-d'),
            'documento' => $negociacion->codigo_negociacion,
            'concepto' => 'Apertura de Contrato de Venta Inmobiliaria',
            'cargo' => (float) $negociacion->precio_final,
            'abono' => 0.0,
            'saldo' => (float) $negociacion->precio_final,
            'metodo' => 'N/A'
        ];

        $saldoCorriente = (float) $negociacion->precio_final;

        foreach ($pagos as $p) {
            $abono = (float) $p->monto_total;
            $saldoCorriente = max(0.0, round($saldoCorriente - (float)$p->distribucion_capital, 2));

            $movimientos[] = [
                'fecha' => $p->fecha_pago?->format('Y-m-d H:i') ?? $p->created_at->format('Y-m-d H:i'),
                'documento' => $p->numero_recibo,
                'concepto' => $p->concepto,
                'tipo_pago' => $p->tipo_pago,
                'cargo' => 0.0,
                'abono' => $abono,
                'capital_aplicado' => (float) $p->distribucion_capital,
                'interes_aplicado' => (float) $p->distribucion_interes,
                'saldo' => $saldoCorriente,
                'metodo' => strtoupper($p->metodo_pago),
                'referencia' => $p->referencia_bancaria,
                'usuario' => $p->user?->name ?? 'Sistema'
            ];
        }

        return [
            'resumen' => $resumen,
            'kardex_movimientos' => $movimientos,
            'plan_pagos' => $planPagos,
            'pagos_registrados' => $pagos
        ];
    }
}
