"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Link2,
  Smartphone,
  Mail,
  Key,
  Save,
  Camera,
} from "lucide-react"

export default function AjustesPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    trades: true,
    reports: false,
    marketing: false,
  })

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
            <p className="text-sm text-muted-foreground">
              Configura tu cuenta y preferencias
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-secondary p-1">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                Apariencia
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2">
                <Link2 className="h-4 w-4" />
                Integraciones
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>Actualiza tu información de perfil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-accent/20 text-accent text-xl font-semibold">
                        JD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" className="border-border bg-transparent">
                        <Camera className="mr-2 h-4 w-4" />
                        Cambiar Foto
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">
                        JPG, PNG o GIF. Máximo 5MB.
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Form */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input id="firstName" defaultValue="John" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input id="lastName" defaultValue="Doe" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john@example.com" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" defaultValue="+1 234 567 890" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input id="bio" defaultValue="Prop Trader | FTMO Funded | Forex & Indices" className="bg-secondary border-border" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Trading Preferences */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Preferencias de Trading</CardTitle>
                  <CardDescription>Configura tus preferencias de visualización</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Moneda Principal</Label>
                      <Select defaultValue="usd">
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usd">USD - Dólar</SelectItem>
                          <SelectItem value="eur">EUR - Euro</SelectItem>
                          <SelectItem value="gbp">GBP - Libra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Zona Horaria</Label>
                      <Select defaultValue="utc-5">
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc-8">UTC-8 (Pacific)</SelectItem>
                          <SelectItem value="utc-5">UTC-5 (Eastern)</SelectItem>
                          <SelectItem value="utc">UTC (London)</SelectItem>
                          <SelectItem value="utc+1">UTC+1 (Central Europe)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Formato de Fecha</Label>
                      <Select defaultValue="dd-mm-yyyy">
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Idioma</Label>
                      <Select defaultValue="es">
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="pt">Português</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Preferencias de Notificaciones</CardTitle>
                  <CardDescription>Elige cómo quieres recibir notificaciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/20 p-2">
                          <Mail className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Notificaciones por Email</p>
                          <p className="text-sm text-muted-foreground">Recibe actualizaciones en tu correo</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-chart-3/20 p-2">
                          <Smartphone className="h-4 w-4 text-chart-3" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Notificaciones Push</p>
                          <p className="text-sm text-muted-foreground">Recibe alertas en tiempo real</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                      />
                    </div>

                    <Separator className="bg-border" />

                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                      <div>
                        <p className="font-medium text-foreground">Alertas de Trades</p>
                        <p className="text-sm text-muted-foreground">Notificaciones de trades ejecutados</p>
                      </div>
                      <Switch
                        checked={notifications.trades}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, trades: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                      <div>
                        <p className="font-medium text-foreground">Reportes Semanales</p>
                        <p className="text-sm text-muted-foreground">Resumen semanal de rendimiento</p>
                      </div>
                      <Switch
                        checked={notifications.reports}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, reports: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                      <div>
                        <p className="font-medium text-foreground">Comunicaciones de Marketing</p>
                        <p className="text-sm text-muted-foreground">Ofertas y novedades</p>
                      </div>
                      <Switch
                        checked={notifications.marketing}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Cambiar Contraseña</CardTitle>
                  <CardDescription>Asegúrate de usar una contraseña segura</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input id="currentPassword" type="password" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <Input id="confirmPassword" type="password" className="bg-secondary border-border" />
                  </div>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Key className="mr-2 h-4 w-4" />
                    Actualizar Contraseña
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Autenticación de Dos Factores</CardTitle>
                  <CardDescription>Añade una capa extra de seguridad a tu cuenta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-profit/20 p-2">
                        <Shield className="h-4 w-4 text-profit" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">2FA Habilitado</p>
                        <p className="text-sm text-muted-foreground">Tu cuenta está protegida</p>
                      </div>
                    </div>
                    <Button variant="outline" className="border-border bg-transparent">
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card border-loss/30">
                <CardHeader>
                  <CardTitle className="text-loss">Zona de Peligro</CardTitle>
                  <CardDescription>Acciones irreversibles de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg bg-loss/10 p-4">
                    <div>
                      <p className="font-medium text-foreground">Eliminar Cuenta</p>
                      <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
                    </div>
                    <Button variant="destructive">
                      Eliminar Cuenta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Tema</CardTitle>
                  <CardDescription>Personaliza la apariencia del dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-accent bg-secondary p-4">
                      <div className="h-16 w-full rounded-md bg-[#0a0a14]" />
                      <span className="text-sm font-medium text-foreground">Oscuro</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary p-4 opacity-50">
                      <div className="h-16 w-full rounded-md bg-white" />
                      <span className="text-sm font-medium text-foreground">Claro</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary p-4 opacity-50">
                      <div className="h-16 w-full rounded-md bg-gradient-to-b from-white to-[#0a0a14]" />
                      <span className="text-sm font-medium text-foreground">Sistema</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Color de Acento</CardTitle>
                  <CardDescription>Elige tu color principal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <button className="h-10 w-10 rounded-full bg-[#10b981] ring-2 ring-offset-2 ring-offset-background ring-[#10b981]" />
                    <button className="h-10 w-10 rounded-full bg-[#3b82f6]" />
                    <button className="h-10 w-10 rounded-full bg-[#8b5cf6]" />
                    <button className="h-10 w-10 rounded-full bg-[#f59e0b]" />
                    <button className="h-10 w-10 rounded-full bg-[#ef4444]" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Conexiones de Broker</CardTitle>
                  <CardDescription>Conecta tus cuentas de broker</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "MetaTrader 4", status: "connected", accounts: 3 },
                    { name: "MetaTrader 5", status: "connected", accounts: 2 },
                    { name: "cTrader", status: "disconnected", accounts: 0 },
                  ].map((broker) => (
                    <div key={broker.name} className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
                          {broker.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{broker.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {broker.status === "connected" ? `${broker.accounts} cuentas conectadas` : "No conectado"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={broker.status === "connected" ? "outline" : "default"}
                        className={broker.status === "connected" ? "border-border" : "bg-accent text-accent-foreground"}
                      >
                        {broker.status === "connected" ? "Gestionar" : "Conectar"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>APIs y Webhooks</CardTitle>
                  <CardDescription>Configura integraciones avanzadas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        defaultValue="sk_live_*****************************"
                        readOnly
                        className="bg-secondary border-border font-mono text-sm"
                      />
                      <Button variant="outline" className="border-border bg-transparent">
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://your-webhook-url.com/endpoint"
                        className="bg-secondary border-border"
                      />
                      <Button variant="outline" className="border-border bg-transparent">
                        Guardar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
