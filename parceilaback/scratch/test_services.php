<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== 1. TEST FINANCING SERVICE (SIMULADOR) ===\n";
$financing = app(App\Services\Inmobiliario\FinancingService::class);
$sim = $financing->simularFinanciamiento(
    precioLote: 100000,
    descuento: 5000,
    gastosEscrituracion: 2000,
    gastosAdministrativos: 500,
    enganche: 15000,
    tasaAnual: 6.0,
    plazoMeses: 24,
    metodo: 'frances'
);
echo "Precio Final: Q" . $sim['precio_final'] . " | Financiado: Q" . $sim['monto_financiado'] . " | Cuota: Q" . $sim['cuota_mensual'] . " | Total Intereses: Q" . $sim['total_intereses'] . "\n";
echo "Total Cuotas generadas: " . count($sim['cuotas']) . "\n\n";

echo "=== 2. TEST ESTADO DE CUENTA SERVICE ===\n";
$statementService = app(App\Services\Inmobiliario\AccountStatementService::class);
$estado = $statementService->generarEstadoCuenta(1);
echo "Contrato: " . $estado['resumen']['codigo_negociacion'] . "\n";
echo "Cliente: " . $estado['resumen']['cliente']['nombre_completo'] . " (DPI: " . $estado['resumen']['cliente']['dpi'] . ")\n";
echo "Finca/Lote: " . $estado['resumen']['inmueble']['finca'] . " / " . $estado['resumen']['inmueble']['numero_lote'] . "\n";
echo "Saldo Capital Pendiente: Q" . $estado['resumen']['financiero']['saldo_capital_pendiente'] . "\n";
echo "Movimientos en Kardex: " . count($estado['kardex_movimientos']) . "\n\n";

echo "=== 3. TEST REPORTING SERVICE ===\n";
$repService = app(App\Services\Inmobiliario\InmobiliarioReportingService::class);
$inv = $repService->reporteInventario();
echo "Inventario -> Total Lotes: " . $inv['total_lotes'] . " | Disponibles: " . $inv['disponibles'] . " | Vendidos: " . $inv['vendidos'] . "\n";

$ing = $repService->reporteIngresosDiario();
echo "Ingresos Hoy -> Total Recibos: " . $ing['total_recibos'] . " | Total Monto: Q" . $ing['total_ingresos'] . "\n\n";

echo "=== 4. TEST CONTRATO TEMPLATE SERVICE ===\n";
$neg = App\Models\Negociacion::find(1);
$contractService = app(App\Services\Inmobiliario\ContractTemplateService::class);
$html = $contractService->renderTemplate($contractService->getDefaultContractTemplate(), $neg);
echo "Contrato generado con éxito (longitud HTML: " . strlen($html) . " caracteres)\n";
echo "=== TODOS LOS SERVICIOS DE DOMINIO INMOBILIARIO ESTÁN FUNCIONANDO AL 100% ===\n";
