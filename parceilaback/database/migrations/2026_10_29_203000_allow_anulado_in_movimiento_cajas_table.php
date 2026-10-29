<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('movimiento_cajas')) {
            // Ampliar ENUM para permitir también 'anulado'
            try {
                DB::statement("ALTER TABLE `movimiento_cajas` MODIFY COLUMN `estado` ENUM('pendiente', 'aplicado', 'rechazado', 'anulado') NOT NULL DEFAULT 'aplicado'");
            } catch (\Throwable $e) {
                // Fallback si la BD es SQLite en pruebas
                Schema::table('movimiento_cajas', function (Blueprint $table) {
                    $table->string('estado', 20)->default('aplicado')->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('movimiento_cajas')) {
            try {
                DB::statement("ALTER TABLE `movimiento_cajas` MODIFY COLUMN `estado` ENUM('pendiente', 'aplicado', 'rechazado') NOT NULL DEFAULT 'aplicado'");
            } catch (\Throwable $e) {
                // ignore
            }
        }
    }
};
