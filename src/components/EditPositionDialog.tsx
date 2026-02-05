"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  AlertTriangle,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  open_price: number;
  current_price: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
}

interface EditPositionDialogProps {
  position: Position | null;
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPositionDialog({
  position,
  accountId,
  open,
  onOpenChange,
  onSuccess,
}: EditPositionDialogProps) {
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialSl, setInitialSl] = useState(0);
  const [initialTp, setInitialTp] = useState(0);

  // Determine decimal places for display
  const getDecimals = useCallback((symbol: string) => {
    if (symbol.includes("JPY")) return 3;
    if (symbol.includes("XAU")) return 2;
    if (symbol.includes("US30") || symbol.includes("NAS") || symbol.includes("SPX") ||
        symbol.includes("USTEC") || symbol.includes("US500")) return 1;
    return 5;
  }, []);

  const decimals = position ? getDecimals(position.symbol) : 5;

  // Reset values when dialog opens with a new position
  useEffect(() => {
    if (position && open) {
      const slValue = position.sl > 0 ? position.sl.toFixed(decimals) : "";
      const tpValue = position.tp > 0 ? position.tp.toFixed(decimals) : "";
      setSl(slValue);
      setTp(tpValue);
      setInitialSl(position.sl);
      setInitialTp(position.tp);
    }
  }, [position?.ticket, open, decimals]);

  // Handle SL change - if stepping from empty, use current price
  const handleSlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If previous value was empty and new value is very small, user clicked step arrows
    if (sl === "" && newValue !== "" && position) {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && Math.abs(numValue) < 1) {
        // Step from 0 detected, use current price as base
        setSl(position.current_price.toFixed(decimals));
        return;
      }
    }

    setSl(newValue);
  }, [sl, position, decimals]);

  // Handle TP change - if stepping from empty, use current price
  const handleTpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If previous value was empty and new value is very small, user clicked step arrows
    if (tp === "" && newValue !== "" && position) {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && Math.abs(numValue) < 1) {
        // Step from 0 detected, use current price as base
        setTp(position.current_price.toFixed(decimals));
        return;
      }
    }

    setTp(newValue);
  }, [tp, position, decimals]);

  // Calculate potential profit/loss at SL and TP
  const calculations = useMemo(() => {
    if (!position) return null;

    const slPrice = parseFloat(sl) || 0;
    const tpPrice = parseFloat(tp) || 0;
    const { open_price, current_price, profit, type, volume, symbol } = position;

    // Calculate profit per point based on actual position data
    // This is the most accurate method as it uses real broker data
    const priceDiff = Math.abs(current_price - open_price);

    // Determine decimal places for the symbol (affects point value)
    const isJPY = symbol.includes("JPY");
    const isGold = symbol.includes("XAU");
    const isIndex = symbol.includes("US30") || symbol.includes("NAS") || symbol.includes("SPX") ||
                   symbol.includes("DAX") || symbol.includes("USTEC") || symbol.includes("US500");

    // Get pip/point multiplier based on instrument
    let pipMultiplier: number;
    if (isJPY) {
      pipMultiplier = 0.01; // JPY pairs: 1 pip = 0.01
    } else if (isGold) {
      pipMultiplier = 0.1; // Gold: 1 pip = 0.10
    } else if (isIndex) {
      pipMultiplier = 1; // Indices: 1 point = 1
    } else {
      pipMultiplier = 0.0001; // Standard forex: 1 pip = 0.0001
    }

    // Calculate profit per pip using actual position data
    // If we have price movement and profit, we can calculate exact profit per pip
    let profitPerPip: number;

    if (priceDiff > 0 && profit !== 0) {
      // Use actual profit to derive profit per pip
      const pipsMovement = priceDiff / pipMultiplier;
      profitPerPip = Math.abs(profit / pipsMovement);
    } else {
      // Fallback: estimate based on volume and instrument type
      // Standard lot forex = ~$10/pip, Gold ~$10/pip per 0.1 lot
      if (isGold) {
        profitPerPip = volume * 100; // Gold: ~$100 per lot per pip
      } else if (isIndex) {
        profitPerPip = volume * 1; // Indices: varies, use $1 per point per contract
      } else if (isJPY) {
        profitPerPip = volume * 100 / 1.5; // JPY pairs (approximate)
      } else {
        profitPerPip = volume * 10; // Standard forex
      }
    }

    let slPips = 0;
    let tpPips = 0;
    let plAtSL = 0; // P/L if price hits SL (positive = profit, negative = loss)
    let plAtTP = 0; // P/L if price hits TP (positive = profit, negative = loss)
    let riskReward = 0;

    // Calculate P/L if position closes at SL price
    if (slPrice > 0) {
      slPips = Math.abs(open_price - slPrice) / pipMultiplier;
      if (type === "buy") {
        // BUY: profit = (closePrice - openPrice)
        plAtSL = (slPrice - open_price) / pipMultiplier * profitPerPip;
      } else {
        // SELL: profit = (openPrice - closePrice)
        plAtSL = (open_price - slPrice) / pipMultiplier * profitPerPip;
      }
    }

    // Calculate P/L if position closes at TP price
    if (tpPrice > 0) {
      tpPips = Math.abs(tpPrice - open_price) / pipMultiplier;
      if (type === "buy") {
        // BUY: profit = (closePrice - openPrice)
        plAtTP = (tpPrice - open_price) / pipMultiplier * profitPerPip;
      } else {
        // SELL: profit = (openPrice - closePrice)
        plAtTP = (open_price - tpPrice) / pipMultiplier * profitPerPip;
      }
    }

    // Risk/Reward only makes sense when SL is a loss and TP is a profit
    if (plAtSL < 0 && plAtTP > 0) {
      riskReward = plAtTP / Math.abs(plAtSL);
    }

    // Validation
    let slValid = true;
    let tpValid = true;
    let slError = "";
    let tpError = "";

    if (slPrice > 0) {
      if (type === "buy" && slPrice >= current_price) {
        slValid = false;
        slError = "SL debe estar por debajo del precio actual";
      }
      if (type === "sell" && slPrice <= current_price) {
        slValid = false;
        slError = "SL debe estar por encima del precio actual";
      }
    }

    if (tpPrice > 0) {
      if (type === "buy" && tpPrice <= current_price) {
        tpValid = false;
        tpError = "TP debe estar por encima del precio actual";
      }
      if (type === "sell" && tpPrice >= current_price) {
        tpValid = false;
        tpError = "TP debe estar por debajo del precio actual";
      }
    }

    return {
      slPips: Math.abs(slPips),
      tpPips: Math.abs(tpPips),
      plAtSL,
      plAtTP,
      riskReward,
      slValid,
      tpValid,
      slError,
      tpError,
      profitPerPip,
    };
  }, [position, sl, tp]);

  const handleSave = async () => {
    if (!position) return;

    const slValue = parseFloat(sl) || 0;
    const tpValue = parseFloat(tp) || 0;

    // Validate
    if (calculations && (!calculations.slValid || !calculations.tpValid)) {
      return;
    }

    setLoading(true);
    try {
      // Build body only with fields that have values
      const body: { ticket: number; sl?: number; tp?: number } = {
        ticket: position.ticket,
      };
      if (slValue > 0) body.sl = slValue;
      if (tpValue > 0) body.tp = tpValue;

      const res = await fetch(`/api/accounts/${accountId}/modify-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        alert("Error: " + (data.error || "No se pudo modificar la posición"));
      }
    } catch (error) {
      console.error("Error modifying position:", error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!position) return null;

  // Check if there are actual changes from initial values
  const hasChanges =
    (parseFloat(sl) || 0) !== initialSl ||
    (parseFloat(tp) || 0) !== initialTp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Posición
            <Badge
              variant="outline"
              className={cn(
                "font-medium uppercase ml-2",
                position.type === "buy"
                  ? "bg-profit/20 text-profit border-profit/30"
                  : "bg-loss/20 text-loss border-loss/30"
              )}
            >
              {position.type === "buy" ? "COMPRA" : "VENTA"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {position.symbol} · #{position.ticket} · {position.volume} lotes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Position Info - Updates in real-time */}
          <div className="rounded-lg bg-secondary/50 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Apertura</p>
                <p className="font-mono font-medium">
                  {position.open_price.toFixed(decimals)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Actual</p>
                <p className="font-mono font-medium text-primary">
                  {position.current_price.toFixed(decimals)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">P/L Actual</p>
                <p
                  className={cn(
                    "font-mono font-medium",
                    position.profit >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {position.profit >= 0 ? "+" : ""}${position.profit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* SL/TP Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stop Loss */}
            <div className="space-y-2">
              <Label
                htmlFor="sl"
                className="flex items-center gap-2 text-loss"
              >
                <Shield className="h-4 w-4" />
                Stop Loss
              </Label>
              <div className="flex gap-1">
                <Input
                  id="sl"
                  type="number"
                  step={Math.pow(10, -decimals)}
                  placeholder={`0.${"0".repeat(decimals)}`}
                  value={sl}
                  onChange={handleSlChange}
                  className={cn(
                    "font-mono flex-1",
                    calculations && !calculations.slValid && sl
                      ? "border-loss focus-visible:ring-loss"
                      : ""
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSl(position.current_price.toFixed(decimals))}
                  className="shrink-0 h-10 w-10"
                  title="Usar precio actual"
                >
                  <Crosshair className="h-4 w-4" />
                </Button>
              </div>
              {calculations && !calculations.slValid && sl && (
                <p className="text-xs text-loss flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {calculations.slError}
                </p>
              )}
            </div>

            {/* Take Profit */}
            <div className="space-y-2">
              <Label
                htmlFor="tp"
                className="flex items-center gap-2 text-profit"
              >
                <Target className="h-4 w-4" />
                Take Profit
              </Label>
              <div className="flex gap-1">
                <Input
                  id="tp"
                  type="number"
                  step={Math.pow(10, -decimals)}
                  placeholder={`0.${"0".repeat(decimals)}`}
                  value={tp}
                  onChange={handleTpChange}
                  className={cn(
                    "font-mono flex-1",
                    calculations && !calculations.tpValid && tp
                      ? "border-loss focus-visible:ring-loss"
                      : ""
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTp(position.current_price.toFixed(decimals))}
                  className="shrink-0 h-10 w-10"
                  title="Usar precio actual"
                >
                  <Crosshair className="h-4 w-4" />
                </Button>
              </div>
              {calculations && !calculations.tpValid && tp && (
                <p className="text-xs text-loss flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {calculations.tpError}
                </p>
              )}
            </div>
          </div>

          {/* Potential P/L Preview */}
          {calculations && (parseFloat(sl) > 0 || parseFloat(tp) > 0) && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Previsualización de Riesgo/Beneficio
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* P/L at SL */}
                {parseFloat(sl) > 0 && calculations.slValid && (
                  <div className={cn(
                    "rounded-lg p-3 border",
                    calculations.plAtSL >= 0
                      ? "bg-profit/10 border-profit/20"
                      : "bg-loss/10 border-loss/20"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {calculations.plAtSL >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-profit" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-loss" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        calculations.plAtSL >= 0 ? "text-profit" : "text-loss"
                      )}>
                        Si toca SL
                      </span>
                    </div>
                    <p className={cn(
                      "text-xl font-bold tabular-nums",
                      calculations.plAtSL >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {calculations.plAtSL >= 0 ? "+" : "-"}${Math.abs(calculations.plAtSL).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculations.slPips.toFixed(1)} pips
                    </p>
                  </div>
                )}

                {/* P/L at TP */}
                {parseFloat(tp) > 0 && calculations.tpValid && (
                  <div className={cn(
                    "rounded-lg p-3 border",
                    calculations.plAtTP >= 0
                      ? "bg-profit/10 border-profit/20"
                      : "bg-loss/10 border-loss/20"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {calculations.plAtTP >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-profit" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-loss" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        calculations.plAtTP >= 0 ? "text-profit" : "text-loss"
                      )}>
                        Si toca TP
                      </span>
                    </div>
                    <p className={cn(
                      "text-xl font-bold tabular-nums",
                      calculations.plAtTP >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {calculations.plAtTP >= 0 ? "+" : "-"}${Math.abs(calculations.plAtTP).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculations.tpPips.toFixed(1)} pips
                    </p>
                  </div>
                )}
              </div>

              {/* Risk/Reward Ratio */}
              {calculations.riskReward > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Ratio Riesgo/Beneficio
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono",
                      calculations.riskReward >= 2
                        ? "bg-profit/10 text-profit border-profit/30"
                        : calculations.riskReward >= 1
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        : "bg-loss/10 text-loss border-loss/30"
                    )}
                  >
                    1:{calculations.riskReward.toFixed(2)}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Buttons to quickly remove SL/TP */}
          <div className="flex gap-2">
            {initialSl > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSl("")}
                className="text-xs"
              >
                Quitar SL
              </Button>
            )}
            {initialTp > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTp("")}
                className="text-xs"
              >
                Quitar TP
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              loading ||
              !hasChanges ||
              !!(calculations &&
                ((!calculations.slValid && sl) ||
                  (!calculations.tpValid && tp)))
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
