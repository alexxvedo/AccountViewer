# ============================================
# Dockerfile para AccountViewer
# Multi-stage build optimizado para Bun + Next.js
# ============================================

# ---------- Stage 1: Base ----------
FROM oven/bun:1.1 AS base
WORKDIR /app

# ---------- Stage 2: Dependencies ----------
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

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

# Crear usuario no-root
RUN adduser --system --uid 1001 nodejs
RUN mkdir .next && chown nodejs:bun .next

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodejs:bun /app/.next/standalone ./
COPY --from=builder --chown=nodejs:bun /app/.next/static ./.next/static
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nodejs

# Exponer puertos
EXPOSE 3000
EXPOSE 3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Script de inicio que ejecuta ambos servicios
CMD ["sh", "-c", "bun run server/websocket.ts & node server.js"]
