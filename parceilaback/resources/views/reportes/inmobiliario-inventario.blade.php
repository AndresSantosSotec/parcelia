<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Inventario de lotes</title>
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
    <h1>Inventario de lotes</h1>
    <p>Generado: {{ $generado->format('d/m/Y H:i') }}</p>
    <div class="resumen">
        Total: {{ $data['total_lotes'] }} ·
        Disponibles: {{ $data['disponibles'] }} ·
        Reservados: {{ $data['reservados'] }} ·
        Vendidos: {{ $data['vendidos'] }} ·
        Pagados: {{ $data['pagados'] }} ·
        Área: {{ number_format($data['area_total_m2'], 2) }} m² ·
        Valor disponible: Q{{ number_format($data['valor_inventario_disponible'], 2) }}
    </div>
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Lote</th>
                <th>Estado</th>
                <th>Área m²</th>
                <th>Precio</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['lotes'] as $lote)
                <tr>
                    <td>{{ $lote->codigo_unico }}</td>
                    <td>{{ $lote->numero_lote }}</td>
                    <td>{{ $lote->estado }}</td>
                    <td>{{ number_format((float) $lote->area_m2, 2) }}</td>
                    <td>Q{{ number_format((float) $lote->precio_venta, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="5">Sin lotes para el filtro indicado.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
