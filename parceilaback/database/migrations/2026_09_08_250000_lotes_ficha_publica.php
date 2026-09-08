<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            $table->string('token_publico', 36)->nullable()->unique()->after('referencia_geo');
            $table->boolean('publicado')->default(true)->after('token_publico');
        });

        $lotes = DB::table('lotes')->whereNull('token_publico')->select('id')->get();
        foreach ($lotes as $lote) {
            DB::table('lotes')->where('id', $lote->id)->update([
                'token_publico' => (string) Str::ulid(),
                'publicado' => true,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('lotes', function (Blueprint $table) {
            $table->dropColumn(['token_publico', 'publicado']);
        });
    }
};
