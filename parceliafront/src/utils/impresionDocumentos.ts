import { EmpresaConfig, DEFAULT_EMPRESA_CONFIG } from '@/hooks/useEmpresaConfig'

/**
 * Obtiene la configuración de empresa más reciente guardada en localStorage
 */
export function getLatestEmpresaConfig(): EmpresaConfig {
  try {
    const saved = localStorage.getItem('parcelia_empresa_config')
    if (saved) {
      return { ...DEFAULT_EMPRESA_CONFIG, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Error al recuperar empresa config:', e)
  }
  return DEFAULT_EMPRESA_CONFIG
}

/**
 * Genera el encabezado HTML institucional estándar con el logo más reciente
 */
export function generarEncabezadoHTML(config?: EmpresaConfig): string {
  const cfg = config || getLatestEmpresaConfig()
  const logoElement = cfg.logoUrl
    ? `<img src="${cfg.logoUrl}" alt="${cfg.nombreEmpresa}" style="max-height: 65px; max-width: 200px; object-fit: contain;" />`
    : `<div style="font-size: 22px; font-weight: 800; color: #047857; letter-spacing: -0.5px;">${cfg.nombreEmpresa}</div>`

  return `
    <table style="width: 100%; border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 20px;">
      <tr>
        <td style="width: 40%; vertical-align: middle;">
          ${logoElement}
        </td>
        <td style="width: 60%; text-align: right; vertical-align: middle; font-family: Arial, sans-serif;">
          <div style="font-size: 15px; font-weight: bold; color: #047857;">${cfg.nombreEmpresa}</div>
          <div style="font-size: 11px; color: #555; font-style: italic;">${cfg.slogan}</div>
          <div style="font-size: 11px; color: #666;">NIT: ${cfg.nit} · Tel: ${cfg.telefono}</div>
          <div style="font-size: 10px; color: #777;">${cfg.direccion}</div>
          <div style="font-size: 10px; color: #047857;">${cfg.sitioWeb} · ${cfg.email}</div>
        </td>
      </tr>
    </table>
  `
}

/**
 * Genera el pie de página institucional estándar
 */
export function generarPieHTML(config?: EmpresaConfig): string {
  const cfg = config || getLatestEmpresaConfig()
  return `
    <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9px; color: #888; text-align: center; font-family: Arial, sans-serif;">
      ${cfg.piePaginaDocumentos} · Fecha de emisión: ${new Date().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </div>
  `
}

/**
 * Abre una ventana de impresión limpia con el contenido HTML proporcionado
 */
export function imprimirDocumentoHTML(titulo: string, cuerpoHTML: string, customConfig?: EmpresaConfig) {
  const cfg = customConfig || getLatestEmpresaConfig()
  const printWindow = window.open('', '_blank', 'width=900,height=750')
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para imprimir el documento.')
    return
  }

  const fullHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${titulo} - ${cfg.nombreEmpresa}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #222; margin: 0; padding: 15px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 6px 8px; }
        .data-table th { background: #f0fdf4; color: #166534; font-weight: bold; border-bottom: 1px solid #bbf7d0; text-align: left; }
        .data-table td { border-bottom: 1px solid #f3f4f6; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .badge { display: inline-block; padding: 2px 8px; font-size: 10px; border-radius: 9999px; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #15803d; }
        .badge-warning { background: #fef9c3; color: #a16207; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      ${generarEncabezadoHTML(cfg)}
      ${cuerpoHTML}
      ${generarPieHTML(cfg)}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(fullHTML)
  printWindow.document.close()
}
