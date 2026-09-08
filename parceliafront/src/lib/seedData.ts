import { Prenda, Credito } from './types'

export const crearPrendaDemoVenta = (): { prenda: Prenda; credito: Credito } => {
  const creditoId = `cr-demo-${Date.now()}`
  const prendaId = `pr-demo-${Date.now()}`
  
  // Generar código en formato ORGDDMMYYAACORRELATIVO (16 dígitos)
  const fecha = new Date()
  const org = '01'
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const yy = String(fecha.getFullYear()).slice(-2)
  const agencia = '01'
  const correlativo = '999901' // Demo 1
  const numeroCreditoDemo = `${org}${dd}${mm}${yy}${agencia}${correlativo}`
  
  const credito: Credito = {
    id: creditoId,
    numero: numeroCreditoDemo,
    clienteId: 'cliente-demo',
    prenda: {
      descripcion: 'iPhone 14 Pro 256GB',
      categoria: 'Electrónica',
      fotos: [],
      avaluo: 5000
    },
    montoComercial: 4000,
    montoPrestado: 3000,
    tasaInteres: 10,
    plazoMeses: 3,
    fechaCreacion: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    fechaVencimiento: new Date(Date.now() - 1).toISOString(),
    estado: 'vencido',
    saldoActual: 3900,
    renovaciones: 0
  }

  const prenda: Prenda = {
    id: prendaId,
    descripcion: 'iPhone 14 Pro 256GB',
    categoria: 'Electrónica',
    fotos: [],
    avaluo: 5000,
    precioVenta: 0,
    precioMinimo: 0,
    descuentoMaximo: 0,
    estado: 'vencido',
    fechaIngreso: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    creditoId: creditoId
  }

  return { prenda, credito }
}

export const crearPrendaDemoEnVenta = (): { prenda: Prenda; credito: Credito } => {
  const creditoId = `cr-demo2-${Date.now()}`
  const prendaId = `pr-demo2-${Date.now()}`
  
  // Generar código en formato ORGDDMMYYAACORRELATIVO (16 dígitos)
  const fecha = new Date()
  const org = '01'
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const yy = String(fecha.getFullYear()).slice(-2)
  const agencia = '01'
  const correlativo = '999902' // Demo 2
  const numeroCreditoDemo = `${org}${dd}${mm}${yy}${agencia}${correlativo}`
  
  const credito: Credito = {
    id: creditoId,
    numero: numeroCreditoDemo,
    clienteId: 'cliente-demo',
    prenda: {
      descripcion: 'Laptop Dell XPS 15',
      categoria: 'Computadoras',
      fotos: [],
      avaluo: 8000
    },
    montoComercial: 6400,
    montoPrestado: 4800,
    tasaInteres: 10,
    plazoMeses: 3,
    fechaCreacion: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    fechaVencimiento: new Date(Date.now() - 10).toISOString(),
    estado: 'vencido',
    saldoActual: 6240,
    renovaciones: 0
  }

  const prenda: Prenda = {
    id: prendaId,
    descripcion: 'Laptop Dell XPS 15',
    categoria: 'Computadoras',
    fotos: [],
    avaluo: 8000,
    precioVenta: 10000,
    precioMinimo: 8000,
    descuentoMaximo: 15,
    estado: 'en_venta',
    fechaIngreso: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    fechaPasaVenta: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    creditoId: creditoId,
    tasadorId: 'admin'
  }

  return { prenda, credito }
}
