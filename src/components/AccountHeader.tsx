
import { memo, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Check, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountHeaderProps {
    account: any;
    isLive: boolean;
    syncing: boolean;
    copiedToken: boolean;
    onCopyToken: () => void;
    onSync: () => void;
    actions?: ReactNode;
}

export const AccountHeader = memo(function AccountHeader({
    account,
    isLive,
    syncing,
    copiedToken,
    onCopyToken,
    onSync,
    actions
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
                    
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            {account.nickname || `Cuenta ${account.accountNumber}`}
                            {isLive && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    En vivo
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <span className="bg-secondary px-2.5 py-0.5 rounded-md text-xs font-medium">{account.broker}</span>
                            <span className="text-xs font-mono text-muted-foreground/70">#{account.accountNumber}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-xs text-muted-foreground/70">{account.platform}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-xs text-muted-foreground/70">{account.server}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {actions}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCopyToken}
                        className={cn(
                            "gap-2 font-medium transition-all",
                            copiedToken
                                ? "bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20"
                                : "hover:bg-secondary hover:border-border"
                        )}
                    >
                        {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedToken ? "Copiado" : "Token"}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSync}
                        disabled={syncing}
                        className={cn(
                            "gap-2 font-medium transition-all",
                            syncing
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "hover:bg-secondary hover:border-border"
                        )}
                    >
                        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                        {syncing ? "Sincronizando..." : "Sincronizar"}
                    </Button>
                </div>
            </div>
        </div>
    );
});
