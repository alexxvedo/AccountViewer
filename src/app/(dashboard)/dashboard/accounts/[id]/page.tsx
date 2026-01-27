"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CardDescription,
} from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  CircleDot,
  ChevronLeft,
  ChevronRight,
  Percent,
  Target,
  Scale,
  RefreshCw,
  PieChart as PieChartIcon,
  X,
  AlertTriangle,
  Timer,
  Flame,
  Download
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { cn } from "@/lib/utils";

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

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

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
  const [equityHistory, setEquityHistory] = useState<{ time: string; equity: number; balance: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [positionsPage, setPositionsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [closingTickets, setClosingTickets] = useState<Set<number>>(new Set());
  const [closingAll, setClosingAll] = useState(false);
  
  const [historyPerPage, setHistoryPerPage] = useState(0);
  const [positionsPerPage, setPositionsPerPage] = useState(0);
  
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");
  const [historyResultFilter, setHistoryResultFilter] = useState<"all" | "win" | "loss">("all");

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccount();
      fetchTrades();
    }
  }, [session?.user?.id, accountId]);

  useEffect(() => { setHistoryPage(1); }, [periodFilter, dateFrom, dateTo, symbolFilter, typeFilter, historyPerPage, historyResultFilter]);

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
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              equity: data.data.account.equity,
              balance: data.data.account.balance,
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
    const interval = setInterval(fetchLiveData, 1000);
    return () => clearInterval(interval);
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;

    const fetchTradesPolling = async () => {
      try {
        const res = await fetch(`/api/accounts/${accountId}/trades?limit=100000`);
        const data = await res.json();
        setAllTrades(data);
      } catch (error) {
        console.error("Error fetching trades:", error);
      }
    };

    fetchTradesPolling();
    const interval = setInterval(fetchTradesPolling, 30000);
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
      const res = await fetch(`/api/accounts/${accountId}/trades?limit=100000`);
      const data = await res.json();
      setAllTrades(data);
    } catch (error) {
      console.error("Error fetching trades:", error);
    }
  };

  const copyToken = () => {
    if (!account) return;
    const text = account.connectionToken;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.cssText = "top:0;left:0;position:fixed;opacity:0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
  };

  const syncHistory = async (silent = false) => {
    if (!isLive) return;
    if (!silent) setSyncing(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/sync-history`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Si es silencioso o no, damos un tiempo para que el EA procese y luego actualizamos
        setTimeout(() => { 
          fetchTrades(); 
          if (!silent) setSyncing(false); 
        }, 3000);
      } else {
        if (!silent) setSyncing(false);
      }
    } catch (error) {
      console.error("Error syncing history:", error);
      if (!silent) setSyncing(false);
    }
  };

  const closePosition = async (ticket: number) => {
    // Marcar como cerrándose
    setClosingTickets(prev => new Set(prev).add(ticket));
    
    try {
      const res = await fetch(`/api/accounts/${accountId}/close-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Polling más rápido temporalmente para detectar el cierre
        const checkClosed = setInterval(async () => {
          const liveRes = await fetch(`/api/accounts/${accountId}/live`);
          const liveData = await liveRes.json();
          if (liveData.connected && liveData.data) {
            const stillOpen = liveData.data.positions.some((p: Position) => p.ticket === ticket);
            if (!stillOpen) {
              setClosingTickets(prev => {
                const newSet = new Set(prev);
                newSet.delete(ticket);
                return newSet;
              });
              setLiveData(liveData.data);
              // Forzar sincronización de historial
              syncHistory(true);
              fetchTrades();
              clearInterval(checkClosed);
            }
          }
        }, 500);
        
        // Timeout después de 10 segundos
        setTimeout(() => {
          clearInterval(checkClosed);
          setClosingTickets(prev => {
            const newSet = new Set(prev);
            newSet.delete(ticket);
            return newSet;
          });
        }, 10000);
      }
    } catch (error) {
      console.error("Error closing position:", error);
      setClosingTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticket);
        return newSet;
      });
    }
  };

  const closeAllPositions = async () => {
    
    setClosingAll(true);
    
    try {
      const res = await fetch(`/api/accounts/${accountId}/close-all`, { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        // Polling más rápido para detectar que todas se cerraron
        const checkClosed = setInterval(async () => {
          const liveRes = await fetch(`/api/accounts/${accountId}/live`);
          const liveData = await liveRes.json();
          if (liveData.connected && liveData.data) {
            if (liveData.data.positions.length === 0) {
              setClosingAll(false);
              setLiveData(liveData.data);
              // Forzar sincronización de historial
              syncHistory(true);
              fetchTrades();
              clearInterval(checkClosed);
            }
          }
        }, 500);
        
        // Timeout después de 15 segundos
        setTimeout(() => {
          clearInterval(checkClosed);
          setClosingAll(false);
        }, 15000);
      }
    } catch (error) {
      console.error("Error closing all positions:", error);
      setClosingAll(false);
    }
  };

  // Cálculos Memoizados para Rendimiento (Movidos al inicio para evitar violación de reglas de Hooks)
  const stats = useMemo(() => {
    const totalTrades = allTrades.length;
    const winningTrades = allTrades.filter(t => t.profit + t.swap + t.commission > 0).length;
    const losingTrades = allTrades.filter(t => t.profit + t.swap + t.commission < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalProfit = allTrades.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);
    
    const winTradesList = allTrades.filter(t => t.profit + t.swap + t.commission > 0);
    const lossTradesList = allTrades.filter(t => t.profit + t.swap + t.commission < 0);
    
    const avgWin = winningTrades > 0 
      ? winTradesList.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0) / winningTrades 
      : 0;
    const avgLoss = losingTrades > 0 
      ? Math.abs(lossTradesList.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0) / losingTrades)
      : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    const expectancy = totalTrades > 0 ? totalProfit / totalTrades : 0;

    return { totalTrades, winningTrades, losingTrades, winRate, totalProfit, avgWin, avgLoss, profitFactor, expectancy };
  }, [allTrades]);

  const { totalTrades, winningTrades, losingTrades, winRate, totalProfit, avgWin, avgLoss, profitFactor, expectancy } = stats;

  const positions = liveData?.positions || [];
  const totalFloatingPL = useMemo(() => positions.reduce((sum: number, pos: Position) => sum + pos.profit, 0), [positions]);
  const floatingPL = liveData ? liveData.account.equity - liveData.account.balance : 0;

  // Filtrar trades (Memoizado)
  const filteredTrades = useMemo(() => {
    return allTrades.filter((trade: Trade) => {
      const pl = trade.profit + trade.swap + trade.commission;
      if (historyResultFilter === "win" && pl <= 0) return false;
      if (historyResultFilter === "loss" && pl >= 0) return false;
      if (typeFilter !== "all" && trade.type !== typeFilter) return false;
      if (symbolFilter && !trade.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) return false;
      
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
  }, [allTrades, historyResultFilter, typeFilter, symbolFilter, periodFilter, dateFrom, dateTo]);

  const filteredTotalProfit = useMemo(() => filteredTrades.reduce((sum: number, t: Trade) => sum + t.profit + t.swap + t.commission, 0), [filteredTrades]);
  const filteredWinning = useMemo(() => filteredTrades.filter((t: Trade) => t.profit + t.swap + t.commission > 0).length, [filteredTrades]);
  const filteredLosing = useMemo(() => filteredTrades.filter((t: Trade) => t.profit + t.swap + t.commission < 0).length, [filteredTrades]);
  
  const uniqueSymbols = useMemo(() => [...new Set(allTrades.map((t: Trade) => t.symbol))].sort(), [allTrades]);

  // Paginación
  const effectiveHistoryPerPage = historyPerPage === 0 ? filteredTrades.length : historyPerPage;
  const totalHistoryPages = effectiveHistoryPerPage > 0 ? Math.ceil(filteredTrades.length / effectiveHistoryPerPage) : 1;
  const paginatedTrades = useMemo(() => 
    historyPerPage === 0 ? filteredTrades : filteredTrades.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage),
    [filteredTrades, historyPage, historyPerPage]
  );

  const effectivePositionsPerPage = positionsPerPage === 0 ? positions.length : positionsPerPage;
  const totalPositionPages = effectivePositionsPerPage > 0 ? Math.ceil(positions.length / effectivePositionsPerPage) : 1;
  const paginatedPositions = useMemo(() => 
    positionsPerPage === 0 ? positions : positions.slice((positionsPage - 1) * positionsPerPage, positionsPage * positionsPerPage),
    [positions, positionsPage, positionsPerPage]
  );

  // Datos para gráficos (Memoizados)
  const symbolDistribution = useMemo(() => {
    const bySymbol: Record<string, { profit: number; trades: number }> = {};
    allTrades.forEach((t: Trade) => {
      const pl = t.profit + t.swap + t.commission;
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { profit: 0, trades: 0 };
      bySymbol[t.symbol].profit += pl;
      bySymbol[t.symbol].trades += 1;
    });
    const totalCount = Object.values(bySymbol).reduce((sum: number, d: any) => sum + d.trades, 0);
    return Object.entries(bySymbol)
      .map(([name, data]) => ({ name, value: totalCount > 0 ? Math.round((data.trades / totalCount) * 100) : 0, ...data }))
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 5);
  }, [allTrades]);

  const dailyPnL = useMemo(() => {
    const byDay: Record<string, { pnl: number; trades: number }> = {};
    allTrades.forEach((t: Trade) => {
      const day = new Date(t.closeTime).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const pl = t.profit + t.swap + t.commission;
      if (!byDay[day]) byDay[day] = { pnl: 0, trades: 0 };
      byDay[day].pnl += pl;
      byDay[day].trades += 1;
    });
    return Object.entries(byDay).map(([date, data]) => ({ date, ...data })).slice(-8);
  }, [allTrades]);

  const profitCurveData = useMemo(() => {
    let cumulative = 0;
    return [...allTrades].reverse().map((t: Trade, i: number) => {
      cumulative += t.profit + t.swap + t.commission;
      return { trade: i + 1, profit: cumulative };
    });
  }, [allTrades]);

  const longTrades = useMemo(() => allTrades.filter((t: Trade) => t.type === "buy"), [allTrades]);
  const shortTrades = useMemo(() => allTrades.filter((t: Trade) => t.type === "sell"), [allTrades]);
  
  const longWinRate = useMemo(() => {
    const wins = longTrades.filter(t => t.profit + t.swap + t.commission > 0).length;
    return longTrades.length > 0 ? (wins / longTrades.length) * 100 : 0;
  }, [longTrades]);

  const shortWinRate = useMemo(() => {
    const wins = shortTrades.filter(t => t.profit + t.swap + t.commission > 0).length;
    return shortTrades.length > 0 ? (wins / shortTrades.length) * 100 : 0;
  }, [shortTrades]);

  // Rachas
  const streaks = useMemo(() => {
    let maxWins = 0, maxLosses = 0, currentWins = 0, currentLosses = 0;
    [...allTrades].reverse().forEach(t => {
      const pl = t.profit + t.swap + t.commission;
      if (pl > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else if (pl < 0) {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    });
    return { maxWins, maxLosses };
  }, [allTrades]);

  const { maxWins, maxLosses } = streaks;

  // Radar data para perfil de trading
  const radarData = useMemo(() => [
    { metric: "Win Rate", value: Math.min(winRate, 100), fullMark: 100 },
    { metric: "Profit Factor", value: Math.min(profitFactor * 25, 100), fullMark: 100 },
    { metric: "Risk/Reward", value: avgLoss > 0 ? Math.min((avgWin / avgLoss) * 30, 100) : 50, fullMark: 100 },
    { metric: "Consistencia", value: totalTrades > 5 ? Math.min(60 + (profitFactor * 10), 100) : 0, fullMark: 100 },
    { metric: "Disciplina", value: totalTrades > 0 ? Math.min(70 + winRate * 0.3, 100) : 0, fullMark: 100 },
    { metric: "Drawdown", value: 80, fullMark: 100 },
  ], [winRate, profitFactor, avgWin, avgLoss, totalTrades]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-muted-foreground">Cuenta no encontrada</p>
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mt-4 text-accent">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-xl font-bold text-foreground">
              {account.broker.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {account.nickname || `Cuenta ${account.accountNumber}`}
                </h1>
                <Badge variant="outline" className={cn("border font-medium", isLive ? "bg-profit/20 text-profit border-profit/30" : "bg-muted text-muted-foreground")}>
                  <span className={cn("mr-1.5 h-2 w-2 rounded-full", isLive ? "bg-profit" : "bg-muted-foreground")} />
                  {isLive ? "Conectado" : "Desconectado"}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{account.broker}</span>
                <span className="text-border">|</span>
                <span className="font-mono">{account.accountNumber}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copyToken}>
                  {copiedToken ? <Check className="h-3 w-3 text-profit" /> : <Copy className="h-3 w-3" />}
                </Button>
                <span className="text-border">|</span>
                <span>{account.platform}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => syncHistory()} disabled={syncing || !isLive} className="border-border bg-transparent">
              <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
              Sincronizar
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Balance</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">
              ${liveData?.account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Equity</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">
              ${liveData?.account.equity.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "—"}
            </p>
            {liveData && (
              <p className={cn("text-xs", totalFloatingPL >= 0 ? "text-profit" : "text-loss")}>
                Flotante: {totalFloatingPL >= 0 ? "+" : ""}${totalFloatingPL.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">P/L Cerrado</p>
              {totalProfit >= 0 ? <TrendingUp className="h-4 w-4 text-profit" /> : <TrendingDown className="h-4 w-4 text-loss" />}
            </div>
            <p className={cn("mt-1 text-xl font-bold font-mono", totalProfit >= 0 ? "text-profit" : "text-loss")}>
              {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{totalTrades} trades</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">{winRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{winningTrades}W / {losingTrades}L</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Profit Factor</p>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">{profitFactor === 0 ? "—" : profitFactor.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Margen Libre</p>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">
              ${liveData?.account.free_margin.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-card">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="positions" className="data-[state=active]:bg-card">
            <CircleDot className="mr-2 h-4 w-4" />
            Posiciones ({positions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-card">
            <History className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-card">
            <PieChartIcon className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Equity Curve + Radar Chart */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Equity Curve (2 columns) */}
            <Card className="border-border bg-card lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-foreground">Curva de Equity</CardTitle>
                <CardDescription>Evolución del balance y equity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityHistory.length > 1 ? equityHistory : profitCurveData}>
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey={equityHistory.length > 1 ? "time" : "trade"} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={['dataMin - 100', 'dataMax + 100']} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                      {equityHistory.length > 1 ? (
                        <>
                          <Area type="monotone" dataKey="balance" stroke="var(--chart-1)" strokeWidth={2} fill="url(#balanceGradient)" name="Balance" />
                          <Area type="monotone" dataKey="equity" stroke="var(--chart-3)" strokeWidth={2} fill="url(#equityGradient)" name="Equity" />
                        </>
                      ) : (
                        <Area type="monotone" dataKey="profit" stroke="var(--chart-1)" strokeWidth={2} fill="url(#balanceGradient)" name="Profit" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            
          </div>

          {/* Stats Grid (4 cards) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-foreground">{profitFactor === 0 ? "—" : profitFactor.toFixed(2)}</span>
                  <span className={cn("text-xs", profitFactor >= 1.5 ? "text-profit" : profitFactor >= 1 ? "text-warning" : "text-loss")}>
                    {profitFactor >= 1.5 ? "Excelente" : profitFactor >= 1 ? "Bueno" : "Mejorar"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Avg Win: ${avgWin.toFixed(0)} | Avg Loss: ${avgLoss.toFixed(0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-bold font-mono", expectancy >= 0 ? "text-profit" : "text-loss")}>${expectancy.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">por trade</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Basado en {totalTrades} trades
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rachas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-2xl font-bold font-mono text-profit">{maxWins}</span>
                    <p className="text-xs text-muted-foreground">Wins seguidos</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold font-mono text-loss">{maxLosses}</span>
                    <p className="text-xs text-muted-foreground">Losses seguidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Long vs Short</CardTitle>
                <CardTitle className="text-sm font-medium text-muted-foreground">Winrate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Long ({longTrades.length})</span>
                    <span className="font-mono text-profit">{longWinRate.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Short ({shortTrades.length})</span>
                    <span className="font-mono text-chart-3">{shortWinRate.toFixed(0)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily P&L */}
          {dailyPnL.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">P&L Diario</CardTitle>
                <CardDescription>Rendimiento por día de trading</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyPnL}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} formatter={(v) => [`$${(v as number).toFixed(2)}`, "P&L"]} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {dailyPnL.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "var(--chart-1)" : "var(--destructive)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Posiciones Abiertas</CardTitle>
                  <CardDescription>
                    {positions.length} posiciones | P&L Flotante:{" "}
                    <span className={cn("font-mono font-medium", totalFloatingPL >= 0 ? "text-profit" : "text-loss")}>
                      {totalFloatingPL >= 0 ? "+" : ""}${totalFloatingPL.toFixed(2)}
                    </span>
                  </CardDescription>
                </div>
                {positions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={closingAll}
                        className="border-loss/30 bg-loss/10 text-loss hover:bg-loss/20"
                      >
                        {closingAll ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando...</>
                        ) : (
                          "Cerrar Todas"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro de cerrar todas las posiciones?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción cerrará inmediatamente todas las posiciones abiertas. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={closeAllPositions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sí, cerrar todo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">No hay posiciones abiertas</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Ticket</TableHead>
                        <TableHead className="text-muted-foreground">Símbolo</TableHead>
                        <TableHead className="text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-muted-foreground">Volumen</TableHead>
                        <TableHead className="text-muted-foreground">Apertura</TableHead>
                        <TableHead className="text-muted-foreground">Actual</TableHead>
                        <TableHead className="text-muted-foreground">SL</TableHead>
                        <TableHead className="text-muted-foreground">TP</TableHead>
                        <TableHead className="text-muted-foreground">P&L</TableHead>
                        <TableHead className="text-right text-muted-foreground">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPositions.map((p) => (
                        <TableRow key={p.ticket} className="border-border hover:bg-secondary/50">
                          <TableCell className="font-mono text-sm text-muted-foreground">#{p.ticket}</TableCell>
                          <TableCell className="font-medium text-foreground">{p.symbol}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-medium uppercase", p.type === "buy" ? "bg-profit/20 text-profit border-profit/30" : "bg-loss/20 text-loss border-loss/30")}>
                              {p.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{p.volume}</TableCell>
                          <TableCell className="font-mono">{p.open_price.toFixed(5)}</TableCell>
                          <TableCell className="font-mono">{p.current_price.toFixed(5)}</TableCell>
                          <TableCell className="font-mono text-loss">{p.sl > 0 ? p.sl.toFixed(5) : "—"}</TableCell>
                          <TableCell className="font-mono text-profit">{p.tp > 0 ? p.tp.toFixed(5) : "—"}</TableCell>
                          <TableCell className={cn("font-mono font-medium", p.profit >= 0 ? "text-profit" : "text-loss")}>
                            {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => closePosition(p.ticket)} 
                              disabled={closingTickets.has(p.ticket) || closingAll}
                              className="text-loss hover:text-loss hover:bg-loss/10"
                            >
                              {closingTickets.has(p.ticket) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margin Info */}
          {liveData && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Margen Usado</span>
                    <span className="font-mono font-medium text-foreground">${liveData.account.margin.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Margen Libre</span>
                    <span className="font-mono font-medium text-foreground">${liveData.account.free_margin.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nivel de Margen</span>
                    <span className="font-mono font-medium text-profit">{liveData.account.margin_level.toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-foreground">Historial de Operaciones</CardTitle>
                  <CardDescription>{filteredTrades.length} operaciones</CardDescription>
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        const confirm = window.confirm("¿Solicitar historial completo al EA? Esto forzará una descarga de todos los trades antiguos.");
                        if (!confirm) return;
                        try {
                           const res = await fetch(`/api/accounts/${accountId}/sync-all-history`, { method: "POST" });
                           const json = await res.json();
                           if (json.success) alert("Comando enviado. El historial completo se sincronizará en breve.");
                           else alert("Error: " + json.error);
                        } catch (e) {
                           alert("Error enviando comando");
                        }
                      }}
                      className="mt-2 gap-2 text-xs h-7 border-dashed border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Download className="h-3 w-3" />
                      Sincronizar Todo
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select 
                    value={historyPerPage.toString()} 
                    onValueChange={(v) => { setHistoryPerPage(Number(v)); setHistoryPage(1); }}
                  >
                    <SelectTrigger className="w-[130px] bg-secondary border-border">
                      <SelectValue placeholder="Tratos por pág." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por pág.</SelectItem>
                      <SelectItem value="20">20 por pág.</SelectItem>
                      <SelectItem value="50">50 por pág.</SelectItem>
                      <SelectItem value="100">100 por pág.</SelectItem>
                      <SelectItem value="0">Ver Todos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={historyResultFilter} onValueChange={(v) => setHistoryResultFilter(v as typeof historyResultFilter)}>
                    <SelectTrigger className="w-[130px] bg-secondary border-border">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="win">Ganadoras</SelectItem>
                      <SelectItem value="loss">Perdedoras</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}>
                    <SelectTrigger className="w-[130px] bg-secondary border-border">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo</SelectItem>
                      <SelectItem value="today">Hoy</SelectItem>
                      <SelectItem value="week">7 días</SelectItem>
                      <SelectItem value="month">30 días</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {periodFilter === "custom" && (
                <div className="flex gap-2 mt-2">
                  <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="Desde" />
                  <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="Hasta" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm mt-2">
                <span className="text-muted-foreground">
                  Ganadas: <span className="text-profit font-medium">{filteredWinning}</span>
                </span>
                <span className="text-muted-foreground">
                  Perdidas: <span className="text-loss font-medium">{filteredLosing}</span>
                </span>
                <span className={cn("font-bold", filteredTotalProfit >= 0 ? "text-profit" : "text-loss")}>
                  Total: {filteredTotalProfit >= 0 ? "+" : ""}${filteredTotalProfit.toFixed(2)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTrades.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">No hay trades con los filtros seleccionados</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Ticket</TableHead>
                          <TableHead className="text-muted-foreground">Símbolo</TableHead>
                          <TableHead className="text-muted-foreground">Tipo</TableHead>
                          <TableHead className="text-muted-foreground">Vol.</TableHead>
                          <TableHead className="text-muted-foreground">Apertura</TableHead>
                          <TableHead className="text-muted-foreground">Cierre</TableHead>
                          <TableHead className="text-muted-foreground">Fecha Apertura</TableHead>
                          <TableHead className="text-muted-foreground">Fecha Cierre</TableHead>
                          <TableHead className="text-muted-foreground">P&L</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTrades.map((t) => {
                          const pl = t.profit + t.swap + t.commission;
                          return (
                            <TableRow key={t.id} className="border-border hover:bg-secondary/50">
                              <TableCell className="font-mono text-sm text-muted-foreground">#{t.ticket}</TableCell>
                              <TableCell className="font-medium text-foreground">{t.symbol}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("font-medium uppercase", t.type === "buy" ? "bg-profit/20 text-profit border-profit/30" : "bg-loss/20 text-loss border-loss/30")}>
                                  {t.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono">{t.volume}</TableCell>
                              <TableCell className="font-mono">{t.openPrice.toFixed(5)}</TableCell>
                              <TableCell className="font-mono">{t.closePrice.toFixed(5)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {new Date(t.openTime).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {new Date(t.closeTime).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {pl >= 0 ? <Check className="h-4 w-4 text-profit" /> : <X className="h-4 w-4 text-loss" />}
                                  <span className={cn("font-mono font-medium", pl >= 0 ? "text-profit" : "text-loss")}>
                                    {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {Math.min(filteredTrades.length, (historyPage - 1) * effectiveHistoryPerPage + 1)} - {Math.min(filteredTrades.length, historyPage * effectiveHistoryPerPage)} de {filteredTrades.length} trades
                    </p>

                    {effectiveHistoryPerPage > 0 && totalHistoryPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setHistoryPage(1)} 
                          disabled={historyPage === 1}
                          className="hidden sm:flex"
                        >
                          Primera
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))} 
                          disabled={historyPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" /> Anteriores
                        </Button>
                        
                        <div className="flex items-center gap-1 mx-2">
                          <span className="text-sm font-medium">Página {historyPage}</span>
                          <span className="text-sm text-muted-foreground">de {totalHistoryPages}</span>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} 
                          disabled={historyPage === totalHistoryPages}
                        >
                          Siguientes <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setHistoryPage(totalHistoryPages)} 
                          disabled={historyPage === totalHistoryPages}
                          className="hidden sm:flex"
                        >
                          Última
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Symbol Distribution */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Distribución por Símbolo</CardTitle>
              </CardHeader>
              <CardContent>
                {symbolDistribution.length === 0 ? (
                  <p className="py-16 text-center text-muted-foreground">Sin datos</p>
                ) : (
                  <div className="flex items-center gap-8">
                    <div className="h-[200px] w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={symbolDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="trades">
                            {symbolDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {symbolDistribution.map((symbol, index) => (
                        <div key={symbol.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                            <span className="text-sm text-foreground">{symbol.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm text-foreground">{symbol.trades} trades</span>
                            <span className={cn("ml-2 font-mono text-xs", symbol.profit >= 0 ? "text-profit" : "text-loss")}>
                              {symbol.profit >= 0 ? "+" : ""}${symbol.profit.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Best/Worst Trades */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Mejores y Peores Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-profit mb-2">🏆 Mejores</h4>
                    <div className="space-y-2">
                      {[...allTrades].map(t => ({ ...t, pl: t.profit + t.swap + t.commission })).sort((a, b) => b.pl - a.pl).slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{i + 1}</span>
                            <span className="font-medium text-foreground">{t.symbol}</span>
                          </div>
                          <span className="font-mono font-medium text-profit">+${t.pl.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-loss mb-2">💀 Peores</h4>
                    <div className="space-y-2">
                      {[...allTrades].map(t => ({ ...t, pl: t.profit + t.swap + t.commission })).sort((a, b) => a.pl - b.pl).slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{i + 1}</span>
                            <span className="font-medium text-foreground">{t.symbol}</span>
                          </div>
                          <span className="font-mono font-medium text-loss">${t.pl.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* More Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-profit/20">
                    <TrendingUp className="h-5 w-5 text-profit" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mejor Trade</p>
                    <p className="font-mono font-bold text-profit">
                      +${allTrades.length > 0 ? Math.max(...allTrades.map(t => t.profit + t.swap + t.commission)).toFixed(2) : "0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-loss/20">
                    <TrendingDown className="h-5 w-5 text-loss" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peor Trade</p>
                    <p className="font-mono font-bold text-loss">
                      ${allTrades.length > 0 ? Math.min(...allTrades.map(t => t.profit + t.swap + t.commission)).toFixed(2) : "0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/20">
                    <Timer className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Trades</p>
                    <p className="font-mono font-bold text-foreground">{totalTrades}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                    <Flame className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Apalancamiento</p>
                    <p className="font-mono font-bold text-foreground">1:{liveData?.account?.leverage || 100}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
