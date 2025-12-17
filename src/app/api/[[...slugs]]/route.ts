// ============================================
// API Elysia integrado en Next.js App Router
// Trading Platform SaaS
// ============================================

import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@/generated/prisma";

// Importar modelos generados por Prismabox
import {
  TradingAccountPlain,
} from "@/generated/prismabox/TradingAccount";
import { TradeHistoryPlain } from "@/generated/prismabox/TradeHistory";
import { EquitySnapshotPlain } from "@/generated/prismabox/EquitySnapshot";

// Singleton de Prisma para evitar múltiples instancias en desarrollo
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  liveDataCache: Map<string, { data: any; timestamp: number }>;
  commandQueue: Map<string, { commands: { id: string; type: string; ticket?: number; createdAt: number }[] }>;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Caché en memoria para datos en vivo de las cuentas
const liveDataCache = globalForPrisma.liveDataCache ?? new Map<string, { data: any; timestamp: number }>();
if (process.env.NODE_ENV !== "production") globalForPrisma.liveDataCache = liveDataCache;

// Cola de comandos para el EA (cerrar trades, etc.)
const commandQueue = globalForPrisma.commandQueue ?? new Map<string, { commands: { id: string; type: string; ticket?: number; createdAt: number }[] }>();
if (process.env.NODE_ENV !== "production") globalForPrisma.commandQueue = commandQueue;

// ============================================
// Aplicación Elysia
// ============================================
const app = new Elysia({ prefix: "/api" })
  // CORS
  .use(
    cors({
      origin: true,
      credentials: true,
    })
  )

  // ============================================
  // Health Check
  // ============================================
  .get("/health", () => ({
    status: "ok",
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
  }))

  // ============================================
  // Cuentas de Trading - Listar por usuario
  // ============================================
  .get(
    "/users/:id/accounts",
    async ({ params }) => {
      const accounts = await prisma.tradingAccount.findMany({
        where: { userId: params.id },
        select: {
          id: true,
          accountNumber: true,
          broker: true,
          server: true,
          platform: true,
          nickname: true,
          isConnected: true,
          lastSeen: true,
          connectionToken: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          sectionId: true,
          balance: true,
          equity: true,
        },
      });

      return accounts;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Array(TradingAccountPlain),
    }
  )

  // ============================================
  // Cuentas de Trading - Listar con datos en vivo
  // ============================================
  .get(
    "/users/:id/accounts-live",
    async ({ params }) => {
      const accounts = await prisma.tradingAccount.findMany({
        where: { userId: params.id },
        select: {
          id: true,
          accountNumber: true,
          broker: true,
          server: true,
          platform: true,
          nickname: true,
          isConnected: true,
          lastSeen: true,
          connectionToken: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          sectionId: true,
        },
      });

      // Enriquecer con datos en vivo del caché
      return accounts.map(account => {
        const cached = liveDataCache.get(account.id);
        const isLive = cached && (Date.now() - cached.timestamp < 30000);
        const balance = cached?.data?.account?.balance || 0;
        const equity = cached?.data?.account?.equity || 0;
        
        return {
          ...account,
          isConnected: isLive, // Estado real basado en caché
          liveData: isLive ? {
            balance,
            equity,
            floatingPL: equity - balance,
            lastUpdate: cached.timestamp,
          } : null,
        };
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // Cuentas de Trading - Datos en vivo RÁPIDOS (Memoria)
  // ============================================
  .get(
    "/users/:id/fast-live",
    async ({ params }) => {
      // 1. Obtener solo IDs (búsqueda rápida en índice)
      const accounts = await prisma.tradingAccount.findMany({
        where: { userId: params.id },
        select: { id: true },
      });

      // 2. Construir respuesta desde memoria
      const result: Record<string, any> = {};

      for (const acc of accounts) {
        const cached = liveDataCache.get(acc.id);
        // Verificar si es reciente (< 30s)
        if (cached && (Date.now() - cached.timestamp < 30000)) {
           result[acc.id] = {
             balance: cached.data?.account?.balance || 0,
             equity: cached.data?.account?.equity || 0,
             floatingPL: (cached.data?.account?.equity || 0) - (cached.data?.account?.balance || 0),
             lastUpdate: cached.timestamp,
           };
        }
      }

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // Crear nueva cuenta
  // ============================================
  .post(
    "/accounts",
    async ({ body }) => {
      const account = await prisma.tradingAccount.create({
        data: {
          userId: body.userId,
          accountNumber: body.accountNumber,
          broker: body.broker,
          server: body.server,
          platform: body.platform || "MT5",
          nickname: body.nickname,
        },
      });

      return {
        id: account.id,
        connectionToken: account.connectionToken,
        message: "Cuenta creada exitosamente",
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        accountNumber: t.Integer(),
        broker: t.String(),
        server: t.String(),
        platform: t.Optional(t.String()),
        nickname: t.Optional(t.String()),
        sectionId: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        connectionToken: t.String(),
        message: t.String(),
      }),
    }
  )

  // ============================================
  // SECCIONES - Listar por usuario
  // ============================================
  .get(
    "/users/:id/sections",
    async ({ params }) => {
      const sections = await prisma.section.findMany({
        where: { userId: params.id },
        include: {
          accounts: {
            select: {
              id: true,
              accountNumber: true,
              broker: true,
              server: true,
              platform: true,
              nickname: true,
              isConnected: true,
              connectionToken: true,
              sectionId: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Enriquecer con datos en vivo
      return sections.map(section => ({
        ...section,
        accounts: section.accounts.map(account => {
          const cached = liveDataCache.get(account.id);
          const isLive = cached && (Date.now() - cached.timestamp < 30000);
          return {
            ...account,
            isConnected: isLive,
            liveData: isLive ? {
              balance: cached.data?.account?.balance || 0,
              equity: cached.data?.account?.equity || 0,
              floatingPL: (cached.data?.account?.equity || 0) - (cached.data?.account?.balance || 0),
              lastUpdate: cached.timestamp,
            } : null,
          };
        }),
      }));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // SECCIONES - Crear
  // ============================================
  .post(
    "/sections",
    async ({ body }) => {
      const section = await prisma.section.create({
        data: {
          userId: body.userId,
          name: body.name,
          color: body.color,
        },
      });
      return { id: section.id, message: "Sección creada" };
    },
    {
      body: t.Object({
        userId: t.String(),
        name: t.String(),
        color: t.Optional(t.String()),
      }),
    }
  )

  // ============================================
  // SECCIONES - Actualizar
  // ============================================
  .put(
    "/sections/:id",
    async ({ params, body }) => {
      const section = await prisma.section.update({
        where: { id: params.id },
        data: {
          name: body.name,
          color: body.color,
        },
      });
      return { id: section.id, message: "Sección actualizada" };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        color: t.Optional(t.String()),
      }),
    }
  )

  // ============================================
  // SECCIONES - Eliminar
  // ============================================
  .delete(
    "/sections/:id",
    async ({ params }) => {
      await prisma.section.delete({ where: { id: params.id } });
      return { message: "Sección eliminada" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // CUENTAS - Actualizar cuenta completa
  // ============================================
  .put(
    "/accounts/:id",
    async ({ params, body }) => {
      await prisma.tradingAccount.update({
        where: { id: params.id },
        data: {
          nickname: body.nickname || null,
          broker: body.broker,
          server: body.server,
          platform: body.platform,
          sectionId: body.sectionId || null,
        },
      });
      return { message: "Cuenta actualizada" };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        nickname: t.Optional(t.String()),
        broker: t.String(),
        server: t.String(),
        platform: t.String(),
        sectionId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // ============================================
  // CUENTAS - Mover a sección
  // ============================================
  .put(
    "/accounts/:id/section",
    async ({ params, body }) => {
      await prisma.tradingAccount.update({
        where: { id: params.id },
        data: { sectionId: body.sectionId },
      });
      return { message: "Cuenta movida" };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        sectionId: t.Union([t.String(), t.Null()]),
      }),
    }
  )

  // ============================================
  // Obtener cuenta por ID
  // ============================================
  .get(
    "/accounts/:id",
    async ({ params }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          accountNumber: true,
          broker: true,
          server: true,
          platform: true,
          nickname: true,
          isConnected: true,
          lastSeen: true,
          connectionToken: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
      });

      return account;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // Historial de Trades
  // ============================================
  .get(
    "/accounts/:id/trades",
    async ({ params, query }) => {
      const limit = Number(query?.limit) || 50;
      const offset = Number(query?.offset) || 0;

      const trades = await prisma.tradeHistory.findMany({
        where: { accountId: params.id },
        orderBy: { closeTime: "desc" },
        take: limit,
        skip: offset,
      });

      // Convertir BigInt a Number para JSON (prismabox usa t.Integer)
      return trades.map((trade) => ({
        ...trade,
        ticket: Number(trade.ticket),
      }));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Optional(
        t.Object({
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        })
      ),
      response: t.Array(TradeHistoryPlain),
    }
  )

  // ============================================
  // Snapshots de Equidad
  // ============================================
  .get(
    "/accounts/:id/equity",
    async ({ params, query }) => {
      const hours = Number(query?.hours) || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const snapshots = await prisma.equitySnapshot.findMany({
        where: {
          accountId: params.id,
          timestamp: { gte: since },
        },
        orderBy: { timestamp: "asc" },
      });

      return snapshots;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Optional(
        t.Object({
          hours: t.Optional(t.String()),
        })
      ),
      response: t.Array(EquitySnapshotPlain),
    }
  )

  // ============================================
  // Datos en Vivo (para frontend polling)
  // ============================================
  .get(
    "/accounts/:id/live",
    async ({ params }) => {
      const cached = liveDataCache.get(params.id);
      
      if (!cached) {
        return { connected: false, data: null };
      }
      
      // Verificar si los datos son recientes (últimos 30 segundos)
      const isRecent = Date.now() - cached.timestamp < 30000;
      
      return {
        connected: isRecent,
        data: cached.data,
        lastUpdate: cached.timestamp,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // Regenerar Token de Conexión
  // ============================================
  .post(
    "/accounts/:id/regenerate-token",
    async ({ params }) => {
      const account = await prisma.tradingAccount.update({
        where: { id: params.id },
        data: {
          connectionToken: crypto.randomUUID().replace(/-/g, ""),
        },
      });

      return {
        connectionToken: account.connectionToken,
        message: "Token regenerado exitosamente",
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        connectionToken: t.String(),
        message: t.String(),
      }),
    }
  )

  // ============================================
  // Validar Token (usado por el EA)
  // ============================================
  .post(
    "/ea/validate-token",
    async ({ body }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { connectionToken: body.token },
        select: {
          id: true,
          userId: true,
          accountNumber: true,
          broker: true,
        },
      });

      if (!account) {
        return { valid: false, error: "Token inválido" };
      }

      return {
        valid: true,
        accountId: account.id,
        userId: account.userId,
      };
    },
    {
      body: t.Object({
        token: t.String(),
      }),
      response: t.Union([
        t.Object({
          valid: t.Literal(true),
          accountId: t.String(),
          userId: t.String(),
        }),
        t.Object({
          valid: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  // ============================================
  // Recibir datos del EA (HTTP fallback)
  // ============================================
  .post(
    "/ea/update",
    async ({ body }) => {
      // Validar token
      const account = await prisma.tradingAccount.findUnique({
        where: { connectionToken: body.token },
      });

      if (!account) {
        return { success: false, error: "Token inválido" };
      }

      // Guardar datos en caché para el frontend
      liveDataCache.set(account.id, {
        data: {
          account: body.account,
          positions: body.positions,
        },
        timestamp: Date.now(),
      });

      // Actualizar lastSeen y datos de la cuenta
      await prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          isConnected: true,
          lastSeen: new Date(),
          accountNumber: body.account.number,
          broker: body.account.broker,
          server: body.account.server,
        },
      });

      return { success: true, accountId: account.id };
    },
    {
      body: t.Object({
        msg_type: t.Literal("update"),
        token: t.String(),
        timestamp: t.Number(),
        account: t.Object({
          number: t.Integer(),
          broker: t.String(),
          balance: t.Number(),
          equity: t.Number(),
          margin: t.Number(),
          free_margin: t.Number(),
          margin_level: t.Number(),
          server: t.String(),
          leverage: t.Optional(t.Integer()),
          currency: t.Optional(t.String()),
        }),
        positions: t.Array(t.Any()),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          accountId: t.String(),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  // ============================================
  // Recibir trade cerrado del EA
  // ============================================
  .post(
    "/ea/trade-closed",
    async ({ body }) => {
      // Validar token
      const account = await prisma.tradingAccount.findUnique({
        where: { connectionToken: body.token },
      });

      if (!account) {
        return { success: false, error: "Token inválido" };
      }

      const { trade } = body;

      try {
        await prisma.tradeHistory.create({
          data: {
            accountId: account.id,
            ticket: BigInt(trade.ticket),
            symbol: trade.symbol,
            type: trade.type,
            volume: trade.volume,
            openPrice: trade.open_price,
            closePrice: trade.close_price,
            stopLoss: trade.sl,
            takeProfit: trade.tp,
            profit: trade.profit,
            swap: trade.swap,
            commission: trade.commission,
            openTime: new Date(trade.open_time),
            closeTime: new Date(trade.close_time),
            magicNumber: trade.magic_number,
            comment: trade.comment,
          },
        });

        return { success: true, message: "Trade guardado" };
      } catch (error) {
        return { success: false, error: "Trade ya existe o error de BD" };
      }
    },
    {
      body: t.Object({
        msg_type: t.Literal("trade_closed"),
        token: t.String(),
        timestamp: t.Number(),
        trade: t.Object({
          ticket: t.Integer(),
          symbol: t.String(),
          type: t.String(),
          volume: t.Number(),
          open_price: t.Number(),
          close_price: t.Number(),
          sl: t.Number(),
          tp: t.Number(),
          profit: t.Number(),
          swap: t.Number(),
          commission: t.Number(),
          open_time: t.Number(),
          close_time: t.Number(),
          magic_number: t.Optional(t.Integer()),
          comment: t.Optional(t.String()),
        }),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          message: t.String(),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  // ============================================
  // Enviar comando para cerrar trade individual
  // ============================================
  .post(
    "/accounts/:id/close-trade",
    async ({ params, body }) => {
      const accountId = params.id;
      
      // Verificar que la cuenta existe
      const account = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });
      
      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }
      
      // Añadir comando a la cola
      const queue = commandQueue.get(accountId) || { commands: [] };
      queue.commands.push({
        id: crypto.randomUUID(),
        type: "close_trade",
        ticket: body.ticket,
        createdAt: Date.now(),
      });
      commandQueue.set(accountId, queue);
      
      return { success: true, message: `Comando para cerrar trade ${body.ticket} enviado` };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        ticket: t.Number(),
      }),
    }
  )

  // ============================================
  // Enviar comando para cerrar todos los trades
  // ============================================
  .post(
    "/accounts/:id/close-all",
    async ({ params }) => {
      const accountId = params.id;
      
      const account = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });
      
      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }
      
      const queue = commandQueue.get(accountId) || { commands: [] };
      queue.commands.push({
        id: crypto.randomUUID(),
        type: "close_all",
        createdAt: Date.now(),
      });
      commandQueue.set(accountId, queue);
      
      return { success: true, message: "Comando para cerrar todos los trades enviado" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // EA obtiene comandos pendientes
  // ============================================
  .post(
    "/ea/commands",
    async ({ body }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { connectionToken: body.token },
      });

      if (!account) {
        return { success: false, error: "Token inválido", commands: [] };
      }

      // Obtener y limpiar comandos pendientes
      const queue = commandQueue.get(account.id);
      const commands = queue?.commands || [];
      
      // Limpiar la cola después de obtener los comandos
      if (queue) {
        commandQueue.set(account.id, { commands: [] });
      }

      return { 
        success: true, 
        commands: commands.map(c => ({
          id: c.id,
          type: c.type,
          ticket: c.ticket,
        }))
      };
    },
    {
      body: t.Object({
        token: t.String(),
      }),
    }
  )

  // ============================================
  // Solicitar sincronización de historial
  // ============================================
  .post(
    "/accounts/:id/sync-history",
    async ({ params }) => {
      const accountId = params.id;
      
      const account = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });
      
      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }
      
      // Añadir comando de sincronización a la cola
      const queue = commandQueue.get(accountId) || { commands: [] };
      queue.commands.push({
        id: crypto.randomUUID(),
        type: "sync_history",
        createdAt: Date.now(),
      });
      commandQueue.set(accountId, queue);
      
      return { success: true, message: "Comando de sincronización enviado al EA" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // EA envía historial de trades en batch
  // ============================================
  .post(
    "/ea/sync-history",
    async ({ body }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { connectionToken: body.token },
      });

      if (!account) {
        return { success: false, error: "Token inválido", imported: 0 };
      }

      const { trades } = body;
      let imported = 0;
      let skipped = 0;

      for (const trade of trades) {
        try {
          await prisma.tradeHistory.upsert({
            where: { ticket: BigInt(trade.ticket) },
            update: {}, // No actualizar si ya existe
            create: {
              accountId: account.id,
              ticket: BigInt(trade.ticket),
              symbol: trade.symbol,
              type: trade.type,
              volume: trade.volume,
              openPrice: trade.open_price,
              closePrice: trade.close_price,
              stopLoss: trade.sl || 0,
              takeProfit: trade.tp || 0,
              profit: trade.profit,
              swap: trade.swap || 0,
              commission: trade.commission || 0,
              openTime: new Date(trade.open_time),
              closeTime: new Date(trade.close_time),
              magicNumber: trade.magic_number || 0,
              comment: trade.comment || "",
            },
          });
          imported++;
        } catch (error) {
          skipped++;
        }
      }

      return { 
        success: true, 
        message: `Historial sincronizado: ${imported} importados, ${skipped} omitidos`,
        imported,
        skipped,
      };
    },
    {
      body: t.Object({
        msg_type: t.Literal("sync_history"),
        token: t.String(),
        trades: t.Array(t.Object({
          ticket: t.Number(),
          symbol: t.String(),
          type: t.String(),
          volume: t.Number(),
          open_price: t.Number(),
          close_price: t.Number(),
          sl: t.Optional(t.Number()),
          tp: t.Optional(t.Number()),
          profit: t.Number(),
          swap: t.Optional(t.Number()),
          commission: t.Optional(t.Number()),
          open_time: t.Number(),
          close_time: t.Number(),
          magic_number: t.Optional(t.Number()),
          comment: t.Optional(t.String()),
        })),
      }),
    }
  );

// ============================================
// Exportar handlers para Next.js
// ============================================
export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;

// Exportar tipo para Eden
export type App = typeof app;

