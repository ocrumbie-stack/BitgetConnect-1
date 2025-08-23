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
import { Bot, Plus, Play, Edit2, Trash2, TrendingUp, TrendingDown, Settings, Square, Bell, ChevronDown, ChevronRight, Activity, BarChart3, Target, Zap, Users, DollarSign, TrendingUp as Trend, Info } from 'lucide-react';
import { AlertCenter } from '@/components/AlertCenter';

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
  const [pairSearch, setPairSearch] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showAlertCenter, setShowAlertCenter] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<{[key: string]: boolean}>({});
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [showBotInfo, setShowBotInfo] = useState(false);
  const [selectedBotInfo, setSelectedBotInfo] = useState<any>(null);
  const [expandedBots, setExpandedBots] = useState<{[key: string]: boolean}>({});



  // Fetch user strategies
  const { data: userStrategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/bot-strategies']
  });

  // Fetch active executions
  const { data: allExecutions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ['/api/bot-executions']
  });

  // Filter only active executions in frontend
  const activeExecutions = allExecutions.filter((execution: any) => execution.status === 'active');

  // Fetch futures data for trading pairs
  const { data: futuresData = [] } = useQuery({
    queryKey: ['/api/futures'],
    refetchInterval: 10000
  });

  // Fetch folders for dropdown
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/folders', 'default-user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/screeners/default-user');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
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

  // Terminate execution mutation
  const handleTerminateExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const response = await fetch(`/api/bot-executions/${executionId}/terminate`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to stop bot: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
    }
  });

  // Terminate all bots in a folder
  const handleTerminateFolder = useMutation({
    mutationFn: async (folderName: string) => {
      const response = await fetch(`/api/bot-executions/terminate-folder/${folderName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default-user' })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to stop folder bots: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
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
    if (!capital) return;

    try {
      if (selectedFolder) {
        // Deploy to folder
        const folder = (folders as any[]).find(f => f.id === selectedFolder);
        if (!folder || !folder.tradingPairs || folder.tradingPairs.length === 0) {
          alert('Selected folder has no trading pairs. Please add pairs to the folder first.');
          return;
        }

        // Check if this folder already has active bots running
        const folderActiveExecutions = activeExecutions.filter((execution: any) => 
          execution.folderName === folder.name && execution.status === 'active'
        );
        
        if (folderActiveExecutions.length > 0) {
          alert(`Folder "${folder.name}" already has ${folderActiveExecutions.length} active bots running. Please stop the existing bots before deploying new ones.`);
          return;
        }

        // Deploy strategy to all pairs in the folder
        for (const pair of folder.tradingPairs) {
          const executionData = {
            userId: 'default-user',
            strategyId: strategy.isAI ? strategy.id : strategy.id,
            tradingPair: pair,
            capital,
            leverage,
            status: 'active',
            deploymentType: 'folder',
            folderId: selectedFolder,
            botName: `${folder.name} - ${strategy.name}`, // Use folder name as bot name
            folderName: folder.name // Also store folder name for compatibility
          };
          
          await runStrategyMutation.mutateAsync(executionData);
        }
        
        setShowRunDialog(false);
        alert(`Strategy deployed to ${folder.tradingPairs.length} pairs in "${folder.name}" folder!`);
      } else if (tradingPair) {
        // Deploy to individual pair
        const executionData = {
          userId: 'default-user',
          strategyId: strategy.isAI ? strategy.id : strategy.id,
          tradingPair,
          capital,
          leverage,
          status: 'active',
          deploymentType: 'manual'
        };
        
        await runStrategyMutation.mutateAsync(executionData);
        setShowRunDialog(false);
        alert(`Strategy deployed to ${tradingPair}!`);
      } else {
        alert('Please select either a trading pair or a folder to deploy the strategy.');
      }
    } catch (error) {
      console.error('Failed to deploy strategy:', error);
      alert('Failed to deploy strategy: ' + (error as Error).message);
    }
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (window.confirm('Are you sure you want to delete this strategy?')) {
      deleteStrategyMutation.mutate(strategyId);
    }
  };



  // AI Recommendation function
  const generateRecommendations = () => {
    if (!futuresData || !Array.isArray(futuresData) || futuresData.length === 0) return;

    const coins = futuresData as any[];
    
    // Analyze coins and score them based on daily movement patterns
    const scored = coins.map((coin: any) => {
      const price = parseFloat(coin.price);
      const change24h = parseFloat(coin.change24h);
      const volume24h = parseFloat(coin.volume24h);
      
      let score = 0;
      let reasons = [];
      
      // Primary focus: Daily movement patterns (80% of scoring)
      const absChange = Math.abs(change24h);
      
      // Exceptional daily movers (15%+ change)
      if (absChange >= 15) {
        score += 45;
        reasons.push(change24h > 0 ? 'Explosive upward move' : 'Major correction opportunity');
      }
      // Strong daily movers (8-15% change)
      else if (absChange >= 8) {
        score += 40;
        reasons.push(change24h > 0 ? 'Strong daily rally' : 'Significant daily drop');
      }
      // Good daily movers (4-8% change)
      else if (absChange >= 4) {
        score += 35;
        reasons.push(change24h > 0 ? 'Solid upward momentum' : 'Notable downward move');
      }
      // Moderate daily movers (2-4% change)
      else if (absChange >= 2) {
        score += 25;
        reasons.push(change24h > 0 ? 'Positive momentum' : 'Downward pressure');
      }
      // Steady movers (1-2% change)
      else if (absChange >= 1) {
        score += 15;
        reasons.push('Steady movement');
      }
      
      // Direction-specific bonuses
      if (change24h > 10) {
        score += 10;
        reasons.push('Breaking out');
      } else if (change24h < -10) {
        score += 10;
        reasons.push('Oversold potential');
      }
      
      // Volume factor (20% of scoring) - ensures liquidity
      if (volume24h > 50000000) { // > 50M volume
        score += 15;
        reasons.push('High liquidity');
      } else if (volume24h > 10000000) { // > 10M volume
        score += 10;
        reasons.push('Good liquidity');
      } else if (volume24h > 1000000) { // > 1M volume
        score += 8;
        reasons.push('Adequate liquidity');
      } else if (volume24h > 500000) { // > 500K volume
        score += 5;
        reasons.push('Basic liquidity');
      }
      
      // Bonus for consistent patterns
      if (absChange >= 3 && volume24h > 5000000) {
        score += 10;
        reasons.push('Volume confirms move');
      }
      
      // Exclude very low activity coins (more lenient)
      if (volume24h < 100000 || price < 0.000001) {
        score = 0;
        reasons = ['Insufficient activity'];
      }
      
      // Special patterns detection
      if (absChange >= 20) {
        reasons.push('Extreme volatility');
      } else if (absChange >= 5 && absChange <= 12) {
        reasons.push('Ideal trading range');
      }
      
      return {
        ...coin,
        score,
        reasons: reasons.slice(0, 3), // Limit to top 3 reasons
        recommendation: score > 60 ? 'Excellent' : score > 45 ? 'Good' : score > 25 ? 'Fair' : 'Poor',
        dailyMove: absChange
      };
    });
    
    // Debug: Log scoring details
    console.log('Total coins analyzed:', scored.length);
    console.log('Score distribution:', scored.map(c => ({ symbol: c.symbol, score: c.score, change: c.change24h, volume: c.volume24h })).slice(0, 10));
    
    // Sort primarily by daily movement, then by score
    const topRecommendations = scored
      .filter(coin => coin.score > 5) // Much lower threshold to include any movement
      .sort((a, b) => {
        // First sort by daily movement magnitude, then by overall score
        const moveA = Math.abs(parseFloat(a.change24h));
        const moveB = Math.abs(parseFloat(b.change24h));
        if (moveB !== moveA) return moveB - moveA;
        return b.score - a.score;
      })
      .slice(0, 15); // Show more results for daily movers
    
    console.log('Generated recommendations:', topRecommendations.length, 'pairs');
    setRecommendations(topRecommendations);
    setShowRecommendations(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Bot className="h-6 w-6" />
              Trading Bots
            </h1>
            <p className="text-muted-foreground text-sm">
              Create reusable trading strategies and run them on any trading pair
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAlertCenter(true)}
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Alerts
          </Button>
        </div>
      </div>

      {/* Bot Statistics Overview */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {(userStrategies as any[]).length}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">My Strategies</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {(activeExecutions as any[]).length}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Active Bots</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    6
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">AI Bots</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    78%
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">Avg Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                6 Professional Bots Available
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  icon: BarChart3,
                  gradient: 'from-blue-500 to-cyan-500',
                  howItWorks: 'Places multiple buy and sell orders at predetermined intervals above and below the current price. When market moves, it automatically captures profits from price swings while maintaining a balanced position.',
                  strategy: 'Creates a grid of orders that profit from market volatility without predicting direction',
                  bestFor: 'Sideways markets with regular price movements',
                  timeframe: '24/7 continuous operation',
                  indicators: ['Bollinger Bands', 'ATR', 'Volume Profile', 'Support/Resistance'],
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
                  icon: TrendingUp,
                  gradient: 'from-green-500 to-emerald-500',
                  howItWorks: 'Systematically purchases assets at regular intervals, but uses AI to optimize timing based on market conditions. Adjusts purchase amounts based on volatility and sentiment.',
                  strategy: 'Dollar-cost averaging with intelligent timing to reduce average entry price',
                  bestFor: 'Long-term accumulation during market downturns',
                  timeframe: 'Daily to weekly purchase intervals',
                  indicators: ['RSI', 'Moving Averages', 'Market Sentiment', 'Fear & Greed Index'],
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
                  icon: Zap,
                  gradient: 'from-orange-500 to-red-500',
                  howItWorks: 'Detects momentum breakouts using machine learning models trained on price patterns. Executes rapid trades to capture short-term price movements with tight stop-losses.',
                  strategy: 'High-frequency trading based on momentum signals and volume spikes',
                  bestFor: 'Trending markets with strong directional moves',
                  timeframe: 'Seconds to minutes per trade',
                  indicators: ['MACD', 'Momentum Oscillator', 'Volume Flow', 'Price Velocity'],
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
                  icon: Target,
                  gradient: 'from-indigo-500 to-purple-500',
                  howItWorks: 'Monitors price differences across multiple exchanges and executes simultaneous buy/sell orders to capture risk-free profits from price discrepancies.',
                  strategy: 'Risk-free profit from temporary price differences between exchanges',
                  bestFor: 'Stable markets with sufficient liquidity across exchanges',
                  timeframe: 'Milliseconds to seconds per trade',
                  indicators: ['Price Spreads', 'Liquidity Depth', 'Exchange Fees', 'Transfer Times'],
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
                  icon: Trend,
                  gradient: 'from-purple-500 to-pink-500',
                  howItWorks: 'Uses neural networks to identify trend patterns and predict continuation probabilities. Adapts position sizes and entry/exit points based on trend strength and market conditions.',
                  strategy: 'AI-powered trend identification with adaptive position management',
                  bestFor: 'Markets with clear trending patterns and momentum',
                  timeframe: 'Hours to days per trade',
                  indicators: ['AI Pattern Recognition', 'Trend Strength', 'Support/Resistance', 'Market Structure'],
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
                  icon: Activity,
                  gradient: 'from-pink-500 to-rose-500',
                  howItWorks: 'Predicts volatility spikes using advanced statistical models. Uses delta-neutral strategies and dynamic hedging to profit from volatility changes regardless of price direction.',
                  strategy: 'Statistical volatility trading with delta-neutral positioning',
                  bestFor: 'High volatility periods and uncertainty events',
                  timeframe: 'Minutes to hours per trade cycle',
                  indicators: ['Implied Volatility', 'Historical Volatility', 'VIX', 'Option Greeks'],
                }
              ].map((bot) => {
                const IconComponent = bot.icon;
                return (
                  <Card key={bot.id} className="hover:shadow-lg transition-all duration-300 hover:scale-102 overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${bot.gradient}`} />
                    <CardContent className="p-3">
                      {/* Collapsed Header - Always Visible */}
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedBots(prev => ({ ...prev, [bot.id]: !prev[bot.id] }))}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${bot.gradient}`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{bot.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">{bot.winRate}</span>
                              <Badge variant={bot.risk === 'Low' ? 'secondary' : bot.risk === 'Medium' ? 'outline' : 'destructive'} className="text-xs">
                                {bot.risk}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!expandedBots[bot.id] && (
                            <Button 
                              size="sm" 
                              className={`bg-gradient-to-r ${bot.gradient} hover:opacity-90 text-white font-medium text-xs h-7 px-3`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStrategy({ ...bot, isAI: true });
                                setShowRunDialog(true);
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Deploy
                            </Button>
                          )}
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedBots[bot.id] ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedBots[bot.id] && (
                        <div className="mt-3 space-y-3">
                          <p className="text-xs text-muted-foreground">{bot.description}</p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-2 text-center">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Win Rate</div>
                              <div className="text-lg font-bold text-green-700 dark:text-green-300">{bot.winRate}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2 text-center">
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Return</div>
                              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{bot.avgReturn}</div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex flex-wrap gap-1">
                              {bot.features.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              className={`bg-gradient-to-r ${bot.gradient} hover:opacity-90 text-white flex-1 font-medium text-xs h-8`}
                              onClick={() => {
                                setSelectedStrategy({ ...bot, isAI: true });
                                setShowRunDialog(true);
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Deploy Bot
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="px-2 h-8"
                              onClick={() => {
                                setSelectedBotInfo(bot);
                                setShowBotInfo(true);
                              }}
                              data-testid={`button-info-${bot.id}`}
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="px-2 h-8"
                              onClick={() => {
                                setSelectedBot(bot);
                                setShowBotSettings(true);
                              }}
                              data-testid={`button-settings-${bot.id}`}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">My Trading Strategies</h3>
              <Button onClick={() => setShowCreateForm(true)} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Strategy
              </Button>
            </div>

            {strategiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="h-40">
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (userStrategies as any[]).length === 0 ? (
              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-8 text-center">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-10 w-10 text-blue-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Create Your First Strategy</h4>
                  <p className="text-muted-foreground mb-4">Build custom trading strategies with technical indicators and risk management</p>
                  <Button onClick={() => setShowCreateForm(true)} className="bg-gradient-to-r from-blue-500 to-purple-500">
                    <Plus className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(userStrategies as any[]).map((strategy: any) => (
                  <Card key={strategy.id} className="hover:shadow-lg transition-all duration-300 hover:scale-102">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                              <Settings className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-semibold text-lg">{strategy.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {strategy.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className={
                          strategy.config?.positionDirection === 'long' 
                            ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' 
                            : 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
                        }>
                          {strategy.config?.positionDirection === 'long' ? (
                            <><TrendingUp className="h-3 w-3 mr-1" />Long Position</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" />Short Position</>
                          )}
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {strategy.config?.timeframe}
                        </Badge>
                        <Badge variant="outline" className={
                          strategy.riskLevel === 'low' ? 'border-green-300 text-green-600' :
                          strategy.riskLevel === 'medium' ? 'border-yellow-300 text-yellow-600' :
                          'border-red-300 text-red-600'
                        }>
                          {strategy.riskLevel} Risk
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedStrategy(strategy);
                            setShowRunDialog(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 flex-1"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Deploy
                        </Button>
                        <Button size="sm" variant="outline" className="px-3">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteStrategy(strategy.id)}
                          className="px-3 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                {(() => {
                  // Group executions by deployment type and folder
                  const folderGroups: { [key: string]: any[] } = {};
                  const manualExecutions: any[] = [];
                  
                  // Only group active folder executions - exclude terminated ones
                  (activeExecutions as any[]).forEach((execution: any) => {
                    if (execution.status === 'active' && (execution.deploymentType === 'folder_bulk' || execution.deploymentType === 'folder') && (execution.folderName || execution.botName)) {
                      const folderName = execution.folderName || execution.botName;
                      if (!folderGroups[folderName]) {
                        folderGroups[folderName] = [];
                      }
                      folderGroups[folderName].push(execution);
                    } else if (execution.status === 'active' && (!execution.folderName || execution.deploymentType === 'manual')) {
                      manualExecutions.push(execution);
                    }
                  });

                  return (
                    <>
                      {/* Folder-deployed bots grouped by folder */}
                      {Object.entries(folderGroups).map(([folderName, executions]) => (
                        <Card key={folderName} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            {/* Folder Header - Always Visible */}
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
                            >
                              <div className="flex items-center gap-2">
                                {expandedFolders[folderName] ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <h4 className="font-medium">{folderName}</h4>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                                  {executions.length} bots
                                </Badge>
                                <Badge variant="outline" className="text-purple-600 border-purple-300">
                                  Bulk Deployed
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-sm font-medium text-green-500">
                                    +${executions.reduce((sum, ex) => sum + parseFloat(ex.profit || '0'), 0).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {executions.filter(ex => ex.status === 'active').length}/{executions.length} active
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Stop all ${executions.length} bots in ${folderName} folder? This will remove the entire folder from active bots.`)) {
                                      handleTerminateFolder.mutate(folderName);
                                    }
                                  }}
                                  disabled={handleTerminateFolder.isPending}
                                >
                                  <Square className="h-3 w-3 mr-1" />
                                  {handleTerminateFolder.isPending ? 'Stopping...' : 'Stop All'}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedFolders[folderName] && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <div className="mb-3">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Total Capital: ${executions.reduce((sum, ex) => sum + parseFloat(ex.capital || '0'), 0)} • 
                                    Total Trades: {executions.reduce((sum, ex) => sum + parseInt(ex.trades || '0'), 0)}
                                  </p>
                                </div>
                                
                                {/* Individual Bot Details */}
                                <div className="space-y-2">
                                  {executions.map((execution: any) => (
                                    <div key={execution.id} className="flex items-center justify-between p-3 bg-red-950/30 border border-red-500/30 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">{execution.tradingPair}</span>
                                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-400 bg-blue-950/30">
                                          {execution.status}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-3 text-sm">
                                        <span className="text-gray-300">${execution.capital}</span>
                                        <span className={`${parseFloat(execution.profit || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {parseFloat(execution.profit || '0') >= 0 ? '+' : ''}${execution.profit || '0'}
                                        </span>
                                        {execution.status === 'active' && (
                                          <Button 
                                            size="sm" 
                                            variant="destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTerminateExecution.mutate(execution.id);
                                            }}
                                            disabled={handleTerminateExecution.isPending}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs h-7"
                                          >
                                            <Square className="h-3 w-3 mr-1" />
                                            Stop
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}

                      {/* Individual manually deployed bots */}
                      {manualExecutions.map((execution: any) => (
                        <Card key={execution.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{execution.tradingPair}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Capital: ${execution.capital} | Leverage: {execution.leverage}x
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant={execution.status === 'active' ? 'default' : 'secondary'}>
                                    {execution.status}
                                  </Badge>
                                  <Badge variant="outline">
                                    Manual
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-sm font-medium text-green-500">+${execution.profit || '0'}</div>
                                  <div className="text-xs text-muted-foreground">{execution.trades || 0} trades</div>
                                </div>
                                {execution.status === 'active' && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleTerminateExecution.mutate(execution.id)}
                                    disabled={handleTerminateExecution.isPending}
                                  >
                                    <Square className="h-3 w-3 mr-1" />
                                    {handleTerminateExecution.isPending ? 'Stopping...' : 'Stop'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  );
                })()}
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
              Configure the folder and capital for this strategy execution
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Trading Pair</label>
              <div className="relative">
                <Input 
                  placeholder="Type to search pairs (e.g., BTC, ETH, SOL)..."
                  value={tradingPair}
                  onChange={(e) => setTradingPair(e.target.value)}
                  className="pr-4"
                />
                {tradingPair && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Selected: {tradingPair}
                  </div>
                )}
              </div>
              
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={generateRecommendations}
                className="mt-2 w-full"
              >
                🤖 Get AI Recommendations
              </Button>
              
              {/* Folder Selection */}
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Select Folder</label>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose folder to deploy strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {(folders as any[]).map((folder: any) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: folder.color || '#3b82f6' }}
                          />
                          <span>{folder.name}</span>
                          <span className="text-muted-foreground">
                            ({folder.tradingPairs?.length || 0} pairs)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFolder && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Strategy will be deployed to all pairs in this folder
                  </p>
                )}
              </div>
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
                disabled={runStrategyMutation.isPending || (!tradingPair && !selectedFolder) || !capital}
                className="bg-green-600 hover:bg-green-700"
              >
                {runStrategyMutation.isPending ? 'Starting...' : 'Start Bot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Recommendations Dialog */}
      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>🤖 AI Trading Pair Recommendations</DialogTitle>
            <DialogDescription>
              Daily movement analysis - pairs ranked by 24h price action and trading patterns
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {recommendations.map((rec: any, index: number) => (
              <div 
                key={rec.symbol} 
                className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => {
                  setTradingPair(rec.symbol);
                  setShowRecommendations(false);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      <span className="font-semibold text-lg">{rec.symbol}</span>
                    </div>
                    <Badge 
                      variant={rec.recommendation === 'Excellent' ? 'default' : 
                              rec.recommendation === 'Good' ? 'secondary' : 'outline'}
                      className={rec.recommendation === 'Excellent' ? 'bg-green-600' : ''}
                    >
                      {rec.recommendation}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${parseFloat(rec.price).toFixed(4)}</div>
                    <div className={`text-sm font-medium ${parseFloat(rec.change24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(rec.change24h) >= 0 ? '+' : ''}{parseFloat(rec.change24h).toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                  <div>Volume: ${(parseFloat(rec.volume24h) / 1000000).toFixed(1)}M</div>
                  <div>Move: {Math.abs(parseFloat(rec.change24h)).toFixed(1)}%</div>
                  <div>Score: {rec.score}/100</div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {rec.reasons.map((reason: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowRecommendations(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bot Info Dialog */}
      <Dialog open={showBotInfo} onOpenChange={setShowBotInfo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How {selectedBotInfo?.name} Works
            </DialogTitle>
            <DialogDescription>
              Detailed information about this AI trading bot's strategy and operation
            </DialogDescription>
          </DialogHeader>

          {selectedBotInfo && (
            <div className="space-y-6 py-4">
              {/* Bot Header */}
              <div className={`bg-gradient-to-r ${selectedBotInfo.gradient} rounded-lg p-4 text-white`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {selectedBotInfo.icon && (
                      <selectedBotInfo.icon className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{selectedBotInfo.name}</h3>
                    <p className="text-white/90">{selectedBotInfo.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm opacity-90">Win Rate</div>
                    <div className="font-bold text-lg">{selectedBotInfo.winRate}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm opacity-90">Expected Return</div>
                    <div className="font-bold text-lg">{selectedBotInfo.avgReturn}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm opacity-90">Risk Level</div>
                    <div className="font-bold text-lg">{selectedBotInfo.risk}</div>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    How It Works
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedBotInfo.howItWorks}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    Trading Strategy
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedBotInfo.strategy}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    Best Market Conditions
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedBotInfo.bestFor}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Trading Timeframe
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedBotInfo.timeframe}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-500" />
                    Key Indicators Used
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBotInfo.indicators?.map((indicator: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-slate-50 dark:bg-slate-800">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Key Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBotInfo.features?.map((feature: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowBotInfo(false)} className="flex-1">
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setShowBotInfo(false);
                    setSelectedStrategy({ ...selectedBotInfo, isAI: true });
                    setShowRunDialog(true);
                  }} 
                  className={`flex-1 bg-gradient-to-r ${selectedBotInfo.gradient} hover:opacity-90 text-white`}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Deploy This Bot
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bot Settings Dialog */}
      <Dialog open={showBotSettings} onOpenChange={setShowBotSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {selectedBot?.name} Settings
            </DialogTitle>
            <DialogDescription>
              Configure parameters for this AI trading bot
            </DialogDescription>
          </DialogHeader>

          {selectedBot && (
            <div className="space-y-6 py-4">
              {/* Bot Info */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${selectedBot.gradient}`}>
                    {selectedBot.icon && (
                      <selectedBot.icon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold">{selectedBot.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedBot.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Risk Level:</span>
                    <div className="font-medium">{selectedBot.risk}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win Rate:</span>
                    <div className="font-medium text-green-600">{selectedBot.winRate}</div>
                  </div>
                </div>
              </div>

              {/* Configuration Options */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Risk Management</label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Position Size (%)</label>
                  <Input type="number" defaultValue="10" placeholder="10" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage of capital to use per trade
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Stop Loss (%)</label>
                  <Input type="number" defaultValue="2" placeholder="2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum loss per trade
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Take Profit (%)</label>
                  <Input type="number" defaultValue="5" placeholder="5" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Target profit per trade
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Auto-Rebalancing</label>
                    <p className="text-xs text-muted-foreground">
                      Automatically adjust position sizes
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowBotSettings(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setShowBotSettings(false);
                    // Here you could save the settings
                  }} 
                  className="flex-1"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Center */}
      <AlertCenter 
        open={showAlertCenter} 
        onOpenChange={setShowAlertCenter} 
      />
    </div>
  );
}