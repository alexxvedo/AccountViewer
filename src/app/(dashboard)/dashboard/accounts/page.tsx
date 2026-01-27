"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Mis Cuentas</h1>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Listado de Cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aquí aparecerá el listado completo de tus cuentas de trading vinculadas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
