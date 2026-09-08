<?php

namespace App\Services\Inmobiliario;

use App\Models\Finca;
use App\Models\Parcela;
use App\Models\Lote;
use App\Models\Negociacion;
use App\Models\PagoTerreno;
use App\Models\PlanPagoTerreno;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InmobiliarioReportingService
{
    /**
     * Reporte de Inventario de Terrenos y Lotes.
     */
    public function reporteInventario(?int $fincaId = null): array
    {
        $query = Lote::with('parcela.finca');
        if ($fincaId) {
            $query->whereHas('parcela', fn($q) => $q->where('finca_id', $fincaId));
        }

        $lotes = $query->get();

        return [
            'total_lotes' => $lotes->count(),
            'disponibles' => $lotes->where('estado', 'disponible')->count(),
            'reservados' => $lotes->where('estado', 'reservado')->count(),
            'en_negociacion' => $lotes->where('estado', 'en_negociacion')->count(),
            'vendidos' => $lotes->where('estado', 'vendido')->count(),
            'pagados' => $lotes->where('estado', 'pagado')->count(),
            'area_total_m2' => round($lotes->sum('area_m2'), 2),
            'valor_inventario_disponible' => round($lotes->where('estado', 'disponible')->sum('precio_venta'), 2),
            'lotes' => $lotes
        ];
    }

    /**
     * Reporte de Ventas y Negociaciones Inmobiliarias.
     */
    public function reporteVentas(?string $fechaDesde = null, ?string $fechaHasta = null): array
    {
        $query = Negociacion::with(['cliente', 'lote.parcela.finca', 'user']);
        
        if ($fechaDesde) $query->whereDate('fecha_negociacion', '>=', $fechaDesde);
        if ($fechaHasta) $query->whereDate('fecha_negociacion', '<=', $fechaHasta);

        $ventas = $query->get();

        return [
            'total_contratos' => $ventas->count(),
            'ventas_contado' => $ventas->where('tipo_negociacion', 'contado')->count(),
            'ventas_credito' => $ventas->where('tipo_negociacion', 'credito')->count(),
            'monto_total_ventas' => round($ventas->sum('precio_final'), 2),
            'monto_enganches_recaudados' => round($ventas->sum('enganche_pagado'), 2),
            'monto_total_financiado' => round($ventas->sum('monto_financiado'), 2),
            'ventas' => $ventas
        ];
    }

    /**
     * Reporte de Cartera y Cobranza de Terrenos.
     */
    public function reporteCobranza(): array
    {
        $negociaciones = Negociacion::with(['cliente', 'lote'])->whereIn('estado', ['activa', 'en_mora'])->get();

        return [
            'total_contratos_activos' => $negociaciones->count(),
            'saldo_cartera_capital' => round($negociaciones->sum('saldo_capital_pendiente'), 2),
            'capital_recuperado' => round($negociaciones->sum('total_capital_pagado'), 2),
            'intereses_recaudados' => round($negociaciones->sum('total_interes_pagado'), 2),
            'contratos_al_dia' => $negociaciones->where('dias_mora_actual', 0)->count(),
            'contratos_en_mora' => $negociaciones->where('dias_mora_actual', '>', 0)->count(),
            'contratos' => $negociaciones
        ];
    }

    /**
     * Reporte Diario de Ingresos en Caja por Terrenos.
     */
    public function reporteIngresosDiario(?string $fecha = null): array
    {
        $fechaConsulta = $fecha ?? Carbon::today()->format('Y-m-d');

        $pagos = PagoTerreno::with(['cliente', 'lote', 'user'])
            ->whereDate('fecha_pago', $fechaConsulta)
            ->get();

        return [
            'fecha' => $fechaConsulta,
            'total_recibos' => $pagos->count(),
            'total_ingresos' => round($pagos->sum('monto_total'), 2),
            'total_capital' => round($pagos->sum('distribucion_capital'), 2),
            'total_interes' => round($pagos->sum('distribucion_interes'), 2),
            'total_mora' => round($pagos->sum('distribucion_mora'), 2),
            'desglose_por_metodo' => [
                'efectivo' => round($pagos->where('metodo_pago', 'efectivo')->sum('monto_total'), 2),
                'transferencia' => round($pagos->where('metodo_pago', 'transferencia')->sum('monto_total'), 2),
                'deposito' => round($pagos->where('metodo_pago', 'deposito')->sum('monto_total'), 2),
                'tarjeta' => round($pagos->where('metodo_pago', 'tarjeta')->sum('monto_total'), 2),
                'cheque' => round($pagos->where('metodo_pago', 'cheque')->sum('monto_total'), 2),
            ],
            'pagos' => $pagos
        ];
    }
}
