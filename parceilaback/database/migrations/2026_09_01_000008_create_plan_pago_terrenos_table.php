<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_pagos_terrenos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negociacion_id')->constrained('negociaciones')->cascadeOnDelete();
            $table->integer('numero_cuota'); // 1, 2, 3...
            $table->enum('tipo_cuota', ['enganche', 'ordinaria', 'extraordinaria', 'gastos'])->default('ordinaria');
            $table->date('fecha_vencimiento');
            
            // Desglose Financiero
            $table->decimal('cuota_capital', 12, 2);
            $table->decimal('cuota_interes', 12, 2)->default(0);
            $table->decimal('cuota_monto_total', 12, 2); // capital + interes
            $table->decimal('saldo_capital_restante', 14, 2);
            
            // Cobro Realizado
            $table->decimal('monto_pagado', 12, 2)->default(0);
            $table->decimal('capital_pagado', 12, 2)->default(0);
            $table->decimal('interes_pagado', 12, 2)->default(0);
            $table->decimal('mora_pagada', 12, 2)->default(0);
            $table->date('fecha_pagado')->nullable();
            
            $table->enum('estado', [
                'pendiente',
                'parcial',
                'pagada',
                'vencida',
                'adelantada',
                'cancelada'
            ])->default('pendiente');
            
            $table->timestamps();

            $table->index(['negociacion_id', 'numero_cuota']);
            $table->index(['fecha_vencimiento', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_pagos_terrenos');
    }
};
