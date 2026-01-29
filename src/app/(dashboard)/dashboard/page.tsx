"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  DollarSign,
  Activity,
  MoreHorizontal,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";

interface LiveData {
  balance: number;
  equity: number;
  floatingPL: number;
  lastUpdate: number;
}

interface AccountType {
  id: string;
  name: string;
  color: string;
}

interface TradingAccount {
  id: string;
  accountNumber: number;
  broker: string;
  server: string;
  platform: string;
  nickname: string | null;
  isConnected: boolean;
  connectionToken: string;
  sectionId: string | null;
  accountTypeId: string | null;
  accountType?: AccountType | null;
  liveData: LiveData | null;
  balance: number,
  equity: number,
  stats?: {
    winRate: number;
    trades: number;
    profitFactor?: number;
  };
}

interface LiveDataMap {
  [accountId: string]: LiveData;
}

interface Section {
  id: string;
  name: string;
  color: string | null;
  accounts: TradingAccount[];
}

// Colores predefinidos para secciones
const SECTION_COLORS = [
  { name: "Gris", value: "#71717A" },
  { name: "Rojo", value: "#EF4444" },
  { name: "Naranja", value: "#F97316" },
  { name: "Amarillo", value: "#EAB308" },
  { name: "Verde", value: "#22C55E" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Violeta", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [unsectionedAccounts, setUnsectionedAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [liveDataMap, setLiveDataMap] = useState<LiveDataMap>({});
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [hasOverflow, setHasOverflow] = useState(false);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);

  const [accountForm, setAccountForm] = useState({
    accountNumber: "",
    broker: "",
    server: "",
    platform: "MT5",
    nickname: "",
    sectionId: "",
    accountTypeId: "",
  });
  const [sectionForm, setSectionForm] = useState({ name: "", color: "#71717A" });
  const [newAccountTypeName, setNewAccountTypeName] = useState("");
  const [newAccountTypeColor, setNewAccountTypeColor] = useState("#71717A");
  const [creatingAccountType, setCreatingAccountType] = useState(false);
  const [editingAccountType, setEditingAccountType] = useState<AccountType | null>(null);
  const [showAccountTypesModal, setShowAccountTypesModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch structure
  // Fetch structure
  useEffect(() => {
    if (session?.user?.id) {
      fetchStructure();
      const interval = setInterval(fetchStructure, 10000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  // Fetch live data
  useEffect(() => {
    if (session?.user?.id) {
      const fetchFastLive = async () => {
        try {
          const res = await fetch(`/api/users/${session.user.id}/fast-live`);
          const data = await res.json();
          setLiveDataMap(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error("Fast poll error", error);
        }
      };
      fetchFastLive();
      const interval = setInterval(fetchFastLive, 2000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  // Detect overflow in sections container
  useEffect(() => {
    const checkOverflow = () => {
      const container = sectionsContainerRef.current;
      if (container) {
        setHasOverflow(container.scrollWidth > container.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [sections, unsectionedAccounts]);

  const fetchStructure = async () => {
    if (!session?.user?.id) return;
    try {
      const [sectionsRes, accountsRes, typesRes] = await Promise.all([
        fetch(`/api/users/${session.user.id}/sections`, { cache: "no-store" }),
        fetch(`/api/users/${session.user.id}/accounts-live`, { cache: "no-store" }),
        fetch(`/api/users/${session.user.id}/account-types`, { cache: "no-store" }),
      ]);
      const sectionsData = await sectionsRes.json();
      const accountsData = await accountsRes.json();

      const typesData = await typesRes.json();
      
      const accountsMap = new Map<string, TradingAccount>();
      accountsData.forEach((acc: TradingAccount) => accountsMap.set(acc.id, acc));
      
      const enrichedSections = sectionsData.map((section: Section) => ({
        ...section,
        accounts: section.accounts.map((acc: TradingAccount) => 
          accountsMap.get(acc.id) || acc
        )
      }));
      
      setSections(enrichedSections);
      setAccountTypes(typesData);
      setUnsectionedAccounts(accountsData.filter((a: TradingAccount) => !a.sectionId));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de fetch separadas para recargas selectivas (más rápidas)
  const fetchAccountTypes = async () => {
    if (!session?.user?.id) return;
    const res = await fetch(`/api/users/${session.user.id}/account-types`, { cache: "no-store" });
    setAccountTypes(await res.json());
  };

  const fetchSectionsOnly = async () => {
    if (!session?.user?.id) return;
    const res = await fetch(`/api/users/${session.user.id}/sections`, { cache: "no-store" });
    const data = await res.json();
    // Mantener datos de cuentas existentes
    const currentMap = new Map<string, TradingAccount>();
    [...sections.flatMap(s => s.accounts), ...unsectionedAccounts].forEach(a => currentMap.set(a.id, a));
    setSections(data.map((s: Section) => ({ ...s, accounts: s.accounts.map((a: TradingAccount) => currentMap.get(a.id) || a) })));
  };

  const allAccounts = useMemo(() => 
    [...sections.flatMap(s => s.accounts), ...unsectionedAccounts],
    [sections, unsectionedAccounts]
  );

  const getAccountData = useCallback((acc: TradingAccount) => {
    return liveDataMap[acc.id] || acc.liveData;
  }, [liveDataMap]);

  // Filtered accounts based on selected section
  const filteredAccounts = useMemo(() => {
    if (selectedSection === "all") return allAccounts;
    if (selectedSection === "unsectioned") return unsectionedAccounts;
    const section = sections.find(s => s.id === selectedSection);
    return section?.accounts || [];
  }, [selectedSection, allAccounts, unsectionedAccounts, sections]);

  // Stats
  const stats = useMemo(() => {
    const accounts = selectedSection === "all" ? allAccounts : filteredAccounts;
    const connected = accounts.filter(a => a.isConnected || liveDataMap[a.id]);
    const totalBalance = connected.reduce((sum, a) => sum + (getAccountData(a)?.balance || 0), 0);
    const totalPL = connected.reduce((sum, a) => sum + (getAccountData(a)?.floatingPL || 0), 0);
    return {
      total: accounts.length,
      connected: connected.length,
      balance: totalBalance,
      floatingPL: totalPL,
    };
  }, [selectedSection, allAccounts, filteredAccounts, liveDataMap, getAccountData]);

  // Section stats for filter
  const getSectionStats = useCallback((accounts: TradingAccount[]) => {
    const connected = accounts.filter(a => a.isConnected || liveDataMap[a.id]);
    return {
      count: accounts.length,
      balance: connected.reduce((s, a) => s + (getAccountData(a)?.balance || 0), 0),
    };
  }, [liveDataMap, getAccountData]);

  // CRUD handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    const accNum = parseInt(accountForm.accountNumber);
    if (!accountForm.accountNumber || isNaN(accNum)) {
      // Feedback básico si no tenemos toast
      alert("Por favor ingrese un número de cuenta válido"); 
      return;
    }
    
    setFormLoading(true);
    try {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          accountNumber: accNum,
          broker: accountForm.broker,
          server: accountForm.server,
          platform: accountForm.platform,
          nickname: accountForm.nickname || null,
          sectionId: accountForm.sectionId || null,
          accountTypeId: accountForm.accountTypeId || null,
        }),
      });
      setShowAccountModal(false);
      setAccountForm({ accountNumber: "", broker: "", server: "", platform: "MT5", nickname: "", sectionId: "", accountTypeId: "" });
      fetchStructure();
    } catch (error) {
      console.error("Error creating account:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    // Optimistic: Añadir sección y cerrar modal inmediatamente
    const tempId = `temp-${Date.now()}`;
    const newSection: Section = { id: tempId, name: sectionForm.name, color: sectionForm.color, accounts: [] };
    setSections(prev => [...prev, newSection]);
    setShowSectionModal(false);
    setSectionForm({ name: "", color: "#71717A" });
    setFormLoading(false);
    
    try {
      await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, name: newSection.name, color: newSection.color }),
      });
      await fetchSectionsOnly(); // Obtener ID real
    } catch (error) {
      console.error("Error creating section:", error);
      setSections(prev => prev.filter(s => s.id !== tempId)); // Rollback
    }
  };

  const handleCreateAccountType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !newAccountTypeName.trim()) return;
    
    // Optimistic: Añadir tipo inmediatamente
    const tempId = `temp-${Date.now()}`;
    const newType: AccountType = { id: tempId, name: newAccountTypeName, color: newAccountTypeColor };
    setAccountTypes(prev => [...prev, newType]);
    setAccountForm(prev => ({ ...prev, accountTypeId: tempId }));
    const typeName = newAccountTypeName;
    const typeColor = newAccountTypeColor;
    setNewAccountTypeName("");
    setNewAccountTypeColor("#71717A");
    setCreatingAccountType(false);
    
    try {
      const res = await fetch("/api/account-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, name: typeName, color: typeColor }),
      });
      const data = await res.json();
      if (data.id) {
        setAccountTypes(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
        setAccountForm(prev => prev.accountTypeId === tempId ? { ...prev, accountTypeId: data.id } : prev);
      }
    } catch (error) {
      console.error("Error creating account type:", error);
      setAccountTypes(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const handleDeleteAccountType = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const backup = accountTypes.find(t => t.id === id);
    setAccountTypes(prev => prev.filter(t => t.id !== id));
    
    try {
      await fetch(`/api/account-types/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting account type:", error);
      if (backup) setAccountTypes(prev => [...prev, backup]);
    }
  };

  const handleUpdateAccountType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountType) return;
    
    // Optimistic: Actualizar inmediatamente
    const updatedType = { ...editingAccountType };
    setAccountTypes(prev => prev.map(t => t.id === updatedType.id ? updatedType : t));
    setEditingAccountType(null);
    
    try {
      await fetch(`/api/account-types/${updatedType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: updatedType.name, color: updatedType.color }),
      });
    } catch (error) {
      console.error("Error updating account type:", error);
      await fetchAccountTypes();
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    
    // Optimistic: Actualizar inmediatamente
    const updatedData = { name: sectionForm.name, color: sectionForm.color };
    setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, ...updatedData } : s));
    setEditingSection(null);
    setSectionForm({ name: "", color: "#71717A" });
    
    try {
      await fetch(`/api/sections/${editingSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
    } catch (error) {
      console.error("Error updating section:", error);
      await fetchSectionsOnly(); // Rollback
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    
    // Optimistic: Actualizar inmediatamente
    const updatedData = {
      nickname: accountForm.nickname || null,
      broker: accountForm.broker,
      server: accountForm.server,
      platform: accountForm.platform,
      sectionId: accountForm.sectionId || null,
      accountTypeId: accountForm.accountTypeId || null,
    };
    const matchedType = accountTypes.find(t => t.id === accountForm.accountTypeId);
    
    const updateFn = (acc: TradingAccount) => acc.id === editingAccount.id 
      ? { ...acc, ...updatedData, accountType: matchedType || null } 
      : acc;
    
    setSections(prev => prev.map(s => ({ ...s, accounts: s.accounts.map(updateFn) })));
    setUnsectionedAccounts(prev => prev.map(updateFn));
    setEditingAccount(null);
    setAccountForm({ accountNumber: "", broker: "", server: "", platform: "MT5", nickname: "", sectionId: "", accountTypeId: "" });
    
    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      
      if (!res.ok) {
        alert("Error al actualizar la cuenta.");
        await fetchStructure(); // Rollback
      }
    } catch (error) {
      console.error("Error updating account:", error);
      await fetchStructure();
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;
    
    // Optimistic: Quitar inmediatamente
    const backup = sections.find(s => s.id === deletingSectionId);
    setSections(prev => prev.filter(s => s.id !== deletingSectionId));
    if (backup) setUnsectionedAccounts(prev => [...prev, ...backup.accounts.map(a => ({ ...a, sectionId: null }))]);
    setSelectedSection("all");
    setDeletingSectionId(null);
    
    try {
      await fetch(`/api/sections/${deletingSectionId}`, { method: "DELETE", credentials: "include" });
    } catch (error) {
      console.error("Error deleting section:", error);
      await fetchStructure(); // Rollback completo
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccountId) return;
    
    // Optimistic: Quitar inmediatamente
    setSections(prev => prev.map(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== deletingAccountId) })));
    setUnsectionedAccounts(prev => prev.filter(a => a.id !== deletingAccountId));
    setDeletingAccountId(null);
    
    try {
      await fetch(`/api/accounts/${deletingAccountId}`, { method: "DELETE", credentials: "include" });
    } catch (error) {
      console.error("Error deleting account:", error);
      await fetchStructure(); // Rollback
    }
  };

  const copyToken = (token: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(token).then(() => {
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      });
    }
  };

  const openEditAccount = (account: TradingAccount) => {
    setEditingAccount(account);
    setAccountForm({
      accountNumber: account.accountNumber.toString(),
      broker: account.broker,
      server: account.server,
      platform: account.platform,
      nickname: account.nickname || "",
      sectionId: account.sectionId || "",
      accountTypeId: account.accountTypeId || "",
    });
  };

  const navigateToAccount = (accountId: string) => {
    router.push(`/accounts/${accountId}`);
  };

  // Status config
  const getStatusConfig = (account: TradingAccount) => {
    if (!account.isConnected) {
      return { label: "Offline", className: "bg-muted text-muted-foreground border-border" };
    }
    return { label: "Online", className: "bg-profit/20 text-profit border-profit/30" };
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Balance Total</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                ${stats.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-muted-foreground">{stats.connected} cuentas conectadas</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <DollarSign className="h-5 w-5 text-profit" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">P/L Flotante</p>
              <p className={cn("text-2xl font-bold tracking-tight", stats.floatingPL >= 0 ? "text-profit" : "text-loss")}>
                {stats.floatingPL >= 0 ? "+" : ""}${stats.floatingPL.toFixed(2)}
              </p>
              <span className={cn("flex items-center gap-1 text-xs font-medium", stats.floatingPL >= 0 ? "text-profit" : "text-loss")}>
                {stats.floatingPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stats.balance > 0 ? ((stats.floatingPL / stats.balance) * 100).toFixed(2) : 0}%
              </span>
            </div>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stats.floatingPL >= 0 ? "bg-profit/10" : "bg-loss/10")}>
              {stats.floatingPL >= 0 ? <TrendingUp className="h-5 w-5 text-profit" /> : <TrendingDown className="h-5 w-5 text-loss" />}
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Cuentas Totales</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</p>
              <span className="text-xs text-muted-foreground">{sections.length} secciones</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Conectadas</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.connected}</p>
              <span className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0}% activas
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-profit/10">
              <Activity className="h-5 w-5 text-profit" />
            </div>
          </div>
        </Card>
      </div>

    

      {/* Section Filter */}
      <section>
        
        <div className="relative group/scroll">
          {/* Flecha izquierda - solo si hay overflow */}
          {hasOverflow && (
            <button
              onClick={() => {
                sectionsContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-background transition-all opacity-0 group-hover/scroll:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          
          {/* Flecha derecha - solo si hay overflow */}
          {hasOverflow && (
            <button
              onClick={() => {
                sectionsContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-background transition-all opacity-0 group-hover/scroll:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          
          <div ref={sectionsContainerRef} className="flex items-center gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* All */}
          <Button
            variant="outline"
            onClick={() => setSelectedSection("all")}
            className={cn(
              "flex h-auto shrink-0 flex-col items-start gap-1 border-zinc-600 px-4 py-3 text-left transition-all",
              selectedSection === "all"
                ? "border-accent bg-accent/10 text-foreground"
                : "bg-card text-muted-foreground hover:border-accent/50 hover:bg-secondary"
            )}
          >
            <div className="flex w-full items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
                selectedSection === "all" ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
              )}>
                ★
              </div>
              <span className="font-medium">Todas</span>
            </div>
            <div className="flex w-full items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{allAccounts.length} cuentas</span>
            </div>
          </Button>

          {/* Sections */}
          {sections.map((section) => {
            const sectionStats = getSectionStats(section.accounts);
            const isSelected = selectedSection === section.id;
            return (
              <div
                key={section.id}
                className={cn(
                  "group relative flex h-auto shrink-0 flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-zinc-600 bg-card text-muted-foreground hover:border-accent/50 hover:bg-secondary"
                )}
                onClick={() => setSelectedSection(section.id)}
              >
                
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
                      style={{ backgroundColor: section.color || "#71717A" }}
                    >
                      {section.name[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium">{section.name}</span>
                  </div>
                  {/* Botones editar/eliminar */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingSection(section);
                        setSectionForm({ name: section.name, color: section.color || "#71717A" });
                      }}
                      className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingSectionId(section.id)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{sectionStats.count} cuentas</span>
                  <span className="font-mono text-foreground">${(sectionStats.balance / 1000).toFixed(0)}K</span>
                </div>
              </div>
            );
          })}

          {/* Unsectioned */}
          {unsectionedAccounts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setSelectedSection("unsectioned")}
              className={cn(
                "flex h-auto shrink-0 flex-col items-start gap-1 border-border px-4 py-3 text-left transition-all",
                selectedSection === "unsectioned"
                  ? "border-accent bg-accent/10 text-foreground"
                  : "bg-card text-muted-foreground hover:border-accent/50 hover:bg-secondary"
              )}
            >
              <div className="flex w-full items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-xs font-bold text-foreground">
                  ?
                </div>
                <span className="font-medium">Sin Sección</span>
              </div>
              <div className="flex w-full items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">{unsectionedAccounts.length} cuentas</span>
              </div>
            </Button>
          )}

          {/* Add Section Button */}
          <Button
            variant="outline"
            onClick={() => setShowSectionModal(true)}
            className="flex h-auto shrink-0 items-center gap-2 border-dashed border-border px-4 py-5 text-muted-foreground hover:border-accent/50 hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva</span>
          </Button>
          </div>
        </div>
      </section>

      {/* Accounts Table */}
      <Card className="border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {selectedSection === "all" ? "Todas las Cuentas" : 
               selectedSection === "unsectioned" ? "Cuentas Sin Sección" :
               sections.find(s => s.id === selectedSection)?.name || "Cuentas"}
            </h3>
            
          </div>
          <Button onClick={() => setShowAccountModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>

        {filteredAccounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredAccounts.map((account) => {

              const data = getAccountData(account);

              
              const profit = data?.floatingPL || 0;
              const balance = data?.balance || account.balance || 0;
              const equity = data?.equity || account.equity ;
              const profitPercent = balance > 0 ? (profit / balance) * 100 : 0;
              
              const matchedType = accountTypes.find(t => t.id === account.accountTypeId);
              const typeName = matchedType?.name || account.accountType?.name;
              const typeColor = matchedType?.color || account.accountType?.color || "#71717A";

              const winRate = account.stats?.winRate ?? 0;
              const trades = account.stats?.trades ?? 0;
              const pFactor = account.stats?.profitFactor ?? 0;

              // Simular drawdown (puedes conectar con datos reales después)
              const drawdownPercent = balance > 0 ? Math.min(((balance - equity) / balance) * 100, 10) : 0;

              return (
                <div
                  key={account.id}
                  className="rounded-xl border border-border bg-card p-4 hover:border-accent/50 transition-all cursor-pointer group"
                  onClick={() => navigateToAccount(account.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-foreground">
                        {account.broker[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {account.nickname || `Cuenta ${account.accountNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{account.broker}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <div 
                          className={cn(
                            "h-2 w-2 rounded-full",
                            account.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500/50"
                          )} 
                        />
                        <span className={cn("text-xs", account.isConnected ? "text-green-500" : "text-muted-foreground")}>
                          {account.isConnected ? "Conectado" : "Desconectado"}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => navigateToAccount(account.id)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => copyToken(account.connectionToken, e)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar token
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditAccount(account)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-loss" onClick={() => setDeletingAccountId(account.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {typeName && (
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: `${typeColor}60`, 
                          color: typeColor,
                          backgroundColor: `${typeColor}15` 
                        }}
                      >
                        {typeName}
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                      {account.platform}
                    </Badge>
                  </div>

                  {/* Balance & Profit/Loss */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Balance</p>
                      <p className="text-xl font-bold text-foreground font-mono">
                        ${balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Profit/Loss</p>
                      <div className="flex items-center gap-1">
                        {profit >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        )}
                        <p className={cn("text-xl font-bold font-mono", profit >= 0 ? "text-profit" : "text-loss")}>
                          {profit >= 0 ? "+" : ""}${Math.abs(profit).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Drawdown Bars */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Drawdown</span>
                        <span className={cn(drawdownPercent > 5 ? "text-warning" : "text-muted-foreground")}>
                          {drawdownPercent.toFixed(1)}% / 10%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", drawdownPercent > 5 ? "bg-warning" : "bg-muted-foreground/50")}
                          style={{ width: `${Math.min(drawdownPercent * 10, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className={cn("text-sm font-bold", winRate >= 50 ? "text-foreground" : "text-warning")}>{winRate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Trades</p>
                      <p className="text-sm font-bold text-foreground">{trades}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">P. Factor</p>
                      <p className="text-sm font-bold text-foreground">{pFactor > 0 ? pFactor.toFixed(2) : "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No hay cuentas en esta sección</p>
            <Button onClick={() => setShowAccountModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Cuenta
            </Button>
          </div>
        )}
      </Card>

      {/* Create Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAccountModal(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Nueva Cuenta</h2>
              <button onClick={() => setShowAccountModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Sección</Label>
                <Select value={accountForm.sectionId} onValueChange={(v) => setAccountForm({ ...accountForm, sectionId: v === "none" ? "" : v })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Sin sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sección</SelectItem>
                    {sections.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || ""}} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Nombre (opcional)</Label>
                <Input className="mt-1" placeholder="Mi cuenta principal" value={accountForm.nickname} onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })} />
              </div>
              <div>
                <Label className="text-muted-foreground">Estado de Cuenta</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={accountForm.accountTypeId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, accountTypeId: v === "none" ? "" : v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {accountTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={() => setShowAccountTypesModal(true)}>
                    <Pencil className="h-4 w-4 mr-1" /> Gestionar
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Número de cuenta</Label>
                  <Input className="mt-1" type="number" placeholder="12345678" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} required />
                </div>
                <div>
                  <Label className="text-muted-foreground">Plataforma</Label>
                  <Select value={accountForm.platform} onValueChange={(v) => setAccountForm({ ...accountForm, platform: v })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MT4">MetaTrader 4</SelectItem>
                      <SelectItem value="MT5">MetaTrader 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Broker</Label>
                <Input className="mt-1" placeholder="ICMarkets" value={accountForm.broker} onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })} required />
              </div>
              <div>
                <Label className="text-muted-foreground">Servidor</Label>
                <Input className="mt-1" placeholder="ICMarkets-Demo" value={accountForm.server} onChange={(e) => setAccountForm({ ...accountForm, server: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAccountModal(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={formLoading} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Cuenta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Section Modal */}
      {(showSectionModal || editingSection) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => { setShowSectionModal(false); setEditingSection(null); }}>
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">{editingSection ? "Editar Sección" : "Nueva Sección"}</h2>
              <button onClick={() => { setShowSectionModal(false); setEditingSection(null); setSectionForm({ name: "", color: "#71717A" }); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={editingSection ? handleUpdateSection : handleCreateSection} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nombre</Label>
                <Input className="mt-1" placeholder="FTMO, AXI..." value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} required />
              </div>
              <div>
                <Label className="text-muted-foreground">Color</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSectionForm({ ...sectionForm, color: c.value })}
                      className={cn("h-8 w-8 rounded-full border-2 transition-all", sectionForm.color === c.value ? "border-foreground scale-110" : "border-transparent")}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowSectionModal(false); setEditingSection(null); }} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={formLoading} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingSection ? "Guardar" : "Crear")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setEditingAccount(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Editar Cuenta</h2>
              <button onClick={() => setEditingAccount(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Sección</Label>
                <Select value={accountForm.sectionId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, sectionId: v === "none" ? "" : v })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Sin sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sección</SelectItem>
                    {sections.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#71717A" }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Nombre</Label>
                <Input className="mt-1" value={accountForm.nickname} onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })} />
              </div>
              <div>
                <Label className="text-muted-foreground">Estado de Cuenta</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={accountForm.accountTypeId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, accountTypeId: v === "none" ? "" : v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {accountTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={() => setShowAccountTypesModal(true)}>
                    <Pencil className="h-4 w-4 mr-1" /> Gestionar
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Broker</Label>
                <Input className="mt-1" value={accountForm.broker} onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })} required />
              </div>
              <div>
                <Label className="text-muted-foreground">Servidor</Label>
                <Input className="mt-1" value={accountForm.server} onChange={(e) => setAccountForm({ ...accountForm, server: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDeletingAccountId(editingAccount.id)} className="text-loss hover:bg-loss/10">
                  Eliminar
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingAccount(null)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={formLoading} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Section Dialog */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={(open) => !open && setDeletingSectionId(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar sección?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Las cuentas pasarán a "Sin sección". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={!!deletingAccountId} onOpenChange={(open) => !open && setDeletingAccountId(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Types Management Modal */}
      {showAccountTypesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => { setShowAccountTypesModal(false); setEditingAccountType(null); }}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Gestionar Estados</h2>
              <button onClick={() => { setShowAccountTypesModal(false); setEditingAccountType(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Create new type */}
            <div className="mb-4 p-3 rounded-lg bg-secondary/30 border border-border">
              <Label className="text-sm text-foreground/80 mb-2 block font-medium">Nombre del estado</Label>
              <div className="flex gap-2 mb-4">
                 <Input 
                   placeholder="Ej: Aprobada, En revisión..." 
                   value={newAccountTypeName} 
                   onChange={(e) => setNewAccountTypeName(e.target.value)} 
                   className="h-10 text-sm flex-1 bg-background"
                 />
              </div>
              
              <Label className="text-sm text-foreground/80 mb-2 block font-medium">Color identificativo</Label>
              <div className="flex gap-2 flex-wrap mb-6 bg-secondary/20 p-3 rounded-lg border border-border/50">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewAccountTypeColor(c.value)}
                      className={cn("h-8 w-8 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-background", newAccountTypeColor === c.value ? "ring-2 ring-foreground scale-110" : "")}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
              </div>
              
              <Button type="button" onClick={handleCreateAccountType} disabled={!newAccountTypeName.trim()} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Crear Estado
              </Button>
            </div>

            {/* List of types */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {accountTypes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay estados creados</p>
              )}
              {accountTypes.map(type => (
                <div key={type.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  {editingAccountType?.id === type.id ? (
                    <>
                      <div className="flex gap-1">
                        {SECTION_COLORS.slice(0, 6).map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setEditingAccountType({ ...editingAccountType, color: c.value })}
                            className={cn("h-5 w-5 rounded-full border-2 transition-all", editingAccountType.color === c.value ? "border-foreground" : "border-transparent")}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>
                      <Input 
                        value={editingAccountType.name} 
                        onChange={(e) => setEditingAccountType({ ...editingAccountType, name: e.target.value })}
                        className="h-7 text-sm flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={handleUpdateAccountType} className="h-7 px-2">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingAccountType(null)} className="h-7 px-2 text-muted-foreground">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
                      <span className="text-sm text-foreground flex-1">{type.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setEditingAccountType(type)} className="h-7 px-2 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => handleDeleteAccountType(type.id, e)} className="h-7 px-2 text-muted-foreground hover:text-loss">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowAccountTypesModal(false)} className="w-full">Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
