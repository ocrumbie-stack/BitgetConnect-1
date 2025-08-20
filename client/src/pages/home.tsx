import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Bot } from 'lucide-react';
import { Link } from 'wouter';

export function Home() {
  const { data, isLoading } = useBitgetData();

  // Market analysis
  const bullishPairs = data?.filter(item => parseFloat(item.change24h || '0') > 0.05) || [];
  const bearishPairs = data?.filter(item => parseFloat(item.change24h || '0') < -0.05) || [];
  const stablePairs = data?.filter(item => Math.abs(parseFloat(item.change24h || '0')) <= 0.02) || [];
  
  const highVolumePairs = data
    ?.sort((a, b) => parseFloat(b.volume24h || '0') - parseFloat(a.volume24h || '0'))
    ?.slice(0, 5) || [];

  const marketTrend = bullishPairs.length > bearishPairs.length ? 'bullish' : 
                     bearishPairs.length > bullishPairs.length ? 'bearish' : 'neutral';

  const getMarketSentiment = () => {
    const totalPairs = data?.length || 1;
    const bullishPercentage = (bullishPairs.length / totalPairs) * 100;
    const bearishPercentage = (bearishPairs.length / totalPairs) * 100;
    
    return {
      bullish: bullishPercentage,
      bearish: bearishPercentage,
      neutral: 100 - bullishPercentage - bearishPercentage
    };
  };

  const sentiment = getMarketSentiment();

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

        {/* Market Sentiment */}
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Market Sentiment
          </h3>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold capitalize">
                  {marketTrend} Market
                </div>
                <div className={`flex items-center gap-1 ${
                  marketTrend === 'bullish' ? 'text-green-500' : 
                  marketTrend === 'bearish' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {marketTrend === 'bullish' ? <TrendingUp className="h-4 w-4" /> : 
                   marketTrend === 'bearish' ? <TrendingDown className="h-4 w-4" /> : 
                   <Activity className="h-4 w-4" />}
                  <span className="text-sm font-medium">
                    {marketTrend === 'bullish' ? 'Positive' : 
                     marketTrend === 'bearish' ? 'Negative' : 'Mixed'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-green-500">Bullish Pairs</span>
                  <span>{bullishPairs.length} ({sentiment.bullish.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Bearish Pairs</span>
                  <span>{bearishPairs.length} ({sentiment.bearish.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stable Pairs</span>
                  <span>{stablePairs.length} ({sentiment.neutral.toFixed(1)}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading Suggestions */}
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Trading Opportunities
          </h3>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading suggestions...</div>
            ) : (
              <>
                {/* High Volume Opportunities */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">High Volume Pairs</div>
                      <div className="text-xs text-muted-foreground">Active Trading</div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Strong liquidity and momentum for scalping
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {highVolumePairs.slice(0, 3).map((pair) => (
                        <div key={pair.symbol} className="flex items-center gap-2 bg-accent/50 rounded px-2 py-1 text-xs">
                          <span className="font-medium">{pair.symbol}</span>
                          <span className={parseFloat(pair.change24h || '0') >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {formatChange(pair.change24h)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Market Direction Suggestion */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Market Direction</div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        marketTrend === 'bullish' ? 'bg-green-500/10 text-green-500' :
                        marketTrend === 'bearish' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {marketTrend.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {marketTrend === 'bullish' && "Consider long positions on breakouts with strong volume"}
                      {marketTrend === 'bearish' && "Look for short opportunities on resistance levels"}
                      {marketTrend === 'neutral' && "Range trading strategies may be effective in current conditions"}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Management */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Risk Management</div>
                      <div className="text-xs text-muted-foreground">Always Required</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current volatility suggests using tight stop-losses. 
                      Consider position sizing based on 24h volume patterns.
                    </div>
                  </CardContent>
                </Card>
              </>
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