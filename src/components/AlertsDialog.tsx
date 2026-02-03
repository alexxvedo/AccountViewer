'use client'

import { useState, useCallback } from "react"
import { Bell, Trash2, Plus, Send, Check, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useEffect } from "react"

interface Alert {
    id: string
    type: string
    condition: string
    value: number
    active: boolean
    triggered: boolean
    lastTriggeredAt?: string | null
    createdAt: string
}

interface AlertsDialogProps {
    accountId: string
    alerts: Alert[]
}

export function AlertsDialog({ accountId, alerts: initialAlerts }: AlertsDialogProps) {
    const [open, setOpen] = useState(false)
    const [telegramConnected, setTelegramConnected] = useState(false)
    const [loadingLink, setLoadingLink] = useState(false)
    const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
    const [loading, setLoading] = useState(false)

    // New Alert State
    const [type, setType] = useState('BALANCE')
    const [condition, setCondition] = useState('LT')
    const [value, setValue] = useState('')
    const [creating, setCreating] = useState(false)

    // Sync with props when they change
    useEffect(() => {
        setAlerts(initialAlerts)
    }, [initialAlerts])

    const fetchAlerts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/accounts/${accountId}/alerts`)
            if (res.ok) {
                const data = await res.json()
                setAlerts(data)
            }
        } catch (e) {
            console.error("Failed to fetch alerts", e)
        } finally {
            setLoading(false)
        }
    }, [accountId])

    // Fetch alerts when dialog opens and poll every 5 seconds while open
    useEffect(() => {
        if (open) {
            checkTelegramStatus()
            fetchAlerts()

            // Polling every 5 seconds while dialog is open
            const interval = setInterval(fetchAlerts, 5000)
            return () => clearInterval(interval)
        }
    }, [open, fetchAlerts])

    // Light polling every 30 seconds when closed to update badge
    useEffect(() => {
        if (!open) {
            const interval = setInterval(fetchAlerts, 30000)
            return () => clearInterval(interval)
        }
    }, [open, fetchAlerts])

    const checkTelegramStatus = async () => {
        try {
            const res = await fetch("/api/telegram/status")
            if (res.ok) {
                const data = await res.json()
                setTelegramConnected(data.connected)
            }
        } catch (e) {
            console.error("Failed to check telegram status", e)
        }
    }

    const handleConnectTelegram = async () => {
        setLoadingLink(true)
        try {
            const res = await fetch("/api/telegram/link", { method: "POST" })
            const data = await res.json()
            const token = data.token
            const botUsername = "GMonitorBot_bot"
            window.open(`https://t.me/${botUsername}?start=${token}`, '_blank')

            // Check status after a delay
            setTimeout(checkTelegramStatus, 5000)
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingLink(false)
        }
    }

    const handleCreateAlert = async () => {
        if (!value || creating) return

        setCreating(true)
        try {
            const res = await fetch(`/api/accounts/${accountId}/alerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    condition,
                    value: parseFloat(value)
                })
            })

            if (res.ok) {
                setValue('')
                await fetchAlerts()
            }
        } catch (e) {
            console.error("Failed to create alert", e)
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAlert = async (id: string) => {
        // Optimistic update
        setAlerts(prev => prev.filter(a => a.id !== id))

        try {
            await fetch(`/api/alerts/${id}`, { method: "DELETE" })
        } catch (e) {
            console.error(e)
            fetchAlerts() // Revert on error
        }
    }

    const handleResetAlert = async (id: string) => {
        try {
            // TODO: Add endpoint to reset alert
            await fetchAlerts()
        } catch (e) {
            console.error(e)
        }
    }

    const activeAlerts = alerts.filter(a => a.active && !a.triggered)
    const triggeredAlerts = alerts.filter(a => a.triggered)

    const getTypeLabel = (t: string) => {
        switch(t) {
            case 'BALANCE': return 'Balance'
            case 'EQUITY': return 'Equidad'
            case 'MARGIN': return 'Margen'
            default: return t
        }
    }

    const getConditionSymbol = (c: string) => c === 'GT' ? '>' : '<'

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "gap-2 font-medium transition-all",
                        activeAlerts.length > 0
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 hover:border-amber-500/50"
                            : "hover:bg-secondary hover:border-border"
                    )}
                >
                    <Bell className={cn("h-4 w-4", activeAlerts.length > 0 && "text-amber-500")} />
                    Alertas
                    {activeAlerts.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold min-w-[20px]">
                            {activeAlerts.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Bell className="h-5 w-5" />
                        Alertas de Cuenta
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
                    {/* Telegram Connection */}
                    <div className={`rounded-lg border p-4 ${telegramConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${telegramConnected ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                                    <Send className={`h-4 w-4 ${telegramConnected ? 'text-green-500' : 'text-amber-500'}`} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium">Telegram</h4>
                                    <p className="text-xs text-muted-foreground">
                                        {telegramConnected
                                            ? "Conectado - Recibirás notificaciones"
                                            : "Conecta para recibir alertas"}
                                    </p>
                                </div>
                            </div>
                            {telegramConnected ? (
                                <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium px-3 py-1.5 bg-green-500/10 rounded-full">
                                    <Check className="h-3 w-3" />
                                    Conectado
                                </span>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={handleConnectTelegram}
                                    disabled={loadingLink}
                                >
                                    {loadingLink ? "Abriendo..." : "Conectar Telegram"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Create Alert */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Crear Nueva Alerta</h4>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BALANCE">Balance</SelectItem>
                                            <SelectItem value="EQUITY">Equidad</SelectItem>
                                            <SelectItem value="MARGIN">Margen</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[110px]">
                                    <Select value={condition} onValueChange={setCondition}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GT">Mayor que {'>'}</SelectItem>
                                            <SelectItem value="LT">Menor que {'<'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Valor (ej: 1000)"
                                    className="flex-1 text-base h-10"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAlert()}
                                />

                                <Button
                                    onClick={handleCreateAlert}
                                    disabled={!value || creating}
                                    className="px-4 h-10 shrink-0"
                                >
                                    {creating ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    <span className="ml-2 sm:hidden">Crear</span>
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Notificación cuando {getTypeLabel(type).toLowerCase()} sea {condition === 'GT' ? 'mayor' : 'menor'} que el valor.
                        </p>
                    </div>

                    {/* Active Alerts */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                Alertas Activas
                                <span className="text-xs text-muted-foreground">({activeAlerts.length})</span>
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchAlerts}
                                disabled={loading}
                                className="h-7 px-2"
                            >
                                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {activeAlerts.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay alertas activas</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activeAlerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-blue-500/10 rounded">
                                                <Bell className="h-3.5 w-3.5 text-blue-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{getTypeLabel(alert.type)}</span>
                                                    <span className="text-muted-foreground">
                                                        {getConditionSymbol(alert.condition)}
                                                    </span>
                                                    <span className="font-mono text-sm">${alert.value.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteAlert(alert.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Triggered Alerts */}
                    {triggeredAlerts.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Alertas Ejecutadas
                                <span className="text-xs text-muted-foreground">({triggeredAlerts.length})</span>
                            </h4>

                            <div className="space-y-2">
                                {triggeredAlerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg opacity-75"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-amber-500/10 rounded">
                                                <Check className="h-3.5 w-3.5 text-amber-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{getTypeLabel(alert.type)}</span>
                                                    <span className="text-muted-foreground">
                                                        {getConditionSymbol(alert.condition)}
                                                    </span>
                                                    <span className="font-mono text-sm">${alert.value.toLocaleString()}</span>
                                                </div>
                                                {alert.lastTriggeredAt && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Ejecutada: {new Date(alert.lastTriggeredAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteAlert(alert.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
