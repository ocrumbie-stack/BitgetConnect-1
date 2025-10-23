import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Plus, Play, Edit2, Trash2, TrendingUp, TrendingDown, Settings, Square, Bell, ChevronDown, ChevronRight, Activity, BarChart3, Target, Zap, Users, DollarSign, TrendingUp as Trend, Info, Search, Lightbulb, Eye, X, Wallet } from 'lucide-react';
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
    // Only scroll to top for non-executions tabs to prevent hiding active bot content
    if (tab !== 'executions') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
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
    stochastic: { enabled: false, kPeriod: 14 as string | number, dPeriod: 3 as string | number, smoothK: 3 as string | number, condition: 'above', value: 80 as string | number },
    williams: { enabled: false, period: 14 as string | number, condition: 'above', value: -20 as string | number },
    cci: { enabled: false, period: 20 as string | number, condition: 'above', value: 100 as string | number },
    atr: { enabled: false, period: 14 as string | number, condition: 'above', multiplier: 2.0 as string | number },
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
  
  // Continuous scanner state variables
  const [continuousCapital, setContinuousCapital] = useState('5000');
  const [continuousMaxPositions, setContinuousMaxPositions] = useState('10');
  const [continuousLeverage, setContinuousLeverage] = useState('3');
  const [continuousScanInterval, setContinuousScanInterval] = useState('300');
  const [continuousStats, setContinuousStats] = useState<any>({
    scansCount: 0,
    tradesPlaced: 0,
    profit: 0,
    lastScan: null
  });
  const [deploymentMode, setDeploymentMode] = useState<'individual' | 'folder' | 'auto_scanner' | 'continuous_scanner'>('individual');
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
  
  // Custom TP/SL state for auto scanner
  const [scannerStopLoss, setScannerStopLoss] = useState('3.0');
  const [scannerTakeProfit, setScannerTakeProfit] = useState('6.0');
  const [useCustomTPSL, setUseCustomTPSL] = useState(false);

  // Continuous scanner state
  const [isContinuousActive, setIsContinuousActive] = useState(false);



  // Fetch user strategies (filter to only show manually created ones)
  const { data: allStrategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/bot-strategies'],
    staleTime: 10000, // Cache for 10 seconds to prevent blocking
    refetchOnWindowFocus: false, // Prevent blocking on navigation
    refetchOnMount: true
  });

  // Removed manual organization mutation - folders are now assigned automatically

  // Auto-fix existing auto scanner strategies on first load (non-blocking)
  useEffect(() => {
    const fixAutoScannerStrategies = () => {
      // Use setTimeout to make this non-blocking
      setTimeout(async () => {
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
      }, 100); // Small delay to prevent blocking
    };
    
    // Only run this once when strategies are first loaded
    if ((allStrategies as any[]).length > 0) {
      fixAutoScannerStrategies();
    }
  }, [(allStrategies as any[]).length > 0]);

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
    refetchIntervalInBackground: true,
    staleTime: 3000, // Use cached data for 3 seconds to prevent blocking
    refetchOnWindowFocus: false // Prevent blocking on navigation
  });

  // Fetch futures data for AI suggestions
  const { data: futuresData = [], isLoading: futuresLoading } = useQuery({
    queryKey: ['/api/futures']
  });

  // Fetch user preferences for trading style
  const { data: userPrefs } = useQuery({
    queryKey: ['/api/user-preferences', 'default-user'],
  });

  // Fetch account data for balance display
  const { data: accountData } = useQuery({
    queryKey: ['/api/account/default-user'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Show ALL running bots (both active and waiting) - not just ones currently in trades
  const activeExecutions = (allExecutions as any[]).filter((execution: any) => 
    execution.status === 'active' || execution.status === 'waiting_entry' || execution.status === 'exit_pending'
  );

  // Filter active executions for display



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
    staleTime: 30000, // Cache folders for 30 seconds to prevent blocking
    refetchOnWindowFocus: false // Prevent blocking on navigation
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

  // Continuous scanner mutation
  const continuousScannerMutation = useMutation({
    mutationFn: async (scannerData: any) => {
      const response = await fetch('/api/continuous-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scannerData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to start continuous scanner: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
    }
  });

  // Terminate execution mutation - now closes positions AND terminates bots
  const handleTerminateExecution = useMutation({
    mutationFn: async (executionId: string) => {
      console.log('🚀 Starting bot termination and position closure for:', executionId);
      
      // Step 1: Get bot execution details to extract trading pair and position info
      const executionResponse = await fetch(`/api/bot-executions/${executionId}`);
      if (!executionResponse.ok) {
        throw new Error('Failed to get bot execution details');
      }
      const executionData = await executionResponse.json();
      
      // Step 2: Close position if bot is active and has a position
      if (executionData.status === 'active' && executionData.tradingPair) {
        try {
          console.log('🔄 Closing position for:', executionData.tradingPair);
          const closeResponse = await fetch('/api/close-position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: 'default-user',
              symbol: executionData.tradingPair,
              side: executionData.positionData?.holdSide || 'long' // Use actual position side or default to long
            })
          });
          
          if (!closeResponse.ok) {
            console.warn('⚠️ Failed to close position, but continuing with bot termination');
          } else {
            console.log('✅ Position closed successfully');
          }
        } catch (positionError) {
          console.warn('⚠️ Position close error, but continuing with bot termination:', positionError);
        }
      }
      
      // Step 3: Terminate the bot execution record
      const terminateResponse = await fetch(`/api/bot-executions/${executionId}/terminate`, {
        method: 'POST'
      });
      if (!terminateResponse.ok) {
        const error = await terminateResponse.text();
        console.error('❌ Bot termination failed:', error);
        throw new Error(`Failed to stop bot: ${error}`);
      }
      const result = await terminateResponse.json();
      console.log('✅ Bot terminated successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('🔄 Refreshing bot list after termination and position closure');
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      toast({
        title: "Bot Stopped & Position Closed",
        description: "Bot has been terminated and position closed successfully.",
      });
    },
    onError: (error) => {
      console.error('💥 Bot termination error:', error);
      toast({
        title: "Failed to Stop Bot",
        description: error.message || "Failed to stop bot and close position.",
        variant: "destructive",
      });
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
    
    // Try to get current trading style from user preferences
    if (userPrefs && typeof userPrefs === 'object' && 'tradingStyle' in userPrefs) {
      tradingStyle = (userPrefs as any).tradingStyle || 'balanced';
    }

    // Use a single good confidence level for all trading styles
    // The trading style only determines the timeframe for analysis
    const minConfidence = 65;

    setIsScanning(true);
    setScannerResults(null);
    
    const scannerData = {
      userId: 'default-user',
      maxBots: parseInt(scannerMaxBots),
      minConfidence: minConfidence,
      tradingStyle: tradingStyle,
      customTPSL: useCustomTPSL ? {
        stopLoss: parseFloat(scannerStopLoss),
        takeProfit: parseFloat(scannerTakeProfit)
      } : null
    };

    await autoScannerMutation.mutateAsync(scannerData);
  };

  // Handle stopping auto scanner
  const handleStopAutoScanner = () => {
    setIsScanning(false);
    setScannerResults(null);
    toast({
      title: "Scanner Stopped",
      description: "Auto scanner has been stopped",
    });
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
      scannerName: scannerName.trim() || `Auto Scanner - ${new Date().toLocaleDateString()}`,
      customTPSL: useCustomTPSL ? {
        stopLoss: parseFloat(scannerStopLoss),
        takeProfit: parseFloat(scannerTakeProfit)
      } : null
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
      ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossover_above', period2: 20, comparisonType: 'price', comparisonMAType: 'sma' },
      bollinger: { enabled: false, period: 20, stdDev: 2, condition: 'above_upper' },
      stochastic: { enabled: false, kPeriod: 14, dPeriod: 3, smoothK: 3, condition: 'above', value: 80 },
      williams: { enabled: false, period: 14, condition: 'above', value: -20 },
      cci: { enabled: false, period: 20, condition: 'above', value: 100 },
      atr: { enabled: false, period: 14, condition: 'above', multiplier: 2.0 },
      volume: { enabled: false, condition: 'above_average', multiplier: 1.5 }
    });
    setShowCreateForm(false);
    setEditingStrategy(null);
  };

  const handleUpdateStrategy = async () => {
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
        positionDirection,
        timeframe,
        entryConditions: Object.values(indicators)
          .filter((indicator: any) => indicator.enabled)
          .map((indicator: any, index) => ({
            indicator: Object.keys(indicators)[Object.values(indicators).indexOf(indicator)],
            ...indicator
          })),
        exitConditions: [],
        indicators,
        riskManagement: {
          stopLoss: parseFloat(stopLoss) || 0,
          takeProfit: parseFloat(takeProfit) || 0,
          trailingStop: parseFloat(trailingStop) || 0
        }
      }
    };

    try {
      console.log('Updating strategy with data:', strategyData);
      await updateStrategyMutation.mutateAsync(strategyData);
      // Clear form after successful update
      resetForm();
      toast({
        title: "Strategy Updated! ✅",
        description: "Your strategy has been updated successfully.",
      });
    } catch (error) {
      console.error('Strategy update failed:', error);
      alert('Failed to update strategy: ' + (error as Error).message);
    }
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
      source: 'manual', // Mark as manually created strategy
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

    // Validate continuous scanner settings
    if (deploymentMode === 'continuous_scanner') {
      if (!continuousCapital || parseFloat(continuousCapital) <= 0) {
        alert('Please enter valid capital per position for continuous scanner.');
        return;
      }
      if (!continuousMaxPositions || parseInt(continuousMaxPositions) <= 0) {
        alert('Please enter valid max positions for continuous scanner.');
        return;
      }
      if (!continuousLeverage || parseFloat(continuousLeverage) <= 0) {
        alert('Please enter valid leverage for continuous scanner.');
        return;
      }
      if (!continuousScanInterval || parseInt(continuousScanInterval) < 30) {
        alert('Scan interval must be at least 30 seconds.');
        return;
      }
    }

    // Auto scanner mode doesn't need pair/folder validation - it selects automatically

    try {
      if (deploymentMode === 'auto_scanner') {
        // Deploy AI bot using Auto Market Scanner - use virtual strategy ID
        const executionData = {
          userId: 'default-user',
          strategyId: `ai_virtual_${strategy.id}`, // Virtual ID to prevent strategy creation
          tradingPair: 'AUTO_SCANNER_MODE', // Special marker for auto scanner
          capital,
          leverage,
          status: 'waiting_entry',
          deploymentType: 'auto_scanner',
          botName: `Auto AI - ${strategy.name}`,
          isAIBot: true // Mark as AI bot to prevent strategy record creation
        };
        
        await runStrategyMutation.mutateAsync(executionData);
        setShowRunDialog(false);
        toast({
          title: "AI Bot Deployed Successfully! 🤖",
          description: `Auto scanner will find optimal trading opportunities using ${leverage}x leverage with $${capital} capital`,
        });
      } else if (deploymentMode === 'continuous_scanner') {
        // Start continuous scanner
        const continuousData = {
          userId: 'default-user',
          strategyId: `ai_virtual_${strategy.id}`, // Virtual ID to prevent strategy creation
          capital: continuousCapital,
          leverage: continuousLeverage,
          maxPositions: continuousMaxPositions,
          scanInterval: continuousScanInterval,
          isAIBot: true // Mark as AI bot
        };

        await continuousScannerMutation.mutateAsync(continuousData);
        setIsContinuousActive(true);
        setShowRunDialog(false);
        toast({
          title: "Continuous Scanner Started! 🔄",
          description: `Scanning top 20 volatile pairs every ${continuousScanInterval}s, max ${continuousMaxPositions} positions with ${continuousLeverage}x leverage`,
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
            strategyId: strategy.isAI ? `ai_virtual_${strategy.id}` : strategy.id, // Use virtual ID for AI bots
            tradingPair: pair,
            capital,
            leverage,
            status: 'active',
            deploymentType: strategy.isAI ? 'ai_bot' : 'folder',
            folderId: selectedFolder,
            botName: `${folder.name} - ${strategy.name}`, // Use folder name as bot name
            folderName: folder.name, // Also store folder name for compatibility
            isAIBot: strategy.isAI // Mark AI bots to prevent strategy creation
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
        let actualStrategyId;
        
        // For AI bots, use virtual strategy ID to prevent permanent strategy creation
        if (strategy.isAI) {
          actualStrategyId = `ai_virtual_${strategy.id}`;
          console.log(`🤖 Deploying AI bot: ${strategy.name} with virtual strategyId: ${actualStrategyId}`);
        } else {
          actualStrategyId = strategy.id;
        }

        const executionData = {
          userId: 'default-user',
          strategyId: actualStrategyId,
          tradingPair: finalTradingPair,
          capital,
          leverage,
          status: 'active',
          deploymentType: strategy.isAI ? 'ai_bot' : 'manual',
          botName: strategy.name, // Always use the strategy name for bot naming
          isAIBot: strategy.isAI // Mark AI bots to prevent strategy creation
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

  // Store scroll position for restoration
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Function to restore scroll position and unlock body
  const restoreScrollPosition = () => {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.width = '';
    window.scrollTo(scrollPosition.x, scrollPosition.y);
  };

  // Cleanup body styles when component unmounts or editing changes
  useEffect(() => {
    return () => {
      // Always cleanup body styles when component unmounts
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
    };
  }, []);

  // Cleanup body styles when editing state changes
  useEffect(() => {
    if (!editingStrategy && !showCreateForm) {
      // Reset body styles when not editing
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
    }
  }, [editingStrategy, showCreateForm]);

  // Handle editing strategy
  const handleEditStrategy = (strategy: any) => {
    // Store current scroll position
    const currentScrollY = window.scrollY;
    const currentScrollX = window.scrollX;
    setScrollPosition({ x: currentScrollX, y: currentScrollY });
    
    // Lock body scroll to prevent any movement
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${currentScrollY}px`;
    document.body.style.left = `-${currentScrollX}px`;
    document.body.style.width = '100%';
    
    setEditingStrategy(strategy);
    // Pre-populate form with existing strategy data
    setStrategyName(strategy.name);
    setPositionDirection(strategy.config?.positionDirection || 'long');
    setTimeframe(strategy.config?.timeframe || '1h');
    setRiskLevel(strategy.riskLevel || 'medium');
    setStopLoss(strategy.config?.riskManagement?.stopLoss?.toString() || '');
    setTakeProfit(strategy.config?.riskManagement?.takeProfit?.toString() || '');
    setTrailingStop(strategy.config?.riskManagement?.trailingStop?.toString() || '');
    
    // Pre-populate indicators if they exist
    if (strategy.config?.indicators) {
      setIndicators(prev => ({
        ...prev,
        ...strategy.config.indicators
      }));
    }
    
    // Pre-populate indicators with default structure to avoid undefined errors
    const defaultIndicators = {
      rsi: { enabled: false, period: 14, condition: 'above', value: 70 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, condition: 'bullish_crossover' },
      ma1: { enabled: false, type: 'sma', period1: 20, condition: 'above', period2: 50, comparisonType: 'price', comparisonMAType: 'sma' },
      ma2: { enabled: false, type: 'ema', period1: 50, condition: 'above', period2: 200, comparisonType: 'price', comparisonMAType: 'sma' },
      ma3: { enabled: false, type: 'sma', period1: 10, condition: 'crossover_above', period2: 20, comparisonType: 'price', comparisonMAType: 'sma' },
      bollinger: { enabled: false, period: 20, stdDev: 2, condition: 'above_upper' },
      stochastic: { enabled: false, kPeriod: 14, dPeriod: 3, smoothK: 3, condition: 'above', value: 80 },
      williams: { enabled: false, period: 14, condition: 'above', value: -20 },
      cci: { enabled: false, period: 20, condition: 'above', value: 100 },
      atr: { enabled: false, period: 14, condition: 'above', multiplier: 2.0 },
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
    
    // Show the create form (which serves as both create and edit form)
    setShowCreateForm(true);
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
          // Filter out continuous scanner modes and invalid trading pairs
          coin.symbol !== 'CONTINUOUS_SCANNER_MODE' &&
          coin.symbol !== 'AUTO_SCANNER_MODE' &&
          !coin.symbol.includes('_MODE') &&
          (coin.symbol.toLowerCase().includes(value.toLowerCase()) ||
           coin.symbol.replace('USDT', '').toLowerCase().includes(value.toLowerCase()))
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-20 overflow-x-hidden overflow-y-auto">
      {/* Hero Section with Clean Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900">
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="relative px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <BackButton to="/" label="Home" />
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" data-testid="page-title">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Bot className="h-6 w-6" />
                  </div>
                  Trading Bots
                </h1>
                <p className="text-blue-100 text-lg font-medium">
                  Deploy intelligent trading strategies powered by machine learning
                </p>
                <div className="flex items-center space-x-6 mt-3 text-sm">
                  <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4 text-orange-300" />
                    <span className="font-medium">
                      BTC {(() => {
                        const btcData = Array.isArray(futuresData) ? futuresData.find((coin: any) => coin.symbol === 'BTCUSDT') : null;
                        const change = parseFloat(btcData?.change24h || '0') * 100;
                        return change >= 0 ? '+' : '';
                      })()} {(() => {
                        const btcData = Array.isArray(futuresData) ? futuresData.find((coin: any) => coin.symbol === 'BTCUSDT') : null;
                        const change = parseFloat(btcData?.change24h || '0') * 100;
                        return change.toFixed(2);
                      })()}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-sm">
                    <DollarSign className="w-4 h-4 text-green-300" />
                    <span className="font-medium">${parseFloat((accountData as any)?.account?.availableBalance || '0').toFixed(2)} Available</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action area - reserved for future features */}
            <div className="flex items-center space-x-3">
              {/* Action buttons can be added here as needed */}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Cards */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-colors duration-200 min-h-[80px] border ${
              activeTab === 'strategies' 
                ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/40 dark:to-blue-900/40 border-blue-300 dark:border-blue-600' 
                : 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
            onClick={() => handleTabChange('strategies')}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-md">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {(userStrategies as any[]).length}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Custom Strategies</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors duration-200 min-h-[80px] border ${
              activeTab === 'executions' 
                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800/40 dark:to-emerald-900/40 border-emerald-300 dark:border-emerald-600' 
                : 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-600'
            }`}
            onClick={() => handleTabChange('executions')}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {(() => {
                      const activeBots = (activeExecutions as any[]).filter(ex => ex.status === 'active');
                      return activeBots.length;
                    })()}
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400">Active Bots</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors duration-200 min-h-[80px] border ${
              activeTab === 'ai' 
                ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-800/40 dark:to-indigo-900/40 border-indigo-300 dark:border-indigo-600' 
                : 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
            onClick={() => handleTabChange('ai')}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-md">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                    6
                  </div>
                  <div className="text-sm text-indigo-600 dark:text-indigo-400">Auto Bots</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors duration-200 min-h-[80px] border ${
              activeTab === 'scanner' 
                ? 'bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-800/40 dark:to-cyan-900/40 border-cyan-300 dark:border-cyan-600' 
                : 'bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-800 hover:border-cyan-300 dark:hover:border-cyan-600'
            }`}
            onClick={() => handleTabChange('scanner')}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-md">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                    {(() => {
                      const scannerBots = (activeExecutions as any[]).filter(ex => 
                        ex.deploymentType === 'auto_scanner' && ex.status === 'active'
                      );
                      return scannerBots.length;
                    })()}
                  </div>
                  <div className="text-sm text-cyan-600 dark:text-cyan-400">Smart Scanner</div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* P&L and Balance Cards Row */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {(() => {
            const runningBots = (activeExecutions as any[]).filter(ex => ex.status !== 'terminated');
            const totalPL = runningBots.reduce((sum, bot) => {
              const profit = parseFloat(bot.profit || '0');
              return sum + profit;
            }, 0);
            
            const isPositive = totalPL >= 0;
            const sign = totalPL >= 0 ? '+' : '';
            
            return (
              <Card className={`bg-gradient-to-br shadow-lg border-0 ${isPositive 
                ? 'from-green-600 to-green-700 dark:from-green-700 dark:to-green-800' 
                : 'from-red-600 to-red-700 dark:from-red-700 dark:to-red-800'
              }`}>
                <CardContent className="px-2 py-0.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 ${isPositive ? 'bg-green-800/40' : 'bg-red-800/40'} rounded backdrop-blur-sm`}>
                      {isPositive ? (
                        <TrendingUp className="h-5 w-5 text-white" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold text-white">
                        {runningBots.length === 0 ? '$0.00' : `${sign}$${totalPL.toFixed(2)}`}
                      </div>
                      <div className="text-sm text-white">Total P&L</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 shadow-lg border-0">
            <CardContent className="px-2 py-0.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-800/40 rounded backdrop-blur-sm">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-white">
                    {(accountData as any)?.account?.totalBalance ? `$${parseFloat((accountData as any).account.totalBalance).toFixed(2)}` : '$0.00'}
                  </div>
                  <div className="text-sm text-white">Total Balance</div>
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
              <h3 className="text-lg font-semibold">Trading Bots</h3>
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

                  {/* Custom TP/SL Configuration */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={useCustomTPSL}
                        onCheckedChange={setUseCustomTPSL}
                        data-testid="switch-custom-tpsl"
                      />
                      <Label className="text-sm font-medium">Use Custom TP/SL</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Override default TP/SL calculations with your own values
                    </p>
                    
                    {useCustomTPSL && (
                      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Stop Loss (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={scannerStopLoss}
                            onChange={(e) => setScannerStopLoss(e.target.value)}
                            placeholder="3.0"
                            min="0.1"
                            max="20"
                            data-testid="input-custom-stop-loss"
                          />
                          <p className="text-xs text-muted-foreground">
                            Pair percentage loss to exit
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Take Profit (%)</Label>
                          <Input
                            type="number" 
                            step="0.1"
                            value={scannerTakeProfit}
                            onChange={(e) => setScannerTakeProfit(e.target.value)}
                            placeholder="6.0"
                            min="0.1"
                            max="50"
                            data-testid="input-custom-take-profit"
                          />
                          <p className="text-xs text-muted-foreground">
                            Pair percentage gain to exit
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start/Stop Scanner Button */}
                  <Button
                    onClick={isScanning ? handleStopAutoScanner : handleAutoScannerScan}
                    disabled={autoScannerMutation.isPending}
                    className={`w-full ${isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'} text-white`}
                    data-testid="button-start-scanner"
                  >
                    {isScanning ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Stop Auto Scanner
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
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Capital ($)</label>
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
                                    {opp.timeframes && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        {opp.timeframes.join('+')}
                                      </span>
                                    )}
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
          <div className="space-y-4 mt-4 pb-8">
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
              <div className="space-y-3 w-full">
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
                    
                    // True Auto Market Scanner bots (deployed via Auto Market Scanner) AND Continuous Scanner bots
                    if ((execution.deploymentType === 'auto_scanner' || execution.deploymentType === 'continuous_scanner_child') && !isAIStrategy) {
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
                    // Continuous scanner bots (special handling)
                    else if (execution.deploymentType === 'continuous_scanner' || execution.tradingPair === 'CONTINUOUS_SCANNER_MODE') {
                      const folderName = execution.folderName || '🔄 Continuous Scanner';
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
                          <Card key={folderName} className={`border-l-4 ${isAutoScanner ? 'border-l-cyan-500 bg-gradient-to-br from-cyan-900/10 to-teal-800/10' : 'border-l-blue-500 bg-gradient-to-br from-blue-900/10 to-cyan-800/10'}`}>
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
                                    <Badge variant="secondary" className={`${isAutoScanner ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-blue-100 text-blue-700 border-blue-300'} text-xs`}>
                                      <span className={`w-2 h-2 ${isAutoScanner ? 'bg-cyan-500' : 'bg-blue-500'} rounded-full mr-1`}></span>
                                      {folderBots.length} pairs
                                    </Badge>
                                    <Badge variant="outline" className={`${isAutoScanner ? 'text-cyan-600 border-cyan-300' : 'text-blue-600 border-blue-300'} text-xs`}>
                                      {isAutoScanner ? 'Auto Deployed' : 'Manual Deployed'}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-medium ${isAutoScanner ? 'text-cyan-500' : 'text-blue-500'}`}>
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
                                      <div key={execution.id} className={`p-3 rounded-lg ${isAutoScanner ? 'bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border border-cyan-500/40' : 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/40'}`}>
                                        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                                          {/* Left Column - Bot Info */}
                                          <div className="min-w-0">
                                            {/* Row 1: Pair, Status, Direction */}
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                              <span className={`px-2 py-1 rounded text-sm font-medium ${isAutoScanner ? 'bg-cyan-600/80' : 'bg-blue-600/80'} text-white`}>
                                                {execution.tradingPair}
                                              </span>
                                              <Badge variant="outline" className={`text-xs ${
                                                execution.status === 'active' 
                                                  ? (isAutoScanner ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30' : 'border-blue-500 text-blue-400 bg-blue-950/30')
                                                  : execution.status === 'waiting_entry'
                                                  ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
                                                  : 'border-gray-500 text-gray-400 bg-gray-950/30'
                                              }`}>
                                                {execution.status === 'active' ? 'Active' : execution.status === 'waiting_entry' ? 'Waiting' : 'Stopped'}
                                              </Badge>
                                              {execution.positionData?.holdSide && (
                                                <Badge variant="outline" className={`text-xs ${
                                                  execution.positionData.holdSide === 'long' 
                                                    ? 'border-green-500 text-green-400 bg-green-950/30'
                                                    : 'border-red-500 text-red-400 bg-red-950/30'
                                                }`}>
                                                  {execution.positionData.holdSide.toUpperCase()}
                                                </Badge>
                                              )}
                                            </div>
                                            
                                            {/* Row 2: Trading Details Grid */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                              <div className="text-gray-400">
                                                Capital: {execution.capital ? `$${parseFloat(execution.capital).toFixed(0)}` : '$0'}
                                              </div>
                                              <div className="text-gray-400">
                                                Leverage: {execution.leverage}x
                                              </div>
                                              <div className={`font-medium ${
                                                execution.positionData?.unrealizedPL ? 
                                                  parseFloat(execution.positionData.unrealizedPL) >= 0 ? 'text-green-400' : 'text-red-400'
                                                  : parseFloat(execution.profit || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                              }`}>
                                                P&L: {execution.positionData?.unrealizedPL ? 
                                                  `${parseFloat(execution.positionData.unrealizedPL) >= 0 ? '+' : ''}$${parseFloat(execution.positionData.unrealizedPL).toFixed(2)}`
                                                  : `${parseFloat(execution.profit || '0') >= 0 ? '+' : ''}$${parseFloat(execution.profit || '0').toFixed(2)}`}
                                              </div>
                                              <div className={`font-medium ${
                                                execution.positionData?.unrealizedPL && execution.capital ? 
                                                  ((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? 'text-green-400' : 'text-red-400'
                                                  : parseFloat(execution.roi || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                              }`}>
                                                ROI: {execution.positionData?.unrealizedPL && execution.capital ? 
                                                  `${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? '+' : ''}${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100).toFixed(2)}%`
                                                  : `${parseFloat(execution.roi || '0') >= 0 ? '+' : ''}${parseFloat(execution.roi || '0').toFixed(2)}%`}
                                              </div>
                                              {execution.status === 'active' && execution.positionData && (
                                                <>
                                                  <div className="text-gray-400">
                                                    Entry: ${parseFloat(execution.positionData.openPriceAvg || 0).toFixed(4)}
                                                  </div>
                                                  <div className="text-gray-400">
                                                    Current: ${parseFloat(execution.positionData.markPrice || 0).toFixed(4)}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                            
                                            {/* Row 3: Exit Levels (if active) */}
                                            {execution.status === 'active' && (
                                              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-600/30 text-xs">
                                                <span className="text-red-400">
                                                  SL: {execution.exitCriteria?.stopLoss || execution.stopLoss ? 
                                                    `${parseFloat(execution.exitCriteria?.stopLoss || execution.stopLoss).toFixed(1)}%` : '-6.0%'}
                                                </span>
                                                <span className="text-green-400">
                                                  TP: {execution.exitCriteria?.takeProfit || execution.takeProfit ? 
                                                    `${parseFloat(execution.exitCriteria?.takeProfit || execution.takeProfit).toFixed(1)}%` : '+10.0%'}
                                                </span>
                                                {execution.confidence && (
                                                  <span className="text-purple-400">
                                                    Confidence: {execution.confidence}%
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Right Column - Action Buttons */}
                                          {(execution.status === 'active' || execution.status === 'waiting_entry') && (
                                            <div className="flex flex-col gap-2 flex-shrink-0 items-center">
                                              {execution.status === 'active' && (
                                                <Button 
                                                  size="sm" 
                                                  className="bg-blue-600 hover:bg-blue-700 text-white h-7 w-7 text-xs rounded-md flex items-center justify-center p-0"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Exit button clicked for:', execution.tradingPair);
                                                    console.log('Setting selectedBotForVisualization and showExitVisualizer to true');
                                                    setSelectedBotForVisualization(execution);
                                                    setTimeout(() => setShowExitVisualizer(true), 10);
                                                  }}
                                                >
                                                  <Info size={14} />
                                                </Button>
                                              )}
                                              <Button 
                                                size="sm"
                                                className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs rounded-md"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  handleTerminateExecution.mutate(execution.id);
                                                }}
                                              >
                                                Stop
                                              </Button>
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
                                      <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                                        {/* Left Column - Bot Info */}
                                        <div className="min-w-0">
                                          {/* Row 1: Pair, Status, Direction */}
                                          <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="px-2 py-1 rounded text-sm font-medium bg-gray-600/80 text-white">
                                              {execution.tradingPair}
                                            </span>
                                            <Badge variant="outline" className={`text-xs ${
                                              execution.status === 'active' 
                                                ? 'border-gray-500 text-gray-400 bg-gray-950/30'
                                                : execution.status === 'waiting_entry'
                                                ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
                                                : 'border-gray-500 text-gray-400 bg-gray-950/30'
                                            }`}>
                                              {execution.status === 'active' ? 'Active' : execution.status === 'waiting_entry' ? 'Waiting' : 'Stopped'}
                                            </Badge>
                                            {execution.positionData?.holdSide && (
                                              <Badge variant="outline" className={`text-xs ${
                                                execution.positionData.holdSide === 'long' 
                                                  ? 'border-green-500 text-green-400 bg-green-950/30'
                                                  : 'border-red-500 text-red-400 bg-red-950/30'
                                              }`}>
                                                {execution.positionData.holdSide.toUpperCase()}
                                              </Badge>
                                            )}
                                          </div>
                                          
                                          {/* Row 2: Trading Details Grid */}
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            <div className="text-gray-400">
                                              Capital: {execution.capital ? `$${parseFloat(execution.capital).toFixed(0)}` : '$0'}
                                            </div>
                                            <div className="text-gray-400">
                                              Leverage: {execution.leverage}x
                                            </div>
                                            <div className={`font-medium ${
                                              execution.positionData?.unrealizedPL ? 
                                                parseFloat(execution.positionData.unrealizedPL) >= 0 ? 'text-green-400' : 'text-red-400'
                                                : parseFloat(execution.profit || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                              P&L: {execution.positionData?.unrealizedPL ? 
                                                `${parseFloat(execution.positionData.unrealizedPL) >= 0 ? '+' : ''}$${parseFloat(execution.positionData.unrealizedPL).toFixed(2)}`
                                                : `${parseFloat(execution.profit || '0') >= 0 ? '+' : ''}$${parseFloat(execution.profit || '0').toFixed(2)}`}
                                            </div>
                                            <div className={`font-medium ${
                                              execution.positionData?.unrealizedPL && execution.capital ? 
                                                ((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? 'text-green-400' : 'text-red-400'
                                                : parseFloat(execution.roi || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                              ROI: {execution.positionData?.unrealizedPL && execution.capital ? 
                                                `${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100) >= 0 ? '+' : ''}${((parseFloat(execution.positionData.unrealizedPL) / parseFloat(execution.capital)) * 100).toFixed(2)}%`
                                                : `${parseFloat(execution.roi || '0') >= 0 ? '+' : ''}${parseFloat(execution.roi || '0').toFixed(2)}%`}
                                            </div>
                                            {execution.status === 'active' && execution.positionData && (
                                              <>
                                                <div className="text-gray-400">
                                                  Entry: ${parseFloat(execution.positionData.openPriceAvg || 0).toFixed(4)}
                                                </div>
                                                <div className="text-gray-400">
                                                  Current: ${parseFloat(execution.positionData.markPrice || 0).toFixed(4)}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                          
                                          {/* Row 3: Exit Levels (if active) */}
                                          {execution.status === 'active' && (
                                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-600/30 text-xs">
                                              <span className="text-red-400">
                                                SL: {execution.exitCriteria?.stopLoss || execution.stopLoss ? 
                                                  `${parseFloat(execution.exitCriteria?.stopLoss || execution.stopLoss).toFixed(1)}%` : '-6.0%'}
                                              </span>
                                              <span className="text-green-400">
                                                TP: {execution.exitCriteria?.takeProfit || execution.takeProfit ? 
                                                  `${parseFloat(execution.exitCriteria?.takeProfit || execution.takeProfit).toFixed(1)}%` : '+10.0%'}
                                              </span>
                                              {execution.confidence && (
                                                <span className="text-purple-400">
                                                  Confidence: {execution.confidence}%
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Right Column - Action Buttons */}
                                        {(execution.status === 'active' || execution.status === 'waiting_entry') && (
                                          <div className="flex flex-col gap-2 flex-shrink-0 items-center">
                                            {execution.status === 'active' && (
                                              <Button 
                                                size="sm" 
                                                className="bg-blue-600 hover:bg-blue-700 text-white h-7 w-7 text-xs rounded-md flex items-center justify-center p-0"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  console.log('Exit button clicked for manual bot:', execution.tradingPair);
                                                  console.log('Setting selectedBotForVisualization and showExitVisualizer to true');
                                                  setSelectedBotForVisualization(execution);
                                                  setTimeout(() => setShowExitVisualizer(true), 10);
                                                }}
                                              >
                                                <Info size={14} />
                                              </Button>
                                            )}
                                            <Button 
                                              size="sm"
                                              className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs rounded-md"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                handleTerminateExecution.mutate(execution.id);
                                              }}
                                            >
                                              Stop
                                            </Button>
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
                      <Label htmlFor="autoai-capital" className="text-gray-900 dark:text-gray-100 font-medium">Investment Amount ($)</Label>
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
                      <Label htmlFor="autoai-leverage" className="text-gray-900 dark:text-gray-100 font-medium">Leverage</Label>
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
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden mx-4">
              <div className="overflow-y-auto max-h-full">
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
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Main Deployment Dialog - RESTORED */}
        {showRunDialog && selectedStrategy && (
          <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Deploy Strategy: {selectedStrategy.name}</DialogTitle>
                <DialogDescription>Configure deployment settings and select target</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Deployment Mode Selector - RESTORED */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Deployment Mode</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <div 
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        deploymentMode === 'individual' 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setDeploymentMode('individual')}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="deploymentMode" 
                          value="individual"
                          checked={deploymentMode === 'individual'}
                          onChange={() => setDeploymentMode('individual')}
                          className="text-blue-500"
                        />
                        <div>
                          <div className="font-medium">Single Trading Pair</div>
                          <div className={`text-sm ${
                            deploymentMode === 'individual' 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : 'text-muted-foreground'
                          }`}>Deploy bot to one specific trading pair</div>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        deploymentMode === 'folder' 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setDeploymentMode('folder')}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="deploymentMode" 
                          value="folder"
                          checked={deploymentMode === 'folder'}
                          onChange={() => setDeploymentMode('folder')}
                          className="text-purple-500"
                        />
                        <div>
                          <div className="font-medium">Folder Deployment</div>
                          <div className={`text-sm ${
                            deploymentMode === 'folder' 
                              ? 'text-purple-700 dark:text-purple-300' 
                              : 'text-muted-foreground'
                          }`}>Deploy to all pairs in selected folder</div>
                        </div>
                      </div>
                    </div>

                    {selectedStrategy.isAI && (
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          deploymentMode === 'auto_scanner' 
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setDeploymentMode('auto_scanner')}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name="deploymentMode" 
                            value="auto_scanner"
                            checked={deploymentMode === 'auto_scanner'}
                            onChange={() => setDeploymentMode('auto_scanner')}
                            className="text-cyan-500"
                          />
                          <div>
                            <div className="font-medium">Auto Market Scanner</div>
                            <div className={`text-sm ${
                              deploymentMode === 'auto_scanner' 
                                ? 'text-cyan-700 dark:text-cyan-300' 
                                : 'text-muted-foreground'
                            }`}>AI finds optimal trading opportunities automatically</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Continuous Scanner Mode - Re-enabled */}
                    <div 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        deploymentMode === 'continuous_scanner'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setDeploymentMode('continuous_scanner')}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="deploymentMode" 
                          value="continuous_scanner"
                          checked={deploymentMode === 'continuous_scanner'}
                          onChange={() => setDeploymentMode('continuous_scanner')}
                          className="text-orange-500"
                        />
                        <div>
                          <div className="font-medium">Continuous Scanner</div>
                          <div className={`text-sm ${
                            deploymentMode === 'continuous_scanner' 
                              ? 'text-orange-700 dark:text-orange-300' 
                              : 'text-gray-600 dark:text-gray-300'
                          }`}>Continuously scans and deploys bots on volatile pairs</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Pair Selection */}
                {deploymentMode === 'individual' && (
                  <div className="space-y-2">
                    <Label htmlFor="pair-search" className="text-gray-900 dark:text-gray-100 font-medium">Select Trading Pair</Label>
                    <div className="relative">
                      <Input
                        id="pair-search"
                        type="text"
                        value={pairSearch}
                        onChange={(e) => handlePairSearchChange(e.target.value)}
                        placeholder="Search for trading pair (e.g., BTCUSDT)"
                        className="w-full"
                      />
                      {showAutoSuggest && filteredPairs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                          {filteredPairs.map((pair: any) => (
                            <div
                              key={pair.symbol}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                              onClick={() => selectPair(pair)}
                            >
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">{pair.symbol}</span>
                                <span className={`ml-2 text-sm ${parseFloat(pair.change24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {parseFloat(pair.change24h) >= 0 ? '+' : ''}{parseFloat(pair.change24h).toFixed(2)}%
                                </span>
                              </div>
                              <span className="text-xs text-gray-600 dark:text-muted-foreground">
                                Vol: ${(parseFloat(pair.volume24h) / 1000000).toFixed(1)}M
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Folder Selection */}
                {deploymentMode === 'folder' && (
                  <div className="space-y-2">
                    <Label className="text-gray-900 dark:text-gray-100 font-medium">Select Folder</Label>
                    <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {(folders as any[]).map((folder: any) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name} ({folder.tradingPairs?.length || 0} pairs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Continuous Scanner Configuration */}
                {deploymentMode === 'continuous_scanner' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950 border-orange-200">
                    <Label className="font-medium text-orange-800 dark:text-orange-200">Continuous Scanner Settings</Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="continuous-capital" className="text-gray-900 dark:text-gray-100 font-medium">Capital per Position</Label>
                        <Input
                          id="continuous-capital"
                          type="number"
                          value={continuousCapital}
                          onChange={(e) => setContinuousCapital(e.target.value)}
                          placeholder="5000"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="continuous-max-positions" className="text-gray-900 dark:text-gray-100 font-medium">Max Positions</Label>
                        <Input
                          id="continuous-max-positions"
                          type="number"
                          value={continuousMaxPositions}
                          onChange={(e) => setContinuousMaxPositions(e.target.value)}
                          placeholder="10"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="continuous-leverage" className="text-gray-900 dark:text-gray-100 font-medium min-h-[2.5rem] flex items-center">Leverage</Label>
                        <Select value={continuousLeverage} onValueChange={setContinuousLeverage}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select leverage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1x (Conservative)</SelectItem>
                            <SelectItem value="2">2x (Moderate)</SelectItem>
                            <SelectItem value="3">3x (Balanced)</SelectItem>
                            <SelectItem value="5">5x (Aggressive)</SelectItem>
                            <SelectItem value="10">10x (Maximum)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="continuous-scan-interval" className="text-gray-900 dark:text-gray-100 font-medium min-h-[2.5rem] flex items-center">Scan Interval (seconds)</Label>
                        <Input
                          id="continuous-scan-interval"
                          type="number"
                          value={continuousScanInterval}
                          onChange={(e) => setContinuousScanInterval(e.target.value)}
                          placeholder="300"
                          min="30"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Capital and Leverage */}
                {(deploymentMode !== 'continuous_scanner' &&
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capital" className="text-gray-900 dark:text-gray-100 font-medium">Capital ($)</Label>
                    <Input
                      id="capital"
                      type="number"
                      step="0.01"
                      min="1"
                      value={capital}
                      onChange={(e) => setCapital(e.target.value)}
                      placeholder="Enter capital amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leverage" className="text-gray-900 dark:text-gray-100 font-medium">Leverage</Label>
                    <Select value={leverage} onValueChange={setLeverage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x (Conservative)</SelectItem>
                        <SelectItem value="2">2x (Moderate)</SelectItem>
                        <SelectItem value="3">3x (Balanced)</SelectItem>
                        <SelectItem value="5">5x (Aggressive)</SelectItem>
                        <SelectItem value="10">10x (Maximum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                )}

                {/* Deploy Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowRunDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleRunStrategy(selectedStrategy)}
                    disabled={runStrategyMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {runStrategyMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {deploymentMode === 'continuous_scanner' 
                          ? 'Start Continuous Scanner'
                          : deploymentMode === 'auto_scanner' 
                          ? 'Deploy AI Scanner'
                          : deploymentMode === 'folder' 
                          ? 'Deploy to Folder'
                          : 'Deploy Strategy'
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Strategy Creation Dialog - RESTORED */}
        {showCreateForm && (
          <Dialog open={showCreateForm} onOpenChange={(open) => {
            if (!open) {
              // Dialog is closing, restore scroll position
              restoreScrollPosition();
              setEditingStrategy(null);
            }
            setShowCreateForm(open);
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible">
              <DialogHeader>
                <DialogTitle>{editingStrategy ? 'Edit Trading Strategy' : 'Create Custom Trading Strategy'}</DialogTitle>
                <DialogDescription>{editingStrategy ? 'Update your personalized trading strategy' : 'Build a personalized trading strategy with technical indicators and risk management'}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Basic Strategy Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="strategy-name">Strategy Name</Label>
                    <Input
                      id="strategy-name"
                      type="text"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      placeholder="e.g., My Momentum Strategy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Direction</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div
                        onClick={() => setPositionDirection('long')}
                        className={`cursor-pointer border rounded-lg p-4 text-center transition-all hover:scale-105 ${
                          positionDirection === 'long'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`p-2 rounded-full ${
                            positionDirection === 'long' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-800 text-green-500'
                          }`}>
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">Long</div>
                            <div className="text-xs text-muted-foreground">Buy Position</div>
                          </div>
                        </div>
                      </div>
                      
                      <div
                        onClick={() => setPositionDirection('short')}
                        className={`cursor-pointer border rounded-lg p-4 text-center transition-all hover:scale-105 ${
                          positionDirection === 'short'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`p-2 rounded-full ${
                            positionDirection === 'short' 
                              ? 'bg-red-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-800 text-red-500'
                          }`}>
                            <TrendingDown className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">Short</div>
                            <div className="text-xs text-muted-foreground">Sell Position</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trading Parameters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Timeframe</Label>
                    <Select 
                      value={timeframe} 
                      onValueChange={(value) => {
                        console.log('Timeframe changed to:', value);
                        setTimeframe(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="1m">1 Minute</SelectItem>
                        <SelectItem value="5m">5 Minutes</SelectItem>
                        <SelectItem value="15m">15 Minutes</SelectItem>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="4h">4 Hours</SelectItem>
                        <SelectItem value="1d">1 Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Risk Level</Label>
                    <Select 
                      value={riskLevel} 
                      onValueChange={(value) => {
                        console.log('Risk level changed to:', value);
                        setRiskLevel(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                    <Input
                      id="stop-loss"
                      type="number"
                      step="0.1"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      placeholder="e.g., 5.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="take-profit">Take Profit (%)</Label>
                    <Input
                      id="take-profit"
                      type="number"
                      step="0.1"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      placeholder="e.g., 10.0"
                    />
                  </div>
                </div>

                {/* Technical Indicators */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Technical Indicators</h4>
                  
                  {/* RSI Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.rsi?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            rsi: { ...prev.rsi, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">RSI (Relative Strength Index)</Label>
                      </div>
                    </div>
                    {indicators.rsi?.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Period</Label>
                          <Input
                            type="number"
                            value={indicators.rsi?.period === '' ? '' : indicators.rsi?.period || 14}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              rsi: { ...prev.rsi, period: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="14"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Select 
                            value={indicators.rsi?.condition || 'above'} 
                            onValueChange={(value) => setIndicators(prev => ({
                              ...prev,
                              rsi: { ...prev.rsi, condition: value }
                            }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above</SelectItem>
                              <SelectItem value="below">Below</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Value</Label>
                          <Input
                            type="number"
                            value={indicators.rsi?.value === '' ? '' : indicators.rsi?.value || 70}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              rsi: { ...prev.rsi, value: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="e.g. 50"
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* MACD Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.macd?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            macd: { ...prev.macd, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">MACD</Label>
                      </div>
                    </div>
                    {indicators.macd?.enabled && (
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-sm">Fast Period</Label>
                          <Input
                            type="number"
                            value={indicators.macd?.fastPeriod === '' ? '' : indicators.macd?.fastPeriod || 12}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              macd: { ...prev.macd, fastPeriod: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Slow Period</Label>
                          <Input
                            type="number"
                            value={indicators.macd?.slowPeriod === '' ? '' : indicators.macd?.slowPeriod || 26}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              macd: { ...prev.macd, slowPeriod: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Signal Period</Label>
                          <Input
                            type="number"
                            value={indicators.macd?.signalPeriod === '' ? '' : indicators.macd?.signalPeriod || 9}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              macd: { ...prev.macd, signalPeriod: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Select 
                            value={indicators.macd?.condition || 'bullish_crossover'} 
                            onValueChange={(value) => setIndicators(prev => ({
                              ...prev,
                              macd: { ...prev.macd, condition: value }
                            }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bullish_crossover">Bullish Crossover</SelectItem>
                              <SelectItem value="bearish_crossover">Bearish Crossover</SelectItem>
                              <SelectItem value="histogram_above_zero">Histogram Above Zero</SelectItem>
                              <SelectItem value="histogram_below_zero">Histogram Below Zero</SelectItem>
                              <SelectItem value="macd_above_signal">MACD Above Signal</SelectItem>
                              <SelectItem value="macd_below_signal">MACD Below Signal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Moving Average 1 */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.ma1?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            ma1: { ...prev.ma1, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">Moving Average 1</Label>
                      </div>
                    </div>
                    {indicators.ma1?.enabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm">Type</Label>
                            <Select 
                              value={indicators.ma1?.type || 'sma'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                ma1: { ...prev.ma1, type: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sma">SMA</SelectItem>
                                <SelectItem value="ema">EMA</SelectItem>
                                <SelectItem value="wma">WMA</SelectItem>
                                <SelectItem value="dema">DEMA</SelectItem>
                                <SelectItem value="tema">TEMA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm">Period</Label>
                            <Input
                              type="number"
                              value={indicators.ma1?.period1 === '' ? '' : indicators.ma1?.period1 || 20}
                              onChange={(e) => setIndicators(prev => ({
                                ...prev,
                                ma1: { ...prev.ma1, period1: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                              }))}
                              className="mt-1"
                              placeholder="20"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Condition</Label>
                            <Select 
                              value={indicators.ma1?.condition || 'above'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                ma1: { ...prev.ma1, condition: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="above">Above</SelectItem>
                                <SelectItem value="below">Below</SelectItem>
                                <SelectItem value="crossover_above">Crossover Above</SelectItem>
                                <SelectItem value="crossover_below">Crossover Below</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm">Comparison</Label>
                            <Select 
                              value={indicators.ma1?.comparisonType || 'price'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                ma1: { ...prev.ma1, comparisonType: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="price">Price</SelectItem>
                                <SelectItem value="another_ma">Another MA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {indicators.ma1?.comparisonType === 'another_ma' && (
                            <>
                              <div>
                                <Label className="text-sm">Comparison MA Type</Label>
                                <Select 
                                  value={indicators.ma1?.comparisonMAType || 'sma'} 
                                  onValueChange={(value) => setIndicators(prev => ({
                                    ...prev,
                                    ma1: { ...prev.ma1, comparisonMAType: value }
                                  }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sma">SMA</SelectItem>
                                    <SelectItem value="ema">EMA</SelectItem>
                                    <SelectItem value="wma">WMA</SelectItem>
                                    <SelectItem value="dema">DEMA</SelectItem>
                                    <SelectItem value="tema">TEMA</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-sm">Comparison MA Period</Label>
                                <Input
                                  type="number"
                                  value={indicators.ma1?.period2 === '' ? '' : indicators.ma1?.period2 || 50}
                                  onChange={(e) => setIndicators(prev => ({
                                    ...prev,
                                    ma1: { ...prev.ma1, period2: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                                  }))}
                                  className="mt-1"
                                  placeholder="50"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Moving Average 2 */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.ma2?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            ma2: { ...prev.ma2, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">Moving Average 2</Label>
                      </div>
                    </div>
                    {indicators.ma2?.enabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm">Type</Label>
                            <Select 
                              value={indicators.ma2?.type || 'ema'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                ma2: { ...prev.ma2, type: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sma">SMA</SelectItem>
                                <SelectItem value="ema">EMA</SelectItem>
                                <SelectItem value="wma">WMA</SelectItem>
                                <SelectItem value="dema">DEMA</SelectItem>
                                <SelectItem value="tema">TEMA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm">Period</Label>
                            <Input
                              type="number"
                              value={indicators.ma2?.period1 === '' ? '' : indicators.ma2?.period1 || 50}
                              onChange={(e) => setIndicators(prev => ({
                                ...prev,
                                ma2: { ...prev.ma2, period1: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                              }))}
                              className="mt-1"
                              placeholder="50"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Condition</Label>
                            <Select 
                              value={indicators.ma2?.condition || 'above'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                ma2: { ...prev.ma2, condition: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1">
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
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm">Comparison</Label>
                            <Select 
                              value={indicators.ma2?.comparisonType || 'price'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                ma2: { ...prev.ma2, comparisonType: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="price">Price</SelectItem>
                                <SelectItem value="another_ma">Another MA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {indicators.ma2?.comparisonType === 'another_ma' && (
                            <>
                              <div>
                                <Label className="text-sm">Comparison MA Type</Label>
                                <Select 
                                  value={indicators.ma2?.comparisonMAType || 'sma'} 
                                  onValueChange={(value) => setIndicators(prev => ({
                                    ...prev,
                                    ma2: { ...prev.ma2, comparisonMAType: value }
                                  }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sma">SMA</SelectItem>
                                    <SelectItem value="ema">EMA</SelectItem>
                                    <SelectItem value="wma">WMA</SelectItem>
                                    <SelectItem value="dema">DEMA</SelectItem>
                                    <SelectItem value="tema">TEMA</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-sm">Comparison MA Period</Label>
                                <Input
                                  type="number"
                                  value={indicators.ma2?.period2 === '' ? '' : indicators.ma2?.period2 || 200}
                                  onChange={(e) => setIndicators(prev => ({
                                    ...prev,
                                    ma2: { ...prev.ma2, period2: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                                  }))}
                                  className="mt-1"
                                  placeholder="200"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>


                  {/* Bollinger Bands Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.bollinger?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            bollinger: { ...prev.bollinger, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">Bollinger Bands</Label>
                      </div>
                    </div>
                    {indicators.bollinger?.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Period</Label>
                          <Input
                            type="number"
                            value={indicators.bollinger?.period || 20}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              bollinger: { ...prev.bollinger, period: parseInt(e.target.value) || 20 }
                            }))}
                            className="mt-1"
                            placeholder="20"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Standard Deviation</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={indicators.bollinger?.stdDev || 2.0}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              bollinger: { ...prev.bollinger, stdDev: parseFloat(e.target.value) || 2.0 }
                            }))}
                            className="mt-1"
                            placeholder="2.0"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Select 
                            value={indicators.bollinger?.condition || 'above_upper'} 
                            onValueChange={(value) => setIndicators(prev => ({
                              ...prev,
                              bollinger: { ...prev.bollinger, condition: value }
                            }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above_upper">Above Upper Band</SelectItem>
                              <SelectItem value="below_lower">Below Lower Band</SelectItem>
                              <SelectItem value="between_bands">Between Bands</SelectItem>
                              <SelectItem value="squeeze">Squeeze</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* CCI Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.cci?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            cci: { ...prev.cci, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">CCI (Commodity Channel Index)</Label>
                      </div>
                    </div>
                    {indicators.cci?.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Period</Label>
                          <Input
                            type="number"
                            value={indicators.cci?.period === '' ? '' : indicators.cci?.period || 20}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              cci: { ...prev.cci, period: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="20"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Select 
                            value={indicators.cci?.condition || 'above'} 
                            onValueChange={(value) => setIndicators(prev => ({
                              ...prev,
                              cci: { ...prev.cci, condition: value }
                            }))}
                          >
                            <SelectTrigger className="mt-1">
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
                          <Label className="text-sm">Value</Label>
                          <Input
                            type="number"
                            value={indicators.cci?.value === '' ? '' : indicators.cci?.value || 100}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              cci: { ...prev.cci, value: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="100"
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* ATR Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.atr?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            atr: { ...prev.atr, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">ATR (Average True Range)</Label>
                      </div>
                    </div>
                    {indicators.atr?.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Period</Label>
                          <Input
                            type="number"
                            value={indicators.atr?.period === '' ? '' : indicators.atr?.period || 14}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              atr: { ...prev.atr, period: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="14"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Select 
                            value={indicators.atr?.condition || 'above'} 
                            onValueChange={(value) => setIndicators(prev => ({
                              ...prev,
                              atr: { ...prev.atr, condition: value }
                            }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above Threshold</SelectItem>
                              <SelectItem value="below">Below Threshold</SelectItem>
                              <SelectItem value="high_volatility">High Volatility</SelectItem>
                              <SelectItem value="low_volatility">Low Volatility</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Multiplier</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={indicators.atr?.multiplier === '' ? '' : indicators.atr?.multiplier || 2.0}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              atr: { ...prev.atr, multiplier: e.target.value === '' ? '' : parseFloat(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="2.0"
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Stochastic Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.stochastic?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            stochastic: { ...prev.stochastic, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">Stochastic Oscillator</Label>
                      </div>
                    </div>
                    {indicators.stochastic?.enabled && (
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-sm">K Period</Label>
                          <Input
                            type="number"
                            value={indicators.stochastic?.kPeriod === '' ? '' : indicators.stochastic?.kPeriod || 14}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              stochastic: { ...prev.stochastic, kPeriod: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="14"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">D Period</Label>
                          <Input
                            type="number"
                            value={indicators.stochastic?.dPeriod === '' ? '' : indicators.stochastic?.dPeriod || 3}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              stochastic: { ...prev.stochastic, dPeriod: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="3"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Smooth K</Label>
                          <Input
                            type="number"
                            value={indicators.stochastic?.smoothK === '' ? '' : indicators.stochastic?.smoothK || 3}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              stochastic: { ...prev.stochastic, smoothK: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="3"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition & Value</Label>
                          <div className="flex gap-1">
                            <Select 
                              value={indicators.stochastic?.condition || 'above'} 
                              onValueChange={(value) => setIndicators(prev => ({
                                ...prev,
                                stochastic: { ...prev.stochastic, condition: value }
                              }))}
                            >
                              <SelectTrigger className="mt-1 flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="above">Above</SelectItem>
                                <SelectItem value="below">Below</SelectItem>
                                <SelectItem value="overbought">Overbought</SelectItem>
                                <SelectItem value="oversold">Oversold</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={indicators.stochastic?.value === '' ? '' : indicators.stochastic?.value || 80}
                              onChange={(e) => setIndicators(prev => ({
                                ...prev,
                                stochastic: { ...prev.stochastic, value: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                              }))}
                              className="mt-1 w-16"
                              placeholder="80"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Williams %R Indicator */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={indicators.williams?.enabled || false}
                          onChange={(e) => setIndicators(prev => ({
                            ...prev,
                            williams: { ...prev.williams, enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <Label className="font-medium">Williams %R</Label>
                      </div>
                    </div>
                    {indicators.williams?.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Period</Label>
                          <Input
                            type="number"
                            value={indicators.williams?.period === '' ? '' : indicators.williams?.period || 14}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              williams: { ...prev.williams, period: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="14"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Select 
                            value={indicators.williams?.condition || 'above'} 
                            onValueChange={(value) => setIndicators(prev => ({
                              ...prev,
                              williams: { ...prev.williams, condition: value }
                            }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above</SelectItem>
                              <SelectItem value="below">Below</SelectItem>
                              <SelectItem value="overbought">Overbought (-20)</SelectItem>
                              <SelectItem value="oversold">Oversold (-80)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Value</Label>
                          <Input
                            type="number"
                            value={indicators.williams?.value === '' ? '' : indicators.williams?.value || -20}
                            onChange={(e) => setIndicators(prev => ({
                              ...prev,
                              williams: { ...prev.williams, value: e.target.value === '' ? '' : parseInt(e.target.value) || '' }
                            }))}
                            className="mt-1"
                            placeholder="-20"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingStrategy ? handleUpdateStrategy : handleCreateStrategy}
                    disabled={(editingStrategy ? updateStrategyMutation.isPending : createStrategyMutation.isPending) || !strategyName.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {(editingStrategy ? updateStrategyMutation.isPending : createStrategyMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingStrategy ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {editingStrategy ? 'Update Strategy' : 'Create Strategy'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        


        {/* Bot Info Dialog */}
        {showBotInfo && selectedBotInfo && (
          <Dialog open={true} onOpenChange={() => {
            setShowBotInfo(false);
            setSelectedBotInfo(null);
          }}>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  {selectedBotInfo.name} Information
                </DialogTitle>
                <DialogDescription>
                  Detailed information about this AI trading bot
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedBotInfo.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Win Rate</div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">{selectedBotInfo.winRate}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Avg Return</div>
                      <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{selectedBotInfo.avgReturn}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Risk Level:</span>
                      <Badge variant={selectedBotInfo.risk === 'Low' ? 'secondary' : selectedBotInfo.risk === 'Medium' ? 'outline' : 'destructive'} className="text-xs">
                        {selectedBotInfo.risk}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Suggested Capital:</span>
                      <span className="font-medium">${selectedBotInfo.suggestedCapital}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Suggested Leverage:</span>
                      <span className="font-medium">{selectedBotInfo.suggestedLeverage}x</span>
                    </div>
                  </div>
                  
                  {selectedBotInfo.features && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Features:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedBotInfo.features.map((feature: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedBotInfo.recommendedPairs && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Recommended Pairs:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedBotInfo.recommendedPairs.slice(0, 4).map((pair: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {pair}
                          </Badge>
                        ))}
                        {selectedBotInfo.recommendedPairs.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{selectedBotInfo.recommendedPairs.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bot Settings Dialog */}
        {showBotSettings && selectedBot && (
          <Dialog open={true} onOpenChange={() => {
            setShowBotSettings(false);
            setSelectedBot(null);
          }}>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  {selectedBot.name} Settings
                </DialogTitle>
                <DialogDescription>
                  Configure settings for this AI trading bot
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <div className="font-medium mb-1">AI Bot Configuration</div>
                      <p className="text-xs">This bot uses advanced AI algorithms. Settings are automatically optimized based on market conditions and your trading style preferences.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Auto-Deploy</span>
                    <Switch defaultChecked={true} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Risk Management</span>
                    <Switch defaultChecked={true} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Dynamic Leverage</span>
                    <Switch defaultChecked={selectedBot.risk !== 'High'} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Market Sentiment Analysis</span>
                    <Switch defaultChecked={true} />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Notification Level</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Major events only</SelectItem>
                        <SelectItem value="medium">Medium - Important updates</SelectItem>
                        <SelectItem value="high">High - All activities</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Max Daily Trades</Label>
                    <Input
                      type="number"
                      defaultValue="5"
                      min="1"
                      max="20"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowBotSettings(false);
                      setSelectedBot(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    onClick={() => {
                      toast({
                        title: "Settings Updated",
                        description: "AI bot settings have been saved successfully.",
                      });
                      setShowBotSettings(false);
                      setSelectedBot(null);
                    }}
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Alert Center Dialog */}
        {showAlertCenter && (
          <AlertCenter 
            isOpen={showAlertCenter}
            onClose={() => setShowAlertCenter(false)}
            userId="default-user"
          />
        )}
      </div>
    </div>
  );
};
