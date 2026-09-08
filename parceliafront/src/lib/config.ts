export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE || 'America/Guatemala'
export const APP_LOCALE = import.meta.env.VITE_APP_LOCALE || 'es-GT'

export const getApiBaseUrl = () => API_BASE_URL
