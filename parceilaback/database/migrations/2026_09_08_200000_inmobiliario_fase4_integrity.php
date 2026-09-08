<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            if (!Schema::hasColumn('lotes', 'negociacion_activa_id')) {
                $table->foreignId('negociacion_activa_id')->nullable()->after('estado')
                    ->constrained('negociaciones')->nullOnDelete();
            }
        });

        Schema::table('lote_imagenes', function (Blueprint $table) {
            if (!Schema::hasColumn('lote_imagenes', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('lote_id')
                    ->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('lote_imagenes', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('pago_terrenos', function (Blueprint $table) {
            if (!Schema::hasColumn('pago_terrenos', 'movimiento_caja_id')) {
                $table->foreignId('movimiento_caja_id')->nullable()->after('caja_apertura_cierre_id')
                    ->constrained('movimiento_cajas')->nullOnDelete();
            }
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            Schema::table('negociaciones', function (Blueprint $table) {
                $table->dropForeign(['cliente_id']);
                $table->foreign('cliente_id')->references('id')->on('clientes')->restrictOnDelete();
            });
            Schema::table('pago_terrenos', function (Blueprint $table) {
                $table->dropForeign(['cliente_id']);
                $table->dropForeign(['negociacion_id']);
                $table->dropForeign(['lote_id']);
                $table->foreign('cliente_id')->references('id')->on('clientes')->restrictOnDelete();
                $table->foreign('negociacion_id')->references('id')->on('negociaciones')->restrictOnDelete();
                $table->foreign('lote_id')->references('id')->on('lotes')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('pago_terrenos', function (Blueprint $table) {
            if (Schema::hasColumn('pago_terrenos', 'movimiento_caja_id')) {
                $table->dropConstrainedForeignId('movimiento_caja_id');
            }
        });
        Schema::table('lote_imagenes', function (Blueprint $table) {
            if (Schema::hasColumn('lote_imagenes', 'user_id')) {
                $table->dropConstrainedForeignId('user_id');
            }
            if (Schema::hasColumn('lote_imagenes', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
        Schema::table('lotes', function (Blueprint $table) {
            if (Schema::hasColumn('lotes', 'negociacion_activa_id')) {
                $table->dropConstrainedForeignId('negociacion_activa_id');
            }
        });
    }
};
