<?php

namespace App\Services\Inmobiliario;

use App\Models\MovimientoCaja;
use App\Models\Negociacion;
use App\Models\PagoTerreno;
use App\Models\PlanPagoTerreno;
use App\Models\Recibo;
use App\Services\CajaService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class PaymentAllocationService
{
    public function __construct(
        private MoraTerrenoService $moraService,
        private FinancingService $financingService,
        private LoteEstadoService $loteEstadoService,
        private AmlTerrenoService $amlService,
    ) {}

    public function procesarPago(
        Negociacion $negociacion,
        float $montoTotal,
        string $tipoPago = 'cuota_normal',
        string $metodoPago = 'efectivo',
        ?string $referenciaBancaria = null,
        ?string $concepto = null,
        ?string $observaciones = null,
        ?int $cajaAperturaId = null,
        ?string $origenFondos = null,
        ?string $idempotencyKey = null
    ): PagoTerreno {
        if ($montoTotal <= 0) {
            throw new InvalidArgumentException('El monto a pagar debe ser mayor a cero.');
        }

        $montoTotal = round($montoTotal, 2);

        $negociacion->refresh();
        $negociacion->loadMissing(['lote', 'comprador', 'planPagos']);

        return DB::transaction(function () use (
            $negociacion,
            $montoTotal,
            $tipoPago,
            $metodoPago,
            $referenciaBancaria,
            $concepto,
            $observaciones,
            $cajaAperturaId,
            $origenFondos,
            $idempotencyKey
        ) {
            $negociacion = Negociacion::lockForUpdate()->findOrFail($negociacion->id);
            $negociacion->loadMissing(['lote', 'comprador', 'planPagos']);

            if (in_array($negociacion->estado, ['pagada_total', 'rescindida'], true)) {
                throw new InvalidArgumentException('No se pueden registrar pagos sobre una negociación liquidada o rescindida.');
            }

            if ($idempotencyKey) {
                $existente = PagoTerreno::where('idempotency_key', $idempotencyKey)->first();
                if ($existente) {
                    return $existente;
                }
            }

            $userId = Auth::id() ?? $negociacion->user_id;
            $caja = CajaService::getCajaAbierta($userId);
            if (!$caja && !$cajaAperturaId) {
                throw new RuntimeException(
                    'Debe tener una caja abierta para registrar el cobro. Vaya a Caja & Cobros → Aperturar Caja e intente de nuevo.'
                );
            }
            $cajaId = $cajaAperturaId ?: $caja->id;

            $this->moraService->recargarNegociacion($negociacion);
            $negociacion->refresh();
            $configMora = $this->moraService->configDesdeNegociacion($negociacion);

            $aml = $this->amlService->validarContadoEfectivo(
                $metodoPago,
                $montoTotal,
                $negociacion->comprador?->dpi,
                $origenFondos ?? $negociacion->origen_fondos
            );
            if (!$aml['ok']) {
                throw new InvalidArgumentException($aml['message']);
            }

            $deuda = $this->deudaTotalPendiente($negociacion);
            if ($montoTotal > $deuda + 0.05) {
                throw new InvalidArgumentException(
                    'El monto excede el saldo pendiente (Q'.number_format($deuda, 2, '.', '').').'
                );
            }

            $saldoAnterior = (float) $negociacion->saldo_capital_pendiente;
            $distCapital = 0.0;
            $distInteres = 0.0;
            $distMora = 0.0;
            $distGastos = 0.0;

            if ($tipoPago === 'enganche') {
                [$distCapital, $saldoPosterior] = $this->aplicarEnganche($negociacion, $montoTotal, $saldoAnterior);
            } elseif ($tipoPago === 'abono_capital') {
                [$distCapital, $saldoPosterior] = $this->aplicarAbonoCapital($negociacion, $montoTotal, $saldoAnterior);
            } else {
                [$distMora, $distInteres, $distGastos, $distCapital, $saldoPosterior] = $this->aplicarPrelacion(
                    $negociacion,
                    $montoTotal,
                    $saldoAnterior,
                    $configMora
                );
            }

            $this->actualizarEstadoTrasPago($negociacion, $saldoPosterior);

            $numeroRecibo = $this->siguienteNumeroRecibo();
            $reciboId = $this->emitirReciboCaja($negociacion, $cajaId, $userId, $numeroRecibo, $montoTotal, $tipoPago);

            $pago = PagoTerreno::create([
                'numero_recibo' => $numeroRecibo,
                'recibo_id' => $reciboId,
                'negociacion_id' => $negociacion->id,
                'cliente_id' => $negociacion->cliente_id,
                'lote_id' => $negociacion->lote_id,
                'caja_apertura_cierre_id' => $cajaId,
                'user_id' => $userId,
                'tipo_pago' => $tipoPago,
                'monto_total' => round($montoTotal, 2),
                'distribucion_capital' => round($distCapital, 2),
                'distribucion_interes' => round($distInteres, 2),
                'distribucion_mora' => round($distMora, 2),
                'distribucion_gastos' => round($distGastos, 2),
                'saldo_anterior' => round($saldoAnterior, 2),
                'saldo_posterior' => round($saldoPosterior, 2),
                'metodo_pago' => $metodoPago,
                'referencia_bancaria' => $referenciaBancaria,
                'fecha_pago' => Carbon::now(),
                'concepto' => $concepto ?? "Pago {$tipoPago} lote {$negociacion->lote->codigo_unico}",
                'observaciones' => $observaciones,
                'origen_fondos' => $origenFondos,
                'ive_efectivo_reportable' => $aml['reportable'],
                'idempotency_key' => $idempotencyKey,
            ]);

            $movimiento = CajaService::registrarPagoTerreno(
                $montoTotal,
                $numeroRecibo,
                $negociacion->lote->codigo_unico,
                $tipoPago,
                $metodoPago,
                $negociacion->comprador?->nombre_completo,
                $userId
            );
            if ($movimiento) {
                $pago->movimiento_caja_id = $movimiento->id;
                $pago->save();
            }

            $this->moraService->recargarNegociacion($negociacion->fresh());

            return $pago;
        });
    }

    private function aplicarEnganche(Negociacion $negociacion, float $monto, float $saldoAnterior): array
    {
        $faltaEnganche = max(0.0, (float) $negociacion->enganche_pactado - (float) $negociacion->enganche_pagado);
        $aEnganche = min($monto, $faltaEnganche > 0 ? $faltaEnganche : $monto);
        $resto = round($monto - $aEnganche, 2);

        $negociacion->enganche_pagado = round((float) $negociacion->enganche_pagado + $aEnganche, 2);
        $distCapital = $aEnganche;
        $saldoPosterior = $saldoAnterior;

        if ($resto > 0) {
            $distCapital += $resto;
            $saldoPosterior = max(0.0, round($saldoPosterior - $resto, 2));
        }

        $negociacion->saldo_capital_pendiente = $saldoPosterior;
        $negociacion->total_capital_pagado = round((float) $negociacion->total_capital_pagado + $distCapital, 2);
        $negociacion->save();

        if ((float) $negociacion->enganche_pagado + 0.009 >= (float) $negociacion->enganche_pactado
            && $negociacion->tipo_negociacion === 'credito'
            && $negociacion->planPagos()->count() === 0
        ) {
            $this->financingService->generarPlanParaNegociacion($negociacion);
            $this->loteEstadoService->transicionar($negociacion->lote, 'vendido');
        }

        return [$distCapital, $saldoPosterior];
    }

    private function aplicarAbonoCapital(Negociacion $negociacion, float $monto, float $saldoAnterior): array
    {
        $distCapital = min($monto, $saldoAnterior);
        $saldoPosterior = max(0.0, round($saldoAnterior - $distCapital, 2));
        $negociacion->saldo_capital_pendiente = $saldoPosterior;
        $negociacion->total_capital_pagado = round((float) $negociacion->total_capital_pagado + $distCapital, 2);
        $negociacion->save();

        $this->reprogramarPorAbono($negociacion, $distCapital);

        return [$distCapital, $saldoPosterior];
    }

    /**
     * Prelación: mora → interés → otros cargos → capital.
     */
    private function aplicarPrelacion(Negociacion $negociacion, float $monto, float $saldoAnterior, $configMora = null): array
    {
        $restante = $monto;
        $distMora = $distInteres = $distGastos = $distCapital = 0.0;

        $cuotas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->whereIn('estado', ['pendiente', 'parcial', 'vencida', 'pagada_parcial'])
            ->orderBy('numero_cuota')
            ->lockForUpdate()
            ->get();

        foreach ($cuotas as $cuota) {
            if ($restante <= 0) {
                break;
            }

            $moraPend = $this->moraService->moraPendiente($cuota, $configMora);
            if ($moraPend > 0) {
                $pago = min($restante, $moraPend);
                $cuota->mora_pagada = round((float) $cuota->mora_pagada + $pago, 2);
                $distMora += $pago;
                $restante -= $pago;
            }

            $interesPend = max(0.0, (float) $cuota->cuota_interes - (float) $cuota->interes_pagado);
            if ($restante > 0 && $interesPend > 0) {
                $pago = min($restante, $interesPend);
                $cuota->interes_pagado = round((float) $cuota->interes_pagado + $pago, 2);
                $distInteres += $pago;
                $restante -= $pago;
            }

            $cargosPend = max(0.0, (float) ($cuota->otros_cargos ?? 0) - (float) ($cuota->otros_cargos_pagados ?? 0));
            if ($restante > 0 && $cargosPend > 0) {
                $pago = min($restante, $cargosPend);
                $cuota->otros_cargos_pagados = round((float) ($cuota->otros_cargos_pagados ?? 0) + $pago, 2);
                $distGastos += $pago;
                $restante -= $pago;
            }

            $capitalPend = max(0.0, (float) $cuota->cuota_capital - (float) $cuota->capital_pagado);
            if ($restante > 0 && $capitalPend > 0) {
                $pago = min($restante, $capitalPend);
                $cuota->capital_pagado = round((float) $cuota->capital_pagado + $pago, 2);
                $distCapital += $pago;
                $restante -= $pago;
            }

            $cuota->monto_pagado = round(
                (float) $cuota->capital_pagado + (float) $cuota->interes_pagado + (float) $cuota->mora_pagada + (float) ($cuota->otros_cargos_pagados ?? 0),
                2
            );
            $completa = ((float) $cuota->capital_pagado + 0.009 >= (float) $cuota->cuota_capital)
                && ((float) $cuota->interes_pagado + 0.009 >= (float) $cuota->cuota_interes)
                && ((float) $cuota->mora_pagada + 0.009 >= (float) $cuota->mora_proyectada)
                && ((float) ($cuota->otros_cargos_pagados ?? 0) + 0.009 >= (float) ($cuota->otros_cargos ?? 0));
            if ($completa) {
                $cuota->estado = 'pagada';
                $cuota->fecha_pagado = Carbon::now()->format('Y-m-d');
            } else {
                $cuota->estado = 'parcial';
            }
            $cuota->save();
        }

        if ($restante > 0) {
            $distCapital += $restante;
            $this->reprogramarPorAbono($negociacion, $restante);
            $restante = 0;
        }

        $saldoPosterior = max(0.0, round($saldoAnterior - $distCapital, 2));
        $negociacion->saldo_capital_pendiente = $saldoPosterior;
        $negociacion->total_capital_pagado = round((float) $negociacion->total_capital_pagado + $distCapital, 2);
        $negociacion->total_interes_pagado = round((float) $negociacion->total_interes_pagado + $distInteres, 2);
        $negociacion->total_mora_pagada = round((float) $negociacion->total_mora_pagada + $distMora, 2);
        $pagadas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)->where('estado', 'pagada')->count();
        $negociacion->cuotas_pagadas = $pagadas;
        $negociacion->cuotas_pendientes = max(0, (int) $negociacion->plazo_meses - $pagadas);
        $negociacion->save();

        return [$distMora, $distInteres, $distGastos, $distCapital, $saldoPosterior];
    }

    private function reprogramarPorAbono(Negociacion $negociacion, float $abonoCapital): void
    {
        if ($abonoCapital <= 0) {
            return;
        }

        $pendientes = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->whereIn('estado', ['pendiente', 'parcial', 'vencida'])
            ->orderBy('numero_cuota')
            ->get();

        if ($pendientes->isEmpty()) {
            return;
        }

        $politica = $negociacion->politica_abono_extra ?: 'reducir_plazo';
        $saldo = (float) $negociacion->saldo_capital_pendiente;

        if ($politica === 'reducir_cuota') {
            $n = $pendientes->count();
            $fecha = Carbon::parse($pendientes->first()->fecha_vencimiento)->format('Y-m-d');
            PlanPagoTerreno::whereIn('id', $pendientes->pluck('id'))->delete();
            $negociacion->plazo_meses = $n;
            $negociacion->fecha_primer_pago = $fecha;
            $negociacion->monto_financiado = $saldo;
            $this->financingService->generarPlanParaNegociacion($negociacion);
            return;
        }

        $restante = $abonoCapital;
        foreach ($pendientes->reverse() as $cuota) {
            if ($restante <= 0) {
                break;
            }
            $capitalPend = max(0.0, (float) $cuota->cuota_capital - (float) $cuota->capital_pagado);
            if ($capitalPend <= 0) {
                continue;
            }
            $aplica = min($restante, $capitalPend);
            $cuota->capital_pagado = round((float) $cuota->capital_pagado + $aplica, 2);
            $cuota->monto_pagado = round((float) $cuota->monto_pagado + $aplica, 2);
            $restante = round($restante - $aplica, 2);
            if ((float) $cuota->capital_pagado + 0.009 >= (float) $cuota->cuota_capital
                && (float) $cuota->interes_pagado + 0.009 >= (float) $cuota->cuota_interes) {
                $cuota->estado = 'pagada';
                $cuota->fecha_pagado = Carbon::now()->format('Y-m-d');
            }
            $cuota->save();
        }
    }

    private function actualizarEstadoTrasPago(Negociacion $negociacion, float $saldoPosterior): void
    {
        $lote = $negociacion->lote;
        $faltaEnganche = max(0.0, (float) $negociacion->enganche_pactado - (float) $negociacion->enganche_pagado);
        if ($saldoPosterior <= 0.05 && $faltaEnganche <= 0.05) {
            $negociacion->estado = 'pagada_total';
            $negociacion->saldo_capital_pendiente = 0;
            $negociacion->save();
            if ($lote && $lote->estado === 'en_negociacion') {
                $this->loteEstadoService->transicionar($lote, 'vendido');
            }
            if ($lote && $lote->estado !== 'pagado') {
                $this->loteEstadoService->transicionar($lote, 'pagado');
            }
            $this->loteEstadoService->liberar($lote, $negociacion);
        }
    }

    private function siguienteNumeroRecibo(): string
    {
        $anio = date('Y');
        $ultimo = PagoTerreno::where('numero_recibo', 'like', "REC-TER-{$anio}-%")
            ->lockForUpdate()
            ->orderByDesc('id')
            ->value('numero_recibo');
        $n = 1;
        if ($ultimo && preg_match('/(\d+)$/', $ultimo, $m)) {
            $n = intval($m[1]) + 1;
        }

        return sprintf('REC-TER-%s-%05d', $anio, $n);
    }

    private function emitirReciboCaja(Negociacion $negociacion, int $cajaId, ?int $userId, string $numero, float $monto, string $tipoPago): ?int
    {
        $sucursalId = $negociacion->sucursal_id ?: Auth::user()?->sucursal_id;
        if (!$sucursalId || !$userId) {
            return null;
        }

        $recibo = Recibo::create([
            'numero_recibo' => $numero,
            'tipo' => 'ingreso',
            'fecha' => Carbon::today(),
            'serie' => 'TER',
            'cliente_id' => $negociacion->cliente_id,
            'caja_id' => $cajaId,
            'monto' => $monto,
            'concepto' => "Pago {$tipoPago} negociación {$negociacion->codigo_negociacion}",
            'user_id' => $userId,
            'sucursal_id' => $sucursalId,
            'estado' => 'emitido',
        ]);

        return $recibo->id;
    }

    private function deudaTotalPendiente(Negociacion $negociacion): float
    {
        $faltaEnganche = max(0.0, (float) $negociacion->enganche_pactado - (float) $negociacion->enganche_pagado);
        $capital = (float) $negociacion->saldo_capital_pendiente;
        $cuotas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->whereIn('estado', ['pendiente', 'parcial', 'vencida', 'pagada_parcial'])
            ->get();

        $accesorios = 0.0;
        $configMora = $this->moraService->configDesdeNegociacion($negociacion);
        foreach ($cuotas as $cuota) {
            $accesorios += $this->moraService->moraPendiente($cuota, $configMora);
            $accesorios += max(0.0, (float) $cuota->cuota_interes - (float) $cuota->interes_pagado);
            $accesorios += max(0.0, (float) ($cuota->otros_cargos ?? 0) - (float) ($cuota->otros_cargos_pagados ?? 0));
        }

        return round($faltaEnganche + $capital + $accesorios, 2);
    }

    public function anularPago(PagoTerreno $pago, string $motivo, $usuario): PagoTerreno
    {
        return DB::transaction(function () use ($pago, $motivo, $usuario) {
            $pago = PagoTerreno::lockForUpdate()->findOrFail($pago->id);
            if ($pago->anulado) {
                throw new InvalidArgumentException('El pago ya está anulado.');
            }

            $ultimo = PagoTerreno::where('negociacion_id', $pago->negociacion_id)
                ->where('anulado', false)
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();
            if (!$ultimo || (int) $ultimo->id !== (int) $pago->id) {
                throw new InvalidArgumentException('Solo se puede anular el último pago vigente de la negociación.');
            }

            $caja = CajaService::getCajaAbierta($usuario->id ?? Auth::id());
            if (!$caja) {
                throw new RuntimeException('Debe haber una caja abierta para anular el cobro.');
            }

            $negociacion = Negociacion::lockForUpdate()->findOrFail($pago->negociacion_id);
            $lote = $negociacion->lote()->lockForUpdate()->first();

            $this->revertirCuotas($negociacion, $pago);

            $distCapital = (float) $pago->distribucion_capital;
            $tipo = $pago->tipo_pago;
            if ($tipo === 'enganche') {
                $restaEnganche = min($distCapital, (float) $negociacion->enganche_pagado);
                $restoCapital = round($distCapital - $restaEnganche, 2);
                $negociacion->enganche_pagado = max(0.0, round((float) $negociacion->enganche_pagado - $restaEnganche, 2));
                if ($restoCapital > 0) {
                    $negociacion->saldo_capital_pendiente = round((float) $negociacion->saldo_capital_pendiente + $restoCapital, 2);
                }
                if ((float) $negociacion->enganche_pagado + 0.009 < (float) $negociacion->enganche_pactado
                    && $negociacion->tipo_negociacion === 'credito'
                    && $negociacion->planPagos()->where('estado', 'pagada')->doesntExist()
                ) {
                    PlanPagoTerreno::where('negociacion_id', $negociacion->id)->delete();
                    if ($lote && $lote->estado === 'vendido') {
                        $this->loteEstadoService->transicionar($lote, 'en_negociacion');
                    }
                }
            } else {
                $negociacion->saldo_capital_pendiente = round((float) $negociacion->saldo_capital_pendiente + $distCapital, 2);
            }

            $negociacion->total_capital_pagado = max(0.0, round((float) $negociacion->total_capital_pagado - $distCapital, 2));
            $negociacion->total_interes_pagado = max(0.0, round((float) $negociacion->total_interes_pagado - (float) $pago->distribucion_interes, 2));
            $negociacion->total_mora_pagada = max(0.0, round((float) $negociacion->total_mora_pagada - (float) $pago->distribucion_mora, 2));

            if ($negociacion->estado === 'pagada_total') {
                $negociacion->estado = 'activa';
                if ($lote && $lote->estado === 'pagado') {
                    $this->loteEstadoService->transicionar($lote, 'vendido');
                    $this->loteEstadoService->ocupar($lote, $negociacion);
                }
            }
            $negociacion->save();

            $pago->anulado = true;
            $pago->motivo_anulacion = $motivo;
            $pago->save();

            if ($pago->recibo_id) {
                $recibo = Recibo::find($pago->recibo_id);
                $recibo?->anular($usuario, $motivo);
            }

            if ($pago->movimiento_caja_id) {
                MovimientoCaja::where('id', $pago->movimiento_caja_id)->update(['estado' => 'rechazado']);
            }

            CajaService::registrarEgreso(
                (float) $pago->monto_total,
                'Anulación '.$pago->numero_recibo.' — '.$motivo,
                [
                    'tipo_operacion' => 'anulacion_pago_terreno',
                    'numero_recibo' => $pago->numero_recibo,
                    'pago_terreno_id' => $pago->id,
                ],
                $usuario->id ?? Auth::id()
            );

            return $pago->fresh();
        });
    }

    private function revertirCuotas(Negociacion $negociacion, PagoTerreno $pago): void
    {
        $restanteCap = (float) $pago->distribucion_capital;
        $restanteInt = (float) $pago->distribucion_interes;
        $restanteMora = (float) $pago->distribucion_mora;
        $restanteGastos = (float) ($pago->distribucion_gastos ?? 0);
        if ($pago->tipo_pago === 'enganche') {
            return;
        }

        $cuotas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->orderByDesc('numero_cuota')
            ->lockForUpdate()
            ->get();

        foreach ($cuotas as $cuota) {
            if ($restanteCap <= 0 && $restanteInt <= 0 && $restanteMora <= 0 && $restanteGastos <= 0) {
                break;
            }
            $quitaMora = min($restanteMora, (float) $cuota->mora_pagada);
            $cuota->mora_pagada = round((float) $cuota->mora_pagada - $quitaMora, 2);
            $restanteMora = round($restanteMora - $quitaMora, 2);

            $quitaInt = min($restanteInt, (float) $cuota->interes_pagado);
            $cuota->interes_pagado = round((float) $cuota->interes_pagado - $quitaInt, 2);
            $restanteInt = round($restanteInt - $quitaInt, 2);

            $quitaGasto = min($restanteGastos, (float) ($cuota->otros_cargos_pagados ?? 0));
            $cuota->otros_cargos_pagados = round((float) ($cuota->otros_cargos_pagados ?? 0) - $quitaGasto, 2);
            $restanteGastos = round($restanteGastos - $quitaGasto, 2);

            $quitaCap = min($restanteCap, (float) $cuota->capital_pagado);
            $cuota->capital_pagado = round((float) $cuota->capital_pagado - $quitaCap, 2);
            $restanteCap = round($restanteCap - $quitaCap, 2);

            $cuota->monto_pagado = round(
                (float) $cuota->capital_pagado + (float) $cuota->interes_pagado + (float) $cuota->mora_pagada + (float) ($cuota->otros_cargos_pagados ?? 0),
                2
            );
            if ($cuota->estado === 'pagada') {
                $cuota->estado = $cuota->monto_pagado > 0.009 ? 'parcial' : 'pendiente';
                $cuota->fecha_pagado = null;
            }
            $cuota->save();
        }
    }

    public function rescindir(Negociacion $negociacion, string $motivo, $usuario): Negociacion
    {
        return DB::transaction(function () use ($negociacion, $motivo, $usuario) {
            $negociacion = Negociacion::lockForUpdate()->findOrFail($negociacion->id);
            if (in_array($negociacion->estado, ['rescindida'], true)) {
                throw new InvalidArgumentException('La negociación ya está rescindida.');
            }

            $pagosVigentes = PagoTerreno::where('negociacion_id', $negociacion->id)
                ->where('anulado', false)
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();

            if ($pagosVigentes->isNotEmpty()) {
                $caja = CajaService::getCajaAbierta($usuario->id ?? Auth::id());
                if (!$caja) {
                    throw new RuntimeException('Debe haber una caja abierta para revertir los cobros de la rescisión.');
                }
                foreach ($pagosVigentes as $pago) {
                    $this->anularPago($pago, 'Rescisión: '.$motivo, $usuario);
                }
            }

            $negociacion->refresh();
            PlanPagoTerreno::where('negociacion_id', $negociacion->id)->delete();

            $negociacion->estado = 'rescindida';
            $negociacion->motivo_rescision = $motivo;
            $negociacion->saldo_capital_pendiente = 0;
            $negociacion->cuotas_pendientes = 0;
            $negociacion->save();

            $lote = $negociacion->lote()->lockForUpdate()->first();
            if ($lote) {
                $this->loteEstadoService->devolverADisponible($lote);
                $this->loteEstadoService->liberar($lote, $negociacion);
            }

            return $negociacion->fresh(['lote', 'comprador', 'pagos']);
        });
    }
}
