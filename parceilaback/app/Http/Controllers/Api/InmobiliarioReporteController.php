<?php

namespace App\Http\Controllers\Api;

use App\Exports\InmobiliarioArrayExport;
use App\Http\Controllers\Controller;
use App\Services\Inmobiliario\AccountStatementService;
use App\Services\Inmobiliario\ContractTemplateService;
use App\Services\Inmobiliario\InmobiliarioReportingService;
use App\Models\Negociacion;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class InmobiliarioReporteController extends Controller
{
    public function __construct(
        protected InmobiliarioReportingService $reportingService,
        protected AccountStatementService $statementService,
        protected ContractTemplateService $contractService
    ) {
    }

    public function inventario(Request $request): Response
    {
        $fincaId = $request->finca_id ? (int) $request->finca_id : null;
        $perPage = $this->perPage($request);
        $data = $this->reportingService->reporteInventario(
            $fincaId,
            (int) $request->input('page', 1),
            $perPage
        );

        if ($request->input('formato') === 'pdf') {
            return $this->pdf('reportes.inmobiliario-inventario', 'inventario-lotes.pdf', $data);
        }
        if ($request->input('formato') === 'xlsx') {
            $rows = collect($data['lotes'])->map(fn ($lote) => [
                $lote->codigo_unico,
                $lote->parcela?->finca?->nombre,
                $lote->parcela?->nombre_identificador,
                $lote->numero_lote,
                $lote->area_m2,
                $lote->precio_venta,
                $lote->estado,
            ])->all();

            return Excel::download(new InmobiliarioArrayExport(
                ['Código', 'Finca', 'Parcela', 'Lote', 'Área m2', 'Precio', 'Estado'],
                $rows
            ), 'inventario-lotes.xlsx');
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function ventas(Request $request): Response
    {
        $request->validate([
            'fecha_desde' => 'nullable|date',
            'fecha_hasta' => 'nullable|date|after_or_equal:fecha_desde',
        ]);

        $data = $this->reportingService->reporteVentas(
            $request->fecha_desde,
            $request->fecha_hasta,
            (int) $request->input('page', 1),
            $this->perPage($request)
        );

        if ($request->input('formato') === 'pdf') {
            return $this->pdf('reportes.inmobiliario-ventas', 'ventas-terrenos.pdf', $data);
        }
        if ($request->input('formato') === 'xlsx') {
            $rows = collect($data['ventas'])->map(fn ($v) => [
                $v->codigo_negociacion,
                optional($v->fecha_negociacion)->format('Y-m-d'),
                trim(($v->comprador?->nombres ?? '').' '.($v->comprador?->apellidos ?? '')),
                $v->lote?->codigo_unico,
                $v->tipo_negociacion,
                $v->precio_final,
                $v->enganche_pagado,
                $v->monto_financiado,
                $v->saldo_capital_pendiente,
                $v->estado,
            ])->all();

            return Excel::download(new InmobiliarioArrayExport(
                ['Contrato', 'Fecha', 'Comprador', 'Lote', 'Tipo', 'Precio', 'Enganche', 'Financiado', 'Saldo', 'Estado'],
                $rows
            ), 'ventas-terrenos.xlsx');
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function cobranza(Request $request): Response
    {
        $data = $this->reportingService->reporteCobranza(
            (int) $request->input('page', 1),
            $this->perPage($request)
        );

        if ($request->input('formato') === 'pdf') {
            return $this->pdf('reportes.inmobiliario-cobranza', 'cartera-terrenos.pdf', $data);
        }
        if ($request->input('formato') === 'xlsx') {
            $rows = collect($data['contratos'])->map(fn ($c) => [
                $c->codigo_negociacion,
                trim(($c->comprador?->nombres ?? '').' '.($c->comprador?->apellidos ?? '')),
                $c->precio_final,
                $c->total_capital_pagado,
                $c->saldo_capital_pendiente,
                $c->cuotas_pagadas,
                $c->plazo_meses,
                $c->dias_mora_actual,
                $c->estado,
            ])->all();

            return Excel::download(new InmobiliarioArrayExport(
                ['Contrato', 'Comprador', 'Precio', 'Capital pagado', 'Saldo', 'Cuotas pagadas', 'Plazo', 'Días mora', 'Estado'],
                $rows
            ), 'cartera-terrenos.xlsx');
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function ingresosDiarios(Request $request): Response
    {
        $request->validate([
            'fecha' => 'nullable|date',
            'fecha_hasta' => 'nullable|date|after_or_equal:fecha',
        ]);

        $data = $this->reportingService->reporteIngresosDiario($request->fecha, $request->fecha_hasta);

        if ($request->input('formato') === 'pdf') {
            return $this->pdf('reportes.inmobiliario-ingresos', 'ingresos-terrenos.pdf', $data);
        }
        if ($request->input('formato') === 'xlsx') {
            $rows = collect($data['pagos'])->map(fn ($p) => [
                $p->numero_recibo,
                optional($p->fecha_pago)->format('Y-m-d H:i'),
                trim(($p->comprador?->nombres ?? '').' '.($p->comprador?->apellidos ?? '')),
                $p->lote?->codigo_unico,
                $p->tipo_pago,
                $p->metodo_pago,
                $p->monto_total,
            ])->all();

            return Excel::download(new InmobiliarioArrayExport(
                ['Recibo', 'Fecha', 'Comprador', 'Lote', 'Tipo', 'Método', 'Monto'],
                $rows
            ), 'ingresos-terrenos.xlsx');
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function estadoCuenta(Request $request, int $id)
    {
        $data = $this->statementService->generarEstadoCuenta($id);

        if ($request->input('formato') === 'pdf') {
            $codigo = $data['resumen']['codigo_negociacion'] ?? $id;

            return $this->pdf(
                'reportes.inmobiliario-estado-cuenta',
                "estado-cuenta-{$codigo}.pdf",
                $data
            );
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function planPagosPdf(int $id)
    {
        $data = $this->statementService->generarEstadoCuenta($id);
        $codigo = $data['resumen']['codigo_negociacion'] ?? $id;

        return $this->pdf(
            'reportes.inmobiliario-plan-pagos',
            "plan-pagos-{$codigo}.pdf",
            $data,
            'landscape'
        );
    }

    public function contratoHtml(int $id)
    {
        $negociacion = Negociacion::with(['cliente', 'lote.parcela.finca'])->findOrFail($id);
        $empresaConfig = \App\Helpers\EmpresaConfigHelper::getConfig();
        $template = $this->contractService->getDefaultContractTemplate();
        $renderedHtml = $this->contractService->renderTemplate($template, $negociacion, $empresaConfig);

        return response()->json([
            'success' => true,
            'data' => [
                'negociacion_id' => $negociacion->id,
                'codigo_negociacion' => $negociacion->codigo_negociacion,
                'html' => $renderedHtml,
            ],
        ]);
    }

    private function perPage(Request $request): int
    {
        if (in_array($request->input('formato'), ['pdf', 'xlsx'], true)) {
            return min(2000, max(50, (int) $request->input('per_page', 500)));
        }

        return min(200, max(10, (int) $request->input('per_page', 50)));
    }

    private function pdf(string $view, string $filename, array $data, string $orientation = 'portrait'): Response
    {
        $pdf = Pdf::loadView($view, [
            'data' => $data,
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ])->setPaper('letter', $orientation);

        return $pdf->download($filename);
    }
}
