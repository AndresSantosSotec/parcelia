<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
        h1 { text-align: center; font-size: 18px; margin: 0; }
        .serie { text-align: center; font-weight: bold; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        td { border: 1px solid #222; padding: 6px 8px; }
        .lbl { font-weight: bold; width: 34%; background: #f3f4f6; }
        .right { text-align: right; }
        .firmas { margin-top: 48px; width: 100%; }
        .firmas td { border: 0; text-align: center; padding-top: 28px; }
        .linea { border-top: 1px solid #111; margin: 0 24px; padding-top: 4px; }
    </style>
</head>
<body>
    <h1>RECIBO DE PAGO</h1>
    <div class="serie">{{ $pago->numero_recibo }}</div>
    <table>
        <tr><td class="lbl">Nombre</td><td>{{ $finca->vendedor_nombre ?: '—' }}</td></tr>
        <tr><td class="lbl">DPI</td><td>{{ $finca->vendedor_dpi ?: '—' }}</td></tr>
        <tr><td class="lbl">Código de finca</td><td>{{ $finca->codigo }}</td></tr>
        <tr><td class="lbl">Dirección</td><td>{{ $finca->ubicacion ?: '—' }} · {{ $finca->municipio ?: '' }} · {{ $finca->departamento ?: '' }}</td></tr>
        <tr><td class="lbl">Pago</td><td>{{ $numero }}</td></tr>
        <tr><td class="lbl">Fecha</td><td>{{ optional($pago->fecha)->format('d/m/Y') }}</td></tr>
        <tr><td class="lbl">Cantidad</td><td class="right">Q {{ number_format((float) $pago->monto, 2) }}</td></tr>
        <tr><td class="lbl">Origen</td><td>{{ $pago->origen === 'boveda' ? 'Bóveda' : 'Caja' }}</td></tr>
        <tr><td class="lbl">Valor del terreno</td><td class="right">Q {{ number_format((float) $finca->precio_compra, 2) }}</td></tr>
        <tr><td class="lbl">Pagado</td><td class="right">Q {{ number_format($pagado, 2) }}</td></tr>
        <tr><td class="lbl">Pendiente</td><td class="right">Q {{ number_format($pendiente, 2) }}</td></tr>
    </table>
    <table class="firmas">
        <tr>
            <td><div class="linea">Quien recibe</div></td>
            <td><div class="linea">Quien paga</div></td>
        </tr>
    </table>
</body>
</html>
