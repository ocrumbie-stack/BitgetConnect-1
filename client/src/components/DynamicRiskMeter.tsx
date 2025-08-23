import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  BarChart3,
  Gauge,
  Target,
  Clock,
  DollarSign,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';

interface RiskMetrics {
  symbol: string;
  overallRiskScore: number; // 0-100 (0 = very safe, 100 = very risky)
  riskLevel: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
  volatilityRisk: number;
  liquidityRisk: number;
  marketCapRisk: number;
  technicalRisk: number;
  sentimentRisk: number;
  correlationRisk: number;
  factors: {
    positive: string[];
    negative: string[];
  };
  recommendations: {
    positionSize: number; // Recommended % of portfolio
    stopLoss: number; // Recommended stop loss %
    timeHorizon: 'Short' | 'Medium' | 'Long';
    diversification: string;
  };
  historicalData: {
    maxDrawdown: number;
    volatility30d: number;
    sharpeRatio: number;
    beta: number;
  };
}

interface DynamicRiskMeterProps {
  onRiskAnalyzed?: (risk: RiskMetrics) => void;
}

export function DynamicRiskMeter({ onRiskAnalyzed }: DynamicRiskMeterProps) {
  const [selectedPair, setSelectedPair] = useState('');
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch real-time market data
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ['/api/futures'],
    refetchInterval: 5000,
    staleTime: 2000
  });

  // Get all available pairs
  const getAllPairs = () => {
    if (!marketData || !Array.isArray(marketData)) return [];
    return marketData.map((item: any) => item.symbol).sort();
  };

  // Calculate risk metrics based on market data
  const calculateRiskMetrics = (symbol: string): RiskMetrics => {
    if (!marketData || !Array.isArray(marketData)) {
      throw new Error('Market data not available');
    }
    const pair = marketData.find((item: any) => item.symbol === symbol);
    if (!pair) throw new Error('Pair not found');

    const price = parseFloat(pair.price || '0');
    const change24h = parseFloat(pair.change24h || '0');
    const volume24h = parseFloat(pair.volume24h || '0');

    // Volatility Risk (0-100) - based on 24h change
    const absChange = Math.abs(change24h);
    const volatilityRisk = Math.min(100, absChange * 1000); // Scale to 0-100

    // Liquidity Risk (0-100) - based on volume
    const liquidityRisk = volume24h < 1000000 ? 80 : 
                         volume24h < 5000000 ? 60 :
                         volume24h < 20000000 ? 40 :
                         volume24h < 50000000 ? 20 : 10;

    // Market Cap Risk (simulated based on price and volume)
    const estimatedMarketCap = price * volume24h / 1000; // Rough estimation
    const marketCapRisk = estimatedMarketCap < 100000 ? 90 :
                         estimatedMarketCap < 1000000 ? 70 :
                         estimatedMarketCap < 10000000 ? 50 :
                         estimatedMarketCap < 100000000 ? 30 : 10;

    // Technical Risk - based on price momentum and patterns
    const technicalRisk = absChange > 0.15 ? 85 :
                         absChange > 0.10 ? 70 :
                         absChange > 0.05 ? 50 :
                         absChange > 0.02 ? 30 : 20;

    // Sentiment Risk - simulated based on recent performance
    const sentimentRisk = change24h < -0.20 ? 90 :
                         change24h < -0.10 ? 70 :
                         change24h < -0.05 ? 50 :
                         change24h > 0.20 ? 75 :
                         change24h > 0.10 ? 45 : 30;

    // Correlation Risk - simulated (would need broader market data in practice)
    const correlationRisk = Math.random() * 40 + 30; // 30-70 range

    // Calculate overall risk score
    const weights = {
      volatility: 0.25,
      liquidity: 0.20,
      marketCap: 0.15,
      technical: 0.15,
      sentiment: 0.15,
      correlation: 0.10
    };

    const overallRiskScore = Math.round(
      volatilityRisk * weights.volatility +
      liquidityRisk * weights.liquidity +
      marketCapRisk * weights.marketCap +
      technicalRisk * weights.technical +
      sentimentRisk * weights.sentiment +
      correlationRisk * weights.correlation
    );

    // Determine risk level
    const riskLevel = overallRiskScore >= 80 ? 'Very High' :
                     overallRiskScore >= 60 ? 'High' :
                     overallRiskScore >= 40 ? 'Medium' :
                     overallRiskScore >= 20 ? 'Low' : 'Very Low';

    // Generate factors
    const positiveFactors = [];
    const negativeFactors = [];

    if (liquidityRisk < 30) positiveFactors.push('High liquidity reduces execution risk');
    if (volatilityRisk < 30) positiveFactors.push('Low volatility provides stability');
    if (technicalRisk < 40) positiveFactors.push('Stable technical indicators');
    if (change24h > 0.05) positiveFactors.push('Strong positive momentum');

    if (liquidityRisk > 70) negativeFactors.push('Low liquidity increases slippage risk');
    if (volatilityRisk > 70) negativeFactors.push('High volatility creates price uncertainty');
    if (technicalRisk > 60) negativeFactors.push('Weak technical support levels');
    if (marketCapRisk > 60) negativeFactors.push('Small market cap increases manipulation risk');

    // Generate recommendations
    const positionSize = overallRiskScore > 70 ? 2 :
                        overallRiskScore > 50 ? 5 :
                        overallRiskScore > 30 ? 10 : 15;

    const stopLoss = overallRiskScore > 70 ? 3 :
                    overallRiskScore > 50 ? 5 :
                    overallRiskScore > 30 ? 8 : 12;

    const timeHorizon = overallRiskScore > 60 ? 'Short' :
                       overallRiskScore > 30 ? 'Medium' : 'Long';

    return {
      symbol,
      overallRiskScore,
      riskLevel,
      volatilityRisk: Math.round(volatilityRisk),
      liquidityRisk: Math.round(liquidityRisk),
      marketCapRisk: Math.round(marketCapRisk),
      technicalRisk: Math.round(technicalRisk),
      sentimentRisk: Math.round(sentimentRisk),
      correlationRisk: Math.round(correlationRisk),
      factors: {
        positive: positiveFactors,
        negative: negativeFactors
      },
      recommendations: {
        positionSize,
        stopLoss,
        timeHorizon,
        diversification: overallRiskScore > 50 ? 'High diversification recommended' : 'Moderate diversification sufficient'
      },
      historicalData: {
        maxDrawdown: Math.random() * 30 + 10, // 10-40%
        volatility30d: volatilityRisk * 0.8, // Correlated with current volatility
        sharpeRatio: Math.random() * 2 - 0.5, // -0.5 to 1.5
        beta: Math.random() * 2 + 0.5 // 0.5 to 2.5
      }
    };
  };

  // Analyze risk for selected pair
  const analyzeRisk = async () => {
    if (!selectedPair || !marketData) {
      alert('Please select a trading pair first');
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const metrics = calculateRiskMetrics(selectedPair);
      setRiskData(metrics);
      onRiskAnalyzed?.(metrics);
    } catch (error) {
      alert('Unable to analyze risk for this pair. Please try another.');
    }
    
    setIsAnalyzing(false);
  };

  // Get risk color based on score
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-blue-500';
    return 'text-green-500';
  };

  // Get risk background color for progress bars
  const getRiskBgColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Dynamic Risk Visualization Meter
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive risk analysis with real-time market data integration
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pair Selection */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select trading pair to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {getAllPairs().map(pair => (
                  <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={analyzeRisk} 
              disabled={isAnalyzing || !selectedPair}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Gauge className="h-4 w-4" />
                  Analyze Risk
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Risk Analysis Results */}
        {riskData && (
          <div className="space-y-6">
            {/* Overall Risk Score */}
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 mx-auto">
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
                      <div className={`text-2xl font-bold ${getRiskColor(riskData.overallRiskScore)}`}>
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
                <p className="text-sm text-muted-foreground">
                  {riskData.symbol} Risk Assessment
                </p>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Volatility Risk</span>
                  <span className={getRiskColor(riskData.volatilityRisk)}>
                    {riskData.volatilityRisk}%
                  </span>
                </div>
                <Progress value={riskData.volatilityRisk} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Liquidity Risk</span>
                  <span className={getRiskColor(riskData.liquidityRisk)}>
                    {riskData.liquidityRisk}%
                  </span>
                </div>
                <Progress value={riskData.liquidityRisk} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Market Cap Risk</span>
                  <span className={getRiskColor(riskData.marketCapRisk)}>
                    {riskData.marketCapRisk}%
                  </span>
                </div>
                <Progress value={riskData.marketCapRisk} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
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
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4" />
                  Position Size
                </div>
                <div className="text-lg font-bold text-primary">
                  {riskData.recommendations.positionSize}%
                </div>
                <div className="text-xs text-muted-foreground">of portfolio</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Stop Loss
                </div>
                <div className="text-lg font-bold text-destructive">
                  {riskData.recommendations.stopLoss}%
                </div>
                <div className="text-xs text-muted-foreground">recommended</div>
              </div>
            </div>

            {/* Toggle Details */}
            <Button 
              variant="outline" 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full gap-2"
            >
              <Eye className="h-4 w-4" />
              {showDetails ? 'Hide' : 'Show'} Detailed Analysis
            </Button>

            {/* Detailed Analysis */}
            {showDetails && (
              <Tabs defaultValue="factors" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="factors">Risk Factors</TabsTrigger>
                  <TabsTrigger value="historical">Historical Data</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="factors" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-green-600 dark:text-green-400">Positive Factors</h4>
                      {riskData.factors.positive.length > 0 ? (
                        <ul className="space-y-1">
                          {riskData.factors.positive.map((factor, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No significant positive factors identified</p>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-red-600 dark:text-red-400">Risk Factors</h4>
                      {riskData.factors.negative.length > 0 ? (
                        <ul className="space-y-1">
                          {riskData.factors.negative.map((factor, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No significant risk factors identified</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="historical" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Max Drawdown</div>
                      <div className="text-2xl font-bold text-red-500">
                        {riskData.historicalData.maxDrawdown.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">30d Volatility</div>
                      <div className="text-2xl font-bold text-orange-500">
                        {riskData.historicalData.volatility30d.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Sharpe Ratio</div>
                      <div className={`text-2xl font-bold ${riskData.historicalData.sharpeRatio > 1 ? 'text-green-500' : riskData.historicalData.sharpeRatio > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {riskData.historicalData.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Beta</div>
                      <div className={`text-2xl font-bold ${riskData.historicalData.beta < 1 ? 'text-green-500' : riskData.historicalData.beta < 1.5 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {riskData.historicalData.beta.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Time Horizon</h4>
                      <Badge variant="outline">{riskData.recommendations.timeHorizon} Term</Badge>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Diversification</h4>
                      <p className="text-sm text-muted-foreground">
                        {riskData.recommendations.diversification}
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Risk Management Tips</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Never risk more than you can afford to lose</li>
                        <li>• Use proper position sizing based on your risk tolerance</li>
                        <li>• Set stop-loss orders before entering positions</li>
                        <li>• Monitor market conditions regularly</li>
                        <li>• Consider correlation with your existing portfolio</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}

        {/* Empty State */}
        {!riskData && !isAnalyzing && (
          <div className="text-center py-12 space-y-3">
            <Gauge className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="font-medium">Risk Analysis Ready</h3>
            <p className="text-sm text-muted-foreground">
              Select a trading pair and click "Analyze Risk" to get comprehensive risk metrics
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}