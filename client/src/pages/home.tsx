import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Bot } from 'lucide-react';
import { Link } from 'wouter';

export function Home() {
  const { data, isLoading } = useBitgetData();

  const topGainers = data
    ?.filter(item => parseFloat(item.change24h || '0') > 0)
    ?.sort((a, b) => parseFloat(b.change24h || '0') - parseFloat(a.change24h || '0'))
    ?.slice(0, 5) || [];

  const topLosers = data
    ?.filter(item => parseFloat(item.change24h || '0') < 0)
    ?.sort((a, b) => parseFloat(a.change24h || '0') - parseFloat(b.change24h || '0'))
    ?.slice(0, 5) || [];

  const totalVolume = data?.reduce((sum, item) => sum + parseFloat(item.volume24h || '0'), 0) || 0;
  const avgChange = data && data.length > 0 
    ? data.reduce((sum, item) => sum + parseFloat(item.change24h || '0'), 0) / data.length 
    : 0;

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toFixed(2)}`;
  };

  const formatChange = (change: string | null) => {
    if (!change) return '0.00%';
    const num = parseFloat(change) * 100;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Monitor your crypto portfolio and market trends</p>
      </div>

      {/* Market Overview */}
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Market Overview</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold" data-testid="total-volume">
                {isLoading ? '...' : formatVolume(totalVolume)}
              </div>
              <div className="text-xs text-muted-foreground">24h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Avg Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-bold ${avgChange >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="avg-change">
                {isLoading ? '...' : formatChange(avgChange.toString())}
              </div>
              <div className="text-xs text-muted-foreground">24h</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Gainers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Gainers
            </h3>
            <Link href="/markets" className="text-primary text-sm hover:underline" data-testid="link-view-all-gainers">
              View All
            </Link>
          </div>
          
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : (
              topGainers.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between p-3 bg-card rounded-lg" data-testid={`gainer-${item.symbol}`}>
                  <div>
                    <div className="font-medium">{item.symbol}</div>
                    <div className="text-sm text-muted-foreground">${parseFloat(item.price).toFixed(4)}</div>
                  </div>
                  <div className="text-green-500 font-medium">
                    {formatChange(item.change24h)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Top Losers
            </h3>
            <Link href="/markets" className="text-primary text-sm hover:underline" data-testid="link-view-all-losers">
              View All
            </Link>
          </div>
          
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : (
              topLosers.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between p-3 bg-card rounded-lg" data-testid={`loser-${item.symbol}`}>
                  <div>
                    <div className="font-medium">{item.symbol}</div>
                    <div className="text-sm text-muted-foreground">${parseFloat(item.price).toFixed(4)}</div>
                  </div>
                  <div className="text-red-500 font-medium">
                    {formatChange(item.change24h)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-md font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/trade" data-testid="button-start-trading">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="font-medium">Start Trading</div>
                  <div className="text-xs text-muted-foreground">Open positions</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/bot" data-testid="button-setup-bot">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4 text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="font-medium">Setup Bot</div>
                  <div className="text-xs text-muted-foreground">Automate trading</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}