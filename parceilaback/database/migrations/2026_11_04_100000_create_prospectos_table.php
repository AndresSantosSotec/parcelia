<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prospectos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sucursal_id')->nullable()->constrained('sucursales')->nullOnDelete();
            $table->string('nombre_completo', 150);
            $table->string('telefono', 50);
            $table->string('email', 100)->nullable();
            $table->string('dpi', 30)->nullable();
            $table->foreignId('finca_id')->nullable()->constrained('fincas')->nullOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes')->nullOnDelete();
            $table->foreignId('asesor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('estado', ['nuevo', 'contactado', 'visita_agendada', 'negociacion', 'ganado', 'perdido'])->default('nuevo');
            $table->string('origen', 50)->default('otro'); // redes_sociales, whatsapp, recomendado, rotulo_campo, oficina, otro
            $table->decimal('presupuesto_estimado', 14, 2)->nullable();
            $table->text('notas')->nullable();
            $table->timestamp('ultimo_contacto_at')->nullable();
            $table->timestamp('fecha_proximo_contacto')->nullable();
            $table->string('motivo_perdido', 255)->nullable();
            $table->boolean('activo')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['sucursal_id', 'estado']);
            $table->index(['asesor_id', 'estado']);
            $table->index('ultimo_contacto_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prospectos');
    }
};

