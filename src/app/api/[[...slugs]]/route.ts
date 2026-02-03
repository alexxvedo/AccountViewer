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
  commandQueue: Map<string, { commands: { id: string; type: string; ticket?: number; symbol?: string; timeframe?: number; bars?: number; requestId?: string; sl?: number; tp?: number; createdAt: number }[] }>;
  // Cache para chart data (OHLC) del EA
  chartDataCache: Map<string, { data: { symbol: string; timeframe: number; bars: Array<{ time: number; open: number; high: number; low: number; close: number; volume?: number }> }; timestamp: number }>;
  // Cache para rate limiting de alertas (evitar spam)
  alertCooldowns: Map<string, number>;
};

// Telegraf instance
import { Telegraf } from 'telegraf';
// Lazy initialization of bot to avoid issues if token is missing
const getBot = () => {
    if (process.env.TELEGRAM_BOT_TOKEN) {
        return new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    }
    return null;
}

const alertCooldowns = globalForPrisma.alertCooldowns ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production") globalForPrisma.alertCooldowns = alertCooldowns;

// Set para evitar procesamiento duplicado de alertas
const alertsBeingProcessed = new Set<string>();

// Función para procesar alertas
const checkAlerts = async (account: any) => {
    try {
        // 1. Obtener alertas activas para esta cuenta
        const alerts = await prisma.alert.findMany({
            where: { 
                accountId: account.id,
                active: true,
                triggered: false 
            },
            include: { user: { select: { telegramChatId: true } } }
        });

        if (alerts.length === 0) return;

        const bot = getBot();
        if (!bot) return;

        for (const alert of alerts) {
            // Verificar cooldown (ej: no spammear la misma alerta si no se ha reseteado)
            // En este modelo simple, 'triggered' se pone a true, así que es one-time shot hasta reset manual.
            // Para 'triggered=false' (recurrentes), usaríamos cooldown.
            
            let isTriggered = false;
            let currentsVal = 0;

            if (alert.type === 'BALANCE') {
                currentsVal = account.balance;
            } else if (alert.type === 'EQUITY') {
                currentsVal = account.equity;
                // Para equity, a veces queremos cooldown si oscila
            } else if (alert.type === 'MARGIN') {
                currentsVal = account.margin;
            }

            if (alert.condition === 'GT') {
                if (currentsVal > alert.value) isTriggered = true;
            } else if (alert.condition === 'LT') {
                if (currentsVal < alert.value) isTriggered = true;
            }

            if (isTriggered) {
                // Evitar procesamiento duplicado
                if (alertsBeingProcessed.has(alert.id)) {
                    console.log(`[ALERTS] Alert ${alert.id} already being processed, skipping`);
                    continue;
                }
                alertsBeingProcessed.add(alert.id);

                // Enviar mensaje
                if (alert.user.telegramChatId) {
                    const typeLabels: Record<string, string> = {
                        'BALANCE': 'Balance',
                        'EQUITY': 'Equity',
                        'MARGIN': 'Margen'
                    };
                    const typeLabel = typeLabels[alert.type] || alert.type;
                    const conditionText = alert.condition === 'GT' ? 'ha superado' : 'ha bajado de';
                    const accountName = account.nickname || `#${account.accountNumber}`;
                    const diff = currentsVal - alert.value;
                    const diffText = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);

                    const msg = `🚨 *ALERTA ACTIVADA* 🚨

📊 *${typeLabel} ${conditionText} tu límite*

🏦 *Cuenta:* ${accountName}
🏢 *Broker:* ${account.broker}
📈 *Servidor:* ${account.server}

━━━━━━━━━━━━━━━
⚙️ *Condición:* ${typeLabel} ${alert.condition === 'GT' ? '>' : '<'} $${alert.value.toLocaleString()}
💰 *Valor actual:* $${currentsVal.toLocaleString()}
📉 *Diferencia:* $${diffText}
━━━━━━━━━━━━━━━

⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;

                    try {
                        // Marcar como disparada ANTES de enviar para evitar duplicados
                        await prisma.alert.update({
                            where: { id: alert.id },
                            data: {
                                triggered: true,
                                lastTriggeredAt: new Date()
                            }
                        });

                        await bot.telegram.sendMessage(alert.user.telegramChatId, msg, { parse_mode: 'Markdown' });
                        console.log(`[ALERTS] Notification sent to ${alert.user.telegramChatId}`);
                    } catch (e) {
                        console.error(`[ALERTS] Failed to send telegram:`, e);
                    } finally {
                        alertsBeingProcessed.delete(alert.id);
                    }
                } else {
                    alertsBeingProcessed.delete(alert.id);
                }
            }
        }
    } catch (e) {
        console.error("[ALERTS] Error processing alerts:", e);
    }
}

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
const commandQueue = globalForPrisma.commandQueue ?? new Map<string, { commands: { id: string; type: string; ticket?: number; symbol?: string; timeframe?: number; bars?: number; requestId?: string; sl?: number; tp?: number; createdAt: number }[] }>();
if (process.env.NODE_ENV !== "production") globalForPrisma.commandQueue = commandQueue;

// Cache para datos de gráficos OHLC del EA (clave: accountId:symbol:timeframe)
const chartDataCache = globalForPrisma.chartDataCache ?? new Map<string, { data: { symbol: string; timeframe: number; bars: Array<{ time: number; open: number; high: number; low: number; close: number; volume?: number }> }; timestamp: number }>();
if (process.env.NODE_ENV !== "production") globalForPrisma.chartDataCache = chartDataCache;


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
  // Expert Advisors (EAs) - Listar TODOS por usuario (para Sidebar)
  // ============================================
  .get(
    "/users/:id/eas",
    async ({ params, request }) => {
      await verifySession(request.headers, params.id);
      
      // 1. Obtener IDs de cuentas del usuario
      const accounts = await prisma.tradingAccount.findMany({
          where: { userId: params.id },
          select: { id: true }
      });
      
      const accountIds = accounts.map(a => a.id);
      
      // 2. Buscar EAs de esas cuentas
      const eas = await prisma.expertAdvisor.findMany({
          where: { accountId: { in: accountIds } },
          include: {
              account: {
                  select: { nickname: true, accountNumber: true } // Para mostrar info extra si hace falta
              }
          },
          orderBy: { createdAt: "desc" }
      });
      
      return eas;
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
  // Expert Advisors (EAs) - Reporte CONSOLIDADO (Todas las EAs)
  // ============================================
  .get(
    "/accounts/:id/eas-report",
    async ({ params, query, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      const eas = await prisma.expertAdvisor.findMany({
        where: { accountId: params.id },
      });

      // Map magic number to EA Name for easy lookup
      const eaMap = new Map<number, string>();
      eas.forEach(ea => eaMap.set(ea.magicNumber, ea.name));

      // Filtros de fecha (apply to all trades)
      const whereClause: any = { 
          accountId: params.id,
          magicNumber: { in: eas.map(e => e.magicNumber) } // Only trades from these EAs
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

      // --- CÁLCULO DE ESTADÍSTICAS POR EA ---
      const statsByEA: Record<number, any> = {};
      
      // Initialize stats for all EAs (even those with 0 trades)
      eas.forEach(ea => {
          statsByEA[ea.magicNumber] = {
              name: ea.name,
              magic: ea.magicNumber,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
              totalProfit: 0,
              grossProfit: 0,
              grossLoss: 0,
              maxDrawdown: 0,
              runningBalance: 0,
              peakBalance: 0
          };
      });

      trades.forEach(t => {
          // Safety check if trade magic number is in our list (should be due to query filter)
          if (!t.magicNumber || !statsByEA[t.magicNumber]) return;
          
          const s = statsByEA[t.magicNumber];
          const net = t.profit + (t.commission || 0) + (t.swap || 0);
          
          s.totalTrades++;
          s.totalProfit += net;
          s.runningBalance += net;

          if (s.runningBalance > s.peakBalance) s.peakBalance = s.runningBalance;
          const drawdown = s.peakBalance - s.runningBalance;
          if (drawdown > s.maxDrawdown) s.maxDrawdown = drawdown;

          if (net > 0) {
              s.winningTrades++;
              s.grossProfit += net;
          } else {
              s.losingTrades++;
              s.grossLoss += Math.abs(net);
          }
      });

      // Finalize calc (Win Rate, Profit Factor, etc)
      const summaryList = Object.values(statsByEA).map((s: any) => {
          const winRate = s.totalTrades > 0 ? (s.winningTrades / s.totalTrades) : 0;
          const profitFactor = s.grossLoss > 0 ? s.grossProfit / s.grossLoss : s.grossProfit > 0 ? 999 : 0;
          const avgTrade = s.totalTrades > 0 ? s.totalProfit / s.totalTrades : 0;
          
          return {
              ...s,
              winRate,
              profitFactor,
              avgTrade
          };
      });


      // --- GENERACIÓN EXCEL ---
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "GMonitor App";
      workbook.created = new Date();

      // HOJA 1: RESUMEN COMPARATIVO
      const summarySheet = workbook.addWorksheet("Resumen EAs");
      
      summarySheet.columns = [
          { header: "EA Name", key: "name", width: 25 },
          { header: "Magic #", key: "magic", width: 12 },
          { header: "Total Trades", key: "totalTrades", width: 15 },
          { header: "Net Profit", key: "totalProfit", width: 18 },
          { header: "Profit Factor", key: "profitFactor", width: 15 },
          { header: "Win Rate", key: "winRate", width: 12 },
          { header: "Max Drawdown", key: "maxDrawdown", width: 18 },
          { header: "Avg Trade", key: "avgTrade", width: 15 },
      ];

      // Header Style
      const sumHeader = summarySheet.getRow(1);
      sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
      sumHeader.alignment = { horizontal: 'center', vertical: 'middle' };
      sumHeader.height = 30;

      summaryList.forEach((s, idx) => {
          const row = summarySheet.addRow({
              name: s.name,
              magic: s.magic,
              totalTrades: s.totalTrades,
              totalProfit: s.totalProfit,
              profitFactor: s.profitFactor,
              winRate: s.winRate,
              maxDrawdown: s.maxDrawdown,
              avgTrade: s.avgTrade
          });

          // Formats
          row.height = 20;
          row.getCell(4).numFmt = '"$"#,##0.00'; // Net Profit
          row.getCell(4).font = { color: { argb: s.totalProfit >= 0 ? 'FF16A34A' : 'FFDC2626' }, bold: true };
          row.getCell(5).numFmt = '0.00'; // PF
          row.getCell(6).numFmt = '0.00%'; // Win Rate
          row.getCell(7).numFmt = '"$"#,##0.00'; // DD
          row.getCell(8).numFmt = '"$"#,##0.00'; // Avg
          
          row.alignment = { vertical: 'middle' };

          if (idx % 2 !== 0) {
              row.eachCell({ includeEmpty: true }, (cell) => {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
              });
          }
      });
      
      // Total Row
      const grandTotalProfit = summaryList.reduce((acc, s) => acc + s.totalProfit, 0);
      const totalRow = summarySheet.addRow({
          name: "TOTAL",
          totalTrades: summaryList.reduce((acc, s) => acc + s.totalTrades, 0),
          totalProfit: grandTotalProfit
      });
      totalRow.font = { bold: true };
      totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
      totalRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      totalRow.getCell(4).numFmt = '"$"#,##0.00';
      totalRow.getCell(4).font = { color: { argb: grandTotalProfit >= 0 ? 'FF16A34A' : 'FFDC2626' }, bold: true };


      summarySheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } };


      // HOJA 2: OPERACIONES DETALLADAS (Por EA)
      const dataSheet = workbook.addWorksheet("Operaciones");
      
      dataSheet.columns = [
        { header: "Ticket", key: "ticket", width: 12 },
        { header: "Símbolo", key: "symbol", width: 12 },
        { header: "Tipo", key: "type", width: 10 },
        { header: "Volumen", key: "volume", width: 10 },
        { header: "Apertura", key: "openTime", width: 22 },
        { header: "Cierre", key: "closeTime", width: 22 },
        { header: "Precio Open", key: "openPrice", width: 12 },
        { header: "Precio Close", key: "closePrice", width: 12 },
        { header: "Beneficio", key: "profit", width: 12 },
        { header: "Comisión", key: "commission", width: 12 },
        { header: "Swap", key: "swap", width: 12 },
        { header: "Neto", key: "netProfit", width: 15 },
      ];

      const dataHeader = dataSheet.getRow(1);
      dataHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      dataHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
      dataHeader.alignment = { horizontal: 'center' };
      dataHeader.height = 25;

      // Group trades by EA using the map we made earlier
      // We want to iterate existing EAs to keep order and include empty ones if needed (skipping empty for ops sheet makes sense though)
      
      eas.forEach(ea => {
          const eaTrades = trades.filter(t => t.magicNumber === ea.magicNumber).sort((a,b) => b.closeTime.getTime() - a.closeTime.getTime());
          
          if (eaTrades.length === 0) return;

          // Separator / Header Row for EA
          dataSheet.addRow([]); // Spacer
          const eaHeaderRow = dataSheet.addRow([
             `EA: ${ea.name} (Magic: ${ea.magicNumber})`,
             "", "", "", "", "", "", "",
             `Trades: ${eaTrades.length}`,
             "", "",
             `Net: $${eaTrades.reduce((acc, t) => acc + t.profit + (t.commission||0) + (t.swap||0), 0).toFixed(2)}`
          ]);
          
          // Merge cells for title
          dataSheet.mergeCells(`A${eaHeaderRow.number}:H${eaHeaderRow.number}`);
          
          eaHeaderRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
          eaHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
          eaHeaderRow.getCell(1).alignment = { vertical: 'middle', indent: 1 };
          
          // Style summary cells in header
          eaHeaderRow.getCell(9).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          eaHeaderRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
          eaHeaderRow.getCell(12).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          eaHeaderRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
          eaHeaderRow.height = 25;

          eaTrades.forEach((t, index) => {
             const net = t.profit + (t.commission || 0) + (t.swap || 0);
             const row = dataSheet.addRow({
                 ticket: t.ticket.toString(),
                 symbol: t.symbol,
                 type: t.type,
                 volume: t.volume,
                 openTime: t.openTime,
                 closeTime: t.closeTime,
                 openPrice: t.openPrice,
                 closePrice: t.closePrice,
                 profit: t.profit,
                 commission: t.commission,
                 swap: t.swap,
                 netProfit: net
             });
             
             // Styling
             row.getCell(3).font = { color: { argb: t.type === 'buy' ? 'FF2563EB' : 'FFDB2777' } }; // Buy=Blue, Sell=Pink
             row.getCell(5).numFmt = 'dd/mm/yyyy hh:mm:ss';
             row.getCell(6).numFmt = 'dd/mm/yyyy hh:mm:ss';
             row.getCell(9).font = { color: { argb: t.profit >= 0 ? 'FF16A34A' : 'FFDC2626' } };
             row.getCell(12).font = { color: { argb: net >= 0 ? 'FF16A34A' : 'FFDC2626' }, bold: true };
             row.getCell(12).numFmt = '"$"#,##0.00';
             
             if (index % 2 !== 0) {
                 row.eachCell({ includeEmpty: true }, (cell) => {
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                 });
             }
          });
      });

      dataSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

      // Filename generation
      const safeName = (account.nickname || account.accountNumber.toString()).replace(/[^a-z0-9]/gi, '_');
      const dateStr = new Date().toISOString().slice(0,10);
      let rangeStr = "ALL";
      if (query.from && query.to) {
          rangeStr = `${new Date(Number(query.from)).toISOString().slice(0,10)}_to_${new Date(Number(query.to)).toISOString().slice(0,10)}`;
      }
      
      const fileName = `Report_${safeName}_${rangeStr}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      
      return new Response(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${fileName}"`
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
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);
      
      
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
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);
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
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);
      
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
      workbook.creator = "GMonitor App";
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
      const updatedAccount = await prisma.tradingAccount.update({
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

      // Validar alertas asíncronamente (no bloquear respuesta)
      checkAlerts(updatedAccount); // Pasamos la cuenta actualizada

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
          symbol: c.symbol,
          timeframe: c.timeframe,
          bars: c.bars,
          sl: c.sl,
          tp: c.tp,
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
  )

  // ============================================
  // ALERTAS - Listar
  // ============================================
  .get(
    "/accounts/:id/alerts",
    async ({ params, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      const alerts = await prisma.alert.findMany({
        where: { accountId: params.id },
        orderBy: { createdAt: 'desc' }
      });

      return alerts;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // ALERTAS - Crear
  // ============================================
  .post(
    "/accounts/:id/alerts",
    async ({ params, body, request }) => {
      const account = await prisma.tradingAccount.findUnique({ where: { id: params.id } });
      if (!account) throw new Error("Account not found");
      await verifySession(request.headers, account.userId);

      const alert = await prisma.alert.create({
        data: {
          userId: account.userId,
          accountId: params.id,
          type: body.type,
          condition: body.condition,
          value: body.value,
        }
      });

      return { success: true, alert };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        type: t.String(),
        condition: t.String(),
        value: t.Number(),
      }),
    }
  )

  // ============================================
  // ALERTAS - Eliminar
  // ============================================
  .delete(
    "/alerts/:id",
    async ({ params, request }) => {
      const alert = await prisma.alert.findUnique({ where: { id: params.id } });
      if (!alert) return { success: false, message: "Alert not found" };
      await verifySession(request.headers, alert.userId);

      await prisma.alert.delete({ where: { id: params.id } });
      return { success: true, message: "Alert deleted" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ============================================
  // TELEGRAM - Generar Link
  // ============================================
  .post(
    "/telegram/link",
    async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) throw new Error("Unauthorized");

      // Generate token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: { telegramConnectionToken: token }
      });

      return { success: true, token };
    }
  )

  // ============================================
  // TELEGRAM - Status
  // ============================================
  .get(
    "/telegram/status",
    async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) return { connected: false };

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { telegramChatId: true }
      });

      return { connected: !!user?.telegramChatId };
    }
  )

  // ============================================
  // TELEGRAM - Webhook (recibe mensajes de Telegram)
  // ============================================
  .post(
    "/telegram/webhook",
    async ({ body }) => {
      console.log("[TELEGRAM WEBHOOK] ====== REQUEST RECIBIDA ======");
      console.log("[TELEGRAM WEBHOOK] Body:", JSON.stringify(body, null, 2));

      try {
        // Telegram envía updates en este formato
        const update = body as any;

        // Solo procesamos mensajes de texto
        if (!update.message?.text) {
          console.log("[TELEGRAM WEBHOOK] No es mensaje de texto, ignorando");
          return { ok: true };
        }

        const chatId = update.message.chat.id;
        const text = update.message.text;
        const bot = getBot();

        if (!bot) {
          console.error("[TELEGRAM] Bot no configurado (falta TELEGRAM_BOT_TOKEN)");
          return { ok: true };
        }

        // Comando /start con token
        if (text.startsWith("/start")) {
          const parts = text.split(" ");
          const token = parts.length > 1 ? parts[1] : null;

          if (!token) {
            await bot.telegram.sendMessage(
              chatId,
              "👋 *Hola! Bienvenido.*\n\nPara conectar tu cuenta, ve a la web y pulsa en 'Conectar Telegram'.",
              { parse_mode: "Markdown" }
            );
            return { ok: true };
          }

          console.log(`[TELEGRAM] Buscando usuario con token: ${token}`);

          const user = await prisma.user.findUnique({
            where: { telegramConnectionToken: token }
          });

          if (!user) {
            await bot.telegram.sendMessage(
              chatId,
              "⚠️ El enlace es inválido o ya ha sido utilizado."
            );
            return { ok: true };
          }

          // Vincular cuenta
          await prisma.user.update({
            where: { id: user.id },
            data: {
              telegramChatId: chatId.toString(),
              telegramConnectionToken: null // Invalidar token (one-time use)
            }
          });

          await bot.telegram.sendMessage(
            chatId,
            `✅ *¡Conexión exitosa!*\n\nCuenta: ${user.email}\nYa puedes recibir notificaciones de tus alertas.`,
            { parse_mode: "Markdown" }
          );

          console.log(`[TELEGRAM] Usuario ${user.email} vinculado con chatId ${chatId}`);
        }

        return { ok: true };
      } catch (error) {
        console.error("[TELEGRAM] Error procesando webhook:", error);
        return { ok: true }; // Siempre responder 200 a Telegram
      }
    }
  )

  // ============================================
  // TELEGRAM - Configurar Webhook (llamar una vez)
  // ============================================
  .post(
    "/telegram/setup-webhook",
    async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) throw new Error("Unauthorized");

      const bot = getBot();
      if (!bot) {
        return { success: false, error: "TELEGRAM_BOT_TOKEN no configurado" };
      }

      // URL donde Telegram enviará las actualizaciones
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL}/api/telegram/webhook`;

      try {
        // Configurar webhook en Telegram
        await bot.telegram.setWebhook(webhookUrl);

        // Verificar que se configuró correctamente
        const info = await bot.telegram.getWebhookInfo();

        return {
          success: true,
          message: "Webhook configurado correctamente",
          webhookUrl: info.url,
          pendingUpdates: info.pending_update_count
        };
      } catch (error: any) {
        console.error("[TELEGRAM] Error configurando webhook:", error);
        return { success: false, error: error.message };
      }
    }
  )

  // ============================================
  // TELEGRAM - Eliminar Webhook (para debug/desarrollo)
  // ============================================
  .delete(
    "/telegram/webhook",
    async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) throw new Error("Unauthorized");

      const bot = getBot();
      if (!bot) {
        return { success: false, error: "TELEGRAM_BOT_TOKEN no configurado" };
      }

      try {
        await bot.telegram.deleteWebhook();
        return { success: true, message: "Webhook eliminado" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  )

  // ============================================
  // TELEGRAM - Info del Webhook (para debug)
  // ============================================
  .get(
    "/telegram/webhook-info",
    async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) throw new Error("Unauthorized");

      const bot = getBot();
      if (!bot) {
        return { success: false, error: "TELEGRAM_BOT_TOKEN no configurado" };
      }

      try {
        const info = await bot.telegram.getWebhookInfo();
        return {
          success: true,
          url: info.url,
          hasCustomCertificate: info.has_custom_certificate,
          pendingUpdateCount: info.pending_update_count,
          lastErrorDate: info.last_error_date,
          lastErrorMessage: info.last_error_message,
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  )

  // ============================================
  // CHART DATA - Solicitar datos de gráfico (Frontend -> EA)
  // ============================================
  .post(
    "/accounts/:id/request-chart",
    async ({ params, body, request }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { id: params.id },
      });

      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }

      await verifySession(request.headers, account.userId);

      // Generar request ID único
      const requestId = crypto.randomUUID();

      // Añadir comando a la cola del EA
      const queue = commandQueue.get(params.id) || { commands: [] };
      queue.commands.push({
        id: crypto.randomUUID(),
        type: "request_chart_data",
        symbol: body.symbol,
        timeframe: body.timeframe,
        bars: body.bars || 200,
        requestId,
        createdAt: Date.now(),
      });
      commandQueue.set(params.id, queue);

      return { 
        success: true, 
        message: `Solicitud de datos OHLC enviada para ${body.symbol}`,
        requestId,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        symbol: t.String(),
        timeframe: t.Number(), // En minutos: 1, 5, 15, 60, 240, 1440
        bars: t.Optional(t.Number()),
      }),
    }
  )

  // ============================================
  // CHART DATA - EA envía datos OHLC
  // ============================================
  .post(
    "/ea/chart-data",
    async ({ body }) => {
      // Validar token
      const account = await prisma.tradingAccount.findUnique({
        where: { connectionToken: body.token },
      });

      if (!account) {
        return { success: false, error: "Token inválido" };
      }

      // Clave de caché: accountId:symbol:timeframe
      const cacheKey = `${account.id}:${body.symbol}:${body.timeframe}`;

      // Guardar en caché
      chartDataCache.set(cacheKey, {
        data: {
          symbol: body.symbol,
          timeframe: body.timeframe,
          bars: body.bars,
        },
        timestamp: Date.now(),
      });

      console.log(`[CHART] Cached ${body.bars.length} bars for ${body.symbol} TF=${body.timeframe}`);

      return { 
        success: true, 
        message: `Datos OHLC recibidos: ${body.symbol} (${body.bars.length} barras)`,
      };
    },
    {
      body: t.Object({
        msg_type: t.Optional(t.Literal("chart_data")),
        token: t.String(),
        symbol: t.String(),
        timeframe: t.Number(),
        bars: t.Array(t.Object({
          time: t.Number(),
          open: t.Number(),
          high: t.Number(),
          low: t.Number(),
          close: t.Number(),
          volume: t.Optional(t.Number()),
        })),
        requestId: t.Optional(t.String()),
      }),
    }
  )

  // ============================================
  // CHART DATA - Frontend obtiene datos cacheados
  // ============================================
  .get(
    "/accounts/:id/chart-data/:symbol",
    async ({ params, query, request }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { id: params.id },
      });

      if (!account) {
        return { success: false, error: "Cuenta no encontrada", available: false, data: null };
      }

      await verifySession(request.headers, account.userId);

      const timeframe = parseInt(query.timeframe || "60");
      const cacheKey = `${params.id}:${params.symbol}:${timeframe}`;
      
      const cached = chartDataCache.get(cacheKey);

      // TTL: 5 min para TF <= H1, 30 min para D1
      const ttl = timeframe >= 1440 ? 30 * 60 * 1000 : 5 * 60 * 1000;
      const isValid = cached && (Date.now() - cached.timestamp < ttl);

      if (isValid && cached) {
        return {
          success: true,
          available: true,
          data: cached.data,
          timestamp: cached.timestamp,
        };
      }

      return {
        success: true,
        available: false,
        data: null,
        message: "Datos no disponibles. Solicita al EA con POST /accounts/:id/request-chart",
      };
    },
    {
      params: t.Object({
        id: t.String(),
        symbol: t.String(),
      }),
      query: t.Object({
        timeframe: t.Optional(t.String()),
      }),
    }
  )

  // ============================================
  // MODIFY TRADE - Modificar SL/TP de una posición
  // ============================================
  .post(
    "/accounts/:id/modify-trade",
    async ({ params, body, request }) => {
      const account = await prisma.tradingAccount.findUnique({
        where: { id: params.id },
      });

      if (!account) {
        return { success: false, error: "Cuenta no encontrada" };
      }

      await verifySession(request.headers, account.userId);

      // Añadir comando a la cola del EA
      const queue = commandQueue.get(params.id) || { commands: [] };
      queue.commands.push({
        id: crypto.randomUUID(),
        type: "modify_trade",
        ticket: body.ticket,
        sl: body.sl,
        tp: body.tp,
        createdAt: Date.now(),
      });
      commandQueue.set(params.id, queue);

      console.log(`[MODIFY] Trade #${body.ticket} - SL: ${body.sl}, TP: ${body.tp}`);

      return { 
        success: true, 
        message: `Comando de modificación enviado para ticket #${body.ticket}`,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        ticket: t.Number(),
        sl: t.Optional(t.Number()),
        tp: t.Optional(t.Number()),
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

