"use client"

import React from "react"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  Building2,
  TrendingUp,
  Users,
  FileText,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: string
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/", badge: "" },
  { icon: Wallet, label: "Cuentas", href: "/cuentas", badge: "12" },
  { icon: Building2, label: "Empresas", href: "/empresas", badge: "4" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: TrendingUp, label: "Performance", href: "/performance" },
]

const secondaryNav: NavItem[] = [
  { icon: Users, label: "Traders", href: "/traders" },
  { icon: FileText, label: "Reportes", href: "/reportes" },
  { icon: Settings, label: "Ajustes", href: "/ajustes" },
  { icon: HelpCircle, label: "Ayuda", href: "/ayuda" },
]

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const [activeItem, setActiveItem] = useState("")

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <TrendingUp className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">TradingHub</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent mx-auto">
            <TrendingUp className="h-5 w-5 text-accent-foreground" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <div className={cn("mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground", collapsed && "hidden")}>
          Principal
        </div>
        {mainNav.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}

        <div className={cn("mb-2 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground", collapsed && "hidden")}>
          Gestión
        </div>
        {secondaryNav.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
            JD
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground">Pro Trader</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
