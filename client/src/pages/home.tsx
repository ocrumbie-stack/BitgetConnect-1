import { useState } from 'react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Bot, Brain, Zap, Target, TrendingUp as Trend, Award, ChevronRight, Gauge, ChevronDown, ChevronUp, Info, Eye, EyeOff, RefreshCw, AlertTriangle, Users, MessageCircle, ThumbsUp, ThumbsDown, Heart, Smile, Frown, Meh, Star, Volume2, Clock, Shield } from 'lucide-react';

import { Link, useLocation } from 'wouter';
import { AlertDemoCreator } from '@/components/AlertDemoCreator';
import DynamicRiskMeter from '@/components/DynamicRiskMeter';

export function Home() {
  const { data, isLoading } = useBitgetData();
  const [, setLocation] = useLocation();
  const [activeOpportunityTab, setActiveOpportunityTab] = useState('momentum');
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set(['momentum']));
  const [showAllOpportunities, setShowAllOpportunities] = useState<{ [key: string]: boolean }>({});
  const [selectedRiskPair, setSelectedRiskPair] = useState<string | null>(null);

  // Define major pairs to filter out for more diverse results
  const majorPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT'];

  // Market analysis with improved filtering for diverse results
  const bullishPairs = data?.filter(item => parseFloat(item.change24h || '0') > 0.05) || [];
  const bearishPairs = data?.filter(item => parseFloat(item.change24h || '0') < -0.05) || [];
  const stablePairs = data?.filter(item => Math.abs(parseFloat(item.change24h || '0')) <= 0.02) || [];

  // Top gainers excluding major pairs, sorted by percentage change
  const topGainers = data
    ?.filter(item => parseFloat(item.change24h || '0') > 0 && !majorPairs.includes(item.symbol))
    ?.sort((a, b) => parseFloat(b.change24h || '0') - parseFloat(a.change24h || '0'))
    ?.slice(0, 5) || [];

  // Top losers excluding major pairs, sorted by percentage change  
  const topLosers = data
    ?.filter(item => parseFloat(item.change24h || '0') < 0 && !majorPairs.includes(item.symbol))
    ?.sort((a, b) => parseFloat(a.change24h || '0') - parseFloat(b.change24h || '0'))
    ?.slice(0, 5) || [];
  
  // Volume surge - pairs with highest volume relative to their typical activity
  const volumeSurgePairs = data
    ?.filter(item => !majorPairs.includes(item.symbol))
    ?.sort((a, b) => parseFloat(b.volume24h || '0') - parseFloat(a.volume24h || '0'))
    ?.slice(0, 6) || [];

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

  // Enhanced social sentiment simulation
  const getSocialSentiment = () => {
    const currentHour = new Date().getHours();
    const basePositivity = Math.sin((currentHour / 24) * Math.PI * 2) * 20 + 60; // Dynamic based on time
    
    return {
      overall: avgChange > 0.02 ? 'Very Positive' : avgChange > 0 ? 'Positive' : avgChange > -0.02 ? 'Neutral' : avgChange > -0.05 ? 'Negative' : 'Very Negative',
      score: Math.round(basePositivity + (avgChange * 1000)),
      volume: Math.round(Math.random() * 50000 + 25000), // Social mentions
      trending: ['#Bitcoin', '#Crypto', '#Trading', '#BullRun', '#HODL'],
      fearGreedIndex: Math.round(50 + (avgChange * 2000) + (Math.random() - 0.5) * 20),
      insights: [
        'Retail investors showing increased interest',
        'Institutional activity remains strong',
        'Technical indicators suggest consolidation',
        'Volume patterns indicate healthy distribution'
      ]
    };
  };

  const socialSentiment = getSocialSentiment();

  // Market health indicators
  const getMarketHealth = () => {
    const volatility = data ? data.reduce((sum, item) => sum + Math.abs(parseFloat(item.change24h || '0')), 0) / data.length : 0;
    const activeMarkets = data?.filter(item => parseFloat(item.volume24h || '0') > 100000).length || 0;
    
    return {
      volatility: volatility * 100,
      liquidity: (activeMarkets / (data?.length || 1)) * 100,
      momentum: sentiment.bullish - sentiment.bearish,
      stability: 100 - (volatility * 100)
    };
  };

  const marketHealth = getMarketHealth();

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

        case 'remarkable':
          // Remarkable price changes - significant movements
          if (absChange >= 0.03) { // 3%+ change in 24h
            score += 40;
            reasons.push('Significant move');
          }
          
          if (absChange >= 0.05) { // 5%+ change
            score += 30;
            reasons.push('Major price shift');
          }
          
          if (absChange >= 0.08) { // 8%+ change
            score += 25;
            reasons.push('Remarkable change');
          }
          
          if (volume24h > 1000000) {
            score += 20;
            confidence += 15;
            reasons.push('Volume confirmation');
          }
          
          // Higher confidence for bigger moves
          if (absChange >= 0.10) confidence += 25;
          else if (absChange >= 0.05) confidence += 15;
          
          risk = absChange >= 0.08 ? 'High' : absChange >= 0.05 ? 'Medium' : 'Low';
          timeframe = 'Real-time';
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
    reversal: generateOpportunities('reversal'),
    remarkable: generateOpportunities('remarkable')
  };

  const toggleStrategyExpansion = (strategy: string) => {
    const newExpanded = new Set(expandedStrategies);
    if (newExpanded.has(strategy)) {
      newExpanded.delete(strategy);
    } else {
      newExpanded.add(strategy);
    }
    setExpandedStrategies(newExpanded);
  };

  const toggleShowAll = (strategy: string) => {
    setShowAllOpportunities(prev => ({
      ...prev,
      [strategy]: !prev[strategy]
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <h1 className="text-lg font-semibold text-foreground mb-2">Welcome Back</h1>
        <p className="text-sm text-muted-foreground">Discover AI-powered trading opportunities and market insights</p>
      </div>

      <div className="p-4 max-w-full overflow-x-hidden">
        <Tabs defaultValue="overview" className="w-full max-w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="truncate">Market Overview</TabsTrigger>
            <TabsTrigger value="opportunities" className="truncate">AI Opportunities</TabsTrigger>
          </TabsList>

          {/* AI Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4 mt-4 overflow-x-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                AI Trading Opportunities
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Live Analysis
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation('/strategy-recommender')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Brain className="h-4 w-4" />
                  Strategy AI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Trading Strategy Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 w-full">
              {[
                { key: 'momentum', label: 'Momentum', icon: Zap, iconColor: 'bg-yellow-500', desc: 'Strong directional moves' },
                { key: 'breakout', label: 'Breakout', icon: TrendingUp, iconColor: 'bg-green-500', desc: 'Volume breakouts' },
                { key: 'scalping', label: 'Scalping', icon: Target, iconColor: 'bg-blue-500', desc: 'Quick scalp trades' },
                { key: 'swing', label: 'Swing', icon: Trend, iconColor: 'bg-purple-500', desc: 'Trend following' },
                { key: 'reversal', label: 'Reversal', icon: Activity, iconColor: 'bg-orange-500', desc: 'Mean reversion' },
                { key: 'remarkable', label: 'Remarkable Changes', icon: AlertTriangle, iconColor: 'bg-red-500', desc: 'Significant price movements' }
              ].map((strategy) => {
                const isExpanded = expandedStrategies.has(strategy.key);
                const strategyOpportunities = opportunities[strategy.key as keyof typeof opportunities] || [];
                
                return (
                  <Card 
                    key={strategy.key} 
                    className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                      isExpanded ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border hover:border-accent'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleStrategyExpansion(strategy.key);
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 ${strategy.iconColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                        <strategy.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-lg font-semibold mb-1">{strategy.label}</div>
                      <div className="text-sm text-muted-foreground mb-3">{strategy.desc}</div>
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {strategyOpportunities.length} pairs
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Expanded Strategy Content */}
            <div className="space-y-4">
              {[
                { key: 'momentum', label: 'Momentum Trading', icon: Zap, color: 'text-yellow-500', desc: 'High-momentum pairs with strong volume confirmation for trend following strategies.', badge: 'Strong Directional Moves' },
                { key: 'breakout', label: 'Breakout Trading', icon: TrendingUp, color: 'text-green-500', desc: 'Moderate moves with accelerating volume for breakout strategies.', badge: 'Volume Breakouts' },
                { key: 'scalping', label: 'Scalping Trading', icon: Target, color: 'text-blue-500', desc: 'Ultra-high liquidity pairs perfect for quick scalping trades.', badge: 'High Liquidity' },
                { key: 'swing', label: 'Swing Trading', icon: Trend, color: 'text-purple-500', desc: 'Established trends with good risk/reward for swing trading.', badge: 'Trend Following' },
                { key: 'reversal', label: 'Reversal Trading', icon: Activity, color: 'text-orange-500', desc: 'Oversold/overbought conditions for mean reversion plays.', badge: 'Mean Reversion' },
                { key: 'remarkable', label: 'Remarkable Price Changes', icon: AlertTriangle, color: 'text-red-500', desc: 'Significant 5-minute and 24-hour price movements with timestamps.', badge: 'Price Alerts' }
              ].filter(strategy => expandedStrategies.has(strategy.key)).map((strategy) => {
                const strategyOpportunities = opportunities[strategy.key as keyof typeof opportunities] || [];
                const showAll = showAllOpportunities[strategy.key] || false;
                const displayedOpportunities = showAll ? strategyOpportunities : strategyOpportunities.slice(0, 3);
                
                return (
                  <Card key={strategy.key} className="border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <strategy.icon className={`h-5 w-5 ${strategy.color}`} />
                          <div>
                            <CardTitle className="text-lg">{strategy.label}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{strategy.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {strategy.badge}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStrategyExpansion(strategy.key)}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                        {isLoading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                            Analyzing {strategy.key} opportunities...
                          </div>
                        ) : strategyOpportunities.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Info className="h-8 w-8 mx-auto mb-2" />
                            <p>No {strategy.key} opportunities found at the moment</p>
                            <p className="text-xs mt-1">Market conditions may change - try refreshing later</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {displayedOpportunities.map((opportunity: any) => (
                              <Card key={opportunity.symbol} className="p-4 hover:shadow-md transition-shadow">
                                {strategy.key === 'remarkable' ? (
                                  // Special layout for remarkable price changes
                                  <>
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div>
                                          <div className="font-semibold text-base">{opportunity.symbol}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-center">
                                          <Badge 
                                            variant={Math.abs(opportunity.change24hNum) >= 0.05 ? 'default' : 'secondary'}
                                            className={`text-sm px-3 py-1 ${
                                              Math.abs(opportunity.change24hNum) >= 0.08 ? 'bg-red-500 text-white' :
                                              Math.abs(opportunity.change24hNum) >= 0.05 ? 'bg-orange-500 text-white' :
                                              'bg-blue-500 text-white'
                                            }`}
                                          >
                                            {Math.abs(opportunity.change24hNum) >= 0.08 ? '24h high' :
                                             Math.abs(opportunity.change24hNum) >= 0.05 ? '5m rise' : '24h move'}
                                          </Badge>
                                        </div>
                                        <div className={`text-lg font-bold mt-1 ${
                                          opportunity.change24hNum >= 0 ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                          {formatChange(opportunity.change24h)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="text-muted-foreground">
                                        Price: ${parseFloat(opportunity.price).toFixed(4)}
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => setLocation(`/trade?pair=${opportunity.symbol}`)}
                                        className="h-8 px-2"
                                      >
                                        <ChevronRight className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  // Standard layout for other strategies
                                  <>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-3">
                                        <div>
                                          <div className="font-medium text-sm">{opportunity.symbol}</div>
                                          <div className="text-xs text-muted-foreground">
                                            ${parseFloat(opportunity.price).toFixed(4)}
                                          </div>
                                        </div>
                                        <Badge variant={opportunity.change24hNum >= 0 ? 'default' : 'destructive'} className="text-xs">
                                          {formatChange(opportunity.change24h)}
                                        </Badge>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex items-center gap-2 mb-1">
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
                                        <div className="text-xs text-muted-foreground">
                                          {opportunity.timeframe}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm">
                                          Score: <span className="font-medium text-blue-600">{opportunity.score}</span>
                                        </div>
                                        <div className="text-sm">
                                          Confidence: <span className="font-medium text-green-600">{opportunity.confidence}%</span>
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
                                  </>
                                )}
                              </Card>
                            ))}
                            
                            {strategyOpportunities.length > 3 && (
                              <div className="text-center pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleShowAll(strategy.key)}
                                  className="flex items-center gap-2"
                                >
                                  {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  {showAll ? `Show Less` : `Show All ${strategyOpportunities.length} Opportunities`}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Market Overview Tab - Main Focus */}
          <TabsContent value="overview" className="space-y-6 mt-4 overflow-x-hidden">
            {/* Market Statistics Cards */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="total-volume">
                        {isLoading ? '...' : formatVolume(totalVolume)}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Total Volume (24h)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${avgChange >= 0 
                ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800'
                : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${avgChange >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                      {avgChange >= 0 ? 
                        <TrendingUp className="h-4 w-4 text-white" /> : 
                        <TrendingDown className="h-4 w-4 text-white" />
                      }
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${avgChange >= 0 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                      }`} data-testid="avg-change">
                        {isLoading ? '...' : formatChange(avgChange.toString())}
                      </div>
                      <div className={`text-xs ${avgChange >= 0 
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Market Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold capitalize flex items-center gap-2">
                    {marketTrend === 'bullish' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {marketTrend === 'bearish' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {marketTrend === 'neutral' && <Activity className="h-4 w-4 text-yellow-500" />}
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
                <div className="space-y-2">
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

            {/* Social Sentiment & Fear/Greed Index */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Social Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 truncate">
                        {socialSentiment.overall}
                      </div>
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        Community Mood
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        {socialSentiment.overall.includes('Positive') ? 
                          <Smile className="h-5 w-5 text-green-500" /> :
                          socialSentiment.overall.includes('Negative') ? 
                          <Frown className="h-5 w-5 text-red-500" /> :
                          <Meh className="h-5 w-5 text-yellow-500" />
                        }
                        <span className="text-sm font-medium">{socialSentiment.score}/100</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        <span className="truncate">{socialSentiment.volume.toLocaleString()} mentions</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Trending Topics</div>
                    <div className="flex gap-1 flex-wrap overflow-hidden">
                      {socialSentiment.trending.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 shrink-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-orange-500" />
                    Fear & Greed Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-2">
                      {socialSentiment.fearGreedIndex}
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-400 mb-3">
                      {socialSentiment.fearGreedIndex > 75 ? 'Extreme Greed' :
                       socialSentiment.fearGreedIndex > 55 ? 'Greed' :
                       socialSentiment.fearGreedIndex > 45 ? 'Neutral' :
                       socialSentiment.fearGreedIndex > 25 ? 'Fear' : 'Extreme Fear'}
                    </div>
                    
                    {/* Fear/Greed Gauge */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          socialSentiment.fearGreedIndex > 75 ? 'bg-green-500' :
                          socialSentiment.fearGreedIndex > 55 ? 'bg-yellow-500' :
                          socialSentiment.fearGreedIndex > 45 ? 'bg-gray-400' :
                          socialSentiment.fearGreedIndex > 25 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${socialSentiment.fearGreedIndex}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fear</span>
                      <span>Greed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Health Dashboard */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Market Health Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {marketHealth.volatility.toFixed(1)}%
                    </div>
                    <div className="text-xs text-blue-500">Volatility</div>
                    <div className="text-xs text-muted-foreground">
                      {marketHealth.volatility > 8 ? 'High' : marketHealth.volatility > 4 ? 'Medium' : 'Low'}
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {marketHealth.liquidity.toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-500">Liquidity</div>
                    <div className="text-xs text-muted-foreground">
                      {marketHealth.liquidity > 70 ? 'High' : marketHealth.liquidity > 40 ? 'Medium' : 'Low'}
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {marketHealth.momentum > 0 ? '+' : ''}{marketHealth.momentum.toFixed(1)}%
                    </div>
                    <div className="text-xs text-purple-500">Momentum</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.abs(marketHealth.momentum) > 20 ? 'Strong' : Math.abs(marketHealth.momentum) > 10 ? 'Moderate' : 'Weak'}
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {marketHealth.stability.toFixed(1)}%
                    </div>
                    <div className="text-xs text-yellow-500">Stability</div>
                    <div className="text-xs text-muted-foreground">
                      {marketHealth.stability > 90 ? 'High' : marketHealth.stability > 80 ? 'Medium' : 'Low'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Insights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-500" />
                  Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {socialSentiment.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="p-1 bg-blue-500 rounded-full mt-0.5">
                        <Star className="h-2 w-2 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium break-words">{insight}</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 30 + 1)}m ago
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Gainers & Losers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    Top Gainers (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {topGainers.length > 0 ? (
                    topGainers.map((pair, index) => (
                      <div 
                        key={pair.symbol} 
                        className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        onClick={() => setLocation(`/trade?pair=${pair.symbol}`)}
                        data-testid={`top-gainer-${pair.symbol}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-sm">{pair.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {formatChange(pair.change24h)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              ${parseFloat(pair.price).toFixed(4)}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRiskPair(pair.symbol);
                              }}
                            >
                              <Shield className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No significant gainers found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    Top Losers (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {topLosers.length > 0 ? (
                    topLosers.map((pair, index) => (
                      <div 
                        key={pair.symbol} 
                        className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-900/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        onClick={() => setLocation(`/trade?pair=${pair.symbol}`)}
                        data-testid={`top-loser-${pair.symbol}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-sm">{pair.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">
                            {formatChange(pair.change24h)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              ${parseFloat(pair.price).toFixed(4)}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRiskPair(pair.symbol);
                              }}
                            >
                              <Shield className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No significant losers found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Volume Surge */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-purple-500" />
                  Volume Surge
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {volumeSurgePairs.map((pair, index) => (
                    <div 
                      key={pair.symbol} 
                      className="flex items-center justify-between p-2 rounded border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/trade?pair=${pair.symbol}`)}
                      data-testid={`volume-surge-${pair.symbol}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{pair.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(pair.price).toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {formatVolume(parseFloat(pair.volume24h || '0'))}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs ${parseFloat(pair.change24h || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatChange(pair.change24h)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRiskPair(pair.symbol);
                            }}
                          >
                            <Shield className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/trade" data-testid="button-start-trading">
                <Card className="cursor-pointer hover:bg-accent transition-colors bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-3 text-center">
                    <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="font-medium text-sm">Start Trading</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Open positions</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/analyzer" data-testid="button-analyze-pairs">
                <Card className="cursor-pointer hover:bg-accent transition-colors bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-3 text-center">
                    <Brain className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                    <div className="font-medium text-sm">Analyze Pairs</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">Technical analysis</div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Alert System Demo */}
            <div className="mt-6">
              <AlertDemoCreator />
            </div>
          </TabsContent>
        </Tabs>

        {/* Dynamic Risk Meter Dialog */}
        <DynamicRiskMeter
          pair={selectedRiskPair || ''}
          isOpen={!!selectedRiskPair}
          onClose={() => setSelectedRiskPair(null)}
          onNavigateToTrade={() => {
            setLocation('/trade');
            setSelectedRiskPair(null);
          }}
          onNavigateToAnalyzer={() => {
            setLocation(`/analyzer?pair=${selectedRiskPair}&autoFill=true`);
            setSelectedRiskPair(null);
          }}
        />
      </div>
    </div>
  );
}