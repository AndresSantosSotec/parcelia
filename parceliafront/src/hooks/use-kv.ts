import { useState, useEffect, useCallback } from 'react'

/**
 * Hook personalizado para almacenamiento local Key-Value
 * Reemplaza @github/spark/hooks useKV para evitar errores de conexión
 */
export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Inicializar con el valor del localStorage o el valor por defecto
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(`kv:${key}`)
      if (storedValue !== null) {
        return JSON.parse(storedValue) as T
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
    return defaultValue
  })

  // Guardar en localStorage cuando cambie el valor
  useEffect(() => {
    try {
      localStorage.setItem(`kv:${key}`, JSON.stringify(value))
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error)
    }
  }, [key, value])

  // Función para actualizar el valor (soporta función como parámetro)
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolvedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue
      return resolvedValue
    })
  }, [])

  // Escuchar cambios en localStorage desde otras pestañas
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `kv:${key}` && event.newValue !== null) {
        try {
          setValue(JSON.parse(event.newValue) as T)
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [value, updateValue]
}

export default useKV

