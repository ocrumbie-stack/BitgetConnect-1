import { useState } from 'react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

export function Trade() {
  const { data, isLoading } = useBitgetData();
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState('1');

  const selectedMarket = data?.find(item => item.symbol === selectedPair);
  
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.01) return num.toFixed(6);
    return num.toFixed(8);
  };

  const formatChange = (change: string | null) => {
    if (!change) return '0.00%';
    const num = parseFloat(change) * 100;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const popularPairs = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <h1 className="text-xl font-bold text-foreground mb-2">Trade</h1>
        <p className="text-muted-foreground text-sm">Place orders and manage positions</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Market Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Market</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger data-testid="select-trading-pair">
                <SelectValue placeholder="Select trading pair" />
              </SelectTrigger>
              <SelectContent>
                {data?.slice(0, 20).map((item) => (
                  <SelectItem key={item.symbol} value={item.symbol}>
                    {item.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-wrap">
              {popularPairs.map((pair) => (
                <Button
                  key={pair}
                  variant={selectedPair === pair ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPair(pair)}
                  data-testid={`button-pair-${pair}`}
                >
                  {pair}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Info */}
        {selectedMarket && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">{selectedMarket.symbol}</h3>
                <Badge variant={parseFloat(selectedMarket.change24h || '0') >= 0 ? 'default' : 'destructive'}>
                  {formatChange(selectedMarket.change24h)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Price</div>
                  <div className="font-bold text-lg" data-testid={`price-${selectedMarket.symbol}`}>
                    ${formatPrice(selectedMarket.price)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">24h Volume</div>
                  <div className="font-bold">
                    ${parseFloat(selectedMarket.volume24h || '0').toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Funding Rate</div>
                  <div className="font-bold">
                    {parseFloat(selectedMarket.fundingRate || '0').toFixed(6)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Open Interest</div>
                  <div className="font-bold">
                    {parseFloat(selectedMarket.openInterest || '0').toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Type */}
            <div className="flex gap-2">
              <Button
                variant={orderType === 'market' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('market')}
                data-testid="button-market-order"
                className="flex-1"
              >
                Market
              </Button>
              <Button
                variant={orderType === 'limit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('limit')}
                data-testid="button-limit-order"
                className="flex-1"
              >
                Limit
              </Button>
            </div>

            {/* Side Selection */}
            <div className="flex gap-2">
              <Button
                variant={side === 'buy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSide('buy')}
                data-testid="button-buy"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Buy / Long
              </Button>
              <Button
                variant={side === 'sell' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSide('sell')}
                data-testid="button-sell"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <TrendingDown className="h-4 w-4 mr-1" />
                Sell / Short
              </Button>
            </div>

            {/* Leverage */}
            <div>
              <label className="text-sm font-medium mb-2 block">Leverage</label>
              <Select value={leverage} onValueChange={setLeverage}>
                <SelectTrigger data-testid="select-leverage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '5', '10', '20', '50', '100'].map((lev) => (
                    <SelectItem key={lev} value={lev}>
                      {lev}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price (for limit orders) */}
            {orderType === 'limit' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Price</label>
                <Input
                  type="number"
                  placeholder="Enter price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  data-testid="input-price"
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-sm font-medium mb-2 block">Amount (USDT)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {['25%', '50%', '75%', '100%'].map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // This would calculate based on available balance
                    const mockBalance = 1000;
                    const percentage = parseFloat(percent) / 100;
                    setAmount((mockBalance * percentage).toString());
                  }}
                  data-testid={`button-amount-${percent}`}
                  className="flex-1"
                >
                  {percent}
                </Button>
              ))}
            </div>

            {/* Submit Button */}
            <Button
              className={`w-full ${
                side === 'buy' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
              disabled={!amount || (orderType === 'limit' && !price)}
              data-testid="button-place-order"
            >
              {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
            </Button>

            {/* Disclaimer */}
            <div className="text-xs text-muted-foreground text-center">
              ⚠️ This is a demo interface. No real orders will be placed.
            </div>
          </CardContent>
        </Card>

        {/* Position Info (Mock) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-lg mb-2">No open positions</div>
              <div className="text-sm">Your positions will appear here after placing orders</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}