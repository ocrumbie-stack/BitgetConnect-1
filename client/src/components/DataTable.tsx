import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { FuturesData } from "@shared/schema";
import type { FilterOptions } from "@/pages/screener";

interface DataTableProps {
  data: FuturesData[];
  isLoading: boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export default function DataTable({ 
  data, 
  isLoading, 
  sortField, 
  sortDirection, 
  onSort, 
  filters,
  onFiltersChange 
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const formatNumber = (value: string | null, decimals: number = 2, prefix: string = '') => {
    if (!value) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    
    if (num >= 1e9) {
      return `${prefix}${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `${prefix}${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${prefix}${(num / 1e3).toFixed(1)}K`;
    }
    return `${prefix}${num.toFixed(decimals)}`;
  };

  const formatPercentage = (value: string | null, showSign: boolean = true) => {
    if (!value) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    
    const sign = showSign ? (num >= 0 ? '+' : '') : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const getChangeColor = (value: string | null) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num >= 0 ? 'text-success' : 'text-error';
  };

  const exportToCsv = () => {
    const headers = ['Symbol', 'Price', '24h Change', 'Volume', 'Funding Rate', 'Open Interest'];
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.symbol,
        item.price || '0',
        item.change24h || '0',
        item.volume24h || '0',
        item.fundingRate || '0',
        item.openInterest || '0'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitget-futures-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      className="flex items-center space-x-1 hover:text-foreground transition-colors cursor-pointer"
      onClick={() => onSort(field)}
      data-testid={`sort-${field}`}
    >
      <span>{children}</span>
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="bg-surface border-b border-border-color px-6 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden" data-testid="data-table">
      <div className="h-full flex flex-col">
        {/* Table Controls */}
        <div className="bg-surface border-b border-border-color px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-text-secondary" />
                <Input
                  type="text"
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="bg-background border-border-color w-64"
                  data-testid="search-input"
                />
              </div>
              <span className="text-sm text-text-secondary" data-testid="filtered-count">
                Showing {data.length} pairs
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={exportToCsv}
                className="bg-warning hover:bg-yellow-600 text-white"
                data-testid="export-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-text-secondary">Auto-refresh:</span>
                <div className="w-2 h-2 bg-success rounded-full animate-pulse-dot" />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-surface sticky top-0">
              <tr className="text-left text-sm text-text-secondary">
                <th className="px-6 py-4 font-medium">
                  <SortButton field="symbol">Symbol</SortButton>
                </th>
                <th className="px-6 py-4 font-medium text-right">
                  <SortButton field="price">Price</SortButton>
                </th>
                <th className="px-6 py-4 font-medium text-right">
                  <SortButton field="change24h">24h Change</SortButton>
                </th>
                <th className="px-6 py-4 font-medium text-right">
                  <SortButton field="volume24h">Volume (24h)</SortButton>
                </th>
                <th className="px-6 py-4 font-medium text-right">
                  <SortButton field="fundingRate">Funding Rate</SortButton>
                </th>
                <th className="px-6 py-4 font-medium text-right">
                  <SortButton field="openInterest">Open Interest</SortButton>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    No data available. Please check your API connection or adjust filters.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr 
                    key={item.symbol} 
                    className="hover:bg-surface/50 transition-colors cursor-pointer"
                    data-testid={`row-${item.symbol}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium" data-testid={`symbol-${item.symbol}`}>
                        {item.symbol}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {item.contractType}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono" data-testid={`price-${item.symbol}`}>
                      ${formatNumber(item.price, 2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span 
                        className={`font-mono ${getChangeColor(item.change24h)}`}
                        data-testid={`change-${item.symbol}`}
                      >
                        {formatPercentage(item.change24h)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm" data-testid={`volume-${item.symbol}`}>
                      ${formatNumber(item.volume24h)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span 
                        className={`font-mono text-sm ${getChangeColor(item.fundingRate)}`}
                        data-testid={`funding-${item.symbol}`}
                      >
                        {formatPercentage(item.fundingRate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm" data-testid={`oi-${item.symbol}`}>
                      ${formatNumber(item.openInterest)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
