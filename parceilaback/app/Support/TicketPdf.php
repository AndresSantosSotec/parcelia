<?php

namespace App\Support;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class TicketPdf
{
    /**
     * PDF de 80 mm, el ancho de una impresora térmica.
     */
    public static function descargar(array $datos, string $archivo): Response
    {
        $pdf = Pdf::loadView('reportes.ticket-termico', $datos);
        $pdf->setPaper([0, 0, 226.77, 680], 'portrait');

        return $pdf->download($archivo);
    }
}
