<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financista_pagos', function (Blueprint $table) {
            $table->string('archivo_path')->nullable()->after('referencia');
            $table->string('archivo_nombre')->nullable()->after('archivo_path');
        });
    }

    public function down(): void
    {
        Schema::table('financista_pagos', function (Blueprint $table) {
            $table->dropColumn(['archivo_path', 'archivo_nombre']);
        });
    }
};
