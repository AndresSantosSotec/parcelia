<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            $table->decimal('latitud', 10, 7)->nullable()->after('observaciones');
            $table->decimal('longitud', 10, 7)->nullable()->after('latitud');
            $table->decimal('altitud', 8, 2)->nullable()->after('longitud');
            $table->decimal('precision_metros', 8, 2)->nullable()->after('altitud');
            $table->string('referencia_geo', 255)->nullable()->after('precision_metros');
        });
    }

    public function down(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            $table->dropColumn(['latitud', 'longitud', 'altitud', 'precision_metros', 'referencia_geo']);
        });
    }
};
