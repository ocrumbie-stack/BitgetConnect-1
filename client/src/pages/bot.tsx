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
      name: 'Grid Trading',
      description: 'Automated buy/sell orders in a price range',
      risk: 'Medium',
      profitPotential: 'Medium',
    },
    {
      id: 'dca',
      name: 'DCA Bot',
      description: 'Dollar-Cost Averaging with smart entries',
      risk: 'Low',
      profitPotential: 'Low-Medium',
    },
    {
      id: 'momentum',
      name: 'Momentum Trading',
      description: 'Follow trend momentum with stop-loss',
      risk: 'High',
      profitPotential: 'High',
    },
    {
      id: 'arbitrage',
      name: 'Arbitrage Bot',
      description: 'Exploit price differences across exchanges',
      risk: 'Low',
      profitPotential: 'Low',
    },
  ];

  const activeBots = [
    {
      id: '1',
      strategy: 'Grid Trading',
      pair: 'BTCUSDT',
      status: 'active',
      profit: '+$127.50',
      runtime: '2d 14h',
    },
    {
      id: '2',
      strategy: 'DCA Bot',
      pair: 'ETHUSDT',
      status: 'paused',
      profit: '+$67.23',
      runtime: '5d 8h',
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
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Pair</div>
                        <div className="font-medium">{bot.pair}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Profit</div>
                        <div className="font-medium text-green-500">{bot.profit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Runtime</div>
                        <div className="font-medium">{bot.runtime}</div>
                      </div>
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
                        <div className="font-medium mb-2">{strategy.name}</div>
                        <div className="text-sm text-muted-foreground mb-3">{strategy.description}</div>
                        <div className="flex gap-4 text-xs">
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
            <div className="space-y-3">
              <h4 className="font-medium">Advanced Settings</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto-restart on stop</div>
                  <div className="text-sm text-muted-foreground">Automatically restart bot if stopped</div>
                </div>
                <Switch data-testid="switch-auto-restart" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Email notifications</div>
                  <div className="text-sm text-muted-foreground">Get notified on significant events</div>
                </div>
                <Switch data-testid="switch-notifications" />
              </div>
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

        {/* Bot Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">+$194.73</div>
                <div className="text-sm text-muted-foreground">Total Profit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">87%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">2</div>
                <div className="text-sm text-muted-foreground">Active Bots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">7d 22h</div>
                <div className="text-sm text-muted-foreground">Total Runtime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}