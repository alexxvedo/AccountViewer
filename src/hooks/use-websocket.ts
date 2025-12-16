"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface AccountData {
  account: {
    number: number;
    broker: string;
    balance: number;
    equity: number;
    margin: number;
    free_margin: number;
    margin_level: number;
    server: string;
  };
  positions: Array<{
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
    open_time: number;
  }>;
  timestamp: number;
}

interface UseWebSocketOptions {
  userId: string;
  onAccountUpdate?: (accountId: string, data: AccountData) => void;
  onConnectionStatus?: (accountId: string, connected: boolean) => void;
  onTradeClosed?: (accountId: string, trade: any) => void;
}

export function useWebSocket({
  userId,
  onAccountUpdate,
  onConnectionStatus,
  onTradeClosed,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://localhost:3001/ws/frontend?userId=${userId}`);

    ws.onopen = () => {
      console.log("[WS] Connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);

        switch (message.type) {
          case "account_update":
            onAccountUpdate?.(message.account_id, message.data);
            break;
          case "connection_status":
            onConnectionStatus?.(message.account_id, message.connected);
            break;
          case "trade_closed":
            onTradeClosed?.(message.account_id, message.trade);
            break;
        }
      } catch (error) {
        console.error("[WS] Error parsing message:", error);
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      setIsConnected(false);
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      // Silently handle connection errors - reconnect will happen via onclose
    };

    wsRef.current = ws;
  }, [userId, onAccountUpdate, onConnectionStatus, onTradeClosed]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const subscribe = useCallback((accountId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", account_id: accountId }));
    }
  }, []);

  const unsubscribe = useCallback((accountId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", account_id: accountId }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
  };
}
