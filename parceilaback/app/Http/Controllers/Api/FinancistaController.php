<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Financista;
use Carbon\Carbon;
use Illuminate\Http\Request;

class FinancistaController extends Controller
{
    public function index(Request $request)
    {
        $query = Financista::with('finca:id,nombre,codigo')->withSum('pagos as capital_pagado', 'monto_capital')
            ->withSum('pagos as interes_pagado', 'monto_interes')
            ->withSum('pagos as mora_pagada', 'monto_mora')
            ->withSum('pagos as descuento_aplicado', 'descuento_interes');

        if ($request->filled('finca_id')) {
            $query->where('finca_id', (int) $request->finca_id);
        }

        $items = $query->orderByDesc('id')->get()->map(fn (Financista $f) => $this->presentar($f));

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(Request $request)
    {
        $validated = $this->aplicarInteres($this->validar($request));
        $item = Financista::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Financiamiento registrado. No suma al costo del lote.',
            'data' => $this->presentar($item->fresh()),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Financista::findOrFail($id);
        $item->update($this->aplicarInteres($this->validar($request)));

        return response()->json([
            'success' => true,
            'data' => $this->presentar($item->fresh()),
        ]);
    }

    public function pagar(Request $request, $id)
    {
        $item = Financista::findOrFail($id);
        $validated = $request->validate([
            'fecha' => 'required|date',
            'monto_capital' => 'nullable|numeric|min:0',
            'monto_interes' => 'nullable|numeric|min:0',
            'monto_mora' => 'nullable|numeric|min:0',
            'descuento_interes' => 'nullable|numeric|min:0',
            'referencia' => 'nullable|string|max:255',
        ]);

        $capital = round((float) ($validated['monto_capital'] ?? 0), 2);
        $interes = round((float) ($validated['monto_interes'] ?? 0), 2);
        $mora = round((float) ($validated['monto_mora'] ?? 0), 2);
        $descuento = round((float) ($validated['descuento_interes'] ?? 0), 2);

        if ($capital + $interes + $mora + $descuento <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Indica capital, interés, mora o descuento.',
            ], 422);
        }

        $item->pagos()->create([
            'fecha' => $validated['fecha'],
            'monto_capital' => $capital,
            'monto_interes' => $interes,
            'monto_mora' => $mora,
            'descuento_interes' => $descuento,
            'referencia' => $validated['referencia'] ?? null,
            'user_id' => $request->user()?->id,
        ]);

        $fresco = $item->fresh();
        $vista = $this->presentar($fresco);
        if ($vista['saldo_capital'] <= 0.009 && $vista['interes_pendiente'] <= 0.009) {
            $fresco->estado = 'liquidado';
            $fresco->save();
            $vista['estado'] = 'liquidado';
        }

        return response()->json([
            'success' => true,
            'message' => 'Pago al financista registrado.',
            'data' => $vista,
        ]);
    }

    public function estado($id)
    {
        $item = Financista::with(['finca:id,nombre,codigo', 'pagos'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'financista' => $this->presentar($item),
                'pagos' => $item->pagos()->orderBy('fecha')->orderBy('id')->get(),
            ],
        ]);
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'finca_id' => 'required|integer|exists:fincas,id',
            'tipo' => 'required|in:banco,cooperativa,particular,otro',
            'nombre' => 'required|string|max:255',
            'destino' => 'required|in:compra,urbanizacion',
            'monto' => 'required|numeric|min:0.01',
            'tasa_anual' => 'nullable|numeric|min:5|max:100',
            'interes_total' => 'nullable|numeric|min:0',
            'plazo' => 'nullable|integer|min:1|max:600',
            'frecuencia' => 'nullable|in:mensual,bimensual,trimestral,semestral,anual',
            'fecha_inicio' => 'nullable|date',
            'fecha_vencimiento' => 'nullable|date',
            'cuota' => 'nullable|numeric|min:0',
            'capital_al_vencimiento' => 'nullable|boolean',
            'observaciones' => 'nullable|string',
        ]);
    }

    private function aplicarInteres(array $datos): array
    {
        $tasa = (float) ($datos['tasa_anual'] ?? 0);
        $interes = (float) ($datos['interes_total'] ?? 0);
        $meses = (int) ($datos['plazo'] ?? 0);
        if ($interes <= 0 && $tasa > 0 && $meses > 0) {
            $datos['interes_total'] = round((float) $datos['monto'] * ($tasa / 100) * ($meses / 12), 2);
        }

        return $datos;
    }

    private function presentar(Financista $f): array
    {
        $f->loadMissing('finca:id,nombre,codigo');
        if (! array_key_exists('capital_pagado', $f->getAttributes())) {
            $f->loadSum('pagos as capital_pagado', 'monto_capital');
            $f->loadSum('pagos as interes_pagado', 'monto_interes');
            $f->loadSum('pagos as mora_pagada', 'monto_mora');
            $f->loadSum('pagos as descuento_aplicado', 'descuento_interes');
        }

        $capitalPagado = round((float) $f->capital_pagado, 2);
        $interesPagado = round((float) $f->interes_pagado, 2);
        $descuento = round((float) $f->descuento_aplicado, 2);
        $saldoCapital = round(max(0, (float) $f->monto - $capitalPagado), 2);
        $interesPendiente = round(max(0, (float) $f->interes_total - $interesPagado - $descuento), 2);
        $vence = $f->fecha_vencimiento ? Carbon::parse($f->fecha_vencimiento) : null;
        $alerta = $f->estado === 'activo'
            && $saldoCapital > 0
            && $vence
            && $vence->lte(Carbon::today()->addDays(15));

        return [
            'id' => $f->id,
            'finca_id' => $f->finca_id,
            'finca' => $f->finca,
            'tipo' => $f->tipo,
            'nombre' => $f->nombre,
            'destino' => $f->destino,
            'monto' => (float) $f->monto,
            'tasa_anual' => $f->tasa_anual !== null ? (float) $f->tasa_anual : null,
            'interes_total' => (float) $f->interes_total,
            'plazo' => $f->plazo,
            'frecuencia' => $f->frecuencia,
            'fecha_inicio' => $f->fecha_inicio?->toDateString(),
            'fecha_vencimiento' => $f->fecha_vencimiento?->toDateString(),
            'cuota' => (float) $f->cuota,
            'capital_al_vencimiento' => (bool) $f->capital_al_vencimiento,
            'estado' => $f->estado,
            'observaciones' => $f->observaciones,
            'capital_pagado' => $capitalPagado,
            'interes_pagado' => $interesPagado,
            'mora_pagada' => round((float) $f->mora_pagada, 2),
            'descuento_aplicado' => $descuento,
            'saldo_capital' => $saldoCapital,
            'interes_pendiente' => $interesPendiente,
            'alerta_vencimiento' => $alerta,
        ];
    }

}
