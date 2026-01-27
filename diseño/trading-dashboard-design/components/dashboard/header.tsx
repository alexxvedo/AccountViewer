"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Search, Bell, Plus, ChevronDown, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Última actualización: hace 5 min</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cuentas..."
            className="h-9 w-64 border-border bg-secondary pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-accent"
          />
        </div>

        {/* Refresh */}
        <Button variant="outline" size="icon" className="h-9 w-9 border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground">
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative h-9 w-9 border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            3
          </span>
        </Button>

        {/* Add Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-9 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Cuenta</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Agregar Cuenta FTMO</DropdownMenuItem>
            <DropdownMenuItem>Agregar MyForexFunds</DropdownMenuItem>
            <DropdownMenuItem>Agregar The5ers</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Otra Empresa...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
