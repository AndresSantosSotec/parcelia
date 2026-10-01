<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; font-size: 11px; color: #111; margin: 28px; line-height: 1.45; }
        h1 { font-size: 16px; color: #065f46; margin: 0 0 4px; }
        h2 { font-size: 13px; color: #065f46; margin: 16px 0 4px; }
        h3 { font-size: 12px; margin: 10px 0 2px; }
        .meta { font-size: 10px; color: #444; margin-bottom: 10px; }
        ol { margin: 4px 0 8px; padding-left: 18px; }
        li { margin-bottom: 3px; }
        .nota { background: #f3f4f6; padding: 6px 8px; margin-top: 6px; }
    </style>
</head>
<body>
    <h1>Cómo se usan los tres módulos</h1>
    <div class="meta">{{ $empresa['nombreEmpresa'] ?? 'TerraCloud' }} · {{ $generado->format('d/m/Y H:i') }}</div>
    <p>En los tres módulos la pantalla abre en un listado. Desde cada fila se consulta, se edita o se elimina. El formulario de alta solo aparece al pulsar el botón de crear.</p>

    <h2>1. Compra de fincas</h2>
    <ol>
        <li>El listado muestra las compras ya registradas: vendedor, lugar, precio, pagado y pendiente.</li>
        <li>Nueva compra elige una finca del inventario que todavía no tiene compra y registra ubicación, vendedor, precio, escrituración y, si es por pagos, enganche y cuotas sin interés.</li>
        <li>Ver abre la ficha en solo lectura. Editar permite cambiar esos datos, las escrituras, la urbanización, las medidas y el plan.</li>
        <li>Cada escritura lleva número, fecha y metros cuadrados. El área total de la finca es la suma de las escrituras.</li>
        <li>La urbanización se anota por gasto real: calle, agua, energía, técnico, legal, obra u otros. Puede repetirse.</li>
        <li>El costo por metro se calcula sobre los metros cuadrados negociables (los que se lotifican para la venta). Calles, área verde y área técnica no entran a ese costo.</li>
        <li>El plan de pagos se compara con el estado de cuenta. Si no cuadra, se indica en cuántas cuotas se paga el saldo pendiente. Las cuotas que ya tienen abono no se borran.</li>
        <li>Eliminar quita la compra, el plan y los gastos solo si todavía no hay pagos. La finca y sus lotes siguen en el inventario.</li>
    </ol>

    <h2>2. Financiamientos</h2>
    <ol>
        <li>El listado muestra banco, cooperativa, particular u otro, la finca, el capital, el saldo y el vencimiento.</li>
        <li>Nuevo financiamiento pide la finca, el nombre, el monto, la tasa anual (de 5 % a 100 %), el interés, el plazo, la forma de pago y la cuota. El interés, si se deja vacío, se calcula sobre el monto por el plazo en años.</li>
        <li>El préstamo no aumenta el costo del lote. Los pagos salen del dinero de la operación.</li>
        <li>Ver consulta el préstamo. Editar cambia las condiciones mientras haga falta. Eliminar solo procede si no hay pagos.</li>
        <li>Si el vencimiento está a 15 días o menos y queda saldo, el listado lo marca.</li>
        <li>Los reportes son el estado de cuenta de un financiamiento y el listado general, en PDF y en Excel.</li>
    </ol>

    <h2>3. Comisionistas</h2>
    <ol>
        <li>Primero se registra la persona: nombre, teléfono, dirección y DPI. En la misma pantalla de la comisión se puede crear una persona nueva y queda seleccionada para esa venta.</li>
        <li>La regla dice si la comisión es un porcentaje o un monto fijo, sobre qué precio se calcula y en qué momento se reconoce.</li>
        <li>Ligar comisión elige la venta del lote, el comisionista y la regla. El monto se calcula; se puede dejar un monto manual si no hay regla.</li>
        <li>Los pagos se registran por fecha y cantidad hasta cubrir la comisión. Cada pago puede imprimir su recibo.</li>
        <li>Ver abre el estado de cuenta. Editar corrige la persona o la regla. Eliminar una persona solo procede si no tiene comisiones. Una comisión con pagos no se borra.</li>
        <li>Los reportes son el listado de personas, el listado de comisiones y el estado de cuenta de cada una.</li>
    </ol>

    <div class="nota">Los tres módulos tienen permisos propios. Quien solo puede ver, consulta. Crear, editar y eliminar se otorgan aparte en Usuarios. El administrador ya los tiene.</div>
</body>
</html>
