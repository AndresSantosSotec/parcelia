<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ventas de terrenos</title>
    <style>
        body { font-family: 'Courier New', monospace; font-size: 11px; margin: 15px; color: #000; }
        h1 { font-size: 16px; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 5px; font-size: 10px; }
        th { background: #000; color: #fff; text-align: left; }
        .resumen { margin: 10px 0; padding: 8px; border: 2px solid #000; }
    </style>
</head>
<body>
    <h1>Ventas de terrenos</h1>
    <p>Generado: {{ $generado->format('d/m/Y H:i') }}</p>
    <div class="resumen">
        Contratos: {{ $data['total_contratos'] }} ·
        Contado: {{ $data['ventas_contado'] }} ·
        Crédito: {{ $data['ventas_credito'] }} ·
        Monto: Q{{ number_format($data['monto_total_ventas'], 2) }} ·
        Descuentos: Q{{ number_format($data['descuentos_otorgados'], 2) }}
    </div>
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Precio final</th>
                <th>Saldo</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['ventas'] as $venta)
                <tr>
                    <td>{{ $venta->codigo_negociacion }}</td>
                    <td>{{ $venta->tipo_negociacion }}</td>
                    <td>{{ $venta->estado }}</td>
                    <td>Q{{ number_format((float) $venta->precio_final, 2) }}</td>
                    <td>Q{{ number_format((float) $venta->saldo_capital_pendiente, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="5">Sin ventas para el período.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
