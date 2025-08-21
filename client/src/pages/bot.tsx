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
  const [activeTab, setActiveTab] = useState('strategies');
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
    mutationFn: (strategyData: any) => apiRequest('/api/bot-strategies', {
      method: 'POST',
      body: JSON.stringify(strategyData),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-strategies'] });
      setShowCreateForm(false);
      resetForm();
    }
  });

  // Run strategy mutation
  const runStrategyMutation = useMutation({
    mutationFn: (executionData: any) => apiRequest('/api/bot-executions', {
      method: 'POST',
      body: JSON.stringify(executionData),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      setShowRunDialog(false);
      setActiveTab('executions');
    }
  });

  // Delete strategy mutation
  const deleteStrategyMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/bot-strategies/${id}`, { method: 'DELETE' }),
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
  };

  const handleCreateStrategy = async () => {
    if (!strategyName.trim()) return;

    const strategyData = {
      name: strategyName,
      strategy: 'manual',
      riskLevel,
      description: `${positionDirection === 'long' ? 'Long' : 'Short'} strategy with ${timeframe} timeframe`,
      config: {
        positionDirection,
        timeframe,
        entryConditions: [],
        exitConditions: [],
        indicators: {},
        riskManagement: {
          stopLoss: parseFloat(stopLoss) || undefined,
          takeProfit: parseFloat(takeProfit) || undefined,
        }
      }
    };

    await createStrategyMutation.mutateAsync(strategyData);
  };

  const handleRunStrategy = async (strategy: any) => {
    if (!tradingPair || !capital) return;

    const executionData = {
      strategyId: strategy.id,
      tradingPair,
      capital,
      leverage
    };

    await runStrategyMutation.mutateAsync(executionData);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="strategies">My Strategies</TabsTrigger>
            <TabsTrigger value="executions">Active Bots</TabsTrigger>
          </TabsList>

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
            ) : userStrategies.length === 0 ? (
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
                {userStrategies.map((strategy: any) => (
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
            ) : activeExecutions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No bots currently running</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeExecutions.map((execution: any) => (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trading Strategy</DialogTitle>
            <DialogDescription>
              Create a reusable strategy that can be applied to any trading pair
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div className="flex gap-2 justify-end">
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