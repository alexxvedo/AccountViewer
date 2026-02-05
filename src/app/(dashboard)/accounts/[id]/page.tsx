"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  X,
  Plus,
  Trash2,
  Bot,
  ArrowUpRight,
  Wallet,
  ChartLine,
  Flame,
  Timer,
  TrendingDown as DrawdownIcon,
  Clock,
  Award,
  AlertTriangle,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

import { CalendarPnL } from "@/components/CalendarPnL";
import { CreateEADialog } from "@/components/CreateEADialog";
import { EAStatsCard } from "@/components/EAStatsCard";
import { AccountHistoryTab } from "@/components/AccountHistoryTab";
import { AlertsDialog } from "@/components/AlertsDialog";
import { AccountPageSkeleton } from "@/components/skeletons/AccountPageSkeleton";
import { EditPositionDialog } from "@/components/EditPositionDialog";
import { Pencil } from "lucide-react";


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
  const [alerts, setAlerts] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [positionsPage, setPositionsPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [closingTickets, setClosingTickets] = useState<Set<number>>(new Set());
  const [closingAll, setClosingAll] = useState(false);
  const [positionsPerPage, setPositionsPerPage] = useState(0);
  const [chartRange, setChartRange] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [editingPositionTicket, setEditingPositionTicket] = useState<number | null>(null);

  // Mapa de códigos de error MQL5 a mensajes legibles
  const getMT5ErrorMessage = (code: number): string => {
    const errors: Record<number, string> = {
      10004: "Requote - El precio ha cambiado, intenta de nuevo",
      10006: "Solicitud rechazada por el servidor",
      10007: "Solicitud cancelada por el trader",
      10008: "Orden colocada",
      10009: "Solicitud completada",
      10010: "Solo parte de la solicitud fue completada",
      10011: "Error de proceso de solicitud",
      10012: "Solicitud cancelada por timeout",
      10013: "Solicitud inválida",
      10014: "Volumen inválido en la solicitud",
      10015: "Precio inválido en la solicitud",
      10016: "Stops inválidos en la solicitud",
      10017: "Trading deshabilitado",
      10018: "Mercado cerrado",
      10019: "Fondos insuficientes para completar la operación",
      10020: "Los precios han cambiado",
      10021: "No hay cotizaciones para procesar la solicitud",
      10022: "Fecha de expiración inválida en la solicitud",
      10023: "Estado de la orden ha cambiado",
      10024: "Demasiadas solicitudes, reduce la frecuencia",
      10025: "No hay cambios en la solicitud",
      10026: "AutoTrading deshabilitado por el servidor",
      10027: "AutoTrading deshabilitado en el cliente - Activa el botón 'AutoTrading' en MetaTrader",
      10028: "Solicitud bloqueada por el dealer",
      10029: "Modificación fallida - la orden o posición está demasiado cerca del mercado",
      10030: "Modo de ejecución de órdenes no soportado",
      10031: "Transacción bloqueada hasta que se complete la anterior",
      10032: "Solo se permiten posiciones largas",
      10033: "Solo se permiten posiciones cortas",
      10034: "Solo se permite cerrar posiciones (FIFO)",
      10035: "La posición ya ha sido cerrada",
      10036: "Una orden de cierre ya existe para esta posición",
      10038: "El número de posiciones abiertas ha alcanzado el límite",
      10039: "La orden de activación de pending ya ha sido ejecutada",
      10040: "Solo se permiten órdenes largas",
      10041: "Solo se permiten órdenes cortas",
      10042: "Solo se permiten órdenes cortas",
      10043: "El volumen de la posición ha cambiado",
      10044: "La posición no se encontró",
    };
    return errors[code] || `Error desconocido (código: ${code})`;
  };

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

        if (data.data) {
          setLiveData(prev => {
              if (prev && JSON.stringify(prev) === JSON.stringify(data.data)) {
                  return prev;
              }
              return data.data;
          });

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
        }

        setIsLive(data.connected);
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

        setAllTrades(prev => {
          if (data.length !== prev.length) return data;
          if (data.length > 0 && prev.length > 0) {
             const lastData = data[data.length - 1];
             const lastPrev = prev[prev.length - 1];
             if (lastData.ticket !== lastPrev.ticket) return data;
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
      const eaTrades = allTrades.filter(t => {
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
    if (!silent) setSyncing(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/sync-history`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
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
    setTradeError(null);
    setClosingTickets(prev => new Set(prev).add(ticket));

    try {
      const res = await fetch(`/api/accounts/${accountId}/close-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json();

      if (!data.success) {
        setTradeError(`Error al cerrar #${ticket}: ${data.error || "Error desconocido"}`);
        setClosingTickets(prev => {
          const newSet = new Set(prev);
          newSet.delete(ticket);
          return newSet;
        });
        return;
      }

      // Comando enviado - verificar después de un tiempo si la posición sigue abierta
      let attempts = 0;
      const maxAttempts = 10;

      const checkClosed = setInterval(async () => {
        attempts++;
        try {
          const liveRes = await fetch(`/api/accounts/${accountId}/live`);
          const liveData = await liveRes.json();

          if (liveData.connected && liveData.data) {
            const stillOpen = liveData.data.positions.some((p: Position) => p.ticket === ticket);

            if (!stillOpen) {
              // Posición cerrada exitosamente
              setClosingTickets(prev => {
                const newSet = new Set(prev);
                newSet.delete(ticket);
                return newSet;
              });
              setLiveData(liveData.data);
              fetchTrades();
              clearInterval(checkClosed);
            } else if (attempts >= maxAttempts) {
              // Después de varios intentos, la posición sigue abierta - mostrar error
              clearInterval(checkClosed);
              setClosingTickets(prev => {
                const newSet = new Set(prev);
                newSet.delete(ticket);
                return newSet;
              });
              setTradeError(`No se pudo cerrar la posición #${ticket}. ${getMT5ErrorMessage(10027)}`);
            }
          }
        } catch (e) {
          console.error("Error checking position status:", e);
        }
      }, 500);

      // Timeout de seguridad
      setTimeout(() => {
        clearInterval(checkClosed);
        setClosingTickets(prev => {
          const newSet = new Set(prev);
          if (newSet.has(ticket)) {
            newSet.delete(ticket);
            // Si todavía estaba en la lista de cierre, probablemente falló
            setTradeError(`Timeout al cerrar #${ticket}. Verifica que AutoTrading esté habilitado en MetaTrader.`);
          }
          return newSet;
        });
      }, 6000);

    } catch (error) {
      console.error("Error closing position:", error);
      setTradeError(`Error de conexión al intentar cerrar #${ticket}`);
      setClosingTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticket);
        return newSet;
      });
    }
  };

  const closeAllPositions = async () => {
    setTradeError(null);
    setClosingAll(true);
    const initialPositionCount = positions.length;

    try {
      const res = await fetch(`/api/accounts/${accountId}/close-all`, { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        setTradeError(`Error al cerrar todas las posiciones: ${data.error || "Error desconocido"}`);
        setClosingAll(false);
        return;
      }

      let attempts = 0;
      const maxAttempts = 20;

      const checkClosed = setInterval(async () => {
        attempts++;
        try {
          const liveRes = await fetch(`/api/accounts/${accountId}/live`);
          const liveData = await liveRes.json();

          if (liveData.connected && liveData.data) {
            const remainingPositions = liveData.data.positions.length;

            if (remainingPositions === 0) {
              // Todas las posiciones cerradas
              setClosingAll(false);
              setLiveData(liveData.data);
              fetchTrades();
              clearInterval(checkClosed);
            } else if (attempts >= maxAttempts) {
              // Algunas posiciones siguen abiertas
              clearInterval(checkClosed);
              setClosingAll(false);
              setTradeError(`No se pudieron cerrar todas las posiciones. Quedan ${remainingPositions} de ${initialPositionCount} abiertas. ${getMT5ErrorMessage(10027)}`);
            }
          }
        } catch (e) {
          console.error("Error checking positions:", e);
        }
      }, 500);

      // Timeout de seguridad
      setTimeout(() => {
        clearInterval(checkClosed);
        if (closingAll) {
          setClosingAll(false);
          setTradeError(`Timeout al cerrar posiciones. Verifica que AutoTrading esté habilitado en MetaTrader.`);
        }
      }, 12000);

    } catch (error) {
      console.error("Error closing all positions:", error);
      setTradeError(`Error de conexión al intentar cerrar todas las posiciones`);
      setClosingAll(false);
    }
  };

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

    // Best and worst trades
    const tradePLs = allTrades.map(t => t.profit + t.swap + t.commission);
    const bestTrade = tradePLs.length > 0 ? Math.max(...tradePLs) : 0;
    const worstTrade = tradePLs.length > 0 ? Math.min(...tradePLs) : 0;

    // Risk-Reward Ratio (average win / average loss)
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Average trade duration (in hours)
    let avgDurationHours = 0;
    if (allTrades.length > 0) {
      const totalDuration = allTrades.reduce((sum, t) => {
        const open = new Date(t.openTime).getTime();
        const close = new Date(t.closeTime).getTime();
        return sum + (close - open);
      }, 0);
      avgDurationHours = (totalDuration / allTrades.length) / (1000 * 60 * 60);
    }

    return {
      totalTrades, winningTrades, losingTrades, winRate, totalProfit,
      avgWin, avgLoss, profitFactor, expectancy,
      bestTrade, worstTrade, riskRewardRatio, avgDurationHours
    };
  }, [allTrades]);

  const { totalTrades, winningTrades, losingTrades, winRate, totalProfit, avgWin, avgLoss, profitFactor, expectancy, bestTrade, worstTrade, riskRewardRatio, avgDurationHours } = stats;

  const positions = liveData?.positions || [];
  const totalFloatingPL = useMemo(() => positions.reduce((sum: number, pos: Position) => sum + pos.profit, 0), [positions]);

  // Get the current position data from positions (updates in real-time)
  const editingPosition = useMemo(() => {
    if (!editingPositionTicket) return null;
    return positions.find(p => p.ticket === editingPositionTicket) || null;
  }, [editingPositionTicket, positions]);

  const currentBalance = liveData?.account.balance ?? account?.balance ?? 0;
  const currentEquity = liveData?.account.equity ?? account?.equity ?? 0;
  const currentFreeMargin = liveData?.account.free_margin ?? 0;

  const floatingPL = liveData ? liveData.account.equity - liveData.account.balance : (currentEquity - currentBalance);

  // Calculate Drawdown from balance history
  const drawdownStats = useMemo(() => {
    if (!allTrades || allTrades.length === 0) return { maxDrawdown: 0, maxDrawdownPercent: 0, currentDrawdown: 0, currentDrawdownPercent: 0, initialBalance: 0, roi: 0 };

    // Build balance history by sorting trades chronologically
    const sortedTrades = [...allTrades].sort((a, b) =>
      new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    // Calculate initial balance (current balance - total profit)
    const calcInitialBalance = currentBalance - totalProfit;

    let runningBalance = calcInitialBalance;
    let peak = calcInitialBalance;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    sortedTrades.forEach(t => {
      const pl = t.profit + t.swap + t.commission;
      runningBalance += pl;

      if (runningBalance > peak) {
        peak = runningBalance;
      }

      const drawdown = peak - runningBalance;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    });

    // Current drawdown (from current peak to current balance)
    const currentPeak = Math.max(peak, currentBalance);
    const currentDrawdown = currentPeak - currentBalance;
    const currentDrawdownPercent = currentPeak > 0 ? (currentDrawdown / currentPeak) * 100 : 0;

    // ROI calculation
    const roi = calcInitialBalance > 0 ? ((currentBalance - calcInitialBalance) / calcInitialBalance) * 100 : 0;

    return { maxDrawdown, maxDrawdownPercent, currentDrawdown, currentDrawdownPercent, initialBalance: calcInitialBalance, roi };
  }, [allTrades, currentBalance, totalProfit]);

  const { maxDrawdown, maxDrawdownPercent, currentDrawdown, currentDrawdownPercent, initialBalance, roi } = drawdownStats;

  const effectivePositionsPerPage = positionsPerPage === 0 ? positions.length : positionsPerPage;
  const totalPositionPages = effectivePositionsPerPage > 0 ? Math.ceil(positions.length / effectivePositionsPerPage) : 1;
  const paginatedPositions = useMemo(() =>
    positionsPerPage === 0 ? positions : positions.slice((positionsPage - 1) * positionsPerPage, positionsPage * positionsPerPage),
    [positions, positionsPage, positionsPerPage]
  );

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

  const dailyBalanceHistory = useMemo(() => {
    if (!allTrades || allTrades.length === 0) return [];

    const pnlByDay: Record<string, number> = {};
    allTrades.forEach(t => {
      const dateStr = new Date(t.closeTime).toISOString().split('T')[0];
      const pnl = t.profit + t.swap + t.commission;
      pnlByDay[dateStr] = (pnlByDay[dateStr] || 0) + pnl;
    });

    const sortedDatesDesc = Object.keys(pnlByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const historyPoints = [];
    let runningBalance = currentBalance;

    for (const dateStr of sortedDatesDesc) {
      historyPoints.push({
        date: dateStr,
        balance: runningBalance,
        displayDate: new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      });

      runningBalance -= pnlByDay[dateStr];
    }

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

    const fullHistory = historyPoints.reverse();

    const now = new Date();
    let startDate = new Date(0);

    if (chartRange === "1W") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (chartRange === "1M") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (chartRange === "3M") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (chartRange === "YTD") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startIndex = fullHistory.findIndex(p => new Date(p.date) >= startDate);

    if (startIndex === -1) return [];

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

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return <AccountPageSkeleton />;
  }

  if (!account) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-24">
        <div className="w-20 h-20 rounded-3xl bg-secondary/80 flex items-center justify-center mb-6">
          <Wallet className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Cuenta no encontrada</h3>
        <p className="text-muted-foreground mb-6">La cuenta que buscas no existe o fue eliminada.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* === HERO SECTION === */}
      <div className="relative mb-8 -mx-3 md:-mx-6 -mt-3 md:-mt-6 px-3 md:px-6 pt-6 pb-8 bg-gradient-to-b from-secondary/50 via-secondary/20 to-transparent">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="flex items-center gap-2">
              {isLive && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-profit/10 border border-profit/20 text-xs font-medium text-profit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
                  </span>
                  <span>Live</span>
                </div>
              )}

              <AlertsDialog accountId={accountId} alerts={alerts} />

              <Button
                variant="outline"
                size="sm"
                onClick={copyToken}
                className={cn(
                  "h-9 gap-2 rounded-xl transition-all",
                  copiedToken
                    ? "bg-profit/10 border-profit/30 text-profit"
                    : "hover:bg-card"
                )}
              >
                {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copiedToken ? "Copiado" : "Token"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => syncHistory()}
                disabled={syncing}
                className={cn(
                  "h-9 gap-2 rounded-xl transition-all",
                  syncing ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-card"
                )}
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                <span className="hidden sm:inline">{syncing ? "Sync..." : "Sync"}</span>
              </Button>
            </div>
          </div>

          {/* Account Title */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              {account.nickname || `Cuenta ${account.accountNumber}`}
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
              <span className="px-2.5 py-0.5 rounded-lg bg-secondary text-xs font-medium">{account.broker}</span>
              <span className="text-foreground/40">•</span>
              <span className="font-mono text-xs">#{account.accountNumber}</span>
              <span className="text-foreground/40">•</span>
              <span className="text-xs">{account.platform}</span>
              <span className="text-foreground/40">•</span>
              <span className="text-xs">{account.server}</span>
            </div>
          </div>

          {/* Main Stats Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Balance & Equity */}
            <div className="lg:col-span-7 space-y-6">
              {/* Balance Hero */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Balance
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground tabular-nums">
                    ${formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Equity</p>
                  <p className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums">
                    ${formatCurrency(currentEquity)}
                  </p>
                </div>
                <div className="w-px h-12 bg-border hidden sm:block" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">P/L Flotante</p>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-xl sm:text-2xl font-semibold tabular-nums",
                      floatingPL >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {floatingPL >= 0 ? "+" : ""}${formatCurrency(floatingPL)}
                    </p>
                    <span className={cn(
                      "text-sm font-medium px-2 py-0.5 rounded-md",
                      floatingPL >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                    )}>
                      {floatingPL >= 0 ? "+" : ""}{currentBalance > 0 ? ((floatingPL / currentBalance) * 100).toFixed(2) : "0.00"}%
                    </span>
                  </div>
                </div>
                <div className="w-px h-12 bg-border hidden md:block" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">ROI</p>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-xl sm:text-2xl font-semibold tabular-nums",
                      roi >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Summary Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {/* Max Drawdown - Most important risk metric */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-loss/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-loss" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-loss mb-1 tabular-nums">
                  {maxDrawdownPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground font-medium">Drawdown Máx</p>
              </div>

              {/* Win Rate */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-chart-1" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground font-medium">Win Rate</p>
              </div>

              {/* Profit Factor */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{profitFactor > 0 ? profitFactor.toFixed(2) : "—"}</p>
                <p className="text-xs text-muted-foreground font-medium">Profit Factor</p>
              </div>

              {/* Total Trades */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4 hover:bg-card transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{totalTrades}</p>
                <p className="text-xs text-muted-foreground font-medium">Operaciones</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === TAB NAVIGATION === */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {[
          { id: "overview", label: "Resumen", icon: BarChart3 },
          { id: "positions", label: "Posiciones", icon: CircleDot, count: positions.length },
          { id: "history", label: "Historial", icon: History },
          { id: "eas", label: "EAs", icon: Bot, count: eas.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "text-xs",
                activeTab === tab.id ? "opacity-70" : "opacity-60"
              )}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === TAB CONTENT === */}
      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Equity Curve */}
          <div className="rounded-2xl bg-card border border-border p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Curva de Balance</h3>
                <p className="text-sm text-muted-foreground">Evolución de la cuenta</p>
              </div>
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl">
                {(["1W", "1M", "3M", "YTD", "ALL"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setChartRange(range)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      chartRange === range
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px] outline-none focus:outline-none [&_.recharts-wrapper]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyBalanceHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    minTickGap={50}
                    tickMargin={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                    domain={['dataMin - 100', 'dataMax + 100']}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "8px 12px"
                    }}
                    formatter={(value: number | undefined) => [`$${(value || 0).toLocaleString("en-US", {minimumFractionDigits: 2})}`, "Balance"]}
                    labelFormatter={(label) => label}
                    labelStyle={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 4 }}
                  />
                  <Area
                    type="linear"
                    dataKey="balance"
                    stroke="var(--chart-1)"
                    strokeWidth={1}
                    fill="url(#balanceGradient)"
                    name="Balance"
                    animationDuration={300}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid - Key Trading Metrics */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Drawdown Actual */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Drawdown Actual</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl md:text-3xl font-bold font-mono", currentDrawdownPercent > 5 ? "text-loss" : currentDrawdownPercent > 2 ? "text-warning" : "text-foreground")}>
                  {currentDrawdownPercent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                ${currentDrawdown.toFixed(0)} desde el pico
              </p>
            </div>

            {/* Risk-Reward Ratio */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Riesgo/Beneficio</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold font-mono text-foreground">
                  {riskRewardRatio > 0 ? `1:${riskRewardRatio.toFixed(1)}` : "—"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Win ${avgWin.toFixed(0)} / Loss ${avgLoss.toFixed(0)}
              </p>
            </div>

            {/* Best & Worst Trade */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Mejor / Peor</span>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-lg md:text-xl font-bold font-mono text-profit">+${bestTrade.toFixed(0)}</span>
                  <p className="text-[10px] text-muted-foreground">Mejor</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <span className="text-lg md:text-xl font-bold font-mono text-loss">${worstTrade.toFixed(0)}</span>
                  <p className="text-[10px] text-muted-foreground">Peor</p>
                </div>
              </div>
            </div>

            {/* Avg Duration */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Duración Media</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold font-mono text-foreground">
                  {avgDurationHours < 1
                    ? `${Math.round(avgDurationHours * 60)}m`
                    : avgDurationHours < 24
                    ? `${avgDurationHours.toFixed(1)}h`
                    : `${(avgDurationHours / 24).toFixed(1)}d`}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {totalTrades} operaciones
              </p>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Expectancy */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Expectancy</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl md:text-3xl font-bold font-mono", expectancy >= 0 ? "text-profit" : "text-loss")}>${expectancy.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">por trade</span>
              </div>
            </div>

            {/* Streaks */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Rachas Máx</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xl md:text-2xl font-bold font-mono text-profit">{maxWins}</span>
                  <p className="text-[10px] text-muted-foreground">Wins</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <span className="text-xl md:text-2xl font-bold font-mono text-loss">{maxLosses}</span>
                  <p className="text-[10px] text-muted-foreground">Losses</p>
                </div>
              </div>
            </div>

            {/* Win/Loss Trades */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Trades</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xl md:text-2xl font-bold font-mono text-profit">{winningTrades}</span>
                  <p className="text-[10px] text-muted-foreground">Ganados</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <span className="text-xl md:text-2xl font-bold font-mono text-loss">{losingTrades}</span>
                  <p className="text-[10px] text-muted-foreground">Perdidos</p>
                </div>
              </div>
            </div>

            {/* Long vs Short */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <ChartLine className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Long vs Short</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Long ({longTrades.length})</span>
                  <span className="font-mono font-medium text-profit">{longWinRate.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Short ({shortTrades.length})</span>
                  <span className="font-mono font-medium text-chart-3">{shortWinRate.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <CalendarPnL trades={allTrades} />
        </div>
      )}

      {/* Positions Tab */}
      {activeTab === "positions" && (
        <div className="space-y-6">
          {/* Error Banner */}
          {tradeError && (
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-loss shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-loss">Error en operación</p>
                <p className="text-sm text-loss/80 mt-1">{tradeError}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTradeError(null)}
                className="text-loss/60 hover:text-loss hover:bg-loss/10 -mr-2 -mt-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="p-5 md:p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Posiciones Abiertas</h3>
                  <p className="text-sm text-muted-foreground">
                    {positions.length} posiciones | P&L:{" "}
                    <span className={cn("font-mono font-medium", totalFloatingPL >= 0 ? "text-profit" : "text-loss")}>
                      {totalFloatingPL >= 0 ? "+" : ""}${totalFloatingPL.toFixed(2)}
                    </span>
                  </p>
                </div>
                {positions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={closingAll}
                        className="border-loss/30 bg-loss/10 text-loss hover:bg-loss/20 rounded-xl"
                      >
                        {closingAll ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando...</>
                        ) : (
                          "Cerrar Todas"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar todas las posiciones?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se cerrarán inmediatamente todas las posiciones abiertas. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={closeAllPositions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                          Cerrar todo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mb-4">
                  <CircleDot className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No hay posiciones abiertas</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Ticket</TableHead>
                        <TableHead className="text-muted-foreground">Símbolo</TableHead>
                        <TableHead className="text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-muted-foreground">Vol</TableHead>
                        <TableHead className="text-muted-foreground hidden lg:table-cell">Apertura</TableHead>
                        <TableHead className="text-muted-foreground hidden lg:table-cell">Actual</TableHead>
                        <TableHead className="text-muted-foreground hidden xl:table-cell">SL</TableHead>
                        <TableHead className="text-muted-foreground hidden xl:table-cell">TP</TableHead>
                        <TableHead className="text-muted-foreground">P&L</TableHead>
                        <TableHead className="text-right text-muted-foreground"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPositions.map((p) => (
                        <TableRow key={p.ticket} className="border-border hover:bg-secondary/30">
                          <TableCell className="font-mono text-sm text-muted-foreground">#{p.ticket}</TableCell>
                          <TableCell className="font-medium text-foreground text-sm">{p.symbol}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-medium uppercase text-xs", p.type === "buy" ? "bg-profit/20 text-profit border-profit/30" : "bg-loss/20 text-loss border-loss/30")}>
                              {p.type === "buy" ? "BUY" : "SELL"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{p.volume}</TableCell>
                          <TableCell className="font-mono text-sm hidden lg:table-cell">{p.open_price.toFixed(5)}</TableCell>
                          <TableCell className="font-mono text-sm hidden lg:table-cell">{p.current_price.toFixed(5)}</TableCell>
                          <TableCell className="font-mono text-sm text-loss hidden xl:table-cell">{p.sl > 0 ? p.sl.toFixed(5) : "—"}</TableCell>
                          <TableCell className="font-mono text-sm text-profit hidden xl:table-cell">{p.tp > 0 ? p.tp.toFixed(5) : "—"}</TableCell>
                          <TableCell className={cn("font-mono font-medium text-sm", p.profit >= 0 ? "text-profit" : "text-loss")}>
                            {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right p-1">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingPositionTicket(p.ticket)}
                                className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8 p-0 rounded-lg"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => closePosition(p.ticket)}
                                disabled={closingTickets.has(p.ticket) || closingAll}
                                className="text-loss hover:text-loss hover:bg-loss/10 h-8 w-8 p-0 rounded-lg"
                              >
                                {closingTickets.has(p.ticket) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-border">
                  {paginatedPositions.map((p) => (
                    <div key={p.ticket} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">{p.symbol}</span>
                            <Badge variant="outline" className={cn("text-xs", p.type === "buy" ? "bg-profit/20 text-profit border-profit/30" : "bg-loss/20 text-loss border-loss/30")}>
                              {p.type === "buy" ? "BUY" : "SELL"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">#{p.ticket} • {p.volume} lots</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-mono font-semibold", p.profit >= 0 ? "text-profit" : "text-loss")}>
                            {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{p.open_price.toFixed(5)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {p.sl > 0 && <span>SL: <span className="text-loss font-mono">{p.sl.toFixed(5)}</span></span>}
                          {p.tp > 0 && <span>TP: <span className="text-profit font-mono">{p.tp.toFixed(5)}</span></span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPositionTicket(p.ticket)}
                            className="text-muted-foreground hover:text-foreground h-8 px-3 rounded-lg text-xs"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            SL/TP
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => closePosition(p.ticket)}
                            disabled={closingTickets.has(p.ticket) || closingAll}
                            className="text-loss hover:text-loss hover:bg-loss/10 h-8 px-3 rounded-lg text-xs"
                          >
                            {closingTickets.has(p.ticket) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Cerrar"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Margin Info */}
          {liveData && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margen Usado</span>
                  <span className="font-mono font-medium text-foreground">${liveData.account.margin.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margen Libre</span>
                  <span className="font-mono font-medium text-foreground">${liveData.account.free_margin.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nivel de Margen</span>
                  <span className="font-mono font-medium text-profit">{liveData.account.margin_level.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <AccountHistoryTab trades={allTrades} />
      )}

      {/* EAs Tab */}
      {activeTab === "eas" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 rounded-2xl bg-card border border-border">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Bot className="h-5 w-5 text-chart-1" />
                Expert Advisors
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Gestiona tus EAs y monitorea su rendimiento por Magic Number.</p>
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
              <div className="col-span-full flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-border text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-1">No tienes EAs registrados.</p>
                <p className="text-sm text-muted-foreground">Añade uno para ver sus estadísticas por separado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Position Dialog */}
      <EditPositionDialog
        position={editingPosition}
        accountId={accountId}
        open={!!editingPositionTicket}
        onOpenChange={(open) => !open && setEditingPositionTicket(null)}
        onSuccess={() => {
          // Refresh live data after modification
          fetch(`/api/accounts/${accountId}/live`)
            .then(res => res.json())
            .then(data => {
              if (data.data) setLiveData(data.data);
            });
        }}
      />
    </div>
  );
}
