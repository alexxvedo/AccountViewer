
import { memo, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarPnL } from "@/components/CalendarPnL";
import { cn } from "@/lib/utils";

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
}

interface AccountOverviewTabProps {
  allTrades: Trade[];
  currentBalance: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
}

export const AccountOverviewTab = memo(function AccountOverviewTab({
  allTrades,
  currentBalance,
  profitFactor,
  expectancy,
  avgWin,
  avgLoss,
  totalTrades
}: AccountOverviewTabProps) {
  const [chartRange, setChartRange] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");

  // --- Calculations moved from Page to Component ---

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

  return (
    <div className="space-y-6">
          {/* Equity Curve */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border bg-card lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Curva de Balance</CardTitle>
                    <CardDescription>Crecimiento de la cuenta</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg">
                    {[
                      { l: "1S", v: "1W" },
                      { l: "1M", v: "1M" },
                      { l: "3M", v: "3M" },
                      { l: "Anual", v: "YTD" },
                      { l: "Todo", v: "ALL" }
                    ].map((item) => (
                      <button
                        key={item.v}
                        onClick={() => setChartRange(item.v as any)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all",
                          chartRange === item.v
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] outline-none focus:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none" tabIndex={-1}>
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

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Factor de Beneficio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-foreground">{profitFactor === 0 ? "—" : profitFactor.toFixed(2)}</span>
                  <span className={cn("text-xs", profitFactor >= 1.5 ? "text-profit" : profitFactor >= 1 ? "text-warning" : "text-loss")}>
                    {profitFactor >= 1.5 ? "Excelente" : profitFactor >= 1 ? "Bueno" : "Mejorar"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gan. Media: ${avgWin.toFixed(0)} | Pérd. Media: ${avgLoss.toFixed(0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Esperanza Matemática</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-bold font-mono", expectancy >= 0 ? "text-profit" : "text-loss")}>${expectancy.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">por operación</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Basado en {totalTrades} operaciones
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
                    <p className="text-xs text-muted-foreground">Ganancias cons.</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold font-mono text-loss">{maxLosses}</span>
                    <p className="text-xs text-muted-foreground">Pérdidas cons.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Compras vs Ventas</CardTitle>
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Acierto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Compras ({longTrades.length})</span>
                    <span className="font-mono text-profit">{longWinRate.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ventas ({shortTrades.length})</span>
                    <span className="font-mono text-chart-3">{shortWinRate.toFixed(0)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar View */}
          <CalendarPnL trades={allTrades} />
    </div>
  );
});
