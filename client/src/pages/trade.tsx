import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, TrendingUp, MoreHorizontal, Bot } from 'lucide-react';

export function Trade() {
  const { data } = useBitgetData();
  const [leverage, setLeverage] = useState('10');
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState('open');
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

  // Mock order book data
  const basePrice = currentMarket ? parseFloat(currentMarket.price) : 113554;
  const orderBook = {
    asks: [
      { price: (basePrice + 2).toFixed(1), quantity: '24.03K' },
      { price: (basePrice + 1.5).toFixed(1), quantity: '39.57K' },
      { price: (basePrice + 1).toFixed(1), quantity: '260.01K' },
      { price: (basePrice + 0.5).toFixed(1), quantity: '795.0000' },
      { price: (basePrice + 0.3).toFixed(1), quantity: '245.83K' },
    ],
    bids: [
      { price: (basePrice - 0.3).toFixed(1), quantity: '978.30K' },
      { price: (basePrice - 0.5).toFixed(1), quantity: '1.14K' },
      { price: (basePrice - 1).toFixed(1), quantity: '262.27K' },
      { price: (basePrice - 1.5).toFixed(1), quantity: '2.96K' },
      { price: (basePrice - 2).toFixed(1), quantity: '511.39K' },
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">{currentPair}</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="text-sm text-muted-foreground">
              Perpetual <span className={parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}>{change24h}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-lg font-bold">{currentPrice}</div>
            </div>
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-bot-trading">
                <Bot className="h-4 w-4" />
                Bot
              </Button>
            </Link>
            <MoreHorizontal className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Order Book */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Order Book</h3>
          
          <div className="space-y-2">
            {/* Asks */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Asks</div>
              {orderBook.asks.map((ask, index) => (
                <div key={index} className="flex justify-between text-sm">
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

            {/* Bids */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Bids</div>
              {orderBook.bids.map((bid, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-green-500">{bid.price}</span>
                  <span className="text-muted-foreground">{bid.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trading Form */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Place Order</h3>
          
          <div className="space-y-4">
            {/* Order Type Tabs */}
            <div className="flex border-b border-border">
              <button 
                className={`flex-1 px-4 py-2 text-sm ${activeTab === 'open' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setActiveTab('open')}
              >
                Market
              </button>
              <button 
                className={`flex-1 px-4 py-2 text-sm ${activeTab === 'limit' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setActiveTab('limit')}
              >
                Limit
              </button>
            </div>

            {/* Price Input */}
            {activeTab === 'limit' && (
              <div>
                <label className="text-xs text-muted-foreground">Price (USDT)</label>
                <Input
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="text-xs text-muted-foreground">Amount (USDT)</label>
              <Input
                placeholder="0.00"
                className="mt-1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Leverage */}
            <div>
              <label className="text-xs text-muted-foreground">Leverage: {leverage}x</label>
              <div className="flex gap-2 mt-1">
                {['5', '10', '20', '50'].map((lev) => (
                  <Button
                    key={lev}
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${leverage === lev ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setLeverage(lev)}
                  >
                    {lev}x
                  </Button>
                ))}
              </div>
            </div>

            {/* Order Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                Buy Long
              </Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                Sell Short
              </Button>
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