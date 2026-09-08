<?php

namespace App\Support;

class EmpenosAccess
{
    public static function enabled(): bool
    {
        return (bool) config('empenos.enabled', false);
    }

    public static function isHiddenModule(string $modulo): bool
    {
        if (self::enabled()) {
            return false;
        }

        return in_array($modulo, config('empenos.hidden_modules', []), true);
    }

    public static function isBlockedPath(string $path): bool
    {
        if (self::enabled()) {
            return false;
        }

        foreach (config('empenos.blocked_path_patterns', []) as $pattern) {
            if (preg_match($pattern, $path) === 1) {
                return true;
            }
        }

        return false;
    }
}
