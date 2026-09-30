<?php

namespace App\Services\Inmobiliario;

use App\Models\Negociacion;
use Carbon\Carbon;

class ContractTemplateService
{
    /**
     * Reemplaza variables de plantilla con datos reales de la negociación y la empresa.
     */
    public function renderTemplate(string $templateContent, Negociacion $negociacion, array $empresaConfig = []): string
    {
        $cliente = $negociacion->cliente;
        $lote = $negociacion->lote;
        $parcela = $lote->parcela;
        $finca = $parcela->finca;

        $nombreEmpresa = $empresaConfig['nombreEmpresa'] ?? 'TerraCloud';
        $slogan = $empresaConfig['slogan'] ?? 'Solución Cloud de Parcelamiento & Financiamiento';
        $logoUrl = $empresaConfig['logoUrl'] ?? null;
        $nitEmpresa = $empresaConfig['nit'] ?? '1098472-9';
        $telefonoEmpresa = $empresaConfig['telefono'] ?? '(502) 2334-8900';
        $emailEmpresa = $empresaConfig['email'] ?? 'contacto@terracloud.gt';
        $direccionEmpresa = $empresaConfig['direccion'] ?? 'Avenida Reforma 12-40, Zona 10';
        $piePagina = $empresaConfig['piePaginaDocumentos'] ?? 'Documento oficial emitido por la Desarrolladora Inmobiliaria.';
        $clausulas = $empresaConfig['clausulasContrato'] ?? '';
        $moneda = $empresaConfig['monedaSimbolo'] ?? 'Q';

        $logoHtml = $logoUrl
            ? "<img src=\"{$logoUrl}\" alt=\"{$nombreEmpresa}\" style=\"max-height: 70px; max-width: 200px; object-fit: contain;\" />"
            : "<div style=\"font-size: 24px; font-weight: bold; color: #047857;\">{$nombreEmpresa}</div>";

        $planPagos = $negociacion->planPagos ?? collect();
        $primeraCuota = $planPagos->first();
        $ultimaCuota = $planPagos->last();

        $variables = [
            '{{COMPANY_LOGO}}' => $logoHtml,
            '{{COMPANY_NAME}}' => $nombreEmpresa,
            '{{COMPANY_SLOGAN}}' => $slogan,
            '{{COMPANY_NIT}}' => $nitEmpresa,
            '{{COMPANY_PHONE}}' => $telefonoEmpresa,
            '{{COMPANY_EMAIL}}' => $emailEmpresa,
            '{{COMPANY_ADDRESS}}' => $direccionEmpresa,
            '{{DOCUMENT_FOOTER}}' => $piePagina,
            '{{CUSTOM_CLAUSES}}' => $clausulas,
            '{{CURRENCY}}' => $moneda,

            '{{CLIENT_NAME}}' => trim(($cliente->nombres ?? '') . ' ' . ($cliente->apellidos ?? '')),
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
            '{{LOT_PRICE_M2}}' => $moneda . ' ' . number_format($lote->precio_venta > 0 && $lote->area_m2 > 0 ? $lote->precio_venta / $lote->area_m2 : 0, 2),

            '{{CONTRACT_NUMBER}}' => $negociacion->codigo_negociacion,
            '{{SALE_TYPE}}' => strtoupper($negociacion->tipo_negociacion),
            '{{SALE_TYPE_LABEL}}' => $negociacion->tipo_negociacion === 'credito' ? 'COMPRAVENTA CON FINANCIAMIENTO' : 'COMPRAVENTA AL CONTADO',
            '{{PRICE_ORIGINAL}}' => $moneda . ' ' . number_format($negociacion->precio_original, 2),
            '{{DISCOUNT}}' => $moneda . ' ' . number_format($negociacion->descuento, 2),
            '{{PRICE_FINAL}}' => $moneda . ' ' . number_format($negociacion->precio_final, 2),
            '{{DOWN_PAYMENT}}' => $moneda . ' ' . number_format($negociacion->enganche_pactado, 2),
            '{{FINANCED_AMOUNT}}' => $moneda . ' ' . number_format($negociacion->monto_financiado, 2),
            '{{INTEREST_RATE}}' => number_format($negociacion->tasa_interes_anual, 2) . '%',
            '{{TERM}}' => "{$negociacion->plazo_meses} meses",
            '{{INSTALLMENT}}' => $moneda . ' ' . number_format($negociacion->cuota_mensual, 2),
            '{{START_DATE}}' => $negociacion->fecha_primer_pago?->format('d/m/Y') ?? Carbon::now()->format('d/m/Y'),
            '{{END_DATE}}' => $ultimaCuota?->fecha_vencimiento?->format('d/m/Y') ?? '',
            '{{CONTRACT_DATE}}' => $negociacion->fecha_negociacion?->format('d/m/Y') ?? Carbon::now()->format('d/m/Y'),
            '{{CURRENT_DATE}}' => Carbon::now()->isoFormat('D [de] MMMM [de] YYYY'),
            '{{CURRENT_CITY}}' => 'Ciudad de Guatemala',
        ];

        return strtr($templateContent, $variables);
    }

    /**
     * Devuelve la plantilla adecuada según el tipo de negociación.
     */
    public function getTemplateForNegociacion(Negociacion $negociacion): string
    {
        if ($negociacion->tipo_negociacion === 'contado') {
            return $this->getContadoTemplate();
        }

        return $this->getCreditoTemplate();
    }

    /**
     * Plantilla de contrato a crédito (financiamiento).
     */
    public function getCreditoTemplate(): string
    {
        return <<<'HTML'
<div style="font-family: Arial, sans-serif; line-height: 1.7; padding: 25px; color: #111; max-width: 800px; margin: 0 auto; font-size: 12px;">
    <table style="width: 100%; margin-bottom: 18px; border-bottom: 2px solid #047857; padding-bottom: 12px;">
        <tr>
            <td style="width: 35%; vertical-align: middle;">{{COMPANY_LOGO}}</td>
            <td style="width: 65%; text-align: right; vertical-align: middle;">
                <div style="font-size: 16px; font-weight: bold; color: #047857;">{{COMPANY_NAME}}</div>
                <div style="font-size: 11px; color: #555;">{{COMPANY_SLOGAN}}</div>
                <div style="font-size: 10px; color: #666;">NIT: {{COMPANY_NIT}} · Tel: {{COMPANY_PHONE}}</div>
                <div style="font-size: 10px; color: #666;">{{COMPANY_ADDRESS}}</div>
            </td>
        </tr>
    </table>

    <h2 style="text-align: center; text-transform: uppercase; color: #047857; margin: 0 0 4px; font-size: 15px;">CONTRATO DE {{SALE_TYPE_LABEL}}</h2>
    <p style="text-align: center; font-weight: bold; margin: 0 0 6px; color: #555; font-size: 12px;">CONVENIO No. {{CONTRACT_NUMBER}}</p>
    <hr style="margin: 12px 0 20px; border: 0; border-top: 1px solid #e5e7eb;" />

    <p>En {{CURRENT_CITY}}, el día <strong>{{CURRENT_DATE}}</strong>, comparecen: por una parte la Desarrolladora Inmobiliaria <strong>{{COMPANY_NAME}}</strong>, con NIT <strong>{{COMPANY_NIT}}</strong>, con domicilio en {{COMPANY_ADDRESS}}, en adelante <strong>"LA VENDEDORA"</strong>; y por la otra, el(la) señor(a) <strong>{{CLIENT_NAME}}</strong>, quien se identifica con Documento Personal de Identificación (DPI) número <strong>{{CLIENT_DPI}}</strong>, NIT <strong>{{CLIENT_NIT}}</strong>, con domicilio en <strong>{{CLIENT_ADDRESS}}</strong>, teléfono {{CLIENT_PHONE}}, en adelante <strong>"EL COMPRADOR"</strong>, quienes convienen en celebrar el presente contrato de compraventa sujeto a las siguientes cláusulas:</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-top: 20px;">PRIMERA: ANTECEDENTES Y DESCRIPCIÓN DEL INMUEBLE</h3>
    <p>LA VENDEDORA es legítima propietaria de la finca matriz denominada <strong>"{{FINCA_NAME}}"</strong> ({{FINCA_REGISTRATION}}), inscrita en el Registro General de la Propiedad. Dentro de dicha finca se ubica el lote individual identificado como:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; width: 30%; font-weight: bold; background: #f0fdf4;">Parcela / Manzana</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{PARCEL_NAME}}</td>
        </tr>
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Número de Lote</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{LOT_NUMBER}} (Código: {{LOT_CODE}})</td>
        </tr>
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Área</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{LOT_AREA}} (Frente: {{LOT_FRONT}}, Fondo: {{LOT_DEPTH}})</td>
        </tr>
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Colindancias</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{LOT_BOUNDARIES}}</td>
        </tr>
    </table>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">SEGUNDA: DEL PRECIO Y FORMA DE PAGO</h3>
    <p>El precio pactado para la enajenación del inmueble descrito es la suma total de <strong>{{PRICE_FINAL}}</strong>, distribuida de la siguiente forma:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; width: 45%; font-weight: bold; background: #f0fdf4;">Precio de lista</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{PRICE_ORIGINAL}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Descuento aplicado</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{DISCOUNT}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #ecfdf5;">Precio final de venta</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{{PRICE_FINAL}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Enganche</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{DOWN_PAYMENT}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Monto financiado</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{FINANCED_AMOUNT}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Plazo</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{TERM}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Tasa de interés anual</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{INTEREST_RATE}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #ecfdf5;">Cuota mensual</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{{INSTALLMENT}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Inicio de pagos</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{START_DATE}}</td>
        </tr>
    </table>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">TERCERA: OBLIGACIONES DEL COMPRADOR</h3>
    <p>EL COMPRADOR se obliga a:</p>
    <ol style="margin: 8px 0;">
        <li>Pagar puntualmente las cuotas mensuales en las fechas de vencimiento establecidas en el plan de pagos anexo.</li>
        <li>Mantener actualizados sus datos de contacto ante LA VENDEDORA.</li>
        <li>No traspasar, ceder o gravar el inmueble objeto de este contrato mientras exista saldo pendiente, salvo autorización escrita de LA VENDEDORA.</li>
        <li>Cubrir los gastos de escrituración y traspaso legal del inmueble al momento que corresponda.</li>
    </ol>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">CUARTA: MORA E INTERESES MORATORIOS</h3>
    <p>En caso de atraso en el pago de cualquier cuota, EL COMPRADOR incurrirá en mora automática sin necesidad de requerimiento judicial o extrajudicial alguno. LA VENDEDORA podrá aplicar intereses moratorios sobre los montos vencidos, conforme a la parametrización vigente al momento de la firma del presente contrato.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">QUINTA: RESCISIÓN DEL CONTRATO</h3>
    <p>LA VENDEDORA podrá rescindir el presente contrato en los siguientes casos:</p>
    <ol style="margin: 8px 0;">
        <li>Falta de pago de <strong>tres (3) cuotas consecutivas</strong> o <strong>cinco (5) cuotas alternas</strong>.</li>
        <li>Incumplimiento de cualquiera de las obligaciones pactadas.</li>
        <li>Falsedad en los datos proporcionados por EL COMPRADOR.</li>
    </ol>
    <p>En caso de rescisión, LA VENDEDORA podrá retener un porcentaje de los pagos realizados en concepto de arrendamiento y gastos administrativos, según las políticas vigentes.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">SEXTA: ESCRITURACIÓN</h3>
    <p>La escritura traslativa de dominio se otorgará a favor de EL COMPRADOR al momento de cancelar la totalidad del saldo deudor, intereses y gastos de escrituración correspondientes. Los honorarios notariales y gastos de registro corren por cuenta de EL COMPRADOR.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">SÉPTIMA: ABONOS EXTRAORDINARIOS</h3>
    <p>EL COMPRADOR podrá realizar abonos extraordinarios al capital en cualquier momento, sin penalización. Dichos abonos se aplicarán conforme a las políticas de distribución vigentes.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">OCTAVA: JURISDICCIÓN Y ACEPTACIÓN</h3>
    <p>Para cualquier controversia derivada del presente contrato, ambas partes se someten a los tribunales competentes de la República de Guatemala, renunciando a cualquier otro fuero que por razón de domicilio pudiera corresponderles.</p>
    <p>{{CUSTOM_CLAUSES}}</p>
    <p>Leído que fue el presente contrato y enteradas ambas partes de su contenido, obligaciones y derechos, lo ratifican y firman en {{CURRENT_CITY}}, el día {{CURRENT_DATE}}.</p>

    <br />
    <table style="width: 100%; text-align: center; margin-top: 50px;">
        <tr>
            <td style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                <strong>POR LA VENDEDORA</strong><br />{{COMPANY_NAME}}<br />Representación Legal
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                <strong>EL COMPRADOR</strong><br />{{CLIENT_NAME}}<br />DPI: {{CLIENT_DPI}}
            </td>
        </tr>
    </table>

    <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 9px; color: #888; text-align: center;">
        {{DOCUMENT_FOOTER}}
    </div>
</div>
HTML;
    }

    /**
     * Plantilla de contrato al contado.
     */
    public function getContadoTemplate(): string
    {
        return <<<'HTML'
<div style="font-family: Arial, sans-serif; line-height: 1.7; padding: 25px; color: #111; max-width: 800px; margin: 0 auto; font-size: 12px;">
    <table style="width: 100%; margin-bottom: 18px; border-bottom: 2px solid #047857; padding-bottom: 12px;">
        <tr>
            <td style="width: 35%; vertical-align: middle;">{{COMPANY_LOGO}}</td>
            <td style="width: 65%; text-align: right; vertical-align: middle;">
                <div style="font-size: 16px; font-weight: bold; color: #047857;">{{COMPANY_NAME}}</div>
                <div style="font-size: 11px; color: #555;">{{COMPANY_SLOGAN}}</div>
                <div style="font-size: 10px; color: #666;">NIT: {{COMPANY_NIT}} · Tel: {{COMPANY_PHONE}}</div>
                <div style="font-size: 10px; color: #666;">{{COMPANY_ADDRESS}}</div>
            </td>
        </tr>
    </table>

    <h2 style="text-align: center; text-transform: uppercase; color: #047857; margin: 0 0 4px; font-size: 15px;">CONTRATO DE COMPRAVENTA AL CONTADO</h2>
    <p style="text-align: center; font-weight: bold; margin: 0 0 6px; color: #555; font-size: 12px;">CONVENIO No. {{CONTRACT_NUMBER}}</p>
    <hr style="margin: 12px 0 20px; border: 0; border-top: 1px solid #e5e7eb;" />

    <p>En {{CURRENT_CITY}}, el día <strong>{{CURRENT_DATE}}</strong>, comparecen: por una parte la Desarrolladora Inmobiliaria <strong>{{COMPANY_NAME}}</strong>, con NIT <strong>{{COMPANY_NIT}}</strong>, con domicilio en {{COMPANY_ADDRESS}}, en adelante <strong>"LA VENDEDORA"</strong>; y por la otra, el(la) señor(a) <strong>{{CLIENT_NAME}}</strong>, quien se identifica con DPI número <strong>{{CLIENT_DPI}}</strong>, NIT <strong>{{CLIENT_NIT}}</strong>, con domicilio en <strong>{{CLIENT_ADDRESS}}</strong>, teléfono {{CLIENT_PHONE}}, en adelante <strong>"EL COMPRADOR"</strong>, quienes convienen en celebrar el presente contrato sujeto a las siguientes cláusulas:</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-top: 20px;">PRIMERA: DESCRIPCIÓN DEL INMUEBLE</h3>
    <p>LA VENDEDORA es legítima propietaria de la finca matriz <strong>"{{FINCA_NAME}}"</strong> ({{FINCA_REGISTRATION}}), inscrita en el Registro General de la Propiedad. El inmueble objeto de la presente venta se identifica como:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; width: 30%; font-weight: bold; background: #f0fdf4;">Parcela / Manzana</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{PARCEL_NAME}}</td>
        </tr>
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Número de Lote</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{LOT_NUMBER}} (Código: {{LOT_CODE}})</td>
        </tr>
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Área</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{LOT_AREA}} (Frente: {{LOT_FRONT}}, Fondo: {{LOT_DEPTH}})</td>
        </tr>
        <tr>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Colindancias</td>
            <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">{{LOT_BOUNDARIES}}</td>
        </tr>
    </table>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">SEGUNDA: PRECIO Y PAGO</h3>
    <p>El precio de venta del inmueble descrito es la suma de <strong>{{PRICE_FINAL}}</strong>, la cual EL COMPRADOR se obliga a pagar en un solo desembolso al momento de la firma del presente contrato.</p>
    <table style="width: 70%; border-collapse: collapse; margin: 10px 0;">
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Precio de lista</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{PRICE_ORIGINAL}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f0fdf4;">Descuento</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right;">{{DISCOUNT}}</td>
        </tr>
        <tr>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #ecfdf5;">Total a pagar</td>
            <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{{PRICE_FINAL}}</td>
        </tr>
    </table>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">TERCERA: ESCRITURACIÓN Y TRASPASO</h3>
    <p>Habiéndose liquidado la totalidad del precio de venta, LA VENDEDORA se obliga a otorgar la escritura traslativa de dominio a favor de EL COMPRADOR dentro de un plazo razonable. Los gastos notariales, de registro y de escrituración serán por cuenta de EL COMPRADOR.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">CUARTA: ENTREGA Y POSESIÓN</h3>
    <p>LA VENDEDORA hará entrega material y jurídica del inmueble a EL COMPRADOR una vez acreditado el pago completo del precio estipulado. A partir de dicha entrega, EL COMPRADOR asume todos los derechos y obligaciones inherentes a la propiedad.</p>

    <h3 style="color: #047857; border-bottom: 1px solid #eee; padding-bottom: 4px;">QUINTA: JURISDICCIÓN Y ACEPTACIÓN</h3>
    <p>Para cualquier controversia derivada del presente contrato, ambas partes se someten a los tribunales competentes de la República de Guatemala.</p>
    <p>{{CUSTOM_CLAUSES}}</p>
    <p>Leído que fue el presente contrato y enteradas ambas partes de su contenido, lo ratifican y firman en {{CURRENT_CITY}}, el día {{CURRENT_DATE}}.</p>

    <br />
    <table style="width: 100%; text-align: center; margin-top: 50px;">
        <tr>
            <td style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                <strong>POR LA VENDEDORA</strong><br />{{COMPANY_NAME}}<br />Representación Legal
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                <strong>EL COMPRADOR</strong><br />{{CLIENT_NAME}}<br />DPI: {{CLIENT_DPI}}
            </td>
        </tr>
    </table>

    <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 9px; color: #888; text-align: center;">
        {{DOCUMENT_FOOTER}}
    </div>
</div>
HTML;
    }

    /**
     * Mantiene compatibilidad con código legacy.
     */
    public function getDefaultContractTemplate(): string
    {
        return $this->getCreditoTemplate();
    }
}
