
import { memo } from "react";
import { Bot, Plus } from "lucide-react";
import { CreateEADialog } from "@/components/CreateEADialog";
import { EAStatsCard } from "@/components/EAStatsCard";

interface ExpertAdvisor {
    id: string;
    name: string;
    magicNumber: number;
}

interface AccountEAsTabProps {
    accountId: string;
    eas: ExpertAdvisor[];
    liveData: any;
    statsByEA: Record<string, any>;
    onEAAdded: (newEA: ExpertAdvisor) => void;
    onDeleteEA: (id: string) => void;
}

export const AccountEAsTab = memo(function AccountEAsTab({
    accountId,
    eas,
    liveData,
    statsByEA,
    onEAAdded,
    onDeleteEA
}: AccountEAsTabProps) {

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
                <div>
                   <h3 className="text-lg font-semibold flex items-center gap-2">
                       <Bot className="h-5 w-5 text-primary" />
                       Expert Advisors
                   </h3>
                   <p className="text-sm text-muted-foreground">Gestiona tus EAs y monitorea su rendimiento individual por Magic Number.</p>
                </div>
                
                <CreateEADialog accountId={accountId} onSuccess={onEAAdded} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eas.map(ea => {
                    const stats = statsByEA[ea.id] || { totalTrades: 0, profit: 0, winRate: 0 };
                    
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
});
