import { useState } from 'react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Bot, Brain, Zap, Target, TrendingUp as Trend, Award, ChevronRight, Gauge } from 'lucide-react';
import { PricePredictionMeter } from '@/components/PricePredictionMeter';
import { Link, useLocation } from 'wouter';

export function Home() {
  const { data, isLoading } = useBitgetData();
  const [, setLocation] = useLocation();
  const [activeOpportunityTab, setActiveOpportunityTab] = useState('momentum');

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

  // AI Opportunity Analysis
  const generateOpportunities = (strategy: string) => {
    if (!data || data.length === 0) return [];

    const analyzed = data.map((coin: any) => {
      const price = parseFloat(coin.price || '0');
      const change24h = parseFloat(coin.change24h || '0');
      const volume24h = parseFloat(coin.volume24h || '0');
      const absChange = Math.abs(change24h);
      
      let score = 0;
      let confidence = 0;
      let reasons: string[] = [];
      let risk = 'Medium';
      let timeframe = '1-4h';
      
      switch (strategy) {
        case 'momentum':
          // Momentum trading - strong directional moves with volume
          if (absChange >= 0.08) { // 8%+ move
            score += 40;
            reasons.push('Strong momentum');
          } else if (absChange >= 0.05) { // 5%+ move
            score += 25;
            reasons.push('Moderate momentum');
          }
          
          if (volume24h > 10000000) { // > 10M volume
            score += 30;
            confidence += 25;
            reasons.push('High volume confirmation');
          } else if (volume24h > 1000000) { // > 1M volume
            score += 15;
            confidence += 15;
            reasons.push('Adequate volume');
          }
          
          if (absChange >= 0.15) { // 15%+ extreme moves
            risk = 'High';
            timeframe = '30m-2h';
            score += 20;
            reasons.push('Extreme volatility');
          } else if (absChange >= 0.08) {
            risk = 'Medium';
            timeframe = '1-4h';
          } else {
            risk = 'Low';
            timeframe = '4-8h';
          }
          break;

        case 'breakout':
          // Breakout trading - moderate moves with accelerating volume
          if (absChange >= 0.03 && absChange <= 0.12) { // 3-12% sweet spot
            score += 35;
            reasons.push('Breakout range');
          }
          
          if (volume24h > 5000000) { // Strong volume for breakouts
            score += 35;
            confidence += 30;
            reasons.push('Volume breakout');
          }
          
          if (change24h > 0 && change24h < 0.08) { // Positive but not overextended
            score += 20;
            reasons.push('Healthy uptrend');
          }
          
          risk = 'Medium';
          timeframe = '2-6h';
          break;

        case 'scalping':
          // Scalping - high volume, moderate volatility
          if (volume24h > 20000000) { // Very high volume
            score += 45;
            confidence += 35;
            reasons.push('Ultra-high liquidity');
          } else if (volume24h > 5000000) {
            score += 25;
            confidence += 20;
            reasons.push('High liquidity');
          }
          
          if (absChange >= 0.02 && absChange <= 0.06) { // 2-6% moderate volatility
            score += 30;
            reasons.push('Ideal volatility');
          }
          
          if (price > 0.01) { // Avoid micro-cap coins
            score += 15;
            reasons.push('Stable asset');
          }
          
          risk = 'Low';
          timeframe = '5-30m';
          break;

        case 'swing':
          // Swing trading - established trends, good risk/reward
          if (absChange >= 0.05 && absChange <= 0.20) { // 5-20% range
            score += 30;
            reasons.push('Swing range');
          }
          
          if (volume24h > 2000000) { // Moderate volume requirement
            score += 25;
            confidence += 20;
            reasons.push('Sufficient volume');
          }
          
          // Trend strength
          if (Math.abs(change24h) >= 0.06) {
            score += 25;
            reasons.push('Strong trend');
          }
          
          risk = 'Medium';
          timeframe = '1-3 days';
          break;

        case 'reversal':
          // Mean reversion - oversold/overbought conditions
          if (absChange >= 0.10) { // 10%+ moves for potential reversal
            score += 35;
            reasons.push('Potential reversal');
          }
          
          if (change24h < -0.08) { // Oversold conditions
            score += 25;
            reasons.push('Oversold opportunity');
          } else if (change24h > 0.15) { // Overbought
            score += 20;
            reasons.push('Overbought reversal');
          }
          
          if (volume24h > 3000000) {
            score += 20;
            confidence += 15;
            reasons.push('Volume support');
          }
          
          risk = 'High';
          timeframe = '2-8h';
          break;
      }
      
      // Volume-based confidence adjustment
      if (volume24h > 10000000) confidence += 20;
      else if (volume24h > 1000000) confidence += 10;
      
      // Price stability factor
      if (price > 1) confidence += 10;
      else if (price > 0.1) confidence += 5;
      
      confidence = Math.min(95, confidence);
      
      return {
        ...coin,
        score,
        confidence,
        reasons: reasons.slice(0, 3),
        risk,
        timeframe,
        change24hNum: change24h,
        volume24hNum: volume24h
      };
    });
    
    return analyzed
      .filter(coin => coin.score > 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  };

  const opportunities = {
    momentum: generateOpportunities('momentum'),
    breakout: generateOpportunities('breakout'),
    scalping: generateOpportunities('scalping'),
    swing: generateOpportunities('swing'),
    reversal: generateOpportunities('reversal')
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Discover AI-powered trading opportunities and market insights</p>
      </div>

      <div className="p-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Market Overview</TabsTrigger>
            <TabsTrigger value="opportunities">AI Opportunities</TabsTrigger>
          </TabsList>

          {/* AI Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                AI Trading Opportunities
              </h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Live Analysis
              </Badge>
            </div>

            {/* Interactive Price Prediction Meter - ETH Only */}
            {!isLoading && data && data.length > 0 && (() => {
              const ethPair = data.find(pair => pair.symbol === 'ETHUSDT');
              return ethPair ? (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge className="h-5 w-5 text-purple-500" />
                    <h3 className="text-md font-semibold">Interactive Price Prediction</h3>
                    <Badge className="bg-purple-500 text-white text-xs">ETH Analysis</Badge>
                  </div>
                  <PricePredictionMeter 
                    symbol={ethPair.symbol} 
                    currentPrice={parseFloat(ethPair.price)}
                    onPredictionGenerated={(prediction) => {
                      console.log('New ETH prediction generated:', prediction);
                    }}
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <Card className="p-4 border-dashed border-muted-foreground/30">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="h-5 w-5" />
                      <span className="text-sm">ETH price prediction available when ETHUSDT data is loaded</span>
                    </div>
                  </Card>
                </div>
              );
            })()}

            <Tabs value={activeOpportunityTab} onValueChange={setActiveOpportunityTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 text-xs">
                <TabsTrigger value="momentum" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Momentum
                </TabsTrigger>
                <TabsTrigger value="breakout" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Breakout
                </TabsTrigger>
                <TabsTrigger value="scalping" className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Scalping
                </TabsTrigger>
                <TabsTrigger value="swing" className="flex items-center gap-1">
                  <Trend className="h-3 w-3" />
                  Swing
                </TabsTrigger>
                <TabsTrigger value="reversal" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Reversal
                </TabsTrigger>
              </TabsList>

              {/* Momentum Opportunities */}
              <TabsContent value="momentum" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Momentum Trading
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      Strong Directional Moves
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    High-momentum pairs with strong volume confirmation for trend following strategies.
                  </p>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    Analyzing momentum opportunities...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunities.momentum.slice(0, 6).map((opportunity: any) => (
                      <Card key={opportunity.symbol} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{opportunity.symbol}</div>
                              <div className="text-xs text-muted-foreground">
                                ${parseFloat(opportunity.price).toFixed(4)}
                              </div>
                            </div>
                            <Badge variant={opportunity.change24hNum >= 0 ? 'default' : 'destructive'} className="text-xs">
                              {formatChange(opportunity.change24h)}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${
                                opportunity.risk === 'High' ? 'border-red-200 text-red-700' :
                                opportunity.risk === 'Medium' ? 'border-yellow-200 text-yellow-700' :
                                'border-green-200 text-green-700'
                              }`}>
                                {opportunity.risk} Risk
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setLocation(`/trade?pair=${opportunity.symbol}`)}
                                className="h-8 px-2"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {opportunity.timeframe}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              Score: <span className="font-medium">{opportunity.score}</span>
                            </div>
                            <div className="text-sm text-blue-600">
                              Confidence: {opportunity.confidence}%
                            </div>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {opportunity.reasons.map((reason: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Other strategy tabs with similar structure */}
              {['breakout', 'scalping', 'swing', 'reversal'].map((strategy) => (
                <TabsContent key={strategy} value={strategy} className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center gap-2">
                        {strategy === 'breakout' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {strategy === 'scalping' && <Target className="h-4 w-4 text-blue-500" />}
                        {strategy === 'swing' && <Trend className="h-4 w-4 text-purple-500" />}
                        {strategy === 'reversal' && <Activity className="h-4 w-4 text-orange-500" />}
                        {strategy.charAt(0).toUpperCase() + strategy.slice(1)} Trading
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {strategy === 'breakout' && 'Volume Breakouts'}
                        {strategy === 'scalping' && 'High Liquidity'}
                        {strategy === 'swing' && 'Trend Following'}
                        {strategy === 'reversal' && 'Mean Reversion'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {strategy === 'breakout' && 'Moderate moves with accelerating volume for breakout strategies.'}
                      {strategy === 'scalping' && 'Ultra-high liquidity pairs perfect for quick scalping trades.'}
                      {strategy === 'swing' && 'Established trends with good risk/reward for swing trading.'}
                      {strategy === 'reversal' && 'Oversold/overbought conditions for mean reversion plays.'}
                    </p>
                  </div>
                  
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      Analyzing {strategy} opportunities...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {opportunities[strategy as keyof typeof opportunities].slice(0, 6).map((opportunity: any) => (
                        <Card key={opportunity.symbol} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{opportunity.symbol}</div>
                                <div className="text-xs text-muted-foreground">
                                  ${parseFloat(opportunity.price).toFixed(4)}
                                </div>
                              </div>
                              <Badge variant={opportunity.change24hNum >= 0 ? 'default' : 'destructive'} className="text-xs">
                                {formatChange(opportunity.change24h)}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-xs ${
                                  opportunity.risk === 'High' ? 'border-red-200 text-red-700' :
                                  opportunity.risk === 'Medium' ? 'border-yellow-200 text-yellow-700' :
                                  'border-green-200 text-green-700'
                                }`}>
                                  {opportunity.risk} Risk
                                </Badge>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setLocation(`/trade?pair=${opportunity.symbol}`)}
                                  className="h-8 px-2"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {opportunity.timeframe}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm">
                                Score: <span className="font-medium">{opportunity.score}</span>
                              </div>
                              <div className="text-sm text-blue-600">
                                Confidence: {opportunity.confidence}%
                              </div>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {opportunity.reasons.map((reason: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* Market Overview Tab - Main Focus */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Market Statistics Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="total-volume">
                        {isLoading ? '...' : formatVolume(totalVolume)}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Total Volume (24h)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${avgChange >= 0 
                ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800'
                : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${avgChange >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                      {avgChange >= 0 ? 
                        <TrendingUp className="h-5 w-5 text-white" /> : 
                        <TrendingDown className="h-5 w-5 text-white" />
                      }
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${avgChange >= 0 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                      }`} data-testid="avg-change">
                        {isLoading ? '...' : formatChange(avgChange.toString())}
                      </div>
                      <div className={`text-sm ${avgChange >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                      }`}>Market Average (24h)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Sentiment Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Market Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-bold capitalize flex items-center gap-2">
                    {marketTrend === 'bullish' && <TrendingUp className="h-5 w-5 text-green-500" />}
                    {marketTrend === 'bearish' && <TrendingDown className="h-5 w-5 text-red-500" />}
                    {marketTrend === 'neutral' && <Activity className="h-5 w-5 text-yellow-500" />}
                    <span className={`${
                      marketTrend === 'bullish' ? 'text-green-500' : 
                      marketTrend === 'bearish' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {marketTrend} Market
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {data?.length || 0} Pairs Analyzed
                  </Badge>
                </div>

                {/* Sentiment Progress Bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-500 font-medium">Bullish Pairs</span>
                      <span className="font-medium">{bullishPairs.length} ({sentiment.bullish.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${sentiment.bullish}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-500 font-medium">Bearish Pairs</span>
                      <span className="font-medium">{bearishPairs.length} ({sentiment.bearish.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${sentiment.bearish}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 font-medium">Neutral Pairs</span>
                      <span className="font-medium">{stablePairs.length} ({sentiment.neutral.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${sentiment.neutral}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Gainers & Losers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    Top Gainers (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bullishPairs.slice(0, 5).map((pair, index) => (
                    <div key={pair.symbol} className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{pair.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatChange(pair.change24h)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${parseFloat(pair.price).toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    Top Losers (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bearishPairs.slice(0, 5).map((pair, index) => (
                    <div key={pair.symbol} className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{pair.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">
                          {formatChange(pair.change24h)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${parseFloat(pair.price).toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* High Volume Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  High Volume Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {highVolumePairs.slice(0, 6).map((pair, index) => (
                    <div key={pair.symbol} className="flex items-center justify-between p-3 rounded border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{pair.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(pair.price).toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {formatVolume(parseFloat(pair.volume24h || '0'))}
                        </div>
                        <div className={`text-sm ${parseFloat(pair.change24h || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatChange(pair.change24h)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/trade" data-testid="button-start-trading">
                <Card className="cursor-pointer hover:bg-accent transition-colors bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <div className="font-medium">Start Trading</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Open positions</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/analyzer" data-testid="button-analyze-pairs">
                <Card className="cursor-pointer hover:bg-accent transition-colors bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4 text-center">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <div className="font-medium">Analyze Pairs</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">Technical analysis</div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}