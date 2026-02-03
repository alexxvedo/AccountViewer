
import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, DollarSign, TrendingUp, Target, Scale, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountStatsGridProps {
    liveData: any;
    floatingPL: number;
    currentBalance: number;
    currentEquity: number;
    totalProfit: number;
    totalTrades: number;
    winRate: number;
    winningTrades: number;
    losingTrades: number;
    profitFactor: number;
    expectancy: number;
    currentFreeMargin: number;
}

export const AccountStatsGrid = memo(function AccountStatsGrid({
    liveData,
    floatingPL,
    currentBalance,
    currentEquity,
    totalProfit,
    totalTrades,
    winRate,
    winningTrades,
    losingTrades,
    profitFactor,
    expectancy,
    currentFreeMargin
}: AccountStatsGridProps) {

    return (
        <div className="grid gap-3 grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Card className="border-border bg-card relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Floating P/L</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className={cn("text-lg sm:text-2xl font-bold transition-all", floatingPL >= 0 ? "text-profit" : "text-loss")}>
              {floatingPL >= 0 ? "+" : ""}${floatingPL.toFixed(0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
               Pos: {liveData?.positions?.length || 0}
            </p>
            <div className={cn("absolute right-0 top-0 h-full w-1 opacity-50", floatingPL >= 0 ? "bg-profit" : "bg-loss")} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Equity</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              ${currentEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Bal: ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
             <div className={cn("text-lg sm:text-2xl font-bold", totalProfit >= 0 ? "text-profit" : "text-loss")}>
               {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {totalTrades} trades
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
             <div className="text-lg sm:text-2xl font-bold">
               {winRate.toFixed(1)}%
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
               {winningTrades}W / {losingTrades}L
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Profit Factor</CardTitle>
            <Scale className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
             <div className="text-lg sm:text-2xl font-bold">
               {profitFactor ? profitFactor.toFixed(2) : "—"}
            </div>
             <p className="text-[10px] sm:text-xs text-muted-foreground">
               Exp: ${expectancy.toFixed(0)}
            </p>
          </CardContent>
        </Card>

         <Card className="border-border bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Free Margin</CardTitle>
            <Percent className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
             <div className="text-lg sm:text-2xl font-bold">
               ${currentFreeMargin.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
             <p className="text-[10px] sm:text-xs text-muted-foreground">
               Available
            </p>
          </CardContent>
        </Card>
      </div>
    );
});
