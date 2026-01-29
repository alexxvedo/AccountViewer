import { PrismaClient } from "../../generated/prisma";
import { Telegraf } from "telegraf";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("❌ Error: TELEGRAM_BOT_TOKEN no encontrado.");
}

console.log("🚀 Bot de AccountViewer iniciando...");

const prisma = new PrismaClient();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Handler para /start
bot.command("start", async (ctx) => {
    try {
        const text = ctx.message.text;
        const parts = text.split(" ");
        const token = parts.length > 1 ? parts[1] : null;

        console.log(`[BOT] Recibido /start de chat ${ctx.chat.id}, token: ${token || "ninguno"}`);

        if (!token) {
            return ctx.reply(
                "👋 ¡Hola! Bienvenido.\n\nPara conectar tu cuenta, ve a la web y pulsa en 'Conectar Telegram'."
            );
        }

        const user = await prisma.user.findUnique({
            where: { telegramConnectionToken: token }
        });

        if (!user) {
            console.log(`[BOT] Token inválido: ${token}`);
            return ctx.reply("⚠️ El enlace es inválido o ya ha sido utilizado.");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                telegramChatId: ctx.chat.id.toString(),
                telegramConnectionToken: null
            }
        });

        console.log(`[BOT] ✅ Usuario ${user.email} vinculado con chat ${ctx.chat.id}`);
        await ctx.reply(`✅ ¡Conexión exitosa!\n\nCuenta: ${user.email}\nYa puedes recibir notificaciones.`);

    } catch (error) {
        console.error("[BOT] Error en /start:", error);
        ctx.reply("❌ Hubo un error al procesar tu solicitud.");
    }
});

// Handler para cualquier otro mensaje
bot.on("message", (ctx) => {
    console.log(`[BOT] Mensaje recibido de chat ${ctx.chat.id}`);
});

// Función para iniciar el bot
async function startBot() {
    try {
        // Verificar conexión a Telegram
        const me = await bot.telegram.getMe();
        console.log(`✅ Conectado como @${me.username}`);

        // Iniciar polling (NO esperamos la promesa - se queda corriendo en background)
        console.log("🔄 Iniciando polling...");

        bot.launch({
            dropPendingUpdates: true,
            allowedUpdates: ["message"],
        }).catch(err => {
            console.error("❌ Error en polling:", err);
        });

        // Dar tiempo para que se inicie el polling
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("═══════════════════════════════════════════");
        console.log("🤖 BOT ACTIVO Y ESCUCHANDO MENSAJES");
        console.log(`📱 Envía /start a @${me.username} para probar`);
        console.log("═══════════════════════════════════════════");

    } catch (error) {
        console.error("❌ Error iniciando bot:", error);
        process.exit(1);
    }
}

// Graceful shutdown
process.once('SIGINT', () => {
    console.log("\n🛑 Cerrando bot...");
    bot.stop('SIGINT');
    prisma.$disconnect();
});

process.once('SIGTERM', () => {
    console.log("\n🛑 Cerrando bot...");
    bot.stop('SIGTERM');
    prisma.$disconnect();
});

// Iniciar
startBot();
