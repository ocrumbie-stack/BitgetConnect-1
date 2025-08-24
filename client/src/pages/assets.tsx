import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, AlertCircle } from 'lucide-react';
import { ApiSettings } from '@/components/ApiSettings';

export function Assets() {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch account information
  const { data: accountData, isLoading, refetch } = useQuery({
    queryKey: ['/api/account/default-user'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Check connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const isConnected = connectionStatus?.apiConnected;
  const account = accountData?.account;
  const positions = accountData?.positions || [];

  const totalPnL = positions.reduce((sum: number, pos: any) => sum + parseFloat(pos.pnl || '0'), 0);
  const activePositions = positions.filter((pos: any) => parseFloat(pos.size) > 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-foreground">Assets & Portfolio</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Manage your account and view portfolio performance</p>
      </div>

      <div className="p-4 space-y-6">
        {/* API Connection Settings */}
        <ApiSettings />

        {/* Account Overview */}
        {isConnected ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Account Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading account data...</p>
                  </div>
                ) : account ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">${parseFloat(account.totalEquity || '0').toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Equity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">${parseFloat(account.availableBalance || '0').toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Available Balance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">${parseFloat(account.marginUsed || '0').toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Margin Used</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Unrealized PnL</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Unable to load account data</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Positions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Active Positions
                  <Badge variant="secondary">{activePositions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activePositions.length > 0 ? (
                  <div className="space-y-3">
                    {activePositions.map((position: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${position.side === 'long' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="font-medium">{position.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {position.side?.toUpperCase()} • Size: {parseFloat(position.size).toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${parseFloat(position.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${parseFloat(position.pnl >= 0 ? '+' : '')}{parseFloat(position.pnl).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(position.markPrice).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active positions</p>
                    <p className="text-xs text-muted-foreground mt-1">Open a position from the Trade page to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Portfolio Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">Today's P&L</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Active Trades</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {activePositions.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Account</h3>
              <p className="text-muted-foreground mb-4">
                Set up your Bitget API connection above to view your real account balance, positions, and portfolio performance.
              </p>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p><strong>What you'll get:</strong></p>
                <p>• Real-time account balance</p>
                <p>• Live position tracking</p>
                <p>• Automated trade execution</p>
                <p>• Portfolio performance analytics</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Update */}
        {isConnected && account && (
          <div className="text-xs text-center text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}