import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, TrendingUp, TrendingDown, MoreHorizontal, Bot, BarChart3, Activity } from 'lucide-react';


export function Trade() {
  const { data } = useBitgetData();
  const [leverage, setLeverage] = useState('10');
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  const [orderType, setOrderType] = useState('market');
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

  // Memoized order book data to prevent re-calculations
  const orderBook = useMemo(() => {
    const basePrice = currentMarket ? parseFloat(currentMarket.price) : 113554;
    return {
      asks: [
        { price: (basePrice + 2).toFixed(1), quantity: '24.03K' },
        { price: (basePrice + 1.5).toFixed(1), quantity: '39.57K' },
        { price: (basePrice + 1).toFixed(1), quantity: '260.01K' },
        { price: (basePrice + 0.5).toFixed(1), quantity: '795.0000' },
        { price: (basePrice + 0.3).toFixed(1), quantity: '245.83K' },
        { price: (basePrice + 0.1).toFixed(1), quantity: '455.0000' },
        { price: (basePrice - 0.1).toFixed(1), quantity: '3.75M' },
      ].reverse(), // Pre-reverse to avoid mutating on render
      bids: [
        { price: (basePrice - 0.3).toFixed(1), quantity: '978.30K' },
        { price: (basePrice - 0.5).toFixed(1), quantity: '1.14K' },
        { price: (basePrice - 1).toFixed(1), quantity: '262.27K' },
        { price: (basePrice - 1.5).toFixed(1), quantity: '2.96K' },
        { price: (basePrice - 2).toFixed(1), quantity: '511.39K' },
        { price: (basePrice - 2.5).toFixed(1), quantity: '245.83K' },
        { price: (basePrice - 3).toFixed(1), quantity: '455.0000' },
      ]
    };
  }, [currentMarket]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{currentPair}</span>
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="text-sm text-muted-foreground">
                Perpetual Futures
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold">{currentPrice}</div>
                <div className={`text-sm ${parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(change24h) >= 0 ? '+' : ''}{change24h}%
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-bot-trading">
                <Bot className="h-4 w-4" />
                Bot Trading
              </Button>
            </Link>
            <MoreHorizontal className="h-5 w-5" />
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground">24h High</div>
            <div className="text-sm font-medium">{(parseFloat(currentPrice.replace(/,/g, '')) * 1.02).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">24h Low</div>
            <div className="text-sm font-medium">{(parseFloat(currentPrice.replace(/,/g, '')) * 0.98).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">24h Volume</div>
            <div className="text-sm font-medium">{currentMarket ? parseFloat(currentMarket.volume24h || '0').toLocaleString() : '0'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Open Interest</div>
            <div className="text-sm font-medium">245.2M</div>
          </div>
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="p-4 space-y-4">
        {/* Trading Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Order Book Card */}
          <div className="lg:col-span-1 bg-card border border-border rounded-lg">
            <div className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Order Book
              </h3>
              
              {/* Order Book Header */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Price (USDT)</span>
                <span>Size</span>
              </div>

              {/* Asks (Red) */}
              <div className="space-y-0 mb-2">
                {orderBook.asks.slice(0, 6).map((ask, index) => (
                  <div key={index} className="flex items-center justify-between py-1 text-xs hover:bg-muted/30 rounded px-1">
                    <span className="text-red-500 font-mono">{ask.price}</span>
                    <span className="text-muted-foreground">{ask.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Current Price */}
              <div className="flex items-center justify-center py-2 border border-border rounded-md bg-muted/20 mb-2">
                <div className="text-base font-bold text-green-500">{currentPrice}</div>
                <TrendingUp className="h-3 w-3 ml-2 text-green-500" />
              </div>

              {/* Bids (Green) */}
              <div className="space-y-0">
                {orderBook.bids.slice(0, 6).map((bid, index) => (
                  <div key={index} className="flex items-center justify-between py-1 text-xs hover:bg-muted/30 rounded px-1">
                    <span className="text-green-500 font-mono">{bid.price}</span>
                    <span className="text-muted-foreground">{bid.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Price Chart Placeholder */}
          <div className="lg:col-span-1 bg-card border border-border rounded-lg">
            <div className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Price Chart
              </h3>
              <div className="h-64 bg-muted/20 rounded-md flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>Chart will be implemented</p>
                  <p className="text-xs">Real-time price data available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Form Card */}
          <div className="lg:col-span-1 bg-card border border-border rounded-lg">
            <div className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Quick Trade
              </h3>

              {/* Buy/Sell Tabs */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button className="py-2 px-4 bg-green-500/10 border border-green-500/20 rounded-md text-green-500 font-medium hover:bg-green-500/20 transition-colors">
                  Buy / Long
                </button>
                <button className="py-2 px-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 font-medium hover:bg-red-500/20 transition-colors">
                  Sell / Short
                </button>
              </div>

              {/* Trading Form */}
              <div className="space-y-4">
            {/* Order Type Selector */}
            <div className="relative">
              <button className="w-full flex items-center justify-between p-3 bg-muted rounded text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span>Market</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Price Input (for limit orders) */}
            <div>
              <Input
                placeholder="Fill at market price"
                className="bg-muted border-border text-foreground placeholder-muted-foreground"
                disabled
              />
            </div>

            {/* Cost Input */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Cost (USDT)</div>
              <div className="relative">
                <Input
                  placeholder="25%"
                  className="bg-muted border-border text-foreground"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  ≈0.00 / 0.00 BTC
                </div>
              </div>
            </div>

            {/* Percentage Buttons */}
            <div className="flex gap-2">
              {['25%', '50%', '75%', '100%'].map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  className={`flex-1 border-gray-700 text-gray-400 hover:bg-gray-800 ${
                    percent === '25%' ? 'bg-gray-800 text-white' : ''
                  }`}
                  onClick={() => {
                    // Mock calculation based on percentage
                    const mockBalance = 1000;
                    const percentage = parseFloat(percent) / 100;
                    setAmount((mockBalance * percentage).toString());
                  }}
                >
                  {percent}
                </Button>
              ))}
            </div>

            {/* TP/SL Toggle */}
            <div className="flex items-center gap-2">
              <Switch />
              <span className="text-sm text-gray-400">TP/SL</span>
            </div>

            {/* Long Button */}
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-medium py-4 flex flex-col">
              <span>Open long</span>
              <span className="text-xs opacity-70">0.00 USDT</span>
            </Button>

            {/* Short Button */}
            <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-4 flex flex-col">
              <span>Open short</span>
              <span className="text-xs opacity-70">0.00 USDT</span>
            </Button>
          </div>
        </div>
      </div>

        </div>
      </div>

      {/* Bottom Trading Activity */}
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