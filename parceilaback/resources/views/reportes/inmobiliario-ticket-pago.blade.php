@php
    $pago = $data['pago'] ?? (object) [];
    $negociacion = $data['negociacion'] ?? (object) [];
    $cliente = $data['cliente'] ?? [];
    $inmueble = $data['inmueble'] ?? [];
    $empresa = $empresa ?? [];
    $moneda = $empresa['monedaSimbolo'] ?? 'Q';
    $fecha = optional($pago->fecha_pago ?? null)->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i');
    $loteTxt = trim(($inmueble['finca'] ?? '') . ' Lote ' . ($inmueble['numero_lote'] ?? $inmueble['codigo_unico'] ?? ''));
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ticket {{ $pago->numero_recibo ?? '' }}</title>
    <style>
        @page { margin: 0; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
            line-height: 1.35;
            color: #000;
            margin: 0;
            padding: 8px 10px;
        }
        .c { text-align: center; }
        .r { text-align: right; }
        .b { font-weight: bold; }
        .empresa { font-size: 12px; font-weight: bold; }
        .linea { border-top: 1px dashed #000; margin: 6px 0; }
        .doble { border-top: 2px solid #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 1px 0; }
        .anulado {
            border: 2px solid #000;
            text-align: center;
            font-weight: bold;
            padding: 4px;
            margin: 4px 0;
            letter-spacing: 0.06em;
        }
        .total { font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="c">
        <div class="empresa">{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }}</div>
        <div>NIT: {{ $empresa['nit'] ?? 'C/F' }}</div>
        @if(!empty($empresa['direccion']))<div>{{ $empresa['direccion'] }}</div>@endif
        @if(!empty($empresa['telefono']))<div>Tel: {{ $empresa['telefono'] }}</div>@endif
    </div>

    <div class="doble"></div>
    <div class="c b">COMPROBANTE DE PAGO</div>
    <div class="c">No. {{ $pago->numero_recibo ?? '—' }}</div>
    <div class="c">{{ $fecha }}</div>

    @if(!empty($pago->anulado))
    <div class="anulado">
        ANULADO
        @if(!empty($pago->motivo_anulacion))
        <div style="font-weight: normal; letter-spacing: 0;">{{ $pago->motivo_anulacion }}</div>
        @endif
    </div>
    @endif

    <div class="linea"></div>
    <div><span class="b">Cliente:</span> {{ $cliente['nombre_completo'] ?? '—' }}</div>
    <div>DPI: {{ $cliente['dpi'] ?? '—' }} · NIT: {{ $cliente['nit'] ?? 'C/F' }}</div>
    <div>Tel: {{ $cliente['telefono'] ?? '—' }}</div>
    <div><span class="b">Contrato:</span> {{ $negociacion->codigo_negociacion ?? '—' }}</div>
    <div><span class="b">Terreno:</span> {{ $loteTxt !== '' ? $loteTxt : '—' }}</div>
    <div><span class="b">Tipo:</span> {{ ucfirst($negociacion->tipo_negociacion ?? '') }}</div>

    <div class="linea"></div>
    <table>
        <tr>
            <td class="b">Concepto</td>
            <td class="r b">Monto</td>
        </tr>
        @if((float) ($pago->distribucion_capital ?? 0) > 0)
        <tr>
            <td>Abono a capital</td>
            <td class="r">{{ $moneda }}{{ number_format((float) $pago->distribucion_capital, 2) }}</td>
        </tr>
        @endif
        @if((float) ($pago->distribucion_interes ?? 0) > 0)
        <tr>
            <td>Intereses</td>
            <td class="r">{{ $moneda }}{{ number_format((float) $pago->distribucion_interes, 2) }}</td>
        </tr>
        @endif
        @if((float) ($pago->distribucion_mora ?? 0) > 0)
        <tr>
            <td>Mora</td>
            <td class="r">{{ $moneda }}{{ number_format((float) $pago->distribucion_mora, 2) }}</td>
        </tr>
        @endif
        @if((float) ($pago->distribucion_gastos ?? 0) > 0)
        <tr>
            <td>Otros cargos</td>
            <td class="r">{{ $moneda }}{{ number_format((float) $pago->distribucion_gastos, 2) }}</td>
        </tr>
        @endif
    </table>
    <div class="doble"></div>
    <table>
        <tr>
            <td class="total">TOTAL</td>
            <td class="r total">{{ $moneda }}{{ number_format((float) ($pago->monto_total ?? 0), 2) }}</td>
        </tr>
    </table>
    <div>Pago: {{ ucfirst($pago->metodo_pago ?? 'efectivo') }}@if($pago->referencia_bancaria ?? null) · {{ $pago->referencia_bancaria }}@endif</div>
    <div class="b">Saldo pendiente: {{ $moneda }}{{ number_format((float) ($pago->saldo_posterior ?? $data['saldo_despues'] ?? 0), 2) }}</div>

    @if($pago->observaciones ?? null)
    <div class="linea"></div>
    <div><span class="b">Nota:</span> {{ $pago->observaciones }}</div>
    @endif

    <div class="linea"></div>
    <div class="c">Recibido por: {{ $data['cobrador'] ?? '—' }}</div>
    <div class="c" style="margin-top: 18px;">________________________</div>
    <div class="c">Firma del cliente</div>
    <div class="linea"></div>
    <div class="c">{{ $empresa['piePaginaDocumentos'] ?? 'Documento de cobro' }}</div>
    <div class="c">{{ $generado->format('d/m/Y H:i') }}</div>
</body>
</html>
