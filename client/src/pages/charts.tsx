import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Volume2, Clock } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

export function Charts() {
  const [, setLocation] = useLocation();
  const { data } = useBitgetData();
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1H');

  // Get pair from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pairParam = urlParams.get('pair');
    if (pairParam) {
      setSelectedPair(pairParam);
    }
  }, []);

  // Get current pair data
  const currentPairData = data?.find(item => item.symbol === selectedPair);
  const currentPrice = currentPairData?.price || '0';
  const change24h = currentPairData?.change24h || '0';
  const volume24h = currentPairData?.volume24h || '0';

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <BackButton />
      
      {/* Header */}
      <div className="p-2 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold">{selectedPair}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">${currentPrice}</span>
                <Badge variant={parseFloat(change24h) >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {parseFloat(change24h) >= 0 ? '+' : ''}{change24h}%
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-16 h-6 text-xs">
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
        </div>
      </div>

      {/* Chart Placeholder - Full Extent */}
      <Card className="h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-none border-l-0 border-r-0">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-2">Interactive Chart</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Advanced candlestick chart for {selectedPair} - {timeframe} timeframe
          </p>
          <div className="text-xs text-muted-foreground">
            Chart integration coming soon
          </div>
        </div>
      </Card>

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