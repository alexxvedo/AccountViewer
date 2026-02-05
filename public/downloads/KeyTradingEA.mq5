//+------------------------------------------------------------------+
//|                                                 KeyTradingEA.mq5 |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "Antigravity"
#property link      ""
#property version   "1.00"

#include <Trade/Trade.mqh>

input int      MagicNumber = 123;   // Magic Number
input double   LotSize     = 0.5;   // Lot Size

CTrade trade;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(MagicNumber);
   Print("KeyTradingEA Loaded. Press 'B' to Buy, 'V' to Sell.");
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
  }
//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
  }
//+------------------------------------------------------------------+
//| ChartEvent function                                              |
//+------------------------------------------------------------------+
void OnChartEvent(const int id,
                  const long &lparam,
                  const double &dparam,
                  const string &sparam)
  {
   if(id==CHARTEVENT_KEYDOWN)
     {
      // Convert key code to standard char to be safe or just check codes
      // 66 is 'B', 98 is 'b'
      // 86 is 'V', 118 is 'v'
      
      if(lparam == 66) // Key 'B'
        {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         if(trade.Buy(LotSize, NULL, ask, 0, 0, "Key Buy"))
           {
            Print("Buy Order Executed. Ticket: ", trade.ResultOrder());
           }
         else
           {
            Print("Buy Failed. Error: ", trade.ResultRetcode(), " - ", trade.ResultRetcodeDescription());
           }
        }
      
      if(lparam == 86) // Key 'V'
        {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         if(trade.Sell(LotSize, NULL, bid, 0, 0, "Key Sell"))
           {
            Print("Sell Order Executed. Ticket: ", trade.ResultOrder());
           }
         else
           {
            Print("Sell Failed. Error: ", trade.ResultRetcode(), " - ", trade.ResultRetcodeDescription());
           }
        }
     }
  }
