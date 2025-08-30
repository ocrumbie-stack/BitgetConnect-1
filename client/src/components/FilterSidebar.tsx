import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Filter, TrendingUp } from "lucide-react";
import type { FilterOptions } from "@/pages/screener";

interface FilterSidebarProps {
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

export default function FilterSidebar({ filters, onApplyFilters, onClearFilters }: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [activeTab, setActiveTab] = useState("basic");

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

  // Count active filters for badges
  const activeFiltersCount = Object.values(localFilters).filter(value => value !== undefined && value !== null && String(value) !== '').length;
  const basicFiltersCount = [localFilters.priceChangeMin, localFilters.priceChangeMax, localFilters.volumeMin, localFilters.volumeMax, localFilters.searchQuery].filter(value => value !== undefined && value !== null && String(value) !== '').length;
  const technicalFiltersCount = [localFilters.fundingRateMin, localFilters.fundingRateMax, localFilters.openInterestMin, localFilters.openInterestMax].filter(value => value !== undefined && value !== null && String(value) !== '').length;

  return (
    <aside className="w-80 bg-surface border-r border-border-color" data-testid="filter-sidebar">
      <div className="p-4 border-b border-border-color">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2" data-testid="filters-title">
            <Filter className="w-4 h-4" />
            Filters
          </h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="p-4 border-b border-border-color">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="basic" className="flex items-center gap-2 text-xs font-medium">
              <Filter className="w-3 h-3" />
              Basic
              {basicFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  {basicFiltersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-2 text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              Technical
              {technicalFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                  {technicalFiltersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="p-4 h-[calc(100vh-200px)] overflow-y-auto">
          <TabsContent value="basic" className="mt-0 space-y-6">{/* Basic Filters Content */}
            {/* Search Filter */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                Symbol Search
              </Label>
              <Input
                type="text"
                placeholder="e.g., BTC, ETH, USDT"
                value={localFilters.searchQuery || ''}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, searchQuery: e.target.value || undefined }))}
                className="bg-background border-border-color"
                data-testid="search-query"
              />
            </div>

            {/* Price Change Filter */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                24h Change (%)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.priceChangeMin || ''}
                  onChange={(e) => handleInputChange('priceChangeMin', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="price-change-min"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.priceChangeMax || ''}
                  onChange={(e) => handleInputChange('priceChangeMax', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="price-change-max"
                />
              </div>
            </div>

            {/* Volume Filter */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                24h Volume (USDT)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.volumeMin || ''}
                  onChange={(e) => handleInputChange('volumeMin', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="volume-min"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.volumeMax || ''}
                  onChange={(e) => handleInputChange('volumeMax', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="volume-max"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                Quick Filters
              </Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left border-border-color hover:bg-accent hover:text-accent-foreground"
                  onClick={() => applyQuickFilter('highVolume')}
                  data-testid="high-volume-filter"
                >
                  High Volume (&gt;$10M)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left border-border-color hover:bg-accent hover:text-accent-foreground"
                  onClick={() => applyQuickFilter('majorPairs')}
                  data-testid="major-pairs-filter"
                >
                  Major Pairs Only
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="technical" className="mt-0 space-y-6">

            {/* Funding Rate Filter */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                Funding Rate (%)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Min"
                  value={localFilters.fundingRateMin || ''}
                  onChange={(e) => handleInputChange('fundingRateMin', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="funding-rate-min"
                />
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Max"
                  value={localFilters.fundingRateMax || ''}
                  onChange={(e) => handleInputChange('fundingRateMax', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="funding-rate-max"
                />
              </div>
            </div>

            {/* Open Interest Filter */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                Open Interest (USDT)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.openInterestMin || ''}
                  onChange={(e) => handleInputChange('openInterestMin', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="open-interest-min"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.openInterestMax || ''}
                  onChange={(e) => handleInputChange('openInterestMax', e.target.value)}
                  className="bg-background border-border-color text-sm"
                  data-testid="open-interest-max"
                />
              </div>
            </div>

            {/* Technical Quick Filters */}
            <div className="mb-6">
              <Label className="block text-sm font-medium text-foreground mb-3">
                Technical Presets
              </Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left border-border-color hover:bg-accent hover:text-accent-foreground"
                  onClick={() => applyQuickFilter('highFunding')}
                  data-testid="high-funding-filter"
                >
                  High Funding Rate (&gt;0.1%)
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start text-left border-border-color hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setLocalFilters(prev => ({ ...prev, openInterestMin: 1000000 }))}
                  data-testid="high-oi-filter"
                >
                  High Open Interest (&gt;$1M)
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
        
        <div className="p-4 border-t border-border-color">
          <div className="flex space-x-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleApply}
              data-testid="apply-filters-button"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              className="border-border-color hover:bg-accent hover:text-accent-foreground"
              onClick={handleClear}
              data-testid="clear-filters-button"
            >
              Clear
            </Button>
          </div>
        </div>
      </Tabs>
    </aside>
  );
}
