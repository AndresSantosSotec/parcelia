<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fincas', function (Blueprint $table) {
            $table->decimal('area_vialidades_m2', 14, 2)->nullable()->after('area_no_negociable_m2');
            $table->decimal('area_verde_m2', 14, 2)->nullable()->after('area_vialidades_m2');
            $table->decimal('area_tecnica_m2', 14, 2)->nullable()->after('area_verde_m2');
        });

        Schema::create('finca_compra_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->constrained('fincas')->cascadeOnDelete();
            $table->foreignId('cuota_id')->nullable()->constrained('finca_cuotas_compra')->nullOnDelete();
            $table->date('fecha');
            $table->decimal('monto', 14, 2);
            $table->string('origen', 20);
            $table->string('numero_recibo', 40);
            $table->foreignId('movimiento_caja_id')->nullable()->constrained('movimiento_cajas')->nullOnDelete();
            $table->foreignId('boveda_movimiento_id')->nullable()->constrained('boveda_movimientos')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finca_compra_pagos');
        Schema::table('fincas', function (Blueprint $table) {
            $table->dropColumn(['area_vialidades_m2', 'area_verde_m2', 'area_tecnica_m2']);
        });
    }
};
