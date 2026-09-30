<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finca_escrituras', function (Blueprint $table) {
            $table->string('documento_path')->nullable()->after('area_m2');
            $table->string('documento_nombre')->nullable()->after('documento_path');
        });

        Schema::create('comision_reglas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('tipo', 20);
            $table->string('base', 30)->default('precio_final');
            $table->decimal('valor', 12, 2);
            $table->string('momento', 30)->default('al_contrato');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::table('comision_ventas', function (Blueprint $table) {
            $table->foreignId('regla_id')->nullable()->after('negociacion_id')->constrained('comision_reglas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('comision_ventas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regla_id');
        });
        Schema::dropIfExists('comision_reglas');
        Schema::table('finca_escrituras', function (Blueprint $table) {
            $table->dropColumn(['documento_path', 'documento_nombre']);
        });
    }
};
