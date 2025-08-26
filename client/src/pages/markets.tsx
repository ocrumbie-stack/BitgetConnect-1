import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useMarketInsights } from '@/hooks/use5MinMovers';
import { useState } from 'react';
import DynamicRiskMeter from '@/components/DynamicRiskMeter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, TrendingDown, Filter, ChevronDown, Plus, Edit, Trash2, MoreVertical, Folder, Star, BarChart3, Volume2, DollarSign, Activity, Eye, Brain, Zap, Target, AlertTriangle, ChevronUp, RefreshCw, TrendingUp as Trend, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';

// Type extension for 5-minute change data
type ExtendedFuturesData = {
  symbol: string;
  price: string;
  change24h?: string;
  change5m?: string;
  volume24h?: string;
  [key: string]: any;
};

export default function Markets() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useBitgetData();
  const { data: marketInsights, isLoading: insightsLoading } = useMarketInsights();
  
  // Screener state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'price'>('change');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers' | 'volatile' | 'stable' | 'large-cap'>('all');
  const [selectedScreener, setSelectedScreener] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRiskPair, setSelectedRiskPair] = useState<string | null>(null);
  
  // AI Opportunities state
  const [activeTab, setActiveTab] = useState('screener');
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set(['momentum']));
  const [showAllOpportunities, setShowAllOpportunities] = useState<{ [key: string]: boolean }>({});

  // AI Opportunity Analysis - Enhanced from Home page
  const generateOpportunities = (strategy: string) => {
    if (!data || data.length === 0) return [];

    const analyzed = data.map((coin: any) => {
      const price = parseFloat(coin.price || '0');
      const change24h = parseFloat(coin.change24h || '0');
      const volume24h = parseFloat(coin.volume24h || '0');
      const absChange = Math.abs(change24h);
      
      let score = 0;
      let confidence = 0;
      let reasons: string[] = [];
      let risk = 'Medium';
      let timeframe = '1-4h';
      
      switch (strategy) {
        case 'momentum':
          // Momentum trading - strong directional moves with volume
          if (absChange >= 0.08) { // 8%+ move
            score += 40;
            reasons.push('Strong momentum');
          } else if (absChange >= 0.05) { // 5%+ move
            score += 25;
            reasons.push('Moderate momentum');
          }
          
          if (volume24h > 10000000) { // > 10M volume
            score += 30;
            confidence += 25;
            reasons.push('High volume confirmation');
          } else if (volume24h > 1000000) { // > 1M volume
            score += 15;
            confidence += 15;
            reasons.push('Adequate volume');
          }
          
          if (absChange >= 0.15) { // 15%+ extreme moves
            risk = 'High';
            timeframe = '30m-2h';
            score += 20;
            reasons.push('Extreme volatility');
          } else if (absChange >= 0.08) {
            risk = 'Medium';
            timeframe = '1-4h';
          } else {
            risk = 'Low';
            timeframe = '4-8h';
          }
          break;

        case 'breakout':
          // Breakout trading - moderate moves with accelerating volume
          if (absChange >= 0.03 && absChange <= 0.12) { // 3-12% sweet spot
            score += 35;
            reasons.push('Breakout range');
          }
          
          if (volume24h > 5000000) { // Strong volume for breakouts
            score += 35;
            confidence += 30;
            reasons.push('Volume breakout');
          }
          
          if (change24h > 0 && change24h < 0.08) { // Positive but not overextended
            score += 20;
            reasons.push('Healthy uptrend');
          }
          
          risk = 'Medium';
          timeframe = '2-6h';
          break;

        case 'scalping':
          // Scalping - high volume, moderate volatility
          if (volume24h > 20000000) { // Very high volume
            score += 45;
            confidence += 35;
            reasons.push('Ultra-high liquidity');
          } else if (volume24h > 5000000) {
            score += 25;
            confidence += 20;
            reasons.push('High liquidity');
          }
          
          if (absChange >= 0.02 && absChange <= 0.06) { // 2-6% moderate volatility
            score += 30;
            reasons.push('Ideal volatility');
          }
          
          if (price > 0.01) { // Avoid micro-cap coins
            score += 15;
            reasons.push('Stable asset');
          }
          
          risk = 'Low';
          timeframe = '5-30m';
          break;

        case 'swing':
          // Swing trading - established trends, good risk/reward
          if (absChange >= 0.05 && absChange <= 0.20) { // 5-20% range
            score += 30;
            reasons.push('Swing range');
          }
          
          if (volume24h > 2000000) { // Moderate volume requirement
            score += 25;
            confidence += 20;
            reasons.push('Good liquidity');
          }
          
          // Favor trending but not overextended moves
          if (Math.abs(change24h) >= 0.03) {
            score += 20;
            reasons.push('Trending move');
          }
          
          risk = 'Medium';
          timeframe = '1-3 days';
          break;

        case 'reversal':
          // Mean reversion - oversold/overbought conditions
          if (absChange >= 0.10) { // 10%+ moves for reversal
            score += 35;
            reasons.push('Oversold/overbought');
          }
          
          if (volume24h > 3000000) {
            score += 25;
            confidence += 20;
            reasons.push('Volume support');
          }
          
          // Extreme moves more likely to reverse
          if (absChange >= 0.15) {
            score += 25;
            reasons.push('Extreme move');
          }
          
          risk = 'High';
          timeframe = '4-12h';
          break;

        case 'remarkable':
          // Remarkable changes - significant movements
          if (absChange >= 0.15) { // 15%+ very significant
            score += 50;
            reasons.push('Extreme price movement');
          } else if (absChange >= 0.08) { // 8%+ significant
            score += 30;
            reasons.push('Significant movement');
          }
          
          if (volume24h > 1000000) {
            score += 20;
            confidence += 15;
            reasons.push('Volume confirmation');
          }
          
          risk = absChange >= 0.20 ? 'Extreme' : absChange >= 0.15 ? 'High' : 'Medium';
          timeframe = 'Real-time';
          break;
      }

      confidence = Math.min(100, confidence + score * 0.8);
      
      return {
        ...coin,
        score,
        confidence: Math.round(confidence),
        reasons,
        risk,
        timeframe
      };
    })
    .filter(coin => coin.score >= 30) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 opportunities per strategy

    return analyzed;
  };

  // Generate opportunities for all strategies
  const opportunities = {
    momentum: generateOpportunities('momentum'),
    breakout: generateOpportunities('breakout'), 
    scalping: generateOpportunities('scalping'),
    swing: generateOpportunities('swing'),
    reversal: generateOpportunities('reversal'),
    remarkable: generateOpportunities('remarkable')
  };

  const toggleStrategyExpansion = (strategy: string) => {
    setExpandedStrategies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strategy)) {
        newSet.delete(strategy);
      } else {
        newSet.add(strategy);
      }
      return newSet;
    });
  };


  // Fetch user screeners
  const { data: userScreeners = [], refetch: refetchScreeners } = useQuery<any[]>({
    queryKey: ['/api/screeners', 'user1'],
    queryFn: async () => {
      const response = await fetch('/api/screeners/user1');
      if (!response.ok) throw new Error('Failed to fetch screeners');
      const data = await response.json();
      console.log('Fetched screeners:', data);
      return data;
    },
    enabled: true,
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Get selected screener object
  const selectedScreenerObj = userScreeners.find((s: any) => s.id === selectedScreener);

  // Function to apply screener criteria
  const applyScreenerFilter = (item: any, screenerCriteria: any) => {
    if (!screenerCriteria) return true;
    
    const price = parseFloat(item.price || '0');
    const volume = parseFloat(item.volume24h || '0');
    const change = parseFloat(item.change24h || '0');
    
    // Price filters
    if (screenerCriteria.minPrice && price < screenerCriteria.minPrice) return false;
    if (screenerCriteria.maxPrice && price > screenerCriteria.maxPrice) return false;
    
    // Volume filters
    if (screenerCriteria.minVolume && volume < screenerCriteria.minVolume) return false;
    if (screenerCriteria.maxVolume && volume > screenerCriteria.maxVolume) return false;
    
    // Change filters
    if (screenerCriteria.minChange && change < screenerCriteria.minChange) return false;
    if (screenerCriteria.maxChange && change > screenerCriteria.maxChange) return false;
    
    // RSI filters (simulate RSI based on price change)
    if (screenerCriteria.rsi) {
      const simulatedRSI = Math.max(0, Math.min(100, 50 + (change * 100))); // Simple RSI simulation
      const rsiValue = screenerCriteria.rsi.value;
      const operator = screenerCriteria.rsi.operator;
      
      if (operator === 'above' && simulatedRSI <= rsiValue) return false;
      if (operator === 'below' && simulatedRSI >= rsiValue) return false;
      if (operator === 'equals' && Math.abs(simulatedRSI - rsiValue) > 5) return false;
    }
    
    // Symbols filter (comma-separated list)
    if (screenerCriteria.symbols && screenerCriteria.symbols.length > 0) {
      const symbolList = Array.isArray(screenerCriteria.symbols) 
        ? screenerCriteria.symbols 
        : screenerCriteria.symbols.split(',').map((s: string) => s.trim());
      if (!symbolList.includes(item.symbol)) return false;
    }
    
    return true;
  };

  // Processing data with screener criteria
  const filteredAndSortedData = data ? data
    .filter(item => {
      const searchMatch = !searchQuery || 
        item.symbol?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!searchMatch) return false;
      
      // Apply screener criteria if a screener is selected
      if (selectedScreener && selectedScreenerObj) {
        const result = applyScreenerFilter(item, selectedScreenerObj.criteria);
        if (item.symbol === 'BTCUSDT') {
          console.log(`Filtering ${item.symbol}:`, {
            criteria: selectedScreenerObj.criteria,
            result,
            simulatedRSI: Math.max(0, Math.min(100, 50 + (parseFloat(item.change24h || '0') * 100)))
          });
        }
        return result;
      }
      
      // Apply basic filters if no screener is selected
      if (filter === 'gainers') {
        return parseFloat(item.change24h || '0') > 0;
      } else if (filter === 'losers') {
        return parseFloat(item.change24h || '0') < 0;
      } else if (filter === 'volatile') {
        return Math.abs(parseFloat(item.change24h || '0')) > 0.05; // >5% movement
      } else if (filter === 'stable') {
        return Math.abs(parseFloat(item.change24h || '0')) < 0.02; // <2% movement
      } else if (filter === 'large-cap') {
        return parseFloat(item.volume24h || '0') > 20000000; // Very high volume as proxy for large cap
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'change':
          aValue = parseFloat(a.change24h || '0');
          bValue = parseFloat(b.change24h || '0');
          break;
        case 'volume':
          aValue = parseFloat(a.volume24h || '0');
          bValue = parseFloat(b.volume24h || '0');
          break;
        case 'price':
          aValue = parseFloat(a.price || '0');
          bValue = parseFloat(b.price || '0');
          break;
        default:
          return 0;
      }
      
      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    }) : [];

  // Market stats calculation
  const marketStats = data ? {
    total: data.length,
    gainers: data.filter(item => parseFloat(item.change24h || '0') > 0).length,
    losers: data.filter(item => parseFloat(item.change24h || '0') < 0).length,
    highVolume: data.filter(item => parseFloat(item.volume24h || '0') > 1000000).length,
    totalVolume: data.reduce((sum, item) => sum + parseFloat(item.volume24h || '0'), 0),
    avgChange: data.reduce((sum, item) => sum + parseFloat(item.change24h || '0'), 0) / data.length
  } : null;

  // Helper functions
  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatChange = (change: string) => {
    const num = parseFloat(change);
    return `${num >= 0 ? '+' : ''}${(num * 100).toFixed(2)}%`;
  };

  // Screener handlers
  const handleScreenerChange = (value: string) => {
    console.log('Screener selection changed:', value);
    setSelectedScreener(value === 'none' ? '' : value);
  };

  const handleEditScreener = (screenerId: string) => {
    setLocation(`/edit-screener/${screenerId}`);
  };

  const handleDeleteScreener = async (screenerId: string) => {
    try {
      const response = await fetch(`/api/screeners/${screenerId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/screeners'] });
        if (selectedScreener === screenerId) {
          setSelectedScreener('');
        }
        toast({
          title: "Success",
          description: "Screener deleted successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete screener",
        variant: "destructive"
      });
    }
  };

  const handleSort = (field: 'change' | 'volume' | 'price') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Failed to load market data</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 max-w-full overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">Markets</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/folders')}
                className="flex items-center gap-2 text-sm"
                data-testid="button-folders"
              >
                <Folder className="h-4 w-4" />
                Folders
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">Live</span>
              </div>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="screener" className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                Screener
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4" />
                AI Opportunities
              </TabsTrigger>
            </TabsList>

            {/* Screener Tab Content */}
            <TabsContent value="screener" className="space-y-4 mt-3">
              {/* Market Overview Cards */}
              <div className="px-4 space-y-4">
                {/* Market Statistics Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setFilter('all');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-blue-700 dark:text-blue-300" data-testid="total-pairs">
                            {isLoading ? '...' : marketStats?.total || 0}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Total Markets</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setFilter('gainers');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-green-700 dark:text-green-300" data-testid="total-gainers">
                            {isLoading ? '...' : marketStats?.gainers || 0}
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400">Gainers (24h)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setFilter('losers');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500 rounded-lg">
                          <TrendingDown className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-red-700 dark:text-red-300" data-testid="total-losers">
                            {isLoading ? '...' : marketStats?.losers || 0}
                          </div>
                          <div className="text-sm text-red-600 dark:text-red-400">Losers (24h)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setFilter('volatile');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Activity className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-purple-700 dark:text-purple-300" data-testid="volatile-pairs">
                            {isLoading ? '...' : data?.filter(item => Math.abs(parseFloat(item.change24h || '0')) > 0.05).length || 0}
                          </div>
                          <div className="text-sm text-purple-600 dark:text-purple-400">Volatile (&gt;5%)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Filter Options */}
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setFilter('stable');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-blue-700 dark:text-blue-300" data-testid="stable-pairs">
                            {isLoading ? '...' : data?.filter(item => Math.abs(parseFloat(item.change24h || '0')) < 0.02).length || 0}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Stable (&lt;2%)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setFilter('large-cap');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500 rounded-lg">
                          <DollarSign className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300" data-testid="large-cap-pairs">
                            {isLoading ? '...' : data?.filter(item => parseFloat(item.volume24h || '0') > 20000000).length || 0}
                          </div>
                          <div className="text-sm text-yellow-600 dark:text-yellow-400">Large Cap</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Market Average Change Card */}
                <Card className={`bg-gradient-to-br ${
                  marketStats && marketStats.avgChange >= 0
                    ? 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800'
                    : 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          marketStats && marketStats.avgChange >= 0 ? 'bg-emerald-500' : 'bg-orange-500'
                        }`}>
                          <Activity className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-medium mb-1">Market Sentiment</div>
                          <div className={`text-xl font-bold ${
                            marketStats && marketStats.avgChange >= 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-orange-700 dark:text-orange-300'
                          }`} data-testid="avg-change">
                            {isLoading ? '...' : marketStats ? `${(marketStats.avgChange * 100).toFixed(2)}%` : '0.00%'}
                          </div>
                          <div className={`text-sm ${
                            marketStats && marketStats.avgChange >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            Average Change (24h)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          marketStats && marketStats.avgChange >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {marketStats && marketStats.avgChange >= 0 ? 'Bullish' : 'Bearish'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Vol: {marketStats ? formatVolume(marketStats.totalVolume.toString()) : '$0'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Search Functionality */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 text-base"
                    data-testid="input-search-markets"
                  />
                </div>

                {/* Unified Screener Selection & Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Screener Filter:</label>
                    <Button
                      onClick={() => setLocation('/create-screener')}
                      size="sm"
                      className="h-8 px-3 text-xs"
                      data-testid="button-create-screener"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New
                    </Button>
                  </div>
                  
                  <Select value={selectedScreener || 'none'} onValueChange={handleScreenerChange}>
                    <SelectTrigger className="w-full h-10 text-base">
                      <SelectValue placeholder="Select screener filter...">
                        {selectedScreener === 'none' || !selectedScreener ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm">All Markets</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm">{userScreeners.find((s: any) => s.id === selectedScreener)?.name || 'Selected Screener'}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm">All Markets</span>
                        </div>
                      </SelectItem>
                      {userScreeners.map((screener: any) => (
                        <SelectItem key={screener.id} value={screener.id}>
                          <div className="flex items-center justify-between w-full min-w-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <span className="text-sm truncate">{screener.name}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-6 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditScreener(screener.id);
                                }}
                                title="Edit screener"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm" 
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteScreener(screener.id);
                                }}
                                title="Delete screener"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Market Data Table */}
              <div className="overflow-hidden">
                <SimpleTable 
                  data={filteredAndSortedData} 
                  isLoading={isLoading}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onRiskAnalysis={setSelectedRiskPair}
                />
              </div>
            </TabsContent>

            {/* AI Opportunities Tab Content */}
            <TabsContent value="opportunities" className="space-y-4 mt-3">
              <div className="px-4">
                {/* Header with controls */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    AI Trading Opportunities
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300">
                      Live Analysis
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {/* Trading Strategy Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { key: 'momentum', label: 'Momentum', icon: Zap, iconColor: 'bg-yellow-500', desc: 'Strong directional moves' },
                    { key: 'breakout', label: 'Breakout', icon: TrendingUp, iconColor: 'bg-green-500', desc: 'Volume breakouts' },
                    { key: 'scalping', label: 'Scalping', icon: Target, iconColor: 'bg-blue-500', desc: 'Quick scalp trades' },
                    { key: 'swing', label: 'Swing', icon: Trend, iconColor: 'bg-purple-500', desc: 'Trend following' },
                    { key: 'reversal', label: 'Reversal', icon: Activity, iconColor: 'bg-orange-500', desc: 'Mean reversion' },
                    { key: 'remarkable', label: 'Remarkable Changes', icon: AlertTriangle, iconColor: 'bg-red-500', desc: 'Significant price movements' }
                  ].map((strategy) => {
                    const isExpanded = expandedStrategies.has(strategy.key);
                    const strategyOpportunities = opportunities[strategy.key as keyof typeof opportunities] || [];
                    
                    return (
                      <Card 
                        key={strategy.key} 
                        className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                          isExpanded ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border hover:border-accent'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleStrategyExpansion(strategy.key);
                        }}
                      >
                        <CardContent className="p-6 text-center">
                          <div className={`w-16 h-16 ${strategy.iconColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                            <strategy.icon className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-lg font-semibold mb-1">{strategy.label}</div>
                          <div className="text-sm text-muted-foreground mb-3">{strategy.desc}</div>
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="secondary" className="text-sm">
                              {strategyOpportunities.length} pairs
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Expanded Strategy Content */}
                <div className="space-y-4">
                  {[
                    { key: 'momentum', label: 'Momentum Trading', icon: Zap, color: 'text-yellow-500', desc: 'High-momentum pairs with strong volume confirmation for trend following strategies.', badge: 'Strong Directional Moves' },
                    { key: 'breakout', label: 'Breakout Trading', icon: TrendingUp, color: 'text-green-500', desc: 'Moderate moves with accelerating volume for breakout strategies.', badge: 'Volume Breakouts' },
                    { key: 'scalping', label: 'Scalping Trading', icon: Target, color: 'text-blue-500', desc: 'Ultra-high liquidity pairs perfect for quick scalping trades.', badge: 'High Liquidity' },
                    { key: 'swing', label: 'Swing Trading', icon: Trend, color: 'text-purple-500', desc: 'Established trends with good risk/reward for swing trading.', badge: 'Trend Following' },
                    { key: 'reversal', label: 'Reversal Trading', icon: Activity, color: 'text-orange-500', desc: 'Oversold/overbought conditions for mean reversion plays.', badge: 'Mean Reversion' },
                    { key: 'remarkable', label: 'Remarkable Price Changes', icon: AlertTriangle, color: 'text-red-500', desc: 'Significant 5-minute and 24-hour price movements with timestamps.', badge: 'Price Alerts' }
                  ].filter(strategy => expandedStrategies.has(strategy.key)).map((strategy) => {
                    const strategyOpportunities = opportunities[strategy.key as keyof typeof opportunities] || [];
                    const displayedOpportunities = strategyOpportunities; // Show all opportunities
                    
                    return (
                      <Card key={strategy.key} className="border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <strategy.icon className={`h-5 w-5 ${strategy.color}`} />
                              <div>
                                <CardTitle className="text-lg">{strategy.label}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">{strategy.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {strategy.badge}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStrategyExpansion(strategy.key)}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                              Analyzing {strategy.key} opportunities...
                            </div>
                          ) : strategyOpportunities.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Info className="h-8 w-8 mx-auto mb-2" />
                              <p>No {strategy.key} opportunities found at the moment</p>
                              <p className="text-xs mt-1">Market conditions may change - try refreshing later</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {displayedOpportunities.map((opportunity: any) => (
                                <Card key={opportunity.symbol} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/trade?pair=${opportunity.symbol}`)}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <div className="font-semibold text-base">{opportunity.symbol}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {opportunity.reasons.join(' • ')}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-sm font-medium ${parseFloat(opportunity.change24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {parseFloat(opportunity.change24h) >= 0 ? '+' : ''}{(parseFloat(opportunity.change24h) * 100).toFixed(2)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        AI Score: {opportunity.confidence}%
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                      <span>Risk: {opportunity.risk}</span>
                                      <span>Timeframe: {opportunity.timeframe}</span>
                                    </div>
                                    <div>
                                      ${parseFloat(opportunity.price).toFixed(4)}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                              
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Risk Analysis Modal */}
      {selectedRiskPair && (
        <DynamicRiskMeter
          pair={selectedRiskPair}
          isOpen={!!selectedRiskPair}
          onClose={() => setSelectedRiskPair(null)}
          onNavigateToTrade={() => {
            setLocation(`/trade?pair=${selectedRiskPair}`);
            setSelectedRiskPair(null);
          }}
          onNavigateToAnalyzer={() => {
            setLocation(`/analyzer?pair=${selectedRiskPair}&autoFill=true`);
            setSelectedRiskPair(null);
          }}
        />
      )}
    </div>
  );
}