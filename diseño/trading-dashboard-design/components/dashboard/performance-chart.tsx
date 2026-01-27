"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { useState } from "react"
import { cn } from "@/lib/utils"

const chartData = [
  { date: "Ene", balance: 650000, profit: 12000 },
  { date: "Feb", balance: 680000, profit: 18000 },
  { date: "Mar", balance: 720000, profit: 25000 },
  { date: "Abr", balance: 695000, profit: -8000 },
  { date: "May", balance: 740000, profit: 32000 },
  { date: "Jun", balance: 785000, profit: 28000 },
  { date: "Jul", balance: 810000, profit: 15000 },
  { date: "Ago", balance: 795000, profit: -5000 },
  { date: "Sep", balance: 825000, profit: 22000 },
  { date: "Oct", balance: 860000, profit: 24000 },
  { date: "Nov", balance: 830000, profit: -12000 },
  { date: "Dic", balance: 847520, profit: 18000 },
]

const chartConfig = {
  balance: {
    label: "Balance",
    color: "var(--chart-1)",
  },
  profit: {
    label: "Profit",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const timeRanges = ["7D", "1M", "3M", "6M", "1Y", "Todo"]

export function PerformanceChart() {
  const [selectedRange, setSelectedRange] = useState("1Y")

  return (
    <Card className="border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Rendimiento Global</h3>
          <p className="text-sm text-muted-foreground">Evolución del balance total de todas las cuentas</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRange(range)}
              className={cn(
                "h-7 px-3 text-xs font-medium",
                selectedRange === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            dx={-10}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="font-mono">${Number(value).toLocaleString()}</span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}
