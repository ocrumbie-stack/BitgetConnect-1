import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useCandlestickData } from '@/hooks/useCandlestickData';
import { CandlestickChart } from '@/components/CandlestickChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Volume2, Clock } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

export function Charts() {
  const [, setLocation] = useLocation();
  const { data } = useBitgetData();
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1H');
  const [chartType, setChartType] = useState<'native' | 'tradingview'>('native');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Map timeframe to Bitget granularity
  const getGranularity = (tf: string) => {
    switch (tf) {
      case '1M': return '1m';
      case '5M': return '5m';
      case '15M': return '15m';
      case '1H': return '1H';
      case '4H': return '4H';
      case '1D': return '1D';
      default: return '1H';
    }
  };

  // Fetch candlestick data
  const { data: candlestickData, isLoading: chartLoading } = useCandlestickData({
    symbol: selectedPair,
    granularity: getGranularity(timeframe),
    limit: 200,
    enabled: chartType === 'native'
  });

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
    if (chartContainerRef.current && typeof window !== 'undefined' && chartType === 'tradingview') {
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
        "withdateranges": true,
        "range": "1D",
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "show_popup_button": true,
        "popup_width": "1200",
        "popup_height": "700",
        "backgroundColor": "rgba(19, 23, 34, 1)",
        "gridColor": "rgba(42, 46, 57, 0.06)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": true,
        "calendar": true,
        "enable_publishing": true,
        "details": true,
        "hotlist": true,
        "container_id": "tradingview_chart",
        "studies": [
          "Volume@tv-basicstudies",
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies"
        ],
        "toolbar_bg": "#131722",
        "hide_volume": false,
        "overrides": {
          "mainSeriesProperties.candleStyle.upColor": "#089981",
          "mainSeriesProperties.candleStyle.downColor": "#f23645",
          "mainSeriesProperties.candleStyle.borderUpColor": "#089981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#f23645",
          "mainSeriesProperties.candleStyle.wickUpColor": "#089981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f23645"
        }
      });
      
      chartContainerRef.current.appendChild(script);
    }
  }, [selectedPair, timeframe, chartType]);

  // Get current pair data
  const currentPairData = data?.find(item => item.symbol === selectedPair);
  const currentPrice = currentPairData?.price || '0';
  const change24h = currentPairData?.change24h || '0';
  const volume24h = currentPairData?.volume24h || '0';

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <BackButton />
      
      {/* Chart Controls */}
      <div className="p-2 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedPair}</span>
            <Badge variant={parseFloat(change24h) >= 0 ? 'default' : 'destructive'} className="text-xs">
              {parseFloat(change24h) >= 0 ? '+' : ''}{change24h}%
            </Badge>
            <span className="text-sm font-bold">${currentPrice}</span>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-20 h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1M">1M</SelectItem>
              <SelectItem value="5M">5M</SelectItem>
              <SelectItem value="15M">15M</SelectItem>
              <SelectItem value="1H">1H</SelectItem>
              <SelectItem value="4H">4H</SelectItem>
              <SelectItem value="1D">1D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs value={chartType} onValueChange={(value) => setChartType(value as 'native' | 'tradingview')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="native">Bitget Chart</TabsTrigger>
            <TabsTrigger value="tradingview">TradingView</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chart Container */}
      <div className="h-[500px] w-full bg-[#131722]">
        {chartType === 'native' ? (
          <div className="h-full w-full">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white">Loading chart data...</div>
              </div>
            ) : candlestickData && candlestickData.length > 0 ? (
              <CandlestickChart 
                data={candlestickData} 
                symbol={selectedPair}
                className="h-full w-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-white">No chart data available</div>
              </div>
            )}
          </div>
        ) : (
          <div 
            ref={chartContainerRef}
            className="h-full w-full"
            id="tradingview_chart"
          />
        )}
      </div>

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
        <div className="grid grid-cols-3 gap-1">
          <Button 
            onClick={() => setLocation(`/trade?pair=${selectedPair}`)}
            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-none"
          >
            Trade
          </Button>
          <Button 
            onClick={() => setLocation(`/analyzer?pair=${selectedPair}&autoFill=true`)}
            variant="outline"
            className="h-8 text-xs rounded-none"
          >
            Analyze
          </Button>
          <Button 
            onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=BITGET:${selectedPair}`, '_blank')}
            variant="outline"
            className="h-8 text-xs rounded-none bg-green-600 hover:bg-green-700 text-white"
          >
            TradingView
          </Button>
        </div>
      </div>
    </div>
  );
}