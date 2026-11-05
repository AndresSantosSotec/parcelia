<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prospectos', function (Blueprint $table) {
            $table->string('nombres', 100)->nullable()->after('nombre_completo');
            $table->string('apellidos', 100)->nullable()->after('nombres');
            $table->string('nit', 30)->nullable()->after('dpi');
            $table->string('telefono_secundario', 50)->nullable()->after('telefono');
            $table->text('direccion')->nullable()->after('email');
            $table->string('municipio', 100)->nullable()->after('direccion');
            $table->string('departamento', 100)->nullable()->after('municipio');
            $table->date('fecha_nacimiento')->nullable()->after('departamento');
            $table->string('genero', 20)->nullable()->after('fecha_nacimiento'); // masculino, femenino, otro
            $table->string('estado_civil', 50)->nullable()->after('genero');
            $table->string('profesion', 100)->nullable()->after('estado_civil');
            $table->foreignId('cliente_id')->nullable()->after('lote_id')->constrained('clientes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('prospectos', function (Blueprint $table) {
            $table->dropForeign(['cliente_id']);
            $table->dropColumn([
                'nombres',
                'apellidos',
                'nit',
                'telefono_secundario',
                'direccion',
                'municipio',
                'departamento',
                'fecha_nacimiento',
                'genero',
                'estado_civil',
                'profesion',
                'cliente_id',
            ]);
        });
    }
};

