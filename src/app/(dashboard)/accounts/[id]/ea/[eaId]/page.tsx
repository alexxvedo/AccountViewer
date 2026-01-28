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
  Download
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
const TRADES_PER_PAGE = 50;

export default function EADetailsPage() {
  const params = useParams();
  const accountId = params.id as string;
  const eaId = params.eaId as string;

  const [ea, setEa] = useState<ExpertAdvisor | null>(null);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [historyPage, setHistoryPage] = useState(1);
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
          const filtered = data.filter((t: any) => t.magicNumber == ea.magicNumber);
          
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
                 const eaPos = allPos.filter(p => p.magic_number == ea.magicNumber);
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
      return allTrades
        .sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())
        .map(t => {
            const pl = t.profit + t.swap + t.commission;
            balance += pl;
            return {
                date: new Date(t.closeTime).toLocaleDateString(),
                balance
            };
        });
  }, [allTrades]);

  // Filtered History for Pagination
  const { paginatedTrades, totalPages } = useMemo(() => {
     // Sort desc by close time (or ticket)
     const sorted = [...allTrades].sort((a, b) => b.ticket - a.ticket);
     const totalPages = Math.ceil(sorted.length / TRADES_PER_PAGE);
     const start = (historyPage - 1) * TRADES_PER_PAGE;
     const paginatedTrades = sorted.slice(start, start + TRADES_PER_PAGE);
     return { paginatedTrades, totalPages };
  }, [allTrades, historyPage]);


  if (loading && !ea) {
      return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!ea) return <div className="p-8">EA no encontrado</div>;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
            <Link href={`/accounts/${accountId}`}>
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Bot className="h-8 w-8 text-primary" />
                    {ea.name}
                    {isLive && (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">#{ea.magicNumber}</span>
                    <span>Expert Advisor Real-time Stats</span>
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
            <CardTitle className="text-sm font-medium">Floating P/L</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold transition-all", stats.floatingPnL >= 0 ? "text-profit" : "text-loss")}>
              {stats.floatingPnL >= 0 ? "+" : ""}${stats.floatingPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
               Running Positions: {livePositions.length}
            </p>
            <div className={cn("absolute right-0 top-0 h-full w-1 opacity-50", stats.floatingPnL >= 0 ? "bg-profit" : "bg-loss")} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold")}>
              ${stats.totalEquity.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Balance + Floating
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit (Close)</CardTitle>
             <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.totalClosedProfit >= 0 ? "text-profit" : "text-loss")}>
               {stats.totalClosedProfit >= 0 ? "+" : ""}${stats.totalClosedProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.winningTrades} W / {stats.losingTrades} L ({stats.winRate.toFixed(0)}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.profitFactor.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Exp. Payoff: ${stats.expectedPayoff.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABS Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="positions" className="relative">
                Posiciones
                {livePositions.length > 0 && (
                     <Badge variant="destructive" className="ml-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                         {livePositions.length}
                     </Badge>
                )}
            </TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW (Charts & Calendar) */}
        <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-border bg-card">
                    <CardHeader>
                        <CardTitle>Crecimiento</CardTitle>
                        <CardDescription>Curva de equity (operaciones cerradas).</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                            <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={balanceCurve}>
                                    <defs>
                                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" tickLine={false} axisLine={false} minTickGap={30} />
                                    <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Balance"]}
                                    />
                                    <Area type="monotone" dataKey="balance" stroke="var(--primary)" fillOpacity={1} fill="url(#colorBalance)" />
                                </AreaChart>
                            </ResponsiveContainer>
                            </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 border-border bg-card">
                    <CardHeader>
                        <CardTitle>Símbolos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.symbolDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                        {stats.symbolDist.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderRadius: "8px" }} />
                                </PieChart>
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
                    <CardTitle>Operaciones en Curso</CardTitle>
                    <CardDescription>Gestión de trades activos del EA.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticket</TableHead>
                                <TableHead>Símbolo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Volumen</TableHead>
                                <TableHead>Open</TableHead>
                                <TableHead>Current</TableHead>
                                <TableHead className="text-right">P/L</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {livePositions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No hay operaciones abiertas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                livePositions.map((pos) => (
                                    <TableRow key={pos.ticket}>
                                        <TableCell className="font-mono">{pos.ticket}</TableCell>
                                        <TableCell>{pos.symbol}</TableCell>
                                        <TableCell>
                                            <Badge variant={pos.type === 'buy' ? 'default' : 'destructive'} className="uppercase text-[10px]">
                                                {pos.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{pos.volume}</TableCell>
                                        <TableCell>{pos.open_price}</TableCell>
                                        <TableCell>{pos.current_price}</TableCell>
                                        <TableCell className={cn("text-right font-mono font-medium", pos.profit >= 0 ? "text-profit" : "text-loss")}>
                                            ${(pos.profit + pos.swap + pos.commission).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => closePosition(pos.ticket)}
                                                disabled={closingTickets.has(pos.ticket)}
                                            >
                                                {closingTickets.has(pos.ticket) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <X className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 3: HISTORY */}
        <TabsContent value="history" className="space-y-4">
             <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle>Historial de Operaciones</CardTitle>
                    <CardDescription>Registro completo de ejecuciones.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticket</TableHead>
                                <TableHead>Símbolo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Volumen</TableHead>
                                <TableHead>Open</TableHead>
                                <TableHead>Close</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTrades.map((t) => (
                                <TableRow key={t.ticket}>
                                    <TableCell className="font-mono">{t.ticket}</TableCell>
                                    <TableCell>{t.symbol}</TableCell>
                                    <TableCell>
                                        <Badge variant={t.type === 'buy' ? 'default' : 'destructive'} className="uppercase text-[10px]">
                                            {t.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{t.volume}</TableCell>
                                    <TableCell>{t.openPrice}</TableCell>
                                    <TableCell>{t.closePrice}</TableCell>
                                    <TableCell className={cn("text-right font-mono font-medium", t.profit + t.swap + t.commission >= 0 ? "text-profit" : "text-loss")}>
                                        ${(t.profit + t.swap + t.commission).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                        >
                            Anterior
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Página {historyPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                            disabled={historyPage === totalPages}
                        >
                            Siguiente
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
