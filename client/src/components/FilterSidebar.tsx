import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FilterOptions } from "@/pages/screener";

interface FilterSidebarProps {
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

export default function FilterSidebar({ filters, onApplyFilters, onClearFilters }: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleInputChange = (field: keyof FilterOptions, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value);
    setLocalFilters(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const applyQuickFilter = (filterType: string) => {
    let quickFilters: FilterOptions = {};
    
    switch (filterType) {
      case 'highVolume':
        quickFilters = { volumeMin: 10000000 }; // $10M+
        break;
      case 'highFunding':
        quickFilters = { fundingRateMin: 0.1 }; // 0.1%+
        break;
      case 'majorPairs':
        quickFilters = { searchQuery: 'BTC|ETH|ADA|SOL|DOT' };
        break;
    }
    
    setLocalFilters(quickFilters);
    onApplyFilters(quickFilters);
  };

  return (
    <aside className="w-80 bg-surface border-r border-border-color p-6" data-testid="filter-sidebar">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4" data-testid="filters-title">Filters</h3>
          
          {/* Price Change Filter */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-text-secondary mb-2">
              24h Change (%)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.priceChangeMin || ''}
                onChange={(e) => handleInputChange('priceChangeMin', e.target.value)}
                className="bg-background border-border-color"
                data-testid="price-change-min"
              />
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.priceChangeMax || ''}
                onChange={(e) => handleInputChange('priceChangeMax', e.target.value)}
                className="bg-background border-border-color"
                data-testid="price-change-max"
              />
            </div>
          </div>

          {/* Volume Filter */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-text-secondary mb-2">
              24h Volume (USDT)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.volumeMin || ''}
                onChange={(e) => handleInputChange('volumeMin', e.target.value)}
                className="bg-background border-border-color"
                data-testid="volume-min"
              />
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.volumeMax || ''}
                onChange={(e) => handleInputChange('volumeMax', e.target.value)}
                className="bg-background border-border-color"
                data-testid="volume-max"
              />
            </div>
          </div>

          {/* Funding Rate Filter */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-text-secondary mb-2">
              Funding Rate (%)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.001"
                placeholder="Min"
                value={localFilters.fundingRateMin || ''}
                onChange={(e) => handleInputChange('fundingRateMin', e.target.value)}
                className="bg-background border-border-color"
                data-testid="funding-rate-min"
              />
              <Input
                type="number"
                step="0.001"
                placeholder="Max"
                value={localFilters.fundingRateMax || ''}
                onChange={(e) => handleInputChange('fundingRateMax', e.target.value)}
                className="bg-background border-border-color"
                data-testid="funding-rate-max"
              />
            </div>
          </div>

          {/* Open Interest Filter */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-text-secondary mb-2">
              Open Interest (USDT)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.openInterestMin || ''}
                onChange={(e) => handleInputChange('openInterestMin', e.target.value)}
                className="bg-background border-border-color"
                data-testid="open-interest-min"
              />
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.openInterestMax || ''}
                onChange={(e) => handleInputChange('openInterestMax', e.target.value)}
                className="bg-background border-border-color"
                data-testid="open-interest-max"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-text-secondary mb-2">
              Quick Filters
            </Label>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-left border-border-color hover:bg-background"
                onClick={() => applyQuickFilter('highVolume')}
                data-testid="high-volume-filter"
              >
                High Volume (&gt;$10M)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left border-border-color hover:bg-background"
                onClick={() => applyQuickFilter('highFunding')}
                data-testid="high-funding-filter"
              >
                High Funding Rate (&gt;0.1%)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left border-border-color hover:bg-background"
                onClick={() => applyQuickFilter('majorPairs')}
                data-testid="major-pairs-filter"
              >
                Major Pairs Only
              </Button>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              className="flex-1 bg-primary hover:bg-blue-700 text-white"
              onClick={handleApply}
              data-testid="apply-filters-button"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              className="border-border-color hover:bg-background"
              onClick={handleClear}
              data-testid="clear-filters-button"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
