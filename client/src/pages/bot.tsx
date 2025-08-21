import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Play, Pause, Settings, TrendingUp, TrendingDown, AlertTriangle, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export function BotPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [capital, setCapital] = useState('1000');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [configMode, setConfigMode] = useState<'auto' | 'manual'>('auto');
  const [selectedBotForSettings, setSelectedBotForSettings] = useState<string | null>(null);
  const [activeBotStates, setActiveBotStates] = useState<Record<string, { status: 'active' | 'paused' }>>({});
  const [activeTab, setActiveTab] = useState('ai');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch user bots
  const { data: userBots = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/bots'],
    staleTime: 5000
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (botData: any) => {
      console.log('Creating bot with data:', botData);
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create bot: ${error}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Bot created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      // Switch to Manual tab to show the created bot
      setActiveTab('manual');
    },
    onError: (error) => {
      console.error('Failed to create bot:', error);
    }
  });

  // Update bot mutation
  const updateBotMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update bot');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    }
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete bot');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    }
  });

  const strategies = [
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
      name: 'Smart DCA',
      description: 'AI-powered DCA with market timing and RSI signals',
      risk: 'Low',
      profitPotential: 'Medium-High',
      features: ['RSI-based entries', 'Support/resistance levels', 'Auto take-profit'],
      winRate: '85%',
      avgReturn: '12-18%/month',
    },
    {
      id: 'momentum_ai',
      name: 'AI Momentum',
      description: 'Machine learning trend detection with smart position sizing',
      risk: 'Medium-High',
      profitPotential: 'Very High',
      features: ['ML trend analysis', 'Dynamic position sizing', 'Advanced stop-loss'],
      winRate: '72%',
      avgReturn: '25-40%/month',
    },
    {
      id: 'scalping',
      name: 'High-Frequency Scalping',
      description: 'Ultra-fast trades on micro-movements with high volume',
      risk: 'High',
      profitPotential: 'Very High',
      features: ['Sub-second execution', 'Volume analysis', 'Latency optimization'],
      winRate: '68%',
      avgReturn: '30-50%/month',
    },
    {
      id: 'arbitrage_advanced',
      name: 'Cross-Exchange Arbitrage',
      description: 'Multi-exchange price differences with funding rate optimization',
      risk: 'Low',
      profitPotential: 'Medium',
      features: ['Multi-exchange monitoring', 'Funding rate arbitrage', 'Auto-rebalancing'],
      winRate: '92%',
      avgReturn: '8-15%/month',
    },
    {
      id: 'mean_reversion',
      name: 'Mean Reversion Pro',
      description: 'Statistical analysis of price deviations with Bollinger Bands',
      risk: 'Medium',
      profitPotential: 'High',
      features: ['Bollinger Band signals', 'Statistical analysis', 'Risk parity'],
      winRate: '80%',
      avgReturn: '18-28%/month',
    },
    {
      id: 'rsi_advanced',
      name: 'Advanced RSI Bot',
      description: 'Multi-timeframe RSI with divergence detection and oversold/overbought zones',
      risk: 'Medium',
      profitPotential: 'Very High',
      features: ['RSI divergence detection', 'Multi-timeframe analysis', 'Dynamic thresholds', 'Volume confirmation'],
      winRate: '86%',
      avgReturn: '22-35%/month',
    },
    {
      id: 'macd_pro',
      name: 'MACD Master',
      description: 'Advanced MACD with histogram analysis, signal line crossovers, and trend confirmation',
      risk: 'Medium-High',
      profitPotential: 'Very High',
      features: ['MACD histogram analysis', 'Signal line crossovers', 'Zero-line bounces', 'Trend momentum'],
      winRate: '83%',
      avgReturn: '28-42%/month',
    },
    {
      id: 'ma_crossover',
      name: 'Moving Average Master',
      description: 'Multiple MA crossover system with EMA, SMA, and adaptive moving averages',
      risk: 'Low-Medium',
      profitPotential: 'High',
      features: ['EMA/SMA crossovers', 'Adaptive MA', 'Golden/Death crosses', 'Trend strength filter'],
      winRate: '79%',
      avgReturn: '16-26%/month',
    },
    {
      id: 'triple_indicator',
      name: 'Triple Indicator Fusion',
      description: 'Combined RSI + MACD + MA analysis with advanced signal filtering',
      risk: 'Medium',
      profitPotential: 'Extremely High',
      features: ['RSI+MACD+MA fusion', 'Signal confirmation', 'False signal filtering', 'Multi-layer analysis'],
      winRate: '89%',
      avgReturn: '35-55%/month',
    },
  ];

  const activeBots = [
    {
      id: '1',
      strategy: 'Grid Trading Pro',
      pair: 'BTCUSDT',
      status: 'active',
      profit: '+$847.52',
      runtime: '12d 6h',
      roi: '+18.4%',
      trades: 234,
      winRate: '87%',
    },
    {
      id: '2',
      strategy: 'AI Momentum',
      pair: 'ETHUSDT',
      status: 'active',
      profit: '+$623.18',
      runtime: '8d 14h',
      roi: '+15.7%',
      trades: 89,
      winRate: '74%',
    },
    {
      id: '3',
      strategy: 'Advanced RSI Bot',
      pair: 'ADAUSDT',
      status: 'active',
      profit: '+$1,134.67',
      runtime: '18d 11h',
      roi: '+22.7%',
      trades: 298,
      winRate: '88%',
    },
    {
      id: '4',
      strategy: 'MACD Master',
      pair: 'SOLUSDT',
      status: 'active',
      profit: '+$892.33',
      runtime: '10d 8h',
      roi: '+17.8%',
      trades: 127,
      winRate: '84%',
    },
    {
      id: '5',
      strategy: 'Triple Indicator Fusion',
      pair: 'DOTUSDT',
      status: 'active',
      profit: '+$2,156.89',
      runtime: '25d 14h',
      roi: '+43.1%',
      trades: 189,
      winRate: '91%',
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'high': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handlePauseBot = (botId: string) => {
    setActiveBotStates(prev => ({
      ...prev,
      [botId]: {
        status: prev[botId]?.status === 'paused' ? 'active' : 'paused'
      }
    }));
  };

  const handleBotSettings = (botId: string) => {
    setSelectedBotForSettings(botId);
  };

  const getBotStatus = (botId: string, originalStatus: string) => {
    return activeBotStates[botId]?.status || originalStatus;
  };

  const handleCreateAIBot = async (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      console.error('Strategy not found:', strategyId);
      return;
    }

    const botData = {
      name: strategy.name,
      strategy: 'ai',
      tradingPair: 'BTCUSDT',
      capital: capital || '1000',
      riskLevel,
      userId: 'demo-user', // Demo user for now
      config: {
        aiStrategy: strategyId,
        autoConfig: configMode === 'auto'
      }
    };

    console.log('Creating AI bot:', botData);
    createBotMutation.mutate(botData);
  };

  const handleToggleBotStatus = async (bot: any) => {
    const newStatus = bot.status === 'active' ? 'inactive' : 'active';
    updateBotMutation.mutate({
      id: bot.id,
      updates: { status: newStatus }
    });
  };

  const handleDeleteBot = async (botId: string) => {
    deleteBotMutation.mutate(botId);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <h1 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Trading Bots
        </h1>
        <p className="text-muted-foreground text-sm">Automate your trading strategies</p>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" data-testid="tab-ai">AI Bots</TabsTrigger>
            <TabsTrigger value="manual" data-testid="tab-manual">My Bots</TabsTrigger>
          </TabsList>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">AI-Powered Strategies</h3>
                <p className="text-sm text-muted-foreground">Autonomous trading bots powered by artificial intelligence</p>
              </div>
              <div className="grid gap-3">
                {strategies.map((strategy) => (
                  <Card key={strategy.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium mb-1">{strategy.name}</div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {strategy.description}
                          </div>
                          <div className="flex gap-2 mb-2">
                            <Badge className={getRiskColor(strategy.risk)}>
                              {strategy.risk} Risk
                            </Badge>
                            <Badge variant="outline">
                              {strategy.avgReturn}
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                              <Bot className="h-3 w-3 mr-1" />
                              AI Autonomous
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-500 mb-1">Active</div>
                          <div className="text-xs text-muted-foreground">24/7 Trading</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                        <div>
                          <div className="text-muted-foreground">Win Rate</div>
                          <div className="font-medium text-green-500">{strategy.winRate}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Profit Potential</div>
                          <div className="font-medium">{strategy.profitPotential}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Key Features:</div>
                        <div className="flex flex-wrap gap-1">
                          {strategy.features.slice(0, 3).map((feature, idx) => (
                            <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Manual Tab - User's Created Bots */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">My Trading Bots</h3>
              <Button 
                size="sm" 
                onClick={() => setShowCreateForm(true)}
                data-testid="button-create-manual-bot"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Bot
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : userBots.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">No bots created yet</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Create your first trading bot or try AI strategies
                  </div>
                  <Button 
                    onClick={() => setShowCreateForm(true)}
                    data-testid="button-create-first-bot"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Bot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {userBots.map((bot: any) => (
                  <Card key={bot.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{bot.name}</div>
                          <Badge variant={bot.status === 'active' ? 'default' : 'secondary'}>
                            {bot.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {bot.strategy}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleToggleBotStatus(bot)}
                            disabled={updateBotMutation.isPending}
                            data-testid={`button-toggle-${bot.id}`}
                          >
                            {bot.status === 'active' ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            data-testid={`button-edit-${bot.id}`}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteBot(bot.id)}
                            disabled={deleteBotMutation.isPending}
                            data-testid={`button-delete-${bot.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-muted-foreground">Pair</div>
                          <div className="font-medium">{bot.tradingPair}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Capital</div>
                          <div className="font-medium">${bot.capital}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">ROI</div>
                          <div className="font-medium text-green-500">+{bot.roi}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Profit</div>
                          <div className="font-medium text-green-500">+${bot.profit}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Risk: {bot.riskLevel}</span>
                        <span>Trades: {bot.trades}</span>
                        <span>Win Rate: {bot.winRate}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Bot Creation Form Modal */}
            {showCreateForm && (
              <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Trading Bot</DialogTitle>
                    <DialogDescription>
                      Configure your custom trading bot with technical indicators and risk management rules.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Basic Configuration</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Bot Name</label>
                          <Input placeholder="My Trading Bot" data-testid="input-bot-name" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Timeframe</label>
                          <Select defaultValue="1h">
                            <SelectTrigger data-testid="select-bot-timeframe">
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
                          <label className="text-sm font-medium mb-2 block">Capital (USDT)</label>
                          <Input
                            type="number"
                            value={capital}
                            onChange={(e) => setCapital(e.target.value)}
                            placeholder="1000"
                            data-testid="input-bot-capital"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Risk Level</label>
                          <Select value={riskLevel} onValueChange={setRiskLevel}>
                            <SelectTrigger data-testid="select-bot-risk">
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
                    </div>

                    {/* Technical Indicators */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Technical Indicators</h4>
                      
                      {/* RSI */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">RSI (Relative Strength Index)</div>
                            <Switch data-testid="switch-rsi" />
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Period</label>
                              <Input type="number" placeholder="14" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Condition</label>
                              <Select defaultValue="above">
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="above">Above</SelectItem>
                                  <SelectItem value="below">Below</SelectItem>
                                  <SelectItem value="between">Between</SelectItem>
                                  <SelectItem value="oversold">Oversold (30)</SelectItem>
                                  <SelectItem value="overbought">Overbought (70)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Value</label>
                              <Input type="number" placeholder="50" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Value Max</label>
                              <Input type="number" placeholder="70" className="h-8 text-xs" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* MACD */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">MACD</div>
                            <Switch data-testid="switch-macd" />
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Fast Period</label>
                              <Input type="number" placeholder="12" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Slow Period</label>
                              <Input type="number" placeholder="26" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Signal Period</label>
                              <Input type="number" placeholder="9" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Condition</label>
                              <Select defaultValue="bullish_crossover">
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bullish_crossover">Bullish Crossover</SelectItem>
                                  <SelectItem value="bearish_crossover">Bearish Crossover</SelectItem>
                                  <SelectItem value="above_signal">Above Signal</SelectItem>
                                  <SelectItem value="below_signal">Below Signal</SelectItem>
                                  <SelectItem value="above_zero">Above Zero</SelectItem>
                                  <SelectItem value="below_zero">Below Zero</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Moving Averages */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">Moving Averages</div>
                            <Switch data-testid="switch-ma" />
                          </div>
                          
                          {/* MA Selection */}
                          <div className="mb-4">
                            <label className="text-xs font-medium mb-2 block">Select Moving Averages to Use</label>
                            <div className="flex gap-4">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="use-ma1" defaultChecked />
                                <label htmlFor="use-ma1" className="text-sm">MA1</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="use-ma2" defaultChecked />
                                <label htmlFor="use-ma2" className="text-sm">MA2</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="use-ma3" />
                                <label htmlFor="use-ma3" className="text-sm">MA3</label>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* MA1 Configuration */}
                            <div className="border-l-2 border-blue-500 pl-3">
                              <div className="text-xs font-medium text-blue-600 mb-2">MA1 Configuration</div>
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Type</label>
                                  <Select defaultValue="SMA">
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SMA">SMA</SelectItem>
                                      <SelectItem value="EMA">EMA</SelectItem>
                                      <SelectItem value="WMA">WMA</SelectItem>
                                      <SelectItem value="DEMA">DEMA</SelectItem>
                                      <SelectItem value="TEMA">TEMA</SelectItem>
                                      <SelectItem value="HMA">HMA</SelectItem>
                                      <SelectItem value="VWMA">VWMA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Period</label>
                                  <Input type="number" placeholder="10" className="h-8 text-xs" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Condition</label>
                                  <Select defaultValue="above">
                                    <SelectTrigger className="h-8 text-xs">
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
                                  <label className="text-xs font-medium mb-1 block">Period Value</label>
                                  <Input type="number" placeholder="20" className="h-8 text-xs" />
                                </div>
                              </div>
                            </div>

                            {/* MA2 Configuration */}
                            <div className="border-l-2 border-green-500 pl-3">
                              <div className="text-xs font-medium text-green-600 mb-2">MA2 Configuration</div>
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Type</label>
                                  <Select defaultValue="EMA">
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SMA">SMA</SelectItem>
                                      <SelectItem value="EMA">EMA</SelectItem>
                                      <SelectItem value="WMA">WMA</SelectItem>
                                      <SelectItem value="DEMA">DEMA</SelectItem>
                                      <SelectItem value="TEMA">TEMA</SelectItem>
                                      <SelectItem value="HMA">HMA</SelectItem>
                                      <SelectItem value="VWMA">VWMA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Period</label>
                                  <Input type="number" placeholder="20" className="h-8 text-xs" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Condition</label>
                                  <Select defaultValue="above">
                                    <SelectTrigger className="h-8 text-xs">
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
                                  <label className="text-xs font-medium mb-1 block">Period Value</label>
                                  <Input type="number" placeholder="50" className="h-8 text-xs" />
                                </div>
                              </div>
                            </div>

                            {/* MA3 Configuration */}
                            <div className="border-l-2 border-orange-500 pl-3">
                              <div className="text-xs font-medium text-orange-600 mb-2">MA3 Configuration</div>
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Type</label>
                                  <Select defaultValue="SMA">
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SMA">SMA</SelectItem>
                                      <SelectItem value="EMA">EMA</SelectItem>
                                      <SelectItem value="WMA">WMA</SelectItem>
                                      <SelectItem value="DEMA">DEMA</SelectItem>
                                      <SelectItem value="TEMA">TEMA</SelectItem>
                                      <SelectItem value="HMA">HMA</SelectItem>
                                      <SelectItem value="VWMA">VWMA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Period</label>
                                  <Input type="number" placeholder="50" className="h-8 text-xs" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Condition</label>
                                  <Select defaultValue="above">
                                    <SelectTrigger className="h-8 text-xs">
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
                                  <label className="text-xs font-medium mb-1 block">Period Value</label>
                                  <Input type="number" placeholder="100" className="h-8 text-xs" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Stochastic */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">Stochastic Oscillator</div>
                            <Switch data-testid="switch-stochastic" />
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">K Period</label>
                              <Input type="number" placeholder="14" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">D Period</label>
                              <Input type="number" placeholder="3" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Smooth K</label>
                              <Input type="number" placeholder="3" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Condition</label>
                              <Select defaultValue="oversold">
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="oversold">Oversold (20)</SelectItem>
                                  <SelectItem value="overbought">Overbought (80)</SelectItem>
                                  <SelectItem value="k_above_d">%K Above %D</SelectItem>
                                  <SelectItem value="k_below_d">%K Below %D</SelectItem>
                                  <SelectItem value="k_crossing_up_d">%K Crossing Up %D</SelectItem>
                                  <SelectItem value="k_crossing_down_d">%K Crossing Down %D</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Price Conditions */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">Price vs MA Conditions</div>
                            <Switch data-testid="switch-price" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Condition</label>
                              <Select defaultValue="above">
                                <SelectTrigger className="h-8 text-xs">
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
                              <label className="text-xs font-medium mb-1 block">MA Type</label>
                              <Select defaultValue="SMA">
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SMA">SMA</SelectItem>
                                  <SelectItem value="EMA">EMA</SelectItem>
                                  <SelectItem value="WMA">WMA</SelectItem>
                                  <SelectItem value="DEMA">DEMA</SelectItem>
                                  <SelectItem value="TEMA">TEMA</SelectItem>
                                  <SelectItem value="HMA">HMA</SelectItem>
                                  <SelectItem value="VWMA">VWMA</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">MA Period</label>
                              <Input type="number" placeholder="20" className="h-8 text-xs" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Additional Indicators */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Additional Indicators</h4>
                      
                      {/* Bollinger Bands */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">Bollinger Bands</div>
                            <Switch data-testid="switch-bollinger" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Period</label>
                              <Input type="number" placeholder="20" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Std Dev</label>
                              <Input type="number" placeholder="2" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Condition</label>
                              <Select defaultValue="price_touches_lower">
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="price_touches_lower">Price Touches Lower</SelectItem>
                                  <SelectItem value="price_touches_upper">Price Touches Upper</SelectItem>
                                  <SelectItem value="price_above_upper">Price Above Upper</SelectItem>
                                  <SelectItem value="price_below_lower">Price Below Lower</SelectItem>
                                  <SelectItem value="squeeze">Bollinger Squeeze</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Volume */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium">Volume Analysis</div>
                            <Switch data-testid="switch-volume" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Period</label>
                              <Input type="number" placeholder="20" className="h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Condition</label>
                              <Select defaultValue="above_average">
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="above_average">Above Average</SelectItem>
                                  <SelectItem value="below_average">Below Average</SelectItem>
                                  <SelectItem value="spike">Volume Spike (2x)</SelectItem>
                                  <SelectItem value="surge">Volume Surge (3x)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Multiplier</label>
                              <Input type="number" placeholder="1.5" className="h-8 text-xs" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Entry/Exit Conditions */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Trading Rules</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="font-medium mb-3">Entry Conditions</div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="entry-rsi" />
                                <label htmlFor="entry-rsi" className="text-sm">RSI below oversold</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="entry-macd" />
                                <label htmlFor="entry-macd" className="text-sm">MACD bullish crossover</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="entry-ma" />
                                <label htmlFor="entry-ma" className="text-sm">Price above MA</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="entry-volume" />
                                <label htmlFor="entry-volume" className="text-sm">High volume</label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="font-medium mb-3">Exit Conditions</div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="exit-rsi" />
                                <label htmlFor="exit-rsi" className="text-sm">RSI above overbought</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="exit-macd" />
                                <label htmlFor="exit-macd" className="text-sm">MACD bearish crossover</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="exit-ma" />
                                <label htmlFor="exit-ma" className="text-sm">Price below MA</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="exit-profit" />
                                <label htmlFor="exit-profit" className="text-sm">Take profit target</label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Risk Management */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Risk Management</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Stop Loss (%)</label>
                          <Input type="number" placeholder="2.0" data-testid="input-stop-loss" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Take Profit (%)</label>
                          <Input type="number" placeholder="4.0" data-testid="input-take-profit" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Max Position Size (%)</label>
                          <Input type="number" placeholder="25" data-testid="input-position-size" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Leverage</label>
                          <Select defaultValue="1">
                            <SelectTrigger data-testid="select-leverage">
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
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowCreateForm(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        disabled={createBotMutation.isPending}
                        data-testid="button-save-create"
                      >
                        {createBotMutation.isPending ? 'Creating...' : 'Create Bot'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
