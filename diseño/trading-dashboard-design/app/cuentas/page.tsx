"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  ArrowUpDown,
} from "lucide-react"

interface Account {
  id: string
  name: string
  company: string
  companyLogo: string
  type: "Challenge" | "Funded" | "Evaluation"
  phase: string
  status: "active" | "inactive" | "breached" | "passed"
  balance: number
  initialBalance: number
  profit: number
  profitPercent: number
  drawdown: number
  maxDrawdown: number
  dailyDrawdown: number
  maxDailyDrawdown: number
  trades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  startDate: string
  endDate?: string
  daysRemaining?: number
}

const accounts: Account[] = [
  {
    id: "1",
    name: "FTMO Challenge 100K #1",
    company: "FTMO",
    companyLogo: "F",
    type: "Challenge",
    phase: "Phase 1",
    status: "active",
    balance: 108450,
    initialBalance: 100000,
    profit: 8450,
    profitPercent: 8.45,
    drawdown: 2.1,
    maxDrawdown: 10,
    dailyDrawdown: 0.8,
    maxDailyDrawdown: 5,
    trades: 45,
    winRate: 68,
    avgWin: 285,
    avgLoss: 142,
    profitFactor: 2.01,
    startDate: "2024-01-15",
    daysRemaining: 18,
  },
  {
    id: "2",
    name: "FTMO Funded 200K",
    company: "FTMO",
    companyLogo: "F",
    type: "Funded",
    phase: "Funded",
    status: "active",
    balance: 215680,
    initialBalance: 200000,
    profit: 15680,
    profitPercent: 7.84,
    drawdown: 1.5,
    maxDrawdown: 5,
    dailyDrawdown: 0.3,
    maxDailyDrawdown: 5,
    trades: 89,
    winRate: 72,
    avgWin: 312,
    avgLoss: 156,
    profitFactor: 2.34,
    startDate: "2023-11-01",
  },
  {
    id: "3",
    name: "The5ers 100K Growth",
    company: "The5ers",
    companyLogo: "5",
    type: "Funded",
    phase: "Funded",
    status: "active",
    balance: 112340,
    initialBalance: 100000,
    profit: 12340,
    profitPercent: 12.34,
    drawdown: 3.2,
    maxDrawdown: 6,
    dailyDrawdown: 1.1,
    maxDailyDrawdown: 4,
    trades: 67,
    winRate: 65,
    avgWin: 298,
    avgLoss: 189,
    profitFactor: 1.82,
    startDate: "2023-10-15",
  },
  {
    id: "4",
    name: "MFF Challenge 50K",
    company: "MyForexFunds",
    companyLogo: "M",
    type: "Challenge",
    phase: "Phase 2",
    status: "active",
    balance: 53200,
    initialBalance: 50000,
    profit: 3200,
    profitPercent: 6.4,
    drawdown: 4.1,
    maxDrawdown: 8,
    dailyDrawdown: 2.1,
    maxDailyDrawdown: 5,
    trades: 32,
    winRate: 58,
    avgWin: 245,
    avgLoss: 167,
    profitFactor: 1.47,
    startDate: "2024-01-20",
    daysRemaining: 25,
  },
  {
    id: "5",
    name: "E8 Funding 100K",
    company: "E8 Funding",
    companyLogo: "E8",
    type: "Evaluation",
    phase: "Evaluation",
    status: "breached",
    balance: 94500,
    initialBalance: 100000,
    profit: -5500,
    profitPercent: -5.5,
    drawdown: 8.2,
    maxDrawdown: 8,
    dailyDrawdown: 5.5,
    maxDailyDrawdown: 5,
    trades: 28,
    winRate: 42,
    avgWin: 198,
    avgLoss: 245,
    profitFactor: 0.81,
    startDate: "2024-01-05",
    endDate: "2024-01-22",
  },
  {
    id: "6",
    name: "FTMO Challenge 50K #2",
    company: "FTMO",
    companyLogo: "F",
    type: "Challenge",
    phase: "Phase 1",
    status: "passed",
    balance: 54250,
    initialBalance: 50000,
    profit: 4250,
    profitPercent: 8.5,
    drawdown: 3.8,
    maxDrawdown: 10,
    dailyDrawdown: 1.9,
    maxDailyDrawdown: 5,
    trades: 52,
    winRate: 71,
    avgWin: 156,
    avgLoss: 89,
    profitFactor: 2.45,
    startDate: "2023-12-10",
    endDate: "2024-01-08",
  },
]

const statusConfig = {
  active: { label: "Activa", variant: "default" as const, className: "bg-profit/20 text-profit border-profit/30" },
  inactive: { label: "Inactiva", variant: "secondary" as const, className: "bg-muted text-muted-foreground" },
  breached: { label: "Violada", variant: "destructive" as const, className: "bg-loss/20 text-loss border-loss/30" },
  passed: { label: "Pasada", variant: "default" as const, className: "bg-accent/20 text-accent border-accent/30" },
}

const typeConfig = {
  Challenge: "bg-warning/20 text-warning border-warning/30",
  Funded: "bg-profit/20 text-profit border-profit/30",
  Evaluation: "bg-chart-3/20 text-chart-3 border-chart-3/30",
}

export default function CuentasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCompany, setFilterCompany] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCompany = filterCompany === "all" || account.company === filterCompany
    const matchesStatus = filterStatus === "all" || account.status === filterStatus
    const matchesType = filterType === "all" || account.type === filterType
    return matchesSearch && matchesCompany && matchesStatus && matchesType
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalProfit = accounts.reduce((sum, acc) => sum + acc.profit, 0)
  const activeAccounts = accounts.filter((acc) => acc.status === "active").length
  const avgWinRate = accounts.reduce((sum, acc) => sum + acc.winRate, 0) / accounts.length

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cuentas de Trading</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona y monitorea todas tus cuentas de prop firms
              </p>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cuenta
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Balance Total</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  ${totalBalance.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Profit Total</p>
                <p className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? "text-profit" : "text-loss"}`}>
                  {totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Cuentas Activas</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {activeAccounts} / {accounts.length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Win Rate Promedio</p>
                <p className="text-2xl font-bold font-mono text-foreground">{avgWinRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cuenta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-[160px] bg-secondary border-border">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="FTMO">FTMO</SelectItem>
                    <SelectItem value="The5ers">The5ers</SelectItem>
                    <SelectItem value="MyForexFunds">MyForexFunds</SelectItem>
                    <SelectItem value="E8 Funding">E8 Funding</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                    <SelectItem value="breached">Violada</SelectItem>
                    <SelectItem value="passed">Pasada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Challenge">Challenge</SelectItem>
                    <SelectItem value="Funded">Funded</SelectItem>
                    <SelectItem value="Evaluation">Evaluation</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="border-border bg-transparent">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="border-border bg-transparent">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAccounts.map((account) => (
              <Card key={account.id} className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
                        {account.companyLogo}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-foreground leading-tight">
                          {account.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{account.company}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" /> Abrir en Broker
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-loss">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className={typeConfig[account.type]}>
                      {account.type}
                    </Badge>
                    <Badge variant="outline" className={statusConfig[account.status].className}>
                      {statusConfig[account.status].label}
                    </Badge>
                    {account.phase && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {account.phase}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Balance & Profit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        ${account.balance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit/Loss</p>
                      <div className="flex items-center gap-1">
                        {account.profit >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        )}
                        <p className={`text-lg font-bold font-mono ${account.profit >= 0 ? "text-profit" : "text-loss"}`}>
                          {account.profit >= 0 ? "+" : ""}${Math.abs(account.profit).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Drawdown Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Drawdown</span>
                      <span className={account.drawdown > account.maxDrawdown * 0.7 ? "text-loss" : "text-foreground"}>
                        {account.drawdown}% / {account.maxDrawdown}%
                      </span>
                    </div>
                    <Progress
                      value={(account.drawdown / account.maxDrawdown) * 100}
                      className="h-1.5 bg-secondary"
                    />
                  </div>

                  {/* Daily Drawdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Daily Drawdown</span>
                      <span className={account.dailyDrawdown > account.maxDailyDrawdown * 0.7 ? "text-loss" : "text-foreground"}>
                        {account.dailyDrawdown}% / {account.maxDailyDrawdown}%
                      </span>
                    </div>
                    <Progress
                      value={(account.dailyDrawdown / account.maxDailyDrawdown) * 100}
                      className="h-1.5 bg-secondary"
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/50 p-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className="text-sm font-semibold font-mono text-foreground">{account.winRate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Trades</p>
                      <p className="text-sm font-semibold font-mono text-foreground">{account.trades}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">P. Factor</p>
                      <p className="text-sm font-semibold font-mono text-foreground">{account.profitFactor}</p>
                    </div>
                  </div>

                  {/* Days Remaining */}
                  {account.daysRemaining && (
                    <div className="flex items-center justify-between rounded-lg bg-warning/10 px-3 py-2">
                      <span className="text-xs text-warning">Días restantes</span>
                      <span className="text-sm font-bold text-warning">{account.daysRemaining} días</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
