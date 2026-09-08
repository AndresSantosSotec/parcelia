import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Book, Gear, ListBullets, ChartLineUp, Scales, ChartBar, BookOpen, Clock } from '@phosphor-icons/react';
import ParametrizacionModule from './ParametrizacionModule';
import ParametrizacionMoraModule from './ParametrizacionMoraModule';
import LibroDiarioModule from './LibroDiarioModule';
import ResumenContableModule from './ResumenContableModule';
import PlanCuentasModule from './PlanCuentasModule';
import BalanceComprobacionModule from './BalanceComprobacionModule';
import LibroMayorModule from './LibroMayorModule';
import EstadoResultadosModule from './EstadoResultadosModule';
import BalanceGeneralModule from './BalanceGeneralModule';

type Tab = 'resumen' | 'nomenclatura' | 'diario' | 'balance' | 'mayor' | 'resultados' | 'balance-general' | 'configuracion' | 'param-mora';

export function ContabilidadModule() {
    const [activeTab, setActiveTab] = useState<Tab>('resumen');

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'resumen', label: 'Resumen', icon: <ChartLineUp size={15} /> },
        { id: 'nomenclatura', label: 'Plan de Cuentas', icon: <ListBullets size={15} /> },
        { id: 'diario', label: 'Libro Diario', icon: <Book size={15} /> },
        { id: 'mayor', label: 'Libro Mayor', icon: <BookOpen size={15} /> },
        { id: 'balance', label: 'Bal. Comprobación', icon: <Scales size={15} /> },
        { id: 'resultados', label: 'Edo. Resultados', icon: <ChartBar size={15} /> },
        { id: 'balance-general', label: 'Balance General', icon: <ChartLineUp size={15} /> },
        { id: 'configuracion', label: 'Parametrización', icon: <Gear size={15} /> },
        { id: 'param-mora', label: 'Param. sistema', icon: <Clock size={15} /> },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Book size={32} className="text-primary" />
                        Módulo Contable
                    </h1>
                    <p className="text-muted-foreground">
                        Gestión financiera, plan de cuentas y reportes contables
                    </p>
                </div>
                <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-1.5 text-xs h-8"
                        >
                            {tab.icon}
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mt-2">
                {activeTab === 'resumen' && <ResumenContableModule />}
                {activeTab === 'nomenclatura' && <PlanCuentasModule />}
                {activeTab === 'diario' && <LibroDiarioModule />}
                {activeTab === 'mayor' && <LibroMayorModule />}
                {activeTab === 'balance' && <BalanceComprobacionModule />}
                {activeTab === 'resultados' && <EstadoResultadosModule />}
                {activeTab === 'balance-general' && <BalanceGeneralModule />}
                {activeTab === 'configuracion' && <ParametrizacionModule />}
                {activeTab === 'param-mora' && <ParametrizacionMoraModule />}
            </div>
        </div>
    );
}

export default ContabilidadModule;

