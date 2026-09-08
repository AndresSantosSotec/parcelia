<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Negociacion;
use App\Models\Lote;
use App\Models\Cliente;
use App\Models\PlanPagoTerreno;
use App\Models\PagoTerreno;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

use App\Services\Inmobiliario\FinancingService;

class NegociacionController extends Controller
{
    protected $financingService;

    public function __construct(FinancingService $financingService)
    {
        $this->financingService = $financingService;
    }

    public function index(Request $request)
    {
        $query = Negociacion::with(['comprador', 'lote.parcela.finca', 'asesor'])
            ->withCount('planPagos');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        $negociaciones = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $negociaciones,
        ]);
    }

    public function show($id)
    {
        $negociacion = Negociacion::with([
            'comprador',
            'lote.parcela.finca',
            'lote.servicios',
            'asesor',
            'planPagos',
            'pagos.usuario',
            'pagos.caja'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $negociacion,
        ]);
    }

    /**
     * Simulador de financiamiento para terrenos
     */
    public function simular(Request $request)
    {
        $validated = $request->validate([
            'precio_lote' => 'required|numeric|min:1',
            'descuento' => 'nullable|numeric|min:0',
            'enganche' => 'nullable|numeric|min:0',
            'gastos_escrituracion' => 'nullable|numeric|min:0',
            'gastos_administrativos' => 'nullable|numeric|min:0',
            'plazo_meses' => 'required|integer|min:1|max:240',
            'tasa_interes_anual' => 'nullable|numeric|min:0|max:100',
            'metodo' => 'nullable|string|in:frances,plano,flat,simple',
            'fecha_primer_pago' => 'nullable|date',
        ]);

        $simulacion = $this->financingService->simularFinanciamiento(
            (float) $validated['precio_lote'],
            (float) ($validated['descuento'] ?? 0),
            (float) ($validated['gastos_escrituracion'] ?? 0),
            (float) ($validated['gastos_administrativos'] ?? 0),
            (float) ($validated['enganche'] ?? 0),
            (float) ($validated['tasa_interes_anual'] ?? 0),
            (int) $validated['plazo_meses'],
            $validated['metodo'] ?? 'frances',
            $validated['fecha_primer_pago'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => $simulacion,
        ]);
    }

    /**
     * Crear una negociación formal con comprador y lote
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'lote_id' => 'required|exists:lotes,id',
            'tipo_negociacion' => 'required|in:contado,credito,reserva',
            'precio_original' => 'required|numeric|min:1',
            'descuento' => 'nullable|numeric|min:0',
            'gastos_escrituracion' => 'nullable|numeric|min:0',
            'gastos_administrativos' => 'nullable|numeric|min:0',
            'enganche_pactado' => 'nullable|numeric|min:0',
            'plazo_meses' => 'required|integer|min:1|max:240',
            'tasa_interes_anual' => 'nullable|numeric|min:0|max:100',
            'fecha_negociacion' => 'required|date',
            'fecha_primer_pago' => 'nullable|date',
            'observaciones' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $lote = Lote::lockForUpdate()->findOrFail($validated['lote_id']);

            // Regla de Negocio: Validar que el lote no esté asignado a otra negociación activa
            if ($lote->estado === 'vendido' || $lote->estado === 'pagado') {
                return response()->json([
                    'success' => false,
                    'message' => 'El lote seleccionado ya fue vendido y no está disponible.',
                ], 422);
            }

            $negociacionExistente = Negociacion::where('lote_id', $lote->id)
                ->whereIn('estado', ['activa', 'reservada', 'en_mora'])
                ->first();

            if ($negociacionExistente) {
                return response()->json([
                    'success' => false,
                    'message' => 'El lote ya tiene una negociación activa en curso.',
                ], 422);
            }

            // Cálculos financieros
            $precioOriginal = (float) $validated['precio_original'];
            $descuento = (float) ($validated['descuento'] ?? 0);
            $gastosEscritura = (float) ($validated['gastos_escrituracion'] ?? 0);
            $gastosAdmin = (float) ($validated['gastos_administrativos'] ?? 0);
            $precioFinal = max(0, $precioOriginal - $descuento + $gastosEscritura + $gastosAdmin);

            $tipo = $validated['tipo_negociacion'];
            $enganchePactado = ($tipo === 'contado') ? $precioFinal : (float) ($validated['enganche_pactado'] ?? 0);
            $montoFinanciado = max(0, $precioFinal - $enganchePactado);
            $plazoMeses = ($tipo === 'contado') ? 1 : (int) $validated['plazo_meses'];
            $tasaAnual = ($tipo === 'contado') ? 0 : (float) ($validated['tasa_interes_anual'] ?? 0);

            $fechaNegociacion = Carbon::parse($validated['fecha_negociacion']);
            $fechaPrimerPago = isset($validated['fecha_primer_pago'])
                ? Carbon::parse($validated['fecha_primer_pago'])
                : $fechaNegociacion->copy()->addMonth();

            // Código correlativo
            $consecutivo = Negociacion::count() + 1;
            $codigo = 'NEG-' . date('Y') . '-' . str_pad($consecutivo, 4, '0', STR_PAD_LEFT);

            // Simulación de cuotas
            $tasaMensual = ($tasaAnual / 100) / 12;
            if ($tasaMensual > 0 && $montoFinanciado > 0) {
                $cuotaMensual = ($montoFinanciado * $tasaMensual) / (1 - pow(1 + $tasaMensual, -$plazoMeses));
            } else {
                $cuotaMensual = $plazoMeses > 0 ? ($montoFinanciado / $plazoMeses) : 0;
            }
            $cuotaMensual = round($cuotaMensual, 2);

            $negociacion = Negociacion::create([
                'codigo_negociacion' => $codigo,
                'cliente_id' => $validated['cliente_id'],
                'lote_id' => $lote->id,
                'user_id' => $request->user()->id ?? null,
                'tipo_negociacion' => $tipo,
                'precio_original' => $precioOriginal,
                'descuento' => $descuento,
                'gastos_escrituracion' => $gastosEscritura,
                'gastos_administrativos' => $gastosAdmin,
                'precio_final' => $precioFinal,
                'enganche_pactado' => $enganchePactado,
                'enganche_pagado' => 0,
                'monto_financiado' => $montoFinanciado,
                'tasa_interes_anual' => $tasaAnual,
                'plazo_meses' => $plazoMeses,
                'cuota_mensual' => $cuotaMensual,
                'saldo_capital_pendiente' => $montoFinanciado + $enganchePactado,
                'cuotas_pendientes' => $plazoMeses,
                'fecha_negociacion' => $fechaNegociacion,
                'fecha_primer_pago' => $fechaPrimerPago,
                'fecha_vencimiento_contrato' => $fechaPrimerPago->copy()->addMonths($plazoMeses),
                'estado' => ($tipo === 'reserva') ? 'reservada' : 'activa',
                'observaciones' => $validated['observaciones'] ?? null,
            ]);

            // Generar Plan de Pagos
            $saldoRestante = $montoFinanciado;
            $totalIntereses = 0;
            $fechaVenc = $fechaPrimerPago->copy();

            if ($tipo !== 'contado') {
                for ($i = 1; $i <= $plazoMeses; $i++) {
                    $interesCuota = round($saldoRestante * $tasaMensual, 2);
                    $capitalCuota = round($cuotaMensual - $interesCuota, 2);

                    if ($i === $plazoMeses || $capitalCuota > $saldoRestante) {
                        $capitalCuota = $saldoRestante;
                        $cuotaReal = $capitalCuota + $interesCuota;
                    } else {
                        $cuotaReal = $cuotaMensual;
                    }

                    $saldoRestante = max(0, round($saldoRestante - $capitalCuota, 2));
                    $totalIntereses += $interesCuota;

                    PlanPagoTerreno::create([
                        'negociacion_id' => $negociacion->id,
                        'numero_cuota' => $i,
                        'tipo_cuota' => 'ordinaria',
                        'fecha_vencimiento' => $fechaVenc->format('Y-m-d'),
                        'cuota_capital' => $capitalCuota,
                        'cuota_interes' => $interesCuota,
                        'cuota_monto_total' => $cuotaReal,
                        'saldo_capital_restante' => $saldoRestante,
                        'estado' => 'pendiente',
                    ]);

                    $fechaVenc->addMonth();
                }
            }

            $negociacion->update([
                'total_intereses_proyectados' => $totalIntereses,
                'total_a_pagar' => $enganchePactado + $montoFinanciado + $totalIntereses,
            ]);

            // Actualizar estado del lote a 'en_negociacion' o 'vendido'
            $lote->update([
                'estado' => ($tipo === 'reserva') ? 'reservado' : 'vendido',
            ]);

            return response()->json([
                'success' => true,
                'data' => $negociacion->load(['comprador', 'lote.parcela.finca', 'planPagos']),
                'message' => 'Negociación registrada exitosamente',
            ], 201);
        });
    }
}
