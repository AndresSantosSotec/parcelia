<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNegociacionRequest;
use App\Models\Negociacion;
use App\Models\Lote;
use App\Models\Cliente;
use App\Models\PlanPagoTerreno;
use App\Models\PagoTerreno;
use App\Models\ParametrizacionMoraInmobiliaria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

use App\Services\Inmobiliario\FinancingService;
use Barryvdh\DomPDF\Facade\Pdf;

class NegociacionController extends Controller
{
    protected $financingService;

    public function __construct(FinancingService $financingService)
    {
        $this->financingService = $financingService;
    }

    public function index(Request $request)
    {
        $query = Negociacion::with(['comprador', 'lote.parcela.finca', 'asesor', 'planPagos', 'parametrizacionMora'])
            ->withCount('planPagos');

        if ($request->filled('estado') && $request->estado !== 'todos') {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('tipo_negociacion') && $request->tipo_negociacion !== '') {
            $query->where('tipo_negociacion', $request->tipo_negociacion);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        if ($request->filled('_sucursal_scope')) {
            $query->where('sucursal_id', $request->_sucursal_scope);
        }

        // Búsqueda global en ventas / contratos
        $busqueda = trim((string) $request->input('busqueda', $request->input('search', '')));
        if ($busqueda !== '') {
            $query->where(function ($q) use ($busqueda) {
                $q->where('codigo_negociacion', 'like', "%{$busqueda}%")
                    ->orWhere('observaciones', 'like', "%{$busqueda}%")
                    ->orWhereHas('comprador', function ($cq) use ($busqueda) {
                        $cq->where('nombres', 'like', "%{$busqueda}%")
                            ->orWhere('apellidos', 'like', "%{$busqueda}%")
                            ->orWhere('dpi', 'like', "%{$busqueda}%")
                            ->orWhere('nit', 'like', "%{$busqueda}%")
                            ->orWhere('telefono', 'like', "%{$busqueda}%")
                            ->orWhereRaw("CONCAT(COALESCE(nombres, ''), ' ', COALESCE(apellidos, '')) LIKE ?", ["%{$busqueda}%"]);
                    })
                    ->orWhereHas('lote', function ($lq) use ($busqueda) {
                        $lq->where('numero_lote', 'like', "%{$busqueda}%")
                            ->orWhere('codigo_unico', 'like', "%{$busqueda}%")
                            ->orWhereHas('parcela', function ($pq) use ($busqueda) {
                                $pq->where('nombre_identificador', 'like', "%{$busqueda}%")
                                    ->orWhere('codigo', 'like', "%{$busqueda}%")
                                    ->orWhereHas('finca', function ($fq) use ($busqueda) {
                                        $fq->where('nombre', 'like', "%{$busqueda}%");
                                    });
                            });
                    });
            });
        }

        $user = $request->user();
        if ($user && ! in_array($user->rol, ['superadmin', 'administrador'], true)) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('lote', function ($lq) use ($user) {
                        $lq->where('vendedor_id', $user->id);
                    });
            });
        }

        // Ordenamiento dinámico
        $orderBy = $request->input('order_by', 'id');
        $orderDir = strtolower((string) $request->input('order_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $columnasPermitidas = ['id', 'created_at', 'fecha_negociacion', 'codigo_negociacion', 'precio_final', 'saldo_capital_pendiente'];
        if (in_array($orderBy, $columnasPermitidas, true)) {
            $query->orderBy($orderBy, $orderDir);
        } else {
            $query->orderBy('id', $orderDir);
        }

        $perPageParam = $request->input('per_page');
        $perPage = ($perPageParam === 'all' || (int)$perPageParam === -1)
            ? 500
            : min(500, max(10, (int) ($perPageParam ?? 50)));

        $paginator = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => array_values($paginator->items()),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show($id)
    {
        $negociacion = Negociacion::with([
            'comprador',
            'lote.parcela.finca',
            'lote.servicios',
            'asesor',
            'gastos',
            'planPagos',
            'parametrizacionMora',
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
            'lote_id' => 'nullable|integer',
            'tasa_interes_id' => 'nullable|integer',
            'precio_lote' => 'required_without:lote_id|nullable|numeric|min:0.01',
            'descuento' => 'nullable|numeric|min:0',
            'enganche' => 'nullable|numeric|min:0',
            'gastos_escrituracion' => 'nullable|numeric|min:0',
            'gastos_administrativos' => 'nullable|numeric|min:0',
            'plazo_meses' => 'required|integer|min:1|max:240',
            'periodo_pago' => 'nullable|in:mensual,bimestral,trimestral,cuatrimestral,quimestral,semestral,anual',
            'tasa_interes_anual' => 'nullable|numeric|min:0|max:100',
            'metodo' => 'nullable|string|in:frances,aleman,americano,plano,flat,simple',
            'fecha_primer_pago' => 'nullable|date',
        ]);

        $precio = (float) ($validated['precio_lote'] ?? 0);
        $lote = null;
        if (! empty($validated['lote_id'])) {
            $lote = Lote::find($validated['lote_id']);
            if (! $lote || ! $lote->esVisiblePara($request->user())) {
                return response()->json(['success' => false, 'message' => 'No tiene acceso a este lote.'], 403);
            }
            $precio = round((float) $lote->precio_venta, 2);
            if ($precio < 0.01) {
                return response()->json(['success' => false, 'message' => 'El lote no tiene un precio de venta válido.'], 422);
            }
        }

        $descuento = (float) ($validated['descuento'] ?? 0);
        if ($descuento >= $precio) {
            return response()->json(['success' => false, 'message' => 'El descuento no puede ser igual o mayor al precio del lote.'], 422);
        }

        $tasa = (float) ($validated['tasa_interes_anual'] ?? 0);
        if (! empty($validated['tasa_interes_id'])) {
            try {
                $tasa = (float) $this->tasaVigente((int) $validated['tasa_interes_id'])->porcentaje_anual;
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        $simulacion = $this->financingService->simularFinanciamiento(
            $precio,
            $descuento,
            (float) ($validated['gastos_escrituracion'] ?? 0),
            (float) ($validated['gastos_administrativos'] ?? 0),
            (float) ($validated['enganche'] ?? 0),
            $tasa,
            (int) $validated['plazo_meses'],
            $validated['metodo'] ?? 'frances',
            $validated['fecha_primer_pago'] ?? null,
            $validated['periodo_pago'] ?? 'mensual'
        );

        if ($lote) {
            $simulacion['lote_id'] = $lote->id;
            $simulacion['lote_estado'] = $lote->estado;
        }

        return response()->json([
            'success' => true,
            'data' => $simulacion,
        ]);
    }

    private function tasaVigente(int $id): \App\Models\TasaInteres
    {
        $tasa = \App\Models\TasaInteres::where('id', $id)->where('activo', true)->first();
        if (! $tasa) {
            throw new \InvalidArgumentException('La tasa de interés no está vigente.');
        }
        $hoy = now()->toDateString();
        if ($tasa->vigencia_inicio && $tasa->vigencia_inicio->format('Y-m-d') > $hoy) {
            throw new \InvalidArgumentException('La tasa de interés aún no está vigente.');
        }
        if ($tasa->vigencia_fin && $tasa->vigencia_fin->format('Y-m-d') < $hoy) {
            throw new \InvalidArgumentException('La tasa de interés está vencida.');
        }

        return $tasa;
    }

    public function cotizacionPdf(Request $request)
    {
        $validated = $request->validate([
            'precio_lote' => 'required|numeric|min:0.01',
            'descuento' => 'nullable|numeric|min:0|lt:precio_lote',
            'enganche' => 'nullable|numeric|min:0',
            'gastos_escrituracion' => 'nullable|numeric|min:0',
            'gastos_administrativos' => 'nullable|numeric|min:0',
            'plazo_meses' => 'required|integer|min:1|max:240',
            'periodo_pago' => 'nullable|in:mensual,bimestral,trimestral,cuatrimestral,quimestral,semestral,anual',
            'tasa_interes_anual' => 'nullable|numeric|min:0|max:100',
            'metodo' => 'nullable|string|in:frances,aleman,americano,plano,flat,simple',
            'fecha_primer_pago' => 'nullable|date',
            'nombre_prospecto' => 'nullable|string|max:160',
            'telefono_prospecto' => 'nullable|string|max:40',
            'lote_id' => 'nullable|integer|exists:lotes,id',
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
            $validated['fecha_primer_pago'] ?? null,
            $validated['periodo_pago'] ?? 'mensual'
        );

        $lote = ! empty($validated['lote_id'])
            ? Lote::with('parcela.finca')->find($validated['lote_id'])
            : null;

        $filas = collect($simulacion['cuotas'] ?? [])->map(fn ($c) => [
            $c['numero_cuota'] ?? '',
            $c['fecha_vencimiento'] ?? '',
            $c['cuota_capital'] ?? 0,
            $c['cuota_interes'] ?? 0,
            $c['cuota_monto_total'] ?? 0,
            $c['saldo_capital_restante'] ?? 0,
        ])->all();

        $empresa = \App\Helpers\EmpresaConfigHelper::getConfig();
        $pdf = Pdf::loadView('reportes.documento-tabla', [
            'titulo' => 'Cotización de financiamiento inmobiliario',
            'lineas' => [
                'Prospecto: '.($validated['nombre_prospecto'] ?: 'Cliente prospecto').' · Tel. '.($validated['telefono_prospecto'] ?: '—'),
                'Lote: '.($lote ? $lote->codigo_unico.' ('.$lote->numero_lote.') · '.($lote->parcela?->finca?->nombre ?? '') : 'Precio ingresado manualmente'),
                'Precio '.$simulacion['precio_original'].' · Descuento '.$simulacion['descuento'].' · Precio final '.$simulacion['precio_final'],
                'Enganche '.$simulacion['enganche'].' · Cuota '.$simulacion['cuota_mensual'].' · '.$simulacion['plazo_meses'].' meses · Tasa '.$simulacion['tasa_anual'].'%',
            ],
            'encabezados' => ['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Cuota total', 'Saldo'],
            'filas' => $filas,
            'generado' => now(),
            'empresa' => $empresa,
        ])->setPaper('letter', 'portrait');

        return $pdf->download('cotizacion-financiamiento.pdf');
    }

    /**
     * Crear una negociación formal con comprador y lote
     */
    public function store(StoreNegociacionRequest $request)
    {
        $validated = $request->validated();

        $cliente = Cliente::where('id', $validated['cliente_id'])->where('eliminado', false)->first();
        if (!$cliente) {
            return response()->json(['success' => false, 'message' => 'El comprador no existe o está eliminado.'], 422);
        }

        try {
            return DB::transaction(function () use ($validated, $request) {
                $lote = Lote::lockForUpdate()->findOrFail($validated['lote_id']);
                $holdMs = (int) env('INMOBILIARIO_QA_LOCK_HOLD_MS', 0);
                if ($holdMs > 0 && $holdMs <= 5000) {
                    usleep($holdMs * 1000);
                }
                if ($lote->negociacion_activa_id) {
                    throw new \InvalidArgumentException('El lote ya está ocupado por otra negociación.');
                }
                $loteEstado = app(\App\Services\Inmobiliario\LoteEstadoService::class);
                $allocation = app(\App\Services\Inmobiliario\PaymentAllocationService::class);

                if (in_array($lote->estado, ['vendido', 'pagado', 'en_negociacion'], true)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El lote seleccionado no está disponible para una nueva venta.',
                    ], 422);
                }

                if ($lote->estado === 'reservado') {
                    return response()->json([
                        'success' => false,
                        'message' => 'El lote está reservado. Cancele la reserva antes de venderlo a otro comprador.',
                    ], 422);
                }

                $negociacionExistente = Negociacion::where('lote_id', $lote->id)
                    ->whereIn('estado', ['activa', 'reservada', 'en_mora', 'borrador'])
                    ->lockForUpdate()
                    ->first();

                if ($negociacionExistente) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El lote ya tiene una negociación activa en curso.',
                    ], 422);
                }

                $precioOriginal = round((float) $lote->precio_venta, 2);
                if ($precioOriginal < 0.01) {
                    throw new \InvalidArgumentException('El lote no tiene un precio de venta válido.');
                }

                $descuento = round((float) ($validated['descuento'] ?? 0), 2);
                if ($descuento >= $precioOriginal) {
                    throw new \InvalidArgumentException('El descuento no puede ser igual o mayor al precio del lote.');
                }

                $gastosEscritura = round((float) ($validated['gastos_escrituracion'] ?? 0), 2);
                $gastosAdmin = round((float) ($validated['gastos_administrativos'] ?? 0), 2);
                $precioFinal = round($precioOriginal - $descuento + $gastosEscritura + $gastosAdmin, 2);

                if ($precioFinal < 0.01) {
                    throw new \InvalidArgumentException('El precio final de la operación debe ser mayor a cero.');
                }

                $tipo = $validated['tipo_negociacion'];
                $moraConfig = $this->resolverMoraCatalogo(
                    isset($validated['parametrizacion_mora_id']) ? (int) $validated['parametrizacion_mora_id'] : null,
                    $request->user()?->sucursal_id,
                    $tipo
                );
                $enganchePactado = ($tipo === 'contado') ? $precioFinal : round((float) ($validated['enganche_pactado'] ?? 0), 2);
                if ($enganchePactado > $precioFinal) {
                    throw new \InvalidArgumentException('El enganche no puede superar el precio final.');
                }

                $montoFinanciado = max(0, round($precioFinal - $enganchePactado, 2));
                $plazoMeses = ($tipo === 'credito') ? (int) $validated['plazo_meses'] : 1;
                $periodoPago = ($tipo === 'credito')
                    ? FinancingService::normalizarPeriodo($validated['periodo_pago'] ?? 'mensual')
                    : 'mensual';
                $pasoPago = FinancingService::mesesDePeriodo($periodoPago);
                $numeroCuotas = ($tipo === 'credito')
                    ? FinancingService::numeroCuotas($plazoMeses, $periodoPago)
                    : 0;
                $tasaCatalogo = null;
                if (!empty($validated['tasa_interes_id'])) {
                    $tasaCatalogo = \App\Models\TasaInteres::where('id', $validated['tasa_interes_id'])
                        ->where('activo', true)
                        ->first();
                    if (!$tasaCatalogo) {
                        throw new \InvalidArgumentException('La tasa de interés no está vigente.');
                    }
                    $hoy = now()->toDateString();
                    if ($tasaCatalogo->vigencia_inicio && $tasaCatalogo->vigencia_inicio->format('Y-m-d') > $hoy) {
                        throw new \InvalidArgumentException('La tasa de interés aún no está vigente.');
                    }
                    if ($tasaCatalogo->vigencia_fin && $tasaCatalogo->vigencia_fin->format('Y-m-d') < $hoy) {
                        throw new \InvalidArgumentException('La tasa de interés está vencida.');
                    }
                }
                $tasaAnual = ($tipo === 'contado')
                    ? 0
                    : (float) ($tasaCatalogo?->porcentaje_anual ?? $validated['tasa_interes_anual'] ?? 0);
                $sistema = $validated['sistema_amortizacion'] ?? 'frances';

                $fechaNegociacion = Carbon::parse($validated['fecha_negociacion']);
                $fechaPrimerPago = isset($validated['fecha_primer_pago'])
                    ? Carbon::parse($validated['fecha_primer_pago'])
                    : $fechaNegociacion->copy()->addMonths($pasoPago);

                $anio = date('Y');
                $ultimo = Negociacion::where('codigo_negociacion', 'like', "NEG-{$anio}-%")->lockForUpdate()->orderByDesc('id')->value('codigo_negociacion');
                $n = 1;
                if ($ultimo && preg_match('/(\d+)$/', $ultimo, $m)) {
                    $n = intval($m[1]) + 1;
                }
                $codigo = sprintf('NEG-%s-%04d', $anio, $n);

                $negociacion = Negociacion::create([
                    'codigo_negociacion' => $codigo,
                    'cliente_id' => $validated['cliente_id'],
                    'lote_id' => $lote->id,
                    'user_id' => $request->user()->id ?? null,
                    'sucursal_id' => $request->user()?->sucursal_id,
                    'tipo_negociacion' => $tipo,
                    'precio_original' => $precioOriginal,
                    'descuento' => $descuento,
                    'gastos_escrituracion' => $gastosEscritura,
                    'gastos_administrativos' => $gastosAdmin,
                    'precio_final' => $precioFinal,
                    'enganche_pactado' => $enganchePactado,
                    'enganche_pagado' => 0,
                    'monto_financiado' => $montoFinanciado,
                    'tasa_interes_id' => $validated['tasa_interes_id'] ?? $tasaCatalogo?->id,
                    'parametrizacion_mora_id' => $moraConfig?->id,
                    'tasa_interes_anual' => $tasaAnual,
                    'sistema_amortizacion' => $sistema,
                    'politica_abono_extra' => $validated['politica_abono_extra'] ?? 'reducir_plazo',
                    'tipo_mora_aplicada' => $moraConfig?->tipo_calculo,
                    'mora_porcentaje_diario_snapshot' => $moraConfig?->porcentaje_diario,
                    'mora_monto_fijo_diario_snapshot' => $moraConfig?->monto_fijo_diario,
                    'mora_dias_gracia_snapshot' => $moraConfig?->dias_gracia,
                    'plazo_meses' => $plazoMeses,
                    'periodo_pago' => $periodoPago,
                    'cuota_mensual' => 0,
                    'saldo_capital_pendiente' => $tipo === 'credito' ? $montoFinanciado : $precioFinal,
                    'cuotas_pendientes' => $numeroCuotas,
                    'fecha_negociacion' => $fechaNegociacion,
                    'fecha_primer_pago' => $fechaPrimerPago,
                    'fecha_vencimiento_contrato' => $pasoPago === 1
                        ? $fechaPrimerPago->copy()->addMonths(max($plazoMeses, 1))
                        : $fechaPrimerPago->copy()->addMonths(max(0, $numeroCuotas - 1) * $pasoPago),
                    'estado' => ($tipo === 'reserva') ? 'reservada' : 'activa',
                    'observaciones' => $validated['observaciones'] ?? null,
                    'origen_fondos' => $validated['origen_fondos'] ?? null,
                ]);

                if ($tipo === 'credito' && ! empty($validated['gas_ids'])) {
                    app(\App\Services\GastosService::class)
                        ->sincronizarGastosNegociacion($negociacion, $validated['gas_ids']);
                }

                if ($tipo === 'reserva') {
                    $loteEstado->transicionar($lote, 'reservado');
                    $loteEstado->ocupar($lote, $negociacion);
                } elseif ($tipo === 'contado') {
                    $loteEstado->transicionar($lote, 'en_negociacion');
                    $loteEstado->transicionar($lote, 'vendido');
                    $loteEstado->ocupar($lote, $negociacion);
                    $montoPago = (float) ($validated['monto_pago'] ?? $precioFinal);
                    if (abs($montoPago - $precioFinal) > 0.05) {
                        throw new \InvalidArgumentException('La venta de contado debe cobrar el precio final en caja en el mismo momento.');
                    }
                    $allocation->procesarPago(
                        $negociacion,
                        $montoPago,
                        'pago_total',
                        $validated['metodo_pago'] ?? 'efectivo',
                        $validated['referencia_bancaria'] ?? null,
                        'Venta de contado',
                        $validated['observaciones'] ?? null,
                        null,
                        $validated['origen_fondos'] ?? null,
                        null,
                        $fechaNegociacion->toDateString()
                    );
                } else {
                    $loteEstado->transicionar($lote, 'en_negociacion');
                    $loteEstado->ocupar($lote, $negociacion);
                }

                return response()->json([
                    'success' => true,
                    'data' => $negociacion->fresh()->load(['comprador', 'lote.parcela.finca', 'planPagos', 'pagos', 'gastos']),
                    'message' => $tipo === 'credito'
                        ? 'Negociación registrada. Pendiente de enganche para generar el plan de pagos.'
                        : 'Operación registrada.',
                ], 201);
            });
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Actualizar fechas de una negociación / contrato existente (permite fechas anteriores y recalcula cronograma).
     */
    public function actualizarFechas(Request $request, $id)
    {
        $validated = $request->validate([
            'fecha_negociacion' => 'required|date',
            'fecha_primer_pago' => 'nullable|date|after_or_equal:fecha_negociacion',
            'sincronizar_pagos_iniciales' => 'nullable|boolean',
        ]);

        try {
            $negociacion = DB::transaction(function () use ($validated, $request, $id) {
                $negociacion = Negociacion::lockForUpdate()->findOrFail($id);

                if ($negociacion->estado === 'rescindida') {
                    throw new \InvalidArgumentException('No se pueden modificar las fechas de una negociación rescindida.');
                }

                $fechaNegociacion = Carbon::parse($validated['fecha_negociacion']);
                $periodoPago = FinancingService::normalizarPeriodo($negociacion->periodo_pago ?? 'mensual');
                $pasoPago = FinancingService::mesesDePeriodo($periodoPago);
                $plazoMeses = max(1, (int) ($negociacion->plazo_meses ?: 1));
                $numeroCuotas = $negociacion->tipo_negociacion === 'credito'
                    ? FinancingService::numeroCuotas($plazoMeses, $periodoPago)
                    : 0;

                $fechaPrimerPago = !empty($validated['fecha_primer_pago'])
                    ? Carbon::parse($validated['fecha_primer_pago'])
                    : $fechaNegociacion->copy()->addMonths($pasoPago);

                $fechaVencimientoContrato = $pasoPago === 1
                    ? $fechaPrimerPago->copy()->addMonths($plazoMeses)
                    : $fechaPrimerPago->copy()->addMonths(max(0, $numeroCuotas - 1) * $pasoPago);

                $negociacion->fecha_negociacion = $fechaNegociacion->toDateString();
                $negociacion->fecha_primer_pago = $fechaPrimerPago->toDateString();
                $negociacion->fecha_vencimiento_contrato = $fechaVencimientoContrato->toDateString();
                $negociacion->save();

                // Recalcular fechas de vencimiento de las cuotas del plan de pagos si existen
                $cuotas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
                    ->orderBy('numero_cuota')
                    ->lockForUpdate()
                    ->get();

                if ($cuotas->isNotEmpty()) {
                    foreach ($cuotas as $idx => $cuota) {
                        $num = max(1, (int) ($cuota->numero_cuota ?: ($idx + 1)));
                        $nuevaFechaVenc = $fechaPrimerPago->copy()->addMonths(($num - 1) * $pasoPago)->format('Y-m-d');
                        $cuota->fecha_vencimiento = $nuevaFechaVenc;
                        $cuota->save();
                    }

                    app(\App\Services\Inmobiliario\MoraTerrenoService::class)
                        ->recargarNegociacion($negociacion->fresh());
                }

                // Si se solicita sincronizar la fecha de pagos iniciales (contado o enganche) con la fecha de venta
                $sincronizarPagos = $request->boolean('sincronizar_pagos_iniciales', true);
                if ($sincronizarPagos) {
                    $pagosIniciales = PagoTerreno::where('negociacion_id', $negociacion->id)
                        ->whereIn('tipo_pago', ['pago_total', 'enganche'])
                        ->get();

                    foreach ($pagosIniciales as $pago) {
                        $pago->fecha_pago = $fechaNegociacion->copy()->setTimeFrom(Carbon::parse($pago->fecha_pago ?? now()));
                        $pago->save();

                        if ($pago->recibo_id) {
                            \App\Models\Recibo::where('id', $pago->recibo_id)->update([
                                'fecha' => $fechaNegociacion->copy()->startOfDay(),
                            ]);
                        }
                    }
                }

                return $negociacion->fresh()->load(['comprador', 'lote.parcela.finca', 'planPagos', 'pagos', 'gastos', 'parametrizacionMora']);
            });

            return response()->json([
                'success' => true,
                'data' => $negociacion,
                'message' => 'Fechas de la venta y cronograma actualizados correctamente.',
            ]);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function cancelarReserva(Request $request, $id)
    {
        return $this->rescindir($request, $id);
    }

    public function rescindir(Request $request, $id)
    {
        $validated = $request->validate([
            'motivo' => 'required|string|min:5|max:500',
        ]);

        try {
            $negociacion = Negociacion::findOrFail($id);
            $resultado = app(\App\Services\Inmobiliario\PaymentAllocationService::class)
                ->rescindir($negociacion, $validated['motivo'], $request->user());

            return response()->json([
                'success' => true,
                'data' => $resultado,
                'message' => 'Negociación rescindida. Se revirtieron cobros, recibos y el lote volvió a disponible.',
            ]);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    private function resolverMoraCatalogo(?int $id, ?int $sucursalId, string $tipo): ?ParametrizacionMoraInmobiliaria
    {
        if ($id) {
            $config = ParametrizacionMoraInmobiliaria::where('id', $id)->where('activo', true)->first();
            if (!$config) {
                throw new \InvalidArgumentException('La regla de mora seleccionada no está vigente. Elíjala de nuevo en Tasas & Mora.');
            }

            return $config;
        }

        if ($tipo !== 'credito') {
            return null;
        }

        $config = ParametrizacionMoraInmobiliaria::vigente($sucursalId);
        if (!$config) {
            throw new \InvalidArgumentException('No hay una regla de mora activa. Cree una en Tasas & Mora y selecciónela al vender a crédito.');
        }

        return $config;
    }
}
