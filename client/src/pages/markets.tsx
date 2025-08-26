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
  const [isScreenersCollapsed, setIsScreenersCollapsed] = useState(true); // Start collapsed by default

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
            <h1 className="text-lg font-semibold">Markets</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/folders')}
                className="flex items-center gap-1.5 text-xs"
                data-testid="button-folders"
              >
                <Folder className="h-3 w-3" />
                Folders
              </Button>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">Live</span>
              </div>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="screener" className="flex items-center gap-1.5 text-xs">
                <BarChart3 className="h-3 w-3" />
                Screener
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="flex items-center gap-1.5 text-xs">
                <Brain className="h-3 w-3" />
                AI Opportunities
              </TabsTrigger>
            </TabsList>

            {/* Screener Tab Content */}
            <TabsContent value="screener" className="space-y-3 mt-3">
              <div className="px-4 space-y-3">
                {/* Search Functionality */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                    data-testid="input-search-markets"
                  />
                </div>

                {/* Screener Filter Selection */}
                {userScreeners.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Apply Filter:</label>
                    <Select value={selectedScreener || 'none'} onValueChange={handleScreenerChange}>
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Select screener..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                            <span className="text-xs">Show All</span>
                          </div>
                        </SelectItem>
                        {userScreeners.map((screener: any) => (
                          <SelectItem key={screener.id} value={screener.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                              <span className="text-xs">{screener.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Screener Management */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setIsScreenersCollapsed(!isScreenersCollapsed)}
                    className="flex items-center gap-1.5 text-sm font-medium p-0 h-auto hover:bg-transparent"
                  >
                    <span>Manage Screeners</span>
                    {isScreenersCollapsed ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronUp className="h-3 w-3" />
                    )}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchScreeners()}
                      className="h-7 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => setLocation('/create-screener')}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      data-testid="button-create-screener"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New
                    </Button>
                  </div>
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