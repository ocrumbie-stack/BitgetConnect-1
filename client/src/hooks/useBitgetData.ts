import { useQuery } from '@tanstack/react-query';
import type { FuturesData } from '@shared/schema';

export function useBitgetData() {
  return useQuery<FuturesData[]>({
    queryKey: ['/api/futures'],
    refetchInterval: 5000, // Real-time: refetch every 5 seconds
    staleTime: 2000, // Keep data fresh for 2 seconds
    refetchOnWindowFocus: false, // Keep disabled to prevent navigation delays
    retry: 2,
  });
}

export function useAccountData(userId: string) {
  return useQuery({
    queryKey: ['/api/account', userId],
    refetchInterval: 10000, // Real-time: refetch every 10 seconds
    staleTime: 5000, // Keep data fresh for 5 seconds
    enabled: !!userId, // Only run query if userId is provided
    refetchOnWindowFocus: false, // Keep disabled to prevent navigation delays
  });
}

export function useApiStatus() {
  return useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 10000, // Check status every 10 seconds
  });
}
