<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pago_terrenos', function (Blueprint $table) {
            $table->id();
            $table->string('numero_recibo')->unique(); // Ej: REC-TER-2026-0042
            $table->foreignId('negociacion_id')->constrained('negociaciones')->cascadeOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('lotes')->cascadeOnDelete();
            $table->foreignId('caja_apertura_cierre_id')->nullable()->constrained('caja_apertura_cierres')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users'); // Cajero/Usuario que cobra
            
            $table->enum('tipo_pago', [
                'enganche',
                'cuota_normal',
                'pago_anticipado',
                'abono_capital',
                'pago_total',
                'gastos_escritura',
                'mora'
            ])->default('cuota_normal');
            
            $table->decimal('monto_total', 14, 2);
            $table->decimal('distribucion_capital', 14, 2)->default(0);
            $table->decimal('distribucion_interes', 14, 2)->default(0);
            $table->decimal('distribucion_mora', 14, 2)->default(0);
            $table->decimal('distribucion_gastos', 14, 2)->default(0);
            $table->decimal('saldo_anterior', 14, 2);
            $table->decimal('saldo_posterior', 14, 2);
            
            $table->enum('metodo_pago', ['efectivo', 'transferencia', 'deposito', 'cheque', 'tarjeta'])->default('efectivo');
            $table->string('referencia_bancaria')->nullable();
            $table->dateTime('fecha_pago');
            $table->text('concepto');
            $table->text('observaciones')->nullable();
            $table->boolean('anulado')->default(false);
            $table->text('motivo_anulacion')->nullable();
            $table->timestamps();

            $table->index(['negociacion_id', 'fecha_pago']);
            $table->index(['cliente_id', 'fecha_pago']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pago_terrenos');
    }
};
