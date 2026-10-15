<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            $table->string('periodo_pago', 20)->default('mensual')->after('plazo_meses');
        });
    }

    public function down(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            $table->dropColumn('periodo_pago');
        });
    }
};
