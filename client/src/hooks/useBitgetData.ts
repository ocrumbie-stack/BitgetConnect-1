import { useQuery } from '@tanstack/react-query';
import type { FuturesData } from '@shared/schema';

export function useBitgetData() {
  return useQuery<FuturesData[]>({
    queryKey: ['/api/futures'],
    refetchInterval: 10000, // Refetch every 10 seconds as backup to WebSocket
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

export function useAccountData(userId: string) {
  return useQuery({
    queryKey: ['/api/account', userId],
    refetchInterval: 15000, // Refetch every 15 seconds
    enabled: !!userId, // Only run query if userId is provided
  });
}

export function useApiStatus() {
  return useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 10000, // Check status every 10 seconds
  });
}
