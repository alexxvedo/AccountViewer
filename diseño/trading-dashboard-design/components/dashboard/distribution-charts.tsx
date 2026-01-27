"use client"

import { Card } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts"

const companyDistribution = [
  { name: "FTMO", value: 312450, color: "var(--chart-1)" },
  { name: "MyForexFunds", value: 248920, color: "var(--chart-3)" },
  { name: "The5ers", value: 154230, color: "var(--chart-4)" },
  { name: "Funded Next", value: 78520, color: "var(--chart-5)" },
  { name: "True Forex", value: 53400, color: "var(--muted-foreground)" },
]

const monthlyProfits = [
  { month: "Sep", profit: 22000 },
  { month: "Oct", profit: 24000 },
  { month: "Nov", profit: -12000 },
  { month: "Dic", profit: 18000 },
  { month: "Ene", profit: 28000 },
]

const pieConfig = {
  value: { label: "Balance" },
} satisfies ChartConfig

const barConfig = {
  profit: { label: "Profit", color: "var(--chart-1)" },
} satisfies ChartConfig

export function DistributionCharts() {
  const total = companyDistribution.reduce((acc, item) => acc + item.value, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Company Distribution */}
      <Card className="border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Distribución por Empresa</h3>
          <p className="text-sm text-muted-foreground">Balance total por prop firm</p>
        </div>
        <div className="flex items-center gap-6">
          <ChartContainer config={pieConfig} className="h-[180px] w-[180px]">
            <PieChart>
              <Pie
                data={companyDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {companyDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="font-mono">${Number(value).toLocaleString()}</span>
                    )}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
          <div className="flex-1 space-y-2">
            {companyDistribution.map((company) => (
              <div key={company.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: company.color }}
                  />
                  <span className="text-muted-foreground">{company.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-medium text-foreground">
                    ${(company.value / 1000).toFixed(0)}K
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({((company.value / total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Monthly Profits */}
      <Card className="border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Profits Mensuales</h3>
          <p className="text-sm text-muted-foreground">Rendimiento de los últimos 5 meses</p>
        </div>
        <ChartContainer config={barConfig} className="h-[180px] w-full">
          <BarChart data={monthlyProfits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono">${Number(value).toLocaleString()}</span>
                  )}
                />
              }
            />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {monthlyProfits.map((entry, index) => (
                <Cell
                  key={entry.month}
                  fill={entry.profit >= 0 ? "var(--chart-1)" : "var(--chart-2)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </Card>
    </div>
  )
}
