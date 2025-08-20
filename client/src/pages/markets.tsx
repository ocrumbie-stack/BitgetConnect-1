import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, TrendingDown, Filter, ChevronDown, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Markets() {
  const { data, isLoading } = useBitgetData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'price'>('change');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [selectedScreener, setSelectedScreener] = useState<string>('all');
  
  // Mock screeners data - in real implementation, this would come from API
  const userScreeners = [
    { id: '1', name: 'High Volume Gainers', userId: 'user1' },
    { id: '2', name: 'Low Cap Gems', userId: 'user1' },
    { id: '3', name: 'Volatile Pairs', userId: 'user1' },
  ];

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
            <h1 className="text-xl font-bold">Markets</h1>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-muted-foreground">Live</span>
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

          {/* Filters */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant={filter === 'gainers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('gainers')}
              data-testid="button-filter-gainers"
              className="flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              Gainers
            </Button>
            <Button
              variant={filter === 'losers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('losers')}
              data-testid="button-filter-losers"
              className="flex items-center gap-1"
            >
              <TrendingDown className="h-3 w-3" />
              Losers
            </Button>
          </div>

          {/* Screener Dropdown */}
          <div className="w-48">
            <Select value={selectedScreener} onValueChange={setSelectedScreener}>
              <SelectTrigger className="w-full" data-testid="screener-select">
                <SelectValue placeholder="Select screener" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                <SelectItem value="create-new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Screener
                  </div>
                </SelectItem>
                {userScreeners.map((screener) => (
                  <SelectItem key={screener.id} value={screener.id}>
                    {screener.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Market Data */}
      <SimpleTable data={filteredAndSortedData} isLoading={isLoading} />


    </div>
  );
}