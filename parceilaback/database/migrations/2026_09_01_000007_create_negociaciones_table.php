<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('negociaciones', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_negociacion')->unique(); // Ej: NEG-2026-0001
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete(); // Comprador
            $table->foreignId('lote_id')->constrained('lotes')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Asesor / Vendedor
            $table->foreignId('sucursal_id')->nullable()->constrained('sucursales')->nullOnDelete();
            
            // Valores Financieros
            $table->enum('tipo_negociacion', ['contado', 'credito', 'reserva'])->default('credito');
            $table->decimal('precio_original', 14, 2);
            $table->decimal('descuento', 14, 2)->default(0);
            $table->decimal('gastos_escrituracion', 14, 2)->default(0);
            $table->decimal('gastos_administrativos', 14, 2)->default(0);
            $table->decimal('precio_final', 14, 2); // (precio_original - descuento + gastos)
            
            // Financiamiento
            $table->decimal('enganche_pactado', 14, 2)->default(0);
            $table->decimal('enganche_pagado', 14, 2)->default(0);
            $table->decimal('monto_financiado', 14, 2)->default(0); // Capital a financiar
            $table->decimal('tasa_interes_anual', 5, 2)->default(0);
            $table->integer('plazo_meses')->default(12);
            $table->decimal('cuota_mensual', 12, 2)->default(0);
            $table->decimal('total_intereses_proyectados', 14, 2)->default(0);
            $table->decimal('total_a_pagar', 14, 2)->default(0);
            
            // Saldo y Cobranza
            $table->decimal('total_capital_pagado', 14, 2)->default(0);
            $table->decimal('total_interes_pagado', 14, 2)->default(0);
            $table->decimal('total_mora_pagada', 14, 2)->default(0);
            $table->decimal('saldo_capital_pendiente', 14, 2)->default(0);
            $table->integer('cuotas_pagadas')->default(0);
            $table->integer('cuotas_pendientes')->default(0);
            $table->integer('dias_mora_actual')->default(0);
            
            // Fechas y Estado
            $table->date('fecha_negociacion');
            $table->date('fecha_primer_pago')->nullable();
            $table->date('fecha_vencimiento_contrato')->nullable();
            $table->enum('estado', [
                'borrador',
                'reservada',
                'activa',
                'pagada_total',
                'rescindida',
                'en_mora'
            ])->default('activa');
            
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['cliente_id', 'estado']);
            $table->index(['lote_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('negociaciones');
    }
};
