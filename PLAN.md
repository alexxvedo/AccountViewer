Rol: Actúa como un Arquitecto de Software Senior experto en Trading Algorítmico (MQL4/5) y Desarrollo Web Moderno.

Objetivo del Proyecto: Crear una plataforma web SaaS que permita a los usuarios monitorear sus cuentas de trading (MetaTrader 4 y 5) en tiempo real.

Stack Tecnológico:

Frontend: Next.js (App Router), TailwindCSS, Shadcn/UI (para componentes), Recharts (para gráficos).

Auth: Better Auth

Backend: ElysiaJS (corriendo sobre Bun) para máxima velocidad y manejo de WebSockets.

Base de Datos: MySQL (gestionado preferiblemente con Prisma ORM o Drizzle).

Cliente Trading: Expert Advisor (EA) escrito en MQL4/5.

Arquitectura del Flujo de Datos:

El usuario se registra en la web y genera un "Connection Token" único.

El usuario instala el EA en su MT4/MT5 e introduce ese Token en los inputs del EA.

El EA se conecta vía WebSocket al Backend (Elysia).

El Backend autentica el Token y establece un canal bidireccional.

El Frontend se conecta al Backend y se suscribe a los datos de ese Token para visualizar el dashboard.

Requerimientos Específicos y Reglas de Oro:

Manejo de Eventos MQL (CRÍTICO): No usar OnTick para enviar datos directamente. El EA debe usar OnTimer (ej. cada 500ms o 1s) para verificar cambios en el estado (balance, equidad, num_ordenes). Solo si hay cambios significativos (o un evento de trade), se envía el paquete JSON. Si no hay cambios, enviar un "ping" ligero cada 10s.

Base de Datos:

Guardar usuarios y credenciales.

Guardar historial de trades cerrados (no guardar cada movimiento de tick en la DB, eso solo va a memoria/cache para el live view).

Guardar snapshots de equidad cada hora para gráficos históricos.

Protocolo: Definir una estructura JSON eficiente para comunicar MT4 -> Elysia.

Entregables Solicitados:

Esquema de Base de Datos (Prisma Schema): Tablas para User, Account (con token de conexión), TradeHistory y EquitySnapshot.

Estructura del Backend (Elysia):

Configuración básica del servidor WebSocket.

Lógica para manejar la autenticación del EA mediante el Token.

Lógica para reenviar (broadcast) los datos del EA al Frontend del usuario propietario.

Estructura del JSON (Payload): Ejemplo del JSON que el EA debe enviar al backend (incluyendo campos como: msg_type, account_id, balance, equity, open_positions[]).

Lógica del EA (Pseudocódigo avanzado MQL):

Estructura de OnInit (conexión), OnDeinit y OnTimer.

Función de detección de cambios (comparar snapshot actual vs anterior) para decidir si enviar datos al socket.