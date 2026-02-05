"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message || "Error al crear cuenta");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Monitoriza todas tus cuentas MT4/MT5",
    "Estadísticas y análisis en tiempo real",
    "Alertas personalizadas de trading",
    "Historial completo de operaciones",
    "Gestión de Expert Advisors",
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
              Empieza a monitorizar<br />tu trading hoy
            </h2>
            <p className="text-zinc-400 text-lg max-w-md">
              Crea tu cuenta gratuita y conecta tus plataformas de MetaTrader en minutos.
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-zinc-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-sm">{benefit}</span>
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
              Crear cuenta
            </h1>
            <p className="text-muted-foreground mt-2">
              Completa tus datos para empezar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                type="text"
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect="off"
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>

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
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                placeholder="Mínimo 8 caracteres"
                type="password"
                autoCapitalize="none"
                autoComplete="new-password"
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                placeholder="Repite tu contraseña"
                type="password"
                autoCapitalize="none"
                autoComplete="new-password"
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              Crear Cuenta
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
