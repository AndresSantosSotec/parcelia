<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ingresos de terrenos</title>
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
    <h1>Ingresos de terrenos</h1>
    <p>{{ $data['fecha'] }} @if(!empty($data['fecha_hasta']) && $data['fecha_hasta'] !== $data['fecha']) a {{ $data['fecha_hasta'] }} @endif</p>
    <p>Generado: {{ $generado->format('d/m/Y H:i') }}</p>
    <div class="resumen">
        Recibos: {{ $data['total_recibos'] }} ·
        Ingresos: Q{{ number_format($data['total_ingresos'], 2) }} ·
        Capital: Q{{ number_format($data['total_capital'], 2) }} ·
        Interés: Q{{ number_format($data['total_interes'], 2) }} ·
        Mora: Q{{ number_format($data['total_mora'], 2) }}
    </div>
    <table>
        <thead>
            <tr>
                <th>Recibo</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Monto</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['pagos'] as $pago)
                <tr>
                    <td>{{ $pago->numero_recibo }}</td>
                    <td>{{ $pago->tipo_pago }}</td>
                    <td>{{ $pago->metodo_pago }}</td>
                    <td>Q{{ number_format((float) $pago->monto_total, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="4">Sin ingresos en el período. Los pagos anulados no se incluyen.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
