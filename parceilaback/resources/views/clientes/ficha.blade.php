<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ficha de Cliente - {{ $cliente->nombre_completo }}</title>
    <style>
        @page {
            margin: 0;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10pt;
            color: #2c3e50;
            line-height: 1.45;
            margin: 0;
            padding-top: 2.2cm;
            padding-bottom: 1.8cm;
            padding-left: 1.8cm;
            padding-right: 1.8cm;
        }
        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 2cm;
            background: #2c3e50;
            color: #ecf0f1;
            padding: 0.5cm 1.8cm;
            border-bottom: 1px solid #1a252f;
        }
        .header-inner {
            display: table;
            width: 100%;
            height: 100%;
        }
        .brand {
            display: table-cell;
            vertical-align: middle;
            font-size: 14pt;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .doc-type {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            font-size: 9pt;
            color: #bdc3c7;
            font-weight: normal;
        }
        footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1.2cm;
            background: #34495e;
            color: #bdc3c7;
            font-size: 8pt;
            text-align: center;
            line-height: 1.2cm;
            padding: 0 1.8cm;
        }
        .document-title {
            font-size: 12pt;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 1em;
            padding-bottom: 0.4em;
            border-bottom: 1px solid #bdc3c7;
            letter-spacing: 0.3px;
        }
        .section-title {
            font-size: 10pt;
            font-weight: 600;
            color: #2c3e50;
            margin-top: 1.2em;
            margin-bottom: 0.6em;
            padding-bottom: 0.25em;
            border-bottom: 1px solid #dfe6e9;
            text-transform: none;
            letter-spacing: 0.2px;
        }
        .info-block {
            margin-bottom: 1em;
        }
        .info-row {
            display: table;
            width: 100%;
            margin-bottom: 0.35em;
        }
        .info-label {
            display: table-cell;
            width: 28%;
            font-size: 9pt;
            color: #7f8c8d;
            font-weight: 500;
            vertical-align: top;
        }
        .info-value {
            display: table-cell;
            font-size: 10pt;
            color: #2c3e50;
            font-weight: normal;
        }
        .info-grid-two {
            display: table;
            width: 100%;
            margin-bottom: 1em;
        }
        .info-col {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 1.5em;
        }
        .stats-row {
            display: table;
            width: 100%;
            margin-bottom: 1em;
            border: 1px solid #dfe6e9;
            background: #f8f9fa;
        }
        .stat-cell {
            display: table-cell;
            width: 25%;
            padding: 0.6em 0.5em;
            text-align: center;
            border-right: 1px solid #dfe6e9;
            vertical-align: middle;
        }
        .stat-cell:last-child {
            border-right: none;
        }
        .stat-label {
            font-size: 8pt;
            color: #7f8c8d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.25em;
        }
        .stat-value {
            font-size: 11pt;
            font-weight: 600;
            color: #2c3e50;
        }
        .stat-value.highlight {
            color: #2980b9;
        }
        .stat-value.alert {
            color: #c0392b;
        }
        .score-block {
            margin-bottom: 1em;
            padding: 0.75em 1em;
            border: 1px solid #dfe6e9;
            background: #f8f9fa;
        }
        .score-label {
            font-size: 8pt;
            color: #7f8c8d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.2em;
        }
        .score-main {
            font-size: 11pt;
            font-weight: 600;
            color: #2c3e50;
        }
        .score-detail {
            font-size: 9pt;
            color: #7f8c8d;
            margin-top: 0.3em;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.4em;
            font-size: 9pt;
            border: 1px solid #dfe6e9;
        }
        table.data th {
            background: #ecf0f1;
            color: #2c3e50;
            font-weight: 600;
            text-align: left;
            padding: 0.5em 0.6em;
            border-bottom: 1px solid #dfe6e9;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        table.data td {
            padding: 0.45em 0.6em;
            border-bottom: 1px solid #ecf0f1;
            color: #2c3e50;
        }
        table.data tr:nth-child(even) {
            background: #fafbfc;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge {
            display: inline-block;
            padding: 0.15em 0.5em;
            font-size: 8pt;
            font-weight: 600;
            border-radius: 2px;
        }
        .badge-vigente, .badge-aprobado { background: #d5f4e6; color: #1e8449; }
        .badge-en_mora { background: #fdebd0; color: #b7950b; }
        .badge-vencido { background: #fadbd8; color: #922b21; }
        .badge-liquidado, .badge-pagado { background: #d6eaf8; color: #1a5276; }
        .disclaimer {
            margin-top: 1.5em;
            padding-top: 0.8em;
            border-top: 1px solid #dfe6e9;
            font-size: 7.5pt;
            color: #95a5a6;
            text-align: justify;
            line-height: 1.35;
        }
        .ref-empty {
            font-size: 9pt;
            color: #95a5a6;
            font-style: italic;
        }
    </style>
</head>
<body>
    <header>

        <div class="header-inner">
            <div class="brand">Avanza</div>
            <div class="doc-type">Ficha de Cliente — Documento interno</div>
        </div>
    </header>

    <footer>
        Generado el {{ $fechaGeneracion }} — Uso exclusivo interno — Confidencial
    </footer>

    <div class="document-title">Ficha de Cliente</div>

    <!-- Datos del cliente -->
    <div class="section-title">Datos del titular</div>
    <div class="info-grid-two">
        <div class="info-col">
            <div class="info-row">
                <span class="info-label">Código</span>
                <span class="info-value">{{ $cliente->codigo_cliente ?? '—' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Nombre completo</span>
                <span class="info-value">{{ $cliente->nombre_completo }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">DPI</span>
                <span class="info-value">{{ $cliente->dpi ?? '—' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">NIT</span>
                <span class="info-value">{{ $cliente->nit ?? '—' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Teléfono</span>
                <span class="info-value">{{ $cliente->telefono ?? '—' }}</span>
            </div>
            @if($cliente->telefono_secundario)
            <div class="info-row">
                <span class="info-label">Tel. secundario</span>
                <span class="info-value">{{ $cliente->telefono_secundario }}</span>
            </div>
            @endif
        </div>
        <div class="info-col">
            <div class="info-row">
                <span class="info-label">Correo electrónico</span>
                <span class="info-value">{{ $cliente->email ?? '—' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Dirección</span>
                <span class="info-value">{{ $cliente->direccion ?? '—' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Municipio</span>
                <span class="info-value">{{ $cliente->municipio ?? '—' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Estado</span>
                <span class="info-value">{{ ucfirst($cliente->estado) }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tipo de cliente</span>
                <span class="info-value">{{ $cliente->tipo_cliente ? ucfirst($cliente->tipo_cliente) : '—' }}</span>
            </div>
        </div>
    </div>

    <!-- Referencias personales / laborales -->
    <div class="section-title">Referencias</div>
    @if($cliente->referencias && $cliente->referencias->count() > 0)
    <table class="data">
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Relación</th>
            </tr>
        </thead>
        <tbody>
            @foreach($cliente->referencias as $ref)
            <tr>
                <td>{{ $ref->nombre }}</td>
                <td>{{ $ref->telefono }}</td>
                <td>{{ $ref->relacion ?? '—' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @else
    <p class="ref-empty">Sin referencias registradas.</p>
    @endif

    <!-- Resumen financiero -->
    <div class="section-title">Resumen de terrenos</div>
    <div class="stats-row">
        <div class="stat-cell">
            <div class="stat-label">Total contratado</div>
            <div class="stat-value highlight">Q {{ number_format($stats['monto_total_prestado'], 2) }}</div>
        </div>
        <div class="stat-cell">
            <div class="stat-label">Saldo de terrenos</div>
            <div class="stat-value alert">Q {{ number_format($stats['saldo_actual_total'], 2) }}</div>
        </div>
        <div class="stat-cell">
            <div class="stat-label">Puntualidad</div>
            <div class="stat-value">
                {{ $comportamiento['tasa_puntualidad'] !== null ? round($comportamiento['tasa_puntualidad']) . '%' : '—' }}
            </div>
        </div>
        <div class="stat-cell">
            <div class="stat-label">Ventas activas</div>
            <div class="stat-value">{{ $stats['activos'] }}</div>
        </div>
    </div>

    <!-- Calificación de riesgo -->
    <div class="score-block">
        <div class="score-label">Calificación de riesgo</div>
        <div class="score-main">{{ $comportamiento['comportamiento'] }}</div>
        <div class="score-detail">
            Puntos: {{ round($comportamiento['puntos']) }}/100 —
            {{ $comportamiento['pagos_puntuales'] }} de {{ $comportamiento['pagos_total'] }} cuotas a tiempo o adelantadas
        </div>
    </div>

    <!-- Resumen de negociaciones -->
    <div class="section-title">Terrenos solicitados y financiados</div>
    <div class="info-block">
        <div class="info-row">
            <span class="info-label">Total en historial</span>
            <span class="info-value">{{ $stats['total_historial'] }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Pagados en su totalidad</span>
            <span class="info-value">{{ $stats['liquidados'] }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">En mora</span>
            <span class="info-value">{{ $stats['vencidos'] }}</span>
        </div>
    </div>

    @if($negociaciones_activas->count() > 0)
    <div class="section-title">Terrenos activos y reservas</div>
    <table class="data">
        <thead>
            <tr>
                <th>Código</th>
                <th>Lote</th>
                <th>Fecha</th>
                <th class="text-right">Precio final</th>
                <th class="text-right">Saldo capital</th>
                <th class="text-center">Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($negociaciones_activas as $neg)
            <tr>
                <td>{{ $neg->codigo_negociacion }}</td>
                <td>{{ $neg->lote->codigo_unico ?? '—' }}</td>
                <td>{{ $neg->fecha_negociacion ? $neg->fecha_negociacion->format('d/m/Y') : '—' }}</td>
                <td class="text-right">Q {{ number_format($neg->precio_final, 2) }}</td>
                <td class="text-right">Q {{ number_format($neg->saldo_capital_pendiente, 2) }}</td>
                <td class="text-center">
                    <span class="badge badge-{{ str_replace(' ', '_', strtolower($neg->estado)) }}">
                        {{ str_replace('_', ' ', ucfirst($neg->estado)) }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    @if($negociaciones_pagadas->count() > 0)
    <div class="section-title">Terrenos pagados</div>
    <table class="data">
        <thead>
            <tr>
                <th>Código</th>
                <th>Lote</th>
                <th>Fecha</th>
                <th class="text-right">Precio</th>
                <th class="text-center">Tipo</th>
                <th class="text-center">Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($negociaciones_pagadas as $neg)
            <tr>
                <td>{{ $neg->codigo_negociacion }}</td>
                <td>{{ $neg->lote->codigo_unico ?? '—' }}</td>
                <td>{{ $neg->fecha_negociacion ? $neg->fecha_negociacion->format('d/m/Y') : '—' }}</td>
                <td class="text-right">Q {{ number_format($neg->precio_final, 2) }}</td>
                <td class="text-center">{{ ucfirst($neg->tipo_negociacion) }}</td>
                <td class="text-center">
                    <span class="badge badge-liquidado">Pagado</span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <div class="disclaimer">
        Este documento es confidencial y de uso interno. Los datos reflejan el estado al {{ $fechaGeneracion }}.
        La calificación de riesgo se obtiene del historial de cuotas de terreno, mora y liquidaciones. No compartir sin autorización.
    </div>
</body>
</html>
