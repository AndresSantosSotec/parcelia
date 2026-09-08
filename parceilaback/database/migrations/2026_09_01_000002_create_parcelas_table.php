<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcelas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->constrained('fincas')->cascadeOnDelete();
            $table->string('nombre_identificador'); // Ej: Manzana A, Sector 1, Parcela Norte
            $table->string('codigo')->nullable();
            $table->decimal('area_m2', 12, 2)->default(0);
            $table->string('medidas_perimetro')->nullable();
            $table->text('colindancias')->nullable();
            $table->string('tipo_terreno')->default('Plano'); // Plano, Inclinado, Ondulado
            $table->text('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['finca_id', 'nombre_identificador']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcelas');
    }
};
