"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineStyle, CandlestickSeries, IPriceLine } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { ChartTimeframe, TIMEFRAME_MINUTES, OHLCBar } from "@/types/chart";

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

interface LineInfo {
  line: IPriceLine;
  ticket: number;
  lineType: "entry" | "sl" | "tp";
  price: number;
}

interface TradingChartProps {
  accountId: string;
  symbol: string;
  positions: Position[];
  currentPrice?: number;
}

const TIMEFRAMES: ChartTimeframe[] = ["M1", "M5", "M15", "H1", "H4", "D1"];

// Factor de conversión aproximado para Forex (lote estándar = 100,000 unidades)
const LOT_SIZE = 100000;

export function TradingChart({ accountId, symbol, positions, currentPrice }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Info de líneas con tipo y ticket
  const priceLinesRef = useRef<LineInfo[]>([]);
  
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>("H1");
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBar, setLastBar] = useState<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  
  // Estado para drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragLineInfo, setDragLineInfo] = useState<{ ticket: number; lineType: "sl" | "tp" } | null>(null);
  const [dragPrice, setDragPrice] = useState<number | null>(null);
  
  // Estado para tooltip
  const [tooltipInfo, setTooltipInfo] = useState<{ visible: boolean; x: number; y: number; text: string; color: string } | null>(null);
  
  // Precios pendientes de modificación (usando ref para evitar re-renders infinitos)
  const pendingModificationsRef = useRef<Map<string, number>>(new Map());
  // Trigger para forzar update cuando se modifica
  const [, forceUpdate] = useState(0);

  // Calcular P&L potencial
  const calculatePotentialPL = useCallback((position: Position, targetPrice: number): number => {
    // Calcular diferencia de precio hacia el target
    const targetDiff = position.type === "buy" 
      ? targetPrice - position.open_price 
      : position.open_price - targetPrice;
    
    // Calcular diferencia de precio actual (para derivar el multiplicador real)
    const currentDiff = position.type === "buy"
      ? position.current_price - position.open_price
      : position.open_price - position.current_price;
    
    // Si hay diferencia actual, calcular el multiplier real del profit actual
    // Esto funciona correctamente sin importar el tipo de instrumento
    if (Math.abs(currentDiff) > 0.00001 && position.profit !== 0) {
      const realMultiplier = position.profit / currentDiff;
      return targetDiff * realMultiplier;
    }
    
    // Fallback si no hay movimiento de precio actual
    // Estimación basada en el volumen y tipo de instrumento
    const isIndex = symbol.includes("US") || symbol.includes("DAX") || 
                    symbol.includes("TECH") || symbol.includes("NAS") ||
                    symbol.includes("SP") || symbol.includes("DOW");
    const multiplier = isIndex ? 100 : 100000; // Contract size aprox
    return targetDiff * position.volume * multiplier;
  }, [symbol]);

  // Modificar trade (enviar a backend)
  const modifyTrade = useCallback(async (ticket: number, sl?: number, tp?: number) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/modify-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticket, sl, tp }),
      });
      const data = await res.json();
      console.log("[MODIFY]", data);
    } catch (err) {
      console.error("Error modifying trade:", err);
    }
  }, [accountId]);

  // Solicitar datos del EA
  const requestChartData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await fetch(`/api/accounts/${accountId}/request-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol,
          timeframe: TIMEFRAME_MINUTES[selectedTimeframe],
          bars: 500,
        }),
      });

      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const res = await fetch(
          `/api/accounts/${accountId}/chart-data/${symbol}?timeframe=${TIMEFRAME_MINUTES[selectedTimeframe]}`,
          { credentials: "include" }
        );
        
        const data = await res.json();
        
        if (data.available && data.data?.bars?.length > 0) {
          updateChart(data.data.bars);
          setHasData(true);
          setIsLoading(false);
          return;
        }
        
        attempts++;
      }
      
      setError("Timeout esperando datos del EA");
    } catch (err) {
      setError("Error al solicitar datos");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, symbol, selectedTimeframe]);

  // Actualizar gráfico con nuevos datos
  const updateChart = useCallback((bars: OHLCBar[]) => {
    if (!candleSeriesRef.current) return;

    const candleData: CandlestickData[] = bars.map(bar => ({
      time: bar.time as Time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));

    candleSeriesRef.current.setData(candleData);
    
    if (candleData.length > 0) {
      const lastCandleData = bars[bars.length - 1];
      setLastBar({
        time: lastCandleData.time,
        open: lastCandleData.open,
        high: lastCandleData.high,
        low: lastCandleData.low,
        close: lastCandleData.close,
      });
    }
  }, []);

  // Crear líneas de precio
  const updatePriceLines = useCallback(() => {
    if (!candleSeriesRef.current) return;

    // Limpiar líneas anteriores
    priceLinesRef.current.forEach(info => {
      try {
        candleSeriesRef.current?.removePriceLine(info.line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    const symbolPositions = positions.filter(pos => pos.symbol === symbol);
    
    symbolPositions.forEach(pos => {
      const isBuy = pos.type === "buy";
      
      // Entry line (no draggable)
      const entryLine = candleSeriesRef.current?.createPriceLine({
        price: pos.open_price,
        color: isBuy ? "#22c55e" : "#ef4444",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `Entrada`,
      });
      if (entryLine) {
        priceLinesRef.current.push({ line: entryLine, ticket: pos.ticket, lineType: "entry", price: pos.open_price });
      }

      // SL line (draggable)
      if (pos.sl > 0) {
        // Usar precio pendiente si existe, sino el de la posición
        const slKey = `${pos.ticket}-sl`;
        const slPrice = pendingModificationsRef.current.get(slKey) ?? pos.sl;
        const slPL = calculatePotentialPL(pos, slPrice);
        const slLine = candleSeriesRef.current?.createPriceLine({
          price: slPrice,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL ${slPL >= 0 ? '+' : ''}${slPL.toFixed(0)}`,
        });
        if (slLine) {
          priceLinesRef.current.push({ line: slLine, ticket: pos.ticket, lineType: "sl", price: slPrice });
        }
      }

      // TP line (draggable)
      if (pos.tp > 0) {
        // Usar precio pendiente si existe, sino el de la posición
        const tpKey = `${pos.ticket}-tp`;
        const tpPrice = pendingModificationsRef.current.get(tpKey) ?? pos.tp;
        const tpPL = calculatePotentialPL(pos, tpPrice);
        const tpLine = candleSeriesRef.current?.createPriceLine({
          price: tpPrice,
          color: "#22c55e",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP +${tpPL.toFixed(0)}`,
        });
        if (tpLine) {
          priceLinesRef.current.push({ line: tpLine, ticket: pos.ticket, lineType: "tp", price: tpPrice });
        }
      }
    });
  }, [positions, symbol, calculatePotentialPL]);

  // Inicializar gráfico
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Altura responsiva: 300px en móvil, 450px en desktop
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 300 : 450;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.7)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.2)" },
      timeScale: { borderColor: "rgba(255, 255, 255, 0.2)", timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    requestChartData();

    return () => {
      window.removeEventListener("resize", handleResize);
      priceLinesRef.current = [];
      chart.remove();
    };
  }, []);

  // Deshabilitar scroll del gráfico durante drag
  useEffect(() => {
    if (!chartRef.current) return;
    
    if (isDragging) {
      // Deshabilitar scroll y crosshair durante drag
      chartRef.current.applyOptions({
        handleScroll: false,
        handleScale: false,
      });
    } else {
      // Restaurar cuando no estamos arrastrando
      chartRef.current.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
    }
  }, [isDragging]);

  // Mouse and touch events para drag y tooltip
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !chartRef.current) return;

    // Convertir Y a precio
    const yToPrice = (y: number): number | null => {
      const series = candleSeriesRef.current;
      if (!series) return null;
      try {
        return series.coordinateToPrice(y) as number;
      } catch {
        return null;
      }
    };

    // Encontrar línea cercana (threshold más grande en móvil)
    const findNearbyLine = (price: number, isMobile = false): LineInfo | null => {
      const baseThreshold = 0.0005 * (currentPrice || 1); // 0.05% del precio
      const threshold = isMobile ? baseThreshold * 3 : baseThreshold; // 3x más tolerancia en móvil
      for (const info of priceLinesRef.current) {
        if (info.lineType !== "entry" && Math.abs(info.price - price) < threshold) {
          return info;
        }
      }
      return null;
    };

    // Shared handler para mouse y touch move
    const handleMove = (clientX: number, clientY: number, isMobile = false) => {
      const rect = container.getBoundingClientRect();
      const y = clientY - rect.top;
      const x = clientX - rect.left;
      const price = yToPrice(y);

      if (price === null) return;

      if (isDragging && dragLineInfo) {
        // Actualizar línea durante drag
        const lineInfo = priceLinesRef.current.find(
          l => l.ticket === dragLineInfo.ticket && l.lineType === dragLineInfo.lineType
        );
        if (lineInfo) {
          lineInfo.line.applyOptions({ price });
          lineInfo.price = price;
          setDragPrice(price);

          // Mostrar tooltip con P&L potencial
          const pos = positions.find(p => p.ticket === dragLineInfo.ticket);
          if (pos) {
            const pl = calculatePotentialPL(pos, price);
            setTooltipInfo({
              visible: true,
              x: Math.min(x + 10, rect.width - 150), // Evitar que salga del contenedor
              y: Math.max(y - 50, 10), // Más arriba en móvil para no tapar el dedo
              text: `${dragLineInfo.lineType.toUpperCase()}: ${price.toFixed(5)} (${pl >= 0 ? '+' : ''}$${pl.toFixed(2)})`,
              color: dragLineInfo.lineType === "tp" ? "#22c55e" : "#ef4444",
            });
          }
        }
        if (!isMobile) container.style.cursor = "ns-resize";
      } else if (!isMobile) {
        // Detectar hover sobre líneas (solo mouse)
        const nearLine = findNearbyLine(price, false);
        if (nearLine) {
          container.style.cursor = "ns-resize";
          const pos = positions.find(p => p.ticket === nearLine.ticket);
          if (pos) {
            const pl = calculatePotentialPL(pos, nearLine.price);
            setTooltipInfo({
              visible: true,
              x: x + 10,
              y: y - 30,
              text: `${nearLine.lineType.toUpperCase()}: ${nearLine.price.toFixed(5)} (${pl >= 0 ? '+' : ''}$${pl.toFixed(2)})`,
              color: nearLine.lineType === "tp" ? "#22c55e" : "#ef4444",
            });
          }
        } else {
          container.style.cursor = "crosshair";
          setTooltipInfo(null);
        }
      }
    };

    // Shared handler para mouse y touch start
    const handleStart = (clientX: number, clientY: number, isMobile = false) => {
      const rect = container.getBoundingClientRect();
      const y = clientY - rect.top;
      const price = yToPrice(y);

      if (price === null) return false;

      const nearLine = findNearbyLine(price, isMobile);
      if (nearLine && nearLine.lineType !== "entry") {
        setIsDragging(true);
        setDragLineInfo({ ticket: nearLine.ticket, lineType: nearLine.lineType as "sl" | "tp" });
        return true; // Indica que se inició un drag
      }
      return false;
    };

    // Shared handler para mouse y touch end
    const handleEnd = () => {
      if (isDragging && dragLineInfo && dragPrice !== null) {
        // Guardar precio modificado para evitar que vuelva atrás
        const key = `${dragLineInfo.ticket}-${dragLineInfo.lineType}`;
        pendingModificationsRef.current.set(key, dragPrice);
        forceUpdate(n => n + 1); // Forzar re-render para actualizar líneas

        // Timeout: si no se confirma en 5 segundos, restaurar (modificación fallida)
        setTimeout(() => {
          if (pendingModificationsRef.current.has(key)) {
            pendingModificationsRef.current.delete(key);
            forceUpdate(n => n + 1);
          }
        }, 5000);

        // Enviar modificación al backend
        const { ticket, lineType } = dragLineInfo;
        if (lineType === "sl") {
          modifyTrade(ticket, dragPrice, undefined);
        } else if (lineType === "tp") {
          modifyTrade(ticket, undefined, dragPrice);
        }
      }

      setIsDragging(false);
      setDragLineInfo(null);
      setDragPrice(null);
      setTooltipInfo(null);
    };

    // Mouse events
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY, false);
    const handleMouseDown = (e: MouseEvent) => {
      if (handleStart(e.clientX, e.clientY, false)) {
        e.preventDefault();
      }
    };
    const handleMouseUp = () => handleEnd();
    const handleMouseLeave = () => {
      if (!isDragging) {
        setTooltipInfo(null);
      }
    };

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (handleStart(touch.clientX, touch.clientY, true)) {
          e.preventDefault(); // Prevenir scroll solo si estamos arrastrando una línea
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY, true);
        e.preventDefault(); // Prevenir scroll durante drag
      }
    };

    const handleTouchEnd = () => handleEnd();

    // Agregar listeners
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragLineInfo, dragPrice, positions, currentPrice, calculatePotentialPL, modifyTrade]);

  // Recargar datos al cambiar timeframe
  useEffect(() => {
    if (chartRef.current && hasData) {
      requestChartData();
    }
  }, [selectedTimeframe]);

  // Actualizar líneas cuando cambian posiciones
  useEffect(() => {
    if (hasData && candleSeriesRef.current) {
      // Limpiar modificaciones pendientes que ya se reflejan en positions
      positions.forEach(pos => {
        const slKey = `${pos.ticket}-sl`;
        const tpKey = `${pos.ticket}-tp`;
        const pendingSL = pendingModificationsRef.current.get(slKey);
        const pendingTP = pendingModificationsRef.current.get(tpKey);
        // Si el valor pendiente ya está en la posición, limpiar
        if (pendingSL && Math.abs(pendingSL - pos.sl) < 0.00001) {
          pendingModificationsRef.current.delete(slKey);
        }
        if (pendingTP && Math.abs(pendingTP - pos.tp) < 0.00001) {
          pendingModificationsRef.current.delete(tpKey);
        }
      });
      updatePriceLines();
    }
  }, [positions, hasData, updatePriceLines]);

  // Actualizar última vela en tiempo real
  useEffect(() => {
    if (!candleSeriesRef.current || !currentPrice || !lastBar) return;

    const updatedBar = {
      time: lastBar.time as Time,
      open: lastBar.open,
      high: Math.max(lastBar.high, currentPrice),
      low: Math.min(lastBar.low, currentPrice),
      close: currentPrice,
    };
    
    candleSeriesRef.current.update(updatedBar);
    
    setLastBar(prev => prev ? {
      ...prev,
      high: updatedBar.high,
      low: updatedBar.low,
      close: currentPrice,
    } : null);
  }, [currentPrice]);

  const symbolPnL = positions
    .filter(p => p.symbol === symbol)
    .reduce((acc, p) => acc + p.profit, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{symbol}</CardTitle>
            <span className={`text-sm font-medium ${symbolPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
              {symbolPnL >= 0 ? "+" : ""}{symbolPnL.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {TIMEFRAMES.map(tf => (
                <Button
                  key={tf}
                  variant={selectedTimeframe === tf ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-1.5 text-xs md:h-7 md:px-2"
                  onClick={() => setSelectedTimeframe(tf)}
                  disabled={isLoading}
                >
                  {tf}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={requestChartData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={chartContainerRef} className="w-full h-[300px] md:h-[450px] relative outline-none focus:outline-none ring-0 focus:ring-0">
          {isLoading && !hasData && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}
          
          {/* Tooltip flotante */}
          {tooltipInfo?.visible && (
            <div
              ref={tooltipRef}
              className="absolute z-20 px-2 py-1 text-xs font-medium rounded shadow-lg pointer-events-none"
              style={{
                left: tooltipInfo.x,
                top: tooltipInfo.y,
                backgroundColor: "rgba(0, 0, 0, 0.85)",
                color: tooltipInfo.color,
                border: `1px solid ${tooltipInfo.color}`,
              }}
            >
              {tooltipInfo.text}
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-border/50 text-xs text-muted-foreground">
          {positions.filter(p => p.symbol === symbol).map(p => (
            <span key={p.ticket} className="mr-4">
              <span className={p.type === "buy" ? "text-green-500" : "text-red-500"}>
                {p.type === "buy" ? "COMPRA" : "VENTA"}
              </span>
              {" "}
              {p.volume} @ {p.open_price.toFixed(5)}
              {p.sl > 0 && <span className="text-red-400 ml-2">SL: {p.sl.toFixed(5)}</span>}
              {p.tp > 0 && <span className="text-green-400 ml-2">TP: {p.tp.toFixed(5)}</span>}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
