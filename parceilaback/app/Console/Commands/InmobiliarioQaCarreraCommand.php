<?php

namespace App\Console\Commands;

use App\Models\Cliente;
use App\Models\Finca;
use App\Models\Lote;
use App\Models\Negociacion;
use App\Models\Parcela;
use App\Models\PlanPagoTerreno;
use App\Models\Sucursal;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;
use Symfony\Component\Process\Process;

class InmobiliarioQaCarreraCommand extends Command
{
    protected $signature = 'inmobiliario:qa-carrera
                            {--worker : Intento interno de venta (no usar a mano)}
                            {--lote= : ID de lote para el worker}
                            {--cliente= : ID de cliente para el worker}
                            {--user= : ID de usuario para el worker}
                            {--keep : Conservar los datos QA al terminar}';

    protected $description = 'Ensayo de carrera real: dos procesos PHP contra MySQL (lockForUpdate + ocupación de lote)';

    public function handle(): int
    {
        if ($this->option('worker')) {
            return $this->runWorker();
        }

        if (config('database.default') !== 'mysql') {
            $this->error('Este ensayo requiere MySQL. Conexión actual: '.config('database.default'));
            $this->line('SQLite de PHPUnit no simula dos conexiones InnoDB. Ejecuta este comando con el .env local (mysql / parcelia).');

            return 1;
        }

        $this->info('Ensayo de carrera inmobiliaria contra MySQL (sin RefreshDatabase).');
        $this->line('Base: '.config('database.connections.mysql.database').' @ '.config('database.connections.mysql.host'));

        $ctx = null;

        try {
            $ctx = $this->crearDatosQa();
            $this->ensayarLockWaitPdo($ctx['lote_id']);
            $carrera = $this->ensayarDosProcesos($ctx);

            $negociaciones = Negociacion::withTrashed()->where('lote_id', $ctx['lote_id'])->count();
            $lote = Lote::find($ctx['lote_id']);

            $this->newLine();
            $this->line('Proceso A HTTP '.$carrera[0]['status'].' — '.$carrera[0]['message']);
            $this->line('Proceso B HTTP '.$carrera[1]['status'].' — '.$carrera[1]['message']);
            $this->line('Negociaciones sobre el lote: '.$negociaciones);
            $this->line('Ocupación lote: '.($lote?->negociacion_activa_id ?: 'libre'));

            $exitos = collect($carrera)->where('status', 201)->count();
            $rechazos = collect($carrera)->where('status', 422)->count();

            if ($exitos === 1 && $rechazos === 1 && $negociaciones === 1 && $lote?->negociacion_activa_id) {
                $this->info('RESULTADO: 1 creada, 1 rechazada. lockForUpdate + ocupación cubren la carrera.');

                return 0;
            }

            $this->error('RESULTADO: la carrera no quedó 1 a 1. Revisa los códigos HTTP y el lote.');

            return 2;
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return 1;
        } finally {
            if ($ctx && ! $this->option('keep')) {
                $this->limpiarQa($ctx);
                $this->line('Datos QA-LOCK eliminados.');
            } elseif ($ctx) {
                $this->warn('Se conservaron datos QA (--keep). Prefijo: '.$ctx['tag']);
            }
        }
    }

    private function runWorker(): int
    {
        $loteId = (int) $this->option('lote');
        $clienteId = (int) $this->option('cliente');
        $userId = (int) $this->option('user');

        $user = User::findOrFail($userId);
        $token = $user->createToken('qa-carrera', ['*'], now()->addMinutes(15))->plainTextToken;

        $payload = [
            'cliente_id' => $clienteId,
            'lote_id' => $loteId,
            'tipo_negociacion' => 'credito',
            'descuento' => 0,
            'enganche_pactado' => 10000,
            'plazo_meses' => 12,
            'tasa_interes_anual' => 12,
            'fecha_negociacion' => now()->toDateString(),
        ];

        $request = \Illuminate\Http\Request::create(
            '/api/v1/negociaciones',
            'POST',
            [],
            [],
            [],
            [
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer '.$token,
                'CONTENT_TYPE' => 'application/json',
            ],
            json_encode($payload)
        );

        $kernel = app(\Illuminate\Contracts\Http\Kernel::class);
        $response = $kernel->handle($request);
        $raw = (string) $response->getContent();
        $kernel->terminate($request, $response);

        $decoded = json_decode($raw, true) ?: [];
        $this->line('QA_CARRERA_RESULT:'.json_encode([
            'status' => $response->getStatusCode(),
            'success' => $decoded['success'] ?? false,
            'message' => $decoded['message'] ?? $raw,
            'negociacion_id' => $decoded['data']['id'] ?? null,
        ], JSON_UNESCAPED_UNICODE));

        return 0;
    }

    private function crearDatosQa(): array
    {
        $tag = 'QALCK'.bin2hex(random_bytes(3));
        $dpiA = '2'.str_pad((string) random_int(0, 999999999999), 12, '0', STR_PAD_LEFT);
        $dpiB = '3'.str_pad((string) random_int(0, 999999999999), 12, '0', STR_PAD_LEFT);

        $sucursal = Sucursal::create([
            'codigo' => $tag,
            'nombre' => 'QA Carrera '.$tag,
            'direccion' => 'QA',
            'telefono' => '22220000',
            'activa' => true,
        ]);

        $user = User::create([
            'name' => 'QA Carrera',
            'username' => strtolower($tag),
            'email' => strtolower($tag).'@parcelia.test',
            'password' => 'password',
            'rol' => 'administrador',
            'activo' => true,
            'sucursal_id' => $sucursal->id,
        ]);

        $finca = Finca::create([
            'nombre' => 'QA Carrera '.$tag,
            'codigo' => $tag,
            'municipio' => 'Guatemala',
            'departamento' => 'Guatemala',
            'area_total_m2' => 10000,
            'activo' => true,
        ]);

        $parcela = Parcela::create([
            'finca_id' => $finca->id,
            'nombre_identificador' => 'Manzana '.$tag,
            'codigo' => $tag,
            'area_m2' => 1000,
        ]);

        $lote = Lote::create([
            'parcela_id' => $parcela->id,
            'numero_lote' => 'QA1',
            'codigo_unico' => $tag.'-L1',
            'area_m2' => 200,
            'frente_metros' => 10,
            'fondo_metros' => 20,
            'precio_venta' => 90000,
            'precio_base' => 90000,
            'estado' => 'disponible',
        ]);

        $clienteA = Cliente::create([
            'nombres' => 'Comprador',
            'apellidos' => 'Alfa '.$tag,
            'dpi' => $dpiA,
            'telefono' => '55550001',
            'direccion' => 'QA',
            'fecha_nacimiento' => '1990-01-15',
            'genero' => 'masculino',
            'eliminado' => false,
        ]);

        $clienteB = Cliente::create([
            'nombres' => 'Comprador',
            'apellidos' => 'Beta '.$tag,
            'dpi' => $dpiB,
            'telefono' => '55550002',
            'direccion' => 'QA',
            'fecha_nacimiento' => '1990-01-15',
            'genero' => 'femenino',
            'eliminado' => false,
        ]);

        $this->line("Datos QA creados: finca {$finca->id}, lote {$lote->id}, tag {$tag}");

        return [
            'tag' => $tag,
            'sucursal_id' => $sucursal->id,
            'user_id' => $user->id,
            'finca_id' => $finca->id,
            'parcela_id' => $parcela->id,
            'lote_id' => $lote->id,
            'cliente_a_id' => $clienteA->id,
            'cliente_b_id' => $clienteB->id,
        ];
    }

    private function ensayarLockWaitPdo(int $loteId): void
    {
        $cfg = config('database.connections.mysql');
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'] ?: 3306, $cfg['database']);
        $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];

        $pdoA = new PDO($dsn, $cfg['username'], $cfg['password'], $options);
        $pdoB = new PDO($dsn, $cfg['username'], $cfg['password'], $options);

        try {
            $pdoA->beginTransaction();
            $stmt = $pdoA->prepare('SELECT id FROM lotes WHERE id = ? FOR UPDATE');
            $stmt->execute([$loteId]);
            $stmt->fetch(PDO::FETCH_ASSOC);

            $pdoB->exec('SET SESSION innodb_lock_wait_timeout = 1');
            $pdoB->beginTransaction();

            $blocked = false;
            try {
                $stmtB = $pdoB->prepare('SELECT id FROM lotes WHERE id = ? FOR UPDATE');
                $stmtB->execute([$loteId]);
                $stmtB->fetch(PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                $blocked = str_contains($e->getMessage(), 'Lock wait timeout')
                    || str_contains($e->getMessage(), '1205')
                    || (int) $e->errorInfo[1] === 1205;
                if (! $blocked) {
                    throw $e;
                }
            }

            if (! $blocked) {
                throw new \RuntimeException('La segunda conexión PDO obtuvo el lock; InnoDB no está serializando FOR UPDATE.');
            }

            $this->info('PDO: la segunda conexión esperó el lock (timeout 1s). FOR UPDATE funciona en MySQL.');
        } finally {
            if ($pdoB->inTransaction()) {
                $pdoB->rollBack();
            }
            if ($pdoA->inTransaction()) {
                $pdoA->commit();
            }
        }
    }

    /**
     * @return array<int, array{status:int, message:string, negociacion_id:?int}>
     */
    private function ensayarDosProcesos(array $ctx): array
    {
        $php = PHP_BINARY;
        $artisan = base_path('artisan');
        $hold = '800';

        $make = function (int $clienteId) use ($php, $artisan, $ctx, $hold): Process {
            $process = new Process(
                [$php, $artisan, 'inmobiliario:qa-carrera', '--worker', '--lote='.$ctx['lote_id'], '--cliente='.$clienteId, '--user='.$ctx['user_id']],
                base_path(),
                ['INMOBILIARIO_QA_LOCK_HOLD_MS' => $hold]
            );
            $process->setTimeout(60);

            return $process;
        };

        $p1 = $make($ctx['cliente_a_id']);
        $p2 = $make($ctx['cliente_b_id']);
        $p1->start();
        $p2->start();
        $p1->wait();
        $p2->wait();

        return [$this->parseWorker($p1), $this->parseWorker($p2)];
    }

    /**
     * @return array{status:int, message:string, negociacion_id:?int}
     */
    private function parseWorker(Process $process): array
    {
        $out = $process->getOutput().$process->getErrorOutput();
        foreach (preg_split('/\r\n|\r|\n/', $out) as $line) {
            $line = trim($line);
            if (! str_starts_with($line, 'QA_CARRERA_RESULT:')) {
                continue;
            }
            $decoded = json_decode(substr($line, strlen('QA_CARRERA_RESULT:')), true);
            if (is_array($decoded)) {
                return [
                    'status' => (int) ($decoded['status'] ?? 0),
                    'message' => (string) ($decoded['message'] ?? ''),
                    'negociacion_id' => isset($decoded['negociacion_id']) ? (int) $decoded['negociacion_id'] : null,
                ];
            }
        }

        return [
            'status' => $process->getExitCode() ?? 0,
            'message' => trim($out) !== '' ? trim($out) : 'Sin salida del worker',
            'negociacion_id' => null,
        ];
    }

    private function limpiarQa(array $ctx): void
    {
        if (! str_starts_with((string) $ctx['tag'], 'QALCK')) {
            throw new \RuntimeException('Limpieza abortada: el tag no es de QA.');
        }

        DB::table('lotes')->where('id', $ctx['lote_id'])->update(['negociacion_activa_id' => null]);

        $negIds = Negociacion::withTrashed()->where('lote_id', $ctx['lote_id'])->pluck('id');
        if ($negIds->isNotEmpty()) {
            PlanPagoTerreno::whereIn('negociacion_id', $negIds)->delete();
            Negociacion::withTrashed()->whereIn('id', $negIds)->forceDelete();
        }

        Lote::withTrashed()->where('id', $ctx['lote_id'])->forceDelete();
        Parcela::withTrashed()->where('id', $ctx['parcela_id'])->forceDelete();
        Finca::withTrashed()->where('id', $ctx['finca_id'])->forceDelete();
        Cliente::withTrashed()->whereIn('id', [$ctx['cliente_a_id'], $ctx['cliente_b_id']])->forceDelete();

        DB::table('personal_access_tokens')
            ->where('tokenable_id', $ctx['user_id'])
            ->where('tokenable_type', User::class)
            ->delete();

        User::where('id', $ctx['user_id'])->where('email', 'like', '%@parcelia.test')->delete();
        Sucursal::withTrashed()->where('id', $ctx['sucursal_id'])->where('codigo', $ctx['tag'])->forceDelete();
    }
}
