import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AppHeaderProps {
  isConnected: boolean;
}

export default function AppHeader({ isConnected }: AppHeaderProps) {
  const { data: statusData } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000, // Check status every 30 seconds for better performance
  });

  const { data: accountData } = useQuery({
    queryKey: ['/api/account/default-user'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time balance
  });

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return '$0.00';
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const account = accountData?.account;
  
  // Calculate total balance: use totalEquity (which is now calculated as available + margin used on backend)
  const calculateTotalBalance = () => {
    // totalEquity is now properly calculated in the backend as available + margin used from positions
    return account?.totalEquity || '0';
  };
  
  const totalBalance = calculateTotalBalance();
  const unrealizedPnl = account?.unrealizedPnl || '0';

  return (
    <header className="bg-surface border-b border-border-color px-6 py-4" data-testid="app-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold" data-testid="app-title">
            Bitget Perpetual Futures Screener
          </h1>
          <div className="flex items-center space-x-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected && statusData?.apiConnected 
                  ? 'bg-success animate-pulse-dot' 
                  : 'bg-error'
              }`}
              data-testid="api-status-indicator"
            />
            <span className="text-sm text-text-secondary" data-testid="api-status-text">
              {isConnected && statusData?.apiConnected ? 'API Connected' : 'API Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-text-secondary">Total Balance:</span>
            <span className="font-mono font-medium ml-1" data-testid="total-balance">
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Available:</span>
            <span className="font-mono font-medium ml-1" data-testid="available-balance">
              {formatCurrency(account?.availableBalance)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Margin Used:</span>
            <span className="font-mono font-medium ml-1" data-testid="margin-used">
              {formatCurrency(account?.marginUsed)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">PnL:</span>
            <span 
              className={`font-mono font-medium ml-1 ${
                parseFloat(unrealizedPnl) >= 0 ? 'text-success' : 'text-error'
              }`}
              data-testid="unrealized-pnl"
            >
              {formatCurrency(unrealizedPnl)}
            </span>
          </div>
          <Button 
            className="bg-primary hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
            data-testid="settings-button"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </header>
  );
}
