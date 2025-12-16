# ============================================
# Dockerfile para AccountViewer
# Multi-stage build optimizado para Bun + Next.js
# ============================================

# ---------- Stage 1: Base ----------
FROM oven/bun:latest AS base
WORKDIR /app

# ---------- Stage 2: Dependencies ----------
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install


# ---------- Stage 3: Builder ----------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client
RUN bunx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# ---------- Stage 4: Runner ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Script de entrada
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Exponer puertos
EXPOSE 3000
EXPOSE 3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usar el script de entrada
ENTRYPOINT ["./docker-entrypoint.sh"]
