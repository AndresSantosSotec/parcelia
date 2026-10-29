#!/bin/bash

# Script para sincronizar y asignar permisos a todos los usuarios existentes en producción
# Detecta automáticamente ea-php83 (cPanel) o php estándar

if command -v ea-php83 >/dev/null 2>&1; then
    PHP_BIN="ea-php83"
else
    PHP_BIN="php"
fi

echo "========================================"
echo "  SINCRONIZAR PERMISOS Y ROLES"
echo "  Binario PHP: $PHP_BIN"
echo "========================================"
echo ""

echo "[1/5] Ejecutando migraciones pendientes (si las hay)..."
$PHP_BIN artisan migrate --force
echo ""

echo "[2/5] Poblando catálogo de departamentos y municipios de Guatemala..."
$PHP_BIN artisan db:seed --class=GuatemalaUbicacionSeeder --force
echo ""

echo "[3/5] Sincronizando permisos de todos los módulos y asignando a usuarios según su rol..."
$PHP_BIN artisan permissions:assign-missing --force
echo ""

echo "[4/5] Limpiando caché..."
$PHP_BIN artisan optimize:clear
echo ""

echo "[5/5] Verificación completada"
echo ""
echo "========================================"
echo "  PROCESO COMPLETADO EXITOSAMENTE"
echo "========================================"
echo ""
