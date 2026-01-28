"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Percent,
  Target,
  Scale,
  RefreshCw,
  PieChart as PieChartIcon,
  X,
  AlertTriangle,
  Timer,
  Flame,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Bot,
  ArrowUpRight,
  Zap
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

import { AccountHeader } from "@/components/AccountHeader";
import { AccountStatsGrid } from "@/components/AccountStatsGrid";
import { AccountOverviewTab } from "@/components/AccountOverviewTab";
import { AccountEAsTab } from "@/components/AccountEAsTab";

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

interface ExpertAdvisor {
  id: string;
  name: string;
  magicNumber: number;
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
  balance?: number;
  equity?: number;
  margin?: number;
  free_margin?: number;
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
  const [eas, setEas] = useState<ExpertAdvisor[]>([]);
  // Removed local state for Create EA dialog to optimize re-renders
  
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
  const [chartRange, setChartRange] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccount();
      fetchTrades();
      fetchEAs();
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
          // Optimization: Check if data actually changed significantly to avoid re-renders
          setLiveData(prev => {
              // Deep compare or simple JSON stringify for small objects
              if (prev && JSON.stringify(prev) === JSON.stringify(data.data)) {
                  return prev;
              }
              return data.data;
          });
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
        
        // Optimización: Solo actualizar si hay cambios
        setAllTrades(prev => {
          if (data.length !== prev.length) return data;
          // Simple check for last element if sorted by time, or check first if sorted desc
          // Assuming data comes sorted by time usually
          if (data.length > 0 && prev.length > 0) {
             const lastData = data[data.length - 1];
             const lastPrev = prev[prev.length - 1];
             if (lastData.ticket !== lastPrev.ticket) return data;
             // Check first element too just in case sorting fits
             const firstData = data[0];
             const firstPrev = prev[0];
             if (firstData.ticket !== firstPrev.ticket) return data;
          }
          return prev;
        });
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

  const fetchEAs = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/eas`);
      if (res.ok) {
        const data = await res.json();
        setEas(data);
      }
    } catch (error) {
      console.error("Error fetching EAs:", error);
    }
  };

  const handleEAAdded = useCallback((newEA: ExpertAdvisor) => {
    setEas(prev => [newEA, ...prev]);
  }, []);

  const deleteEA = async (id: string) => {
    if (!confirm("¿Eliminar este EA?")) return;
    try {
      const res = await fetch(`/api/eas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEas(prev => prev.filter(ea => ea.id !== id));
      }
    } catch (error) {
      console.error("Error deleting EA:", error);
    }
  };

  const statsByEA = useMemo(() => {
    const stats: Record<string, any> = {};
    
    eas.forEach(ea => {
      // Filtrar trades por magic number. IMPORTANTE: trade.magicNumber puede ser null, hay que manejarlo
      const eaTrades = allTrades.filter(t => {
         // Asegurar comparacion correcta. magicNumber en trade puede venir como string o number si no está tipado estricto en runtime
         // En la interfaz Trade definimos magicNumber como optional? No lo veo en la interfaz Trade arriba
         // Voy a asumir que debemos extender la interfaz Trade o castearlo.
         // Revisando fetchTrades: devuelve TradeHistory, schema dice magicNumber Int?
         const tMagic = (t as any).magicNumber; 
         return tMagic == ea.magicNumber;
      });

      const totalTrades = eaTrades.length;
      const profit = eaTrades.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);
      const wins = eaTrades.filter(t => t.profit + t.swap + t.commission > 0).length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      stats[ea.id] = { totalTrades, profit, winRate };
    });
    return stats;
  }, [eas, allTrades]);

  const copyToken = useCallback(() => {
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
  }, [account]);

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

  const syncHistory = useCallback(async (silent = false) => {
    // Permitir sincronizar aunque no esté live si tenemos token
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
  }, [accountId]);

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
  
  // Usar datos live o fallback a stored account data
  const currentBalance = liveData?.account.balance ?? account?.balance ?? 0;
  const currentEquity = liveData?.account.equity ?? account?.equity ?? 0;
  const currentFreeMargin = liveData?.account.free_margin ?? 0; // Stored data might not have free margin easily unless snapshotted
  
  const floatingPL = liveData ? liveData.account.equity - liveData.account.balance : (currentEquity - currentBalance);

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




  if (loading) {
    return (
      <div className="flex min-h-100vh items-center justify-center">
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
      <AccountHeader 
        account={account} 
        isLive={isLive} 
        syncing={syncing} 
        copiedToken={copiedToken} 
        onCopyToken={copyToken} 
        onSync={() => syncHistory()} 
      />

      {/* Quick Stats Cards (Redesigned) */}
      <AccountStatsGrid 
        liveData={liveData}
        floatingPL={floatingPL}
        currentBalance={currentBalance}
        currentEquity={currentEquity}
        totalProfit={totalProfit}
        totalTrades={totalTrades}
        winRate={winRate}
        winningTrades={winningTrades}
        losingTrades={losingTrades}
        profitFactor={profitFactor}
        expectancy={expectancy}
        currentFreeMargin={currentFreeMargin}
      />

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
          <TabsTrigger value="eas" className="data-[state=active]:bg-card">
            <Bot className="mr-2 h-4 w-4" />
             EAs ({eas.length})
          </TabsTrigger>
          
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <AccountOverviewTab 
            allTrades={allTrades}
            currentBalance={currentBalance}
            profitFactor={profitFactor}
            expectancy={expectancy}
            avgWin={avgWin}
            avgLoss={avgLoss}
            totalTrades={totalTrades}
          />
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
            <CardContent className="h-[425px] flex flex-col p-0">
              {positions.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  No hay posiciones abiertas
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent min-h-full">
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

        {/* EAs Content */}
        <TabsContent value="eas" className="space-y-4">
            <AccountEAsTab 
              accountId={accountId as string}
              eas={eas}
              liveData={liveData}
              statsByEA={statsByEA}
              onEAAdded={handleEAAdded}
              onDeleteEA={deleteEA}
            />
        </TabsContent>

        
      </Tabs>
    </div>
  );
}
