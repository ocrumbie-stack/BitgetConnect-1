import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Volume2, Clock, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PriceData {
  time: string;
  price: number;
  volume?: number;
}

export function Charts() {
  const [, setLocation] = useLocation();
  const { data } = useBitgetData();
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1H');
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch Moralis price data
  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true);
      try {
        // For demo purposes, generating realistic price data
        // Replace with actual Moralis API call once configured
        const generateData = () => {
          const data = [];
          const now = Date.now();
          const basePrice = parseFloat(currentPrice) || 114000;
          
          const intervals = timeframe === '1M' ? 60 : 
                           timeframe === '5M' ? 12 : 
                           timeframe === '15M' ? 4 : 
                           timeframe === '1H' ? 24 : 
                           timeframe === '4H' ? 6 : 7;
          
          const stepMs = timeframe === '1M' ? 60000 : 
                        timeframe === '5M' ? 300000 : 
                        timeframe === '15M' ? 900000 : 
                        timeframe === '1H' ? 3600000 : 
                        timeframe === '4H' ? 14400000 : 86400000;
          
          for (let i = intervals; i >= 0; i--) {
            const time = new Date(now - (i * stepMs));
            const volatility = Math.random() * 0.02 - 0.01; // ±1% volatility
            const price = basePrice * (1 + volatility * i * 0.1);
            
            data.push({
              time: time.toISOString(),
              price: Number(price.toFixed(2)),
              volume: Math.random() * 1000000 + 500000
            });
          }
          return data;
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setChartData(generateData());
      } catch (error) {
        console.error('Error fetching price data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
  }, [selectedPair, timeframe, currentPrice]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
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

      {/* Moralis Custom Chart - Full Extent */}
      <div className="h-[500px] w-full bg-[#131722] rounded-none border-l-0 border-r-0 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
                stroke="#9ca3af"
                fontSize={10}
              />
              <YAxis 
                domain={['dataMin - 100', 'dataMax + 100']}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                stroke="#9ca3af"
                fontSize={10}
              />
              <Tooltip 
                labelFormatter={(time) => new Date(time).toLocaleString()}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#f9fafb'
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
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