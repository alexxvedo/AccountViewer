"use client";

import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  LogOut,
  Loader2,
  Menu,
  ChevronDown,
  Bot,
  Sun,
  Moon,
  ChevronUp,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GMonitorLogo } from "@/components/GMonitorLogo";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [eas, setEas] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
      overview: true,
      eas: true
  });

  const toggleSection = (section: 'overview' | 'eas') => {
      setExpandedSections(prev => ({
          ...prev,
          [section]: !prev[section]
      }));
  };

  useEffect(() => {
      if (!session?.user?.id) return;
      
      const fetchSidebarData = async () => {
          try {
              const [accRes, easRes] = await Promise.all([
                   fetch(`/api/users/${session.user.id}/accounts`),
                   fetch(`/api/users/${session.user.id}/eas`)
              ]);
              if (accRes.ok) setAccounts(await accRes.json());
              if (easRes.ok) setEas(await easRes.json());
          } catch(e) { console.error(e); }
      };
      
      fetchSidebarData();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const secondaryNav: NavItem[] = [
    { icon: Settings, label: "Ajustes", href: "/dashboard/settings" },
    { icon: HelpCircle, label: "Ayuda", href: "/dashboard/help" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const userInitials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col bg-sidebar transition-all duration-300 lg:relative",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Clickable border to toggle collapse */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-0 top-0 h-full w-1 cursor-ew-resize bg-border hover:bg-accent transition-colors z-10 hidden lg:block"
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        />

        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border px-4">
          <GMonitorLogo size={32} showText={!collapsed} />
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
           {/* Section: Overview (Expandable) */}
           <div>
               <button 
                  onClick={() => toggleSection("overview")}
                  className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent/50 hover:text-foreground",
                      isActive("/dashboard") && !pathname.includes("/dashboard/settings") && !pathname.includes("/dashboard/help") ? "text-foreground" : "text-muted-foreground",
                      collapsed && "justify-center px-2"
                  )}
               >
                   <div className="flex items-center gap-3">
                       <LayoutDashboard className="h-5 w-5 shrink-0" />
                       {!collapsed && <span>Overview</span>}
                   </div>
                   {!collapsed && (
                       <ChevronDown className={cn("h-4 w-4 transition-transform", !expandedSections.overview && "-rotate-90")} />
                   )}
               </button>

               {!collapsed && expandedSections.overview && (
                   <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                       <Link
                            href="/dashboard"
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                pathname === "/dashboard" ? "bg-sidebar-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span>General</span>
                        </Link>
                        {accounts.map(acc => (
                            <Link
                                key={acc.id}
                                href={`/accounts/${acc.id}`}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                    pathname === `/accounts/${acc.id}` ? "bg-sidebar-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="truncate">{acc.nickname || `Account ${acc.accountNumber}`}</span>
                            </Link>
                        ))}
                   </div>
               )}
           </div>

           {/* Section: Expert Advisors (Expandable) */}
           <div>
               <button 
                  onClick={() => toggleSection("eas")}
                  className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent/50 hover:text-foreground",
                      pathname.includes("/ea/") ? "text-foreground" : "text-muted-foreground",
                      collapsed && "justify-center px-2"
                  )}
               >
                   <div className="flex items-center gap-3">
                       <Bot className="h-5 w-5 shrink-0" />
                       {!collapsed && <span>Expert Advisors</span>}
                   </div>
                   {!collapsed && (
                       <ChevronDown className={cn("h-4 w-4 transition-transform", !expandedSections.eas && "-rotate-90")} />
                   )}
               </button>

               {!collapsed && expandedSections.eas && (
                   <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                       {eas.map(ea => (
                           <Link
                                key={ea.id}
                                href={`/accounts/${ea.accountId}/ea/${ea.id}`}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                    pathname.includes(ea.id) ? "bg-sidebar-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="truncate">{ea.name}</span>
                            </Link>
                       ))}
                       {eas.length === 0 && (
                           <span className="px-2 py-1.5 text-xs text-muted-foreground italic">No EAs found</span>
                       )}
                   </div>
               )}
           </div>


          <div
            className={cn(
              "mb-2 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
              collapsed && "hidden"
            )}
          >
            Gestión
          </div>
          {secondaryNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent transition-colors",
                  collapsed && "justify-center px-0"
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent shrink-0">
                  {userInitials}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium text-foreground">
                        {session.user?.name || "Usuario"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Tema claro
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Tema oscuro
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <GMonitorLogo size={28} />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-full p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
