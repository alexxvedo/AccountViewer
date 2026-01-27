"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Eye,
  UserPlus,
  Mail,
  BarChart3,
} from "lucide-react"

interface Trader {
  id: string
  name: string
  initials: string
  email: string
  role: "Admin" | "Manager" | "Trader"
  status: "active" | "inactive"
  accounts: number
  totalBalance: number
  totalProfit: number
  winRate: number
  joinDate: string
  lastActive: string
  performance: "excellent" | "good" | "average" | "poor"
}

const traders: Trader[] = [
  {
    id: "1",
    name: "John Doe",
    initials: "JD",
    email: "john@example.com",
    role: "Admin",
    status: "active",
    accounts: 5,
    totalBalance: 478130,
    totalProfit: 28130,
    winRate: 72,
    joinDate: "2023-06-15",
    lastActive: "Hace 2 horas",
    performance: "excellent",
  },
  {
    id: "2",
    name: "Sarah Miller",
    initials: "SM",
    email: "sarah@example.com",
    role: "Trader",
    status: "active",
    accounts: 3,
    totalBalance: 185000,
    totalProfit: 12500,
    winRate: 68,
    joinDate: "2023-09-20",
    lastActive: "Hace 30 min",
    performance: "good",
  },
  {
    id: "3",
    name: "Mike Chen",
    initials: "MC",
    email: "mike@example.com",
    role: "Trader",
    status: "active",
    accounts: 2,
    totalBalance: 95000,
    totalProfit: 5200,
    winRate: 61,
    joinDate: "2023-11-05",
    lastActive: "Hace 5 horas",
    performance: "average",
  },
  {
    id: "4",
    name: "Emma Wilson",
    initials: "EW",
    email: "emma@example.com",
    role: "Manager",
    status: "active",
    accounts: 4,
    totalBalance: 320000,
    totalProfit: 18900,
    winRate: 70,
    joinDate: "2023-07-10",
    lastActive: "Hace 1 hora",
    performance: "excellent",
  },
  {
    id: "5",
    name: "David Kim",
    initials: "DK",
    email: "david@example.com",
    role: "Trader",
    status: "inactive",
    accounts: 1,
    totalBalance: 0,
    totalProfit: -2500,
    winRate: 45,
    joinDate: "2023-12-01",
    lastActive: "Hace 2 semanas",
    performance: "poor",
  },
  {
    id: "6",
    name: "Lisa Park",
    initials: "LP",
    email: "lisa@example.com",
    role: "Trader",
    status: "active",
    accounts: 2,
    totalBalance: 142000,
    totalProfit: 8400,
    winRate: 65,
    joinDate: "2023-10-15",
    lastActive: "Hace 3 horas",
    performance: "good",
  },
]

const roleColors = {
  Admin: "bg-chart-5/20 text-chart-5 border-chart-5/30",
  Manager: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  Trader: "bg-accent/20 text-accent border-accent/30",
}

const performanceColors = {
  excellent: "text-profit",
  good: "text-accent",
  average: "text-warning",
  poor: "text-loss",
}

export default function TradersPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTraders = traders.filter(
    (trader) =>
      trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trader.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalTraders = traders.length
  const activeTraders = traders.filter((t) => t.status === "active").length
  const totalBalance = traders.reduce((sum, t) => sum + t.totalBalance, 0)
  const totalProfit = traders.reduce((sum, t) => sum + t.totalProfit, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Traders</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona los traders de tu equipo
              </p>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Invitar Trader
            </Button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-chart-3/20 p-2">
                    <Users className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Traders</p>
                    <p className="text-xl font-bold font-mono text-foreground">{totalTraders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-profit/20 p-2">
                    <TrendingUp className="h-5 w-5 text-profit" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activos</p>
                    <p className="text-xl font-bold font-mono text-foreground">{activeTraders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/20 p-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance Total</p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      ${(totalBalance / 1000000).toFixed(2)}M
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-warning/20 p-2">
                    <Target className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Total</p>
                    <p className={`text-xl font-bold font-mono ${totalProfit >= 0 ? "text-profit" : "text-loss"}`}>
                      {totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6 border-border bg-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary border-border"
                />
              </div>
            </CardContent>
          </Card>

          {/* Traders Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTraders.map((trader) => (
              <Card key={trader.id} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-accent/20 text-accent text-sm font-semibold">
                          {trader.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-medium">{trader.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{trader.email}</p>
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
                          <Eye className="mr-2 h-4 w-4" /> Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart3 className="mr-2 h-4 w-4" /> Ver Estadísticas
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" /> Enviar Mensaje
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className={roleColors[trader.role]}>
                      {trader.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        trader.status === "active"
                          ? "bg-profit/20 text-profit border-profit/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {trader.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        ${trader.totalBalance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <div className="flex items-center gap-1">
                        {trader.totalProfit >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        )}
                        <p className={`text-lg font-bold font-mono ${trader.totalProfit >= 0 ? "text-profit" : "text-loss"}`}>
                          {trader.totalProfit >= 0 ? "+" : ""}${Math.abs(trader.totalProfit).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className={performanceColors[trader.performance]}>{trader.winRate}%</span>
                    </div>
                    <Progress value={trader.winRate} className="h-1.5 bg-secondary" />
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Cuentas</p>
                      <p className="text-sm font-semibold font-mono text-foreground">{trader.accounts}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Última Actividad</p>
                      <p className="text-sm font-medium text-foreground">{trader.lastActive}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
