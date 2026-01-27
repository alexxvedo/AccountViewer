"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Zap,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Trophy,
  Flame,
  Shield,
  AlertTriangle,
} from "lucide-react"

const drawdownData = [
  { date: "1", value: 0 },
  { date: "5", value: -1.2 },
  { date: "10", value: -0.8 },
  { date: "15", value: -2.1 },
  { date: "20", value: -1.5 },
  { date: "25", value: -3.2 },
  { date: "30", value: -2.8 },
]

const streakData = [
  { date: "Sem 1", wins: 12, losses: 5 },
  { date: "Sem 2", wins: 15, losses: 4 },
  { date: "Sem 3", wins: 10, losses: 8 },
  { date: "Sem 4", wins: 18, losses: 3 },
]

const consistencyData = [
  { month: "Ene", consistency: 72 },
  { month: "Feb", consistency: 78 },
  { month: "Mar", consistency: 85 },
  { month: "Abr", consistency: 68 },
  { month: "May", consistency: 82 },
  { month: "Jun", consistency: 88 },
  { month: "Jul", consistency: 91 },
  { month: "Ago", consistency: 86 },
  { month: "Sep", consistency: 79 },
  { month: "Oct", consistency: 92 },
  { month: "Nov", consistency: 88 },
  { month: "Dic", consistency: 94 },
]

interface Trade {
  id: string
  date: string
  pair: string
  type: "buy" | "sell"
  result: "win" | "loss" | "be"
  pips: number
  profit: number
  rr: number
  duration: string
}

const recentTrades: Trade[] = [
  { id: "1", date: "2024-01-27 14:32", pair: "EUR/USD", type: "buy", result: "win", pips: 45, profit: 450, rr: 2.5, duration: "2h 15m" },
  { id: "2", date: "2024-01-27 10:15", pair: "GBP/USD", type: "sell", result: "win", pips: 32, profit: 320, rr: 1.8, duration: "1h 45m" },
  { id: "3", date: "2024-01-26 16:48", pair: "XAU/USD", type: "buy", result: "loss", pips: -25, profit: -250, rr: -1.0, duration: "45m" },
  { id: "4", date: "2024-01-26 11:22", pair: "EUR/USD", type: "sell", result: "win", pips: 38, profit: 380, rr: 2.1, duration: "3h 10m" },
  { id: "5", date: "2024-01-25 15:05", pair: "US30", type: "buy", result: "be", pips: 0, profit: 0, rr: 0, duration: "1h 20m" },
  { id: "6", date: "2024-01-25 09:30", pair: "GBP/USD", type: "buy", result: "win", pips: 52, profit: 520, rr: 2.8, duration: "4h 05m" },
  { id: "7", date: "2024-01-24 14:18", pair: "EUR/USD", type: "sell", result: "win", pips: 28, profit: 280, rr: 1.5, duration: "55m" },
  { id: "8", date: "2024-01-24 10:45", pair: "XAU/USD", type: "buy", result: "loss", pips: -18, profit: -180, rr: -0.8, duration: "30m" },
]

const achievements = [
  { icon: Trophy, title: "5 Wins Seguidos", description: "Racha de 5 trades ganadores", achieved: true, date: "Hace 2 días" },
  { icon: Flame, title: "10K Profit", description: "Alcanzaste $10,000 de profit", achieved: true, date: "Hace 1 semana" },
  { icon: Shield, title: "Sin DD Diario", description: "7 días sin drawdown diario", achieved: true, date: "Hace 3 días" },
  { icon: Award, title: "100 Trades", description: "Completaste 100 trades", achieved: false, progress: 87 },
]

const resultConfig = {
  win: { color: "text-profit", bg: "bg-profit/20", icon: ArrowUp },
  loss: { color: "text-loss", bg: "bg-loss/20", icon: ArrowDown },
  be: { color: "text-muted-foreground", bg: "bg-muted", icon: Minus },
}

export default function PerformancePage() {
  const [selectedAccount, setSelectedAccount] = useState("all")

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Performance</h1>
              <p className="text-sm text-muted-foreground">
                Métricas detalladas y seguimiento de tu rendimiento
              </p>
            </div>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[200px] bg-secondary border-border">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                <SelectItem value="ftmo-100k">FTMO 100K</SelectItem>
                <SelectItem value="ftmo-200k">FTMO 200K</SelectItem>
                <SelectItem value="5ers-100k">The5ers 100K</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Racha Actual</p>
                    <p className="text-2xl font-bold font-mono text-profit">+5 Wins</p>
                    <p className="text-xs text-muted-foreground">Mejor: 8 wins</p>
                  </div>
                  <div className="rounded-lg bg-profit/20 p-2">
                    <Flame className="h-5 w-5 text-profit" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Win</p>
                    <p className="text-2xl font-bold font-mono text-profit">+$285</p>
                    <p className="text-xs text-muted-foreground">32 pips promedio</p>
                  </div>
                  <div className="rounded-lg bg-profit/20 p-2">
                    <TrendingUp className="h-5 w-5 text-profit" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Loss</p>
                    <p className="text-2xl font-bold font-mono text-loss">-$142</p>
                    <p className="text-xs text-muted-foreground">18 pips promedio</p>
                  </div>
                  <div className="rounded-lg bg-loss/20 p-2">
                    <TrendingDown className="h-5 w-5 text-loss" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Risk/Reward</p>
                    <p className="text-2xl font-bold font-mono text-foreground">1:2.01</p>
                    <p className="text-xs text-muted-foreground">Por encima del objetivo</p>
                  </div>
                  <div className="rounded-lg bg-accent/20 p-2">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Drawdown Chart */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Control de Drawdown</CardTitle>
                  <Badge variant="outline" className="border-profit/30 bg-profit/20 text-profit">
                    -2.8% actual
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">DD Actual</p>
                    <p className="text-lg font-bold font-mono text-foreground">2.8%</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Max DD</p>
                    <p className="text-lg font-bold font-mono text-loss">4.2%</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Límite</p>
                    <p className="text-lg font-bold font-mono text-foreground">10%</p>
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownData}>
                      <defs>
                        <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `${v}%`} domain={[-5, 0]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333" }}
                        formatter={(value: number) => [`${value}%`, "Drawdown"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDD)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Consistency Score */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Score de Consistencia</CardTitle>
                  <Badge variant="outline" className="border-accent/30 bg-accent/20 text-accent">
                    94% este mes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Promedio</p>
                    <p className="text-lg font-bold font-mono text-foreground">84%</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Mejor Mes</p>
                    <p className="text-lg font-bold font-mono text-profit">94%</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Peor Mes</p>
                    <p className="text-lg font-bold font-mono text-loss">68%</p>
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={consistencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} domain={[60, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333" }}
                        formatter={(value: number) => [`${value}%`, "Consistencia"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="consistency"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Trades */}
            <Card className="border-border bg-card lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Trades Recientes</CardTitle>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Ver todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTrades.map((trade) => {
                    const config = resultConfig[trade.result]
                    const Icon = config.icon
                    return (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${config.bg}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{trade.pair}</span>
                              <Badge variant="outline" className="text-xs border-border">
                                {trade.type.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{trade.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Pips</p>
                            <p className={`font-mono text-sm ${config.color}`}>
                              {trade.pips > 0 ? "+" : ""}{trade.pips}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">P/L</p>
                            <p className={`font-mono text-sm font-medium ${config.color}`}>
                              {trade.profit > 0 ? "+" : ""}${trade.profit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">R:R</p>
                            <p className="font-mono text-sm text-foreground">{trade.rr}</p>
                          </div>
                          <div className="text-right min-w-[60px]">
                            <p className="text-xs text-muted-foreground">Duración</p>
                            <p className="text-sm text-foreground">{trade.duration}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Logros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-3 ${achievement.achieved ? "bg-accent/10" : "bg-secondary/50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${achievement.achieved ? "bg-accent/20" : "bg-muted"}`}>
                          <achievement.icon className={`h-4 w-4 ${achievement.achieved ? "text-accent" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium ${achievement.achieved ? "text-foreground" : "text-muted-foreground"}`}>
                              {achievement.title}
                            </p>
                            {achievement.achieved && (
                              <Badge variant="outline" className="text-xs border-accent/30 bg-accent/20 text-accent">
                                Logrado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          {achievement.achieved ? (
                            <p className="text-xs text-accent mt-1">{achievement.date}</p>
                          ) : (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Progreso</span>
                                <span className="text-foreground">{achievement.progress}%</span>
                              </div>
                              <Progress value={achievement.progress} className="h-1.5" />
                            </div>
                          )}
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
