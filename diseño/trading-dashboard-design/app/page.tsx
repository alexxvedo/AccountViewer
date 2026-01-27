import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { CompaniesFilter } from "@/components/dashboard/companies-filter"
import { AccountsTable } from "@/components/dashboard/accounts-table"
import { DistributionCharts } from "@/components/dashboard/distribution-charts"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl space-y-6 p-6">
            {/* Stats Overview */}
            <section>
              <StatsCards />
            </section>

            {/* Companies Filter */}
            <section>
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-foreground">Filtrar por Empresa</h2>
                <p className="text-sm text-muted-foreground">Selecciona una prop firm para ver sus cuentas</p>
              </div>
              <CompaniesFilter />
            </section>

            {/* Charts Row */}
            <section className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <PerformanceChart />
              </div>
              <div>
                <RecentActivity />
              </div>
            </section>

            {/* Distribution Charts */}
            <section>
              <DistributionCharts />
            </section>

            {/* Accounts Table */}
            <section>
              <AccountsTable />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
