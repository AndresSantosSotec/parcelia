<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $titulo ?? 'Ticket' }} {{ $numero ?? '' }}</title>
    <style>
        @page { margin: 0; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
            line-height: 1.35;
            color: #000;
            margin: 0;
            padding: 8px 10px;
        }
        .c { text-align: center; }
        .r { text-align: right; }
        .b { font-weight: bold; }
        .empresa { font-size: 12px; font-weight: bold; }
        .linea { border-top: 1px dashed #000; margin: 6px 0; }
        .doble { border-top: 2px solid #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 1px 0; }
        .anulado {
            border: 2px solid #000;
            text-align: center;
            font-weight: bold;
            padding: 4px;
            margin: 4px 0;
        }
        .total { font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="c">
        <div class="empresa">{{ $empresa ?? 'TerraCloud' }}</div>
        @foreach(($extras ?? []) as $extra)
            @if($extra !== '' && $extra !== null)
            <div>{{ $extra }}</div>
            @endif
        @endforeach
    </div>
    <div class="doble"></div>
    <div class="c b">{{ $titulo ?? 'COMPROBANTE' }}</div>
    @if(!empty($numero))<div class="c">No. {{ $numero }}</div>@endif
    @if(!empty($fecha))<div class="c">{{ $fecha }}</div>@endif

    @if(!empty($anulado))
    <div class="anulado">
        ANULADO
        @if(!empty($motivo))<div style="font-weight: normal;">{{ $motivo }}</div>@endif
    </div>
    @endif

    @if(!empty($lineas))
    <div class="linea"></div>
    @foreach($lineas as $linea)
        @if($linea !== '' && $linea !== null)
        <div>{{ $linea }}</div>
        @endif
    @endforeach
    @endif

    @if(!empty($filas))
    <div class="linea"></div>
    <table>
        @foreach($filas as $fila)
        <tr>
            <td>{{ $fila[0] ?? '' }}</td>
            <td class="r">{{ $fila[1] ?? '' }}</td>
        </tr>
        @endforeach
    </table>
    @endif

    @if(isset($total))
    <div class="doble"></div>
    <table>
        <tr>
            <td class="total">{{ $totalEtiqueta ?? 'TOTAL' }}</td>
            <td class="r total">{{ $total }}</td>
        </tr>
    </table>
    @endif

    @if(!empty($nota))
    <div class="linea"></div>
    <div>{{ $nota }}</div>
    @endif

    <div class="linea"></div>
    <div class="c" style="margin-top: 16px;">________________________</div>
    <div class="c">Firma</div>
    <div class="linea"></div>
    <div class="c">{{ $pie ?? 'Documento de cobro' }}</div>
</body>
</html>
