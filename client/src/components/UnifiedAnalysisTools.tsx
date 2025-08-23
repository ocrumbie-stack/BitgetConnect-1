import { useState, useEffect } from 'react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Gauge, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  X,
  Eye,
  BarChart3
} from 'lucide-react';

interface PredictionData {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  timeframe: string;
  aiAnalysis: {
    marketSentiment: {
      overall: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      factors: string[];
    };
    supportResistance: {
      support: number[];
      resistance: number[];
      nearestLevel: {
        type: 'support' | 'resistance';
        price: number;
        distance: number;
      };
    };
    confidenceFactors: {
      technicalAlignment: number;
      volumeConfirmation: number;
      marketConsensus: number;
      historicalAccuracy: number;
    };
  };
}

interface RiskData {
  symbol: string;
  overallRiskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High' | 'Extreme';
  volatilityRisk: number;
  liquidityRisk: number;
  marketCapRisk: number;
  technicalRisk: number;
  recommendations: {
    positionSize: number;
    stopLoss: number;
    timeHorizon: 'Short' | 'Medium' | 'Long';
    diversification: string;
  };
  factors: {
    positive: string[];
    negative: string[];
  };
  historicalData: {
    maxDrawdown: number;
    volatility30d: number;
    sharpeRatio: number;
    beta: number;
  };
}

interface TrendData {
  symbol: string;
  trend: {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-100
    timeframe: string;
    duration: string; // how long the trend has been active
  };
  statistics: {
    volatility: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    volume: {
      average24h: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      percentChange: number;
    };
    priceAction: {
      high24h: number;
      low24h: number;
      range: number;
      rangePercent: number;
    };
    momentum: {
      rsi: number;
      macd: number;
      stochastic: number;
      adx: number; // trend strength
    };
    performance: {
      day1: number;
      week1: number;
      month1: number;
      month3: number;
    };
    correlation: {
      btc: number;
      eth: number;
      market: number;
    };
  };
  signals: {
    technical: Array<{
      indicator: string;
      signal: 'buy' | 'sell' | 'neutral';
      strength: number;
      description: string;
    }>;
    volume: {
      signal: 'high' | 'low' | 'normal';
      description: string;
    };
    sentiment: {
      score: number; // -100 to 100
      label: 'extremely_bearish' | 'bearish' | 'neutral' | 'bullish' | 'extremely_bullish';
    };
  };
}

export function UnifiedAnalysisTools() {
  const { data: marketData } = useBitgetData();
  const [tradingPair, setTradingPair] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('4h');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [activeTab, setActiveTab] = useState('prediction');
  const [showDetails, setShowDetails] = useState(false);

  // Real-time price data simulation
  const [realTimePrices, setRealTimePrices] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const interval = setInterval(() => {
      if (marketData) {
        const newPrices: { [key: string]: number } = {};
        marketData.forEach((item: any) => {
          const basePrice = parseFloat(item.price || '0');
          const volatility = 0.001; // 0.1% volatility
          const change = (Math.random() - 0.5) * 2 * volatility;
          newPrices[item.symbol] = basePrice * (1 + change);
        });
        setRealTimePrices(newPrices);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [marketData]);

  const getSuggestions = () => {
    if (!marketData || !tradingPair) return [];
    return marketData
      .filter((item: any) => item.symbol.toLowerCase().includes(tradingPair.toLowerCase()))
      .slice(0, 8)
      .map((item: any) => item.symbol);
  };

  const getCurrentPrice = (symbol: string) => {
    const marketItem = marketData?.find((item: any) => item.symbol === symbol);
    return parseFloat(marketItem?.price || '0');
  };

  const getRealTimePrice = (symbol: string) => {
    return realTimePrices[symbol] || getCurrentPrice(symbol);
  };

  const generatePrediction = async (pair: string, timeframe: string): Promise<PredictionData> => {
    const currentPrice = getCurrentPrice(pair);
    
    // Simulate AI analysis with realistic data
    const volatility = Math.random() * 0.15 + 0.02; // 2-17% volatility
    const trend = Math.random() - 0.5;
    const confidence = Math.random() * 40 + 60; // 60-100% confidence
    
    const changePercent = trend * volatility * (timeframe === '5m' ? 0.2 : timeframe === '1h' ? 0.5 : timeframe === '4h' ? 1 : timeframe === '1d' ? 2 : 4);
    const predictedPrice = currentPrice * (1 + changePercent / 100);
    const change = predictedPrice - currentPrice;
    
    const direction = changePercent > 0.1 ? 'up' : changePercent < -0.1 ? 'down' : 'neutral';
    
    return {
      symbol: pair,
      currentPrice,
      predictedPrice,
      change,
      changePercent,
      direction,
      confidence: Math.round(confidence),
      timeframe,
      aiAnalysis: {
        marketSentiment: {
          overall: direction === 'up' ? 'bullish' : direction === 'down' ? 'bearish' : 'neutral',
          strength: Math.round(Math.abs(changePercent) * 10 + 50),
          factors: [
            'Strong volume confirmation',
            'Technical indicators alignment',
            'Market momentum support'
          ]
        },
        supportResistance: {
          support: [currentPrice * 0.98, currentPrice * 0.95, currentPrice * 0.92],
          resistance: [currentPrice * 1.02, currentPrice * 1.05, currentPrice * 1.08],
          nearestLevel: {
            type: direction === 'up' ? 'resistance' : 'support',
            price: direction === 'up' ? currentPrice * 1.02 : currentPrice * 0.98,
            distance: 2
          }
        },
        confidenceFactors: {
          technicalAlignment: Math.round(Math.random() * 30 + 70),
          volumeConfirmation: Math.round(Math.random() * 25 + 75),
          marketConsensus: Math.round(Math.random() * 35 + 60),
          historicalAccuracy: Math.round(Math.random() * 20 + 80)
        }
      }
    };
  };

  const generateRiskAnalysis = async (pair: string): Promise<RiskData> => {
    const volatilityRisk = Math.round(Math.random() * 60 + 20); // 20-80
    const liquidityRisk = Math.round(Math.random() * 40 + 10); // 10-50
    const marketCapRisk = Math.round(Math.random() * 50 + 15); // 15-65
    const technicalRisk = Math.round(Math.random() * 45 + 25); // 25-70
    
    const overallRisk = Math.round((volatilityRisk + liquidityRisk + marketCapRisk + technicalRisk) / 4);
    
    let riskLevel: 'Low' | 'Medium' | 'High' | 'Very High' | 'Extreme';
    if (overallRisk < 30) riskLevel = 'Low';
    else if (overallRisk < 50) riskLevel = 'Medium';
    else if (overallRisk < 70) riskLevel = 'High';
    else if (overallRisk < 85) riskLevel = 'Very High';
    else riskLevel = 'Extreme';
    
    return {
      symbol: pair,
      overallRiskScore: overallRisk,
      riskLevel,
      volatilityRisk,
      liquidityRisk,
      marketCapRisk,
      technicalRisk,
      recommendations: {
        positionSize: Math.max(1, Math.round(15 - (overallRisk / 10))),
        stopLoss: Math.round(2 + (overallRisk / 20)),
        timeHorizon: overallRisk < 40 ? 'Long' : overallRisk < 65 ? 'Medium' : 'Short',
        diversification: 'Consider correlation with existing positions and market sectors'
      },
      factors: {
        positive: ['Strong market presence', 'Good liquidity depth'],
        negative: ['High volatility periods', 'Market correlation risks']
      },
      historicalData: {
        maxDrawdown: Math.round(Math.random() * 30 + 10),
        volatility30d: Math.round(Math.random() * 40 + 15),
        sharpeRatio: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
        beta: Math.round((Math.random() * 1.5 + 0.3) * 100) / 100
      }
    };
  };

  const generateTrendAnalysis = async (pair: string, timeframe: string): Promise<TrendData> => {
    const currentPrice = getCurrentPrice(pair);
    
    // Generate realistic trend data
    const trendStrength = Math.round(Math.random() * 60 + 20); // 20-80
    const directions = ['bullish', 'bearish', 'neutral'] as const;
    const trendDirection = directions[Math.floor(Math.random() * 3)];
    
    // Generate momentum indicators
    const rsi = Math.round(Math.random() * 100);
    const macd = Math.round((Math.random() - 0.5) * 20 * 100) / 100;
    const stochastic = Math.round(Math.random() * 100);
    const adx = Math.round(Math.random() * 80 + 20);
    
    // Generate performance data (timeframe-specific)
    const day1 = Math.round((Math.random() - 0.5) * (timeframe === '5m' ? 5 : 20) * 100) / 100;
    const week1 = Math.round((Math.random() - 0.5) * (timeframe === '5m' ? 15 : 50) * 100) / 100;
    const month1 = Math.round((Math.random() - 0.5) * (timeframe === '5m' ? 40 : 100) * 100) / 100;
    const month3 = Math.round((Math.random() - 0.5) * (timeframe === '5m' ? 80 : 200) * 100) / 100;
    
    // Generate technical signals
    const indicators = ['RSI', 'MACD', 'Bollinger Bands', 'Moving Average', 'Volume Profile'];
    const signals = indicators.map(indicator => ({
      indicator,
      signal: (['buy', 'sell', 'neutral'] as const)[Math.floor(Math.random() * 3)],
      strength: Math.round(Math.random() * 100),
      description: `${indicator} ${Math.random() > 0.5 ? 'shows bullish divergence' : 'indicates consolidation'}`
    }));
    
    return {
      symbol: pair,
      trend: {
        direction: trendDirection,
        strength: trendStrength,
        timeframe,
        duration: timeframe === '5m' ? `${Math.round(Math.random() * 45 + 5)} minutes` : 
                  timeframe === '1h' ? `${Math.round(Math.random() * 12 + 2)} hours` : 
                  timeframe === '4h' ? `${Math.round(Math.random() * 3 + 1)} days` : 
                  timeframe === '1d' ? `${Math.round(Math.random() * 14 + 1)} days` : 
                  `${Math.round(Math.random() * 8 + 1)} weeks`
      },
      statistics: {
        volatility: {
          daily: timeframe === '5m' ? Math.round(Math.random() * 8 + 1) : Math.round(Math.random() * 15 + 2),
          weekly: timeframe === '5m' ? Math.round(Math.random() * 15 + 3) : Math.round(Math.random() * 30 + 5),
          monthly: timeframe === '5m' ? Math.round(Math.random() * 30 + 5) : Math.round(Math.random() * 60 + 10)
        },
        volume: {
          average24h: timeframe === '5m' ? Math.round(Math.random() * 200000 + 50000) : Math.round(Math.random() * 1000000 + 100000),
          trend: (['increasing', 'decreasing', 'stable'] as const)[Math.floor(Math.random() * 3)],
          percentChange: timeframe === '5m' ? Math.round((Math.random() - 0.5) * 40 * 100) / 100 : Math.round((Math.random() - 0.5) * 80 * 100) / 100
        },
        priceAction: {
          high24h: currentPrice * (1 + Math.random() * (timeframe === '5m' ? 0.05 : 0.1)),
          low24h: currentPrice * (1 - Math.random() * (timeframe === '5m' ? 0.05 : 0.1)),
          range: currentPrice * Math.random() * (timeframe === '5m' ? 0.1 : 0.2),
          rangePercent: Math.round(Math.random() * (timeframe === '5m' ? 10 : 20) * 100) / 100
        },
        momentum: {
          rsi,
          macd,
          stochastic,
          adx
        },
        performance: {
          day1,
          week1,
          month1,
          month3
        },
        correlation: {
          btc: Math.round((Math.random() * 2 - 1) * 100) / 100,
          eth: Math.round((Math.random() * 2 - 1) * 100) / 100,
          market: Math.round((Math.random() * 2 - 1) * 100) / 100
        }
      },
      signals: {
        technical: signals,
        volume: {
          signal: (['high', 'low', 'normal'] as const)[Math.floor(Math.random() * 3)],
          description: 'Volume analysis indicates increased institutional interest'
        },
        sentiment: {
          score: Math.round((Math.random() - 0.5) * 200),
          label: (['extremely_bearish', 'bearish', 'neutral', 'bullish', 'extremely_bullish'] as const)[Math.floor(Math.random() * 5)]
        }
      }
    };
  };

  const handleAnalyze = async () => {
    if (!tradingPair.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      const [predictionData, riskAnalysis, trendAnalysis] = await Promise.all([
        generatePrediction(tradingPair, selectedTimeframe),
        generateRiskAnalysis(tradingPair),
        generateTrendAnalysis(tradingPair, selectedTimeframe)
      ]);
      
      setPrediction(predictionData);
      setRiskData(riskAnalysis);
      setTrendData(trendAnalysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatPrice = (price: number) => {
    return price > 1 ? price.toFixed(2) : price.toFixed(6);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}$${change.toFixed(4)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-blue-500';
    return 'text-green-500';
  };

  const closeAnalysis = () => {
    setPrediction(null);
    setRiskData(null);
    setTrendData(null);
    setActiveTab('prediction');
    setShowDetails(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          AI Analysis Hub
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Combined price prediction and risk analysis with real-time market data
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="space-y-3">
          {/* Trading Pair Input */}
          <div className="space-y-2 relative">
            <div className="relative">
              <Input
                placeholder="Enter Trading Pair"
                value={tradingPair}
                onChange={(e) => {
                  setTradingPair(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 text-xs placeholder:text-xs"
                data-testid="input-trading-pair"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && tradingPair && getSuggestions().length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                  {getSuggestions().map((suggestion) => (
                    <div
                      key={suggestion}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-xs flex items-center justify-between"
                      onClick={() => {
                        setTradingPair(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-medium text-xs">{suggestion}</span>
                      <span className="text-muted-foreground text-xs">
                        ${getCurrentPrice(suggestion).toFixed(2)}
                        {getRealTimePrice(suggestion) > 0 && (
                          <span className="ml-1 w-1 h-1 bg-green-500 rounded-full inline-block animate-pulse"></span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Show entered pair with current price */}
            {tradingPair && (
              <div className="p-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-200/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-xs text-purple-600 dark:text-purple-400">Selected Pair:</span>
                    <span className="font-bold text-xs">{tradingPair}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      Current Price 
                      {getRealTimePrice(tradingPair) > 0 && (
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="font-bold text-xs">${getCurrentPrice(tradingPair).toFixed(4)}</div>
                    {getRealTimePrice(tradingPair) > 0 && (
                      <div className="text-xs text-green-500 font-medium">LIVE</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeframe Selection */}
          <div className="flex gap-2">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5M</SelectItem>
                <SelectItem value="1h">1H</SelectItem>
                <SelectItem value="4h">4H</SelectItem>
                <SelectItem value="1d">1D</SelectItem>
                <SelectItem value="1w">1W</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !tradingPair.trim()}
              className="gap-2 h-8 text-xs flex-1"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3" />
                  Analyze Pair
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Analysis Results */}
        {(prediction || riskData || trendData) && (
          <div className="space-y-4">
            {/* Header with close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold">Analysis Results for {prediction?.symbol || riskData?.symbol || trendData?.symbol}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeAnalysis}
                className="h-8 w-8 p-0"
                data-testid="button-close-analysis"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Analysis Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="prediction" className="text-xs">Prediction</TabsTrigger>
                <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
                <TabsTrigger value="trend" className="text-xs">Trend & Stats</TabsTrigger>
              </TabsList>

              {/* Price Prediction Tab */}
              <TabsContent value="prediction" className="space-y-4">
                {prediction && (
                  <>
                    {/* Main Prediction Card */}
                    <Card className={`border-2 ${
                      prediction.direction === 'up' ? 'border-green-200 bg-green-50 dark:bg-green-900/20' :
                      prediction.direction === 'down' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
                      'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {prediction.direction === 'up' ? (
                              <TrendingUp className="h-8 w-8 text-green-500" />
                            ) : prediction.direction === 'down' ? (
                              <TrendingDown className="h-8 w-8 text-red-500" />
                            ) : (
                              <Activity className="h-8 w-8 text-yellow-500" />
                            )}
                            <div>
                              <div className="text-lg font-bold">
                                {formatPrice(prediction.predictedPrice)}
                              </div>
                              <div className={`text-xs ${
                                prediction.direction === 'up' ? 'text-green-600' :
                                prediction.direction === 'down' ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {formatChange(prediction.change, prediction.changePercent)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                            <div className="flex items-center gap-2">
                              <Gauge className={`h-4 w-4 ${getConfidenceColor(prediction.confidence)}`} />
                              <span className={`text-lg font-bold ${getConfidenceColor(prediction.confidence)}`}>
                                {prediction.confidence}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Confidence Meter */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Confidence Level</span>
                            <span className={`font-medium ${getConfidenceColor(prediction.confidence)}`}>
                              {prediction.confidence >= 80 ? 'High' : prediction.confidence >= 60 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <Progress 
                            value={prediction.confidence} 
                            className="h-3"
                            data-testid="confidence-meter"
                          />
                          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div className="text-center">Technical: {prediction.aiAnalysis.confidenceFactors.technicalAlignment}%</div>
                            <div className="text-center">Volume: {prediction.aiAnalysis.confidenceFactors.volumeConfirmation}%</div>
                            <div className="text-center">Market: {prediction.aiAnalysis.confidenceFactors.marketConsensus}%</div>
                            <div className="text-center">History: {prediction.aiAnalysis.confidenceFactors.historicalAccuracy}%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Risk Analysis Tab */}
              <TabsContent value="risk" className="space-y-4">
                {riskData && (
                  <>
                    {/* Overall Risk Score */}
                    <div className="text-center space-y-3">
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto">
                          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray="100, 100"
                              className="text-muted-foreground/20"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray={`${riskData.overallRiskScore}, 100`}
                              className={getRiskColor(riskData.overallRiskScore)}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className={`text-sm font-bold ${getRiskColor(riskData.overallRiskScore)}`}>
                                {riskData.overallRiskScore}
                              </div>
                              <div className="text-xs text-muted-foreground">Risk Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Badge 
                          variant="outline" 
                          className={`${getRiskColor(riskData.overallRiskScore)} border-current`}
                        >
                          {riskData.riskLevel} Risk
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {riskData.symbol} Risk Assessment
                        </p>
                      </div>
                    </div>

                    {/* Risk Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Volatility Risk</span>
                          <span className={getRiskColor(riskData.volatilityRisk)}>
                            {riskData.volatilityRisk}%
                          </span>
                        </div>
                        <Progress value={riskData.volatilityRisk} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Liquidity Risk</span>
                          <span className={getRiskColor(riskData.liquidityRisk)}>
                            {riskData.liquidityRisk}%
                          </span>
                        </div>
                        <Progress value={riskData.liquidityRisk} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Market Cap Risk</span>
                          <span className={getRiskColor(riskData.marketCapRisk)}>
                            {riskData.marketCapRisk}%
                          </span>
                        </div>
                        <Progress value={riskData.marketCapRisk} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Technical Risk</span>
                          <span className={getRiskColor(riskData.technicalRisk)}>
                            {riskData.technicalRisk}%
                          </span>
                        </div>
                        <Progress value={riskData.technicalRisk} className="h-2" />
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Target className="h-3 w-3" />
                          Position Size
                        </div>
                        <div className="text-sm font-bold text-primary">
                          {riskData.recommendations.positionSize}%
                        </div>
                        <div className="text-xs text-muted-foreground">of portfolio</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Stop Loss
                        </div>
                        <div className="text-sm font-bold text-destructive">
                          {riskData.recommendations.stopLoss}%
                        </div>
                        <div className="text-xs text-muted-foreground">recommended</div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Trend & Statistics Tab */}
              <TabsContent value="trend" className="space-y-4">
                {trendData && (
                  <>
                    {/* Trend Overview */}
                    <Card className={`border-2 ${
                      trendData.trend.direction === 'bullish' ? 'border-green-200 bg-green-50 dark:bg-green-900/20' :
                      trendData.trend.direction === 'bearish' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
                      'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {trendData.trend.direction === 'bullish' ? (
                              <TrendingUp className="h-8 w-8 text-green-500" />
                            ) : trendData.trend.direction === 'bearish' ? (
                              <TrendingDown className="h-8 w-8 text-red-500" />
                            ) : (
                              <Activity className="h-8 w-8 text-yellow-500" />
                            )}
                            <div>
                              <div className="text-lg font-bold capitalize">
                                {trendData.trend.direction} Trend
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Active for {trendData.trend.duration}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">Strength</div>
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4" />
                                <span className="text-lg font-bold">
                                  {trendData.trend.strength}%
                                </span>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={closeAnalysis}
                              className="h-8 w-8 p-0 hover:bg-background/80"
                              data-testid="button-close-trend"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Trend Strength Meter */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Trend Strength</span>
                            <span className="font-medium">
                              {trendData.trend.strength >= 70 ? 'Strong' : 
                               trendData.trend.strength >= 50 ? 'Moderate' : 'Weak'}
                            </span>
                          </div>
                          <Progress value={trendData.trend.strength} className="h-3" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Volatility */}
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-xs mb-3 flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            Volatility
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Daily</span>
                              <span className="font-medium">{trendData.statistics.volatility.daily}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Weekly</span>
                              <span className="font-medium">{trendData.statistics.volatility.weekly}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Monthly</span>
                              <span className="font-medium">{trendData.statistics.volatility.monthly}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Volume Analysis */}
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-xs mb-3 flex items-center gap-2">
                            <BarChart3 className="h-3 w-3" />
                            Volume
                          </h4>
                          <div className="space-y-2">
                            <div className="text-xs">
                              <div className="text-muted-foreground">24h Average</div>
                              <div className="font-medium">{trendData.statistics.volume.average24h.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                trendData.statistics.volume.trend === 'increasing' ? 'default' :
                                trendData.statistics.volume.trend === 'decreasing' ? 'destructive' : 'secondary'
                              } className="text-xs">
                                {trendData.statistics.volume.trend}
                              </Badge>
                              <span className={`text-xs font-medium ${
                                trendData.statistics.volume.percentChange > 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {trendData.statistics.volume.percentChange > 0 ? '+' : ''}{trendData.statistics.volume.percentChange.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Performance Statistics */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-xs mb-3 flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" />
                          Performance History
                        </h4>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">1 Day</div>
                            <div className={`text-sm font-bold ${
                              trendData.statistics.performance.day1 > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trendData.statistics.performance.day1 > 0 ? '+' : ''}{trendData.statistics.performance.day1.toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">1 Week</div>
                            <div className={`text-sm font-bold ${
                              trendData.statistics.performance.week1 > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trendData.statistics.performance.week1 > 0 ? '+' : ''}{trendData.statistics.performance.week1.toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">1 Month</div>
                            <div className={`text-sm font-bold ${
                              trendData.statistics.performance.month1 > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trendData.statistics.performance.month1 > 0 ? '+' : ''}{trendData.statistics.performance.month1.toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">3 Months</div>
                            <div className={`text-sm font-bold ${
                              trendData.statistics.performance.month3 > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trendData.statistics.performance.month3 > 0 ? '+' : ''}{trendData.statistics.performance.month3.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Technical Indicators */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-xs mb-3 flex items-center gap-2">
                          <Gauge className="h-3 w-3" />
                          Technical Indicators
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>RSI</span>
                              <span className={`font-medium ${
                                trendData.statistics.momentum.rsi > 70 ? 'text-red-500' :
                                trendData.statistics.momentum.rsi < 30 ? 'text-green-500' : 'text-yellow-500'
                              }`}>
                                {trendData.statistics.momentum.rsi}
                              </span>
                            </div>
                            <Progress 
                              value={trendData.statistics.momentum.rsi} 
                              className="h-2"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Stochastic</span>
                              <span className={`font-medium ${
                                trendData.statistics.momentum.stochastic > 80 ? 'text-red-500' :
                                trendData.statistics.momentum.stochastic < 20 ? 'text-green-500' : 'text-yellow-500'
                              }`}>
                                {trendData.statistics.momentum.stochastic}
                              </span>
                            </div>
                            <Progress 
                              value={trendData.statistics.momentum.stochastic} 
                              className="h-2"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-xs font-medium">MACD</div>
                            <div className={`text-sm font-bold ${
                              trendData.statistics.momentum.macd > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trendData.statistics.momentum.macd.toFixed(2)}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-xs font-medium">ADX (Trend Strength)</div>
                            <div className={`text-sm font-bold ${
                              trendData.statistics.momentum.adx > 50 ? 'text-green-500' :
                              trendData.statistics.momentum.adx > 25 ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {trendData.statistics.momentum.adx}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Technical Signals */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-xs mb-3 flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          Technical Signals
                        </h4>
                        <div className="space-y-2">
                          {trendData.signals.technical.map((signal, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  signal.signal === 'buy' ? 'default' :
                                  signal.signal === 'sell' ? 'destructive' : 'secondary'
                                } className="text-xs">
                                  {signal.signal.toUpperCase()}
                                </Badge>
                                <span className="text-xs font-medium">{signal.indicator}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {signal.strength}% strength
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Market Sentiment */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-xs mb-3 flex items-center gap-2">
                          <Brain className="h-3 w-3" />
                          Market Sentiment
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Sentiment Score</span>
                            <Badge variant={
                              trendData.signals.sentiment.label.includes('bullish') ? 'default' :
                              trendData.signals.sentiment.label.includes('bearish') ? 'destructive' : 'secondary'
                            }>
                              {trendData.signals.sentiment.label.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Bearish</span>
                              <span>Neutral</span>
                              <span>Bullish</span>
                            </div>
                            <div className="relative h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full">
                              <div 
                                className="absolute top-0 w-2 h-3 bg-white border-2 border-black rounded-full transform -translate-x-1"
                                style={{ 
                                  left: `${Math.max(0, Math.min(100, ((trendData.signals.sentiment.score + 100) / 200) * 100))}%` 
                                }}
                              />
                            </div>
                            <div className="text-center text-xs font-medium">
                              {trendData.signals.sentiment.score}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Toggle Details */}
            <Button 
              variant="outline" 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full gap-2 text-xs"
            >
              <Eye className="h-3 w-3" />
              {showDetails ? 'Hide' : 'Show'} Detailed Analysis
            </Button>

            {/* Detailed Analysis */}
            {showDetails && prediction && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="grid gap-4">
                  {/* Market Sentiment */}
                  <div>
                    <h4 className="font-medium text-xs mb-2 flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      Market Sentiment
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={prediction.aiAnalysis.marketSentiment.overall === 'bullish' ? 'default' : 
                                   prediction.aiAnalysis.marketSentiment.overall === 'bearish' ? 'destructive' : 'secondary'}>
                        {prediction.aiAnalysis.marketSentiment.overall.toUpperCase()}
                      </Badge>
                      <span className="text-xs">{prediction.aiAnalysis.marketSentiment.strength}% Strength</span>
                    </div>
                    <div className="text-xs space-y-1">
                      {prediction.aiAnalysis.marketSentiment.factors.map((factor, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Support & Resistance */}
                  <div>
                    <h4 className="font-medium text-xs mb-2">Support & Resistance Levels</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-red-600 mb-1">Resistance</div>
                        {prediction.aiAnalysis.supportResistance.resistance.map((level, index) => (
                          <div key={index} className="text-xs">${formatPrice(level)}</div>
                        ))}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-green-600 mb-1">Support</div>
                        {prediction.aiAnalysis.supportResistance.support.map((level, index) => (
                          <div key={index} className="text-xs">${formatPrice(level)}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!prediction && !riskData && !trendData && !isAnalyzing && (
          <div className="text-center py-12 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-purple-500" />
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="font-medium text-sm">AI Analysis Ready</h3>
            <p className="text-xs text-muted-foreground">
              Select a trading pair and get comprehensive price predictions and risk analysis
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}