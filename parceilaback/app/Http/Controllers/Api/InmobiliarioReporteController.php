<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Inmobiliario\AccountStatementService;
use App\Services\Inmobiliario\ContractTemplateService;
use App\Services\Inmobiliario\InmobiliarioReportingService;
use App\Models\Negociacion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InmobiliarioReporteController extends Controller
{
    protected $reportingService;
    protected $statementService;
    protected $contractService;

    public function __construct(
        InmobiliarioReportingService $reportingService,
        AccountStatementService $statementService,
        ContractTemplateService $contractService
    ) {
        $this->reportingService = $reportingService;
        $this->statementService = $statementService;
        $this->contractService = $contractService;
    }

    /**
     * GET /api/v1/reportes-inmobiliarios/inventario
     */
    public function inventario(Request $request): JsonResponse
    {
        $fincaId = $request->finca_id ? (int) $request->finca_id : null;
        $data = $this->reportingService->reporteInventario($fincaId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/v1/reportes-inmobiliarios/ventas
     */
    public function ventas(Request $request): JsonResponse
    {
        $data = $this->reportingService->reporteVentas($request->fecha_desde, $request->fecha_hasta);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/v1/reportes-inmobiliarios/cobranza
     */
    public function cobranza(): JsonResponse
    {
        $data = $this->reportingService->reporteCobranza();
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/v1/reportes-inmobiliarios/ingresos-diarios
     */
    public function ingresosDiarios(Request $request): JsonResponse
    {
        $data = $this->reportingService->reporteIngresosDiario($request->fecha);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/v1/negociaciones/{id}/estado-cuenta
     */
    public function estadoCuenta(int $id): JsonResponse
    {
        $data = $this->statementService->generarEstadoCuenta($id);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/v1/negociaciones/{id}/contrato-html
     */
    public function contratoHtml(int $id): JsonResponse
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
                'html' => $renderedHtml
            ]
        ]);
    }
}
