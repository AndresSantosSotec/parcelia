# Estado de Desarrollo de Módulos - Sistema de Gestión de Empeños

Este documento detalla el estado actual de los módulos del sistema, clasificándolos entre aquellos que están completamente integrados con el backend y aquellos que funcionan con datos simulados (Mocks/LocalStorage).

## 🟢 Módulos Funcionales (Integrados con Backend)

Estos módulos cuentan con servicios dedicados (`src/services/*.service.ts` o `@/lib/api.ts`) y se comunican con la API de Laravel.

| Módulo | Estado | Descripción | APIs Relacionadas |
| :--- | :--- | :--- | :--- |
| **Créditos** | ✅ Completo | Gestión completa de créditos prendarios: solicitud, aprobación, desembolso, renovación, liquidación y anulación. | `CreditoPrendarioController`, `creditoPrendario.service.ts` |
| **Simulador** | ✅ Completo | Simulación de planes de pago y generación de proyecciones. Comparte lógica con créditos. | `CreditoPrendarioController`, `creditoPrendario.service.ts` |
| **Clientes** | ✅ Completo | CRUD de clientes, historial, y validaciones. | `ClienteController`, `clienteService` |
| **Usuarios** | ✅ Completo | Gestión de usuarios y roles (RBAC). | `UsuarioController`, `userService` |
| **Prendas** | ✅ Completo | Inventario de prendas, estados (en custodia, venta, etc) y detalles físicos. | `PrendaController`, `prenda.service.ts` |
| **Tasaciones** | ✅ Completo | Proceso de valuación de prendas previa al crédito. | `TasacionController`, `tasacion.service.ts` |

## 🟡 Módulos en Frontend / Mock (Requieren Integración)

Estos módulos tienen la interfaz de usuario desarrollada y funcionan visualmente, pero persisten los datos usando `useKV` (LocalStorage) o datos estáticos, por lo que **no están conectados al backend real**.

| Módulo | Estado | Tareas Pendientes |
| :--- | :--- | :--- |
| **Ventas** | ⚠️ Mock (KV) | Migrar de `useKV` a endpoints de Venta. Implementar carrito de compras real, facturación y salida de inventario. |
| **Cobros** | ⚠️ Mock (KV) | La interfaz usa `useKV` para registrar pagos. Debe integrarse con `Creditos` para procesar pagos reales (Abonos, Liquidaciones). *Nota: Parte de la lógica ya existe en `PagoWizard` pero el módulo principal de Cobros sigue aislado.* |
| **Caja** | ⚠️ Mock | Apertura y cierre de caja, movimientos de efectivo. Requiere backend para auditoría financiera. |
| **Reportes** | ⚠️ Mock | Gráficas y tablas estáticas. Necesita endpoints de agregación de datos (Analytics). |
| **Sucursales** | ⚠️ Mock | ABM de sucursales. Actualmente suele estar harcodeado o en configuración local. |
| **Categorías** | ⚠️ Mock | Gestión de categorías de productos. Necesita CRUD contra base de datos para configurar tasas por categoría. |

## 📅 Plan de Acción Recomendado

1.  **Prioridad Alta (Cobros y Ventas):**
    *   Integrar **Cobros** completamente con la lógica de Créditos (ya iniciada en `PagoWizard`).
    *   Conectar **Ventas** con el inventario real de `Prendas` (filtrar prendas con estado `en_venta`).

2.  **Prioridad Media (Caja):**
    *   Implementar backend para el control de flujo de efectivo (Arqueos).

3.  **Prioridad Baja (Configuración/Reportes):**
    *   Migrar catálogos (Sucursales, Categorías) a base de datos.
    *   Desarrollar endpoints específicos para reportes pesados.
