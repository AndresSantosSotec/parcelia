import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, ListBullets } from '@phosphor-icons/react'
import { NuevaCompra } from './NuevaCompra'
import { ListadoCompras } from './ListadoCompras'

export function ComprasModule() {
    const [vistaActiva, setVistaActiva] = useState<'modulo' | 'nueva-compra'>('modulo')

    if (vistaActiva === 'nueva-compra') {
        return <NuevaCompra onVolver={() => setVistaActiva('modulo')} onCompraRegistrada={() => setVistaActiva('modulo')} />
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Módulo de Compras</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Gestión de compras directas de artículos para el inventario
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setVistaActiva('nueva-compra')}
                        className="gap-2"
                    >
                        <Plus size={16} />
                        Registrar Nueva Compra
                    </Button>
                </div>
            </div>

            <ListadoCompras />
        </div>
    )
}
