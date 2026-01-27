"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  ExternalLink,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface Company {
  id: string
  name: string
  logo: string
  description: string
  website: string
  rating: number
  totalAccounts: number
  activeAccounts: number
  totalBalance: number
  totalProfit: number
  profitPercent: number
  successRate: number
  avgPayoutTime: string
  features: string[]
  challenges: ChallengeType[]
  pros: string[]
  cons: string[]
}

interface ChallengeType {
  name: string
  price: number
  accountSize: number
  profitTarget: number
  maxDrawdown: number
  dailyDrawdown: number
  minDays: number
  profitSplit: number
}

const companies: Company[] = [
  {
    id: "1",
    name: "FTMO",
    logo: "F",
    description: "La prop firm más popular del mercado con excelente reputación y condiciones competitivas.",
    website: "https://ftmo.com",
    rating: 4.8,
    totalAccounts: 5,
    activeAccounts: 4,
    totalBalance: 478130,
    totalProfit: 28130,
    profitPercent: 6.25,
    successRate: 78,
    avgPayoutTime: "1-2 días",
    features: ["Scaling Plan", "Free Retake", "Account Merge", "Swing Trading"],
    challenges: [
      { name: "Challenge 10K", price: 155, accountSize: 10000, profitTarget: 10, maxDrawdown: 10, dailyDrawdown: 5, minDays: 4, profitSplit: 80 },
      { name: "Challenge 25K", price: 250, accountSize: 25000, profitTarget: 10, maxDrawdown: 10, dailyDrawdown: 5, minDays: 4, profitSplit: 80 },
      { name: "Challenge 50K", price: 345, accountSize: 50000, profitTarget: 10, maxDrawdown: 10, dailyDrawdown: 5, minDays: 4, profitSplit: 80 },
      { name: "Challenge 100K", price: 540, accountSize: 100000, profitTarget: 10, maxDrawdown: 10, dailyDrawdown: 5, minDays: 4, profitSplit: 80 },
      { name: "Challenge 200K", price: 1080, accountSize: 200000, profitTarget: 10, maxDrawdown: 10, dailyDrawdown: 5, minDays: 4, profitSplit: 80 },
    ],
    pros: ["Reputación excelente", "Pagos rápidos", "Buen soporte", "Free retake si pasas Phase 1"],
    cons: ["Precios más altos", "Límite de tiempo en challenges"],
  },
  {
    id: "2",
    name: "The5ers",
    logo: "5",
    description: "Prop firm con enfoque en traders de largo plazo y programa de crecimiento único.",
    website: "https://the5ers.com",
    rating: 4.6,
    totalAccounts: 3,
    activeAccounts: 2,
    totalBalance: 212340,
    totalProfit: 12340,
    profitPercent: 6.18,
    successRate: 72,
    avgPayoutTime: "3-5 días",
    features: ["Growth Program", "No Time Limit", "Low Targets", "Weekend Holding"],
    challenges: [
      { name: "Bootcamp 25K", price: 95, accountSize: 25000, profitTarget: 6, maxDrawdown: 6, dailyDrawdown: 3, minDays: 0, profitSplit: 50 },
      { name: "Bootcamp 50K", price: 225, accountSize: 50000, profitTarget: 6, maxDrawdown: 6, dailyDrawdown: 3, minDays: 0, profitSplit: 50 },
      { name: "Bootcamp 100K", price: 450, accountSize: 100000, profitTarget: 6, maxDrawdown: 6, dailyDrawdown: 3, minDays: 0, profitSplit: 50 },
      { name: "High Stakes 100K", price: 560, accountSize: 100000, profitTarget: 8, maxDrawdown: 5, dailyDrawdown: 3, minDays: 0, profitSplit: 75 },
    ],
    pros: ["Sin límite de tiempo", "Targets bajos", "Programa de crecimiento"],
    cons: ["Profit split inicial bajo", "Reglas más estrictas"],
  },
  {
    id: "3",
    name: "MyForexFunds",
    logo: "M",
    description: "Prop firm con precios competitivos y múltiples tipos de programas.",
    website: "https://myforexfunds.com",
    rating: 4.3,
    totalAccounts: 2,
    activeAccounts: 1,
    totalBalance: 53200,
    totalProfit: 3200,
    profitPercent: 6.4,
    successRate: 65,
    avgPayoutTime: "5-7 días",
    features: ["Multiple Programs", "Low Cost", "Scaling", "News Trading"],
    challenges: [
      { name: "Rapid 10K", price: 84, accountSize: 10000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 5, minDays: 0, profitSplit: 75 },
      { name: "Rapid 25K", price: 129, accountSize: 25000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 5, minDays: 0, profitSplit: 75 },
      { name: "Rapid 50K", price: 219, accountSize: 50000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 5, minDays: 0, profitSplit: 75 },
      { name: "Rapid 100K", price: 349, accountSize: 100000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 5, minDays: 0, profitSplit: 75 },
    ],
    pros: ["Precios muy bajos", "Sin límite de tiempo", "Múltiples programas"],
    cons: ["Soporte mejorable", "Pagos más lentos"],
  },
  {
    id: "4",
    name: "E8 Funding",
    logo: "E8",
    description: "Prop firm con condiciones flexibles y buen programa de scaling.",
    website: "https://e8funding.com",
    rating: 4.4,
    totalAccounts: 2,
    activeAccounts: 0,
    totalBalance: 0,
    totalProfit: -5500,
    profitPercent: -5.5,
    successRate: 45,
    avgPayoutTime: "3-5 días",
    features: ["E8 Track", "ELEV8", "Scaling Plan", "Dashboard"],
    challenges: [
      { name: "E8 Track 25K", price: 138, accountSize: 25000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 4, minDays: 0, profitSplit: 80 },
      { name: "E8 Track 50K", price: 238, accountSize: 50000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 4, minDays: 0, profitSplit: 80 },
      { name: "E8 Track 100K", price: 418, accountSize: 100000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 4, minDays: 0, profitSplit: 80 },
      { name: "ELEV8 100K", price: 588, accountSize: 100000, profitTarget: 8, maxDrawdown: 8, dailyDrawdown: 4, minDays: 0, profitSplit: 80 },
    ],
    pros: ["Buenos precios", "Dashboard intuitivo", "Scaling agresivo"],
    cons: ["Empresa más nueva", "Menos track record"],
  },
]

export default function EmpresasPage() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  const totalBalance = companies.reduce((sum, c) => sum + c.totalBalance, 0)
  const totalProfit = companies.reduce((sum, c) => sum + c.totalProfit, 0)
  const totalAccounts = companies.reduce((sum, c) => sum + c.totalAccounts, 0)
  const activeAccounts = companies.reduce((sum, c) => sum + c.activeAccounts, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Empresas (Prop Firms)</h1>
              <p className="text-sm text-muted-foreground">
                Compara y gestiona tus prop firms favoritas
              </p>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Empresa
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/20 p-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance Total</p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      ${totalBalance.toLocaleString()}
                    </p>
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
                    <p className="text-sm text-muted-foreground">Profit Total</p>
                    <p className={`text-xl font-bold font-mono ${totalProfit >= 0 ? "text-profit" : "text-loss"}`}>
                      {totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-chart-3/20 p-2">
                    <Users className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empresas</p>
                    <p className="text-xl font-bold font-mono text-foreground">{companies.length}</p>
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
                    <p className="text-sm text-muted-foreground">Cuentas Activas</p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      {activeAccounts} / {totalAccounts}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Companies Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="border-border bg-card overflow-hidden cursor-pointer transition-all hover:border-accent/50"
                onClick={() => setSelectedCompany(selectedCompany?.id === company.id ? null : company)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-foreground">
                        {company.logo}
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {company.name}
                          <div className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-xs font-medium text-warning">{company.rating}</span>
                          </div>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-1">{company.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={company.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Cuentas</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        {company.activeAccounts}/{company.totalAccounts}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        ${(company.totalBalance / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <p className={`text-lg font-bold font-mono ${company.totalProfit >= 0 ? "text-profit" : "text-loss"}`}>
                        {company.totalProfit >= 0 ? "+" : ""}{company.profitPercent}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Success</p>
                      <p className="text-lg font-bold font-mono text-foreground">{company.successRate}%</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {company.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="border-border text-muted-foreground">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  {/* Expanded Details */}
                  {selectedCompany?.id === company.id && (
                    <div className="space-y-4 pt-4 border-t border-border animate-in slide-in-from-top-2">
                      <Tabs defaultValue="challenges" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-secondary">
                          <TabsTrigger value="challenges">Challenges</TabsTrigger>
                          <TabsTrigger value="pros">Pros</TabsTrigger>
                          <TabsTrigger value="cons">Contras</TabsTrigger>
                        </TabsList>
                        <TabsContent value="challenges" className="mt-4">
                          <div className="space-y-2">
                            {company.challenges.map((challenge) => (
                              <div
                                key={challenge.name}
                                className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">{challenge.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Target: {challenge.profitTarget}% | DD: {challenge.maxDrawdown}% | Split: {challenge.profitSplit}%
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-foreground">${challenge.price}</p>
                                  <p className="text-xs text-muted-foreground">${challenge.accountSize.toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="pros" className="mt-4">
                          <div className="space-y-2">
                            {company.pros.map((pro) => (
                              <div key={pro} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-profit" />
                                <span className="text-foreground">{pro}</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="cons" className="mt-4">
                          <div className="space-y-2">
                            {company.cons.map((con) => (
                              <div key={con} className="flex items-center gap-2 text-sm">
                                <XCircle className="h-4 w-4 text-loss" />
                                <span className="text-foreground">{con}</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>

                      {/* Payout Info */}
                      <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-3">
                        <Clock className="h-4 w-4 text-accent" />
                        <span className="text-sm text-muted-foreground">Tiempo promedio de payout:</span>
                        <span className="text-sm font-medium text-foreground">{company.avgPayoutTime}</span>
                      </div>
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
