import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useState } from 'react';
import DynamicRiskMeter from '@/components/DynamicRiskMeter';
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
        const change = parseFloat(item.change24h || '0') * 100;
        
        if (criteria.minPrice && price < criteria.minPrice) return false;
        if (criteria.maxPrice && price > criteria.maxPrice) return false;
        if (criteria.minVolume && volume < criteria.minVolume) return false;
        if (criteria.maxVolume && volume > criteria.maxVolume) return false;
        if (criteria.minVolumeUsd && (volume * price) < criteria.minVolumeUsd) return false;
        if (criteria.maxVolumeUsd && (volume * price) > criteria.maxVolumeUsd) return false;
        if (criteria.minChange && change < criteria.minChange) return false;
        if (criteria.maxChange && change > criteria.maxChange) return false;
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
          
          {/* Market Screener Only - Original Simple Structure */}
          <div className="space-y-4">
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

            {/* Filters and Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedScreener} onValueChange={handleScreenerChange}>
                <SelectTrigger className="w-40" data-testid="screener-select">
                  <SelectValue placeholder="Screener" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  <SelectItem value="create-new">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Screener
                    </div>
                  </SelectItem>
                  {userScreeners.map((screener: { id: string; name: string; userId: string }) => (
                    <SelectItem key={screener.id} value={screener.id}>
                      {screener.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="gainers">Gainers</SelectItem>
                  <SelectItem value="losers">Losers</SelectItem>
                </SelectContent>
              </Select>

              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredAndSortedData.length} markets
            </div>

            {/* Market Table/Grid */}
            <SimpleTable
              data={filteredAndSortedData}
              onSort={handleSort}
              sortBy={sortBy}
              sortDirection={sortDirection}
              viewMode={viewMode}
              onPairClick={(symbol) => {
                setSelectedRiskPair(symbol);
              }}
            />
          </>
        )}
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