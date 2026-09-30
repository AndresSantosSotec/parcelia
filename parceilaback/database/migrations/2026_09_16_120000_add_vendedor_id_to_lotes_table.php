<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            if (! Schema::hasColumn('lotes', 'vendedor_id')) {
                $table->foreignId('vendedor_id')
                    ->nullable()
                    ->after('parcela_id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index('vendedor_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            if (Schema::hasColumn('lotes', 'vendedor_id')) {
                $table->dropConstrainedForeignId('vendedor_id');
            }
        });
    }
};
