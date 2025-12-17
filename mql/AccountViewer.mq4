//+------------------------------------------------------------------+
//|                                              AccountViewer.mq4   |
//|                       Copyright 2024, TradingPlatform SaaS       |
//|                                                                  |
//| Expert Advisor para monitoreo de cuentas en tiempo real (MT4)    |
//| Usa HTTP nativo (WebRequest) - Sin librerías externas            |
//+------------------------------------------------------------------+
#property copyright "TradingPlatform SaaS"
#property link      ""
#property version   "1.00"
#property strict

//+------------------------------------------------------------------+
//| Parámetros de entrada del EA                                     |
//+------------------------------------------------------------------+
input string   InpConnectionToken = "";                      // Token de Conexión
input string   InpServerURL = "http://127.0.0.1:3000/api";   // URL del servidor API
input int      InpTimerInterval = 100;                       // Intervalo del timer (ms)
input int      InpUpdateInterval = 5;                        // Intervalo de actualización (segundos) - Fallback
input int      InpMinRequestInterval = 100;                  // Mínimo tiempo entre requests (ms)
input double   InpEquityThreshold = 0.0;                     // Umbral de cambio de equity ($)
input bool     InpLogEnabled = true;                         // Habilitar logs

//+------------------------------------------------------------------+
//| Variables globales                                                |
//+------------------------------------------------------------------+
// Estado anterior para detección de cambios
double g_lastBalance = 0;
double g_lastEquity = 0;
double g_lastMargin = 0;
int    g_lastOrdersCount = 0;
string g_lastOrdersHash = "";
datetime g_lastUpdateTime = 0;

// Control de Throttling
ulong g_lastRequestTime = 0;

// Tracking de tickets abiertos para detectar cierres
int g_openTickets[];
int g_openTicketsCount = 0;

// Contador de tiempo
int g_tickCounter = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // Validar token de conexión
   if(StringLen(InpConnectionToken) < 10)
   {
      Log("ERROR: Token de conexión inválido o vacío");
      Log("Por favor, introduce el token de conexión del dashboard");
      return INIT_FAILED;
   }
   
   Log("==============================================");
   Log("AccountViewer EA v1.10 (MT4 RT) iniciando...");
   Log("Token: " + StringSubstr(InpConnectionToken, 0, 8) + "...");
   Log("Server: " + InpServerURL);
   Log("Modo: Smart Tick (Instantáneo)");
   Log("==============================================");
   
   // IMPORTANTE: Añadir URL a la lista permitida
   Log("IMPORTANTE: Añade esta URL a Herramientas > Opciones > Expert Advisors:");
   Log("  " + InpServerURL);
   
   // Inicializar estado
   CaptureCurrentState();
   
   // Configurar timer (Backup y Heartbeat)
   if(!EventSetMillisecondTimer(InpTimerInterval))
   {
      Log("ERROR: No se pudo configurar el timer");
      return INIT_FAILED;
   }
   
   // Enviar update inicial
   SendUpdate();
   
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   // Detener timer
   EventKillTimer();
   Log("AccountViewer EA detenido. Razón: " + IntegerToString(reason));
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // 1. Detección instantánea de cambios (Precio/Equidad/Ordenes)
   if(HasSignificantChanges())
   {
      // Intentar enviar update si no estamos bloqueados por throttle
      if(GetTickCount() - g_lastRequestTime >= (ulong)InpMinRequestInterval)
      {
         SendUpdate();
         g_lastUpdateTime = TimeCurrent();
         g_tickCounter = 0;
      }
   }
   
   // 2. Polling de comandos "Casi Instantáneo" (cada 250ms aprox en ticks activos)
   static ulong lastCommandCheck = 0;
   if(GetTickCount() - lastCommandCheck >= 250)
   {
      if(GetTickCount() - g_lastRequestTime >= (ulong)InpMinRequestInterval)
      {
         CheckPendingCommands();
         lastCommandCheck = GetTickCount();
      }
   }
}

//+------------------------------------------------------------------+
//| Timer function - Fallback y Heartbeat                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Simular evento tick si el mercado está quieto para procesar comandos
   OnTick();

   // Heartbeat: updates periódicos incluso sin cambios
   g_tickCounter++;
   
   // Convertir ticks de timer a segundos aproximados
   int secondsElapsed = g_tickCounter * InpTimerInterval / 1000;
   
   if(secondsElapsed >= InpUpdateInterval)
   {
      if(GetTickCount() - g_lastRequestTime >= (ulong)InpMinRequestInterval)
      {
         SendUpdate();
         g_tickCounter = 0;
      }
   }
}

//+------------------------------------------------------------------+
//| Captura el estado actual de la cuenta                            |
//+------------------------------------------------------------------+
void CaptureCurrentState()
{
   g_lastBalance = AccountBalance();
   g_lastEquity = AccountEquity();
   g_lastMargin = AccountMargin();
   g_lastOrdersCount = CountOpenOrders();
   g_lastOrdersHash = GetOrdersHash();
   
   // Guardar tickets actuales
   SaveCurrentOpenTickets();
}

//+------------------------------------------------------------------+
//| Cuenta órdenes abiertas (solo trades, no pending)                |
//+------------------------------------------------------------------+
int CountOpenOrders()
{
   int count = 0;
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
            count++;
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Verifica si hay cambios significativos                           |
//+------------------------------------------------------------------+
bool HasSignificantChanges()
{
   double currentBalance = AccountBalance();
   double currentEquity = AccountEquity();
   int currentOrdersCount = CountOpenOrders();
   string currentHash = GetOrdersHash();
   
   // Verificar cambio en balance (trade cerrado)
   if(MathAbs(currentBalance - g_lastBalance) > 0.01)
   {
      // Log("Cambio: Balance"); 
      
      // Detectar y enviar trades cerrados ANTES de actualizar el estado
      CheckAndSendClosedTrades();
      
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio significativo en equity
   // Umbral 0.0 para detectar cualquier movimiento (Tick-by-Tick)
   if(MathAbs(currentEquity - g_lastEquity) > InpEquityThreshold)
   {
      // No loguear equity en cada tick
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio en número de órdenes
   if(currentOrdersCount != g_lastOrdersCount)
   {
      Log("Cambio: Órdenes " + IntegerToString(g_lastOrdersCount) + " -> " + IntegerToString(currentOrdersCount));
      
      // Si se redujo el número de órdenes, detectar y enviar trades cerrados
      if(currentOrdersCount < g_lastOrdersCount)
      {
         CheckAndSendClosedTrades();
      }
      else
      {
         // Si se abrieron nuevas órdenes, solo actualizar tracking
         SaveCurrentOpenTickets();
      }
      
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio en órdenes (SL/TP modificado, etc.)
   if(currentHash != g_lastOrdersHash)
   {
      // Log("Cambio: Órdenes modificadas");
      CaptureCurrentState();
      return true;
   }
   
   return false;
}

//+------------------------------------------------------------------+
//| Genera un hash simple de las órdenes actuales                    |
//+------------------------------------------------------------------+
string GetOrdersHash()
{
   string hash = "";
   
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            hash += IntegerToString(OrderTicket()) + "_" +
                    OrderSymbol() + "_" +
                    DoubleToString(OrderLots(), 2) + "_" +
                    DoubleToString(OrderStopLoss(), 5) + "_" +
                    DoubleToString(OrderTakeProfit(), 5) + "|";
         }
      }
   }
   
   return hash;
}

//+------------------------------------------------------------------+
//| Envía actualización al servidor                                  |
//+------------------------------------------------------------------+
void SendUpdate()
{
   string json = BuildUpdateJSON();
   string url = InpServerURL + "/ea/update";
   
   if(!SendHTTPPost(url, json))
   {
      Log("ERROR: No se pudo enviar update");
   }
}

//+------------------------------------------------------------------+
//| Construye el JSON de actualización                               |
//+------------------------------------------------------------------+
string BuildUpdateJSON()
{
   string json = "{";
   
   // Tipo de mensaje y token
   json += "\"msg_type\":\"update\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"timestamp\":" + IntegerToString(GetTickCount()) + ",";
   
   // Información de la cuenta
   json += "\"account\":{";
   json += "\"number\":" + IntegerToString(AccountNumber()) + ",";
   json += "\"broker\":\"" + EscapeJSON(AccountCompany()) + "\",";
   json += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountEquity(), 2) + ",";
   json += "\"margin\":" + DoubleToString(AccountMargin(), 2) + ",";
   json += "\"free_margin\":" + DoubleToString(AccountFreeMargin(), 2) + ",";
   json += "\"margin_level\":" + DoubleToString(AccountMargin() > 0 ? (AccountEquity() / AccountMargin() * 100) : 0, 2) + ",";
   json += "\"server\":\"" + EscapeJSON(AccountServer()) + "\",";
   json += "\"leverage\":" + IntegerToString(AccountLeverage()) + ",";
   json += "\"currency\":\"" + AccountCurrency() + "\"";
   json += "},";
   
   // Posiciones abiertas
   json += "\"positions\":[";
   
   bool first = true;
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            if(!first) json += ",";
            first = false;
            
            string orderType = (OrderType() == OP_BUY) ? "buy" : "sell";
            double currentPrice = (OrderType() == OP_BUY) ? MarketInfo(OrderSymbol(), MODE_BID) : MarketInfo(OrderSymbol(), MODE_ASK);
            
            json += "{";
            json += "\"ticket\":" + IntegerToString(OrderTicket()) + ",";
            json += "\"symbol\":\"" + OrderSymbol() + "\",";
            json += "\"type\":\"" + orderType + "\",";
            json += "\"volume\":" + DoubleToString(OrderLots(), 2) + ",";
            json += "\"open_price\":" + DoubleToString(OrderOpenPrice(), 5) + ",";
            json += "\"current_price\":" + DoubleToString(currentPrice, 5) + ",";
            json += "\"sl\":" + DoubleToString(OrderStopLoss(), 5) + ",";
            json += "\"tp\":" + DoubleToString(OrderTakeProfit(), 5) + ",";
            json += "\"profit\":" + DoubleToString(OrderProfit(), 2) + ",";
            json += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
            json += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
            json += "\"open_time\":" + IntegerToString((long)OrderOpenTime() * 1000) + ",";
            json += "\"magic_number\":" + IntegerToString(OrderMagicNumber()) + ",";
            json += "\"comment\":\"" + EscapeJSON(OrderComment()) + "\"";
            json += "}";
         }
      }
   }
   
   json += "]";
   json += "}";
   
   return json;
}

//+------------------------------------------------------------------+
//| Envía HTTP POST al servidor                                      |
//+------------------------------------------------------------------+
bool SendHTTPPost(string url, string jsonData)
{
   char post[], result[];
   string resultHeaders;
   int timeout = 10000; // Aumentar timeout a 10 segundos
   
   // Headers
   string headers = "Content-Type: application/json\r\n";
   headers += "Accept: application/json\r\n";
   headers += "User-Agent: MT4-AccountViewer/1.0\r\n";
   
   // Convertir JSON a array de bytes
   int jsonLen = StringLen(jsonData);
   ArrayResize(post, jsonLen);
   StringToCharArray(jsonData, post, 0, jsonLen, CP_UTF8);
   
   ResetLastError();
   
   // WebRequest con 7 parámetros (versión recomendada para MT4)
   int res = WebRequest(
      "POST",           // método
      url,              // URL
      headers,          // headers
      timeout,          // timeout
      post,             // data a enviar
      result,           // resultado
      resultHeaders     // headers de respuesta
   );
   
   int error = GetLastError();
   
   if(res == -1)
   {
      if(error == 4014)
      {
         Log("ERROR: URL no permitida. Añade a Herramientas > Opciones > Expert Advisors:");
         Log("  " + url);
      }
      else if(error == 5200 || error == 5203)
      {
         Log("ERROR " + IntegerToString(error) + ": Problema de conexión/SSL con el servidor");
         Log("  URL: " + url);
         Log("  Tip: Verifica que la URL esté en la lista permitida y reinicia MT4");
      }
      else
      {
         Log("ERROR WebRequest: " + IntegerToString(error) + " - URL: " + url);
      }
      return false;
   }
   
   if(res != 200 && res != 201)
   {
      string responseStr = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      Log("HTTP " + IntegerToString(res) + ": " + responseStr);
      return false;
   }
   
   return true;
}


//+------------------------------------------------------------------+
//| Escapa caracteres especiales para JSON                           |
//+------------------------------------------------------------------+
string EscapeJSON(string text)
{
   StringReplace(text, "\\", "\\\\");
   StringReplace(text, "\"", "\\\"");
   StringReplace(text, "\n", "\\n");
   StringReplace(text, "\r", "\\r");
   StringReplace(text, "\t", "\\t");
   return text;
}

//+------------------------------------------------------------------+
//| Función de logging                                               |
//+------------------------------------------------------------------+
void Log(string message)
{
   if(InpLogEnabled)
   {
      Print("[AccountViewer] " + message);
   }
}

//+------------------------------------------------------------------+
//| Verificar comandos pendientes del servidor                        |
//+------------------------------------------------------------------+
void CheckPendingCommands()
{
   string url = InpServerURL + "/ea/commands";
   string json = "{\"token\":\"" + InpConnectionToken + "\"}";
   
   string headers = "Content-Type: application/json\r\n";
   char post[], result[];
   int timeout = 3000;
   
   ArrayResize(post, StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8) - 1);
   
   ResetLastError();
   int res = WebRequest("POST", url, headers, timeout, post, result, headers);
   
   if(res != 200)
      return;
   
   // Parsear respuesta simple
   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   
   // Buscar comandos en la respuesta
   if(StringFind(response, "\"commands\":[]") >= 0 || StringFind(response, "\"success\":false") >= 0)
      return;
   
   // Procesar comandos
   int cmdStart = StringFind(response, "\"commands\":[");
   if(cmdStart < 0) return;
   
   // Buscar sync_history
   if(StringFind(response, "\"type\":\"sync_history\"") >= 0)
   {
      Log("Comando recibido: SINCRONIZAR HISTORIAL");
      SendHistorySync();
      return;
   }
   
   // Buscar close_all
   if(StringFind(response, "\"type\":\"close_all\"") >= 0)
   {
      Log("Comando recibido: CERRAR TODAS LAS POSICIONES");
      CloseAllOrders();
      return;
   }
   
   // Buscar close_trade con ticket
   int ticketPos = StringFind(response, "\"ticket\":");
   while(ticketPos >= 0)
   {
      // Extraer el ticket
      int ticketStart = ticketPos + 9;
      int ticketEnd = StringFind(response, ",", ticketStart);
      if(ticketEnd < 0) ticketEnd = StringFind(response, "}", ticketStart);
      
      string ticketStr = StringSubstr(response, ticketStart, ticketEnd - ticketStart);
      int ticket = (int)StringToInteger(ticketStr);
      
      if(ticket > 0)
      {
         Log("Comando recibido: CERRAR ORDEN #" + IntegerToString(ticket));
         CloseOrderByTicket(ticket);
      }
      
      ticketPos = StringFind(response, "\"ticket\":", ticketPos + 1);
   }
}

//+------------------------------------------------------------------+
//| Cerrar todas las órdenes abiertas                                 |
//+------------------------------------------------------------------+
void CloseAllOrders()
{
   int total = OrdersTotal();
   Log("Cerrando " + IntegerToString(total) + " órdenes...");
   
   // Cerrar de atrás hacia adelante para evitar problemas de índice
   for(int i = total - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            CloseOrderByTicket(OrderTicket());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Cerrar una orden por su ticket                                    |
//+------------------------------------------------------------------+
bool CloseOrderByTicket(int ticket)
{
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
   {
      Log("ERROR: No se encontró la orden #" + IntegerToString(ticket));
      return false;
   }
   
   string symbol = OrderSymbol();
   double lots = OrderLots();
   int orderType = OrderType();
   
   // Solo cerrar market orders
   if(orderType != OP_BUY && orderType != OP_SELL)
   {
      Log("Orden #" + IntegerToString(ticket) + " es pendiente, no se puede cerrar con este método");
      return false;
   }
   
   // Precio de cierre
   double closePrice;
   if(orderType == OP_BUY)
      closePrice = MarketInfo(symbol, MODE_BID);
   else
      closePrice = MarketInfo(symbol, MODE_ASK);
   
   // Intentar cerrar
   bool result = OrderClose(ticket, lots, closePrice, 20, clrNONE);
   
   if(result)
   {
      Log("Orden #" + IntegerToString(ticket) + " cerrada exitosamente");
      return true;
   }
   else
   {
      int error = GetLastError();
      Log("ERROR al cerrar #" + IntegerToString(ticket) + ": " + IntegerToString(error));
      return false;
   }
}

//+------------------------------------------------------------------+
//| Enviar historial completo de trades al servidor (MT4)             |
//+------------------------------------------------------------------+
void SendHistorySync()
{
   // En MT4, el historial está en OrdersHistoryTotal()
   int totalHistory = OrdersHistoryTotal();
   Log("Sincronizando historial de " + IntegerToString(totalHistory) + " órdenes...");
   
   // Construir JSON con todos los trades cerrados
   string json = "{";
   json += "\"msg_type\":\"sync_history\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"trades\":[";
   
   int tradesCount = 0;
   
   for(int i = 0; i < totalHistory; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
         continue;
      
      // Solo procesar órdenes de mercado cerradas (no pending orders cancelados)
      int orderType = OrderType();
      if(orderType != OP_BUY && orderType != OP_SELL)
         continue;
      
      // Solo trades con profit != 0 o que tengan close time
      if(OrderCloseTime() == 0)
         continue;
      
      if(tradesCount > 0) json += ",";
      
      string symbol = OrderSymbol();
      string type = (orderType == OP_BUY) ? "buy" : "sell";
      double volume = OrderLots();
      double openPrice = OrderOpenPrice();
      double closePrice = OrderClosePrice();
      double sl = OrderStopLoss();
      double tp = OrderTakeProfit();
      double profit = OrderProfit();
      double swap = OrderSwap();
      double commission = OrderCommission();
      datetime openTime = OrderOpenTime();
      datetime closeTime = OrderCloseTime();
      int magicNumber = OrderMagicNumber();
      string comment = OrderComment();
      int ticket = OrderTicket();
      
      json += "{";
      json += "\"ticket\":" + IntegerToString(ticket) + ",";
      json += "\"symbol\":\"" + symbol + "\",";
      json += "\"type\":\"" + type + "\",";
      json += "\"volume\":" + DoubleToString(volume, 2) + ",";
      json += "\"open_price\":" + DoubleToString(openPrice, 5) + ",";
      json += "\"close_price\":" + DoubleToString(closePrice, 5) + ",";
      json += "\"sl\":" + DoubleToString(sl, 5) + ",";
      json += "\"tp\":" + DoubleToString(tp, 5) + ",";
      json += "\"profit\":" + DoubleToString(profit, 2) + ",";
      json += "\"swap\":" + DoubleToString(swap, 2) + ",";
      json += "\"commission\":" + DoubleToString(commission, 2) + ",";
      json += "\"open_time\":" + IntegerToString((long)openTime * 1000) + ",";
      json += "\"close_time\":" + IntegerToString((long)closeTime * 1000) + ",";
      json += "\"magic_number\":" + IntegerToString(magicNumber) + ",";
      json += "\"comment\":\"" + EscapeJSON(comment) + "\"";
      json += "}";
      
      tradesCount++;
   }
   
   json += "]}";
   
   Log("Enviando " + IntegerToString(tradesCount) + " trades cerrados al servidor...");
   
   string url = InpServerURL + "/ea/sync-history";
   if(SendHTTPPost(url, json))
   {
      Log("Historial sincronizado exitosamente");
   }
   else
   {
      Log("ERROR: No se pudo enviar historial");
   }
}

//+------------------------------------------------------------------+
//| Guardar tickets actualmente abiertos                              |
//+------------------------------------------------------------------+
void SaveCurrentOpenTickets()
{
   // Contar órdenes abiertas
   int count = 0;
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
            count++;
      }
   }
   
   // Redimensionar array
   ArrayResize(g_openTickets, count);
   g_openTicketsCount = count;
   
   // Guardar tickets
   int idx = 0;
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            g_openTickets[idx] = OrderTicket();
            idx++;
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Detectar y enviar trades cerrados                                 |
//+------------------------------------------------------------------+
void CheckAndSendClosedTrades()
{
   // Obtener tickets actuales
   int currentTickets[];
   int currentCount = 0;
   
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            ArrayResize(currentTickets, currentCount + 1);
            currentTickets[currentCount] = OrderTicket();
            currentCount++;
         }
      }
   }
   
   // Buscar tickets que ya no están abiertos
   for(int i = 0; i < g_openTicketsCount; i++)
   {
      int ticket = g_openTickets[i];
      bool stillOpen = false;
      
      for(int j = 0; j < currentCount; j++)
      {
         if(currentTickets[j] == ticket)
         {
            stillOpen = true;
            break;
         }
      }
      
      // Si el ticket ya no está abierto, buscar en historial y enviar
      if(!stillOpen)
      {
         Log("Trade cerrado detectado: #" + IntegerToString(ticket));
         SendTradeClosed(ticket);
      }
   }
   
   // Actualizar lista de tickets abiertos
   ArrayResize(g_openTickets, currentCount);
   g_openTicketsCount = currentCount;
   for(int i = 0; i < currentCount; i++)
   {
      g_openTickets[i] = currentTickets[i];
   }
}

//+------------------------------------------------------------------+
//| Enviar trade cerrado al servidor                                  |
//+------------------------------------------------------------------+
void SendTradeClosed(int ticket)
{
   // Buscar el trade en el historial
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
   {
      Log("ERROR: No se encontró el ticket #" + IntegerToString(ticket) + " en historial");
      return;
   }
   
   // Verificar que es un trade cerrado (tiene close time)
   if(OrderCloseTime() == 0)
   {
      Log("Ticket #" + IntegerToString(ticket) + " aún no está cerrado");
      return;
   }
   
   // Solo procesar market orders
   int orderType = OrderType();
   if(orderType != OP_BUY && orderType != OP_SELL)
      return;
   
   // Construir JSON
   string json = "{";
   json += "\"msg_type\":\"trade_closed\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"timestamp\":" + IntegerToString(GetTickCount()) + ",";
   json += "\"trade\":{";
   json += "\"ticket\":" + IntegerToString(ticket) + ",";
   json += "\"symbol\":\"" + OrderSymbol() + "\",";
   json += "\"type\":\"" + (orderType == OP_BUY ? "buy" : "sell") + "\",";
   json += "\"volume\":" + DoubleToString(OrderLots(), 2) + ",";
   json += "\"open_price\":" + DoubleToString(OrderOpenPrice(), 5) + ",";
   json += "\"close_price\":" + DoubleToString(OrderClosePrice(), 5) + ",";
   json += "\"sl\":" + DoubleToString(OrderStopLoss(), 5) + ",";
   json += "\"tp\":" + DoubleToString(OrderTakeProfit(), 5) + ",";
   json += "\"profit\":" + DoubleToString(OrderProfit(), 2) + ",";
   json += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
   json += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
   json += "\"open_time\":" + IntegerToString((long)OrderOpenTime() * 1000) + ",";
   json += "\"close_time\":" + IntegerToString((long)OrderCloseTime() * 1000) + ",";
   json += "\"magic_number\":" + IntegerToString(OrderMagicNumber()) + ",";
   json += "\"comment\":\"" + EscapeJSON(OrderComment()) + "\"";
   json += "}}";
   
   string url = InpServerURL + "/ea/trade-closed";
   if(SendHTTPPost(url, json))
   {
      Log("Trade #" + IntegerToString(ticket) + " enviado al servidor");
   }
   else
   {
      Log("ERROR: No se pudo enviar trade #" + IntegerToString(ticket));
   }
}
//+------------------------------------------------------------------+
