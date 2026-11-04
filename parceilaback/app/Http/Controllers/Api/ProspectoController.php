<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prospecto;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'nombre_completo' => 'required|string|max:150',
            'telefono' => 'required|string|max:50',
            'email' => 'nullable|email|max:100',
            'dpi' => 'nullable|string|max:30',
            'finca_id' => 'nullable|exists:fincas,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'asesor_id' => 'nullable|exists:users,id',
            'estado' => 'nullable|in:nuevo,contactado,visita_agendada,negociacion,ganado,perdido',
            'origen' => 'nullable|string|max:50',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'notas' => 'nullable|string',
            'fecha_proximo_contacto' => 'nullable|date',
        ]);

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
            'nombre_completo' => 'sometimes|required|string|max:150',
            'telefono' => 'sometimes|required|string|max:50',
            'email' => 'nullable|email|max:100',
            'dpi' => 'nullable|string|max:30',
            'finca_id' => 'nullable|exists:fincas,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'asesor_id' => 'nullable|exists:users,id',
            'origen' => 'nullable|string|max:50',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'notas' => 'nullable|string',
            'fecha_proximo_contacto' => 'nullable|date',
            'motivo_perdido' => 'nullable|string|max:255',
        ]);

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
}

