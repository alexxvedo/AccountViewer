"use strict";
import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
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
  comment?: string | null;
}

interface CalendarPnLProps {
  trades: Trade[];
}

const CalendarPnL = memo(({ trades }: CalendarPnLProps) => {
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Datos para el Calendario
  const calendarStats = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // Filtrar trades del mes seleccionado
    const monthTrades = trades.filter(t => {
      const d = new Date(t.closeTime);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const byDay: Record<number, { pnl: number; trades: number; wins: number }> = {};
    let totalMonthPnL = 0;
    let activeDays = 0;

    monthTrades.forEach(t => {
      const day = new Date(t.closeTime).getDate();
      const pl = t.profit + t.swap + t.commission;
      
      if (!byDay[day]) {
        byDay[day] = { pnl: 0, trades: 0, wins: 0 };
        activeDays++;
      }
      
      byDay[day].pnl += pl;
      byDay[day].trades += 1;
      if (pl > 0) byDay[day].wins += 1;
      totalMonthPnL += pl;
    });

    return { byDay, totalMonthPnL, activeDays };
  }, [trades, calendarDate]);

  const { byDay: calendarData, totalMonthPnL, activeDays: monthActiveDays } = calendarStats;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Month Navigation */}
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[140px] text-center text-lg font-semibold">
                      {calendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, (c: string) => c.toUpperCase())}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}>
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setCalendarDate(new Date())}>
                  Este mes
              </Button>
          </div>

          {/* Monthly Stats */}
          <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">P/L Mensual:</span>
                  <Badge variant="outline" className={cn("text-sm font-mono", totalMonthPnL >= 0 ? "bg-profit/10 text-profit border-profit/20" : "bg-loss/10 text-loss border-loss/20")}>
                      {totalMonthPnL >= 0 ? "+" : ""}${totalMonthPnL.toLocaleString("en-US", {minimumFractionDigits: 2})}
                  </Badge>
              </div>
              <Badge variant="secondary" className="h-9 px-3 text-sm">
                  {monthActiveDays} days
              </Badge>
              <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
              </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
         {/* Calendar Grid */}
         <div className="grid grid-cols-7 gap-1 sm:gap-2">
           {/* Weekday Headers */}
           {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
              </div>
           ))}

           {/* Empty cells for start offset */}
           {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="h-20 sm:h-24 bg-secondary/10 rounded-md" />
           ))}

           {/* Days */}
           {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1;
              const data = calendarData[day];
              const hasData = !!data;
              const isProfit = hasData && data.pnl >= 0;
              
              return (
                  <div 
                      key={day} 
                      className={cn(
                          "h-20 sm:h-24 rounded-md p-1 flex flex-col justify-between border transition-all relative group",
                          hasData 
                              ? (isProfit ? "bg-profit/10 border-profit/30 hover:bg-profit/20" : "bg-loss/10 border-loss/30 hover:bg-loss/20")
                              : "bg-card border-border hover:bg-secondary/20"
                      )}
                  >
                      <span className="text-[10px] text-muted-foreground font-medium">{day}</span>
                      
                      {hasData ? (
                          <div className="flex flex-col items-center justify-center h-full gap-0.5">
                              <span className={cn("font-bold font-mono text-xs sm:text-sm", isProfit ? "text-profit" : "text-loss")}>
                                  ${Math.abs(data.pnl).toLocaleString("en-US", { notation: "compact" })}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                  {data.trades} trade{data.trades !== 1 ? 's' : ''}
                              </span>
                              <span className={cn("text-[9px] font-medium", isProfit ? "text-profit" : "text-loss")}>
                                  {data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(0) : 0}%
                              </span>
                          </div>
                      ) : null}
                  </div>
              );
           })}
         </div>
      </CardContent>
    </Card>
  );
});

CalendarPnL.displayName = "CalendarPnL";

export { CalendarPnL };
