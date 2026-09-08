<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Sucursal;
use App\Models\Cliente;
use App\Models\Finca;
use App\Models\Parcela;
use App\Models\Lote;
use App\Models\LoteServicio;
use App\Models\TasaInteres;
use App\Models\Negociacion;
use App\Models\PlanPagoTerreno;
use App\Models\PagoTerreno;
use App\Models\CajaAperturaCierre;
use App\Models\MovimientoCaja;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ParceliaInmobiliariaSeeder extends Seeder
{
    public function run(): void
    {
        // 0. CONFIGURACIÓN DE EMPRESA Y MARCA (TERRACLOUD SAAS)
        \App\Helpers\EmpresaConfigHelper::setConfig(\App\Helpers\EmpresaConfigHelper::DEFAULT_CONFIG);

        // 1. SUCURSALES
        $sucursal1 = Sucursal::firstOrCreate(
            ['codigo' => 'SUC-01'],
            [
                'nombre' => 'Oficina Central TerraCloud',
                'direccion' => 'Avenida Reforma 12-40, Zona 10, Edificio Reforma Montúfar',
                'telefono' => '2334-8900',
                'email' => 'ventas@terracloud.gt',
                'ciudad' => 'Guatemala',
                'departamento' => 'Guatemala',
                'activa' => true,
            ]
        );

        $sucursal2 = Sucursal::firstOrCreate(
            ['codigo' => 'SUC-02'],
            [
                'nombre' => 'Sala de Ventas Fraijanes',
                'direccion' => 'Km 34.5 Carretera a El Salvador, Plaza Fraijanes',
                'telefono' => '6645-1234',
                'email' => 'fraijanes@terracloud.gt',
                'ciudad' => 'Fraijanes',
                'departamento' => 'Guatemala',
                'activa' => true,
            ]
        );

        // 2. USUARIOS
        $admin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Administrador Parcelia',
                'email' => 'admin@parcelia.gt',
                'password' => Hash::make('admin123'),
                'rol' => 'administrador',
                'sucursal_id' => $sucursal1->id,
                'activo' => true,
            ]
        );

        $asesor = User::firstOrCreate(
            ['username' => 'asesor1'],
            [
                'name' => 'Lic. Fernando Morales',
                'email' => 'asesor@parcelia.gt',
                'password' => Hash::make('admin123'),
                'rol' => 'vendedor',
                'sucursal_id' => $sucursal1->id,
                'activo' => true,
            ]
        );

        $cajero = User::firstOrCreate(
            ['username' => 'cajero1'],
            [
                'name' => 'Sofía Castillo',
                'email' => 'caja@parcelia.gt',
                'password' => Hash::make('admin123'),
                'rol' => 'cajero',
                'sucursal_id' => $sucursal1->id,
                'activo' => true,
            ]
        );

        // 3. CAJA ABIERTA
        $caja = CajaAperturaCierre::create([
            'user_id' => $admin->id,
            'sucursal_id' => $sucursal1->id,
            'fecha_apertura' => Carbon::now()->toDateString(),
            'hora_apertura' => Carbon::now()->subHours(4)->format('H:i:s'),
            'saldo_inicial' => 5000.00,
            'estado' => 'abierta',
        ]);

        // 4. COMPRADORES
        $cliente1 = Cliente::firstOrCreate(
            ['dpi' => '2987123450101'],
            [
                'codigo_cliente' => 'CLI-001',
                'nombres' => 'Carlos Roberto',
                'apellidos' => 'Mendoza Gómez',
                'fecha_nacimiento' => '1985-05-15',
                'genero' => 'masculino',
                'nit' => '8492019-2',
                'telefono' => '5544-3322',
                'email' => 'carlos.mendoza@email.com',
                'direccion' => '12 Calle 4-55 Zona 1, Ciudad de Guatemala',
                'estado' => 'activo',
                'tipo_cliente' => 'vip',
                'sucursal' => $sucursal1->nombre,
            ]
        );

        $cliente2 = Cliente::firstOrCreate(
            ['dpi' => '1890456780101'],
            [
                'codigo_cliente' => 'CLI-002',
                'nombres' => 'María Elena',
                'apellidos' => 'García Morales',
                'fecha_nacimiento' => '1990-08-20',
                'genero' => 'femenino',
                'nit' => '9283741-5',
                'telefono' => '5877-6655',
                'email' => 'maria.garcia@email.com',
                'direccion' => '8a Avenida 14-20 Zona 11, Mariscal',
                'estado' => 'activo',
                'tipo_cliente' => 'regular',
                'sucursal' => $sucursal1->nombre,
            ]
        );

        $cliente3 = Cliente::firstOrCreate(
            ['dpi' => '3120987650101'],
            [
                'codigo_cliente' => 'CLI-003',
                'nombres' => 'José Fernando',
                'apellidos' => 'López Castillo',
                'fecha_nacimiento' => '1982-11-03',
                'genero' => 'masculino',
                'nit' => '6543210-9',
                'telefono' => '4411-8899',
                'email' => 'jose.lopez@email.com',
                'direccion' => 'Colonia Las Américas, Villa Nueva',
                'estado' => 'activo',
                'tipo_cliente' => 'regular',
                'sucursal' => $sucursal1->nombre,
            ]
        );

        // 5. TASAS DE INTERÉS
        TasaInteres::firstOrCreate(
            ['nombre' => 'Tasa Promoción 0% (Contado o Corto Plazo)'],
            [
                'porcentaje_anual' => 0.00,
                'tipo_calculo' => 'fijo',
                'periodicidad' => 'mensual',
                'activo' => true,
                'descripcion' => 'Financiamiento directo sin intereses en plazos hasta 12 meses.'
            ]
        );

        TasaInteres::firstOrCreate(
            ['nombre' => 'Tasa Estándar 6% Anual (Sobre Saldos)'],
            [
                'porcentaje_anual' => 6.00,
                'tipo_calculo' => 'sobre_saldos',
                'periodicidad' => 'mensual',
                'activo' => true,
                'descripcion' => 'Tasa preferencial para financiamientos de 24 a 60 meses.'
            ]
        );

        TasaInteres::firstOrCreate(
            ['nombre' => 'Tasa Directa 8% Anual (Largo Plazo)'],
            [
                'porcentaje_anual' => 8.00,
                'tipo_calculo' => 'sobre_saldos',
                'periodicidad' => 'mensual',
                'activo' => true,
                'descripcion' => 'Tasa estándar para financiamientos de 72 a 120 meses.'
            ]
        );

        // 6. FINCAS
        $finca1 = Finca::firstOrCreate(
            ['codigo' => 'FIN-LAUR'],
            [
                'nombre' => 'Finca Los Laureles',
                'ubicacion' => 'Km 34.5 Carretera a El Salvador, Fraijanes',
                'municipio' => 'Fraijanes',
                'departamento' => 'Guatemala',
                'area_total_m2' => 125000.00,
                'numero_finca' => '1420',
                'folio' => '20',
                'libro' => '45E de Guatemala',
                'descripcion' => 'Proyecto campestre exclusivo con vistas panorámicas, garita de seguridad y casa club.',
                'activo' => true,
            ]
        );

        $finca2 = Finca::firstOrCreate(
            ['codigo' => 'FIN-BVIST'],
            [
                'nombre' => 'Residenciales Buena Vista',
                'ubicacion' => 'Km 22 Carretera al Pacífico, Bárcenas',
                'municipio' => 'Villa Nueva',
                'departamento' => 'Guatemala',
                'area_total_m2' => 85000.00,
                'numero_finca' => '3500',
                'folio' => '112',
                'libro' => '89E de Guatemala',
                'descripcion' => 'Urbanización moderna con servicios subterráneos, ciclovía y canchas deportivas.',
                'activo' => true,
            ]
        );

        // 7. PARCELAS
        $parc1 = Parcela::firstOrCreate(
            ['finca_id' => $finca1->id, 'nombre_identificador' => 'Manzana A - Sector Los Pinos'],
            [
                'codigo' => 'MZA-A',
                'area_m2' => 25000.00,
                'medidas_perimetro' => 'Norte: 250m, Sur: 250m, Este: 100m, Oeste: 100m',
                'colindancias' => 'N: Calle Principal, S: Manzana B, E: Bosque Comunal, O: Garita',
                'tipo_terreno' => 'Plano',
                'descripcion' => 'Lotes residenciales frente a reserva ecológica',
                'activo' => true,
            ]
        );

        $parc2 = Parcela::firstOrCreate(
            ['finca_id' => $finca1->id, 'nombre_identificador' => 'Manzana B - Sector El Mirador'],
            [
                'codigo' => 'MZA-B',
                'area_m2' => 30000.00,
                'medidas_perimetro' => 'Norte: 300m, Sur: 300m, Este: 100m, Oeste: 100m',
                'colindancias' => 'N: Manzana A, S: Límite Sur Finca, E: Mirador, O: Calle 2',
                'tipo_terreno' => 'Ondulado Leve',
                'descripcion' => 'Lotes premium con vista directa al valle',
                'activo' => true,
            ]
        );

        $parc3 = Parcela::firstOrCreate(
            ['finca_id' => $finca2->id, 'nombre_identificador' => 'Sector 1 - Boulevard Central'],
            [
                'codigo' => 'SEC-01',
                'area_m2' => 40000.00,
                'medidas_perimetro' => 'Norte: 200m, Sur: 200m, Este: 200m, Oeste: 200m',
                'colindancias' => 'N: Boulevard, S: Sector 2, E: Área Comercial, O: Pozo de Agua',
                'tipo_terreno' => 'Plano',
                'descripcion' => 'Lotes de vocación mixta comercial y residencial',
                'activo' => true,
            ]
        );

        // 8. LOTES
        $lote1 = Lote::firstOrCreate(
            ['codigo_unico' => 'FIN-LAUR-MZA-A-L01'],
            [
                'parcela_id' => $parc1->id,
                'numero_lote' => 'L-01',
                'area_m2' => 200.00,
                'frente_metros' => 10.00,
                'fondo_metros' => 20.00,
                'colindancias' => 'N: Calle Los Pinos, S: Lote 12, E: Lote 02, O: Límite Manzana',
                'tipo_terreno' => 'Residencial',
                'precio_m2' => 475.00,
                'precio_venta' => 95000.00,
                'estado' => 'disponible',
                'observaciones' => 'Excelente ubicación junto a la garita principal'
            ]
        );

        $lote2 = Lote::firstOrCreate(
            ['codigo_unico' => 'FIN-LAUR-MZA-A-L02'],
            [
                'parcela_id' => $parc1->id,
                'numero_lote' => 'L-02',
                'area_m2' => 240.00,
                'frente_metros' => 12.00,
                'fondo_metros' => 20.00,
                'colindancias' => 'N: Calle Los Pinos, S: Lote 11, E: Lote 03, O: Lote 01',
                'tipo_terreno' => 'Residencial Esquina',
                'precio_m2' => 500.00,
                'precio_venta' => 120000.00,
                'estado' => 'disponible',
                'observaciones' => 'Lote de esquina de alta plusvalía'
            ]
        );

        $lote3 = Lote::firstOrCreate(
            ['codigo_unico' => 'FIN-LAUR-MZA-A-L03'],
            [
                'parcela_id' => $parc1->id,
                'numero_lote' => 'L-03',
                'area_m2' => 200.00,
                'frente_metros' => 10.00,
                'fondo_metros' => 20.00,
                'colindancias' => 'N: Calle Los Pinos, S: Lote 10, E: Lote 04, O: Lote 02',
                'tipo_terreno' => 'Residencial',
                'precio_m2' => 450.00,
                'precio_venta' => 90000.00,
                'estado' => 'vendido',
                'observaciones' => 'Vendido con financiamiento propio a 24 meses'
            ]
        );

        $lote4 = Lote::firstOrCreate(
            ['codigo_unico' => 'FIN-LAUR-MZA-B-L15'],
            [
                'parcela_id' => $parc2->id,
                'numero_lote' => 'L-15',
                'area_m2' => 350.00,
                'frente_metros' => 14.00,
                'fondo_metros' => 25.00,
                'colindancias' => 'N: Calle Mirador, S: Reserva Natural, E: Lote 16, O: Lote 14',
                'tipo_terreno' => 'Campestre Mirador',
                'precio_m2' => 550.00,
                'precio_venta' => 192500.00,
                'estado' => 'reservado',
                'observaciones' => 'Reserva activa pendiente de completar enganche'
            ]
        );

        $lote5 = Lote::firstOrCreate(
            ['codigo_unico' => 'FIN-BVIST-SEC01-L08'],
            [
                'parcela_id' => $parc3->id,
                'numero_lote' => 'L-08',
                'area_m2' => 300.00,
                'frente_metros' => 12.00,
                'fondo_metros' => 25.00,
                'colindancias' => 'N: Boulevard Central, S: Lote 09, E: Área Verde, O: Lote 07',
                'tipo_terreno' => 'Comercial/Residencial',
                'precio_m2' => 600.00,
                'precio_venta' => 180000.00,
                'estado' => 'disponible',
                'observaciones' => 'Lote frente al boulevard principal ideal para comercio o vivienda'
            ]
        );

        // Servicios para lotes
        foreach ([$lote1, $lote2, $lote3, $lote4, $lote5] as $l) {
            LoteServicio::firstOrCreate(
                ['lote_id' => $l->id, 'nombre_servicio' => 'Agua Potable'],
                ['estado' => 'disponible', 'costo_adicional' => 0]
            );
            LoteServicio::firstOrCreate(
                ['lote_id' => $l->id, 'nombre_servicio' => 'Energía Eléctrica'],
                ['estado' => 'disponible', 'costo_adicional' => 0]
            );
            LoteServicio::firstOrCreate(
                ['lote_id' => $l->id, 'nombre_servicio' => 'Drenajes Sanitarios'],
                ['estado' => 'disponible', 'costo_adicional' => 0]
            );
        }

        // 9. NEGOCIACIÓN ACTIVA DE EJEMPLO
        $negociacion1 = Negociacion::firstOrCreate(
            ['codigo_negociacion' => 'NEG-2026-0001'],
            [
                'cliente_id' => $cliente1->id,
                'lote_id' => $lote3->id,
                'user_id' => $asesor->id,
                'sucursal_id' => $sucursal1->id,
                'tipo_negociacion' => 'credito',
                'precio_original' => 90000.00,
                'descuento' => 2000.00,
                'gastos_escrituracion' => 3500.00,
                'gastos_administrativos' => 0.00,
                'precio_final' => 91500.00,
                'enganche_pactado' => 15000.00,
                'enganche_pagado' => 15000.00,
                'monto_financiado' => 76500.00,
                'tasa_interes_anual' => 6.00,
                'plazo_meses' => 24,
                'cuota_mensual' => 3389.25,
                'total_intereses_proyectados' => 4842.00,
                'total_a_pagar' => 96342.00,
                'total_capital_pagado' => 21250.00,
                'total_interes_pagado' => 750.00,
                'total_mora_pagada' => 0.00,
                'saldo_capital_pendiente' => 70250.00,
                'cuotas_pagadas' => 2,
                'cuotas_pendientes' => 22,
                'dias_mora_actual' => 0,
                'fecha_negociacion' => Carbon::now()->subMonths(2)->format('Y-m-d'),
                'fecha_primer_pago' => Carbon::now()->subMonths(2)->addMonth()->format('Y-m-d'),
                'fecha_vencimiento_contrato' => Carbon::now()->addMonths(22)->format('Y-m-d'),
                'estado' => 'activa',
                'observaciones' => 'Venta financiada a 24 meses con enganche completo cancelado.'
            ]
        );

        // Plan de Pagos
        $fechaCuota = Carbon::now()->subMonths(2)->addMonth();
        $saldoRestante = 76500.00;
        $tasaMensual = (6.0 / 100) / 12;

        for ($i = 1; $i <= 24; $i++) {
            $interes = round($saldoRestante * $tasaMensual, 2);
            $capital = round(3389.25 - $interes, 2);
            if ($i === 24) $capital = $saldoRestante;
            $saldoRestante = max(0, round($saldoRestante - $capital, 2));

            $esPagada = $i <= 2;

            PlanPagoTerreno::firstOrCreate(
                ['negociacion_id' => $negociacion1->id, 'numero_cuota' => $i],
                [
                    'tipo_cuota' => 'ordinaria',
                    'fecha_vencimiento' => $fechaCuota->format('Y-m-d'),
                    'cuota_capital' => $capital,
                    'cuota_interes' => $interes,
                    'cuota_monto_total' => $capital + $interes,
                    'saldo_capital_restante' => $saldoRestante,
                    'monto_pagado' => $esPagada ? ($capital + $interes) : 0.00,
                    'capital_pagado' => $esPagada ? $capital : 0.00,
                    'interes_pagado' => $esPagada ? $interes : 0.00,
                    'mora_pagada' => 0.00,
                    'fecha_pagado' => $esPagada ? $fechaCuota->format('Y-m-d') : null,
                    'estado' => $esPagada ? 'pagada' : 'pendiente',
                ]
            );

            $fechaCuota->addMonth();
        }

        // 10. PAGOS REALIZADOS
        PagoTerreno::firstOrCreate(
            ['numero_recibo' => 'REC-TER-2026-00001'],
            [
                'negociacion_id' => $negociacion1->id,
                'cliente_id' => $cliente1->id,
                'lote_id' => $lote3->id,
                'caja_apertura_cierre_id' => $caja->id,
                'user_id' => $cajero->id,
                'tipo_pago' => 'enganche',
                'monto_total' => 15000.00,
                'distribucion_capital' => 15000.00,
                'distribucion_interes' => 0.00,
                'distribucion_mora' => 0.00,
                'distribucion_gastos' => 0.00,
                'saldo_anterior' => 91500.00,
                'saldo_posterior' => 76500.00,
                'metodo_pago' => 'transferencia',
                'referencia_bancaria' => 'TRANSF-ENG-9941',
                'fecha_pago' => Carbon::now()->subMonths(2),
                'concepto' => 'Pago de Enganche Completo - Lote FIN-LAUR-MZA-A-L03',
                'observaciones' => 'Transferencia Banco Industrial',
            ]
        );

        PagoTerreno::firstOrCreate(
            ['numero_recibo' => 'REC-TER-2026-00002'],
            [
                'negociacion_id' => $negociacion1->id,
                'cliente_id' => $cliente1->id,
                'lote_id' => $lote3->id,
                'caja_apertura_cierre_id' => $caja->id,
                'user_id' => $cajero->id,
                'tipo_pago' => 'cuota_normal',
                'monto_total' => 3389.25,
                'distribucion_capital' => 3006.75,
                'distribucion_interes' => 382.50,
                'distribucion_mora' => 0.00,
                'distribucion_gastos' => 0.00,
                'saldo_anterior' => 76500.00,
                'saldo_posterior' => 73493.25,
                'metodo_pago' => 'efectivo',
                'fecha_pago' => Carbon::now()->subMonth(),
                'concepto' => 'Pago Cuota 1/24 - Lote FIN-LAUR-MZA-A-L03',
            ]
        );

        // Movimiento en caja
        MovimientoCaja::create([
            'caja_id' => $caja->id,
            'tipo' => 'ingreso_pago',
            'concepto' => 'Ingreso por Enganche de Terreno REC-TER-2026-00001',
            'monto' => 15000.00,
            'user_id' => $cajero->id,
            'estado' => 'aplicado',
        ]);
    }
}
