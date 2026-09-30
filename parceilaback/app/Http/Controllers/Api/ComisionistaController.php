<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comisionista;
use App\Models\ComisionRegla;
use App\Models\ComisionVenta;
use App\Models\Negociacion;
use Illuminate\Http\Request;

class ComisionistaController extends Controller
{
    public function index()
    {
        $items = Comisionista::withCount('comisiones')->orderBy('nombre')->get();

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:40',
            'direccion' => 'nullable|string|max:255',
            'dpi' => 'nullable|string|max:30',
        ]);
        $item = Comisionista::create($validated + ['activo' => true]);

        return response()->json(['success' => true, 'data' => $item], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Comisionista::findOrFail($id);
        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'telefono' => 'nullable|string|max:40',
            'direccion' => 'nullable|string|max:255',
            'dpi' => 'nullable|string|max:30',
            'activo' => 'nullable|boolean',
        ]);
        $item->update($validated);

        return response()->json(['success' => true, 'data' => $item->fresh()]);
    }

    public function reglas()
    {
        return response()->json([
            'success' => true,
            'data' => ComisionRegla::orderBy('nombre')->get(),
        ]);
    }

    public function storeRegla(Request $request)
    {
        $validated = $this->validarRegla($request);
        $regla = ComisionRegla::create($validated + ['activo' => true]);

        return response()->json(['success' => true, 'data' => $regla], 201);
    }

    public function updateRegla(Request $request, $id)
    {
        $regla = ComisionRegla::findOrFail($id);
        $regla->update($this->validarRegla($request, true));

        return response()->json(['success' => true, 'data' => $regla->fresh()]);
    }

    public function aplicar(Request $request)
    {
        $validated = $request->validate([
            'comisionista_id' => 'required|integer|exists:comisionistas,id',
            'negociacion_id' => 'required|integer|exists:negociaciones,id',
            'regla_id' => 'nullable|integer|exists:comision_reglas,id',
            'monto_comision' => 'nullable|numeric|min:0.01',
        ]);

        $negociacion = Negociacion::with('lote')->findOrFail($validated['negociacion_id']);
        $regla = ! empty($validated['regla_id']) ? ComisionRegla::find($validated['regla_id']) : null;
        $montoVenta = round((float) $negociacion->precio_final, 2);
        $monto = isset($validated['monto_comision'])
            ? round((float) $validated['monto_comision'], 2)
            : $this->calcular($regla, $negociacion);

        if ($monto < 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Indica un monto o una regla que produzca una comisión mayor a cero.',
            ], 422);
        }

        $ya = ComisionVenta::where('negociacion_id', $negociacion->id)
            ->where('comisionista_id', $validated['comisionista_id'])
            ->exists();
        if ($ya) {
            return response()->json([
                'success' => false,
                'message' => 'Ese comisionista ya tiene comisión en esta venta.',
            ], 422);
        }

        $item = ComisionVenta::create([
            'comisionista_id' => $validated['comisionista_id'],
            'lote_id' => $negociacion->lote_id,
            'negociacion_id' => $negociacion->id,
            'regla_id' => $regla?->id,
            'descripcion' => $regla ? $regla->nombre : 'Comisión de la venta',
            'monto_venta' => $montoVenta,
            'monto_comision' => $monto,
            'estado' => 'pendiente',
        ]);

        return response()->json(['success' => true, 'data' => $this->presentar($item)], 201);
    }

    public function comisiones(Request $request)
    {
        $query = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico,numero_lote', 'negociacion:id,codigo_negociacion,precio_final', 'regla'])
            ->withSum('pagos as pagado', 'monto');

        if ($request->filled('comisionista_id')) {
            $query->where('comisionista_id', (int) $request->comisionista_id);
        }

        $items = $query->orderByDesc('id')->get()->map(fn (ComisionVenta $c) => $this->presentar($c));

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function storeComision(Request $request)
    {
        $validated = $request->validate([
            'comisionista_id' => 'required|integer|exists:comisionistas,id',
            'lote_id' => 'nullable|integer|exists:lotes,id',
            'negociacion_id' => 'nullable|integer|exists:negociaciones,id',
            'descripcion' => 'nullable|string|max:255',
            'monto_venta' => 'nullable|numeric|min:0',
            'monto_comision' => 'required|numeric|min:0.01',
        ]);

        $item = ComisionVenta::create($validated + ['estado' => 'pendiente']);

        return response()->json(['success' => true, 'data' => $this->presentar($item)], 201);
    }

    public function pagar(Request $request, $id)
    {
        $comision = ComisionVenta::findOrFail($id);
        $validated = $request->validate([
            'fecha' => 'required|date',
            'monto' => 'required|numeric|min:0.01',
            'referencia' => 'nullable|string|max:255',
        ]);

        $pagado = round((float) $comision->pagos()->sum('monto'), 2);
        $pendiente = round((float) $comision->monto_comision - $pagado, 2);
        $monto = round((float) $validated['monto'], 2);
        if ($monto > $pendiente + 0.009) {
            return response()->json([
                'success' => false,
                'message' => 'El pago supera la comisión pendiente.',
            ], 422);
        }

        $comision->pagos()->create([
            'fecha' => $validated['fecha'],
            'monto' => $monto,
            'referencia' => $validated['referencia'] ?? null,
            'user_id' => $request->user()?->id,
        ]);

        $nuevo = round($pagado + $monto, 2);
        $comision->estado = $nuevo + 0.009 >= (float) $comision->monto_comision ? 'pagada' : 'parcial';
        $comision->save();

        return response()->json([
            'success' => true,
            'message' => 'Pago de comisión registrado.',
            'data' => $this->presentar($comision->fresh()),
        ]);
    }

    public function estado($id)
    {
        $comision = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico,numero_lote', 'pagos'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'comision' => $this->presentar($comision),
                'pagos' => $comision->pagos()->orderBy('fecha')->orderBy('id')->get(),
            ],
        ]);
    }

    private function presentar(ComisionVenta $c): array
    {
        $c->loadMissing(['comisionista', 'lote:id,codigo_unico,numero_lote', 'negociacion:id,codigo_negociacion,precio_final', 'regla']);
        if (! array_key_exists('pagado', $c->getAttributes())) {
            $c->loadSum('pagos as pagado', 'monto');
        }
        $pagado = round((float) $c->pagado, 2);

        return [
            'id' => $c->id,
            'comisionista_id' => $c->comisionista_id,
            'comisionista' => $c->comisionista,
            'lote_id' => $c->lote_id,
            'lote' => $c->lote,
            'negociacion_id' => $c->negociacion_id,
            'negociacion' => $c->negociacion,
            'regla_id' => $c->regla_id,
            'regla' => $c->regla,
            'descripcion' => $c->descripcion,
            'monto_venta' => (float) $c->monto_venta,
            'monto_comision' => (float) $c->monto_comision,
            'pagado' => $pagado,
            'pendiente' => round(max(0, (float) $c->monto_comision - $pagado), 2),
            'estado' => $c->estado,
        ];
    }

    private function validarRegla(Request $request, bool $parcial = false): array
    {
        $req = $parcial ? 'sometimes' : 'required';

        return $request->validate([
            'nombre' => $req.'|string|max:160',
            'tipo' => $req.'|in:porcentaje,monto_fijo',
            'base' => 'nullable|in:precio_final,precio_venta,enganche',
            'valor' => $req.'|numeric|min:0.01',
            'momento' => 'nullable|in:al_contrato,al_enganche,al_liquidar',
            'activo' => 'nullable|boolean',
        ]);
    }

    private function calcular(?ComisionRegla $regla, Negociacion $negociacion): float
    {
        if (! $regla) {
            return 0;
        }
        if ($regla->tipo === 'monto_fijo') {
            return round((float) $regla->valor, 2);
        }
        $base = match ($regla->base) {
            'precio_venta' => (float) $negociacion->precio_original,
            'enganche' => (float) $negociacion->enganche_pactado,
            default => (float) $negociacion->precio_final,
        };

        return round($base * ((float) $regla->valor / 100), 2);
    }

}
