<?php

namespace App\Services\Inmobiliario;

use App\Models\Lote;
use App\Models\Negociacion;
use InvalidArgumentException;

class LoteEstadoService
{
    private const TRANSICIONES = [
        'disponible' => ['reservado', 'en_negociacion'],
        'reservado' => ['en_negociacion', 'disponible', 'cancelado'],
        'en_negociacion' => ['vendido', 'disponible', 'reservado', 'cancelado'],
        'vendido' => ['pagado', 'cancelado', 'en_negociacion'],
        'pagado' => ['vendido', 'cancelado'],
        'cancelado' => ['disponible'],
    ];

    public function transicionar(Lote $lote, string $destino): Lote
    {
        $origen = $lote->estado;
        if ($origen === $destino) {
            return $lote;
        }

        $permitidas = self::TRANSICIONES[$origen] ?? [];
        if (!in_array($destino, $permitidas, true)) {
            throw new InvalidArgumentException("Transición de lote no permitida: {$origen} → {$destino}.");
        }

        $lote->estado = $destino;
        $lote->save();

        return $lote;
    }

    public function ocupar(Lote $lote, Negociacion $negociacion): void
    {
        if ($lote->negociacion_activa_id && (int) $lote->negociacion_activa_id !== (int) $negociacion->id) {
            throw new InvalidArgumentException('El lote ya está ocupado por otra negociación.');
        }
        $lote->negociacion_activa_id = $negociacion->id;
        $lote->save();
    }

    public function liberar(Lote $lote, ?Negociacion $negociacion = null): void
    {
        if ($negociacion && $lote->negociacion_activa_id && (int) $lote->negociacion_activa_id !== (int) $negociacion->id) {
            return;
        }
        $lote->negociacion_activa_id = null;
        $lote->save();
    }

    public function puedeEditarInventario(Lote $lote): bool
    {
        return in_array($lote->estado, ['disponible', 'reservado'], true);
    }

    public function puedeEliminar(Lote $lote): bool
    {
        if ($lote->negociacion_activa_id) {
            return false;
        }
        if (! in_array($lote->estado, ['disponible', 'cancelado'], true)) {
            return false;
        }

        return ! $lote->negociaciones()
            ->whereIn('estado', ['activa', 'reservada', 'en_mora'])
            ->exists();
    }

    public function devolverADisponible(Lote $lote): Lote
    {
        if (in_array($lote->estado, ['reservado', 'en_negociacion', 'vendido', 'pagado'], true)) {
            $this->transicionar($lote, 'cancelado');
            $lote->refresh();
        }
        if ($lote->estado === 'cancelado') {
            $this->transicionar($lote, 'disponible');
        }

        return $lote;
    }
}
