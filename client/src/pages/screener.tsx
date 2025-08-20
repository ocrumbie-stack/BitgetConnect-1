import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import FilterSidebar from "@/components/FilterSidebar";
import DataTable from "@/components/DataTable";
import AccountOverview from "@/components/AccountOverview";
import { useBitgetData } from "@/hooks/useBitgetData";
import { useWebSocket } from "@/hooks/useWebSocket";

export interface FilterOptions {
  priceChangeMin?: number;
  priceChangeMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  fundingRateMin?: number;
  fundingRateMax?: number;
  openInterestMin?: number;
  openInterestMax?: number;
  searchQuery?: string;
}

export default function Screener() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortField, setSortField] = useState<string>('volume24h');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: futuresData, isLoading, refetch } = useBitgetData();
  const { isConnected, lastMessage } = useWebSocket('/ws');

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'futuresUpdate') {
      refetch();
    }
  }, [lastMessage, refetch]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  // Filter and sort data
  const filteredAndSortedData = futuresData
    ?.filter((item) => {
      if (filters.searchQuery && !item.symbol.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }
      if (filters.priceChangeMin !== undefined && parseFloat(item.change24h || '0') < filters.priceChangeMin) {
        return false;
      }
      if (filters.priceChangeMax !== undefined && parseFloat(item.change24h || '0') > filters.priceChangeMax) {
        return false;
      }
      if (filters.volumeMin !== undefined && parseFloat(item.volume24h || '0') < filters.volumeMin) {
        return false;
      }
      if (filters.volumeMax !== undefined && parseFloat(item.volume24h || '0') > filters.volumeMax) {
        return false;
      }
      if (filters.fundingRateMin !== undefined && parseFloat(item.fundingRate || '0') < filters.fundingRateMin) {
        return false;
      }
      if (filters.fundingRateMax !== undefined && parseFloat(item.fundingRate || '0') > filters.fundingRateMax) {
        return false;
      }
      if (filters.openInterestMin !== undefined && parseFloat(item.openInterest || '0') < filters.openInterestMin) {
        return false;
      }
      if (filters.openInterestMax !== undefined && parseFloat(item.openInterest || '0') > filters.openInterestMax) {
        return false;
      }
      return true;
    })
    ?.sort((a, b) => {
      const aValue = parseFloat(String(a[sortField as keyof typeof a] || '0'));
      const bValue = parseFloat(String(b[sortField as keyof typeof b] || '0'));
      
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    }) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader isConnected={isConnected} />
      
      <div className="flex h-[calc(100vh-80px)]">
        <FilterSidebar 
          filters={filters}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />
        
        <main className="flex-1 flex flex-col">
          <DataTable
            data={filteredAndSortedData}
            isLoading={isLoading}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            filters={filters}
            onFiltersChange={setFilters}
          />
          
          <AccountOverview />
        </main>
      </div>
    </div>
  );
}
