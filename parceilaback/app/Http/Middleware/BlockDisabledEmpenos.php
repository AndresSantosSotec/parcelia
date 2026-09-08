<?php

namespace App\Http\Middleware;

use App\Support\EmpenosAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockDisabledEmpenos
{
    public function handle(Request $request, Closure $next): Response
    {
        if (EmpenosAccess::isBlockedPath($request->path())) {
            abort(404);
        }

        return $next($request);
    }
}
