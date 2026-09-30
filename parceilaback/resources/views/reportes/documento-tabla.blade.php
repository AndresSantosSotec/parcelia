<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $titulo }}</title>
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 11px; color: #111; margin: 22px; }
        h1 { font-size: 16px; margin: 0; color: #065f46; }
        h2 { font-size: 13px; margin: 14px 0 6px; color: #065f46; }
        .meta { font-size: 10px; color: #555; margin: 2px 0 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #d1d5db; padding: 5px 6px; text-align: left; }
        th { background: #ecfdf5; }
        .pie { margin-top: 18px; font-size: 9px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <h1>{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }}</h1>
    <div class="meta">NIT {{ $empresa['nit'] ?? '' }} · {{ $empresa['direccion'] ?? '' }} · {{ $empresa['telefono'] ?? '' }}</div>
    <h2>{{ $titulo }}</h2>
    @foreach ($lineas as $linea)
        <div class="meta">{{ $linea }}</div>
    @endforeach
    <table>
        <thead>
            <tr>
                @foreach ($encabezados as $columna)
                    <th>{{ $columna }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($filas as $fila)
                <tr>
                    @foreach ($fila as $celda)
                        <td>{{ $celda }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ max(count($encabezados), 1) }}">Sin registros</td></tr>
            @endforelse
        </tbody>
    </table>
    <div class="pie">Generado el {{ $generado->format('d/m/Y H:i') }}. {{ $empresa['piePaginaDocumentos'] ?? '' }}</div>
</body>
</html>
