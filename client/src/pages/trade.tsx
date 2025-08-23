import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, TrendingUp, TrendingDown, MoreHorizontal, Bot } from 'lucide-react';


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

  // Mock order book data based on current price
  const basePrice = currentMarket ? parseFloat(currentMarket.price) : 113554;
  const orderBook = {
    asks: [
      { price: (basePrice + 2).toFixed(1), quantity: '24.03K' },
      { price: (basePrice + 1.5).toFixed(1), quantity: '39.57K' },
      { price: (basePrice + 1).toFixed(1), quantity: '260.01K' },
      { price: (basePrice + 0.5).toFixed(1), quantity: '795.0000' },
      { price: (basePrice + 0.3).toFixed(1), quantity: '245.83K' },
      { price: (basePrice + 0.1).toFixed(1), quantity: '455.0000' },
      { price: (basePrice - 0.1).toFixed(1), quantity: '3.75M' },
    ],
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentPair}</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="text-sm text-muted-foreground">
              Perpetual <span className="text-red-500">{change24h}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">0.00%</div>
            </div>
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-bot-trading">
                <Bot className="h-4 w-4" />
                Bot
              </Button>
            </Link>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-muted rounded"></div>
              <MoreHorizontal className="h-5 w-5" />
            </div>
          </div>
        </div>
        

      </div>

      <div className="flex">
        {/* Left Side - Order Book */}
        <div className="flex-1 border-r border-border">
          {/* Order Book Header */}
          <div className="flex items-center justify-between p-3 text-xs text-muted-foreground border-b border-border">
            <span>Price (USDT)</span>
            <span>Quantity (USDT)</span>
          </div>

          {/* Asks (Red) */}
          <div className="space-y-0">
            {orderBook.asks.reverse().map((ask, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-1 text-xs hover:bg-muted/50">
                <span className="text-red-500">{ask.price}</span>
                <span className="text-muted-foreground">{ask.quantity}</span>
              </div>
            ))}
          </div>

          {/* Current Price */}
          <div className="flex items-center justify-center py-2 border-y border-border">
            <div className="text-lg font-bold text-green-500">{currentPrice}</div>
            <TrendingUp className="h-4 w-4 ml-2 text-green-500" />
          </div>

          {/* Bids (Green) */}
          <div className="space-y-0">
            {orderBook.bids.map((bid, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-1 text-xs hover:bg-muted/50">
                <span className="text-green-500">{bid.price}</span>
                <span className="text-muted-foreground">{bid.quantity}</span>
              </div>
            ))}
          </div>

          {/* Volume Indicator */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary">B 29%</span>
              <div className="flex-1 mx-2 h-1 bg-muted rounded">
                <div className="w-3/10 h-full bg-primary rounded"></div>
              </div>
              <span className="text-destructive">71% S</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="w-2 h-2 bg-primary rounded"></div>
              <span className="text-lg font-bold">0.1</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Right Side - Trading Form */}
        <div className="w-80">
          {/* Trading Tabs */}
          <div className="flex border-b border-border">
            <button className="flex-1 px-4 py-3 text-sm bg-muted text-foreground border-b-2 border-primary">
              Cross
            </button>
            <button className="flex-1 px-4 py-3 text-sm text-muted-foreground">
              {leverage}x
            </button>
            <button className="flex-1 px-4 py-3 text-sm text-muted-foreground">
              S
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex border-b border-border">
            <button 
              className={`flex-1 px-4 py-3 text-sm ${activeTab === 'open' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('open')}
            >
              Open
            </button>
            <button 
              className={`flex-1 px-4 py-3 text-sm ${activeTab === 'close' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('close')}
            >
              Close
            </button>
          </div>

          {/* Order Form */}
          <div className="p-4 space-y-4">
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

      {/* Bottom Tabs */}
      <div className="border-t border-gray-800">
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-none">
            <TabsTrigger value="positions" className="text-xs text-gray-400 data-[state=active]:text-white">
              Positions(0)
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs text-gray-400 data-[state=active]:text-white">
              Orders(0)
            </TabsTrigger>
            <TabsTrigger value="bots" className="text-xs text-gray-400 data-[state=active]:text-white">
              Bots (1)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="positions" className="p-4">
            <div className="text-center text-gray-400 py-8">
              <div>No open positions</div>
            </div>
          </TabsContent>
          
          <TabsContent value="orders" className="p-4">
            <div className="text-center text-gray-400 py-8">
              <div>No open orders</div>
            </div>
          </TabsContent>
          
          <TabsContent value="bots" className="p-4">
            <div className="text-center text-gray-400 py-8">
              <div>1 active bot</div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}