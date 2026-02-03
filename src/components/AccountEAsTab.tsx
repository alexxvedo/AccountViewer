import { memo, useState } from "react";
import { Bot, Plus, Download, CalendarIcon } from "lucide-react";
import { CreateEADialog } from "@/components/CreateEADialog";
import { EAStatsCard } from "@/components/EAStatsCard";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface ExpertAdvisor {
    id: string;
    name: string;
    magicNumber: number;
}

interface AccountEAsTabProps {
    accountId: string;
    eas: ExpertAdvisor[];
    liveData: any;
    statsByEA: Record<number, any>;
    onEAAdded: () => void;
    onDeleteEA: (id: string) => void;
}

export function AccountEAsTab({
    accountId,
    eas,
    liveData,
    statsByEA,
    onEAAdded,
    onDeleteEA
}: AccountEAsTabProps) {
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
        
        const url = `/api/accounts/${accountId}/eas-report${query}`;
        window.location.href = url;
        setIsReportOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
                <div>
                   <h3 className="text-lg font-semibold flex items-center gap-2">
                       <Bot className="h-5 w-5 text-primary" />
                       Expert Advisors
                   </h3>
                   <p className="text-sm text-muted-foreground">Gestiona tus EAs y monitorea su rendimiento individual por Magic Number.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Resumen Excel
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Generar Informe Consolidado</DialogTitle>
                                <DialogDescription>
                                    Descarga un Excel comparativo de todos los EAs y sus operaciones.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Rango de Fechas (Opcional)</Label>
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
                                            <span>Todo el historial</span>
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

                    <CreateEADialog accountId={accountId} onSuccess={onEAAdded} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eas.map(ea => {
                    const stats = statsByEA[ea.magicNumber] || { totalTrades: 0, profit: 0, winRate: 0 };
                    
                    // Memo: filtering here inside the map might still be expensive if liveData matches many positions.
                    // But if this component is memoized, it only runs when liveData updates.
                    const eaPositions = liveData?.positions?.filter((p: any) => p.magic_number == ea.magicNumber) || [];
                    
                    return (
                        <EAStatsCard 
                            key={ea.id} 
                            ea={ea} 
                            accountId={accountId} 
                            stats={stats} 
                            eaPositions={eaPositions} 
                            onDelete={onDeleteEA} 
                            currentBalance={liveData?.account?.balance || 0}
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
        </div>
    );
}
