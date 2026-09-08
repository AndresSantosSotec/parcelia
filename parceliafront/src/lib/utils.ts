import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { APP_LOCALE, APP_TIMEZONE } from "./config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD o ISO string) a formato dd/mm/yyyy
 * Evita problemas de timezone al extraer solo la fecha sin hora
 * @param isoDate - Fecha en formato ISO (ej: "2026-03-04" o "2026-03-04T00:00:00Z")
 * @returns Fecha formateada como "04/03/2026"
 */
export function formatDateDMY(isoDate: string | null | undefined): string {
  if (!isoDate) return '-'
  
  try {
    // Extraer solo la parte de la fecha (YYYY-MM-DD)
    const fechaStr = isoDate.split('T')[0]
    const [year, month, day] = fechaStr.split('-')
    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error al formatear fecha:', error, isoDate)
    return '-'
  }
}

/**
 * Parsea una fecha ISO a objeto Date local (sin conversión de timezone)
 * Útil para comparaciones de fechas
 * @param isoDate - Fecha en formato ISO
 * @returns Date object en zona horaria local
 */
export function parseDateLocal(isoDate: string): Date {
  const fechaStr = isoDate.split('T')[0]
  return new Date(fechaStr + 'T00:00:00')
}

/**
 * Formatea fecha y hora usando la zona horaria por defecto de la aplicación.
 */
export function formatDateTimeGT(
  date: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!date) return '-'

  try {
    const value = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    return new Intl.DateTimeFormat(APP_LOCALE, {
      ...options,
      timeZone: APP_TIMEZONE,
    }).format(value)
  } catch (error) {
    console.error('Error al formatear fecha/hora:', error, date)
    return '-'
  }
}
