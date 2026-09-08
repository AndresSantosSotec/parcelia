@php
    $resumen = $data['resumen'] ?? [];
    $cliente = $resumen['cliente'] ?? [];
    $inmueble = $resumen['inmueble'] ?? [];
    $fin = $resumen['financiero'] ?? [];
    $plan = $data['plan_pagos'] ?? [];
    $empresa = $empresa ?? [];
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Plan de pagos {{ $resumen['codigo_negociacion'] ?? '' }}</title>
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 9px; color: #1f2937; margin: 14px; }
        h1 { font-size: 15px; margin: 0 0 4px; color: #065f46; }
        .muted { color: #64748b; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 3px 5px; }
        th { background: #065f46; color: #fff; font-size: 8px; text-align: left; }
        .right { text-align: right; }
        .pagada { background: #ecfdf5; }
    </style>
</head>
<body>
    <h1>{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }} · Plan de pagos</h1>
    <p class="muted">
        Contrato {{ $resumen['codigo_negociacion'] ?? '—' }} ·
        {{ $cliente['nombre_completo'] ?? '—' }} ·
        Lote {{ $inmueble['codigo_unico'] ?? $inmueble['numero_lote'] ?? '—' }} ·
        {{ ucfirst($resumen['tipo_negociacion'] ?? '') }} ·
        {{ (int) ($fin['plazo_meses'] ?? 0) }} meses ·
        Tasa {{ number_format((float) ($fin['tasa_interes_anual'] ?? 0), 2) }}% ·
        Generado {{ $generado->format('d/m/Y H:i') }}
    </p>
    <table style="margin-bottom: 8px;">
        <tr>
            <td><strong>Precio final:</strong> Q{{ number_format((float) ($fin['precio_final'] ?? 0), 2) }}</td>
            <td><strong>Enganche:</strong> Q{{ number_format((float) ($fin['enganche_pagado'] ?? 0), 2) }} / Q{{ number_format((float) ($fin['enganche_pactado'] ?? 0), 2) }}</td>
            <td><strong>Financiado:</strong> Q{{ number_format((float) ($fin['monto_financiado'] ?? 0), 2) }}</td>
            <td><strong>Saldo:</strong> Q{{ number_format((float) ($fin['saldo_capital_pendiente'] ?? 0), 2) }}</td>
        </tr>
    </table>
    <table>
        <thead>
            <tr>
                <th>No.</th>
                <th>Vencimiento</th>
                <th class="right">Saldo inicial</th>
                <th class="right">Capital</th>
                <th class="right">Interés</th>
                <th class="right">Cargos</th>
                <th class="right">Cuota total</th>
                <th class="right">Pagado</th>
                <th class="right">Saldo restante</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($plan as $cuota)
                <tr class="{{ $cuota->estado === 'pagada' ? 'pagada' : '' }}">
                    <td>{{ $cuota->numero_cuota }}</td>
                    <td>{{ optional($cuota->fecha_vencimiento)->format('d/m/Y') }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->saldo_inicial, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->cuota_capital, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->cuota_interes, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->otros_cargos, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->cuota_monto_total, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->monto_pagado, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->saldo_capital_restante, 2) }}</td>
                    <td>{{ strtoupper($cuota->estado) }}</td>
                </tr>
            @empty
                <tr><td colspan="10">Aún no hay plan de pagos. Se genera al completar el enganche de un crédito.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
