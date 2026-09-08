@php
    $resumen = $data['resumen'] ?? [];
    $cliente = $resumen['cliente'] ?? [];
    $inmueble = $resumen['inmueble'] ?? [];
    $fin = $resumen['financiero'] ?? [];
    $plan = $data['plan_pagos'] ?? [];
    $kardex = $data['kardex_movimientos'] ?? [];
    $empresa = $empresa ?? [];
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Estado de cuenta {{ $resumen['codigo_negociacion'] ?? '' }}</title>
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 10px; color: #1f2937; margin: 18px; }
        h1 { font-size: 16px; margin: 0 0 4px; color: #065f46; }
        h2 { font-size: 12px; margin: 14px 0 6px; color: #065f46; text-transform: uppercase; }
        .muted { color: #64748b; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        th { background: #065f46; color: #fff; font-size: 9px; text-align: left; }
        .right { text-align: right; }
        .cards td { border: 1px solid #e2e8f0; background: #f8fafc; }
        .saldo { color: #b45309; font-weight: bold; }
        .pagada { color: #047857; }
    </style>
</head>
<body>
    <h1>{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }} · Estado de cuenta</h1>
    <p class="muted">
        Contrato {{ $resumen['codigo_negociacion'] ?? '—' }} ·
        {{ strtoupper($resumen['estado'] ?? '') }} ·
        Generado {{ $generado->format('d/m/Y H:i') }}
    </p>

    <table class="cards" style="margin-bottom: 10px;">
        <tr>
            <td width="50%">
                <strong>Comprador</strong><br>
                {{ $cliente['nombre_completo'] ?? '—' }}<br>
                DPI: {{ $cliente['dpi'] ?? '—' }} · NIT: {{ $cliente['nit'] ?? 'C/F' }}<br>
                Tel: {{ $cliente['telefono'] ?? '—' }}
            </td>
            <td width="50%">
                <strong>Terreno</strong><br>
                {{ $inmueble['finca'] ?? '—' }} · {{ $inmueble['parcela'] ?? '' }}<br>
                Lote {{ $inmueble['codigo_unico'] ?? $inmueble['numero_lote'] ?? '—' }} ·
                {{ number_format((float) ($inmueble['area_m2'] ?? 0), 2) }} m²
            </td>
        </tr>
    </table>

    <table class="cards" style="margin-bottom: 12px; text-align: center;">
        <tr>
            <td><strong>Precio final</strong><br>Q{{ number_format((float) ($fin['precio_final'] ?? 0), 2) }}</td>
            <td><strong>Enganche pagado</strong><br>Q{{ number_format((float) ($fin['enganche_pagado'] ?? 0), 2) }}</td>
            <td><strong>Capital amortizado</strong><br>Q{{ number_format((float) ($fin['total_capital_pagado'] ?? 0), 2) }}</td>
            <td class="saldo"><strong>Saldo pendiente</strong><br>Q{{ number_format((float) ($fin['saldo_capital_pendiente'] ?? 0), 2) }}</td>
        </tr>
    </table>

    <h2>Kardex de movimientos</h2>
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Documento</th>
                <th>Concepto</th>
                <th class="right">Cargo</th>
                <th class="right">Abono</th>
                <th class="right">Saldo</th>
            </tr>
        </thead>
        <tbody>
            @forelse($kardex as $mov)
                <tr>
                    <td>{{ $mov['fecha'] ?? '—' }}</td>
                    <td>{{ $mov['documento'] ?? '—' }}</td>
                    <td>{{ $mov['concepto'] ?? '—' }}</td>
                    <td class="right">Q{{ number_format((float) ($mov['cargo'] ?? 0), 2) }}</td>
                    <td class="right">Q{{ number_format((float) ($mov['abono'] ?? 0), 2) }}</td>
                    <td class="right">Q{{ number_format((float) ($mov['saldo'] ?? 0), 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="6">Sin movimientos registrados.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Plan de pagos</h2>
    <table>
        <thead>
            <tr>
                <th>No.</th>
                <th>Vencimiento</th>
                <th class="right">Capital</th>
                <th class="right">Interés</th>
                <th class="right">Cargos</th>
                <th class="right">Cuota</th>
                <th class="right">Saldo</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($plan as $cuota)
                <tr>
                    <td>{{ $cuota->numero_cuota }}</td>
                    <td>{{ optional($cuota->fecha_vencimiento)->format('d/m/Y') }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->cuota_capital, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->cuota_interes, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->otros_cargos, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->cuota_monto_total, 2) }}</td>
                    <td class="right">Q{{ number_format((float) $cuota->saldo_capital_restante, 2) }}</td>
                    <td class="{{ $cuota->estado === 'pagada' ? 'pagada' : '' }}">{{ strtoupper($cuota->estado) }}</td>
                </tr>
            @empty
                <tr><td colspan="8">Aún no hay cronograma. El plan se genera al completar el enganche.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
