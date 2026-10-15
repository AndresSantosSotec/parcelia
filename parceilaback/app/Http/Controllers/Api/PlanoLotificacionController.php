<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Finca;
use App\Models\FincaPlano;
use App\Models\Lote;
use App\Models\LoteGeometria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PlanoLotificacionController extends Controller
{
    private const DISCO = 'local';
    private const MAX_PUNTOS = 200;

    public function show(Request $request, $fincaId)
    {
        $finca = Finca::findOrFail($fincaId);
        $user = $request->user();
        $plano = FincaPlano::where('finca_id', $finca->id)->first();
        $verComprador = $user?->hasPermission('negociaciones', 'ver') ?? false;

        $lotes = Lote::with([
            'parcela:id,nombre_identificador,codigo',
            'servicios',
            'vendedor:id,name',
            'ocupacion.comprador',
            'ocupacion.asesor:id,name',
            'ocupacion.comisiones.comisionista:id,nombre',
            'comisiones.comisionista:id,nombre',
            'geometria',
        ])
            ->whereHas('parcela', fn ($q) => $q->where('finca_id', $finca->id))
            ->orderBy('parcela_id')
            ->orderBy('numero_lote')
            ->get()
            ->map(fn (Lote $lote) => $this->presentarLote($lote, $user, $verComprador))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'finca' => [
                    'id' => $finca->id,
                    'codigo' => $finca->codigo,
                    'nombre' => $finca->nombre,
                ],
                'plano' => [
                    'id' => $plano?->id,
                    'ancho' => $plano?->ancho ?? 1000,
                    'alto' => $plano?->alto ?? 700,
                    'tiene_imagen' => (bool) ($plano?->imagen_path && Storage::disk(self::DISCO)->exists($plano->imagen_path)),
                    'imagen_nombre' => $plano?->imagen_nombre,
                    'actualizado' => $plano?->updated_at,
                ],
                'lotes' => $lotes,
            ],
        ]);
    }

    public function imagen($fincaId)
    {
        $plano = FincaPlano::where('finca_id', $fincaId)->first();
        if (! $plano || ! $plano->imagen_path || ! Storage::disk(self::DISCO)->exists($plano->imagen_path)) {
            return response()->json(['success' => false, 'message' => 'La finca no tiene imagen de plano.'], 404);
        }

        $ruta = Storage::disk(self::DISCO)->path($plano->imagen_path);

        return response()->file($ruta, [
            'Content-Type' => mime_content_type($ruta) ?: 'image/png',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function subirImagen(Request $request, $fincaId)
    {
        $finca = Finca::findOrFail($fincaId);
        $request->validate([
            'archivo' => 'required|file|mimes:jpg,jpeg,png,webp|max:15360',
        ]);

        $archivo = $request->file('archivo');
        $medidas = @getimagesize($archivo->getRealPath());
        if (! $medidas || $medidas[0] < 100 || $medidas[1] < 100) {
            throw ValidationException::withMessages(['archivo' => 'La imagen del plano no es válida o es demasiado pequeña (mínimo 100 × 100 px).']);
        }

        $plano = DB::transaction(function () use ($finca, $archivo, $medidas, $request) {
            $plano = FincaPlano::where('finca_id', $finca->id)->lockForUpdate()->first()
                ?? new FincaPlano(['finca_id' => $finca->id]);

            $anchoPrevio = $plano->exists ? $plano->ancho : null;
            $altoPrevio = $plano->exists ? $plano->alto : null;

            $plano->imagen_path = $archivo->store('planos/finca-'.$finca->id, self::DISCO);
            $plano->imagen_nombre = mb_substr($archivo->getClientOriginalName(), 0, 255);
            $plano->ancho = (int) $medidas[0];
            $plano->alto = (int) $medidas[1];
            $plano->user_id = $request->user()?->id;
            $plano->save();

            if ($anchoPrevio && $altoPrevio && ($anchoPrevio !== $plano->ancho || $altoPrevio !== $plano->alto)) {
                $this->escalarGeometrias($plano, $plano->ancho / $anchoPrevio, $plano->alto / $altoPrevio);
            }

            return $plano;
        });

        return response()->json([
            'success' => true,
            'data' => ['ancho' => $plano->ancho, 'alto' => $plano->alto, 'imagen_nombre' => $plano->imagen_nombre],
            'message' => 'Imagen del plano guardada.',
        ], 201);
    }

    public function guardarGeometrias(Request $request, $fincaId)
    {
        $finca = Finca::findOrFail($fincaId);
        $validated = $request->validate([
            'geometrias' => 'required|array|max:2000',
            'geometrias.*.lote_id' => 'required|integer|distinct',
            'geometrias.*.puntos' => 'present|nullable|array|min:3|max:'.self::MAX_PUNTOS,
            'geometrias.*.puntos.*' => 'array|size:2',
            'geometrias.*.puntos.*.*' => 'numeric',
        ]);

        $loteIds = collect($validated['geometrias'])->pluck('lote_id')->map(fn ($id) => (int) $id)->all();
        $propios = Lote::whereIn('id', $loteIds)
            ->whereHas('parcela', fn ($q) => $q->where('finca_id', $finca->id))
            ->pluck('id')
            ->all();
        $ajenos = array_values(array_diff($loteIds, $propios));
        if ($ajenos) {
            throw ValidationException::withMessages([
                'geometrias' => 'Hay lotes que no pertenecen a esta finca: '.implode(', ', $ajenos).'.',
            ]);
        }

        $resultado = DB::transaction(function () use ($finca, $validated, $request) {
            $plano = FincaPlano::where('finca_id', $finca->id)->lockForUpdate()->first()
                ?? FincaPlano::create([
                    'finca_id' => $finca->id,
                    'ancho' => 1000,
                    'alto' => 700,
                    'user_id' => $request->user()?->id,
                ]);

            $guardadas = 0;
            $quitadas = 0;
            foreach ($validated['geometrias'] as $i => $g) {
                $loteId = (int) $g['lote_id'];
                if ($g['puntos'] === null) {
                    $quitadas += LoteGeometria::where('lote_id', $loteId)->delete();
                    continue;
                }

                $puntos = $this->normalizarPuntos($g['puntos'], $plano, $i);
                LoteGeometria::updateOrCreate(
                    ['lote_id' => $loteId],
                    ['finca_plano_id' => $plano->id, 'puntos' => $puntos]
                );
                $guardadas++;
            }

            $plano->touch();

            return compact('guardadas', 'quitadas');
        });

        return response()->json([
            'success' => true,
            'data' => $resultado,
            'message' => "Plano actualizado: {$resultado['guardadas']} figura(s) guardada(s), {$resultado['quitadas']} quitada(s).",
        ]);
    }

    private function normalizarPuntos(array $puntos, FincaPlano $plano, int $indice): array
    {
        $limpios = [];
        foreach ($puntos as $p) {
            $x = round((float) $p[0], 2);
            $y = round((float) $p[1], 2);
            if ($x < 0 || $y < 0 || $x > $plano->ancho || $y > $plano->alto) {
                throw ValidationException::withMessages([
                    "geometrias.{$indice}.puntos" => "Hay puntos fuera del plano ({$plano->ancho} × {$plano->alto}).",
                ]);
            }
            $limpios[] = [$x, $y];
        }

        if (abs($this->area($limpios)) < 1) {
            throw ValidationException::withMessages([
                "geometrias.{$indice}.puntos" => 'La figura del lote no tiene área; revise que los puntos no estén alineados.',
            ]);
        }

        return $limpios;
    }

    private function area(array $puntos): float
    {
        $n = count($puntos);
        $suma = 0.0;
        for ($i = 0; $i < $n; $i++) {
            [$x1, $y1] = $puntos[$i];
            [$x2, $y2] = $puntos[($i + 1) % $n];
            $suma += $x1 * $y2 - $x2 * $y1;
        }

        return $suma / 2;
    }

    private function escalarGeometrias(FincaPlano $plano, float $fx, float $fy): void
    {
        LoteGeometria::where('finca_plano_id', $plano->id)->get()->each(function (LoteGeometria $g) use ($fx, $fy, $plano) {
            $g->puntos = array_map(fn ($p) => [
                round(min($plano->ancho, $p[0] * $fx), 2),
                round(min($plano->alto, $p[1] * $fy), 2),
            ], $g->puntos);
            $g->save();
        });
    }

    private function presentarLote(Lote $lote, $user, bool $verComprador): array
    {
        $visible = $lote->esVisiblePara($user);
        $base = [
            'id' => $lote->id,
            'numero_lote' => $lote->numero_lote,
            'codigo_unico' => $lote->codigo_unico,
            'estado' => $lote->estado,
            'parcela' => $lote->parcela ? [
                'id' => $lote->parcela->id,
                'nombre' => $lote->parcela->nombre_identificador,
            ] : null,
            'puntos' => $lote->geometria?->puntos,
            'visible' => $visible,
        ];

        if (! $visible) {
            return $base;
        }

        $neg = $lote->ocupacion;
        $comisiones = ($neg && $neg->comisiones->isNotEmpty()) ? $neg->comisiones : $lote->comisiones;

        return $base + [
            'area_m2' => $lote->area_m2,
            'frente_metros' => $lote->frente_metros,
            'fondo_metros' => $lote->fondo_metros,
            'lado_norte' => $lote->lado_norte,
            'lado_sur' => $lote->lado_sur,
            'lado_este' => $lote->lado_este,
            'lado_oeste' => $lote->lado_oeste,
            'tipo_terreno' => $lote->tipo_terreno,
            'colindancias' => $lote->colindancias,
            'precio_venta' => $lote->precio_venta,
            'precio_m2' => $lote->precio_m2,
            'observaciones' => $lote->observaciones,
            'vendedor' => $lote->vendedor?->name,
            'servicios' => $lote->servicios->map(fn ($s) => [
                'nombre' => $s->nombre_servicio,
                'estado' => $s->estado,
            ])->values(),
            'negociacion' => $neg ? [
                'id' => $neg->id,
                'codigo' => $neg->codigo_negociacion,
                'tipo' => $neg->tipo_negociacion,
                'estado' => $neg->estado,
                'comprador' => $verComprador && $neg->comprador
                    ? trim($neg->comprador->nombres.' '.$neg->comprador->apellidos)
                    : null,
                'asesor' => $neg->asesor?->name,
                'precio_final' => $neg->precio_final,
                'enganche_pactado' => $neg->enganche_pactado,
                'plazo_meses' => $neg->plazo_meses,
                'tasa_interes_anual' => $neg->tasa_interes_anual,
                'sistema_amortizacion' => $neg->sistema_amortizacion,
                'cuota_mensual' => $neg->cuota_mensual,
                'monto_financiado' => $neg->monto_financiado,
                'cuotas_pagadas' => $neg->cuotas_pagadas,
                'cuotas_pendientes' => $neg->cuotas_pendientes,
                'saldo_capital_pendiente' => $neg->saldo_capital_pendiente,
                'comisionistas' => $comisiones->map(fn ($c) => [
                    'nombre' => $c->comisionista?->nombre,
                    'monto' => $c->monto_comision,
                    'estado' => $c->estado,
                ])->filter(fn ($c) => filled($c['nombre']))->values(),
            ] : null,
        ];
    }
}
