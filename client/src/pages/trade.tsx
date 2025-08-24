import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, TrendingUp, MoreHorizontal, Bot, Wallet, Settings, TrendingDown, Activity, Shield, Target } from 'lucide-react';

export function Trade() {
  const { data } = useBitgetData();
  const [leverage, setLeverage] = useState('10');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [tpslEnabled, setTpslEnabled] = useState(false);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [currentPair, setCurrentPair] = useState('BTCUSDT');

  // Get trading pair from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pair = urlParams.get('pair');
    if (pair) {
      setCurrentPair(pair);
    }
  }, []);

  // Get current market data for selected pair
  const currentMarket = data?.find(item => item.symbol === currentPair);
  const currentPrice = currentMarket ? parseFloat(currentMarket.price).toLocaleString('en-US', { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  }) : '113,554.2';
  const change24h = currentMarket ? (parseFloat(currentMarket.change24h || '0') * 100).toFixed(2) : '-1.70';

  // Mock available balance
  const availableBalance = 5000.00;

  // Mock market analysis data
  const marketAnalysis = {
    marketStrength: 72, // 0-100
    pairStrength: 85,   // 0-100
    volatility: 45,     // 0-100
    trendDirection: 'bullish', // bullish, bearish, neutral
    support: (parseFloat(currentPrice.replace(/,/g, '')) * 0.98).toFixed(1),
    resistance: (parseFloat(currentPrice.replace(/,/g, '')) * 1.02).toFixed(1),
    momentum: 'strong', // weak, moderate, strong
    volume: 'high'      // low, medium, high
  };

  const handlePercentageClick = (percentage: string) => {
    const percent = parseFloat(percentage) / 100;
    const calculatedAmount = (availableBalance * percent).toFixed(2);
    setAmount(calculatedAmount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Ultra Compact Header */}
      <div className="p-2 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold">{currentPair}</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
                <div className={`text-xs ${parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(change24h) >= 0 ? '+' : ''}{change24h}%
                </div>
              </div>
              <div>
                <div className="text-sm font-bold">${currentPrice}</div>
                <div className="text-xs text-muted-foreground">Vol: $2.4B</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-1 h-6 px-2" data-testid="button-bot-trading">
                <Bot className="h-3 w-3" />
                Bot
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Layout: Trading Form + Analysis Panel */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Compact Trading Form */}
        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          {/* Leverage */}
          <Select value={leverage} onValueChange={setLeverage}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Leverage: Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5x</SelectItem>
              <SelectItem value="10">10x</SelectItem>
              <SelectItem value="20">20x</SelectItem>
              <SelectItem value="50">50x</SelectItem>
              <SelectItem value="100">100x</SelectItem>
            </SelectContent>
          </Select>

          {/* Order Type */}
          <div className="flex gap-2">
            <Button 
              variant={orderType === 'market' ? 'default' : 'outline'}
              onClick={() => setOrderType('market')}
              size="sm"
              className="flex-1 text-sm h-8"
            >
              Market
            </Button>
            <Button 
              variant={orderType === 'limit' ? 'default' : 'outline'}
              onClick={() => setOrderType('limit')}
              size="sm"
              className="flex-1 text-sm h-8"
            >
              Limit
            </Button>
          </div>

          {/* Price Input */}
          {orderType === 'limit' ? (
            <div className="border rounded p-3">
              <Input
                placeholder={`Limit price: ${currentPrice}`}
                className="h-10 text-sm border-0 shadow-none"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
              />
            </div>
          ) : (
            <div className="border rounded p-3 bg-muted/50">
              <div className="text-sm text-muted-foreground">Fill at market price</div>
            </div>
          )}

          {/* Amount Input */}
          <div className="border rounded p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter amount"
                  className="h-8 text-sm border-0 shadow-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="text-sm font-medium">USDT</div>
            </div>
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-1">
            {['25%', '50%', '75%', '100%'].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                onClick={() => handlePercentageClick(percent)}
                className="text-xs h-6"
              >
                {percent}
              </Button>
            ))}
          </div>

          {/* TP/SL */}
          <div className="flex items-center gap-2 p-1">
            <Switch 
              checked={tpslEnabled}
              onCheckedChange={setTpslEnabled}
            />
            <span className="text-sm">TP/SL</span>
            {tpslEnabled && (
              <div className="flex gap-2 ml-auto">
                <Input
                  placeholder="TP"
                  className="h-7 w-20 text-xs"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
                <Input
                  placeholder="SL"
                  className="h-7 w-20 text-xs"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Available */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Wallet className="h-3 w-3" />
            <span>Available: ${availableBalance.toLocaleString()}</span>
          </div>


          {/* Trading Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button className="bg-green-500 hover:bg-green-600 text-white py-3 text-sm font-semibold">
              Long
            </Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white py-3 text-sm font-semibold">
              Short
            </Button>
          </div>
        </div>

        {/* Right: Market Analysis Panel */}
        <div className="w-48 border-l border-border bg-card/50 p-2 space-y-2">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Market Analysis
          </h3>

          {/* Market Strength */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Market Strength</span>
              <span className="font-medium">{marketAnalysis.marketStrength}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${marketAnalysis.marketStrength > 70 ? 'bg-green-500' : marketAnalysis.marketStrength > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${marketAnalysis.marketStrength}%` }}
              ></div>
            </div>
          </div>

          {/* Pair Strength */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pair Strength</span>
              <span className="font-medium">{marketAnalysis.pairStrength}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${marketAnalysis.pairStrength > 70 ? 'bg-green-500' : marketAnalysis.pairStrength > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${marketAnalysis.pairStrength}%` }}
              ></div>
            </div>
          </div>

          {/* Trend Direction */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Trend</span>
            <div className="flex items-center gap-1">
              {marketAnalysis.trendDirection === 'bullish' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : marketAnalysis.trendDirection === 'bearish' ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : (
                <Activity className="h-3 w-3 text-yellow-500" />
              )}
              <span className={`capitalize ${
                marketAnalysis.trendDirection === 'bullish' ? 'text-green-500' : 
                marketAnalysis.trendDirection === 'bearish' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {marketAnalysis.trendDirection}
              </span>
            </div>
          </div>

          {/* Support & Resistance */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3 text-blue-500" />
              <span className="text-muted-foreground">Support/Resistance</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-red-500">Resistance:</span>
                <span>${marketAnalysis.resistance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500">Support:</span>
                <span>${marketAnalysis.support}</span>
              </div>
            </div>
          </div>

          {/* Volatility */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Volatility</span>
              <span className="font-medium">{marketAnalysis.volatility}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${marketAnalysis.volatility > 60 ? 'bg-red-500' : marketAnalysis.volatility > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${marketAnalysis.volatility}%` }}
              ></div>
            </div>
          </div>

          {/* Momentum & Volume */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Momentum:</span>
              <span className={`capitalize ${
                marketAnalysis.momentum === 'strong' ? 'text-green-500' : 
                marketAnalysis.momentum === 'moderate' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {marketAnalysis.momentum}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume:</span>
              <span className={`capitalize ${
                marketAnalysis.volume === 'high' ? 'text-green-500' : 
                marketAnalysis.volume === 'medium' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {marketAnalysis.volume}
              </span>
            </div>
          </div>

          {/* Quick Signals */}
          <div className="border-t border-border pt-2">
            <div className="text-xs font-medium mb-1 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Signals
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>RSI Oversold</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>MACD Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Volume Rising</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="border-t border-border bg-card">
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-none">
            <TabsTrigger value="positions" className="text-xs text-muted-foreground data-[state=active]:text-foreground">
              Positions(0)
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs text-muted-foreground data-[state=active]:text-foreground">
              Orders(0)
            </TabsTrigger>
            <TabsTrigger value="bots" className="text-xs text-muted-foreground data-[state=active]:text-foreground">
              Bots (1)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="positions" className="p-4">
            <div className="text-center text-muted-foreground py-8">
              <div>No open positions</div>
            </div>
          </TabsContent>
          
          <TabsContent value="orders" className="p-4">
            <div className="text-center text-muted-foreground py-8">
              <div>No open orders</div>
            </div>
          </TabsContent>
          
          <TabsContent value="bots" className="p-4">
            <div className="text-center text-muted-foreground py-8">
              <div>1 active bot</div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}