import { useQuery } from '@tanstack/react-query';

export interface MarketInsight {
  symbol: string;
  price: string;
  change24h: string;
  volume24h: string;
  type?: 'bullish' | 'bearish';
}

export interface MarketInsightsResponse {
  volumeSurge: MarketInsight[];
  highVolatility: MarketInsight[];
  breakouts: MarketInsight[];
  topGainer: MarketInsight | null;
  topLoser: MarketInsight | null;
  calculatedAt: string;
  totalPairs: number;
}

export function useMarketInsights() {
  return useQuery<MarketInsightsResponse>({
    queryKey: ['/api/futures/market-insights'],
    refetchInterval: 30000, // Refetch every 30 seconds (much faster than before)
    staleTime: 25000, // Consider data stale after 25 seconds
  });
}