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
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{currentPair}</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="text-sm text-muted-foreground">
              Perpetual Futures
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-bot-trading">
                <Bot className="h-4 w-4" />
                Bot
              </Button>
            </Link>
            <MoreHorizontal className="h-5 w-5" />
          </div>
        </div>

        {/* Price Display */}
        <div className="text-center">
          <div className="text-3xl font-bold mb-1">${currentPrice}</div>
          <div className={`text-lg ${parseFloat(change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {parseFloat(change24h) >= 0 ? '+' : ''}{change24h}% (24h)
          </div>
        </div>
      </div>

      {/* Available Balance */}
      <div className="p-4">
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <div className="text-lg font-semibold">${availableBalance.toLocaleString()}</div>
          </div>
        </Card>
      </div>

      {/* Trading Form */}
      <div className="p-4 space-y-4">
        {/* Order Type Selection */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Order Type
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant={orderType === 'market' ? 'default' : 'outline'}
              onClick={() => setOrderType('market')}
              className="w-full"
            >
              Market Order
            </Button>
            <Button 
              variant={orderType === 'limit' ? 'default' : 'outline'}
              onClick={() => setOrderType('limit')}
              className="w-full"
            >
              Limit Order
            </Button>
          </div>

          {/* Limit Price Input */}
          {orderType === 'limit' && (
            <div className="mt-4">
              <label className="text-sm text-muted-foreground">Limit Price (USDT)</label>
              <Input
                placeholder={currentPrice}
                className="mt-1"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* Leverage Selection */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Leverage: {leverage}x</h3>
          <div className="grid grid-cols-4 gap-2">
            {['5', '10', '20', '50'].map((lev) => (
              <Button
                key={lev}
                variant={leverage === lev ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLeverage(lev)}
              >
                {lev}x
              </Button>
            ))}
          </div>
        </Card>

        {/* Order Amount */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Order Amount</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Amount (USDT)</label>
              <Input
                placeholder="Enter amount"
                className="mt-1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            
            {/* Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {['25%', '50%', '75%', '100%'].map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePercentageClick(percent)}
                >
                  {percent}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* TP/SL Settings */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Take Profit / Stop Loss</h3>
            <Switch 
              checked={tpslEnabled}
              onCheckedChange={setTpslEnabled}
            />
          </div>
          
          {tpslEnabled && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Take Profit (USDT)</label>
                <Input
                  placeholder="Take profit price"
                  className="mt-1"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Stop Loss (USDT)</label>
                <Input
                  placeholder="Stop loss price"
                  className="mt-1"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Trading Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="bg-green-500 hover:bg-green-600 text-white py-6 text-lg font-semibold"
            size="lg"
          >
            <div className="text-center">
              <div>Open Long</div>
              <div className="text-sm opacity-75">Buy {currentPair.replace('USDT', '')}</div>
            </div>
          </Button>
          
          <Button 
            className="bg-red-500 hover:bg-red-600 text-white py-6 text-lg font-semibold"
            size="lg"
          >
            <div className="text-center">
              <div>Open Short</div>
              <div className="text-sm opacity-75">Sell {currentPair.replace('USDT', '')}</div>
            </div>
          </Button>
        </div>

        {/* Order Summary */}
        {amount && (
          <Card className="p-4 bg-muted/30">
            <h4 className="font-medium mb-2">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Value:</span>
                <span>${amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leverage:</span>
                <span>{leverage}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position Size:</span>
                <span>${(parseFloat(amount || '0') * parseFloat(leverage)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Fee:</span>
                <span>~${(parseFloat(amount || '0') * 0.001).toFixed(2)}</span>
              </div>
            </div>
          </Card>
        )}
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