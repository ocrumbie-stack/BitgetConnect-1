import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AppHeaderProps {
  isConnected: boolean;
}

export default function AppHeader({ isConnected }: AppHeaderProps) {
  const [accountData, setAccountData] = useState({
    balance: "$0.00",
    totalPnL: "$0.00"
  });

  const { data: statusData } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000, // Check status every 30 seconds for better performance
  });

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
        
        <div className="flex items-center space-x-6">
          <div className="text-sm">
            <span className="text-text-secondary">Balance:</span>
            <span className="font-mono font-medium ml-2" data-testid="account-balance">
              {accountData.balance}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Total PnL:</span>
            <span 
              className={`font-mono font-medium ml-2 ${
                accountData.totalPnL.startsWith('+') ? 'text-success' : 
                accountData.totalPnL.startsWith('-') ? 'text-error' : ''
              }`}
              data-testid="total-pnl"
            >
              {accountData.totalPnL}
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
