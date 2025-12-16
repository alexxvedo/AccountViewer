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
input int      InpTimerInterval = 500;                       // Intervalo del timer (ms)
input int      InpUpdateInterval = 5;                        // Intervalo de actualización (segundos)
input double   InpEquityThreshold = 0.50;                    // Umbral de cambio de equity ($)
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
   Log("AccountViewer EA v1.00 (MT4 HTTP) iniciando...");
   Log("Token: " + StringSubstr(InpConnectionToken, 0, 8) + "...");
   Log("Server: " + InpServerURL);
   Log("Update each: " + IntegerToString(InpUpdateInterval) + "s");
   Log("==============================================");
   
   // IMPORTANTE: Añadir URL a la lista permitida
   Log("IMPORTANTE: Añade esta URL a Herramientas > Opciones > Expert Advisors:");
   Log("  " + InpServerURL);
   
   // Inicializar estado
   CaptureCurrentState();
   
   // Configurar timer
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
//| Timer function - Núcleo del EA                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   g_tickCounter++;
   
   // Convertir ticks a segundos aproximados
   int secondsElapsed = g_tickCounter * InpTimerInterval / 1000;
   
   // Verificar cada tick si hay cambios significativos
   if(HasSignificantChanges())
   {
      SendUpdate();
      g_lastUpdateTime = TimeCurrent();
      g_tickCounter = 0;
   }
   // Si no hay cambios, enviar update periódico
   else if(secondsElapsed >= InpUpdateInterval)
   {
      SendUpdate();
      g_tickCounter = 0;
   }
   
   // Verificar comandos pendientes del servidor (cada ciclo)
   CheckPendingCommands();
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
      Log("Cambio: Balance " + DoubleToString(g_lastBalance, 2) + " -> " + DoubleToString(currentBalance, 2));
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio significativo en equity
   if(MathAbs(currentEquity - g_lastEquity) >= InpEquityThreshold)
   {
      Log("Cambio: Equity " + DoubleToString(g_lastEquity, 2) + " -> " + DoubleToString(currentEquity, 2));
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio en número de órdenes
   if(currentOrdersCount != g_lastOrdersCount)
   {
      Log("Cambio: Órdenes " + IntegerToString(g_lastOrdersCount) + " -> " + IntegerToString(currentOrdersCount));
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio en órdenes (SL/TP modificado, etc.)
   if(currentHash != g_lastOrdersHash)
   {
      Log("Cambio: Órdenes modificadas");
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
   string cookie = "", headers = "";
   char post[], result[];
   int timeout = 5000;
   
   // Preparar headers
   headers = "Content-Type: application/json\r\n";
   
   // Convertir JSON a array de bytes
   ArrayResize(post, StringToCharArray(jsonData, post, 0, WHOLE_ARRAY, CP_UTF8) - 1);
   
   ResetLastError();
   
   // Usar la versión de WebRequest compatible con MT4
   int res = WebRequest(
      "POST",           // método
      url,              // URL
      headers,          // headers
      timeout,          // timeout
      post,             // data
      result,           // resultado
      headers           // headers de respuesta (reusamos variable)
   );
   
   if(res == -1)
   {
      int error = GetLastError();
      if(error == 4014)
      {
         Log("ERROR: URL no permitida. Añade a Herramientas > Opciones > Expert Advisors:");
         Log("  " + InpServerURL);
      }
      else if(error == 5200)
      {
         Log("ERROR 5200: WebRequest falló. Verificar que URL está en lista permitida.");
      }
      else
      {
         Log("ERROR WebRequest: " + IntegerToString(error));
      }
      return false;
   }
   
   if(res != 200)
   {
      Log("HTTP Error: " + IntegerToString(res));
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
