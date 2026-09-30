<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 11px; color: #111; margin: 18px; }
        h1 { text-align: center; font-size: 16px; margin: 0 0 10px; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #222; padding: 5px 6px; }
        .lbl { font-weight: bold; background: #f3f4f6; width: 22%; }
        .center { text-align: center; }
        .right { text-align: right; }
        .titulo { background: #e5e7eb; font-weight: bold; text-align: center; }
        .pie { margin-top: 12px; font-size: 9px; color: #555; text-align: center; }
    </style>
</head>
<body>
    <h1>REGISTRO DE FINCA</h1>
    <table>
        <tr>
            <td class="lbl">Nombre del vendedor</td>
            <td colspan="3">{{ $finca->vendedor_nombre ?: '—' }}</td>
            <td class="lbl">DPI</td>
            <td>{{ $finca->vendedor_dpi ?: '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Dirección de la finca</td>
            <td colspan="3">{{ $finca->ubicacion ?: '—' }}</td>
            <td class="lbl">Municipio</td>
            <td>{{ $finca->municipio ?: '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Referencia</td>
            <td colspan="3">{{ $finca->referencia ?: '—' }}</td>
            <td class="lbl">Departamento</td>
            <td>{{ $finca->departamento ?: '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Código de finca</td>
            <td>{{ $finca->codigo }}</td>
            <td class="lbl">Precio de la finca</td>
            <td class="right">Q {{ number_format((float) $finca->precio_compra, 2) }}</td>
            <td class="lbl">Gastos de escrituración</td>
            <td class="right">Q {{ number_format((float) $finca->gastos_escrituracion, 2) }}</td>
        </tr>
        <tr>
            <td class="lbl">Tipo de compra</td>
            <td>{{ $finca->tipo_compra === 'pagos' ? 'Por pagos' : 'Al contado' }}</td>
            <td class="lbl">No. de cuota</td>
            <td class="center">{{ $finca->tipo_compra === 'pagos' ? $finca->numero_cuotas : '—' }}</td>
            <td class="lbl">Frecuencia</td>
            <td>{{ $finca->frecuencia_pago === 'no_aplica' ? 'No aplica' : ucfirst($finca->frecuencia_pago) }}</td>
        </tr>
        <tr>
            <td class="lbl">Enganche</td>
            <td class="right">Q {{ number_format((float) $finca->enganche, 2) }}</td>
            <td class="lbl">Cuota</td>
            <td class="right">Q {{ number_format((float) $finca->cuota_compra, 2) }}</td>
            <td class="lbl">Fecha</td>
            <td>{{ optional($finca->fecha_inicio_pagos)->format('d/m/Y') ?: '—' }}</td>
        </tr>
        <tr>
            <td class="titulo" colspan="4">Cantidad de escrituras: {{ $finca->escrituras->count() }}</td>
            <td class="titulo" colspan="2">Total medida de la finca: {{ number_format($areaEscrituras, 2) }} m²</td>
        </tr>
        <tr>
            <th>Fecha de escritura</th>
            <th colspan="3">Número de escritura</th>
            <th colspan="2">Medidas</th>
        </tr>
        @forelse ($finca->escrituras as $escritura)
            <tr>
                <td>{{ optional($escritura->fecha_escritura)->format('d/m/Y') ?: '—' }}</td>
                <td colspan="3">{{ $escritura->numero_escritura }}</td>
                <td colspan="2" class="right">{{ number_format((float) $escritura->area_m2, 2) }} m²</td>
            </tr>
        @empty
            <tr><td colspan="6" class="center">Sin escrituras registradas</td></tr>
        @endforelse
    </table>
    <div class="pie">{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }} · {{ $generado->format('d/m/Y H:i') }}</div>
</body>
</html>
