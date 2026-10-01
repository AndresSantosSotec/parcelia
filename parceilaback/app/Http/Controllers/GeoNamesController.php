<?php

namespace App\Http\Controllers;

use App\Models\Departamento;
use Illuminate\Http\JsonResponse;

class GeoNamesController extends Controller
{
    private $username;
    private $baseUrl = 'https://secure.geonames.org';
    private $guatemalaGeonameId = 3595528; // ID de Guatemala en GeoNames

    public function __construct()
    {
        $this->username = env('GEONAMES_USERNAME', 'psantosg1');
    }

    /**
     * Obtiene todos los departamentos de Guatemala
     */
    public function obtenerDepartamentos(): JsonResponse
    {
        $departamentos = Departamento::query()->orderBy('nombre')->get()->map(fn (Departamento $departamento) => [
            'geonameId' => $departamento->id,
            'name' => $departamento->nombre,
            'adminCode1' => $departamento->codigo,
            'countryCode' => 'GT',
        ])->values();

        return response()->json([
            'success' => true,
            'data' => $departamentos,
        ]);
    }

    /**
     * Obtiene los municipios de un departamento
     */
    public function obtenerMunicipios(int $geonameId): JsonResponse
    {
        $departamento = Departamento::query()->find($geonameId);
        $municipios = $departamento
            ? $departamento->municipios()->orderBy('nombre')->get()->map(fn ($municipio) => [
                'geonameId' => $municipio->id,
                'name' => $municipio->nombre,
                'adminCode1' => $departamento->codigo,
                'countryCode' => 'GT',
            ])->values()
            : collect();

        return response()->json([
            'success' => true,
            'data' => $municipios,
        ]);
    }

    /**
     * Obtiene toda la información de Guatemala (departamentos y municipios)
     * Útil para cargar todo de una vez
     */
    public function obtenerGuatemalaCompleto(): JsonResponse
    {
        $departamentos = Departamento::query()->with('municipios')->orderBy('nombre')->get()->map(function (Departamento $departamento) {
            return [
                'geonameId' => $departamento->id,
                'name' => $departamento->nombre,
                'adminCode1' => $departamento->codigo,
                'municipios' => $departamento->municipios->map(fn ($municipio) => [
                    'geonameId' => $municipio->id,
                    'name' => $municipio->nombre,
                    'adminCode1' => $departamento->codigo,
                    'countryCode' => 'GT',
                ])->values(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'pais' => [
                    'geonameId' => $this->guatemalaGeonameId,
                    'countryName' => 'Guatemala',
                    'countryCode' => 'GT',
                ],
                'departamentos' => $departamentos,
            ],
        ]);
    }
}

