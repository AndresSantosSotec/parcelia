<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 11px; color: #111; margin: 18px; }
        h1 { text-align: center; font-size: 16px; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #222; padding: 5px 6px; }
        .lbl { font-weight: bold; background: #f3f4f6; width: 22%; }
        .right { text-align: right; }
        .center { text-align: center; }
        h2 { font-size: 12px; margin: 14px 0 6px; }
    </style>
</head>
<body>
    <h1>ESTADO DE CUENTA</h1>
    <table>
        <tr>
            <td class="lbl">Nombre</td>
            <td colspan="3">{{ $finca->vendedor_nombre ?: '—' }}</td>
            <td class="lbl">DPI</td>
            <td>{{ $finca->vendedor_dpi ?: '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Código de la finca</td>
            <td>{{ $finca->codigo }}</td>
            <td class="lbl">Dirección</td>
            <td>{{ $finca->ubicacion ?: '—' }}</td>
            <td class="lbl">Municipio</td>
            <td>{{ $finca->municipio ?: '—' }}</td>
        </tr>
        <tr>
            <td class="lbl">Departamento</td>
            <td>{{ $finca->departamento ?: '—' }}</td>
            <td class="lbl">Pagados</td>
            <td class="center">{{ $pagos->count() }}</td>
            <td class="lbl">Valor del terreno</td>
            <td class="right">Q {{ number_format((float) $finca->precio_compra, 2) }}</td>
        </tr>
        <tr>
            <td class="lbl">Plazo</td>
            <td class="center">{{ $finca->tipo_compra === 'pagos' ? $finca->numero_cuotas : 'Contado' }}</td>
            <td class="lbl">Enganche</td>
            <td class="right">Q {{ number_format((float) $finca->enganche, 2) }}</td>
            <td class="lbl">Pagado</td>
            <td class="right">Q {{ number_format($pagado, 2) }}</td>
        </tr>
        <tr>
            <td class="lbl">Frecuencia</td>
            <td>{{ $finca->frecuencia_pago === 'no_aplica' ? 'No aplica' : ucfirst($finca->frecuencia_pago) }}</td>
            <td class="lbl">Pendiente</td>
            <td class="right" colspan="3">Q {{ number_format($pendiente, 2) }}</td>
        </tr>
    </table>
    <h2>Pagos registrados</h2>
    <table>
        <tr>
            <th>Fecha pagado</th>
            <th>No. pago</th>
            <th>Recibo</th>
            <th>Origen</th>
            <th>Cantidad</th>
        </tr>
        @forelse ($pagos as $i => $pago)
            <tr>
                <td>{{ optional($pago->fecha)->format('d/m/Y') }}</td>
                <td class="center">{{ $i + 1 }}</td>
                <td>{{ $pago->numero_recibo }}</td>
                <td>{{ $pago->origen === 'boveda' ? 'Bóveda' : 'Caja' }}</td>
                <td class="right">Q {{ number_format((float) $pago->monto, 2) }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="center">Sin pagos</td></tr>
        @endforelse
    </table>
</body>
</html>
