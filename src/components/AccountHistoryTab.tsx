
import { useState, useMemo, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Check, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
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
  magicNumber?: number | null;
}

interface AccountHistoryTabProps {
  trades: Trade[];
}

export const AccountHistoryTab = memo(function AccountHistoryTab({ trades }: AccountHistoryTabProps) {
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(20); // Default to 20 for better initial perf
  const [historyResultFilter, setHistoryResultFilter] = useState<"all" | "win" | "loss">("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Pre-process trades dates once when trades change, to avoid new Date() in every filter pass
  const processedTrades = useMemo(() => {
      return trades.map(t => ({
          ...t,
          parsedCloseTime: new Date(t.closeTime),
          totalProfit: t.profit + t.swap + t.commission
      }));
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return processedTrades.filter((trade) => {
      const pl = trade.totalProfit;
      
      // Result Filter
      if (historyResultFilter === "win" && pl <= 0) return false;
      if (historyResultFilter === "loss" && pl >= 0) return false;

      // Date Filter
      if (periodFilter === "all") return true;

      const tradeDate = trade.parsedCloseTime;
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
  }, [processedTrades, historyResultFilter, periodFilter, dateFrom, dateTo]);

  // Derived stats from filtered view
  const { totalProfit, wins, losses } = useMemo(() => {
      let profit = 0;
      let w = 0;
      let l = 0;
      for (const t of filteredTrades) {
          profit += t.totalProfit;
          if (t.totalProfit > 0) w++;
          else if (t.totalProfit < 0) l++;
      }
      return { totalProfit: profit, wins: w, losses: l };
  }, [filteredTrades]);

  // Pagination
  const effectiveHistoryPerPage = historyPerPage === 0 ? filteredTrades.length : historyPerPage;
  const totalHistoryPages = effectiveHistoryPerPage > 0 ? Math.ceil(filteredTrades.length / effectiveHistoryPerPage) : 1;
  
  // Safe page bounds
  const currentPage = Math.min(Math.max(1, historyPage), totalHistoryPages);
  
  const paginatedTrades = useMemo(() => 
    historyPerPage === 0 
        ? filteredTrades 
        : filteredTrades.slice((currentPage - 1) * historyPerPage, currentPage * historyPerPage),
    [filteredTrades, currentPage, historyPerPage]
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-foreground">Historial de Operaciones</CardTitle>
            <CardDescription>{filteredTrades.length} operaciones</CardDescription>
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

            <Select value={historyResultFilter} onValueChange={(v) => { setHistoryResultFilter(v as any); setHistoryPage(1); }}>
              <SelectTrigger className="w-[130px] bg-secondary border-border">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="win">Ganadoras</SelectItem>
                <SelectItem value="loss">Perdedoras</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v as any); setHistoryPage(1); }}>
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
                Ganadas: <span className="text-profit font-medium">{wins}</span>
            </span>
            <span className="text-muted-foreground">
                Perdidas: <span className="text-loss font-medium">{losses}</span>
            </span>
            <span className={cn("font-bold", totalProfit >= 0 ? "text-profit" : "text-loss")}>
                Total: {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
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
                    const pl = t.totalProfit;
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
                          {t.parsedCloseTime.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
                Mostrando {Math.min(filteredTrades.length, (currentPage - 1) * effectiveHistoryPerPage + 1)} - {Math.min(filteredTrades.length, currentPage * effectiveHistoryPerPage)} de {filteredTrades.length} trades
              </p>

              {effectiveHistoryPerPage > 0 && totalHistoryPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(1)} 
                    disabled={currentPage === 1}
                    className="hidden sm:flex"
                  >
                    Primera
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anteriores
                  </Button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    <span className="text-sm font-medium">Página {currentPage}</span>
                    <span className="text-sm text-muted-foreground">de {totalHistoryPages}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} 
                    disabled={currentPage === totalHistoryPages}
                  >
                    Siguientes <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(totalHistoryPages)} 
                    disabled={currentPage === totalHistoryPages}
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
  );
});
