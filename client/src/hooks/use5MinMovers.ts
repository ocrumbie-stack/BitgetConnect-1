import { useQuery } from '@tanstack/react-query';

export interface FiveMinMover {
  symbol: string;
  price: string;
  change5m: string;
  volume24h: string;
  timestamp: number;
}

export interface FiveMinMoversResponse {
  topGainer: FiveMinMover | null;
  topLoser: FiveMinMover | null;
  allMovers: FiveMinMover[];
}

export function use5MinMovers() {
  return useQuery<FiveMinMoversResponse>({
    queryKey: ['/api/futures/5m-movers'],
    refetchInterval: 60000, // Refetch every 60 seconds (data only updates every 5 minutes)
    staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
  });
}