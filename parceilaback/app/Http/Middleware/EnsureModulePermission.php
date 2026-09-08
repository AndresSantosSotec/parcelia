<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModulePermission
{
    public function handle(Request $request, Closure $next, string $modulo, string $accion): Response
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission($modulo, $accion)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para esta operación.',
            ], 403);
        }

        return $next($request);
    }
}
