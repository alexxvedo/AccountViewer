"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Ayuda</h1>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Soporte y Guías</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Documentación sobre como conectar el EA de MetaTrader 5 y guía de uso del dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}
