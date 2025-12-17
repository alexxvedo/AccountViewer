"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Plus,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Copy,
  Check,
  Loader2,
  X,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit,
} from "lucide-react";

interface LiveData {
  balance: number;
  equity: number;
  floatingPL: number;
  lastUpdate: number;
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
  liveData: LiveData | null; // Datos iniciales (snapshot)
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [sections, setSections] = useState<Section[]>([]);
  const [unsectionedAccounts, setUnsectionedAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [liveDataMap, setLiveDataMap] = useState<LiveDataMap>({});
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  // Form state
  const [accountForm, setAccountForm] = useState({
    accountNumber: "",
    broker: "",
    server: "",
    platform: "MT5",
    nickname: "",
    sectionId: "",
  });
  const [sectionForm, setSectionForm] = useState({ name: "", color: "#10b981" });
  const [formLoading, setFormLoading] = useState(false);

  // 1. Loop Estructura (Lento - 5s)
  useEffect(() => {
    if (session?.user?.id) {
      fetchStructure();
      const interval = setInterval(fetchStructure, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  // 2. Loop Valores Rápidos (Rápido - 200ms)
  useEffect(() => {
    if (session?.user?.id) {
      const fetchFastLive = async () => {
        try {
          const res = await fetch(`/api/users/${session.user.id}/fast-live`);
          const data = await res.json();
          setLiveDataMap(data);
        } catch (error) {
           console.error("Fast poll error", error);
        }
      };
      
      fetchFastLive();
      const interval = setInterval(fetchFastLive, 200);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  const fetchStructure = async () => {
    if (!session?.user?.id) return;
    try {
      const [sectionsRes, accountsRes] = await Promise.all([
        fetch(`/api/users/${session.user.id}/sections`, { cache: "no-store" }),
        fetch(`/api/users/${session.user.id}/accounts-live`, { cache: "no-store" }),
      ]);
      const sectionsData = await sectionsRes.json();
      const accountsData = await accountsRes.json();
      
      setSections(sectionsData);
      setUnsectionedAccounts(accountsData.filter((a: TradingAccount) => !a.sectionId));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales
  const allAccounts = [...sections.flatMap(s => s.accounts), ...unsectionedAccounts];
  
  // Helper para obtener datos (Fast Map > Initial Live Data > 0)
  const getAccountData = (acc: TradingAccount) => {
    const fastData = liveDataMap[acc.id];
    if (fastData) return fastData;
    return acc.liveData;
  };

  const totalBalance = allAccounts
    .filter(a => a.isConnected || liveDataMap[a.id]) // Si está en el mapa, está conectado
    .reduce((sum, a) => sum + (getAccountData(a)?.balance || 0), 0);
  const totalFloatingPL = allAccounts
    .filter(a => a.isConnected || liveDataMap[a.id])
    .reduce((sum, a) => sum + (getAccountData(a)?.floatingPL || 0), 0);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setFormLoading(true);
    try {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          accountNumber: parseInt(accountForm.accountNumber),
          broker: accountForm.broker,
          server: accountForm.server,
          platform: accountForm.platform,
          nickname: accountForm.nickname || null,
          sectionId: accountForm.sectionId || null,
        }),
      });
      setShowAccountModal(false);
      setAccountForm({ accountNumber: "", broker: "", server: "", platform: "MT5", nickname: "", sectionId: "" });
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
    setFormLoading(true);
    try {
      await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          name: sectionForm.name,
          color: sectionForm.color,
        }),
      });
      setShowSectionModal(false);
      setSectionForm({ name: "", color: "#10b981" });
      fetchStructure();
    } catch (error) {
      console.error("Error creating section:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setFormLoading(true);
    try {
      await fetch(`/api/sections/${editingSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionForm.name, color: sectionForm.color }),
      });
      setEditingSection(null);
      setSectionForm({ name: "", color: "#10b981" });
      fetchStructure();
    } catch (error) {
      console.error("Error updating section:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setFormLoading(true);
    try {
      await fetch(`/api/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: accountForm.nickname,
          broker: accountForm.broker,
          server: accountForm.server,
          platform: accountForm.platform,
          sectionId: accountForm.sectionId || null,
        }),
      });
      setEditingAccount(null);
      setAccountForm({ accountNumber: "", broker: "", server: "", platform: "MT5", nickname: "", sectionId: "" });
      fetchStructure();
    } catch (error) {
      console.error("Error updating account:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;
    try {
      const res = await fetch(`/api/sections/${deletingSectionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      fetchStructure();
    } catch (error) {
      console.error("Error deleting section:", error);
    } finally {
      setDeletingSectionId(null);
    }
  };

  const copyToken = (token: string) => {
    const text = token;
    // Fallback para HTTP
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedToken(token);
          setTimeout(() => setCopiedToken(null), 2000);
        })
        .catch(() => fallbackCopy(text, token));
    } else {
      fallbackCopy(text, token);
    }
  };

  const fallbackCopy = (text: string, token: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      alert("No se pudo copiar. Token: " + text);
    }
    document.body.removeChild(textArea);
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calcular stats de sección
  const getSectionStats = (accounts: TradingAccount[]) => {
    const connected = accounts.filter(a => a.isConnected || liveDataMap[a.id]);
    return {
      balance: connected.reduce((s, a) => s + (getAccountData(a)?.balance || 0), 0),
      floatingPL: connected.reduce((s, a) => s + (getAccountData(a)?.floatingPL || 0), 0),
      connectedCount: connected.length,
    };
  };

  const AccountCard = ({ account }: { account: TradingAccount }) => (
    <Link href={`/dashboard/accounts/${account.id}`}>
      <Card className="cursor-pointer border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:bg-zinc-800/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base text-white">
                {account.nickname || `Cuenta ${account.accountNumber}`}
              </CardTitle>
              <button
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation();
                  setEditingAccount(account);
                  setAccountForm({ 
                    accountNumber: String(account.accountNumber),
                    broker: account.broker,
                    server: account.server,
                    platform: account.platform,
                    nickname: account.nickname || "",
                    sectionId: account.sectionId || "",
                  });
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              account.isConnected ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400"
            }`}>
              {account.isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {account.isConnected ? "Online" : "Offline"}
            </div>
          </div>
          <CardDescription className="text-xs text-zinc-500">
            {account.broker} • {account.platform} • #{account.accountNumber}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(account.isConnected || liveDataMap[account.id]) && getAccountData(account) ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-zinc-800/50 p-2 text-center">
                <p className="text-xs text-zinc-400">Balance</p>
                <p className="text-sm font-bold text-white">
                  ${getAccountData(account)!.balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-800/50 p-2 text-center">
                <p className="text-xs text-zinc-400">Equity</p>
                <p className="text-sm font-bold text-white">
                  ${getAccountData(account)!.equity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-800/50 p-2 text-center">
                <p className="text-xs text-zinc-400">P/L</p>
                <p className={`text-sm font-bold ${(getAccountData(account)!.floatingPL || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {(getAccountData(account)!.floatingPL || 0) >= 0 ? "+" : ""}${(getAccountData(account)!.floatingPL || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-zinc-800/30 p-3 text-center">
              <p className="text-xs text-zinc-500">Sin datos en vivo</p>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-2">
            <span className="text-xs text-zinc-400">Token</span>
            <button
              onClick={(e) => { e.preventDefault(); copyToken(account.connectionToken); }}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              {copiedToken === account.connectionToken ? (
                <><Check className="h-3 w-3" />Copiado</>
              ) : (
                <><Copy className="h-3 w-3" />Copiar</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Gestiona y monitorea tus cuentas de trading</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSectionModal(true)}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Nueva Sección
          </Button>
          <Button
            onClick={() => setShowAccountModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Cuentas Totales</p>
                <p className="text-2xl font-bold text-white">{allAccounts.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Conectadas</p>
                <p className="text-2xl font-bold text-white">{allAccounts.filter(a => a.isConnected).length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Wifi className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Balance Total</p>
                <p className="text-2xl font-bold text-white">${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 0 })}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <DollarSign className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">P/L Flotante</p>
                <p className={`text-2xl font-bold ${totalFloatingPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalFloatingPL >= 0 ? "+" : ""}${totalFloatingPL.toFixed(2)}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${totalFloatingPL >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {totalFloatingPL >= 0 ? <TrendingUp className="h-5 w-5 text-green-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const stats = getSectionStats(section.accounts);
        const isCollapsed = collapsedSections.has(section.id);
        
        return (
          <div key={section.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-2 text-lg font-semibold text-white hover:text-zinc-300"
              >
                {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                <span style={{ color: section.color || undefined }}>{section.name}</span>
                <span className="text-sm font-normal text-zinc-500">({section.accounts.length} cuentas)</span>
              </button>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-zinc-400">Balance: <span className="font-medium text-white">${stats.balance.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span></span>
                  <span className="text-zinc-400">P/L: <span className={`font-medium ${stats.floatingPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stats.floatingPL >= 0 ? "+" : ""}${stats.floatingPL.toFixed(2)}
                  </span></span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingSection(section); setSectionForm({ name: section.name, color: section.color || "#10b981" }); }}
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingSectionId(section.id)}
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            {!isCollapsed && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
                {section.accounts.length === 0 && (
                  <p className="col-span-full py-8 text-center text-zinc-500">Sin cuentas en esta sección</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unsectioned Accounts */}
      {unsectionedAccounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-400">Sin sección</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unsectionedAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allAccounts.length === 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-12 w-12 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-white">No hay cuentas</h3>
            <p className="mt-2 text-sm text-zinc-400">Añade tu primera cuenta de trading para comenzar</p>
            <Button
              onClick={() => setShowAccountModal(true)}
              className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Cuenta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Nueva Cuenta</CardTitle>
                <button onClick={() => setShowAccountModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleCreateAccount}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Sección (opcional)</Label>
                  <select
                    value={accountForm.sectionId}
                    onChange={(e) => setAccountForm({ ...accountForm, sectionId: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Sin sección</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Nombre (opcional)</Label>
                  <Input placeholder="Mi cuenta principal" value={accountForm.nickname} onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })} className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Número de Cuenta</Label>
                    <Input type="number" placeholder="12345678" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Plataforma</Label>
                    <select value={accountForm.platform} onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value })} className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
                      <option value="MT4">MetaTrader 4</option>
                      <option value="MT5">MetaTrader 5</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Broker</Label>
                  <Input placeholder="ICMarkets" value={accountForm.broker} onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Servidor</Label>
                  <Input placeholder="ICMarkets-Demo" value={accountForm.server} onChange={(e) => setAccountForm({ ...accountForm, server: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
              </CardContent>
              <div className="flex gap-3 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setShowAccountModal(false)} className="flex-1 border-zinc-700 text-zinc-300">Cancelar</Button>
                <Button type="submit" disabled={formLoading} className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Section Modal */}
      {(showSectionModal || editingSection) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{editingSection ? "Editar Sección" : "Nueva Sección"}</CardTitle>
                <button onClick={() => { setShowSectionModal(false); setEditingSection(null); setSectionForm({ name: "", color: "#10b981" }); }} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={editingSection ? handleUpdateSection : handleCreateSection}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Nombre</Label>
                  <Input placeholder="FTMO, AXI, The Trading PIT..." value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Color</Label>
                  <div className="flex gap-2">
                    {["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"].map(c => (
                      <button key={c} type="button" onClick={() => setSectionForm({ ...sectionForm, color: c })}
                        className={`h-8 w-8 rounded-full border-2 ${sectionForm.color === c ? "border-white" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
              <div className="flex gap-3 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => { setShowSectionModal(false); setEditingSection(null); }} className="flex-1 border-zinc-700 text-zinc-300">Cancelar</Button>
                <Button type="submit" disabled={formLoading} className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingSection ? "Guardar" : "Crear")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Editar Cuenta</CardTitle>
                <button onClick={() => { setEditingAccount(null); }} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleUpdateAccount}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Sección (opcional)</Label>
                  <select
                    value={accountForm.sectionId}
                    onChange={(e) => setAccountForm({ ...accountForm, sectionId: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Sin sección</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Nombre (opcional)</Label>
                  <Input placeholder="Mi cuenta principal" value={accountForm.nickname} onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })} className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Número de Cuenta</Label>
                    <Input type="number" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Plataforma</Label>
                    <select value={accountForm.platform} onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value })} className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
                      <option value="MT4">MetaTrader 4</option>
                      <option value="MT5">MetaTrader 5</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Broker</Label>
                  <Input value={accountForm.broker} onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Servidor</Label>
                  <Input value={accountForm.server} onChange={(e) => setAccountForm({ ...accountForm, server: e.target.value })} required className="border-zinc-700 bg-zinc-800 text-white" />
                </div>
              </CardContent>
              <div className="flex gap-3 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setEditingAccount(null)} className="flex-1 border-zinc-700 text-zinc-300">Cancelar</Button>
                <Button type="submit" disabled={formLoading} className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Section Confirmation Modal */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={(open) => !open && setDeletingSectionId(null)}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar sección?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Las cuentas de esta sección pasarán a estar en "Sin sección".
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
