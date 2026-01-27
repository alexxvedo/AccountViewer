"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { MoreHorizontal, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Account {
  id: string
  name: string
  company: string
  companyLogo: string
  balance: number
  profit: number
  profitPercent: number
  status: "active" | "funded" | "challenge" | "inactive"
  phase: string
  winRate: number
  trades: number
}

const accounts: Account[] = [
  {
    id: "1",
    name: "Challenge 100K #1",
    company: "FTMO",
    companyLogo: "F",
    balance: 112450,
    profit: 12450,
    profitPercent: 12.45,
    status: "funded",
    phase: "Funded",
    winRate: 72.5,
    trades: 156,
  },
  {
    id: "2",
    name: "Swing Account",
    company: "MyForexFunds",
    companyLogo: "M",
    balance: 248920,
    profit: 48920,
    profitPercent: 24.46,
    status: "funded",
    phase: "Funded",
    winRate: 68.3,
    trades: 89,
  },
  {
    id: "3",
    name: "Scalping 50K",
    company: "The5ers",
    companyLogo: "5",
    balance: 54230,
    profit: 4230,
    profitPercent: 8.46,
    status: "active",
    phase: "Phase 2",
    winRate: 65.2,
    trades: 234,
  },
  {
    id: "4",
    name: "Challenge 200K",
    company: "FTMO",
    companyLogo: "F",
    balance: 186400,
    profit: -13600,
    profitPercent: -6.8,
    status: "challenge",
    phase: "Phase 1",
    winRate: 58.4,
    trades: 67,
  },
  {
    id: "5",
    name: "EA Account",
    company: "Funded Next",
    companyLogo: "N",
    balance: 78520,
    profit: 28520,
    profitPercent: 57.04,
    status: "funded",
    phase: "Funded",
    winRate: 71.8,
    trades: 445,
  },
  {
    id: "6",
    name: "News Trading",
    company: "True Forex Funds",
    companyLogo: "T",
    balance: 45000,
    profit: -5000,
    profitPercent: -10.0,
    status: "inactive",
    phase: "Failed",
    winRate: 42.1,
    trades: 38,
  },
]

const statusConfig = {
  active: { label: "Activa", className: "bg-chart-3/20 text-chart-3 border-chart-3/30" },
  funded: { label: "Funded", className: "bg-profit/20 text-profit border-profit/30" },
  challenge: { label: "Challenge", className: "bg-warning/20 text-warning border-warning/30" },
  inactive: { label: "Inactiva", className: "bg-muted text-muted-foreground border-border" },
}

export function AccountsTable() {
  return (
    <Card className="border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Todas las Cuentas</h3>
          <p className="text-sm text-muted-foreground">Gestiona y monitorea todas tus cuentas de trading</p>
        </div>
        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          + Nueva Cuenta
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Cuenta</TableHead>
              <TableHead className="text-muted-foreground">Balance</TableHead>
              <TableHead className="text-muted-foreground">Profit/Loss</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground">Win Rate</TableHead>
              <TableHead className="text-muted-foreground">Trades</TableHead>
              <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id} className="border-border hover:bg-secondary/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
                      {account.companyLogo}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.company}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-medium text-foreground">
                    ${account.balance.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {account.profit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-profit" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-loss" />
                    )}
                    <div>
                      <p className={cn(
                        "font-mono font-medium",
                        account.profit >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {account.profit >= 0 ? "+" : ""}${account.profit.toLocaleString()}
                      </p>
                      <p className={cn(
                        "text-xs font-mono",
                        account.profit >= 0 ? "text-profit/70" : "text-loss/70"
                      )}>
                        {account.profit >= 0 ? "+" : ""}{account.profitPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border font-medium", statusConfig[account.status].className)}>
                    {statusConfig[account.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          account.winRate >= 60 ? "bg-profit" : account.winRate >= 50 ? "bg-warning" : "bg-loss"
                        )}
                        style={{ width: `${account.winRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{account.winRate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-muted-foreground">{account.trades}</span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-loss">Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
