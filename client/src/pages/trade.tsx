import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ChevronDown, TrendingUp, MoreHorizontal, Bot, Wallet, Settings } from 'lucide-react';

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

  const handlePercentageClick = (percentage: string) => {
    const percent = parseFloat(percentage) / 100;
    const calculatedAmount = (availableBalance * percent).toFixed(2);
    setAmount(calculatedAmount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Compact Header */}
      <div className="p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{currentPair}</span>
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="text-xs text-muted-foreground">Perpetual</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">${currentPrice}</div>
              <div className={`text-sm ${parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {parseFloat(change24h) >= 0 ? '+' : ''}{change24h}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-1" data-testid="button-bot-trading">
                <Bot className="h-3 w-3" />
                Bot
              </Button>
            </Link>
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </div>

        {/* Balance & Quick Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Wallet className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-medium">${availableBalance.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Leverage: {leverage}x</span>
            <span>{orderType === 'market' ? 'Market' : 'Limit'}</span>
          </div>
        </div>
      </div>

      {/* Compact Trading Form */}
      <div className="p-3 space-y-3">
        {/* Order Type & Leverage Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-sm font-medium mb-2">Order Type</div>
            <div className="flex gap-1">
              <Button 
                variant={orderType === 'market' ? 'default' : 'outline'}
                onClick={() => setOrderType('market')}
                size="sm"
                className="flex-1 text-xs"
              >
                Market
              </Button>
              <Button 
                variant={orderType === 'limit' ? 'default' : 'outline'}
                onClick={() => setOrderType('limit')}
                size="sm"
                className="flex-1 text-xs"
              >
                Limit
              </Button>
            </div>
          </Card>

          <Card className="p-3">
            <div className="text-sm font-medium mb-2">Leverage</div>
            <div className="grid grid-cols-2 gap-1">
              {['5', '10', '20', '50'].map((lev) => (
                <Button
                  key={lev}
                  variant={leverage === lev ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeverage(lev)}
                  className="text-xs"
                >
                  {lev}x
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Price & Amount Row */}
        <div className="grid grid-cols-2 gap-3">
          {orderType === 'limit' && (
            <div>
              <label className="text-xs text-muted-foreground">Limit Price</label>
              <Input
                placeholder={currentPrice}
                className="mt-1 h-8 text-sm"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
              />
            </div>
          )}
          <div className={orderType === 'market' ? 'col-span-2' : ''}>
            <label className="text-xs text-muted-foreground">Amount (USDT)</label>
            <Input
              placeholder="Enter amount"
              className="mt-1 h-8 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Percentage Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {['25%', '50%', '75%', '100%'].map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(percent)}
              className="text-xs h-7"
            >
              {percent}
            </Button>
          ))}
        </div>

        {/* TP/SL Compact */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">TP/SL</span>
            <Switch 
              checked={tpslEnabled}
              onCheckedChange={setTpslEnabled}
            />
          </div>
          
          {tpslEnabled && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Take Profit</label>
                <Input
                  placeholder="TP price"
                  className="mt-1 h-8 text-sm"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Stop Loss</label>
                <Input
                  placeholder="SL price"
                  className="mt-1 h-8 text-sm"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Order Summary & Actions */}
        <div className="space-y-2">
          {amount && (
            <Card className="p-2 bg-muted/30">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order:</span>
                    <span>${amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span>${(parseFloat(amount || '0') * parseFloat(leverage)).toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leverage:</span>
                    <span>{leverage}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Fee:</span>
                    <span>~${(parseFloat(amount || '0') * 0.001).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Trading Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white py-4 font-semibold"
            >
              <div className="text-center">
                <div>Open Long</div>
                <div className="text-xs opacity-75">Buy {currentPair.replace('USDT', '')}</div>
              </div>
            </Button>
            
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white py-4 font-semibold"
            >
              <div className="text-center">
                <div>Open Short</div>
                <div className="text-xs opacity-75">Sell {currentPair.replace('USDT', '')}</div>
              </div>
            </Button>
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