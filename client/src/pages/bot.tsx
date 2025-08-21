import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
              <h3 className="text-lg font-semibold">AI-Powered Strategies</h3>
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
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateAIBot(strategy.id)}
                          disabled={createBotMutation.isPending}
                          data-testid={`button-create-${strategy.id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {createBotMutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
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
              <Button size="sm" data-testid="button-create-manual-bot">
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
                  <Button data-testid="button-create-first-bot">
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
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
