import { useQuery } from '@tanstack/react-query';

interface CandlestickData {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  quoteVolume: string;
}

interface UseCandlestickDataOptions {
  symbol: string;
  granularity?: string;
  limit?: number;
  enabled?: boolean;
}

export function useCandlestickData({ 
  symbol, 
  granularity = '5m', 
  limit = 100,
  enabled = true 
}: UseCandlestickDataOptions) {
  return useQuery<CandlestickData[]>({
    queryKey: ['candlestick', symbol, granularity, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/candlestick/${symbol}?granularity=${granularity}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch candlestick data');
      }
      
      return response.json();
    },
    enabled: enabled && !!symbol,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });
}