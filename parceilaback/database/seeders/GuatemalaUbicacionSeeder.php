<?php

namespace Database\Seeders;

use App\Models\Departamento;
use App\Models\Municipio;
use Illuminate\Database\Seeder;

class GuatemalaUbicacionSeeder extends Seeder
{
    public function run(): void
    {
        $catalogo = require database_path('data/guatemala-ubicacion.php');
        $municipios = 0;

        foreach ($catalogo as [$codigo, $nombre, $lista]) {
            $departamento = Departamento::updateOrCreate(
                ['codigo' => $codigo],
                ['nombre' => $nombre]
            );

            foreach ($lista as $municipio) {
                Municipio::updateOrCreate(
                    ['departamento_id' => $departamento->id, 'nombre' => $municipio],
                    []
                );
                $municipios++;
            }
        }

        if (count($catalogo) !== 22 || $municipios !== 340) {
            throw new \RuntimeException("El catálogo debe tener 22 departamentos y 340 municipios. Hay ".count($catalogo)." y {$municipios}.");
        }
    }
}
