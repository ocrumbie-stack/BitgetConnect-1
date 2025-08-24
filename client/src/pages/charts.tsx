import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Clock } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

export function Charts() {
  const [, setLocation] = useLocation();
  const { data } = useBitgetData();
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1H');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Get current pair data
  const currentPairData = data?.find(item => item.symbol === selectedPair);
  const currentPrice = currentPairData?.price || '0';
  const change24h = currentPairData?.change24h || '0';
  const volume24h = currentPairData?.volume24h || '0';

  // Get pair from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pairParam = urlParams.get('pair');
    if (pairParam) {
      setSelectedPair(pairParam);
    }
  }, []);

  // Initialize TradingView widget
  useEffect(() => {
    if (chartContainerRef.current && typeof window !== 'undefined') {
      // Clear any existing widget
      chartContainerRef.current.innerHTML = '';
      
      // Create script element
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      
      // Convert timeframe format
      const tvTimeframe = timeframe === '1M' ? '1' : 
                         timeframe === '5M' ? '5' : 
                         timeframe === '15M' ? '15' : 
                         timeframe === '1H' ? '60' : 
                         timeframe === '4H' ? '240' : 
                         timeframe === '1D' ? '1D' : '60';
      
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": `BITGET:${selectedPair}`,
        "interval": tvTimeframe,
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "rgba(19, 23, 34, 1)",
        "gridColor": "rgba(42, 46, 57, 0.06)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "allow_symbol_change": false,
        "calendar": false,
        "support_host": "https://tradingview.com",
        "container_id": "tradingview_chart",
        "studies": [
          {
            "id": "RSI@tv-basicstudies", 
            "inputs": {
              "length": 14
            }
          },
          {
            "id": "MACD@tv-basicstudies",
            "inputs": {
              "fastlength": 12,
              "slowlength": 26,
              "signallength": 9
            }
          },
          {
            "id": "MAExp@tv-basicstudies",
            "inputs": {
              "length": 20
            }
          },
          {
            "id": "MAExp@tv-basicstudies",
            "inputs": {
              "length": 50
            }
          },
          {
            "id": "MAExp@tv-basicstudies", 
            "inputs": {
              "length": 200
            }
          }
        ],
        "toolbar_bg": "#131722",
        "overrides": {
          "mainSeriesProperties.candleStyle.upColor": "#089981",
          "mainSeriesProperties.candleStyle.downColor": "#f23645",
          "mainSeriesProperties.candleStyle.borderUpColor": "#089981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#f23645",
          "mainSeriesProperties.candleStyle.wickUpColor": "#089981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f23645",
          "paneProperties.background": "#131722",
          "paneProperties.gridProperties.color": "#2B2B43"
        },
        "studies_overrides": {
          "rsi.paneSize": "small",
          "macd.paneSize": "small"
        }
      });
      
      chartContainerRef.current.appendChild(script);
    }
  }, [selectedPair, timeframe]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <BackButton />
      
      {/* TradingView Chart - Full Extent */}
      <div 
        ref={chartContainerRef}
        className="h-[500px] w-full bg-[#131722] rounded-none border-l-0 border-r-0"
        id="tradingview_chart"
      />

      {/* Market Stats */}
      <div className="space-y-3">
        <div className="grid grid-cols-2">
          <Card className="rounded-none border-l-0 border-r-0 border-t-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Volume2 className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-medium">24h Volume</span>
              </div>
              <div className="text-sm font-bold">${volume24h}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none border-l-0 border-r-0 border-t-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium">Timeframe</span>
              </div>
              <div className="text-sm font-bold">{timeframe}</div>
            </CardContent>
          </Card>
        </div>

        {/* Technical Indicators */}
        <Card className="rounded-none border-l-0 border-r-0 border-t-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Technical Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex justify-between items-center">
              <span className="text-xs">RSI (14)</span>
              <Badge variant="outline" className="text-xs">45.2</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs">MACD</span>
              <Badge variant="outline" className="text-green-600 text-xs">Bullish</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs">MA (20)</span>
              <Badge variant="outline" className="text-xs">${(parseFloat(currentPrice) * 0.98).toFixed(2)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs">Volume Trend</span>
              <Badge variant="outline" className="text-blue-600 text-xs">Increasing</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2">
          <Button 
            onClick={() => setLocation(`/trade?pair=${selectedPair}`)}
            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-none"
          >
            Trade {selectedPair}
          </Button>
          <Button 
            onClick={() => setLocation(`/analyzer?pair=${selectedPair}&autoFill=true`)}
            variant="outline"
            className="h-8 text-xs rounded-none"
          >
            Analyze Pair
          </Button>
        </div>
      </div>
    </div>
  );
}