<?php

namespace App\Services\Inmobiliario;

use App\Models\Lote;
use App\Models\Negociacion;
use App\Models\PagoTerreno;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InmobiliarioReportingService
{
    public function reporteInventario(?int $fincaId = null, int $page = 1, int $perPage = 50): array
    {
        $query = Lote::query()->select([
            'id', 'parcela_id', 'numero_lote', 'codigo_unico', 'area_m2',
            'precio_venta', 'estado',
        ])->with(['parcela:id,finca_id,nombre_identificador', 'parcela.finca:id,nombre,codigo']);

        if ($fincaId) {
            $query->whereHas('parcela', fn ($q) => $q->where('finca_id', $fincaId));
        }

        $aggQuery = Lote::query();
        if ($fincaId) {
            $aggQuery->whereHas('parcela', fn ($q) => $q->where('finca_id', $fincaId));
        }

        $porEstado = (clone $aggQuery)
            ->select('estado', DB::raw('COUNT(*) as total'), DB::raw('COALESCE(SUM(area_m2),0) as area'), DB::raw('COALESCE(SUM(precio_venta),0) as valor'))
            ->groupBy('estado')
            ->get()
            ->keyBy('estado');

        $count = fn (string $estado) => (int) ($porEstado[$estado]->total ?? 0);
        $valor = fn (string $estado) => round((float) ($porEstado[$estado]->valor ?? 0), 2);

        $paginator = $query->orderBy('codigo_unico')->paginate($perPage, ['*'], 'page', $page);

        return [
            'total_lotes' => (int) (clone $aggQuery)->count(),
            'disponibles' => $count('disponible'),
            'reservados' => $count('reservado'),
            'en_negociacion' => $count('en_negociacion'),
            'vendidos' => $count('vendido'),
            'pagados' => $count('pagado'),
            'area_total_m2' => round((float) (clone $aggQuery)->sum('area_m2'), 2),
            'valor_inventario_disponible' => $valor('disponible'),
            'lotes' => array_values($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    public function reporteVentas(?string $fechaDesde = null, ?string $fechaHasta = null, int $page = 1, int $perPage = 50): array
    {
        $query = Negociacion::query()->whereNull('deleted_at');

        if ($fechaDesde) {
            $query->whereDate('fecha_negociacion', '>=', $fechaDesde);
        }
        if ($fechaHasta) {
            $query->whereDate('fecha_negociacion', '<=', $fechaHasta);
        }

        $agg = (clone $query)->selectRaw("
            COUNT(*) as total_contratos,
            SUM(CASE WHEN tipo_negociacion = 'contado' THEN 1 ELSE 0 END) as ventas_contado,
            SUM(CASE WHEN tipo_negociacion = 'credito' THEN 1 ELSE 0 END) as ventas_credito,
            COALESCE(SUM(precio_final),0) as monto_total_ventas,
            COALESCE(SUM(enganche_pagado),0) as monto_enganches_recaudados,
            COALESCE(SUM(monto_financiado),0) as monto_total_financiado,
            COALESCE(SUM(descuento),0) as descuentos_otorgados
        ")->first();

        $paginator = (clone $query)
            ->with(['comprador:id,nombres,apellidos,dpi', 'lote:id,codigo_unico,numero_lote,parcela_id', 'lote.parcela:id,finca_id,nombre_identificador', 'lote.parcela.finca:id,nombre,codigo'])
            ->orderByDesc('fecha_negociacion')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'total_contratos' => (int) ($agg->total_contratos ?? 0),
            'ventas_contado' => (int) ($agg->ventas_contado ?? 0),
            'ventas_credito' => (int) ($agg->ventas_credito ?? 0),
            'monto_total_ventas' => round((float) ($agg->monto_total_ventas ?? 0), 2),
            'monto_enganches_recaudados' => round((float) ($agg->monto_enganches_recaudados ?? 0), 2),
            'monto_total_financiado' => round((float) ($agg->monto_total_financiado ?? 0), 2),
            'descuentos_otorgados' => round((float) ($agg->descuentos_otorgados ?? 0), 2),
            'ventas' => array_values($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    public function reporteCobranza(int $page = 1, int $perPage = 50): array
    {
        $base = Negociacion::query()->whereIn('estado', ['activa', 'en_mora']);

        $agg = (clone $base)->selectRaw("
            COUNT(*) as total_contratos_activos,
            COALESCE(SUM(saldo_capital_pendiente),0) as saldo_cartera_capital,
            COALESCE(SUM(total_capital_pagado),0) as capital_recuperado,
            COALESCE(SUM(total_interes_pagado),0) as intereses_recaudados,
            SUM(CASE WHEN COALESCE(dias_mora_actual,0) = 0 THEN 1 ELSE 0 END) as contratos_al_dia,
            SUM(CASE WHEN COALESCE(dias_mora_actual,0) > 0 THEN 1 ELSE 0 END) as contratos_en_mora
        ")->first();

        $paginator = (clone $base)
            ->with(['comprador:id,nombres,apellidos,dpi', 'lote:id,codigo_unico,numero_lote'])
            ->orderByDesc('dias_mora_actual')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'total_contratos_activos' => (int) ($agg->total_contratos_activos ?? 0),
            'saldo_cartera_capital' => round((float) ($agg->saldo_cartera_capital ?? 0), 2),
            'capital_recuperado' => round((float) ($agg->capital_recuperado ?? 0), 2),
            'intereses_recaudados' => round((float) ($agg->intereses_recaudados ?? 0), 2),
            'contratos_al_dia' => (int) ($agg->contratos_al_dia ?? 0),
            'contratos_en_mora' => (int) ($agg->contratos_en_mora ?? 0),
            'contratos' => array_values($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    public function reporteIngresosDiario(?string $fecha = null, ?string $fechaHasta = null): array
    {
        $desde = $fecha ?? Carbon::today()->format('Y-m-d');
        $hasta = $fechaHasta ?? $desde;

        $pagosQuery = PagoTerreno::query()
            ->where('anulado', false)
            ->whereDate('fecha_pago', '>=', $desde)
            ->whereDate('fecha_pago', '<=', $hasta);

        $agg = (clone $pagosQuery)->selectRaw("
            COUNT(*) as total_recibos,
            COALESCE(SUM(monto_total),0) as total_ingresos,
            COALESCE(SUM(distribucion_capital),0) as total_capital,
            COALESCE(SUM(distribucion_interes),0) as total_interes,
            COALESCE(SUM(distribucion_mora),0) as total_mora
        ")->first();

        $porMetodo = (clone $pagosQuery)
            ->select('metodo_pago', DB::raw('COALESCE(SUM(monto_total),0) as total'))
            ->groupBy('metodo_pago')
            ->pluck('total', 'metodo_pago');

        $pagos = (clone $pagosQuery)
            ->with(['comprador:id,nombres,apellidos', 'lote:id,codigo_unico', 'usuario:id,name'])
            ->orderBy('fecha_pago')
            ->limit(500)
            ->get(['id', 'numero_recibo', 'cliente_id', 'lote_id', 'user_id', 'tipo_pago', 'monto_total', 'metodo_pago', 'fecha_pago', 'anulado']);

        return [
            'fecha' => $desde,
            'fecha_hasta' => $hasta,
            'total_recibos' => (int) ($agg->total_recibos ?? 0),
            'total_ingresos' => round((float) ($agg->total_ingresos ?? 0), 2),
            'total_capital' => round((float) ($agg->total_capital ?? 0), 2),
            'total_interes' => round((float) ($agg->total_interes ?? 0), 2),
            'total_mora' => round((float) ($agg->total_mora ?? 0), 2),
            'desglose_por_metodo' => [
                'efectivo' => round((float) ($porMetodo['efectivo'] ?? 0), 2),
                'transferencia' => round((float) ($porMetodo['transferencia'] ?? 0), 2),
                'deposito' => round((float) ($porMetodo['deposito'] ?? 0), 2),
                'tarjeta' => round((float) ($porMetodo['tarjeta'] ?? 0), 2),
                'cheque' => round((float) ($porMetodo['cheque'] ?? 0), 2),
            ],
            'pagos' => $pagos,
        ];
    }
}
