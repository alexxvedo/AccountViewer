"use client";

import { useState, useMemo, useEffect } from "react";
import { TradingChart } from "./TradingChart";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, LineChart } from "lucide-react";

const CHART_VISIBILITY_KEY = "tradingChartVisible";

interface Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  open_price: number;
  current_price: number;
  sl: number;
  tp: number;
  profit: number;
}

interface PositionChartsProps {
  accountId: string;
  positions: Position[];
}

export function PositionCharts({ accountId, positions }: PositionChartsProps) {
  // Leer preferencia guardada de localStorage
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHART_VISIBILITY_KEY);
      return saved !== "false"; // Por defecto visible
    }
    return true;
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Guardar preferencia en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem(CHART_VISIBILITY_KEY, String(isVisible));
  }, [isVisible]);

  // Símbolos únicos
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    positions.forEach(p => symbols.add(p.symbol));
    return Array.from(symbols);
  }, [positions]);

  // Auto-seleccionar primer símbolo si no hay ninguno seleccionado
  useMemo(() => {
    if (!selectedSymbol && uniqueSymbols.length > 0) {
      setSelectedSymbol(uniqueSymbols[0]);
    } else if (selectedSymbol && !uniqueSymbols.includes(selectedSymbol)) {
      setSelectedSymbol(uniqueSymbols[0] || null);
    }
  }, [uniqueSymbols, selectedSymbol]);

  if (positions.length === 0 || uniqueSymbols.length === 0) {
    return null;
  }

  const getCurrentPrice = (symbol: string): number | undefined => {
    const pos = positions.find(p => p.symbol === symbol);
    return pos?.current_price;
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="space-y-3">
      {/* Header con toggle y selector de símbolo */}
      <div className="flex items-center justify-between">
        <button 
          onClick={toggleVisibility}
          className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
        >
          <LineChart className="h-5 w-5" />
          <span>Gráfico en Tiempo Real</span>
          {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isVisible && uniqueSymbols.length > 1 && (
          <div className="flex gap-1">
            {uniqueSymbols.map(sym => (
              <Button
                key={sym}
                variant={selectedSymbol === sym ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-sm"
                onClick={() => setSelectedSymbol(sym)}
              >
                {sym}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Gráfico del símbolo seleccionado */}
      {isVisible && selectedSymbol && (
        <TradingChart
          key={selectedSymbol}
          accountId={accountId}
          symbol={selectedSymbol}
          positions={positions.filter(p => p.symbol === selectedSymbol)}
          currentPrice={getCurrentPrice(selectedSymbol)}
        />
      )}
    </div>
  );
}
