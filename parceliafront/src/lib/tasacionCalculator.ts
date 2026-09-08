// Sistema de cálculo inteligente de tasación con factores de riesgo y liquidez

export type CondicionFisica = 'excelente' | 'bueno' | 'regular' | 'deteriorado'
export type MetodoValuacion = 'comparacion_mercado' | 'valor_reposicion' | 'valor_liquidacion' | 'pericial' | 'catalogo' | 'experiencia' | 'web'

export interface CategoriaConfig {
  porcentajeBase: number
  liquidez: 'alta' | 'media' | 'baja'
  factorLiquidez: number
  requiereSerie: boolean
}

// Configuración por categoría (esto debería venir de la BD)
const CATEGORIAS_CONFIG: Record<string, CategoriaConfig> = {
  // Joyería - alta liquidez
  joyeria: {
    porcentajeBase: 60,
    liquidez: 'alta',
    factorLiquidez: 1.0,
    requiereSerie: false
  },
  // Electrónica - liquidez media, depreciación rápida
  electronica: {
    porcentajeBase: 50,
    liquidez: 'media',
    factorLiquidez: 0.85,
    requiereSerie: true
  },
  // Herramientas - liquidez media-alta
  herramientas: {
    porcentajeBase: 55,
    liquidez: 'media',
    factorLiquidez: 0.9,
    requiereSerie: false
  },
  // Vehículos - liquidez media, depreciación
  vehiculos: {
    porcentajeBase: 45,
    liquidez: 'media',
    factorLiquidez: 0.8,
    requiereSerie: true
  },
  // Electrodomésticos - liquidez baja
  electrodomesticos: {
    porcentajeBase: 40,
    liquidez: 'baja',
    factorLiquidez: 0.7,
    requiereSerie: false
  },
  // Instrumentos musicales - liquidez baja
  instrumentos: {
    porcentajeBase: 45,
    liquidez: 'baja',
    factorLiquidez: 0.75,
    requiereSerie: false
  },
  // Por defecto
  default: {
    porcentajeBase: 50,
    liquidez: 'media',
    factorLiquidez: 0.85,
    requiereSerie: false
  }
}

// Ajustes por condición física
const AJUSTES_CONDICION: Record<CondicionFisica, number> = {
  excelente: +5,
  bueno: 0,
  regular: -5,
  deteriorado: -15
}

// Ajustes por antigüedad (años)
const calcularAjusteAntiguedad = (antiguedad: number): number => {
  if (antiguedad <= 1) return 0
  if (antiguedad <= 3) return -3
  if (antiguedad <= 5) return -7
  if (antiguedad <= 10) return -12
  return -20 // Más de 10 años
}

// Ajustes por método de valuación
const AJUSTES_METODO: Record<MetodoValuacion, number> = {
  comparacion_mercado: 0,
  valor_reposicion: -5,
  valor_liquidacion: -10,
  pericial: +3,
  catalogo: -2,
  experiencia: -3,
  web: -5
}

export interface FactoresTasacion {
  categoriaId?: string
  categoriaNombre?: string
  condicionFisica?: CondicionFisica
  antiguedad?: number
  metodoValuacion?: MetodoValuacion
  demandaLocal?: 'alta' | 'media' | 'baja'
  riesgoAlmacenamiento?: 'bajo' | 'medio' | 'alto'
  dificultadReventa?: 'baja' | 'media' | 'alta'
  valorMercado?: number
}

export interface ResultadoTasacion {
  porcentajeBase: number
  ajustes: {
    condicion: number
    antiguedad: number
    liquidez: number
    metodo: number
    demanda: number
    riesgo: number
    reventa: number
  }
  porcentajeFinal: number
  montoSugerido: number
  factores: {
    liquidez: 'alta' | 'media' | 'baja'
    riesgo: 'bajo' | 'medio' | 'alto'
    justificacion: string[]
  }
}

export function calcularTasacion(
  valorMercado: number,
  factores: FactoresTasacion
): ResultadoTasacion {
  if (!valorMercado || valorMercado <= 0) {
    return {
      porcentajeBase: 0,
      ajustes: {
        condicion: 0,
        antiguedad: 0,
        liquidez: 0,
        metodo: 0,
        demanda: 0,
        riesgo: 0,
        reventa: 0
      },
      porcentajeFinal: 0,
      montoSugerido: 0,
      factores: {
        liquidez: 'media',
        riesgo: 'medio',
        justificacion: []
      }
    }
  }

  // Obtener configuración de categoría
  const categoriaKey = factores.categoriaNombre?.toLowerCase().replace(/\s+/g, '') || 'default'
  const config = CATEGORIAS_CONFIG[categoriaKey] || CATEGORIAS_CONFIG.default

  // Calcular ajustes
  const ajusteCondicion = factores.condicionFisica 
    ? AJUSTES_CONDICION[factores.condicionFisica] || 0 
    : 0

  const ajusteAntiguedad = factores.antiguedad 
    ? calcularAjusteAntiguedad(factores.antiguedad) 
    : 0

  const ajusteMetodo = factores.metodoValuacion 
    ? AJUSTES_METODO[factores.metodoValuacion] || 0 
    : 0

  // Ajuste por liquidez (ya está en el porcentaje base, pero puede ajustarse)
  const ajusteLiquidez = config.liquidez === 'alta' ? 0 : 
                         config.liquidez === 'media' ? -3 : -8

  // Ajustes manuales
  const ajusteDemanda = factores.demandaLocal === 'alta' ? +3 :
                       factores.demandaLocal === 'baja' ? -5 : 0

  const ajusteRiesgo = factores.riesgoAlmacenamiento === 'bajo' ? 0 :
                      factores.riesgoAlmacenamiento === 'alto' ? -8 : -3

  const ajusteReventa = factores.dificultadReventa === 'baja' ? 0 :
                        factores.dificultadReventa === 'alta' ? -10 : -5

  // Calcular porcentaje final
  const porcentajeFinal = Math.max(20, Math.min(80, 
    config.porcentajeBase + 
    ajusteCondicion + 
    ajusteAntiguedad + 
    ajusteLiquidez + 
    ajusteMetodo + 
    ajusteDemanda + 
    ajusteRiesgo + 
    ajusteReventa
  ))

  // Calcular monto sugerido
  const montoSugerido = valorMercado * (porcentajeFinal / 100)

  // Determinar nivel de riesgo general
  const riesgoScore = 
    (ajusteRiesgo < -5 ? 2 : ajusteRiesgo < 0 ? 1 : 0) +
    (ajusteReventa < -5 ? 2 : ajusteReventa < 0 ? 1 : 0) +
    (config.liquidez === 'baja' ? 1 : 0) +
    (ajusteAntiguedad < -10 ? 1 : 0)

  const riesgo: 'bajo' | 'medio' | 'alto' = 
    riesgoScore >= 4 ? 'alto' : 
    riesgoScore >= 2 ? 'medio' : 
    'bajo'

  // Generar justificación
  const justificacion: string[] = []
  
  if (config.porcentajeBase !== 50) {
    justificacion.push(`Categoría "${factores.categoriaNombre || 'General'}" tiene porcentaje base de ${config.porcentajeBase}%`)
  }
  
  if (ajusteCondicion !== 0) {
    justificacion.push(`Estado ${factores.condicionFisica}: ${ajusteCondicion > 0 ? '+' : ''}${ajusteCondicion}%`)
  }
  
  if (ajusteAntiguedad !== 0) {
    justificacion.push(`Antigüedad ${factores.antiguedad} años: ${ajusteAntiguedad}%`)
  }
  
  if (ajusteLiquidez !== 0) {
    justificacion.push(`Liquidez ${config.liquidez}: ${ajusteLiquidez}%`)
  }
  
  if (ajusteMetodo !== 0) {
    justificacion.push(`Método ${factores.metodoValuacion}: ${ajusteMetodo}%`)
  }
  
  if (ajusteDemanda !== 0) {
    justificacion.push(`Demanda ${factores.demandaLocal}: ${ajusteDemanda > 0 ? '+' : ''}${ajusteDemanda}%`)
  }
  
  if (ajusteRiesgo !== 0) {
    justificacion.push(`Riesgo almacenamiento ${factores.riesgoAlmacenamiento}: ${ajusteRiesgo}%`)
  }
  
  if (ajusteReventa !== 0) {
    justificacion.push(`Dificultad reventa ${factores.dificultadReventa}: ${ajusteReventa}%`)
  }

  return {
    porcentajeBase: config.porcentajeBase,
    ajustes: {
      condicion: ajusteCondicion,
      antiguedad: ajusteAntiguedad,
      liquidez: ajusteLiquidez,
      metodo: ajusteMetodo,
      demanda: ajusteDemanda,
      riesgo: ajusteRiesgo,
      reventa: ajusteReventa
    },
    porcentajeFinal,
    montoSugerido,
    factores: {
      liquidez: config.liquidez,
      riesgo,
      justificacion
    }
  }
}
