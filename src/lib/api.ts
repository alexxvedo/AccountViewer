// ============================================
// Cliente Eden para type-safety con Elysia
// Trading Platform SaaS
// ============================================

import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...slugs]]/route";

// Cliente isomórfico: funciona tanto en servidor como en cliente
// - En servidor: llama directamente a Elysia sin pasar por HTTP
// - En cliente: llama a través de la red

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Browser: usa URL relativa
    return window.location.origin;
  }
  // Server: usa localhost
  return `http://localhost:${process.env.PORT || 3000}`;
};

// Crear el cliente treaty
export const api = treaty<App>(getBaseUrl()).api;

// Tipos exportados para uso en componentes
export type { App };

// Re-exportar modelos de Prismabox para use en frontend
export * from "@/generated/prismabox/TradingAccount";
export * from "@/generated/prismabox/TradeHistory";
export * from "@/generated/prismabox/EquitySnapshot";

