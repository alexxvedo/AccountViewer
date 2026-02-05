// ============================================
// Sistema de Rate Limiting en memoria
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Mapas separados para diferentes tipos de rate limiting
const rateLimitMaps = {
  api: new Map<string, RateLimitEntry>(),      // Límite general por usuario
  login: new Map<string, RateLimitEntry>(),    // Límite de login por IP
  ea: new Map<string, RateLimitEntry>(),       // Límite EA por token
};

// Configuración de límites
const RATE_LIMITS = {
  api: { max: 100, windowMs: 60000 },      // 100 requests/minuto por usuario
  login: { max: 5, windowMs: 60000 },      // 5 intentos/minuto por IP
  ea: { max: 1200, windowMs: 60000 },      // 1200 requests/minuto por token EA (20/s para real-time)
};

/**
 * Verifica rate limit y retorna si está permitido
 */
export function checkRateLimit(
  type: keyof typeof RATE_LIMITS,
  identifier: string
): { allowed: boolean; remaining: number; resetIn: number } {
  const map = rateLimitMaps[type];
  const config = RATE_LIMITS[type];
  const now = Date.now();

  let entry = map.get(identifier);

  // Si no existe o expiró, crear nueva entrada
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + config.windowMs };
    map.set(identifier, entry);
    return { allowed: true, remaining: config.max - 1, resetIn: config.windowMs };
  }

  // Incrementar contador
  entry.count++;

  if (entry.count > config.max) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: entry.resetAt - now 
    };
  }

  return { 
    allowed: true, 
    remaining: config.max - entry.count, 
    resetIn: entry.resetAt - now 
  };
}

/**
 * Obtiene el IP del request (considera proxies)
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// Limpieza periódica de entradas expiradas (cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const map of Object.values(rateLimitMaps)) {
    for (const [key, entry] of map.entries()) {
      if (now >= entry.resetAt) {
        map.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);
