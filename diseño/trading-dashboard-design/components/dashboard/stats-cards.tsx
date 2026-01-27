"use client"

import React from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity, Target } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  change: string
  changeType: "positive" | "negative" | "neutral"
  icon: React.ComponentType<{ className?: string }>
  subtitle?: string
}

function StatCard({ title, value, change, changeType, icon: Icon, subtitle }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                changeType === "positive" && "text-profit",
                changeType === "negative" && "text-loss",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
              {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
              {change}
            </span>
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          changeType === "positive" && "bg-profit/10",
          changeType === "negative" && "bg-loss/10",
          changeType === "neutral" && "bg-muted"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            changeType === "positive" && "text-profit",
            changeType === "negative" && "text-loss",
            changeType === "neutral" && "text-muted-foreground"
          )} />
        </div>
      </div>
    </Card>
  )
}

export function StatsCards() {
  const stats: StatCardProps[] = [
    {
      title: "Balance Total",
      value: "$847,520",
      change: "+12.5%",
      changeType: "positive",
      icon: DollarSign,
      subtitle: "vs mes anterior",
    },
    {
      title: "Profit Neto",
      value: "$124,830",
      change: "+8.2%",
      changeType: "positive",
      icon: TrendingUp,
      subtitle: "este mes",
    },
    {
      title: "Win Rate",
      value: "68.4%",
      change: "-2.1%",
      changeType: "negative",
      icon: Target,
      subtitle: "últimos 30 días",
    },
    {
      title: "Drawdown Máx",
      value: "4.8%",
      change: "Saludable",
      changeType: "neutral",
      icon: Activity,
      subtitle: "dentro de límites",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  )
}
