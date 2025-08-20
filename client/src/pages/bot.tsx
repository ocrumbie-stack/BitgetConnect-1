import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bot, Play, Pause, Settings, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export function BotPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [capital, setCapital] = useState('1000');
  const [riskLevel, setRiskLevel] = useState('medium');

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
      strategy: 'Smart DCA',
      pair: 'XRPUSDT',
      status: 'paused',
      profit: '+$198.45',
      runtime: '15d 3h',
      roi: '+9.9%',
      trades: 156,
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

      <div className="p-4 space-y-6">
        {/* Active Bots */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Bots</h2>
          {activeBots.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <div className="text-lg font-medium mb-2">No active bots</div>
                <div className="text-sm text-muted-foreground">Create your first trading bot below</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeBots.map((bot) => (
                <Card key={bot.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{bot.strategy}</div>
                        <Badge variant={bot.status === 'active' ? 'default' : 'secondary'}>
                          {bot.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" data-testid={`button-pause-${bot.id}`}>
                          <Pause className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`button-settings-${bot.id}`}>
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-muted-foreground">Pair</div>
                        <div className="font-medium">{bot.pair}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">ROI</div>
                        <div className="font-medium text-green-500">{bot.roi}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Profit</div>
                        <div className="font-medium text-green-500">{bot.profit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Win Rate</div>
                        <div className="font-medium">{bot.winRate}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Trades: {bot.trades}</span>
                      <span>Runtime: {bot.runtime}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create New Bot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create New Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strategy Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Trading Strategy</label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger data-testid="select-strategy">
                  <SelectValue placeholder="Choose a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Info */}
            {selectedStrategy && (
              <Card className="bg-accent/50">
                <CardContent className="p-4">
                  {(() => {
                    const strategy = strategies.find(s => s.id === selectedStrategy);
                    return strategy ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{strategy.name}</div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              Win Rate: {strategy.winRate}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {strategy.avgReturn}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">{strategy.description}</div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Risk:</span>
                            <Badge className={getRiskColor(strategy.risk)} variant="secondary">
                              {strategy.risk}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Profit Potential:</span>
                            <span className="font-medium">{strategy.profitPotential}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium mb-2">Key Features:</div>
                          <div className="flex flex-wrap gap-1">
                            {strategy.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Capital */}
            <div>
              <label className="text-sm font-medium mb-2 block">Initial Capital (USDT)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                data-testid="input-capital"
              />
            </div>

            {/* Risk Level */}
            <div>
              <label className="text-sm font-medium mb-2 block">Risk Level</label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger data-testid="select-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk (Conservative)</SelectItem>
                  <SelectItem value="medium">Medium Risk (Balanced)</SelectItem>
                  <SelectItem value="high">High Risk (Aggressive)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Advanced Configuration</h4>
              
              {/* Risk Management */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="font-medium text-sm">Risk Management</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Max Drawdown %</label>
                      <Input type="number" placeholder="5" className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Stop Loss %</label>
                      <Input type="number" placeholder="2" className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Take Profit %</label>
                      <Input type="number" placeholder="3" className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Max Positions</label>
                      <Input type="number" placeholder="5" className="h-8 text-xs" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Optimization */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="font-medium text-sm">Performance Optimization</div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">AI Enhancement</div>
                        <div className="text-xs text-muted-foreground">Use machine learning for better entries</div>
                      </div>
                      <Switch data-testid="switch-ai-enhancement" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Volume Analysis</div>
                        <div className="text-xs text-muted-foreground">Trade only during high volume periods</div>
                      </div>
                      <Switch data-testid="switch-volume-analysis" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">News Sentiment</div>
                        <div className="text-xs text-muted-foreground">Pause trading on negative news</div>
                      </div>
                      <Switch data-testid="switch-news-sentiment" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Multi-timeframe Analysis</div>
                        <div className="text-xs text-muted-foreground">Analyze multiple timeframes for signals</div>
                      </div>
                      <Switch data-testid="switch-multi-timeframe" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Automation Settings */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="font-medium text-sm">Automation Settings</div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Auto-restart on stop</div>
                        <div className="text-xs text-muted-foreground">Automatically restart bot if stopped</div>
                      </div>
                      <Switch data-testid="switch-auto-restart" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Dynamic position sizing</div>
                        <div className="text-xs text-muted-foreground">Adjust position size based on volatility</div>
                      </div>
                      <Switch data-testid="switch-dynamic-sizing" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Profit compounding</div>
                        <div className="text-xs text-muted-foreground">Reinvest profits to increase position size</div>
                      </div>
                      <Switch data-testid="switch-compounding" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Email notifications</div>
                        <div className="text-xs text-muted-foreground">Get notified on significant events</div>
                      </div>
                      <Switch data-testid="switch-notifications" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Create Button */}
            <Button
              className="w-full"
              disabled={!selectedStrategy || !capital}
              data-testid="button-create-bot"
            >
              <Play className="h-4 w-4 mr-2" />
              Create & Start Bot
            </Button>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-500">Important Notice</div>
                <div className="text-muted-foreground">
                  Trading bots carry risk. Only invest what you can afford to lose. Past performance doesn't guarantee future results.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bot Performance Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">+$1,247.89</div>
                <div className="text-sm text-muted-foreground">Total Profit (30d)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">84.2%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">23.7%</div>
                <div className="text-sm text-muted-foreground">Monthly ROI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">1.85</div>
                <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Drawdown</span>
                <span className="text-red-500">-4.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Trade Duration</span>
                <span>2h 14m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Best Performing Bot</span>
                <span className="text-green-500">Grid Trading Pro (+18.4%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Trades</span>
                <span>1,847</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Strategy Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strategies.slice(0, 3).map((strategy, index) => (
                <div key={strategy.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      'bg-orange-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{strategy.name}</div>
                      <div className="text-xs text-muted-foreground">Win Rate: {strategy.winRate}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-500">{strategy.avgReturn}</div>
                    <div className="text-xs text-muted-foreground">Monthly</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}