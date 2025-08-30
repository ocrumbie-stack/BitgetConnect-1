import { useQuery } from '@tanstack/react-query';
import type { FuturesData } from '@shared/schema';

export function useBitgetData() {
  return useQuery<FuturesData[]>({
    queryKey: ['/api/futures'],
    refetchInterval: 30000, // Reduced frequency: refetch every 30 seconds
    staleTime: 25000, // Keep data fresh for 25 seconds
    refetchOnWindowFocus: false, // Disable refetch on focus to reduce requests
    retry: 2,
  });
}

export function useAccountData(userId: string) {
  return useQuery({
    queryKey: ['/api/account', userId],
    refetchInterval: 60000, // Reduced frequency: refetch every 60 seconds
    staleTime: 45000, // Keep data fresh for 45 seconds
    enabled: !!userId, // Only run query if userId is provided
    refetchOnWindowFocus: false, // Disable refetch on focus
  });
}

export function useApiStatus() {
  return useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 10000, // Check status every 10 seconds
  });
}
