/** Plantilla HTML de estado de cuenta inmobiliario (impresión frontend). */

export interface CuotaEstadoCuenta {
  numero_cuota: number
  fecha_vencimiento?: string
  cuota_capital?: number
  cuota_interes?: number
  cuota_monto_total?: number
  saldo_capital_restante?: number
  estado?: string
}

export interface EstadoCuentaTerrenoData {
  codigo_negociacion: string
  comprador_nombre: string
  comprador_dpi?: string
  comprador_nit?: string
  comprador_telefono?: string
  finca_nombre?: string
  parcela_nombre?: string
  lote_numero?: string
  lote_codigo?: string
  area_m2?: number
  frente_metros?: number
  fondo_metros?: number
  precio_final: number
  enganche_pagado?: number
  total_capital_pagado?: number
  saldo_capital_pendiente: number
  cuotas: CuotaEstadoCuenta[]
  formatFecha?: (v?: string) => string
}

function money(n: number): string {
  return `Q${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
}

export function plantillaEstadoCuentaTerreno(data: EstadoCuentaTerrenoData): string {
  const fmt = data.formatFecha || ((v?: string) => (v ? String(v).slice(0, 10) : '—'))
  const loteLabel = data.lote_numero || data.lote_codigo || 'Lote'

  const filas =
    data.cuotas.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:12px;">Aún no hay cronograma. El plan se genera al completar el enganche.</td></tr>`
      : data.cuotas
          .map(
            (c) => `
            <tr>
              <td>#${c.numero_cuota}</td>
              <td>${fmt(c.fecha_vencimiento)}</td>
              <td class="text-right">${money(Number(c.cuota_capital || 0))}</td>
              <td class="text-right">${money(Number(c.cuota_interes || 0))}</td>
              <td class="text-right font-bold">${money(Number(c.cuota_monto_total || 0))}</td>
              <td class="text-right">${money(Number(c.saldo_capital_restante || 0))}</td>
              <td class="text-center">
                <span class="badge ${c.estado === 'pagada' ? 'badge-success' : 'badge-warning'}">
                  ${String(c.estado || 'pendiente').toUpperCase()}
                </span>
              </td>
            </tr>`
          )
          .join('')

  return `
    <h2 style="text-align: center; color: #047857; text-transform: uppercase; margin-bottom: 5px;">ESTADO DE CUENTA & KARDEX INMOBILIARIO</h2>
    <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">CONTRATO NO. ${data.codigo_negociacion}</p>
    <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e5e7eb;" />

    <table style="width: 100%; margin-bottom: 20px; font-size: 11px;">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <strong style="color: #047857;">DATOS DEL COMPRADOR</strong><br />
          <strong>Nombre:</strong> ${data.comprador_nombre}<br />
          <strong>DPI:</strong> ${data.comprador_dpi || 'S/D'}<br />
          <strong>NIT:</strong> ${data.comprador_nit || 'C/F'}<br />
          <strong>Teléfono:</strong> ${data.comprador_telefono || '—'}
        </td>
        <td style="width: 50%; vertical-align: top;">
          <strong style="color: #047857;">DATOS DEL TERRENO</strong><br />
          <strong>Finca:</strong> ${data.finca_nombre || 'Finca Principal'}<br />
          <strong>Parcela / Manzana:</strong> ${data.parcela_nombre || 'N/A'}<br />
          <strong>Lote:</strong> ${loteLabel}<br />
          <strong>Área:</strong> ${data.area_m2 || 0} m² (Frente: ${data.frente_metros || 0}m, Fondo: ${data.fondo_metros || 0}m)
        </td>
      </tr>
    </table>

    <table style="width: 100%; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
      <tr>
        <td style="padding: 10px;"><strong>Precio Total:</strong><br />${money(data.precio_final)}</td>
        <td style="padding: 10px;"><strong>Enganche Pagado:</strong><br />${money(Number(data.enganche_pagado || 0))}</td>
        <td style="padding: 10px;"><strong>Capital Amortizado:</strong><br />${money(Number(data.total_capital_pagado || 0))}</td>
        <td style="padding: 10px; color: #b91c1c; font-weight: bold;"><strong>Saldo Pendiente:</strong><br />${money(data.saldo_capital_pendiente)}</td>
      </tr>
    </table>

    <h3 style="color: #047857; font-size: 13px; margin-bottom: 8px;">TABLA DE AMORTIZACIÓN Y CUOTAS</h3>
    <table class="data-table" style="font-size: 10px;">
      <thead>
        <tr>
          <th>Cuota</th>
          <th>Vencimiento</th>
          <th class="text-right">Capital</th>
          <th class="text-right">Interés</th>
          <th class="text-right">Total Cuota</th>
          <th class="text-right">Saldo Restante</th>
          <th class="text-center">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `
}
