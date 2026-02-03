"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Activity,
  Bot,
  Target,
  Zap,
  X,
  Loader2,
  PieChart as PieChartIcon,
  BarChart3,
  CalendarIcon,
  CalendarDays,
  Download,
  CircleDot,
  History as HistoryIcon
} from "lucide-react";
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
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
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPnL } from "@/components/CalendarPnL";
import { AccountHistoryTab } from "@/components/AccountHistoryTab";
import { EAPageSkeleton } from "@/components/skeletons/EAPageSkeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
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
    magic_number?: number; // From MT5
}

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

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
          // Set to end of day
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          const toTs = toDate.getTime();
          query += query ? `&to=${toTs}` : `?to=${toTs}`;
      } else if (dateRange?.from) {
          // If only 'from' is selected, strictly set 'to' to end of that same day or allow open ended?
          // Usually if only 'from' is present in range picker (after 1 click), 'to' is undefined.
          // Reporting usually implies a range. If 'to' is missing, let's treat it as single day or open ended. 
          // Let's set 'to' = 'from' end of day for single day selection convenience or just send from.
          // Better logic: if only from, just send from. Backend handles >= from. 
          // If user wants single day, they usually click twice? Shadcn calendar handles range.
          // Let's assume if to is undefined, we assume implicit "up to now" or just "from X".
          // Backend logic: if to missing, it is open ended. That's fine.
      }
      
      // Trigger download
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
        // Initial Fetch
        fetchTrades();
        fetchLiveData();

        const interval = setInterval(fetchTrades, 5000);   // History polling
        const liveInterval = setInterval(fetchLiveData, 1000); // Live Data polling
        
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
          const filtered = data.filter((t: any) => t.magicNumber === ea.magicNumber);
          
          setAllTrades(prev => {
              if (prev.length === filtered.length) {
                  if (prev.length === 0) return prev;
                  if (prev[0].ticket === filtered[0].ticket && prev[prev.length-1].ticket === filtered[filtered.length-1].ticket) {
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
                 // Open positions for this EA
                 const eaPos = allPos.filter(p => p.magic_number ===     ea.magicNumber);
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

  const closePosition = async (ticket: number) => {
    setClosingTickets(prev => new Set(prev).add(ticket));
    try {
      const res = await fetch(`/api/accounts/${accountId}/close-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json();
      if (!data.success) {
          alert("Error closing trade: " + data.error);
          setClosingTickets(prev => {
              const next = new Set(prev);
              next.delete(ticket);
              return next;
          });
      }
      // If success, keep spinner until it disappears from list via polling
    } catch (error) {
       console.error("Error closing trade", error);
       setClosingTickets(prev => {
          const next = new Set(prev);
          next.delete(ticket);
          return next;
      });
    }
  };

  // --- Statistics Calculation (Memoized) ---
  const stats = useMemo(() => {
    const totalTrades = allTrades.length;
    const wins = allTrades.filter(t => t.profit + t.swap + t.commission > 0);
    const losses = allTrades.filter(t => t.profit + t.swap + t.commission <= 0);
    
    const winningTrades = wins.length;
    const losingTrades = losses.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalClosedProfit = allTrades.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);
    
    // Floating PnL
    const floatingPnL = livePositions.reduce((sum, p) => sum + p.profit + p.swap + p.commission, 0);
    const totalEquity = totalClosedProfit + floatingPnL;

    const grossProfit = wins.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0));
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
    const expectedPayoff = totalTrades > 0 ? totalClosedProfit / totalTrades : 0;

    // Symbol Distribution
    const bySymbol: Record<string, number> = {};
    allTrades.forEach(t => {
        bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + 1;
    });
    const symbolDist = Object.entries(bySymbol)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return { 
        totalTrades, winningTrades, losingTrades, winRate, 
        totalClosedProfit, floatingPnL, totalEquity,
        profitFactor, expectedPayoff, symbolDist 
    };
  }, [allTrades, livePositions]);

  // Balance Curve
  const balanceCurve = useMemo(() => {
      let balance = 0; 
      // Sort trades by close time. If timestamps are equal, sort by ticket to ensure consistent order.
      return allTrades
        .sort((a, b) => {
             const timeDiff = new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime();
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
                balance
            };
        });
  }, [allTrades]);



  if (loading && !ea) {
      return <EAPageSkeleton />;
  }

  if (!ea) return <div className="p-8">EA no encontrado</div>;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
            <Link href={`/accounts/${accountId}`}>
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Bot className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    <span className="truncate max-w-[200px] md:max-w-none">{ea.name}</span>
                    {isLive && (
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">#{ea.magicNumber}</span>
                    <span className="text-xs hidden sm:inline">Estadísticas de EA en Tiempo Real</span>
                </div>
            </div>
        </div>
        
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar Informe
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Exportar Datos del EA</DialogTitle>
                    <DialogDescription>
                        Descarga un informe detallado en Excel. Selecciona el rango de fechas.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Rango de Fechas</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                    {format(dateRange.to, "LLL dd, y", { locale: es })}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y", { locale: es })
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P/L Flotante</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold transition-all", stats.floatingPnL >= 0 ? "text-profit" : "text-loss")}>
              {stats.floatingPnL >= 0 ? "+" : ""}${stats.floatingPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
               {stats.totalEquity - stats.floatingPnL > 0 ? ((stats.floatingPnL / (stats.totalEquity - stats.floatingPnL)) * 100).toFixed(2) : "0.00"}% · Posiciones: {livePositions.length}
            </p>
            <div className={cn("absolute right-0 top-0 h-full w-1 opacity-50", stats.floatingPnL >= 0 ? "bg-profit" : "bg-loss")} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equidad Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold")}>
              ${stats.totalEquity.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Balance: ${(stats.totalEquity - stats.floatingPnL).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Total (Cerrado)</CardTitle>
             <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.totalClosedProfit >= 0 ? "text-profit" : "text-loss")}>
               {stats.totalClosedProfit >= 0 ? "+" : ""}${stats.totalClosedProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={cn(stats.totalClosedProfit >= 0 ? "text-profit" : "text-loss")}>
                  {stats.totalClosedProfit >= 0 ? "+" : ""}
                  {(stats.totalEquity - stats.floatingPnL - stats.totalClosedProfit) > 0 
                      ? ((stats.totalClosedProfit / (stats.totalEquity - stats.floatingPnL - stats.totalClosedProfit)) * 100).toFixed(2) 
                      : "0.00"}%
              </span>
              {" "}· {stats.winningTrades} G / {stats.losingTrades} P
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factor de Beneficio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.profitFactor.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Esperanza Mat.: ${stats.expectedPayoff.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABS Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        {/* Scrollable tabs container for mobile */}
        <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
          <TabsList className="bg-secondary/50 p-1 inline-flex w-auto min-w-full sm:w-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-card whitespace-nowrap">
              <BarChart3 className="mr-2 h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="positions" className="relative data-[state=active]:bg-card whitespace-nowrap">
                <CircleDot className="mr-2 h-4 w-4" />
                Posiciones
                {livePositions.length > 0 && (
                     <Badge variant="destructive" className="ml-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                         {livePositions.length}
                     </Badge>
                )}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-card whitespace-nowrap">
              <HistoryIcon className="mr-2 h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OVERVIEW (Charts & Calendar) */}
        <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 ">
                <Card className="col-span- border-border bg-card">
                    <CardHeader>
                        <CardTitle>Crecimiento</CardTitle>
                        <CardDescription>Curva de equity (operaciones cerradas).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] outline-none focus:outline-none [&_.recharts-wrapper]:outline-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={balanceCurve}>
                            <defs>
                                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} 
                                domain={['auto', 'auto']} 
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                                formatter={(value: number | undefined) => [`$${(value || 0).toLocaleString("en-US", {minimumFractionDigits: 2})}`, "Balance"]}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload.length > 0) {
                                        const data = payload[0].payload;
                                        return `Trade #${label} (${data.date})`;
                                    }
                                    return `Trade #${label}`;
                                }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="balance" 
                                stroke="var(--chart-1)" 
                                strokeWidth={2} 
                                fill="url(#balanceGradient)" 
                                name="balance" 
                                animationDuration={500}
                            />
                            </AreaChart>
                        </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                
            </div>
            
            <CalendarPnL trades={allTrades} />
        </TabsContent>

        {/* TAB 2: POSITIONS */}
        <TabsContent value="positions" className="space-y-4">
            <Card className="border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Posiciones Abiertas</CardTitle>
                            <CardDescription>
                                {livePositions.length} posiciones | P&L Flotante:{" "}
                                <span className={cn("font-mono font-medium", stats.floatingPnL >= 0 ? "text-profit" : "text-loss")}>
                                    {stats.floatingPnL >= 0 ? "+" : ""}${stats.floatingPnL.toFixed(2)}
                                </span>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {livePositions.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            No hay posiciones abiertas
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
                                            <TableHead className="text-right text-muted-foreground">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {livePositions.map((p) => (
                                            <TableRow key={p.ticket} className="border-border hover:bg-secondary/50">
                                                <TableCell className="font-mono text-sm text-muted-foreground">#{p.ticket}</TableCell>
                                                <TableCell className="font-medium text-foreground">{p.symbol}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("font-medium uppercase", p.type === "buy" ? "bg-profit/20 text-profit border-profit/30" : "bg-loss/20 text-loss border-loss/30")}>
                                                        {p.type === "buy" ? "COMPRA" : "VENTA"}
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
                                                        disabled={closingTickets.has(p.ticket)}
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

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 p-4">
                                {livePositions.map((p) => (
                                    <div key={p.ticket} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{p.symbol}</span>
                                                <span className="text-xs text-muted-foreground">#{p.ticket}</span>
                                            </div>
                                            <Badge variant="outline" className={cn("font-medium uppercase text-xs", p.type === "buy" ? "bg-profit/20 text-profit border-profit/30" : "bg-loss/20 text-loss border-loss/30")}>
                                                {p.type === "buy" ? "COMPRA" : "VENTA"} {p.volume}
                                            </Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Apertura</span>
                                                <span className="font-mono">{p.open_price.toFixed(5)}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-muted-foreground">Actual</span>
                                                <span className="font-mono">{p.current_price.toFixed(5)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">SL</span>
                                                <span className="font-mono text-loss">{p.sl > 0 ? p.sl.toFixed(5) : "—"}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-muted-foreground">TP</span>
                                                <span className="font-mono text-profit">{p.tp > 0 ? p.tp.toFixed(5) : "—"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Beneficio</span>
                                                <span className={cn("font-mono font-medium text-lg", p.profit >= 0 ? "text-profit" : "text-loss")}>
                                                    {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                                                </span>
                                            </div>
                                            
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => closePosition(p.ticket)}
                                                disabled={closingTickets.has(p.ticket)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
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
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 3: HISTORY */}
        <TabsContent value="history" className="space-y-4">
            <AccountHistoryTab trades={allTrades} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
