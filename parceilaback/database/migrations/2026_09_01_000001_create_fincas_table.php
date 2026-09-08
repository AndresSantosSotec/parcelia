<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fincas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('codigo')->unique();
            $table->string('ubicacion')->nullable();
            $table->string('municipio')->default('Guatemala');
            $table->string('departamento')->default('Guatemala');
            $table->decimal('area_total_m2', 14, 2)->default(0);
            $table->string('numero_finca')->nullable();
            $table->string('folio')->nullable();
            $table->string('libro')->nullable();
            $table->text('descripcion')->nullable();
            $table->string('plano_url')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fincas');
    }
};
