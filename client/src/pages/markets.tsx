import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useState } from 'react';
import { DynamicRiskMeter } from '@/components/DynamicRiskMeter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, Filter, ChevronDown, Plus, Edit, Trash2, MoreVertical, Folder, Star, BarChart3, Volume2, DollarSign, Activity, Eye } from 'lucide-react';


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
        </div>
      </div>

      {/* Market Overview Cards */}
      {marketStats && !isLoading && (
        <div className="p-4">
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
                      {formatChange(marketStats.topGainer.change24h)}
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
                      {formatChange(marketStats.topLoser.change24h)}
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
      {selectedRiskPair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full">
            <DynamicRiskMeter
              symbol={selectedRiskPair}
              price={data?.find(p => p.symbol === selectedRiskPair)?.price || '0'}
              change24h={data?.find(p => p.symbol === selectedRiskPair)?.change24h || '0'}
              volume24h={data?.find(p => p.symbol === selectedRiskPair)?.volume24h || '0'}
              onClose={() => setSelectedRiskPair(null)}
              className="max-h-[90vh] overflow-y-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}