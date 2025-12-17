//+------------------------------------------------------------------+
//|                                              AccountViewer.mq5   |
//|                       Copyright 2024, TradingPlatform SaaS       |
//|                                                                  |
//| Expert Advisor para monitoreo de cuentas en tiempo real          |
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
int    g_lastPositionsCount = 0;
string g_lastPositionsHash = "";
datetime g_lastUpdateTime = 0;

// Control de Throttling
ulong g_lastRequestTime = 0;

// Contador de tiempo para fallback
int g_secondsCounter = 0;

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
   Log("AccountViewer EA v1.10 (Real-Time) iniciando...");
   Log("Token: " + StringSubstr(InpConnectionToken, 0, 8) + "...");
   Log("Server: " + InpServerURL);
   Log("Modo: Smart Tick (Instantáneo)");
   Log("==============================================");
   
   // IMPORTANTE: Añadir URL a la lista permitida
   Log("IMPORTANTE: Añade esta URL a Herramientas > Opciones > Expert Advisors:");
   Log("  " + InpServerURL);
   
   // Inicializar estado
   CaptureCurrentState();
   
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
      if(GetTickCount64() - g_lastRequestTime >= (ulong)InpMinRequestInterval)
      {
         SendUpdate();
         g_lastUpdateTime = TimeCurrent();
         g_secondsCounter = 0; // Resetear contador de heartbeat
      }
   }
   
   // 2. Polling de comandos "Casi Instantáneo" (cada 250ms aprox en ticks activos)
   static ulong lastCommandCheck = 0;
   if(GetTickCount64() - lastCommandCheck >= 250)
   {
      if(GetTickCount64() - g_lastRequestTime >= (ulong)InpMinRequestInterval)
      {
         CheckPendingCommands();
         lastCommandCheck = GetTickCount64();
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
   // Simular evento tick si el mercado está quieto para procesar comandos
   OnTick();
   
   // Heartbeat: Forzar actualización cada X segundos si no ha habido cambios
   g_secondsCounter++;
   int ticksPerSecond = 1000 / InpTimerInterval;
   
   if(g_secondsCounter >= InpUpdateInterval * ticksPerSecond)
   {
      if(GetTickCount64() - g_lastRequestTime >= (ulong)InpMinRequestInterval)
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
   g_lastBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_lastEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   g_lastMargin = AccountInfoDouble(ACCOUNT_MARGIN);
   g_lastPositionsCount = PositionsTotal();
   g_lastPositionsHash = GetPositionsHash();
}

//+------------------------------------------------------------------+
//| Verifica si hay cambios significativos                           |
//+------------------------------------------------------------------+
bool HasSignificantChanges()
{
   double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   int currentPositionsCount = PositionsTotal();
   string currentHash = GetPositionsHash();
   
   // Verificar cambio en balance (trade cerrado)
   if(MathAbs(currentBalance - g_lastBalance) > 0.01)
   {
      // Log("Cambio: Balance"); // Reducir logs en tick
      CaptureCurrentState();
      return true;
   }
   
   // Verificar cambio significativo en equity
   // Con umbral 0.0 detecta CUALQUIER cambio de tick en el PnL
   if(MathAbs(currentEquity - g_lastEquity) > InpEquityThreshold)
   {
      // No loguear equity en cada tick para no saturar pestaña Expertos
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
      // Log("Cambio: Modificación de orden");
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
   
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionSelectByTicket(ticket))
      {
         hash += IntegerToString((int)ticket) + "_" +
                 PositionGetString(POSITION_SYMBOL) + "_" +
                 DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + "_" +
                 DoubleToString(PositionGetDouble(POSITION_SL), 5) + "_" +
                 DoubleToString(PositionGetDouble(POSITION_TP), 5) + "|";
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
   json += "\"timestamp\":" + IntegerToString(GetTickCount64()) + ",";
   
   // Información de la cuenta
   json += "\"account\":{";
   json += "\"number\":" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   json += "\"broker\":\"" + EscapeJSON(AccountInfoString(ACCOUNT_COMPANY)) + "\",";
   json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
   json += "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
   json += "\"free_margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + ",";
   json += "\"margin_level\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ",";
   json += "\"server\":\"" + EscapeJSON(AccountInfoString(ACCOUNT_SERVER)) + "\",";
   json += "\"leverage\":" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LEVERAGE)) + ",";
   json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\"";
   json += "},";
   
   // Posiciones abiertas
   json += "\"positions\":[";
   
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionSelectByTicket(ticket))
      {
         if(i > 0) json += ",";
         
         json += "{";
         json += "\"ticket\":" + IntegerToString((int)ticket) + ",";
         json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
         json += "\"type\":\"" + (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell") + "\",";
         json += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
         json += "\"open_price\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + ",";
         json += "\"current_price\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT), 5) + ",";
         json += "\"sl\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5) + ",";
         json += "\"tp\":" + DoubleToString(PositionGetDouble(POSITION_TP), 5) + ",";
         json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
         json += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ",";
         json += "\"commission\":" + DoubleToString(PositionGetDouble(POSITION_COMMISSION), 2) + ",";
         json += "\"open_time\":" + IntegerToString((long)PositionGetInteger(POSITION_TIME) * 1000) + ",";
         json += "\"magic_number\":" + IntegerToString((int)PositionGetInteger(POSITION_MAGIC)) + ",";
         json += "\"comment\":\"" + EscapeJSON(PositionGetString(POSITION_COMMENT)) + "\"";
         json += "}";
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
   
   // Hacer la petición HTTP
   int timeout = 5000; // 5 segundos
   
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
   
   if(res != 200)
   {
      Log("HTTP Error: " + IntegerToString(res));
      return false;
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| Verifica trades cerrados recientemente                           |
//+------------------------------------------------------------------+
struct ClosedDealInfo {
   ulong ticket;
   long positionId;
};

//+------------------------------------------------------------------+
//| Verifica trades cerrados recientemente                           |
//+------------------------------------------------------------------+
void CheckClosedTrades()
{
   // Obtener historial de deals recientes (último minuto)
   datetime fromTime = TimeCurrent() - 60;
   
   if(!HistorySelect(fromTime, TimeCurrent()))
      return;
   
   int deals = HistoryDealsTotal();
   static ulong lastProcessedDeal = 0;
   
   ClosedDealInfo pendingDetails[];
   int pendingCount = 0;
   
   // 1. Identificar deals cerrados y guardar su ID de posición
   for(int i = 0; i < deals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      
      if(dealTicket > 0 && dealTicket > lastProcessedDeal)
      {
         ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         
         // Solo procesar salidas (trades cerrados)
         if(entry == DEAL_ENTRY_OUT)
         {
            long posId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
            
            ArrayResize(pendingDetails, pendingCount+1);
            pendingDetails[pendingCount].ticket = dealTicket;
            pendingDetails[pendingCount].positionId = posId;
            pendingCount++;
            
            if(dealTicket > lastProcessedDeal) lastProcessedDeal = dealTicket;
         }
      }
   }
   
   // 2. Procesar cada deal recuperando su historial completo por posición
   for(int i = 0; i < pendingCount; i++)
   {
      ulong ticket = pendingDetails[i].ticket;
      long positionId = pendingDetails[i].positionId;
      
      if(HistorySelectByPosition(positionId))
      {
         double openPrice = 0;
         datetime openTime = 0;
         
         // Buscar el deal de entrada
         int posDealsCount = HistoryDealsTotal();
         for(int k = 0; k < posDealsCount; k++)
         {
             ulong t = HistoryDealGetTicket(k);
             if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN)
             {
                 openPrice = HistoryDealGetDouble(t, DEAL_PRICE);
                 openTime = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
                 break;
             }
         }
         
         // Obtener datos del deal de salida
         string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
         int type = (int)HistoryDealGetInteger(ticket, DEAL_TYPE);
         double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
         double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
         double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         int magicNumber = (int)HistoryDealGetInteger(ticket, DEAL_MAGIC);
         string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
         
         // Fallback si no se encontró openTime
         if(openTime == 0) openTime = closeTime - 60;
         
         Log("Trade cerrado: #" + IntegerToString((int)ticket) + " " + symbol + " Profit: " + DoubleToString(profit, 2));
         
         // Enviar al servidor
         SendTradeClosed(ticket, symbol, type, volume, openPrice, closePrice, profit, swap, commission, openTime, closeTime, magicNumber, comment);
      }
   }
}

//+------------------------------------------------------------------+
//| Envía notificación de trade cerrado                              |
//+------------------------------------------------------------------+
void SendTradeClosed(ulong ticket, string symbol, int type, double volume,
                     double openPrice, double closePrice, double profit, double swap, double commission,
                     datetime openTime, datetime closeTime, int magicNumber, string comment)
{
   string json = "{";
   json += "\"msg_type\":\"trade_closed\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"timestamp\":" + IntegerToString(GetTickCount64()) + ",";
   json += "\"trade\":{";
   json += "\"ticket\":" + IntegerToString((int)ticket) + ",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"type\":\"" + (type == DEAL_TYPE_BUY ? "buy" : "sell") + "\",";
   json += "\"volume\":" + DoubleToString(volume, 2) + ",";
   json += "\"open_price\":" + DoubleToString(openPrice, 5) + ",";
   json += "\"close_price\":" + DoubleToString(closePrice, 5) + ",";
   json += "\"sl\":0,";
   json += "\"tp\":0,";
   json += "\"profit\":" + DoubleToString(profit, 2) + ",";
   json += "\"swap\":" + DoubleToString(swap, 2) + ",";
   json += "\"commission\":" + DoubleToString(commission, 2) + ",";
   json += "\"open_time\":" + IntegerToString((long)openTime * 1000) + ",";
   json += "\"close_time\":" + IntegerToString((long)closeTime * 1000) + ",";
   json += "\"magic_number\":" + IntegerToString(magicNumber) + ",";
   json += "\"comment\":\"" + EscapeJSON(comment) + "\"";
   json += "}";
   json += "}";
   
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
      CloseAllPositions();
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
         Log("Comando recibido: CERRAR POSICIÓN #" + IntegerToString(ticket));
         ClosePositionByTicket(ticket);
      }
      
      ticketPos = StringFind(response, "\"ticket\":", ticketPos + 1);
   }
}

//+------------------------------------------------------------------+
//| Cerrar todas las posiciones abiertas                              |
//+------------------------------------------------------------------+
void CloseAllPositions()
{
   int total = PositionsTotal();
   Log("Cerrando " + IntegerToString(total) + " posiciones...");
   
   // Cerrar de atrás hacia adelante para evitar problemas de índice
   for(int i = total - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
      {
         ClosePositionByTicket((int)ticket);
      }
   }
}

//+------------------------------------------------------------------+
//| Cerrar una posición por su ticket                                 |
//+------------------------------------------------------------------+
bool ClosePositionByTicket(int ticket)
{
   if(!PositionSelectByTicket(ticket))
   {
      Log("ERROR: No se encontró la posición #" + IntegerToString(ticket));
      return false;
   }
   
   string symbol = PositionGetString(POSITION_SYMBOL);
   double volume = PositionGetDouble(POSITION_VOLUME);
   ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   
   MqlTradeRequest request = {};
   MqlTradeResult result = {};
   
   request.action = TRADE_ACTION_DEAL;
   request.position = ticket;
   request.symbol = symbol;
   request.volume = volume;
   request.deviation = 20;
   request.magic = 0;
   
   // Tipo opuesto para cerrar
   if(posType == POSITION_TYPE_BUY)
   {
      request.type = ORDER_TYPE_SELL;
      request.price = SymbolInfoDouble(symbol, SYMBOL_BID);
   }
   else
   {
      request.type = ORDER_TYPE_BUY;
      request.price = SymbolInfoDouble(symbol, SYMBOL_ASK);
   }
   
   if(!OrderSend(request, result))
   {
      Log("ERROR al cerrar #" + IntegerToString(ticket) + ": " + IntegerToString((int)result.retcode));
      return false;
   }
   
   if(result.retcode == TRADE_RETCODE_DONE)
   {
      Log("Posición #" + IntegerToString(ticket) + " cerrada exitosamente");
      return true;
   }
   
   Log("Resultado cierre: " + IntegerToString((int)result.retcode));
   return false;
}

//+------------------------------------------------------------------+
//| Enviar historial completo de trades al servidor                   |
//+------------------------------------------------------------------+
void SendHistorySync()
{
   // Seleccionar historial completo (últimos 365 días)
   datetime fromTime = TimeCurrent() - 365 * 24 * 60 * 60;
   
   if(!HistorySelect(fromTime, TimeCurrent()))
   {
      Log("ERROR: No se pudo seleccionar historial");
      return;
   }
   
   int totalDeals = HistoryDealsTotal();
   Log("Sincronizando " + IntegerToString(totalDeals) + " deals del historial...");
   
   // Construir JSON con todos los trades
   string json = "{";
   json += "\"msg_type\":\"sync_history\",";
   json += "\"token\":\"" + InpConnectionToken + "\",";
   json += "\"trades\":[";
   
   int tradesCount = 0;
   
   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0) continue;
      
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      
      // Solo procesar deals de salida (trades cerrados)
      if(entry != DEAL_ENTRY_OUT) continue;
      
      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      if(StringLen(symbol) == 0) continue;
      
      if(tradesCount > 0) json += ",";
      
      int type = (int)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      int magicNumber = (int)HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
      string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
      
      // Buscar el deal de entrada correspondiente para obtener el precio de apertura
      double openPrice = 0;
      datetime openTime = dealTime - 3600; // Aproximación por defecto
      
      // Buscar el position ID para encontrar el deal de entrada
      long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      if(positionId > 0)
      {
         for(int j = 0; j < i; j++)
         {
            ulong entryTicket = HistoryDealGetTicket(j);
            if(HistoryDealGetInteger(entryTicket, DEAL_POSITION_ID) == positionId &&
               (ENUM_DEAL_ENTRY)HistoryDealGetInteger(entryTicket, DEAL_ENTRY) == DEAL_ENTRY_IN)
            {
               openPrice = HistoryDealGetDouble(entryTicket, DEAL_PRICE);
               openTime = (datetime)HistoryDealGetInteger(entryTicket, DEAL_TIME);
               break;
            }
         }
      }
      
      json += "{";
      json += "\"ticket\":" + IntegerToString((int)dealTicket) + ",";
      json += "\"symbol\":\"" + symbol + "\",";
      json += "\"type\":\"" + (type == DEAL_TYPE_BUY ? "buy" : "sell") + "\",";
      json += "\"volume\":" + DoubleToString(volume, 2) + ",";
      json += "\"open_price\":" + DoubleToString(openPrice, 5) + ",";
      json += "\"close_price\":" + DoubleToString(price, 5) + ",";
      json += "\"sl\":0,";
      json += "\"tp\":0,";
      json += "\"profit\":" + DoubleToString(profit, 2) + ",";
      json += "\"swap\":" + DoubleToString(swap, 2) + ",";
      json += "\"commission\":" + DoubleToString(commission, 2) + ",";
      json += "\"open_time\":" + IntegerToString((long)openTime * 1000) + ",";
      json += "\"close_time\":" + IntegerToString((long)dealTime * 1000) + ",";
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

