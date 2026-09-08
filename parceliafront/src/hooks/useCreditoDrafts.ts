import { useState, useCallback } from 'react'
import type { Cliente } from '@/lib/types'
import type { CrearPrendaDTO, CrearTasacionDTO } from '@/types/creditoPrendario.types'

export interface CreditoDraft {
  id: string
  titulo: string
  /** Paso en que se guardó (1-5) */
  paso: number
  cliente: Cliente | null
  prenda: Partial<CrearPrendaDTO> | null
  tasacion: Partial<CrearTasacionDTO> | null
  credito: Record<string, any> | null
  parametrosCategoria: Record<string, any> | null
  creadoEn: string
  actualizadoEn: string
}

const MAX_BORRADORES = 3

function storageKey(userId: string) {
  return `credito-borradores:${userId}`
}

function read(userId: string): CreditoDraft[] {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(userId: string, items: CreditoDraft[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items))
  } catch (e) {
    console.warn('useCreditoDrafts: no se pudo guardar en localStorage', e)
  }
}

export function useCreditoDrafts(userId: string) {
  const [borradores, setBorradores] = useState<CreditoDraft[]>(() => read(userId))

  const persist = useCallback(
    (next: CreditoDraft[]) => {
      setBorradores(next)
      write(userId, next)
    },
    [userId]
  )

  /**
   * Guarda o actualiza un borrador.
   * Si `data.id` coincide con un borrador existente, lo actualiza.
   * Si no, crea uno nuevo (eliminando el más antiguo si ya hay MAX_BORRADORES).
   * Devuelve el id del borrador guardado.
   */
  const guardarBorrador = useCallback(
    (data: Omit<CreditoDraft, 'id' | 'creadoEn' | 'actualizadoEn'> & { id?: string }): string => {
      const ahora = new Date().toISOString()
      const existente = data.id ? borradores.find(b => b.id === data.id) : undefined

      if (existente) {
        const actualizado = borradores.map(b =>
          b.id === data.id ? ({ ...b, ...data, actualizadoEn: ahora } as CreditoDraft) : b
        )
        persist(actualizado)
        return data.id!
      }

      const nuevo: CreditoDraft = {
        ...data,
        id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }

      let list = [...borradores, nuevo]
      if (list.length > MAX_BORRADORES) {
        // Eliminar el actualizado menos recientemente
        list.sort((a, b) => new Date(a.actualizadoEn).getTime() - new Date(b.actualizadoEn).getTime())
        list = list.slice(list.length - MAX_BORRADORES)
      }
      persist(list)
      return nuevo.id
    },
    [borradores, persist]
  )

  const eliminarBorrador = useCallback(
    (id: string) => {
      persist(borradores.filter(b => b.id !== id))
    },
    [borradores, persist]
  )

  return { borradores, guardarBorrador, eliminarBorrador }
}
