// Types for TradingView Lightweight Charts integration

export interface OHLCBar {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type ChartTimeframe = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';

// Mapping from frontend timeframe to MT5 period in minutes
export const TIMEFRAME_MINUTES: Record<ChartTimeframe, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};

export interface TradeLevelLine {
  price: number;
  type: 'entry' | 'sl' | 'tp';
  tradeType: 'buy' | 'sell';
  ticket: number;
}

export interface ChartDataRequest {
  symbol: string;
  timeframe: number; // in minutes
  bars: number;
}

export interface ChartDataResponse {
  symbol: string;
  timeframe: number;
  bars: OHLCBar[];
  timestamp: number;
}

export interface ChartDataCache {
  data: ChartDataResponse;
  timestamp: number;
}
