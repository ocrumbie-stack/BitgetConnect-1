import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ApiSettings } from '@/components/ApiSettings';

export function Assets() {
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState({
    balance: false,
    positions: false,
    performance: false
  });

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

  const toggleCard = (cardKey: keyof typeof collapsedCards) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
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
          <h1 className="text-base font-semibold text-foreground">Assets & Portfolio</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Manage your account and view portfolio performance</p>
      </div>

      <div className="p-4 space-y-6">
        {/* API Connection Settings */}
        <ApiSettings />

        {/* Account Overview */}
        {isConnected ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle 
                  className="flex items-center justify-between cursor-pointer text-sm"
                  onClick={() => toggleCard('balance')}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Account Balance
                  </div>
                  {collapsedCards.balance ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {!collapsedCards.balance && (
                <CardContent className="pt-0">
                {isLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-xs text-muted-foreground">Loading account data...</p>
                  </div>
                ) : account ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold">${parseFloat(account.totalEquity || '0').toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Total Equity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">${parseFloat(account.availableBalance || '0').toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Available Balance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-semibold">${parseFloat(account.marginUsed || '0').toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Margin Used</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-base font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Unrealized PnL</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Unable to load account data</p>
                    <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={handleRefresh}>
                      Try Again
                    </Button>
                  </div>
                )}
                </CardContent>
              )}
            </Card>

            {/* Active Positions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle 
                  className="flex items-center justify-between cursor-pointer text-sm"
                  onClick={() => toggleCard('positions')}
                >
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Active Positions
                    <Badge variant="secondary" className="text-xs">{activePositions.length}</Badge>
                  </div>
                  {collapsedCards.positions ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {!collapsedCards.positions && (
                <CardContent className="pt-0">
                {activePositions.length > 0 ? (
                  <div className="space-y-3">
                    {activePositions.map((position: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${position.side === 'long' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="text-sm font-medium">{position.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {position.side?.toUpperCase()} • Size: {parseFloat(position.size).toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${parseFloat(position.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                  <div className="text-center py-6">
                    <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No active positions</p>
                    <p className="text-xs text-muted-foreground mt-1">Open a position from the Trade page to see it here</p>
                  </div>
                )}
                </CardContent>
              )}
            </Card>

            {/* Portfolio Performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle 
                  className="flex items-center justify-between cursor-pointer text-sm"
                  onClick={() => toggleCard('performance')}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Portfolio Performance
                  </div>
                  {collapsedCards.performance ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {!collapsedCards.performance && (
                <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Today's P&L</div>
                    <div className="text-base font-bold text-green-600 dark:text-green-400">
                      ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active Trades</div>
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {activePositions.length}
                    </div>
                  </div>
                </div>
                </CardContent>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-2">Connect Your Account</h3>
              <p className="text-sm text-muted-foreground mb-3">
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