// ============================================
// Sistema de Logs de Auditoría
// ============================================

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "SIGNUP"
  | "LOGIN_FAILED"
  | "ACCOUNT_CREATE"
  | "ACCOUNT_UPDATE"
  | "ACCOUNT_DELETE"
  | "SECTION_CREATE"
  | "SECTION_UPDATE"
  | "SECTION_DELETE"
  | "TOKEN_REGENERATE"
  | "TRADE_CLOSE"
  | "TRADE_CLOSE_ALL"
  | "SYNC_HISTORY"
  | "RATE_LIMIT_EXCEEDED";

interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  userId?: string;
  ip?: string;
  details?: Record<string, unknown>;
}

/**
 * Registra una acción de auditoría
 * En producción, esto debería ir a una BD o servicio de logging
 */
export function auditLog(
  action: AuditAction,
  options: {
    userId?: string;
    ip?: string;
    details?: Record<string, unknown>;
  } = {}
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    ...options,
  };

  // En desarrollo, log a consola con formato estructurado
  // En producción, esto debería ir a un servicio de logging real
  console.log(
    `[AUDIT] ${entry.timestamp} | ${entry.action} | User: ${entry.userId || "N/A"} | IP: ${entry.ip || "N/A"}`,
    entry.details ? `| Details: ${JSON.stringify(entry.details)}` : ""
  );

  // TODO: En producción, guardar en BD o enviar a servicio de logging
  // await prisma.auditLog.create({ data: entry });
}

/**
 * Helper para obtener el userId desde la sesión
 */
export async function auditLogWithSession(
  action: AuditAction,
  request: Request,
  details?: Record<string, unknown>
): Promise<void> {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";

  auditLog(action, { ip, details });
}
