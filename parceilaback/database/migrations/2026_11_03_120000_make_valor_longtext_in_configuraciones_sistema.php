<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('configuraciones_sistema')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE `configuraciones_sistema` MODIFY `valor` LONGTEXT NULL');
            } else {
                Schema::table('configuraciones_sistema', function (Blueprint $table) {
                    $table->longText('valor')->nullable()->change();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('configuraciones_sistema')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE `configuraciones_sistema` MODIFY `valor` TEXT NULL');
            }
        }
    }
};

