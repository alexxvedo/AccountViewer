"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  Check,
  Globe,
  Monitor,
  Cpu,
  Zap,
  Shield,
  RefreshCw,
  ChevronRight,
  FileCode2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DownloadsPage() {
  const [copied, setCopied] = useState(false);
  const [domain, setDomain] = useState("https://...");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDomain(window.location.origin);
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    { icon: Zap, label: "Sincronización instantánea", description: "Datos en tiempo real" },
    { icon: Shield, label: "Conexión segura", description: "Cifrado SSL/TLS" },
    { icon: RefreshCw, label: "Auto-reconexión", description: "Recuperación automática" },
    { icon: Cpu, label: "Bajo consumo", description: "Optimizado para VPS" },
  ];

  const steps = [
    {
      number: "01",
      title: "Descarga el EA",
      description: "Elige la versión para tu plataforma (MT4 o MT5) y descarga el archivo.",
    },
    {
      number: "02",
      title: "Instala en MetaTrader",
      description: "Copia el archivo a la carpeta MQL4/Experts o MQL5/Experts de tu terminal.",
    },
    {
      number: "03",
      title: "Configura WebRequest",
      description: "Añade la URL del dashboard a la lista de URLs permitidas en las opciones.",
    },
    {
      number: "04",
      title: "Activa el EA",
      description: "Arrastra el EA a un gráfico, introduce tu token y habilita AutoTrading.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative -mx-3 md:-mx-6 -mt-3 md:-mt-6 px-6 md:px-12 pt-12 pb-16 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent">
        <div className="max-w-4xl">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <FileCode2 className="h-3.5 w-3.5" />
            Expert Advisors
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Conecta tu MetaTrader
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Descarga e instala el Expert Advisor para sincronizar tus cuentas de trading
            con el dashboard en tiempo real.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 max-w-4xl">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="flex items-start gap-3 p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/50"
            >
              <div className="p-2 rounded-xl bg-primary/10">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download Cards */}
      <div className="py-12 space-y-8">
        <h2 className="text-2xl font-bold">Descargar Expert Advisor</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* MT5 Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-card/50 p-6 transition-all hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <Monitor className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">MetaTrader 5</h3>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">
                Versión completa con todas las funcionalidades avanzadas.
                Sincronización instantánea y soporte para todas las características del dashboard.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {["Tiempo real", "Magic Numbers", "Auto-sync", "Bajo consumo"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>

              <Button
                asChild
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              >
                <a href="/downloads/AccountViewer.ex5" download>
                  <Download className="mr-2 h-5 w-5" />
                  Descargar para MT5
                </a>
              </Button>
            </div>
          </div>

          {/* MT4 Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-card/50 p-6 transition-all hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <Cpu className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">MetaTrader 4</h3>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">
                Versión completa para la plataforma MT4.
                Mismas funcionalidades que la versión de MT5.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {["Tiempo real", "Magic Numbers", "Auto-sync", "Bajo consumo"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    {item}
                  </div>
                ))}
              </div>

              <Button
                asChild
                variant="outline"
                className="w-full h-12 text-base border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50"
              >
                <a href="/downloads/AccountViewer.ex4" download>
                  <Download className="mr-2 h-5 w-5" />
                  Descargar para MT4
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* URL Configuration */}
      <div className="py-8">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/0 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <Globe className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">
                Configuración Obligatoria
              </h3>
              <p className="text-muted-foreground mb-4">
                Añade esta URL a la lista de WebRequest permitidas en MetaTrader:
                <span className="block text-sm mt-1">
                  Herramientas → Opciones → Asesores Expertos → Permitir WebRequest para las URL listadas
                </span>
              </p>

              <div className="flex items-center gap-2 p-3 bg-background/80 backdrop-blur border border-border rounded-xl">
                <code className="flex-1 font-mono text-sm truncate">https://gmonitor.app</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "shrink-0 gap-2",
                    copied && "text-emerald-500 hover:text-emerald-600"
                  )}
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Guía de Instalación</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="group relative p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">
                  {step.number}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground/30 absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block" />
                )}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
