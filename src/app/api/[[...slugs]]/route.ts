// ============================================
// API Elysia integrado en Next.js App Router
// Trading Platform SaaS
// ============================================


import { Elysia, t } from "elysia";
import ExcelJS from "exceljs";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

// Importar modelos generados por Prismabox
import {
  TradingAccountPlain,
} from "@/generated/prismabox/TradingAccount";
import { TradeHistoryPlain } from "@/generated/prismabox/TradeHistory";
import { EquitySnapshotPlain } from "@/generated/prismabox/EquitySnapshot";
import { ExpertAdvisorPlain } from "@/generated/prismabox/ExpertAdvisor";

// Singleton de Prisma para evitar múltiples instancias en desarrollo
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  liveDataCache: Map<string, { data: any; timestamp: number }>;
  commandQueue: Map<string, { commands: { id: string; type: string; ticket?: number; createdAt: number }[] }>;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Helper para verificar sesión, rate limit y evitar IDOR
 */
const verifySessionWithRateLimit = async (request: Request, targetUserId: string) => {
  const ip = getClientIP(request);
  
  // Rate limit por usuario
  const rateCheck = checkRateLimit("api", targetUserId);
  if (!rateCheck.allowed) {
    auditLog("RATE_LIMIT_EXCEEDED", { userId: targetUserId, ip, details: { type: "api" } });
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)}s`);
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.id !== targetUserId) {
    throw new Error("Unauthorized Access: IDOR Protected");
  }
  
  return session;
};  


const verifySession = async (headers: Headers, targetUserId: string) => {
  const session = await auth.api.getSession({ headers });
  if (!session || session.user.id !== targetUserId) {
    throw new Error("Unauthorized Access: IDOR Protected");
  }
};

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
  // CORS - Restringido a orígenes específicos
  .use(
    cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:3000"],
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
    async ({ params, request }) => {
      await verifySession(request.headers, params.id);
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
          accountTypeId: true,
          balance: true,
          equity: true,
          accountType: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      return accounts;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // Cuentas de Trading - Listar con datos en vivo
  // ============================================
  .get(
    "/users/:id/accounts-live",
    async ({ params, request }) => {
      await verifySession(request.headers, params.id);
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
          accountTypeId: true,
          balance: true,
          equity: true,
          accountType: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      // Obtener estadísticas de trades para estas cuentas
      const accountIds = accounts.map(a => a.id);
      let statsMap: Record<string, { total: number; wins: number; grossProfit: number; grossLoss: number }> = {};
      
      if (accountIds.length > 0) { // Solo ejecutar si hay cuentas
        try {
          const [totalTrades, winningTrades, profitSums, lossSums] = await Promise.all([
            prisma.tradeHistory.groupBy({
              by: ['accountId'],
              _count: { _all: true },
              where: { accountId: { in: accountIds } }
            }),
            prisma.tradeHistory.groupBy({
              by: ['accountId'],
              _count: { _all: true },
              where: { accountId: { in: accountIds }, profit: { gt: 0 } }
            }),
            // Sumar ganancias (profit > 0)
            prisma.tradeHistory.groupBy({
              by: ['accountId'],
              _sum: { profit: true },
              where: { accountId: { in: accountIds }, profit: { gt: 0 } }
            }),
            // Sumar pérdidas (profit < 0)
            prisma.tradeHistory.groupBy({
              by: ['accountId'],
              _sum: { profit: true },
              where: { accountId: { in: accountIds }, profit: { lt: 0 } }
            })
          ]);

          accounts.forEach(a => {
            const total = totalTrades.find(t => t.accountId === a.id)?._count._all || 0;
            const wins = winningTrades.find(t => t.accountId === a.id)?._count._all || 0;
            const grossProfit = profitSums.find(t => t.accountId === a.id)?._sum.profit || 0;
            const grossLoss = Math.abs(lossSums.find(t => t.accountId === a.id)?._sum.profit || 0);
            statsMap[a.id] = { total, wins, grossProfit, grossLoss };
          });
        } catch (e) {
          console.error("Error calculating stats:", e);
        }
      }

      // Enriquecer con datos en vivo del caché
      return accounts.map(account => {
        const cached = liveDataCache.get(account.id);
        const isLive = cached && (Date.now() - cached.timestamp < 30000);
        const balance = cached?.data?.account?.balance || 0;
        const equity = cached?.data?.account?.equity || 0;
        
        const stats = statsMap[account.id] || { total: 0, wins: 0, grossProfit: 0, grossLoss: 0 };
        const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
        const profitFactor = stats.grossLoss > 0 ? parseFloat((stats.grossProfit / stats.grossLoss).toFixed(2)) : (stats.grossProfit > 0 ? 99.99 : 0);

        return {
          ...account,
          isConnected: isLive, // Estado real basado en caché
          liveData: isLive ? {
            balance,
            equity,
            floatingPL: equity - balance,
            lastUpdate: cached.timestamp,
          } : null,
          stats: {
            winRate,
            trades: stats.total,
            profitFactor
          }
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
    async ({ params, request }) => {
      await verifySession(request.headers, params.id);
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
    async ({ body, request }) => {
      await verifySession(request.headers, body.userId);
      const account = await prisma.tradingAccount.create({
        data: {
          userId: body.userId,
          accountNumber: body.accountNumber,
          broker: body.broker,
          server: body.server,
          platform: body.platform || "MT5",
          nickname: body.nickname,
          sectionId: body.sectionId || null,
          accountTypeId: body.accountTypeId || null,
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
        accountNumber: t.Numeric(),
        broker: t.String(),
        server: t.String(),
        platform: t.Optional(t.String()),
        nickname: t.Optional(t.String()),
        sectionId: t.Optional(t.String()),
        accountTypeId: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        connectionToken: t.String(),
        message: t.String(),
      }),
    }
  )

  // ============================================
  // TIPOS DE CUENTA - Listar por usuario
  // ============================================
  .get(
    "/users/:id/account-types",
    async ({ params, request }) => {
      await verifySession(request.headers, params.id);
      const types = await prisma.accountType.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: "asc" },
      });
      return types;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // TIPOS DE CUENTA - Crear
  // ============================================
  .post(
    "/account-types",
    async ({ body, request }) => {
      await verifySession(request.headers, body.userId);
      
      // Verificar si ya existe ese tipo para el usuario
      const existing = await prisma.accountType.findUnique({
        where: {
          userId_name: {
            userId: body.userId,
            name: body.name,
          },
        },
      });
      
      if (existing) {
        return { id: existing.id, message: "Tipo ya existe" };
      }
      
      const type = await prisma.accountType.create({
        data: {
          userId: body.userId,
          name: body.name,
          color: body.color || "#71717A",
        },
      });
      return { id: type.id, message: "Tipo de cuenta creado" };
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
  // TIPOS DE CUENTA - Eliminar
  // ============================================
  .delete(
    "/account-types/:id",
    async ({ params, request }) => {
      const type = await prisma.accountType.findUnique({ where: { id: params.id } });
      if (!type) return { message: "Tipo no encontrado" };
      await verifySession(request.headers, type.userId);
      
      // Desvincular cuentas
      await prisma.tradingAccount.updateMany({
        where: { accountTypeId: params.id },
        data: { accountTypeId: null },
      });
      
      await prisma.accountType.delete({ where: { id: params.id } });
      return { message: "Tipo de cuenta eliminado" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // TIPOS DE CUENTA - Actualizar
  // ============================================
  .put(
    "/account-types/:id",
    async ({ params, body, request }) => {
      const type = await prisma.accountType.findUnique({ where: { id: params.id } });
      if (!type) throw new Error("Tipo no encontrado");
      await verifySession(request.headers, type.userId);
      
      const updated = await prisma.accountType.update({
        where: { id: params.id },
        data: {
          name: body.name,
          color: body.color,
        },
      });
      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String(),
        color: t.String(),
      }),
    }
  )

  // ============================================
  // ESTADÍSTICAS DE CUENTA (Win Rate, Trades)
  // ============================================
  .get(
    "/accounts/:id/stats",
    async ({ params, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      // Calcular stats desde TradeHistory
      const trades = await prisma.tradeHistory.findMany({
        where: { accountId: params.id },
        select: { profit: true },
      });

      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => t.profit > 0).length;
      const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
      const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);

      return {
        totalTrades,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        winRate,
        totalProfit,
      };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // SECCIONES - Listar por usuario
  // ============================================
  .get(
    "/users/:id/sections",
    async ({ params, request }) => {
      await verifySession(request.headers, params.id);
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
    async ({ body, request }) => {
      await verifySession(request.headers, body.userId);
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
    async ({ params, body, request }) => {
      // 1. Buscar sección para validar dueño
      const section = await prisma.section.findUnique({ where: { id: params.id } });
      if (!section) throw new Error("Section not found");
      
      // 2. Seguridad: Verificar que la sección pertenece al usuario de la sesión
      await verifySession(request.headers, section.userId);

      const updated = await prisma.section.update({
        where: { id: params.id },
        data: {
          name: body.name,
          color: body.color,
        },
      });
      return { id: updated.id, message: "Sección actualizada" };
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
    async ({ params, request }) => {
      // 1. Buscar sección para validar dueño
      const section = await prisma.section.findUnique({ where: { id: params.id } });
      if (!section) return { message: "Sección no encontrada" };

      // 2. Seguridad: Verificar que la sección pertenece al usuario
      await verifySession(request.headers, section.userId);

      // 3. Desvincular cuentas explícitamente (Cumplir requerimiento usuario)
      await prisma.tradingAccount.updateMany({
        where: { sectionId: params.id },
        data: { sectionId: null }
      });

      // 4. Eliminar
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
    async ({ params, body, request }) => {
      console.log(`[PUT /accounts/${params.id}] Body recibido:`, JSON.stringify(body));
      // Buscar cuenta para validar dueño
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      try {
        const updated = await prisma.tradingAccount.update({
          where: { id: params.id },
          data: {
            nickname: body.nickname || null,
            broker: body.broker,
            server: body.server,
            platform: body.platform,
            sectionId: body.sectionId || null,
            accountTypeId: body.accountTypeId || null,
          },
        });
        console.log(`[PUT /accounts/${params.id}] Success. New type: ${updated.accountTypeId}`);
        return { message: "Cuenta actualizada" };
      } catch (error) {
        console.error(`[PUT /accounts/${params.id}] ERROR updating:`, error);
        throw error; // Re-throw para que el frontend reciba 500
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        nickname: t.Optional(t.String()),
        broker: t.String(),
        server: t.String(),
        platform: t.String(),
        sectionId: t.Optional(t.Union([t.String(), t.Null()])),
        accountTypeId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // ============================================
  // CUENTAS - Mover a sección
  // ============================================
  .put(
    "/accounts/:id/section",
    async ({ params, body, request }) => {
      // Buscar cuenta para validar dueño
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

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
    async ({ params, request }) => {
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

      if (account) {
        await verifySession(request.headers, account.userId);
      }

      return account;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ============================================
  // ELIMINAR CUENTA
  // ============================================
  .delete(
    "/accounts/:id",
    async ({ params, request }) => {
      // Buscar cuenta para validar dueño
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      // Eliminar cuenta (Prisma borrará cascada el historial si está configurado)
      await prisma.tradingAccount.delete({
        where: { id: params.id },
      });

      return { message: "Cuenta eliminada exitosamente" };
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
    async ({ params, query, request }) => {
      // Verificar que el usuario es dueño de la cuenta
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

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
    async ({ params, query, request }) => {
      // Verificar que el usuario es dueño de la cuenta
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

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
  // Expert Advisors (EAs) - Listar
  // ============================================
  .get(
    "/accounts/:id/eas",
    async ({ params, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      const eas = await prisma.expertAdvisor.findMany({
        where: { accountId: params.id },
        orderBy: { createdAt: "desc" },
      });

      return eas;
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Array(ExpertAdvisorPlain),
    }
  )

  // ============================================
  // Expert Advisors (EAs) - Crear
  // ============================================
  .post(
    "/accounts/:id/eas",
    async ({ params, body, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      // Verificar si ya existe magic number para esta cuenta
      const existing = await prisma.expertAdvisor.findUnique({
        where: {
          accountId_magicNumber: {
            accountId: params.id,
            magicNumber: body.magicNumber,
          },
        },
      });

      if (existing) {
        return { success: false, message: "Magic Number ya existe en esta cuenta" };
      }

      const ea = await prisma.expertAdvisor.create({
        data: {
          accountId: params.id,
          name: body.name,
          magicNumber: body.magicNumber,
        },
      });

      return { success: true, ea };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String(),
        magicNumber: t.Integer(),
      }),
    }
  )

  // ============================================
  // Expert Advisors (EAs) - Eliminar
  // ============================================
  .delete(
    "/eas/:id",
    async ({ params, request }) => {
      const ea = await prisma.expertAdvisor.findUnique({ where: { id: params.id } });
      if (!ea) return { success: false, message: "EA no encontrado" };
      
      const account = await prisma.tradingAccount.findUnique({ where: { id: ea.accountId } });
      if (account) {
          await verifySession(request.headers, account.userId);
      }
      
      await prisma.expertAdvisor.delete({ where: { id: params.id } });
      return { success: true, message: "EA eliminado" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // Expert Advisors (EAs) - Obtener Uno
  // ============================================
  .get(
    "/eas/:id",
    async ({ params, request }) => {
      const ea = await prisma.expertAdvisor.findUnique({ where: { id: params.id } });
      if (!ea) throw new Error("EA not found");
      
      const account = await prisma.tradingAccount.findUnique({ where: { id: ea.accountId } });
      if (account) {
          await verifySession(request.headers, account.userId);
      }
      return ea;
    },
    {
        params: t.Object({ id: t.String() }),
        response: ExpertAdvisorPlain
    }
  )

  // ============================================
  // Expert Advisors (EAs) - Reporte Excel
  // ============================================
  .get(
    "/eas/:id/report",
    async ({ params, query, request }) => {
      const ea = await prisma.expertAdvisor.findUnique({ where: { id: params.id } });
      if (!ea) throw new Error("EA not found");
      
      const account = await prisma.tradingAccount.findUnique({ where: { id: ea.accountId } });
      if (account) {
          await verifySession(request.headers, account.userId);
      }
      
      // Filtros de fecha
      const whereClause: any = { 
          accountId: ea.accountId, 
          magicNumber: ea.magicNumber 
      };
      
      if (query.from || query.to) {
          whereClause.closeTime = {};
          if (query.from) whereClause.closeTime.gte = new Date(Number(query.from));
          if (query.to) whereClause.closeTime.lte = new Date(Number(query.to));
      }

      const trades = await prisma.tradeHistory.findMany({ 
          where: whereClause, 
          orderBy: { closeTime: "asc" } 
      });

      // --- CÁLCULO DE ESTADÍSTICAS ---
      let totalTrades = trades.length;
      let winningTrades = 0;
      let losingTrades = 0;
      let totalProfit = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let maxDrawdown = 0;
      
      let runningBalance = 0;
      let peakBalance = 0;

      // Stats pre-calc
      trades.forEach(t => {
          const net = t.profit + (t.commission || 0) + (t.swap || 0);
          totalProfit += net;
          runningBalance += net;

          if (runningBalance > peakBalance) peakBalance = runningBalance;
          const drawdown = peakBalance - runningBalance;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;

          if (net > 0) {
              winningTrades++;
              grossProfit += net;
          } else {
              losingTrades++;
              grossLoss += Math.abs(net);
          }
      });

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
      const expectedPayoff = totalTrades > 0 ? totalProfit / totalTrades : 0;
      const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
      const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;


      // --- GENERACIÓN EXCEL PROFESIONAL ---
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "AccountViewer App";
      workbook.created = new Date();

      // ==========================================
      // HOJA 1: DASHBOARD
      // ==========================================
      const dashboard = workbook.addWorksheet("Dashboard", {
        views: [{ showGridLines: false }]
      });

      // --- Header Branding ---
      dashboard.mergeCells('B2:E2');
      const titleCell = dashboard.getCell('B2');
      titleCell.value = `INFORME DE RENDIMIENTO: ${ea.name.toUpperCase()}`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate-800
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      dashboard.getRow(2).height = 30;

      dashboard.mergeCells('B3:E3');
      const subtitleCell = dashboard.getCell('B3');
      subtitleCell.value = `Generado: ${new Date().toLocaleDateString()} | Cuenta: ${ea.accountId.substring(0,8)}...`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF94A3B8' } }; // Slate-400
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // --- Metrics Grid ---
      const startRow = 5;
      const metrics = [
          { label: "Beneficio Neto", value: totalProfit, type: "money", color: totalProfit >= 0 ? 'FF10B981' : 'FFEF4444' },
          { label: "Factor de Beneficio", value: profitFactor, type: "number" },
          { label: "Total Operaciones", value: totalTrades, type: "int" },
          { label: "Win Rate", value: winRate / 100, type: "percent" }, // Excel uses 0-1 for %
          { label: "Drawdown Máx.", value: maxDrawdown, type: "money", color: 'FFEF4444' },
          { label: "Esperanza (Payoff)", value: expectedPayoff, type: "money" },
          { label: "Promedio Ganancia", value: avgWin, type: "money", color: 'FF10B981' },
          { label: "Promedio Pérdida", value: -avgLoss, type: "money", color: 'FFEF4444' },
      ];

      // Draw Metrics in 2 columns
      metrics.forEach((m, i) => {
          const r = startRow + Math.floor(i / 2) * 2;
          const c = 2 + (i % 2) * 2; // Col B (2) or D (4)
          
          // Label Cell
          const labelCell = dashboard.getCell(r, c);
          labelCell.value = m.label;
          labelCell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' }, bold: true };
          labelCell.border = { bottom: {style:'thin', color: {argb:'FFCBD5E1'}} };
          
          // Value Cell
          const valCell = dashboard.getCell(r + 1, c);
          valCell.value = m.value;
          valCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: m.color || 'FF0F172A' } };
          valCell.alignment = { horizontal: 'left' };
          
          // Formatting
          if (m.type === 'money') valCell.numFmt = '"$"#,##0.00';
          if (m.type === 'percent') valCell.numFmt = '0.00%';
          if (m.type === 'number') valCell.numFmt = '0.00';
          
          // Background Box Effect (optional simple border for the block)
          // dashboard.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          // dashboard.getCell(r+1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });

      dashboard.getColumn(2).width = 25; // Col B
      dashboard.getColumn(3).width = 5;  // Spacer
      dashboard.getColumn(4).width = 25; // Col D

      // ==========================================
      // HOJA 2: OPERACIONES (DETAILED)
      // ==========================================
      const dataSheet = workbook.addWorksheet("Operaciones");
      
      const columns = [
        { header: "Ticket", key: "ticket", width: 12 },
        { header: "Símbolo", key: "symbol", width: 10 },
        { header: "Tipo", key: "type", width: 8 },
        { header: "Volumen", key: "volume", width: 10 },
        { header: "Apertura", key: "openTime", width: 20 },
        { header: "Precio Open", key: "openPrice", width: 12 },
        { header: "Cierre", key: "closeTime", width: 20 },
        { header: "Precio Close", key: "closePrice", width: 12 },
        { header: "Beneficio", key: "profit", width: 12 },
        { header: "Comisión", key: "commission", width: 12 },
        { header: "Swap", key: "swap", width: 12 },
        { header: "Neto", key: "netProfit", width: 12 },
      ];
      
      dataSheet.columns = columns;

      // Header Row Style
      const headerRow = dataSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerRow.alignment = { horizontal: 'center' };

      // Add Data
      const sortedTrades = [...trades].sort((a, b) => b.closeTime.getTime() - a.closeTime.getTime());
      
      sortedTrades.forEach((t, index) => {
          const net = t.profit + (t.commission || 0) + (t.swap || 0);
          const row = dataSheet.addRow({
              ticket: t.ticket.toString(),
              symbol: t.symbol,
              type: t.type,
              volume: t.volume,
              openTime: t.openTime,
              openPrice: t.openPrice,
              closeTime: t.closeTime,
              closePrice: t.closePrice,
              profit: t.profit,
              commission: t.commission,
              swap: t.swap,
              netProfit: net,
          });

          // Striped Rows
          if (index % 2 !== 0) {
              row.eachCell({ includeEmpty: true }, (cell) => {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
              });
          }

          // Color for Net Profit
          const netCell = row.getCell(12); // Last column
          netCell.font = { color: { argb: net >= 0 ? 'FF16A34A' : 'FFDC2626' }, bold: true };
          
          const typeCell = row.getCell(3);
          typeCell.font = { color: { argb: t.type === 'buy' ? 'FF2563EB' : 'FFDB2777' } }; // Blue buy, Pink sell
      });

      // AutoFilter
      dataSheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columns.length }
      };

      // Freeze Header
      dataSheet.views = [
          { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      
      return new Response(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="Report_${ea.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx"`
        }
      });
    },
    {
        params: t.Object({ id: t.String() }),
        query: t.Object({
            from: t.Optional(t.String()),
            to: t.Optional(t.String())
        })
    }
  )

  // ============================================
  // Datos en Vivo (para frontend polling)
  // ============================================
  .get(
    "/accounts/:id/live",
    async ({ params, request }) => {
      // Verificar que el usuario es dueño de la cuenta
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

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
    async ({ params, request }) => {
      // Verificar que el usuario es dueño de la cuenta
      const existingAccount = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!existingAccount) throw new Error("Account not found");
      await verifySession(request.headers, existingAccount.userId);

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
      // Rate limit por token EA
      const rateCheck = checkRateLimit("ea", body.token);
      if (!rateCheck.allowed) {
        return { success: false, error: `Rate limit exceeded. Retry in ${Math.ceil(rateCheck.resetIn / 1000)}s` };
      }

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
          balance: body.account.balance,
          equity: body.account.equity,
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
        const data = {
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
        };
          
          // Corrección automática de tipo (Buy/Sell) si viene invertido del EA
          const grossProfit = trade.profit - (trade.swap || 0) - (trade.commission || 0);
          const priceDelta = trade.close_price - trade.open_price;
          
          // Lógica: Si precio sube (delta > 0) y ganamos (profit > 0) -> es BUY
          // Si precio sube (delta > 0) y perdemos (profit < 0) -> es SELL
          if (Math.abs(priceDelta) > 0.000001 && Math.abs(grossProfit) > 0.001) {
             const sameSign = (priceDelta > 0 && grossProfit > 0) || (priceDelta < 0 && grossProfit < 0);
             if (sameSign) {
               data.type = "buy";
             } else {
               data.type = "sell";
             }
          }

        await prisma.tradeHistory.create({
          data,
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
    async ({ params, body, request }) => {
      const accountId = params.id;
      
      // Verificar que la cuenta existe y el usuario es dueño
      const account = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });
      
      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }

      await verifySession(request.headers, account.userId);
      
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
    async ({ params, request }) => {
      const accountId = params.id;
      
      const account = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });
      
      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }

      await verifySession(request.headers, account.userId);
      
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
  // EA - Forzar Sincronización Historial Completo
  // ============================================
  .post(
    "/accounts/:id/sync-all-history",
    async ({ params, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) return { success: false, error: "Cuenta no encontrada" };
      await verifySession(request.headers, account.userId);

      const queue = commandQueue.get(params.id) || { commands: [] };
      // Comando para que el EA envíe todo el historial
      queue.commands.push({
        id: crypto.randomUUID(),
        type: "sync_history_full", // El EA debe reconocer esto
        createdAt: Date.now(),
      });
      commandQueue.set(params.id, queue);

      return { success: true, message: "Solicitud de historial completo enviada al EA" };
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
    async ({ params, request }) => {
      const accountId = params.id;
      
      const account = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });
      
      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }

      await verifySession(request.headers, account.userId);
      
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
      console.log(`[SYNC] Recibidos ${trades.length} trades para cuenta ${account.accountNumber}`);
      if (trades.length > 0) console.log(`[SYNC] Sample trade:`, trades[0]);
      
      // 1. Preparar datos en memoria (corrección de tipos y formateo)
      // Esto es O(N) en CPU, mucho más rápido que N queries a BD
      const preparedTrades = trades.map(trade => {
        let finalType = trade.type;
        const grossProfit = trade.profit - (trade.swap || 0) - (trade.commission || 0);
        const priceDelta = trade.close_price - trade.open_price;
        
        // Corrección de tipo Buy/Sell basada en precio/profit
        if (Math.abs(priceDelta) > 0.000001 && Math.abs(grossProfit) > 0.001) {
           const sameSign = (priceDelta > 0 && grossProfit > 0) || (priceDelta < 0 && grossProfit < 0);
           finalType = sameSign ? "buy" : "sell";
        }
        
        // Detectar si vienen en segundos (MT5 standard) o milisegundos
        const isSeconds = trade.open_time < 10000000000;
        const multiplier = isSeconds ? 1000 : 1;

        return {
          accountId: account.id,
          ticket: BigInt(trade.ticket),
          symbol: trade.symbol,
          type: finalType,
          volume: trade.volume,
          openPrice: trade.open_price,
          closePrice: trade.close_price,
          stopLoss: trade.sl || 0,
          takeProfit: trade.tp || 0,
          profit: trade.profit,
          swap: trade.swap || 0,
          commission: trade.commission || 0,
          openTime: new Date(trade.open_time * multiplier),
          closeTime: new Date(trade.close_time * multiplier),
          magicNumber: trade.magic_number || 0,
          comment: trade.comment || "",
        };
      });

      // 2. Inserción Masiva (Bulk Insert) de los nuevos
      // createMany es mucho más eficiente. skipDuplicates ignora los que ya existen (por ticket + accountId unique)
      let imported = 0;
      try {
        const result = await prisma.tradeHistory.createMany({
          data: preparedTrades,
          skipDuplicates: true,
        });
        imported = result.count;
      } catch (error) {
        console.error("Error en bulk insert:", error);
        return { success: false, error: "Error procesando trades", imported: 0 };
      }

      return { 
        success: true, 
        message: `Sincronización rápida: ${imported} nuevos trades importados`,
        imported,
        skipped: trades.length - imported, // Estimado
      };
    },
    {
      body: t.Object({
        msg_type: t.Optional(t.Literal("sync_history")), // Hacer opcional por si acaso
        token: t.String(),
        trades: t.Array(t.Object({
          ticket: t.Union([t.Number(), t.String()]), // Permitir strings para evitar precision issues
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

