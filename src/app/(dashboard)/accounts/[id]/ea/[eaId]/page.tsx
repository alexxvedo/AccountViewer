"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Bot,
  Target,
  Zap,
  X,
  Loader2,
  BarChart3,
  CalendarIcon,
  Download,
  CircleDot,
  History as HistoryIcon,
  Trophy,
  AlertTriangle,
  Clock,
  Percent,
  Scale,
  Activity,
  Flame,
  Snowflake,
  Pencil,
  RefreshCw,
  CheckCircle2,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPnL } from "@/components/CalendarPnL";
import { AccountHistoryTab } from "@/components/AccountHistoryTab";
import { EAPageSkeleton } from "@/components/skeletons/EAPageSkeleton";
import { EditPositionDialog } from "@/components/EditPositionDialog";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

interface ExpertAdvisor {
  id: string;
  name: string;
  magicNumber: number;
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
  magicNumber?: number | null;
}

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
  magic_number?: number;
}

export default function EADetailsPage() {
  const params = useParams();
  const accountId = params.id as string;
  const eaId = params.eaId as string;

  const [ea, setEa] = useState<ExpertAdvisor | null>(null);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const [closingTickets, setClosingTickets] = useState<Set<number>>(new Set());
  const [editingPositionTicket, setEditingPositionTicket] = useState<number | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    linkedTrades: number;
    totalProfit: number;
    unlinkedTrades: number;
    firstTradeDate: string | null;
    lastTradeDate: string | null;
  } | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  // Get the current position data from livePositions (updates in real-time)
  const editingPosition = useMemo(() => {
    if (!editingPositionTicket) return null;
    return livePositions.find(p => p.ticket === editingPositionTicket) || null;
  }, [editingPositionTicket, livePositions]);

  // Mapa de códigos de error MQL5 a mensajes legibles
  const getMT5ErrorMessage = (code: number): string => {
    const errors: Record<number, string> = {
      10004: "Requote - El precio ha cambiado, intenta de nuevo",
      10006: "Solicitud rechazada por el servidor",
      10007: "Solicitud cancelada por el trader",
      10017: "Trading deshabilitado",
      10018: "Mercado cerrado",
      10019: "Fondos insuficientes para completar la operación",
      10024: "Demasiadas solicitudes, reduce la frecuencia",
      10026: "AutoTrading deshabilitado por el servidor",
      10027: "AutoTrading deshabilitado - Activa el botón 'AutoTrading' en MetaTrader",
      10029: "Modificación fallida - la orden o posición está demasiado cerca del mercado",
      10035: "La posición ya ha sido cerrada",
    };
    return errors[code] || `Error desconocido (código: ${code})`;
  };

  // Report State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleDownloadReport = () => {
    let query = "";
    if (dateRange?.from) {
      const fromTs = dateRange.from.getTime();
      query += `?from=${fromTs}`;
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      const toTs = toDate.getTime();
      query += query ? `&to=${toTs}` : `?to=${toTs}`;
    }

    const url = `/api/eas/${eaId}/report${query}`;
    window.location.href = url;
    setIsReportOpen(false);
  };

  useEffect(() => {
    if (eaId) {
      fetchEA();
    }
  }, [eaId]);

  useEffect(() => {
    if (accountId && ea) {
      fetchTrades();
      fetchLiveData();

      const interval = setInterval(fetchTrades, 5000);
      const liveInterval = setInterval(fetchLiveData, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(liveInterval);
      };
    }
  }, [accountId, ea]);

  const fetchEA = async () => {
    try {
      const res = await fetch(`/api/eas/${eaId}`);
      if (res.ok) {
        const data = await res.json();
        setEa(data);
      }
    } catch (error) {
      console.error("Error fetching EA:", error);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/trades?limit=100000`);
      const data = await res.json();

      if (ea) {
        const filtered = data.filter(
          (t: Trade) => t.magicNumber === ea.magicNumber
        );

        setAllTrades((prev) => {
          if (prev.length === filtered.length) {
            if (prev.length === 0) return prev;
            if (
              prev[0].ticket === filtered[0].ticket &&
              prev[prev.length - 1].ticket === filtered[filtered.length - 1].ticket
            ) {
              return prev;
            }
          }
          return filtered;
        });
      }
    } catch (error) {
      console.error("Error fetching trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/live`);
      const data = await res.json();
      if (data.connected && data.data) {
        setIsLive(true);
        const allPos = data.data.positions as Position[];
        if (ea) {
          const eaPos = allPos.filter((p) => p.magic_number === ea.magicNumber);
          setLivePositions(eaPos);
        }
      } else {
        setIsLive(false);
        setLivePositions([]);
      }
    } catch (error) {
      console.error("Error fetching live data", error);
    }
  };

  const syncTrades = async () => {
    if (!ea) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/eas/${ea.id}/sync`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setSyncResult(data);
        setIsSyncDialogOpen(true);
        // Refrescar operaciones después de sincronizar
        fetchTrades();
      } else {
        alert("Error al sincronizar: " + (data.message || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error syncing trades:", error);
      alert("Error de conexión al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const closePosition = async (ticket: number) => {
    setTradeError(null);
    setClosingTickets((prev) => new Set(prev).add(ticket));
    try {
      const res = await fetch(`/api/accounts/${accountId}/close-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json();
      if (!data.success) {
        setTradeError(`Error al cerrar #${ticket}: ${data.error || "Error desconocido"}`);
        setClosingTickets((prev) => {
          const next = new Set(prev);
          next.delete(ticket);
          return next;
        });
        return;
      }

      // Comando enviado - verificar si la posición sigue abierta
      let attempts = 0;
      const maxAttempts = 8;

      const checkClosed = setInterval(async () => {
        attempts++;
        try {
          const liveRes = await fetch(`/api/accounts/${accountId}/live`);
          const liveData = await liveRes.json();
          if (liveData.connected && liveData.data) {
            const positions = liveData.data.positions as Position[];
            const positionStillExists = positions.some((p) => p.ticket === ticket);

            if (!positionStillExists) {
              // Posición cerrada exitosamente
              clearInterval(checkClosed);
              setClosingTickets((prev) => {
                const next = new Set(prev);
                next.delete(ticket);
                return next;
              });
              fetchLiveData();
            } else if (attempts >= maxAttempts) {
              // Después de varios intentos, mostrar error
              clearInterval(checkClosed);
              setClosingTickets((prev) => {
                const next = new Set(prev);
                next.delete(ticket);
                return next;
              });
              setTradeError(`No se pudo cerrar la posición #${ticket}. ${getMT5ErrorMessage(10027)}`);
            }
          }
        } catch (e) {
          console.error("Error checking position status", e);
        }
      }, 500);

      // Timeout de seguridad
      setTimeout(() => {
        clearInterval(checkClosed);
        setClosingTickets((prev) => {
          const next = new Set(prev);
          if (next.has(ticket)) {
            next.delete(ticket);
            setTradeError(`Timeout al cerrar #${ticket}. Verifica que AutoTrading esté habilitado en MetaTrader.`);
          }
          return next;
        });
      }, 5000);

    } catch (error) {
      console.error("Error closing trade", error);
      setTradeError(`Error de conexión al cerrar #${ticket}`);
      setClosingTickets((prev) => {
        const next = new Set(prev);
        next.delete(ticket);
        return next;
      });
    }
  };

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalTrades = allTrades.length;
    const wins = allTrades.filter(
      (t) => t.profit + t.swap + t.commission > 0
    );
    const losses = allTrades.filter(
      (t) => t.profit + t.swap + t.commission <= 0
    );

    const winningTrades = wins.length;
    const losingTrades = losses.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalClosedProfit = allTrades.reduce(
      (sum, t) => sum + t.profit + t.swap + t.commission,
      0
    );

    const floatingPnL = livePositions.reduce(
      (sum, p) => sum + p.profit + p.swap + p.commission,
      0
    );

    const grossProfit = wins.reduce(
      (sum, t) => sum + t.profit + t.swap + t.commission,
      0
    );
    const grossLoss = Math.abs(
      losses.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0)
    );

    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
    const expectedPayoff =
      totalTrades > 0 ? totalClosedProfit / totalTrades : 0;

    // Average Win/Loss
    const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;

    // Risk-Reward Ratio
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;

    // Best and Worst Trade
    const tradePLs = allTrades.map((t) => t.profit + t.swap + t.commission);
    const bestTrade = tradePLs.length > 0 ? Math.max(...tradePLs) : 0;
    const worstTrade = tradePLs.length > 0 ? Math.min(...tradePLs) : 0;

    // Average Trade Duration (hours)
    let totalDuration = 0;
    allTrades.forEach((t) => {
      const open = new Date(t.openTime).getTime();
      const close = new Date(t.closeTime).getTime();
      totalDuration += close - open;
    });
    const avgDurationHours =
      totalTrades > 0 ? totalDuration / totalTrades / (1000 * 60 * 60) : 0;

    // Win/Loss Streaks
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    const sortedTrades = [...allTrades].sort(
      (a, b) =>
        new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    sortedTrades.forEach((t) => {
      const pl = t.profit + t.swap + t.commission;
      if (pl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    });

    // Symbol Distribution
    const bySymbol: Record<string, number> = {};
    allTrades.forEach((t) => {
      bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + 1;
    });
    const symbolDist = Object.entries(bySymbol)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalClosedProfit,
      floatingPnL,
      grossProfit,
      grossLoss,
      profitFactor,
      expectedPayoff,
      avgWin,
      avgLoss,
      riskRewardRatio,
      bestTrade,
      worstTrade,
      avgDurationHours,
      maxWinStreak,
      maxLossStreak,
      symbolDist,
    };
  }, [allTrades, livePositions]);

  // Drawdown Calculation
  const drawdownStats = useMemo(() => {
    if (allTrades.length === 0)
      return {
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        currentDrawdown: 0,
        currentDrawdownPercent: 0,
      };

    const sortedTrades = [...allTrades].sort(
      (a, b) =>
        new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    let runningBalance = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    sortedTrades.forEach((t) => {
      runningBalance += t.profit + t.swap + t.commission;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const dd = peak - runningBalance;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownPercent = peak > 0 ? (dd / peak) * 100 : 0;
      }
    });

    const currentDrawdown = peak - runningBalance;
    const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;

    return {
      maxDrawdown,
      maxDrawdownPercent,
      currentDrawdown,
      currentDrawdownPercent,
    };
  }, [allTrades]);

  // Balance Curve
  const balanceCurve = useMemo(() => {
    let balance = 0;
    return [...allTrades]
      .sort((a, b) => {
        const timeDiff =
          new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.ticket - b.ticket;
      })
      .map((t, index) => {
        const pl = t.profit + t.swap + t.commission;
        balance += pl;
        return {
          tradeNum: index + 1,
          date: new Date(t.closeTime).toLocaleDateString(),
          ticket: t.ticket,
          balance,
        };
      });
  }, [allTrades]);

  // Chart time range
  const [chartRange, setChartRange] = useState<"all" | "1m" | "3m" | "6m" | "1y">("all");

  const filteredBalanceCurve = useMemo(() => {
    if (chartRange === "all") return balanceCurve;

    const now = new Date();
    let cutoffDate: Date;

    switch (chartRange) {
      case "1m":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "3m":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "6m":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case "1y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return balanceCurve;
    }

    const sortedTrades = [...allTrades].sort(
      (a, b) =>
        new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    const filteredTrades = sortedTrades.filter(
      (t) => new Date(t.closeTime) >= cutoffDate
    );

    let startBalance = 0;
    sortedTrades.forEach((t) => {
      if (new Date(t.closeTime) < cutoffDate) {
        startBalance += t.profit + t.swap + t.commission;
      }
    });

    let balance = startBalance;
    return filteredTrades.map((t, index) => {
      const pl = t.profit + t.swap + t.commission;
      balance += pl;
      return {
        tradeNum: index + 1,
        date: new Date(t.closeTime).toLocaleDateString(),
        ticket: t.ticket,
        balance,
      };
    });
  }, [balanceCurve, chartRange, allTrades]);

  if (loading && !ea) {
    return <EAPageSkeleton />;
  }

  if (!ea) return <div className="p-8">EA no encontrado</div>;

  const formatNumber = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative mb-8 -mx-3 md:-mx-6 -mt-3 md:-mt-6 px-3 md:px-6 pt-6 pb-8 bg-gradient-to-b from-secondary/50 via-secondary/20 to-transparent">
        <div className="relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <Link href={`/accounts/${accountId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver a cuenta</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {isLive && (
                <Badge
                  variant="outline"
                  className="bg-profit/10 text-profit border-profit/30 gap-1.5"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-profit"></span>
                  </span>
                  En vivo
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={syncTrades}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
              <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Exportar Datos del EA</DialogTitle>
                    <DialogDescription>
                      Descarga un informe detallado en Excel.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Rango de Fechas</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "LLL dd, y", {
                                    locale: es,
                                  })}{" "}
                                  -{" "}
                                  {format(dateRange.to, "LLL dd, y", {
                                    locale: es,
                                  })}
                                </>
                              ) : (
                                format(dateRange.from, "LLL dd, y", {
                                  locale: es,
                                })
                              )
                            ) : (
                              <span>Seleccionar fechas</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleDownloadReport}>Descargar Excel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* EA Title */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 mb-2">
              <Bot className="h-8 w-8 md:h-10 md:w-10 text-primary shrink-0" />
              <span className="truncate">{ea.name}</span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="font-mono text-xs">
                Magic #{ea.magicNumber}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {stats.totalTrades} operaciones
              </span>
              {allTrades.length > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-sm text-muted-foreground">
                    Desde{" "}
                    {format(
                      new Date(
                        Math.min(
                          ...allTrades.map((t) => new Date(t.openTime).getTime())
                        )
                      ),
                      "MMM yyyy",
                      { locale: es }
                    )}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Main Stats Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Profit & Equity */}
            <div className="lg:col-span-7 space-y-6">
              {/* Profit Hero */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Beneficio Total
                </p>
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "text-5xl md:text-6xl font-bold tracking-tight tabular-nums",
                      stats.totalClosedProfit >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {stats.totalClosedProfit >= 0 ? "+" : ""}$
                    {formatNumber(stats.totalClosedProfit)}
                  </span>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">P/L Flotante</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-2xl font-semibold tabular-nums",
                        stats.floatingPnL >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {stats.floatingPnL >= 0 ? "+" : ""}$
                      {formatNumber(stats.floatingPnL)}
                    </span>
                    {livePositions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {livePositions.length} pos
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-px h-12 bg-border hidden sm:block" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold tabular-nums">
                      {stats.winRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.winningTrades}W / {stats.losingTrades}L
                    </span>
                  </div>
                </div>
                <div className="w-px h-12 bg-border hidden md:block" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Factor de Beneficio
                  </p>
                  <span
                    className={cn(
                      "text-2xl font-semibold tabular-nums",
                      stats.profitFactor >= 1.5
                        ? "text-profit"
                        : stats.profitFactor >= 1
                        ? "text-foreground"
                        : "text-loss"
                    )}
                  >
                    {stats.profitFactor >= 999
                      ? "∞"
                      : stats.profitFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Summary Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {/* Max Drawdown */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-loss/10">
                    <TrendingDown className="h-4 w-4 text-loss" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-loss tabular-nums">
                  {drawdownStats.maxDrawdownPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Max Drawdown</p>
              </div>

              {/* Risk-Reward */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {stats.riskRewardRatio >= 999
                    ? "∞"
                    : stats.riskRewardRatio.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Risk/Reward</p>
              </div>

              {/* Best Trade */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-profit/10">
                    <Trophy className="h-4 w-4 text-profit" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-profit tabular-nums">
                  +${formatNumber(stats.bestTrade)}
                </p>
                <p className="text-xs text-muted-foreground">Mejor Trade</p>
              </div>

              {/* Worst Trade */}
              <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-loss/10">
                    <AlertTriangle className="h-4 w-4 text-loss" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-loss tabular-nums">
                  ${formatNumber(stats.worstTrade)}
                </p>
                <p className="text-xs text-muted-foreground">Peor Trade</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="bg-secondary/50 p-1 h-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-card rounded-full px-4"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="positions"
              className="relative data-[state=active]:bg-card rounded-full px-4"
            >
              <CircleDot className="mr-2 h-4 w-4" />
              Posiciones
              {livePositions.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                >
                  {livePositions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-card rounded-full px-4"
            >
              <HistoryIcon className="mr-2 h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Balance Curve Chart */}
          <div className="rounded-2xl bg-card border border-border p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-lg">Curva de Equity</h3>
                <p className="text-sm text-muted-foreground">
                  Evolución del beneficio cerrado
                </p>
              </div>
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
                {(["1m", "3m", "6m", "1y", "all"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setChartRange(range)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      chartRange === range
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {range === "all" ? "Todo" : range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredBalanceCurve}>
                  <defs>
                    <linearGradient id="eaBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="tradeNum"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    minTickGap={30}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    tickFormatter={(v) =>
                      Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                    }
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number | undefined) => [
                      `$${formatNumber(value || 0)}`,
                      "Balance",
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return `Trade #${label} (${data.date})`;
                      }
                      return `Trade #${label}`;
                    }}
                  />
                  <Area
                    type="linear"
                    dataKey="balance"
                    stroke="var(--chart-1)"
                    strokeWidth={1}
                    fill="url(#eaBalanceGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Expected Payoff */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Esperanza Matemática
                </span>
              </div>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  stats.expectedPayoff >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {stats.expectedPayoff >= 0 ? "+" : ""}$
                {formatNumber(stats.expectedPayoff)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">por operación</p>
            </div>

            {/* Avg Win */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-profit" />
                <span className="text-sm text-muted-foreground">Ganancia Media</span>
              </div>
              <p className="text-2xl font-bold text-profit tabular-nums">
                +${formatNumber(stats.avgWin)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.winningTrades} trades ganadores
              </p>
            </div>

            {/* Avg Loss */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-loss" />
                <span className="text-sm text-muted-foreground">Pérdida Media</span>
              </div>
              <p className="text-2xl font-bold text-loss tabular-nums">
                -${formatNumber(stats.avgLoss)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.losingTrades} trades perdedores
              </p>
            </div>

            {/* Avg Duration */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Duración Media</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {formatDuration(stats.avgDurationHours)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">por operación</p>
            </div>
          </div>

          {/* Streaks & More Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Win Streak */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">
                  Racha Ganadora
                </span>
              </div>
              <p className="text-2xl font-bold text-profit tabular-nums">
                {stats.maxWinStreak}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                operaciones consecutivas
              </p>
            </div>

            {/* Loss Streak */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Snowflake className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Racha Perdedora
                </span>
              </div>
              <p className="text-2xl font-bold text-loss tabular-nums">
                {stats.maxLossStreak}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                operaciones consecutivas
              </p>
            </div>

            {/* Gross Profit */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-profit" />
                <span className="text-sm text-muted-foreground">
                  Beneficio Bruto
                </span>
              </div>
              <p className="text-2xl font-bold text-profit tabular-nums">
                +${formatNumber(stats.grossProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">total ganancias</p>
            </div>

            {/* Gross Loss */}
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-loss" />
                <span className="text-sm text-muted-foreground">Pérdida Bruta</span>
              </div>
              <p className="text-2xl font-bold text-loss tabular-nums">
                -${formatNumber(stats.grossLoss)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">total pérdidas</p>
            </div>
          </div>

          {/* Calendar PnL */}
          <CalendarPnL trades={allTrades} />
        </TabsContent>

        {/* TAB 2: POSITIONS */}
        <TabsContent value="positions" className="space-y-4">
          {/* Error Message */}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Posiciones Abiertas</h3>
                  <p className="text-sm text-muted-foreground">
                    {livePositions.length} posiciones | P&L Flotante:{" "}
                    <span
                      className={cn(
                        "font-mono font-medium",
                        stats.floatingPnL >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {stats.floatingPnL >= 0 ? "+" : ""}$
                      {formatNumber(stats.floatingPnL)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            {livePositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CircleDot className="h-12 w-12 mb-4 opacity-20" />
                <p>No hay posiciones abiertas</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-auto">
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
                        <TableHead className="text-right text-muted-foreground">
                          Acción
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {livePositions.map((p) => (
                        <TableRow
                          key={p.ticket}
                          className="border-border hover:bg-secondary/50"
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            #{p.ticket}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {p.symbol}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium uppercase",
                                p.type === "buy"
                                  ? "bg-profit/20 text-profit border-profit/30"
                                  : "bg-loss/20 text-loss border-loss/30"
                              )}
                            >
                              {p.type === "buy" ? "COMPRA" : "VENTA"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{p.volume}</TableCell>
                          <TableCell className="font-mono">
                            {p.open_price.toFixed(5)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {p.current_price.toFixed(5)}
                          </TableCell>
                          <TableCell className="font-mono text-loss">
                            {p.sl > 0 ? p.sl.toFixed(5) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-profit">
                            {p.tp > 0 ? p.tp.toFixed(5) : "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "font-mono font-medium",
                              p.profit >= 0 ? "text-profit" : "text-loss"
                            )}
                          >
                            {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingPositionTicket(p.ticket)}
                                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => closePosition(p.ticket)}
                                disabled={closingTickets.has(p.ticket)}
                                className="text-loss hover:text-loss hover:bg-loss/10"
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {livePositions.map((p) => (
                    <div
                      key={p.ticket}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/30 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {p.symbol}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{p.ticket}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium uppercase text-xs",
                            p.type === "buy"
                              ? "bg-profit/20 text-profit border-profit/30"
                              : "bg-loss/20 text-loss border-loss/30"
                          )}
                        >
                          {p.type === "buy" ? "COMPRA" : "VENTA"} {p.volume}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            Apertura
                          </span>
                          <span className="font-mono">{p.open_price.toFixed(5)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground">Actual</span>
                          <span className="font-mono">
                            {p.current_price.toFixed(5)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">SL</span>
                          <span className="font-mono text-loss">
                            {p.sl > 0 ? p.sl.toFixed(5) : "—"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground">TP</span>
                          <span className="font-mono text-profit">
                            {p.tp > 0 ? p.tp.toFixed(5) : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            Beneficio
                          </span>
                          <span
                            className={cn(
                              "font-mono font-medium text-lg",
                              p.profit >= 0 ? "text-profit" : "text-loss"
                            )}
                          >
                            {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPositionTicket(p.ticket)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            SL/TP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closePosition(p.ticket)}
                            disabled={closingTickets.has(p.ticket)}
                            className="text-loss hover:text-loss hover:bg-loss/10 border-loss/20"
                          >
                            {closingTickets.has(p.ticket) ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <X className="h-4 w-4 mr-2" />
                            )}
                            Cerrar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <AccountHistoryTab trades={allTrades} />
        </TabsContent>
      </Tabs>

      {/* Edit Position Dialog */}
      <EditPositionDialog
        position={editingPosition}
        accountId={accountId}
        open={!!editingPositionTicket}
        onOpenChange={(open) => !open && setEditingPositionTicket(null)}
        onSuccess={() => fetchLiveData()}
      />

      {/* Sync Result Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncResult && syncResult.linkedTrades > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-profit" />
              ) : (
                <Info className="h-5 w-5 text-primary" />
              )}
              Estado de Sincronización
            </DialogTitle>
            <DialogDescription>
              Operaciones con Magic Number #{ea?.magicNumber}
            </DialogDescription>
          </DialogHeader>

          {syncResult && (
            <div className="space-y-4 py-4">
              {/* Main stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-secondary/50 p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {syncResult.linkedTrades}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Operaciones Vinculadas
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-4 text-center">
                  <p
                    className={cn(
                      "text-3xl font-bold",
                      syncResult.totalProfit >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {syncResult.totalProfit >= 0 ? "+" : ""}$
                    {syncResult.totalProfit.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Beneficio Total</p>
                </div>
              </div>

              {/* Date range */}
              {syncResult.firstTradeDate && syncResult.lastTradeDate && (
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CalendarIcon className="h-4 w-4" />
                    Rango de Fechas
                  </div>
                  <p className="text-sm">
                    {format(new Date(syncResult.firstTradeDate), "dd MMM yyyy", {
                      locale: es,
                    })}{" "}
                    →{" "}
                    {format(new Date(syncResult.lastTradeDate), "dd MMM yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>
              )}

              {/* Unlinked trades warning */}
              {syncResult.unlinkedTrades > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400">
                        {syncResult.unlinkedTrades} operaciones sin vincular
                      </p>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                        Hay operaciones en la cuenta con Magic Number 0 o vacío.
                        Estas operaciones no están asociadas a ninguna EA.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No trades message */}
              {syncResult.linkedTrades === 0 && (
                <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                  <p className="text-muted-foreground">
                    No se encontraron operaciones con el Magic Number{" "}
                    <span className="font-mono font-medium text-foreground">
                      #{ea?.magicNumber}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Asegúrate de que el EA en MetaTrader esté configurado con
                    este Magic Number y haya realizado operaciones.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsSyncDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
