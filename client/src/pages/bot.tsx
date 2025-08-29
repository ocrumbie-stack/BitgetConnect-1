import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Plus, Play, Edit2, Trash2, TrendingUp, TrendingDown, Settings, Square, Bell, ChevronDown, ChevronRight, Activity, BarChart3, Target, Zap, Users, DollarSign, TrendingUp as Trend, Info, Search, Lightbulb, Eye, X } from 'lucide-react';
import { AlertCenter } from '@/components/AlertCenter';
import { BackButton } from '@/components/BackButton';
import { DynamicExitVisualizer } from '@/components/DynamicExitVisualizer';
import { TradingStyleSelector } from '@/components/TradingStyleSelector';
import { useToast } from '@/hooks/use-toast';

export default function BotPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('ai');
  const [showExitVisualizer, setShowExitVisualizer] = useState(false);
  const [selectedBotForVisualization, setSelectedBotForVisualization] = useState<any>(null);
  const { toast } = useToast();
  
  // Scroll to top when changing tabs (per user preference for instant page access)
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Scroll to top for immediate access to content
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
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
  const [trailingStop, setTrailingStop] = useState('');
  // Removed showAdvancedIndicators state - indicators are now always visible
  
  // Technical Indicators state (allowing string | number for input flexibility)
  const [indicators, setIndicators] = useState({
    rsi: { enabled: false, period: 14 as string | number, condition: 'above', value: 70 as string | number },
    macd: { enabled: false, fastPeriod: 12 as string | number, slowPeriod: 26 as string | number, signalPeriod: 9 as string | number, condition: 'bullish_crossover' },
    ma1: { enabled: false, type: 'sma', period1: 20 as string | number, condition: 'above', period2: 50 as string | number, comparisonType: 'price', comparisonMAType: 'sma' },
    ma2: { enabled: false, type: 'ema', period1: 50 as string | number, condition: 'above', period2: 200 as string | number, comparisonType: 'price', comparisonMAType: 'sma' },
    ma3: { enabled: false, type: 'sma', period1: 10 as string | number, condition: 'crossing_up', period2: 20 as string | number, comparisonType: 'price', comparisonMAType: 'sma' },
    bollinger: { enabled: false, period: 20 as string | number, stdDev: 2, condition: 'above_upper' },
    stochastic: { enabled: false, kPeriod: 14, dPeriod: 3, smoothK: 3, condition: 'above', value: 80 },
    williams: { enabled: false, period: 14, condition: 'above', value: -20 },
    volume: { enabled: false, condition: 'above_average', multiplier: 1.5 }
  });
  
  // Bot execution form
  const [tradingPair, setTradingPair] = useState('');
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
  const [deploymentMode, setDeploymentMode] = useState<'individual' | 'folder' | 'auto_scanner'>('individual');
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [showBotInfo, setShowBotInfo] = useState(false);
  const [showAutoAICreation, setShowAutoAICreation] = useState(false);
  const [selectedPairForAutoAI, setSelectedPairForAutoAI] = useState<string | null>(null);
  const [autoAIBotCapital, setAutoAIBotCapital] = useState('100');
  const [autoAIBotLeverage, setAutoAIBotLeverage] = useState('3');
  const [selectedBotInfo, setSelectedBotInfo] = useState<any>(null);
  const [expandedBots, setExpandedBots] = useState<{[key: string]: boolean}>({});
  const [suggestedSettings, setSuggestedSettings] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Edit strategy state
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Auto Market Scanner state
  const [scannerCapital, setScannerCapital] = useState('10000');
  const [scannerMaxBots, setScannerMaxBots] = useState('5');
  const [scannerLeverage, setScannerLeverage] = useState('3'); // Default 3x leverage
  const [scannerName, setScannerName] = useState(''); // Custom scanner name for folder organization
  const [isScanning, setIsScanning] = useState(false);
  const [scannerResults, setScannerResults] = useState<any>(null);



  // Fetch user strategies (filter to only show manually created ones)
  const { data: allStrategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/bot-strategies'],
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Auto-fix existing auto scanner strategies on first load
  useEffect(() => {
    const fixAutoScannerStrategies = async () => {
      try {
        const response = await fetch('/api/fix-auto-scanner-strategies', { method: 'POST' });
        if (response.ok) {
          const result = await response.json();
          if (result.updatedCount > 0) {
            console.log(`✅ Fixed ${result.updatedCount} auto scanner strategies`);
            // Refresh the strategies list
            queryClient.invalidateQueries({ queryKey: ['/api/bot-strategies'] });
          }
        }
      } catch (error) {
        console.log('Auto-fix already completed or not needed');
      }
    };
    
    // Only run this once when strategies are first loaded
    if (allStrategies.length > 0) {
      fixAutoScannerStrategies();
    }
  }, [allStrategies.length > 0]);

  // Filter to only show manually created strategies in "My Strategies" card
  const userStrategies = (allStrategies as any[]).filter((strategy: any) => strategy.source === 'manual' || !strategy.source);

  // Define AI bots at component level so they can be accessed everywhere
  const aiBots = [
    {
      id: 'grid',
      name: 'Grid Trading Pro',
      description: 'Dynamic grid with auto-adjustment based on volatility',
      risk: 'Medium',
      winRate: '78.5%',
      gradient: 'from-blue-500 to-cyan-500',
      icon: BarChart3,
      isAI: true,
      recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
      suggestedCapital: '1000-5000',
      suggestedLeverage: '2-5',
      suggestedText: 'Best for volatile markets with consistent price oscillations',
      avgReturn: '+15.2%',
      features: ['Dynamic Grid Sizing', 'Auto Position Adjustment', 'Risk Management']
    },
    {
      id: 'momentum',
      name: 'Smart Momentum',
      description: 'AI-powered momentum detection with trend following',
      risk: 'High',
      winRate: '82.1%',
      gradient: 'from-indigo-500 to-purple-500',
      icon: TrendingUp,
      isAI: true,
      recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      suggestedCapital: '2000-10000',
      suggestedLeverage: '3-7',
      suggestedText: 'Ideal for strong trending markets with momentum confirmation',
      avgReturn: '+22.7%',
      features: ['Trend Detection', 'Momentum Signals', 'Stop Loss Protection']
    },
    {
      id: 'scalping',
      name: 'Smart Scalping Bot',
      description: 'High-frequency scalping with ML-based entry signals',
      risk: 'High',
      winRate: '85.3%',
      gradient: 'from-purple-500 to-pink-500',
      icon: Zap,
      isAI: true,
      recommendedPairs: ['BTCUSDT', 'ETHUSDT'],
      suggestedCapital: '500-3000',
      suggestedLeverage: '5-10',
      suggestedText: 'Perfect for high-liquidity pairs with frequent small moves',
      avgReturn: '+18.9%',
      features: ['High-Frequency Trading', 'ML Entry Signals', 'Quick Profit Taking']
    },
    {
      id: 'arbitrage',
      name: 'Smart Arbitrage',
      description: 'Cross-market arbitrage opportunities with instant execution',
      risk: 'Low',
      winRate: '89.2%',
      gradient: 'from-green-500 to-emerald-500',
      icon: Target,
      isAI: true,
      recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
      suggestedCapital: '5000-20000',
      suggestedLeverage: '1-3',
      suggestedText: 'Suitable for risk-averse traders seeking consistent profits',
      avgReturn: '+12.4%',
      features: ['Cross-Market Analysis', 'Instant Execution', 'Low Risk Strategy']
    },
    {
      id: 'dca',
      name: 'AI Dollar Cost Average',
      description: 'Intelligent DCA with market timing and trend analysis',
      risk: 'Low',
      winRate: '76.8%',
      gradient: 'from-orange-500 to-red-500',
      icon: DollarSign,
      isAI: true,
      recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT'],
      suggestedCapital: '1000-8000',
      suggestedLeverage: '1-2',
      suggestedText: 'Best for long-term accumulation with smart market timing',
      avgReturn: '+24.1%',
      features: ['Smart Timing', 'Position Averaging', 'Long-term Growth']
    },
    {
      id: 'swing',
      name: 'Smart Swing Trader',
      description: 'Multi-day swing trading with AI pattern recognition',
      risk: 'Medium',
      winRate: '79.6%',
      gradient: 'from-teal-500 to-blue-500',
      icon: Trend,
      isAI: true,
      recommendedPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'],
      suggestedCapital: '2000-15000',
      suggestedLeverage: '2-4',
      suggestedText: 'Optimal for multi-day trends with pattern confirmation',
      avgReturn: '+19.3%',
      features: ['Pattern Recognition', 'Multi-day Trends', 'Support/Resistance']
    }
  ];

  // Fetch active executions with regular refresh
  const { data: allExecutions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ['/api/bot-executions'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time data
    refetchIntervalInBackground: true
  });

  // Fetch futures data for AI suggestions
  const { data: futuresData = [], isLoading: futuresLoading } = useQuery({
    queryKey: ['/api/futures']
  });

  // Fetch user preferences for trading style
  const { data: userPrefs } = useQuery({
    queryKey: ['/api/user-preferences', 'default-user'],
  });

  // Show ALL running bots (both active and waiting) - not just ones currently in trades
  const activeExecutions = (allExecutions as any[]).filter((execution: any) => 
    execution.status === 'active' || execution.status === 'waiting_entry' || execution.status === 'exit_pending'
  );



  // Fetch folders for dropdown
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/folders', 'user1'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/screeners/user1');
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
      handleTabChange('executions');
    }
  });

  // Terminate execution mutation
  const handleTerminateExecution = useMutation({
    mutationFn: async (executionId: string) => {
      console.log('🚀 Starting termination request for:', executionId);
      const response = await fetch(`/api/bot-executions/${executionId}/terminate`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Termination failed:', error);
        throw new Error(`Failed to stop bot: ${error}`);
      }
      const result = await response.json();
      console.log('✅ Termination successful:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('🔄 Refreshing bot list after termination');
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
    },
    onError: (error) => {
      console.error('💥 Termination mutation error:', error);
    }
  });

  // Close single position mutation
  const closePositionMutation = useMutation({
    mutationFn: async ({ symbol, side }: { symbol: string, side: string }) => {
      const response = await fetch('/api/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'default-user',
          symbol,
          side 
        })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to close position: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      toast({
        title: "Position Closed",
        description: "Position has been closed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Close Position",
        description: error.message || "Failed to close position.",
        variant: "destructive",
      });
    }
  });

  // Close all positions mutation
  const closeAllPositionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/close-all-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default-user' })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to close positions: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      toast({
        title: "All Positions Closed",
        description: "All open positions have been closed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Close Positions",
        description: error.message || "Failed to close all positions.",
        variant: "destructive",
      });
    }
  });

  // Auto Market Scanner - SCAN ONLY
  const autoScannerMutation = useMutation({
    mutationFn: async (scannerData: any) => {
      const response = await fetch('/api/auto-scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scannerData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to scan market: ${error}`);
      }
      return response.json();
    },
    onSuccess: (results) => {
      setScannerResults(results);
      setIsScanning(false);
      toast({
        title: "Market Scan Complete! 🔍",
        description: `Found ${results.opportunities.length} trading opportunities`,
      });
    },
    onError: (error: any) => {
      setIsScanning(false);
      toast({
        title: "Scanner Failed",
        description: error.message || "Failed to complete market scan",
        variant: "destructive",
      });
    }
  });

  // Auto Market Scanner - DEPLOY BOTS
  const autoDeployMutation = useMutation({
    mutationFn: async (deployData: any) => {
      const response = await fetch('/api/auto-scanner/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to deploy bots: ${error}`);
      }
      return response.json();
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      toast({
        title: "Bots Deployed Successfully! 🤖",
        description: `Deployed ${results.deployedBots} AI bots with $${results.capitalPerBot} each`,
      });
      // Clear scan results after successful deployment
      setScannerResults(null);
    },
    onError: (error: any) => {
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to deploy bots",
        variant: "destructive",
      });
    }
  });

  // Handle auto scanner - SCAN ONLY
  const handleAutoScannerScan = async () => {
    // Use selected trading style from the TradingStyleSelector
    // Default to balanced if no style is selected
    let tradingStyle = 'balanced';
    let minConfidence = 60; // Default balanced confidence
    
    // Try to get current trading style from user preferences
    if (userPrefs && typeof userPrefs === 'object' && 'tradingStyle' in userPrefs) {
      tradingStyle = (userPrefs as any).tradingStyle || 'balanced';
    }

    // Set confidence based on trading style presets - REALISTIC thresholds
    const styleConfidenceMap: { [key: string]: number } = {
      'conservative': 35,
      'balanced': 25,
      'aggressive': 20
    };
    minConfidence = styleConfidenceMap[tradingStyle] || 25;

    setIsScanning(true);
    setScannerResults(null);
    
    const scannerData = {
      userId: 'default-user',
      maxBots: parseInt(scannerMaxBots),
      minConfidence: minConfidence,
      tradingStyle: tradingStyle
    };

    await autoScannerMutation.mutateAsync(scannerData);
  };

  // Handle bot deployment from scan results
  const handleDeployBots = async () => {
    if (!scannerResults?.opportunities || scannerResults.opportunities.length === 0) {
      toast({
        title: "No Opportunities",
        description: "No trading opportunities available to deploy",
        variant: "destructive",
      });
      return;
    }

    if (!scannerCapital || parseFloat(scannerCapital) <= 0) {
      toast({
        title: "Invalid Capital",
        description: "Please enter a valid capital amount for bot deployment",
        variant: "destructive",
      });
      return;
    }

    const deployData = {
      userId: 'default-user',
      opportunities: scannerResults.opportunities,
      totalCapital: parseFloat(scannerCapital),
      leverage: parseInt(scannerLeverage),
      scannerName: scannerName.trim() || `Auto Scanner - ${new Date().toLocaleDateString()}`
    };

    await autoDeployMutation.mutateAsync(deployData);
  };

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

  // Create Auto AI Bot mutation
  const createAutoAIBotMutation = useMutation({
    mutationFn: async (botData: any) => {
      const response = await fetch('/api/bot-executions/ai-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create AI bot: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      setShowAutoAICreation(false);
      setSelectedPairForAutoAI(null);
      toast({
        title: "Auto AI Bot Created",
        description: `AI bot deployed successfully for ${selectedPairForAutoAI}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Bot",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle Auto AI Bot creation form submission
  const handleCreateAutoAIBot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPairForAutoAI || !autoAIBotCapital || !autoAIBotLeverage) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const botData = {
      userId: 'default-user',
      tradingPair: selectedPairForAutoAI,
      capital: parseFloat(autoAIBotCapital),
      leverage: parseInt(autoAIBotLeverage),
      deploymentType: 'auto_ai'
    };

    await createAutoAIBotMutation.mutateAsync(botData);
  };

  const resetForm = () => {
    setStrategyName('');
    setPositionDirection('long');
    setTimeframe('1h');
    setRiskLevel('medium');
    setStopLoss('');
    setTakeProfit('');
    setTrailingStop('');
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
          trailingStop: parseFloat(trailingStop) || undefined,
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
    if (!capital) {
      alert('Please enter a capital amount before deploying.');
      return;
    }

    // Validate trading pair or folder selection
    if (deploymentMode === 'individual' && !tradingPair && !pairSearch) {
      alert('Please select a trading pair before deploying.');
      return;
    }

    if (deploymentMode === 'folder' && !selectedFolder) {
      alert('Please select a folder before deploying.');
      return;
    }

    // Auto scanner mode doesn't need pair/folder validation - it selects automatically

    try {
      if (deploymentMode === 'auto_scanner') {
        // Deploy AI bot using Auto Market Scanner
        const executionData = {
          userId: 'default-user',
          strategyId: strategy.id,
          tradingPair: 'AUTO_SCANNER_MODE', // Special marker for auto scanner
          capital,
          leverage,
          status: 'waiting_entry',
          deploymentType: 'auto_scanner',
          botName: `Auto AI - ${strategy.name}`
        };
        
        await runStrategyMutation.mutateAsync(executionData);
        setShowRunDialog(false);
        toast({
          title: "AI Bot Deployed Successfully! 🤖",
          description: `Auto scanner will find optimal trading opportunities using ${leverage}x leverage with $${capital} capital`,
        });
      } else if (selectedFolder) {
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
        toast({
          title: "Strategy Deployed Successfully! 🚀",
          description: `Strategy deployed to ${folder.tradingPairs.length} pairs in "${folder.name}" folder`,
        });
      } else if (tradingPair || pairSearch) {
        // Use either tradingPair or pairSearch as fallback
        const finalTradingPair = tradingPair || pairSearch;
        // Deploy to individual pair
        let actualStrategyId = strategy.id;
        
        // For AI bots, use the existing ID without creating a permanent strategy
        if (strategy.isAI) {
          // AI bots use their existing ID for execution without creating permanent strategies
          actualStrategyId = strategy.id;
          console.log(`🤖 Deploying AI bot: ${strategy.name} with strategyId: ${actualStrategyId}`);
        }

        const executionData = {
          userId: 'default-user',
          strategyId: actualStrategyId,
          tradingPair: finalTradingPair,
          capital,
          leverage,
          status: 'active',
          deploymentType: 'manual',
          botName: strategy.name // Always use the strategy name for bot naming
        };
        
        await runStrategyMutation.mutateAsync(executionData);
        setShowRunDialog(false);
        toast({
          title: "Strategy Deployed Successfully! 🚀",
          description: `Strategy deployed to ${finalTradingPair}!`,
        });
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

  // Handle editing strategy
  const handleEditStrategy = (strategy: any) => {
    setEditingStrategy(strategy);
    // Pre-populate form with existing strategy data
    setStrategyName(strategy.name);
    setPositionDirection(strategy.config?.positionDirection || 'long');
    setTimeframe(strategy.config?.timeframe || '1h');
    setRiskLevel(strategy.riskLevel || 'medium');
    setStopLoss(strategy.config?.riskManagement?.stopLoss?.toString() || '');
    setTakeProfit(strategy.config?.riskManagement?.takeProfit?.toString() || '');
    setTrailingStop(strategy.config?.riskManagement?.trailingStop?.toString() || '');
    
    // Pre-populate indicators with default structure to avoid undefined errors
    const defaultIndicators = {
      rsi: { enabled: false, period: 14, condition: 'above', value: 70 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
      ma1: { enabled: false, type: 'sma', period1: 20, condition: 'above', period2: 50, comparisonType: 'price', comparisonMAType: 'sma' },
      ma2: { enabled: false, type: 'ema', period1: 50, condition: 'above', period2: 200, comparisonType: 'price', comparisonMAType: 'sma' },
      ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossing_up', period2: 20, comparisonType: 'price', comparisonMAType: 'sma' },
      bollinger: { enabled: false, period: 20, stdDev: 2, condition: 'above_upper' },
      stochastic: { enabled: false, kPeriod: 14, dPeriod: 3, smoothK: 3, condition: 'above', value: 80 },
      williams: { enabled: false, period: 14, condition: 'above', value: -20 },
      volume: { enabled: false, condition: 'above_average', multiplier: 1.5 }
    };
    
    // Merge existing indicators with defaults to ensure all properties exist
    if (strategy.config?.indicators) {
      const mergedIndicators = { ...defaultIndicators };
      Object.keys(strategy.config.indicators).forEach(key => {
        if ((mergedIndicators as any)[key]) {
          (mergedIndicators as any)[key] = { ...(mergedIndicators as any)[key], ...strategy.config.indicators[key] };
        }
      });
      setIndicators(mergedIndicators);
    } else {
      setIndicators(defaultIndicators);
    }
    
    setShowEditForm(true);
  };

  // Update strategy mutation
  const updateStrategyMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/bot-strategies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update strategy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-strategies'] });
      setShowEditForm(false);
      setEditingStrategy(null);
      toast({
        title: "Strategy Updated! ✅",
        description: "Your strategy has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update strategy",
      });
    }
  });

  // Handle strategy update
  const handleUpdateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!strategyName.trim()) {
      alert('Please enter a strategy name');
      return;
    }

    const strategyData = {
      id: editingStrategy.id,
      name: strategyName,
      description: `${positionDirection === 'long' ? 'Long' : 'Short'} strategy with ${timeframe} timeframe`,
      strategy: 'manual',
      riskLevel,
      config: {
        timeframe,
        positionDirection,
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
          trailingStop: parseFloat(trailingStop) || undefined,
        }
      }
    };

    try {
      await updateStrategyMutation.mutateAsync(strategyData);
    } catch (error) {
      console.error('Strategy update failed:', error);
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
        trailingStop: '', // Will be populated by AI suggestion logic
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
    setStopLoss(suggestedSettings.recommended.stopLoss || '');
    setTakeProfit(suggestedSettings.recommended.takeProfit || '');
    setTrailingStop(suggestedSettings.recommended.trailingStop || '');
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
    setTradingPair(pair.symbol);
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
              activeTab === 'strategies' 
                ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/40 dark:to-blue-900/40 border-blue-300 dark:border-blue-600 shadow-lg scale-105' 
                : 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800'
            }`}
            onClick={() => handleTabChange('strategies')}
          >
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

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
              activeTab === 'executions' 
                ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/40 dark:to-green-900/40 border-green-300 dark:border-green-600 shadow-lg scale-105' 
                : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800'
            }`}
            onClick={() => handleTabChange('executions')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {(() => {
                      // Count unique bot instances (by strategyId + botName combination) that have at least one active execution
                      const uniqueBots = new Set();
                      (activeExecutions as any[]).forEach(ex => {
                        if (ex.status === 'active') {
                          const botKey = `${ex.strategyId}-${ex.botName || 'default'}`;
                          uniqueBots.add(botKey);
                        }
                      });
                      return uniqueBots.size;
                    })()}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Active Bots</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
              activeTab === 'ai' 
                ? 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800/40 dark:to-purple-900/40 border-purple-300 dark:border-purple-600 shadow-lg scale-105' 
                : 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800'
            }`}
            onClick={() => handleTabChange('ai')}
          >
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



          <Card 
            className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
              activeTab === 'scanner' 
                ? 'bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-800/40 dark:to-cyan-900/40 border-cyan-300 dark:border-cyan-600 shadow-lg scale-105' 
                : 'bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-800'
            }`}
            onClick={() => handleTabChange('scanner')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-lg">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                    Auto
                  </div>
                  <div className="text-xs text-cyan-600 dark:text-cyan-400">Market Scanner</div>
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
                      const runningBots = (activeExecutions as any[]).filter(ex => ex.status !== 'terminated');
                      if (runningBots.length === 0) return 'N/A';
                      
                      // Calculate weighted average win rate based on number of trades
                      const totalTrades = runningBots.reduce((sum, bot) => sum + parseInt(bot.trades || '0'), 0);
                      if (totalTrades === 0) return '0%';
                      
                      const weightedWinRate = runningBots.reduce((sum, bot) => {
                        const trades = parseInt(bot.trades || '0');
                        const winRate = parseFloat(bot.winRate || '0');
                        return sum + (winRate * trades);
                      }, 0) / totalTrades;
                      
                      return `${weightedWinRate.toFixed(1)}%`;
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
        <div className="w-full">



          {/* AI Bots Section */}
          {activeTab === 'ai' && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Trading Bots</h3>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                6 Professional Bots Available
              </Badge>
            </div>

            {/* Trading Style Selector for AI Bots */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Trading Style Preferences</h4>
                    <p className="text-sm text-muted-foreground">Customize AI bot behavior to match your risk tolerance</p>
                  </div>
                </div>
                
                <TradingStyleSelector />
              </CardContent>
            </Card>

            {(() => {
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
                                // For AI bots, use auto-scanner mode with simplified inputs
                                setDeploymentMode('auto_scanner');
                                setCapital(bot.suggestedCapital?.split('-')[0] || '1000');
                                setLeverage(bot.suggestedLeverage?.split('-')[0] || '3');
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
          </div>
          )}

          {/* Auto Market Scanner Section */}
          {activeTab === 'scanner' && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5" />
                Autonomous Market Scanner
              </h3>
              <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                AI-Powered Auto Deployment
              </Badge>
            </div>

            {/* Scanner Configuration Card */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Scanner Configuration</h4>
                    <p className="text-sm text-muted-foreground">Configure trading style, max bots, and start scanning</p>
                  </div>
                </div>
                
                {/* Trading Style Selector */}
                <div className="mb-6">
                  <TradingStyleSelector />
                </div>

                {/* Scanner Settings */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maximum Bots to Deploy</label>
                    <Input
                      type="number"
                      value={scannerMaxBots}
                      onChange={(e) => setScannerMaxBots(e.target.value)}
                      placeholder="e.g., 5"
                      min="1"
                      max="10"
                      data-testid="input-max-bots"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of AI bots to deploy automatically (1-10)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scanner Name</label>
                    <Input
                      type="text"
                      value={scannerName}
                      onChange={(e) => setScannerName(e.target.value)}
                      placeholder="e.g., Morning Scalp Session"
                      data-testid="input-scanner-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Custom name for organizing deployed bots in a dedicated folder
                    </p>
                  </div>

                  {/* Start Scanner Button */}
                  <Button
                    onClick={handleAutoScannerScan}
                    disabled={isScanning || autoScannerMutation.isPending}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    data-testid="button-start-scanner"
                  >
                    {isScanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Scanning Market...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Start Auto Scanner
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scanner Results Card */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-green-500 rounded-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Scanner Results & Deployment</h4>
                    <p className="text-muted-foreground">
                      Set capital allocation and leverage for selected opportunities, then deploy your bots.
                    </p>
                  </div>
                </div>

                {/* Deployment Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Total Capital ($)</label>
                    <Input
                      type="number"
                      value={scannerCapital}
                      onChange={(e) => setScannerCapital(e.target.value)}
                      placeholder="10000"
                      className="bg-white dark:bg-gray-800"
                      disabled={isScanning}
                      data-testid="input-scanner-capital"
                    />
                    <p className="text-xs text-muted-foreground">
                      Will be split equally across selected opportunities
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Leverage</label>
                    <Select value={scannerLeverage} onValueChange={setScannerLeverage} disabled={isScanning}>
                      <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-scanner-leverage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="3">3x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                        <SelectItem value="10">10x</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Leverage for all deployed bots
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Deploy Status</label>
                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
                      {scannerResults ? (
                        <Badge variant="default" className="bg-green-500">
                          Ready to Deploy
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Run Scanner First
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {scannerResults ? 'Results available for deployment' : 'Start scanner to find opportunities'}
                    </p>
                  </div>
                </div>

                {/* Deploy Button */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleDeployBots}
                    disabled={!scannerResults?.opportunities || autoDeployMutation.isPending || isScanning}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    data-testid="button-deploy-bots"
                  >
                    {autoDeployMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Deploy Selected Bots
                      </>
                    )}
                  </Button>
                  
                  {scannerResults?.opportunities && scannerCapital && (
                    <div className="text-sm text-muted-foreground">
                      {scannerResults.opportunities.length} opportunities • Capital per bot: ${(parseFloat(scannerCapital) / scannerResults.opportunities.length).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Display scanning progress and results in the results card */}
                {isScanning && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 text-blue-700 dark:text-blue-300">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <div>
                        <div className="font-medium">Results will appear below when scanning completes...</div>
                        <div className="text-sm">Use the results card to deploy selected opportunities</div>
                      </div>
                    </div>
                  </div>
                )}

                {scannerResults && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
                        <Target className="h-5 w-5" />
                        <span className="font-medium">Scanner Complete! Use Results Card Below</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Opportunities Found</div>
                          <div className="font-bold text-lg">{scannerResults.opportunities?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Confidence</div>
                          <div className="font-bold text-lg">
                            {scannerResults.opportunities?.length > 0 
                              ? Math.round(scannerResults.opportunities.reduce((sum: number, opp: any) => sum + opp.confidence, 0) / scannerResults.opportunities.length)
                              : 0}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Display Multi-Bucket Analysis Results */}
                      {(scannerResults.opportunities?.length > 0 || scannerResults.bucketClassified?.total > 0) && (
                        <div className="mt-4 space-y-4">
                          
                          {/* High-Confidence Trading Opportunities */}
                          {scannerResults.opportunities?.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">High-Confidence Opportunities:</div>
                              <div className="flex flex-wrap gap-2">
                                {scannerResults.opportunities.map((opp: any, index: number) => (
                                  <div 
                                    key={index}
                                    className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 border rounded-lg text-sm"
                                  >
                                    <span className="font-medium">{opp.symbol}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      opp.direction === 'long' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {opp.direction?.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{opp.confidence}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Volatility-Based Bucket Classification */}
                          {scannerResults.bucketClassified?.total > 0 && (
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-muted-foreground">Volatility Classification:</div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Aggressive Bucket */}
                                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    <span className="text-sm font-medium text-red-900 dark:text-red-100">Aggressive</span>
                                    <Badge variant="secondary" className="ml-auto">
                                      {scannerResults.bucketClassified.Aggressive || 0}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                                    <div>• 1m/5m timeframes</div>
                                    <div>• &gt;8% daily volatility</div>
                                    <div>• RSI extremes, BB breaks</div>
                                    <div>• Volume spikes &gt;2x</div>
                                  </div>
                                </div>
                                
                                {/* Balanced Bucket */}
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Balanced</span>
                                    <Badge variant="secondary" className="ml-auto">
                                      {scannerResults.bucketClassified.Balanced || 0}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                    <div>• 15m/1h timeframes</div>
                                    <div>• 3-8% daily volatility</div>
                                    <div>• EMA trend alignment</div>
                                    <div>• MACD/RSI confirmation</div>
                                  </div>
                                </div>
                                
                                {/* Conservative Bucket */}
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Trend className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Conservative</span>
                                    <Badge variant="secondary" className="ml-auto">
                                      {scannerResults.bucketClassified.ConservativeBiasOnly || 0}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                                    <div>• 4h/1d timeframes</div>
                                    <div>• &lt;3% daily volatility</div>
                                    <div>• EMA200 bias filter</div>
                                    <div>• Position trading</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 border-cyan-200 dark:border-cyan-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="mb-4">
                    <Lightbulb className="h-12 w-12 text-cyan-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-lg mb-2">How Auto Scanner Works</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mx-auto">1</div>
                      <div className="font-medium">Market Analysis</div>
                      <div className="text-muted-foreground">
                        Scans 100+ trading pairs using multi-indicator analysis (MACD, RSI, Bollinger Bands, Volume, etc.)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mx-auto">2</div>
                      <div className="font-medium">Opportunity Selection</div>
                      <div className="text-muted-foreground">
                        Ranks opportunities by confidence score and selects top pairs meeting your criteria
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mx-auto">3</div>
                      <div className="font-medium">Auto Deployment</div>
                      <div className="text-muted-foreground">
                        Automatically deploys AI bots with optimized settings and risk management
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Strategies Section */}
          {activeTab === 'strategies' && (
          <div className="space-y-4 mt-4">
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEditStrategy(strategy)}
                          className="px-3"
                        >
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
          </div>
          )}

          {/* Active Executions Section */}
          {activeTab === 'executions' && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Running Bots</h3>
              {activeExecutions.length > 0 && (
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => closeAllPositionsMutation.mutate()}
                  disabled={closeAllPositionsMutation.isPending}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {closeAllPositionsMutation.isPending ? 'Closing...' : 'Close All Positions'}
                </Button>
              )}
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
              <div className="space-y-3 w-full overflow-hidden">
                {(() => {
                  // Group executions by deployment type and folder
                  const folderGroups: { [key: string]: any[] } = {};
                  const manualExecutions: any[] = [];
                  
                  // Group ALL running executions (active, waiting, exit_pending) - exclude only terminated ones
                  (activeExecutions as any[]).forEach((execution: any) => {
                    // Show all running bots regardless of status (active, waiting_entry, exit_pending)
                    
                    // Check if this is an AI strategy bot (regardless of deployment type)
                    const isAIStrategy = execution.botName && (
                      execution.botName.includes('Smart ') || 
                      execution.botName.includes('Grid Trading Pro') || 
                      execution.botName.includes('AI') && !execution.botName.includes('Auto AI')
                    );
                    
                    // True Auto Market Scanner bots (deployed via Auto Market Scanner)
                    if (execution.deploymentType === 'auto_scanner' && !isAIStrategy) {
                      // Group by scanner name extracted from bot name or use folder name
                      let scannerGroupName = execution.folderName || '🤖 Auto Scanner';
                      
                      // Extract scanner name from bot name if it contains a custom scanner name
                      if (execution.botName?.includes(' - ') && execution.botName.startsWith('🤖')) {
                        const parts = execution.botName.split(' - ');
                        if (parts.length >= 3) {
                          // Format: "🤖 Scanner Name - Date - SYMBOL" -> use "🤖 Scanner Name - Date"
                          scannerGroupName = `${parts[0]} - ${parts[1]}`;
                        } else if (parts.length >= 2) {
                          // Format: "🤖 Scanner Name - SYMBOL" -> use "🤖 Scanner Name"
                          scannerGroupName = parts[0];
                        }
                      }
                      
                      if (!folderGroups[scannerGroupName]) {
                        folderGroups[scannerGroupName] = [];
                      }
                      folderGroups[scannerGroupName].push(execution);
                    } 
                    // AI Strategy bots - group by strategy name with proper naming
                    else if (isAIStrategy || (execution.deploymentType === 'folder_bulk' && execution.botName && (execution.botName.includes('Smart ') || execution.botName.includes('Grid Trading Pro')))) {
                      // Extract and format strategy name from bot name
                      let strategyName = execution.botName;
                      
                      // Handle "Auto AI - Strategy Name" format
                      if (strategyName.startsWith('Auto AI - ')) {
                        strategyName = strategyName.replace('Auto AI - ', '');
                      }
                      // Handle "Strategy - Pair" format  
                      else if (strategyName.includes(' - ') && !strategyName.startsWith('Auto AI')) {
                        strategyName = strategyName.split(' - ')[0];
                      }
                      
                      // Create descriptive folder name for AI strategies
                      const folderDisplayName = `🤖 ${strategyName}`;
                      
                      if (!folderGroups[folderDisplayName]) {
                        folderGroups[folderDisplayName] = [];
                      }
                      folderGroups[folderDisplayName].push(execution);
                    }
                    // Regular folder deployments
                    else if ((execution.deploymentType === 'folder_bulk' || execution.deploymentType === 'folder') && execution.folderName) {
                      const folderName = execution.folderName;
                      if (!folderGroups[folderName]) {
                        folderGroups[folderName] = [];
                      }
                      folderGroups[folderName].push(execution);
                    } 
                    // Manual individual bots
                    else if (!execution.folderName || execution.deploymentType === 'manual') {
                      manualExecutions.push(execution);
                    }
                  });

                  return (
                    <>
                      {/* Folder Groups - All organized bots */}
                      {Object.keys(folderGroups).map((folderName) => {
                        const folderBots = folderGroups[folderName];
                        const isAutoScanner = folderName.includes('Auto Scanner') || folderBots[0]?.deploymentType === 'auto_scanner';
                        
                        return (
                          <Card key={folderName} className={`border-l-4 ${isAutoScanner ? 'border-l-green-500 bg-gradient-to-br from-green-900/10 to-emerald-800/10' : 'border-l-blue-500 bg-gradient-to-br from-blue-900/10 to-cyan-800/10'}`}>
                            <CardContent className="p-4">
                              <div 
                                className="cursor-pointer"
                                onClick={() => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {expandedFolders[folderName] ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <h4 className="font-medium truncate">{folderName}</h4>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Stop all ${folderBots.length} bots in ${folderName}? This will close all positions.`)) {
                                        folderBots.forEach(bot => handleTerminateExecution.mutate(bot.id));
                                      }
                                    }}
                                    className="flex-shrink-0 h-7 px-2 text-xs"
                                  >
                                    <Square className="h-3 w-3 mr-1" />
                                    Stop All
                                  </Button>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className={`${isAutoScanner ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300'} text-xs`}>
                                      <span className={`w-2 h-2 ${isAutoScanner ? 'bg-green-500' : 'bg-blue-500'} rounded-full mr-1`}></span>
                                      {folderBots.length} pairs
                                    </Badge>
                                    <Badge variant="outline" className={`${isAutoScanner ? 'text-green-600 border-green-300' : 'text-blue-600 border-blue-300'} text-xs`}>
                                      {isAutoScanner ? 'Auto Deployed' : 'Manual Deployed'}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-medium ${isAutoScanner ? 'text-green-500' : 'text-blue-500'}`}>
                                      +${folderBots.reduce((sum, ex) => sum + parseFloat(ex.profit || '0'), 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {folderBots.filter(ex => ex.status === 'active').length}/{folderBots.length} active
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Folder Details */}
                              {expandedFolders[folderName] && (
                                <div className="mt-4 pt-4 border-t border-border">
                                  <div className="space-y-2">
                                    {folderBots.map((execution: any) => (
                                      <div key={execution.id} className={`p-3 rounded-lg ${isAutoScanner ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/40' : 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/40'}`}>
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <span className={`px-3 py-1.5 rounded text-sm font-medium truncate ${isAutoScanner ? 'bg-green-600/80' : 'bg-blue-600/80'} text-white`}>
                                                {execution.tradingPair}
                                              </span>
                                              <Badge variant="outline" className={`text-xs ${
                                                execution.status === 'active' 
                                                  ? (isAutoScanner ? 'border-green-500 text-green-400 bg-green-950/30' : 'border-blue-500 text-blue-400 bg-blue-950/30')
                                                  : execution.status === 'waiting_entry'
                                                  ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
                                                  : 'border-gray-500 text-gray-400 bg-gray-950/30'
                                              }`}>
                                                {execution.status === 'active' ? '🔴 Active' : execution.status === 'waiting_entry' ? '⏳ Waiting' : '⏸️ Stopped'}
                                              </Badge>
                                            </div>
                                            {(execution.status === 'active' || execution.status === 'waiting_entry') && (
                                              <div className="flex gap-2">
                                                {execution.status === 'active' && (
                                                  <Button 
                                                    size="sm" 
                                                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm font-medium rounded-lg"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      console.log('Exit button clicked for:', execution.tradingPair);
                                                      console.log('Setting selectedBotForVisualization and showExitVisualizer to true');
                                                      setSelectedBotForVisualization(execution);
                                                      setTimeout(() => setShowExitVisualizer(true), 10);
                                                    }}
                                                  >
                                                    👁 Exit
                                                  </Button>
                                                )}
                                                <Button 
                                                  size="sm"
                                                  className="bg-red-600 hover:bg-red-700 text-white h-8 px-4 text-sm font-medium rounded-lg"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    handleTerminateExecution.mutate(execution.id);
                                                  }}
                                                >
                                                  ⏹ Stop
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Exit Information - Restored original format */}
                                          <div className="flex items-center justify-between min-w-0">
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className={`text-xs ${
                                                execution.status === 'active' 
                                                  ? (isAutoScanner ? 'border-green-500 text-green-400 bg-green-950/30' : 'border-blue-500 text-blue-400 bg-blue-950/30')
                                                  : execution.status === 'waiting_entry'
                                                  ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
                                                  : 'border-gray-500 text-gray-400 bg-gray-950/30'
                                              }`}>
                                                {execution.status === 'waiting_entry' ? 'waiting entry' : execution.status}
                                              </Badge>
                                              {execution.confidence && (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                                  {execution.confidence}% confidence
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 text-sm text-right min-w-0">
                                              <div className="text-gray-400 text-xs">
                                                {execution.capital ? `$${parseFloat(execution.capital).toFixed(0)}` : '$0'} • {execution.leverage}x
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span className={`font-medium ${
                                                  execution.positionData?.unrealizedPL ? 
                                                    parseFloat(execution.positionData.unrealizedPL) >= 0 ? 'text-green-400' : 'text-red-400'
                                                    : parseFloat(execution.profit || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                  {execution.positionData?.unrealizedPL ? 
                                                    `${parseFloat(execution.positionData.unrealizedPL) >= 0 ? '+' : ''}$${parseFloat(execution.positionData.unrealizedPL).toFixed(2)}`
                                                    : `${parseFloat(execution.profit || '0') >= 0 ? '+' : ''}$${parseFloat(execution.profit || '0').toFixed(2)}`}
                                                </span>
                                                <span className={`text-xs ${
                                                  execution.positionData?.unrealizedPL && execution.capital ? 
                                                    ((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? 'text-green-400' : 'text-red-400'
                                                    : parseFloat(execution.roi || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                  ({execution.positionData?.unrealizedPL && execution.capital ? 
                                                    `${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? '+' : ''}${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100).toFixed(2)}%`
                                                    : `${parseFloat(execution.roi || '0') >= 0 ? '+' : ''}${parseFloat(execution.roi || '0').toFixed(2)}%`})
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Exit Levels Information */}
                                          {execution.status === 'active' && (
                                            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-600/30">
                                              <div className="flex items-center gap-3">
                                                <span className="text-red-400">
                                                  SL: {execution.stopLoss ? `${parseFloat(execution.stopLoss).toFixed(1)}%` : '-2.0%'}
                                                </span>
                                                <span className="text-green-400">
                                                  TP: {execution.takeProfit ? `${parseFloat(execution.takeProfit).toFixed(1)}%` : '+3.0%'}
                                                </span>
                                              </div>
                                              {execution.positionData && (
                                                <span className="text-gray-400">
                                                  Entry: ${parseFloat(execution.positionData.openPriceAvg || 0).toFixed(4)}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}

                      {/* Manual Individual Bots */}
                      {manualExecutions.length > 0 && (
                        <Card className="border-l-4 border-l-gray-500 bg-gradient-to-br from-gray-900/10 to-slate-800/10">
                          <CardContent className="p-4">
                            <div 
                              className="cursor-pointer"
                              onClick={() => setExpandedFolders(prev => ({ ...prev, 'manual': !prev['manual'] }))}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {expandedFolders['manual'] ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <h4 className="font-medium truncate">Manual Deployments</h4>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Stop all ${manualExecutions.length} manual bots? This will close all positions.`)) {
                                      manualExecutions.forEach(bot => handleTerminateExecution.mutate(bot.id));
                                    }
                                  }}
                                  className="flex-shrink-0 h-7 px-2 text-xs"
                                >
                                  <Square className="h-3 w-3 mr-1" />
                                  Stop All
                                </Button>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
                                    {manualExecutions.length} pairs
                                  </Badge>
                                  <Badge variant="outline" className="text-gray-600 border-gray-300 text-xs">
                                    Manual Deployed
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-500">
                                    +${manualExecutions.reduce((sum, ex) => sum + parseFloat(ex.profit || '0'), 0).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {manualExecutions.filter(ex => ex.status === 'active').length}/{manualExecutions.length} active
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Manual Details */}
                            {expandedFolders['manual'] && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <div className="space-y-2">
                                  {manualExecutions.map((execution: any) => (
                                    <div key={execution.id} className="p-3 rounded-lg bg-gradient-to-r from-gray-900/20 to-slate-900/20 border border-gray-500/40">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="px-3 py-1.5 rounded text-sm font-medium truncate bg-gray-600/80 text-white">
                                              {execution.tradingPair}
                                            </span>
                                            <Badge variant="outline" className={`text-xs ${
                                              execution.status === 'active' 
                                                ? 'border-gray-500 text-gray-400 bg-gray-950/30'
                                                : execution.status === 'waiting_entry'
                                                ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
                                                : 'border-gray-500 text-gray-400 bg-gray-950/30'
                                            }`}>
                                              {execution.status === 'active' ? '🔴 Active' : execution.status === 'waiting_entry' ? '⏳ Waiting' : '⏸️ Stopped'}
                                            </Badge>
                                          </div>
                                          {(execution.status === 'active' || execution.status === 'waiting_entry') && (
                                            <div className="flex gap-2">
                                              {execution.status === 'active' && (
                                                <Button 
                                                  size="sm" 
                                                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm font-medium rounded-lg"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Exit button clicked for manual bot:', execution.tradingPair);
                                                    console.log('Setting selectedBotForVisualization and showExitVisualizer to true');
                                                    setSelectedBotForVisualization(execution);
                                                    setTimeout(() => setShowExitVisualizer(true), 10);
                                                  }}
                                                >
                                                  👁 Exit
                                                </Button>
                                              )}
                                              <Button 
                                                size="sm"
                                                className="bg-red-600 hover:bg-red-700 text-white h-8 px-4 text-sm font-medium rounded-lg"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  handleTerminateExecution.mutate(execution.id);
                                                }}
                                              >
                                                ⏹ Stop
                                              </Button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Exit Information - Manual Bots */}
                                        <div className="flex items-center justify-between min-w-0">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-xs ${
                                              execution.status === 'active' 
                                                ? 'border-gray-500 text-gray-400 bg-gray-950/30'
                                                : execution.status === 'waiting_entry'
                                                ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
                                                : 'border-gray-500 text-gray-400 bg-gray-950/30'
                                            }`}>
                                              {execution.status === 'waiting_entry' ? 'waiting entry' : execution.status}
                                            </Badge>
                                            {execution.confidence && (
                                              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                                {execution.confidence}% confidence
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-1 text-sm text-right min-w-0">
                                            <div className="text-gray-400 text-xs">
                                              {execution.capital ? `$${parseFloat(execution.capital).toFixed(0)}` : '$0'} • {execution.leverage}x
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className={`font-medium ${
                                                execution.positionData?.unrealizedPL ? 
                                                  parseFloat(execution.positionData.unrealizedPL) >= 0 ? 'text-green-400' : 'text-red-400'
                                                  : parseFloat(execution.profit || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                              }`}>
                                                {execution.positionData?.unrealizedPL ? 
                                                  `${parseFloat(execution.positionData.unrealizedPL) >= 0 ? '+' : ''}$${parseFloat(execution.positionData.unrealizedPL).toFixed(2)}`
                                                  : `${parseFloat(execution.profit || '0') >= 0 ? '+' : ''}$${parseFloat(execution.profit || '0').toFixed(2)}`}
                                              </span>
                                              <span className={`text-xs ${
                                                execution.positionData?.unrealizedPL && execution.capital ? 
                                                  ((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? 'text-green-400' : 'text-red-400'
                                                  : parseFloat(execution.roi || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                              }`}>
                                                ({execution.positionData?.unrealizedPL && execution.capital ? 
                                                  `${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? '+' : ''}${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100).toFixed(2)}%`
                                                  : `${parseFloat(execution.roi || '0') >= 0 ? '+' : ''}${parseFloat(execution.roi || '0').toFixed(2)}%`})
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Exit Levels Information for Manual Bots */}
                                        {execution.status === 'active' && (
                                          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-600/30">
                                            <div className="flex items-center gap-3">
                                              <span className="text-red-400">
                                                SL: {execution.stopLoss ? `${parseFloat(execution.stopLoss).toFixed(1)}%` : '-2.0%'}
                                              </span>
                                              <span className="text-green-400">
                                                TP: {execution.takeProfit ? `${parseFloat(execution.takeProfit).toFixed(1)}%` : '+3.0%'}
                                              </span>
                                            </div>
                                            {execution.positionData && (
                                              <span className="text-gray-400">
                                                Entry: ${parseFloat(execution.positionData.openPriceAvg || 0).toFixed(4)}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>



        {/* Auto AI Bot Creation Modal */}
        {showAutoAICreation && selectedPairForAutoAI && (
          <Dialog open={showAutoAICreation} onOpenChange={(open) => {
            setShowAutoAICreation(open);
            if (!open) setSelectedPairForAutoAI(null);
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Auto AI Bot Creation - {selectedPairForAutoAI}</DialogTitle>
              </DialogHeader>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <Bot className="mx-auto h-12 w-12 text-blue-500 mb-3" />
                    <h3 className="text-lg font-semibold">Setting up Auto AI Bot</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      AI will analyze market conditions and execute trades automatically using advanced indicators
                    </p>
                  </div>
                  
                  <form onSubmit={handleCreateAutoAIBot} className="space-y-4">
                    <div>
                      <Label htmlFor="autoai-capital">Investment Amount ($)</Label>
                      <Input
                        id="autoai-capital"
                        type="number"
                        step="0.01"
                        min="1"
                        max="1000"
                        value={autoAIBotCapital}
                        onChange={(e) => setAutoAIBotCapital(e.target.value)}
                        placeholder="Enter investment amount"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="autoai-leverage">Leverage</Label>
                      <Select value={autoAIBotLeverage} onValueChange={setAutoAIBotLeverage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leverage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1x (Conservative)</SelectItem>
                          <SelectItem value="2">2x (Moderate)</SelectItem>
                          <SelectItem value="3">3x (Aggressive)</SelectItem>
                          <SelectItem value="5">5x (High Risk)</SelectItem>
                          <SelectItem value="10">10x (Maximum)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createAutoAIBotMutation.isPending}
                      >
                        {createAutoAIBotMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Auto AI Bot...
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4 mr-2" />
                            Create Auto AI Bot
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
        )}

        {/* Exit Visualizer Dialog */}
        {showExitVisualizer && selectedBotForVisualization && (
          <Dialog open={true} onOpenChange={() => {
            setShowExitVisualizer(false);
            setSelectedBotForVisualization(null);
          }}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Exit Information - {selectedBotForVisualization.tradingPair}</DialogTitle>
                <DialogDescription>Real-time exit conditions and position details</DialogDescription>
              </DialogHeader>
              <DynamicExitVisualizer 
                bot={selectedBotForVisualization}
                onClose={() => {
                  setShowExitVisualizer(false);
                  setSelectedBotForVisualization(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Debug info */}
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs rounded opacity-75 z-50">
          showExitVisualizer: {showExitVisualizer.toString()}<br/>
          selectedBot: {selectedBotForVisualization?.tradingPair || 'none'}
        </div>
      </div>
    </div>
  );
};
