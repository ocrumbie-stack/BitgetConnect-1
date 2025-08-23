import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { use5MinMovers } from '@/hooks/use5MinMovers';
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
  const { data: fiveMinData, isLoading: fiveMinLoading } = use5MinMovers();
  
  // Screener state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'price'>('change');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [selectedScreener, setSelectedScreener] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRiskPair, setSelectedRiskPair] = useState<string | null>(null);
  
  // AI Opportunities state
  const [activeTab, setActiveTab] = useState('screener');
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set(['momentum']));
  const [showAllOpportunities, setShowAllOpportunities] = useState<{ [key: string]: boolean }>({});
  const [isScreenersCollapsed, setIsScreenersCollapsed] = useState(false);

  // Fetch user screeners
  const { data: userScreeners = [] } = useQuery<any[]>({
    queryKey: ['/api/screeners'],
    enabled: true,
  });

  // Processing data similar to original Markets page
  const filteredAndSortedData = data ? data
    .filter(item => {
      const searchMatch = !searchQuery || 
        item.symbol?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!searchMatch) return false;
      
      if (filter === 'gainers') {
        return parseFloat(item.change24h || '0') > 0;
      } else if (filter === 'losers') {
        return parseFloat(item.change24h || '0') < 0;
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

  const selectedScreenerObj = userScreeners.find((s: any) => s.id === selectedScreener);

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
    setSelectedScreener(value);
  };

  const handleEditScreener = (screenerId: string) => {
    setLocation(`/screener-builder?edit=${screenerId}`);
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

  // AI Opportunities Logic
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
              {/* Search Functionality */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-markets"
                  />
                </div>
              </div>

              {/* Screener Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setIsScreenersCollapsed(!isScreenersCollapsed)}
                    className="flex items-center gap-2 text-lg font-semibold p-0 h-auto hover:bg-transparent"
                  >
                    <h3 className="text-lg font-semibold">Market Screeners</h3>
                    {isScreenersCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => setLocation('/create-screener')}
                    className="flex items-center gap-2"
                    data-testid="button-create-screener"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Screener
                  </Button>
                </div>

                {/* Collapsible Screeners Content */}
                {!isScreenersCollapsed && (
                  <>
                    {/* Existing Screeners List */}
                    {userScreeners.length > 0 ? (
                      <div className="grid gap-3">
                        {userScreeners.map((screener: { id: string; name: string; userId: string }) => (
                          <Card key={screener.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{screener.name}</h4>
                                  <p className="text-sm text-muted-foreground">Custom screener</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditScreener(screener.id)}
                                  data-testid={`edit-screener-${screener.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`screener-menu-${screener.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleEditScreener(screener.id)}
                                      data-testid={`edit-screener-menu-${screener.id}`}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Screener
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteScreener(screener.id)}
                                      className="text-red-600"
                                      data-testid={`delete-screener-${screener.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">No Screeners Yet</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Create your first market screener to filter and analyze trading pairs
                            </p>
                            <Button
                              onClick={() => setLocation('/create-screener')}
                              className="flex items-center gap-2"
                              data-testid="button-create-first-screener"
                            >
                              <Plus className="h-4 w-4" />
                              Create Your First Screener
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>



              {/* Market Overview Cards */}
              {marketStats && !isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {/* Total Markets */}
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                      filter === 'all' 
                        ? 'ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-950'
                    }`}
                    onClick={() => setFilter('all')}
                    data-testid="card-total-markets"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Markets</p>
                          <p className="text-2xl font-bold">{marketStats.total}</p>
                        </div>
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gainers */}
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                      filter === 'gainers' 
                        ? 'ring-2 ring-green-500 bg-green-50/30 dark:bg-green-950/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-950'
                    }`}
                    onClick={() => setFilter('gainers')}
                    data-testid="card-gainers"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Gainers</p>
                          <p className="text-2xl font-bold text-green-600">{marketStats.gainers}</p>
                        </div>
                        <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Losers */}
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                      filter === 'losers' 
                        ? 'ring-2 ring-red-500 bg-red-50/30 dark:bg-red-950/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-950'
                    }`}
                    onClick={() => setFilter('losers')}
                    data-testid="card-losers"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Losers</p>
                          <p className="text-2xl font-bold text-red-600">{marketStats.losers}</p>
                        </div>
                        <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
                          <TrendingDown className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* High Volume */}
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 hover:bg-gray-50 dark:hover:bg-gray-950"
                    data-testid="card-high-volume"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">High Volume</p>
                          <p className="text-2xl font-bold text-purple-600">{marketStats.highVolume}</p>
                        </div>
                        <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <Volume2 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Top Movers Cards - Real 5-minute data from Bitget API */}
              <div className="grid grid-cols-2 gap-3 mb-4 max-w-md mx-auto">
                {/* Top Gainer (5M) */}
                {fiveMinLoading ? (
                  <Card className="p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 mb-1">Top Gainer (5M)</p>
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-xs text-gray-400 ml-2">Loading...</span>
                      </div>
                    </div>
                  </Card>
                ) : fiveMinData?.topGainer ? (
                  <Card 
                    className="p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/trade?pair=${fiveMinData.topGainer!.symbol}`)}
                  >
                    <div className="text-center">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Top Gainer (5M)</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">{fiveMinData.topGainer.symbol}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-sm font-bold text-green-600">
                          +{(parseFloat(fiveMinData.topGainer.change5m) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 mb-1">Top Gainer (5M)</p>
                      <p className="text-sm text-gray-400">No data available</p>
                    </div>
                  </Card>
                )}

                {/* Top Loser (5M) */}
                {fiveMinLoading ? (
                  <Card className="p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 mb-1">Top Loser (5M)</p>
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-xs text-gray-400 ml-2">Loading...</span>
                      </div>
                    </div>
                  </Card>
                ) : fiveMinData?.topLoser ? (
                  <Card 
                    className="p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/trade?pair=${fiveMinData.topLoser!.symbol}`)}
                  >
                    <div className="text-center">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Top Loser (5M)</p>
                      <p className="text-sm font-bold text-red-800 dark:text-red-200">{fiveMinData.topLoser.symbol}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-sm font-bold text-red-600">
                          {(parseFloat(fiveMinData.topLoser.change5m) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 mb-1">Top Loser (5M)</p>
                      <p className="text-sm text-gray-400">No data available</p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Market Table */}
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <SimpleTable 
                  data={filteredAndSortedData}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onRiskAnalysis={(pair) => setSelectedRiskPair(pair)}
                />
              )}
            </TabsContent>
            
            {/* AI Opportunities Tab Content */}
            <TabsContent value="opportunities" className="space-y-4 mt-4">
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
                                  onClick={() => setLocation(`/trade?pair=${opp.symbol}`)}
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

      {/* Risk Analysis Modal */}
      {selectedRiskPair && (
        <DynamicRiskMeter
          pair={selectedRiskPair}
          onClose={() => setSelectedRiskPair(null)}
        />
      )}
    </div>
  );
}