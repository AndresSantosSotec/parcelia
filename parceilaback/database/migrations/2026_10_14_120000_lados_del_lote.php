<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            $table->decimal('lado_norte', 10, 2)->nullable()->after('fondo_metros');
            $table->decimal('lado_sur', 10, 2)->nullable()->after('lado_norte');
            $table->decimal('lado_este', 10, 2)->nullable()->after('lado_sur');
            $table->decimal('lado_oeste', 10, 2)->nullable()->after('lado_este');
        });
    }

    public function down(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            $table->dropColumn(['lado_norte', 'lado_sur', 'lado_este', 'lado_oeste']);
        });
    }
};
