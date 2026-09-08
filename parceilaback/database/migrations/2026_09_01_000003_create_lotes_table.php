<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parcela_id')->constrained('parcelas')->cascadeOnDelete();
            $table->string('numero_lote'); // Ej: Lote 12
            $table->string('codigo_unico')->unique(); // Ej: F1-PA-L12
            $table->decimal('area_m2', 10, 2);
            $table->decimal('frente_metros', 8, 2)->nullable();
            $table->decimal('fondo_metros', 8, 2)->nullable();
            $table->text('colindancias')->nullable(); // Norte, Sur, Este, Oeste
            $table->string('tipo_terreno')->default('Residencial');
            $table->decimal('precio_m2', 12, 2)->default(0);
            $table->decimal('precio_venta', 14, 2);
            $table->enum('estado', [
                'disponible',
                'reservado',
                'en_negociacion',
                'vendido',
                'pagado',
                'cancelado'
            ])->default('disponible');
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parcela_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lotes');
    }
};
