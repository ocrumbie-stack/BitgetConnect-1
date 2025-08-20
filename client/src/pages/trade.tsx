import { useState } from 'react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';

export function Trade() {
  const { data } = useBitgetData();
  const [leverage, setLeverage] = useState('10');
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  const [orderType, setOrderType] = useState('market');

  // Get current BTCUSDT data
  const currentMarket = data?.find(item => item.symbol === 'BTCUSDT');
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
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">BTCUSDT</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="text-sm text-gray-400">
              Perpetual <span className="text-red-500">{change24h}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-400">0.00%</div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
              <MoreHorizontal className="h-5 w-5" />
            </div>
          </div>
        </div>
        

      </div>

      <div className="flex">
        {/* Left Side - Order Book */}
        <div className="flex-1 border-r border-gray-800">
          {/* Order Book Header */}
          <div className="flex items-center justify-between p-3 text-xs text-gray-400 border-b border-gray-800">
            <span>Price (USDT)</span>
            <span>Quantity (USDT)</span>
          </div>

          {/* Asks (Red) */}
          <div className="space-y-0">
            {orderBook.asks.reverse().map((ask, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-1 text-xs hover:bg-gray-900">
                <span className="text-red-500">{ask.price}</span>
                <span className="text-gray-400">{ask.quantity}</span>
              </div>
            ))}
          </div>

          {/* Current Price */}
          <div className="flex items-center justify-center py-2 border-y border-gray-800">
            <div className="text-lg font-bold text-green-500">{currentPrice}</div>
            <TrendingUp className="h-4 w-4 ml-2 text-green-500" />
          </div>

          {/* Bids (Green) */}
          <div className="space-y-0">
            {orderBook.bids.map((bid, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-1 text-xs hover:bg-gray-900">
                <span className="text-green-500">{bid.price}</span>
                <span className="text-gray-400">{bid.quantity}</span>
              </div>
            ))}
          </div>

          {/* Volume Indicator */}
          <div className="p-3 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-400">B 29%</span>
              <div className="flex-1 mx-2 h-1 bg-gray-800 rounded">
                <div className="w-3/10 h-full bg-blue-500 rounded"></div>
              </div>
              <span className="text-red-400">71% S</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="w-2 h-2 bg-blue-500 rounded"></div>
              <span className="text-lg font-bold">0.1</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Right Side - Trading Form */}
        <div className="w-80">
          {/* Trading Tabs */}
          <div className="flex border-b border-gray-800">
            <button className="flex-1 px-4 py-3 text-sm bg-gray-900 text-white border-b-2 border-blue-500">
              Cross
            </button>
            <button className="flex-1 px-4 py-3 text-sm text-gray-400">
              {leverage}x
            </button>
            <button className="flex-1 px-4 py-3 text-sm text-gray-400">
              S
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex border-b border-gray-800">
            <button 
              className={`flex-1 px-4 py-3 text-sm ${activeTab === 'open' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('open')}
            >
              Open
            </button>
            <button 
              className={`flex-1 px-4 py-3 text-sm ${activeTab === 'close' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('close')}
            >
              Close
            </button>
          </div>

          {/* Order Form */}
          <div className="p-4 space-y-4">
            {/* Order Type Selector */}
            <div className="relative">
              <button className="w-full flex items-center justify-between p-3 bg-gray-900 rounded text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>Market</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Price Input (for limit orders) */}
            <div>
              <Input
                placeholder="Fill at market price"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                disabled
              />
            </div>

            {/* Cost Input */}
            <div>
              <div className="text-xs text-gray-400 mb-1">Cost (USDT)</div>
              <div className="relative">
                <Input
                  placeholder="25%"
                  className="bg-gray-900 border-gray-700 text-white"
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

            {/* Account Info */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Available</span>
                <span>0.00 USDT 📋</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max open</span>
                <span>0.00 USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Est. liq. price</span>
                <span>-- USDT</span>
              </div>
            </div>

            {/* Long Button */}
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-medium py-4 flex flex-col">
              <span>Open long</span>
              <span className="text-xs opacity-70">0.00 USDT</span>
            </Button>

            {/* Account Info (Bottom) */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Max open</span>
                <span>0.00 USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Est. liq. price</span>
                <span>-- USDT</span>
              </div>
            </div>

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
          <TabsList className="grid w-full grid-cols-5 bg-transparent border-none">
            <TabsTrigger value="positions" className="text-xs text-gray-400 data-[state=active]:text-white">
              Positions(0)
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs text-gray-400 data-[state=active]:text-white">
              Orders(0)
            </TabsTrigger>
            <TabsTrigger value="copy" className="text-xs text-gray-400 data-[state=active]:text-white">
              Copy
            </TabsTrigger>
            <TabsTrigger value="bots" className="text-xs text-gray-400 data-[state=active]:text-white">
              Bots (1)
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs text-gray-400 data-[state=active]:text-white">
              Assets
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