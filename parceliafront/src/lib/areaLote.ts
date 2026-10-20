export const FACTORES_MEDIDA = {
  metro: 1,
  vara: 0.84,
  cuarto: 0.25,
  pie: 0.3048,
  yarda: 0.9144,
} as const

export const CUERDA_M2 = 400

export type UnidadMedida = keyof typeof FACTORES_MEDIDA

export interface AreaLote {
  area: number
  promedio: number
  altura: number
  cuerdas: number
}

function redondear(valor: number) {
  return Math.round(valor * 100) / 100
}

export function metrosDePartes(partes: Partial<Record<UnidadMedida, number | string>>) {
  const metros = (Object.keys(FACTORES_MEDIDA) as UnidadMedida[]).reduce((suma, unidad) => {
    return suma + (Number(partes[unidad]) || 0) * FACTORES_MEDIDA[unidad]
  }, 0)
  return redondear(metros)
}

export function textoMedidas(lote: {
  lado_norte?: number | string | null
  lado_sur?: number | string | null
  lado_este?: number | string | null
  lado_oeste?: number | string | null
  frente_metros?: number | string | null
  fondo_metros?: number | string | null
}) {
  const norte = Number(lote.lado_norte) || 0
  const sur = Number(lote.lado_sur) || 0
  const este = Number(lote.lado_este) || 0
  const oeste = Number(lote.lado_oeste) || 0
  if (norte && sur && este && oeste) return `N ${norte} · S ${sur} · E ${este} · O ${oeste} m`
  if (lote.frente_metros || lote.fondo_metros) return `${Number(lote.frente_metros) || '—'} × ${Number(lote.fondo_metros) || '—'} m`
  return '—'
}

export function areaDesdeLados(norte: number, sur: number, este: number, oeste: number): AreaLote | null {
  if (!(norte > 0 && sur > 0 && este > 0 && oeste > 0)) return null

  const largo = (norte + sur) / 2
  const ancho = (este + oeste) / 2
  const area = largo * ancho

  return {
    area: redondear(area),
    promedio: redondear(largo),
    altura: redondear(ancho),
    cuerdas: redondear(area / CUERDA_M2),
  }
}
