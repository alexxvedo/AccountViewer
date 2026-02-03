
import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface EAStatsCardProps {
    ea: {
        id: string;
        name: string;
        magicNumber: number;
    };
    accountId: string;
    stats: {
        totalTrades: number;
        profit: number;
        winRate: number;
    };
    eaPositions: any[];
    onDelete: (id: string) => void;
    currentBalance?: number;
}

export const EAStatsCard = memo(function EAStatsCard({ 
    ea, 
    accountId, 
    stats, 
    eaPositions, 
    onDelete,
    currentBalance = 0
}: EAStatsCardProps) {
    
    const floatingPnL = eaPositions.reduce((sum: number, p: any) => sum + (p.profit || 0) + (p.swap || 0) + (p.commission || 0), 0);
    const isOperating = eaPositions.length > 0;
    
    const estimatedInitial = currentBalance - stats.profit;

    return (
        <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                    <Link href={`/accounts/${accountId}/ea/${ea.id}`} className="hover:underline flex items-center gap-1">
                        {ea.name}
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                        {isOperating && (
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse ml-2" title="Operando ahora" />
                        )}
                    </Link>
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(ea.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end mb-1">
                    <div>
                        <div className="text-2xl font-bold">
                            <span className={cn(stats.profit >= 0 ? "text-profit" : "text-loss")}>
                                {stats.profit >= 0 ? "+" : ""}${stats.profit.toFixed(2)}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                            P/L Cerrado
                            {currentBalance > 0 && (
                                <span className={cn("ml-1", stats.profit >= 0 ? "text-profit" : "text-loss")}>
                                    ({estimatedInitial > 0 ? ((stats.profit / estimatedInitial) * 100).toFixed(2) : "0.00"}%)
                                </span>
                            )}
                        </p>
                    </div>
                    
                    {/* Floating PnL Display */}
                    <div className="text-right">
                            <div className={cn("text-lg font-bold", floatingPnL >= 0 ? "text-profit" : "text-loss", floatingPnL === 0 && "text-muted-foreground")}>
                                {floatingPnL > 0 ? "+" : ""}${floatingPnL.toFixed(2)}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center justify-end gap-1">
                            {isOperating && <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                            Flotante ({eaPositions.length})
                             {currentBalance > 0 && (
                                <span className={cn("ml-1", floatingPnL >= 0 ? "text-profit" : "text-loss")}>
                                    ({((floatingPnL / currentBalance) * 100).toFixed(2)}%)
                                </span>
                            )}
                            </p>
                    </div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mb-4">
                    <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded mr-2">#{ea.magicNumber}</span>
                    <span>Número Mágico</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Operaciones</p>
                        <p className="text-lg font-semibold">{stats.totalTrades}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Tasa de Acierto</p>
                        <p className={cn("text-lg font-semibold", stats.winRate >= 50 ? "text-profit" : "text-loss")}>
                            {stats.winRate.toFixed(1)}%
                        </p>
                    </div>
                </div>
                
            </CardContent>
        </Card>
    );
});
