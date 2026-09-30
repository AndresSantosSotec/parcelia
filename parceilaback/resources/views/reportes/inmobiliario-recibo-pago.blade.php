@php
    $pago = $data['pago'] ?? (object) [];
    $negociacion = $data['negociacion'] ?? (object) [];
    $cliente = $data['cliente'] ?? [];
    $inmueble = $data['inmueble'] ?? [];
    $empresa = $empresa ?? [];
    $moneda = $empresa['monedaSimbolo'] ?? 'Q';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Recibo de pago {{ $pago->numero_recibo ?? '' }}</title>
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 10px; color: #1f2937; margin: 18px; }
        h1 { font-size: 16px; margin: 0 0 2px; color: #065f46; }
        h2 { font-size: 13px; margin: 16px 0 6px; color: #065f46; text-transform: uppercase; }
        .subtitle { font-size: 11px; color: #64748b; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 5px 8px; }
        .bordered th, .bordered td { border: 1px solid #cbd5e1; }
        .bordered th { background: #065f46; color: #fff; font-size: 9px; text-align: left; }
        .right { text-align: right; }
        .center { text-align: center; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; margin-bottom: 10px; }
        .total-row { background: #ecfdf5; font-weight: bold; font-size: 12px; }
        .separator { border: 0; border-top: 1px dashed #cbd5e1; margin: 15px 0; }
        .firma { border-top: 1px solid #000; padding-top: 8px; width: 200px; text-align: center; margin-top: 40px; }
    </style>
</head>
<body>
    {{-- Encabezado --}}
    <table style="margin-bottom: 14px; border-bottom: 2px solid #065f46; padding-bottom: 10px;">
        <tr>
            <td style="width: 60%; vertical-align: middle;">
                <h1>{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }}</h1>
                <div style="font-size: 9px; color: #666;">NIT: {{ $empresa['nit'] ?? '' }} · Tel: {{ $empresa['telefono'] ?? '' }}</div>
                <div style="font-size: 9px; color: #666;">{{ $empresa['direccion'] ?? '' }}</div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: middle;">
                <div style="font-size: 14px; font-weight: bold; color: #065f46;">RECIBO DE PAGO</div>
                <div style="font-size: 11px; font-weight: bold;">No. {{ $pago->numero_recibo ?? '—' }}</div>
                <div style="font-size: 9px; color: #555;">Fecha: {{ optional($pago->fecha_pago ?? null)->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i') }}</div>
            </td>
        </tr>
    </table>

    {{-- Datos del cliente y terreno --}}
    <table style="margin-bottom: 12px;">
        <tr>
            <td class="info-card" style="width: 50%; vertical-align: top;">
                <strong>Comprador:</strong><br>
                {{ $cliente['nombre_completo'] ?? ($cliente['nombres'] ?? '') . ' ' . ($cliente['apellidos'] ?? '') }}<br>
                DPI: {{ $cliente['dpi'] ?? '—' }} · NIT: {{ $cliente['nit'] ?? 'C/F' }}<br>
                Tel: {{ $cliente['telefono'] ?? '—' }}
            </td>
            <td style="width: 4%;"></td>
            <td class="info-card" style="width: 46%; vertical-align: top;">
                <strong>Contrato:</strong> {{ $negociacion->codigo_negociacion ?? '—' }}<br>
                <strong>Terreno:</strong> {{ $inmueble['finca'] ?? '' }} · Lote {{ $inmueble['codigo_unico'] ?? $inmueble['numero_lote'] ?? '—' }}<br>
                <strong>Tipo:</strong> {{ ucfirst($negociacion->tipo_negociacion ?? '') }}
            </td>
        </tr>
    </table>

    {{-- Detalle del pago --}}
    <h2>Detalle del pago</h2>
    <table class="bordered">
        <thead>
            <tr>
                <th>Concepto</th>
                <th class="right">Monto</th>
            </tr>
        </thead>
        <tbody>
            @if(($pago->capital_aplicado ?? 0) > 0)
            <tr>
                <td>Abono a capital</td>
                <td class="right">{{ $moneda }}{{ number_format((float) ($pago->capital_aplicado ?? 0), 2) }}</td>
            </tr>
            @endif
            @if(($pago->interes_aplicado ?? 0) > 0)
            <tr>
                <td>Intereses</td>
                <td class="right">{{ $moneda }}{{ number_format((float) ($pago->interes_aplicado ?? 0), 2) }}</td>
            </tr>
            @endif
            @if(($pago->mora_aplicada ?? 0) > 0)
            <tr>
                <td>Mora</td>
                <td class="right">{{ $moneda }}{{ number_format((float) ($pago->mora_aplicada ?? 0), 2) }}</td>
            </tr>
            @endif
            @if(($pago->otros_cargos ?? 0) > 0)
            <tr>
                <td>Otros cargos</td>
                <td class="right">{{ $moneda }}{{ number_format((float) ($pago->otros_cargos ?? 0), 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td><strong>TOTAL RECIBIDO</strong></td>
                <td class="right"><strong>{{ $moneda }}{{ number_format((float) ($pago->monto_total ?? 0), 2) }}</strong></td>
            </tr>
        </tbody>
    </table>

    <p style="margin-top: 6px; font-size: 9px; color: #64748b;">
        Método de pago: <strong>{{ ucfirst($pago->metodo_pago ?? 'efectivo') }}</strong>
        @if($pago->referencia_pago ?? null) · Ref: {{ $pago->referencia_pago }} @endif
    </p>

    {{-- Saldo --}}
    <table style="margin-top: 12px; width: 60%;">
        <tr>
            <td class="info-card" style="text-align: center;">
                <div style="font-size: 9px; color: #64748b;">Saldo pendiente después de este pago</div>
                <div style="font-size: 16px; font-weight: bold; color: #b45309;">{{ $moneda }}{{ number_format((float) ($data['saldo_despues'] ?? 0), 2) }}</div>
            </td>
        </tr>
    </table>

    @if($pago->observaciones ?? null)
    <p style="margin-top: 10px; font-size: 9px; color: #555;"><strong>Observaciones:</strong> {{ $pago->observaciones }}</p>
    @endif

    <hr class="separator" />

    {{-- Firmas --}}
    <table style="margin-top: 30px;">
        <tr>
            <td class="center" style="width: 45%;">
                <div class="firma">
                    <strong>{{ $empresa['nombreEmpresa'] ?? 'La Empresa' }}</strong><br>Cajero/Receptor
                </div>
            </td>
            <td style="width: 10%;"></td>
            <td class="center" style="width: 45%;">
                <div class="firma">
                    <strong>{{ $cliente['nombre_completo'] ?? '' }}</strong><br>Comprador
                </div>
            </td>
        </tr>
    </table>

    <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 8px; color: #999; text-align: center;">
        {{ $empresa['piePaginaDocumentos'] ?? 'Documento oficial' }} · Generado el {{ $generado->format('d/m/Y H:i') }}
    </div>
</body>
</html>
