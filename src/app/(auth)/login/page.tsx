"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, BarChart3, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Credenciales incorrectas");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, text: "Monitorización en tiempo real" },
    { icon: BarChart3, text: "Estadísticas avanzadas" },
    { icon: Shield, text: "Gestión de riesgo" },
    { icon: Zap, text: "Alertas instantáneas" },
  ];

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">GMonitor</span>
          </div>
          <p className="text-zinc-400 text-sm">Trading Dashboard</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Gestiona tus cuentas<br />de trading como un profesional
            </h2>
            <p className="text-zinc-400 text-lg max-w-md">
              Monitoriza todas tus cuentas de MetaTrader en un solo lugar con datos en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3 text-zinc-300">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-zinc-500 text-sm">
            © 2026 GMonitor. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">GMonitor</span>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">
              Bienvenido de nuevo
            </h1>
            <p className="text-muted-foreground mt-2">
              Ingresa tus credenciales para acceder a tu dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="tu@email.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                autoCapitalize="none"
                autoComplete="current-password"
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl animate-in fade-in-50 slide-in-from-top-1">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sesión
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href="/signup"
              className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
