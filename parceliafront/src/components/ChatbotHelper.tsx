import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Chats, X, PaperPlaneRight, Robot, User } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

const KNOWLEDGE_BASE = {
  modulos: {
    clientes: {
      descripcion: 'Base de datos de clientes con historial completo de operaciones',

      funciones: [
        'Crear/editar cliente con datos personales completos',
        'Código único auto-generado por sucursal',
        'Tipos: regular (común), vip (frecuente), corporativo (empresa)',
        'Estados: activo (puede operar), inactivo (bloqueado)',
        'Búsqueda avanzada: nombre, DPI, teléfono, email, código',
        'Foto del cliente (upload desde cámara o archivo)',
        'Historial completo de créditos (activos, pagados, vencidos)',
        'Estadísticas: total_creditos, activos, vencidos, monto_total',
        'Ver ficha completa con gráficos y resumen',
        'Filtros: estado, tipo, género, sucursal',
        'Exportar a Excel/PDF',
        'Ordenar: nombre, DPI, fecha registro',
        'Paginación optimizada (cursor o tradicional)',
        'NO se puede eliminar si tiene créditos activos',
        'Soft delete (marcado como eliminado, no borrado físico)'
      ],

      validaciones: {
        dpi: {
          formato: '13 dígitos únicos',
          ejemplo: '2905199220101',
          validacion: 'Algoritmo de verificación CUI',
          unico: 'No puede repetirse en el sistema'
        },
        nombres: {
          requerido: true,
          maximo: '100 caracteres',
          ejemplo: 'Juan Carlos'
        },
        apellidos: {
          requerido: true,
          maximo: '100 caracteres',
          ejemplo: 'García López'
        },
        telefono: {
          formato: '8 dígitos para Guatemala',
          ejemplo: '12345678',
          maximo: '20 caracteres (internacional)'
        },
        email: {
          formato: 'email válido',
          ejemplo: 'cliente@email.com',
          unico: 'Recomendado pero no obligatorio'
        },
        nit: {
          formato: 'C/F o NIT válido',
          ejemplo: 'C/F o 12345678-9',
          opcional: true
        },
        direccion: {
          requerido: false,
          maximo: '500 caracteres',
          ejemplo: 'Zona 1, Ciudad de Guatemala'
        }
      },

      tipos: {
        regular: {
          descripcion: 'Cliente común, operaciones normales',
          beneficios: 'Acceso estándar',
          icono: 'user'
        },
        vip: {
          descripcion: 'Cliente frecuente, buen historial',
          beneficios: 'Tasas preferenciales, plazos extendidos',
          icono: 'crown'
        },
        corporativo: {
          descripcion: 'Empresa o institución',
          beneficios: 'Créditos mayores, facturación',
          icono: 'building'
        }
      },

      estados: {
        activo: {
          descripcion: 'Puede solicitar créditos y operar',
          color: 'verde',
          puede_crear_credito: true
        },
        inactivo: {
          descripcion: 'Bloqueado, no puede operar',
          color: 'gris',
          puede_crear_credito: false,
          razones: ['Morosidad alta', 'Fraude', 'Solicitud del cliente']
        }
      },

      flujo: `
📝 CREAR CLIENTE:

1️⃣ Datos Personales:
   • Nombres (requerido)
   • Apellidos (requerido)
   • DPI (13 dígitos únicos)
   • Fecha nacimiento
   • Género: masculino/femenino/otro
   • Estado civil

2️⃣ Contacto:
   • Teléfono principal (requerido)
   • Teléfono secundario (opcional)
   • Email (opcional pero recomendado)
   • Dirección completa

3️⃣ Datos Adicionales:
   • NIT (C/F por defecto)
   • Profesión u oficio
   • Referencias personales
   • Sucursal asignada

4️⃣ Foto (Opcional):
   • Subir foto desde archivo
   • Tomar con cámara
   • Formatos: JPG, PNG (max 2MB)

5️⃣ Configuración:
   • Tipo: regular/vip/corporativo
   • Estado: activo (por defecto)
   • Código auto-generado: CLI-SUC-001

6️⃣ Guardar:
   • Validar datos
   • Sistema verifica DPI único
   • Genera código único
   • Cliente listo para créditos ✅
`,

      historial: {
        muestra: [
          'Total de créditos creados',
          'Créditos activos (vigente, en_mora)',
          'Créditos vencidos sin pagar',
          'Créditos pagados',
          'Monto total prestado históricamente',
          'Puntualidad de pagos (%)',
          'Última operación (fecha)'
        ],
        alertas: [
          '⚠️ Créditos vencidos → NO puede crear nuevo',
          '⚠️ Mora alta → Requiere autorización',
          '✅ Buen historial → Tipo VIP automático'
        ]
      },

      errores_comunes: [
        {
          error: 'DPI ya existe en el sistema',
          causa: 'Otro cliente registrado con mismo DPI',
          solucion: 'Buscar cliente existente, no duplicar',
          verificar: 'Revisar si es mismo cliente con datos diferentes'
        },
        {
          error: 'No se puede eliminar: tiene créditos activos',
          causa: 'Cliente tiene créditos vigentes o en mora',
          solucion: 'Esperar a que liquide créditos o marcar como inactivo',
          alternativa: 'Cambiar estado a "inactivo" en lugar de eliminar'
        },
        {
          error: 'DPI inválido: debe tener 13 dígitos',
          causa: 'DPI con formato incorrecto',
          solucion: 'Ingresar 13 dígitos sin espacios ni guiones',
          ejemplo: '2905199220101 (correcto) vs 2905-19922-0101 (incorrecto)'
        }
      ],

      tips: [
        '📸 Foto del cliente ayuda a identificarlo rápidamente',
        '📞 Validar teléfono: llamar antes de guardar',
        '✅ DPI: verificar documento físico',
        '💡 Tipo VIP: clientes con 5+ créditos pagados',
        '📝 Dirección completa facilita cobros',
        '🔍 Antes de crear: buscar si ya existe',
        '⚠️ Cliente inactivo: indicar razón en observaciones'
      ],

      ficha_completa: {
        incluye: [
          'Datos personales con foto',
          'Información de contacto',
          'Historial de créditos (tabla)',
          'Gráfico: créditos por estado',
          'Estadísticas numéricas',
          'Línea de tiempo de operaciones',
          'Documentos adjuntos (DPI, NIT)',
          'Observaciones y notas'
        ],
        acciones: [
          'Editar datos',
          'Cambiar foto',
          'Marcar como VIP',
          'Activar/Inactivar',
          'Ver créditos',
          'Nuevo crédito',
          'Imprimir ficha',
          'Eliminar (si no tiene créditos)'
        ]
      }
    },
    creditos: {
      descripcion: 'Gestión completa de créditos prendarios: desde solicitud hasta liquidación',

      funciones: [
        'Wizard guiado de 5 pasos para crear crédito',
        'Tasación de prendas con fotos y datos técnicos',
        'Aprobación/rechazo con notas justificativas',
        'Desembolso automático registrado en caja',
        'Plan de pagos con cuotas calculadas',
        'Registro de pagos: capital + intereses + mora',
        'Cálculo AUTOMÁTICO de intereses y mora',
        'Estados: solicitado, en_analisis, aprobado, vigente, vencido, en_mora, pagado, cancelado',
        'Contrato PDF con código QR y código de barras',
        'Recibo de pago PDF descargable',
        'Simulador: calcular cuota antes de aprobar',
        'Historial completo de transacciones',
        'Filtros: estado, cliente, monto, fecha',
        'Estadísticas: totales por estado, mora acumulada',
        'Auditoría completa de cambios'
      ],

      validaciones: {
        solicitud: {
          cliente: 'Debe estar activo y sin créditos vencidos',
          monto_solicitado: 'Mínimo Q100',
          prenda: 'Requiere al menos 1 prenda con tasación',
          tasacion: 'Valor >= monto solicitado'
        },
        aprobacion: {
          monto_aprobado: '≤ 80% del valor de tasación',
          tasa_interes: 'Entre 1% y 15% mensual',
          tasa_mora: 'Entre 0.1% y 2% diaria',
          plazo: 'Entre 1 y 365 días',
          requiere: 'Rol gerente o admin'
        },
        desembolso: {
          estado: 'Debe estar "aprobado"',
          caja: 'Usuario debe tener caja abierta',
          saldo: 'Caja debe tener efectivo suficiente',
          registro: 'Crea egreso automático'
        },
        pago: {
          monto_min: 'Q0.01',
          monto_max: 'Saldo total del crédito',
          caja: 'Usuario debe tener caja abierta',
          orden: '1° Mora, 2° Intereses, 3° Capital',
          registro: 'Crea ingreso automático'
        }
      },

      wizard_5_pasos: `
🎯 WIZARD CREAR CRÉDITO:

📝 PASO 1: SELECCIONAR CLIENTE
   • Buscar por nombre, DPI o código
   • Ver historial de créditos
   • Validar: activo, sin mora
   • Crear nuevo cliente si no existe
   • Mostrar resumen de operaciones

📦 PASO 2: REGISTRAR PRENDA(S)
   • Categoría (electrónica, joyas, etc.)
   • Marca, modelo, serie
   • Descripción detallada
   • Estado físico
   • Campos dinámicos por categoría:
     - Electrónica: IMEI, capacidad
     - Joyas: quilates, peso
     - Vehículos: placa, motor, año
   • Subir fotos (min 2, max 10)
   • Código único auto-generado

💎 PASO 3: TASACIÓN
   • Valor comercial (Q)
   • Observaciones del tasador
   • Monto sugerido = 70-80% tasación
   • Validar: tasación >= monto
   • Estado: pendiente/aprobada

⚙️ PASO 4: CONFIGURAR CRÉDITO
   • Monto aprobado
   • Tasa interés mensual (%)
   • Tasa mora diaria (%)
   • Plazo en días
   • Método cálculo:
     - Francesa (cuota fija)
     - Alemana (capital fijo)
     - Americana (solo intereses)
   • Frecuencia: diaria, semanal, mensual
   • Sistema calcula plan automático

✅ PASO 5: CONFIRMACIÓN
   • Resumen completo
   • Vista previa contrato
   • Plan de pagos
   • Botón "Crear Crédito"
   • Estado: "solicitado"
`,

      flujo_operativo: `
🔄 CICLO DE VIDA:

1️⃣ SOLICITUD (solicitado)
   • Wizard completo
   • Código: CRE-2026-0001
   • Acciones: Editar, Eliminar

2️⃣ ANÁLISIS (en_analisis)
   • Gerente revisa historial
   • Valida tasación vs monto
   • Puede: Aprobar/Rechazar
   • Requiere nota

3️⃣ APROBACIÓN (aprobado)
   • Plan de pagos generado
   • Contrato PDF listo
   • Código QR único
   • Acciones: Desembolsar, Cancelar

4️⃣ DESEMBOLSO (vigente)
   • Cajero entrega efectivo
   • Egreso automático en caja
   • Prenda a bóveda
   • Inicia cálculo intereses

5️⃣ PAGOS (vigente)
   • Cliente viene a pagar
   • Sistema calcula total
   • Orden: mora → interés → capital
   • Ingreso automático en caja
   • Recibo PDF

6️⃣ VENCIMIENTO (vencido)
   • Si fecha > vencimiento
   • Inicia cálculo de MORA
   • Alerta roja

7️⃣ MORA (en_mora)
   • Vencido + 30 días
   • Mora acumulada diaria
   • Acción urgente

8️⃣ LIQUIDACIÓN (pagado)
   • Capital + interés + mora = 0
   • Comprobante final
   • Prenda lista para retirar
   • Crédito cerrado ✅
`,

      calculos: {
        intereses: 'capital × (tasa/100) × (días/30)',
        mora: 'capital × (tasa_mora/100) × días_mora',
        cuota_francesa: 'PMT = P × [r(1+r)^n] / [(1+r)^n-1]'
      },

      estados: {
        solicitado: { color: 'azul', puede_pagar: false },
        en_analisis: { color: 'naranja', puede_pagar: false },
        aprobado: { color: 'verde', puede_desembolsar: true },
        vigente: { color: 'verde', puede_pagar: true, calcula_interes: true },
        vencido: { color: 'rojo', calcula_mora: true },
        en_mora: { color: 'rojo oscuro', alerta: true },
        pagado: { color: 'gris', es_final: true },
        cancelado: { color: 'gris', es_final: true }
      },

      errores_comunes: [
        {
          error: 'No tienes caja abierta para desembolsar',
          solucion: 'Aperturar caja primero con saldo suficiente'
        },
        {
          error: 'Saldo insuficiente en caja',
          solucion: 'Hacer incremento (traer dinero de bóveda)'
        },
        {
          error: 'Cliente tiene créditos vencidos',
          solucion: 'Cliente debe pagar mora primero'
        },
        {
          error: 'Prenda sin fotos',
          solucion: 'Subir mínimo 2 fotos en paso 2'
        }
      ],

      tips: [
        '📸 Fotos claras de varios ángulos',
        '💰 Tasación conservadora (mejor bajo)',
        '📋 Descripción muy detallada',
        '⚠️ Revisar historial antes de aprobar',
        '🔢 Usar simulador primero',
        '💵 Verificar saldo caja antes de desembolsar',
        '🏷️ Etiquetar prenda con código'
      ]
    },
    categorias: {
      descripcion: 'Clasificación de productos para prendas y gestión de tasas',

      funciones: [
        'Crear categorías de productos (electrónica, joyas, vehículos, etc.)',
        'Código único auto-generado: CAT-001, CAT-002...',
        'Nombre y descripción de la categoría',
        'Color e ícono personalizados para UI',
        'Orden de visualización configurable',
        'Estado: activa/inactiva',
        'Tasas por defecto de la categoría:',
        '  • Tasa de interés mensual (%)',
        '  • Tasa de mora diaria (%)',
        '  • Porcentaje máximo de préstamo (70-90%)',
        '  • Plazo máximo en días',
        'Método de cálculo por defecto (francesa, alemana, americana)',
        'Campos dinámicos personalizados por categoría',
        'Filtros: activas, inactivas, búsqueda',
        'Estadísticas: total, activas, inactivas',
        'NO se puede eliminar si tiene prendas asociadas'
      ],

      validaciones: {
        codigo: {
          formato: 'CAT-XXX (auto-generado)',
          unico: true,
          ejemplo: 'CAT-001'
        },
        nombre: {
          requerido: true,
          maximo: '255 caracteres',
          ejemplo: 'Electrónica y Computación'
        },
        color: {
          formato: 'HEX #RRGGBB',
          ejemplo: '#3B82F6',
          opcional: true
        },
        icono: {
          tipo: 'Phosphor Icons',
          ejemplo: 'Laptop, DiamondsFour, Car',
          opcional: true
        },
        orden: {
          tipo: 'integer',
          minimo: 0,
          uso: 'Para ordenar en listas'
        },
        tasa_interes_default: {
          rango: '1% - 15% mensual',
          opcional: true,
          uso: 'Se aplica automáticamente al crear crédito'
        },
        tasa_mora_default: {
          rango: '0.1% - 2% diaria',
          opcional: true
        },
        porcentaje_prestamo_maximo: {
          rango: '30% - 90%',
          default: '80%',
          uso: 'Máximo que se puede prestar del valor tasado'
        }
      },

      campos_dinamicos: {
        que_son: 'Formularios personalizados por categoría de producto',
        tipos_campo: [
          'texto (string)',
          'numero (decimal)',
          'fecha',
          'booleano (sí/no)',
          'seleccion (dropdown)',
          'texto_largo (textarea)'
        ],
        ejemplo_electronica: [
          { nombre: 'IMEI', tipo: 'texto', requerido: true },
          { nombre: 'Capacidad', tipo: 'seleccion', opciones: ['16GB', '32GB', '64GB', '128GB'] },
          { nombre: 'Año fabricación', tipo: 'numero' },
          { nombre: 'Estado batería', tipo: 'seleccion', opciones: ['Excelente', 'Buena', 'Regular'] }
        ],
        ejemplo_joyas: [
          { nombre: 'Quilates', tipo: 'numero', requerido: true },
          { nombre: 'Peso (gramos)', tipo: 'numero', requerido: true },
          { nombre: 'Tipo piedra', tipo: 'seleccion', opciones: ['Diamante', 'Rubí', 'Esmeralda', 'Zafiro'] },
          { nombre: 'Metal', tipo: 'seleccion', opciones: ['Oro 10k', 'Oro 14k', 'Oro 18k', 'Plata'] }
        ],
        ejemplo_vehiculos: [
          { nombre: 'Placa', tipo: 'texto', requerido: true },
          { nombre: 'Motor', tipo: 'texto' },
          { nombre: 'Año', tipo: 'numero', requerido: true },
          { nombre: 'Kilometraje', tipo: 'numero' },
          { nombre: 'Transmisión', tipo: 'seleccion', opciones: ['Manual', 'Automática'] }
        ],
        uso: 'Al registrar prenda, se muestran estos campos automáticamente según su categoría'
      },

      flujo: `
📋 CREAR CATEGORÍA:

1️⃣ Datos Básicos:
   • Nombre (ej: "Electrónica y Computación")
   • Descripción (opcional)
   • Código: auto-generado (CAT-001)
   
2️⃣ Apariencia:
   • Color: picker visual (#3B82F6)
   • Ícono: seleccionar de catálogo
   • Orden: número para ordenar lista
   
3️⃣ Tasas y Límites:
   • Tasa interés: 10% mensual
   • Tasa mora: 0.5% diaria
   • % préstamo máx: 80%
   • Plazo máximo: 90 días
   
4️⃣ Configuración Crédito:
   • Método cálculo: Francesa (cuota fija)
   • Afecta interés mensual: Sí/No
   • Permite pago capital diferente: Sí/No
   
5️⃣ Campos Dinámicos (opcional):
   • Agregar campos personalizados
   • Ejemplo: IMEI, Capacidad, Año
   • Definir si es requerido
   • Opciones (si es selección)
   
6️⃣ Guardar:
   • Estado: Activa (por defecto)
   • Disponible en wizard de créditos ✅
`,

      uso_en_creditos: {
        paso_2_wizard: 'Al registrar prenda, seleccionar categoría',
        campos_automaticos: 'Se muestran campos dinámicos de la categoría',
        tasas_default: 'Tasa interés y mora se copian automáticamente al paso 4',
        limite_prestamo: 'Sistema valida que monto ≤ % configurado × tasación',
        ejemplo: 'Prenda tasada en Q1000, categoría con 80% → máximo prestar Q800'
      },

      errores_comunes: [
        {
          error: 'No se puede eliminar: tiene prendas asociadas',
          causa: 'Existen prendas usando esta categoría',
          solucion: 'Marcar como "inactiva" en lugar de eliminar',
          alternativa: 'Migrar prendas a otra categoría primero'
        },
        {
          error: 'Color inválido',
          causa: 'Formato de color incorrecto',
          solucion: 'Usar formato HEX: #RRGGBB (ej: #3B82F6)',
          tip: 'Usar el color picker visual'
        },
        {
          error: 'Tasa de interés muy alta',
          causa: 'Tasa > 15% mensual',
          solucion: 'Ajustar a rango permitido (1-15%)',
          razon: 'Límite legal de tasas de interés'
        }
      ],

      tips: [
        '🎨 Colores distintos facilitan identificación visual',
        '📊 Orden: categorías más usadas primero',
        '💡 Tasas conservadoras: evitar riesgos',
        '📝 Campos dinámicos: solo los ESENCIALES',
        '✅ Probar campos dinámicos antes de activar',
        '⚠️ Inactivar (no eliminar) categorías obsoletas',
        '🔄 Revisar tasas periódicamente'
      ],

      categorias_comunes: [
        { nombre: 'Electrónica y Computación', tasa: '10%', plazo: '90 días' },
        { nombre: 'Joyas y Metales Preciosos', tasa: '8%', plazo: '120 días' },
        { nombre: 'Vehículos', tasa: '12%', plazo: '180 días' },
        { nombre: 'Herramientas', tasa: '10%', plazo: '60 días' },
        { nombre: 'Instrumentos Musicales', tasa: '9%', plazo: '90 días' },
        { nombre: 'Electrodomésticos', tasa: '10%', plazo: '60 días' },
        { nombre: 'Maquinaria', tasa: '12%', plazo: '120 días' }
      ]
    },
    prendas: {
      descripcion: 'Gestión de artículos empeñados y en custodia',
      funciones: [
        'Registro con fotos múltiples',
        'Tasación y avalúo profesional',
        'Estados: en_custodia→recuperada/en_venta→vendida',
        'Condición física: excelente, muy_buena, buena, regular, mala',
        'Categorización por tipo de producto',
        'Ubicación física: sección, estante, caja',
        'Datos adicionales dinámicos (EAV)',
        'Campos personalizados por categoría',
        'Código único por prenda',
        'Historial de tasaciones',
        'Fotos: principal + galería',
        'Precio de venta configurable',
        'Información de mantenimiento'
      ],
      validaciones: [
        'Valor tasación > 0',
        'Porcentaje préstamo: 30%-90%',
        'Fotos: máximo 10 por prenda',
        'Solo puede estar "en_venta" si crédito está vencido/en_mora'
      ],
      estadosValidos: {
        en_custodia: 'Guardada en bóveda',
        recuperada: 'Cliente la recuperó pagando',
        en_venta: 'Publicada para venta (crédito vencido)',
        vendida: 'Ya fue vendida',
        perdida: 'Extraviada',
        deteriorada: 'Dañada',
        devuelta: 'Devuelta al cliente'
      }
    },
    ventas: {
      descripcion: 'Módulo de ventas de prendas y gestión de inventario',
      funciones: [
        'Venta de múltiples prendas en una transacción',
        'Tipos: contado, apartado, plan de pagos',
        'Métodos de pago: efectivo, tarjeta, transferencia, cheque, mixto',
        'Descuentos por prenda',
        'Facturación automática',
        'Registro de comprador',
        'Seguimiento de apartados',
        'Planes de pago con cuotas',
        'Generación de recibo PDF',
        'Control de pagos pendientes',
        'Cancelación de ventas',
        'Devolución de prendas a inventario',
        'Reporte de utilidad por venta',
        'Exportación a Excel'
      ],
      validaciones: [
        'Prenda debe estar en estado "en_venta"',
        'Precio venta >= valor préstamo',
        'Monto pago debe cuadrar con total',
        'Cliente opcional (puede ser venta general)'
      ]
    },
    caja: {
      descripcion: 'Control diario de efectivo: apertura, movimientos y cierre de caja',

      funciones: [
        'Apertura de caja con conteo de denominaciones',
        'Registro AUTOMÁTICO al cobrar créditos o ventas',
        'Tipos de movimientos: ingreso_pago, egreso_pago, incremento, decremento, gastos',
        'Arqueo de efectivo con billetes y monedas',
        'Cierre de caja con cuadre (físico vs esperado)',
        'Reporte de caja en PDF para imprimir',
        'NO permite abrir nueva si hay caja pendiente',
        'Restricción: SOLO UNA caja abierta por usuario',
        'Historial completo de aperturas/cierres',
        'Alerta si caja es de día anterior (requiere cierre)',
        'Admins pueden cerrar cajas de otros usuarios',
        'Exportar movimientos a Excel',
        'Filtros: usuario, fecha, sucursal, estado'
      ],

      validaciones: {
        apertura: {
          regla: 'NO puede abrir si tiene caja pendiente de cierre',
          mensaje: 'Debes cerrar la caja del día anterior primero',
          excepcion: 'Admins pueden reabrir'
        },
        saldo_inicial: {
          minimo: 'Q0.00',
          recomendado: 'Q500 - Q2,000',
          debe_cuadrar: 'Suma de denominaciones = saldo inicial'
        },
        cierre: {
          diferencia_maxima: 'Q100 (tolerancia)',
          requiere_justificacion: 'Si diferencia > Q100',
          bloquea_cierre: 'Si diferencia > Q500 sin autorización'
        },
        movimientos: {
          monto_minimo: 'Q0.01',
          requiere_concepto: true,
          auto_registrados: 'Pagos y ventas se registran solos'
        }
      },

      flujo_completo: `
📋 FLUJO DIARIO DE CAJA:

1️⃣ VERIFICAR ESTADO
   • Sistema verifica si hay caja pendiente
   • Si hay caja de día anterior → PRIMERO cerrarla
   • Si no hay caja → Puede aperturar

2️⃣ APERTURAR CAJA
   • Ingresar fecha de apertura (hoy por defecto)
   • Contar efectivo físico inicial:
     BILLETES: Q200, Q100, Q50, Q20, Q10, Q5
     MONEDAS: Q1, Q0.50, Q0.25, Q0.10, Q0.05
   • Sistema calcula total automático
   • Click "Aperturar Caja"
   • Estado: ABIERTA ✅

3️⃣ REGISTRAR MOVIMIENTOS (Durante el día)
   
   AUTOMÁTICOS (No requieren acción):
   • Cliente paga crédito → Ingreso a caja
   • Se hace venta → Ingreso a caja
   • Se desembolsa crédito → Egreso de caja
   
   MANUALES (Si es necesario):
   • Incremento: agregar dinero (ej: traer de bóveda)
   • Decremento: retirar dinero (ej: llevar a bóveda)
   • Gastos: pago de servicios, compras
   • Cada uno con concepto descriptivo

4️⃣ REVISAR MOVIMIENTOS
   • Ver listado completo del día
   • Total esperado = Saldo inicial + ingresos - egresos
   • Verificar si hay movimientos erróneos

5️⃣ ARQUEO FÍSICO (Al cierre)
   • Contar TODO el efectivo en caja
   • Billetes: Ingresar cantidad de cada denominación
   • Monedas: Ingresar cantidad de cada denominación
   • Sistema calcula: Total físico

6️⃣ VERIFICAR DIFERENCIA
   • Sistema compara:
     Total ESPERADO (según movimientos)
     vs
     Total FÍSICO (conteo real)
   
   • ✅ Diferencia = Q0: Perfecto, caja cuadrada
   • ⚠️ Diferencia <= Q100: Aceptable (errores mínimos)
   • ❌ Diferencia > Q100: Requiere explicación
   • 🚨 Diferencia > Q500: Requiere autorización de gerente

7️⃣ CERRAR CAJA
   • Agregar observaciones si hay diferencia
   • Click "Cerrar Caja"
   • Sistema genera reporte PDF automático
   • Estado: CERRADA 🔒
   • NO se puede reabrir ni modificar

8️⃣ REPORTE
   • Descargar PDF con resumen completo:
     - Fecha y hora de apertura/cierre
     - Usuario responsable
     - Saldo inicial
     - Todos los movimientos del día
     - Total esperado
     - Total físico contado
     - Diferencia (sobrante/faltante)
     - Desglose de denominaciones
     - Observaciones
`,

      estados: {
        abierta: {
          descripcion: 'Caja operativa, puede registrar movimientos',
          color: 'verde',
          puede_modificar: true,
          puede_cerrar: true,
          acciones: ['Registrar movimientos', 'Ver resumen', 'Cerrar']
        },
        cerrada: {
          descripcion: 'Caja finalizada, solo lectura',
          color: 'gris',
          puede_modificar: false,
          puede_cerrar: false,
          acciones: ['Ver historial', 'Imprimir reporte']
        }
      },

      tipos_movimiento: {
        ingreso_pago: {
          descripcion: 'Cliente pagó crédito (AUTOMÁTICO)',
          afecta_saldo: '+',
          requiere_concepto: 'Pago de crédito #XXXX',
          ejemplo: 'Cliente pagó Q500 del crédito #1234'
        },
        egreso_pago: {
          descripcion: 'Desembolso de crédito (AUTOMÁTICO)',
          afecta_saldo: '-',
          requiere_concepto: 'Desembolso crédito #XXXX',
          ejemplo: 'Se prestó Q1000 al cliente'
        },
        incremento: {
          descripcion: 'Agregar dinero a caja (MANUAL)',
          afecta_saldo: '+',
          requiere_concepto: true,
          ejemplo: 'Traer Q2000 de bóveda para cambio'
        },
        decremento: {
          descripcion: 'Retirar dinero de caja (MANUAL)',
          afecta_saldo: '-',
          requiere_concepto: true,
          ejemplo: 'Llevar Q5000 a bóveda (exceso)'
        },
        gastos: {
          descripcion: 'Pago de gastos operativos (MANUAL)',
          afecta_saldo: '-',
          requiere_concepto: true,
          ejemplo: 'Pago de luz Q350'
        }
      },

      errores_comunes: [
        {
          error: 'No puedes abrir caja: tienes una pendiente del XX/XX/XX',
          causa: 'Hay una caja abierta de día anterior sin cerrar',
          solucion: 'Cierra primero la caja anterior. Ir a "Ver Caja Activa" → Cerrar',
          prevencion: 'Cerrar caja TODOS los días antes de terminar turno'
        },
        {
          error: 'Ya cerraste tu caja hoy',
          causa: 'Intentas abrir segunda caja el mismo día',
          solucion: 'Solo se permite una caja por día. Esperar hasta mañana',
          excepcion: 'Admin puede abrir múltiples cajas'
        },
        {
          error: 'Diferencia de Q XXX requiere autorización',
          causa: 'El dinero físico NO cuadra con el esperado (diferencia grande)',
          solucion: '1. Recontar físico, 2. Revisar movimientos, 3. Solicitar autorización de gerente',
          prevencion: 'Arqueos parciales durante el día'
        },
        {
          error: 'El desglose no cuadra con el monto',
          causa: 'La suma de billetes/monedas ≠ monto ingresado',
          solucion: 'Verificar cantidades de cada denominación',
          tip: 'Usar calculadora para sumar'
        }
      ],

      tips: [
        '💡 Haz arqueos PARCIALES durante el día (mañana, tarde)',
        '💡 Guarda billetes grandes (Q200, Q100) separados',
        '💡 Cuenta cambio con cliente presente',
        '💡 Registra movimientos INMEDIATAMENTE (no al final)',
        '💡 Cierra caja ANTES de irte (no dejes pendiente)',
        '💡 Si sobra/falta, anota en observaciones QUÉ pasó',
        '💡 Imprime reporte de cierre para tu respaldo',
        '💡 Billetes dañados: reportar y cambiar en banco'
      ],

      permisos: {
        aperturar: ['cajero', 'gerente', 'admin'],
        cerrar_propia: ['cajero', 'gerente', 'admin'],
        cerrar_ajena: ['admin'],
        ver_historial_propio: ['cajero', 'gerente', 'admin'],
        ver_historial_todos: ['gerente', 'admin'],
        autorizar_diferencias: ['gerente', 'admin']
      },

      integraciones: {
        creditos: 'Al cobrar → registra ingreso automático',
        ventas: 'Al vender → registra ingreso automático',
        boveda: 'Incremento/Decremento conectado con movimientos de bóveda',
        reportes: 'Genera PDF de cierre con resumen completo'
      },

      faq: [
        {
          pregunta: '¿Puedo cerrar y reabrir la caja?',
          respuesta: 'NO. Una vez cerrada NO se puede reabrir. Cierres son finales.'
        },
        {
          pregunta: '¿Qué hago si olvidé cerrar la caja ayer?',
          respuesta: 'El sistema te alertará. Debes cerrarla ANTES de abrir una nueva. Si no recuerdas el conteo, hacer arqueo del día anterior lo mejor posible.'
        },
        {
          pregunta: '¿Cuánto tiempo puedo tener caja abierta?',
          respuesta: 'Máximo 1 día. El sistema alerta si es de día anterior.'
        },
        {
          pregunta: '¿Se puede editar un movimiento ya registrado?',
          respuesta: 'Los automáticos NO. Los manuales SÍ mientras caja esté abierta.'
        },
        {
          pregunta: '¿Qué pasa si la diferencia es grande?',
          respuesta: 'Diferencia > Q100 requiere justificación. > Q500 requiere autorización de gerente.'
        }
      ]
    },

    boveda: {
      descripcion: 'Control de dinero en efectivo guardado (reserva de la sucursal)',

      funciones: [
        'Crear bóvedas por sucursal (general, principal, auxiliar)',
        'Saldo inicial con desglose de denominaciones',
        'Movimientos: entrada, salida, transferencia entre bóvedas',
        'Desglose OBLIGATORIO de billetes y monedas',
        'Aprobación de movimientos (opcional por bóveda)',
        'Historial completo de movimientos',
        'Consolidación de saldos por sucursal',
        'Responsable asignado por bóveda',
        'Tipos: general (uso diario), principal (reserva), auxiliar (temporal)',
        'Saldo mínimo/máximo configurable',
        'Exportar movimientos a Excel/PDF',
        'Estadísticas: entradas, salidas, transferencias'
      ],

      validaciones: {
        creacion: {
          nombre: 'Requerido, max 100 caracteres',
          sucursal: 'Debe pertenecer a una sucursal activa',
          saldo_inicial: 'Mínimo Q0, requiere desglose de denominaciones',
          tipo: 'general | principal | auxiliar'
        },
        movimientos: {
          monto_minimo: 'Q0.01',
          requiere_desglose: 'OBLIGATORIO: billetes + monedas',
          debe_cuadrar: 'Suma de desglose = monto del movimiento',
          concepto: 'Requerido, descripción clara'
        },
        transferencias: {
          boveda_origen: 'Debe tener saldo suficiente',
          boveda_destino: 'Debe estar activa',
          no_misma: 'Origen ≠ Destino'
        },
        aprobaciones: {
          cuando: 'Si bóveda requiere_aprobacion = true',
          quien: 'Gerente o Admin',
          estados: 'pendiente → aprobado | rechazado'
        }
      },

      flujo_completo: `
📋 FLUJO DE BÓVEDA:

1️⃣ CREAR BÓVEDA (Una vez por sucursal)
   • Nombre: "Bóveda Principal Sucursal Centro"
   • Tipo: General / Principal / Auxiliar
   • Sucursal: Seleccionar de lista
   • Saldo inicial: Contar efectivo
   • Desglose obligatorio:
     BILLETES: Q200 (10) = Q2,000
               Q100 (20) = Q2,000
               Q50 (30) = Q1,500
               ... etc
     MONEDAS: Q1 (50) = Q50
              ... etc
   • Responsable: Usuario a cargo
   • Guardar → Bóveda creada ✅

2️⃣ REGISTRAR ENTRADA (Agregar dinero)
   Casos de uso:
   • Depósito de banco
   • Sobrante de caja del día
   • Transferencia de otra bóveda
   
   Proceso:
   • Click "Nueva Entrada"
   • Concepto: "Depósito del banco Q10,000"
   • Contar efectivo por denominaciones
   • Sistema valida que cuadre
   • Si bóveda requiere aprobación → Pendiente
   • Si no → Aprobado automático
   • Saldo actualizado

3️⃣ REGISTRAR SALIDA (Retirar dinero)
   Casos de uso:
   • Dar cambio a caja
   • Pagar proveedor
   • Transferir a otra bóveda
   
   Proceso:
   • Click "Nueva Salida"
   • Verificar saldo disponible
   • Concepto: "Cambio para caja matutina"
   • Desglose de lo que se retira
   • Validación de saldo
   • Aprobación (si aplica)
   • Saldo disminuye

4️⃣ TRANSFERENCIA ENTRE BÓVEDAS
   • Origen: Bóveda Principal
   • Destino: Bóveda Auxiliar
   • Monto: Q5,000
   • Desglose: Billetes/monedas
   • Sistema registra:
     - Salida en origen
     - Entrada en destino
   • Ambas deben cuadrar

5️⃣ APROBAR/RECHAZAR (Si aplica)
   • Ver movimientos pendientes
   • Revisar desglose y concepto
   • Aprobar → Saldo se actualiza
   • Rechazar → Movimiento cancelado

6️⃣ CONSOLIDACIÓN
   • Ver resumen por sucursal
   • Total en todas las bóvedas
   • Distribución por tipo
   • Exportar a Excel/PDF
`,

      tipos_boveda: {
        general: {
          descripcion: 'Bóveda de uso diario',
          uso: 'Operaciones rutinarias: cambio, retiros pequeños',
          requiere_aprobacion: false,
          saldo_tipico: 'Q5,000 - Q20,000'
        },
        principal: {
          descripcion: 'Bóveda de reserva principal',
          uso: 'Reserva de seguridad, montos grandes',
          requiere_aprobacion: true,
          saldo_tipico: 'Q50,000 - Q200,000'
        },
        auxiliar: {
          descripcion: 'Bóveda temporal o secundaria',
          uso: 'Proyectos específicos, eventos',
          requiere_aprobacion: false,
          saldo_tipico: 'Q1,000 - Q10,000'
        }
      },

      movimientos_tipo: {
        entrada: {
          descripcion: 'Agregar dinero a bóveda',
          afecta_saldo: '+',
          ejemplos: [
            'Depósito de banco',
            'Sobrante de caja',
            'Recibir de otra bóveda'
          ]
        },
        salida: {
          descripcion: 'Retirar dinero de bóveda',
          afecta_saldo: '-',
          ejemplos: [
            'Cambio para caja',
            'Pago a proveedor',
            'Enviar a otra bóveda'
          ]
        },
        transferencia: {
          descripcion: 'Mover entre bóvedas',
          afecta_saldo: '+/- (según origen/destino)',
          requiere: 'Dos bóvedas activas'
        }
      },

      errores_comunes: [
        {
          error: 'El desglose no cuadra con el monto',
          causa: 'Suma de denominaciones ≠ monto ingresado',
          solucion: 'Recontar y verificar cantidades de cada billete/moneda',
          tip: 'Usar calculadora para suma total'
        },
        {
          error: 'Saldo insuficiente en bóveda origen',
          causa: 'Intentas retirar más de lo disponible',
          solucion: 'Reducir monto o hacer entrada primero',
          verificar: 'Ver saldo actual antes de retirar'
        },
        {
          error: 'Movimiento pendiente de aprobación',
          causa: 'Bóveda requiere autorización de gerente',
          solucion: 'Esperar aprobación o contactar gerente',
          tiempo: 'Usualmente se aprueba en minutos'
        },
        {
          error: 'No puedes transferir a la misma bóveda',
          causa: 'Origen y destino son iguales',
          solucion: 'Seleccionar bóveda destino diferente'
        }
      ],

      tips: [
        '💡 Usa bóveda PRINCIPAL para reservas grandes',
        '💡 Bóveda GENERAL para operaciones diarias',
        '💡 Configura saldo MÍNIMO para alertas',
        '💡 Asigna responsable claro por bóveda',
        '💡 Haz conteos físicos periódicos (semanal)',
        '💡 Exporta consolidación mensual para auditoría',
        '💡 Desglose SIEMPRE: facilita auditorías',
        '💡 Concepto DESCRIPTIVO en cada movimiento'
      ],

      permisos: {
        crear_boveda: ['gerente', 'admin'],
        ver_boveda: ['cajero', 'gerente', 'admin'],
        registrar_entrada: ['cajero', 'gerente', 'admin'],
        registrar_salida: ['gerente', 'admin'],
        aprobar_movimientos: ['gerente', 'admin'],
        ver_consolidacion: ['gerente', 'admin'],
        exportar: ['gerente', 'admin']
      },

      integraciones: {
        caja: 'Incremento de caja puede venir de salida de bóveda',
        sucursales: 'Cada bóveda pertenece a una sucursal',
        reportes: 'Consolidación por sucursal en reportes generales'
      },

      faq: [
        {
          pregunta: '¿Cuántas bóvedas puedo tener?',
          respuesta: 'Ilimitadas. Recomendado: 1 principal + 1 general por sucursal.'
        },
        {
          pregunta: '¿Puedo editar un movimiento ya aprobado?',
          respuesta: 'NO. Los movimientos aprobados son finales. Solo admin puede anular.'
        },
        {
          pregunta: '¿Qué pasa si el saldo físico no cuadra?',
          respuesta: 'Hacer ajuste con movimiento de entrada/salida y justificar en concepto.'
        },
        {
          pregunta: '¿Se puede desactivar una bóveda?',
          respuesta: 'Sí, pero debe tener saldo 0 y no tener movimientos pendientes.'
        },
        {
          pregunta: '¿Cómo sé cuánto dinero tengo en total?',
          respuesta: 'Ir a "Consolidación" → Ver saldos de todas las bóvedas sumados.'
        }
      ]
    },
    compras: {
      descripcion: 'Compra directa de artículos sin empeño',
      funciones: [
        'Registro de compra inmediata',
        'Valoración de artículos',
        'Pago directo al vendedor',
        'Ingreso a inventario para venta',
        'Datos del vendedor',
        'Recibo de compra',
        'Integración con inventario',
        'Cálculo de utilidad esperada'
      ]
    },
    reportes: {
      descripcion: 'Generación de reportes y análisis del sistema',
      funciones: [
        'Reporte de caja: diario, semanal, mensual',
        'Movimientos de créditos por periodo',
        'Ventas: total, utilidad, método de pago',
        'Prendas: por estado, categoría, antigüedad',
        'Créditos vencidos y mora',
        'Top clientes VIP',
        'Estadísticas de tasadores',
        'Rendimiento por sucursal',
        'Proyección de intereses',
        'Exportación: PDF, Excel, CSV',
        'Gráficos y dashboards'
      ]
    },
    usuarios: {
      descripcion: 'Administración de usuarios y permisos del sistema',
      funciones: [
        'Crear usuarios con roles',
        'Roles: administrador, gerente, cajero, tasador, vendedor',
        'Permisos por módulo: ver, crear, editar, eliminar',
        'Asignación de sucursal',
        'Control de acceso granular',
        'Historial de sesiones',
        'Actividad de usuario',
        'Bloqueo/desbloqueo',
        'Cambio de contraseña',
        'Validación de contraseña segura',
        'Foto de perfil'
      ],
      validaciones: [
        'Contraseña: mínimo 8 caracteres',
        'Debe incluir mayúscula, minúscula, número',
        'Email único',
        'Username único'
      ]
    },
    simulador: {
      descripcion: 'Herramienta de simulación de créditos y cálculos',
      funciones: [
        'Calcular préstamo según avalúo',
        'Simular intereses por periodo',
        'Proyectar pagos totales',
        'Fechas de vencimiento',
        'Comparar tasas de interés',
        'Calcular mora automática',
        'Estimación de utilidad'
      ]
    },
    cobros: {
      descripcion: 'Gestión de cobros y pagos de créditos',
      funciones: [
        'Registro de pagos totales/parciales',
        'Abonos a capital',
        'Pago de intereses',
        'Pago de mora',
        'Métodos de pago múltiples',
        'Generación automática de recibos',
        'Actualización de saldo',
        'Control de vencimientos',
        'Alertas de mora',
        'Historial de pagos por crédito'
      ],
      validaciones: [
        'Monto pago > 0',
        'No exceder saldo pendiente',
        'Caja debe estar abierta',
        'Movimiento se registra automáticamente en caja'
      ]
    },
    recibos: {
      descripcion: 'Gestión y consulta de recibos emitidos',
      funciones: [
        'Búsqueda por código/cliente/fecha',
        'Reimpresión de recibos PDF',
        'Historial completo de pagos',
        'Anulación de recibos (con permiso)',
        'Tipos: pago, venta, compra, otros',
        'Código de barras único',
        'Validación de duplicados',
        'Filtros avanzados'
      ]
    },
    sucursales: {
      descripcion: 'Administración de sucursales y agencias',
      funciones: [
        'Crear/editar sucursales',
        'Configuración individual por sede',
        'Asignar usuarios a sucursal',
        'Control de inventario por sucursal',
        'Reportes independientes',
        'Direcciones y contactos',
        'Estados: activa, inactiva',
        'Transferencia de prendas entre sucursales'
      ]
    },
    categorias_productos: {
      descripcion: 'Catálogo de categorías y configuración de productos',
      funciones: [
        'Crear categorías personalizadas',
        'Campos dinámicos por categoría (EAV)',
        'Subcategorías ilimitadas',
        'Configuración de tasación',
        'Porcentaje de préstamo por categoría',
        'Iconos y descripciones',
        'Activar/desactivar categorías',
        'Ejemplos: Electrónica, Joyas, Vehículos, Herramientas, etc.'
      ]
    },
    historial: {
      descripcion: 'Registro histórico y auditoría del sistema',
      funciones: [
        'Log completo de operaciones',
        'Auditoría de cambios',
        'Quién hizo qué y cuándo',
        'Cambios en créditos',
        'Movimientos de caja',
        'Modificaciones de prendas',
        'Filtros: usuario, módulo, acción, fecha',
        'Trazabilidad completa',
        'Exportación de auditoría'
      ]
    }
  },

  flujos: {
    'crear empeño': 'FLUJO COMPLETO DE EMPEÑO:\n1. Clientes → Buscar o crear nuevo cliente (validar DPI)\n2. Créditos → Nuevo Crédito\n3. Seleccionar cliente\n4. Definir monto solicitado y plazo (días)\n5. Agregar Prendas → Click "+" para cada artículo\n6. Por cada prenda: descripción, categoría, marca, modelo, fotos\n7. Tasación → Valor estimado (el sistema calcula % préstamo)\n8. Revisar resumen: monto total, interés, fecha vencimiento\n9. Guardar → Se genera código único + recibo PDF\n10. Estado inicial: "vigente"\n\n💡 Tip: El sistema calcula automáticamente el interés según configuración',

    'vender prenda': 'FLUJO DE VENTA:\n1. Verificar que crédito esté "vencido" o "en_mora"\n2. Prendas → Editar prenda → Cambiar estado a "En Venta"\n3. Definir precio de venta (mínimo = valor préstamo)\n4. Ventas → Nueva venta\n5. Buscar prenda por código o categoría\n6. Agregar al carrito (puede ser múltiples prendas)\n7. Datos del comprador (opcional)\n8. Aplicar descuentos si aplica\n9. Método de pago: efectivo, tarjeta, mixto, etc.\n10. Confirmar venta → Genera factura PDF\n11. Prenda cambia a estado "vendida"\n\n⚠️ Solo prendas con crédito vencido pueden venderse',

    'pagar credito': 'FLUJO DE PAGO:\n1. Créditos → Buscar crédito activo\n2. Ver detalle → Click "Registrar Pago"\n3. Elegir tipo de pago:\n   • Pago total: liquida todo (capital + interés + mora)\n   • Pago parcial/abono: abona a capital\n   • Solo interés: cubre intereses generados\n   • Solo mora: cubre multa por retraso\n4. Ingresar monto\n5. Método de pago (efectivo, tarjeta, etc.)\n6. Confirmar → Genera recibo automático\n7. Si es pago total: prenda cambia a "recuperada"\n8. Movimiento se registra en caja automáticamente\n\n💰 Caja debe estar abierta para registrar pagos',

    'cerrar caja': 'FLUJO DE CIERRE DE CAJA:\n1. Caja → Ver caja activa (debe estar "abierta")\n2. Revisar movimientos del día\n3. Hacer arqueo físico de efectivo\n4. Click "Cerrar Caja"\n5. Ingresar denominaciones:\n   • Billetes: Q200, Q100, Q50, Q20, Q10, Q5\n   • Monedas: Q1, Q0.50, Q0.25, Q0.10, Q0.05, Q0.01\n6. Sistema calcula total físico vs esperado\n7. Si hay diferencia <= Q100: permitir cierre\n8. Si diferencia > Q100: requiere autorización\n9. Observaciones opcionales\n10. Confirmar cierre → Genera reporte PDF\n11. Estado cambia a "cerrada"\n\n⚠️ No se puede abrir nueva caja hasta cerrar la actual',

    'marcar prenda vencida en venta': 'PASAR PRENDA A VENTA:\n1. Créditos → Buscar crédito vencido\n2. Verificar estado del crédito: "vencido" o "en_mora"\n3. Si no está vencido → Cambiar estado manualmente\n4. Prendas → Buscar prenda asociada\n5. Click "Editar prenda"\n6. Estado → Seleccionar "En Venta"\n   ✓ Si crédito está vencido: opción habilitada\n   ✗ Si crédito está vigente: opción bloqueada\n7. Definir precio de venta (sugerido: avalúo × 1.3)\n8. Ubicación física para exhibición\n9. Guardar → Prenda lista para venta\n10. Aparece en catálogo de ventas\n\n💡 El sistema valida automáticamente el estado del crédito',

    'renovar credito': 'RENOVAR/REFINANCIAR CRÉDITO:\n1. Créditos → Seleccionar crédito vigente o vencido\n2. Ver detalle → Click "Renovar Crédito"\n3. El sistema calcula:\n   • Intereses acumulados hasta hoy\n   • Mora si aplica\n   • Capital pendiente\n4. Opciones de renovación:\n   a) Pagar intereses + extender plazo (mismo capital)\n   b) Refinanciar todo (nuevo crédito)\n5. Definir nuevo plazo en días\n6. Revisar nuevo cálculo de intereses\n7. Confirmar renovación\n8. Se genera nuevo contrato/recibo\n9. Fecha de vencimiento se actualiza\n10. Estado regresa a "vigente"\n\n📌 Requiere que prendas sigan en custodia',

    'registrar compra directa': 'COMPRA SIN EMPEÑO:\n1. Compras → Nueva Compra\n2. Datos del vendedor (no requiere ser cliente)\n3. Información del artículo:\n   • Descripción detallada\n   • Categoría\n   • Marca, modelo, serie\n   • Estado/condición\n4. Fotos del artículo\n5. Tasación/valoración\n6. Precio de compra (negociado)\n7. Método de pago al vendedor\n8. Precio de venta sugerido (+30% utilidad)\n9. Confirmar compra\n10. Artículo ingresa directamente a inventario\n11. Estado: "en_venta" (disponible inmediato)\n12. Genera recibo de compra\n\n💡 Útil para adquirir inventario rápidamente',

    'aperturar caja': 'ABRIR CAJA DIARIA:\n1. Caja → Estado de Caja\n2. Si hay caja pendiente de otro día: PRIMERO cerrarla\n3. Si no hay caja abierta: Click "Aperturar Caja"\n4. Ingresar saldo inicial (efectivo en caja)\n5. Contar denominaciones iniciales (opcional)\n6. Sucursal (si aplica)\n7. Observaciones de apertura\n8. Confirmar apertura\n9. Sistema registra:\n   • Usuario que abrió\n   • Fecha y hora exacta\n   • Saldo inicial\n10. Estado: "abierta" (lista para operar)\n\n⚡ Solo una caja abierta por usuario a la vez\n⚡ Debe abrirse al inicio de cada jornada',
  },

  estados: {
    credito: {
      solicitado: 'Cliente solicitó empeño, pendiente de análisis',
      en_analisis: 'Tasador evaluando prendas y montos',
      aprobado: 'Crédito autorizado, pendiente de desembolso',
      vigente: 'Crédito activo dentro del plazo',
      vencido: 'Pasó fecha de vencimiento sin pago',
      en_mora: 'Vencido con días de gracia agotados',
      pagado: 'Cancelado completamente (capital + intereses)',
      rescatado: 'Cliente recuperó prenda pagando',
      cancelado: 'Anulado sin efecto',
      renovado: 'Extendido con nuevo plazo'
    },
    prenda: {
      en_custodia: 'Guardada en bóveda bajo resguardo',
      recuperada: 'Cliente la recuperó pagando el crédito',
      en_venta: 'Publicada para venta (crédito vencido)',
      vendida: 'Ya fue vendida a tercero',
      perdida: 'Extraviada (requiere investigación)',
      deteriorada: 'Dañada, requiere ajuste de valor',
      devuelta: 'Devuelta al cliente sin pago'
    },
    caja: {
      abierta: 'Operativa, puede registrar movimientos',
      cerrada: 'Finalizada con arqueo completo',
      auditoria: 'En revisión por supervisor'
    }
  },

  transiciones: {
    credito: {
      'solicitado→en_analisis': 'Tasador comienza evaluación',
      'en_analisis→aprobado': 'Crédito autorizado por gerente',
      'aprobado→vigente': 'Desembolso realizado al cliente',
      'vigente→vencido': 'Pasó fecha límite sin pago',
      'vigente→pagado': 'Cliente pagó antes de vencer',
      'vencido→pagado': 'Cliente pagó después de vencer',
      'vencido→en_venta': 'Prenda pasa a catálogo de ventas',
      'cualquier→cancelado': 'Administrador anula el crédito'
    }
  },

  reglas: {
    'apertura caja': [
      '✓ Debe cerrar caja pendiente antes de abrir nueva',
      '✓ Solo una caja abierta por usuario',
      '✓ Saldo inicial debe ser >= 0',
      '✗ No puede abrir si hay caja de otro día abierta'
    ],
    'venta prenda': [
      '✓ Prenda debe estar en estado "en_venta"',
      '✓ Crédito asociado debe estar "vencido" o "en_mora"',
      '✓ Precio venta >= valor préstamo original',
      '✗ No se puede vender prenda con crédito vigente'
    ],
    'pago credito': [
      '✓ Caja debe estar abierta',
      '✓ Monto > 0',
      '✓ No exceder saldo pendiente',
      '✓ Genera recibo automático',
      '✓ Se registra en movimientos de caja'
    ],
    'crear credito': [
      '✓ Cliente debe existir y estar activo',
      '✓ Monto >= Q50',
      '✓ Plazo: 1-365 días',
      '✓ Al menos una prenda asociada',
      '✓ Suma de avalúos >= monto solicitado',
      '✓ % préstamo configurable (30%-90%)'
    ]
  },

  atajos: {
    'buscar cliente': 'CTRL+F en módulo clientes',
    'nuevo credito': 'Click botón "+" en créditos',
    'cerrar sesion': 'Menu usuario → Cerrar sesión',
    'cambiar sucursal': 'Menu superior → Sucursales',
    'imprimir recibo': 'Detalle → Botón impresora',
    'exportar reporte': 'Reportes → Botón Excel/PDF'
  }
}

const QUICK_ANSWERS: Record<string, string> = {
  'hola': `👋 ¡Hola! Soy el asistente de **Digiprenda**.

Puedo ayudarte con:
📋 Empeños y créditos
💰 Caja y bóveda
👥 Clientes
🏷️ Prendas y categorías
📊 Ventas y reportes

💡 Escribe tu pregunta (ejemplo: "cómo crear empeño")`,

  'ayuda': `🆘 **AYUDA - DIGIPRENDA**

🔹 **MÓDULOS PRINCIPALES:**

📋 **CRÉDITOS/EMPEÑOS**
   • Crear empeño
   • Estados de créditos
   • Calcular intereses
   • Renovar créditos

💰 **CAJA Y BÓVEDA**
   • Abrir/cerrar caja
   • Movimientos de efectivo
   • Arqueos y cuadres
   • Traspasos bóveda-caja

👥 **CLIENTES**
   • Registrar cliente
   • Tipos (regular, VIP, corporativo)
   • Historial de créditos
   • Validaciones DPI

🏷️ **PRENDAS**
   • Tasación
   • Estados de prendas
   • Pasar a venta
   • Fotos y categorías

📊 **VENTAS**
   • Venta de contado
   • Venta por apartado
   • Facturación

💡 Escribe tu duda específica (ej: "cómo abrir caja")`,

  'que puedes hacer': `🤖 **PUEDO AYUDARTE CON TODO SOBRE DIGIPRENDA:**

📚 **INFORMACIÓN:**
   ✓ Explicar procesos paso a paso
   ✓ Flujos de trabajo completos
   ✓ Validaciones y reglas del sistema
   ✓ Estados y transiciones
   ✓ Errores comunes y soluciones

💡 **EJEMPLOS DE PREGUNTAS:**

🔹 Procesos:
   • "¿Cómo crear un empeño?"
   • "¿Cómo cerrar caja?"
   • "¿Cómo vender una prenda?"
   • "¿Cómo registrar cliente?"

🔹 Validaciones:
   • "¿Qué formato tiene el DPI?"
   • "¿Puedo eliminar un cliente con créditos?"
   • "¿Cuándo puedo vender una prenda?"

🔹 Cálculos:
   • "¿Cómo se calculan los intereses?"
   • "¿Qué pasa si hay diferencia en caja?"

🔹 Estados:
   • "¿Qué estados tiene un crédito?"
   • "¿Cuándo pasa a mora un crédito?"

🔹 Módulos:
   • "¿Qué es la bóveda?"
   • "¿Qué son las categorías?"
   • "¿Diferencia entre caja y bóveda?"

❓ **Hazme cualquier pregunta sobre el sistema**`,

  'que puedo hacer': `👤 **EN DIGIPRENDA PUEDES:**

📋 **GESTIONAR EMPEÑOS:**
   ✓ Crear créditos prendarios
   ✓ Registrar prendas con fotos
   ✓ Calcular intereses automáticos
   ✓ Renovar créditos
   ✓ Dar seguimiento a pagos

💰 **MANEJAR EFECTIVO:**
   ✓ Abrir/cerrar caja diaria
   ✓ Registrar ingresos y egresos
   ✓ Hacer arqueos
   ✓ Traspasar a bóveda
   ✓ Cuadrar diferencias

👥 **ADMINISTRAR CLIENTES:**
   ✓ Registrar con DPI validado
   ✓ Asignar tipos (regular/VIP)
   ✓ Ver historial completo
   ✓ Marcar activos/inactivos

🏷️ **CONTROLAR PRENDAS:**
   ✓ Tasación profesional
   ✓ Almacenar con fotos
   ✓ Ubicar en bóveda
   ✓ Pasar a venta

📊 **VENDER Y REPORTAR:**
   ✓ Venta de prendas vencidas
   ✓ Contado o apartado
   ✓ Generar reportes
   ✓ Exportar a Excel/PDF

💡 Pregúntame sobre cualquier proceso`,

  'soporte': `📞 **CONTACTAR SOPORTE TÉCNICO**

¿No encuentras lo que buscas? Nuestro equipo está listo para ayudarte:

📧 **Email:**
   soporte@digiprenda.com
   Respuesta en 24 horas

📱 **WhatsApp:**
   +502 1234-5678
   Lun-Vie: 8:00 AM - 6:00 PM

☎️ **Teléfono:**
   +502 2222-3333
   Horario: 8:00 AM - 8:00 PM

💬 **Chat en vivo:**
   Disponible en www.digiprenda.com
   Lun-Sáb: 9:00 AM - 7:00 PM

🎫 **Ticket de Soporte:**
   Sistema → Ayuda → Crear ticket
   Adjunta capturas de pantalla

💡 **Antes de contactar:**
   • Ten a mano tu usuario
   • Describe el problema específico
   • Incluye capturas si es posible`,

  'contacto': `📞 **CONTACTAR SOPORTE TÉCNICO**

¿No encuentras lo que buscas? Nuestro equipo está listo para ayudarte:

📧 **Email:**
   soporte@digiprenda.com
   Respuesta en 24 horas

📱 **WhatsApp:**
   +502 1234-5678
   Lun-Vie: 8:00 AM - 6:00 PM

☎️ **Teléfono:**
   +502 2222-3333
   Horario: 8:00 AM - 8:00 PM

💬 **Chat en vivo:**
   Disponible en www.digiprenda.com
   Lun-Sáb: 9:00 AM - 7:00 PM

🎫 **Ticket de Soporte:**
   Sistema → Ayuda → Crear ticket
   Adjunta capturas de pantalla

💡 **Antes de contactar:**
   • Ten a mano tu usuario
   • Describe el problema específico
   • Incluye capturas si es posible`,

  'como crear empeño': `📋 CREAR EMPEÑO EN DIGIPRENDA:

1️⃣ REGISTRAR/BUSCAR CLIENTE
   • Ir a módulo "Clientes"
   • Buscar por DPI o crear nuevo
   • Validar: DPI único (13 dígitos)

2️⃣ CREAR CRÉDITO
   • Módulo "Créditos" → "Nuevo Crédito"
   • Seleccionar cliente
   • Monto solicitado (mínimo Q50)
   • Plazo en días (1-365)

3️⃣ AGREGAR PRENDAS
   • Click "+ Agregar Prenda"
   • Descripción detallada
   • Categoría (Electrónica, Joyas, etc.)
   • Marca, modelo, número de serie
   • Subir hasta 10 fotos

4️⃣ TASACIÓN
   • Valor estimado por tasador
   • Sistema calcula % de préstamo (30-90%)
   • Condición física: excelente/buena/regular
   • Ubicación en bóveda

5️⃣ CONFIRMAR
   • Revisar resumen: monto, interés, vencimiento
   • Guardar → Código único generado
   • Recibo PDF descargable
   • Estado inicial: "vigente"

💡 TIP: El interés se calcula automáticamente según configuración del sistema`,

  'como vender prenda': `💰 VENDER PRENDA - PROCESO COMPLETO:

⚠️ REQUISITO PREVIO:
   El crédito asociado DEBE estar:
   ✓ Vencido, o
   ✓ En mora

📌 PASO 1: VERIFICAR ESTADO DEL CRÉDITO
   • Créditos → Buscar crédito
   • Si está "vigente" → Cambiar a "vencido"
   • Verificar que pasó fecha de vencimiento

📌 PASO 2: PASAR PRENDA A VENTA
   • Prendas → Editar prenda
   • Estado → "En Venta"
   • ✅ Si crédito vencido: opción habilitada (texto verde)
   • ❌ Si crédito vigente: opción bloqueada (gris)
   • Definir precio (recomendado: avalúo × 1.3)

📌 PASO 3: REGISTRAR VENTA
   • Módulo "Ventas" → Nueva venta
   • Buscar prenda (aparece en catálogo)
   • Datos del comprador (opcional)
   • Agregar al carrito

📌 PASO 4: PROCESAR PAGO
   • Método: efectivo/tarjeta/mixto
   • Aplicar descuento si aplica
   • Confirmar venta

📌 PASO 5: FINALIZAR
   • Genera factura PDF
   • Recibo para comprador
   • Prenda cambia a "vendida"
   • Movimiento registrado en caja

💡 TIPO DE VENTA:
   • Contado: pago completo inmediato
   • Apartado: anticipo + saldo después
   • Plan de pagos: cuotas programadas`,

  'estados credito': `📊 ESTADOS DEL CRÉDITO Y TRANSICIONES:

🟢 SOLICITADO
   → Cliente solicitó el empeño
   → Puede pasar a: en_análisis, rechazado

🔵 EN_ANÁLISIS
   → Tasador evaluando prendas
   → Puede pasar a: aprobado, rechazado

🟡 APROBADO
   → Crédito autorizado
   → Puede pasar a: vigente (al desembolsar)

✅ VIGENTE
   → Crédito activo, dentro del plazo
   → Cliente puede pagar y recuperar prenda
   → Puede pasar a: pagado, vencido, en_mora, renovado

⏰ VENCIDO
   → Pasó la fecha de vencimiento sin pago
   → Inicia periodo de gracia
   → Puede pasar a: pagado, en_mora, vendido

🔴 EN_MORA
   → Vencido + días de gracia agotados
   → Genera multa adicional
   → Puede pasar a: pagado, vendido

💚 PAGADO
   → Cancelado completamente
   → Cliente recuperó prenda
   → Estado final

❌ CANCELADO
   → Anulado por administrador
   → Estado final

🔄 RENOVADO
   → Extendido con nuevo plazo
   → Regresa a "vigente"

💡 IMPORTANTE: No todas las transiciones son permitidas. El sistema valida automáticamente.`,

  'pasar prenda a venta': `🔄 PASAR PRENDA A VENTA (DETALLADO):

✅ CONDICIONES QUE DEBEN CUMPLIRSE:
1. Crédito en estado: "vencido" o "en_mora"
2. Prenda en estado: "en_custodia"
3. Prenda asociada al crédito vencido

❌ NO SE PUEDE SI:
• Crédito está "vigente" (activo)
• Crédito está "pagado"
• Prenda ya está "en_venta" o "vendida"

📋 PROCEDIMIENTO:
1. Módulo CRÉDITOS
   → Buscar crédito del cliente
   → Verificar estado actual
   
2. Si está "vigente" pero ya venció:
   → Click "Cambiar Estado"
   → Seleccionar "Vencido"
   → Confirmar cambio

3. Módulo PRENDAS
   → Buscar la prenda asociada
   → Click "Editar"
   
4. En el formulario:
   → Campo "Estado"
   → Seleccionar "En Venta"
   → SI APARECE:
     ✅ "✓ Crédito vencido: La prenda puede marcarse como En Venta" (VERDE)
     → Continuar con el cambio
     
     ❌ "(No disponible - Crédito activo)" (GRIS)
     → Primero cambiar estado del crédito
   
5. Definir precio de venta:
   → Mínimo: valor del préstamo original
   → Recomendado: avalúo × 1.3 (30% ganancia)
   → Competitivo según mercado

6. Ubicación para exhibición:
   → Sección de ventas
   → Estante visible

7. Guardar cambios
   → Prenda ahora está "en_venta"
   → Aparece en catálogo de ventas
   → Lista para ser vendida

💡 El sistema valida automáticamente el estado del crédito asociado.`,

  'cerrar caja': `🏦 CERRAR CAJA - PROCEDIMIENTO COMPLETO:

⚠️ ANTES DE CERRAR:
• Verificar que NO haya operaciones pendientes
• Revisar movimientos del día
• Tener efectivo físico listo para contar

📋 PASO A PASO:

1️⃣ ACCEDER A CAJA ACTIVA
   • Módulo "Caja"
   • Click "Ver Caja Activa"
   • Debe estar en estado "abierta"

2️⃣ REVISAR MOVIMIENTOS
   • Total esperado (según sistema)
   • Ingresos: pagos de clientes
   • Egresos: gastos, retiros
   • Balance teórico

3️⃣ HACER ARQUEO FÍSICO
   Contar TODO el efectivo en caja:
   
   BILLETES:
   • Q200 × cantidad = _____
   • Q100 × cantidad = _____
   • Q50 × cantidad = _____
   • Q20 × cantidad = _____
   • Q10 × cantidad = _____
   • Q5 × cantidad = _____
   
   MONEDAS:
   • Q1 × cantidad = _____
   • Q0.50 × cantidad = _____
   • Q0.25 × cantidad = _____
   • Q0.10 × cantidad = _____
   • Q0.05 × cantidad = _____

4️⃣ INGRESAR DENOMINACIONES
   • Click "Cerrar Caja"
   • Ingresar cantidades contadas
   • Sistema calcula total físico

5️⃣ VERIFICAR DIFERENCIA
   • Total físico vs esperado
   • ✅ Diferencia <= Q100: OK (aceptable)
   • ⚠️ Diferencia > Q100: Requiere autorización

6️⃣ OBSERVACIONES
   • Explicar diferencia si existe
   • Notas importantes del día
   • Incidentes a reportar

7️⃣ CONFIRMAR CIERRE
   • Click "Confirmar Cierre"
   • Genera reporte PDF automático
   • Estado cambia a "cerrada"
   • Ya NO se pueden registrar más movimientos

📄 REPORTE INCLUYE:
✓ Resumen de movimientos
✓ Detalle de denominaciones
✓ Diferencia (sobrante/faltante)
✓ Firma digital del cajero
✓ Fecha y hora de cierre

⚠️ IMPORTANTE:
• Una vez cerrada NO se puede reabrir
• No podrás abrir nueva caja hasta el día siguiente
• Si hay diferencia grande, supervisor debe autorizar`,

  'permisos': `🔐 GESTIÓN DE PERMISOS Y USUARIOS:

👥 ROLES PREDEFINIDOS:

1. ADMINISTRADOR
   ✅ Acceso total
   ✅ Crear/editar/eliminar en todos los módulos
   ✅ Configuración del sistema
   ✅ Gestión de usuarios
   ✅ Reportes completos
   ✅ Auditoría

2. GERENTE
   ✅ Ver todos los módulos
   ✅ Crear/editar créditos
   ✅ Aprobar/rechazar créditos
   ✅ Reportes avanzados
   ❌ No puede eliminar usuarios
   ❌ No modifica configuración

3. CAJERO
   ✅ Caja (apertura/cierre)
   ✅ Cobros y pagos
   ✅ Ventas
   ✅ Recibos
   ✅ Ver créditos
   ❌ No crear créditos
   ❌ No editar tasaciones
   ❌ No reportes sensibles

4. TASADOR
   ✅ Crear créditos
   ✅ Tasación de prendas
   ✅ Gestión de prendas
   ✅ Bóveda
   ❌ No cobros
   ❌ No caja
   ❌ No ventas

5. VENDEDOR
   ✅ Ventas
   ✅ Ver prendas en venta
   ✅ Clientes
   ❌ No créditos
   ❌ No caja
   ❌ No tasaciones

📋 ASIGNAR PERMISOS:

1. Módulo USUARIOS
2. Seleccionar usuario
3. Click "Editar Permisos"
4. Por cada módulo marcar:
   □ Ver
   □ Crear
   □ Editar
   □ Eliminar
5. Guardar cambios
6. Usuario verá solo lo permitido

💡 MEJORES PRÁCTICAS:
• Principio de mínimo privilegio
• Revisar permisos mensualmente
• Auditar acciones sensibles
• Rotar contraseñas cada 90 días`,

  'renovar credito': `🔄 RENOVAR/REFINANCIAR CRÉDITO:

📌 ¿CUÁNDO RENOVAR?
• Crédito próximo a vencer
• Cliente no puede pagar completo aún
• Quiere extender el plazo
• Necesita refinanciar deuda

✅ REQUISITOS:
• Crédito en estado: vigente, vencido o en_mora
• Prendas siguen en custodia
• Cliente acepta nuevas condiciones

💰 OPCIONES DE RENOVACIÓN:

A) PAGAR INTERESES + EXTENDER
   • Cliente paga intereses acumulados
   • Capital pendiente se mantiene
   • Se extiende plazo (30, 60, 90 días)
   • Nuevo cálculo de interés sobre capital

B) REFINANCIAMIENTO TOTAL
   • Se crea NUEVO crédito
   • Capital + intereses = nueva deuda
   • Nuevo plazo completo
   • Posibilidad de agregar más prendas

📋 PROCEDIMIENTO:

1️⃣ CRÉDITOS → Buscar crédito activo

2️⃣ Ver Detalle del crédito
   • Capital pendiente: Q_____
   • Intereses acumulados: Q_____
   • Mora (si aplica): Q_____
   • Total adeudado: Q_____

3️⃣ Click "Renovar Crédito"

4️⃣ Elegir tipo de renovación:
   ( ) Extender plazo (pagar intereses)
   ( ) Refinanciar total

5️⃣ Si EXTENDER:
   • Registrar pago de intereses
   • Definir nuevo plazo (días)
   • Acepta nuevas condiciones
   • Genera nuevo recibo

6️⃣ Si REFINANCIAR:
   • Monto nuevo = capital + intereses + mora
   • Nuevo plazo en días
   • Recalcula interés sobre total
   • Puede ajustar condiciones

7️⃣ CONFIRMAR RENOVACIÓN
   • Genera nuevo contrato
   • Nuevo código de crédito
   • Nueva fecha de vencimiento
   • Recibo de renovación PDF

8️⃣ ACTUALIZACIONES AUTOMÁTICAS:
   • Estado regresa a "vigente"
   • Contador de días resetea
   • Alertas de vencimiento actualizadas
   • Historial registra renovación

💡 COMISIÓN POR RENOVACIÓN:
Puede aplicar cargo administrativo (configurable en sistema)

⚠️ LÍMITES:
• Máximo 3 renovaciones por crédito
• No se puede renovar crédito "pagado"
• Requiere autorización si mora > 30 días`,

  'diferencia caja': `⚠️ DIFERENCIA EN CIERRE DE CAJA:

📊 CUANDO HAY DIFERENCIA:

💚 FALTANTE (Físico < Esperado):
• Falta dinero en caja
• Posibles causas:
  - Error en conteo
  - Cambio mal dado
  - Movimiento no registrado
  - Extracción no autorizada

🔴 SOBRANTE (Físico > Esperado):
• Sobra dinero en caja
• Posibles causas:
  - Error en registro
  - Pago registrado de menos
  - Cambio devuelto de más
  - Ingreso no contabilizado

✅ DIFERENCIA ACEPTABLE:
• <= Q100: Normal (errores mínimos)
• Sistema permite cerrar
• Registra observación

⚠️ DIFERENCIA ALTA:
• > Q100: Requiere investigación
• Sistema requiere autorización de supervisor
• Se genera alerta
• Proceso:
  1. Recontar físico
  2. Revisar movimientos uno por uno
  3. Buscar error en registros
  4. Si persiste: supervisor autoriza
  5. Genera reporte de diferencia
  6. Investigación formal

📋 PASOS PARA RESOLVER:

1. RECONTEO
   • Verificar billetes y monedas
   • Contar 2 veces para confirmar
   • Usar contador automático si disponible

2. VERIFICAR MOVIMIENTOS
   • Revisar TODOS los ingresos del día
   • Verificar TODOS los egresos
   • Buscar duplicados
   • Buscar omisiones

3. VOUCHERS Y RECIBOS
   • Cuadrar recibos físicos
   • Verificar vouchers de tarjeta
   • Comprobar transferencias

4. DOCUMENTAR
   • Explicar diferencia en observaciones
   • Adjuntar evidencia si es posible
   • Nombre de quien autorizó (si aplica)

5. MEDIDAS CORRECTIVAS
   • Capacitar si fue error humano
   • Ajustar proceso si fue sistémico
   • Auditoría si hay sospecha de fraude

💡 PREVENCIÓN:
• Contar cambio con cliente presente
• Registrar movimientos inmediatamente
• Arqueos parciales durante el día
• Doble verificación en montos grandes`,

  'que es idempotencia': `🔄 IDEMPOTENCIA EN EL SISTEMA:

📌 DEFINICIÓN:
Idempotencia significa que una operación puede ejecutarse múltiples veces sin cambiar el resultado más allá de la primera ejecución.

🎯 EN EMPEÑOS:
Previene duplicación de transacciones si hay:
• Click doble accidental
• Pérdida de conexión
• Reenvío de formulario

💼 EJEMPLOS EN EL SISTEMA:

1. CREAR CRÉDITO:
   ❌ Sin idempotencia:
   • Click doble → 2 créditos idénticos
   • Problema: duplicación

   ✅ Con idempotencia:
   • Usa código único (UUID)
   • Si ya existe: retorna el existente
   • No crea duplicado

2. REGISTRAR PAGO:
   ❌ Sin idempotencia:
   • Reenvío → pago duplicado
   • Cliente cobra 2 veces

   ✅ Con idempotencia:
   • Usa idempotency_key
   • Detecta pago repetido
   • Retorna recibo original

3. CERRAR CAJA:
   ❌ Sin idempotencia:
   • Click múltiple → múltiples cierres
   • Caos en reportes

   ✅ Con idempotencia:
   • Verifica estado "abierta"
   • Solo permite un cierre
   • Rechaza subsecuentes

🔧 IMPLEMENTACIÓN:
• Frontend genera UUID único
• Backend valida duplicidad
• Base de datos tiene constraints únicos
• Retorna mismo resultado si se repite

💡 TRANSPARENTE AL USUARIO:
El sistema maneja esto automáticamente, no requiere acción del usuario.`,
}

// 📝 DICCIONARIO DE CORRECCIONES ORTOGRÁFICAS COMUNES
const CORRECCIONES_ORTOGRAFICAS: Record<string, string> = {
  // Errores comunes en "empeño"
  'empeño': 'empeño', 'enpeño': 'empeño', 'empelño': 'empeño', 'empeñp': 'empeño',
  'enpeñp': 'empeño', 'empeno': 'empeño', 'enpeno': 'empeño',

  // Errores comunes en "crédito"
  'credito': 'crédito', 'kredito': 'crédito', 'cредito': 'crédito',
  'credto': 'crédito', 'crdito': 'crédito',

  // Errores comunes en "caja"
  'kaja': 'caja', 'cja': 'caja', 'caaj': 'caja',

  // Errores comunes en "bóveda"
  'boveda': 'bóveda', 'bovda': 'bóveda',
  'voveda': 'bóveda',

  // Errores comunes en "cliente"
  'clente': 'cliente', 'ciente': 'cliente', 'clinte': 'cliente',
  'kliente': 'cliente', 'cliete': 'cliente',

  // Errores comunes en "prenda"
  'preda': 'prenda', 'prend': 'prenda',

  // Errores comunes en "crear"
  'creer': 'crear', 'crer': 'crear',
  'krer': 'crear', 'krear': 'crear',

  // Errores comunes en "cerrar"
  'cerr': 'cerrar', 'cerar': 'cerrar', 'serrar': 'cerrar',
  'zerrar': 'cerrar',

  // Errores comunes en "abrir"
  'havrir': 'abrir', 'habrir': 'abrir', 'avrir': 'abrir',
  'abrr': 'abrir',

  // Errores comunes en "venta"
  'veta': 'venta', 'vnta': 'venta', 'benta': 'venta',

  // Errores comunes en "categoría"
  'categoria': 'categoría', 'caegoria': 'categoría', 'categora': 'categoría',
  'catgoria': 'categoría',

  // Errores comunes en "ayuda"
  'ayda': 'ayuda', 'auda': 'ayuda', 'ayud': 'ayuda',
  'alluda': 'ayuda', 'ayuad': 'ayuda',

  // Errores en "cómo"
  'como': 'cómo', 'com': 'cómo', 'komo': 'cómo',

  // Errores en "qué"
  'que': 'qué', 'ke': 'qué', 'q': 'qué',

  // Errores en "puedo"
  'pueo': 'puedo', 'pued': 'puedo', 'peudo': 'puedo',

  // Errores en "hacer"
  'acer': 'hacer', 'hcer': 'hacer', 'haser': 'hacer',

  // Errores en "reporte"
  'repote': 'reporte', 'reporte': 'reporte', 'reprt': 'reporte',
}

// 🔍 CALCULAR SIMILITUD ENTRE STRINGS (Levenshtein Distance simplificado)
const calcularSimilitud = (str1: string, str2: string): number => {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Inicializar matriz
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Llenar matriz
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Eliminación
        matrix[i][j - 1] + 1,      // Inserción
        matrix[i - 1][j - 1] + cost // Sustitución
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

// ✍️ CORREGIR TEXTO CON ERRORES ORTOGRÁFICOS
const corregirOrtografia = (texto: string): string => {
  let textoCorregido = texto.toLowerCase()

  // Aplicar correcciones del diccionario
  for (const [error, correccion] of Object.entries(CORRECCIONES_ORTOGRAFICAS)) {
    const regex = new RegExp(`\\b${error}\\b`, 'gi')
    textoCorregido = textoCorregido.replace(regex, correccion)
  }

  return textoCorregido
}

// 🔎 BUSCAR PALABRA MÁS SIMILAR (fuzzy matching)
const buscarPalabraSimilar = (palabra: string, lista: string[], umbral: number = 0.7): string | null => {
  let mejorCoincidencia: string | null = null
  let mejorSimilitud = 0

  for (const candidato of lista) {
    const similitud = calcularSimilitud(palabra.toLowerCase(), candidato.toLowerCase())
    if (similitud > mejorSimilitud && similitud >= umbral) {
      mejorSimilitud = similitud
      mejorCoincidencia = candidato
    }
  }

  return mejorCoincidencia
}

export function ChatbotHelper() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    type: 'bot',
    content: '¡Hola! 👋 Soy tu asistente de Digiprenda. ¿En qué puedo ayudarte?\n\nPuedes preguntarme sobre:\n• Cómo crear un empeño\n• Cómo vender una prenda\n• Estados de créditos\n• Cerrar caja\n• O sobre cualquier módulo del sistema',
    timestamp: new Date()
  }])
  const [input, setInput] = useState('')
  const [isLoadingIA, setIsLoadingIA] = useState(false)
  const [intentosFallidos, setIntentosFallidos] = useState(0) // Contador de respuestas no útiles
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Validar si la pregunta está relacionada con el sistema
  const esContextoValido = (mensaje: string): boolean => {
    const mensajeLower = mensaje.toLowerCase()

    // Palabras clave VÁLIDAS del sistema
    const palabrasClaveValidas = [
      'empeño', 'credito', 'crédito', 'prenda', 'cliente', 'caja', 'boveda', 'bóveda',
      'venta', 'pago', 'tasacion', 'tasación', 'desembolso', 'interes', 'interés', 'mora',
      'usuario', 'reporte', 'categoria', 'categoría', 'sucursal', 'apertura', 'cierre',
      'efectivo', 'dinero', 'saldo', 'movimiento', 'estado', 'vigente', 'vencido',
      'digiprenda', 'sistema', 'modulo', 'módulo', 'crear', 'como', 'cómo', 'que', 'qué',
      'registrar', 'editar', 'eliminar', 'buscar', 'filtrar', 'exportar', 'imprimir',
      'ayuda', 'help', 'hola', 'buenos', 'dias', 'días', 'tardes', 'noches'
    ]

    // Palabras clave INVÁLIDAS (fuera de contexto)
    const palabrasClaveInvalidas = [
      'receta', 'cocina', 'comida', 'pizza', 'futbol', 'fútbol', 'mundial', 'partido',
      'pelicula', 'película', 'serie', 'netflix', 'youtube', 'tiktok', 'facebook',
      'whatsapp', 'instagram', 'clima', 'tiempo', 'temperatura', 'lluvia',
      'chiste', 'broma', 'amor', 'novia', 'novio', 'cita', 'fiesta',
      'juego', 'videojuego', 'gta', 'minecraft', 'fortnite',
      'medicina', 'enfermedad', 'doctor', 'hospital', 'farmacia',
      'política', 'presidente', 'elecciones', 'partido político'
    ]

    // Si contiene palabras INVÁLIDAS → rechazar
    const contieneInvalidas = palabrasClaveInvalidas.some(palabra =>
      mensajeLower.includes(palabra)
    )

    if (contieneInvalidas) {
      return false
    }

    // Si es muy corto (< 3 caracteres) y no es un saludo → rechazar
    if (mensaje.trim().length < 3 && !mensajeLower.match(/^(hola|hi|hey)$/)) {
      return false
    }

    // Si contiene palabras VÁLIDAS → aceptar
    const contieneValidas = palabrasClaveValidas.some(palabra =>
      mensajeLower.includes(palabra)
    )

    return contieneValidas
  }

  // Función para llamar a GROQ a través de nuestro backend
  const consultarIA = async (mensaje: string): Promise<string | null> => {
    try {
      setIsLoadingIA(true)

      // Construir contexto OPTIMIZADO del sistema (solo descripciones, no todo el detalle)
      const contextoSistema = Object.entries(KNOWLEDGE_BASE.modulos)
        .map(([modulo, info]) => `${modulo}: ${info.descripcion}`)
        .join('\n')

      const token = localStorage.getItem('token')

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${apiBase}/chatbot/consultar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          mensaje: mensaje,
          contexto: contextoSistema // Cambiar a "contexto" según backend
        })
      })

      if (!response.ok) {
        console.error('Error en respuesta del servidor:', response.status, response.statusText)
        return null // Fallback a búsqueda local
      }

      const data = await response.json()
      console.log('Respuesta del chatbot:', data)

      if (data.success && data.respuesta) {
        return data.respuesta
      } else {
        console.warn('Respuesta no exitosa:', data)
        return null // Fallback a búsqueda local
      }
    } catch (error) {
      console.error('Error consultando IA:', error)
      return null // Fallback a búsqueda local
    } finally {
      setIsLoadingIA(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const findAnswer = (query: string): string => {
    const q = query.toLowerCase().trim()

    // 1️⃣ CORRECCIÓN ORTOGRÁFICA
    const qCorregido = corregirOrtografia(q)
    console.log('🔍 Búsqueda:', { original: q, corregido: qCorregido })

    // Normalizar consulta (quitar acentos, signos)
    const normalizar = (str: string) => str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!]/g, '')
      .trim()

    const qNorm = normalizar(qCorregido)

    // 2️⃣ Búsqueda exacta en respuestas rápidas (con texto corregido)
    for (const [key, answer] of Object.entries(QUICK_ANSWERS)) {
      const keyNorm = normalizar(key)
      if (qNorm.includes(keyNorm) || keyNorm.includes(qNorm)) {
        return answer
      }
    }

    // 3️⃣ Búsqueda FUZZY en respuestas rápidas (tolerante a errores)
    const palabrasClave = Object.keys(QUICK_ANSWERS)
    const palabraSimilar = buscarPalabraSimilar(qCorregido, palabrasClave, 0.65)

    if (palabraSimilar) {
      console.log('✅ Coincidencia fuzzy encontrada:', palabraSimilar)
      return QUICK_ANSWERS[palabraSimilar]
    }

    // Búsqueda en módulos
    for (const [modulo, info] of Object.entries(KNOWLEDGE_BASE.modulos)) {
      const moduloNorm = normalizar(modulo)
      const descNorm = normalizar(info.descripcion)
      if (qNorm.includes(moduloNorm) || qNorm.includes(descNorm)) {
        return `**${modulo.toUpperCase()}**\n\n${info.descripcion}\n\n**Funciones principales:**\n${info.funciones.slice(0, 8).map(f => `• ${f}`).join('\n')}\n\n💡 Escribe "${modulo}" para ver más detalles.`
      }
    }

    // Búsqueda en flujos
    for (const [flujo, pasos] of Object.entries(KNOWLEDGE_BASE.flujos)) {
      if (q.includes(flujo)) {
        return `**Flujo: ${flujo}**\n\n${pasos}`
      }
    }

    // Ayuda genérica
    if (q.includes('ayuda') || q.includes('help') || q.includes('qué puedes hacer')) {
      return `Puedo ayudarte con:\n\n**Módulos:**\n${Object.keys(KNOWLEDGE_BASE.modulos).map(m => `• ${m}`).join('\n')}\n\n**Flujos comunes:**\n${Object.keys(KNOWLEDGE_BASE.flujos).map(f => `• ${f}`).join('\n')}\n\nEscribe tu pregunta o el nombre del módulo.`
    }

    // Respuesta por defecto (retorna string vacío para indicar que no encontró)
    return ''
  }

  // 🆘 Generar mensaje de soporte cuando hay muchos intentos fallidos
  const generarMensajeSoporte = (intentos: number): string => {
    return `😔 Veo que llevas ${intentos} intentos sin encontrar lo que buscas.

🆘 **¿Necesitas ayuda personalizada?**

📞 **Contacta a nuestro equipo de soporte:**

📧 Email: soporte@digiprenda.com
📱 WhatsApp: +502 1234-5678
☎️ Teléfono: +502 2222-3333
💬 Chat en vivo: www.digiprenda.com

**Horarios de atención:**
Lun-Vie: 8:00 AM - 6:00 PM
Sáb: 9:00 AM - 2:00 PM

💡 **O intenta reformular tu pregunta:**
Ejemplos:
• "¿Cómo crear un empeño?"
• "¿Cómo cerrar la caja?"
• "¿Qué puedo hacer en el sistema?"

Estamos aquí para ayudarte! 🤝`
  }

  const handleSend = async () => {
    if (!input.trim() || isLoadingIA) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const mensajeUsuario = input.trim()
    setInput('') // Limpiar input inmediatamente

    // ✍️ CORRECCIÓN ORTOGRÁFICA del mensaje
    const mensajeCorregido = corregirOrtografia(mensajeUsuario)
    if (mensajeCorregido !== mensajeUsuario.toLowerCase()) {
      console.log('📝 Ortografía corregida:', { original: mensajeUsuario, corregido: mensajeCorregido })
    }

    // 🛡️ FILTRO: Validar contexto ANTES de consultar IA (usa mensaje corregido)
    if (!esContextoValido(mensajeCorregido)) {
      // Respuesta automática para preguntas fuera de contexto
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '😅 Ups! Solo puedo ayudarte con temas relacionados al sistema **Digiprenda**.\n\nPuedo responder sobre:\n• Cómo crear empeños/créditos\n• Gestión de caja y bóveda\n• Clientes y categorías\n• Ventas de prendas\n• Reportes y usuarios\n\n💡 ¿En qué te puedo ayudar del sistema?',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
      }, 300)
      return // NO consultar IA
    }

    // Intentar respuesta con IA primero (usa mensaje corregido)
    const respuestaIA = await consultarIA(mensajeCorregido)

    if (respuestaIA) {
      // ✅ Respuesta de IA exitosa - resetear contador
      setIntentosFallidos(0)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: respuestaIA,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } else {
      // Fallback a búsqueda local si IA falla (usa mensaje corregido)
      setTimeout(() => {
        const answer = findAnswer(mensajeCorregido)

        if (answer) {
          // ✅ Encontró respuesta - resetear contador
          setIntentosFallidos(0)
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: answer,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, botMessage])
        } else {
          // ❌ No encontró respuesta - incrementar contador
          const nuevoIntentos = intentosFallidos + 1
          setIntentosFallidos(nuevoIntentos)

          let respuestaFinal: string

          // 🆘 Después de 3 intentos, sugerir contactar soporte
          if (nuevoIntentos >= 3) {
            respuestaFinal = generarMensajeSoporte(nuevoIntentos)
            setIntentosFallidos(0) // Resetear después de mostrar mensaje de soporte
          } else {
            // Respuesta genérica con sugerencias
            respuestaFinal = `No encontré una respuesta específica para "${mensajeUsuario}".

¿Quieres saber sobre alguno de estos temas?
• Crear empeño
• Vender prenda
• Cerrar caja
• Estados de créditos
• Gestión de clientes

O escribe "ayuda" para ver todas las opciones.

💡 Intento ${nuevoIntentos}/3 - Si no encuentras lo que buscas, te sugeriré contactar a soporte.`
          }

          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: respuestaFinal,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, botMessage])
        }
      }, 300)
    }
  }

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 rounded-full shadow-lg z-[100]"
          size="icon"
        >
          <Chats className="h-6 w-6" />
        </Button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-6rem)] sm:h-[600px] max-h-[600px] shadow-2xl z-[100] flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-300">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Robot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Asistente Virtual</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                    En línea
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2',
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.type === 'bot' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Robot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 max-w-[80%]',
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.type === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoadingIA && handleSend()}
                placeholder={isLoadingIA ? "🤖 Consultando IA..." : "Escribe tu pregunta..."}
                className="flex-1"
                disabled={isLoadingIA}
              />
              <Button onClick={handleSend} size="icon" disabled={isLoadingIA}>
                {isLoadingIA ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PaperPlaneRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {isLoadingIA ? 'Procesando consulta...' : 'Presiona Enter para enviar'}
            </p>
          </div>
        </Card>
      )}
    </>
  )
}
