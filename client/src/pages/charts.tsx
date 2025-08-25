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
  
  // Simple EMA approximation for trend analysis
  const ema20Approx = parseFloat(currentPrice) * (1 + parseFloat(change24h) / 100 * 0.3);
  const ema50Approx = parseFloat(currentPrice) * (1 + parseFloat(change24h) / 100 * 0.1);
  const maTrend = ema20Approx > ema50Approx ? 'Bullish' : 'Bearish';
  
  // Volume analysis based on 24h change magnitude
  const volumeLevel = Math.abs(parseFloat(change24h)) > 2 ? 'High' : 'Low';
  const volumeColor = volumeLevel === 'High' ? 'text-green-600' : 'text-red-600';

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
        }
      });
      
      chartContainerRef.current.appendChild(script);
    }
  }, [selectedPair, timeframe]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-4 left-4 z-[99999] pointer-events-auto">
        <div className="bg-background/95 backdrop-blur-md rounded-lg border shadow-lg p-1">
          <BackButton />
        </div>
      </div>
      
      {/* TradingView Chart - Full Screen */}
      <div 
        ref={chartContainerRef}
        className="h-[calc(100vh-60px)] w-full bg-[#131722] rounded-none border-l-0 border-r-0"
        id="tradingview_chart"
      />

      {/* Quick Actions - Overlay Style */}
      <div className="fixed bottom-16 left-0 right-0 p-2 bg-background/90 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
          <Button 
            onClick={() => setLocation(`/trade?pair=${selectedPair}`)}
            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
            size="sm"
          >
            Trade {selectedPair}
          </Button>
          <Button 
            onClick={() => setLocation(`/analyzer?pair=${selectedPair}&autoFill=true`)}
            variant="outline"
            className="h-8 text-xs"
            size="sm"
          >
            Analyze
          </Button>
        </div>
      </div>
    </div>
  );
}