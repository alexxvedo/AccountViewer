"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Copy,
  Check,
  Loader2,
  X,
} from "lucide-react";

interface TradingAccount {
  id: string;
  accountNumber: number;
  broker: string;
  server: string;
  platform: string;
  nickname: string | null;
  isConnected: boolean;
  lastSeen: string | null;
  connectionToken: string;
  liveData: {
    balance: number;
    equity: number;
    lastUpdate: number;
  } | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    accountNumber: "",
    broker: "",
    server: "",
    platform: "MT5",
    nickname: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccounts();
      // Polling cada 5 segundos para mantener estado actualizado
      const interval = setInterval(fetchAccounts, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  const fetchAccounts = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/users/${session.user.id}/accounts-live`);
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular balance total de cuentas conectadas
  const totalBalance = accounts
    .filter(a => a.isConnected && a.liveData)
    .reduce((sum, a) => sum + (a.liveData?.balance || 0), 0);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setFormLoading(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          accountNumber: parseInt(formData.accountNumber),
          broker: formData.broker,
          server: formData.server,
          platform: formData.platform,
          nickname: formData.nickname || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          accountNumber: "",
          broker: "",
          server: "",
          platform: "MT5",
          nickname: "",
        });
        fetchAccounts();
      }
    } catch (error) {
      console.error("Error creating account:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">
            Gestiona y monitorea tus cuentas de trading
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Cuentas Totales</p>
                <p className="text-2xl font-bold text-white">
                  {accounts.length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Conectadas</p>
                <p className="text-2xl font-bold text-white">
                  {accounts.filter((a) => a.isConnected).length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Wifi className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Desconectadas</p>
                <p className="text-2xl font-bold text-white">
                  {accounts.filter((a) => !a.isConnected).length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-500/10">
                <WifiOff className="h-5 w-5 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Balance Total</p>
                <p className="text-2xl font-bold text-white">${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <DollarSign className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <Activity className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-white">
              No hay cuentas
            </h3>
            <p className="mt-2 text-center text-sm text-zinc-400">
              Añade tu primera cuenta de trading para comenzar
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Cuenta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/dashboard/accounts/${account.id}`}>
              <Card className="cursor-pointer border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:bg-zinc-800/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">
                      {account.nickname || `Cuenta ${account.accountNumber}`}
                    </CardTitle>
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        account.isConnected
                          ? "bg-green-500/10 text-green-400"
                          : "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {account.isConnected ? (
                        <Wifi className="h-3 w-3" />
                      ) : (
                        <WifiOff className="h-3 w-3" />
                      )}
                      {account.isConnected ? "Online" : "Offline"}
                    </div>
                  </div>
                  <CardDescription className="text-zinc-400">
                    {account.broker} • {account.platform}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Cuenta</span>
                      <span className="font-mono text-white">
                        {account.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Servidor</span>
                      <span className="text-white">{account.server}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-800/50 p-2">
                      <span className="text-xs text-zinc-400">Token</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          copyToken(account.connectionToken);
                        }}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        {copiedToken === account.connectionToken ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Nueva Cuenta</CardTitle>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CardDescription className="text-zinc-400">
                Añade los datos de tu cuenta de trading
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateAccount}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Nombre (opcional)</Label>
                  <Input
                    placeholder="Mi cuenta principal"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Número de Cuenta</Label>
                  <Input
                    type="number"
                    placeholder="12345678"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, accountNumber: e.target.value })
                    }
                    required
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Broker</Label>
                  <Input
                    placeholder="ICMarkets"
                    value={formData.broker}
                    onChange={(e) =>
                      setFormData({ ...formData, broker: e.target.value })
                    }
                    required
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Servidor</Label>
                  <Input
                    placeholder="ICMarkets-Demo"
                    value={formData.server}
                    onChange={(e) =>
                      setFormData({ ...formData, server: e.target.value })
                    }
                    required
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Plataforma</Label>
                  <select
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData({ ...formData, platform: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="MT4">MetaTrader 4</option>
                    <option value="MT5">MetaTrader 5</option>
                  </select>
                </div>
              </CardContent>
              <div className="flex gap-3 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                >
                  {formLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Crear"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
