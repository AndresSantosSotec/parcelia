<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

class InmobiliarioArrayExport implements FromCollection, WithHeadings, ShouldAutoSize
{
    public function __construct(
        private array $headings,
        private array $rows
    ) {
    }

    public function collection(): Collection
    {
        return collect($this->rows);
    }

    public function headings(): array
    {
        return $this->headings;
    }
}
