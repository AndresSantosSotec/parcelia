# Planning Guide

Sistema integral de gestión para casa de empeño que permite administrar clientes, prendas, créditos prendarios, cobros, caja y reportes con control de usuarios y roles.

**Experience Qualities**:
1. **Professional** - El sistema debe transmitir seriedad y confianza para manejar operaciones financieras críticas
2. **Efficient** - Flujos optimizados que permiten completar transacciones rápidamente sin sacrificar precisión
3. **Transparent** - Información clara y visible sobre el estado de cada operación, crédito y movimiento de caja

**Complexity Level**: Complex Application (advanced functionality, accounts)
  - Sistema multi-módulo con gestión de roles, permisos, flujos financieros, estados de prendas, renovaciones automáticas y múltiples reportes

## Essential Features

### 0. Sistema de Login
- **Functionality**: Autenticación de usuarios con credenciales (usuario y contraseña), persistencia de sesión, visualización de rol en header, logout
- **Purpose**: Controlar acceso al sistema según roles y mantener seguridad de la información
- **Trigger**: Usuario accede a la aplicación sin sesión activa
- **Progression**: Ver pantalla de login → Ingresar credenciales → Validar usuario → Establecer sesión → Acceder al dashboard → Usuario puede cerrar sesión desde menú de perfil en header
- **Success criteria**: Sesión persiste entre recargas de página, usuarios solo pueden acceder con credenciales válidas, logout limpia la sesión correctamente
- **Status**: ✅ IMPLEMENTADO

### 1. Gestión de Clientes
- **Functionality**: CRUD completo con datos personales (nombres, apellidos, DPI, fecha nacimiento, género, teléfono, email, dirección, foto), estado (activo/inactivo), tipo (regular/VIP), sucursal asignada, eliminación lógica, búsqueda avanzada por múltiples campos, filtros por estado y tipo, cards dinámicas que destacan clientes VIP y con créditos vencidos, historial de empeños con resumen de créditos activos y vencidos
- **Purpose**: Mantener registro completo de clientes con categorización y acceder rápidamente a su historial
- **Trigger**: Usuario selecciona módulo de clientes o busca durante creación de crédito
- **Progression**: Ver lista de clientes → Buscar/Filtrar por múltiples criterios → Ver cards con indicadores visuales → Seleccionar cliente → Ver detalle completo con historial → Editar si necesario → Eliminar con validación (soft delete)
- **Success criteria**: Crear/editar cliente en menos de 1 minuto, buscar instantáneamente por cualquier campo, identificar visualmente clientes VIP y con problemas, eliminar solo si no tiene créditos activos
- **Status**: ✅ IMPLEMENTADO

### 2. Simulador/Cotizador
- **Functionality**: Calcular avalúo, monto comercial (80%), monto máximo de préstamo (60% del avalúo), intereses por período, monto total al vencer, fecha límite, plan de pagos con múltiples cuotas mostrando monto y fecha de cada cuota, guardar cotizaciones, convertir a crédito
- **Purpose**: Proporcionar cotizaciones rápidas y detalladas con opciones de financiamiento
- **Trigger**: Cliente solicita información sobre cuánto puede obtener por una prenda
- **Progression**: Ingresar avalúo de prenda → Definir plazo → Opcional: activar plan de pagos y definir número de cuotas → Sistema calcula automáticamente todos los valores → Ver detalle de cada cuota con fechas → Guardar cotización o convertir a crédito
- **Success criteria**: Generar cotización en menos de 30 segundos con cálculos precisos, visualizar plan de cuotas completo, guardar y recuperar cotizaciones
- **Status**: ✅ IMPLEMENTADO

### 3. Empeño/Crédito
- **Functionality**: CRUD completo con selección de cliente, datos de prenda (descripción, categoría, fotos), avalúo, monto comercial (auto-calculado), monto prestado (validado contra máximo 60%), tasa de interés, plazo, fecha vencimiento (auto-calculada), saldo actual, cálculo automático de intereses, número de crédito único, estado, generación automática de prenda asociada
- **Purpose**: Registrar formalmente la transacción de préstamo con garantía prendaria
- **Trigger**: Cliente acepta condiciones y procede con el empeño
- **Progression**: Seleccionar cliente activo → Ingresar descripción detallada de prenda → Agregar fotos → Definir avalúo → Sistema calcula monto máximo → Ajustar monto prestado → Definir términos (tasa, plazo) → Ver resumen con totales → Generar crédito y prenda asociada
- **Success criteria**: Crear crédito completo en menos de 3 minutos, validaciones automáticas, número único, prenda creada automáticamente
- **Status**: ✅ IMPLEMENTADO

### 4. Acciones sobre Créditos
- **Functionality**: Renovar crédito (extiende plazo por mismo período), cancelar crédito (cliente paga y recupera prenda, marca prenda como recuperada), pasar prenda a venta (marca crédito como vendido y prenda como en_venta), ver detalle completo con información de cliente y prenda, historial de renovaciones, días restantes con alertas visuales
- **Purpose**: Gestionar el ciclo de vida completo de cada crédito según acciones del cliente
- **Trigger**: Vencimiento de plazo, pago del cliente, o decisión de pasar a venta
- **Progression**: Ver detalle de crédito → Seleccionar acción (renovar/cancelar/vender) → Ver confirmación con detalles → Confirmar → Sistema actualiza estados automáticamente → Registra en historial
- **Success criteria**: Cada acción actualiza correctamente todos los estados relacionados, confirmaciones claras, actualizaciones atómicas
- **Status**: ✅ IMPLEMENTADO

### 5. Gestión de Prendas
- **Functionality**: Vista de todas las prendas con estados (Empeñado, Vencido, Evaluación, En venta, Apartado, Vendido, Recuperado, Cancelado) incluyendo descripción, categoría, fotos, avalúo, precio sugerido, fechas, ubicación en bodega, búsqueda y filtros avanzados por estado
- **Purpose**: Controlar inventario físico y estado legal de cada prenda con visualización tipo galería
- **Trigger**: Necesidad de consultar inventario o buscar prenda específica
- **Progression**: Ver catálogo de prendas → Filtrar por estado → Seleccionar prenda → Ver detalle completo con historial → Editar precio o cambiar estado
- **Success criteria**: Visualización clara del inventario total con búsqueda rápida y actualización de estados en tiempo real
- **Status**: ✅ IMPLEMENTADO

### 6. Caja
- **Functionality**: Apertura de caja con monto inicial, registro automático de movimientos (créditos entregados, ventas efectivo, pagos recibidos), visualización en tiempo real de ingresos y egresos, cierre de caja con conteo físico, cálculo automático de diferencias, validación de caja única abierta
- **Purpose**: Control estricto del efectivo físico y conciliación diaria automática
- **Trigger**: Inicio de jornada (apertura) y fin de jornada (cierre)
- **Progression**: Apertura con monto inicial → Registrar automáticamente movimientos del día → Ver tabla detallada con hora, tipo y monto → Cierre con conteo físico → Comparar contra movimientos → Generar reporte de cuadre con alertas de sobrantes/faltantes
- **Success criteria**: Cuadre de caja preciso con trazabilidad de todos los movimientos, detección automática de diferencias, prevención de múltiples cajas abiertas
- **Status**: ✅ IMPLEMENTADO

### 7. Cobros
- **Functionality**: Buscar crédito por número o DPI del cliente, calcular automáticamente intereses acumulados y mora por días vencidos, registrar pagos parciales o totales, aplicar pago primero a mora, luego intereses y finalmente capital, actualizar saldo del crédito, generar recibo detallado con desglose, lista de créditos pendientes con acceso rápido
- **Purpose**: Procesar pagos de cuotas o liquidaciones totales con cálculos automáticos precisos
- **Trigger**: Cliente realiza pago
- **Progression**: Buscar crédito → Sistema calcula saldo + intereses + mora → Ver desglose detallado → Ingresar monto pagado → Aplicar pago con priorización automática → Generar recibo con desglose → Actualizar estado si es liquidación total
- **Success criteria**: Cálculo automático preciso de intereses y mora, recibo detallado inmediato, actualización correcta de saldos
- **Status**: ✅ IMPLEMENTADO

### 8. Renovación Automática
- **Functionality**: Identificar créditos vencidos, aplicar automáticamente interés del próximo período, cambiar fecha de vencimiento, generar nuevo estado financiero, notificación opcional
- **Purpose**: Automatizar el proceso de renovación cuando el cliente no paga ni recupera la prenda
- **Trigger**: Fecha de vencimiento cumplida sin acción del cliente
- **Progression**: Sistema detecta vencimiento → Calcula interés del período → Añade interés al saldo → Establece nueva fecha de vencimiento → Notifica cliente (opcional) → Registra renovación en historial
- **Success criteria**: Renovaciones procesadas automáticamente a medianoche con cálculos correctos y notificaciones enviadas

### 9. Historial
- **Functionality**: Línea de tiempo cronológica con todos los eventos del sistema (créditos creados, pagos realizados, renovaciones, ventas, cancelaciones, recuperaciones), filtros por tipo de evento, búsqueda por descripción o referencias, iconografía distintiva por tipo, visualización de montos asociados, ordenamiento descendente
- **Purpose**: Auditoría completa y análisis de comportamiento de clientes con trazabilidad total
- **Trigger**: Consulta de historial para auditoría o análisis
- **Progression**: Ver línea de tiempo completa → Filtrar por tipo de evento → Buscar por término → Ver detalles de cada evento con fecha, hora y monto
- **Success criteria**: Historial completo cronológico con todos los eventos relevantes, búsqueda eficiente, visualización clara
- **Status**: ✅ IMPLEMENTADO

### 10. Reportes
- **Functionality**: Dashboard analítico con métricas clave (créditos activos/vencidos, ventas del mes, utilidad, clientes), reportes financieros detallados (ingresos por fuente, utilidades por ventas, intereses y mora cobrados), reporte de cartera (capital en circulación, capital vencido, renovaciones), reporte de ventas con listado completo, resumen de clientes, visualización por tabs organizados
- **Purpose**: Análisis de negocio y toma de decisiones gerenciales con datos precisos
- **Trigger**: Necesidad de información estratégica o reportes regulares
- **Progression**: Acceder a reportes → Ver métricas generales → Seleccionar tab específico (Financiero/Cartera/Ventas/Clientes) → Analizar datos detallados → Exportar a PDF si necesario
- **Success criteria**: Reportes precisos con cálculos automáticos, organización clara por categorías, visualización de tendencias
- **Status**: ✅ IMPLEMENTADO

### 11. Módulo de Ventas
- **Functionality**: Gestión completa del ciclo de venta de prendas desde que quedan disponibles (créditos vencidos) hasta su venta final, incluyendo tasación para venta, inventario disponible, apartados con enganche, ventas con múltiples formas de pago, planes de pago/ventas a crédito, y registro automático en caja
- **Purpose**: Maximizar recuperación de capital convirtiendo prendas vencidas en ventas rentables con opciones de financiamiento
- **Trigger**: Crédito vence sin renovación, o tasador decide pasar prenda a venta
- **Progression**: Prenda vence → Tasador establece precio de venta y margen → Prenda aparece en inventario de ventas → Cliente puede apartar con enganche → O comprar con pago único/múltiples formas de pago → O solicitar plan de pagos → Sistema genera factura/recibo → Actualiza estado a vendida → Registra ingreso en caja → Genera utilidad
- **Success criteria**: Venta completa en menos de 2 minutos, cálculos automáticos de margen y utilidad, planes de pago con cuotas y seguimiento de pagos, integración perfecta con caja y contabilidad

### 12. Usuarios y Roles
- **Functionality**: Gestionar usuarios (Administrador, Cajero, Tasador, Supervisor, Vendedor) con permisos diferenciados, visualización de roles predefinidos con descripciones, lista de usuarios activos con avatares, matriz de permisos detallada por módulo y rol, conteo de usuarios por rol
- **Purpose**: Seguridad y control de acceso según responsabilidades con gestión visual clara
- **Trigger**: Administración de personal y permisos del sistema
- **Progression**: Ver usuarios activos → Ver roles disponibles con permisos → Consultar matriz de permisos → Crear/editar usuarios → Asignar rol específico
- **Success criteria**: Control granular de permisos con visualización clara, comprensión inmediata de niveles de acceso
- **Status**: ✅ IMPLEMENTADO

### 13. Modo Oscuro / Theme Switcher
- **Functionality**: Selector de tema en menú de usuario con 3 opciones (Claro, Oscuro, Sistema), persistencia de preferencia usando useKV, aplicación automática de tema del sistema, transición suave entre temas, paleta de colores completa adaptada para modo oscuro
- **Purpose**: Mejorar experiencia visual y reducir fatiga ocular en diferentes condiciones de iluminación
- **Trigger**: Usuario selecciona preferencia de tema desde dropdown
- **Progression**: Acceder a menú de usuario → Seleccionar Tema → Elegir Claro/Oscuro/Sistema → Tema se aplica instantáneamente → Preferencia se guarda automáticamente
- **Success criteria**: Cambio de tema inmediato, persistencia entre sesiones, todos los componentes se adaptan correctamente
- **Status**: ✅ IMPLEMENTADO

## Edge Case Handling
- **Crédito sin cliente registrado**: Permitir crear cliente rápido desde flujo de crédito con datos mínimos
- **Pago mayor al saldo**: Aplicar pago completo y generar cambio o aplicar a otro crédito del mismo cliente
- **Renovación manual vs automática**: Permitir renovación manual antes del vencimiento con confirmación
- **Prenda sin foto**: Permitir crédito sin foto pero con advertencia visual
- **Múltiples cajas abiertas**: Prevenir apertura si ya existe caja abierta sin cerrar
- **Usuario sin permisos**: Mostrar mensaje claro de acceso denegado con contacto de administrador
- **Avalúo modificado post-crédito**: No permitir modificación de avalúo una vez creado el crédito, solo nuevas tasaciones
- **Cliente con múltiples créditos activos**: Permitir pero mostrar advertencia con lista de créditos activos

## Design Direction
El diseño debe evocar profesionalismo bancario con eficiencia operativa - debe sentirse serio y confiable como software financiero pero ágil como herramienta de punto de venta. Interfaz rica con información densa pero organizada mediante cards, tabs y estados visuales claros.

## Color Selection
Custom palette que comunica confianza financiera y claridad operativa.

- **Primary Color**: Azul corporativo profundo (oklch(0.45 0.12 250)) - comunica confianza, seguridad y profesionalismo bancario, usado en botones principales y encabezados
- **Secondary Colors**: Gris pizarra (oklch(0.55 0.01 260)) para elementos secundarios que no compiten con acciones principales, y azul claro (oklch(0.85 0.05 250)) para fondos de secciones
- **Accent Color**: Verde esmeralda vibrante (oklch(0.55 0.15 160)) para acciones positivas (cobros completados, prendas recuperadas, caja cuadrada) y estados exitosos
- **Destructive**: Rojo alerta (oklch(0.55 0.22 25)) para acciones peligrosas (pasar a venta, cancelar crédito) y estados de mora
- **Warning**: Amarillo ámbar (oklch(0.75 0.15 85)) para renovaciones automáticas y créditos próximos a vencer
- **Foreground/Background Pairings**:
  - Background (Blanco - oklch(0.98 0 0)): Foreground gris oscuro (oklch(0.25 0.01 260)) - Ratio 12.5:1 ✓
  - Card (Blanco - oklch(1 0 0)): Foreground gris oscuro (oklch(0.25 0.01 260)) - Ratio 13.1:1 ✓
  - Primary (Azul - oklch(0.45 0.12 250)): Foreground blanco (oklch(1 0 0)) - Ratio 7.8:1 ✓
  - Secondary (Gris - oklch(0.55 0.01 260)): Foreground blanco (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Accent (Verde - oklch(0.55 0.15 160)): Foreground blanco (oklch(1 0 0)) - Ratio 5.1:1 ✓
  - Muted (Gris claro - oklch(0.95 0.005 260)): Foreground gris medio (oklch(0.45 0.01 260)) - Ratio 7.1:1 ✓

## Font Selection
Tipografía que proyecta claridad numérica y profesionalismo corporativo, utilizando Inter para UI y JetBrains Mono para datos financieros y números de crédito.

- **Typographic Hierarchy**:
  - H1 (Títulos de módulo): Inter Bold / 32px / -0.02em tracking / line-height 1.2
  - H2 (Títulos de sección): Inter Semibold / 24px / -0.01em tracking / line-height 1.3
  - H3 (Subtítulos y cards): Inter Semibold / 18px / normal tracking / line-height 1.4
  - Body (Texto general): Inter Regular / 15px / normal tracking / line-height 1.6
  - Small (Etiquetas y metadata): Inter Regular / 13px / normal tracking / line-height 1.5
  - Numbers (Montos y créditos): JetBrains Mono Medium / 16px / normal tracking / line-height 1.5 / tabular-nums
  - Button text: Inter Medium / 14px / normal tracking / line-height 1

## Animations
Animaciones sutiles que comunican cambios de estado financiero y flujo de dinero, con énfasis en transiciones de estados de créditos y prendas que refuerzan la seriedad de las operaciones.

- **Purposeful Meaning**: Uso de motion para indicar flujo de dinero (entrada/salida de caja), cambios de estado críticos (empeñado → venta), y confirmación de operaciones exitosas
- **Hierarchy of Movement**: 
  - Alta prioridad: Confirmaciones de pagos, cierre de caja, alertas de vencimiento
  - Media prioridad: Cambios de estado de prenda, navegación entre módulos
  - Baja prioridad: Hover de botones, expansión de detalles

## Component Selection
- **Components**: 
  - Dialog para creación/edición de clientes, créditos y configuración de permisos
  - Card para mostrar resúmenes de créditos, prendas y movimientos de caja
  - Table para listas de clientes, créditos activos, reportes y movimientos
  - Tabs para organizar secciones dentro de créditos (datos, fotos, historial, pagos)
  - Badge para estados de prenda y alertas de vencimiento
  - Form con Input, Select, Textarea para captura de datos
  - Calendar para selección de fechas de vencimiento y filtros de reportes
  - Avatar para fotos de cliente y prenda
  - Alert para confirmaciones de acciones críticas
  - Toast (Sonner) para feedback de operaciones completadas
  - Sheet para panel lateral de búsqueda rápida y detalles
  - Separator para dividir secciones dentro de módulos complejos
  - Progress para indicar estado de pago de créditos
- **Customizations**: 
  - StatusBadge component con colores específicos para cada estado de prenda
  - MoneyDisplay component con formato de moneda consistente usando JetBrains Mono
  - CreditCard component para vista resumida de créditos con indicador visual de días restantes
  - TimelineItem component para visualización de historial
  - PermissionMatrix component para gestión visual de permisos por rol
- **States**: 
  - Buttons tienen estados hover con elevación sutil, active con escala 0.98, disabled con opacidad 0.5
  - Inputs tienen borde azul en focus, borde rojo en error con mensaje debajo
  - Cards tienen hover con sombra elevada, seleccionadas con borde azul grueso
  - Status badges tienen animación de pulso para estados activos/urgentes
- **Icon Selection**: 
  - @phosphor-icons/react: Wallet (caja), CreditCard (créditos), Users (clientes), Package (prendas), ChartBar (reportes), Calculator (simulador), Receipt (cobros), Clock (renovaciones), UserCircle (roles)
- **Spacing**: 
  - Containers: padding de 6 (24px)
  - Cards: padding de 4 (16px), gap de 4 entre elementos internos
  - Forms: gap de 4 entre campos, gap de 6 entre secciones
  - Listas: gap de 2 (8px) entre items
  - Botones: padding x de 4, y de 2
- **Mobile**: 
  - Navegación lateral se convierte en Sheet (menú hamburguesa) con ícono de menú en header
  - Header se ajusta con padding responsivo (px-4 en mobile, px-6 en desktop)
  - Grid de dashboard usa 2 columnas en mobile, 4 en desktop (grid-cols-2 lg:grid-cols-4)
  - Cards de clientes y cotizaciones usan 1 columna en mobile, 2 en tablet, 3 en desktop
  - Botones de acción ocupan ancho completo en mobile (w-full sm:w-auto)
  - Títulos y textos se escalan con clases responsivas (text-2xl sm:text-3xl)
  - ClienteDetalle usa layout vertical en mobile, grid de 3 columnas en desktop
  - CreditCard optimizado con texto truncado y layout flexible
  - Elementos de formulario se apilan verticalmente en mobile
  - Spacing se reduce en mobile (space-y-4 sm:space-y-6, gap-3 sm:gap-4)
  - MoneyDisplay usa tamaños responsivos (text-xs sm:text-sm para size="sm")
  - Dialogs ocupan full screen en mobile
  - Sidebar de filtros se implementa con Sheet deslizable
  - Touch targets mantienen mínimo 44px en todas las resoluciones


y luego dame unc aconuslta aprar arrgalr eso a nivel db por que le dio ese isue 
para dopier arrgalr ese d