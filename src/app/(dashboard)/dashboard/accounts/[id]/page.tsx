"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Copy,
  Check,
  Loader2,
  BarChart3,
  History,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Percent,
  Target,
  Scale,
  RefreshCw,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  open_price: number;
  current_price: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  open_time: number;
  comment?: string;
}

interface Trade {
  id: string;
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  swap: number;
  commission: number;
  openTime: string;
  closeTime: string;
  comment?: string | null;
}

interface AccountInfo {
  number: number;
  broker: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level: number;
  server: string;
  leverage?: number;
  currency?: string;
}

interface AccountData {
  id: string;
  accountNumber: number;
  broker: string;
  server: string;
  platform: string;
  nickname: string | null;
  isConnected: boolean;
  lastSeen: string | null;
  connectionToken: string;
}

type TabType = "stats" | "positions" | "history";

export default function AccountPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountData | null>(null);
  const [liveData, setLiveData] = useState<{
    account: AccountInfo;
    positions: Position[];
  } | null>(null);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [equityHistory, setEquityHistory] = useState<
    { time: string; equity: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);
  
  // Tabs y paginación
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [positionsPage, setPositionsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  
  // Opciones de paginación (0 = mostrar todos)
  const [historyPerPage, setHistoryPerPage] = useState(0);
  const [positionsPerPage, setPositionsPerPage] = useState(0);
  
  // Filtros del historial
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccount();
      fetchTrades();
    }
  }, [session?.user?.id, accountId]);

  // Reset de página cuando cambian filtros (antes de returns condicionales)
  useEffect(() => { setHistoryPage(1); }, [periodFilter, dateFrom, dateTo, symbolFilter, typeFilter, historyPerPage]);

  // Polling para datos en vivo
  useEffect(() => {
    if (!accountId) return;

    const fetchLiveData = async () => {
      try {
        const res = await fetch(`/api/accounts/${accountId}/live`);
        const data = await res.json();
        
        if (data.connected && data.data) {
          setLiveData(data.data);
          setIsLive(true);
          
          setEquityHistory((prev) => {
            const newPoint = {
              time: new Date().toLocaleTimeString(),
              equity: data.data.account.equity,
            };
            if (prev.length > 0 && prev[prev.length - 1].equity === newPoint.equity) {
              return prev;
            }
            return [...prev, newPoint].slice(-30);
          });
        } else {
          setIsLive(false);
        }
      } catch (error) {
        console.error("Error fetching live data:", error);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 200);
    return () => clearInterval(interval);
  }, [accountId]);

  // Polling para historial de trades (cada 1 segundo)
  useEffect(() => {
    if (!accountId) return;

    const fetchTradesPolling = async () => {
      try {
        const res = await fetch(`/api/accounts/${accountId}/trades?limit=100`);
        const data = await res.json();
        setAllTrades(data);
      } catch (error) {
        console.error("Error fetching trades:", error);
      }
    };

    fetchTradesPolling();
    const interval = setInterval(fetchTradesPolling, 1000);
    return () => clearInterval(interval);
  }, [accountId]);

  const fetchAccount = async () => {
    try {
      const res = await fetch(`/api/users/${session?.user?.id}/accounts`);
      const accounts = await res.json();
      const acc = accounts.find((a: AccountData) => a.id === accountId);
      if (acc) setAccount(acc);
    } catch (error) {
      console.error("Error fetching account:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/trades?limit=100`);
      const data = await res.json();
      setAllTrades(data);
    } catch (error) {
      console.error("Error fetching trades:", error);
    }
  };

  const copyToken = () => {
    if (!account) return;
    
    const text = account.connectionToken;

    // Intentar usar la API moderna (requiere HTTPS o localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedToken(true);
          setTimeout(() => setCopiedToken(false), 2000);
        })
        .catch((err) => {
          console.warn("Clipboard API failed, trying fallback...", err);
          fallbackCopy(text);
        });
    } else {
      // Fallback para HTTP (execCommand)
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Asegurar que no sea visible ni afecte el layout
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else {
        alert("No se pudo copiar. Por favor selecciona y copia manualmente.");
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
      alert("Error al copiar. Por favor selecciona y copia manualmente.");
    }
  };

  const syncHistory = async () => {
    if (!isLive) {
      alert("El EA debe estar conectado para sincronizar el historial");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/sync-history`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Esperar unos segundos para que el EA envíe los datos y luego refrescar
        setTimeout(() => {
          fetchTrades();
          setSyncing(false);
        }, 5000);
      } else {
        alert("Error al sincronizar: " + data.error);
        setSyncing(false);
      }
    } catch (error) {
      console.error("Error syncing history:", error);
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-zinc-400">Cuenta no encontrada</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-emerald-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  // Cálculos de estadísticas
  const floatingPL = liveData ? liveData.account.equity - liveData.account.balance : 0;
  const totalTrades = allTrades.length;
  const winningTrades = allTrades.filter(t => t.profit + t.swap + t.commission > 0).length;
  const losingTrades = allTrades.filter(t => t.profit + t.swap + t.commission < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalProfit = allTrades.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);
  const avgWin = winningTrades > 0 
    ? allTrades.filter(t => t.profit + t.swap + t.commission > 0).reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0) / winningTrades 
    : 0;
  const avgLoss = losingTrades > 0 
    ? Math.abs(allTrades.filter(t => t.profit + t.swap + t.commission < 0).reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0) / losingTrades)
    : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
  const positions = liveData?.positions || [];

  // Filtrar trades según filtros seleccionados
  const filteredTrades = allTrades.filter(trade => {
    // Filtro por tipo
    if (typeFilter !== "all" && trade.type !== typeFilter) return false;
    
    // Filtro por símbolo
    if (symbolFilter && !trade.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) return false;
    
    // Filtro por período
    const tradeDate = new Date(trade.closeTime);
    const now = new Date();
    
    if (periodFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (tradeDate < today) return false;
    } else if (periodFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (tradeDate < weekAgo) return false;
    } else if (periodFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (tradeDate < monthAgo) return false;
    } else if (periodFilter === "custom") {
      if (dateFrom && tradeDate < dateFrom) return false;
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (tradeDate > endOfDay) return false;
      }
    }
    
    return true;
  });

  // Calcular totales de trades filtrados
  const filteredTotalProfit = filteredTrades.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);
  const filteredWinning = filteredTrades.filter(t => t.profit + t.swap + t.commission > 0).length;
  const filteredLosing = filteredTrades.filter(t => t.profit + t.swap + t.commission < 0).length;

  // Obtener símbolos únicos para el filtro
  const uniqueSymbols = [...new Set(allTrades.map(t => t.symbol))].sort();

  // Paginación con opciones dinámicas
  const effectiveHistoryPerPage = historyPerPage === 0 ? filteredTrades.length : historyPerPage;
  const effectivePositionsPerPage = positionsPerPage === 0 ? positions.length : positionsPerPage;
  
  const totalPositionPages = effectivePositionsPerPage > 0 ? Math.ceil(positions.length / effectivePositionsPerPage) : 1;
  const totalHistoryPages = effectiveHistoryPerPage > 0 ? Math.ceil(filteredTrades.length / effectiveHistoryPerPage) : 1;
  
  const paginatedPositions = positionsPerPage === 0 
    ? positions 
    : positions.slice((positionsPage - 1) * positionsPerPage, positionsPage * positionsPerPage);
  const paginatedTrades = historyPerPage === 0 
    ? filteredTrades 
    : filteredTrades.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

  const tabs = [
    { id: "stats" as TabType, label: "Estadísticas", icon: BarChart3 },
    { id: "positions" as TabType, label: `Abiertas (${positions.length})`, icon: Briefcase },
    { id: "history" as TabType, label: `Historial (${allTrades.length})`, icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Header con Token */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mt-1 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {account.nickname || `Cuenta ${account.accountNumber}`}
              </h1>
              <div
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isLive
                    ? "bg-green-500/10 text-green-400"
                    : "bg-zinc-500/10 text-zinc-400"
                }`}
              >
                {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isLive ? "Online" : "Offline"}
              </div>
            </div>
            <p className="text-sm text-zinc-400 sm:text-base">
              {account.broker} • {account.platform}
            </p>
          </div>
        </div>
        
        {/* Token compacto y botón sync */}
        <div className="ml-12 flex items-center gap-2 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={syncHistory}
            disabled={syncing || !isLive}
            className="border-zinc-700 text-zinc-300 hover:text-white"
            title="Sincronizar historial de trades"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2">
            <span className="text-xs text-zinc-400">Token:</span>
            <code className="font-mono text-xs text-emerald-400">
              {account.connectionToken.slice(0, 8)}...
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToken}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
            >
              {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-900 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
              activeTab === tab.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Contenido de Tabs */}
      <>
        {/* Tab: Estadísticas */}
        {activeTab === "stats" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Grid - Solo cuando hay datos en vivo */}
            {liveData ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Balance</p>
                        <p className="text-xl font-bold text-white">
                          ${liveData.account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                        <DollarSign className="h-4 w-4 text-cyan-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Equidad</p>
                        <p className="text-xl font-bold text-white">
                          ${liveData.account.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Activity className="h-4 w-4 text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">P/L Flotante</p>
                        <p className={`text-xl font-bold ${floatingPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {floatingPL >= 0 ? "+" : ""}${floatingPL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${floatingPL >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        {floatingPL >= 0 ? <TrendingUp className="h-4 w-4 text-green-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Margen Libre</p>
                        <p className="text-xl font-bold text-white">
                          ${liveData.account.free_margin.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                        <Activity className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-zinc-800 bg-zinc-900/50 border-dashed">
                <CardContent className="flex items-center gap-3 p-4">
                  <WifiOff className="h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm text-zinc-400">Datos en tiempo real no disponibles</p>
                    <p className="text-xs text-zinc-500">Conecta el EA para ver balance, equidad y margen actual</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats adicionales - siempre visibles basados en historial */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Win Rate</p>
                        <p className="text-xl font-bold text-white">{winRate.toFixed(1)}%</p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                        <Percent className="h-4 w-4 text-amber-400" />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{winningTrades}W / {losingTrades}L</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Profit Factor</p>
                        <p className="text-xl font-bold text-white">{profitFactor.toFixed(2)}</p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                        <Scale className="h-4 w-4 text-blue-400" />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Ratio Win/Loss</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Total P/L (Cerrado)</p>
                        <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
                        </p>
                      </div>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${totalProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        <Target className="h-4 w-4 text-green-400" />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{totalTrades} trades</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Apalancamiento</p>
                        <p className="text-xl font-bold text-white">1:{liveData?.account?.leverage || 100}</p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
                        <Activity className="h-4 w-4 text-rose-400" />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{liveData?.account?.currency || "USD"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Promedios */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <p className="text-xs text-zinc-400">Promedio Ganador</p>
                    <p className="text-2xl font-bold text-green-400">+${avgWin.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-3 sm:p-5">
                    <p className="text-xs text-zinc-400">Promedio Perdedor</p>
                    <p className="text-2xl font-bold text-red-400">-${avgLoss.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos de estadísticas */}
              {allTrades.length > 0 && (
                <>
                  {/* Fila 1: Profit Acumulado y Win/Loss Pie */}
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {/* Gráfico de Profit Acumulado */}
                    <Card className="border-zinc-800 bg-zinc-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">Curva de Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={(() => {
                              let cumulative = 0;
                              return [...allTrades].reverse().map((t, i) => {
                                cumulative += t.profit + t.swap + t.commission;
                                return { trade: i + 1, profit: cumulative };
                              });
                            })()}>
                              <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis dataKey="trade" stroke="#71717a" fontSize={10} tickLine={false} label={{ value: 'Trade #', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 10 }} />
                              <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} labelStyle={{ color: "#a1a1aa" }} itemStyle={{ color: "#e4e4e7" }} formatter={(v) => [`$${(v as number)?.toFixed(2) || 0}`, "Profit Acumulado"]} />
                              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Win/Loss Visual Stats */}
                    <Card className="border-zinc-800 bg-zinc-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">Distribución Win/Loss</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex h-52 flex-col justify-center space-y-4">
                          {/* Win Rate Visual */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-green-400">Ganadores ({winningTrades})</span>
                              <span className="font-mono text-white">{winRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${winRate}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Loss Rate Visual */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-red-400">Perdedores ({losingTrades})</span>
                              <span className="font-mono text-white">{(100 - winRate).toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                                style={{ width: `${100 - winRate}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Summary */}
                          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                            <div className="text-center">
                              <p className="text-xl font-bold text-white">{totalTrades}</p>
                              <p className="text-xs text-zinc-400">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-green-400">{winningTrades}</p>
                              <p className="text-xs text-zinc-400">Ganados</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-red-400">{losingTrades}</p>
                              <p className="text-xs text-zinc-400">Perdidos</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Fila 2: Profit por Símbolo (Barras) */}
                  <Card className="border-zinc-800 bg-zinc-900">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white">Profit por Símbolo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={(() => {
                            const bySymbol: Record<string, { profit: number; trades: number }> = {};
                            allTrades.forEach((t) => {
                              const pl = t.profit + t.swap + t.commission;
                              if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { profit: 0, trades: 0 };
                              bySymbol[t.symbol].profit += pl;
                              bySymbol[t.symbol].trades += 1;
                            });
                            return Object.entries(bySymbol)
                              .map(([symbol, data]) => ({ symbol, ...data }))
                              .sort((a, b) => b.profit - a.profit);
                          })()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="symbol" stroke="#71717a" fontSize={10} tickLine={false} />
                            <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip 
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} 
                              labelStyle={{ color: "#a1a1aa" }}
                              itemStyle={{ color: "#e4e4e7" }}
                              formatter={(v, name) => [name === 'profit' ? `$${(v as number).toFixed(2)}` : v, name === 'profit' ? 'Profit' : 'Trades']}
                            />
                            <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]}>
                              {(() => {
                                const bySymbol: Record<string, number> = {};
                                allTrades.forEach((t) => {
                                  const pl = t.profit + t.swap + t.commission;
                                  bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + pl;
                                });
                                return Object.values(bySymbol).map((profit, i) => (
                                  <Cell key={i} fill={profit >= 0 ? '#22c55e' : '#ef4444'} />
                                ));
                              })()}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fila 3: Trades por día y Profit por hora */}
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {/* Trades por día de la semana */}
                    <Card className="border-zinc-800 bg-zinc-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">Trades por Día</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(() => {
                              const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                              const byDay: Record<number, { trades: number; profit: number }> = {};
                              for (let i = 0; i < 7; i++) byDay[i] = { trades: 0, profit: 0 };
                              allTrades.forEach((t) => {
                                const day = new Date(t.closeTime).getDay();
                                byDay[day].trades += 1;
                                byDay[day].profit += t.profit + t.swap + t.commission;
                              });
                              return days.map((name, i) => ({ day: name, ...byDay[i] }));
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
                              <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} labelStyle={{ color: "#a1a1aa" }} itemStyle={{ color: "#e4e4e7" }} />
                              <Bar dataKey="trades" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Trades" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Profit por tipo (Long/Short) */}
                    <Card className="border-zinc-800 bg-zinc-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">Long vs Short</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex h-48 flex-col justify-center space-y-4">
                          {(() => {
                            let buyProfit = 0, sellProfit = 0, buyTrades = 0, sellTrades = 0;
                            allTrades.forEach((t) => {
                              const pl = t.profit + t.swap + t.commission;
                              if (t.type === 'buy') { buyProfit += pl; buyTrades++; }
                              else { sellProfit += pl; sellTrades++; }
                            });
                            return (
                              <>
                                {/* Long */}
                                <div className="rounded-lg bg-zinc-800/50 p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="h-3 w-3 rounded-full bg-green-500" />
                                      <span className="text-sm font-medium text-white">Long (Buy)</span>
                                      <span className="text-xs text-zinc-400">({buyTrades} trades)</span>
                                    </div>
                                    <span className={`font-mono font-bold ${buyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {buyProfit >= 0 ? '+' : ''}${buyProfit.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Short */}
                                <div className="rounded-lg bg-zinc-800/50 p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="h-3 w-3 rounded-full bg-red-500" />
                                      <span className="text-sm font-medium text-white">Short (Sell)</span>
                                      <span className="text-xs text-zinc-400">({sellTrades} trades)</span>
                                    </div>
                                    <span className={`font-mono font-bold ${sellProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {sellProfit >= 0 ? '+' : ''}${sellProfit.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Comparison bar */}
                                <div className="pt-2">
                                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-800">
                                    <div 
                                      className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                                      style={{ width: `${totalTrades > 0 ? (buyTrades / totalTrades) * 100 : 50}%` }}
                                    />
                                    <div 
                                      className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                                      style={{ width: `${totalTrades > 0 ? (sellTrades / totalTrades) * 100 : 50}%` }}
                                    />
                                  </div>
                                  <div className="mt-1 flex justify-between text-xs text-zinc-400">
                                    <span>{totalTrades > 0 ? ((buyTrades / totalTrades) * 100).toFixed(0) : 0}% Long</span>
                                    <span>{totalTrades > 0 ? ((sellTrades / totalTrades) * 100).toFixed(0) : 0}% Short</span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Fila 4: Mejores y Peores Trades */}
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <Card className="border-zinc-800 bg-zinc-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">🏆 Mejores Trades</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[...allTrades]
                            .map(t => ({ ...t, pl: t.profit + t.swap + t.commission }))
                            .sort((a, b) => b.pl - a.pl)
                            .slice(0, 5)
                            .map((t, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-400">#{i + 1}</span>
                                  <span className="font-medium text-white">{t.symbol}</span>
                                  <span className={`text-xs ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type.toUpperCase()}
                                  </span>
                                </div>
                                <span className={`font-mono font-medium ${t.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pl >= 0 ? '+' : ''}${t.pl.toFixed(2)}</span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">💀 Peores Trades</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[...allTrades]
                            .map(t => ({ ...t, pl: t.profit + t.swap + t.commission }))
                            .sort((a, b) => a.pl - b.pl)
                            .slice(0, 5)
                            .map((t, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-400">#{i + 1}</span>
                                  <span className="font-medium text-white">{t.symbol}</span>
                                  <span className={`text-xs ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type.toUpperCase()}
                                  </span>
                                </div>
                                <span className={`font-mono font-medium ${t.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pl >= 0 ? '+' : ''}${t.pl.toFixed(2)}</span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Posiciones Abiertas */}
          {activeTab === "positions" && (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-0">
                {positions.length === 0 ? (
                  <p className="py-16 text-center text-zinc-400">No hay posiciones abiertas</p>
                ) : (
                  <>
                    {/* Header con botón cerrar todas */}
                    <div className="flex items-center justify-between border-b border-zinc-800 p-3 sm:p-4">
                      <span className="text-xs sm:text-sm text-zinc-400">
                        {positions.length} posición(es) abierta(s)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                        onClick={async () => {
                          if (confirm("¿Cerrar TODAS las posiciones?")) {
                            await fetch(`/api/accounts/${accountId}/close-all`, { method: "POST" });
                          }
                        }}
                      >
                        Cerrar Todas
                      </Button>
                    </div>
                    
                    {/* Vista móvil: tarjetas */}
                    <div className="block md:hidden divide-y divide-zinc-800">
                      {paginatedPositions.map((p) => (
                        <div key={p.ticket} className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{p.symbol}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.type === "buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                {p.type.toUpperCase()}
                              </span>
                              <span className="text-xs text-zinc-400">{p.volume} lots</span>
                            </div>
                            <span className={`font-mono font-bold ${p.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="space-x-2 text-zinc-400">
                              <span>Open: <span className="font-mono text-zinc-300">{p.open_price.toFixed(5)}</span></span>
                              <span>→</span>
                              <span className="font-mono text-zinc-300">{p.current_price.toFixed(5)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              onClick={async () => {
                                await fetch(`/api/accounts/${accountId}/close-trade`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ ticket: p.ticket }),
                                });
                              }}
                            >
                              Cerrar
                            </Button>
                          </div>
                          {(p.sl > 0 || p.tp > 0) && (
                            <div className="flex gap-4 text-xs text-zinc-500">
                              {p.sl > 0 && <span>SL: {p.sl.toFixed(5)}</span>}
                              {p.tp > 0 && <span>TP: {p.tp.toFixed(5)}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Vista desktop: tabla */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                            <th className="p-4 font-medium">Ticket</th>
                            <th className="p-4 font-medium">Hora</th>
                            <th className="p-4 font-medium">Símbolo</th>
                            <th className="p-4 font-medium">Tipo</th>
                            <th className="p-4 font-medium">Volumen</th>
                            <th className="p-4 font-medium">Apertura</th>
                            <th className="p-4 font-medium">Actual</th>
                            <th className="p-4 font-medium">SL</th>
                            <th className="p-4 font-medium">TP</th>
                            <th className="p-4 font-medium">Swap</th>
                            <th className="p-4 font-medium">Comisión</th>
                            <th className="p-4 font-medium text-right">Profit</th>
                            <th className="p-4 font-medium">Comentario</th>
                            <th className="p-4 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPositions.map((p) => (
                            <tr key={p.ticket} className="border-b border-zinc-800/50 text-sm">
                              <td className="p-4 font-mono text-white">{p.ticket}</td>
                              <td className="p-4 text-zinc-400 text-xs">
                                {new Date(p.open_time).toLocaleDateString()} <br />
                                {new Date(p.open_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-4 font-medium text-white">{p.symbol}</td>
                              <td className="p-4">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.type === "buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                  {p.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-4 text-white">{p.volume}</td>
                              <td className="p-4 font-mono text-zinc-300">{p.open_price.toFixed(5)}</td>
                              <td className="p-4 font-mono text-zinc-300">{p.current_price.toFixed(5)}</td>
                              <td className="p-4 font-mono text-zinc-400">{p.sl > 0 ? p.sl.toFixed(5) : "-"}</td>
                              <td className="p-4 font-mono text-zinc-400">{p.tp > 0 ? p.tp.toFixed(5) : "-"}</td>
                              <td className="p-4 font-mono text-zinc-400">${p.swap.toFixed(2)}</td>
                              <td className="p-4 font-mono text-zinc-400">${p.commission.toFixed(2)}</td>
                              <td className={`p-4 text-right font-medium ${p.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                              </td>
                              <td className="p-4 text-xs text-zinc-500 max-w-[150px] truncate" title={p.comment}>
                                {p.comment || "-"}
                              </td>
                              <td className="p-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  onClick={async () => {
                                    await fetch(`/api/accounts/${accountId}/close-trade`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ ticket: p.ticket }),
                                    });
                                  }}
                                >
                                  Cerrar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Paginación */}
                    {totalPositionPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-800 p-3 sm:p-4">
                        <span className="text-xs sm:text-sm text-zinc-400">
                          Página {positionsPage} de {totalPositionPages}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPositionsPage(p => Math.max(1, p - 1))} disabled={positionsPage === 1} className="border-zinc-700">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPositionsPage(p => Math.min(totalPositionPages, p + 1))} disabled={positionsPage === totalPositionPages} className="border-zinc-700">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Historial */}
          {activeTab === "history" && (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-0">
                {/* Filtros */}
                <div className="border-b border-zinc-800 p-4 space-y-3">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Período */}
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Período</label>
                      <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}>
                        <SelectTrigger className="h-9 w-[140px] border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-800">
                          <SelectItem value="all">Todo</SelectItem>
                          <SelectItem value="today">Hoy</SelectItem>
                          <SelectItem value="week">Última semana</SelectItem>
                          <SelectItem value="month">Último mes</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Fechas personalizadas */}
                    {periodFilter === "custom" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400">Desde</label>
                          <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="Inicio" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400">Hasta</label>
                          <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="Fin" />
                        </div>
                      </>
                    )}
                    
                    {/* Símbolo */}
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Símbolo</label>
                      <Select value={symbolFilter || "all"} onValueChange={(v) => setSymbolFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-9 w-[130px] border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-800">
                          <SelectItem value="all">Todos</SelectItem>
                          {uniqueSymbols.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Tipo */}
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Tipo</label>
                      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                        <SelectTrigger className="h-9 w-[100px] border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-800">
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="buy">Buy</SelectItem>
                          <SelectItem value="sell">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Paginación */}
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Mostrar</label>
                      <Select value={String(historyPerPage)} onValueChange={(v) => setHistoryPerPage(Number(v))}>
                        <SelectTrigger className="h-9 w-[90px] border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-800">
                          <SelectItem value="0">Todos</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Resumen de filtro */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-zinc-400">
                      <span className="text-white font-medium">{filteredTrades.length}</span> operaciones
                      {filteredTrades.length !== allTrades.length && ` (de ${allTrades.length})`}
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-400">
                      Ganadas: <span className="text-green-400 font-medium">{filteredWinning}</span>
                    </span>
                    <span className="text-zinc-400">
                      Perdidas: <span className="text-red-400 font-medium">{filteredLosing}</span>
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className={`font-bold ${filteredTotalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      Total: {filteredTotalProfit >= 0 ? "+" : ""}${filteredTotalProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {filteredTrades.length === 0 ? (
                  <p className="py-16 text-center text-zinc-400">No hay trades con los filtros seleccionados</p>
                ) : (
                  <>
                    {/* Vista móvil: tarjetas */}
                    <div className="block md:hidden divide-y divide-zinc-800">
                      {paginatedTrades.map((t) => {
                        const pl = t.profit + t.swap + t.commission;
                        return (
                          <div key={t.id} className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{t.symbol}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.type === "buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                  {t.type.toUpperCase()}
                                </span>
                                <span className="text-xs text-zinc-400">{t.volume} lots</span>
                              </div>
                              <span className={`font-mono font-bold ${pl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span>{new Date(t.closeTime).toLocaleDateString()}</span>
                              <span className="font-mono">{t.openPrice.toFixed(5)} → {t.closePrice.toFixed(5)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Vista desktop: tabla */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                            <th className="p-4 font-medium">Ticket</th>
                            <th className="p-4 font-medium">Apertura</th>
                            <th className="p-4 font-medium">Cierre</th>
                            <th className="p-4 font-medium">Símbolo</th>
                            <th className="p-4 font-medium">Tipo</th>
                            <th className="p-4 font-medium">Volumen</th>
                            <th className="p-4 font-medium">Precio Open</th>
                            <th className="p-4 font-medium">Precio Close</th>
                            <th className="p-4 font-medium">Swap</th>
                            <th className="p-4 font-medium">Comisión</th>
                            <th className="p-4 font-medium text-right">Profit</th>
                            <th className="p-4 font-medium">Comentario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTrades.map((t) => {
                            const pl = t.profit + t.swap + t.commission;
                            return (
                              <tr key={t.id} className="border-b border-zinc-800/50 text-sm">
                                <td className="p-4 font-mono text-white">{t.ticket}</td>
                                <td className="p-4 text-zinc-400 text-xs">
                                  {new Date(t.openTime).toLocaleDateString()} <br />
                                  {new Date(t.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-4 text-zinc-400 text-xs">
                                  {new Date(t.closeTime).toLocaleDateString()} <br />
                                  {new Date(t.closeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-4 font-medium text-white">{t.symbol}</td>
                                <td className="p-4">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.type === "buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                    {t.type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-4 text-white">{t.volume}</td>
                                <td className="p-4 font-mono text-zinc-300">{t.openPrice.toFixed(5)}</td>
                                <td className="p-4 font-mono text-zinc-300">{t.closePrice.toFixed(5)}</td>
                                <td className="p-4 font-mono text-zinc-400">${t.swap.toFixed(2)}</td>
                                <td className="p-4 font-mono text-zinc-400">${t.commission.toFixed(2)}</td>
                                <td className={`p-4 text-right font-medium ${pl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                                </td>
                                <td className="p-4 text-xs text-zinc-500 max-w-[150px] truncate" title={t.comment || ""}>
                                  {t.comment || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Paginación */}
                    {totalHistoryPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-800 p-3 sm:p-4">
                        <span className="text-xs sm:text-sm text-zinc-400">
                          Página {historyPage} de {totalHistoryPages}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="border-zinc-700">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="border-zinc-700">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
    </div>
  );
}
