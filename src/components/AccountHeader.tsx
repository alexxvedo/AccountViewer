
import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Check, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountHeaderProps {
    account: any;
    isLive: boolean;
    syncing: boolean;
    copiedToken: boolean;
    onCopyToken: () => void;
    onSync: () => void;
}

export const AccountHeader = memo(function AccountHeader({ 
    account, 
    isLive, 
    syncing, 
    copiedToken, 
    onCopyToken, 
    onSync 
}: AccountHeaderProps) {
    if (!account) return null;

    return (
        <div className="mb-6">
            <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Activity className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {account.nickname || `Cuenta ${account.accountNumber}`}
                            {isLive && (
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">{account.broker}</span>
                            <span className="text-xs font-mono">#{account.accountNumber}</span>
                            <span className="text-xs">•</span>
                            <span className="text-xs">{account.platform}</span>
                            <Badge variant="outline" className={cn("ml-2 border font-medium", isLive ? "bg-profit/20 text-profit border-profit/30" : "bg-muted text-muted-foreground")}>
                                {isLive ? "Conectado" : "Desconectado"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCopyToken} className="gap-2">
                        {copiedToken ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        Token
                    </Button>
                    <Button variant="outline" size="sm" onClick={onSync} disabled={syncing} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                        Sync
                    </Button>
                </div>
            </div>
        </div>
    );
});
