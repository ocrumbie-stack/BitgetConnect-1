import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Plus, Play, Edit2, Trash2, TrendingUp, TrendingDown, Settings } from 'lucide-react';

export default function BotPage() {
  const [activeTab, setActiveTab] = useState('ai');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  
  // Strategy creation form
  const [strategyName, setStrategyName] = useState('');
  const [positionDirection, setPositionDirection] = useState<'long' | 'short'>('long');
  const [timeframe, setTimeframe] = useState('1h');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [showAdvancedIndicators, setShowAdvancedIndicators] = useState(false);
  
  // Technical Indicators state
  const [indicators, setIndicators] = useState({
    rsi: { enabled: false, period: 14, condition: 'above', value: 70 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
    ma1: { enabled: false, type: 'sma', period1: 20, condition: 'above', period2: 50 },
    ma2: { enabled: false, type: 'ema', period1: 50, condition: 'above', period2: 200 },
    ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossing_up', period2: 20 },
    bollinger: { enabled: false, period: 20, stdDev: 2, condition: 'above_upper' },
    stochastic: { enabled: false, kPeriod: 14, dPeriod: 3, smoothK: 3, condition: 'above', value: 80 },
    williams: { enabled: false, period: 14, condition: 'above', value: -20 },
    volume: { enabled: false, condition: 'above_average', multiplier: 1.5 }
  });
  
  // Bot execution form
  const [tradingPair, setTradingPair] = useState('BTCUSDT');
  const [capital, setCapital] = useState('1000');
  const [leverage, setLeverage] = useState('1');

  // Get trading pair from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pair = urlParams.get('pair');
    if (pair) {
      setTradingPair(pair);
    }
  }, []);

  // Fetch user strategies
  const { data: userStrategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/bot-strategies']
  });

  // Fetch active executions
  const { data: activeExecutions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ['/api/bot-executions']
  });

  // Create strategy mutation
  const createStrategyMutation = useMutation({
    mutationFn: async (strategyData: any) => {
      const response = await fetch('/api/bot-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create strategy: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-strategies'] });
      setShowCreateForm(false);
      resetForm();
    }
  });

  // Run strategy mutation
  const runStrategyMutation = useMutation({
    mutationFn: async (executionData: any) => {
      const response = await fetch('/api/bot-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to run strategy: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      setShowRunDialog(false);
      setActiveTab('executions');
    }
  });

  // Delete strategy mutation
  const deleteStrategyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/bot-strategies/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete strategy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-strategies'] });
    }
  });

  const resetForm = () => {
    setStrategyName('');
    setPositionDirection('long');
    setTimeframe('1h');
    setRiskLevel('medium');
    setStopLoss('');
    setTakeProfit('');
    setShowAdvancedIndicators(false);
    setIndicators({
      rsi: { enabled: false, period: 14, condition: 'above', value: 70 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
      ma1: { enabled: false, type: 'sma', period1: 20, condition: 'above', period2: 50 },
      ma2: { enabled: false, type: 'ema', period1: 50, condition: 'above', period2: 200 },
      ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossing_up', period2: 20 },
      bollinger: { enabled: false, period: 20, stdDev: 2, condition: 'above_upper' },
      stochastic: { enabled: false, kPeriod: 14, dPeriod: 3, smoothK: 3, condition: 'above', value: 80 },
      williams: { enabled: false, period: 14, condition: 'above', value: -20 },
      volume: { enabled: false, condition: 'above_average', multiplier: 1.5 }
    });
  };

  const handleCreateStrategy = async () => {
    if (!strategyName.trim()) {
      alert('Please enter a strategy name');
      return;
    }

    const strategyData = {
      userId: 'default-user', // Required field
      name: strategyName,
      strategy: 'manual',
      riskLevel,
      description: `${positionDirection === 'long' ? 'Long' : 'Short'} strategy with ${timeframe} timeframe`,
      config: {
        positionDirection,
        timeframe,
        entryConditions: Object.entries(indicators)
          .filter(([_, config]: [string, any]) => config.enabled)
          .map(([name, config]: [string, any]) => ({
            indicator: name,
            ...config
          })),
        exitConditions: [],
        indicators: indicators,
        riskManagement: {
          stopLoss: parseFloat(stopLoss) || undefined,
          takeProfit: parseFloat(takeProfit) || undefined,
        }
      }
    };

    try {
      console.log('Creating strategy with data:', strategyData);
      await createStrategyMutation.mutateAsync(strategyData);
      alert('Strategy created successfully!');
    } catch (error) {
      console.error('Strategy creation failed:', error);
      alert('Failed to create strategy: ' + (error as Error).message);
    }
  };

  const handleRunStrategy = async (strategy: any) => {
    if (!tradingPair || !capital) return;

    // Handle AI bots differently - they don't have strategy IDs yet
    if (strategy.isAI) {
      // For now, create a simple execution entry for AI bots
      const executionData = {
        userId: 'default-user', // Required field
        strategyId: strategy.id, // Use AI bot ID as strategy ID
        tradingPair,
        capital,
        leverage,
        status: 'active'
      };
      
      await runStrategyMutation.mutateAsync(executionData);
    } else {
      // Handle custom user strategies
      const executionData = {
        userId: 'default-user', // Required field
        strategyId: strategy.id,
        tradingPair,
        capital,
        leverage
      };

      await runStrategyMutation.mutateAsync(executionData);
    }
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (window.confirm('Are you sure you want to delete this strategy?')) {
      deleteStrategyMutation.mutate(strategyId);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <h1 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Trading Bots
        </h1>
        <p className="text-muted-foreground text-sm">
          Create reusable trading strategies and run them on any trading pair
        </p>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai">AI Bots</TabsTrigger>
            <TabsTrigger value="strategies">My Strategies</TabsTrigger>
            <TabsTrigger value="executions">Active Bots</TabsTrigger>
          </TabsList>

          {/* AI Bots Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Trading Bots</h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'grid',
                  name: 'Grid Trading Pro',
                  description: 'Dynamic grid with auto-adjustment based on volatility',
                  risk: 'Medium',
                  profitPotential: 'High',
                  features: ['Auto-grid adjustment', 'Volume-based spacing', 'Profit protection'],
                  winRate: '78%',
                  avgReturn: '15-25%/month',
                },
                {
                  id: 'dca_smart',
                  name: 'Smart DCA Bot',
                  description: 'AI-powered dollar cost averaging with market timing',
                  risk: 'Low',
                  profitPotential: 'Medium',
                  features: ['Market sentiment analysis', 'Dynamic entry timing', 'Risk management'],
                  winRate: '85%',
                  avgReturn: '8-15%/month',
                },
                {
                  id: 'momentum',
                  name: 'Momentum Scalper',
                  description: 'High-frequency momentum detection with ML algorithms',
                  risk: 'High',
                  profitPotential: 'Very High',
                  features: ['Real-time sentiment', '50+ indicators', 'Auto-scaling'],
                  winRate: '72%',
                  avgReturn: '25-50%/month',
                },
                {
                  id: 'arbitrage',
                  name: 'Cross-Exchange Arbitrage',
                  description: 'Multi-exchange price difference exploitation',
                  risk: 'Low',
                  profitPotential: 'Medium',
                  features: ['Multi-exchange monitoring', 'Instant execution', 'Low risk'],
                  winRate: '92%',
                  avgReturn: '5-12%/month',
                },
                {
                  id: 'ai_trend',
                  name: 'AI Trend Following',
                  description: 'Machine learning powered trend detection and following',
                  risk: 'Medium',
                  profitPotential: 'High',
                  features: ['Neural networks', 'Pattern recognition', 'Adaptive strategies'],
                  winRate: '81%',
                  avgReturn: '18-35%/month',
                },
                {
                  id: 'volatility',
                  name: 'Volatility Harvester',
                  description: 'Profits from market volatility with advanced algorithms',
                  risk: 'High',
                  profitPotential: 'Very High',
                  features: ['Volatility prediction', 'Dynamic hedging', 'Options strategies'],
                  winRate: '76%',
                  avgReturn: '30-45%/month',
                }
              ].map((bot) => (
                <Card key={bot.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">{bot.name}</h4>
                          <Badge variant={bot.risk === 'Low' ? 'secondary' : bot.risk === 'Medium' ? 'outline' : 'destructive'}>
                            {bot.risk} Risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{bot.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">Win Rate</div>
                            <div className="text-lg font-bold">{bot.winRate}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Expected Return</div>
                            <div className="text-lg font-bold">{bot.avgReturn}</div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-sm font-medium mb-1">Key Features:</div>
                          <div className="flex flex-wrap gap-1">
                            {bot.features.map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 flex-1"
                        onClick={() => {
                          // For AI bots, we'll show a simplified run dialog
                          setSelectedStrategy({ ...bot, isAI: true });
                          setShowRunDialog(true);
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Deploy Bot
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trading Strategies</h3>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Strategy
              </Button>
            </div>

            {strategiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (userStrategies as any[]).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No strategies created yet</p>
                  <Button onClick={() => setShowCreateForm(true)} className="mt-3">
                    Create Your First Strategy
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(userStrategies as any[]).map((strategy: any) => (
                  <Card key={strategy.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium mb-1">{strategy.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {strategy.description}
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={
                              strategy.config?.positionDirection === 'long' 
                                ? 'border-green-500 text-green-600' 
                                : 'border-red-500 text-red-600'
                            }>
                              {strategy.config?.positionDirection === 'long' ? (
                                <><TrendingUp className="h-3 w-3 mr-1" />Long</>
                              ) : (
                                <><TrendingDown className="h-3 w-3 mr-1" />Short</>
                              )}
                            </Badge>
                            <Badge variant="secondary">{strategy.config?.timeframe}</Badge>
                            <Badge variant="outline">{strategy.riskLevel} Risk</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedStrategy(strategy);
                              setShowRunDialog(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteStrategy(strategy.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Active Executions Tab */}
          <TabsContent value="executions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Bot Executions</h3>
            </div>

            {executionsLoading ? (
              <div>Loading executions...</div>
            ) : (activeExecutions as any[]).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No bots currently running</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(activeExecutions as any[]).map((execution: any) => (
                  <Card key={execution.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium mb-1">{execution.tradingPair}</h4>
                          <p className="text-sm text-muted-foreground">
                            Capital: ${execution.capital} | Leverage: {execution.leverage}x
                          </p>
                          <Badge variant={execution.status === 'active' ? 'default' : 'secondary'}>
                            {execution.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-500">+${execution.profit || '0'}</div>
                          <div className="text-xs text-muted-foreground">{execution.trades || 0} trades</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Strategy Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Trading Strategy</DialogTitle>
            <DialogDescription>
              Create a reusable strategy that can be applied to any trading pair
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Strategy Name</label>
              <Input 
                placeholder="My Trading Strategy" 
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Timeframe</label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Risk Level</label>
                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Position Direction */}
            <div>
              <label className="text-sm font-medium mb-3 block">Position Direction</label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    positionDirection === 'long' 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                  onClick={() => setPositionDirection('long')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-green-600 dark:text-green-400">Long</div>
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Profit when price goes up
                  </div>
                </div>
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    positionDirection === 'short' 
                      ? 'border-red-500 bg-red-500/10' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
                  }`}
                  onClick={() => setPositionDirection('short')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-red-600 dark:text-red-400">Short</div>
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Profit when price goes down
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Stop Loss (%)</label>
                <Input 
                  type="number"
                  placeholder="2"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Take Profit (%)</label>
                <Input 
                  type="number"
                  placeholder="5"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Technical Indicators</label>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAdvancedIndicators(!showAdvancedIndicators)}
                >
                  {showAdvancedIndicators ? 'Hide' : 'Show'} Advanced
                </Button>
              </div>

              {showAdvancedIndicators && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium text-sm">Entry Conditions</h4>
                  
                  {/* RSI */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="rsi"
                        checked={indicators.rsi.enabled}
                        onChange={(e) => setIndicators({
                          ...indicators,
                          rsi: { ...indicators.rsi, enabled: e.target.checked }
                        })}
                      />
                      <label htmlFor="rsi" className="text-sm font-medium">RSI (Relative Strength Index)</label>
                    </div>
                    {indicators.rsi.enabled && (
                      <div className="grid grid-cols-3 gap-2 ml-6">
                        <div>
                          <label className="text-xs">Period</label>
                          <Input 
                            type="number" 
                            value={indicators.rsi.period}
                            onChange={(e) => setIndicators({
                              ...indicators,
                              rsi: { ...indicators.rsi, period: parseInt(e.target.value) || 14 }
                            })}
                            placeholder="14"
                          />
                        </div>
                        <div>
                          <label className="text-xs">Condition</label>
                          <Select 
                            value={indicators.rsi.condition} 
                            onValueChange={(value) => setIndicators({
                              ...indicators,
                              rsi: { ...indicators.rsi, condition: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above</SelectItem>
                              <SelectItem value="below">Below</SelectItem>
                              <SelectItem value="between">Between</SelectItem>
                              <SelectItem value="oversold">Oversold (&lt;30)</SelectItem>
                              <SelectItem value="overbought">Overbought (&gt;70)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs">Value</label>
                          <Input 
                            type="number" 
                            value={indicators.rsi.value}
                            onChange={(e) => setIndicators({
                              ...indicators,
                              rsi: { ...indicators.rsi, value: parseInt(e.target.value) || 70 }
                            })}
                            placeholder="70"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MACD */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="macd"
                        checked={indicators.macd.enabled}
                        onChange={(e) => setIndicators({
                          ...indicators,
                          macd: { ...indicators.macd, enabled: e.target.checked }
                        })}
                      />
                      <label htmlFor="macd" className="text-sm font-medium">MACD</label>
                    </div>
                    {indicators.macd.enabled && (
                      <div className="space-y-2 ml-6">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs">Fast Period</label>
                            <Input 
                              type="number" 
                              value={indicators.macd.fastPeriod}
                              onChange={(e) => setIndicators({
                                ...indicators,
                                macd: { ...indicators.macd, fastPeriod: parseInt(e.target.value) || 12 }
                              })}
                              placeholder="12"
                            />
                          </div>
                          <div>
                            <label className="text-xs">Slow Period</label>
                            <Input 
                              type="number" 
                              value={indicators.macd.slowPeriod}
                              onChange={(e) => setIndicators({
                                ...indicators,
                                macd: { ...indicators.macd, slowPeriod: parseInt(e.target.value) || 26 }
                              })}
                              placeholder="26"
                            />
                          </div>
                          <div>
                            <label className="text-xs">Signal Period</label>
                            <Input 
                              type="number" 
                              value={indicators.macd.signalPeriod}
                              onChange={(e) => setIndicators({
                                ...indicators,
                                macd: { ...indicators.macd, signalPeriod: parseInt(e.target.value) || 9 }
                              })}
                              placeholder="9"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs">Condition</label>
                          <Select 
                            value={indicators.macd.condition} 
                            onValueChange={(value) => setIndicators({
                              ...indicators,
                              macd: { ...indicators.macd, condition: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bullish_crossover">Bullish Crossover</SelectItem>
                              <SelectItem value="bearish_crossover">Bearish Crossover</SelectItem>
                              <SelectItem value="macd_above_signal">MACD Above Signal</SelectItem>
                              <SelectItem value="macd_below_signal">MACD Below Signal</SelectItem>
                              <SelectItem value="histogram_positive">Histogram Positive</SelectItem>
                              <SelectItem value="histogram_negative">Histogram Negative</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Moving Averages */}
                  {['ma1', 'ma2', 'ma3'].map((maKey, idx) => (
                    <div key={maKey} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={maKey}
                          checked={indicators[maKey as keyof typeof indicators].enabled}
                          onChange={(e) => setIndicators({
                            ...indicators,
                            [maKey]: { ...indicators[maKey as keyof typeof indicators], enabled: e.target.checked }
                          })}
                        />
                        <label htmlFor={maKey} className="text-sm font-medium">
                          Moving Average {idx + 1}
                        </label>
                      </div>
                      {indicators[maKey as keyof typeof indicators].enabled && (
                        <div className="space-y-2 ml-6">
                          <div>
                            <label className="text-xs">Type</label>
                            <Select 
                              value={(indicators[maKey as keyof typeof indicators] as any).type} 
                              onValueChange={(value) => setIndicators({
                                ...indicators,
                                [maKey]: { ...indicators[maKey as keyof typeof indicators], type: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sma">SMA</SelectItem>
                                <SelectItem value="ema">EMA</SelectItem>
                                <SelectItem value="wma">WMA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs">Period 1</label>
                              <Input 
                                type="number" 
                                value={(indicators[maKey as keyof typeof indicators] as any).period1}
                                onChange={(e) => setIndicators({
                                  ...indicators,
                                  [maKey]: { ...indicators[maKey as keyof typeof indicators], period1: parseInt(e.target.value) || 20 }
                                })}
                                placeholder="20"
                              />
                            </div>
                            <div>
                              <label className="text-xs">Condition</label>
                              <Select 
                                value={(indicators[maKey as keyof typeof indicators] as any).condition} 
                                onValueChange={(value) => setIndicators({
                                  ...indicators,
                                  [maKey]: { ...indicators[maKey as keyof typeof indicators], condition: value }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="above">Above</SelectItem>
                                  <SelectItem value="below">Below</SelectItem>
                                  <SelectItem value="crossing_up">Crossing Up</SelectItem>
                                  <SelectItem value="crossing_down">Crossing Down</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs">Period 2</label>
                              <Input 
                                type="number" 
                                value={(indicators[maKey as keyof typeof indicators] as any).period2}
                                onChange={(e) => setIndicators({
                                  ...indicators,
                                  [maKey]: { ...indicators[maKey as keyof typeof indicators], period2: parseInt(e.target.value) || 50 }
                                })}
                                placeholder="50"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Bollinger Bands */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="bollinger"
                        checked={indicators.bollinger.enabled}
                        onChange={(e) => setIndicators({
                          ...indicators,
                          bollinger: { ...indicators.bollinger, enabled: e.target.checked }
                        })}
                      />
                      <label htmlFor="bollinger" className="text-sm font-medium">Bollinger Bands</label>
                    </div>
                    {indicators.bollinger.enabled && (
                      <div className="grid grid-cols-3 gap-2 ml-6">
                        <div>
                          <label className="text-xs">Period</label>
                          <Input 
                            type="number" 
                            value={indicators.bollinger.period}
                            onChange={(e) => setIndicators({
                              ...indicators,
                              bollinger: { ...indicators.bollinger, period: parseInt(e.target.value) || 20 }
                            })}
                            placeholder="20"
                          />
                        </div>
                        <div>
                          <label className="text-xs">Std Dev</label>
                          <Input 
                            type="number" 
                            value={indicators.bollinger.stdDev}
                            onChange={(e) => setIndicators({
                              ...indicators,
                              bollinger: { ...indicators.bollinger, stdDev: parseFloat(e.target.value) || 2 }
                            })}
                            placeholder="2"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="text-xs">Condition</label>
                          <Select 
                            value={indicators.bollinger.condition} 
                            onValueChange={(value) => setIndicators({
                              ...indicators,
                              bollinger: { ...indicators.bollinger, condition: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above_upper">Above Upper</SelectItem>
                              <SelectItem value="below_lower">Below Lower</SelectItem>
                              <SelectItem value="between_bands">Between Bands</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="volume"
                        checked={indicators.volume.enabled}
                        onChange={(e) => setIndicators({
                          ...indicators,
                          volume: { ...indicators.volume, enabled: e.target.checked }
                        })}
                      />
                      <label htmlFor="volume" className="text-sm font-medium">Volume Analysis</label>
                    </div>
                    {indicators.volume.enabled && (
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        <div>
                          <label className="text-xs">Condition</label>
                          <Select 
                            value={indicators.volume.condition} 
                            onValueChange={(value) => setIndicators({
                              ...indicators,
                              volume: { ...indicators.volume, condition: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above_average">Above Average</SelectItem>
                              <SelectItem value="spike">Volume Spike</SelectItem>
                              <SelectItem value="increasing">Increasing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs">Multiplier</label>
                          <Input 
                            type="number" 
                            value={indicators.volume.multiplier}
                            onChange={(e) => setIndicators({
                              ...indicators,
                              volume: { ...indicators.volume, multiplier: parseFloat(e.target.value) || 1.5 }
                            })}
                            placeholder="1.5"
                            step="0.1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
          
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateStrategy} 
              disabled={createStrategyMutation.isPending || !strategyName.trim()}
            >
              {createStrategyMutation.isPending ? 'Creating...' : 'Create Strategy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Run Strategy Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Strategy: {selectedStrategy?.name}</DialogTitle>
            <DialogDescription>
              Configure the trading pair and capital for this strategy execution
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Trading Pair</label>
              <Input 
                placeholder="BTCUSDT" 
                value={tradingPair}
                onChange={(e) => setTradingPair(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Capital (USDT)</label>
                <Input 
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Leverage</label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                    <SelectItem value="20">20x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRunDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleRunStrategy(selectedStrategy)} 
                disabled={runStrategyMutation.isPending || !tradingPair || !capital}
                className="bg-green-600 hover:bg-green-700"
              >
                {runStrategyMutation.isPending ? 'Starting...' : 'Start Bot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}