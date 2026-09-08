/**
 * Servicio para gestión de imágenes de prendas
 * API normalizada para CRUD de imágenes
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Helper para obtener token
const getAuthToken = (): string | null => {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
};

export interface PrendaImagen {
  id: string;
  prenda_id: string;
  url: string;
  thumbnail_url?: string;
  nombre_archivo: string;
  tipo: 'principal' | 'frontal' | 'trasera' | 'lateral' | 'detalle' | 'defecto' | 'marca' | 'serie' | 'general';
  etiqueta?: string;
  descripcion?: string;
  es_principal: boolean;
  orden: number;
  dimensiones?: string;
  tamano?: string;
  mime_type?: string;
  fecha_subida?: string;
}

export interface ImagenInput {
  data?: string;  // Base64
  url?: string;   // URL externa
  tipo?: PrendaImagen['tipo'];
  etiqueta?: string;
  descripcion?: string;
  es_principal?: boolean;
}

export interface ImagenUpdateInput {
  tipo?: PrendaImagen['tipo'];
  etiqueta?: string;
  descripcion?: string;
  es_principal?: boolean;
  orden?: number;
}

export interface OrdenInput {
  id: number;
  posicion: number;
}

interface ListarImagenesResponse {
  success: boolean;
  data: {
    prenda_id: string;
    total: number;
    imagenes: PrendaImagen[];
  };
}

interface ImagenResponse {
  success: boolean;
  data: PrendaImagen;
  message?: string;
}

interface ImagenesResponse {
  success: boolean;
  data: {
    imagenes: PrendaImagen[];
  };
  message?: string;
}

interface DuplicadosResponse {
  success: boolean;
  data: {
    total_grupos_duplicados: number;
    duplicados: Array<{
      hash: string;
      cantidad: number;
      imagenes: Array<{
        id: number;
        prenda_id: number;
        prenda_codigo?: string;
        url: string;
      }>;
    }>;
  };
}

// Helper para obtener headers
const getHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

// Helper para hacer peticiones
const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new Error(error.message || 'Error en la petición');
  }
  
  return response.json();
};

/**
 * Listar imágenes de una prenda
 */
export const listarImagenes = async (prendaId: string | number): Promise<PrendaImagen[]> => {
  const data = await request<ListarImagenesResponse>(`/prendas/${prendaId}/imagenes`);
  return data.data?.imagenes || [];
};

/**
 * Subir una o más imágenes a una prenda
 */
export const subirImagenes = async (
  prendaId: string | number,
  imagenes: ImagenInput[]
): Promise<PrendaImagen[]> => {
  const data = await request<ImagenesResponse>(`/prendas/${prendaId}/imagenes`, {
    method: 'POST',
    body: JSON.stringify({ imagenes }),
  });
  return data.data?.imagenes || [];
};

/**
 * Subir imagen desde base64
 */
export const subirImagenBase64 = async (
  prendaId: string | number,
  base64Data: string,
  tipo: PrendaImagen['tipo'] = 'general',
  etiqueta?: string,
  descripcion?: string
): Promise<PrendaImagen> => {
  const imagenes = await subirImagenes(prendaId, [{
    data: base64Data,
    tipo,
    etiqueta,
    descripcion,
  }]);
  return imagenes[0];
};

/**
 * Subir múltiples imágenes desde archivos
 */
export const subirArchivos = async (
  prendaId: string | number,
  archivos: File[],
  tipo: PrendaImagen['tipo'] = 'general'
): Promise<PrendaImagen[]> => {
  const imagenes: ImagenInput[] = [];

  for (const archivo of archivos) {
    const base64 = await fileToBase64(archivo);
    imagenes.push({
      data: base64,
      tipo,
      etiqueta: archivo.name.split('.')[0], // Nombre sin extensión
    });
  }

  return subirImagenes(prendaId, imagenes);
};

/**
 * Obtener detalle de una imagen
 */
export const obtenerImagen = async (
  prendaId: string | number,
  imagenId: string | number
): Promise<PrendaImagen> => {
  const data = await request<ImagenResponse>(`/prendas/${prendaId}/imagenes/${imagenId}`);
  return data.data;
};

/**
 * Actualizar metadatos de una imagen
 */
export const actualizarImagen = async (
  prendaId: string | number,
  imagenId: string | number,
  datos: ImagenUpdateInput
): Promise<PrendaImagen> => {
  const data = await request<ImagenResponse>(`/prendas/${prendaId}/imagenes/${imagenId}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  return data.data;
};

/**
 * Eliminar una imagen
 */
export const eliminarImagen = async (
  prendaId: string | number,
  imagenId: string | number
): Promise<void> => {
  await request(`/prendas/${prendaId}/imagenes/${imagenId}`, { method: 'DELETE' });
};

/**
 * Reordenar imágenes
 */
export const reordenarImagenes = async (
  prendaId: string | number,
  orden: OrdenInput[]
): Promise<void> => {
  await request(`/prendas/${prendaId}/imagenes/reordenar`, {
    method: 'POST',
    body: JSON.stringify({ orden }),
  });
};

/**
 * Establecer imagen como principal
 */
export const establecerPrincipal = async (
  prendaId: string | number,
  imagenId: string | number
): Promise<PrendaImagen> => {
  const data = await request<ImagenResponse>(`/prendas/${prendaId}/imagenes/${imagenId}/principal`, {
    method: 'POST',
  });
  return data.data;
};

/**
 * Buscar imágenes duplicadas en todo el sistema
 */
export const buscarDuplicados = async (): Promise<DuplicadosResponse['data']> => {
  const data = await request<DuplicadosResponse>('/imagenes/duplicados');
  return data.data;
};

/**
 * Convertir File a base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validar tipo de archivo de imagen
 */
export const esImagenValida = (file: File): boolean => {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return tiposPermitidos.includes(file.type);
};

/**
 * Validar tamaño de archivo (max 5MB por defecto)
 */
export const validarTamano = (file: File, maxMB: number = 5): boolean => {
  const maxBytes = maxMB * 1024 * 1024;
  return file.size <= maxBytes;
};

/**
 * Tipos de imagen disponibles
 */
export const TIPOS_IMAGEN = {
  principal: 'Imagen Principal',
  frontal: 'Vista Frontal',
  trasera: 'Vista Trasera',
  lateral: 'Vista Lateral',
  detalle: 'Detalle',
  defecto: 'Defecto/Daño',
  marca: 'Marca/Logo',
  serie: 'Número de Serie',
  general: 'General',
} as const;

export default {
  listarImagenes,
  subirImagenes,
  subirImagenBase64,
  subirArchivos,
  obtenerImagen,
  actualizarImagen,
  eliminarImagen,
  reordenarImagenes,
  establecerPrincipal,
  buscarDuplicados,
  esImagenValida,
  validarTamano,
  TIPOS_IMAGEN,
};
