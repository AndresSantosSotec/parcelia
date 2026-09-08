<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pago_terrenos', function (Blueprint $table) {
            if (!Schema::hasColumn('pago_terrenos', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->after('recibo_id');
                $table->unique('idempotency_key', 'pago_terrenos_idempotency_unique');
            }
        });

        Schema::table('lote_servicios', function (Blueprint $table) {
            $table->unique(['lote_id', 'catalogo_servicio_id'], 'lote_servicios_lote_catalogo_unique');
        });
    }

    public function down(): void
    {
        Schema::table('lote_servicios', function (Blueprint $table) {
            $table->dropUnique('lote_servicios_lote_catalogo_unique');
        });

        Schema::table('pago_terrenos', function (Blueprint $table) {
            if (Schema::hasColumn('pago_terrenos', 'idempotency_key')) {
                $table->dropUnique('pago_terrenos_idempotency_unique');
                $table->dropColumn('idempotency_key');
            }
        });
    }
};
