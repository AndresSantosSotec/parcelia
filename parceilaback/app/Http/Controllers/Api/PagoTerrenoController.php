<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePagoTerrenoRequest;
use App\Models\Negociacion;
use App\Models\PagoTerreno;
use App\Services\Inmobiliario\PaymentAllocationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PagoTerrenoController extends Controller
{
    public function __construct(private PaymentAllocationService $allocation)
    {
    }

    public function index(Request $request)
    {
        $query = PagoTerreno::with(['comprador', 'lote.parcela.finca', 'usuario', 'negociacion']);

        if ($request->filled('negociacion_id')) {
            $query->where('negociacion_id', $request->negociacion_id);
        }
        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }
        if ($request->filled('_sucursal_scope')) {
            $query->whereHas('negociacion', function ($q) use ($request) {
                $q->where('sucursal_id', $request->_sucursal_scope);
            });
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('fecha_pago', 'desc')->paginate(50),
        ]);
    }

    public function store(StorePagoTerrenoRequest $request)
    {
        $validated = $request->validated();

        try {
            $pago = DB::transaction(function () use ($validated) {
                $negociacion = Negociacion::lockForUpdate()->findOrFail($validated['negociacion_id']);

                return $this->allocation->procesarPago(
                    $negociacion,
                    (float) $validated['monto'],
                    $validated['tipo_pago'],
                    $validated['metodo_pago'],
                    $validated['referencia_bancaria'] ?? null,
                    null,
                    $validated['observaciones'] ?? null,
                    $validated['caja_apertura_cierre_id'] ?? null,
                    $validated['origen_fondos'] ?? null,
                    $validated['idempotency_key'] ?? null
                );
            });

            return response()->json([
                'success' => true,
                'data' => $pago->load(['comprador', 'lote.parcela.finca']),
                'message' => 'Pago registrado, aplicado a caja y recibo emitido.',
            ], 201);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function reciboPdf(int $id)
    {
        [$pago, $viewData] = $this->datosRecibo($id);

        $pdf = Pdf::loadView('reportes.inmobiliario-recibo-pago', $viewData)
            ->setPaper('letter', 'portrait');

        $recibo = $pago->numero_recibo ?? $id;

        return $pdf->download("recibo-pago-{$recibo}.pdf");
    }

    public function ticketPdf(int $id)
    {
        [$pago, $viewData] = $this->datosRecibo($id);

        $pdf = Pdf::loadView('reportes.inmobiliario-ticket-pago', $viewData);
        // 80 mm de ancho. Alto suficiente para el ticket, sin hoja carta.
        $pdf->setPaper([0, 0, 226.77, 566.93], 'portrait');

        $recibo = $pago->numero_recibo ?? $id;

        return $pdf->download("ticket-pago-{$recibo}.pdf");
    }

    /**
     * @return array{0: PagoTerreno, 1: array<string, mixed>}
     */
    private function datosRecibo(int $id): array
    {
        $pago = PagoTerreno::with(['comprador', 'lote.parcela.finca', 'negociacion', 'usuario'])->findOrFail($id);
        $negociacion = $pago->negociacion;
        $cliente = $pago->comprador;
        $lote = $pago->lote;

        $viewData = [
            'data' => [
                'pago' => $pago,
                'negociacion' => $negociacion,
                'cliente' => [
                    'nombre_completo' => trim(($cliente->nombres ?? '') . ' ' . ($cliente->apellidos ?? '')),
                    'dpi' => $cliente->dpi ?? 'N/A',
                    'nit' => $cliente->nit ?? 'C/F',
                    'telefono' => $cliente->telefono ?? 'N/A',
                ],
                'inmueble' => [
                    'finca' => $lote?->parcela?->finca?->nombre ?? '',
                    'parcela' => $lote?->parcela?->nombre_identificador ?? '',
                    'codigo_unico' => $lote?->codigo_unico,
                    'numero_lote' => $lote?->numero_lote,
                ],
                'saldo_despues' => $negociacion?->saldo_capital_pendiente ?? 0,
                'cobrador' => $pago->usuario?->name ?? '',
            ],
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ];

        return [$pago, $viewData];
    }

    public function anular(Request $request, $id)
    {
        $validated = $request->validate([
            'motivo' => 'required|string|min:5|max:500',
        ]);

        try {
            $pago = PagoTerreno::findOrFail($id);
            $anulado = $this->allocation->anularPago($pago, $validated['motivo'], $request->user());

            return response()->json([
                'success' => true,
                'data' => $anulado,
                'message' => 'Pago anulado. Se revirtió el movimiento de caja y el recibo.',
            ]);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
