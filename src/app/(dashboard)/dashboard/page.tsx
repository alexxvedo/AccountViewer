"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  X,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Wifi,
  WifiOff,
  LayoutGrid,
  List,
  Filter,
  Layers,
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
  balance: number;
  equity: number;
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

const SECTION_COLORS = [
  { name: "Slate", value: "#64748b" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [accountForm, setAccountForm] = useState({
    accountNumber: "",
    broker: "",
    server: "",
    platform: "MT5",
    nickname: "",
    sectionId: "",
    accountTypeId: "",
  });
  const [sectionForm, setSectionForm] = useState({ name: "", color: "#64748b" });
  const [newAccountTypeName, setNewAccountTypeName] = useState("");
  const [newAccountTypeColor, setNewAccountTypeColor] = useState("#64748b");
  const [editingAccountType, setEditingAccountType] = useState<AccountType | null>(null);
  const [showAccountTypesModal, setShowAccountTypesModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchStructure();
      const interval = setInterval(fetchStructure, 10000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

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
        ),
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

  const fetchAccountTypes = async () => {
    if (!session?.user?.id) return;
    const res = await fetch(`/api/users/${session.user.id}/account-types`, { cache: "no-store" });
    setAccountTypes(await res.json());
  };

  const fetchSectionsOnly = async () => {
    if (!session?.user?.id) return;
    const res = await fetch(`/api/users/${session.user.id}/sections`, { cache: "no-store" });
    const data = await res.json();
    const currentMap = new Map<string, TradingAccount>();
    [...sections.flatMap((s) => s.accounts), ...unsectionedAccounts].forEach((a) =>
      currentMap.set(a.id, a)
    );
    setSections(
      data.map((s: Section) => ({
        ...s,
        accounts: s.accounts.map((a: TradingAccount) => currentMap.get(a.id) || a),
      }))
    );
  };

  const allAccounts = useMemo(
    () => [...sections.flatMap((s) => s.accounts), ...unsectionedAccounts],
    [sections, unsectionedAccounts]
  );

  const getAccountData = useCallback(
    (acc: TradingAccount) => {
      return liveDataMap[acc.id] || acc.liveData;
    },
    [liveDataMap]
  );

  const filteredAccounts = useMemo(() => {
    if (selectedSection === "all") return allAccounts;
    if (selectedSection === "unsectioned") return unsectionedAccounts;
    const section = sections.find((s) => s.id === selectedSection);
    return section?.accounts || [];
  }, [selectedSection, allAccounts, unsectionedAccounts, sections]);

  const stats = useMemo(() => {
    const accounts = selectedSection === "all" ? allAccounts : filteredAccounts;
    const connected = accounts.filter((a) => a.isConnected || liveDataMap[a.id]);
    const totalBalance = connected.reduce((sum, a) => sum + (getAccountData(a)?.balance || 0), 0);
    const totalEquity = connected.reduce((sum, a) => sum + (getAccountData(a)?.equity || 0), 0);
    const totalPL = connected.reduce((sum, a) => sum + (getAccountData(a)?.floatingPL || 0), 0);
    return {
      total: accounts.length,
      connected: connected.length,
      balance: totalBalance,
      equity: totalEquity,
      floatingPL: totalPL,
    };
  }, [selectedSection, allAccounts, filteredAccounts, liveDataMap, getAccountData]);

  const getSectionStats = useCallback(
    (accounts: TradingAccount[]) => {
      const connected = accounts.filter((a) => a.isConnected || liveDataMap[a.id]);
      return {
        count: accounts.length,
        connected: connected.length,
        balance: connected.reduce((s, a) => s + (getAccountData(a)?.balance || 0), 0),
        pl: connected.reduce((s, a) => s + (getAccountData(a)?.floatingPL || 0), 0),
      };
    },
    [liveDataMap, getAccountData]
  );

  // CRUD handlers (same as before)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    const accNum = parseInt(accountForm.accountNumber);
    if (!accountForm.accountNumber || isNaN(accNum)) {
      alert("Por favor ingrese un número de cuenta válido");
      return;
    }
    if (!accountForm.broker.trim()) {
      alert("Por favor ingrese el broker");
      return;
    }
    if (!accountForm.server.trim()) {
      alert("Por favor ingrese el servidor");
      return;
    }

    setFormLoading(true);
    try {
      const payload: Record<string, unknown> = {
        userId: session.user.id,
        accountNumber: accNum,
        broker: accountForm.broker.trim(),
        server: accountForm.server.trim(),
        platform: accountForm.platform,
      };
      if (accountForm.nickname) payload.nickname = accountForm.nickname;
      if (accountForm.sectionId) payload.sectionId = accountForm.sectionId;
      if (accountForm.accountTypeId) payload.accountTypeId = accountForm.accountTypeId;

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert("Error al crear cuenta: " + (error.message || res.statusText));
        return;
      }

      setShowAccountModal(false);
      setAccountForm({
        accountNumber: "",
        broker: "",
        server: "",
        platform: "MT5",
        nickname: "",
        sectionId: "",
        accountTypeId: "",
      });
      fetchStructure();
    } catch (error) {
      console.error("Error creating account:", error);
      alert("Error de conexión al crear cuenta");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    const tempId = `temp-${Date.now()}`;
    const newSection: Section = {
      id: tempId,
      name: sectionForm.name,
      color: sectionForm.color,
      accounts: [],
    };
    setSections((prev) => [...prev, newSection]);
    setShowSectionModal(false);
    setSectionForm({ name: "", color: "#64748b" });

    try {
      await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          name: newSection.name,
          color: newSection.color,
        }),
      });
      await fetchSectionsOnly();
    } catch (error) {
      console.error("Error creating section:", error);
      setSections((prev) => prev.filter((s) => s.id !== tempId));
    }
  };

  const handleCreateAccountType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !newAccountTypeName.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newType: AccountType = {
      id: tempId,
      name: newAccountTypeName,
      color: newAccountTypeColor,
    };
    setAccountTypes((prev) => [...prev, newType]);
    setAccountForm((prev) => ({ ...prev, accountTypeId: tempId }));
    const typeName = newAccountTypeName;
    const typeColor = newAccountTypeColor;
    setNewAccountTypeName("");
    setNewAccountTypeColor("#64748b");

    try {
      const res = await fetch("/api/account-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, name: typeName, color: typeColor }),
      });
      const data = await res.json();
      if (data.id) {
        setAccountTypes((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: data.id } : t)));
        setAccountForm((prev) =>
          prev.accountTypeId === tempId ? { ...prev, accountTypeId: data.id } : prev
        );
      }
    } catch (error) {
      console.error("Error creating account type:", error);
      setAccountTypes((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  const handleDeleteAccountType = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const backup = accountTypes.find((t) => t.id === id);
    setAccountTypes((prev) => prev.filter((t) => t.id !== id));

    try {
      await fetch(`/api/account-types/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting account type:", error);
      if (backup) setAccountTypes((prev) => [...prev, backup]);
    }
  };

  const handleUpdateAccountType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountType) return;

    const updatedType = { ...editingAccountType };
    setAccountTypes((prev) => prev.map((t) => (t.id === updatedType.id ? updatedType : t)));
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

    const updatedData = { name: sectionForm.name, color: sectionForm.color };
    setSections((prev) =>
      prev.map((s) => (s.id === editingSection.id ? { ...s, ...updatedData } : s))
    );
    setEditingSection(null);
    setSectionForm({ name: "", color: "#64748b" });

    try {
      await fetch(`/api/sections/${editingSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
    } catch (error) {
      console.error("Error updating section:", error);
      await fetchSectionsOnly();
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const updatedData = {
      nickname: accountForm.nickname || null,
      broker: accountForm.broker,
      server: accountForm.server,
      platform: accountForm.platform,
      sectionId: accountForm.sectionId || null,
      accountTypeId: accountForm.accountTypeId || null,
    };
    const matchedType = accountTypes.find((t) => t.id === accountForm.accountTypeId);
    const oldSectionId = editingAccount.sectionId;
    const newSectionId = accountForm.sectionId || null;

    // Create updated account object
    const updatedAccount: TradingAccount = {
      ...editingAccount,
      ...updatedData,
      accountType: matchedType || null,
    };

    // Optimistic update: move account between sections if needed
    if (oldSectionId !== newSectionId) {
      // Remove from old location
      if (oldSectionId) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === oldSectionId
              ? { ...s, accounts: s.accounts.filter((a) => a.id !== editingAccount.id) }
              : s
          )
        );
      } else {
        setUnsectionedAccounts((prev) => prev.filter((a) => a.id !== editingAccount.id));
      }

      // Add to new location
      if (newSectionId) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === newSectionId
              ? { ...s, accounts: [...s.accounts, updatedAccount] }
              : s
          )
        );
      } else {
        setUnsectionedAccounts((prev) => [...prev, updatedAccount]);
      }
    } else {
      // Same section, just update the account data
      const updateFn = (acc: TradingAccount) =>
        acc.id === editingAccount.id ? updatedAccount : acc;

      if (oldSectionId) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === oldSectionId ? { ...s, accounts: s.accounts.map(updateFn) } : s
          )
        );
      } else {
        setUnsectionedAccounts((prev) => prev.map(updateFn));
      }
    }

    setEditingAccount(null);
    setAccountForm({
      accountNumber: "",
      broker: "",
      server: "",
      platform: "MT5",
      nickname: "",
      sectionId: "",
      accountTypeId: "",
    });

    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) {
        alert("Error al actualizar la cuenta.");
        await fetchStructure();
      }
    } catch (error) {
      console.error("Error updating account:", error);
      await fetchStructure();
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;

    const backup = sections.find((s) => s.id === deletingSectionId);
    setSections((prev) => prev.filter((s) => s.id !== deletingSectionId));
    if (backup)
      setUnsectionedAccounts((prev) => [
        ...prev,
        ...backup.accounts.map((a) => ({ ...a, sectionId: null })),
      ]);
    setSelectedSection("all");
    setDeletingSectionId(null);

    try {
      await fetch(`/api/sections/${deletingSectionId}`, { method: "DELETE", credentials: "include" });
    } catch (error) {
      console.error("Error deleting section:", error);
      await fetchStructure();
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccountId) return;

    setSections((prev) =>
      prev.map((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== deletingAccountId) }))
    );
    setUnsectionedAccounts((prev) => prev.filter((a) => a.id !== deletingAccountId));
    setDeletingAccountId(null);

    try {
      await fetch(`/api/accounts/${deletingAccountId}`, { method: "DELETE", credentials: "include" });
    } catch (error) {
      console.error("Error deleting account:", error);
      await fetchStructure();
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  const formatCurrency = (value: number, compact = false) => {
    if (compact) {
      if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen">
      {/* === MASSIVE HERO STATS === */}
      <div className="relative mb-8 -mx-3 md:-mx-6 -mt-3 md:-mt-6 px-3 md:px-6 pt-6 pb-8 bg-gradient-to-b from-secondary/50 via-secondary/20 to-transparent">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
                </span>
                <span className="font-medium">Live</span>
                <span className="text-foreground/40">•</span>
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
            <Button
              onClick={() => setShowAccountModal(true)}
              className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Cuenta</span>
            </Button>
          </div>

          {/* Main Stats Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Primary Metrics */}
            <div className="lg:col-span-7 space-y-6">
              {/* Balance Hero */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Balance Total
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground tabular-nums">
                    ${formatCurrency(stats.balance)}
                  </span>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Equity</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    ${formatCurrency(stats.equity)}
                  </p>
                </div>
                <div className="w-px h-12 bg-border hidden sm:block" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">P/L Flotante</p>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-2xl font-semibold tabular-nums",
                      stats.floatingPL >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {stats.floatingPL >= 0 ? "+" : ""}${formatCurrency(stats.floatingPL)}
                    </p>
                    <span className={cn(
                      "text-sm font-medium px-2 py-0.5 rounded-md",
                      stats.floatingPL >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                    )}>
                      {stats.floatingPL >= 0 ? "+" : ""}{stats.balance > 0 ? ((stats.floatingPL / stats.balance) * 100).toFixed(2) : "0.00"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Account Summary Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {/* Total Accounts */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.total}</p>
                <p className="text-xs text-muted-foreground font-medium">Cuentas totales</p>
              </div>

              {/* Connected */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-profit/10 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-profit" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.connected}</p>
                <p className="text-xs text-muted-foreground font-medium">Conectadas</p>
              </div>

              {/* Sections */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{sections.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Secciones</p>
              </div>

              {/* Disconnected */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.total - stats.connected}</p>
                <p className="text-xs text-muted-foreground font-medium">Desconectadas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === FILTER BAR === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Section Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setSelectedSection("all")}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedSection === "all"
                ? "bg-foreground text-background"
                : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            Todas ({allAccounts.length})
          </button>

          {sections.map((section) => {
            const sStats = getSectionStats(section.accounts);
            return (
              <DropdownMenu key={section.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "group shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                      selectedSection === section.id
                        ? "bg-foreground text-background"
                        : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: section.color || "#64748b" }}
                    />
                    <span>{section.name}</span>
                    <span className="opacity-60">({sStats.count})</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => setSelectedSection(section.id)}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setEditingSection(section);
                    setSectionForm({ name: section.name, color: section.color || "#64748b" });
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-loss focus:text-loss"
                    onClick={() => setDeletingSectionId(section.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}

          {unsectionedAccounts.length > 0 && (
            <button
              onClick={() => setSelectedSection("unsectioned")}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedSection === "unsectioned"
                  ? "bg-foreground text-background"
                  : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              Sin sección ({unsectionedAccounts.length})
            </button>
          )}

          <button
            onClick={() => setShowSectionModal(true)}
            className="shrink-0 w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-secondary/80 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* === ACCOUNTS DISPLAY === */}
      {filteredAccounts.length > 0 ? (
        viewMode === "grid" ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredAccounts.map((account) => {
              const data = getAccountData(account);
              const profit = data?.floatingPL || 0;
              const balance = data?.balance || account.balance || 0;
              const equity = data?.equity || account.equity;
              const profitPercent = balance > 0 ? (profit / balance) * 100 : 0;
              const matchedType = accountTypes.find((t) => t.id === account.accountTypeId);
              const typeName = matchedType?.name || account.accountType?.name;
              const typeColor = matchedType?.color || account.accountType?.color || "#64748b";
              const winRate = account.stats?.winRate ?? 0;
              const trades = account.stats?.trades ?? 0;

              return (
                <div
                  key={account.id}
                  onClick={() => navigateToAccount(account.id)}
                  className="group relative bg-card hover:bg-card/80 border border-border hover:border-foreground/20 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                          style={{
                            background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}99 100%)`,
                          }}
                        >
                          {account.broker[0]?.toUpperCase()}
                        </div>
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
                            (liveDataMap[account.id] || account.isConnected) ? "bg-profit" : "bg-muted-foreground/40"
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {account.nickname || `#${account.accountNumber}`}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {account.broker} • {account.platform}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => navigateToAccount(account.id)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyToken(account.connectionToken, e); }}>
                          {copiedToken === account.connectionToken ? <Check className="mr-2 h-4 w-4 text-profit" /> : <Copy className="mr-2 h-4 w-4" />}
                          Copiar token
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditAccount(account); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-loss" onClick={(e) => { e.stopPropagation(); setDeletingAccountId(account.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Type Badge */}
                  {typeName && (
                    <div className="mb-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                      >
                        {typeName}
                      </span>
                    </div>
                  )}

                  {/* Balance */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Balance</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      ${formatCurrency(balance)}
                    </p>
                  </div>

                  {/* P/L */}
                  <div className="flex items-center justify-between py-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      {profit >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-profit" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-loss" />
                      )}
                      <span className={cn("font-semibold tabular-nums", profit >= 0 ? "text-profit" : "text-loss")}>
                        {profit >= 0 ? "+" : ""}${formatCurrency(Math.abs(profit))}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-md",
                        profit >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                      )}
                    >
                      {profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Win Rate</p>
                      <p className={cn("text-sm font-semibold", winRate >= 50 ? "text-profit" : "text-warning")}>{winRate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Trades</p>
                      <p className="text-sm font-semibold text-foreground">{trades}</p>
                    </div>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-secondary/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="col-span-4">Cuenta</div>
              <div className="col-span-2 text-right">Balance</div>
              <div className="col-span-2 text-right">P/L</div>
              <div className="col-span-1 text-center">Win Rate</div>
              <div className="col-span-1 text-center">Trades</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1" />
            </div>
            {filteredAccounts.map((account, i) => {
              const data = getAccountData(account);
              const profit = data?.floatingPL || 0;
              const balance = data?.balance || account.balance || 0;
              const profitPercent = balance > 0 ? (profit / balance) * 100 : 0;
              const matchedType = accountTypes.find((t) => t.id === account.accountTypeId);
              const typeColor = matchedType?.color || account.accountType?.color || "#64748b";
              const winRate = account.stats?.winRate ?? 0;
              const trades = account.stats?.trades ?? 0;

              return (
                <div
                  key={account.id}
                  onClick={() => navigateToAccount(account.id)}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-5 py-4 items-center cursor-pointer hover:bg-secondary/30 transition-colors",
                    i !== filteredAccounts.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}99 100%)` }}
                    >
                      {account.broker[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {account.nickname || `#${account.accountNumber}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.broker}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-foreground tabular-nums">${formatCurrency(balance)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={cn("font-semibold tabular-nums", profit >= 0 ? "text-profit" : "text-loss")}>
                      {profit >= 0 ? "+" : ""}${formatCurrency(Math.abs(profit))}
                    </p>
                    <p className={cn("text-xs", profit >= 0 ? "text-profit/70" : "text-loss/70")}>
                      {profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={cn("font-medium", winRate >= 50 ? "text-profit" : "text-warning")}>{winRate}%</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-foreground">{trades}</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        (liveDataMap[account.id] || account.isConnected) ? "bg-profit" : "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-secondary transition-all">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => navigateToAccount(account.id)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => copyToken(account.connectionToken, e)}>
                          {copiedToken === account.connectionToken ? <Check className="mr-2 h-4 w-4 text-profit" /> : <Copy className="mr-2 h-4 w-4" />}
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
              );
            })}
          </div>
        )
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-secondary/80 flex items-center justify-center mb-6">
            <Layers className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Sin cuentas</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            No hay cuentas en esta sección. Añade tu primera cuenta para comenzar.
          </p>
          <Button onClick={() => setShowAccountModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>
      )}

      {/* === MODALS === */}
      {/* Create Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowAccountModal(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Nueva Cuenta</h2>
                <button onClick={() => setShowAccountModal(false)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateAccount} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-foreground">Nombre (opcional)</Label>
                  <Input className="mt-2 h-11 rounded-xl" placeholder="Mi cuenta principal" value={accountForm.nickname} onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-foreground">Sección</Label>
                  <Select value={accountForm.sectionId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, sectionId: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-xl">
                      <SelectValue placeholder="Sin sección" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin sección</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || "#64748b" }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-foreground">Tipo de Cuenta</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={accountForm.accountTypeId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, accountTypeId: v === "none" ? "" : v })}>
                      <SelectTrigger className="flex-1 h-11 rounded-xl">
                        <SelectValue placeholder="Sin tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin tipo</SelectItem>
                        {accountTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="h-11 w-11 rounded-xl p-0" onClick={() => setShowAccountTypesModal(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Número de cuenta</Label>
                  <Input className="mt-2 h-11 rounded-xl" type="number" placeholder="12345678" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} required />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Plataforma</Label>
                  <Select value={accountForm.platform} onValueChange={(v) => setAccountForm({ ...accountForm, platform: v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MT4">MetaTrader 4</SelectItem>
                      <SelectItem value="MT5">MetaTrader 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Broker</Label>
                  <Input className="mt-2 h-11 rounded-xl" placeholder="ICMarkets" value={accountForm.broker} onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })} required />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Servidor</Label>
                  <Input className="mt-2 h-11 rounded-xl" placeholder="ICMarkets-Demo" value={accountForm.server} onChange={(e) => setAccountForm({ ...accountForm, server: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAccountModal(false)} className="flex-1 h-11 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="flex-1 h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Cuenta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Section Modal */}
      {(showSectionModal || editingSection) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setShowSectionModal(false); setEditingSection(null); }} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{editingSection ? "Editar Sección" : "Nueva Sección"}</h2>
                <button onClick={() => { setShowSectionModal(false); setEditingSection(null); setSectionForm({ name: "", color: "#64748b" }); }} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={editingSection ? handleUpdateSection : handleCreateSection} className="p-6 space-y-5">
              <div>
                <Label className="text-sm font-medium text-foreground">Nombre</Label>
                <Input className="mt-2 h-11 rounded-xl" placeholder="FTMO, Fondeo..." value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} required />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Color</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SECTION_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSectionForm({ ...sectionForm, color: c.value })}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all",
                        sectionForm.color === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-105" : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowSectionModal(false); setEditingSection(null); }} className="flex-1 h-11 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  {editingSection ? "Guardar" : "Crear"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingAccount(null)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Editar Cuenta</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">#{editingAccount.accountNumber}</p>
                </div>
                <button onClick={() => setEditingAccount(null)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateAccount} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-foreground">Nombre</Label>
                  <Input className="mt-2 h-11 rounded-xl" value={accountForm.nickname} onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-foreground">Sección</Label>
                  <Select value={accountForm.sectionId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, sectionId: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-xl">
                      <SelectValue placeholder="Sin sección" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin sección</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || "#64748b" }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-foreground">Tipo de Cuenta</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={accountForm.accountTypeId || "none"} onValueChange={(v) => setAccountForm({ ...accountForm, accountTypeId: v === "none" ? "" : v })}>
                      <SelectTrigger className="flex-1 h-11 rounded-xl">
                        <SelectValue placeholder="Sin tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin tipo</SelectItem>
                        {accountTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="h-11 w-11 rounded-xl p-0" onClick={() => setShowAccountTypesModal(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Broker</Label>
                  <Input className="mt-2 h-11 rounded-xl" value={accountForm.broker} onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })} required />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Servidor</Label>
                  <Input className="mt-2 h-11 rounded-xl" value={accountForm.server} onChange={(e) => setAccountForm({ ...accountForm, server: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setDeletingAccountId(editingAccount.id)} className="text-loss hover:bg-loss/10 hover:text-loss rounded-xl">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={() => setEditingAccount(null)} className="h-11 px-6 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="h-11 px-6 rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Types Modal */}
      {showAccountTypesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setShowAccountTypesModal(false); setEditingAccountType(null); }} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Tipos de Cuenta</h2>
                <button onClick={() => { setShowAccountTypesModal(false); setEditingAccountType(null); }} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 rounded-2xl bg-secondary/50">
                <Label className="text-sm font-medium text-foreground mb-3 block">Nuevo tipo</Label>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="Ej: Fondeada, Demo..." value={newAccountTypeName} onChange={(e) => setNewAccountTypeName(e.target.value)} className="h-10 rounded-xl flex-1" />
                </div>
                <div className="flex gap-2 flex-wrap mb-4">
                  {SECTION_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewAccountTypeColor(c.value)}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all",
                        newAccountTypeColor === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-105" : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <Button type="button" onClick={handleCreateAccountType} disabled={!newAccountTypeName.trim()} className="w-full h-10 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {accountTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin tipos creados</p>
                )}
                {accountTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    {editingAccountType?.id === type.id ? (
                      <>
                        <div className="flex gap-1">
                          {SECTION_COLORS.slice(0, 6).map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditingAccountType({ ...editingAccountType, color: c.value })}
                              className={cn("w-5 h-5 rounded-md border-2 transition-all", editingAccountType.color === c.value ? "border-foreground" : "border-transparent")}
                              style={{ backgroundColor: c.value }}
                            />
                          ))}
                        </div>
                        <Input value={editingAccountType.name} onChange={(e) => setEditingAccountType({ ...editingAccountType, name: e.target.value })} className="h-8 text-sm flex-1 rounded-lg" autoFocus />
                        <Button size="sm" variant="ghost" onClick={handleUpdateAccountType} className="h-8 w-8 p-0 rounded-lg">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingAccountType(null)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="w-5 h-5 rounded-md shrink-0" style={{ backgroundColor: type.color }} />
                        <span className="text-sm text-foreground flex-1 font-medium">{type.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditingAccountType(type)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => handleDeleteAccountType(type.id, e)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-loss">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowAccountTypesModal(false)} className="w-full h-10 rounded-xl">
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialogs */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={(open) => !open && setDeletingSectionId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sección?</AlertDialogTitle>
            <AlertDialogDescription>Las cuentas pasarán a "Sin sección".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingAccountId} onOpenChange={(open) => !open && setDeletingAccountId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán todos los datos asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
