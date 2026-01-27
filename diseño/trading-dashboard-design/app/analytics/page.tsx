"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Clock,
  Percent,
  DollarSign,
  BarChart3,
  Activity,
} from "lucide-react"

const equityCurveData = [
  { date: "Ene", balance: 450000, profit: 0 },
  { date: "Feb", balance: 468000, profit: 18000 },
  { date: "Mar", balance: 495000, profit: 45000 },
  { date: "Abr", balance: 482000, profit: 32000 },
  { date: "May", balance: 520000, profit: 70000 },
  { date: "Jun", balance: 548000, profit: 98000 },
  { date: "Jul", balance: 562000, profit: 112000 },
  { date: "Ago", balance: 598000, profit: 148000 },
  { date: "Sep", balance: 585000, profit: 135000 },
  { date: "Oct", balance: 620000, profit: 170000 },
  { date: "Nov", balance: 658000, profit: 208000 },
  { date: "Dic", balance: 743670, profit: 293670 },
]

const dailyPnlData = [
  { day: "Lun", profit: 1250, loss: -450 },
  { day: "Mar", profit: 890, loss: -320 },
  { day: "Mie", profit: 1580, loss: -680 },
  { day: "Jue", profit: 720, loss: -890 },
  { day: "Vie", profit: 2100, loss: -540 },
]

const monthlyData = [
  { month: "Ene", profit: 4200, loss: -1800, net: 2400 },
  { month: "Feb", profit: 6800, loss: -2200, net: 4600 },
  { month: "Mar", profit: 8500, loss: -3100, net: 5400 },
  { month: "Abr", profit: 5200, loss: -4800, net: 400 },
  { month: "May", profit: 9800, loss: -2600, net: 7200 },
  { month: "Jun", profit: 7400, loss: -3200, net: 4200 },
  { month: "Jul", profit: 11200, loss: -4100, net: 7100 },
  { month: "Ago", profit: 8900, loss: -2800, net: 6100 },
  { month: "Sep", profit: 6200, loss: -5400, net: 800 },
  { month: "Oct", profit: 12500, loss: -3600, net: 8900 },
  { month: "Nov", profit: 9800, loss: -2900, net: 6900 },
  { month: "Dic", profit: 14200, loss: -4500, net: 9700 },
]

const instrumentData = [
  { name: "EUR/USD", value: 35, profit: 12500, trades: 145 },
  { name: "GBP/USD", value: 25, profit: 8200, trades: 98 },
  { name: "XAU/USD", value: 20, profit: 15600, trades: 67 },
  { name: "US30", value: 12, profit: 6800, trades: 45 },
  { name: "Otros", value: 8, profit: 2100, trades: 32 },
]

const sessionData = [
  { session: "Londres", trades: 156, winRate: 72, profit: 18500 },
  { session: "Nueva York", trades: 189, winRate: 68, profit: 22400 },
  { session: "Asia", trades: 78, winRate: 58, profit: 4200 },
  { session: "Overlap", trades: 64, winRate: 75, profit: 8900 },
]

const performanceRadar = [
  { metric: "Win Rate", value: 68, fullMark: 100 },
  { metric: "Risk/Reward", value: 75, fullMark: 100 },
  { metric: "Consistencia", value: 82, fullMark: 100 },
  { metric: "Disciplina", value: 70, fullMark: 100 },
  { metric: "Timing", value: 65, fullMark: 100 },
  { metric: "Gestión", value: 78, fullMark: 100 },
]

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("12m")

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Análisis detallado de tu rendimiento de trading
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 días</SelectItem>
                  <SelectItem value="1m">1 mes</SelectItem>
                  <SelectItem value="3m">3 meses</SelectItem>
                  <SelectItem value="6m">6 meses</SelectItem>
                  <SelectItem value="12m">12 meses</SelectItem>
                  <SelectItem value="all">Todo</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-border bg-transparent">
                <Calendar className="mr-2 h-4 w-4" />
                Personalizar
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mb-6 grid gap-4 md:grid-cols-5">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-profit/20 p-2">
                    <TrendingUp className="h-5 w-5 text-profit" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profit Total</p>
                    <p className="text-xl font-bold font-mono text-profit">+$38,450</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/20 p-2">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-xl font-bold font-mono text-foreground">68.5%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-chart-3/20 p-2">
                    <BarChart3 className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trades</p>
                    <p className="text-xl font-bold font-mono text-foreground">387</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-warning/20 p-2">
                    <Percent className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profit Factor</p>
                    <p className="text-xl font-bold font-mono text-foreground">2.14</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-loss/20 p-2">
                    <TrendingDown className="h-5 w-5 text-loss" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Drawdown</p>
                    <p className="text-xl font-bold font-mono text-foreground">4.2%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            {/* Equity Curve */}
            <Card className="border-border bg-card lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Curva de Equity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        name="Balance"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Radar */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Perfil de Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={performanceRadar}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#666", fontSize: 10 }} />
                      <Radar
                        name="Performance"
                        dataKey="value"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Monthly P&L */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">P&L Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="profit" name="Ganancias" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="loss" name="Pérdidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily P&L by Weekday */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">P&L por Día de la Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyPnlData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="day" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${value}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="profit" name="Ganancias" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="loss" name="Pérdidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 3 */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Instruments Distribution */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Distribución por Instrumento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={instrumentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {instrumentData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {instrumentData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-mono text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Session Performance */}
            <Card className="border-border bg-card lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Rendimiento por Sesión</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {sessionData.map((session) => (
                    <div
                      key={session.session}
                      className="rounded-lg bg-secondary/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-foreground">{session.session}</h4>
                        <Badge
                          variant="outline"
                          className={session.winRate >= 70 ? "border-profit/30 bg-profit/20 text-profit" : "border-warning/30 bg-warning/20 text-warning"}
                        >
                          {session.winRate}% Win
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="text-lg font-bold font-mono text-foreground">{session.trades}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Profit</p>
                          <p className="text-lg font-bold font-mono text-profit">+${session.profit.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
