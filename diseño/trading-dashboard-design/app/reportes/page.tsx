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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Plus,
  Download,
  FileText,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  Filter,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface Report {
  id: string
  name: string
  type: "performance" | "pnl" | "trades" | "tax" | "custom"
  account: string
  period: string
  status: "completed" | "processing" | "failed"
  format: "pdf" | "xlsx" | "csv"
  createdAt: string
  size: string
}

const reports: Report[] = [
  {
    id: "1",
    name: "Reporte Performance Q4 2024",
    type: "performance",
    account: "Todas las cuentas",
    period: "Oct - Dic 2024",
    status: "completed",
    format: "pdf",
    createdAt: "2024-01-27 10:30",
    size: "2.4 MB",
  },
  {
    id: "2",
    name: "P&L Mensual - Enero 2024",
    type: "pnl",
    account: "FTMO 100K",
    period: "Enero 2024",
    status: "completed",
    format: "xlsx",
    createdAt: "2024-01-26 15:45",
    size: "1.8 MB",
  },
  {
    id: "3",
    name: "Historial de Trades",
    type: "trades",
    account: "The5ers 100K",
    period: "2024",
    status: "processing",
    format: "csv",
    createdAt: "2024-01-27 11:00",
    size: "-",
  },
  {
    id: "4",
    name: "Reporte Fiscal 2023",
    type: "tax",
    account: "Todas las cuentas",
    period: "2023",
    status: "completed",
    format: "pdf",
    createdAt: "2024-01-15 09:00",
    size: "5.2 MB",
  },
  {
    id: "5",
    name: "Análisis por Sesión",
    type: "custom",
    account: "FTMO 200K",
    period: "Dic 2024",
    status: "completed",
    format: "pdf",
    createdAt: "2024-01-20 14:20",
    size: "3.1 MB",
  },
  {
    id: "6",
    name: "Drawdown Analysis",
    type: "performance",
    account: "MFF 50K",
    period: "Q4 2024",
    status: "failed",
    format: "pdf",
    createdAt: "2024-01-25 16:30",
    size: "-",
  },
]

const typeConfig = {
  performance: { label: "Performance", icon: BarChart3, color: "bg-accent/20 text-accent border-accent/30" },
  pnl: { label: "P&L", icon: FileSpreadsheet, color: "bg-profit/20 text-profit border-profit/30" },
  trades: { label: "Trades", icon: FileText, color: "bg-chart-3/20 text-chart-3 border-chart-3/30" },
  tax: { label: "Fiscal", icon: FileText, color: "bg-warning/20 text-warning border-warning/30" },
  custom: { label: "Custom", icon: FileText, color: "bg-chart-5/20 text-chart-5 border-chart-5/30" },
}

const statusConfig = {
  completed: { label: "Completado", icon: CheckCircle2, color: "text-profit" },
  processing: { label: "Procesando", icon: Loader2, color: "text-warning" },
  failed: { label: "Error", icon: AlertCircle, color: "text-loss" },
}

const formatConfig = {
  pdf: { label: "PDF", color: "bg-loss/20 text-loss" },
  xlsx: { label: "Excel", color: "bg-profit/20 text-profit" },
  csv: { label: "CSV", color: "bg-chart-3/20 text-chart-3" },
}

const reportTemplates = [
  { name: "Performance Mensual", description: "Resumen completo de rendimiento del mes", type: "performance" },
  { name: "P&L Detallado", description: "Ganancias y pérdidas desglosadas", type: "pnl" },
  { name: "Historial de Trades", description: "Lista completa de operaciones", type: "trades" },
  { name: "Reporte Fiscal", description: "Resumen para declaración de impuestos", type: "tax" },
]

export default function ReportesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || report.type === filterType
    const matchesStatus = filterStatus === "all" || report.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
              <p className="text-sm text-muted-foreground">
                Genera y descarga reportes de tus cuentas de trading
              </p>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Reporte
            </Button>
          </div>

          {/* Quick Templates */}
          <Card className="mb-6 border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Plantillas Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                {reportTemplates.map((template) => {
                  const config = typeConfig[template.type as keyof typeof typeConfig]
                  return (
                    <button
                      key={template.name}
                      className="flex items-start gap-3 rounded-lg bg-secondary/50 p-4 text-left transition-colors hover:bg-secondary"
                    >
                      <div className={`rounded-lg p-2 ${config.color}`}>
                        <config.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="mb-6 border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar reporte..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="pnl">P&L</SelectItem>
                    <SelectItem value="trades">Trades</SelectItem>
                    <SelectItem value="tax">Fiscal</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="processing">Procesando</SelectItem>
                    <SelectItem value="failed">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-border bg-transparent">
                  <Calendar className="mr-2 h-4 w-4" />
                  Fecha
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">Cuenta</TableHead>
                    <TableHead className="text-muted-foreground">Período</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground">Formato</TableHead>
                    <TableHead className="text-muted-foreground">Fecha</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const typeConf = typeConfig[report.type]
                    const statusConf = statusConfig[report.status]
                    const formatConf = formatConfig[report.format]
                    return (
                      <TableRow key={report.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${typeConf.color}`}>
                              <typeConf.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{report.name}</p>
                              {report.size !== "-" && (
                                <p className="text-xs text-muted-foreground">{report.size}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeConf.color}>
                            {typeConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{report.account}</TableCell>
                        <TableCell className="text-muted-foreground">{report.period}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <statusConf.icon
                              className={`h-4 w-4 ${statusConf.color} ${report.status === "processing" ? "animate-spin" : ""}`}
                            />
                            <span className={statusConf.color}>{statusConf.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={formatConf.color}>
                            {formatConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {report.createdAt}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={report.status !== "completed"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={report.status !== "completed"}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-loss hover:text-loss">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
