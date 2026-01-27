"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Ajustes</h1>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Configuración de la Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Desde aquí podrás gestionar tu perfil, suscripción y preferencias de la aplicación.</p>
        </CardContent>
      </Card>
    </div>
  );
}
