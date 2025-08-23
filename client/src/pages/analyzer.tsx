import { useState } from 'react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Activity, BarChart3, Search, Brain, ArrowUp, ArrowDown, Minus, Gauge, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { UnifiedAnalysisTools } from '@/components/UnifiedAnalysisTools';


interface TechnicalAnalysis {
  trend: 'uptrend' | 'downtrend' | 'sideways';
  strength: number;
  support: number;
  resistance: number;
  entry: {
    type: 'long' | 'short' | 'wait';
    price: number;
    confidence: number;
    reason: string;
  };
  exit: {
    target: number;
    stopLoss: number;
    riskReward: number;
  };
  signals: string[];
  timeframe: string;
  momentum: 'bullish' | 'bearish' | 'neutral';
}

export function Analyzer() {
  const { data, isLoading } = useBitgetData();
  const [, setLocation] = useLocation();
  const [selectedPair, setSelectedPair] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState('4h');

  const filteredPairs = data?.filter(pair => 
    pair.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10) || [];

  const analyzePair = (pair: any, selectedTimeframe: string): TechnicalAnalysis => {
    const price = parseFloat(pair.price || '0');
    const change24h = parseFloat(pair.change24h || '0');
    const volume24h = parseFloat(pair.volume24h || '0');
    
    // Timeframe-specific analysis adjustments
    const timeframeMultipliers = {
      '1h': { sensitivity: 2.5, volatility: 1.8, confidence: 0.7 },
      '4h': { sensitivity: 1.5, volatility: 1.2, confidence: 1.0 },
      '1d': { sensitivity: 1.0, volatility: 1.0, confidence: 1.2 },
      '1w': { sensitivity: 0.6, volatility: 0.8, confidence: 1.5 }
    };
    
    const multiplier = timeframeMultipliers[selectedTimeframe as keyof typeof timeframeMultipliers] || timeframeMultipliers['4h'];
    
    // Technical Analysis Calculations with timeframe considerations
    const absChange = Math.abs(change24h);
    const adjustedChange = change24h * multiplier.sensitivity;
    const adjustedAbsChange = Math.abs(adjustedChange);
    
    let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';
    let strength = 0;
    let momentum: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    // Timeframe-adjusted trend detection
    const bullishThreshold = selectedTimeframe === '1h' ? 0.015 : selectedTimeframe === '4h' ? 0.03 : selectedTimeframe === '1d' ? 0.05 : 0.08;
    const bearishThreshold = -bullishThreshold;
    
    if (adjustedChange > bullishThreshold) {
      trend = 'uptrend';
      strength = Math.min(100, adjustedAbsChange * 300 * multiplier.sensitivity);
      momentum = 'bullish';
    } else if (adjustedChange < bearishThreshold) {
      trend = 'downtrend';
      strength = Math.min(100, adjustedAbsChange * 300 * multiplier.sensitivity);
      momentum = 'bearish';
    } else {
      trend = 'sideways';
      strength = 25 + (Math.random() * 25);
      momentum = 'neutral';
    }
    
    // Support and Resistance Levels (adjusted for timeframe)
    const volatility = adjustedAbsChange * multiplier.volatility;
    const supportResistanceRange = selectedTimeframe === '1h' ? 0.008 : selectedTimeframe === '4h' ? 0.015 : selectedTimeframe === '1d' ? 0.025 : 0.04;
    const support = price * (1 - (volatility + supportResistanceRange));
    const resistance = price * (1 + (volatility + supportResistanceRange));
    
    // Entry Signal Analysis
    let entryType: 'long' | 'short' | 'wait' = 'wait';
    let entryPrice = price;
    let confidence = 50 * multiplier.confidence;
    let reason = `${selectedTimeframe} consolidation - waiting for clear signal`;
    
    const signals: string[] = [];
    
    // Timeframe-specific signals
    if (selectedTimeframe === '1h') {
      signals.push('Short-term scalping opportunities');
    } else if (selectedTimeframe === '4h') {
      signals.push('Intraday swing trading setup');
    } else if (selectedTimeframe === '1d') {
      signals.push('Daily trend analysis');
    } else {
      signals.push('Weekly trend confirmation');
    }
    
    // Volume Analysis (adjusted for timeframe)
    const volumeThresholds = {
      high: selectedTimeframe === '1h' ? 3000000 : selectedTimeframe === '4h' ? 5000000 : 8000000,
      medium: selectedTimeframe === '1h' ? 800000 : selectedTimeframe === '4h' ? 1000000 : 2000000
    };
    
    const volumeStrength = volume24h > volumeThresholds.high ? 'high' : volume24h > volumeThresholds.medium ? 'medium' : 'low';
    if (volumeStrength === 'high') {
      signals.push(`High ${selectedTimeframe} volume confirmation`);
      confidence += 15 * multiplier.confidence;
    } else if (volumeStrength === 'low') {
      signals.push(`Low ${selectedTimeframe} volume - weak signal`);
      confidence -= 10;
    }
    
    // Momentum Signals (timeframe-adjusted thresholds)
    const strongMomentumThreshold = selectedTimeframe === '1h' ? 0.025 : selectedTimeframe === '4h' ? 0.05 : selectedTimeframe === '1d' ? 0.08 : 0.12;
    const moderateMomentumThreshold = selectedTimeframe === '1h' ? 0.01 : selectedTimeframe === '4h' ? 0.02 : selectedTimeframe === '1d' ? 0.04 : 0.06;
    
    if (adjustedAbsChange > strongMomentumThreshold) {
      if (adjustedChange > 0) {
        entryType = 'long';
        reason = `Strong ${selectedTimeframe} bullish momentum`;
        signals.push(`${selectedTimeframe} bullish breakout`);
        confidence += 25 * multiplier.confidence;
      } else {
        entryType = 'short';
        reason = `Strong ${selectedTimeframe} bearish momentum`;
        signals.push(`${selectedTimeframe} bearish breakdown`);
        confidence += 25 * multiplier.confidence;
      }
    } else if (adjustedAbsChange > moderateMomentumThreshold) {
      if (adjustedChange > 0) {
        entryType = 'long';
        reason = `Moderate ${selectedTimeframe} bullish trend`;
        signals.push(`${selectedTimeframe} trend continuation`);
        confidence += 15 * multiplier.confidence;
      } else {
        entryType = 'short';
        reason = `Moderate ${selectedTimeframe} bearish trend`;
        signals.push(`${selectedTimeframe} downtrend continuation`);
        confidence += 15 * multiplier.confidence;
      }
    }
    
    // Oversold/Overbought Detection (timeframe-specific)
    const oversoldThreshold = selectedTimeframe === '1h' ? -0.05 : selectedTimeframe === '4h' ? -0.10 : selectedTimeframe === '1d' ? -0.15 : -0.25;
    const overboughtThreshold = selectedTimeframe === '1h' ? 0.05 : selectedTimeframe === '4h' ? 0.15 : selectedTimeframe === '1d' ? 0.20 : 0.30;
    
    if (adjustedChange < oversoldThreshold) {
      signals.push(`${selectedTimeframe} oversold - reversal opportunity`);
      if (entryType === 'wait') {
        entryType = 'long';
        reason = `${selectedTimeframe} oversold bounce opportunity`;
        confidence = 65 * multiplier.confidence;
      }
    } else if (adjustedChange > overboughtThreshold) {
      signals.push(`${selectedTimeframe} overbought - correction risk`);
      if (entryType === 'long') {
        confidence -= 15;
        reason += ` - but ${selectedTimeframe} overbought`;
      }
    }
    
    // Risk Management (timeframe-adjusted)
    const stopLossDistance = selectedTimeframe === '1h' ? (volatility > 0.02 ? 0.03 : 0.02) :
                             selectedTimeframe === '4h' ? (volatility > 0.05 ? 0.08 : 0.05) :
                             selectedTimeframe === '1d' ? (volatility > 0.08 ? 0.12 : 0.08) :
                             (volatility > 0.12 ? 0.18 : 0.12);
                             
    const targetDistance = stopLossDistance * (selectedTimeframe === '1h' ? 1.5 : selectedTimeframe === '4h' ? 2.0 : selectedTimeframe === '1d' ? 2.5 : 3.0);
    
    const exit = {
      target: entryType === 'long' 
        ? price * (1 + targetDistance)
        : price * (1 - targetDistance),
      stopLoss: entryType === 'long'
        ? price * (1 - stopLossDistance)
        : price * (1 + stopLossDistance),
      riskReward: targetDistance / stopLossDistance
    };
    
    // Adjust confidence based on timeframe reliability
    confidence = Math.max(20, Math.min(95, confidence));
    
    return {
      trend,
      strength,
      support,
      resistance,
      entry: {
        type: entryType,
        price: entryPrice,
        confidence,
        reason
      },
      exit,
      signals: signals.slice(0, 4),
      timeframe: selectedTimeframe,
      momentum
    };
  };

  const selectedPairData = data?.find(pair => pair.symbol === selectedPair);
  const analysis = selectedPairData ? analyzePair(selectedPairData, timeframe) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <h1 className="text-lg font-semibold text-foreground mb-2">Pair Analyzer</h1>
        <p className="text-sm text-muted-foreground">Advanced technical analysis and trading recommendations</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Unified AI Analysis Tools */}
        <UnifiedAnalysisTools />

        {/* Pair Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Trend and Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Trading Pair"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                data-testid="input-pair-search"
              />
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1H</SelectItem>
                  <SelectItem value="4h">4H</SelectItem>
                  <SelectItem value="1d">1D</SelectItem>
                  <SelectItem value="1w">1W</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {searchQuery && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Available Pairs:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {filteredPairs.map((pair) => (
                    <Button
                      key={pair.symbol}
                      variant={selectedPair === pair.symbol ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPair(pair.symbol)}
                      className="justify-between"
                      data-testid={`button-select-${pair.symbol}`}
                    >
                      <span>{pair.symbol}</span>
                      <Badge variant={parseFloat(pair.change24h || '0') >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {((parseFloat(pair.change24h || '0')) * 100).toFixed(2)}%
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {selectedPairData && analysis && (
          <div className="space-y-4">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    {selectedPair} Analysis
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {timeframe} Timeframe
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPair('')}
                      className="h-8 w-8 p-0 hover:bg-background/80"
                      data-testid="button-close-analysis"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">${parseFloat(selectedPairData.price).toFixed(4)}</div>
                    <div className={`text-sm ${parseFloat(selectedPairData.change24h || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {((parseFloat(selectedPairData.change24h || '0')) * 100).toFixed(2)}% (24h)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{analysis.strength.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Trend Strength</div>
                  </div>
                </div>

                {/* Trend Indicator */}
                <div className="flex items-center justify-center mb-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    analysis.trend === 'uptrend' ? 'bg-green-100 text-green-700' :
                    analysis.trend === 'downtrend' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {analysis.trend === 'uptrend' && <TrendingUp className="h-4 w-4" />}
                    {analysis.trend === 'downtrend' && <TrendingDown className="h-4 w-4" />}
                    {analysis.trend === 'sideways' && <Minus className="h-4 w-4" />}
                    <span className="font-medium capitalize">{analysis.trend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support & Resistance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Key Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Resistance</span>
                    </div>
                    <span className="font-mono text-sm">${analysis.resistance.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Current Price</span>
                    </div>
                    <span className="font-mono text-sm">${parseFloat(selectedPairData.price).toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Support</span>
                    </div>
                    <span className="font-mono">${analysis.support.toFixed(4)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trading Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Trading Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Entry Signal */}
                  <div className="p-4 rounded-lg border bg-accent/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={analysis.entry.type === 'long' ? 'default' : analysis.entry.type === 'short' ? 'destructive' : 'secondary'}
                          className="uppercase"
                        >
                          {analysis.entry.type === 'wait' ? 'Hold' : analysis.entry.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Confidence: {analysis.entry.confidence}%
                        </span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => setLocation(`/trade?pair=${selectedPair}`)}
                        disabled={analysis.entry.type === 'wait'}
                        data-testid="button-execute-trade"
                      >
                        Execute Trade
                      </Button>
                    </div>
                    <p className="text-sm">{analysis.entry.reason}</p>
                  </div>

                  {/* Risk Management */}
                  {analysis.entry.type !== 'wait' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Exit Strategy</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Target:</span>
                            <span className="font-mono">${analysis.exit.target.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stop Loss:</span>
                            <span className="font-mono">${analysis.exit.stopLoss.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risk/Reward:</span>
                            <span className="font-medium">1:{analysis.exit.riskReward.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Momentum</h4>
                        <div className="flex items-center gap-2">
                          {analysis.momentum === 'bullish' && <TrendingUp className="h-4 w-4 text-green-500" />}
                          {analysis.momentum === 'bearish' && <TrendingDown className="h-4 w-4 text-red-500" />}
                          {analysis.momentum === 'neutral' && <Activity className="h-4 w-4 text-gray-500" />}
                          <span className={`capitalize font-medium ${
                            analysis.momentum === 'bullish' ? 'text-green-500' :
                            analysis.momentum === 'bearish' ? 'text-red-500' :
                            'text-gray-500'
                          }`}>
                            {analysis.momentum}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Technical Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Technical Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.signals.map((signal, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded bg-accent/30">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm">{signal}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Analysis for Popular Pairs */}
        {!selectedPair && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Analysis - Popular Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.slice(0, 5).map((pair) => {
                  const quickAnalysis = analyzePair(pair);
                  return (
                    <div 
                      key={pair.symbol} 
                      className="flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-accent/50"
                      onClick={() => setSelectedPair(pair.symbol)}
                      data-testid={`quick-analysis-${pair.symbol}`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{pair.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(pair.price).toFixed(4)}
                          </div>
                        </div>
                        <Badge 
                          variant={quickAnalysis.entry.type === 'long' ? 'default' : quickAnalysis.entry.type === 'short' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {quickAnalysis.entry.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {quickAnalysis.entry.confidence}% confidence
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {quickAnalysis.trend}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}