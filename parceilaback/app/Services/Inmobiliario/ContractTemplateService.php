<?php

namespace App\Services\Inmobiliario;

use App\Models\Negociacion;
use Carbon\Carbon;

class ContractTemplateService
{
    /**
     * Reemplaza variables de plantilla con datos reales de la negociación y de la empresa.
     */
    public function renderTemplate(string $templateContent, Negociacion $negociacion, array $empresaConfig = []): string
    {
        $cliente = $negociacion->cliente;
        $lote = $negociacion->lote;
        $parcela = $lote->parcela;
        $finca = $parcela->finca;

        $nombreEmpresa = $empresaConfig['nombreEmpresa'] ?? 'Parcelia';
        $slogan = $empresaConfig['slogan'] ?? 'Sistema de Gestión & Parcelamientos';
        $logoUrl = $empresaConfig['logoUrl'] ?? null;
        $nitEmpresa = $empresaConfig['nit'] ?? '1098472-9';
        $telefonoEmpresa = $empresaConfig['telefono'] ?? '(502) 2234-5678';
        $emailEmpresa = $empresaConfig['email'] ?? 'contacto@parcelia.gt';
        $direccionEmpresa = $empresaConfig['direccion'] ?? '6a Avenida 12-20, Zona 1, Ciudad de Guatemala';
        $piePagina = $empresaConfig['piePaginaDocumentos'] ?? 'Documento oficial emitido por la Desarrolladora Inmobiliaria.';

        $logoHtml = $logoUrl 
            ? "<img src=\"{$logoUrl}\" alt=\"{$nombreEmpresa}\" style=\"max-height: 70px; max-width: 200px; object-fit: contain;\" />"
            : "<div style=\"font-size: 24px; font-weight: bold; color: #047857;\">{$nombreEmpresa}</div>";

        $variables = [
            '{{COMPANY_LOGO}}' => $logoHtml,
            '{{COMPANY_NAME}}' => $nombreEmpresa,
            '{{COMPANY_SLOGAN}}' => $slogan,
            '{{COMPANY_NIT}}' => $nitEmpresa,
            '{{COMPANY_PHONE}}' => $telefonoEmpresa,
            '{{COMPANY_EMAIL}}' => $emailEmpresa,
            '{{COMPANY_ADDRESS}}' => $direccionEmpresa,
            '{{DOCUMENT_FOOTER}}' => $piePagina,

            '{{CLIENT_NAME}}' => $cliente->nombres . ' ' . $cliente->apellidos,
            '{{CLIENT_DPI}}' => $cliente->dpi ?? 'N/A',
            '{{CLIENT_NIT}}' => $cliente->nit ?? 'C/F',
            '{{CLIENT_PHONE}}' => $cliente->telefono ?? 'N/A',
            '{{CLIENT_EMAIL}}' => $cliente->email ?? 'N/A',
            '{{CLIENT_ADDRESS}}' => $cliente->direccion ?? 'Ciudad de Guatemala',

            '{{FINCA_NAME}}' => $finca->nombre,
            '{{FINCA_REGISTRATION}}' => "Finca No. {$finca->numero_finca}, Folio {$finca->folio}, Libro {$finca->libro}",
            '{{PARCEL_NAME}}' => $parcela->nombre_identificador,
            '{{LOT_NUMBER}}' => $lote->numero_lote,
            '{{LOT_CODE}}' => $lote->codigo_unico,
            '{{LOT_AREA}}' => number_format($lote->area_m2, 2) . ' m²',
            '{{LOT_FRONT}}' => number_format($lote->frente_metros, 2) . ' m',
            '{{LOT_DEPTH}}' => number_format($lote->fondo_metros, 2) . ' m',
            '{{LOT_BOUNDARIES}}' => $lote->colindancias ?? 'Según plano de registro',

            '{{CONTRACT_NUMBER}}' => $negociacion->codigo_negociacion,
            '{{SALE_TYPE}}' => strtoupper($negociacion->tipo_negociacion),
            '{{PRICE_ORIGINAL}}' => 'Q ' . number_format($negociacion->precio_original, 2),
            '{{DISCOUNT}}' => 'Q ' . number_format($negociacion->descuento, 2),
            '{{PRICE_FINAL}}' => 'Q ' . number_format($negociacion->precio_final, 2),
            '{{DOWN_PAYMENT}}' => 'Q ' . number_format($negociacion->enganche_pactado, 2),
            '{{FINANCED_AMOUNT}}' => 'Q ' . number_format($negociacion->monto_financiado, 2),
            '{{INTEREST_RATE}}' => number_format($negociacion->tasa_interes_anual, 2) . '%',
            '{{TERM}}' => "{$negociacion->plazo_meses} meses",
            '{{INSTALLMENT}}' => 'Q ' . number_format($negociacion->cuota_mensual, 2),
            '{{START_DATE}}' => $negociacion->fecha_primer_pago?->format('d/m/Y') ?? Carbon::now()->format('d/m/Y'),
            '{{CONTRACT_DATE}}' => $negociacion->fecha_negociacion?->format('d/m/Y') ?? Carbon::now()->format('d/m/Y'),
            '{{CURRENT_DATE}}' => Carbon::now()->isoFormat('D [de] MMMM [de] YYYY'),
        ];

        return strtr($templateContent, $variables);
    }

    /**
     * Plantilla base por defecto para Contrato de Compraventa con Financiamiento.
     */
    public function getDefaultContractTemplate(): string
    {
        return <<<'HTML'
<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 25px; color: #111; max-width: 800px; margin: 0 auto;">
    <!-- Encabezado Institucional con Logo Dinámico -->
    <table style="width: 100%; margin-bottom: 20px; border-bottom: 2px solid #047857; padding-bottom: 15px;">
        <tr>
            <td style="width: 35%; vertical-align: middle;">
                {{COMPANY_LOGO}}
            </td>
            <td style="width: 65%; text-align: right; vertical-align: middle;">
                <div style="font-size: 16px; font-weight: bold; color: #047857;">{{COMPANY_NAME}}</div>
                <div style="font-size: 12px; color: #555;">{{COMPANY_SLOGAN}}</div>
                <div style="font-size: 11px; color: #666;">NIT: {{COMPANY_NIT}} · Tel: {{COMPANY_PHONE}}</div>
                <div style="font-size: 11px; color: #666;">{{COMPANY_ADDRESS}}</div>
            </td>
        </tr>
    </table>

    <h2 style="text-align: center; text-transform: uppercase; color: #047857; margin-bottom: 5px;">CONTRATO DE COMPRAVENTA DE BIEN INMUEBLE CON FINANCIAMIENTO</h2>
    <p style="text-align: center; font-weight: bold; margin-top: 0; color: #555;">CONVENIO NO. {{CONTRACT_NUMBER}}</p>
    <hr style="margin: 15px 0 25px 0; border: 0; border-top: 1px solid #e5e7eb;" />

    <p>En la Ciudad de Guatemala, el día <strong>{{CURRENT_DATE}}</strong>, comparecen por una parte la Desarrolladora Inmobiliaria <strong>{{COMPANY_NAME}}</strong> y por la otra parte el(la) señor(a) <strong>{{CLIENT_NAME}}</strong>, quien se identifica con DPI <strong>{{CLIENT_DPI}}</strong>, NIT <strong>{{CLIENT_NIT}}</strong>, con domicilio en <strong>{{CLIENT_ADDRESS}}</strong>, convenimos en celebrar el presente contrato sujeto a las siguientes cláusulas:</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">PRIMERA: ANTECEDENTES Y DESCRIPCIÓN DEL INMUEBLE</h3>
    <p>La parte vendedora es legítima propietaria de la finca matriz denominada <strong>{{FINCA_NAME}}</strong> ({{FINCA_REGISTRATION}}), dentro de la cual se ubica el lote individual identificado como <strong>{{LOT_NUMBER}}</strong> en <strong>{{PARCEL_NAME}}</strong>, con una extensión superficial de <strong>{{LOT_AREA}}</strong> (Frente: {{LOT_FRONT}}, Fondo: {{LOT_DEPTH}}) y colindancias: {{LOT_BOUNDARIES}}.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">SEGUNDA: DEL PRECIO Y FORMA DE PAGO</h3>
    <p>El precio pactado para la presente enajenación es por la suma total de <strong>{{PRICE_FINAL}}</strong>, la cual será cancelada de la siguiente forma:</p>
    <ul>
        <li><strong>Enganche:</strong> La cantidad de <strong>{{DOWN_PAYMENT}}</strong>.</li>
        <li><strong>Monto Financiado:</strong> La cantidad de <strong>{{FINANCED_AMOUNT}}</strong>.</li>
        <li><strong>Plazo:</strong> <strong>{{TERM}}</strong> con cuotas mensuales consecutivas de <strong>{{INSTALLMENT}}</strong> cada una, a una tasa de interés anual de <strong>{{INTEREST_RATE}}</strong>.</li>
        <li><strong>Fecha de inicio de pagos:</strong> <strong>{{START_DATE}}</strong>.</li>
    </ul>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">TERCERA: ESCRITURACIÓN</h3>
    <p>La escritura traslativa de dominio se otorgará a favor del comprador al momento de cancelar la totalidad del saldo deudor y gastos de escrituración estipulados.</p>

    <br /><br />
    <table style="width: 100%; text-align: center; margin-top: 40px;">
        <tr>
            <td style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                <strong>POR LA DESARROLLADORA</strong><br />{{COMPANY_NAME}}<br />Representación Legal
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                <strong>{{CLIENT_NAME}}</strong><br />Comprador(a) / DPI: {{CLIENT_DPI}}
            </td>
        </tr>
    </table>

    <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #888; text-align: center;">
        {{DOCUMENT_FOOTER}}
    </div>
</div>
HTML;
    }
}
