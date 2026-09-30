<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fincas', function (Blueprint $table) {
            $table->string('vendedor_nombre')->nullable()->after('descripcion');
            $table->string('vendedor_dpi', 30)->nullable()->after('vendedor_nombre');
            $table->string('referencia')->nullable()->after('vendedor_dpi');
            $table->decimal('precio_compra', 14, 2)->default(0)->after('referencia');
            $table->decimal('gastos_escrituracion', 14, 2)->default(0)->after('precio_compra');
            $table->string('tipo_compra', 20)->default('contado')->after('gastos_escrituracion');
            $table->decimal('enganche', 14, 2)->default(0)->after('tipo_compra');
            $table->unsignedInteger('numero_cuotas')->default(0)->after('enganche');
            $table->string('frecuencia_pago', 20)->default('no_aplica')->after('numero_cuotas');
            $table->date('fecha_inicio_pagos')->nullable()->after('frecuencia_pago');
            $table->decimal('cuota_compra', 14, 2)->default(0)->after('fecha_inicio_pagos');
            $table->decimal('porcentaje_utilidad', 8, 2)->default(30)->after('cuota_compra');
            $table->decimal('area_negociable_m2', 14, 2)->nullable()->after('porcentaje_utilidad');
            $table->decimal('area_no_negociable_m2', 14, 2)->nullable()->after('area_negociable_m2');
        });

        Schema::table('lotes', function (Blueprint $table) {
            $table->decimal('costo_asignado', 14, 2)->nullable()->after('precio_venta');
            $table->decimal('precio_sugerido', 14, 2)->nullable()->after('costo_asignado');
        });

        Schema::create('finca_escrituras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->constrained('fincas')->cascadeOnDelete();
            $table->string('numero_escritura', 80);
            $table->date('fecha_escritura')->nullable();
            $table->decimal('area_m2', 14, 2);
            $table->timestamps();
        });

        Schema::create('finca_cuotas_compra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->constrained('fincas')->cascadeOnDelete();
            $table->unsignedInteger('numero_cuota');
            $table->date('fecha_vencimiento');
            $table->decimal('monto', 14, 2);
            $table->decimal('monto_pagado', 14, 2)->default(0);
            $table->string('estado', 20)->default('pendiente');
            $table->timestamps();
        });

        Schema::create('finca_gastos_urbanizacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->constrained('fincas')->cascadeOnDelete();
            $table->string('categoria', 40);
            $table->string('concepto');
            $table->decimal('monto', 14, 2);
            $table->date('fecha')->nullable();
            $table->timestamps();
        });

        Schema::create('financistas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->constrained('fincas')->cascadeOnDelete();
            $table->string('tipo', 30);
            $table->string('nombre');
            $table->string('destino', 30);
            $table->decimal('monto', 14, 2);
            $table->decimal('tasa_anual', 8, 2)->nullable();
            $table->decimal('interes_total', 14, 2)->default(0);
            $table->unsignedInteger('plazo')->nullable();
            $table->string('frecuencia', 20)->default('mensual');
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->decimal('cuota', 14, 2)->default(0);
            $table->boolean('capital_al_vencimiento')->default(false);
            $table->string('estado', 20)->default('activo');
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });

        Schema::create('financista_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('financista_id')->constrained('financistas')->cascadeOnDelete();
            $table->date('fecha');
            $table->decimal('monto_capital', 14, 2)->default(0);
            $table->decimal('monto_interes', 14, 2)->default(0);
            $table->decimal('monto_mora', 14, 2)->default(0);
            $table->decimal('descuento_interes', 14, 2)->default(0);
            $table->string('referencia')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('comisionistas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('telefono', 40)->nullable();
            $table->string('direccion')->nullable();
            $table->string('dpi', 30)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('comision_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comisionista_id')->constrained('comisionistas')->cascadeOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes')->nullOnDelete();
            $table->foreignId('negociacion_id')->nullable()->constrained('negociaciones')->nullOnDelete();
            $table->string('descripcion')->nullable();
            $table->decimal('monto_venta', 14, 2)->default(0);
            $table->decimal('monto_comision', 14, 2);
            $table->string('estado', 20)->default('pendiente');
            $table->timestamps();
        });

        Schema::create('comision_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comision_venta_id')->constrained('comision_ventas')->cascadeOnDelete();
            $table->date('fecha');
            $table->decimal('monto', 14, 2);
            $table->string('referencia')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comision_pagos');
        Schema::dropIfExists('comision_ventas');
        Schema::dropIfExists('comisionistas');
        Schema::dropIfExists('financista_pagos');
        Schema::dropIfExists('financistas');
        Schema::dropIfExists('finca_gastos_urbanizacion');
        Schema::dropIfExists('finca_cuotas_compra');
        Schema::dropIfExists('finca_escrituras');

        Schema::table('lotes', function (Blueprint $table) {
            $table->dropColumn(['costo_asignado', 'precio_sugerido']);
        });

        Schema::table('fincas', function (Blueprint $table) {
            $table->dropColumn([
                'vendedor_nombre',
                'vendedor_dpi',
                'referencia',
                'precio_compra',
                'gastos_escrituracion',
                'tipo_compra',
                'enganche',
                'numero_cuotas',
                'frecuencia_pago',
                'fecha_inicio_pagos',
                'cuota_compra',
                'porcentaje_utilidad',
                'area_negociable_m2',
                'area_no_negociable_m2',
            ]);
        });
    }
};
