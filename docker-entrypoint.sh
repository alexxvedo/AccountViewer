#!/bin/sh
set -e

echo "🚀 Starting AccountViewer..."

# Esperar a que la base de datos esté disponible
echo "⏳ Waiting for database..."
sleep 3

# Ejecutar migraciones de Prisma
echo "📦 Running database migrations..."
bunx prisma db push --skip-generate

# Iniciar Next.js con bun
echo "🌐 Starting Next.js on port ${PORT:-3000}..."
exec bun server.js