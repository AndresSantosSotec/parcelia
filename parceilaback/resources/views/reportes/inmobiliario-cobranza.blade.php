<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cartera de terrenos</title>
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
    <h1>Cartera y cobranza de terrenos</h1>
    <p>Generado: {{ $generado->format('d/m/Y H:i') }}</p>
    <div class="resumen">
        Contratos activos: {{ $data['total_contratos_activos'] }} ·
        Cartera: Q{{ number_format($data['saldo_cartera_capital'], 2) }} ·
        Al día: {{ $data['contratos_al_dia'] }} ·
        En mora: {{ $data['contratos_en_mora'] }}
    </div>
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Saldo capital</th>
                <th>Días mora</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['contratos'] as $contrato)
                <tr>
                    <td>{{ $contrato->codigo_negociacion }}</td>
                    <td>{{ $contrato->estado }}</td>
                    <td>Q{{ number_format((float) $contrato->saldo_capital_pendiente, 2) }}</td>
                    <td>{{ $contrato->dias_mora_actual }}</td>
                </tr>
            @empty
                <tr><td colspan="4">Sin cartera vigente.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
