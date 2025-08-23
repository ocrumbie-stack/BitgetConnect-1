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
  const [activeTab, setActiveTab] = useState('buy');
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">{currentPair}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              Perpetual · <span className={`${parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{change24h}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">${currentPrice}</div>
              <div className="text-xs text-muted-foreground">Mark Price</div>
            </div>
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-bot-trading">
                <Bot className="h-4 w-4" />
                Bot
              </Button>
            </Link>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        

      </div>

      <div className="p-4">
        {/* Order Book */}
        <div className="mb-6">
          <div className="bg-card rounded-lg border">
            {/* Order Book Header */}
            <div className="flex items-center justify-between p-4 text-sm font-medium text-muted-foreground border-b">
              <span>Price (USDT)</span>
              <span>Quantity</span>
            </div>

            {/* Asks (Red) */}
            <div className="space-y-0">
              {orderBook.asks.reverse().map((ask, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-accent/50 transition-colors">
                  <span className="text-red-500 font-mono">{ask.price}</span>
                  <span className="text-muted-foreground">{ask.quantity}</span>
                </div>
              ))}
            </div>

            {/* Current Price */}
            <div className="flex items-center justify-center py-3 border-y bg-accent/30">
              <div className={`text-lg font-bold ${parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${currentPrice}
              </div>
              {parseFloat(change24h) >= 0 ? 
                <TrendingUp className="h-4 w-4 ml-2 text-green-500" /> : 
                <TrendingDown className="h-4 w-4 ml-2 text-red-500" />
              }
            </div>

            {/* Bids (Green) */}
            <div className="space-y-0">
              {orderBook.bids.map((bid, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-accent/50 transition-colors">
                  <span className="text-green-500 font-mono">{bid.price}</span>
                  <span className="text-muted-foreground">{bid.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        
        {/* Trading Interface */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Trade {currentPair}</h3>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className="text-green-600 data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900/20">
                Buy / Long
              </TabsTrigger>
              <TabsTrigger value="sell" className="text-red-600 data-[state=active]:bg-red-100 dark:data-[state=active]:bg-red-900/20">
                Sell / Short
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-4">
              {/* Order Type */}
              <div>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Order Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount (USDT)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Leverage */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Leverage</label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '5', '10', '20', '50', '100'].map((lev) => (
                      <SelectItem key={lev} value={lev}>{lev}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['25%', '50%', '75%', '100%'].map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const mockBalance = 1000;
                      const percentage = parseFloat(percent) / 100;
                      setAmount((mockBalance * percentage).toString());
                    }}
                  >
                    {percent}
                  </Button>
                ))}
              </div>

              {/* Buy Button */}
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3">
                Buy / Long {currentPair}
              </Button>
            </TabsContent>

            <TabsContent value="sell" className="space-y-4">
              {/* Order Type */}
              <div>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Order Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount (USDT)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Leverage */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Leverage</label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '5', '10', '20', '50', '100'].map((lev) => (
                      <SelectItem key={lev} value={lev}>{lev}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['25%', '50%', '75%', '100%'].map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const mockBalance = 1000;
                      const percentage = parseFloat(percent) / 100;
                      setAmount((mockBalance * percentage).toString());
                    }}
                  >
                    {percent}
                  </Button>
                ))}
              </div>

              {/* Sell Button */}
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3">
                Sell / Short {currentPair}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        
        {/* Positions & Orders */}
        <div className="bg-card rounded-lg border p-4 mt-6">
          <h3 className="text-lg font-semibold mb-4">Positions & Orders</h3>
          
          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="positions" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                No open positions
              </div>
            </TabsContent>
            
            <TabsContent value="orders" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                No active orders
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                No trading history
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}