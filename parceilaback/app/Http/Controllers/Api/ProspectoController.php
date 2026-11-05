<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProspectosExport;
use App\Http\Controllers\Controller;
use App\Models\Prospecto;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProspectoController extends Controller
{
    /**
     * Listar prospectos con filtros y estadísticas para el Tablero CRM / Kanban
     */
    public function index(Request $request)
    {
        $query = Prospecto::with(['finca:id,nombre,codigo', 'lote:id,numero_lote,codigo_unico,precio_venta,estado', 'asesor:id,name,email', 'creador:id,name']);

        // Scope por sucursal si está configurado
        if ($request->filled('sucursal_id')) {
            $query->where('sucursal_id', $request->sucursal_id);
        }

        // Filtro por Finca
        if ($request->filled('finca_id')) {
            $query->where('finca_id', $request->finca_id);
        }

        // Filtro por Asesor asignado
        if ($request->filled('asesor_id')) {
            $query->where('asesor_id', $request->asesor_id);
        }

        // Filtro por Estado
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        // Filtro por Origen
        if ($request->filled('origen')) {
            $query->where('origen', $request->origen);
        }

        // Filtro urgente: Sólo prospectos sin seguimiento (+48h)
        if ($request->boolean('solo_sin_seguimiento')) {
            $limite = Carbon::now()->subHours(48);
            $query->whereNotIn('estado', ['ganado', 'perdido'])
                  ->where(function ($q) use ($limite) {
                      $q->whereNull('ultimo_contacto_at')
                        ->orWhere('ultimo_contacto_at', '<=', $limite);
                  });
        }

        // Búsqueda por texto (nombre, teléfono, DPI, notas)
        if ($request->filled('busqueda')) {
            $b = $request->busqueda;
            $query->where(function ($q) use ($b) {
                $q->where('nombre_completo', 'like', "%{$b}%")
                  ->orWhere('telefono', 'like', "%{$b}%")
                  ->orWhere('dpi', 'like', "%{$b}%")
                  ->orWhere('notas', 'like', "%{$b}%");
            });
        }

        $prospectos = $query->orderByRaw('CASE WHEN ultimo_contacto_at IS NULL THEN 0 ELSE 1 END, ultimo_contacto_at ASC')
                            ->orderBy('created_at', 'desc')
                            ->get();

        // Resumen y estadísticas para el pipeline comercial
        $estadosDisponibles = ['nuevo', 'contactado', 'visita_agendada', 'negociacion', 'ganado', 'perdido'];
        $baseStats = Prospecto::query();
        if ($request->filled('sucursal_id')) {
            $baseStats->where('sucursal_id', $request->sucursal_id);
        }
        if ($request->filled('finca_id')) {
            $baseStats->where('finca_id', $request->finca_id);
        }

        $conteosPorEstado = [];
        foreach ($estadosDisponibles as $est) {
            $conteosPorEstado[$est] = (clone $baseStats)->where('estado', $est)->count();
        }

        $limite48h = Carbon::now()->subHours(48);
        $totalSinSeguimiento = (clone $baseStats)
            ->whereNotIn('estado', ['ganado', 'perdido'])
            ->where(function ($q) use ($limite48h) {
                $q->whereNull('ultimo_contacto_at')
                  ->orWhere('ultimo_contacto_at', '<=', $limite48h);
            })->count();

        $montoEnNegociacion = (clone $baseStats)
            ->whereIn('estado', ['nuevo', 'contactado', 'visita_agendada', 'negociacion'])
            ->sum('presupuesto_estimado');

        return response()->json([
            'success' => true,
            'data' => $prospectos,
            'estadisticas' => [
                'conteos_por_estado' => $conteosPorEstado,
                'total_sin_seguimiento' => $totalSinSeguimiento,
                'total_prospectos_activos' => array_sum(array_slice($conteosPorEstado, 0, 4)),
                'monto_pipeline_estimado' => (float) $montoEnNegociacion,
            ],
        ]);
    }

    /**
     * Registrar un nuevo prospecto
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre_completo' => 'nullable|string|max:150',
            'nombres' => 'nullable|string|max:100',
            'apellidos' => 'nullable|string|max:100',
            'telefono' => 'required|string|max:50',
            'telefono_secundario' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'dpi' => 'nullable|string|max:30',
            'nit' => 'nullable|string|max:30',
            'direccion' => 'nullable|string',
            'municipio' => 'nullable|string|max:100',
            'departamento' => 'nullable|string|max:100',
            'fecha_nacimiento' => 'nullable|date',
            'genero' => 'nullable|in:masculino,femenino,otro',
            'estado_civil' => 'nullable|string|max:50',
            'profesion' => 'nullable|string|max:100',
            'finca_id' => 'nullable|exists:fincas,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'asesor_id' => 'nullable|exists:users,id',
            'estado' => 'nullable|in:nuevo,contactado,visita_agendada,negociacion,ganado,perdido',
            'origen' => 'nullable|string|max:50',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'notas' => 'nullable|string',
            'fecha_proximo_contacto' => 'nullable|date',
        ]);

        if (empty($validated['nombre_completo'])) {
            $validated['nombre_completo'] = trim(($validated['nombres'] ?? '') . ' ' . ($validated['apellidos'] ?? ''));
        }
        if (empty($validated['nombre_completo'])) {
            return response()->json(['success' => false, 'message' => 'El nombre del prospecto es obligatorio.'], 422);
        }

        $user = $request->user();
        $validated['sucursal_id'] = $request->sucursal_id ?? $user?->sucursal_id;
        $validated['asesor_id'] = $validated['asesor_id'] ?? $user?->id;
        $validated['created_by'] = $user?->id;
        $validated['ultimo_contacto_at'] = Carbon::now();
        $validated['estado'] = $validated['estado'] ?? 'nuevo';

        $prospecto = Prospecto::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Prospecto registrado exitosamente en el CRM.',
            'data' => $prospecto->load(['finca:id,nombre', 'lote:id,numero_lote,codigo_unico', 'asesor:id,name']),
        ], 201);
    }

    /**
     * Ver detalle del prospecto
     */
    public function show($id)
    {
        $prospecto = Prospecto::with([
            'finca',
            'lote.parcela',
            'asesor',
            'creador',
            'sucursal',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $prospecto,
        ]);
    }

    /**
     * Actualizar datos del prospecto
     */
    public function update(Request $request, $id)
    {
        $prospecto = Prospecto::findOrFail($id);

        $validated = $request->validate([
            'nombre_completo' => 'nullable|string|max:150',
            'nombres' => 'nullable|string|max:100',
            'apellidos' => 'nullable|string|max:100',
            'telefono' => 'sometimes|required|string|max:50',
            'telefono_secundario' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'dpi' => 'nullable|string|max:30',
            'nit' => 'nullable|string|max:30',
            'direccion' => 'nullable|string',
            'municipio' => 'nullable|string|max:100',
            'departamento' => 'nullable|string|max:100',
            'fecha_nacimiento' => 'nullable|date',
            'genero' => 'nullable|in:masculino,femenino,otro',
            'estado_civil' => 'nullable|string|max:50',
            'profesion' => 'nullable|string|max:100',
            'finca_id' => 'nullable|exists:fincas,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'asesor_id' => 'nullable|exists:users,id',
            'origen' => 'nullable|string|max:50',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'notas' => 'nullable|string',
            'fecha_proximo_contacto' => 'nullable|date',
            'motivo_perdido' => 'nullable|string|max:255',
        ]);

        if (! empty($validated['nombres']) || ! empty($validated['apellidos'])) {
            $validated['nombre_completo'] = trim(($validated['nombres'] ?? '') . ' ' . ($validated['apellidos'] ?? ''));
        }

        $prospecto->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Prospecto actualizado correctamente.',
            'data' => $prospecto->fresh(['finca:id,nombre', 'lote:id,numero_lote,codigo_unico', 'asesor:id,name']),
        ]);
    }

    /**
     * Mover de estado en el embudo comercial (Drag & Drop en Kanban)
     */
    public function cambiarEstado(Request $request, $id)
    {
        $prospecto = Prospecto::findOrFail($id);

        $validated = $request->validate([
            'estado' => 'required|in:nuevo,contactado,visita_agendada,negociacion,ganado,perdido',
            'motivo_perdido' => 'nullable|string|max:255',
            'notas' => 'nullable|string',
        ]);

        $datosUpdate = [
            'estado' => $validated['estado'],
            'ultimo_contacto_at' => Carbon::now(), // Al mover de estado se reinicia el reloj de 48h
        ];

        if ($validated['estado'] === 'perdido') {
            $datosUpdate['motivo_perdido'] = $validated['motivo_perdido'] ?? $prospecto->motivo_perdido;
        }

        if (! empty($validated['notas'])) {
            $nuevaNota = "[" . Carbon::now()->format('d/m/Y H:i') . " - Cambio a " . strtoupper($validated['estado']) . "]: " . $validated['notas'];
            $datosUpdate['notas'] = $prospecto->notas ? $prospecto->notas . "\n" . $nuevaNota : $nuevaNota;
        }

        $prospecto->update($datosUpdate);

        return response()->json([
            'success' => true,
            'message' => 'Estado del prospecto actualizado a ' . ucfirst($validated['estado']),
            'data' => $prospecto->fresh(['finca:id,nombre', 'lote:id,numero_lote,codigo_unico', 'asesor:id,name']),
        ]);
    }

    /**
     * Registrar interacción/llamada/seguimiento con el prospecto (Reinicia alerta de 48h)
     */
    public function registrarContacto(Request $request, $id)
    {
        $prospecto = Prospecto::findOrFail($id);

        $validated = $request->validate([
            'tipo_interaccion' => 'required|in:llamada,whatsapp,visita,reunion_oficina,correo,otro',
            'detalle' => 'required|string|max:1000',
            'fecha_proximo_contacto' => 'nullable|date',
            'nuevo_estado' => 'nullable|in:nuevo,contactado,visita_agendada,negociacion,ganado,perdido',
        ]);

        $tipo = strtoupper(str_replace('_', ' ', $validated['tipo_interaccion']));
        $registro = "[" . Carbon::now()->format('d/m/Y H:i') . " - " . $tipo . "]: " . $validated['detalle'];

        $datosUpdate = [
            'ultimo_contacto_at' => Carbon::now(),
            'notas' => $prospecto->notas ? $prospecto->notas . "\n" . $registro : $registro,
        ];

        if (! empty($validated['fecha_proximo_contacto'])) {
            $datosUpdate['fecha_proximo_contacto'] = $validated['fecha_proximo_contacto'];
        }

        if (! empty($validated['nuevo_estado'])) {
            $datosUpdate['estado'] = $validated['nuevo_estado'];
        }

        $prospecto->update($datosUpdate);

        return response()->json([
            'success' => true,
            'message' => 'Contacto registrado con éxito. El cronómetro de seguimiento ha sido actualizado.',
            'data' => $prospecto->fresh(['finca:id,nombre', 'lote:id,numero_lote,codigo_unico', 'asesor:id,name']),
        ]);
    }

    /**
     * Eliminar prospecto del embudo
     */
    public function destroy($id)
    {
        $prospecto = Prospecto::findOrFail($id);
        $prospecto->delete();

        return response()->json([
            'success' => true,
            'message' => 'Prospecto eliminado del sistema.',
        ]);
    }

    /**
     * Descarga de plantilla CSV de ejemplo para carga masiva de prospectos
     */
    public function plantillaCsv()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="plantilla_prospectos.csv"',
        ];

        $callback = function () {
            $handle = fopen('php://output', 'w');
            // BOM UTF-8 para Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Encabezados completos compatibles con el perfil oficial de cliente
            fputcsv($handle, [
                'nombre_completo',
                'nombres',
                'apellidos',
                'telefono',
                'telefono_secundario',
                'email',
                'dpi',
                'nit',
                'departamento',
                'municipio',
                'direccion',
                'presupuesto_estimado',
                'notas',
            ]);

            // Filas de ejemplo de Guatemala
            fputcsv($handle, [
                'Carlos Estuardo Morales Lopez',
                'Carlos Estuardo',
                'Morales Lopez',
                '55443322',
                '44332211',
                'carlos.morales@ejemplo.com',
                '2456789010101',
                '1234567-8',
                'Guatemala',
                'Guatemala',
                'Zona 10, Edificio Reforma',
                '75000',
                'Interesado en lote esquinero con facilidades de pago',
            ]);

            fputcsv($handle, [
                'Maria Eugenia Perez Hernandez',
                'Maria Eugenia',
                'Perez Hernandez',
                '33221100',
                '',
                'maria.perez@ejemplo.com',
                '1987654320101',
                'CF',
                'Sacatepéquez',
                'Antigua Guatemala',
                'Calle Ancha #14',
                '60000',
                'Pregunto por Facebook sobre enganche fraccionado',
            ]);

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Descargar plantilla oficial en formato Microsoft Excel (.xlsx) con columnas completas y filas de ejemplo
     */
    public function plantillaExcel()
    {
        $headings = [
            'nombre_completo',
            'nombres',
            'apellidos',
            'telefono',
            'telefono_secundario',
            'email',
            'dpi',
            'nit',
            'departamento',
            'municipio',
            'direccion',
            'presupuesto_estimado',
            'notas',
        ];

        $sampleRows = [
            [
                'Carlos Estuardo Morales Lopez',
                'Carlos Estuardo',
                'Morales Lopez',
                '55443322',
                '44332211',
                'carlos.morales@ejemplo.com',
                '2456789010101',
                '1234567-8',
                'Guatemala',
                'Guatemala',
                'Zona 10, Edificio Reforma',
                75000,
                'Interesado en lote esquinero con facilidades de pago',
            ],
            [
                'Maria Eugenia Perez Hernandez',
                'Maria Eugenia',
                'Perez Hernandez',
                '33221100',
                '',
                'maria.perez@ejemplo.com',
                '1987654320101',
                'CF',
                'Sacatepéquez',
                'Antigua Guatemala',
                'Calle Ancha #14',
                60000,
                'Pregunto por Facebook sobre enganche fraccionado',
            ],
            [
                'Jose Fernando Alvarez Ruiz',
                'Jose Fernando',
                'Alvarez Ruiz',
                '58990011',
                '',
                'jose.alvarez@ejemplo.com',
                '',
                'CF',
                'Escuintla',
                'Santa Lucía Cotzumalguapa',
                'Barrio El Carmen',
                50000,
                'Lead captado en feria inmobiliaria',
            ],
        ];

        return Excel::download(
            new ProspectosExport($headings, $sampleRows, 'Plantilla Carga Prospectos'),
            'plantilla_prospectos_parcelia.xlsx'
        );
    }

    /**
     * Exportar prospectos filtrados a formato Microsoft Excel (.xlsx)
     */
    public function exportarExcel(Request $request)
    {
        $query = Prospecto::with(['finca:id,nombre', 'lote:id,numero_lote,codigo_unico', 'asesor:id,name']);

        if ($request->filled('finca_id')) {
            $query->where('finca_id', $request->finca_id);
        }
        if ($request->filled('asesor_id')) {
            if ($request->asesor_id === 'sin_asignar') {
                $query->whereNull('asesor_id');
            } else {
                $query->where('asesor_id', $request->asesor_id);
            }
        }
        if ($request->filled('estado') && $request->estado !== 'todos') {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('buscar')) {
            $term = $request->buscar;
            $query->where(function ($q) use ($term) {
                $q->where('nombre_completo', 'like', "%{$term}%")
                  ->orWhere('telefono', 'like', "%{$term}%")
                  ->orWhere('dpi', 'like', "%{$term}%")
                  ->orWhere('nit', 'like', "%{$term}%")
                  ->orWhere('email', 'like', "%{$term}%");
            });
        }

        $prospectos = $query->orderBy('id', 'desc')->get();

        $headings = [
            'ID',
            'Fecha Registro',
            'Nombre Completo',
            'Nombres',
            'Apellidos',
            'Teléfono Principal',
            'Teléfono Secundario',
            'Correo Electrónico',
            'DPI',
            'NIT',
            'Departamento',
            'Municipio',
            'Dirección Domiciliar',
            'Finca de Interés',
            'Lote',
            'Asesor Asignado',
            'Estado CRM',
            'Origen de Captación',
            'Presupuesto Estimado (Q)',
            'Notas',
            'Último Contacto',
        ];

        $rows = [];
        foreach ($prospectos as $p) {
            $rows[] = [
                $p->id,
                $p->created_at ? $p->created_at->format('d/m/Y H:i') : '',
                $p->nombre_completo,
                $p->nombres,
                $p->apellidos,
                $p->telefono,
                $p->telefono_secundario,
                $p->email,
                $p->dpi,
                $p->nit,
                $p->departamento,
                $p->municipio,
                $p->direccion,
                $p->finca?->nombre ?? '',
                $p->lote?->numero_lote ?? '',
                $p->asesor?->name ?? 'Sin Asignar',
                strtoupper(str_replace('_', ' ', $p->estado)),
                $p->origen,
                $p->presupuesto_estimado,
                $p->notas,
                $p->ultimo_contacto_at ? Carbon::parse($p->ultimo_contacto_at)->format('d/m/Y H:i') : '',
            ];
        }

        return Excel::download(
            new ProspectosExport($headings, $rows, 'Prospectos CRM'),
            'prospectos_crm_parcelia_' . date('Y-m-d') . '.xlsx'
        );
    }

    /**
     * Importar prospectos directamente desde archivo Excel (.xlsx, .xls) o CSV
     */
    public function cargarArchivoExcel(Request $request)
    {
        $request->validate([
            'archivo' => 'required|file|max:10240',
            'asesor_id' => 'nullable|exists:users,id',
            'asesores_ids' => 'nullable|array',
            'asesores_ids.*' => 'exists:users,id',
            'distribuir_equitativo' => 'nullable',
            'finca_id' => 'nullable|exists:fincas,id',
            'origen' => 'nullable|string|max:50',
        ]);

        $file = $request->file('archivo');
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestDataRow();
        $highestCol = $sheet->getHighestDataColumn();
        $highestColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestCol);

        // Cabeceras en fila 1
        $headers = [];
        for ($col = 1; $col <= $highestColIndex; $col++) {
            $val = $sheet->getCellByColumnAndRow($col, 1)->getValue();
            if ($val !== null && trim((string)$val) !== '') {
                $headers[$col] = strtolower(trim(str_replace(' ', '_', (string)$val)));
            }
        }

        $fincaGeneralId = $request->finca_id;
        $origen = $request->origen ?? 'importacion_excel';
        $distribuirEquitativo = filter_var($request->distribuir_equitativo, FILTER_VALIDATE_BOOLEAN);
        $listaAsesores = $request->asesores_ids ?? [];
        if (empty($listaAsesores) && !empty($request->asesor_id)) {
            $listaAsesores = [(int) $request->asesor_id];
        }

        $totalAsesores = count($listaAsesores);
        $indiceAsesor = 0;
        $importados = 0;
        $errores = [];

        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $rowData = [];
                $hasData = false;
                foreach ($headers as $col => $headerName) {
                    $val = $sheet->getCellByColumnAndRow($col, $row)->getValue();
                    $strVal = $val !== null ? trim((string)$val) : '';
                    if ($strVal !== '') {
                        $hasData = true;
                    }
                    $rowData[$headerName] = $strVal;
                }

                if (!$hasData) {
                    continue;
                }

                $nombre = $rowData['nombre_completo'] ?? trim(($rowData['nombres'] ?? '') . ' ' . ($rowData['apellidos'] ?? ''));
                $telefono = $rowData['telefono'] ?? ($rowData['telefono_principal'] ?? '');

                if (empty($nombre) || empty($telefono)) {
                    $errores[] = "Fila #{$row}: Nombre o teléfono vacío.";
                    continue;
                }

                $asesorAsignadoId = null;
                if ($totalAsesores > 0) {
                    if ($distribuirEquitativo) {
                        $asesorAsignadoId = $listaAsesores[$indiceAsesor % $totalAsesores];
                        $indiceAsesor++;
                    } else {
                        $asesorAsignadoId = $listaAsesores[0];
                    }
                }

                $dpiLimpio = !empty($rowData['dpi']) ? preg_replace('/\D/', '', $rowData['dpi']) : null;

                Prospecto::create([
                    'nombre_completo' => $nombre,
                    'nombres' => !empty($rowData['nombres']) ? $rowData['nombres'] : null,
                    'apellidos' => !empty($rowData['apellidos']) ? $rowData['apellidos'] : null,
                    'telefono' => $telefono,
                    'telefono_secundario' => !empty($rowData['telefono_secundario']) ? $rowData['telefono_secundario'] : null,
                    'email' => !empty($rowData['email']) ? $rowData['email'] : null,
                    'dpi' => $dpiLimpio,
                    'nit' => !empty($rowData['nit']) ? $rowData['nit'] : 'CF',
                    'departamento' => !empty($rowData['departamento']) ? $rowData['departamento'] : null,
                    'municipio' => !empty($rowData['municipio']) ? $rowData['municipio'] : null,
                    'direccion' => !empty($rowData['direccion']) ? $rowData['direccion'] : null,
                    'finca_id' => $fincaGeneralId,
                    'asesor_id' => $asesorAsignadoId,
                    'creador_id' => $request->user()?->id,
                    'sucursal_id' => $request->user()?->sucursal_id,
                    'estado' => 'nuevo',
                    'origen' => $origen,
                    'presupuesto_estimado' => !empty($rowData['presupuesto_estimado']) ? (float) $rowData['presupuesto_estimado'] : null,
                    'notas' => !empty($rowData['notas']) ? $rowData['notas'] : 'Importado desde archivo Excel.',
                    'fecha_proximo_contacto' => Carbon::now()->addDay()->toDateString(),
                ]);

                $importados++;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Se importaron exitosamente {$importados} prospectos desde el archivo Excel.",
                'total_importados' => $importados,
                'total_errores' => count($errores),
                'errores' => $errores,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el archivo Excel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Importación masiva de prospectos con asignación a asesor o distribución equitativa (Round-Robin)
     */
    public function cargaMasiva(Request $request)
    {
        $validated = $request->validate([
            'prospectos' => 'required|array|min:1|max:1000',
            'prospectos.*.nombre_completo' => 'required|string|min:2|max:200',
            'prospectos.*.telefono' => 'required|string|min:8|max:25',
            'prospectos.*.telefono_secundario' => 'nullable|string|max:25',
            'prospectos.*.email' => 'nullable|email|max:100',
            'prospectos.*.dpi' => 'nullable|string|max:25',
            'prospectos.*.presupuesto_estimado' => 'nullable|numeric|min:0',
            'prospectos.*.notas' => 'nullable|string|max:1000',
            'asesor_id' => 'nullable|exists:users,id',
            'asesores_ids' => 'nullable|array',
            'asesores_ids.*' => 'exists:users,id',
            'distribuir_equitativo' => 'nullable|boolean',
            'finca_id' => 'nullable|exists:fincas,id',
            'origen' => 'nullable|string|max:50',
        ]);

        $fincaGeneralId = $validated['finca_id'] ?? null;
        $origen = $validated['origen'] ?? 'importacion_masiva';
        $distribuirEquitativo = $request->boolean('distribuir_equitativo');
        $listaAsesores = $validated['asesores_ids'] ?? [];

        if (empty($listaAsesores) && !empty($validated['asesor_id'])) {
            $listaAsesores = [(int) $validated['asesor_id']];
        }

        $totalAsesores = count($listaAsesores);
        $indiceAsesor = 0;
        $importados = 0;
        $errores = [];

        DB::beginTransaction();
        try {
            foreach ($validated['prospectos'] as $index => $row) {
                $nombre = trim($row['nombre_completo'] ?? '');
                $telefono = trim($row['telefono'] ?? '');

                if (empty($nombre) || empty($telefono)) {
                    $errores[] = "Fila #".($index + 1).": Nombre o teléfono vacío.";
                    continue;
                }

                // Asignación de asesor
                $asesorAsignadoId = null;
                if ($totalAsesores > 0) {
                    if ($distribuirEquitativo) {
                        $asesorAsignadoId = $listaAsesores[$indiceAsesor % $totalAsesores];
                        $indiceAsesor++;
                    } else {
                        $asesorAsignadoId = $listaAsesores[0];
                    }
                }

                $dpiLimpio = !empty($row['dpi']) ? preg_replace('/\D/', '', $row['dpi']) : null;

                Prospecto::create([
                    'nombre_completo' => $nombre,
                    'nombres' => !empty($row['nombres']) ? trim($row['nombres']) : null,
                    'apellidos' => !empty($row['apellidos']) ? trim($row['apellidos']) : null,
                    'telefono' => $telefono,
                    'telefono_secundario' => !empty($row['telefono_secundario']) ? trim($row['telefono_secundario']) : null,
                    'email' => !empty($row['email']) ? trim($row['email']) : null,
                    'dpi' => $dpiLimpio,
                    'nit' => !empty($row['nit']) ? trim($row['nit']) : 'CF',
                    'departamento' => !empty($row['departamento']) ? trim($row['departamento']) : null,
                    'municipio' => !empty($row['municipio']) ? trim($row['municipio']) : null,
                    'direccion' => !empty($row['direccion']) ? trim($row['direccion']) : null,
                    'finca_id' => $row['finca_id'] ?? $fincaGeneralId,
                    'asesor_id' => $asesorAsignadoId,
                    'creador_id' => $request->user()?->id,
                    'sucursal_id' => $request->user()?->sucursal_id,
                    'estado' => 'nuevo',
                    'origen' => $origen,
                    'presupuesto_estimado' => !empty($row['presupuesto_estimado']) ? (float) $row['presupuesto_estimado'] : null,
                    'notas' => !empty($row['notas']) ? trim($row['notas']) : "Importado mediante carga masiva.",
                    'fecha_proximo_contacto' => Carbon::now()->addDay()->toDateString(),
                ]);

                $importados++;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Se importaron exitosamente {$importados} prospectos.",
                'total_importados' => $importados,
                'total_errores' => count($errores),
                'errores' => $errores,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error durante la carga masiva: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Asignación o reasignación masiva de múltiples prospectos a un asesor
     */
    public function asignacionMasiva(Request $request)
    {
        $validated = $request->validate([
            'prospectos_ids' => 'required|array|min:1',
            'prospectos_ids.*' => 'exists:prospectos,id',
            'asesor_id' => 'required|exists:users,id',
        ]);

        $actualizados = Prospecto::whereIn('id', $validated['prospectos_ids'])
            ->update([
                'asesor_id' => $validated['asesor_id'],
                'updated_at' => Carbon::now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => "Se asignaron {$actualizados} prospectos al asesor seleccionado.",
            'total_asignados' => $actualizados,
        ]);
    }
}

