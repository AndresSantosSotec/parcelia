/**
 * Conocimiento operativo del chatbot: TerraCloud / Parcelia
 * (venta de terrenos). El legado de empeños no se enseña en operación.
 */

export type RolChatbot =
  | 'superadmin'
  | 'administrador'
  | 'cajero'
  | 'vendedor'
  | 'tasador'
  | 'supervisor'
  | string

export const MARCA = 'TerraCloud'

export function normalizarRol(rol?: string | null): RolChatbot {
  const r = (rol || '').toLowerCase().trim()
  if (r === 'superadmin' || r === 'administrador' || r === 'cajero' || r === 'vendedor' || r === 'tasador' || r === 'supervisor') {
    return r
  }
  return 'cajero'
}

export function esAdmin(rol: RolChatbot): boolean {
  return rol === 'superadmin' || rol === 'administrador'
}

export const ALCANCE_POR_ROL: Record<string, string> = {
  superadmin: 'Soporte: acceso total operativo más auditoría (bitácora, errores HTTP, terminal Laravel) y generador de formularios/campos dinámicos. Es el rol para depurar caídas del sistema.',
  administrador: 'Acceso total operativo: fincas (editar/desactivar), ventas, cobros, tasas & mora, reportes, usuarios y sucursales. Puede rescindir negociaciones. No ve auditoría ni el generador de formularios (eso es de soporte).',
  vendedor: 'Puede registrar compradores, fincas/parcelas/lotes (crear y editar, no desactivar), armar negociaciones y contratos, y cobrar con caja abierta. No puede rescindir ni configurar tasas/mora.',
  cajero: 'Puede abrir/cerrar caja, cobrar pagos de terreno (serie TER), ver negociaciones y compradores. No arma contratos ni edita inventario de lotes.',
  tasador: 'En esta operación el simulador de cuotas es su herramienta principal. No hay tasación de prendas: el sistema vende terrenos.',
  supervisor: 'Consulta operaciones, reportes y recibos. No desactiva fincas ni rescinde ventas salvo que un administrador lo autorice.',
}

export const CONTEXTO_IA = `
Sistema: ${MARCA} (Parcelia). Dominio: administración y venta de terrenos en Guatemala.
Jerarquía: Finca → Parcela/Manzana → Lote → Negociación → Plan de pagos → Pago de terreno.
NO es un sistema de empeños. Créditos prendarios, prendas, remates y venta de prendas están ocultos y no se operan.
Si preguntan por empeño/prenda/refrendo: indicar que no está disponible en esta operación y redirigir a lotes/negociaciones.

Módulos visibles:
- Fincas & Lotes: inventario territorial. Editar finca (PUT). Desactivar finca (POST) solo si no hay lotes reservados, en negociación, vendidos o pagados. Reactivar con PUT activo=true.
- Ventas & Contratos (negociaciones): contado, crédito o reserva.
- Tasas & Mora: catálogo de tasas anuales y parametrización de mora inmobiliaria.
- Compradores (clientes): DPI 13 dígitos, teléfono, no eliminar si tiene operación activa.
- Simulador de cuotas: francés, alemán, americano.
- Caja & Cobros: hay que abrir caja para cobrar. Un recibo serie TER por cobro.
- Recibos, Reportes inmobiliarios, Personalización, Usuarios, Sucursales.
- Auditoría y Formularios (campos dinámicos): solo superadmin de soporte, para depurar errores y caídas.
- Contabilidad: solo superadmin de soporte.

Estados de lote: disponible → reservado | en_negociacion → vendido → pagado. Cancelado vuelve a disponible.
Ocupación: lotes.negociacion_activa_id. Un lote no se vende dos veces (lockForUpdate).
Crédito: negociación → enganche → plan de pagos → lote vendido.
Contado: en_negociacion → vendido → cobro en caja → pagado.
Reserva: estado reservado; hay que cancelar/rescindir antes de vender a otro.
Mora propia de terrenos (no copiar empeños): % diario sobre capital vencido O monto fijo por día + días de gracia. Se toma SNAPSHOT al crear la negociación.
Prelación de pago: mora → interés → cargos → capital.
Rescisión: anula cobros de último a primero, revierte recibo/caja, lote a disponible. El vendedor NO puede rescindir (403).
Área: frente × fondo sugiere m², no obliga.
Plusvalía: snapshot en negociacion.precio_original.
Saldo capital pendiente = monto financiado (el enganche es deuda aparte hasta cobrarse).
`.trim()

export const KNOWLEDGE_BASE = {
  modulos: {
    fincas: {
      descripcion: 'Inventario territorial: fincas, parcelas/manzanas y lotes con fotos y precios',
      funciones: [
        'Registrar finca (nombre, municipio, departamento, área, folio/libro)',
        'Editar finca desde la tabla (lápiz)',
        'Desactivar finca si no tiene lotes en operación; reactivar si está inactiva',
        'Agregar parcelas/manzanas y lotes (frente, fondo, área, precio)',
        'Subir fotos del lote a disco',
        'Filtrar lotes por estado: disponible, reservado, vendido, pagado',
      ],
    },
    negociaciones: {
      descripcion: 'Ventas y contratos de lotes: reserva, contado o crédito con plan de pagos',
      funciones: [
        'Seleccionar comprador activo y lote disponible (no ocupado)',
        'Crédito: enganche pactado, plazo, tasa (catálogo o %), sistema francés/alemán/americano',
        'Contado: cobra el precio final en caja al registrar',
        'Reserva: el lote queda reservado hasta cancelar o convertir',
        'Rescindir (admin): revierte cobros, recibos y libera el lote',
      ],
    },
    tasas: {
      descripcion: 'Catálogo de tasas anuales y mora de terrenos (porcentaje diario o monto fijo)',
      funciones: [
        'Crear/editar tasas inmobiliarias vigentes',
        'Parametrizar mora: % diario sobre capital vencido o Q fijo por día + gracia',
        'La negociación guarda un snapshot; cambiar el catálogo no altera ventas ya hechas',
      ],
    },
    compradores: {
      descripcion: 'Compradores de lotes (módulo Clientes). DPI único de 13 dígitos',
      funciones: [
        'Alta con nombres, apellidos, DPI, teléfono y dirección',
        'No se elimina si tiene negociación activa',
        'Buscar por nombre, DPI o código',
      ],
    },
    simulador: {
      descripcion: 'Simula cuotas de financiamiento de un lote antes de firmar',
      funciones: [
        'Monto, plazo, tasa anual y método (francés, alemán, americano)',
        'No crea la venta; solo proyecta el plan',
      ],
    },
    caja: {
      descripcion: 'Caja diaria para cobros de terreno. El cobro emite recibo TER y mueve efectivo',
      funciones: [
        'Abrir caja con saldo inicial (una abierta por usuario)',
        'Cobrar enganche, cuotas o pago total con caja abierta',
        'Cerrar con arqueo de denominaciones',
      ],
    },
    auditoria: {
      descripcion: 'Herramienta de soporte: bitácora de todo el sistema, errores HTTP y logs de Laravel',
      funciones: [
        'Filtrar por fincas, negociaciones, pagos o caja',
        'Ver excepciones no capturadas (se refresca cada 30 s)',
        'Leer laravel.log en la pestaña Terminal Laravel',
      ],
    },
    formularios: {
      descripcion: 'Generador de formularios y campos dinámicos (módulo Formularios). Solo superadmin de soporte',
      funciones: [
        'Crear categorías y definir campos extra de un formulario',
        'Depurar altas cuando un campo no aparece o falla validación',
      ],
    },
    recibos: {
      descripcion: 'Recibos de cobro de terreno (serie TER). Un recibo por pago',
      funciones: ['Buscar, reimprimir PDF', 'Anular solo el último pago según reglas del sistema'],
    },
    reportes: {
      descripcion: 'Reportes inmobiliarios: inventario, ventas, cobranza e ingresos (PDF/Excel)',
      funciones: ['Inventario de lotes', 'Ventas del periodo', 'Cobranza y mora', 'Ingresos de caja por terrenos'],
    },
  },
  flujos: {
    'crear finca': `📋 FINCA → PARCELA → LOTE
1. Fincas & Lotes → Nueva Finca (nombre, municipio, departamento, área)
2. Nueva Parcela / manzana dentro de la finca
3. Nuevo Lote: número, frente × fondo (sugiere m²), precio de venta
4. Opcional: fotos del lote
5. El lote nace en estado disponible`,
    'crear negociacion': `🤝 VENTA DE LOTE
1. Compradores: buscar o registrar (DPI 13 dígitos)
2. Caja abierta si vas a cobrar en el acto
3. Ventas & Contratos → nueva negociación
4. Lote disponible (no ocupado) + tipo: crédito / contado / reserva
5. Crédito: enganche y plazo. El lote pasa a en_negociacion; vendido al pagar el enganche y generar el plan
6. Contado: se cobra el total en caja y el lote termina pagado
7. Reserva: lote reservado; hay que rescindir/cancelar antes de venderlo a otro`,
    'cobrar terreno': `💰 COBRO
1. Abrir caja
2. Ventas & Contratos → la negociación → registrar pago
3. Orden de aplicación: mora → interés → cargos → capital
4. Se emite un recibo TER y entra a caja
5. No se puede cobrar sin caja abierta`,
    'rescindir': `↩️ RESCINDIR (administrador)
1. Ventas & Contratos → negociación activa
2. Rescindir con motivo (mín. 5 caracteres)
3. Se anulan cobros de último a primero, se revierte caja/recibo
4. El lote vuelve a disponible
⚠️ El vendedor recibe 403; debe hacerlo un administrador`,
    'desactivar finca': `⛔ DESACTIVAR FINCA
1. En la tabla: icono de apagado
2. Solo si no hay lotes reservados, en negociación, vendidos o pagados
3. Si hay operación: el sistema responde que no se puede
4. Reactivar con el mismo icono (finca inactiva)`,
    'abrir caja': `🏦 CAJA
1. Caja & Cobros → Aperturar (saldo inicial)
2. Una caja abierta por usuario
3. Cobros de terreno se registran solos como ingreso
4. Cerrar con arqueo al fin del día`,
  },
}

export function contextoParaIA(rol: RolChatbot): string {
  return `${CONTEXTO_IA}

Rol del usuario actual: ${rol}
Alcance de este rol: ${ALCANCE_POR_ROL[rol] || ALCANCE_POR_ROL.cajero}

Responde según lo que ESE rol puede hacer. Si pide algo fuera de su permiso, explícalo y dile quién sí puede (administrador).`
}

export function saludoInicial(rol: RolChatbot, empresa = MARCA): string {
  const base = `¡Hola! 👋 Soy el asistente de **${empresa}** (venta de terrenos y lotes).`

  if (rol === 'superadmin') {
    return `${base}

Eres **soporte**. Puedo ayudarte a:
• Depurar con Auditoría (bitácora, errores HTTP, terminal Laravel)
• Usar Formularios (generador de campos dinámicos)
• Y también toda la operación inmobiliaria

Ejemplo: "cómo ver un error 500" o "dónde está el generador de formularios".`
  }

  if (rol === 'vendedor') {
    return `${base}

Puedo ayudarte con:
• Registrar comprador y armar una venta
• Crear o editar finca / lote (no desactivar)
• Simular cuotas y cobrar con caja abierta

No puedo guiarte a rescindir una venta ni a configurar mora: eso lo hace un administrador.

Escribe tu pregunta, por ejemplo: "cómo vender un lote".`
  }

  if (rol === 'cajero') {
    return `${base}

Puedo ayudarte con:
• Abrir y cerrar caja
• Cobrar enganche o cuotas (recibo TER)
• Consultar negociaciones y compradores

El inventario de lotes y los contratos los arma el asesor/administrador.

Ejemplo: "cómo cobrar una cuota".`
  }

  if (rol === 'tasador') {
    return `${base}

En esta operación no se tasan prendas. Usa el **Simulador de cuotas** para proyectar un financiamiento de lote.

Ejemplo: "cómo simular un crédito de terreno".`
  }

  return `${base}

Módulos: Fincas & Lotes · Ventas & Contratos · Tasas & Mora · Compradores · Simulador · Caja · Recibos · Reportes.

Ejemplos: "cómo vender un lote", "cómo se cobra la mora", "cómo desactivar una finca".`
}

function notaPermiso(rol: RolChatbot, accion: 'rescindir' | 'desactivar' | 'tasas'): string {
  if (esAdmin(rol)) return ''
  if (accion === 'rescindir') {
    return '\n\n⚠️ Con tu rol no puedes rescindir. Pide a un administrador.'
  }
  if (accion === 'desactivar') {
    return '\n\n⚠️ Desactivar fincas es de administrador. Tú puedes editar datos, no apagar la finca.'
  }
  return '\n\n⚠️ La configuración de tasas y mora la hace un administrador. Tú puedes consultarlas.'
}

export function respuestasRapidas(rol: RolChatbot, empresa = MARCA): Record<string, string> {
  const ayudaSoporte = `🆘 **AYUDA — SOPORTE (superadmin)**

🔍 Auditoría — bitácora de todo el sistema
🐛 Errores HTTP — excepciones 500 (auto 30 s)
🖥️ Terminal Laravel — laravel.log
🧩 Formularios — generador de campos dinámicos

Más la operación: fincas, ventas, tasas, caja, usuarios.`

  const ayudaAdmin = `🆘 **AYUDA — ${empresa}**

🏡 Fincas & Lotes — inventario, editar, desactivar
🤝 Ventas & Contratos — crédito, contado, reserva, rescisión
📈 Tasas & Mora — % anual y mora (diario o fijo)
👤 Compradores — DPI 13 dígitos
🧮 Simulador de cuotas
💰 Caja y cobros TER
📊 Reportes de inventario, ventas y cobranza

El módulo de empeños no está en operación.`

  const ayudaVendedor = `🆘 **AYUDA — asesor**

• Compradores y ventas de lote
• Crear/editar finca y lote (no desactivar)
• Simulador y cobro con caja abierta
• No rescindir ni parametrizar mora`

  const ayudaCajero = `🆘 **AYUDA — caja**

• Abrir / cerrar caja
• Cobrar pagos de terreno (mora → interés → cargos → capital)
• Recibos TER
• Ver negociaciones; no armar contratos`

  const textoAyuda = rol === 'superadmin'
    ? ayudaSoporte
    : esAdmin(rol)
      ? ayudaAdmin
      : rol === 'cajero'
        ? ayudaCajero
        : rol === 'vendedor'
          ? ayudaVendedor
          : ayudaAdmin

  return {
    hola: saludoInicial(rol, empresa),
    ayuda: textoAyuda,
    'que puedes hacer': textoAyuda,
    'que puedo hacer': textoAyuda,
    auditoria: KNOWLEDGE_BASE.modulos.auditoria.descripcion + '\n• ' + KNOWLEDGE_BASE.modulos.auditoria.funciones.join('\n• '),
    errores: 'En Auditoría → Errores HTTP ves excepciones 500. Se refresca cada 30 s. Si no aparece, revisa Terminal Laravel (laravel.log).',
    formularios: KNOWLEDGE_BASE.modulos.formularios.descripcion + '\n• ' + KNOWLEDGE_BASE.modulos.formularios.funciones.join('\n• '),
    laravel: 'Auditoría → Terminal Laravel muestra laravel.log. Recarga cada 30 s. Sirve para ver por qué se cae el backend.',
    'crear finca': KNOWLEDGE_BASE.flujos['crear finca'],
    'nueva finca': KNOWLEDGE_BASE.flujos['crear finca'],
    'editar finca': `✏️ En Fincas & Lotes, lápiz en la fila. Cambia nombre, ubicación o área y guarda. No cambia el estado de los lotes.`,
    'desactivar finca': KNOWLEDGE_BASE.flujos['desactivar finca'] + notaPermiso(rol, 'desactivar'),
    'vender lote': KNOWLEDGE_BASE.flujos['crear negociacion'],
    'crear negociacion': KNOWLEDGE_BASE.flujos['crear negociacion'],
    'como vender': KNOWLEDGE_BASE.flujos['crear negociacion'],
    cobro: KNOWLEDGE_BASE.flujos['cobrar terreno'],
    cobrar: KNOWLEDGE_BASE.flujos['cobrar terreno'],
    'pagar cuota': KNOWLEDGE_BASE.flujos['cobrar terreno'],
    mora: `📉 **MORA DE TERRENOS** (no es la de empeños)

Se configura en Tasas & Mora:
• Porcentaje diario sobre capital vencido, o
• Monto fijo por día
• Más días de gracia

Al crear la venta se guarda un snapshot. Si luego cambias el catálogo, las ventas viejas no cambian.

Prelación al cobrar: mora → interés → cargos → capital.` + notaPermiso(rol, 'tasas'),
    tasas: `📈 Tasas inmobiliarias (módulo Tasas & Mora): porcentaje anual vigente. La negociación copia la tasa; no queda amarrada al catálogo después.` + notaPermiso(rol, 'tasas'),
    rescindir: KNOWLEDGE_BASE.flujos['rescindir'] + notaPermiso(rol, 'rescindir'),
    cancelar: KNOWLEDGE_BASE.flujos['rescindir'] + notaPermiso(rol, 'rescindir'),
    'abrir caja': KNOWLEDGE_BASE.flujos['abrir caja'],
    'cerrar caja': KNOWLEDGE_BASE.flujos['abrir caja'],
    caja: KNOWLEDGE_BASE.flujos['abrir caja'],
    simulador: `🧮 Simulador de cuotas: monto, plazo, tasa anual y método francés / alemán / americano. No registra la venta; solo proyecta.`,
    comprador: `👤 Compradores: DPI de 13 dígitos, teléfono y datos de contacto. Busca antes de crear. No elimines si tiene una negociación activa.`,
    cliente: `👤 En ${empresa} el módulo Clientes son **compradores de lotes**. DPI 13 dígitos. No es un padrón de empeños.`,
    'estados lote': `📍 **ESTADOS DEL LOTE**
• disponible
• reservado (reserva vigente)
• en_negociacion
• vendido (financiado / contrato)
• pagado (escriturado / liquidado)
• cancelado → vuelve a disponible

Un lote ocupado (negociacion_activa_id) no se puede vender otra vez.`,
    empeño: `Este sistema opera **venta de terrenos**. El módulo de empeños no está disponible en la operación actual.

¿Te ayudo a registrar un lote o una negociación?`,
    empeno: `Este sistema opera **venta de terrenos**. El módulo de empeños no está disponible en la operación actual.`,
    prenda: `No hay prendas ni tasación de artículos. El inventario son **lotes** dentro de fincas.`,
    remate: `No hay remates de prendas. Para liberar un lote vendido usa **rescindir** (administrador).`,
    soporte: `📞 Si el sistema no responde lo esperado, anota el usuario, la pantalla y una captura. El asistente solo cubre TerraCloud (terrenos).`,
  }
}

export const PALABRAS_VALIDAS = [
  'finca', 'lote', 'parcela', 'manzana', 'terreno', 'negociacion', 'negociación',
  'venta', 'contrato', 'comprador', 'cliente', 'caja', 'recibo', 'cuota', 'enganche',
  'mora', 'tasa', 'interes', 'interés', 'simulador', 'plan', 'pago', 'rescindir',
  'cancelar', 'desactivar', 'editar', 'reporte', 'sucursal', 'usuario', 'asesor',
  'terracloud', 'parcelia', 'sistema', 'modulo', 'módulo', 'ayuda', 'hola',
  'credito', 'crédito', 'contado', 'reserva', 'disponible', 'vendido', 'pagado',
  'frente', 'fondo', 'foto', 'imagen', 'dpi', 'crear', 'como', 'cómo', 'que', 'qué',
  'cobrar', 'abrir', 'cerrar', 'escritur',
]

export const PALABRAS_INVALIDAS = [
  'receta', 'cocina', 'comida', 'pizza', 'futbol', 'fútbol', 'mundial', 'partido',
  'pelicula', 'película', 'serie', 'netflix', 'youtube', 'tiktok', 'facebook',
  'whatsapp', 'instagram', 'clima', 'chiste', 'broma', 'novia', 'novio',
  'juego', 'videojuego', 'gta', 'minecraft', 'fortnite',
  'medicina', 'enfermedad', 'doctor', 'hospital',
  'política', 'presidente', 'elecciones',
]

export const CORRECCIONES: Record<string, string> = {
  empeno: 'empeño', enpeno: 'empeño',
  credito: 'crédito', kredito: 'crédito',
  negociacion: 'negociación', negocacion: 'negociación',
  finca: 'finca', fina: 'finca',
  lote: 'lote', lotes: 'lotes',
  comprador: 'comprador', clente: 'comprador', cliente: 'cliente',
  mora: 'mora', tasa: 'tasa',
  caja: 'caja', kaja: 'caja',
  rescindir: 'rescindir', recindir: 'rescindir',
  ayuda: 'ayuda', ayda: 'ayuda',
  como: 'cómo', que: 'qué',
}

export function esContextoValido(mensaje: string): boolean {
  const lower = mensaje.toLowerCase()
  if (PALABRAS_INVALIDAS.some((p) => lower.includes(p))) return false
  if (mensaje.trim().length < 3 && !lower.match(/^(hola|hi|hey)$/)) return false
  return PALABRAS_VALIDAS.some((p) => lower.includes(p))
}

export function corregirOrtografia(texto: string): string {
  let out = texto.toLowerCase()
  for (const [error, correccion] of Object.entries(CORRECCIONES)) {
    out = out.replace(new RegExp(`\\b${error}\\b`, 'gi'), correccion)
  }
  return out
}

export function calcularSimilitud(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []
  for (let i = 0; i <= len1; i++) matrix[i] = [i]
  for (let j = 0; j <= len2; j++) matrix[0][j] = j
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }
  const maxLen = Math.max(len1, len2)
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen
}

export function buscarPalabraSimilar(palabra: string, lista: string[], umbral = 0.7): string | null {
  let mejor: string | null = null
  let score = 0
  for (const candidato of lista) {
    const s = calcularSimilitud(palabra.toLowerCase(), candidato.toLowerCase())
    if (s > score && s >= umbral) {
      score = s
      mejor = candidato
    }
  }
  return mejor
}

const normalizar = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!]/g, '').trim()

export function buscarRespuestaLocal(query: string, rol: RolChatbot, empresa = MARCA): string {
  const qCorregido = corregirOrtografia(query)
  const qNorm = normalizar(qCorregido)
  const answers = respuestasRapidas(rol, empresa)

  for (const [key, answer] of Object.entries(answers)) {
    const keyNorm = normalizar(key)
    if (qNorm.includes(keyNorm) || keyNorm.includes(qNorm)) return answer
  }

  const similar = buscarPalabraSimilar(qCorregido, Object.keys(answers), 0.65)
  if (similar) return answers[similar]

  for (const [modulo, info] of Object.entries(KNOWLEDGE_BASE.modulos)) {
    if (qNorm.includes(normalizar(modulo)) || qNorm.includes(normalizar(info.descripcion))) {
      return `**${modulo.toUpperCase()}**\n\n${info.descripcion}\n\n${info.funciones.map((f) => `• ${f}`).join('\n')}`
    }
  }

  for (const [flujo, pasos] of Object.entries(KNOWLEDGE_BASE.flujos)) {
    if (qCorregido.includes(flujo)) return `**${flujo}**\n\n${pasos}`
  }

  if (qNorm.includes('ayuda') || qNorm.includes('help')) {
    return answers.ayuda
  }

  return ''
}

export function mensajeFueraDeContexto(empresa = MARCA): string {
  return `😅 Solo puedo ayudarte con **${empresa}** (terrenos, lotes, ventas, caja y cobros).\n\nNo cubro empeños ni temas ajenos al sistema.\n\nPrueba: "cómo vender un lote" o "cómo abrir caja".`
}

export function mensajeSinRespuesta(pregunta: string, intento: number, rol: RolChatbot): string {
  const sugerencias = esAdmin(rol)
    ? '• Cómo vender un lote\n• Cómo se cobra la mora\n• Cómo desactivar una finca\n• Cómo rescindir'
    : rol === 'cajero'
      ? '• Cómo abrir caja\n• Cómo cobrar una cuota\n• Qué es un recibo TER'
      : '• Cómo registrar un comprador\n• Cómo vender un lote\n• Cómo simular cuotas'

  return `No encontré algo concreto para "${pregunta}".

${sugerencias}

Intento ${intento}/3. Si no aparece, pide apoyo a un administrador.`
}
