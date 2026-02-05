"use client";

import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, History, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateEADialogProps {
  accountId: string;
  onSuccess: (ea: any) => void;
}

interface ExistingTradesInfo {
  count: number;
  totalProfit: number;
  firstTradeDate: string;
  lastTradeDate: string;
}

interface MagicNumberInfo {
  magic: string;
  count: number;
  hasEA: boolean;
}

export const CreateEADialog = memo(function CreateEADialog({
  accountId,
  onSuccess,
}: CreateEADialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [magic, setMagic] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingTrades, setCheckingTrades] = useState(false);
  const [existingTrades, setExistingTrades] = useState<ExistingTradesInfo | null>(null);
  const [linkTrades, setLinkTrades] = useState(true);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [magicNumbers, setMagicNumbers] = useState<MagicNumberInfo[]>([]);
  const [loadingMagicNumbers, setLoadingMagicNumbers] = useState(false);

  // Fetch available magic numbers when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchMagicNumbers();
    }
  }, [isOpen, accountId]);

  const fetchMagicNumbers = async () => {
    setLoadingMagicNumbers(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/trades/magic-numbers`);
      if (res.ok) {
        const data = await res.json();
        setMagicNumbers(data.magicNumbers || []);
      }
    } catch (error) {
      console.error("Error fetching magic numbers:", error);
    } finally {
      setLoadingMagicNumbers(false);
    }
  };

  const resetForm = () => {
    setName("");
    setMagic("");
    setExistingTrades(null);
    setLinkTrades(true);
    setStep("form");
  };

  const handleMagicChange = async (value: string) => {
    setMagic(value);
    setExistingTrades(null);

    const magicNum = parseInt(value);
    if (value && !isNaN(magicNum) && magicNum > 0) {
      setCheckingTrades(true);
      try {
        const res = await fetch(
          `/api/accounts/${accountId}/trades/check-magic?magic=${magicNum}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.count > 0) {
            setExistingTrades(data);
          }
        }
      } catch (error) {
        console.error("Error checking trades:", error);
      } finally {
        setCheckingTrades(false);
      }
    }
  };

  const handleNext = () => {
    if (!name) {
      alert("Introduce un nombre");
      return;
    }
    const magicNum = parseInt(magic);
    if (!magic || isNaN(magicNum)) {
      alert("Número Mágico inválido");
      return;
    }

    if (existingTrades && existingTrades.count > 0) {
      setStep("confirm");
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const magicNum = parseInt(magic);

    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/eas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          magicNumber: magicNum,
          linkExistingTrades: linkTrades,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onSuccess(data.ea);
        resetForm();
        setIsOpen(false);
      } else {
        alert(data.message || "Error creando EA");
      }
    } catch (error) {
      console.error("Error creating EA:", error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-secondary/50 border-secondary"
        >
          <Plus className="h-4 w-4" /> Nuevo EA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo EA</DialogTitle>
              <DialogDescription>
                Asocia un nombre a un Número Mágico para rastrear sus
                estadísticas.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del EA</Label>
                <Input
                  id="name"
                  placeholder="Ej: Scalper Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="magic">Número Mágico</Label>
                <div className="relative">
                  <Input
                    id="magic"
                    placeholder="Ej: 123456"
                    type="number"
                    value={magic}
                    onChange={(e) => handleMagicChange(e.target.value)}
                  />
                  {checkingTrades && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Trades Info */}
              {existingTrades && existingTrades.count > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <History className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        Operaciones existentes encontradas
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Hay{" "}
                        <span className="font-semibold text-foreground">
                          {existingTrades.count} operaciones
                        </span>{" "}
                        con este número mágico.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>
                          P/L:{" "}
                          <span
                            className={cn(
                              "font-medium",
                              existingTrades.totalProfit >= 0
                                ? "text-profit"
                                : "text-loss"
                            )}
                          >
                            {existingTrades.totalProfit >= 0 ? "+" : ""}$
                            {existingTrades.totalProfit.toFixed(2)}
                          </span>
                        </span>
                        <span>
                          Desde: {formatDate(existingTrades.firstTradeDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No trades found - show available magic numbers */}
              {magic && !checkingTrades && !existingTrades && magicNumbers.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        No hay operaciones con Magic #{magic}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Magic Numbers disponibles en tu cuenta:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {magicNumbers
                          .filter(m => m.magic !== "null" && m.magic !== "0" && !m.hasEA)
                          .slice(0, 5)
                          .map((m) => (
                            <button
                              key={m.magic}
                              type="button"
                              onClick={() => handleMagicChange(m.magic)}
                              className="px-2 py-1 text-xs font-mono bg-secondary rounded hover:bg-secondary/80 transition-colors"
                            >
                              #{m.magic} ({m.count})
                            </button>
                          ))}
                        {magicNumbers.filter(m => m.magic !== "null" && m.magic !== "0" && !m.hasEA).length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No hay magic numbers sin vincular
                          </span>
                        )}
                      </div>
                      {magicNumbers.some(m => m.magic === "0" || m.magic === "null") && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ⚠️ Tienes{" "}
                          {magicNumbers
                            .filter(m => m.magic === "0" || m.magic === "null")
                            .reduce((sum, m) => sum + m.count, 0)}{" "}
                          operaciones sin magic number asignado
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleNext} disabled={loading || checkingTrades}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingTrades && existingTrades.count > 0
                  ? "Continuar"
                  : "Crear EA"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Vincular Operaciones Históricas</DialogTitle>
              <DialogDescription>
                Se encontraron operaciones anteriores con el número mágico{" "}
                <span className="font-mono font-medium">{magic}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{existingTrades?.count}</p>
                    <p className="text-xs text-muted-foreground">Operaciones</p>
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        (existingTrades?.totalProfit || 0) >= 0
                          ? "text-profit"
                          : "text-loss"
                      )}
                    >
                      {(existingTrades?.totalProfit || 0) >= 0 ? "+" : ""}$
                      {(existingTrades?.totalProfit || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Beneficio Total
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-center text-xs text-muted-foreground">
                  {formatDate(existingTrades?.firstTradeDate || "")} →{" "}
                  {formatDate(existingTrades?.lastTradeDate || "")}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setLinkTrades(true)}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-colors",
                    linkTrades
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        linkTrades ? "border-primary" : "border-muted-foreground"
                      )}
                    >
                      {linkTrades && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Vincular operaciones existentes
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Las estadísticas incluirán el historial completo
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setLinkTrades(false)}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-colors",
                    !linkTrades
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        !linkTrades ? "border-primary" : "border-muted-foreground"
                      )}
                    >
                      {!linkTrades && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Empezar desde cero</p>
                      <p className="text-xs text-muted-foreground">
                        Solo contará operaciones futuras
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {!linkTrades && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    Las operaciones existentes no se eliminarán, simplemente no
                    se asociarán a esta EA.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={loading}
              >
                Volver
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear EA
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
