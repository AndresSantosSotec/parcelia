<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financistas', function (Blueprint $table) {
            $table->string('dpi', 30)->nullable()->after('nombre');
            $table->string('esquema', 40)->nullable()->after('tipo');
        });

        Schema::table('financista_pagos', function (Blueprint $table) {
            $table->string('numero_recibo', 40)->nullable()->after('fecha');
            $table->string('metodo_pago', 30)->nullable()->after('numero_recibo');
            $table->string('concepto')->nullable()->after('metodo_pago');
            $table->unsignedBigInteger('movimiento_caja_id')->nullable()->after('user_id');
        });

        Schema::table('comision_pagos', function (Blueprint $table) {
            $table->unsignedBigInteger('movimiento_caja_id')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('comision_pagos', function (Blueprint $table) {
            $table->dropColumn('movimiento_caja_id');
        });

        Schema::table('financista_pagos', function (Blueprint $table) {
            $table->dropColumn(['numero_recibo', 'metodo_pago', 'concepto', 'movimiento_caja_id']);
        });

        Schema::table('financistas', function (Blueprint $table) {
            $table->dropColumn(['dpi', 'esquema']);
        });
    }
};
