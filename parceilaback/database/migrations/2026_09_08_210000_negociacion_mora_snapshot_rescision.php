<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            if (!Schema::hasColumn('negociaciones', 'mora_dias_gracia_snapshot')) {
                $table->unsignedInteger('mora_dias_gracia_snapshot')->nullable()->after('mora_monto_fijo_diario_snapshot');
            }
            if (!Schema::hasColumn('negociaciones', 'motivo_rescision')) {
                $table->string('motivo_rescision', 500)->nullable()->after('observaciones');
            }
        });
    }

    public function down(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            if (Schema::hasColumn('negociaciones', 'mora_dias_gracia_snapshot')) {
                $table->dropColumn('mora_dias_gracia_snapshot');
            }
            if (Schema::hasColumn('negociaciones', 'motivo_rescision')) {
                $table->dropColumn('motivo_rescision');
            }
        });
    }
};
