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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bot,
  Play,
  Zap
} from 'lucide-react';

export default function FolderDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [newPairInput, setNewPairInput] = useState('');
  const [pairSuggestions, setPairSuggestions] = useState<string[]>([]);
  const [showBulkBotDialog, setShowBulkBotDialog] = useState(false);
  const [showAddPairsSection, setShowAddPairsSection] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [capital, setCapital] = useState('100');
  const [leverage, setLeverage] = useState('1');
  
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

  // Fetch bot strategies for bulk deployment
  const { data: strategies = [] } = useQuery({
    queryKey: ['/api/bot-strategies'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/bot-strategies');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch active executions to check for existing folder bots
  const { data: allExecutions = [] } = useQuery({
    queryKey: ['/api/bot-executions']
  });

  // Filter only active executions
  const activeExecutions = allExecutions.filter((execution: any) => execution.status === 'active');

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

  // Bulk bot deployment mutation
  const bulkBotMutation = useMutation({
    mutationFn: async ({ strategyId, pairs, capital, leverage }: { 
      strategyId: string; 
      pairs: string[]; 
      capital: string; 
      leverage: string; 
    }) => {
      const results = [];
      for (const pair of pairs) {
        try {
          const response = await fetch('/api/bot-executions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'default-user',
              strategyId,
              tradingPair: pair,
              capital: capital, // Keep as string to match schema
              leverage,
              status: 'active',
              deploymentType: 'folder_bulk',
              folderId: folderId,
              folderName: folder.name
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            results.push({ pair, success: true, data: result });
          } else {
            results.push({ pair, success: false, error: 'Failed to deploy' });
          }
        } catch (error: any) {
          results.push({ pair, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      const successCount = results.filter(r => r.success).length;
      const failedResults = results.filter(r => !r.success);
      console.log(`Successfully deployed bots for ${successCount}/${results.length} pairs`);
      if (failedResults.length > 0) {
        console.log('Failed deployments:', failedResults);
      }
      setShowBulkBotDialog(false);
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
  }, [newPairInput, marketData.length, folder?.tradingPairs?.length]);

  const handleAddPair = async (symbol: string) => {
    try {
      await addPairMutation.mutateAsync(symbol.toUpperCase());
      setNewPairInput('');
      setPairSuggestions([]);
    } catch (error) {
      console.error('Failed to add pair:', error);
    }
  };

  const handleBulkBotDeployment = () => {
    if (!selectedStrategy || !folder?.tradingPairs?.length) return;
    
    // Check if this folder already has active bots running
    const folderActiveExecutions = (activeExecutions || []).filter((execution: any) => 
      execution.folderName === folder.name && execution.status === 'active'
    );
    
    if (folderActiveExecutions.length > 0) {
      alert(`Folder "${folder.name}" already has ${folderActiveExecutions.length} active bots running. Please stop the existing bots before deploying new ones.`);
      return;
    }
    
    console.log('Starting bulk bot deployment:', {
      strategyId: selectedStrategy,
      pairs: folder.tradingPairs,
      capital,
      leverage,
      totalPairs: folder.tradingPairs.length
    });
    
    bulkBotMutation.mutate({
      strategyId: selectedStrategy,
      pairs: folder.tradingPairs,
      capital,
      leverage
    });
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
        
        {/* Quick Actions */}
        {folder.tradingPairs && folder.tradingPairs.length > 0 && (
          <div className="mt-4 ml-12">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowBulkBotDialog(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={strategies.length === 0}
              title={strategies.length === 0 ? "Create a bot strategy first in the Bot page" : ""}
            >
              <Bot className="h-4 w-4 mr-2" />
              {strategies.length === 0 ? "No Strategies Available" : `Deploy Bots to All Pairs (${folder.tradingPairs.length})`}
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Add Pair Button */}
        {!showBulkBotDialog && !showAddPairsSection && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={() => setShowAddPairsSection(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Trading Pairs
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Pair Section - Hidden when bulk bot dialog is open */}
        {!showBulkBotDialog && showAddPairsSection && (
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

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={() => newPairInput.trim() && handleAddPair(newPairInput.trim())}
                  disabled={!newPairInput.trim() || addPairMutation.isPending}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {newPairInput.trim().toUpperCase() || 'Pair'}
                </Button>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewPairInput('');
                    setPairSuggestions([]);
                    setShowAddPairsSection(false);
                  }}
                  className="px-4 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 whitespace-nowrap"
                  data-testid="button-done-adding-pairs"
                  type="button"
                >
                  Done
                </Button>
              </div>
              

            </div>
          </CardContent>
        </Card>
        )}

        {/* Trading Pairs List - Hidden when bulk bot dialog is open */}
        {!showBulkBotDialog && (
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
        )}
      </div>

      {/* Bulk Bot Deployment Dialog */}
      <Dialog open={showBulkBotDialog} onOpenChange={setShowBulkBotDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Deploy Bots to All Pairs
            </DialogTitle>
            <DialogDescription>
              Deploy trading bots to all {folder.tradingPairs?.length || 0} trading pairs in this folder using the same strategy and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
{strategies.length === 0 ? (
              /* No Strategies Available */
              <div className="text-center py-8 space-y-4">
                <Bot className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Trading Strategies</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to create a trading strategy before deploying bots to multiple pairs.
                  </p>
                  <Button 
                    onClick={() => {
                      setShowBulkBotDialog(false);
                      setLocation('/bot');
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Strategy
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Strategy Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trading Strategy</label>
                  <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((strategy: any) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant={strategy.positionDirection === 'long' ? 'default' : 'destructive'} className="text-xs">
                              {strategy.positionDirection?.toUpperCase()}
                            </Badge>
                            <span>{strategy.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

            {/* Capital per pair */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Capital per Pair (USDT)</label>
                <Input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="100"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Leverage</label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10, 20, 50, 100].map((lev) => (
                      <SelectItem key={lev} value={lev.toString()}>
                        {lev}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Total investment calculation */}
            <div className="bg-accent/20 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Total Investment:</span>
                <span className="font-medium">
                  {((parseFloat(capital) || 0) * (folder.tradingPairs?.length || 0)).toLocaleString()} USDT
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span>Total Pairs:</span>
                <span className="font-medium">{folder.tradingPairs?.length || 0}</span>
              </div>
            </div>

            {/* Deployment preview */}
            {folder.tradingPairs && folder.tradingPairs.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Pairs to Deploy:</label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 bg-accent/10">
                  <div className="flex flex-wrap gap-1">
                    {folder.tradingPairs.map((pair: string) => (
                      <Badge key={pair} variant="outline" className="text-xs">
                        {pair}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>

{strategies.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkBotDialog(false)}
                disabled={bulkBotMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkBotDeployment}
                disabled={!selectedStrategy || !capital || bulkBotMutation.isPending || !folder.tradingPairs?.length}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {bulkBotMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deploying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Deploy {folder.tradingPairs?.length || 0} Bots
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}