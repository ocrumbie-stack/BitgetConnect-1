import { useQuery } from '@tanstack/react-query';
import type { FuturesData } from '@shared/schema';

export function useBitgetData() {
  return useQuery<FuturesData[]>({
    queryKey: ['/api/futures'],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time data
    staleTime: 0, // Always fetch fresh data for trading
    refetchOnWindowFocus: true,
    retry: 3,
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
