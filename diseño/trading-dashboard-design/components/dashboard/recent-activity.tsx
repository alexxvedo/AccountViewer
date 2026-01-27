"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock } from "lucide-react"

interface Activity {
  id: string
  type: "trade_win" | "trade_loss" | "payout" | "phase_passed" | "warning"
  title: string
  description: string
  time: string
  amount?: number
}

const activities: Activity[] = [
  {
    id: "1",
    type: "trade_win",
    title: "Trade Ganador",
    description: "EURUSD - Challenge 100K #1",
    time: "hace 2 horas",
    amount: 1250,
  },
  {
    id: "2",
    type: "payout",
    title: "Payout Recibido",
    description: "MyForexFunds - Swing Account",
    time: "hace 5 horas",
    amount: 8500,
  },
  {
    id: "3",
    type: "phase_passed",
    title: "Fase Completada",
    description: "The5ers - Scalping 50K pasó a Phase 2",
    time: "hace 1 día",
  },
  {
    id: "4",
    type: "trade_loss",
    title: "Trade Perdedor",
    description: "GBPJPY - Challenge 200K",
    time: "hace 1 día",
    amount: -850,
  },
  {
    id: "5",
    type: "warning",
    title: "Alerta de Drawdown",
    description: "Challenge 200K cerca del límite (6.8%)",
    time: "hace 2 días",
  },
]

const activityConfig = {
  trade_win: {
    icon: TrendingUp,
    iconClass: "text-profit",
    bgClass: "bg-profit/10",
  },
  trade_loss: {
    icon: TrendingDown,
    iconClass: "text-loss",
    bgClass: "bg-loss/10",
  },
  payout: {
    icon: CheckCircle2,
    iconClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  phase_passed: {
    icon: CheckCircle2,
    iconClass: "text-chart-3",
    bgClass: "bg-chart-3/10",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    bgClass: "bg-warning/10",
  },
}

export function RecentActivity() {
  return (
    <Card className="border-border bg-card">
      <div className="border-b border-border p-5">
        <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
        <p className="text-sm text-muted-foreground">Últimos movimientos en tus cuentas</p>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const config = activityConfig[activity.type]
          const Icon = config.icon
          return (
            <div key={activity.id} className="flex items-start gap-4 p-4 transition-colors hover:bg-secondary/30">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.bgClass)}>
                <Icon className={cn("h-5 w-5", config.iconClass)} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{activity.title}</p>
                  {activity.amount && (
                    <span className={cn(
                      "font-mono font-medium",
                      activity.amount >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {activity.amount >= 0 ? "+" : ""}${Math.abs(activity.amount).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {activity.time}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-border p-3">
        <button className="w-full py-2 text-center text-sm font-medium text-accent transition-colors hover:text-accent/80">
          Ver toda la actividad
        </button>
      </div>
    </Card>
  )
}
