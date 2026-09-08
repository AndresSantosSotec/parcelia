<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lote_servicios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lote_id')->constrained('lotes')->cascadeOnDelete();
            $table->string('nombre_servicio'); // Agua, Luz Eléctrica, Drenajes, Acceso Pavimentado
            $table->enum('estado', ['disponible', 'en_proceso', 'no_disponible'])->default('disponible');
            $table->decimal('costo_adicional', 10, 2)->default(0);
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lote_servicios');
    }
};
