import { APP_LOCALE, APP_TIMEZONE } from './config'

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Parsear fecha de forma segura sin problemas de zona horaria
 * Para fechas en formato YYYY-MM-DD, las parsea como hora local
 * Para fechas ISO con hora, las parsea normalmente
 */
export const parseDateSafe = (date: string): Date => {
  // Si es formato YYYY-MM-DD (sin hora), parsear como fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day) // month es 0-indexed
  }
  // Para formatos con hora (ISO), parsear normalmente
  return new Date(date)
}

export const formatDate = (date: string): string => {
  // Si la fecha es solo YYYY-MM-DD, parsearla sin convertir a zona horaria
  // para evitar el problema del día anterior
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day) // month es 0-indexed
    return new Intl.DateTimeFormat(APP_LOCALE, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: APP_TIMEZONE,
    }).format(localDate)
  }
  
  return new Intl.DateTimeFormat(APP_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(new Date(date))
}

export const formatDateTime = (date: string): string => {
  const parsedDate = parseDateSafe(date)
  return new Intl.DateTimeFormat(APP_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(parsedDate)
}

export const formatDateShort = (date: string): string => {
  // Para fechas solo YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat(APP_LOCALE, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: APP_TIMEZONE,
    }).format(localDate)
  }
  
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(new Date(date))
}

export const calcularMontoComercial = (avaluo: number): number => {
  return avaluo * 0.8
}

export const calcularMontoPrestamo = (avaluo: number, porcentaje: number = 0.6): number => {
  return avaluo * porcentaje
}

export const calcularIntereses = (
  monto: number,
  tasaMensual: number,
  meses: number
): number => {
  return monto * (tasaMensual / 100) * meses
}

export const calcularFechaVencimiento = (
  fechaInicio: string,
  meses: number,
  dias: number = 0
): string => {
  // Parsear fecha correctamente sin problema de zona horaria
  const fecha = parseDateSafe(fechaInicio)
  fecha.setMonth(fecha.getMonth() + meses)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString()
}

export const calcularDiasRestantes = (fechaVencimiento: string): number => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0) // Normalizar a inicio del día
  const vencimiento = parseDateSafe(fechaVencimiento)
  vencimiento.setHours(0, 0, 0, 0)
  const diferencia = vencimiento.getTime() - hoy.getTime()
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24))
}

export const calcularMora = (
  montoVencido: number,
  diasMora: number,
  tasaMoraDiaria: number = 0.1
): number => {
  if (diasMora <= 0) return 0
  return montoVencido * (tasaMoraDiaria / 100) * diasMora
}

export const calcularTotalPagar = (
  saldo: number,
  intereses: number,
  mora: number
): number => {
  return saldo + intereses + mora
}

export const generarNumeroCredito = (): string => {
  const fecha = new Date()
  const año = fecha.getFullYear().toString().slice(-2)
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `CR${año}${mes}${random}`
}

export const esVencido = (fechaVencimiento: string): boolean => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const vencimiento = parseDateSafe(fechaVencimiento)
  vencimiento.setHours(23, 59, 59, 999) // Fin del día de vencimiento
  return hoy > vencimiento
}

export const esPorVencer = (fechaVencimiento: string, diasAntes: number = 7): boolean => {
  const diasRestantes = calcularDiasRestantes(fechaVencimiento)
  return diasRestantes > 0 && diasRestantes <= diasAntes
}

export const getEstadoColor = (estado: string): string => {
  const colores: Record<string, string> = {
    'activo': 'bg-accent text-accent-foreground',
    'vencido': 'bg-destructive text-destructive-foreground',
    'cancelado': 'bg-muted text-muted-foreground',
    'renovado': 'bg-warning text-warning-foreground',
    'vendido': 'bg-secondary text-secondary-foreground',
    'empeniado': 'bg-primary text-primary-foreground',
    'en_venta': 'bg-warning text-warning-foreground',
    'recuperado': 'bg-accent text-accent-foreground'
  }
  return colores[estado] || 'bg-muted text-muted-foreground'
}

export const getEstadoTexto = (estado: string): string => {
  const textos: Record<string, string> = {
    'activo': 'Activo',
    'vencido': 'Vencido',
    'cancelado': 'Cancelado',
    'renovado': 'Renovado',
    'vendido': 'Vendido',
    'empeniado': 'Empeñado',
    'en_venta': 'En Venta',
    'recuperado': 'Recuperado'
  }
  return textos[estado] || estado
}

export const validarDPI = (dpi: string): boolean => {
  return /^\d{13}$/.test(dpi.replace(/\s/g, ''))
}

export const formatearDPI = (dpi: string): string => {
  const numeros = dpi.replace(/\s/g, '')
  if (numeros.length !== 13) return dpi
  return `${numeros.slice(0, 4)} ${numeros.slice(4, 9)} ${numeros.slice(9, 13)}`
}

export const validarTelefono = (telefono: string): boolean => {
  return /^\d{8}$/.test(telefono.replace(/[\s-]/g, ''))
}
