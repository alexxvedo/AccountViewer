//+------------------------------------------------------------------+
//|                                              TestWebRequest.mq4  |
//| Test de WebRequest para diagnosticar problemas de conexión       |
//+------------------------------------------------------------------+
#property copyright "Test"
#property version   "1.00"
#property strict

int OnInit()
{
   Print("=== TEST WebRequest ===");
   
   // Test 1: URL pública conocida
   Print("Test 1: Conectando a httpbin.org...");
   TestURL("https://httpbin.org/post");
   
   // Test 2: localhost con http
   Print("Test 2: Conectando a localhost:3000...");
   TestURL("http://localhost:3000/api/ea/update");
   
   // Test 3: 127.0.0.1
   Print("Test 3: Conectando a 127.0.0.1:3000...");
   TestURL("http://127.0.0.1:3000/api/ea/update");
   
   return INIT_SUCCEEDED;
}

void TestURL(string url)
{
   string headers = "Content-Type: application/json\r\n";
   char post[], result[];
   string testData = "{\"test\":\"hello\"}";
   
   ArrayResize(post, StringToCharArray(testData, post, 0, WHOLE_ARRAY, CP_UTF8) - 1);
   
   ResetLastError();
   int res = WebRequest("POST", url, headers, 5000, post, result, headers);
   
   int err = GetLastError();
   
   if(res == -1)
   {
      Print("  FALLO - Error: ", err, " (", GetErrorDescription(err), ")");
   }
   else
   {
      Print("  OK - HTTP ", res);
   }
}

string GetErrorDescription(int error)
{
   switch(error)
   {
      case 4014: return "URL no en lista permitida";
      case 5200: return "Invalid URL / Connection failed";
      case 5201: return "Failed to connect";
      case 5202: return "Timeout";
      case 5203: return "HTTP error";
      default: return "Unknown error";
   }
}

void OnDeinit(const int reason)
{
   Print("=== FIN TEST ===");
}
//+------------------------------------------------------------------+
