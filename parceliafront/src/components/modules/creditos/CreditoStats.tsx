import { CreditoPrendarioStats } from '@/types/creditoPrendario.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MoneyDisplay } from '@/components/MoneyDisplay'
import { 
  CheckCircle, ClockCounterClockwise, Warning, 
  XCircle, CreditCard as CreditCardIcon 
} from '@phosphor-icons/react'

interface CreditoStatsProps {
  stats: CreditoPrendarioStats
}

export function CreditoStats({ stats }: CreditoStatsProps) {
  const statsData = [
    {
      titulo: 'Vigentes',
      valor: stats.vigentes,
      monto: stats.monto_total_vigente,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      titulo: 'Vencidos',
      valor: stats.vencidos,
      monto: stats.monto_total_vencido,
      icon: ClockCounterClockwise,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950'
    },
    {
      titulo: 'En Mora',
      valor: stats.en_mora,
      monto: stats.monto_total_en_mora,
      icon: Warning,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950'
    },
    {
      titulo: 'Solicitados',
      valor: stats.solicitados,
      monto: 0,
      icon: CreditCardIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.titulo}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.titulo}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.valor}</div>
              {stat.monto > 0 && (
                <MoneyDisplay 
                  amount={stat.monto} 
                  className="text-xs text-muted-foreground mt-1"
                />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
