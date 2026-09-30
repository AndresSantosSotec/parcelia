<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 11px; color: #111; margin: 22px; line-height: 1.45; }
        h1 { text-align: center; font-size: 15px; margin: 0 0 4px; color: #065f46; }
        h2 { font-size: 12px; color: #065f46; margin: 14px 0 4px; }
        .meta { text-align: center; font-size: 10px; color: #444; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        td, th { border: 1px solid #222; padding: 4px 6px; }
        .lbl { font-weight: bold; background: #f3f4f6; width: 28%; }
        .right { text-align: right; }
        .firmas { margin-top: 36px; width: 100%; }
        .firmas td { border: 0; text-align: center; padding-top: 28px; }
        .linea { border-top: 1px solid #111; margin: 0 18px; padding-top: 4px; }
    </style>
</head>
<body>
    <h1>CONTRATO DE COMPRA DE FINCA</h1>
    <div class="meta">{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }} · {{ $finca->codigo }} · {{ $generado->format('d/m/Y') }}</div>

    <p>En la ciudad que corresponda, comparecen <strong>{{ $empresa['nombreEmpresa'] ?? 'la compradora' }}</strong>, en adelante LA COMPRADORA, y el señor(a) <strong>{{ $finca->vendedor_nombre ?: '________________' }}</strong>, quien se identifica con DPI <strong>{{ $finca->vendedor_dpi ?: '________________' }}</strong>, en adelante EL VENDEDOR, para la compraventa de la finca que se describe.</p>

    <h2>Del inmueble</h2>
    <table>
        <tr><td class="lbl">Código</td><td>{{ $finca->codigo }} — {{ $finca->nombre }}</td></tr>
        <tr><td class="lbl">Dirección</td><td>{{ $finca->ubicacion ?: '—' }}</td></tr>
        <tr><td class="lbl">Municipio / Departamento</td><td>{{ $finca->municipio ?: '—' }} / {{ $finca->departamento ?: '—' }}</td></tr>
        <tr><td class="lbl">Referencia</td><td>{{ $finca->referencia ?: '—' }}</td></tr>
        <tr><td class="lbl">Escrituras</td><td>{{ $finca->escrituras->count() }} · {{ number_format($areaEscrituras, 2) }} m²</td></tr>
    </table>

    <h2>Del precio y la forma de pago</h2>
    <p>El precio de la finca es <strong>Q {{ number_format($deuda['precio'], 2) }}</strong>, más gastos de escrituración por Q {{ number_format((float) $finca->gastos_escrituracion, 2) }}. La compra es <strong>{{ $finca->tipo_compra === 'pagos' ? 'por pagos, sin interés' : 'al contado' }}</strong>.</p>
    <table>
        <tr><td class="lbl">Enganche pactado</td><td class="right">Q {{ number_format($deuda['enganche'], 2) }}</td></tr>
        <tr><td class="lbl">Pagado según estado de cuenta</td><td class="right">Q {{ number_format($deuda['pagado'], 2) }}</td></tr>
        <tr><td class="lbl">Saldo pendiente</td><td class="right">Q {{ number_format($deuda['pendiente'], 2) }}</td></tr>
        <tr><td class="lbl">Cuotas</td><td>{{ $deuda['cuotas_pagadas'] }} pagadas · {{ $deuda['cuotas_pendientes'] }} por pagar · frecuencia {{ $finca->frecuencia_pago === 'no_aplica' ? 'no aplica' : $finca->frecuencia_pago }}</td></tr>
        <tr><td class="lbl">Próxima cuota</td><td>Q {{ number_format($deuda['cuota_proxima'], 2) }} · {{ $deuda['fecha_proxima'] ?: '—' }}</td></tr>
    </table>
    <p>El saldo pendiente se cubre con las cuotas que siguen, sin interés. Cada abono se anota en el estado de cuenta y reduce la deuda hasta dejarla en cero.</p>

    <h2>Plan para verificar la deuda</h2>
    <table>
        <tr>
            <th>#</th>
            <th>Vencimiento</th>
            <th>Cuota</th>
            <th>Pagado</th>
            <th>Saldo</th>
            <th>Estado</th>
        </tr>
        @foreach ($cuotas as $cuota)
            <tr>
                <td>{{ $cuota->numero_cuota }}</td>
                <td>{{ optional($cuota->fecha_vencimiento)->format('d/m/Y') }}</td>
                <td class="right">Q {{ number_format((float) $cuota->monto, 2) }}</td>
                <td class="right">Q {{ number_format((float) $cuota->monto_pagado, 2) }}</td>
                <td class="right">Q {{ number_format(max(0, (float) $cuota->monto - (float) $cuota->monto_pagado), 2) }}</td>
                <td>{{ $cuota->estado }}</td>
            </tr>
        @endforeach
    </table>

    <table class="firmas">
        <tr>
            <td><div class="linea">EL VENDEDOR</div></td>
            <td><div class="linea">LA COMPRADORA</div></td>
        </tr>
    </table>
</body>
</html>
