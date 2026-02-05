//+------------------------------------------------------------------+
//|                                              AccountViewer.mq4   |
//|                       Copyright 2024, TradingPlatform SaaS       |
//|                                                                  |
//| Expert Advisor para monitoreo de cuentas en tiempo real          |
//| Usa HTTP nativo (WebRequest) - Sin librerías externas            |
//+------------------------------------------------------------------+
#property copyright "TradingPlatform SaaS"
#property link      ""
#property version   "2.00"
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
int    g_lastPositionsCount = 0;
string g_lastPositionsHash = "";
datetime g_lastUpdateTime = 0;

// Control de Throttling
uint g_lastRequestTime = 0;

// Contador de tiempo para fallback
int g_secondsCounter = 0;

// Tracking de tickets abiertos para detectar cierres
int g_openTickets[];
int g_openTicketsCount = 0;

// Último ticket procesado en historial
int g_lastProcessedHistoryTicket = 0;

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
   Log("AccountViewer EA v2.00 (Real-Time) iniciando...");
   Log("Token: " + StringSubstr(InpConnectionToken, 0, 8) + "...");
   Log("Server: " + InpServerURL);
   Log("Modo: Smart Tick (Instantáneo)");
   Log("==============================================");

   // IMPORTANTE: Añadir URL a la lista permitida
   Log("IMPORTANTE: Añade esta URL a Herramientas > Opciones > Expert Advisors:");
   Log("  " + InpServerURL);

   // Inicializar estado
   CaptureCurrentState();
   SaveOpenTickets();

   // Configurar timer (Backup y heartbeat)
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
      if(GetTickCount() - g_lastRequestTime >= (uint)InpMinRequestInterval)
      {
         SendUpdate();
         g_lastUpdateTime = TimeCurrent();
         g_secondsCounter = 0;
      }
   }

   // 2. Polling de comandos (cada 250ms aprox)
   static uint lastCommandCheck = 0;
   if(GetTickCount() - lastCommandCheck >= 250)
   {
      if(GetTickCount() - g_lastRequestTime >= (uint)InpMinRequestInterval)
      {
         CheckPendingCommands();
         lastCommandCheck = GetTickCount();
      }
   }

   // 3. Chequeo de trades cerrados
   CheckClosedTrades();
}

//+------------------------------------------------------------------+
//| Timer function - Fallback y Heartbeat                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   OnTick();

   // Heartbeat: Forzar actualización cada X segundos
   g_secondsCounter++;
   int ticksPerSecond = 1000 / InpTimerInterval;

   if(g_secondsCounter >= InpUpdateInterval * ticksPerSecond)
   {
      if(GetTickCount() - g_lastRequestTime >= (uint)InpMinRequestInterval)
      {
         SendUpdate();
         g_secondsCounter = 0;
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
   g_lastPositionsCount = CountOpenPositions();
   g_lastPositionsHash = GetPositionsHash();
}

//+------------------------------------------------------------------+
//| Cuenta posiciones abiertas (solo market orders)                  |
//+------------------------------------------------------------------+
int CountOpenPositions()
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
   int currentPositionsCount = CountOpenPositions();
   string currentHash = GetPositionsHash();

   // Verificar cambio en balance (trade cerrado)
   if(MathAbs(currentBalance - g_lastBalance) > 0.01)
   {
      CaptureCurrentState();
      return true;
   }

   // Verificar cambio significativo en equity
   if(MathAbs(currentEquity - g_lastEquity) > InpEquityThreshold)
   {
      CaptureCurrentState();
      return true;
   }

   // Verificar cambio en número de posiciones
   if(currentPositionsCount != g_lastPositionsCount)
   {
      Log("Cambio: Posiciones " + IntegerToString(g_lastPositionsCount) + " -> " + IntegerToString(currentPositionsCount));
      CaptureCurrentState();
      return true;
   }

   // Verificar cambio en posiciones (SL/TP modificado, etc.)
   if(currentHash != g_lastPositionsHash)
   {
      CaptureCurrentState();
      return true;
   }

   return false;
}

//+------------------------------------------------------------------+
//| Genera un hash simple de las posiciones actuales                 |
//+------------------------------------------------------------------+
string GetPositionsHash()
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
   double marginLevel = AccountMargin() > 0 ? (AccountEquity() / AccountMargin() * 100) : 0;

   json += "\"account\":{";
   json += "\"number\":" + IntegerToString(AccountNumber()) + ",";
   json += "\"broker\":\"" + EscapeJSON(AccountCompany()) + "\",";
   json += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountEquity(), 2) + ",";
   json += "\"margin\":" + DoubleToString(AccountMargin(), 2) + ",";
   json += "\"free_margin\":" + DoubleToString(AccountFreeMargin(), 2) + ",";
   json += "\"margin_level\":" + DoubleToString(marginLevel, 2) + ",";
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

            string symbol = OrderSymbol();
            string orderType = (OrderType() == OP_BUY) ? "buy" : "sell";
            double currentPrice = (OrderType() == OP_BUY) ? MarketInfo(symbol, MODE_BID) : MarketInfo(symbol, MODE_ASK);

            json += "{";
            json += "\"ticket\":" + IntegerToString(OrderTicket()) + ",";
            json += "\"symbol\":\"" + symbol + "\",";
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
   char post[];
   char result[];
   string headers = "Content-Type: application/json\r\n";
   string resultHeaders;

   // Convertir JSON a array de bytes
   StringToCharArray(jsonData, post, 0, WHOLE_ARRAY, CP_UTF8);

   // Eliminar el null terminator si existe
   int postLen = ArraySize(post);
   if(postLen > 0 && post[postLen-1] == 0)
      postLen--;
   ArrayResize(post, postLen);

   int timeout = 5000;

   ResetLastError();
   int res = WebRequest("POST", url, headers, timeout, post, result, resultHeaders);

   if(res == -1)
   {
      int error = GetLastError();
      if(error == 4014)
      {
         Log("ERROR: URL no permitida. Añade a Herramientas > Opciones > Expert Advisors:");
         Log("  " + url);
      }
      else
      {
         Log("ERROR WebRequest: " + IntegerToString(error));
      }
      return false;
   }

   if(res != 200 && res != 201)
   {
      Log("HTTP Error: " + IntegerToString(res));
      return false;
   }

   // Actualizar tiempo del último request para throttling
   g_lastRequestTime = GetTickCount();

   return true;
}

//+------------------------------------------------------------------+
//| Guarda los tickets actualmente abiertos                          |
//+------------------------------------------------------------------+
void SaveOpenTickets()
{
   int count = 0;

   // Contar posiciones
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
            count++;
      }
   }

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
//| Verifica trades cerrados                                         |
//+------------------------------------------------------------------+
void CheckClosedTrades()
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
         SendClosedTrade(ticket);
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
//| Envía un trade cerrado al servidor                               |
//+------------------------------------------------------------------+
void SendClosedTrade(int ticket)
{
   // Buscar en historial
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
   {
      Log("ERROR: No se encontró ticket #" + IntegerToString(ticket));
      return;
   }

   // Verificar que está cerrado
   if(OrderCloseTime() == 0)
      return;

   // Solo market orders
   int orderType = OrderType();
   if(orderType != OP_BUY && orderType != OP_SELL)
      return;

   Log("Trade cerrado: #" + IntegerToString(ticket) + " " + OrderSymbol() + " Profit: " + DoubleToString(OrderProfit(), 2));

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
   SendHTTPPost(url, json);
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

   char post[];
   char result[];
   string headers = "Content-Type: application/json\r\n";
   string resultHeaders;

   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   int postLen = ArraySize(post);
   if(postLen > 0 && post[postLen-1] == 0)
      postLen--;
   ArrayResize(post, postLen);

   int timeout = 3000;
   ResetLastError();
   int res = WebRequest("POST", url, headers, timeout, post, result, resultHeaders);

   // Actualizar tiempo del último request
   g_lastRequestTime = GetTickCount();

   if(res != 200)
      return;

   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);

   if(StringFind(response, "\"commands\":[]") >= 0 || StringFind(response, "\"success\":false") >= 0)
      return;

   int cmdStart = StringFind(response, "\"commands\":[");
   if(cmdStart < 0) return;

   // sync_history
   if(StringFind(response, "\"type\":\"sync_history\"") >= 0)
   {
      Log("Comando recibido: SINCRONIZAR HISTORIAL");
      SendHistorySync();
      return;
   }

   // close_all
   if(StringFind(response, "\"type\":\"close_all\"") >= 0)
   {
      Log("Comando recibido: CERRAR TODAS LAS POSICIONES");
      CloseAllPositions();
      return;
   }

   // request_chart_data
   if(StringFind(response, "\"type\":\"request_chart_data\"") >= 0)
   {
      string symbol = ExtractString(response, "\"symbol\":\"", "\"");
      int timeframe = (int)ExtractNumber(response, "\"timeframe\":");
      int bars = (int)ExtractNumber(response, "\"bars\":");

      if(timeframe == 0) timeframe = 60;
      if(bars == 0) bars = 200;

      if(StringLen(symbol) > 0)
      {
         Log("Comando: CHART DATA " + symbol + " TF=" + IntegerToString(timeframe));
         SendChartData(symbol, timeframe, bars);
      }
      return;
   }

   // modify_trade
   if(StringFind(response, "\"type\":\"modify_trade\"") >= 0)
   {
      int ticket = (int)ExtractNumber(response, "\"ticket\":");
      double sl = ExtractNumber(response, "\"sl\":");
      double tp = ExtractNumber(response, "\"tp\":");

      if(ticket > 0)
      {
         Log("Comando: MODIFICAR #" + IntegerToString(ticket));
         ModifyPosition(ticket, sl, tp);
      }
      return;
   }

   // close_trade
   if(StringFind(response, "\"type\":\"close_trade\"") >= 0)
   {
      int ticket = (int)ExtractNumber(response, "\"ticket\":");
      if(ticket > 0)
      {
         Log("Comando: CERRAR #" + IntegerToString(ticket));
         ClosePositionByTicket(ticket);
      }
      return;
   }
}

//+------------------------------------------------------------------+
//| Extrae un string de un JSON                                       |
//+------------------------------------------------------------------+
string ExtractString(string json, string key, string endChar)
{
   int pos = StringFind(json, key);
   if(pos < 0) return "";

   int start = pos + StringLen(key);
   int end = StringFind(json, endChar, start);
   if(end < 0) return "";

   return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Extrae un número de un JSON                                       |
//+------------------------------------------------------------------+
double ExtractNumber(string json, string key)
{
   int pos = StringFind(json, key);
   if(pos < 0) return 0;

   int start = pos + StringLen(key);
   int end = start;

   // Buscar el final del número
   while(end < StringLen(json))
   {
      ushort c = StringGetCharacter(json, end);
      if((c < '0' || c > '9') && c != '.' && c != '-')
         break;
      end++;
   }

   if(end == start) return 0;

   string numStr = StringSubstr(json, start, end - start);
   return StringToDouble(numStr);
}

//+------------------------------------------------------------------+
//| Cerrar todas las posiciones                                       |
//+------------------------------------------------------------------+
void CloseAllPositions()
{
   int total = OrdersTotal();
   Log("Cerrando " + IntegerToString(total) + " posiciones...");

   for(int i = total - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            ClosePositionByTicket(OrderTicket());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Cerrar una posición por ticket                                    |
//+------------------------------------------------------------------+
bool ClosePositionByTicket(int ticket)
{
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
   {
      Log("ERROR: No se encontró posición #" + IntegerToString(ticket));
      return false;
   }

   string symbol = OrderSymbol();
   double lots = OrderLots();
   int orderType = OrderType();

   if(orderType != OP_BUY && orderType != OP_SELL)
   {
      Log("Orden #" + IntegerToString(ticket) + " no es market order");
      return false;
   }

   double closePrice = (orderType == OP_BUY) ? MarketInfo(symbol, MODE_BID) : MarketInfo(symbol, MODE_ASK);

   bool result = OrderClose(ticket, lots, closePrice, 20, clrNONE);

   if(result)
   {
      Log("Posición #" + IntegerToString(ticket) + " cerrada");
      return true;
   }
   else
   {
      Log("ERROR al cerrar #" + IntegerToString(ticket) + ": " + IntegerToString(GetLastError()));
      return false;
   }
}

//+------------------------------------------------------------------+
//| Modificar SL/TP de una posición                                   |
//+------------------------------------------------------------------+
bool ModifyPosition(int ticket, double sl, double tp)
{
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
   {
      Log("ERROR: No se encontró posición #" + IntegerToString(ticket));
      return false;
   }

   double openPrice = OrderOpenPrice();
   double currentSL = OrderStopLoss();
   double currentTP = OrderTakeProfit();

   double newSL = (sl > 0) ? sl : currentSL;
   double newTP = (tp > 0) ? tp : currentTP;

   int digits = (int)MarketInfo(OrderSymbol(), MODE_DIGITS);
   newSL = NormalizeDouble(newSL, digits);
   newTP = NormalizeDouble(newTP, digits);

   bool result = OrderModify(ticket, openPrice, newSL, newTP, 0, clrNONE);

   if(result)
   {
      Log("Posición #" + IntegerToString(ticket) + " modificada");
      return true;
   }
   else
   {
      Log("ERROR al modificar #" + IntegerToString(ticket) + ": " + IntegerToString(GetLastError()));
      return false;
   }
}

//+------------------------------------------------------------------+
//| Enviar datos de gráfico                                           |
//+------------------------------------------------------------------+
void SendChartData(string symbol, int timeframeMin, int barsCount)
{
   int tf = PERIOD_H1;
   switch(timeframeMin)
   {
      case 1:    tf = PERIOD_M1; break;
      case 5:    tf = PERIOD_M5; break;
      case 15:   tf = PERIOD_M15; break;
      case 30:   tf = PERIOD_M30; break;
      case 60:   tf = PERIOD_H1; break;
      case 240:  tf = PERIOD_H4; break;
      case 1440: tf = PERIOD_D1; break;
      default:   tf = PERIOD_H1; break;
   }

   // Verificar que hay suficientes barras disponibles
   int available = iBars(symbol, tf);
   if(available <= 0)
   {
      Log("No hay datos disponibles para " + symbol + " TF=" + IntegerToString(tf));
      // Forzar carga del historial
      datetime dummy = iTime(symbol, tf, 0);
      return;
   }

   int bars = MathMin(barsCount, available);
   Log("Chart data: " + symbol + " (" + IntegerToString(bars) + " barras disponibles)");

   string json = "{";
   json += "\"msg_type\":\"chart_data\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"timeframe\":" + IntegerToString(timeframeMin) + ",";
   json += "\"bars\":[";

   // Usar funciones clásicas de MT4 (más confiables)
   // Enviar de más antiguo a más reciente
   for(int i = bars - 1; i >= 0; i--)
   {
      if(i < bars - 1) json += ",";

      datetime barTime = iTime(symbol, tf, i);
      double barOpen = iOpen(symbol, tf, i);
      double barHigh = iHigh(symbol, tf, i);
      double barLow = iLow(symbol, tf, i);
      double barClose = iClose(symbol, tf, i);
      long barVolume = iVolume(symbol, tf, i);

      json += "{";
      json += "\"time\":" + IntegerToString((long)barTime) + ",";
      json += "\"open\":" + DoubleToString(barOpen, 5) + ",";
      json += "\"high\":" + DoubleToString(barHigh, 5) + ",";
      json += "\"low\":" + DoubleToString(barLow, 5) + ",";
      json += "\"close\":" + DoubleToString(barClose, 5) + ",";
      json += "\"volume\":" + IntegerToString(barVolume);
      json += "}";
   }

   json += "]}";

   string url = InpServerURL + "/ea/chart-data";
   if(SendHTTPPost(url, json))
   {
      Log("Chart data enviado: " + symbol);
   }
   else
   {
      Log("ERROR enviando chart data: " + symbol);
   }
}

//+------------------------------------------------------------------+
//| Enviar historial completo                                         |
//+------------------------------------------------------------------+
void SendHistorySync()
{
   int totalHistory = OrdersHistoryTotal();
   Log("Sincronizando " + IntegerToString(totalHistory) + " órdenes del historial...");

   string json = "{";
   json += "\"msg_type\":\"sync_history\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"trades\":[";

   int tradesCount = 0;

   for(int i = 0; i < totalHistory; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
         continue;

      int orderType = OrderType();
      if(orderType != OP_BUY && orderType != OP_SELL)
         continue;

      if(OrderCloseTime() == 0)
         continue;

      if(tradesCount > 0) json += ",";

      json += "{";
      json += "\"ticket\":" + IntegerToString(OrderTicket()) + ",";
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
      json += "}";

      tradesCount++;
   }

   json += "]}";

   Log("Enviando " + IntegerToString(tradesCount) + " trades...");

   string url = InpServerURL + "/ea/sync-history";
   if(SendHTTPPost(url, json))
   {
      Log("Historial sincronizado");
   }
   else
   {
      Log("ERROR: No se pudo enviar historial");
   }
}
//+------------------------------------------------------------------+
