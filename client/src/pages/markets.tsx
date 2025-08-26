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
import { Search, TrendingUp, TrendingDown, Filter, ChevronDown, Plus, Edit, Trash2, MoreVertical, Folder, Star, BarChart3, Volume2, DollarSign, Activity, Eye, Brain, Zap, Target, AlertTriangle, ChevronUp, RefreshCw } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers' | 'high-volume'>('all');
  const [selectedScreener, setSelectedScreener] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRiskPair, setSelectedRiskPair] = useState<string | null>(null);
  
  // AI Opportunities state
  const [activeTab, setActiveTab] = useState('screener');
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set(['momentum']));
  const [showAllOpportunities, setShowAllOpportunities] = useState<{ [key: string]: boolean }>({});


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
      } else if (filter === 'high-volume') {
        return parseFloat(item.volume24h || '0') > 5000000; // High volume threshold
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
                      setFilter('high-volume');
                      setSearchQuery('');
                      setSelectedScreener('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Volume2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-purple-700 dark:text-purple-300" data-testid="high-volume">
                            {isLoading ? '...' : marketStats?.highVolume || 0}
                          </div>
                          <div className="text-sm text-purple-600 dark:text-purple-400">High Volume</div>
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
                      <SelectValue placeholder="Select screener filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm">Show All Markets</span>
                        </div>
                      </SelectItem>
                      {userScreeners.map((screener: any) => (
                        <SelectItem key={screener.id} value={screener.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm">{screener.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditScreener(screener.id);
                                }}
                                title="Edit screener"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm" 
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteScreener(screener.id);
                                }}
                                title="Delete screener"
                              >
                                <Trash2 className="h-3 w-3" />
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
                {/* AI Opportunities Grid */}
                <div className="grid gap-4">
                  {/* Momentum Trading */}
                  <Card className="border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg">Momentum Trading</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Strong directional moves with volume</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          1-4 Hours
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const momentumOpportunities = data?.filter((coin: any) => {
                          const change24h = parseFloat(coin.change24h || '0');
                          const volume24h = parseFloat(coin.volume24h || '0');
                          return Math.abs(change24h) >= 0.08 && volume24h >= 10000000; // 8%+ move with good volume
                        }).slice(0, 3) || [];

                        return momentumOpportunities.length > 0 ? (
                          <div className="space-y-3">
                            {momentumOpportunities.map((coin: any, index: number) => (
                              <div 
                                key={coin.symbol}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => setLocation(`/trade?pair=${coin.symbol}`)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-base">{coin.symbol}</div>
                                    <div className="text-sm text-muted-foreground">Strong momentum signal</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${parseFloat(coin.change24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(coin.change24h) >= 0 ? '+' : ''}{parseFloat(coin.change24h).toFixed(2)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">AI Score: {Math.min(95, 60 + Math.abs(parseFloat(coin.change24h)) * 2).toFixed(0)}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">No strong momentum signals detected</div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Breakout Trading */}
                  <Card className="border-2 border-green-500 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                          <div>
                            <CardTitle className="text-lg">Breakout Trading</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Volume spikes with price movement</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          30Min-2H
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const breakoutOpportunities = data?.filter((coin: any) => {
                          const change24h = parseFloat(coin.change24h || '0');
                          const volume24h = parseFloat(coin.volume24h || '0');
                          return Math.abs(change24h) >= 0.05 && volume24h >= 20000000; // 5%+ move with high volume
                        }).slice(0, 3) || [];

                        return breakoutOpportunities.length > 0 ? (
                          <div className="space-y-3">
                            {breakoutOpportunities.map((coin: any, index: number) => (
                              <div 
                                key={coin.symbol}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => setLocation(`/trade?pair=${coin.symbol}`)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-base">{coin.symbol}</div>
                                    <div className="text-sm text-muted-foreground">Volume breakout detected</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${parseFloat(coin.change24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(coin.change24h) >= 0 ? '+' : ''}{parseFloat(coin.change24h).toFixed(2)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">AI Score: {Math.min(90, 55 + Math.abs(parseFloat(coin.change24h)) * 3).toFixed(0)}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">No breakout signals detected</div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Scalping Opportunities */}
                  <Card className="border-2 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-orange-600" />
                          <div>
                            <CardTitle className="text-lg">Scalping</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Quick profits from micro movements</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          1-5 Minutes
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const scalpingOpportunities = data?.filter((coin: any) => {
                          const volume24h = parseFloat(coin.volume24h || '0');
                          const price = parseFloat(coin.price || '0');
                          return volume24h >= 50000000 && price > 0.01; // High volume for liquidity
                        }).slice(0, 3) || [];

                        return scalpingOpportunities.length > 0 ? (
                          <div className="space-y-3">
                            {scalpingOpportunities.map((coin: any, index: number) => (
                              <div 
                                key={coin.symbol}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => setLocation(`/trade?pair=${coin.symbol}`)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-base">{coin.symbol}</div>
                                    <div className="text-sm text-muted-foreground">High liquidity scalping</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-orange-600">
                                    ${parseFloat(coin.price).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">AI Score: {Math.min(85, 70 + Math.log10(parseFloat(coin.volume24h) / 1000000) * 5).toFixed(0)}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">No scalping opportunities detected</div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
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