export interface AreaLote {
  area: number
  altura: number
  promedio: number
}

function redondear(valor: number) {
  return Math.round(valor * 100) / 100
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

  const diff = Math.abs(norte - sur)
  const pares: Array<[number, number]> = [[oeste, este], [este, oeste]]
  for (const [altura, inclinado] of pares) {
    const esperado = Math.sqrt(altura * altura + diff * diff)
    const tolerancia = Math.max(0.5, inclinado * 0.03)
    if (Math.abs(esperado - inclinado) <= tolerancia) {
      const promedio = (norte + sur) / 2
      return { area: redondear(promedio * altura), altura: redondear(altura), promedio: redondear(promedio) }
    }
  }

  const promedio = (norte + sur) / 2
  const altura = (este + oeste) / 2
  return { area: redondear(promedio * altura), altura: redondear(altura), promedio: redondear(promedio) }
}
