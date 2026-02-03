"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GMonitorLogo } from "@/components/GMonitorLogo";

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

  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Columna Derecha: Visual / Arte */}
      <div className="relative hidden h-full flex-col bg-sidebar p-10 text-sidebar-foreground lg:flex border-r border-border">
        <div className="absolute inset-0 bg-sidebar" />
        <div className="relative z-20">
          <GMonitorLogo size={36} />
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el valor para continuar.&rdquo;
            </p>
            <footer className="text-sm">Winston Churchill</footer>
          </blockquote>
        </div>
      </div>
      
      {/* Columna Izquierda: Formulario */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Crear una cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tus datos para comenzar a operar profesionalmente
            </p>
          </div>

          <div className={cn("grid gap-6")}>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Tu nombre completo"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    autoCorrect="off"
                    disabled={loading}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="nombre@ejemplo.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2">
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
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2">
                   <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
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
                     className="bg-background"
                   />
                </div>
                
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md animate-in fade-in-50">
                    {error}
                  </div>
                )}

                <Button disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear Cuenta
                </Button>
              </div>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O regístrate con
                </span>
              </div>
            </div>
             <div className="grid grid-cols-2 gap-6">
                <Button variant="outline" disabled={loading}>
                   Github
                </Button>
                 <Button variant="outline" disabled={loading}>
                   Google
                </Button>
             </div>

            <p className="px-8 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="underline underline-offset-4 hover:text-primary"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
