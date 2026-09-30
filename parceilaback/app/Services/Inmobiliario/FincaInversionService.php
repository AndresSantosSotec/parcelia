<?php

namespace App\Services\Inmobiliario;

use App\Models\Finca;
use App\Models\FincaCuotaCompra;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class FincaInversionService
{
    public function sincronizarAreaEscrituras(Finca $finca): void
    {
        $suma = (float) $finca->escrituras()->sum('area_m2');
        if ($suma > 0) {
            $finca->area_total_m2 = round($suma, 2);
            $finca->save();
        }
    }

    public function generarPlan(Finca $finca, bool $forzar = false): void
    {
        $hayPagos = $finca->cuotasCompra()->where('monto_pagado', '>', 0)->exists();
        if ($hayPagos && ! $forzar) {
            throw ValidationException::withMessages([
                'plan' => 'Ya hay cuotas con abono. No se regenera el plan de compra.',
            ]);
        }

        $finca->cuotasCompra()->delete();

        if ($finca->tipo_compra !== 'pagos') {
            $finca->enganche = 0;
            $finca->numero_cuotas = 1;
            $finca->frecuencia_pago = 'no_aplica';
            $finca->cuota_compra = round((float) $finca->precio_compra, 2);
            $finca->save();
            FincaCuotaCompra::create([
                'finca_id' => $finca->id,
                'numero_cuota' => 1,
                'fecha_vencimiento' => ($finca->fecha_inicio_pagos ?: Carbon::today())->toDateString(),
                'monto' => round((float) $finca->precio_compra, 2),
                'monto_pagado' => 0,
                'estado' => 'pendiente',
            ]);

            return;
        }

        $saldo = round(max(0, (float) $finca->precio_compra - (float) $finca->enganche), 2);
        $n = max(1, (int) $finca->numero_cuotas);
        $cuota = $n > 0 ? round($saldo / $n, 2) : 0;
        $finca->cuota_compra = $cuota;
        $finca->save();

        $step = match ($finca->frecuencia_pago) {
            'bimensual' => 2,
            'trimestral' => 3,
            'semestral' => 6,
            'anual' => 12,
            default => 1,
        };

        $inicio = $finca->fecha_inicio_pagos
            ? Carbon::parse($finca->fecha_inicio_pagos)
            : Carbon::today();

        $acumulado = 0.0;
        for ($i = 1; $i <= $n; $i++) {
            $monto = $i === $n ? round($saldo - $acumulado, 2) : $cuota;
            $acumulado += $monto;
            FincaCuotaCompra::create([
                'finca_id' => $finca->id,
                'numero_cuota' => $i,
                'fecha_vencimiento' => $inicio->copy()->addMonths(($i - 1) * $step)->toDateString(),
                'monto' => $monto,
                'monto_pagado' => 0,
                'estado' => 'pendiente',
            ]);
        }
    }

    public function recalcular(Finca $finca): array
    {
        $finca->load(['escrituras', 'gastosUrbanizacion']);

        $areaEscrituras = round((float) $finca->escrituras->sum('area_m2'), 2);
        if ($areaEscrituras > 0) {
            $finca->area_total_m2 = $areaEscrituras;
        }

        $areaLotes = round((float) $finca->lotes()->sum('lotes.area_m2'), 2);
        if ((float) $finca->area_negociable_m2 <= 0 && $areaLotes > 0) {
            $finca->area_negociable_m2 = $areaLotes;
        }

        $negociable = round((float) $finca->area_negociable_m2, 2);
        $noNegociable = round((float) $finca->area_no_negociable_m2, 2);
        if ($noNegociable <= 0 && $areaEscrituras > 0 && $negociable > 0) {
            $diff = round($areaEscrituras - $negociable, 2);
            if ($diff > 0) {
                $finca->area_no_negociable_m2 = $diff;
                $noNegociable = $diff;
            }
        }

        $precio = round((float) $finca->precio_compra, 2);
        $escrituracion = round((float) $finca->gastos_escrituracion, 2);
        $urbanizacion = round((float) $finca->gastosUrbanizacion->sum('monto'), 2);
        $inversion = round($precio + $escrituracion + $urbanizacion, 2);
        $costoM2 = $negociable > 0 ? round($inversion / $negociable, 4) : 0;
        $pct = (float) ($finca->porcentaje_utilidad ?? 0);
        $precioSugeridoM2 = round($costoM2 * (1 + $pct / 100), 4);

        $finca->save();

        $lotes = $finca->lotes()->get();
        $costoLotes = 0.0;
        $sugeridoLotes = 0.0;
        foreach ($lotes as $lote) {
            $costo = round((float) $lote->area_m2 * $costoM2, 2);
            $sugerido = round($costo * (1 + $pct / 100), 2);
            $lote->costo_asignado = $costo;
            $lote->precio_sugerido = $sugerido;
            $lote->save();
            $costoLotes += $costo;
            $sugeridoLotes += $sugerido;
        }

        $saldoCompra = round(max(0, $precio - (float) $finca->enganche), 2);
        $pagadoCuotas = round((float) $finca->cuotasCompra()->sum('monto_pagado'), 2);

        return [
            'precio_compra' => $precio,
            'gastos_escrituracion' => $escrituracion,
            'urbanizacion' => $urbanizacion,
            'inversion' => $inversion,
            'area_escrituras' => $areaEscrituras,
            'area_negociable_m2' => $negociable,
            'area_no_negociable_m2' => $noNegociable,
            'area_vialidades_m2' => round((float) $finca->area_vialidades_m2, 2),
            'area_verde_m2' => round((float) $finca->area_verde_m2, 2),
            'area_tecnica_m2' => round((float) $finca->area_tecnica_m2, 2),
            'area_lotes_m2' => $areaLotes,
            'costo_m2' => $costoM2,
            'porcentaje_utilidad' => $pct,
            'precio_sugerido_m2' => $precioSugeridoM2,
            'costo_lotes' => round($costoLotes, 2),
            'precio_sugerido_lotes' => round($sugeridoLotes, 2),
            'utilidad_proyectada' => round($sugeridoLotes - $costoLotes, 2),
            'saldo_compra' => $saldoCompra,
            'pagado_cuotas' => $pagadoCuotas,
            'pendiente_cuotas' => round(max(0, $saldoCompra - $pagadoCuotas), 2),
            'deuda' => $this->deuda($finca),
        ];
    }

    /**
     * Saldo según los pagos registrados. Las cuotas abiertas deben sumar ese pendiente.
     */
    public function deuda(Finca $finca): array
    {
        $precio = round((float) $finca->precio_compra, 2);
        $pagadoEstado = round((float) $finca->pagosCompra()->sum('monto'), 2);
        $pagadoCuotas = round((float) $finca->cuotasCompra()->sum('monto_pagado'), 2);
        $pagado = round(max($pagadoEstado, $pagadoCuotas), 2);
        $pendiente = round(max(0, $precio - $pagado), 2);

        $cuotas = $finca->cuotasCompra()->orderBy('numero_cuota')->get();
        $abiertas = $cuotas->filter(fn ($c) => (float) $c->monto_pagado + 0.009 < (float) $c->monto)->values();
        $saldoPlan = round($abiertas->sum(fn ($c) => max(0, (float) $c->monto - (float) $c->monto_pagado)), 2);
        $proxima = $abiertas->sortBy(fn ($c) => $c->fecha_vencimiento?->format('Y-m-d') ?? '9999')->first();

        return [
            'precio' => $precio,
            'enganche' => round((float) $finca->enganche, 2),
            'pagado' => $pagado,
            'pendiente' => $pendiente,
            'cuotas_total' => $cuotas->count(),
            'cuotas_pagadas' => $cuotas->count() - $abiertas->count(),
            'cuotas_pendientes' => $abiertas->count(),
            'cuota_proxima' => $proxima ? round(max(0, (float) $proxima->monto - (float) $proxima->monto_pagado), 2) : 0,
            'fecha_proxima' => $proxima?->fecha_vencimiento?->format('Y-m-d'),
            'saldo_plan' => $saldoPlan,
            'cuadra' => abs($saldoPlan - $pendiente) < 0.05,
        ];
    }

    /**
     * Reparte solo el saldo del estado de cuenta en cuotas nuevas. No toca las ya abonadas.
     */
    public function rehacerCuotasPendientes(Finca $finca, int $cuotasNuevas, ?string $fechaInicio = null): void
    {
        if ($finca->tipo_compra !== 'pagos') {
            throw ValidationException::withMessages([
                'plan' => 'La compra al contado se paga en un solo movimiento.',
            ]);
        }

        $deuda = $this->deuda($finca);
        $conservadas = $finca->cuotasCompra()->where('monto_pagado', '>', 0)->get();
        $yaProgramado = round($conservadas->sum(fn ($c) => max(0, (float) $c->monto - (float) $c->monto_pagado)), 2);
        $aRepartir = round(max(0, $deuda['pendiente'] - $yaProgramado), 2);

        $finca->cuotasCompra()->where('monto_pagado', '<=', 0)->delete();

        if ($aRepartir < 0.01) {
            $finca->cuota_compra = 0;
            $finca->numero_cuotas = $finca->cuotasCompra()->count();
            $finca->save();

            return;
        }

        $n = max(1, $cuotasNuevas);
        $cuota = round($aRepartir / $n, 2);
        $step = match ($finca->frecuencia_pago) {
            'bimensual' => 2,
            'trimestral' => 3,
            'semestral' => 6,
            'anual' => 12,
            default => 1,
        };

        $ultima = $finca->cuotasCompra()->orderByDesc('fecha_vencimiento')->first();
        if ($fechaInicio) {
            $inicio = Carbon::parse($fechaInicio);
        } elseif ($ultima?->fecha_vencimiento) {
            $inicio = Carbon::parse($ultima->fecha_vencimiento)->addMonths($step);
        } else {
            $inicio = $finca->fecha_inicio_pagos ? Carbon::parse($finca->fecha_inicio_pagos) : Carbon::today();
        }

        $numero = (int) $finca->cuotasCompra()->max('numero_cuota');
        $acumulado = 0.0;
        for ($i = 1; $i <= $n; $i++) {
            $monto = $i === $n ? round($aRepartir - $acumulado, 2) : $cuota;
            $acumulado += $monto;
            FincaCuotaCompra::create([
                'finca_id' => $finca->id,
                'numero_cuota' => $numero + $i,
                'fecha_vencimiento' => $inicio->copy()->addMonths(($i - 1) * $step)->toDateString(),
                'monto' => $monto,
                'monto_pagado' => 0,
                'estado' => 'pendiente',
            ]);
        }

        $finca->cuota_compra = $cuota;
        $finca->numero_cuotas = $finca->cuotasCompra()->count();
        if ($fechaInicio) {
            $finca->fecha_inicio_pagos = $fechaInicio;
        }
        $finca->save();
    }
}
