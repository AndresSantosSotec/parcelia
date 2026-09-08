<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalogo_servicios_inmobiliarios', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->unique();
            $table->string('nombre');
            $table->decimal('costo_default', 12, 2)->default(0);
            $table->boolean('activo')->default(true);
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        Schema::create('parametrizacion_mora_inmobiliaria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sucursal_id')->nullable()->constrained('sucursales')->nullOnDelete();
            $table->string('nombre')->default('Mora terrenos');
            $table->enum('tipo_calculo', ['porcentaje_capital_vencido', 'monto_fijo_diario']);
            $table->decimal('porcentaje_diario', 8, 4)->default(0);
            $table->decimal('monto_fijo_diario', 12, 2)->default(0);
            $table->unsignedInteger('dias_gracia')->default(0);
            $table->boolean('activo')->default(true);
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        Schema::table('lote_servicios', function (Blueprint $table) {
            $table->foreignId('catalogo_servicio_id')->nullable()->after('lote_id')
                ->constrained('catalogo_servicios_inmobiliarios')->nullOnDelete();
        });

        Schema::table('lotes', function (Blueprint $table) {
            $table->decimal('precio_base', 14, 2)->nullable()->after('precio_m2');
            $table->decimal('plusvalia_servicios', 14, 2)->default(0)->after('precio_base');
            $table->unique(['parcela_id', 'numero_lote'], 'lotes_parcela_numero_unique');
        });

        Schema::table('negociaciones', function (Blueprint $table) {
            $table->string('sistema_amortizacion', 30)->default('frances')->after('tasa_interes_anual');
            $table->string('politica_abono_extra', 30)->default('reducir_plazo')->after('sistema_amortizacion');
            $table->unsignedBigInteger('tasa_interes_id')->nullable()->after('politica_abono_extra');
            $table->string('tipo_mora_aplicada', 40)->nullable()->after('tasa_interes_id');
            $table->decimal('mora_porcentaje_diario_snapshot', 8, 4)->nullable()->after('tipo_mora_aplicada');
            $table->decimal('mora_monto_fijo_diario_snapshot', 12, 2)->nullable()->after('mora_porcentaje_diario_snapshot');
            $table->string('origen_fondos', 255)->nullable()->after('observaciones');
            $table->boolean('ive_efectivo_reportable')->default(false)->after('origen_fondos');
        });

        Schema::table('plan_pagos_terrenos', function (Blueprint $table) {
            $table->decimal('saldo_inicial', 14, 2)->default(0)->after('fecha_vencimiento');
            $table->decimal('otros_cargos', 12, 2)->default(0)->after('cuota_interes');
            $table->decimal('mora_proyectada', 12, 2)->default(0)->after('mora_pagada');
        });

        Schema::table('pago_terrenos', function (Blueprint $table) {
            $table->string('origen_fondos', 255)->nullable()->after('observaciones');
            $table->boolean('ive_efectivo_reportable')->default(false)->after('origen_fondos');
            $table->foreignId('recibo_id')->nullable()->after('numero_recibo')->constrained('recibos')->nullOnDelete();
        });

        $now = now();
        DB::table('catalogo_servicios_inmobiliarios')->insert([
            ['codigo' => 'agua', 'nombre' => 'Agua potable', 'costo_default' => 0, 'activo' => 1, 'descripcion' => 'Servicio de agua', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'energia', 'nombre' => 'Energía eléctrica', 'costo_default' => 0, 'activo' => 1, 'descripcion' => 'Servicio eléctrico', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'drenaje', 'nombre' => 'Drenajes', 'costo_default' => 0, 'activo' => 1, 'descripcion' => 'Sistema de drenajes', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'acceso', 'nombre' => 'Acceso / calle', 'costo_default' => 0, 'activo' => 1, 'descripcion' => 'Acceso vehicular o pavimentado', 'created_at' => $now, 'updated_at' => $now],
        ]);

        DB::table('parametrizacion_mora_inmobiliaria')->insert([
            'nombre' => 'Mora sobre capital vencido',
            'tipo_calculo' => 'porcentaje_capital_vencido',
            'porcentaje_diario' => 0.05,
            'monto_fijo_diario' => 0,
            'dias_gracia' => 0,
            'activo' => 1,
            'descripcion' => 'Porcentaje diario sobre capital vencido de la cuota. Configurable junto a monto fijo por día.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        Schema::table('pago_terrenos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recibo_id');
            $table->dropColumn(['origen_fondos', 'ive_efectivo_reportable']);
        });
        Schema::table('plan_pagos_terrenos', function (Blueprint $table) {
            $table->dropColumn(['saldo_inicial', 'otros_cargos', 'mora_proyectada']);
        });
        Schema::table('negociaciones', function (Blueprint $table) {
            $table->dropColumn([
                'sistema_amortizacion',
                'politica_abono_extra',
                'tasa_interes_id',
                'tipo_mora_aplicada',
                'mora_porcentaje_diario_snapshot',
                'mora_monto_fijo_diario_snapshot',
                'origen_fondos',
                'ive_efectivo_reportable',
            ]);
        });
        Schema::table('lotes', function (Blueprint $table) {
            $table->dropUnique('lotes_parcela_numero_unique');
            $table->dropColumn(['precio_base', 'plusvalia_servicios']);
        });
        Schema::table('lote_servicios', function (Blueprint $table) {
            $table->dropConstrainedForeignId('catalogo_servicio_id');
        });
        Schema::dropIfExists('parametrizacion_mora_inmobiliaria');
        Schema::dropIfExists('catalogo_servicios_inmobiliarios');
    }
};
