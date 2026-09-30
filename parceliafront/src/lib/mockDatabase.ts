/**
 * Parcelia Mock Database - Motor 100% Standalone / Frontend Local
 * Permite que todo el sistema funcione completamente libre sin backend.
 * Persiste datos en localStorage para que cualquier creación, edición,
 * eliminación o pago se refleje en tiempo real.
 */

const STORAGE_PREFIX = 'parcelia_db_'

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key)
    if (!item) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultValue))
      return defaultValue
    }
    return JSON.parse(item)
  } catch {
    return defaultValue
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('Error saving to localStorage:', e)
  }
}

// ---------------- SEED DATA INICIAL ---------------- //

const SEED_SUCURSALES = [
  { id: 1, nombre: 'Sucursal Central', codigo: 'SUC-01', direccion: '6a Avenida 12-20, Zona 1, Guatemala', telefono: '2234-5678', activo: true, es_matriz: true },
  { id: 2, nombre: 'Sucursal Zona 10', codigo: 'SUC-02', direccion: 'Avenida La Reforma 8-60, Zona 10', telefono: '2334-8900', activo: true, es_matriz: false },
  { id: 3, nombre: 'Sucursal Quetzaltenango', codigo: 'SUC-03', direccion: '4a Calle 14-50, Zona 3, Xela', telefono: '7765-4321', activo: true, es_matriz: false },
  { id: 4, nombre: 'Sucursal Petén', codigo: 'SUC-04', direccion: 'Calle Principal Santa Elena, Flores', telefono: '7926-1122', activo: true, es_matriz: false }
]

export const SEED_FINCAS = [
  {
    id: 1,
    nombre: 'Finca Los Laureles',
    codigo: 'FIN-LAUR',
    ubicacion: 'Km 34.5 Carretera a El Salvador, Fraijanes',
    municipio: 'Fraijanes',
    departamento: 'Guatemala',
    area_total_m2: 125000,
    numero_finca: '1420',
    folio: '20',
    libro: '45E de Guatemala',
    descripcion: 'Proyecto campestre con vistas panorámicas, clima templado y garita de acceso privada.',
    activo: true,
    created_at: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 2,
    nombre: 'Residenciales Buena Vista',
    codigo: 'FIN-BVIST',
    ubicacion: 'Km 22 Carretera al Pacífico, Bárcenas',
    municipio: 'Villa Nueva',
    departamento: 'Guatemala',
    area_total_m2: 85000,
    numero_finca: '3500',
    folio: '112',
    libro: '89E de Guatemala',
    descripcion: 'Urbanización moderna con servicios completos subterráneos, parques y áreas deportivas.',
    activo: true,
    created_at: '2025-02-15T00:00:00.000Z'
  }
]

export const SEED_PARCELAS = [
  {
    id: 1,
    finca_id: 1,
    nombre_identificador: 'Manzana A - Sector Pinos',
    codigo: 'MZA-A',
    area_m2: 25000,
    medidas_perimetro: 'Norte: 250m, Sur: 250m, Este: 100m, Oeste: 100m',
    colindancias: 'N: Calle Principal, S: Manzana B, E: Bosque Comunal, O: Garita',
    tipo_terreno: 'Plano',
    descripcion: 'Lotes residenciales frente a parque ecológico',
    activo: true
  },
  {
    id: 2,
    finca_id: 1,
    nombre_identificador: 'Manzana B - Sector Mirador',
    codigo: 'MZA-B',
    area_m2: 30000,
    medidas_perimetro: 'Norte: 300m, Sur: 300m, Este: 100m, Oeste: 100m',
    colindancias: 'N: Manzana A, S: Límite Sur Finca, E: Mirador, O: Calle 2',
    tipo_terreno: 'Ondulado Leve',
    descripcion: 'Lotes premium con vista al valle',
    activo: true
  },
  {
    id: 3,
    finca_id: 2,
    nombre_identificador: 'Sector 1 - Boulevard Principal',
    codigo: 'SEC-01',
    area_m2: 40000,
    medidas_perimetro: 'Norte: 200m, Sur: 200m, Este: 200m, Oeste: 200m',
    colindancias: 'N: Boulevard, S: Sector 2, E: Área Comercial, O: Pozo de Agua',
    tipo_terreno: 'Plano',
    descripcion: 'Terrenos con vocación mixta comercial y residencial',
    activo: true
  }
]

export const SEED_LOTES = [
  {
    id: 1,
    parcela_id: 1,
    numero_lote: 'L-01',
    codigo_unico: 'FIN-LAUR-MZA-A-L01',
    area_m2: 200,
    frente_metros: 10,
    fondo_metros: 20,
    colindancias: 'N: Calle Los Pinos, S: Lote 12, E: Lote 02, O: Límite Manzana',
    tipo_terreno: 'Residencial',
    precio_m2: 475,
    precio_venta: 95000,
    estado: 'disponible',
    servicios: [
      { id: 1, nombre_servicio: 'Agua Potable', estado: 'disponible', costo_adicional: 0 },
      { id: 2, nombre_servicio: 'Energía Eléctrica', estado: 'disponible', costo_adicional: 0 },
      { id: 3, nombre_servicio: 'Drenajes Sanitarios', estado: 'disponible', costo_adicional: 0 },
      { id: 4, nombre_servicio: 'Acceso Asfaltado', estado: 'disponible', costo_adicional: 0 }
    ],
    imagenes: [
      { id: 1, url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', descripcion: 'Vista frontal del lote', es_principal: true }
    ],
    observaciones: 'Excelente ubicación junto a la garita principal'
  },
  {
    id: 2,
    parcela_id: 1,
    numero_lote: 'L-02',
    codigo_unico: 'FIN-LAUR-MZA-A-L02',
    area_m2: 240,
    frente_metros: 12,
    fondo_metros: 20,
    colindancias: 'N: Calle Los Pinos, S: Lote 11, E: Lote 03, O: Lote 01',
    tipo_terreno: 'Residencial Esquina',
    precio_m2: 500,
    precio_venta: 120000,
    estado: 'disponible',
    servicios: [
      { id: 1, nombre_servicio: 'Agua Potable', estado: 'disponible', costo_adicional: 0 },
      { id: 2, nombre_servicio: 'Energía Eléctrica', estado: 'disponible', costo_adicional: 0 },
      { id: 3, nombre_servicio: 'Drenajes Sanitarios', estado: 'disponible', costo_adicional: 0 }
    ],
    imagenes: [],
    observaciones: 'Lote de esquina de alta plusvalía'
  },
  {
    id: 3,
    parcela_id: 1,
    numero_lote: 'L-03',
    codigo_unico: 'FIN-LAUR-MZA-A-L03',
    area_m2: 200,
    frente_metros: 10,
    fondo_metros: 20,
    colindancias: 'N: Calle Los Pinos, S: Lote 10, E: Lote 04, O: Lote 02',
    tipo_terreno: 'Residencial',
    precio_m2: 450,
    precio_venta: 90000,
    estado: 'vendido',
    servicios: [
      { id: 1, nombre_servicio: 'Agua Potable', estado: 'disponible', costo_adicional: 0 },
      { id: 2, nombre_servicio: 'Energía Eléctrica', estado: 'disponible', costo_adicional: 0 }
    ],
    imagenes: [],
    observaciones: 'Vendido con financiamiento propio a 24 meses'
  },
  {
    id: 4,
    parcela_id: 2,
    numero_lote: 'L-15',
    codigo_unico: 'FIN-LAUR-MZA-B-L15',
    area_m2: 350,
    frente_metros: 14,
    fondo_metros: 25,
    colindancias: 'N: Calle Mirador, S: Reserva Natural, E: Lote 16, O: Lote 14',
    tipo_terreno: 'Campestre Mirador',
    precio_m2: 550,
    precio_venta: 192500,
    estado: 'reservado',
    servicios: [
      { id: 1, nombre_servicio: 'Agua Potable', estado: 'disponible', costo_adicional: 0 },
      { id: 2, nombre_servicio: 'Energía Eléctrica', estado: 'disponible', costo_adicional: 0 },
      { id: 3, nombre_servicio: 'Drenaje Ecológico', estado: 'en_proceso', costo_adicional: 1500 }
    ],
    imagenes: [],
    observaciones: 'Reserva activa pendiente de completar enganche'
  }
]

export const SEED_NEGOCIACIONES = [
  {
    id: 1,
    codigo_negociacion: 'NEG-2026-0001',
    cliente_id: 1,
    comprador: { id: 1, nombre_completo: 'Carlos Roberto Mendoza Gómez', dpi: '2987123450101', telefono: '5544-3322', email: 'carlos.mendoza@email.com' },
    lote_id: 3,
    lote: { id: 3, codigo_unico: 'FIN-LAUR-MZA-A-L03', numero_lote: 'L-03', area_m2: 200, parcela: { nombre_identificador: 'Manzana A - Sector Pinos', finca: { nombre: 'Finca Los Laureles' } } },
    tipo_negociacion: 'credito',
    precio_original: 90000,
    descuento: 2000,
    gastos_escrituracion: 3500,
    precio_final: 91500,
    enganche_pactado: 15000,
    enganche_pagado: 15000,
    monto_financiado: 76500,
    tasa_interes_anual: 6.0,
    plazo_meses: 24,
    cuota_mensual: 3389.25,
    total_intereses_proyectados: 4842.00,
    total_a_pagar: 96342.00,
    total_capital_pagado: 21250.00,
    total_interes_pagado: 750.00,
    total_mora_pagada: 0,
    saldo_capital_pendiente: 70250.00,
    cuotas_pagadas: 2,
    cuotas_pendientes: 22,
    dias_mora_actual: 0,
    fecha_negociacion: '2026-06-01',
    fecha_primer_pago: '2026-07-01',
    fecha_vencimiento_contrato: '2028-06-01',
    estado: 'activa',
    observaciones: 'Venta con financiamiento directo con la desarrolladora.',
    planPagos: [
      { id: 1, numero_cuota: 1, fecha_vencimiento: '2026-07-01', cuota_capital: 3006.75, cuota_interes: 382.50, cuota_monto_total: 3389.25, saldo_capital_restante: 73493.25, monto_pagado: 3389.25, estado: 'pagada', fecha_pagado: '2026-07-01' },
      { id: 2, numero_cuota: 2, fecha_vencimiento: '2026-08-01', cuota_capital: 3021.78, cuota_interes: 367.47, cuota_monto_total: 3389.25, saldo_capital_restante: 70471.47, monto_pagado: 3389.25, estado: 'pagada', fecha_pagado: '2026-08-01' },
      { id: 3, numero_cuota: 3, fecha_vencimiento: '2026-09-01', cuota_capital: 3036.89, cuota_interes: 352.36, cuota_monto_total: 3389.25, saldo_capital_restante: 67434.58, monto_pagado: 0, estado: 'pendiente' }
    ]
  }
]

const SEED_CATEGORIAS = [
  { id: 1, nombre: 'Joyería y Oro', codigo: 'JOY', descripcion: 'Joyas, anillos, cadenas de 10k, 14k, 18k, 24k y plata', porcentaje_prestamo: 80, tasa_interes_sugerida: 3.5, requiere_serie: false, activo: true, subcategorias: [{ id: 101, nombre: 'Oro 14k' }, { id: 102, nombre: 'Oro 18k' }, { id: 103, nombre: 'Plata 925' }] },
  { id: 2, nombre: 'Electrónica & Smartphones', codigo: 'ELE', descripcion: 'Teléfonos móviles, tabletas, consolas de videojuegos', porcentaje_prestamo: 65, tasa_interes_sugerida: 5.0, requiere_serie: true, activo: true, subcategorias: [{ id: 201, nombre: 'Smartphones' }, { id: 202, nombre: 'Consolas' }, { id: 203, nombre: 'Audio' }] },
  { id: 3, nombre: 'Computación', codigo: 'COM', descripcion: 'Laptops, computadoras de escritorio, monitores y periféricos', porcentaje_prestamo: 60, tasa_interes_sugerida: 4.5, requiere_serie: true, activo: true, subcategorias: [{ id: 301, nombre: 'Laptops' }, { id: 302, nombre: 'Desktops' }] },
  { id: 4, nombre: 'Vehículos & Motos', codigo: 'VEH', descripcion: 'Automóviles, motocicletas y vehículos livianos', porcentaje_prestamo: 70, tasa_interes_sugerida: 3.0, requiere_serie: true, activo: true, subcategorias: [{ id: 401, nombre: 'Motocicletas' }, { id: 402, nombre: 'Sedanes' }, { id: 403, nombre: 'SUVs' }] },
  { id: 5, nombre: 'Herramientas y Maquinaria', codigo: 'HER', descripcion: 'Herramientas industriales, plantas eléctricas y soldadoras', porcentaje_prestamo: 55, tasa_interes_sugerida: 5.0, requiere_serie: true, activo: true, subcategorias: [{ id: 501, nombre: 'Eléctricas' }, { id: 502, nombre: 'Generadores' }] },
  { id: 6, nombre: 'Terrenos & Lotes (Parcelia)', codigo: 'PAR', descripcion: 'Lotes residenciales, derechos posesorios y parcelamientos', porcentaje_prestamo: 85, tasa_interes_sugerida: 2.5, requiere_serie: false, activo: true, subcategorias: [{ id: 601, nombre: 'Lote Residencial' }, { id: 602, nombre: 'Terreno Comercial' }] }
]

const SEED_CLIENTES = [
  {
    id: 1,
    nombres: 'Carlos Roberto',
    apellidos: 'Mendoza Gómez',
    dpi: '2987123450101',
    nit: '8492019-2',
    telefono: '5544-3322',
    telefono_secundario: '4433-2211',
    email: 'carlos.mendoza@email.com',
    direccion: '12 Calle 4-55 Zona 1, Ciudad de Guatemala',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    genero: 'masculino',
    estado_civil: 'casado',
    profesion: 'Comerciante Independiente',
    tipo_cliente: 'vip',
    estado: 'activo',
    limite_credito: 50000,
    credito_disponible: 32000,
    total_creditos: 8,
    creditos_activos: 2,
    calificacion: 'A',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    created_at: '2025-11-10T10:00:00.000Z'
  },
  {
    id: 2,
    nombres: 'María Elena',
    apellidos: 'García Morales',
    dpi: '1890456780101',
    nit: '7123984-5',
    telefono: '5877-6655',
    email: 'maria.garcia@email.com',
    direccion: 'Avenida Elena 14-22 Zona 3, Guatemala',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    genero: 'femenino',
    estado_civil: 'soltera',
    profesion: 'Contadora',
    tipo_cliente: 'regular',
    estado: 'activo',
    limite_credito: 25000,
    credito_disponible: 20000,
    total_creditos: 3,
    creditos_activos: 1,
    calificacion: 'A',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    created_at: '2026-01-15T14:30:00.000Z'
  },
  {
    id: 3,
    nombres: 'José Fernando',
    apellidos: 'López Castillo',
    dpi: '3012567890901',
    nit: '9928172-1',
    telefono: '4122-8899',
    email: 'jose.lopez@email.com',
    direccion: 'Diagonal 3 8-12 Zona 1, Quetzaltenango',
    municipio: 'Quetzaltenango',
    departamento: 'Quetzaltenango',
    genero: 'masculino',
    estado_civil: 'casado',
    profesion: 'Ingeniero Mecánico',
    tipo_cliente: 'regular',
    estado: 'activo',
    limite_credito: 35000,
    credito_disponible: 18500,
    total_creditos: 5,
    creditos_activos: 1,
    calificacion: 'B',
    sucursal_id: 3,
    sucursal: { id: 3, nombre: 'Sucursal Quetzaltenango' },
    created_at: '2026-02-01T09:15:00.000Z'
  },
  {
    id: 4,
    nombres: 'Ana Lucía',
    apellidos: 'Estrada Ramos',
    dpi: '2456789010101',
    nit: '6342119-8',
    telefono: '3055-1234',
    email: 'analucia.estrada@email.com',
    direccion: '7a Calle 2-15 Zona 14, Guatemala',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    genero: 'femenino',
    estado_civil: 'soltera',
    profesion: 'Diseñadora Gráfica',
    tipo_cliente: 'vip',
    estado: 'activo',
    limite_credito: 60000,
    credito_disponible: 45000,
    total_creditos: 12,
    creditos_activos: 2,
    calificacion: 'A',
    sucursal_id: 2,
    sucursal: { id: 2, nombre: 'Sucursal Zona 10' },
    created_at: '2025-08-20T11:45:00.000Z'
  }
]

const SEED_CREDITOS = [
  {
    id: 1,
    numero_credito: '0130082601000101',
    codigo_credito: '0130082601000101',
    cliente_id: 1,
    cliente_nombre: 'Carlos Roberto Mendoza Gómez',
    cliente_documento: '2987123450101',
    cliente_telefono: '5544-3322',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    monto_avaluo: 18000,
    monto_prestamo: 12000,
    monto_capital: 12000,
    tasa_interes: 4.5,
    interes_mora: 2.0,
    plazo_meses: 3,
    frecuencia_pago: 'mensual',
    fecha_desembolso: '2026-08-01',
    fecha_vencimiento: '2026-11-01',
    proximo_vencimiento: '2026-09-01',
    estado: 'vigente',
    saldo_actual: 12540,
    saldo_capital: 12000,
    saldo_interes: 540,
    saldo_mora: 0,
    dias_atraso: 0,
    total_pagado: 0,
    renovaciones_count: 0,
    categoria_nombre: 'Joyería y Oro',
    prendas: [
      {
        id: 101,
        descripcion: 'Cadena de Oro 14 Kilates estilo tejido cubano con dije cruz',
        categoria_id: 1,
        categoria_nombre: 'Joyería y Oro',
        peso_gramos: 32.5,
        kilataje: '14k',
        valor_avaluo: 18000,
        monto_prestamo: 12000,
        estado: 'custodia',
        ubicacion: 'Gaveta A-12, Bóveda 1'
      }
    ],
    created_at: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 2,
    numero_credito: '0130082601000102',
    codigo_credito: '0130082601000102',
    cliente_id: 2,
    cliente_nombre: 'María Elena García Morales',
    cliente_documento: '1890456780101',
    cliente_telefono: '5877-6655',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    monto_avaluo: 8500,
    monto_prestamo: 5000,
    monto_capital: 5000,
    tasa_interes: 5.0,
    interes_mora: 2.0,
    plazo_meses: 2,
    frecuencia_pago: 'mensual',
    fecha_desembolso: '2026-07-15',
    fecha_vencimiento: '2026-09-15',
    proximo_vencimiento: '2026-09-15',
    estado: 'vigente',
    saldo_actual: 5250,
    saldo_capital: 5000,
    saldo_interes: 250,
    saldo_mora: 0,
    dias_atraso: 0,
    total_pagado: 250,
    renovaciones_count: 1,
    categoria_nombre: 'Electrónica & Smartphones',
    prendas: [
      {
        id: 102,
        descripcion: 'iPhone 15 Pro Max 256GB Titanio Natural, caja y cargador original',
        categoria_id: 2,
        categoria_nombre: 'Electrónica & Smartphones',
        marca: 'Apple',
        modelo: 'iPhone 15 Pro Max',
        serie: 'F2LXV89K09',
        valor_avaluo: 8500,
        monto_prestamo: 5000,
        estado: 'custodia',
        ubicacion: 'Estante E-04, Bóveda 1'
      }
    ],
    created_at: '2026-07-15T15:30:00.000Z'
  },
  {
    id: 3,
    numero_credito: '0130082601000103',
    codigo_credito: '0130082601000103',
    cliente_id: 3,
    cliente_nombre: 'José Fernando López Castillo',
    cliente_documento: '3012567890901',
    cliente_telefono: '4122-8899',
    sucursal_id: 3,
    sucursal: { id: 3, nombre: 'Sucursal Quetzaltenango' },
    monto_avaluo: 25000,
    monto_prestamo: 16500,
    monto_capital: 16500,
    tasa_interes: 4.0,
    interes_mora: 2.0,
    plazo_meses: 6,
    frecuencia_pago: 'mensual',
    fecha_desembolso: '2026-05-10',
    fecha_vencimiento: '2026-08-10',
    proximo_vencimiento: '2026-08-10',
    estado: 'vencido',
    saldo_actual: 18150,
    saldo_capital: 16500,
    saldo_interes: 1320,
    saldo_mora: 330,
    dias_atraso: 20,
    total_pagado: 1320,
    renovaciones_count: 0,
    categoria_nombre: 'Vehículos & Motos',
    prendas: [
      {
        id: 103,
        descripcion: 'Motocicleta Bajaj Pulsar NS200 Modelo 2024, Placas M-890XYZ',
        categoria_id: 4,
        categoria_nombre: 'Vehículos & Motos',
        marca: 'Bajaj',
        modelo: 'Pulsar NS200',
        serie: 'MD2A12BY8N0912',
        valor_avaluo: 25000,
        monto_prestamo: 16500,
        estado: 'custodia',
        ubicacion: 'Parqueo Custodia Xela'
      }
    ],
    created_at: '2026-05-10T12:00:00.000Z'
  }
]

const SEED_USUARIOS = [
  {
    id: 1,
    name: 'Administrador General',
    username: 'admin',
    email: 'admin@parcelia.local',
    rol: 'administrador',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    activo: true,
    created_at: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Roberto Valenzuela',
    username: 'cajero1',
    email: 'cajero@parcelia.local',
    rol: 'cajero',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    activo: true,
    created_at: '2025-06-01T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'Licda. Sandra Morales',
    username: 'tasador1',
    email: 'tasador@parcelia.local',
    rol: 'tasador',
    sucursal_id: 1,
    sucursal: { id: 1, nombre: 'Sucursal Central' },
    activo: true,
    created_at: '2025-06-15T00:00:00.000Z'
  }
]

const SEED_CAJAS = [
  {
    id: 1,
    nombre: 'Caja Principal 01',
    codigo: 'CAJA-01',
    sucursal_id: 1,
    sucursal_nombre: 'Sucursal Central',
    usuario_id: 1,
    usuario_nombre: 'Administrador General',
    estado: 'abierta',
    monto_apertura: 5000,
    monto_actual: 38450,
    total_ingresos: 45450,
    total_egresos: 12000,
    fecha_apertura: new Date().toISOString().split('T')[0] + ' 08:00:00',
    movimientos: [
      { id: 1, tipo: 'apertura', concepto: 'Apertura de turno', monto: 5000, fecha: '08:00:00', usuario: 'Admin' },
      { id: 2, tipo: 'ingreso', concepto: 'Abono Crédito #0130082601000102', monto: 250, fecha: '10:15:00', usuario: 'Admin' },
      { id: 3, tipo: 'egreso', concepto: 'Desembolso Empeño Nuevo #0130082601000101', monto: 12000, fecha: '11:30:00', usuario: 'Admin' },
      { id: 4, tipo: 'ingreso', concepto: 'Venta Mostrador Prenda Joyería', monto: 45200, fecha: '14:20:00', usuario: 'Admin' }
    ]
  }
]

const SEED_BOVEDAS = [
  {
    id: 1,
    nombre: 'Bóveda Principal',
    codigo: 'BOV-01',
    sucursal_id: 1,
    sucursal_nombre: 'Sucursal Central',
    saldo_efectivo: 250000,
    valor_prendas_custodia: 685000,
    total_prendas: 142,
    estado: 'activa',
    movimientos: [
      { id: 1, tipo: 'traslado_a_caja', concepto: 'Dotación inicial a Caja 01', monto: 5000, fecha: '08:00:00', autorizo: 'Supervisor' },
      { id: 2, tipo: 'ingreso_bancario', concepto: 'Depósito de fondos operativos', monto: 50000, fecha: '12:00:00', autorizo: 'Admin' }
    ]
  }
]

const SEED_PLANES_INTERES = [
  { id: 1, nombre: 'Plan Oro Estándar', porcentaje: 3.5, moratorio: 1.5, periodo: 'mensual', descripcion: 'Tasa preferencial para prendas de oro y joyería fina', activo: true },
  { id: 2, nombre: 'Plan Electrónica & Computación', porcentaje: 5.0, moratorio: 2.0, periodo: 'mensual', descripcion: 'Para smartphones, laptops y línea blanca', activo: true },
  { id: 3, nombre: 'Plan Express Quincenal', porcentaje: 2.5, moratorio: 1.0, periodo: 'quincenal', descripcion: 'Plazos cortos de 15 a 45 días', activo: true },
  { id: 4, nombre: 'Plan Parcelia Inmobiliario', porcentaje: 2.0, moratorio: 1.0, periodo: 'mensual', descripcion: 'Garantías sobre títulos de lotes y terrenos', activo: true }
]

const SEED_VENTAS = [
  {
    id: 1,
    numero_factura: 'FAC-00129',
    cliente_nombre: 'Comprador Mostrador',
    fecha: '2026-08-28T16:00:00.000Z',
    items: [
      { descripcion: 'Anillo de Oro Blanco con Diamante 0.25ct', categoria: 'Joyería y Oro', precio: 4500, descuento: 200, subtotal: 4300 }
    ],
    total: 4300,
    metodo_pago: 'efectivo',
    estado: 'completada'
  }
]

const SEED_GASTOS = [
  { id: 1, concepto: 'Servicios de Internet y Red', categoria: 'Servicios Básicos', monto: 650, fecha: '2026-08-25', estado: 'pagado', sucursal_id: 1 },
  { id: 2, concepto: 'Material de Oficina y Facturación', categoria: 'Papelería', monto: 380, fecha: '2026-08-27', estado: 'pagado', sucursal_id: 1 }
]

// ---------------- DATABASE CLASS ---------------- //

class MockDatabase {
  private initialized = false

  public init(): void {
    if (this.initialized) return
    getStorage('sucursales', SEED_SUCURSALES)
    getStorage('categorias', SEED_CATEGORIAS)
    getStorage('clientes', SEED_CLIENTES)
    getStorage('creditos', SEED_CREDITOS)
    getStorage('usuarios', SEED_USUARIOS)
    getStorage('cajas', SEED_CAJAS)
    getStorage('bovedas', SEED_BOVEDAS)
    getStorage('planes_interes', SEED_PLANES_INTERES)
    getStorage('ventas', SEED_VENTAS)
    getStorage('gastos', SEED_GASTOS)
    getStorage('cotizaciones', [])
    getStorage('compras', [])
    getStorage('remates', [])
    getStorage('auditoria', [
      { id: 1, accion: 'LOGIN', usuario: 'admin', detalle: 'Inicio de sesión exitoso en modo plantilla', fecha: new Date().toISOString() },
      { id: 2, accion: 'CONFIG', usuario: 'admin', detalle: 'Inicialización de motor local Parcelia', fecha: new Date().toISOString() }
    ])
    this.initialized = true
  }

  public handleRequest(endpoint: string, method: string = 'GET', body?: any): { success: boolean; data?: any; message?: string; pagination?: any; stats?: any } {
    this.init()
    const cleanEndpoint = endpoint.split('?')[0].replace(/^\/api\/v1/, '').replace(/^\//, '')
    const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '')

    // 1. AUTH
    if (cleanEndpoint.startsWith('auth/login')) {
      const user = SEED_USUARIOS[0]
      return {
        success: true,
        data: {
          token: 'mock-jwt-token-parcelia-standalone-2026',
          expires_in: 86400 * 30,
          user: user
        },
        message: 'Sesión iniciada correctamente (Modo Standalone)'
      }
    }
    if (cleanEndpoint.startsWith('auth/me')) {
      return { success: true, data: SEED_USUARIOS[0] }
    }
    if (cleanEndpoint.startsWith('auth/refresh-token')) {
      return { success: true, data: { token: 'mock-jwt-token-refreshed', expires_in: 86400 * 30 } }
    }
    if (cleanEndpoint.startsWith('auth/cambiar-sucursal')) {
      return { success: true, message: 'Sucursal cambiada correctamente' }
    }
    if (cleanEndpoint.startsWith('auth/logout')) {
      return { success: true, message: 'Sesión cerrada' }
    }

    // ----------------------------------------------------
    // 🏡 REAL ESTATE & TERRENOS: FINCAS, PARCELAS, LOTES
    // ----------------------------------------------------
    if (cleanEndpoint.startsWith('fincas')) {
      const fincas = getStorage<any[]>('fincas', SEED_FINCAS)
      const parcelas = getStorage<any[]>('parcelas', SEED_PARCELAS)
      const lotes = getStorage<any[]>('lotes', SEED_LOTES)

      if (method === 'POST') {
        const parts = cleanEndpoint.split('/')
        // POST /fincas/:id/parcelas
        if (parts.length >= 3 && parts[2] === 'parcelas') {
          const fincaId = parseInt(parts[1])
          const newP = { id: Date.now(), finca_id: fincaId, ...body, activo: true }
          parcelas.push(newP)
          setStorage('parcelas', parcelas)
          return { success: true, data: newP, message: 'Parcela agregada exitosamente' }
        }
        // POST /fincas
        const newF = { id: Date.now(), codigo: `FIN-0${fincas.length + 1}`, ...body, activo: true }
        fincas.push(newF)
        setStorage('fincas', fincas)
        return { success: true, data: newF, message: 'Finca registrada exitosamente' }
      }

      // Detalle de Finca con parcelas y lotes
      const parts = cleanEndpoint.split('/')
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        const fId = parseInt(parts[1])
        const finca = fincas.find(f => f.id === fId)
        if (finca) {
          const pList = parcelas.filter(p => p.finca_id === fId).map(p => ({
            ...p,
            lotes: lotes.filter(l => l.parcela_id === p.id)
          }))
          return { success: true, data: { ...finca, parcelas: pList } }
        }
      }

      const fincasWithCounts = fincas.map(f => {
        const fParcelas = parcelas.filter(p => p.finca_id === f.id)
        const pIds = fParcelas.map(p => p.id)
        const fLotes = lotes.filter(l => pIds.includes(l.parcela_id))
        return {
          ...f,
          parcelas_count: fParcelas.length,
          lotes_count: fLotes.length,
          lotes_disponibles_count: fLotes.filter(l => l.estado === 'disponible').length,
          parcelas: fParcelas
        }
      })
      return { success: true, data: fincasWithCounts }
    }

    if (cleanEndpoint.startsWith('parcelas')) {
      const parcelas = getStorage<any[]>('parcelas', SEED_PARCELAS)
      const lotes = getStorage<any[]>('lotes', SEED_LOTES)
      const parts = cleanEndpoint.split('/')
      // POST /parcelas/:id/lotes
      if (method === 'POST' && parts.length >= 3 && parts[2] === 'lotes') {
        const parcelaId = parseInt(parts[1])
        const newL = {
          id: Date.now(),
          parcela_id: parcelaId,
          codigo_unico: body.codigo_unico || `LOTE-${Date.now().toString().slice(-4)}`,
          estado: 'disponible',
          servicios: body.servicios || [],
          imagenes: [],
          ...body
        }
        lotes.push(newL)
        setStorage('lotes', lotes)
        return { success: true, data: newL, message: 'Lote registrado exitosamente' }
      }
      return { success: true, data: parcelas }
    }

    if (cleanEndpoint.startsWith('lotes')) {
      const lotes = getStorage<any[]>('lotes', SEED_LOTES)
      const parcelas = getStorage<any[]>('parcelas', SEED_PARCELAS)
      const fincas = getStorage<any[]>('fincas', SEED_FINCAS)

      if (cleanEndpoint === 'lotes/disponibles') {
        const disp = lotes.filter(l => l.estado === 'disponible').map(l => {
          const par = parcelas.find(p => p.id === l.parcela_id)
          const fin = fincas.find(f => f.id === par?.finca_id)
          return { ...l, parcela: { ...par, finca: fin } }
        })
        return { success: true, data: disp }
      }

      if (method === 'PUT') {
        const parts = cleanEndpoint.split('/')
        const id = parseInt(parts[1])
        const idx = lotes.findIndex(l => l.id === id)
        if (idx !== -1) {
          lotes[idx] = { ...lotes[idx], ...body }
          setStorage('lotes', lotes)
          return { success: true, data: lotes[idx], message: 'Lote actualizado' }
        }
      }

      const lotesFull = lotes.map(l => {
        const par = parcelas.find(p => p.id === l.parcela_id)
        const fin = fincas.find(f => f.id === par?.finca_id)
        return { ...l, parcela: { ...par, finca: fin } }
      })
      return { success: true, data: lotesFull }
    }

    // ----------------------------------------------------
    // 💼 SIMULADOR & NEGOCIACIONES INMOBILIARIAS
    // ----------------------------------------------------
    if (cleanEndpoint.startsWith('simulador/calcular')) {
      const precioLote = parseFloat(body.precio_lote || 0)
      const descuento = parseFloat(body.descuento || 0)
      const gastos = parseFloat(body.gastos_escrituracion || 0)
      const precioFinal = Math.max(0, precioLote - descuento + gastos)
      const enganche = parseFloat(body.enganche || 0)
      const montoFinanciado = Math.max(0, precioFinal - enganche)
      const plazoMeses = parseInt(body.plazo_meses || 12)
      const tasaAnual = parseFloat(body.tasa_interes_anual || 0)
      const tasaMensual = (tasaAnual / 100) / 12

      let cuotaMensual = 0
      if (tasaMensual > 0) {
        cuotaMensual = (montoFinanciado * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses))
      } else {
        cuotaMensual = plazoMeses > 0 ? (montoFinanciado / plazoMeses) : 0
      }
      cuotaMensual = Math.round(cuotaMensual * 100) / 100

      const tabla: Array<{
        numero_cuota: number
        fecha_vencimiento: string
        cuota_capital: number
        cuota_interes: number
        cuota_monto_total: number
        saldo_capital_restante: number
      }> = []
      let saldo = montoFinanciado
      let totalInteres = 0
      const fecha = new Date()

      for (let i = 1; i <= plazoMeses; i++) {
        fecha.setMonth(fecha.getMonth() + 1)
        const interes = Math.round(saldo * tasaMensual * 100) / 100
        let capital = Math.round((cuotaMensual - interes) * 100) / 100
        if (i === plazoMeses || capital > saldo) capital = saldo
        saldo = Math.max(0, Math.round((saldo - capital) * 100) / 100)
        totalInteres += interes

        tabla.push({
          numero_cuota: i,
          fecha_vencimiento: fecha.toISOString().split('T')[0],
          cuota_capital: capital,
          cuota_interes: interes,
          cuota_monto_total: capital + interes,
          saldo_capital_restante: saldo
        })
      }

      return {
        success: true,
        data: {
          precio_original: precioLote,
          descuento,
          gastos_escrituracion: gastos,
          precio_final: precioFinal,
          enganche,
          monto_financiado: montoFinanciado,
          tasa_interes_anual: tasaAnual,
          plazo_meses: plazoMeses,
          cuota_mensual: cuotaMensual,
          total_intereses_proyectados: Math.round(totalInteres * 100) / 100,
          total_a_pagar: Math.round((enganche + montoFinanciado + totalInteres) * 100) / 100,
          tabla_amortizacion: tabla
        }
      }
    }

    if (cleanEndpoint.startsWith('negociaciones')) {
      const negociaciones = getStorage<any[]>('negociaciones', SEED_NEGOCIACIONES)
      const lotes = getStorage<any[]>('lotes', SEED_LOTES)
      const clientes = getStorage<any[]>('clientes', SEED_CLIENTES)

      if (method === 'POST') {
        const lote = lotes.find(l => l.id === body.lote_id)
        const cliente = clientes.find(c => c.id === body.cliente_id)

        const con = negociaciones.length + 1
        const codigo = `NEG-2026-${String(con).padStart(4, '0')}`
        const precioFin = Math.max(0, (body.precio_original || 0) - (body.descuento || 0) + (body.gastos_escrituracion || 0))
        const enganche = parseFloat(body.enganche_pactado || 0)
        const financiado = Math.max(0, precioFin - enganche)

        // Generar plan
        const plan: Array<{
          id: number
          numero_cuota: number
          fecha_vencimiento: string
          cuota_capital: number
          cuota_interes: number
          cuota_monto_total: number
          saldo_capital_restante: number
          monto_pagado: number
          estado: string
        }> = []
        const meses = parseInt(body.plazo_meses || 12)
        const cuota = meses > 0 ? financiado / meses : 0
        const f = new Date()
        for (let i = 1; i <= meses; i++) {
          f.setMonth(f.getMonth() + 1)
          plan.push({
            id: Date.now() + i,
            numero_cuota: i,
            fecha_vencimiento: f.toISOString().split('T')[0],
            cuota_capital: Math.round(cuota * 100) / 100,
            cuota_interes: 0,
            cuota_monto_total: Math.round(cuota * 100) / 100,
            saldo_capital_restante: Math.max(0, Math.round((financiado - cuota * i) * 100) / 100),
            monto_pagado: 0,
            estado: 'pendiente'
          })
        }

        const newNeg = {
          id: Date.now(),
          codigo_negociacion: codigo,
          cliente_id: body.cliente_id,
          comprador: cliente,
          lote_id: body.lote_id,
          lote: lote,
          tipo_negociacion: body.tipo_negociacion || 'credito',
          precio_original: body.precio_original,
          descuento: body.descuento || 0,
          gastos_escrituracion: body.gastos_escrituracion || 0,
          precio_final: precioFin,
          enganche_pactado: enganche,
          enganche_pagado: 0,
          monto_financiado: financiado,
          tasa_interes_anual: body.tasa_interes_anual || 0,
          plazo_meses: meses,
          cuota_mensual: Math.round(cuota * 100) / 100,
          saldo_capital_pendiente: financiado + enganche,
          total_capital_pagado: 0,
          total_interes_pagado: 0,
          total_mora_pagada: 0,
          cuotas_pagadas: 0,
          cuotas_pendientes: meses,
          fecha_negociacion: body.fecha_negociacion || new Date().toISOString().split('T')[0],
          estado: body.tipo_negociacion === 'reserva' ? 'reservada' : 'activa',
          observaciones: body.observaciones,
          planPagos: plan,
          pagos: []
        }

        negociaciones.unshift(newNeg)
        setStorage('negociaciones', negociaciones)

        // Actualizar lote
        if (lote) {
          lote.estado = body.tipo_negociacion === 'reserva' ? 'reservado' : 'vendido'
          setStorage('lotes', lotes)
        }

        return { success: true, data: newNeg, message: 'Negociación creada exitosamente' }
      }

      return { success: true, data: negociaciones }
    }

    if (cleanEndpoint.startsWith('pagos-terrenos')) {
      const negociaciones = getStorage<any[]>('negociaciones', SEED_NEGOCIACIONES)
      const pagos = getStorage<any[]>('pagos_terrenos', [])

      if (method === 'POST') {
        const neg = negociaciones.find(n => n.id === body.negociacion_id)
        if (!neg) return { success: false, message: 'Negociación no encontrada' }

        const monto = parseFloat(body.monto || 0)
        const tipo = body.tipo_pago || 'cuota_normal'
        const saldoAnt = neg.saldo_capital_pendiente
        const saldoPost = Math.max(0, saldoAnt - monto)

        neg.saldo_capital_pendiente = saldoPost
        neg.total_capital_pagado += monto
        if (tipo === 'enganche') neg.enganche_pagado += monto

        // Actualizar cuota si aplica
        if (neg.planPagos && neg.planPagos.length > 0) {
          const cuotaPend = neg.planPagos.find((p: any) => p.estado === 'pendiente')
          if (cuotaPend) {
            cuotaPend.monto_pagado = monto
            cuotaPend.estado = 'pagada'
            cuotaPend.fecha_pagado = new Date().toISOString().split('T')[0]
            neg.cuotas_pagadas = (neg.cuotas_pagadas || 0) + 1
            neg.cuotas_pendientes = Math.max(0, (neg.cuotas_pendientes || 1) - 1)
          }
        }

        if (saldoPost <= 0) neg.estado = 'pagada_total'
        setStorage('negociaciones', negociaciones)

        const numRecibo = `REC-TER-2026-${String(pagos.length + 1).padStart(5, '0')}`
        const newPago = {
          id: Date.now(),
          numero_recibo: numRecibo,
          negociacion_id: neg.id,
          negociacion_codigo: neg.codigo_negociacion,
          cliente_id: neg.cliente_id,
          comprador: neg.comprador,
          lote_id: neg.lote_id,
          lote: neg.lote,
          tipo_pago: tipo,
          monto_total: monto,
          saldo_anterior: saldoAnt,
          saldo_posterior: saldoPost,
          metodo_pago: body.metodo_pago || 'efectivo',
          fecha_pago: new Date().toISOString(),
          concepto: `Pago de ${tipo} - Lote: ${neg.lote?.codigo_unico || 'Lote'}`,
          usuario: 'Administrador'
        }

        pagos.unshift(newPago)
        setStorage('pagos_terrenos', pagos)

        // Registrar en Caja
        const cajas = getStorage<any[]>('cajas', SEED_CAJAS)
        if (cajas.length > 0) {
          cajas[0].monto_actual += monto
          cajas[0].total_ingresos += monto
          cajas[0].movimientos.unshift({
            id: Date.now(),
            tipo: 'ingreso',
            concepto: `Pago Venta Terreno ${numRecibo}`,
            monto: monto,
            fecha: new Date().toLocaleTimeString(),
            usuario: 'Administrador'
          })
          setStorage('cajas', cajas)
        }

        return { success: true, data: newPago, message: 'Pago registrado exitosamente en caja' }
      }

      return { success: true, data: pagos }
    }

    // 2. DASHBOARD / STATS
    if (cleanEndpoint.startsWith('dashboard') || cleanEndpoint.startsWith('stats')) {
      const creditos = getStorage<any[]>('creditos', SEED_CREDITOS)
      const clientes = getStorage<any[]>('clientes', SEED_CLIENTES)
      const cajas = getStorage<any[]>('cajas', SEED_CAJAS)
      const bovedas = getStorage<any[]>('bovedas', SEED_BOVEDAS)

      const totalCapitalPrestado = creditos.reduce((acc, c) => acc + (Number(c.monto_prestamo) || 0), 0)
      const totalSaldoPendiente = creditos.reduce((acc, c) => acc + (Number(c.saldo_actual) || 0), 0)
      const totalCreditosActivos = creditos.filter(c => c.estado === 'vigente').length
      const totalCreditosVencidos = creditos.filter(c => c.estado === 'vencido').length

      return {
        success: true,
        data: {
          resumen: {
            capital_prestado: totalCapitalPrestado,
            saldo_pendiente: totalSaldoPendiente,
            creditos_activos: totalCreditosActivos,
            creditos_vencidos: totalCreditosVencidos,
            total_clientes: clientes.length,
            total_prendas_custodia: 142,
            efectivo_cajas: cajas.reduce((a, b) => a + (Number(b.monto_actual) || 0), 0),
            efectivo_boveda: bovedas.reduce((a, b) => a + (Number(b.saldo_efectivo) || 0), 0),
            ingresos_mes: 48500,
            intereses_cobrados_mes: 12400
          },
          creditos_por_mes: [
            { mes: 'Ene', monto: 65000, cantidad: 14 },
            { mes: 'Feb', monto: 78000, cantidad: 18 },
            { mes: 'Mar', monto: 85000, cantidad: 21 },
            { mes: 'Abr', monto: 92000, cantidad: 24 },
            { mes: 'May', monto: 110000, cantidad: 28 },
            { mes: 'Jun', monto: 125000, cantidad: 32 },
            { mes: 'Jul', monto: 140000, cantidad: 35 },
            { mes: 'Ago', monto: 158000, cantidad: 39 }
          ],
          categorias_top: [
            { categoria: 'Joyería y Oro', porcentaje: 45, monto: 71100 },
            { categoria: 'Electrónica', porcentaje: 25, monto: 39500 },
            { categoria: 'Vehículos & Motos', porcentaje: 20, monto: 31600 },
            { categoria: 'Terrenos (Parcelia)', porcentaje: 10, monto: 15800 }
          ],
          ultimas_operaciones: [
            { id: 1, tipo: 'empenio', descripcion: 'Empeño Cadena Oro 14k', cliente: 'Carlos Mendoza', monto: 12000, hora: '10:30' },
            { id: 2, tipo: 'abono', descripcion: 'Abono iPhone 15 Pro', cliente: 'María García', monto: 250, hora: '11:15' },
            { id: 3, tipo: 'venta', descripcion: 'Venta Anillo Diamante', cliente: 'Mostrador', monto: 4300, hora: '14:20' }
          ]
        }
      }
    }

    // 3. SUCURSALES
    if (cleanEndpoint.startsWith('sucursales')) {
      const sucursales = getStorage<any[]>('sucursales', SEED_SUCURSALES)
      if (method === 'POST') {
        const newSucursal = { id: Date.now(), ...body, activo: true }
        sucursales.push(newSucursal)
        setStorage('sucursales', sucursales)
        return { success: true, data: newSucursal, message: 'Sucursal creada exitosamente' }
      }
      return { success: true, data: sucursales }
    }

    // 4. CATEGORÍAS
    if (cleanEndpoint.startsWith('categorias-productos') || cleanEndpoint.startsWith('categorias')) {
      const categorias = getStorage<any[]>('categorias', SEED_CATEGORIAS)
      if (method === 'POST') {
        const newCat = { id: Date.now(), ...body, activo: true }
        categorias.push(newCat)
        setStorage('categorias', categorias)
        return { success: true, data: newCat, message: 'Categoría guardada exitosamente' }
      }
      return { success: true, data: categorias }
    }

    // 5. CLIENTES
    if (cleanEndpoint.startsWith('clientes')) {
      let clientes = getStorage<any[]>('clientes', SEED_CLIENTES)
      const parts = cleanEndpoint.split('/')
      const clienteId = parts[1] && !isNaN(Number(parts[1])) ? Number(parts[1]) : null

      if (method === 'GET') {
        if (clienteId) {
          const c = clientes.find(item => item.id === clienteId) || clientes[0]
          return { success: true, data: c }
        }
        const busqueda = urlParams.get('busqueda')?.toLowerCase() || ''
        const filtrados = clientes.filter(c => {
          if (!busqueda) return true
          const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase()
          return nombreCompleto.includes(busqueda) || (c.dpi && c.dpi.includes(busqueda)) || (c.telefono && c.telefono.includes(busqueda))
        })
        return {
          success: true,
          data: filtrados,
          pagination: { total: filtrados.length, per_page: 20, current_page: 1, last_page: 1, from: 1, to: filtrados.length },
          stats: {
            total: clientes.length,
            activos: clientes.filter(c => c.estado === 'activo').length,
            inactivos: clientes.filter(c => c.estado === 'inactivo').length,
            vip: clientes.filter(c => c.tipo_cliente === 'vip').length,
            por_genero: {
              masculino: clientes.filter(c => c.genero === 'masculino').length,
              femenino: clientes.filter(c => c.genero === 'femenino').length
            }
          }
        }
      }

      if (method === 'POST') {
        const nuevoCliente = {
          id: Date.now(),
          ...body,
          estado: body.estado || 'activo',
          tipo_cliente: body.tipo_cliente || 'regular',
          total_creditos: 0,
          creditos_activos: 0,
          created_at: new Date().toISOString()
        }
        clientes.unshift(nuevoCliente)
        setStorage('clientes', clientes)
        return { success: true, data: nuevoCliente, message: 'Cliente registrado exitosamente' }
      }

      if (method === 'PUT' && clienteId) {
        clientes = clientes.map(c => c.id === clienteId ? { ...c, ...body } : c)
        setStorage('clientes', clientes)
        const updated = clientes.find(c => c.id === clienteId)
        return { success: true, data: updated, message: 'Cliente actualizado exitosamente' }
      }

      if (method === 'DELETE' && clienteId) {
        clientes = clientes.filter(c => c.id !== clienteId)
        setStorage('clientes', clientes)
        return { success: true, message: 'Cliente eliminado exitosamente' }
      }
    }

    // 6. CRÉDITOS & PRÉNDAS
    if (cleanEndpoint.startsWith('creditos') || cleanEndpoint.startsWith('creditos-prendarios') || cleanEndpoint.startsWith('prendas')) {
      let creditos = getStorage<any[]>('creditos', SEED_CREDITOS)
      const parts = cleanEndpoint.split('/')
      const creditoId = parts[1] && !isNaN(Number(parts[1])) ? Number(parts[1]) : null

      if (cleanEndpoint.includes('codigo-prereservado')) {
        const correlativo = String(Math.floor(1000 + Math.random() * 9000))
        return { success: true, data: `01${new Date().toISOString().slice(2, 4)}0100${correlativo}` }
      }

      if (method === 'GET') {
        if (creditoId) {
          const cr = creditos.find(item => item.id === creditoId) || creditos[0]
          return { success: true, data: cr }
        }
        return {
          success: true,
          data: creditos,
          pagination: { total: creditos.length, per_page: 20, current_page: 1, last_page: 1, from: 1, to: creditos.length },
          stats: {
            total: creditos.length,
            vigentes: creditos.filter(c => c.estado === 'vigente').length,
            vencidos: creditos.filter(c => c.estado === 'vencido').length,
            liquidados: creditos.filter(c => c.estado === 'liquidado').length,
            monto_total: creditos.reduce((a, b) => a + (Number(b.monto_prestamo) || 0), 0)
          }
        }
      }

      if (method === 'POST') {
        const nuevoCredito = {
          id: Date.now(),
          numero_credito: body.numero_credito || `01${Date.now().toString().slice(-14)}`,
          codigo_credito: body.codigo_credito || body.numero_credito || `01${Date.now().toString().slice(-14)}`,
          estado: 'vigente',
          saldo_actual: body.monto_prestamo ? Number(body.monto_prestamo) * 1.05 : 5000,
          created_at: new Date().toISOString(),
          ...body
        }
        creditos.unshift(nuevoCredito)
        setStorage('creditos', creditos)
        return { success: true, data: nuevoCredito, message: 'Crédito creado exitosamente' }
      }
    }

    // 7. CAJAS & BÓVEDA
    if (cleanEndpoint.startsWith('caja') || cleanEndpoint.startsWith('movimientos-caja')) {
      const cajas = getStorage<any[]>('cajas', SEED_CAJAS)
      if (cleanEndpoint.includes('abrir')) {
        cajas[0].estado = 'abierta'
        cajas[0].monto_apertura = Number(body?.monto_inicial || 5000)
        cajas[0].monto_actual = Number(body?.monto_inicial || 5000)
        setStorage('cajas', cajas)
        return { success: true, data: cajas[0], message: 'Caja abierta exitosamente' }
      }
      if (cleanEndpoint.includes('cerrar')) {
        cajas[0].estado = 'cerrada'
        setStorage('cajas', cajas)
        return { success: true, data: cajas[0], message: 'Caja cerrada exitosamente' }
      }
      if (cleanEndpoint.includes('movimiento') || method === 'POST') {
        const mov = {
          id: Date.now(),
          tipo: body?.tipo || 'ingreso',
          concepto: body?.concepto || 'Operación de Caja',
          monto: Number(body?.monto || 0),
          fecha: new Date().toLocaleTimeString(),
          usuario: 'Admin'
        }
        cajas[0].movimientos.unshift(mov)
        if (mov.tipo === 'ingreso') cajas[0].monto_actual += mov.monto
        else cajas[0].monto_actual -= mov.monto
        setStorage('cajas', cajas)
        return { success: true, data: mov, message: 'Movimiento registrado' }
      }
      return { success: true, data: { ...cajas[0], cajas } } as any
    }

    if (cleanEndpoint.startsWith('boveda') || cleanEndpoint.startsWith('bovedas')) {
      const bovedas = getStorage<any[]>('bovedas', SEED_BOVEDAS)
      return { success: true, data: { ...bovedas[0], bovedas } } as any
    }

    // 8. USUARIOS & PERMISOS
    if (cleanEndpoint.startsWith('usuarios')) {
      const usuarios = getStorage<any[]>('usuarios', SEED_USUARIOS)
      if (method === 'POST') {
        const newU = { id: Date.now(), ...body, activo: true, created_at: new Date().toISOString() }
        usuarios.push(newU)
        setStorage('usuarios', usuarios)
        return { success: true, data: newU, message: 'Usuario creado exitosamente' }
      }
      return {
        success: true,
        data: usuarios,
        pagination: { total: usuarios.length, per_page: 20, current_page: 1, last_page: 1, from: 1, to: usuarios.length },
        stats: {
          total: usuarios.length,
          activos: usuarios.filter(u => u.activo).length,
          inactivos: usuarios.filter(u => !u.activo).length,
          por_rol: { administrador: 1, cajero: 1, tasador: 1, supervisor: 0, vendedor: 0 }
        }
      }
    }

    if (cleanEndpoint.startsWith('permisos')) {
      return {
        success: true,
        data: [
          { modulo: 'dashboard', acciones: ['ver', 'exportar'] },
          { modulo: 'clientes', acciones: ['ver', 'crear', 'editar', 'eliminar'] },
          { modulo: 'creditos', acciones: ['ver', 'crear', 'editar', 'aprobar', 'liquidar', 'renovar'] },
          { modulo: 'caja', acciones: ['ver', 'abrir', 'cerrar', 'ingreso', 'egreso'] },
          { modulo: 'boveda', acciones: ['ver', 'trasladar', 'arqueo'] },
          { modulo: 'ventas', acciones: ['ver', 'crear', 'cancelar'] },
          { modulo: 'sucursales', acciones: ['ver', 'crear', 'editar'] },
          { modulo: 'usuarios', acciones: ['ver', 'crear', 'editar', 'permisos'] }
        ]
      }
    }

    // 9. PLANES DE INTERÉS & GASTOS
    if (cleanEndpoint.startsWith('planes-interes')) {
      const planes = getStorage<any[]>('planes_interes', SEED_PLANES_INTERES)
      return { success: true, data: planes }
    }

    if (cleanEndpoint.startsWith('gastos') || cleanEndpoint.startsWith('otros-gastos')) {
      const gastos = getStorage<any[]>('gastos', SEED_GASTOS)
      if (method === 'POST') {
        const newG = { id: Date.now(), ...body, estado: 'pagado' }
        gastos.push(newG)
        setStorage('gastos', gastos)
        return { success: true, data: newG, message: 'Gasto registrado exitosamente' }
      }
      return { success: true, data: gastos }
    }

    // 10. VENTAS, COMPRAS, REMATES, COTIZACIONES
    if (cleanEndpoint.startsWith('ventas')) {
      const ventas = getStorage<any[]>('ventas', SEED_VENTAS)
      if (method === 'POST') {
        const newV = { id: Date.now(), numero_factura: `FAC-00${Date.now().toString().slice(-3)}`, fecha: new Date().toISOString(), ...body, estado: 'completada' }
        ventas.unshift(newV)
        setStorage('ventas', ventas)
        return { success: true, data: newV, message: 'Venta realizada con éxito' }
      }
      return { success: true, data: ventas }
    }

    if (cleanEndpoint.startsWith('compras')) {
      const compras = getStorage<any[]>('compras', [])
      if (method === 'POST') {
        const newComp = { id: Date.now(), codigo_compra: `COM-00${Date.now().toString().slice(-3)}`, fecha_compra: new Date().toISOString(), estado: 'activa', ...body }
        compras.unshift(newComp)
        setStorage('compras', compras)
        return { success: true, data: newComp, message: 'Compra registrada' }
      }
      return { success: true, data: compras }
    }

    if (cleanEndpoint.startsWith('remates')) {
      const remates = getStorage<any[]>('remates', [])
      return { success: true, data: remates }
    }

    if (cleanEndpoint.startsWith('cotizaciones')) {
      const cotizaciones = getStorage<any[]>('cotizaciones', [])
      if (method === 'POST') {
        const newCot = { id: Date.now(), fecha: new Date().toISOString(), ...body }
        cotizaciones.unshift(newCot)
        setStorage('cotizaciones', cotizaciones)
        return { success: true, data: newCot, message: 'Cotización guardada' }
      }
      return { success: true, data: cotizaciones }
    }

    if (cleanEndpoint.startsWith('auditoria') || cleanEndpoint.startsWith('logs')) {
      const auditoria = getStorage<any[]>('auditoria', [])
      return { success: true, data: auditoria }
    }

    // Default fallback genérico para cualquier otra ruta
    return {
      success: true,
      data: [],
      message: 'Operación ejecutada localmente en modo plantilla'
    }
  }
}

export const mockDatabase = new MockDatabase()
