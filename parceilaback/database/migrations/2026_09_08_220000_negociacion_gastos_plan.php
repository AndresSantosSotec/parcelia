<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('negociacion_gasto')) {
            Schema::create('negociacion_gasto', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('negociacion_id');
                $table->unsignedBigInteger('gasto_id');
                $table->decimal('valor_calculado', 12, 2)->nullable();
                $table->timestamps();

                $table->unique(['negociacion_id', 'gasto_id'], 'negociacion_gasto_unique');
                $table->index('negociacion_id');
                $table->index('gasto_id');

                $table->foreign('negociacion_id')
                    ->references('id')
                    ->on('negociaciones')
                    ->onDelete('cascade');
                $table->foreign('gasto_id')
                    ->references('id_gasto')
                    ->on('gastos')
                    ->onDelete('cascade');
            });
        }

        if (Schema::hasTable('plan_pagos_terrenos') && ! Schema::hasColumn('plan_pagos_terrenos', 'otros_cargos_pagados')) {
            Schema::table('plan_pagos_terrenos', function (Blueprint $table) {
                $table->decimal('otros_cargos_pagados', 12, 2)->default(0);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('negociacion_gasto');

        if (Schema::hasTable('plan_pagos_terrenos') && Schema::hasColumn('plan_pagos_terrenos', 'otros_cargos_pagados')) {
            Schema::table('plan_pagos_terrenos', function (Blueprint $table) {
                $table->dropColumn('otros_cargos_pagados');
            });
        }
    }
};
