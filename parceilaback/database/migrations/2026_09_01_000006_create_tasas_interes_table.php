<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasas_interes_inmobiliarias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre'); // Ej: Tasa Fija 0% Promoción, Tasa Estándar 6% Anual, Tasa Directa 8%
            $table->decimal('porcentaje_anual', 5, 2);
            $table->enum('tipo_calculo', ['fijo', 'sobre_saldos', 'interes_plano'])->default('sobre_saldos');
            $table->enum('periodicidad', ['mensual', 'quincenal', 'anual'])->default('mensual');
            $table->date('vigencia_inicio')->nullable();
            $table->date('vigencia_fin')->nullable();
            $table->boolean('activo')->default(true);
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasas_interes_inmobiliarias');
    }
};
