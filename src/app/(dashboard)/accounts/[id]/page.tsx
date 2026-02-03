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

import { CalendarPnL } from "@/components/CalendarPnL";
import { CreateEADialog } from "@/components/CreateEADialog";
import { EAStatsCard } from "@/components/EAStatsCard";
import { AccountHeader } from "@/components/AccountHeader";
import { AccountStatsGrid } from "@/components/AccountStatsGrid";
import { AccountHistoryTab } from "@/components/AccountHistoryTab";
import { AlertsDialog } from "@/components/AlertsDialog";
import { AccountPageSkeleton } from "@/components/skeletons/AccountPageSkeleton";
import { PositionCharts } from "@/components/PositionCharts";


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
  magicNumber: number;
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
  const [alerts, setAlerts] = useState<any[]>([]); // TODO: Type this properly
  // Removed local state for Create EA dialog to optimize re-renders
  
  const [activeTab, setActiveTab] = useState("overview");
  const [positionsPage, setPositionsPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [closingTickets, setClosingTickets] = useState<Set<number>>(new Set());
  const [closingAll, setClosingAll] = useState(false);
  const [positionsPerPage, setPositionsPerPage] = useState(0);
  const [chartRange, setChartRange] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccount();
      fetchTrades();
      fetchTrades();
      fetchEAs();
      fetchAlerts();
    }
  }, [session?.user?.id, accountId]);



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

  const fetchAlerts = async () => {
      try {
          const res = await fetch(`/api/accounts/${accountId}/alerts`)
          if (res.ok) {
              const data = await res.json()
              setAlerts(data)
          }
      } catch (error) {
          console.error("Error fetching alerts:", error)
      }
  }

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
          
         return t.magicNumber === ea.magicNumber;
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
              // El EA ya envía el trade cerrado via /ea/trade-closed
              // No es necesario sincronizar todo el historial
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
              // El EA envía cada trade cerrado individualmente
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


  // Datos para gráfico de Balance Diario (Calculado hacia atrás desde el balance actual)
  const dailyBalanceHistory = useMemo(() => {
    if (!allTrades || allTrades.length === 0) return [];

    // 1. Agrupar trades por día y sumar PnL (profit + swap + commission)
    const pnlByDay: Record<string, number> = {};
    // Usamos un mapa para ordenar fechas correctamente
    allTrades.forEach(t => {
      const dateStr = new Date(t.closeTime).toISOString().split('T')[0]; // YYYY-MM-DD
      const pnl = t.profit + t.swap + t.commission;
      pnlByDay[dateStr] = (pnlByDay[dateStr] || 0) + pnl;
    });

    // 2. Obtener fechas ordenadas descendente (más reciente primero) para restar del balance actual
    const sortedDatesDesc = Object.keys(pnlByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    // 3. Crear puntos de historia { date, balance }
    // Empezamos con el balance actual como el punto final (hoy/ahora)
    const historyPoints = [];
    let runningBalance = currentBalance;

    // El último punto es hoy con el balance actual
    // (Opcional: Si queremos que el gráfico termine EXACTAMENTE en el último trade, 
    // pero usualmente 'currentBalance' es lo más preciso "ahora mismo")
    // historyPoints.push({ date: new Date().toISOString().split('T')[0], balance: runningBalance });

    // Iteramos hacia atrás: El balance del día anterior = Balance Final del día actual - PnL del día actual
    for (const dateStr of sortedDatesDesc) {
      // Guardamos el punto final de este día
      historyPoints.push({ 
        date: dateStr, 
        balance: runningBalance,
        displayDate: new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      });

      // Restamos el PnL de este día para obtener el balance al inicio del día (o final del anterior)
      runningBalance -= pnlByDay[dateStr];
    }

    // 4. Agregar el punto de "Capital Inicial" (Día antes del primer trade)
    if (sortedDatesDesc.length > 0) {
        const oldestDate = new Date(sortedDatesDesc[sortedDatesDesc.length - 1]);
        oldestDate.setDate(oldestDate.getDate() - 1);
        const initialDateStr = oldestDate.toISOString().split('T')[0];
        
        historyPoints.push({
            date: initialDateStr,
            balance: runningBalance,
            displayDate: oldestDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
        });
    }

    // 5. Invertimos para tener orden ascendente
    const fullHistory = historyPoints.reverse();

    // 6. Filtrar según chartRange y asegurar punto de inicio correcto
    const now = new Date();
    let startDate = new Date(0); // Default ALL

    if (chartRange === "1W") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (chartRange === "1M") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (chartRange === "3M") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (chartRange === "YTD") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Encontrar el primer punto dentro del rango
    const startIndex = fullHistory.findIndex(p => new Date(p.date) >= startDate);
    
    if (startIndex === -1) return []; // No hay datos en el rango
    
    // Si el rango empieza después del histórico completo (startIndex > 0),
    // necesitamos añadir un punto artificial al inicio del rango con el balance que tenía
    // en ese momento (que es el balance del punto anterior en el histórico completo).
    if (startIndex > 0) {
        const startBalance = fullHistory[startIndex - 1].balance;
        const syntheticStart = {
            date: startDate.toISOString().split('T')[0],
            displayDate: startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            balance: startBalance
        };
        return [syntheticStart, ...fullHistory.slice(startIndex)];
    }

    return fullHistory;
  }, [allTrades, currentBalance, chartRange]);



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
    return <AccountPageSkeleton />;
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
        actions={<AlertsDialog accountId={accountId} alerts={alerts} />}
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
          {/* Equity Curve + Radar Chart */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Equity Curve (2 columns) */}
            <Card className="border-border bg-card lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Curva de Balance</CardTitle>
                    <CardDescription>Crecimiento de la cuenta</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg">
                    {(["1W", "1M", "3M", "YTD", "ALL"] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setChartRange(range)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all",
                          chartRange === range
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyBalanceHistory}>
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis 
                        dataKey="displayDate" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        minTickGap={30}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} 
                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} 
                        domain={['auto', 'auto']} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                        formatter={(value: number | undefined) => [`$${(value || 0).toLocaleString("en-US", {minimumFractionDigits: 2})}`, "Balance"]}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="var(--chart-1)" 
                        strokeWidth={2} 
                        fill="url(#balanceGradient)" 
                        name="Balance" 
                        animationDuration={500}
                      />
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

          {/* Calendar View */}
          <CalendarPnL trades={allTrades} />
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          {/* Real-time Charts for Open Positions */}
          {positions.length > 0 && (
            <PositionCharts accountId={accountId} positions={positions} />
          )}
          
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
            <AccountHistoryTab trades={allTrades} />
        </TabsContent>

        {/* EAs Content */}
        <TabsContent value="eas" className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
                <div>
                   <h3 className="text-lg font-semibold flex items-center gap-2">
                       <Bot className="h-5 w-5 text-primary" />
                       Expert Advisors
                   </h3>
                   <p className="text-sm text-muted-foreground">Gestiona tus EAs y monitorea su rendimiento individual por Magic Number.</p>
                </div>
                
                <CreateEADialog accountId={accountId} onSuccess={handleEAAdded} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eas.map(ea => {
                    const stats = statsByEA[ea.id] || { totalTrades: 0, profit: 0, winRate: 0 };
                    
                    const eaPositions = liveData?.positions?.filter((p: any) => p.magic_number == ea.magicNumber) || [];
                    
                    return (
                        <EAStatsCard 
                            key={ea.id} 
                            ea={ea} 
                            accountId={accountId} 
                            stats={stats} 
                            eaPositions={eaPositions} 
                            onDelete={deleteEA} 
                        />
                    );
                })}
                
                {eas.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg text-muted-foreground">
                        <Bot className="h-10 w-10 mb-2 opacity-50" />
                        <p>No tienes EAs registrados.</p>
                        <p className="text-sm">Añade uno para ver sus estadísticas por separado.</p>
                    </div>
                )}
            </div>
        </TabsContent>

        
      </Tabs>
    </div>
  );
}
