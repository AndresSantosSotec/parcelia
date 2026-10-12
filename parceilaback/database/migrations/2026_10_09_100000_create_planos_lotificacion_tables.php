<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finca_planos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_id')->unique()->constrained('fincas')->cascadeOnDelete();
            $table->string('imagen_path')->nullable();
            $table->string('imagen_nombre')->nullable();
            $table->unsignedInteger('ancho')->default(1000);
            $table->unsignedInteger('alto')->default(700);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('lote_geometrias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finca_plano_id')->constrained('finca_planos')->cascadeOnDelete();
            $table->foreignId('lote_id')->unique()->constrained('lotes')->cascadeOnDelete();
            $table->json('puntos');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lote_geometrias');
        Schema::dropIfExists('finca_planos');
    }
};
