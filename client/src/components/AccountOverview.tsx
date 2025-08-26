import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountOverview() {
  const [, setLocation] = useLocation();
  
  const { data: accountData, isLoading } = useQuery({
    queryKey: ['/api/account', 'user1'], // Using a default user ID for demo
    refetchInterval: 30000, // Refresh every 30 seconds for better performance
  });

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return '$0.00';
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: string | null | undefined) => {
    if (!value) return '0.00%';
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00%';
    return `${num.toFixed(2)}%`;
  };

  const getRiskLevel = (marginRatio: string | null | undefined) => {
    if (!marginRatio) return { level: 'Unknown', color: 'text-text-secondary', width: '0%' };
    const ratio = parseFloat(marginRatio);
    if (isNaN(ratio)) return { level: 'Unknown', color: 'text-text-secondary', width: '0%' };
    
    if (ratio >= 50) return { level: 'Low', color: 'text-success', width: '25%' };
    if (ratio >= 30) return { level: 'Medium', color: 'text-warning', width: '50%' };
    if (ratio >= 10) return { level: 'High', color: 'text-error', width: '75%' };
    return { level: 'Critical', color: 'text-error', width: '100%' };
  };

  if (isLoading) {
    return (
      <div className="bg-surface border-t border-border-color p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const account = accountData?.account;
  const positions = accountData?.positions || [];
  const riskInfo = getRiskLevel(account?.marginRatio);

  return (
    <div className="bg-surface border-t border-border-color p-6" data-testid="account-overview">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Positions */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3" data-testid="positions-title">
            Current Positions
          </h3>
          <div className="space-y-2">
            {positions.length === 0 ? (
              <div className="py-4 text-center text-text-secondary text-sm">
                No open positions
              </div>
            ) : (
              positions.map((position, index) => (
                <div 
                  key={`${position.symbol}-${index}`} 
                  className="flex items-center justify-between py-2 px-3 bg-background rounded-md"
                  data-testid={`position-${position.symbol}`}
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="text-sm font-medium">{position.symbol}</div>
                      <div className="text-xs text-text-secondary capitalize">{position.side}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{position.size} {position.symbol.replace('USDT', '')}</div>
                    <div className={`text-xs font-mono ${
                      position.pnl && parseFloat(position.pnl) >= 0 ? 'text-success' : 'text-error'
                    }`}>
                      {formatCurrency(position.pnl)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Account Summary */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3" data-testid="account-summary-title">
            Account Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Available Balance:</span>
              <span className="text-sm font-mono" data-testid="available-balance">
                {formatCurrency(account?.availableBalance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Margin Used:</span>
              <span className="text-sm font-mono" data-testid="margin-used">
                {formatCurrency(account?.marginUsed)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Unrealized PnL:</span>
                <span 
                  className={`text-sm font-mono ${
                    account?.unrealizedPnl && parseFloat(account.unrealizedPnl) >= 0 ? 'text-success' : 'text-error'
                  }`}
                  data-testid="unrealized-pnl"
                >
                  {formatCurrency(account?.unrealizedPnl)}
                </span>
              </div>
              <div className="flex justify-center">
                <TrendingUp 
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors" 
                  onClick={() => setLocation('/balance-history')}
                  title="View Balance History"
                  data-testid="balance-trend-icon"
                />
              </div>
            </div>
            <div className="flex justify-between border-t border-border-color pt-2">
              <span className="text-sm font-medium">Total Equity:</span>
              <span className="text-sm font-mono font-medium" data-testid="total-equity">
                {formatCurrency(account?.totalEquity)}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3" data-testid="risk-metrics-title">
            Risk Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Margin Ratio:</span>
              <span className={`text-sm font-mono ${riskInfo.color}`} data-testid="margin-ratio">
                {formatPercentage(account?.marginRatio)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Maintenance Margin:</span>
              <span className="text-sm font-mono" data-testid="maintenance-margin">
                {formatCurrency(account?.maintenanceMargin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Liquidation Risk:</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      riskInfo.level === 'Low' ? 'bg-success' :
                      riskInfo.level === 'Medium' ? 'bg-warning' : 'bg-error'
                    }`}
                    style={{ width: riskInfo.width }}
                  />
                </div>
                <span className={`text-xs ${riskInfo.color}`} data-testid="liquidation-risk">
                  {riskInfo.level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
