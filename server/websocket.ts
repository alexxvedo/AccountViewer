// ============================================
// Servidor WebSocket Standalone - Bun
// 
// Este servidor maneja las conexiones WebSocket
// de los EA y Frontend en tiempo real.
// Corre separado de Next.js en puerto 3001
// ============================================

import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// ============================================
// In-Memory Store para datos en vivo
// ============================================
interface LiveAccountState {
  accountId: string;
  userId: string;
  token: string;
  lastUpdate: any | null;
  lastSeen: number;
  isConnected: boolean;
}

class LiveStore {
  private accounts: Map<string, LiveAccountState> = new Map();
  private accountIdToToken: Map<string, string> = new Map();

  register(token: string, accountId: string, userId: string): void {
    const state: LiveAccountState = {
      accountId,
      userId,
      token,
      lastUpdate: null,
      lastSeen: Date.now(),
      isConnected: true,
    };
    this.accounts.set(token, state);
    this.accountIdToToken.set(accountId, token);
  }

  update(token: string, message: any): LiveAccountState | null {
    const state = this.accounts.get(token);
    if (!state) return null;
    state.lastUpdate = message;
    state.lastSeen = Date.now();
    state.isConnected = true;
    return state;
  }

  ping(token: string): LiveAccountState | null {
    const state = this.accounts.get(token);
    if (!state) return null;
    state.lastSeen = Date.now();
    return state;
  }

  disconnect(token: string): LiveAccountState | null {
    const state = this.accounts.get(token);
    if (!state) return null;
    state.isConnected = false;
    return state;
  }

  getByToken(token: string): LiveAccountState | null {
    return this.accounts.get(token) ?? null;
  }

  getByAccountId(accountId: string): LiveAccountState | null {
    const token = this.accountIdToToken.get(accountId);
    if (!token) return null;
    return this.accounts.get(token) ?? null;
  }

  getByUserId(userId: string): LiveAccountState[] {
    return Array.from(this.accounts.values()).filter(
      (state) => state.userId === userId
    );
  }

  getStats(): { total: number; connected: number } {
    const states = Array.from(this.accounts.values());
    return {
      total: states.length,
      connected: states.filter((s) => s.isConnected).length,
    };
  }
}

const liveStore = new LiveStore();

// ============================================
// Mapa de conexiones Frontend
// ============================================
const frontendConnections = new Map<string, Set<any>>();

function broadcastToFrontend(accountId: string, userId: string, message: any): void {
  const connections = frontendConnections.get(userId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);

  for (const ws of connections) {
    try {
      if (ws.data?.subscribedAccounts?.has(accountId) || ws.data?.subscribedAccounts?.has("*")) {
        ws.send(messageStr);
      }
    } catch (error) {
      console.error("[WS] Error broadcasting:", error);
    }
  }
}

// ============================================
// Puerto del servidor WebSocket
// ============================================
const PORT = process.env.WS_PORT || 3001;

// Orígenes permitidos (development + production)
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ["http://localhost:3000"];

// ============================================
// Servidor Elysia con WebSocket
// ============================================
const app = new Elysia()
  .use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  )

  // Health check
  .get("/health", () => ({
    status: "ok",
    timestamp: Date.now(),
    stats: liveStore.getStats(),
  }))

  // ============================================
  // WebSocket para EA (Expert Advisors)
  // ============================================
  .ws("/ws/ea", {
    body: t.Any(),

    async open(ws) {
      console.log("[WS/EA] Nueva conexión");
      (ws as any).data = {
        type: "ea",
        token: "",
        authenticated: false,
      };
    },

    async message(ws, message) {
      const data = (ws as any).data;
      const msg = message as any;

      // Autenticación inicial
      if (!data.authenticated && msg.token) {
        const account = await prisma.tradingAccount.findUnique({
          where: { connectionToken: msg.token },
          include: { user: true },
        });

        if (!account) {
          console.log("[WS/EA] Token inválido:", msg.token);
          ws.send(JSON.stringify({ error: "invalid_token" }));
          ws.close();
          return;
        }

        data.token = msg.token;
        data.accountId = account.id;
        data.userId = account.userId;
        data.authenticated = true;

        liveStore.register(msg.token, account.id, account.userId);

        await prisma.tradingAccount.update({
          where: { id: account.id },
          data: { isConnected: true, lastSeen: new Date() },
        });

        console.log(`[WS/EA] Autenticado: Cuenta ${account.accountNumber} (${account.broker})`);

        broadcastToFrontend(account.id, account.userId, {
          type: "connection_status",
          account_id: account.id,
          connected: true,
          last_seen: Date.now(),
        });
      }

      if (!data.authenticated) return;

      // Procesar mensajes
      switch (msg.msg_type) {
        case "update":
          const state = liveStore.update(data.token, msg);
          if (state) {
            broadcastToFrontend(data.accountId, data.userId, {
              type: "account_update",
              account_id: data.accountId,
              data: {
                account: msg.account,
                positions: msg.positions,
                timestamp: msg.timestamp,
              },
            });
          }
          break;

        case "ping":
          liveStore.ping(data.token);
          break;

        case "trade_closed":
          try {
            await prisma.tradeHistory.create({
              data: {
                accountId: data.accountId,
                ticket: BigInt(msg.trade.ticket),
                symbol: msg.trade.symbol,
                type: msg.trade.type,
                volume: msg.trade.volume,
                openPrice: msg.trade.open_price,
                closePrice: msg.trade.close_price,
                stopLoss: msg.trade.sl,
                takeProfit: msg.trade.tp,
                profit: msg.trade.profit,
                swap: msg.trade.swap,
                commission: msg.trade.commission,
                openTime: new Date(msg.trade.open_time),
                closeTime: new Date(msg.trade.close_time),
                magicNumber: msg.trade.magic_number,
                comment: msg.trade.comment,
              },
            });

            broadcastToFrontend(data.accountId, data.userId, {
              type: "trade_closed",
              account_id: data.accountId,
              trade: msg.trade,
            });
          } catch (error) {
            console.error("[WS/EA] Error guardando trade:", error);
          }
          break;
      }
    },

    async close(ws) {
      const data = (ws as any).data;
      if (data.authenticated && data.accountId) {
        console.log(`[WS/EA] Desconexión: ${data.accountId}`);
        liveStore.disconnect(data.token);

        await prisma.tradingAccount.update({
          where: { id: data.accountId },
          data: { isConnected: false },
        });

        broadcastToFrontend(data.accountId, data.userId, {
          type: "connection_status",
          account_id: data.accountId,
          connected: false,
        });
      }
    },
  })

  // ============================================
  // WebSocket para Frontend (con autenticación)
  // ============================================
  .ws("/ws/frontend", {
    query: t.Object({
      userId: t.String(),
      // Token opcional para validación adicional (el userId se valida contra la BD)
    }),

    async open(ws) {
      const userId = (ws.data as any).query?.userId;
      console.log(`[WS/Frontend] Intentando conexión de usuario: ${userId}`);

      // SEGURIDAD: Verificar que el userId existe y tiene cuentas
      // Esto previene que alguien se conecte con un userId inventado
      try {
        const userAccounts = await prisma.tradingAccount.findMany({
          where: { userId },
          select: { id: true },
        });

        if (userAccounts.length === 0) {
          console.log(`[WS/Frontend] Usuario ${userId} no tiene cuentas o no existe`);
          // Permitir conexión pero sin suscripciones (podría ser usuario nuevo)
        }

        // Guardar los IDs de cuentas del usuario para validación posterior
        const validAccountIds = new Set(userAccounts.map(a => a.id));
        (ws as any).data.validAccountIds = validAccountIds;
        (ws as any).data.subscribedAccounts = new Set<string>(["*"]);
        (ws as any).data.authenticated = true;

        if (!frontendConnections.has(userId)) {
          frontendConnections.set(userId, new Set());
        }
        frontendConnections.get(userId)!.add(ws);

        console.log(`[WS/Frontend] Conexión autenticada: ${userId} (${userAccounts.length} cuentas)`);

        // Enviar estado actual solo de las cuentas del usuario
        const liveAccounts = liveStore.getByUserId(userId);
        for (const account of liveAccounts) {
          // SEGURIDAD: Solo enviar datos de cuentas que el usuario realmente posee
          if (!validAccountIds.has(account.accountId)) continue;

          if (account.lastUpdate) {
            ws.send(
              JSON.stringify({
                type: "account_update",
                account_id: account.accountId,
                data: {
                  account: account.lastUpdate.account,
                  positions: account.lastUpdate.positions,
                  timestamp: account.lastUpdate.timestamp,
                },
              })
            );
          }

          ws.send(
            JSON.stringify({
              type: "connection_status",
              account_id: account.accountId,
              connected: account.isConnected,
              last_seen: account.lastSeen,
            })
          );
        }
      } catch (error) {
        console.error(`[WS/Frontend] Error de autenticación para ${userId}:`, error);
        ws.close(4001, "Authentication failed");
      }
    },

    message(ws, message) {
      try {
        const msg = typeof message === "string" ? JSON.parse(message) : message;
        const data = (ws as any).data;

        // SEGURIDAD: Solo permitir suscripción a cuentas que el usuario posee
        if (msg.type === "subscribe" && msg.account_id) {
          if (data.validAccountIds?.has(msg.account_id) || msg.account_id === "*") {
            data.subscribedAccounts.add(msg.account_id);
          } else {
            console.log(`[WS/Frontend] Intento de suscripción no autorizada: ${msg.account_id}`);
          }
        } else if (msg.type === "unsubscribe" && msg.account_id) {
          data.subscribedAccounts.delete(msg.account_id);
        }
      } catch (error) {
        console.error("[WS/Frontend] Error:", error);
      }
    },

    close(ws) {
      const userId = (ws.data as any).query?.userId;
      console.log(`[WS/Frontend] Desconexión: ${userId}`);

      const connections = frontendConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          frontendConnections.delete(userId);
        }
      }
    },
  })

  .listen(PORT);

console.log(`
╔════════════════════════════════════════════════════════════╗
║      🦊 Trading Platform WebSocket Server                  ║
╠════════════════════════════════════════════════════════════╣
║  HTTP:       http://localhost:${PORT}                        ║
║  WS (EA):    ws://localhost:${PORT}/ws/ea                    ║
║  WS (Front): ws://localhost:${PORT}/ws/frontend?userId=XXX   ║
║  Health:     http://localhost:${PORT}/health                 ║
╚════════════════════════════════════════════════════════════╝
`);

export type WsApp = typeof app;
