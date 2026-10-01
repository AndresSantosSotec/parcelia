<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 11px; color: #111; margin: 28px; line-height: 1.4; }
        h1 { font-size: 16px; color: #065f46; margin: 0 0 4px; }
        h2 { font-size: 13px; color: #065f46; margin: 14px 0 4px; }
        h3 { font-size: 12px; margin: 8px 0 2px; }
        .meta { font-size: 10px; color: #444; margin-bottom: 8px; }
        ul { margin: 2px 0 6px; padding-left: 16px; }
        li { margin-bottom: 2px; }
    </style>
</head>
<body>
    <h1>Registro de los tres módulos</h1>
    <div class="meta">{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }} · {{ $generado->format('d/m/Y') }}</div>

    <h2>1. Compra de fincas</h2>
    <h3>Datos al comprar</h3>
    <ul>
        <li>Ubicación: dirección, municipio y departamento.</li>
        <li>Vendedor: nombre completo de la persona a quien se le compra, y su DPI.</li>
        <li>Escrituras: cantidad, número de cada escritura y metros cuadrados. El área total es la suma de las escrituras.</li>
        <li>Precio: valor en que se compra la finca.</li>
        <li>Costo de escrituración.</li>
    </ul>
    <h3>Urbanización</h3>
    <ul>
        <li>Qué finca se urbaniza y en cuántos lotes se divide.</li>
        <li>Gastos reales: calle, agua potable, energía eléctrica y otros. También técnico, legal, obra y administración. El mismo tipo de gasto puede repetirse.</li>
    </ul>
    <h3>Cómo se reparte el costo</h3>
    <p>Precio de compra, escrituración y urbanización forman la inversión. Esa inversión se divide entre los metros cuadrados negociables, los que se lotifican para la venta. El costo de un lote es su medida por ese costo por metro. La utilidad del lote es el precio de venta menos ese costo. Calles, área verde y área técnica se registran aparte y no entran al costo por metro.</p>

    <h2>2. Financiamiento e inversiones externas</h2>
    <ul>
        <li>Tipo: banco, cooperativa, persona particular u otros.</li>
        <li>Nombre del banco, de la cooperativa o de la persona.</li>
        <li>Monto, tasa de interés anual (de 5 % a 100 %) e interés total según el monto y el plazo.</li>
        <li>Plazo, fecha de vencimiento y forma de pago: mensual, trimestral, semestral o anual.</li>
        <li>Cuota según esa forma de pago.</li>
        <li>Finca en la que se invierte el financiamiento, para la compra o para la urbanización.</li>
        <li>El interés se calcula sobre el total de la inversión, en forma anual.</li>
        <li>El capital puede pagarse en cuotas o al término del plazo. El interés se sigue pagando.</li>
        <li>Alerta cuando el vencimiento está a 15 días o menos y queda saldo.</li>
        <li>El financiamiento no aumenta el costo del lote.</li>
    </ul>
    <h3>Reportes</h3>
    <ul>
        <li>Estado de cuenta del financiamiento.</li>
        <li>Listado de financiamientos.</li>
        <li>Vencimientos: préstamos con saldo, marcados si están por vencer.</li>
    </ul>

    <h2>3. Comisionistas</h2>
    <ul>
        <li>Nombre completo, teléfono de contacto, dirección y DPI.</li>
        <li>Lote que vende, cuánto se vende ese lote y cuánto le corresponde de comisión.</li>
        <li>La comisión sale de una regla (porcentaje o monto fijo) o de un monto escrito a mano.</li>
        <li>Pagos de esa comisión: fecha y cantidad, hasta cubrir lo que le corresponde.</li>
        <li>Recibo de cada pago.</li>
    </ul>
    <h3>Reportes</h3>
    <ul>
        <li>Estado de cuenta del comisionista.</li>
        <li>Listado de comisionistas y listado de comisiones.</li>
        <li>Comisiones pendientes de pago.</li>
    </ul>

    <h2>Otros reportes del sistema en estos módulos</h2>
    <ul>
        <li>Compra: listado de fincas, registro de la finca, plan de pagos, estado de cuenta, recibo, contrato y costeo por lote.</li>
        <li>Compra: cuotas pendientes de todas las fincas y gastos de urbanización.</li>
        <li>Financiamiento: listado, estado de cuenta y vencimientos.</li>
        <li>Comisionistas: listado de personas, listado de comisiones, estado de cuenta, recibo y pendientes de pago.</li>
        <li>Cada listado operativo también se descarga en Excel.</li>
    </ul>
</body>
</html>
