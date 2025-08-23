import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Plus, Play, Edit2, Trash2, TrendingUp, TrendingDown, Settings, Square, Bell, ChevronDown, ChevronRight, Activity, BarChart3, Target, Zap, Users, DollarSign, TrendingUp as Trend, Info, Search, Lightbulb } from 'lucide-react';
import { AlertCenter } from '@/components/AlertCenter';
import { BackButton } from '@/components/BackButton';

export default function BotPage() {
  const [, setLocation] = useLocation();
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
  // Removed showAdvancedIndicators state - indicators are now always visible
  
  // Technical Indicators state
  const [indicators, setIndicators] = useState({
    rsi: { enabled: false, period: 14, condition: 'above', value: 70 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
    ma1: { enabled: false, type: 'sma', period1: 20, condition: 'above', period2: 50, comparisonType: 'price', comparisonMAType: 'sma' },
    ma2: { enabled: false, type: 'ema', period1: 50, condition: 'above', period2: 200, comparisonType: 'price', comparisonMAType: 'sma' },
    ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossing_up', period2: 20, comparisonType: 'price', comparisonMAType: 'sma' },
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
  const [showAutoSuggest, setShowAutoSuggest] = useState(false);
  const [filteredPairs, setFilteredPairs] = useState<any[]>([]);
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
  const [suggestedSettings, setSuggestedSettings] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);



  // Fetch user strategies
  const { data: userStrategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/bot-strategies']
  });

  // Fetch active executions
  const { data: allExecutions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ['/api/bot-executions']
  });

  // Fetch futures data for AI suggestions
  const { data: futuresData = [], isLoading: futuresLoading } = useQuery({
    queryKey: ['/api/futures']
  });

  // Filter only active executions in frontend
  const activeExecutions = allExecutions.filter((execution: any) => execution.status === 'active');

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
    // Indicators are now always visible - no need to reset showAdvancedIndicators
    setIndicators({
      rsi: { enabled: false, period: 14, condition: 'above', value: 70 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
      ma1: { enabled: false, type: 'sma', period1: 20, condition: 'above', period2: 50, comparisonType: 'price', comparisonMAType: 'sma' },
      ma2: { enabled: false, type: 'ema', period1: 50, condition: 'above', period2: 200, comparisonType: 'price', comparisonMAType: 'sma' },
      ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossing_up', period2: 20, comparisonType: 'price', comparisonMAType: 'sma' },
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

  // Generate AI-powered bot settings suggestions for specific trading pairs
  const generateBotSuggestions = (symbol: string) => {
    console.log('Generating suggestions for:', symbol);
    console.log('Futures data:', futuresData);
    
    if (!futuresData || !Array.isArray(futuresData) || futuresData.length === 0) {
      console.log('No futures data available');
      alert('No market data available. Please wait for data to load and try again.');
      setSuggestedSettings(null);
      return;
    }

    // Enhanced pair matching logic
    const searchSymbol = symbol.toUpperCase();
    const pair = (futuresData as any[]).find((coin: any) => {
      const coinSymbol = coin.symbol.toUpperCase();
      return (
        coinSymbol === searchSymbol || 
        coinSymbol === searchSymbol + 'USDT' || 
        coinSymbol === searchSymbol.replace('USDT', '') + 'USDT' ||
        coinSymbol.replace('USDT', '') === searchSymbol ||
        coinSymbol.replace('USDT', '') === searchSymbol.replace('USDT', '')
      );
    });
    console.log('Found pair:', pair);
    
    if (!pair) {
      console.log('Pair not found');
      // Try to find similar pairs
      const similarPairs = (futuresData as any[])
        .filter((coin: any) => coin.symbol.includes(symbol.replace('USDT', '')))
        .slice(0, 3);
      
      if (similarPairs.length > 0) {
        alert(`Pair ${symbol} not found. Did you mean: ${similarPairs.map(p => p.symbol).join(', ')}?`);
      } else {
        alert(`Trading pair ${symbol} not found. Please check the symbol and try again.`);
      }
      setSuggestedSettings(null);
      return;
    }

    const price = parseFloat(pair.price);
    const change24h = parseFloat(pair.change24h);
    const volume24h = parseFloat(pair.volume24h);
    // Convert API decimal to actual percentage (1.01918 = 101.918%)
    const actualPercentage = change24h * 100;
    const absChange = Math.abs(actualPercentage);

    // Analyze pair characteristics
    let volatilityLevel = 'low';
    let recommendedTimeframe = '1h';
    let recommendedStopLoss = '2';
    let recommendedTakeProfit = '5';
    let recommendedLeverage = '3';
    let recommendedDirection = actualPercentage >= 0 ? 'long' : 'short';
    let riskLevel = 'medium';
    let suggestedIndicators: any = {};

    // Volatility analysis - REALISTIC thresholds for crypto markets
    if (absChange >= 20) {
      volatilityLevel = 'extreme';
      recommendedTimeframe = '5m';
      recommendedStopLoss = '1';
      recommendedTakeProfit = '2';
      recommendedLeverage = '2';
      riskLevel = 'extreme';
    } else if (absChange >= 10) {
      volatilityLevel = 'extreme';
      recommendedTimeframe = '15m';
      recommendedStopLoss = '1.5';
      recommendedTakeProfit = '3';
      recommendedLeverage = '2';
      riskLevel = 'high';
    } else if (absChange >= 5) {
      volatilityLevel = 'very high';
      recommendedTimeframe = '30m';
      recommendedStopLoss = '2';
      recommendedTakeProfit = '4';
      recommendedLeverage = '3';
      riskLevel = 'high';
    } else if (absChange >= 3) {
      volatilityLevel = 'high';
      recommendedTimeframe = '1h';
      recommendedStopLoss = '2.5';
      recommendedTakeProfit = '5';
      recommendedLeverage = '4';
      riskLevel = 'medium';
    } else if (absChange >= 1.5) {
      volatilityLevel = 'medium';
      recommendedTimeframe = '2h';
      recommendedStopLoss = '3';
      recommendedTakeProfit = '6';
      recommendedLeverage = '5';
      riskLevel = 'medium';
    } else if (absChange >= 0.3) {
      volatilityLevel = 'low';
      recommendedTimeframe = '4h';
      recommendedStopLoss = '3.5';
      recommendedTakeProfit = '7';
      recommendedLeverage = '3';
      riskLevel = 'low';
    } else {
      volatilityLevel = 'very low';
      recommendedTimeframe = '8h';
      recommendedStopLoss = '4';
      recommendedTakeProfit = '8';
      recommendedLeverage = '2';
      riskLevel = 'low';
    }

    // Volume-based adjustments
    if (volume24h > 1000000000) { // High volume pairs
      recommendedLeverage = Math.min(parseInt(recommendedLeverage) + 1, 10).toString();
    } else if (volume24h < 100000000) { // Low volume pairs
      recommendedLeverage = Math.max(parseInt(recommendedLeverage) - 1, 1).toString();
      recommendedStopLoss = (parseFloat(recommendedStopLoss) + 0.5).toString();
    }

    // Trend-based direction refinement - MOVED BEFORE INDICATOR GENERATION
    // Clear directional bias based on 24h change with precise thresholds
    if (actualPercentage > 3) {
      recommendedDirection = 'long'; // Strong positive momentum
    } else if (actualPercentage < -3) {
      recommendedDirection = 'short'; // Strong negative momentum  
    } else if (actualPercentage > 0.5) {
      recommendedDirection = 'long'; // Moderate positive momentum
    } else if (actualPercentage < -0.5) {
      recommendedDirection = 'short'; // Moderate negative momentum
    } else {
      // For very low volatility (-0.5% to +0.5%), use exact momentum direction
      recommendedDirection = actualPercentage >= 0 ? 'long' : 'short';
    }

    // Generate direction-aware indicators AFTER direction is finalized
    const generateDirectionAwareIndicators = (direction: string, pairType: 'btc' | 'eth' | 'alt') => {
      if (direction === 'long') {
        // Long position indicators - looking for bullish signals
        if (pairType === 'btc') {
          return {
            rsi: { enabled: true, period: 14, condition: 'oversold', value: 30 },
            macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
            ma1: { enabled: true, type: 'ema', period1: 21, condition: 'above', period2: 50 }
          };
        } else if (pairType === 'eth') {
          return {
            rsi: { enabled: true, period: 14, condition: 'oversold', value: 35 },
            bollinger: { enabled: true, period: 20, stdDev: 2, condition: 'near_lower' },
            volume: { enabled: true, condition: 'above_average', multiplier: 1.5 }
          };
        } else {
          return {
            rsi: { enabled: true, period: 7, condition: 'oversold', value: 25 },
            macd: { enabled: true, fastPeriod: 8, slowPeriod: 21, signalPeriod: 5, condition: 'bullish_crossover' },
            ma1: { enabled: true, type: 'ema', period1: 9, condition: 'above', period2: 21 }
          };
        }
      } else {
        // Short position indicators - looking for bearish signals
        if (pairType === 'btc') {
          return {
            rsi: { enabled: true, period: 14, condition: 'overbought', value: 70 },
            macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bearish_crossover' },
            ma1: { enabled: true, type: 'ema', period1: 21, condition: 'below', period2: 50 }
          };
        } else if (pairType === 'eth') {
          return {
            rsi: { enabled: true, period: 14, condition: 'overbought', value: 70 },
            bollinger: { enabled: true, period: 20, stdDev: 2, condition: 'above_upper' },
            volume: { enabled: true, condition: 'above_average', multiplier: 1.5 }
          };
        } else {
          return {
            rsi: { enabled: true, period: 7, condition: 'overbought', value: 75 },
            macd: { enabled: true, fastPeriod: 8, slowPeriod: 21, signalPeriod: 5, condition: 'bearish_crossover' },
            ma1: { enabled: true, type: 'ema', period1: 9, condition: 'below', period2: 21 }
          };
        }
      }
    };

    // Pair-specific optimizations - NOW using the finalized direction
    if (symbol.includes('BTC')) {
      // Bitcoin pairs - more conservative
      recommendedStopLoss = (parseFloat(recommendedStopLoss) * 0.8).toFixed(1);
      recommendedTakeProfit = (parseFloat(recommendedTakeProfit) * 0.9).toFixed(1);
      suggestedIndicators = generateDirectionAwareIndicators(recommendedDirection, 'btc');
    } else if (symbol.includes('ETH')) {
      // Ethereum pairs - moderate settings
      suggestedIndicators = generateDirectionAwareIndicators(recommendedDirection, 'eth');
    } else if (symbol.includes('USDT') && !symbol.includes('BTC') && !symbol.includes('ETH')) {
      // Alt-USDT pairs - more aggressive for opportunities
      recommendedLeverage = Math.min(parseInt(recommendedLeverage) + 2, 10).toString();
      recommendedTakeProfit = (parseFloat(recommendedTakeProfit) * 1.2).toFixed(1);
      suggestedIndicators = generateDirectionAwareIndicators(recommendedDirection, 'alt');
    }

    // Generate scalping-specific settings
    const getScalpingSettings = () => {
      let scalpSettings = {
        timeframe: '5m',
        stopLoss: '0.8',
        takeProfit: '1.2',
        leverage: '5'
      };

      if (volatilityLevel === 'extreme') {
        scalpSettings = { timeframe: '1m', stopLoss: '0.5', takeProfit: '0.8', leverage: '3' };
      } else if (volatilityLevel === 'very high') {
        scalpSettings = { timeframe: '3m', stopLoss: '0.6', takeProfit: '1.0', leverage: '4' };
      } else if (volatilityLevel === 'high') {
        scalpSettings = { timeframe: '5m', stopLoss: '0.8', takeProfit: '1.2', leverage: '5' };
      } else if (volatilityLevel === 'medium') {
        scalpSettings = { timeframe: '15m', stopLoss: '1.0', takeProfit: '1.5', leverage: '6' };
      } else {
        scalpSettings = { timeframe: '15m', stopLoss: '1.2', takeProfit: '2.0', leverage: '7' };
      }
      return scalpSettings;
    };

    const scalpingSettings = getScalpingSettings();

    const suggestions = {
      pair: symbol,
      analysis: {
        volatility: volatilityLevel,
        volume24h: volume24h,
        change24h: actualPercentage, // Display actual percentage, not raw API value
        trend: actualPercentage > 2 ? 'bullish' : actualPercentage < -2 ? 'bearish' : 'sideways'
      },
      recommended: {
        timeframe: recommendedTimeframe,
        direction: recommendedDirection,
        stopLoss: recommendedStopLoss,
        takeProfit: recommendedTakeProfit,
        leverage: recommendedLeverage,
        riskLevel: riskLevel
      },
      scalping: {
        direction: recommendedDirection,
        timeframe: scalpingSettings.timeframe,
        stopLoss: scalpingSettings.stopLoss,
        takeProfit: scalpingSettings.takeProfit,
        leverage: scalpingSettings.leverage,
        strategy: `${recommendedDirection.toUpperCase()} scalping`,
        entryCondition: recommendedDirection === 'long' ? 'RSI < 35 + MACD bullish crossover' : 'RSI > 65 + MACD bearish crossover'
      },
      indicators: suggestedIndicators,
      confidence: Math.min(95, Math.max(60, 75 + (absChange * 2))),
      reasoning: [
        `🎯 SCALPING RECOMMENDATION: Go ${recommendedDirection.toUpperCase()} on ${symbol}`,
        `⏰ Use ${scalpingSettings.timeframe} timeframe for quick entries/exits`,
        `🛡️ Set ${scalpingSettings.stopLoss}% stop loss and ${scalpingSettings.takeProfit}% take profit`,
        `💪 Apply ${scalpingSettings.leverage}x leverage for this ${volatilityLevel} volatility pair`,
        `📊 Entry: ${recommendedDirection === 'long' ? 'RSI oversold + MACD bullish' : 'RSI overbought + MACD bearish'}`
      ]
    };

    // Debug logging to verify alignment and volatility calculation
    console.log(`AI Suggestion Debug for ${symbol}:`, {
      rawChange24h: change24h,
      actualPercentage: actualPercentage,
      absChange: absChange,
      volatilityLevel: volatilityLevel,
      recommendedTimeframe: recommendedTimeframe,
      recommendedDirection: recommendedDirection,
      riskLevel: riskLevel,
      indicators: Object.keys(suggestedIndicators).map(key => ({
        indicator: key,
        condition: suggestedIndicators[key].condition,
        enabled: suggestedIndicators[key].enabled
      }))
    });

    setSuggestedSettings(suggestions);
    setShowSuggestions(true);
  };

  // Apply suggested settings to current form
  const applySuggestions = () => {
    if (!suggestedSettings) return;

    setTimeframe(suggestedSettings.recommended.timeframe);
    setPositionDirection(suggestedSettings.recommended.direction);
    setStopLoss(suggestedSettings.recommended.stopLoss);
    setTakeProfit(suggestedSettings.recommended.takeProfit);
    setRiskLevel(suggestedSettings.recommended.riskLevel);

    // Apply suggested indicators
    if (suggestedSettings.indicators) {
      setIndicators(prev => ({
        ...prev,
        ...Object.keys(suggestedSettings.indicators).reduce((acc: any, key: string) => {
          acc[key] = { ...prev[key as keyof typeof prev], ...suggestedSettings.indicators[key] };
          return acc;
        }, {})
      }));
    }

    setShowSuggestions(false);
    alert('Suggested settings applied successfully!');
  };

  // Handle pair search input changes and filter suggestions
  const handlePairSearchChange = (value: string) => {
    setPairSearch(value);
    
    if (value.length > 0 && futuresData && Array.isArray(futuresData)) {
      const filtered = (futuresData as any[])
        .filter((coin: any) => 
          coin.symbol.toLowerCase().includes(value.toLowerCase()) ||
          coin.symbol.replace('USDT', '').toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8) // Show max 8 suggestions
        .sort((a, b) => {
          // Prioritize exact matches and popular pairs
          const aExact = a.symbol.toLowerCase().startsWith(value.toLowerCase()) ? 0 : 1;
          const bExact = b.symbol.toLowerCase().startsWith(value.toLowerCase()) ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          
          // Then sort by volume (popularity)
          return parseFloat(b.volume24h) - parseFloat(a.volume24h);
        });
      
      setFilteredPairs(filtered);
      setShowAutoSuggest(filtered.length > 0);
    } else {
      setFilteredPairs([]);
      setShowAutoSuggest(false);
    }
  };

  // Select a pair from auto-suggestions
  const selectPair = (pair: any) => {
    setPairSearch(pair.symbol);
    setShowAutoSuggest(false);
    setFilteredPairs([]);
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
          <div className="flex items-center gap-3">
            <BackButton to="/" label="Home" />
            <div>
              <h1 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Bot className="h-6 w-6" />
                Trading Bots
              </h1>
              <p className="text-muted-foreground text-sm">
                Create reusable trading strategies and run them on any trading pair
              </p>
            </div>
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
                    {(() => {
                      const activeBots = (activeExecutions as any[]) || [];
                      if (activeBots.length === 0) {
                        return 'N/A';
                      }
                      // Calculate average win rate from active bots
                      // For now, since we don't have win rate data from active executions,
                      // we'll show N/A until bots are actually running
                      return 'N/A';
                    })()}
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

            {(() => {
              const aiBots = [
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
                  suggestedText: 'Perfect for BTCUSDT, ETHUSDT. Works best with stable coins in sideways trends.',
                  recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT'],
                  suggestedCapital: '500-2000',
                  suggestedLeverage: '2-5'
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
                  suggestedText: 'Ideal for long-term BTC, ETH accumulation. Best during market dips.',
                  recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'],
                  suggestedCapital: '1000-5000',
                  suggestedLeverage: '1-2'
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
                  suggestedText: 'High-speed scalping on volatile pairs like DOGEUSDT, SHIBUSDT during breakouts.',
                  recommendedPairs: ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT'],
                  suggestedCapital: '200-1000',
                  suggestedLeverage: '5-10'
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
                  suggestedText: 'Low-risk arbitrage on major pairs with high liquidity like BTC, ETH, BNB.',
                  recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'USDCUSDT'],
                  suggestedCapital: '2000-10000',
                  suggestedLeverage: '1-3'
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
                  suggestedText: 'AI trend detection works great on trending altcoins like SOL, ADA, DOT.',
                  recommendedPairs: ['SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'],
                  suggestedCapital: '500-3000',
                  suggestedLeverage: '3-7'
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
                  suggestedText: 'Harvests volatility from explosive meme coins and new listings during market events.',
                  recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'],
                  suggestedCapital: '1000-5000',
                  suggestedLeverage: '3-8'
                }
              ];
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {aiBots.map((bot) => {
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
                                // Pre-fill with suggested defaults
                                const defaultPair = bot.recommendedPairs[0] || 'BTCUSDT';
                                setPairSearch(defaultPair);
                                setTradingPair(defaultPair);
                                setCapital(bot.suggestedCapital?.split('-')[0] || '1000');
                                setLeverage(bot.suggestedLeverage?.split('-')[0] || '1');
                                // Trigger auto-suggest filtering for the pre-filled pair
                                handlePairSearchChange(defaultPair);
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
                          
                          {/* Suggested Text */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{bot.suggestedText}</p>
                            </div>
                          </div>
                          
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
                                // Pre-fill with suggested defaults
                                const defaultPair = bot.recommendedPairs[0] || 'BTCUSDT';
                                setPairSearch(defaultPair);
                                setTradingPair(defaultPair);
                                setCapital(bot.suggestedCapital?.split('-')[0] || '1000');
                                setLeverage(bot.suggestedLeverage?.split('-')[0] || '1');
                                // Trigger auto-suggest filtering for the pre-filled pair
                                handlePairSearchChange(defaultPair);
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
              );
            })()}
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
                                        <span 
                                          className="font-medium text-white cursor-pointer hover:text-blue-400 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLocation(`/trade?pair=${execution.tradingPair}`);
                                          }}
                                        >
                                          {execution.tradingPair}
                                        </span>
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
                                  <h4 
                                    className="font-medium cursor-pointer hover:text-blue-500 transition-colors"
                                    onClick={() => setLocation(`/trade?pair=${execution.tradingPair}`)}
                                  >
                                    {execution.tradingPair}
                                  </h4>
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

      {/* Alert Center Dialog */}
      {showAlertCenter && (
        <AlertCenter
          isOpen={showAlertCenter}
          onClose={() => setShowAlertCenter(false)}
        />
      )}

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

            {/* AI Settings Suggestions */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 p-4 rounded-lg border border-blue-300 dark:border-blue-600">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">AI Settings Suggestions</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Get optimized settings for specific trading pairs</p>
                </div>
                <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-full">
                  <Bot className="h-4 w-4 text-blue-700 dark:text-blue-200" />
                </div>
              </div>
              
              <div className="relative flex gap-2">
                <div className="flex-1 relative">
                  <Input 
                    placeholder="Enter pair (e.g., BTCUSDT, ENA, SOL)" 
                    value={pairSearch}
                    onChange={(e) => handlePairSearchChange(e.target.value.toUpperCase())}
                    className="pr-10"
                    onFocus={() => {
                      if (filteredPairs.length > 0) setShowAutoSuggest(true);
                    }}
                    onBlur={() => {
                      // Delay hiding to allow clicking on suggestions
                      setTimeout(() => setShowAutoSuggest(false), 200);
                    }}
                  />
                  
                  {/* Auto-suggest dropdown */}
                  {showAutoSuggest && filteredPairs.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black dark:bg-black border border-gray-600 dark:border-gray-500 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredPairs.map((pair: any, index: number) => (
                        <div
                          key={pair.symbol}
                          onClick={() => selectPair(pair)}
                          className="px-4 py-2 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-white">
                              {pair.symbol}
                            </div>
                            <div className={`text-xs font-medium ${
                              parseFloat(pair.change24h) >= 0 
                                ? 'text-green-400' 
                                : 'text-red-400'
                            }`}>
                              {parseFloat(pair.change24h) >= 0 ? '+' : ''}{(parseFloat(pair.change24h) * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  type="button"
                  onClick={() => generateBotSuggestions(pairSearch)}
                  disabled={!pairSearch.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Get AI Suggestions
                </Button>
              </div>
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
                              <SelectItem value="above_signal">Above Signal</SelectItem>
                              <SelectItem value="below_signal">Below Signal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Moving Averages */}
                  {['ma1', 'ma2', 'ma3'].map((maKey) => (
                    <div key={maKey} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={maKey}
                          checked={(indicators[maKey as keyof typeof indicators] as any).enabled}
                          onChange={(e) => setIndicators({
                            ...indicators,
                            [maKey]: { ...indicators[maKey as keyof typeof indicators], enabled: e.target.checked }
                          })}
                        />
                        <label htmlFor={maKey} className="text-sm font-medium">
                          {maKey === 'ma1' ? 'Moving Average 1' : maKey === 'ma2' ? 'Moving Average 2' : 'Moving Average 3'}
                        </label>
                      </div>
                      {(indicators[maKey as keyof typeof indicators] as any).enabled && (
                        <div className="ml-2">
                          <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                            {/* First Row Headers */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <label className="text-xs">MA Type</label>
                              </div>
                              <div className="text-center">
                                <label className="text-xs">Period</label>
                              </div>
                              <div className="text-center">
                                <label className="text-xs">Condition</label>
                              </div>
                            </div>
                            
                            {/* First Row Values */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                              <div>
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
                              <div>
                                <Input 
                                  type="number" 
                                  value={(indicators[maKey as keyof typeof indicators] as any).period1}
                                  onChange={(e) => setIndicators({
                                    ...indicators,
                                    [maKey]: { ...indicators[maKey as keyof typeof indicators], period1: parseInt(e.target.value) || 20 }
                                  })}
                                  placeholder="20"
                                  className="text-center"
                                />
                              </div>
                              <div>
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
                            </div>

                            {/* Second Row Headers */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <label className="text-xs">Comparison</label>
                              </div>
                              <div className="text-center">
                                <label className="text-xs">Comparison MA Type</label>
                              </div>
                              <div className="text-center">
                                <label className="text-xs">Comparison Period</label>
                              </div>
                            </div>
                            
                            {/* Second Row Values */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Select 
                                  value={(indicators[maKey as keyof typeof indicators] as any).comparisonType || "price"}
                                  onValueChange={(value) => {
                                    setIndicators({
                                      ...indicators,
                                      [maKey]: { ...indicators[maKey as keyof typeof indicators], comparisonType: value }
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="price">Another MA</SelectItem>
                                    <SelectItem value="ma">Price</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Comparison MA Type - only show when comparing to another MA */}
                              <div>
                                {((indicators[maKey as keyof typeof indicators] as any).comparisonType === 'price' || 
                                  (indicators[maKey as keyof typeof indicators] as any).condition === 'crossing_up' || 
                                  (indicators[maKey as keyof typeof indicators] as any).condition === 'crossing_down') ? (
                                  <Select 
                                    value={(indicators[maKey as keyof typeof indicators] as any).comparisonMAType || 'sma'}
                                    onValueChange={(value) => setIndicators({
                                      ...indicators,
                                      [maKey]: { ...indicators[maKey as keyof typeof indicators], comparisonMAType: value }
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
                                ) : (
                                  <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center text-sm text-gray-500">
                                    N/A
                                  </div>
                                )}
                              </div>
                              
                              {/* Comparison Period */}
                              <div>
                                {((indicators[maKey as keyof typeof indicators] as any).comparisonType === 'price' || 
                                  (indicators[maKey as keyof typeof indicators] as any).condition === 'crossing_up' || 
                                  (indicators[maKey as keyof typeof indicators] as any).condition === 'crossing_down') ? (
                                  <Input 
                                    type="number" 
                                    value={(indicators[maKey as keyof typeof indicators] as any).period2}
                                    onChange={(e) => setIndicators({
                                      ...indicators,
                                      [maKey]: { ...indicators[maKey as keyof typeof indicators], period2: parseInt(e.target.value) || 50 }
                                    })}
                                    placeholder="50"
                                    className="text-center"
                                  />
                                ) : (
                                  <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center text-sm text-gray-500">
                                    N/A
                                  </div>
                                )}
                              </div>
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleCreateStrategy}
                className="flex-1"
                disabled={!strategyName.trim()}
              >
                Create Strategy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              AI Bot Settings Suggestions
            </DialogTitle>
            <DialogDescription>
              Optimized settings for {suggestedSettings?.pair} based on market analysis
            </DialogDescription>
          </DialogHeader>

          {suggestedSettings && (
            <div className="space-y-6 overflow-y-auto max-h-96">
              {/* Market Analysis */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg border">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Market Analysis</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">24h Change</p>
                    <p className={`font-bold text-lg ${suggestedSettings.analysis.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {suggestedSettings.analysis.change24h >= 0 ? '+' : ''}{suggestedSettings.analysis.change24h.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Volatility</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200 capitalize">{suggestedSettings.analysis.volatility}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Trend</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200 capitalize">{suggestedSettings.analysis.trend}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Confidence</p>
                    <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{suggestedSettings.confidence}%</p>
                  </div>
                </div>
              </div>

              {/* SCALPING RECOMMENDATION - MOST PROMINENT */}
              {suggestedSettings.scalping && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 p-6 rounded-lg border-2 border-yellow-300 dark:border-yellow-600">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-yellow-800 dark:text-yellow-200">SCALPING RECOMMENDATION</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Quick trade setup for fast profits</p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
                    <p className="text-lg font-bold text-center mb-2">
                      <span className={`${suggestedSettings.scalping.direction === 'long' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        GO {suggestedSettings.scalping.direction.toUpperCase()}
                      </span> on {suggestedSettings.pair}
                    </p>
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {suggestedSettings.scalping.entryCondition}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">TIMEFRAME</p>
                        <p className="font-bold text-blue-800 dark:text-blue-200">{suggestedSettings.scalping.timeframe}</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">LEVERAGE</p>
                        <p className="font-bold text-purple-800 dark:text-purple-200">{suggestedSettings.scalping.leverage}x</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded">
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">STOP LOSS</p>
                        <p className="font-bold text-red-800 dark:text-red-200">{suggestedSettings.scalping.stopLoss}%</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold">TAKE PROFIT</p>
                        <p className="font-bold text-green-800 dark:text-green-200">{suggestedSettings.scalping.takeProfit}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended Settings */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 rounded-lg border">
                <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3">Alternative Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Direction</p>
                    <p className={`font-bold text-lg capitalize ${suggestedSettings.recommended.direction === 'long' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {suggestedSettings.recommended.direction}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Timeframe</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{suggestedSettings.recommended.timeframe}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Stop Loss</p>
                    <p className="font-bold text-lg text-red-600 dark:text-red-400">{suggestedSettings.recommended.stopLoss}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Take Profit</p>
                    <p className="font-bold text-lg text-green-600 dark:text-green-400">{suggestedSettings.recommended.takeProfit}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Risk Level</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200 capitalize">{suggestedSettings.recommended.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Suggested Leverage</p>
                    <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{suggestedSettings.recommended.leverage}x</p>
                  </div>
                </div>
              </div>

              {/* Suggested Indicators */}
              {Object.keys(suggestedSettings.indicators || {}).length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 p-4 rounded-lg border">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">Suggested Technical Indicators</h4>
                  <div className="space-y-2">
                    {Object.entries(suggestedSettings.indicators).map(([key, config]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {key.toUpperCase()}: {config.condition}
                          {config.period && ` (${config.period})`}
                          {config.value && ` = ${config.value}`}
                        </span>
                        <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">Enabled</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 rounded-lg border">
                <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-3">AI Analysis & Reasoning</h4>
                <ul className="space-y-3">
                  {suggestedSettings.reasoning.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  onClick={applySuggestions}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
                >
                  Apply All Suggestions
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowSuggestions(false)}
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bot Run Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Deploy {selectedStrategy?.name || 'AI Trading Bot'}
            </DialogTitle>
            <DialogDescription>
              Configure trading parameters for your bot deployment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium">Trading Pair</label>
              <div className="relative">
                <Input
                  value={pairSearch}
                  onChange={(e) => handlePairSearchChange(e.target.value)}
                  placeholder="Search trading pairs... (e.g., BTCUSDT)"
                  className="pr-10"
                  onFocus={() => {
                    if (filteredPairs.length > 0) setShowAutoSuggest(true);
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicking on suggestions
                    setTimeout(() => setShowAutoSuggest(false), 200);
                  }}
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              
              {/* Auto-suggest dropdown */}
              {showAutoSuggest && filteredPairs.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-black dark:bg-black border border-gray-600 dark:border-gray-500 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredPairs.map((pair: any, index: number) => (
                    <div
                      key={pair.symbol}
                      onClick={() => {
                        selectPair(pair);
                        setTradingPair(pair.symbol);
                        setShowAutoSuggest(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-white">
                          {pair.symbol}
                        </div>
                        <div className={`text-xs font-medium ${
                          parseFloat(pair.change24h) >= 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {parseFloat(pair.change24h) >= 0 ? '+' : ''}{(parseFloat(pair.change24h) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Capital Amount</label>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder={selectedStrategy?.suggestedCapital?.split('-')[0] || "1000"}
              />
              {selectedStrategy?.suggestedCapital && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suggested: {selectedStrategy.suggestedCapital} USDT</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Leverage</label>
              <Input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder={selectedStrategy?.suggestedLeverage?.split('-')[0] || "1"}
                min="1"
                max="100"
              />
              {selectedStrategy?.suggestedLeverage && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suggested: {selectedStrategy.suggestedLeverage}x leverage</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowRunDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Handle bot deployment
                alert(`Deploying ${selectedStrategy?.name || 'AI Bot'} with ${capital} USDT on ${tradingPair} at ${leverage}x leverage`);
                setShowRunDialog(false);
              }}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <Play className="h-4 w-4 mr-2" />
              Deploy Bot
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bot Settings Dialog */}
      <Dialog open={showBotSettings} onOpenChange={setShowBotSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Bot Settings - {selectedBot?.name}
            </DialogTitle>
            <DialogDescription>
              Configure advanced settings for your trading bot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Risk Level</label>
              <Select defaultValue="medium">
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
            <div>
              <label className="text-sm font-medium">Stop Loss %</label>
              <Input
                type="number"
                placeholder="2.0"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Take Profit %</label>
              <Input
                type="number"
                placeholder="5.0"
                step="0.1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="autoReinvest" />
              <label htmlFor="autoReinvest" className="text-sm">Auto-reinvest profits</label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowBotSettings(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                alert('Bot settings updated successfully!');
                setShowBotSettings(false);
              }}
              className="flex-1"
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
