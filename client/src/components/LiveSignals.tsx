import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface SignalsData {
  rsi: { status: string; value: number };
  macd: { status: string; signal: string };
  volume: { status: string; trend: string };
  ema: { status: string; ema20: number; ema50: number };
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
        
        // Check if the response contains an error or invalid data structure
        if (data.message && data.message.includes('not configured')) {
          setSignalsData(null);
        } else if (data.rsi && data.macd && data.volume && data.ema) {
          setSignalsData(data);
        } else {
          setSignalsData(null);
        }
      } catch (error) {
        console.error('Failed to fetch signals:', error);
        setSignalsData(null);
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'oversold':
      case 'bullish':
      case 'rising':
        return 'bg-green-500';
      case 'overbought':
      case 'bearish':
      case 'falling':
        return 'bg-red-500';
      case 'neutral':
      case 'stable':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSignalText = (type: string, data: any): string => {
    switch (type) {
      case 'rsi':
        return `RSI ${data.status} (${data.value})`;
      case 'macd':
        return `MACD ${data.status}`;
      case 'volume':
        return `Volume ${data.trend}`;
      case 'ema':
        return `EMA ${data.status}`;
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="border-t border-border pt-2">
        <div className="text-xs font-medium mb-1 flex items-center gap-1">
          <Target className="h-3 w-3" />
          Signals
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!signalsData) {
    return (
      <div className="border-t border-border pt-2">
        <div className="text-xs font-medium mb-1 flex items-center gap-1">
          <Target className="h-3 w-3" />
          Signals
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span>No data available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-2">
      <div className="text-xs font-medium mb-1 flex items-center gap-1">
        <Target className="h-3 w-3" />
        Signals
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${getStatusColor(signalsData?.rsi?.status || 'neutral')} rounded-full`}></div>
          <span>{getSignalText('rsi', signalsData?.rsi || { status: 'neutral', value: 0 })}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${getStatusColor(signalsData?.macd?.status || 'neutral')} rounded-full`}></div>
          <span>{getSignalText('macd', signalsData?.macd || { status: 'neutral', signal: 'none' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${getStatusColor(signalsData?.volume?.status || 'neutral')} rounded-full`}></div>
          <span>{getSignalText('volume', signalsData?.volume || { status: 'neutral', trend: 'stable' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${getStatusColor(signalsData.ema?.status || 'neutral')} rounded-full`}></div>
          <span>{getSignalText('ema', signalsData?.ema || { status: 'neutral', ema20: 0, ema50: 0 })}</span>
        </div>
      </div>
    </div>
  );
}