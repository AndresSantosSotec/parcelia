<?php

namespace App\Http\Controllers\Api;

use App\Exports\InmobiliarioArrayExport;
use App\Http\Controllers\Controller;
use App\Models\FincaCompraPago;
use App\Models\Comisionista;
use App\Models\ComisionVenta;
use App\Support\TicketPdf;
use App\Models\Finca;
use App\Models\FincaCuotaCompra;
use App\Models\FincaGastoUrbanizacion;
use App\Models\Financista;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class DesarrolladoraReporteController extends Controller
{
    public function guiaFlujo(): Response
    {
        $pdf = Pdf::loadView('reportes.guia-flujo-modulos', [
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ])->setPaper('letter', 'portrait');

        return $pdf->download('guia-compra-financiamiento-comisiones.pdf');
    }

    public function requisitos(): Response
    {
        $pdf = Pdf::loadView('reportes.requisitos-modulos', [
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ])->setPaper('letter', 'portrait');

        return $pdf->download('registro-modulos.pdf');
    }

    public function cuotasPendientes(Request $request): Response
    {
        $filas = FincaCuotaCompra::with('finca:id,codigo,nombre')
            ->orderBy('fecha_vencimiento')
            ->get()
            ->filter(fn (FincaCuotaCompra $c) => (float) $c->monto_pagado + 0.009 < (float) $c->monto)
            ->map(fn (FincaCuotaCompra $c) => [
                $c->finca?->codigo,
                $c->finca?->nombre,
                $c->numero_cuota,
                optional($c->fecha_vencimiento)->format('d/m/Y'),
                $c->monto,
                $c->monto_pagado,
                round(max(0, (float) $c->monto - (float) $c->monto_pagado), 2),
                $c->estado,
            ])->values()->all();

        return $this->entregar($request, 'Cuotas pendientes de compra', [
            'Saldo de cada cuota de las compras de finca que todavía no está cubierta.',
        ], ['Código', 'Finca', 'Cuota', 'Vence', 'Monto', 'Pagado', 'Saldo', 'Estado'], $filas, 'cuotas-pendientes');
    }

    public function urbanizacion(Request $request): Response
    {
        $gastos = FincaGastoUrbanizacion::with(['finca' => fn ($q) => $q->withCount('lotes')])->orderBy('fecha')->get();
        $filas = $gastos->map(fn (FincaGastoUrbanizacion $g) => [
            $g->finca?->codigo,
            $g->finca?->nombre,
            $g->finca?->lotes_count,
            $g->categoria,
            $g->concepto,
            optional($g->fecha)->format('d/m/Y'),
            $g->monto,
        ])->all();

        return $this->entregar($request, 'Gastos de urbanización', [
            'Gasto real por finca. El costo del lote sale de la inversión dividida entre los metros cuadrados negociables.',
            'Total de gastos: '.round((float) $gastos->sum('monto'), 2),
        ], ['Código', 'Finca', 'Lotes', 'Categoría', 'Concepto', 'Fecha', 'Monto'], $filas, 'urbanizacion');
    }

    public function vencimientos(Request $request): Response
    {
        $filas = Financista::with('finca:id,nombre,codigo')
            ->withSum('pagos as capital_pagado', 'monto_capital')
            ->whereNotNull('fecha_vencimiento')
            ->orderBy('fecha_vencimiento')
            ->get()
            ->filter(fn (Financista $f) => (float) $f->monto - (float) $f->capital_pagado > 0.01)
            ->map(fn (Financista $f) => [
                $f->finca?->nombre,
                $f->tipo,
                $f->nombre,
                $f->monto,
                round((float) $f->monto - (float) $f->capital_pagado, 2),
                $f->cuota,
                $f->frecuencia,
                optional($f->fecha_vencimiento)->format('d/m/Y'),
                optional($f->fecha_vencimiento)->lte(now()->addDays(15)) ? 'Por vencer' : 'Vigente',
            ])->values()->all();

        return $this->entregar($request, 'Vencimientos de financiamientos', [
            'Préstamos con saldo de capital. Se marca por vencer cuando faltan 15 días o menos.',
        ], ['Finca', 'Tipo', 'Nombre', 'Capital', 'Saldo', 'Cuota', 'Frecuencia', 'Vence', 'Aviso'], $filas, 'vencimientos');
    }

    public function comisionesPendientes(Request $request): Response
    {
        $filas = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico'])
            ->withSum('pagos as pagado', 'monto')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (ComisionVenta $c) => (float) $c->monto_comision - (float) $c->pagado > 0.01)
            ->map(fn (ComisionVenta $c) => [
                $c->comisionista?->nombre,
                $c->comisionista?->telefono,
                $c->lote?->codigo_unico,
                $c->monto_venta,
                $c->monto_comision,
                round((float) $c->pagado, 2),
                round(max(0, (float) $c->monto_comision - (float) $c->pagado), 2),
            ])->values()->all();

        return $this->entregar($request, 'Comisiones pendientes de pago', [], [
            'Comisionista', 'Teléfono', 'Lote', 'Venta', 'Comisión', 'Pagado', 'Pendiente',
        ], $filas, 'comisiones-pendientes');
    }

    public function planCompra(Request $request, $id): Response
    {
        $finca = Finca::with(['escrituras', 'cuotasCompra', 'gastosUrbanizacion', 'pagosCompra'])->findOrFail($id);
        $deuda = app(\App\Services\Inmobiliario\FincaInversionService::class)->deuda($finca);
        $filas = $finca->cuotasCompra->sortBy('numero_cuota')->map(fn ($c) => [
            $c->numero_cuota,
            optional($c->fecha_vencimiento)->format('Y-m-d'),
            $c->monto,
            $c->monto_pagado,
            round(max(0, (float) $c->monto - (float) $c->monto_pagado), 2),
            $c->estado,
        ])->values()->all();

        return $this->entregar($request, 'Plan de pagos de compra', [
            $finca->codigo.' — '.$finca->nombre,
            'Vendedor: '.($finca->vendedor_nombre ?: '—').' · DPI '.($finca->vendedor_dpi ?: '—'),
            'Precio '.$deuda['precio'].' · Pagado '.$deuda['pagado'].' · Pendiente '.$deuda['pendiente'],
            'Cuotas pagadas '.$deuda['cuotas_pagadas'].' · Cuotas por pagar '.$deuda['cuotas_pendientes'].' · Próxima '.$deuda['cuota_proxima'].' el '.($deuda['fecha_proxima'] ?: '—'),
            $deuda['cuadra'] ? 'El plan cuadra con el estado de cuenta.' : 'El plan no cuadra con el saldo pendiente.',
        ], ['#', 'Vencimiento', 'Cuota', 'Pagado', 'Saldo', 'Estado'], $filas, 'plan-compra-'.$finca->codigo);
    }

    public function registro($id): Response
    {
        $finca = Finca::with('escrituras')->findOrFail($id);
        $pdf = Pdf::loadView('reportes.registro-finca', [
            'finca' => $finca,
            'areaEscrituras' => round((float) $finca->escrituras->sum('area_m2'), 2),
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ])->setPaper('letter', 'landscape');

        return $pdf->download('registro-'.$finca->codigo.'.pdf');
    }

    public function listado(Request $request): Response
    {
        $filas = Finca::withSum('pagosCompra as pagado', 'monto')->orderBy('nombre')->get()->map(function (Finca $finca) {
            $pagado = round((float) $finca->pagado, 2);
            $precio = round((float) $finca->precio_compra, 2);
            $estado = $precio <= 0 ? 'Sin precio' : ($pagado + 0.01 >= $precio ? 'Cancelado' : 'Vigente');

            return [
                $finca->nombre,
                $finca->codigo,
                $precio,
                optional($finca->fecha_inicio_pagos)->format('d/m/Y'),
                $finca->tipo_compra === 'pagos' ? 'Por pagos' : 'Al contado',
                $pagado,
                $finca->frecuencia_pago === 'no_aplica' ? 'No aplica' : ucfirst((string) $finca->frecuencia_pago),
                $estado,
                $finca->area_total_m2,
            ];
        })->all();

        return $this->entregar($request, 'Reporte de fincas', [], [
            'Nombre finca', 'Código', 'Precio compra', 'Fecha', 'Tipo', 'Pagado', 'Frecuencia', 'Estado', 'Medidas m2',
        ], $filas, 'reporte-fincas');
    }

    public function contratoCompra($id): Response
    {
        $finca = Finca::with(['escrituras', 'cuotasCompra', 'pagosCompra'])->findOrFail($id);
        $deuda = app(\App\Services\Inmobiliario\FincaInversionService::class)->deuda($finca);
        $pdf = Pdf::loadView('reportes.contrato-compra-finca', [
            'finca' => $finca,
            'deuda' => $deuda,
            'cuotas' => $finca->cuotasCompra->sortBy('numero_cuota')->values(),
            'areaEscrituras' => round((float) $finca->escrituras->sum('area_m2'), 2),
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ])->setPaper('letter', 'portrait');

        return $pdf->download('contrato-compra-'.$finca->codigo.'.pdf');
    }

    public function estadoCompra($id): Response
    {
        $finca = Finca::with(['pagosCompra' => fn ($q) => $q->orderBy('fecha')->orderBy('id')])->findOrFail($id);
        $pagado = round((float) $finca->pagosCompra->sum('monto'), 2);
        $pdf = Pdf::loadView('reportes.estado-compra-finca', [
            'finca' => $finca,
            'pagos' => $finca->pagosCompra,
            'pagado' => $pagado,
            'pendiente' => round(max(0, (float) $finca->precio_compra - $pagado), 2),
        ])->setPaper('letter', 'portrait');

        return $pdf->download('estado-compra-'.$finca->codigo.'.pdf');
    }

    public function reciboCompra($id, $pagoId): Response
    {
        $pago = FincaCompraPago::with('finca')->where('finca_id', $id)->findOrFail($pagoId);
        $finca = $pago->finca;
        $pagos = FincaCompraPago::where('finca_id', $finca->id)->orderBy('id')->get();
        $pagado = round((float) $pagos->sum('monto'), 2);
        $numero = $pagos->search(fn ($p) => $p->id === $pago->id);
        $pdf = Pdf::loadView('reportes.recibo-compra-finca', [
            'finca' => $finca,
            'pago' => $pago,
            'numero' => $numero === false ? 1 : $numero + 1,
            'pagado' => $pagado,
            'pendiente' => round(max(0, (float) $finca->precio_compra - $pagado), 2),
        ])->setPaper('letter', 'portrait');

        return $pdf->download($pago->numero_recibo.'.pdf');
    }

    public function ticketCompra($id, $pagoId): Response
    {
        $pago = FincaCompraPago::with('finca')->where('finca_id', $id)->findOrFail($pagoId);
        $finca = $pago->finca;
        $pagos = FincaCompraPago::where('finca_id', $finca->id)->orderBy('id')->get();
        $pagado = round((float) $pagos->sum('monto'), 2);
        $numero = $pagos->search(fn ($p) => $p->id === $pago->id);
        $empresa = \App\Helpers\EmpresaConfigHelper::getConfig();

        return TicketPdf::descargar([
            'empresa' => $empresa['nombreEmpresa'] ?? 'TerraCloud',
            'extras' => array_filter([$empresa['nit'] ?? null, $empresa['telefono'] ?? null]),
            'titulo' => 'RECIBO DE COMPRA DE FINCA',
            'numero' => $pago->numero_recibo,
            'fecha' => optional($pago->fecha)->format('d/m/Y'),
            'lineas' => [
                'Vendedor: '.($finca->vendedor_nombre ?: '—'),
                'DPI: '.($finca->vendedor_dpi ?: '—'),
                'Finca: '.$finca->codigo,
                trim(($finca->ubicacion ?: '').' '.($finca->municipio ?: '').' '.($finca->departamento ?: '')),
                'Pago no. '.($numero === false ? 1 : $numero + 1),
                'Origen: '.($pago->origen === 'boveda' ? 'Bóveda' : 'Caja'),
            ],
            'filas' => [
                ['Valor del terreno', 'Q '.number_format((float) $finca->precio_compra, 2)],
                ['Pagado', 'Q '.number_format($pagado, 2)],
                ['Pendiente', 'Q '.number_format(round(max(0, (float) $finca->precio_compra - $pagado), 2), 2)],
            ],
            'totalEtiqueta' => 'ESTE PAGO',
            'total' => 'Q '.number_format((float) $pago->monto, 2),
            'pie' => $empresa['piePaginaDocumentos'] ?? 'Documento de cobro',
        ], 'ticket-'.$pago->numero_recibo.'.pdf');
    }

    public function costeo(Request $request, $id): Response
    {
        $finca = Finca::with('lotes')->findOrFail($id);
        $filas = $finca->lotes->map(fn ($l) => [
            $l->codigo_unico,
            $l->tipo_terreno,
            $l->area_m2,
            $l->costo_asignado,
            $l->precio_sugerido,
            $l->precio_venta,
        ])->all();

        return $this->entregar($request, 'Costeo por lote', [
            $finca->codigo.' — '.$finca->nombre,
            'El costo se reparte por metro negociable, no por cantidad de lotes.',
        ], ['Lote', 'Tipo', 'm2', 'Costo', 'Sugerido', 'Precio venta'], $filas, 'costeo-'.$finca->codigo);
    }

    public function financistas(Request $request): Response
    {
        $query = Financista::with('finca:id,nombre,codigo')
            ->withSum('pagos as capital_pagado', 'monto_capital')
            ->withSum('pagos as interes_pagado', 'monto_interes');
        if ($request->filled('finca_id')) {
            $query->where('finca_id', (int) $request->finca_id);
        }
        $filas = $query->orderByDesc('id')->get()->map(fn (Financista $f) => [
            $f->finca?->nombre,
            $f->tipo,
            $f->nombre,
            $f->destino,
            $f->monto,
            $f->tasa_anual,
            $f->interes_total,
            $f->plazo,
            $f->frecuencia,
            optional($f->fecha_vencimiento)->format('Y-m-d'),
            $f->cuota,
            round((float) $f->monto - (float) $f->capital_pagado, 2),
            $f->estado,
        ])->all();

        return $this->entregar($request, 'Listado de financiamientos', [], [
            'Finca', 'Tipo', 'Nombre', 'Destino', 'Monto', 'Tasa %', 'Interés', 'Plazo', 'Frecuencia', 'Vence', 'Cuota', 'Saldo capital', 'Estado',
        ], $filas, 'financiamientos');
    }

    public function planFinancista(Request $request, $id): Response
    {
        $item = Financista::with('finca:id,nombre,codigo')->findOrFail($id);
        $filasPlan = app(FinancistaController::class)->filasPlan($item);
        $etiquetas = ['pagada' => 'Pagada', 'vencida' => 'Vencida', 'parcial' => 'Parcial', 'pendiente' => 'Pendiente'];
        $filas = array_map(fn (array $c) => [
            $c['numero'],
            $c['fecha'],
            $c['capital'],
            $c['interes'],
            $c['total'],
            $etiquetas[$c['estado']] ?? $c['estado'],
        ], $filasPlan);

        return $this->entregar($request, 'Plan de pago del financiamiento', [
            $item->nombre.' · Finca '.($item->finca?->nombre ?? ''),
            'Capital '.$item->monto.' · Interés '.$item->interes_total.' · Vence '.optional($item->fecha_vencimiento)->format('Y-m-d'),
        ], ['Cuota', 'Fecha', 'Capital', 'Interés', 'Total', 'Estado'], $filas, 'plan-financista-'.$item->id);
    }

    public function estadoFinancista(Request $request, $id): Response
    {
        $item = Financista::with(['finca:id,nombre,codigo', 'pagos'])->findOrFail($id);
        $capital = round((float) $item->pagos->sum('monto_capital'), 2);
        $interes = round((float) $item->pagos->sum('monto_interes'), 2);
        $filas = $item->pagos->sortBy('fecha')->map(fn ($p) => [
            optional($p->fecha)->format('Y-m-d'),
            $p->monto_capital,
            $p->monto_interes,
            $p->monto_mora,
            $p->descuento_interes,
            $p->referencia,
        ])->values()->all();

        return $this->entregar($request, 'Estado de cuenta del financiamiento', [
            $item->nombre.' · '.$item->tipo.' · Finca '.($item->finca?->nombre ?? ''),
            'Capital '.$item->monto.' · Pagado '.$capital.' · Saldo '.round((float) $item->monto - $capital, 2),
            'Interés pactado '.$item->interes_total.' · Interés pagado '.$interes,
        ], ['Fecha', 'Capital', 'Interés', 'Mora', 'Descuento', 'Referencia'], $filas, 'estado-financista-'.$item->id);
    }

    public function comisionistas(Request $request): Response
    {
        $filas = Comisionista::withCount('comisiones')->orderBy('nombre')->get()->map(fn (Comisionista $c) => [
            $c->nombre,
            $c->telefono,
            $c->direccion,
            $c->dpi,
            $c->comisiones_count,
            $c->activo ? 'Activo' : 'Inactivo',
        ])->all();

        return $this->entregar($request, 'Listado de comisionistas', [], [
            'Nombre', 'Teléfono', 'Dirección', 'DPI', 'Comisiones', 'Estado',
        ], $filas, 'comisionistas');
    }

    public function comisiones(Request $request): Response
    {
        $query = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico'])->withSum('pagos as pagado', 'monto');
        if ($request->filled('comisionista_id')) {
            $query->where('comisionista_id', (int) $request->comisionista_id);
        }
        $filas = $query->orderByDesc('id')->get()->map(fn (ComisionVenta $c) => [
            $c->comisionista?->nombre,
            $c->lote?->codigo_unico,
            $c->monto_venta,
            $c->monto_comision,
            round((float) $c->pagado, 2),
            round(max(0, (float) $c->monto_comision - (float) $c->pagado), 2),
            $c->estado,
        ])->all();

        return $this->entregar($request, 'Listado de comisiones', [], [
            'Comisionista', 'Lote', 'Venta', 'Comisión', 'Pagado', 'Pendiente', 'Estado',
        ], $filas, 'comisiones');
    }

    public function estadoComision(Request $request, $id): Response
    {
        $comision = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico', 'pagos'])->findOrFail($id);
        $pagado = round((float) $comision->pagos->sum('monto'), 2);
        $filas = $comision->pagos->sortBy('fecha')->map(fn ($p) => [
            optional($p->fecha)->format('Y-m-d'),
            $p->monto,
            $p->referencia,
        ])->values()->all();

        return $this->entregar($request, 'Estado de cuenta de comisión', [
            ($comision->comisionista?->nombre ?: 'Comisionista').' · Lote '.($comision->lote?->codigo_unico ?: '—'),
            'Venta '.$comision->monto_venta.' · Comisión '.$comision->monto_comision.' · Pagado '.$pagado.' · Pendiente '.round(max(0, (float) $comision->monto_comision - $pagado), 2),
        ], ['Fecha', 'Monto', 'Referencia'], $filas, 'estado-comision-'.$comision->id);
    }

    public function reciboComision($id): Response
    {
        $comision = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico', 'pagos'])->findOrFail($id);
        $pago = $comision->pagos->sortByDesc('id')->first();
        abort_if(! $pago, 404, 'Esta comisión todavía no tiene pagos.');

        return $this->entregar(request()->merge(['formato' => 'pdf']), 'Recibo de pago de comisión', [
            'Recibo del pago #'.$pago->id,
            ($comision->comisionista?->nombre ?: '').' · Lote '.($comision->lote?->codigo_unico ?: '—'),
            'Fecha '.optional($pago->fecha)->format('d/m/Y').' · Monto '.$pago->monto.' · '.($pago->referencia ?: ''),
        ], ['Concepto', 'Valor'], [
            ['Comisión pactada', $comision->monto_comision],
            ['Este pago', $pago->monto],
            ['Pagado acumulado', round((float) $comision->pagos->sum('monto'), 2)],
        ], 'recibo-comision-'.$pago->id);
    }

    public function ticketComision($id): Response
    {
        $comision = ComisionVenta::with(['comisionista', 'lote:id,codigo_unico,numero_lote', 'pagos'])->findOrFail($id);
        $pago = $comision->pagos->sortByDesc('id')->first();
        abort_if(! $pago, 404, 'Esta comisión todavía no tiene pagos.');
        $pagado = round((float) $comision->pagos->sum('monto'), 2);
        $empresa = \App\Helpers\EmpresaConfigHelper::getConfig();

        return TicketPdf::descargar([
            'empresa' => $empresa['nombreEmpresa'] ?? 'TerraCloud',
            'titulo' => 'RECIBO DE COMISIÓN',
            'numero' => (string) $pago->id,
            'fecha' => optional($pago->fecha)->format('d/m/Y'),
            'lineas' => [
                'Comisionista: '.($comision->comisionista?->nombre ?: '—'),
                'Lote: '.($comision->lote?->numero_lote ?: $comision->lote?->codigo_unico ?: '—'),
            ],
            'filas' => [
                ['Comisión pactada', 'Q '.number_format((float) $comision->monto_comision, 2)],
                ['Pagado acumulado', 'Q '.number_format($pagado, 2)],
                ['Pendiente', 'Q '.number_format(round(max(0, (float) $comision->monto_comision - $pagado), 2), 2)],
            ],
            'totalEtiqueta' => 'ESTE PAGO',
            'total' => 'Q '.number_format((float) $pago->monto, 2),
            'nota' => $pago->referencia ? 'Ref: '.$pago->referencia : null,
            'pie' => $empresa['piePaginaDocumentos'] ?? 'Documento de cobro',
        ], 'ticket-comision-'.$pago->id.'.pdf');
    }

    private function entregar(Request $request, string $titulo, array $lineas, array $encabezados, array $filas, string $archivo): Response
    {
        $formato = $request->input('formato', 'pdf');
        if ($formato === 'xlsx') {
            return Excel::download(new InmobiliarioArrayExport($encabezados, $filas), $archivo.'.xlsx');
        }

        $pdf = Pdf::loadView('reportes.documento-tabla', [
            'titulo' => $titulo,
            'lineas' => $lineas,
            'encabezados' => $encabezados,
            'filas' => $filas,
            'generado' => now(),
            'empresa' => \App\Helpers\EmpresaConfigHelper::getConfig(),
        ])->setPaper('letter', 'portrait');

        return $pdf->download($archivo.'.pdf');
    }
}
