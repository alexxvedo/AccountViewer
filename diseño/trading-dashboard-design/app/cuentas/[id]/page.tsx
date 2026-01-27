"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Target,
  AlertTriangle,
  Calendar,
  Clock,
  BarChart3,
  PieChartIcon,
  Settings,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Copy,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Bot,
  Zap,
  Shield,
  Award,
  History,
  CircleDot,
  X,
  Check,
  Timer,
  Percent,
  Scale,
  Flame,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Account Data
const accountData = {
  id: "1",
  name: "FTMO Challenge 100K #1",
  company: "FTMO",
  companyLogo: "F",
  type: "Challenge" as const,
  phase: "Phase 1",
  status: "active" as const,
  accountNumber: "MT5-12847293",
  server: "FTMO-Server2",
  platform: "MetaTrader 5",
  leverage: "1:100",
  currency: "USD",
  balance: 108450,
  equity: 109230,
  initialBalance: 100000,
  profit: 8450,
  profitPercent: 8.45,
  floatingPL: 780,
  margin: 2450,
  freeMargin: 106780,
  marginLevel: 4459.59,
  drawdown: 2.1,
  maxDrawdown: 10,
  dailyDrawdown: 0.8,
  maxDailyDrawdown: 5,
  trades: 45,
  winRate: 68,
  lossRate: 32,
  avgWin: 285,
  avgLoss: 142,
  profitFactor: 2.01,
  expectancy: 87.5,
  sharpeRatio: 1.85,
  sortinoRatio: 2.34,
  maxConsecutiveWins: 8,
  maxConsecutiveLosses: 3,
  avgTradeDuration: "2h 34m",
  avgTradesPerDay: 2.3,
  bestTrade: 1250,
  worstTrade: -580,
  largestWin: 1250,
  largestLoss: 580,
  longTrades: 28,
  shortTrades: 17,
  longWinRate: 71.4,
  shortWinRate: 64.7,
  startDate: "2024-01-15",
  endDate: "2024-02-15",
  daysRemaining: 18,
  daysTraded: 12,
  tradingDaysRequired: 4,
  profitTarget: 10000,
  profitTargetPercent: 10,
  createdAt: "2024-01-15T10:30:00Z",
}

// Equity Curve Data
const equityCurveData = [
  { date: "15 Ene", balance: 100000, equity: 100000 },
  { date: "16 Ene", balance: 100450, equity: 100680 },
  { date: "17 Ene", balance: 101200, equity: 101450 },
  { date: "18 Ene", balance: 100800, equity: 100950 },
  { date: "19 Ene", balance: 102100, equity: 102340 },
  { date: "22 Ene", balance: 103450, equity: 103120 },
  { date: "23 Ene", balance: 104200, equity: 104890 },
  { date: "24 Ene", balance: 103800, equity: 103650 },
  { date: "25 Ene", balance: 105600, equity: 106200 },
  { date: "26 Ene", balance: 106900, equity: 107450 },
  { date: "29 Ene", balance: 107200, equity: 107800 },
  { date: "30 Ene", balance: 108450, equity: 109230 },
]

// Open Positions
const openPositions = [
  {
    id: "1",
    ticket: "12847293",
    symbol: "EURUSD",
    type: "buy",
    volume: 0.5,
    openPrice: 1.0845,
    currentPrice: 1.0872,
    sl: 1.0810,
    tp: 1.0920,
    profit: 135,
    profitPips: 27,
    swap: -2.5,
    commission: -3.5,
    openTime: "2024-01-30 09:15:00",
    duration: "4h 23m",
  },
  {
    id: "2",
    ticket: "12847294",
    symbol: "GBPJPY",
    type: "sell",
    volume: 0.3,
    openPrice: 188.45,
    currentPrice: 188.12,
    sl: 188.90,
    tp: 187.50,
    profit: 99,
    profitPips: 33,
    swap: -1.8,
    commission: -2.8,
    openTime: "2024-01-30 11:42:00",
    duration: "1h 56m",
  },
  {
    id: "3",
    ticket: "12847295",
    symbol: "XAUUSD",
    type: "buy",
    volume: 0.2,
    openPrice: 2025.50,
    currentPrice: 2028.20,
    sl: 2018.00,
    tp: 2040.00,
    profit: 54,
    profitPips: 27,
    swap: 0,
    commission: -4.2,
    openTime: "2024-01-30 08:30:00",
    duration: "5h 08m",
  },
]

// Trade History
const tradeHistory = [
  {
    id: "1",
    ticket: "12847280",
    symbol: "EURUSD",
    type: "buy",
    volume: 0.5,
    openPrice: 1.0815,
    closePrice: 1.0862,
    sl: 1.0780,
    tp: 1.0880,
    profit: 235,
    profitPips: 47,
    swap: -1.2,
    commission: -3.5,
    openTime: "2024-01-29 14:20:00",
    closeTime: "2024-01-29 18:45:00",
    duration: "4h 25m",
    result: "win",
  },
  {
    id: "2",
    ticket: "12847275",
    symbol: "GBPUSD",
    type: "sell",
    volume: 0.4,
    openPrice: 1.2720,
    closePrice: 1.2745,
    sl: 1.2760,
    tp: 1.2650,
    profit: -100,
    profitPips: -25,
    swap: -0.8,
    commission: -2.8,
    openTime: "2024-01-29 10:15:00",
    closeTime: "2024-01-29 12:30:00",
    duration: "2h 15m",
    result: "loss",
  },
  {
    id: "3",
    ticket: "12847270",
    symbol: "USDJPY",
    type: "buy",
    volume: 0.6,
    openPrice: 147.25,
    closePrice: 147.68,
    sl: 146.90,
    tp: 148.00,
    profit: 258,
    profitPips: 43,
    swap: 1.5,
    commission: -4.2,
    openTime: "2024-01-28 09:00:00",
    closeTime: "2024-01-28 15:20:00",
    duration: "6h 20m",
    result: "win",
  },
  {
    id: "4",
    ticket: "12847265",
    symbol: "XAUUSD",
    type: "sell",
    volume: 0.25,
    openPrice: 2032.80,
    closePrice: 2024.50,
    sl: 2045.00,
    tp: 2015.00,
    profit: 207.5,
    profitPips: 83,
    swap: 0,
    commission: -5.2,
    openTime: "2024-01-27 11:30:00",
    closeTime: "2024-01-28 08:15:00",
    duration: "20h 45m",
    result: "win",
  },
  {
    id: "5",
    ticket: "12847260",
    symbol: "EURJPY",
    type: "buy",
    volume: 0.35,
    openPrice: 159.85,
    closePrice: 159.42,
    sl: 159.20,
    tp: 160.50,
    profit: -150.5,
    profitPips: -43,
    swap: -0.5,
    commission: -2.4,
    openTime: "2024-01-26 13:45:00",
    closeTime: "2024-01-26 16:20:00",
    duration: "2h 35m",
    result: "loss",
  },
  {
    id: "6",
    ticket: "12847255",
    symbol: "AUDUSD",
    type: "buy",
    volume: 0.45,
    openPrice: 0.6585,
    closePrice: 0.6628,
    sl: 0.6550,
    tp: 0.6650,
    profit: 193.5,
    profitPips: 43,
    swap: -0.3,
    commission: -3.1,
    openTime: "2024-01-25 10:00:00",
    closeTime: "2024-01-25 17:45:00",
    duration: "7h 45m",
    result: "win",
  },
  {
    id: "7",
    ticket: "12847250",
    symbol: "NZDUSD",
    type: "sell",
    volume: 0.3,
    openPrice: 0.6142,
    closePrice: 0.6108,
    sl: 0.6180,
    tp: 0.6080,
    profit: 102,
    profitPips: 34,
    swap: -0.2,
    commission: -2.1,
    openTime: "2024-01-24 08:30:00",
    closeTime: "2024-01-24 14:15:00",
    duration: "5h 45m",
    result: "win",
  },
  {
    id: "8",
    ticket: "12847245",
    symbol: "USDCAD",
    type: "buy",
    volume: 0.5,
    openPrice: 1.3485,
    closePrice: 1.3462,
    sl: 1.3440,
    tp: 1.3540,
    profit: -85,
    profitPips: -23,
    swap: 0.8,
    commission: -3.5,
    openTime: "2024-01-23 12:00:00",
    closeTime: "2024-01-23 15:30:00",
    duration: "3h 30m",
    result: "loss",
  },
]

// Daily PnL
const dailyPnL = [
  { date: "23 Ene", pnl: -85, trades: 1 },
  { date: "24 Ene", pnl: 102, trades: 1 },
  { date: "25 Ene", pnl: 193.5, trades: 1 },
  { date: "26 Ene", pnl: -150.5, trades: 1 },
  { date: "27 Ene", pnl: 207.5, trades: 1 },
  { date: "28 Ene", pnl: 258, trades: 1 },
  { date: "29 Ene", pnl: 135, trades: 2 },
  { date: "30 Ene", pnl: 288, trades: 3 },
]

// Symbol Distribution
const symbolDistribution = [
  { name: "EURUSD", value: 35, profit: 2850, trades: 12 },
  { name: "GBPUSD", value: 20, profit: 1200, trades: 8 },
  { name: "USDJPY", value: 18, profit: 980, trades: 6 },
  { name: "XAUUSD", value: 15, profit: 1850, trades: 5 },
  { name: "Otros", value: 12, profit: 1570, trades: 14 },
]

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"]

// Trading Sessions
const sessionStats = [
  { session: "Asia", trades: 8, winRate: 62.5, profit: 450, avgDuration: "3h 12m" },
  { session: "Londres", trades: 22, winRate: 72.7, profit: 4200, avgDuration: "2h 45m" },
  { session: "Nueva York", trades: 15, winRate: 66.7, profit: 3800, avgDuration: "2h 18m" },
]

// Expert Advisors
const expertAdvisors = [
  {
    id: "1",
    name: "TrendMaster Pro",
    version: "2.4.1",
    status: "running",
    strategy: "Trend Following",
    timeframe: "H1",
    symbols: ["EURUSD", "GBPUSD"],
    trades: 28,
    profit: 3450,
    winRate: 71.4,
    maxDD: 2.8,
    runtime: "12d 5h",
    lastTrade: "hace 2h",
  },
  {
    id: "2",
    name: "ScalpBot V3",
    version: "3.1.0",
    status: "paused",
    strategy: "Scalping",
    timeframe: "M15",
    symbols: ["XAUUSD"],
    trades: 156,
    profit: 2100,
    winRate: 65.4,
    maxDD: 1.5,
    runtime: "8d 14h",
    lastTrade: "hace 1d",
  },
  {
    id: "3",
    name: "News Trader",
    version: "1.2.0",
    status: "stopped",
    strategy: "News Trading",
    timeframe: "M5",
    symbols: ["EURUSD", "GBPUSD", "USDJPY"],
    trades: 12,
    profit: -280,
    winRate: 41.7,
    maxDD: 3.2,
    runtime: "3d 8h",
    lastTrade: "hace 5d",
  },
]

// Radar Chart Data
const radarData = [
  { metric: "Win Rate", value: 68, fullMark: 100 },
  { metric: "Profit Factor", value: 80, fullMark: 100 },
  { metric: "Risk/Reward", value: 75, fullMark: 100 },
  { metric: "Consistencia", value: 82, fullMark: 100 },
  { metric: "Disciplina", value: 90, fullMark: 100 },
  { metric: "Drawdown", value: 79, fullMark: 100 },
]

// Rule Compliance
const ruleCompliance = [
  { rule: "Profit Target (10%)", current: 8.45, target: 10, status: "progress", icon: Target },
  { rule: "Max Drawdown (10%)", current: 2.1, target: 10, status: "ok", icon: AlertTriangle },
  { rule: "Daily Drawdown (5%)", current: 0.8, target: 5, status: "ok", icon: Activity },
  { rule: "Min Trading Days (4)", current: 12, target: 4, status: "completed", icon: Calendar },
  { rule: "No Weekend Holding", current: 0, target: 0, status: "ok", icon: Clock },
]

const chartConfig = {
  balance: { label: "Balance", color: "var(--chart-1)" },
  equity: { label: "Equity", color: "var(--chart-3)" },
  pnl: { label: "P&L", color: "var(--chart-1)" },
} satisfies ChartConfig

export default function AccountDetailPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState("overview")
  const [historyFilter, setHistoryFilter] = useState("all")
  const [historyPeriod, setHistoryPeriod] = useState("30d")

  const totalFloatingPL = openPositions.reduce((sum, pos) => sum + pos.profit, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Back Button & Header */}
          <div className="mb-6">
            <Link
              href="/cuentas"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Cuentas
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-xl font-bold text-foreground">
                  {accountData.companyLogo}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">{accountData.name}</h1>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border font-medium",
                        accountData.status === "active"
                          ? "bg-profit/20 text-profit border-profit/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {accountData.status === "active" ? "Activa" : "Inactiva"}
                    </Badge>
                    <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                      {accountData.phase}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{accountData.company}</span>
                    <span className="text-border">|</span>
                    <span className="font-mono">{accountData.accountNumber}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <span className="text-border">|</span>
                    <span>{accountData.platform}</span>
                    <span className="text-border">|</span>
                    <span>Leverage {accountData.leverage}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-border bg-transparent">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar
                </Button>
                <Button variant="outline" size="sm" className="border-border bg-transparent">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir en MT5
                </Button>
                <Button variant="outline" size="icon" className="border-border bg-transparent">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xl font-bold font-mono text-foreground">
                  ${accountData.balance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Inicial: ${accountData.initialBalance.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Equity</p>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xl font-bold font-mono text-foreground">
                  ${accountData.equity.toLocaleString()}
                </p>
                <p className={cn("text-xs", totalFloatingPL >= 0 ? "text-profit" : "text-loss")}>
                  Flotante: {totalFloatingPL >= 0 ? "+" : ""}${totalFloatingPL.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Profit Neto</p>
                  {accountData.profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-profit" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-loss" />
                  )}
                </div>
                <p className={cn("mt-1 text-xl font-bold font-mono", accountData.profit >= 0 ? "text-profit" : "text-loss")}>
                  {accountData.profit >= 0 ? "+" : ""}${accountData.profit.toLocaleString()}
                </p>
                <p className={cn("text-xs", accountData.profit >= 0 ? "text-profit/70" : "text-loss/70")}>
                  {accountData.profit >= 0 ? "+" : ""}{accountData.profitPercent}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xl font-bold font-mono text-foreground">{accountData.winRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {accountData.trades} trades
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Drawdown</p>
                  <AlertTriangle className={cn("h-4 w-4", accountData.drawdown > 5 ? "text-warning" : "text-muted-foreground")} />
                </div>
                <p className="mt-1 text-xl font-bold font-mono text-foreground">{accountData.drawdown}%</p>
                <Progress
                  value={(accountData.drawdown / accountData.maxDrawdown) * 100}
                  className="mt-2 h-1.5 bg-secondary"
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Días Restantes</p>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xl font-bold font-mono text-warning">{accountData.daysRemaining}</p>
                <p className="text-xs text-muted-foreground">
                  de 30 días
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-secondary/50 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-card">
                <BarChart3 className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="positions" className="data-[state=active]:bg-card">
                <CircleDot className="mr-2 h-4 w-4" />
                Posiciones ({openPositions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-card">
                <History className="mr-2 h-4 w-4" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-card">
                <PieChartIcon className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="eas" className="data-[state=active]:bg-card">
                <Bot className="mr-2 h-4 w-4" />
                Expert Advisors
              </TabsTrigger>
              <TabsTrigger value="rules" className="data-[state=active]:bg-card">
                <Shield className="mr-2 h-4 w-4" />
                Reglas
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Equity Curve */}
                <Card className="border-border bg-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-foreground">Curva de Equity</CardTitle>
                    <CardDescription>Evolución del balance y equity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} domain={["dataMin - 1000", "dataMax + 1000"]} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
                                  <p className="font-medium text-foreground">{data.date}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Balance: <span className="font-mono text-chart-1">${data.balance.toLocaleString()}</span>
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Equity: <span className="font-mono text-chart-3">${data.equity.toLocaleString()}</span>
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area type="monotone" dataKey="balance" stroke="var(--chart-1)" strokeWidth={2} fill="url(#balanceGradient)" />
                        <Area type="monotone" dataKey="equity" stroke="var(--chart-3)" strokeWidth={2} fill="url(#equityGradient)" />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Trading Profile Radar */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">Perfil de Trading</CardTitle>
                    <CardDescription>Análisis de rendimiento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Score" dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-foreground">{accountData.profitFactor}</span>
                      <span className="text-xs text-profit">Excelente</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avg Win: ${accountData.avgWin} | Avg Loss: ${accountData.avgLoss}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-profit">${accountData.expectancy}</span>
                      <span className="text-xs text-muted-foreground">por trade</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sharpe: {accountData.sharpeRatio} | Sortino: {accountData.sortinoRatio}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Rachas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-2xl font-bold font-mono text-profit">{accountData.maxConsecutiveWins}</span>
                        <p className="text-xs text-muted-foreground">Wins seguidos</p>
                      </div>
                      <div>
                        <span className="text-2xl font-bold font-mono text-loss">{accountData.maxConsecutiveLosses}</span>
                        <p className="text-xs text-muted-foreground">Losses seguidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Long vs Short</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Long ({accountData.longTrades})</span>
                        <span className="font-mono text-profit">{accountData.longWinRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Short ({accountData.shortTrades})</span>
                        <span className="font-mono text-chart-3">{accountData.shortWinRate}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily P&L Chart */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">P&L Diario</CardTitle>
                  <CardDescription>Rendimiento por día de trading</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <BarChart data={dailyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
                                <p className="font-medium text-foreground">{data.date}</p>
                                <p className={cn("font-mono text-sm", data.pnl >= 0 ? "text-profit" : "text-loss")}>
                                  {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">{data.trades} trades</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {dailyPnL.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "var(--chart-1)" : "var(--destructive)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Open Positions Tab */}
            <TabsContent value="positions" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Posiciones Abiertas</CardTitle>
                      <CardDescription>
                        {openPositions.length} posiciones | P&L Flotante:{" "}
                        <span className={cn("font-mono font-medium", totalFloatingPL >= 0 ? "text-profit" : "text-loss")}>
                          {totalFloatingPL >= 0 ? "+" : ""}${totalFloatingPL.toFixed(2)}
                        </span>
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="border-border bg-transparent">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Actualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Ticket</TableHead>
                          <TableHead className="text-muted-foreground">Símbolo</TableHead>
                          <TableHead className="text-muted-foreground">Tipo</TableHead>
                          <TableHead className="text-muted-foreground">Volumen</TableHead>
                          <TableHead className="text-muted-foreground">Precio Apertura</TableHead>
                          <TableHead className="text-muted-foreground">Precio Actual</TableHead>
                          <TableHead className="text-muted-foreground">SL</TableHead>
                          <TableHead className="text-muted-foreground">TP</TableHead>
                          <TableHead className="text-muted-foreground">Swap</TableHead>
                          <TableHead className="text-muted-foreground">P&L</TableHead>
                          <TableHead className="text-muted-foreground">Duración</TableHead>
                          <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openPositions.map((position) => (
                          <TableRow key={position.id} className="border-border hover:bg-secondary/50">
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              #{position.ticket}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">{position.symbol}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-medium uppercase",
                                  position.type === "buy"
                                    ? "bg-profit/20 text-profit border-profit/30"
                                    : "bg-loss/20 text-loss border-loss/30"
                                )}
                              >
                                {position.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{position.volume}</TableCell>
                            <TableCell className="font-mono">{position.openPrice}</TableCell>
                            <TableCell className="font-mono">{position.currentPrice}</TableCell>
                            <TableCell className="font-mono text-loss">{position.sl}</TableCell>
                            <TableCell className="font-mono text-profit">{position.tp}</TableCell>
                            <TableCell className={cn("font-mono text-sm", position.swap >= 0 ? "text-profit" : "text-loss")}>
                              {position.swap >= 0 ? "+" : ""}{position.swap}
                            </TableCell>
                            <TableCell>
                              <div className={cn("font-mono font-medium", position.profit >= 0 ? "text-profit" : "text-loss")}>
                                {position.profit >= 0 ? "+" : ""}${position.profit.toFixed(2)}
                                <span className="ml-1 text-xs">({position.profitPips} pips)</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{position.duration}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-loss hover:text-loss hover:bg-loss/10">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Position Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Margen Usado</span>
                      <span className="font-mono font-medium text-foreground">${accountData.margin.toLocaleString()}</span>
                    </div>
                    <Progress value={(accountData.margin / accountData.equity) * 100} className="mt-2 h-1.5 bg-secondary" />
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Margen Libre</span>
                      <span className="font-mono font-medium text-foreground">${accountData.freeMargin.toLocaleString()}</span>
                    </div>
                    <Progress value={(accountData.freeMargin / accountData.equity) * 100} className="mt-2 h-1.5 bg-secondary" />
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nivel de Margen</span>
                      <span className="font-mono font-medium text-profit">{accountData.marginLevel.toFixed(2)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Nivel saludable: &gt;500%</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-foreground">Historial de Operaciones</CardTitle>
                      <CardDescription>{tradeHistory.length} operaciones cerradas</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={historyFilter} onValueChange={setHistoryFilter}>
                        <SelectTrigger className="w-[130px] bg-secondary border-border">
                          <SelectValue placeholder="Filtrar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="win">Ganadoras</SelectItem>
                          <SelectItem value="loss">Perdedoras</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={historyPeriod} onValueChange={setHistoryPeriod}>
                        <SelectTrigger className="w-[130px] bg-secondary border-border">
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">7 días</SelectItem>
                          <SelectItem value="30d">30 días</SelectItem>
                          <SelectItem value="90d">90 días</SelectItem>
                          <SelectItem value="all">Todo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Ticket</TableHead>
                          <TableHead className="text-muted-foreground">Símbolo</TableHead>
                          <TableHead className="text-muted-foreground">Tipo</TableHead>
                          <TableHead className="text-muted-foreground">Vol.</TableHead>
                          <TableHead className="text-muted-foreground">Apertura</TableHead>
                          <TableHead className="text-muted-foreground">Cierre</TableHead>
                          <TableHead className="text-muted-foreground">SL</TableHead>
                          <TableHead className="text-muted-foreground">TP</TableHead>
                          <TableHead className="text-muted-foreground">Swap</TableHead>
                          <TableHead className="text-muted-foreground">P&L</TableHead>
                          <TableHead className="text-muted-foreground">Duración</TableHead>
                          <TableHead className="text-muted-foreground">Fecha Cierre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tradeHistory
                          .filter((trade) => historyFilter === "all" || trade.result === historyFilter)
                          .map((trade) => (
                            <TableRow key={trade.id} className="border-border hover:bg-secondary/50">
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                #{trade.ticket}
                              </TableCell>
                              <TableCell className="font-medium text-foreground">{trade.symbol}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "font-medium uppercase",
                                    trade.type === "buy"
                                      ? "bg-profit/20 text-profit border-profit/30"
                                      : "bg-loss/20 text-loss border-loss/30"
                                  )}
                                >
                                  {trade.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono">{trade.volume}</TableCell>
                              <TableCell className="font-mono">{trade.openPrice}</TableCell>
                              <TableCell className="font-mono">{trade.closePrice}</TableCell>
                              <TableCell className="font-mono text-loss">{trade.sl}</TableCell>
                              <TableCell className="font-mono text-profit">{trade.tp}</TableCell>
                              <TableCell className={cn("font-mono text-sm", trade.swap >= 0 ? "text-profit" : "text-loss")}>
                                {trade.swap >= 0 ? "+" : ""}{trade.swap}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {trade.result === "win" ? (
                                    <Check className="h-4 w-4 text-profit" />
                                  ) : (
                                    <X className="h-4 w-4 text-loss" />
                                  )}
                                  <span className={cn("font-mono font-medium", trade.profit >= 0 ? "text-profit" : "text-loss")}>
                                    {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{trade.duration}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(trade.closeTime).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Symbol Distribution */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">Distribución por Símbolo</CardTitle>
                    <CardDescription>Volumen de trading por instrumento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div className="h-[200px] w-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={symbolDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {symbolDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
                                      <p className="font-medium text-foreground">{data.name}</p>
                                      <p className="text-sm text-muted-foreground">{data.value}% del volumen</p>
                                      <p className="text-sm text-muted-foreground">{data.trades} trades</p>
                                      <p className={cn("font-mono text-sm", data.profit >= 0 ? "text-profit" : "text-loss")}>
                                        {data.profit >= 0 ? "+" : ""}${data.profit}
                                      </p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-3">
                        {symbolDistribution.map((symbol, index) => (
                          <div key={symbol.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                              <span className="text-sm text-foreground">{symbol.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-sm text-foreground">{symbol.value}%</span>
                              <span className={cn("ml-2 font-mono text-xs", symbol.profit >= 0 ? "text-profit" : "text-loss")}>
                                {symbol.profit >= 0 ? "+" : ""}${symbol.profit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Performance */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">Rendimiento por Sesión</CardTitle>
                    <CardDescription>Estadísticas de trading por sesión</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sessionStats.map((session) => (
                        <div key={session.session} className="rounded-lg bg-secondary/50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-foreground">{session.session}</span>
                            <span className={cn("font-mono font-medium", session.profit >= 0 ? "text-profit" : "text-loss")}>
                              {session.profit >= 0 ? "+" : ""}${session.profit.toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Trades</p>
                              <p className="font-mono text-foreground">{session.trades}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Win Rate</p>
                              <p className="font-mono text-foreground">{session.winRate}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Duración Avg</p>
                              <p className="font-mono text-foreground">{session.avgDuration}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* More Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-profit/20">
                        <TrendingUp className="h-5 w-5 text-profit" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mejor Trade</p>
                        <p className="font-mono font-bold text-profit">+${accountData.bestTrade}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-loss/20">
                        <TrendingDown className="h-5 w-5 text-loss" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Peor Trade</p>
                        <p className="font-mono font-bold text-loss">-${Math.abs(accountData.worstTrade)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/20">
                        <Timer className="h-5 w-5 text-chart-3" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duración Promedio</p>
                        <p className="font-mono font-bold text-foreground">{accountData.avgTradeDuration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                        <Flame className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trades/Día</p>
                        <p className="font-mono font-bold text-foreground">{accountData.avgTradesPerDay}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Expert Advisors Tab */}
            <TabsContent value="eas" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Expert Advisors</h2>
                  <p className="text-sm text-muted-foreground">Gestiona los EAs conectados a esta cuenta</p>
                </div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Bot className="mr-2 h-4 w-4" />
                  Agregar EA
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {expertAdvisors.map((ea) => (
                  <Card key={ea.id} className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            ea.status === "running" ? "bg-profit/20" : ea.status === "paused" ? "bg-warning/20" : "bg-secondary"
                          )}>
                            <Bot className={cn(
                              "h-5 w-5",
                              ea.status === "running" ? "text-profit" : ea.status === "paused" ? "text-warning" : "text-muted-foreground"
                            )} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-foreground">{ea.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">v{ea.version}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            ea.status === "running"
                              ? "bg-profit/20 text-profit border-profit/30"
                              : ea.status === "paused"
                              ? "bg-warning/20 text-warning border-warning/30"
                              : "bg-secondary text-muted-foreground border-border"
                          )}
                        >
                          {ea.status === "running" ? "Activo" : ea.status === "paused" ? "Pausado" : "Detenido"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Estrategia</p>
                          <p className="text-foreground">{ea.strategy}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Timeframe</p>
                          <p className="text-foreground">{ea.timeframe}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {ea.symbols.map((symbol) => (
                          <Badge key={symbol} variant="outline" className="text-xs border-border text-muted-foreground">
                            {symbol}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-lg bg-secondary/50 p-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Profit</p>
                          <p className={cn("font-mono font-medium", ea.profit >= 0 ? "text-profit" : "text-loss")}>
                            {ea.profit >= 0 ? "+" : ""}${ea.profit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="font-mono font-medium text-foreground">{ea.winRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="font-mono text-foreground">{ea.trades}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Max DD</p>
                          <p className="font-mono text-foreground">{ea.maxDD}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Runtime: {ea.runtime}</span>
                        <span>Último trade: {ea.lastTrade}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ea.status === "running" ? (
                          <Button variant="outline" size="sm" className="flex-1 border-border bg-transparent">
                            <Pause className="mr-2 h-4 w-4" />
                            Pausar
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="flex-1 border-border bg-transparent">
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar
                          </Button>
                        )}
                        <Button variant="outline" size="icon" className="border-border bg-transparent">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Cumplimiento de Reglas</CardTitle>
                  <CardDescription>Estado actual de las reglas del challenge</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ruleCompliance.map((rule) => {
                      const Icon = rule.icon
                      const percentage = rule.target > 0 ? (rule.current / rule.target) * 100 : 100
                      const isCompleted = rule.status === "completed" || rule.status === "ok"
                      const isProgress = rule.status === "progress"

                      return (
                        <div key={rule.rule} className="rounded-lg border border-border bg-secondary/30 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-lg",
                                isCompleted ? "bg-profit/20" : isProgress ? "bg-warning/20" : "bg-chart-3/20"
                              )}>
                                <Icon className={cn(
                                  "h-5 w-5",
                                  isCompleted ? "text-profit" : isProgress ? "text-warning" : "text-chart-3"
                                )} />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{rule.rule}</p>
                                <p className="text-sm text-muted-foreground">
                                  Actual: <span className="font-mono">{rule.current}</span>
                                  {rule.target > 0 && (
                                    <span className="text-muted-foreground"> / Límite: <span className="font-mono">{rule.target}</span></span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium",
                                isCompleted
                                  ? "bg-profit/20 text-profit border-profit/30"
                                  : isProgress
                                  ? "bg-warning/20 text-warning border-warning/30"
                                  : "bg-chart-3/20 text-chart-3 border-chart-3/30"
                              )}
                            >
                              {isCompleted ? "Cumplido" : isProgress ? "En progreso" : "Activo"}
                            </Badge>
                          </div>
                          {rule.target > 0 && (
                            <div className="mt-3">
                              <Progress
                                value={Math.min(percentage, 100)}
                                className={cn(
                                  "h-2",
                                  isCompleted ? "[&>div]:bg-profit" : isProgress ? "[&>div]:bg-warning" : "[&>div]:bg-chart-3"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Información de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Número de Cuenta</p>
                      <p className="font-mono text-foreground">{accountData.accountNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Servidor</p>
                      <p className="font-mono text-foreground">{accountData.server}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Plataforma</p>
                      <p className="text-foreground">{accountData.platform}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Apalancamiento</p>
                      <p className="text-foreground">{accountData.leverage}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fecha de Inicio</p>
                      <p className="text-foreground">{new Date(accountData.startDate).toLocaleDateString("es-ES")}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fecha de Fin</p>
                      <p className="text-foreground">{new Date(accountData.endDate).toLocaleDateString("es-ES")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
