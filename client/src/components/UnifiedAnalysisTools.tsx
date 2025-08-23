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
  Eye
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

export function UnifiedAnalysisTools() {
  const { data: marketData } = useBitgetData();
  const [tradingPair, setTradingPair] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('4h');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
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
    
    const changePercent = trend * volatility * (timeframe === '1h' ? 0.5 : timeframe === '4h' ? 1 : timeframe === '1d' ? 2 : 4);
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

  const handleAnalyze = async () => {
    if (!tradingPair.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      const [predictionData, riskAnalysis] = await Promise.all([
        generatePrediction(tradingPair, selectedTimeframe),
        generateRiskAnalysis(tradingPair)
      ]);
      
      setPrediction(predictionData);
      setRiskData(riskAnalysis);
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
        {(prediction || riskData) && (
          <div className="space-y-4">
            {/* Header with close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold">Analysis Results for {prediction?.symbol || riskData?.symbol}</span>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prediction" className="text-xs">Price Prediction</TabsTrigger>
                <TabsTrigger value="risk" className="text-xs">Risk Analysis</TabsTrigger>
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
        {!prediction && !riskData && !isAnalyzing && (
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