<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            if (!Schema::hasColumn('negociaciones', 'parametrizacion_mora_id')) {
                $table->foreignId('parametrizacion_mora_id')
                    ->nullable()
                    ->after('tasa_interes_id')
                    ->constrained('parametrizacion_mora_inmobiliaria')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            if (Schema::hasColumn('negociaciones', 'parametrizacion_mora_id')) {
                $table->dropConstrainedForeignId('parametrizacion_mora_id');
            }
        });
    }
};
