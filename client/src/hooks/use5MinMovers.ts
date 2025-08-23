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
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });
}