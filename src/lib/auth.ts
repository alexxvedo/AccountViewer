import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// Rate limiting para login (brute force protection)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60 * 1000; // 1 minuto

/**
 * Verifica rate limit para login
 * Retorna true si está permitido, false si está bloqueado
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; waitSeconds: number } {
  const now = Date.now();
  let entry = loginAttempts.get(ip);

  // Limpiar si expiró
  if (entry && now >= entry.resetAt) {
    loginAttempts.delete(ip);
    entry = undefined;
  }

  if (entry && entry.count >= MAX_LOGIN_ATTEMPTS) {
    const waitTime = Math.ceil((entry.resetAt - now) / 1000);
    console.log(`[AUTH] Brute force blocked: IP ${ip}, wait ${waitTime}s`);
    return { allowed: false, waitSeconds: waitTime };
  }

  // Incrementar contador
  if (!entry) {
    entry = { count: 1, resetAt: now + LOGIN_WINDOW_MS };
  } else {
    entry.count++;
  }
  loginAttempts.set(ip, entry);

  return { allowed: true, waitSeconds: 0 };
}

/**
 * Limpia los intentos de login para una IP (llamar en login exitoso)
 */
export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    // Requisitos de contraseña más estrictos
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Implementar envío real de email con servicio como Resend, SendGrid, etc.
      console.log(`[AUTH] Password reset for ${user.email}: ${url}`);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // Verificación de email
  emailVerification: {
    sendOnSignUp: process.env.NODE_ENV === "production",
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: Implementar envío real de email con servicio como Resend, SendGrid, etc.
      console.log(`[AUTH] Verification email for ${user.email}: ${url}`);
      // En producción, usa un servicio de email real:
      // await resend.emails.send({
      //   from: "noreply@tudominio.com",
      //   to: user.email,
      //   subject: "Verifica tu cuenta",
      //   html: `<a href="${url}">Click aquí para verificar</a>`
      // });
    },
  },
  // Configuración de seguridad adicional
  trustedOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
});
