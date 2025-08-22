import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';

export default function FolderDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [newPairInput, setNewPairInput] = useState('');
  const [pairSuggestions, setPairSuggestions] = useState<string[]>([]);
  
  const folderId = params.id as string;

  // Fetch folder details
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/folders', 'default-user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/screeners/default-user');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch market data for suggestions
  const { data: marketData = [] } = useQuery({
    queryKey: ['/api/futures'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/futures');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  const folder = folders.find((f: any) => f.id === folderId);

  // Add pair mutation
  const addPairMutation = useMutation({
    mutationFn: async (symbol: string) => {
      if (!folder) throw new Error('Folder not found');
      
      const currentPairs = folder.tradingPairs || [];
      if (currentPairs.includes(symbol)) {
        throw new Error('Pair already exists in folder');
      }
      
      const updatedPairs = [...currentPairs, symbol];
      
      const response = await fetch(`/api/screeners/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...folder,
          tradingPairs: updatedPairs
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update folder');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'default-user'] });
      setNewPairInput('');
      setPairSuggestions([]);
    },
  });

  // Remove pair mutation
  const removePairMutation = useMutation({
    mutationFn: async (symbol: string) => {
      if (!folder) throw new Error('Folder not found');
      
      const currentPairs = folder.tradingPairs || [];
      const updatedPairs = currentPairs.filter((pair: string) => pair !== symbol);
      
      const response = await fetch(`/api/screeners/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...folder,
          tradingPairs: updatedPairs
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update folder');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'default-user'] });
    },
  });

  // Handle input change and show suggestions
  useEffect(() => {
    if (newPairInput.length > 0) {
      const filteredSuggestions = marketData
        .filter((item: any) => 
          item.symbol.toLowerCase().includes(newPairInput.toLowerCase()) &&
          !folder?.tradingPairs?.includes(item.symbol)
        )
        .slice(0, 5)
        .map((item: any) => item.symbol);
      setPairSuggestions(filteredSuggestions);
    } else {
      setPairSuggestions([]);
    }
  }, [newPairInput, marketData, folder?.tradingPairs]);

  const handleAddPair = (symbol: string) => {
    addPairMutation.mutate(symbol.toUpperCase());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newPairInput.trim()) {
      handleAddPair(newPairInput.trim());
    }
  };

  if (!folder) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Folder not found</h2>
          <Button onClick={() => setLocation('/folders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Folders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/folders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: folder.color || '#3b82f6' }}
          />
          <h1 className="text-xl font-bold text-foreground">{folder.name}</h1>
        </div>
        {folder.description && (
          <p className="text-muted-foreground text-sm ml-12">{folder.description}</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Add Pair Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Trading Pairs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Type to search for trading pairs (e.g., BTCUSDT)"
                value={newPairInput}
                onChange={(e) => setNewPairInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                data-testid="input-add-pair"
              />
            </div>
            
            {pairSuggestions.length > 0 && (
              <div className="border rounded-lg">
                <div className="p-2 text-sm text-muted-foreground border-b">
                  Suggestions
                </div>
                {pairSuggestions.map((symbol) => {
                  const marketItem = marketData.find((item: any) => item.symbol === symbol);
                  return (
                    <div
                      key={symbol}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                      onClick={() => handleAddPair(symbol)}
                    >
                      <div>
                        <div className="font-medium">{symbol}</div>
                        {marketItem && (
                          <div className="text-sm text-muted-foreground">
                            ${parseFloat(marketItem.price).toFixed(4)}
                          </div>
                        )}
                      </div>
                      {marketItem && (
                        <div className={`text-sm ${
                          parseFloat(marketItem.change24h || '0') >= 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {parseFloat(marketItem.change24h || '0') >= 0 ? '+' : ''}
                          {(parseFloat(marketItem.change24h || '0') * 100).toFixed(2)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={() => newPairInput.trim() && handleAddPair(newPairInput.trim())}
              disabled={!newPairInput.trim() || addPairMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {newPairInput.trim().toUpperCase() || 'Pair'}
            </Button>
          </CardContent>
        </Card>

        {/* Trading Pairs List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Trading Pairs
              <Badge variant="outline">
                {folder.tradingPairs?.length || 0} pairs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!folder.tradingPairs || folder.tradingPairs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4" />
                <p className="mb-2">No trading pairs yet</p>
                <p className="text-sm">Add pairs using the search above or right-click pairs in the Markets page</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {folder.tradingPairs.map((symbol: string) => {
                    const marketItem = marketData.find((item: any) => item.symbol === symbol);
                    return (
                      <div
                        key={symbol}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => setLocation(`/trade?pair=${symbol}`)}
                        >
                          <div className="font-medium">{symbol}</div>
                          {marketItem && (
                            <div className="text-sm text-muted-foreground">
                              ${parseFloat(marketItem.price).toFixed(4)}
                            </div>
                          )}
                        </div>
                        
                        {marketItem && (
                          <div className="flex items-center gap-3">
                            <div className={`text-sm ${
                              parseFloat(marketItem.change24h || '0') >= 0 
                                ? 'text-green-400' 
                                : 'text-red-400'
                            }`}>
                              {parseFloat(marketItem.change24h || '0') >= 0 ? (
                                <TrendingUp className="h-4 w-4 inline mr-1" />
                              ) : (
                                <TrendingDown className="h-4 w-4 inline mr-1" />
                              )}
                              {parseFloat(marketItem.change24h || '0') >= 0 ? '+' : ''}
                              {(parseFloat(marketItem.change24h || '0') * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePairMutation.mutate(symbol)}
                          disabled={removePairMutation.isPending}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}