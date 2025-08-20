import { SimpleTable } from '@/components/SimpleTable';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, TrendingDown, Filter, ChevronDown, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
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
  const [selectedScreener, setSelectedScreener] = useState<string>('all');
  
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
      setSelectedScreener('all');
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
            <Select value={selectedScreener} onValueChange={handleScreenerChange}>
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

      {/* Market Data */}
      <SimpleTable data={filteredAndSortedData} isLoading={isLoading} />


    </div>
  );
}