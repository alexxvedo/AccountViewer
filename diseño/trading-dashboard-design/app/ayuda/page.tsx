"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Search,
  BookOpen,
  Video,
  MessageCircle,
  Mail,
  ExternalLink,
  FileText,
  HelpCircle,
  Zap,
  Shield,
  DollarSign,
  BarChart3,
  Users,
  Settings,
} from "lucide-react"

const categories = [
  {
    icon: Zap,
    title: "Primeros Pasos",
    description: "Aprende a usar el dashboard",
    articles: 8,
    color: "bg-accent/20 text-accent",
  },
  {
    icon: DollarSign,
    title: "Cuentas & Trading",
    description: "Gestión de cuentas de trading",
    articles: 12,
    color: "bg-profit/20 text-profit",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reportes",
    description: "Análisis y exportación de datos",
    articles: 10,
    color: "bg-chart-3/20 text-chart-3",
  },
  {
    icon: Shield,
    title: "Seguridad & Privacidad",
    description: "Protección de tu cuenta",
    articles: 6,
    color: "bg-warning/20 text-warning",
  },
  {
    icon: Users,
    title: "Equipos & Colaboración",
    description: "Trabaja con otros traders",
    articles: 5,
    color: "bg-chart-5/20 text-chart-5",
  },
  {
    icon: Settings,
    title: "Configuración",
    description: "Personaliza tu experiencia",
    articles: 7,
    color: "bg-loss/20 text-loss",
  },
]

const faqs = [
  {
    question: "¿Cómo conecto mi cuenta de MetaTrader?",
    answer: "Para conectar tu cuenta de MetaTrader, ve a Ajustes > Integraciones > Conexiones de Broker. Haz clic en 'Conectar' junto a MetaTrader 4 o 5, e ingresa tus credenciales de cuenta (número de cuenta, contraseña de inversor, y servidor). La conexión se establecerá automáticamente y comenzarás a ver tus trades sincronizados.",
  },
  {
    question: "¿Qué prop firms son compatibles?",
    answer: "TradingHub es compatible con las principales prop firms del mercado, incluyendo FTMO, The5ers, MyForexFunds, E8 Funding, Funded Next, True Forex Funds, y muchas más. Puedes agregar cualquier cuenta que use MetaTrader 4/5 o cTrader como plataforma de trading.",
  },
  {
    question: "¿Cómo se calculan las estadísticas de drawdown?",
    answer: "El drawdown se calcula como la caída porcentual desde el punto más alto de equity hasta el punto más bajo antes de alcanzar un nuevo máximo. Calculamos tanto el drawdown absoluto (desde el balance inicial) como el drawdown relativo (desde el punto más alto alcanzado). El drawdown diario se resetea cada día a las 00:00 UTC.",
  },
  {
    question: "¿Puedo exportar mis datos?",
    answer: "Sí, puedes exportar todos tus datos en múltiples formatos. Ve a Reportes y selecciona el tipo de reporte que necesitas. Ofrecemos exportación en PDF, Excel (XLSX) y CSV. También puedes programar reportes automáticos que se envían a tu email semanalmente o mensualmente.",
  },
  {
    question: "¿Cómo funciona el profit split en las prop firms?",
    answer: "El profit split varía según cada prop firm. Generalmente oscila entre 50% y 90% a favor del trader. En TradingHub mostramos el profit split de cada cuenta y calculamos automáticamente cuánto corresponde a tu parte de las ganancias. Puedes ver estos detalles en la sección de cada cuenta.",
  },
  {
    question: "¿Los datos son en tiempo real?",
    answer: "Sí, los datos se sincronizan en tiempo real con tu broker. Las actualizaciones de trades, balance y equity se reflejan en segundos. Sin embargo, algunas estadísticas agregadas como el win rate o profit factor se recalculan cada minuto para optimizar el rendimiento.",
  },
  {
    question: "¿Cómo contacto a soporte?",
    answer: "Puedes contactar a nuestro equipo de soporte a través del chat en vivo disponible 24/7, enviando un email a soporte@tradinghub.com, o abriendo un ticket desde esta sección de ayuda. Nuestro tiempo de respuesta promedio es de menos de 2 horas.",
  },
  {
    question: "¿Es seguro conectar mis cuentas de trading?",
    answer: "Absolutamente. Utilizamos conexiones de solo lectura (read-only) a través de la contraseña de inversor, lo que significa que no tenemos capacidad de ejecutar trades ni acceder a tu capital. Todos los datos se transmiten con encriptación de grado bancario (AES-256) y almacenamos la información en servidores seguros con certificación SOC 2.",
  },
]

const resources = [
  { icon: BookOpen, title: "Documentación", description: "Guías completas y tutoriales", link: "#" },
  { icon: Video, title: "Video Tutoriales", description: "Aprende con videos paso a paso", link: "#" },
  { icon: FileText, title: "Blog", description: "Artículos y consejos de trading", link: "#" },
  { icon: MessageCircle, title: "Comunidad", description: "Únete a otros traders", link: "#" },
]

export default function AyudaPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {/* Hero Section */}
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-accent/20 to-chart-3/20 p-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-2 text-3xl font-bold text-foreground">Centro de Ayuda</h1>
              <p className="mb-6 text-muted-foreground">
                Encuentra respuestas a tus preguntas o contacta a nuestro equipo de soporte
              </p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar artículos, tutoriales, preguntas frecuentes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 bg-background border-border text-base"
                />
              </div>
            </div>
          </div>

          {/* Quick Resources */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {resources.map((resource) => (
              <Card key={resource.title} className="border-border bg-card transition-colors hover:border-accent/50 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent/20 p-2">
                      <resource.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{resource.title}</p>
                      <p className="text-xs text-muted-foreground">{resource.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">Categorías</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {categories.map((category) => (
                <Card key={category.title} className="border-border bg-card cursor-pointer transition-all hover:border-accent/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${category.color}`}>
                        <category.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{category.title}</h3>
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {category.articles} artículos
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">Preguntas Frecuentes</h2>
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border-border px-6">
                      <AccordionTrigger className="text-left font-medium text-foreground hover:text-accent hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Contact Support */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>¿No encuentras lo que buscas?</CardTitle>
              <CardDescription>Nuestro equipo de soporte está disponible 24/7 para ayudarte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-4 rounded-lg bg-secondary/50 p-4">
                  <div className="rounded-lg bg-accent/20 p-3">
                    <MessageCircle className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Chat en Vivo</p>
                    <p className="text-sm text-muted-foreground">Respuesta inmediata</p>
                  </div>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Iniciar Chat
                  </Button>
                </div>

                <div className="flex items-center gap-4 rounded-lg bg-secondary/50 p-4">
                  <div className="rounded-lg bg-chart-3/20 p-3">
                    <Mail className="h-6 w-6 text-chart-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">soporte@tradinghub.com</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-border bg-transparent">
                    Enviar Email
                  </Button>
                </div>

                <div className="flex items-center gap-4 rounded-lg bg-secondary/50 p-4">
                  <div className="rounded-lg bg-warning/20 p-3">
                    <HelpCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Ticket de Soporte</p>
                    <p className="text-sm text-muted-foreground">Seguimiento detallado</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-border bg-transparent">
                    Crear Ticket
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
