import { FuturesData } from '@shared/schema';
import { useLocation } from 'wouter';
import { ChevronUp, ChevronDown, Plus, FolderPlus, Shield } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SimpleTableProps {
  data: FuturesData[];
  isLoading: boolean;
  sortBy?: 'change' | 'volume' | 'price';
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: 'change' | 'volume' | 'price') => void;
  onRiskAnalysis?: (symbol: string) => void;
}

export function SimpleTable({ data, isLoading, sortBy, sortDirection, onSort, onRiskAnalysis }: SimpleTableProps) {
  const [, setLocation] = useLocation();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [showAddToFolderDialog, setShowAddToFolderDialog] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Fetch user folders
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/folders', 'user1'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/screeners/user1');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Add to folder mutation
  const addToFolderMutation = useMutation({
    mutationFn: async ({ folderId, symbol }: { folderId: string; symbol: string }) => {
      // Get current folder data
      const folder = folders.find((f: any) => f.id === folderId);
      if (!folder) throw new Error('Folder not found');
      
      const currentPairs = folder.tradingPairs || [];
      if (currentPairs.includes(symbol)) {
        throw new Error('Pair already in folder');
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
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'user1'] });
      setShowAddToFolderDialog(false);
    },
  });

  const handleLongPressStart = (symbol: string) => {
    const timer = setTimeout(() => {
      setSelectedSymbol(symbol);
      setShowAddToFolderDialog(true);
      // Haptic feedback for mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleAddToFolder = (folderId: string) => {
    if (selectedSymbol) {
      addToFolderMutation.mutate({ folderId, symbol: selectedSymbol });
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          Loading market data...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">No data available</div>
          <div className="text-sm">Market data will appear here when available</div>
        </div>
      </div>
    );
  }

  const formatVolume = (volume: string | null) => {
    if (!volume) return '0';
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
    if (num >= 1e6) return `${(num / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    if (num >= 1e3) return `${(num / 1e3).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    if (num >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (num >= 0.01) return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
  };

  const formatChange = (change: string | null) => {
    if (!change) return '0.00%';
    const num = parseFloat(change) * 100;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getChangeColor = (change: string | null) => {
    if (!change) return 'text-muted-foreground';
    const num = parseFloat(change);
    return num >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeBackground = (change: string | null) => {
    if (!change) return 'bg-muted';
    const num = parseFloat(change);
    return num >= 0 ? 'bg-green-500/90' : 'bg-red-500/90';
  };

  return (
    <div className="bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 text-sm font-medium text-muted-foreground border-b border-border">
        <div 
          className={`flex items-center gap-2 min-w-0 flex-1 ${onSort ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => onSort?.('volume')}
          data-testid="header-coin-volume"
        >
          <span className="truncate">Coin/Volume</span>
          {onSort && sortBy === 'volume' && (
            sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
        <div 
          className={`flex items-center justify-center gap-2 w-20 ${onSort ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => onSort?.('price')}
          data-testid="header-price"
        >
          <span>Price</span>
          {onSort && sortBy === 'price' && (
            sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
        <div 
          className={`flex items-center justify-end gap-2 w-24 ${onSort ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => onSort?.('change')}
          data-testid="header-change"
        >
          <span>Change</span>
          {onSort && sortBy === 'change' && (
            sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-border">
        {data.map((item) => (
          <ContextMenu key={item.symbol}>
            <ContextMenuTrigger asChild>
              <div 
                className="flex items-center justify-between px-4 py-2 hover:bg-accent/50 transition-colors cursor-pointer min-w-0" 
                data-testid={`row-${item.symbol}`}
                onClick={() => setLocation(`/charts?pair=${item.symbol}`)}
                onTouchStart={() => handleLongPressStart(item.symbol)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(item.symbol)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
              >
                {/* Coin/Volume Column */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground text-base truncate" data-testid={`symbol-${item.symbol}`}>
                    {item.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground truncate" data-testid={`volume-${item.symbol}`}>
                    {formatVolume(item.volume24h)}
                  </div>
                </div>

                {/* Price Column */}
                <div className="w-20 text-center">
                  <div className="font-medium text-foreground text-sm" data-testid={`price-${item.symbol}`}>
                    {formatPrice(item.price)}
                  </div>
                </div>

                {/* Change Column */}
                <div className="w-24 flex items-center justify-end gap-1">
                  <div 
                    className={`inline-block px-2 py-1 rounded text-sm font-medium text-white ${getChangeBackground(item.change24h)}`}
                    data-testid={`change-${item.symbol}`}
                  >
                    {formatChange(item.change24h)}
                  </div>
                  {onRiskAnalysis && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRiskAnalysis(item.symbol);
                      }}
                      title="Risk Analysis"
                    >
                      <Shield className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/charts?pair=${item.symbol}`);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Trade {item.symbol}
              </ContextMenuItem>
              
              <ContextMenuSeparator />
              
              {folders.length > 0 ? (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add to Folder
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {folders.map((folder: any) => (
                      <ContextMenuItem
                        key={folder.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToFolder(folder.id);
                        }}
                        disabled={folder.tradingPairs?.includes(item.symbol)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: folder.color || '#3b82f6' }}
                          />
                          <span>{folder.name}</span>
                          {folder.tradingPairs?.includes(item.symbol) && (
                            <Badge variant="secondary" className="text-xs">Added</Badge>
                          )}
                        </div>
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ) : (
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSymbol(item.symbol);
                    setShowAddToFolderDialog(true);
                  }}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add to Folder
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      {/* Add to Folder Dialog */}
      <Dialog open={showAddToFolderDialog} onOpenChange={setShowAddToFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selectedSymbol} to Folder</DialogTitle>
            <DialogDescription>
              Choose a folder to add {selectedSymbol} to, or create a new one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {folders.length === 0 ? (
              <div className="text-center py-8">
                <FolderPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No folders yet</p>
                <Button
                  onClick={() => {
                    setShowAddToFolderDialog(false);
                    setLocation('/folders');
                  }}
                >
                  Create First Folder
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {folders.map((folder: any) => {
                    const isAlreadyAdded = folder.tradingPairs?.includes(selectedSymbol);
                    return (
                      <div
                        key={folder.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isAlreadyAdded 
                            ? 'bg-muted border-muted-foreground/20 opacity-50 cursor-not-allowed' 
                            : 'hover:bg-accent border-border'
                        }`}
                        onClick={() => !isAlreadyAdded && handleAddToFolder(folder.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: folder.color || '#3b82f6' }}
                            />
                            <div>
                              <div className="font-medium">{folder.name}</div>
                              {folder.description && (
                                <div className="text-sm text-muted-foreground">
                                  {folder.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {folder.tradingPairs?.length || 0} pairs
                            </Badge>
                            {isAlreadyAdded && (
                              <Badge variant="secondary">Already added</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddToFolderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowAddToFolderDialog(false);
                setLocation('/folders');
              }}
            >
              Manage Folders
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}