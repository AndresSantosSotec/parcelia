/**
 * Servicio para gestión de Planes de Interés por Categoría
 * API: /api/v1/planes-interes
 */

import { api } from '@/lib/api';
import type {
  PlanInteresCategoria,
  CrearPlanInteresData,
  ActualizarPlanInteresData,
  FiltrosPlanesInteres,
  PlanesCategoriaResponse,
  ProyeccionPlanInteres,
  CalculoPlanInteres
} from '../types/planInteres.types';

// ==================== CLASE SINGLETON DEL SERVICIO ====================

class PlanInteresService {
  private static instance: PlanInteresService;
  private baseURL = '/planes-interes';

  private constructor() {}

  public static getInstance(): PlanInteresService {
    if (!PlanInteresService.instance) {
      PlanInteresService.instance = new PlanInteresService();
    }
    return PlanInteresService.instance;
  }

  // ==================== MÉTODOS CRUD ====================

  /**
   * Obtener todos los planes de interés con filtros opcionales
   */
  async obtenerTodos(filtros?: FiltrosPlanesInteres): Promise<PlanInteresCategoria[]> {
    try {
      const params = new URLSearchParams();
      if (filtros?.categoria_id) params.append('categoria_id', filtros.categoria_id.toString());
      if (filtros?.tipo_periodo) params.append('tipo_periodo', filtros.tipo_periodo);
      if (filtros?.activo !== undefined) params.append('activo', filtros.activo.toString());
      const url = params.toString() ? `${this.baseURL}?${params}` : this.baseURL;
      const response = await api.get(url);
      return (response as any).data || response as any;
    } catch (error: any) {
      throw new Error(error.message || 'Error al obtener planes de interés');
    }
  }

  /**
   * Obtener planes paginados con filtros
   */
  async obtenerPaginados(
    filtros?: FiltrosPlanesInteres & { busqueda?: string },
    page = 1,
    perPage = 10
  ): Promise<{ data: PlanInteresCategoria[]; pagination: any | null }> {
    try {
      const params = new URLSearchParams();
      if (filtros?.categoria_id) params.append('categoria_id', filtros.categoria_id.toString());
      if (filtros?.activo !== undefined) params.append('activo', filtros.activo.toString());
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      params.append('page', String(page));
      params.append('per_page', String(perPage));
      const response = await api.get(`${this.baseURL}?${params}`);
      const body = response as any;
      return {
        data: body.data || [],
        pagination: body.pagination || null,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Error al obtener planes paginados');
    }
  }

  /**
   * Obtener un plan específico por ID
   */
  async obtenerPorId(id: number): Promise<PlanInteresCategoria> {
    try {
      const response = await api.get(`${this.baseURL}/${id}`);
      return (response.data as any).plan;
    } catch (error: any) {
      console.error(`Error al obtener plan ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Plan no encontrado');
    }
  }

  /**
   * Obtener planes de una categoría específica
   */
  async obtenerPorCategoria(categoriaId: number): Promise<PlanesCategoriaResponse> {
    try {
      const response = await api.get(`/categorias-productos/${categoriaId}/planes-interes`);
      return response.data as any;
    } catch (error: any) {
      console.error(`Error al obtener planes de categoría ${categoriaId}:`, error);
      throw new Error(error.response?.data?.message || 'Error al obtener planes de la categoría');
    }
  }

  /**
   * Crear nuevo plan de interés
   */
  async crear(data: CrearPlanInteresData): Promise<PlanInteresCategoria> {
    try {
      const response = await api.post(this.baseURL, data);
      return (response as any).data || response as any;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear el plan de interés');
    }
  }

  /**
   * Actualizar plan existente
   */
  async actualizar(id: number, data: ActualizarPlanInteresData): Promise<PlanInteresCategoria> {
    try {
      const response = await api.put(`${this.baseURL}/${id}`, data);
      return (response as any).data || response as any;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar el plan');
    }
  }

  /**
   * Eliminar plan (soft delete)
   */
  async eliminar(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/${id}`);
    } catch (error: any) {
      console.error(`Error al eliminar plan ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Error al eliminar el plan');
    }
  }

  // ==================== MÉTODOS DE ACCIÓN ====================

  /**
   * Activar/Desactivar plan
   */
  async toggleActivo(id: number): Promise<PlanInteresCategoria> {
    try {
      const response = await api.post(`${this.baseURL}/${id}/toggle-activo`);
      return response.data as any;
    } catch (error: any) {
      console.error(`Error al cambiar estado del plan ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Error al cambiar estado');
    }
  }

  /**
   * Establecer plan como default para su categoría
   */
  async setDefault(id: number): Promise<PlanInteresCategoria> {
    try {
      const response = await api.post(`${this.baseURL}/${id}/set-default`);
      return response.data as any;
    } catch (error: any) {
      console.error(`Error al establecer plan default ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Error al establecer plan predeterminado');
    }
  }

  /**
   * Calcular proyección de un crédito con este plan
   */
  async calcularProyeccion(datos: CalculoPlanInteres): Promise<ProyeccionPlanInteres> {
    try {
      const response = await api.post(
        `${this.baseURL}/${datos.plan_id}/calcular-proyeccion`,
        {
          monto_capital: datos.monto_capital,
          valor_avaluo: datos.valor_avaluo
        }
      );
      return response.data as any;
    } catch (error: any) {
      console.error('Error al calcular proyección:', error);
      throw new Error(error.response?.data?.message || 'Error al calcular proyección');
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtener plan default de una categoría
   */
  async obtenerPlanDefault(categoriaId: number): Promise<PlanInteresCategoria | null> {
    try {
      const respuesta = await this.obtenerPorCategoria(categoriaId);
      return respuesta.plan_default;
    } catch (error) {
      console.error('Error al obtener plan default:', error);
      return null;
    }
  }

  /**
   * Check if a plan code is unique for a category
   */
  async verificarCodigoUnico(categoriaId: number, codigo: string, planIdExcluir?: number): Promise<boolean> {
    try {
      const planes = await this.obtenerTodos({ categoria_id: categoriaId });
      return !planes.some(p => p.codigo === codigo && p.id !== planIdExcluir);
    } catch (error) {
      console.error('Error al verificar código único:', error);
      return false;
    }
  }

  /**
   * Buscar plan compatible con un monto y categoría
   */
  async buscarPlanCompatible(
    categoriaId: number,
    monto: number,
    tipoPeriodo?: string
  ): Promise<PlanInteresCategoria | null> {
    try {
      const respuesta = await this.obtenerPorCategoria(categoriaId);
      const planes = respuesta.planes;

      // Filtrar por tipo de periodo si se especifica
      let planesFiltrados = tipoPeriodo
        ? planes.filter(p => p.tipo_periodo === tipoPeriodo)
        : planes;

      // Buscar primer plan que acepte el monto
      for (const plan of planesFiltrados) {
        const dentroRango = this.validarMontoEnRango(plan, monto);
        if (dentroRango) {
          return plan;
        }
      }

      return null;
    } catch (error) {
      console.error('Error al buscar plan compatible:', error);
      return null;
    }
  }

  // ==================== HELPERS DE CÁLCULO ====================

  /**
   * Validar si un monto está dentro del rango del plan
   */
  validarMontoEnRango(plan: PlanInteresCategoria, monto: number): boolean {
    if (plan.monto_minimo && monto < plan.monto_minimo) {
      return false;
    }
    if (plan.monto_maximo && monto > plan.monto_maximo) {
      return false;
    }
    return true;
  }

  /**
   * Calcular plazo en días según unidad
   */
  calcularPlazoDias(plazo_numero: number, plazo_unidad: string): number {
    switch (plazo_unidad) {
      case 'dias':
        return plazo_numero;
      case 'semanas':
        return plazo_numero * 7;
      case 'quincenas':
        return plazo_numero * 15;
      case 'meses':
        return plazo_numero * 30;
      default:
        return plazo_numero;
    }
  }

  /**
   * Calcular fecha de vencimiento
   */
  calcularFechaVencimiento(fechaInicio: Date, plazoDias: number): Date {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + plazoDias);
    return fecha;
  }

  /**
   * Calcular interés total
   */
  calcularInteresTotal(plan: PlanInteresCategoria, montoCapital: number): number {
    const tasaTotal = plan.tasa_interes + plan.tasa_almacenaje;
    
    let numeroPeriodos = plan.plazo_numero;
    
    if (plan.tipo_periodo === 'diario') {
      numeroPeriodos = plan.plazo_dias_total;
    }
    
    return Number((montoCapital * (tasaTotal / 100) * numeroPeriodos).toFixed(2));
  }

  /**
   * Calcular monto de préstamo según avalúo
   */
  calcularMontoPrestamo(plan: PlanInteresCategoria, valorAvaluo: number): number {
    let montoPrestamo = Number((valorAvaluo * (plan.porcentaje_prestamo / 100)).toFixed(2));
    
    // Aplicar límites si existen
    if (plan.monto_minimo && montoPrestamo < plan.monto_minimo) {
      montoPrestamo = plan.monto_minimo;
    }
    
    if (plan.monto_maximo && montoPrestamo > plan.monto_maximo) {
      montoPrestamo = plan.monto_maximo;
    }
    
    return montoPrestamo;
  }

  /**
   * Formatear nombre completo del plan
   */
  formatearNombreCompleto(plan: PlanInteresCategoria): string {
    return `${plan.nombre} (${plan.tasa_interes}% ${plan.tipo_periodo})`;
  }

  /**
   * Formatear descripción del plazo
   */
  formatearDescripcionPlazo(plan: PlanInteresCategoria): string {
    const unidadTexto: Record<string, string> = {
      dias: 'día(s)',
      semanas: 'semana(s)',
      quincenas: 'quincena(s)',
      meses: 'mes(es)'
    };
    
    return `${plan.plazo_numero} ${unidadTexto[plan.plazo_unidad]} (${plan.plazo_dias_total} días)`;
  }

  /**
   * Generar código automático para el plan
   */
  generarCodigo(tipo_periodo: string, plazo_numero: number, plazo_unidad: string): string {
    const prefijo = tipo_periodo.charAt(0).toUpperCase();
    const numero = plazo_numero.toString().padStart(2, '0');
    const unidad = plazo_unidad.charAt(0).toUpperCase();
    
    return `${prefijo}${numero}${unidad}`;
  }

  // ==================== ALIAS EN INGLÉS PARA COMPATIBILIDAD ====================

  /**
   * Alias: obtenerTodos
   */
  getAll(filtros?: FiltrosPlanesInteres) {
    return this.obtenerTodos(filtros);
  }

  /**
   * Alias: obtenerPorId
   */
  getById(id: number) {
    return this.obtenerPorId(id);
  }

  /**
   * Alias: crear
   */
  create(data: CrearPlanInteresData) {
    return this.crear(data);
  }

  /**
   * Alias: actualizar
   */
  update(id: number, data: ActualizarPlanInteresData) {
    return this.actualizar(id, data);
  }

  /**
   * Alias: eliminar
   */
  delete(id: number) {
    return this.eliminar(id);
  }
}

// ==================== EXPORTAR INSTANCIA ====================

export const planInteresService = PlanInteresService.getInstance();
export default planInteresService;

// ==================== EXPORTAR TIPOS ====================

export type { FiltrosPlanesInteres as PlanInteresFilters } from '@/types/planInteres.types';

