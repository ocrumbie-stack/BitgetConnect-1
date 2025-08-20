import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, TrendingDown, Filter } from 'lucide-react';

export function Markets() {
  const { data, isLoading } = useBitgetData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'price'>('change');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');

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

          {/* Sort Controls */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'change' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('change')}
              data-testid="button-sort-change"
              className="flex items-center gap-1"
            >
              {sortBy === 'change' && sortDirection === 'desc' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              Change
            </Button>
            <Button
              variant={sortBy === 'volume' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('volume')}
              data-testid="button-sort-volume"
            >
              Volume
            </Button>
            <Button
              variant={sortBy === 'price' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('price')}
              data-testid="button-sort-price"
            >
              Price
            </Button>
          </div>
        </div>
      </div>

      {/* Market Data */}
      <SimpleTable data={filteredAndSortedData} isLoading={isLoading} />

      {/* Footer Stats */}
      {data && data.length > 0 && (
        <div className="sticky bottom-16 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Showing: {filteredAndSortedData.length} pairs</span>
            <span>Total: {data.length} markets</span>
          </div>
        </div>
      )}
    </div>
  );
}