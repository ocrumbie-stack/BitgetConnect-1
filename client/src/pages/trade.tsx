import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, ChevronUp, TrendingUp, MoreHorizontal, Bot, Wallet, Settings, TrendingDown, Activity, Shield, Target, Search, Check, BarChart3, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { LiveSignals } from '@/components/LiveSignals';

export function Trade() {
  const { data } = useBitgetData();
  const [leverage, setLeverage] = useState('10');
  const [customLeverageMode, setCustomLeverageMode] = useState(false);
  const [customLeverage, setCustomLeverage] = useState('');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [tpslEnabled, setTpslEnabled] = useState(false);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [tpMode, setTpMode] = useState<'percentage' | 'price'>('percentage');
  const [slMode, setSlMode] = useState<'percentage' | 'price'>('percentage');
  const [tpslExpanded, setTpslExpanded] = useState(true);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [trailingStopValue, setTrailingStopValue] = useState('');
  const [trailingStopMode, setTrailingStopMode] = useState<'percentage' | 'price'>('percentage');
  const [currentPair, setCurrentPair] = useState('BTCUSDT');
  const [pairSelectorOpen, setPairSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();


  // Fetch account information for real balance
  const { data: accountData } = useQuery({
    queryKey: ['/api/account/default-user'],
    refetchInterval: 5000,
  });

  // Fetch positions and orders
  const { data: ordersData } = useQuery({
    queryKey: ['/api/orders/default-user'],
    refetchInterval: 3000,
  }) as { data: any[] | undefined };

  // Fetch bot executions
  const { data: botsData } = useQuery({
    queryKey: ['/api/bot-executions'],
    refetchInterval: 3000,
  }) as { data: any[] | undefined };

  // Check API connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000,
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to place order';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON (like HTML error page), get text
          const errorText = await response.text();
          if (errorText.includes('<!DOCTYPE')) {
            errorMessage = `Server error (${response.status}). Please check your API connection and try again.`;
          } else {
            errorMessage = errorText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (response) => {
      console.log('Order response:', response);
      const orderData = response.data || response;
      toast({
        title: "Order Placed Successfully! ✅",
        description: `Order for ${amount} ${currentPair} has been placed.`,
      });
      // Reset form
      setAmount('');
      setTakeProfit('');
      setStopLoss('');
    },
    onError: (error: Error) => {
      console.error('Trade error:', error);
      toast({
        title: "Order Failed ❌",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: async ({ symbol, side }: { symbol: string; side: string }) => {
      console.log('🚀 Starting close position mutation', { symbol, side });
      const response = await fetch('/api/positions/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, side })
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('❌ Response error:', error);
        throw new Error(error.message || 'Failed to close position');
      }
      
      const result = await response.json();
      console.log('✅ Response success:', result);
      return result;
    },
    onSuccess: (response, { symbol, side }) => {
      toast({
        title: "Position Closed Successfully! ✅",
        description: `${symbol} ${side} position has been closed.`,
      });
      
      // Refresh positions data after successful close
      queryClient.invalidateQueries({ 
        queryKey: ['/api/account/default-user'] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Close Position Failed ❌",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get available pairs from data, filtered by search query
  const availablePairs = data ? data.map(item => item.symbol).sort() : ['BTCUSDT'];
  const filteredPairs = searchQuery 
    ? availablePairs.filter(pair => 
        pair.toLowerCase().includes(searchQuery.toLowerCase())
      ) 
    : [];

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
    minimumFractionDigits: 2, 
    maximumFractionDigits: 8 
  }) : '113,554.2';
  const change24h = currentMarket ? (parseFloat(currentMarket.change24h || '0') * 100).toFixed(2) : '-1.70';

  // Get real available balance from API
  const isConnected = (connectionStatus as any)?.apiConnected || false;
  const account = (accountData as any)?.account || null;
  const availableBalance = account?.availableBalance ? parseFloat(account.availableBalance) : 0;

  // Dynamic market analysis data based on current pair
  const getMarketAnalysis = () => {
    if (!currentMarket) return null;
    
    const price = parseFloat(currentMarket.price);
    const change = parseFloat(currentMarket.change24h || '0') * 100;
    const volume = parseFloat(currentMarket.volume24h || '0');
    
    // Calculate dynamic metrics based on real data
    const volatility = Math.min(Math.abs(change) * 5, 100); // Scale change to volatility
    const marketStrength = Math.max(30, Math.min(85, 50 + change * 2)); // Based on price change
    const pairStrength = Math.max(40, Math.min(90, 60 + change * 1.5)); // Based on performance
    
    const trendDirection = change > 2 ? 'bullish' : change < -2 ? 'bearish' : 'neutral';
    const momentum = Math.abs(change) > 5 ? 'strong' : Math.abs(change) > 2 ? 'moderate' : 'weak';
    const volumeLevel = volume > 1000000000 ? 'high' : volume > 100000000 ? 'medium' : 'low';
    
    return {
      marketStrength: Math.round(marketStrength),
      pairStrength: Math.round(pairStrength),
      volatility: Math.round(volatility),
      trendDirection,
      support: (price * 0.98).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 8 
      }),
      resistance: (price * 1.02).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 8 
      }),
      momentum,
      volume: volumeLevel,
      change24h: change
    };
  };

  const marketAnalysis = getMarketAnalysis();

  const handlePercentageClick = (percentage: string) => {
    if (!isConnected) {
      toast({
        title: "API Connection Required",
        description: "Please connect your Bitget API in the Assets page to use real balance.",
        variant: "destructive",
      });
      return;
    }
    const percent = parseFloat(percentage) / 100;
    const calculatedAmount = (availableBalance * percent).toFixed(2);
    setAmount(calculatedAmount);
  };

  const handlePlaceOrder = async (side: 'buy' | 'sell') => {
    if (!isConnected) {
      toast({
        title: "API Connection Required",
        description: "Please connect your Bitget API in the Assets page to place real orders.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid order amount.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "Order amount exceeds available balance.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      userId: 'default-user',
      symbol: currentPair,
      side,
      size: amount,
      orderType,
      price: orderType === 'limit' ? limitPrice : undefined,
      leverage: parseFloat(leverage),
      takeProfit: tpslEnabled && takeProfit ? takeProfit : undefined,
      stopLoss: tpslEnabled && stopLoss ? stopLoss : undefined,
      trailingStop: trailingStopEnabled && trailingStopValue ? trailingStopValue : undefined
    };

    placeOrderMutation.mutate(orderData);
  };

  // Handle pair selection
  const handlePairSelect = (pair: string) => {
    setCurrentPair(pair);
    setLocation(`/trade?pair=${pair}`);
    setPairSelectorOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col pb-0">
      {/* Ultra Compact Header */}
      <div className="p-1 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-4">
              <div>
                <Popover open={pairSelectorOpen} onOpenChange={setPairSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-1 h-auto p-0 text-base font-bold hover:bg-transparent"
                    >
                      <span>{currentPair}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Type to search pairs..." 
                        className="h-8" 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {filteredPairs.length === 0 ? (
                          searchQuery && <CommandEmpty>No pairs found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredPairs.map((pair) => (
                              <CommandItem
                                key={pair}
                                value={pair}
                                onSelect={() => handlePairSelect(pair)}
                                className="flex items-center justify-between"
                              >
                                <span>{pair}</span>
                                {pair === currentPair && (
                                  <Check className="h-4 w-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
            {/* Chart Navigation */}
            <Link to={`/charts?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600 border-green-500" data-testid="button-charts">
                <BarChart3 className="h-3 w-3 text-white" />
              </Button>
            </Link>
            <Link to={`/bot?pair=${currentPair}`}>
              <Button size="sm" variant="outline" className="gap-1 h-6 px-2" data-testid="button-bot-trading">
                <Bot className="h-3 w-3" />
                Bot
              </Button>
            </Link>
            {/* Dynamic Risk Assessment */}
            <Link to={`/analyzer?pair=${currentPair}&autoFill=true`}>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0" data-testid="button-risk-analysis">
                <Shield className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Layout: Trading Form + Analysis Panel */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* Left: Compact Trading Form */}
        <div className="flex-1 p-1 space-y-1 overflow-y-auto">
          {/* Leverage */}
          {!customLeverageMode ? (
            <div className="space-y-1">
              {/* Check if current leverage is a preset value */}
              {['5', '10', '20', '50', '100'].includes(leverage) ? (
                <Select value={leverage} onValueChange={(value) => {
                  if (value === 'custom') {
                    setCustomLeverageMode(true);
                    setCustomLeverage(leverage);
                  } else {
                    setLeverage(value);
                  }
                }}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Leverage: Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                    <SelectItem value="20">20x</SelectItem>
                    <SelectItem value="50">50x</SelectItem>
                    <SelectItem value="100">100x</SelectItem>
                    <SelectItem value="custom">Custom Leverage...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                /* Custom leverage is active - show button to edit */
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 justify-between"
                    onClick={() => {
                      setCustomLeverageMode(true);
                      setCustomLeverage(leverage);
                    }}
                  >
                    <span>{leverage}x Leverage</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 h-10"
                    onClick={() => setLeverage('10')}
                    data-testid="button-reset-leverage"
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter leverage (1-200)"
                  value={customLeverage}
                  onChange={(e) => setCustomLeverage(e.target.value)}
                  className="flex-1 h-10"
                  min="1"
                  max="200"
                  step="1"
                />
                <Button
                  onClick={() => {
                    if (customLeverage && parseFloat(customLeverage) >= 1 && parseFloat(customLeverage) <= 200) {
                      setLeverage(customLeverage);
                      setCustomLeverageMode(false);
                      setCustomLeverage('');
                    }
                  }}
                  size="sm"
                  className="px-3 h-10"
                  data-testid="button-apply-custom-leverage"
                >
                  Apply
                </Button>
                <Button
                  onClick={() => {
                    setCustomLeverageMode(false);
                    setCustomLeverage('');
                  }}
                  variant="outline"
                  size="sm"
                  className="px-3 h-10"
                  data-testid="button-cancel-custom-leverage"
                >
                  Cancel
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Current: {leverage}x leverage | Range: 1x - 200x
              </div>
            </div>
          )}

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
          <div className="border rounded p-2">
            <div className="flex items-center gap-2 mb-2">
              <Switch 
                checked={tpslEnabled}
                onCheckedChange={setTpslEnabled}
              />
              <span className="text-sm">TP/SL</span>
              {tpslEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTpslExpanded(!tpslExpanded)}
                  className="ml-auto h-6 w-6 p-0"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${tpslExpanded ? 'rotate-180' : ''}`} />
                </Button>
              )}
            </div>
            {tpslEnabled && tpslExpanded && (
              <div className="space-y-1">
                {/* Take Profit */}
                <div className="flex gap-1">
                  <Select value={tpMode} onValueChange={(value: 'percentage' | 'price') => setTpMode(value)}>
                    <SelectTrigger className="w-16 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="price">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={tpMode === 'percentage' ? "TP %" : "TP Price"}
                    className="h-7 flex-1 text-xs"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                  />
                </div>
                
                {/* Stop Loss */}
                <div className="flex gap-1">
                  <Select value={slMode} onValueChange={(value: 'percentage' | 'price') => setSlMode(value)}>
                    <SelectTrigger className="w-16 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="price">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={slMode === 'percentage' ? "SL %" : "SL Price"}
                    className="h-7 flex-1 text-xs"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                  />
                </div>

                {/* Trailing Stop */}
                <div className="border-t border-border pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch 
                      checked={trailingStopEnabled}
                      onCheckedChange={setTrailingStopEnabled}
                    />
                    <span className="text-xs">Trailing Stop</span>
                  </div>
                  {trailingStopEnabled && (
                    <div className="flex gap-1">
                      <Select value={trailingStopMode} onValueChange={(value: 'percentage' | 'price') => setTrailingStopMode(value)}>
                        <SelectTrigger className="w-16 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="price">$</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={trailingStopMode === 'percentage' ? "Trail %" : "Trail $"}
                        className="h-7 flex-1 text-xs"
                        value={trailingStopValue}
                        onChange={(e) => setTrailingStopValue(e.target.value)}
                      />
                    </div>
                  )}
                </div>
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
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white py-3 text-sm font-semibold"
              onClick={() => handlePlaceOrder('buy')}
              disabled={placeOrderMutation.isPending}
            >
              {placeOrderMutation.isPending ? 'Placing...' : 'Long'}
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white py-3 text-sm font-semibold"
              onClick={() => handlePlaceOrder('sell')}
              disabled={placeOrderMutation.isPending}
            >
              {placeOrderMutation.isPending ? 'Placing...' : 'Short'}
            </Button>
          </div>
        </div>

        {/* Right: Market Analysis Panel */}
        <div className="w-48 border-l border-border bg-card/50 p-1 space-y-1">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Market Analysis
          </h3>

          {/* Market Strength */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Market Strength</span>
              <span className="font-medium">{marketAnalysis?.marketStrength}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${(marketAnalysis?.marketStrength || 0) > 70 ? 'bg-green-500' : (marketAnalysis?.marketStrength || 0) > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${marketAnalysis?.marketStrength || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Pair Strength */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pair Strength</span>
              <span className="font-medium">{marketAnalysis?.pairStrength}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${(marketAnalysis?.pairStrength || 0) > 70 ? 'bg-green-500' : (marketAnalysis?.pairStrength || 0) > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${marketAnalysis?.pairStrength || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Trend Direction */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Trend</span>
            <div className="flex items-center gap-1">
              {marketAnalysis?.trendDirection === 'bullish' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : marketAnalysis?.trendDirection === 'bearish' ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : (
                <Activity className="h-3 w-3 text-yellow-500" />
              )}
              <span className={`capitalize ${
                marketAnalysis?.trendDirection === 'bullish' ? 'text-green-500' : 
                marketAnalysis?.trendDirection === 'bearish' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {marketAnalysis?.trendDirection || 'neutral'}
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
                <span>${marketAnalysis?.resistance || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500">Support:</span>
                <span>${marketAnalysis?.support || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Volatility */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Volatility</span>
              <span className="font-medium">{marketAnalysis?.volatility}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${(marketAnalysis?.volatility || 0) > 60 ? 'bg-red-500' : (marketAnalysis?.volatility || 0) > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${marketAnalysis?.volatility || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Momentum & Volume */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Momentum:</span>
              <span className={`capitalize ${
                marketAnalysis?.momentum === 'strong' ? 'text-green-500' : 
                marketAnalysis?.momentum === 'moderate' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {marketAnalysis?.momentum || 'unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume:</span>
              <span className={`capitalize ${
                marketAnalysis?.volume === 'high' ? 'text-green-500' : 
                marketAnalysis?.volume === 'medium' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {marketAnalysis?.volume || 'unknown'}
              </span>
            </div>
          </div>

          {/* Live Signals */}
          <LiveSignals symbol={currentPair} />
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="border-t border-border bg-card flex-1 flex flex-col">
        <Tabs defaultValue="positions" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-none">
            <TabsTrigger value="positions" className="text-xs text-muted-foreground data-[state=active]:text-foreground">
              Positions({(accountData as any)?.positions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs text-muted-foreground data-[state=active]:text-foreground">
              Orders({(ordersData as any[])?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="bots" className="text-xs text-muted-foreground data-[state=active]:text-foreground">
              Bots ({(botsData as any[])?.filter((bot: any) => bot.status === 'active').length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="positions" className="p-2 flex-1">
            {(accountData as any)?.positions?.length > 0 ? (
              <div className="space-y-3">
                {(accountData as any).positions.map((position: any) => {
                  const positionKey = `${position.symbol}-${position.side}`;
                  const isExpanded = expandedPositions.has(positionKey);
                  
                  // Calculate ROE percentage
                  const entryPrice = parseFloat(position.entryPrice);
                  const markPrice = parseFloat(position.markPrice);
                  const leverage = parseFloat(position.leverage);
                  
                  let roe = 0;
                  if (position.side === 'long') {
                    roe = ((markPrice - entryPrice) / entryPrice) * 100 * leverage;
                  } else {
                    roe = ((entryPrice - markPrice) / entryPrice) * 100 * leverage;
                  }
                  
                  const toggleExpanded = () => {
                    const newExpanded = new Set(expandedPositions);
                    if (isExpanded) {
                      newExpanded.delete(positionKey);
                    } else {
                      newExpanded.add(positionKey);
                    }
                    setExpandedPositions(newExpanded);
                  };
                  
                  return (
                    <div key={positionKey} className="bg-card/50 rounded-lg p-3 border border-border">
                      {/* Header with main info */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{position.symbol}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            position.side === 'long' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {position.side.toUpperCase()}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{position.leverage}x</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/10 border-red-500/30"
                          onClick={() => {
                            console.log('🔥 Close button clicked!', { symbol: position.symbol, side: position.side });
                            closePositionMutation.mutate({
                              symbol: position.symbol,
                              side: position.side
                            });
                          }}
                          disabled={closePositionMutation.isPending}
                          data-testid={`button-close-position-${position.symbol}-${position.side}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* ROE and PnL */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="text-xs text-muted-foreground">ROE</div>
                          <div className={`text-sm font-bold ${
                            roe >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                          </div>
                          <div className="text-xs font-medium text-foreground">
                            {parseFloat(position.pnl) >= 0 ? '+' : ''}${parseFloat(position.pnl).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={toggleExpanded}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Collapsible details */}
                      {isExpanded && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>
                              <div>Size</div>
                              <div className="font-medium text-foreground">{parseFloat(position.size).toFixed(4)}</div>
                            </div>
                            <div>
                              <div>Entry</div>
                              <div className="font-medium text-foreground">${parseFloat(position.entryPrice).toFixed(2)}</div>
                            </div>
                            <div>
                              <div>Mark</div>
                              <div className="font-medium text-foreground">${parseFloat(position.markPrice).toFixed(2)}</div>
                            </div>
                          </div>
                          
                          {/* TP/SL Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-8"
                              data-testid={`button-tpsl-${position.symbol}`}
                            >
                              TP/SL
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-8"
                              data-testid={`button-reverse-${position.symbol}`}
                            >
                              Reverse
                            </Button>
                            <Link to={`/charts?pair=${position.symbol}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-white hover:bg-white/10 border-white/30"
                                data-testid={`button-chart-${position.symbol}`}
                              >
                                <BarChart3 className="h-5 w-5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div>No open positions</div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="orders" className="p-2 flex-1">
            {(ordersData as any[])?.length > 0 ? (
              <div className="space-y-3">
                {(ordersData as any[]).map((order: any) => (
                  <div key={order.orderId} className="bg-card/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          order.side === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {order.side.toUpperCase()}
                        </span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{order.orderType}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.status}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div>Size</div>
                        <div className="font-medium text-foreground">{parseFloat(order.size).toFixed(4)}</div>
                      </div>
                      <div>
                        <div>Price</div>
                        <div className="font-medium text-foreground">${order.price ? parseFloat(order.price).toFixed(2) : 'Market'}</div>
                      </div>
                      <div>
                        <div>Time</div>
                        <div className="font-medium text-foreground">{new Date(order.cTime).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div>No open orders</div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="bots" className="p-2 flex-1">
            {(botsData as any[])?.length > 0 ? (
              <div className="space-y-3">
                {(botsData as any[]).filter((bot: any) => bot.status === 'active').map((bot: any) => (
                  <div key={bot.id} className="bg-card/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{bot.symbol}</span>
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                          {bot.status.toUpperCase()}
                        </span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{bot.strategyName}</span>
                      </div>
                      <div className={`text-sm font-medium ${
                        parseFloat(bot.currentPnl || '0') >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {parseFloat(bot.currentPnl || '0') >= 0 ? '+' : ''}${parseFloat(bot.currentPnl || '0').toFixed(2)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div>Capital</div>
                        <div className="font-medium text-foreground">${parseFloat(bot.capitalAllocated).toFixed(2)}</div>
                      </div>
                      <div>
                        <div>Leverage</div>
                        <div className="font-medium text-foreground">{bot.leverage}x</div>
                      </div>
                      <div>
                        <div>Started</div>
                        <div className="font-medium text-foreground">{new Date(bot.startedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div>No active bots</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}