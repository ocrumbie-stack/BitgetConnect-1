import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SignalsData {
  rsi: { status: string; value: number };
  macd: { status: string; signal: string };
  volume: { status: string; trend: string };
}

interface LiveSignalsProps {
  symbol: string;
}

export function LiveSignals({ symbol }: LiveSignalsProps) {
  const [signalsData, setSignalsData] = useState<SignalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    const fetchSignals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/signals/${symbol}`);
        const data = await response.json();
        setSignalsData(data);
      } catch (error) {
        console.error('Failed to fetch signals:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchSignals();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const getStatusBadge = (type: string, data: any) => {
    let status = '';
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let text = '';
    
    switch (type) {
      case 'rsi':
        status = data.status;
        text = `RSI ${status.toUpperCase()} (${data.value})`;
        if (status === 'oversold') variant = 'default'; // Green
        else if (status === 'overbought') variant = 'destructive'; // Red
        else variant = 'secondary'; // Yellow/gray
        break;
      case 'macd':
        status = data.status;
        text = `MACD ${status.toUpperCase()}`;
        if (status === 'bullish') variant = 'default'; // Green
        else if (status === 'bearish') variant = 'destructive'; // Red
        else variant = 'secondary'; // Yellow/gray
        break;
      case 'volume':
        status = data.trend;
        text = `VOL ${status.toUpperCase()}`;
        if (status === 'rising') variant = 'default'; // Green
        else if (status === 'falling') variant = 'destructive'; // Red
        else variant = 'secondary'; // Yellow/gray
        break;
    }
    
    return { text, variant };
  };

  if (loading) {
    return (
      <div className="border-t border-border pt-3">
        <div className="text-xs font-medium mb-2 flex items-center gap-1">
          <Target className="h-3 w-3" />
          Signals
        </div>
        <div className="space-y-2">
          <Badge variant="outline" className="animate-pulse">
            Loading signals...
          </Badge>
        </div>
      </div>
    );
  }

  if (!signalsData) {
    return (
      <div className="border-t border-border pt-3">
        <div className="text-xs font-medium mb-2 flex items-center gap-1">
          <Target className="h-3 w-3" />
          Signals
        </div>
        <div className="space-y-2">
          <Badge variant="outline">No data available</Badge>
        </div>
      </div>
    );
  }

  const rsi = getStatusBadge('rsi', signalsData.rsi);
  const macd = getStatusBadge('macd', signalsData.macd);
  const volume = getStatusBadge('volume', signalsData.volume);

  return (
    <div className="border-t border-border pt-3">
      <div className="text-xs font-medium mb-2 flex items-center gap-1">
        <Target className="h-3 w-3" />
        Signals
      </div>
      <div className="space-y-2">
        <Badge variant={rsi.variant} className="text-xs font-medium">
          {rsi.text}
        </Badge>
        <Badge variant={macd.variant} className="text-xs font-medium">
          {macd.text}
        </Badge>
        <Badge variant={volume.variant} className="text-xs font-medium">
          {volume.text}
        </Badge>
      </div>
    </div>
  );
}