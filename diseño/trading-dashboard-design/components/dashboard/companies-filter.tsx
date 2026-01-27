"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface Company {
  id: string
  name: string
  logo: string
  accounts: number
  totalBalance: number
}

const companies: Company[] = [
  { id: "all", name: "Todas", logo: "★", accounts: 12, totalBalance: 847520 },
  { id: "ftmo", name: "FTMO", logo: "F", accounts: 4, totalBalance: 312450 },
  { id: "mff", name: "MyForexFunds", logo: "M", accounts: 3, totalBalance: 248920 },
  { id: "5ers", name: "The5ers", logo: "5", accounts: 2, totalBalance: 154230 },
  { id: "fn", name: "Funded Next", logo: "N", accounts: 2, totalBalance: 78520 },
  { id: "tff", name: "True Forex", logo: "T", accounts: 1, totalBalance: 53400 },
]

interface CompaniesFilterProps {
  onFilterChange?: (companyId: string) => void
}

export function CompaniesFilter({ onFilterChange }: CompaniesFilterProps) {
  const [selectedCompany, setSelectedCompany] = useState("all")

  const handleSelect = (companyId: string) => {
    setSelectedCompany(companyId)
    onFilterChange?.(companyId)
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {companies.map((company) => (
        <Button
          key={company.id}
          variant="outline"
          onClick={() => handleSelect(company.id)}
          className={cn(
            "flex h-auto shrink-0 flex-col items-start gap-1 border-border px-4 py-3 text-left transition-all",
            selectedCompany === company.id
              ? "border-accent bg-accent/10 text-foreground"
              : "bg-card text-muted-foreground hover:border-accent/50 hover:bg-secondary"
          )}
        >
          <div className="flex w-full items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
              selectedCompany === company.id
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-foreground"
            )}>
              {company.logo}
            </div>
            <span className="font-medium">{company.name}</span>
          </div>
          <div className="flex w-full items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">{company.accounts} cuentas</span>
            <span className="font-mono text-foreground">${(company.totalBalance / 1000).toFixed(0)}K</span>
          </div>
        </Button>
      ))}
    </div>
  )
}
