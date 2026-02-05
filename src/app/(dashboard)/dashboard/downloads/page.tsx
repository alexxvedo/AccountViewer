"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileCode, 
  Copy, 
  Check, 
  FolderOpen, 
  Settings, 
  Globe, 
  Monitor, 
  ArrowRight,
  ShieldAlert,
  Terminal
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

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
             Centro de Descargas
           </h1>
           <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
             Obtén las herramientas necesarias para conectar tus plataformas de trading con el dashboard en tiempo real.
           </p>
        </div>
      </div>

      {/* Main Downloads Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* MT5 Card */}
        <Card className="border-border bg-linear-to-br from-card to-secondary/10 overflow-hidden relative group hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Monitor className="w-32 h-32" />
          </div>
          <CardHeader className="relative">
            <div className="flex items-center gap-2 mb-2">
                 <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Recomendado</Badge>
            </div>
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="p-2 bg-background rounded-lg shadow-sm border border-border">
                <FileCode className="h-6 w-6 text-green-500" />
              </div>
              MetaTrader 5 EA
            </CardTitle>
            <CardDescription className="text-base">
              Monitorización completa de posiciones, historial y estadísticas avanzadas para MT5.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
             <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> Sincronización 1ms
                </div>
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> Bajo consumo
                </div>
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> Auto-reconexión
                </div>
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> Encriptación SSL
                </div>
             </div>
          </CardContent>
          <CardFooter className="relative pt-2">
             <Button asChild className="w-full h-11 text-base bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-900/20">
              <a href="/downloads/AccountViewer.mq5" download>
                <Download className="mr-2 h-5 w-5" />
                Descargar AccountViewer.mq5
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* MT4 Card */}
        <Card className="border-border bg-linear-to-br from-card to-secondary/10 overflow-hidden relative group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Terminal className="w-32 h-32" />
          </div>
          <CardHeader className="relative">
             <div className="flex items-center gap-2 mb-2">
                 <Badge variant="secondary" className="text-muted-foreground">Legacy</Badge>
            </div>
            <CardTitle className="text-2xl flex items-center gap-3">
               <div className="p-2 bg-background rounded-lg shadow-sm border border-border">
                <FileCode className="h-6 w-6 text-blue-500" />
              </div>
              MetaTrader 4 EA
            </CardTitle>
            <CardDescription className="text-base">
              Versión compatible para la plataforma clásica MT4. Funcionalidades esenciales.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
               <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500" /> Sincronización Básica
                </div>
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-500" /> Ligero
                </div>
             </div>
          </CardContent>
           <CardFooter className="relative pt-2">
            <Button asChild variant="outline" className="w-full h-11 text-base border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-500">
              <a href="/downloads/AccountViewer.mq4" download>
                <Download className="mr-2 h-5 w-5" />
                Descargar AccountViewer.mq4
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Installation Guide */}
      <div className="space-y-6">
         <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Guía de Instalación Rápida
         </h2>
         
         <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <Card className="border-border bg-card/50">
               <CardHeader>
                   <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">1</div>
                   <CardTitle className="text-lg">Instalar Archivo</CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-muted-foreground space-y-2">
                   <p>Abre MetaTrader y ve a:</p>
                   <code className="bg-secondary px-2 py-1 rounded block text-xs">Archivo &gt; Abrir Carpeta de Datos</code>
                   <p>Navega a <span className="font-semibold text-foreground">MQL5/Experts</span> y pega el archivo descargado.</p>
               </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="border-border bg-card/50">
               <CardHeader>
                   <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">2</div>
                   <CardTitle className="text-lg">Configurar WebRequest</CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-muted-foreground space-y-2">
                   <p>En MetaTrader, ve a:</p>
                   <code className="bg-secondary px-2 py-1 rounded block text-xs">Herramientas &gt; Opciones &gt; Asesores Expertos</code>
                   <p>Activa <span className="text-foreground">"Permitir WebRequest"</span> y añade la URL del dashboard.</p>
               </CardContent>
            </Card>

             {/* Step 3 */}
            <Card className="border-border bg-card/50">
               <CardHeader>
                   <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">3</div>
                   <CardTitle className="text-lg">Iniciar EA</CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-muted-foreground space-y-2">
                   <p>Actualiza la lista de Asesores en el panel Navegador.</p>
                   <p>Arrastra <span className="font-semibold text-foreground">AccountViewer</span> al gráfico y asegúrate de marcar "Permitir Algo Trading".</p>
               </CardContent>
            </Card>
         </div>
      </div>

      {/* WebRequest URL Config */}
      <Card className="border-orange-500/30 bg-orange-500/5 shadow-sm">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <ShieldAlert className="h-5 w-5" />
                  Configuración Crítica
              </CardTitle>
              <CardDescription>
                  Para que el EA funcione, es <strong>obligatorio</strong> añadir la siguiente URL a la lista de WebRequest permitidas en MetaTrader.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg shadow-inner">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1 font-mono text-sm overflow-x-auto whitespace-nowrap">
                      {domain}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={cn("shrink-0 gap-2", copied && "text-green-500 hover:text-green-600")}
                    onClick={copyToClipboard}
                  >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado" : "Copiar"}
                  </Button>
              </div>
          </CardContent>
      </Card>

    </div>
  );
}
