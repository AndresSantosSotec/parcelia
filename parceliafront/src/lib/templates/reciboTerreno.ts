/** Plantilla HTML de recibo de pago de terreno (impresión frontend). */

export interface ReciboTerrenoData {
  numero_recibo?: string
  metodo_pago?: string
  referencia_bancaria?: string
  tipo_pago?: string
  monto_total?: number
  monto_fallback?: number
  comprador_nombre: string
  comprador_dpi?: string
  comprador_nit?: string
  codigo_negociacion: string
  lote_codigo?: string
  finca_nombre?: string
  fecha?: string
}

function etiquetaTipoPago(tipo?: string): string {
  if (tipo === 'enganche') return 'Pago de Enganche Inmobiliario'
  if (tipo === 'abono_capital') return 'Abono Extraordinario a Capital'
  return 'Pago de Cuota de Financiamiento'
}

function money(n: number): string {
  return `Q${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
}

export function plantillaReciboTerreno(data: ReciboTerrenoData): string {
  const monto = Number(data.monto_total ?? data.monto_fallback ?? 0)
  const fecha = data.fecha || new Date().toLocaleDateString('es-GT')

  return `
    <h2 style="text-align: center; color: #047857; text-transform: uppercase; margin-bottom: 3px;">RECIBO OFICIAL DE PAGO</h2>
    <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">NO. ${data.numero_recibo || 'REC-TER'}</p>
    <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e5e7eb;" />

    <table style="width: 100%; margin-bottom: 20px; font-size: 11px;">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <strong>Comprador:</strong> ${data.comprador_nombre}<br />
          <strong>DPI / NIT:</strong> ${data.comprador_dpi || 'S/D'} / ${data.comprador_nit || 'C/F'}<br />
          <strong>Contrato Ref:</strong> ${data.codigo_negociacion}
        </td>
        <td style="width: 50%; vertical-align: top; text-align: right;">
          <strong>Fecha de Pago:</strong> ${fecha}<br />
          <strong>Método:</strong> ${String(data.metodo_pago || 'EFECTIVO').toUpperCase()}<br />
          <strong>Referencia:</strong> ${data.referencia_bancaria || 'N/A'}
        </td>
      </tr>
    </table>

    <table style="width: 100%; margin-bottom: 25px; font-size: 12px; border: 1px solid #e5e7eb;">
      <tr style="background: #f0fdf4;">
        <th style="padding: 10px; text-align: left; color: #166534;">Concepto / Descripción</th>
        <th style="padding: 10px; text-align: right; color: #166534;">Monto (Q)</th>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${etiquetaTipoPago(data.tipo_pago)}</strong><br />
          <span style="font-size: 10px; color: #666;">Terreno Lote ${data.lote_codigo || 'Lote'} · ${data.finca_nombre || 'Finca'}</span>
        </td>
        <td style="padding: 10px; text-align: right; font-weight: bold; border-bottom: 1px solid #eee;">
          ${money(monto)}
        </td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td style="padding: 10px; text-align: right;">TOTAL COBRADO:</td>
        <td style="padding: 10px; text-align: right; color: #047857; font-size: 14px;">
          ${money(monto)}
        </td>
      </tr>
    </table>

    <table style="width: 100%; margin-top: 50px; text-align: center; font-size: 10px;">
      <tr>
        <td style="width: 45%; border-top: 1px solid #000; padding-top: 6px;">
          Firma y Sello de Caja / Receptor
        </td>
        <td style="width: 10%;"></td>
        <td style="width: 45%; border-top: 1px solid #000; padding-top: 6px;">
          Firma del Comprador
        </td>
      </tr>
    </table>
  `
}
