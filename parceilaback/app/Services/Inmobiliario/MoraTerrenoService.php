<?php

namespace App\Services\Inmobiliario;

use App\Models\Negociacion;
use App\Models\ParametrizacionMoraInmobiliaria;
use App\Models\PlanPagoTerreno;
use Carbon\Carbon;

class MoraTerrenoService
{
    public function configDesdeNegociacion(Negociacion $negociacion): ?ParametrizacionMoraInmobiliaria
    {
        if ($negociacion->tipo_mora_aplicada) {
            $config = new ParametrizacionMoraInmobiliaria([
                'tipo_calculo' => $negociacion->tipo_mora_aplicada,
                'porcentaje_diario' => $negociacion->mora_porcentaje_diario_snapshot ?? 0,
                'monto_fijo_diario' => $negociacion->mora_monto_fijo_diario_snapshot ?? 0,
                'dias_gracia' => $negociacion->mora_dias_gracia_snapshot ?? 0,
                'activo' => true,
            ]);

            return $config;
        }

        return ParametrizacionMoraInmobiliaria::vigente($negociacion->sucursal_id);
    }

    public function recargarNegociacion(Negociacion $negociacion, ?Carbon $alDia = null): float
    {
        $config = $this->configDesdeNegociacion($negociacion);
        $alDia = $alDia ?? Carbon::today();
        $totalPendiente = 0.0;
        $maxDias = 0;

        $cuotas = PlanPagoTerreno::where('negociacion_id', $negociacion->id)
            ->whereIn('estado', ['pendiente', 'parcial', 'vencida', 'pagada_parcial'])
            ->get();

        foreach ($cuotas as $cuota) {
            $this->recalcularCuota($cuota, $config, $alDia);
            $pendiente = max(0.0, round((float) $cuota->mora_proyectada - (float) $cuota->mora_pagada, 2));
            $totalPendiente += $pendiente;
            if ($pendiente > 0.009) {
                $vencimiento = Carbon::parse($cuota->fecha_vencimiento)->startOfDay();
                $inicio = $vencimiento->copy()->addDays((int) ($config?->dias_gracia ?? 0));
                $maxDias = max($maxDias, max(0, (int) $inicio->diffInDays($alDia->copy()->startOfDay(), false)));
            }
        }

        $negociacion->dias_mora_actual = $maxDias;
        if ($totalPendiente > 0.009 && in_array($negociacion->estado, ['activa', 'en_mora'], true)) {
            $negociacion->estado = 'en_mora';
        } elseif ($totalPendiente <= 0.009 && $negociacion->estado === 'en_mora') {
            $negociacion->estado = 'activa';
        }
        $negociacion->save();

        return round($totalPendiente, 2);
    }

    public function recalcularCuota(PlanPagoTerreno $cuota, ?ParametrizacionMoraInmobiliaria $config = null, ?Carbon $alDia = null): float
    {
        $alDia = $alDia ?? Carbon::today();

        if (!$config || in_array($cuota->estado, ['pagada', 'cancelada', 'adelantada'], true)) {
            return (float) $cuota->mora_proyectada;
        }

        $vencimiento = Carbon::parse($cuota->fecha_vencimiento)->startOfDay();
        $hoy = $alDia->copy()->startOfDay();
        $inicioMora = $vencimiento->copy()->addDays((int) $config->dias_gracia);
        $dias = max(0, (int) $inicioMora->diffInDays($hoy, false));

        $capitalVencido = max(0.0, (float) $cuota->cuota_capital - (float) $cuota->capital_pagado);
        $mora = 0.0;

        if ($dias > 0 && $capitalVencido > 0) {
            if ($config->tipo_calculo === 'monto_fijo_diario') {
                $mora = round((float) $config->monto_fijo_diario * $dias, 2);
            } else {
                $mora = round($capitalVencido * ((float) $config->porcentaje_diario / 100) * $dias, 2);
            }
        }

        $cuota->mora_proyectada = $mora;
        if ($dias > 0 && $cuota->estado === 'pendiente') {
            $cuota->estado = 'vencida';
        }
        if ($cuota->exists) {
            $cuota->save();
        }

        return $mora;
    }

    public function moraPendiente(PlanPagoTerreno $cuota, ?ParametrizacionMoraInmobiliaria $config = null): float
    {
        $proyectada = $this->recalcularCuota($cuota, $config);

        return max(0.0, round($proyectada - (float) $cuota->mora_pagada, 2));
    }
}
