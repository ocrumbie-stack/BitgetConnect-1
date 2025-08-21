import { FuturesData } from '@shared/schema';
import { useLocation } from 'wouter';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SimpleTableProps {
  data: FuturesData[];
  isLoading: boolean;
  sortBy?: 'change' | 'volume' | 'price';
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: 'change' | 'volume' | 'price') => void;
}

export function SimpleTable({ data, isLoading, sortBy, sortDirection, onSort }: SimpleTableProps) {
  const [, setLocation] = useLocation();
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
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.01) return num.toFixed(6);
    return num.toFixed(8);
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
    <div className="bg-background">
      {/* Header */}
      <div className="grid grid-cols-3 gap-4 p-4 text-sm font-medium text-muted-foreground border-b border-border">
        <div 
          className={`flex items-center gap-1 ${onSort ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => onSort?.('volume')}
          data-testid="header-coin-volume"
        >
          Coin/Volume
          {onSort && sortBy === 'volume' && (
            sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
        <div 
          className={`text-center flex items-center justify-center gap-1 ${onSort ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => onSort?.('price')}
          data-testid="header-price"
        >
          Price
          {onSort && sortBy === 'price' && (
            sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
        <div 
          className={`text-right flex items-center justify-end gap-1 ${onSort ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => onSort?.('change')}
          data-testid="header-change"
        >
          Change
          {onSort && sortBy === 'change' && (
            sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-border">
        {data.map((item) => (
          <div 
            key={item.symbol} 
            className="grid grid-cols-3 gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer" 
            data-testid={`row-${item.symbol}`}
            onClick={() => setLocation(`/trade?pair=${item.symbol}`)}
          >
            {/* Coin/Volume Column */}
            <div>
              <div className="font-semibold text-foreground text-base" data-testid={`symbol-${item.symbol}`}>
                {item.symbol}
              </div>
              <div className="text-sm text-muted-foreground" data-testid={`volume-${item.symbol}`}>
                {formatVolume(item.volume24h)}
              </div>
            </div>

            {/* Price Column */}
            <div className="text-center">
              <div className="font-medium text-foreground text-base" data-testid={`price-${item.symbol}`}>
                {formatPrice(item.price)}
              </div>
              <div className="text-sm text-muted-foreground">
                ${formatPrice(item.price)}
              </div>
            </div>

            {/* Change Column */}
            <div className="text-right">
              <div 
                className={`inline-block px-3 py-1 rounded-lg text-sm font-medium text-white ${getChangeBackground(item.change24h)}`}
                data-testid={`change-${item.symbol}`}
              >
                {formatChange(item.change24h)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}