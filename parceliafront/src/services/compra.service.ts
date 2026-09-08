import { api } from '@/lib/api';

export interface CompraData {
    cliente_id: number;
    categoria_producto_id: number;
    descripcion: string;
    valor_tasacion: number;
    monto_pagado: number;
    precio_venta: number;
    metodo_pago?: 'efectivo' | 'transferencia' | 'cheque';
    observaciones?: string;
    condicion?: 'excelente' | 'muy_buena' | 'buena' | 'regular' | 'mala';
    marca?: string;
    modelo?: string;
    serie?: string;
    color?: string;
}

export const compraService = {
    registrarCompra: async (data: CompraData) => {
        try {
            const response = await api.post('/compras', data);
            return response.data;
        } catch (error) {
            console.error('Error al registrar compra:', error);
            throw error;
        }
    },

    getCompras: async (params?: any) => {
        // Por ahora podemos usar el endpoint de prendas filtrado por tipo_ingreso=compra_directa
        // o un nuevo endpoint si lo creamos. Usemos prendas con filtro.
        try {
            const response = await api.get('/prendas' + (params ? '?' + new URLSearchParams({ ...params, tipo_ingreso: 'compra_directa' }).toString() : '?tipo_ingreso=compra_directa'));
            return response;
        } catch (error) {
            console.error('Error al obtener compras:', error);
            throw error;
        }
    }
};
