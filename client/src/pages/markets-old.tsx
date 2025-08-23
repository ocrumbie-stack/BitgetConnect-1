import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useState } from 'react';
import DynamicRiskMeter from '@/components/DynamicRiskMeter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, TrendingDown, Filter, ChevronDown, Plus, Edit, Trash2, MoreVertical, Folder, Star, BarChart3, Volume2, DollarSign, Activity, Eye, Brain, Zap, Target, AlertTriangle, ChevronUp, RefreshCw } from 'lucide-react';


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export function Markets() {
  const { data, isLoading } = useBitgetData();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'price'>('change');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [selectedScreener, setSelectedScreener] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRiskPair, setSelectedRiskPair] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('screener');
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set(['momentum']));
  const [showAllOpportunities, setShowAllOpportunities] = useState<{ [key: string]: boolean }>({});
  
  // Fetch user screeners from API
  const { data: userScreeners = [] } = useQuery({
    queryKey: ['/api/screeners', 'user1'],
    queryFn: async () => {
      const response = await fetch('/api/screeners/user1');
      if (!response.ok) {
        throw new Error('Failed to fetch screeners');
      }
      return response.json();
    }
  });

  const deleteScreenerMutation = useMutation({
    mutationFn: async (screenerId: string) => {
      const response = await fetch(`/api/screeners/${screenerId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete screener');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screeners', 'user1'] });
      setSelectedScreener('');
      toast({
        title: "Screener deleted",
        description: "The screener has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete screener. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleScreenerChange = (value: string) => {
    if (value === 'create-new') {
      setLocation('/create-screener');
    } else {
      setSelectedScreener(value);
    }
  };

  const handleEditScreener = (screenerId: string) => {
    setLocation(`/edit-screener/${screenerId}`);
  };

  const handleDeleteScreener = (screenerId: string) => {
    deleteScreenerMutation.mutate(screenerId);
  };

  // Find the selected screener object
  const selectedScreenerObj = userScreeners.find((s: any) => s.id === selectedScreener);

  const filteredAndSortedData = data
    ?.filter((item) => {
      // Search filter
      if (searchQuery && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Gainers/Losers filter
      if (filter === 'gainers' && parseFloat(item.change24h || '0') <= 0) {
        return false;
      }
      if (filter === 'losers' && parseFloat(item.change24h || '0') >= 0) {
        return false;
      }
      
      // Screener filter
      if (selectedScreenerObj && selectedScreenerObj.criteria) {
        const criteria = selectedScreenerObj.criteria;
        const price = parseFloat(item.price || '0');
        const volume = parseFloat(item.volume24h || '0');
        const change = parseFloat(item.change24h || '0') * 100; // Convert to percentage
        
        // Price range
        if (criteria.minPrice && price < criteria.minPrice) return false;
        if (criteria.maxPrice && price > criteria.maxPrice) return false;
        
        // Volume range (24h)
        if (criteria.minVolume && volume < criteria.minVolume) return false;
        if (criteria.maxVolume && volume > criteria.maxVolume) return false;
        
        // Volume USD range
        if (criteria.minVolumeUsd && (volume * price) < criteria.minVolumeUsd) return false;
        if (criteria.maxVolumeUsd && (volume * price) > criteria.maxVolumeUsd) return false;
        
        // Change range
        if (criteria.minChange && change < criteria.minChange) return false;
        if (criteria.maxChange && change > criteria.maxChange) return false;
        
        // Market cap range (approximation using volume * price as proxy)
        const marketCapProxy = volume * price;
        if (criteria.minMarketCap && marketCapProxy < criteria.minMarketCap) return false;
        if (criteria.maxMarketCap && marketCapProxy > criteria.maxMarketCap) return false;
        
        // Specific symbols
        if (criteria.symbols && criteria.symbols.length > 0) {
          // Split comma-separated symbols and trim whitespace
          const symbolList = Array.isArray(criteria.symbols) 
            ? criteria.symbols 
            : criteria.symbols.split(',').map((s: string) => s.trim());
          
          const symbolMatch = symbolList.some((symbol: string) => {
            const cleanSymbol = symbol.toLowerCase().replace(/usdt$/, '');
            return item.symbol.toLowerCase().includes(cleanSymbol) || 
                   item.symbol.toLowerCase().startsWith(cleanSymbol);
          });
          if (!symbolMatch) return false;
        }
        
        // Technical indicators (basic implementation)
        // Note: For a complete implementation, we would need historical price data
        // For now, we'll implement basic RSI and other indicators using current price/volume data
        
        if (criteria.rsi) {
          // Simplified RSI implementation based on price change
          const priceChange = change;
          if (criteria.rsi.operator === 'above' && priceChange <= criteria.rsi.value) return false;
          if (criteria.rsi.operator === 'below' && priceChange >= criteria.rsi.value) return false;
          if (criteria.rsi.operator === 'between' && 
              (priceChange < criteria.rsi.value || priceChange > (criteria.rsi.valueMax || 100))) return false;
        }
        
        if (criteria.stochastic) {
          // Simplified stochastic implementation
          if (criteria.stochastic.operator === 'oversold' && change >= -2) return false;
          if (criteria.stochastic.operator === 'overbought' && change <= 2) return false;
          if (criteria.stochastic.operator === 'above' && change <= criteria.stochastic.value) return false;
          if (criteria.stochastic.operator === 'below' && change >= criteria.stochastic.value) return false;
        }
      }
      
      return true;
    })
    ?.sort((a, b) => {
      let aValue: number;
      let bValue: number;

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
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    }) || [];

  const handleSort = (field: 'change' | 'volume' | 'price') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  // Market statistics calculations
  const marketStats = data ? {
    totalMarkets: data.length,
    gainers: data.filter(item => parseFloat(item.change24h || '0') > 0).length,
    losers: data.filter(item => parseFloat(item.change24h || '0') < 0).length,
    totalVolume: data.reduce((sum, item) => sum + parseFloat(item.volume24h || '0'), 0),
    topGainer: data.reduce((max, item) => 
      parseFloat(item.change24h || '0') > parseFloat(max.change24h || '0') ? item : max, data[0]
    ),
    topLoser: data.reduce((min, item) => 
      parseFloat(item.change24h || '0') < parseFloat(min.change24h || '0') ? item : min, data[0]
    )
  } : null;

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatChange = (change: string) => {
    const num = parseFloat(change);
    return `${num >= 0 ? '+' : ''}${(num * 100).toFixed(2)}%`;
  };

  // AI Opportunities Logic (moved from home page)
  const majorPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT'];

  const generateOpportunities = (strategyType: string) => {
    if (!data || data.length === 0) return [];
    
    const validItems = data.filter(item => 
      item.symbol && 
      item.price && 
      item.change24h && 
      item.volume24h &&
      parseFloat(item.price) > 0 &&
      parseFloat(item.volume24h) > 0
    );

    return validItems.map(item => {
      const symbol = item.symbol;
      const price = parseFloat(item.price || '0');
      const change24h = parseFloat(item.change24h || '0');
      const volume24h = parseFloat(item.volume24h || '0');
      const absChange = Math.abs(change24h);
      
      let score = 0;
      let confidence = 40;
      const reasons: string[] = [];
      let risk = 'Medium';
      let timeframe = '4h';
      
      switch (strategyType) {
        case 'momentum':
          if (absChange >= 0.05) {
            score += 40;
            confidence += 25;
            reasons.push('Strong momentum');
          }
          
          if (volume24h > 10000000) {
            score += 30;
            confidence += 20;
            reasons.push('High volume');
          }
          
          if (absChange >= 0.10) {
            score += 20;
            reasons.push('Explosive move');
          }
          
          risk = 'High';
          timeframe = '1-4h';
          break;

        case 'breakout':
          if (volume24h > 5000000) {
            score += 35;
            confidence += 30;
            reasons.push('Volume breakout');
          }
          
          if (change24h > 0 && change24h < 0.08) {
            score += 20;
            reasons.push('Healthy uptrend');
          }
          
          risk = 'Medium';
          timeframe = '2-6h';
          break;

        case 'scalping':
          if (volume24h > 20000000) {
            score += 45;
            confidence += 35;
            reasons.push('Ultra-high liquidity');
          } else if (volume24h > 5000000) {
            score += 25;
            confidence += 20;
            reasons.push('High liquidity');
          }
          
          if (absChange >= 0.02 && absChange <= 0.06) {
            score += 30;
            reasons.push('Ideal volatility');
          }
          
          if (price > 0.01) {
            score += 15;
            reasons.push('Stable asset');
          }
          
          risk = 'Low';
          timeframe = '5-30m';
          break;

        case 'swing':
          if (absChange >= 0.05 && absChange <= 0.20) {
            score += 30;
            reasons.push('Swing range');
          }
          
          if (volume24h > 2000000) {
            score += 25;
            confidence += 20;
            reasons.push('Sufficient volume');
          }
          
          if (Math.abs(change24h) >= 0.06) {
            score += 25;
            reasons.push('Strong trend');
          }
          
          risk = 'Medium';
          timeframe = '1-3 days';
          break;

        case 'reversal':
          if (absChange >= 0.10) {
            score += 35;
            reasons.push('Potential reversal');
          }
          
          if (change24h < -0.08) {
            score += 25;
            reasons.push('Oversold opportunity');
          } else if (change24h > 0.15) {
            score += 20;
            reasons.push('Overbought reversal');
          }
          
          if (volume24h > 3000000) {
            score += 20;
            confidence += 15;
            reasons.push('Volume support');
          }
          
          risk = 'High';
          timeframe = '2-8h';
          break;

        case 'remarkable':
          if (absChange >= 0.03) {
            score += 40;
            reasons.push('Significant move');
          }
          
          if (absChange >= 0.05) {
            score += 30;
            reasons.push('Major price shift');
          }
          
          if (volume24h > 1000000) {
            score += 20;
            confidence += 15;
            reasons.push('Volume confirmation');
          }
          
          risk = 'Variable';
          timeframe = 'Real-time';
          break;
      }

      if (reasons.length === 0) {
        reasons.push('Standard criteria');
      }

      const finalScore = Math.min(Math.max(score, 0), 100);
      const finalConfidence = Math.min(Math.max(confidence, 30), 95);

      return {
        symbol,
        price: price.toFixed(6),
        change: `${change24h >= 0 ? '+' : ''}${(change24h * 100).toFixed(2)}%`,
        volume: volume24h.toLocaleString(),
        score: finalScore,
        confidence: finalConfidence,
        reasons: reasons.slice(0, 3),
        risk,
        timeframe,
        timestamp: new Date().toLocaleTimeString()
      };
    })
    .filter(opp => opp.score >= 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  };

  const opportunities = {
    momentum: generateOpportunities('momentum'),
    breakout: generateOpportunities('breakout'),
    scalping: generateOpportunities('scalping'),
    swing: generateOpportunities('swing'),
    reversal: generateOpportunities('reversal'),
    remarkable: generateOpportunities('remarkable')
  };

  const toggleStrategyExpansion = (strategy: string) => {
    const newExpanded = new Set(expandedStrategies);
    if (newExpanded.has(strategy)) {
      newExpanded.delete(strategy);
    } else {
      newExpanded.add(strategy);
    }
    setExpandedStrategies(newExpanded);
  };

  const toggleShowAll = (strategy: string) => {
    setShowAllOpportunities(prev => ({
      ...prev,
      [strategy]: !prev[strategy]
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">Markets</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/folders')}
                className="flex items-center gap-2"
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="screener" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Market Screener
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Opportunities
              </TabsTrigger>
            </TabsList>

            {/* Screener Tab Content */}
            <TabsContent value="screener" className="space-y-4 mt-4">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-markets"
                />
              </div>

              {/* Screener Dropdown */}
              <div className="space-y-2">
                {selectedScreenerObj && (
                  <div className="text-xs text-muted-foreground">
                    Active: {selectedScreenerObj.name} ({filteredAndSortedData.length} results)
                  </div>
                )}
                <div className="w-48">
                <Select value={selectedScreener} onValueChange={handleScreenerChange}>
                  <SelectTrigger className="w-full" data-testid="screener-select">
                    <SelectValue placeholder="Screener" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    <SelectItem value="create-new">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create New Screener
                      </div>
                    </SelectItem>
                    {userScreeners.map((screener: { id: string; name: string; userId: string }) => (
                      <SelectItem key={screener.id} value={screener.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{screener.name}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-2"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`screener-menu-${screener.id}`}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditScreener(screener.id);
                                }}
                                data-testid={`edit-screener-${screener.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteScreener(screener.id);
                                }}
                                className="text-red-600"
                                data-testid={`delete-screener-${screener.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
              
              {/* Market Overview Cards */}
              {marketStats && !isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  AI Trading Opportunities
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Live Analysis
                  </Badge>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setLocation('/strategy-recommender')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Brain className="h-4 w-4" />
                    Strategy AI
                  </Button>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 w-full">
                {[
                  { key: 'momentum', label: 'Momentum', icon: Zap, iconColor: 'bg-yellow-500', desc: 'Strong directional moves' },
                  { key: 'breakout', label: 'Breakout', icon: TrendingUp, iconColor: 'bg-green-500', desc: 'Volume breakouts' },
                  { key: 'scalping', label: 'Scalping', icon: Target, iconColor: 'bg-blue-500', desc: 'Quick scalp trades' },
                  { key: 'swing', label: 'Swing', icon: TrendingUp as any, iconColor: 'bg-purple-500', desc: 'Trend following' },
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
                  { key: 'swing', label: 'Swing Trading', icon: TrendingUp as any, color: 'text-purple-500', desc: 'Established trends with good risk/reward for swing trading.', badge: 'Trend Following' },
                  { key: 'reversal', label: 'Reversal Trading', icon: Activity, color: 'text-orange-500', desc: 'Oversold/overbought conditions for mean reversion plays.', badge: 'Mean Reversion' },
                  { key: 'remarkable', label: 'Remarkable Price Changes', icon: AlertTriangle, color: 'text-red-500', desc: 'Significant 5-minute and 24-hour price movements with timestamps.', badge: 'Price Alerts' }
                ].filter(strategy => expandedStrategies.has(strategy.key)).map((strategy) => {
                  const strategyOpportunities = opportunities[strategy.key as keyof typeof opportunities] || [];
                  const showAll = showAllOpportunities[strategy.key] || false;
                  const displayedOpportunities = showAll ? strategyOpportunities : strategyOpportunities.slice(0, 3);
                  
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
                              Analyzing market conditions...
                            </div>
                          ) : strategyOpportunities.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Target className="h-8 w-8 mx-auto mb-2" />
                              No opportunities found for this strategy
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {displayedOpportunities.map((opp: any, index: number) => (
                                <div
                                  key={`${opp.symbol}-${index}`}
                                  className="flex items-center justify-between p-3 bg-background rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                                  onClick={() => setLocation(`/analyzer?pair=${opp.symbol}&autoFill=true`)}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <div className="font-semibold text-base">{opp.symbol}</div>
                                      <Badge 
                                        variant={opp.change.startsWith('+') ? 'default' : 'destructive'}
                                        className={`text-xs ${
                                          opp.change.startsWith('+') 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                        }`}
                                      >
                                        {opp.change}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        ${opp.price}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium text-blue-600">Score:</span>
                                        <span className="text-xs font-bold">{opp.score}/100</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">•</div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium text-green-600">Confidence:</span>
                                        <span className="text-xs font-bold">{opp.confidence}%</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">•</div>
                                      <div className="text-xs text-muted-foreground">{opp.timeframe}</div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRiskPair(opp.symbol);
                                    }}
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Risk
                                  </Button>
                                </div>
                              ))}
                              
                              {strategyOpportunities.length > 3 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleShowAll(strategy.key)}
                                  className="w-full"
                                >
                                  {showAll ? 'Show Less' : `Show All ${strategyOpportunities.length} Opportunities`}
                                </Button>
                              )}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

              {/* Market Overview Cards */}
              {marketStats && !isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Total Markets */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                filter === 'all' 
                  ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/30 dark:to-blue-700/30 border-blue-300 dark:border-blue-600 ring-2 ring-blue-400' 
                  : 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800'
              }`}
              onClick={() => setFilter('all')}
              data-testid="card-filter-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {marketStats.totalMarkets}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Total Markets</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gainers */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                filter === 'gainers' 
                  ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/30 dark:to-green-700/30 border-green-300 dark:border-green-600 ring-2 ring-green-400' 
                  : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800'
              }`}
              onClick={() => setFilter('gainers')}
              data-testid="card-filter-gainers"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {marketStats.gainers}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">Gainers</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Losers */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                filter === 'losers' 
                  ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800/30 dark:to-red-700/30 border-red-300 dark:border-red-600 ring-2 ring-red-400' 
                  : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
              }`}
              onClick={() => setFilter('losers')}
              data-testid="card-filter-losers"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {marketStats.losers}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">Losers</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Volume - Not clickable for filtering */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Volume2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      ${formatNumber(marketStats.totalVolume)}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">24h Volume</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Top Gainer */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Top Gainer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{marketStats.topGainer.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      ${parseFloat(marketStats.topGainer.price).toFixed(4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="bg-green-500 text-white">
                      {formatChange(marketStats.topGainer.change24h || '0')}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Vol: {formatNumber(parseFloat(marketStats.topGainer.volume24h || '0'))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Loser */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-500" />
                  Top Loser
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{marketStats.topLoser.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      ${parseFloat(marketStats.topLoser.price).toFixed(4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">
                      {formatChange(marketStats.topLoser.change24h || '0')}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Vol: {formatNumber(parseFloat(marketStats.topLoser.volume24h || '0'))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Market Data */}
      <SimpleTable 
        data={filteredAndSortedData} 
        isLoading={isLoading}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRiskAnalysis={setSelectedRiskPair}
      />

      {/* Dynamic Risk Meter Overlay */}
      <DynamicRiskMeter
        pair={selectedRiskPair || ''}
        isOpen={!!selectedRiskPair}
        onClose={() => setSelectedRiskPair(null)}
        onNavigateToTrade={() => {
          setLocation('/trade');
          setSelectedRiskPair(null);
        }}
        onNavigateToAnalyzer={() => {
          setLocation(`/analyzer?pair=${selectedRiskPair}&autoFill=true`);
          setSelectedRiskPair(null);
        }}
      />
    </div>
  );
}