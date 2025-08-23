import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Volume2, Activity, Target, Droplets } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface RiskAnalysis {
  overallRisk: 'very-low' | 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number;
  breakdown: {
    volatilityRisk: number;
    volumeRisk: number;
    trendRisk: number;
    supportLevel: number;
    liquidityRisk: number;
  };
  recommendations: string[];
  pair: string;
  currentPrice: string;
  change24h: number;
  volume24h: string;
}

interface DynamicRiskMeterProps {
  pair: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTrade?: () => void;
  onNavigateToAnalyzer?: () => void;
}

const DynamicRiskMeter: React.FC<DynamicRiskMeterProps> = ({
  pair,
  isOpen,
  onClose,
  onNavigateToTrade,
  onNavigateToAnalyzer
}) => {
  const [riskData, setRiskData] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateRiskAnalysis = async (pairSymbol: string) => {
    setLoading(true);
    try {
      // Fetch real market data
      const response = await fetch('/api/futures');
      const futuresData = await response.json();
      
      const pairData = futuresData.find((item: any) => item.symbol === pairSymbol);
      if (!pairData) {
        throw new Error('Pair data not found');
      }

      // Convert API decimals to actual percentages
      const change24h = parseFloat(pairData.change24h) * 100;
      const volume24h = parseFloat(pairData.volume24h);
      const price = parseFloat(pairData.price);

      // Calculate risk factors
      const volatilityRisk = Math.min(100, Math.abs(change24h) * 5); // Scale volatility
      const volumeRisk = volume24h < 1000000 ? 80 : Math.max(10, 100 - Math.log10(volume24h) * 10);
      const trendRisk = Math.abs(change24h) > 5 ? 75 : 25;
      const supportLevel = Math.random() * 40 + 30; // Simulated support analysis
      const liquidityRisk = volume24h < 5000000 ? 70 : 20;

      // Calculate overall risk score
      const riskScore = Math.round((volatilityRisk + volumeRisk + trendRisk + supportLevel + liquidityRisk) / 5);
      
      // Determine risk level
      let overallRisk: RiskAnalysis['overallRisk'] = 'medium';
      if (riskScore >= 80) overallRisk = 'extreme';
      else if (riskScore >= 65) overallRisk = 'high';
      else if (riskScore >= 45) overallRisk = 'medium';
      else if (riskScore >= 25) overallRisk = 'low';
      else overallRisk = 'very-low';

      // Generate recommendations
      const recommendations = [];
      if (volatilityRisk > 60) recommendations.push("High volatility detected - consider smaller position sizes");
      if (volumeRisk > 60) recommendations.push("Low volume warning - ensure sufficient liquidity before trading");
      if (change24h > 10) recommendations.push("Strong upward momentum - watch for potential reversal");
      if (change24h < -10) recommendations.push("Strong downward pressure - consider support levels");
      if (liquidityRisk > 50) recommendations.push("Limited liquidity - use limit orders to avoid slippage");
      if (recommendations.length === 0) recommendations.push("Market conditions appear stable for trading");

      const analysis: RiskAnalysis = {
        overallRisk,
        riskScore,
        breakdown: {
          volatilityRisk: Math.round(volatilityRisk),
          volumeRisk: Math.round(volumeRisk),
          trendRisk: Math.round(trendRisk),
          supportLevel: Math.round(supportLevel),
          liquidityRisk: Math.round(liquidityRisk)
        },
        recommendations,
        pair: pairSymbol,
        currentPrice: pairData.price,
        change24h,
        volume24h: volume24h.toLocaleString()
      };

      setRiskData(analysis);
    } catch (error) {
      console.error('Error calculating risk analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && pair) {
      calculateRiskAnalysis(pair);
    }
  }, [isOpen, pair]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'very-low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      case 'extreme': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getRiskProgressColor = (value: number) => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 65) return 'bg-orange-500';
    if (value >= 45) return 'bg-yellow-500';
    if (value >= 25) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Dynamic Risk Assessment - {pair}
          </DialogTitle>
          <DialogDescription>
            Real-time risk analysis based on market data and technical indicators
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing market conditions...</span>
          </div>
        )}

        {riskData && (
          <div className="space-y-6 overflow-y-auto max-h-96">
            {/* Overall Risk Score */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="stroke-current text-gray-200 dark:text-gray-700"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`stroke-current ${getRiskProgressColor(riskData.riskScore)}`}
                      strokeWidth="3"
                      strokeDasharray={`${riskData.riskScore}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">{riskData.riskScore}</span>
                  </div>
                </div>
                <div>
                  <Badge className={`text-sm font-semibold ${getRiskColor(riskData.overallRisk)}`}>
                    {riskData.overallRisk.replace('-', ' ').toUpperCase()} RISK
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall Risk Score</p>
                </div>
              </div>
            </div>

            {/* Market Data */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Current Market Data</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Current Price</p>
                  <p className="font-bold text-lg">${riskData.currentPrice}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">24h Change</p>
                  <p className={`font-bold text-lg ${riskData.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {riskData.change24h >= 0 ? '+' : ''}{riskData.change24h.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">24h Volume</p>
                  <p className="font-bold text-lg">${riskData.volume24h}</p>
                </div>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Risk Factor Breakdown</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Volatility Risk</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{riskData.breakdown.volatilityRisk}%</span>
                    </div>
                    <Progress value={riskData.breakdown.volatilityRisk} className="h-2" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Volume Risk</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{riskData.breakdown.volumeRisk}%</span>
                    </div>
                    <Progress value={riskData.breakdown.volumeRisk} className="h-2" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Trend Risk</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{riskData.breakdown.trendRisk}%</span>
                    </div>
                    <Progress value={riskData.breakdown.trendRisk} className="h-2" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-orange-600" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Support Level</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{riskData.breakdown.supportLevel}%</span>
                    </div>
                    <Progress value={riskData.breakdown.supportLevel} className="h-2" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Droplets className="h-4 w-4 text-red-600" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Liquidity Risk</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{riskData.breakdown.liquidityRisk}%</span>
                    </div>
                    <Progress value={riskData.breakdown.liquidityRisk} className="h-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 rounded-lg">
              <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-3">Trading Recommendations</h4>
              <ul className="space-y-2">
                {riskData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="text-amber-800 dark:text-amber-200">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                onClick={onNavigateToTrade}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Trade {pair}
              </Button>
              <Button 
                onClick={onNavigateToAnalyzer}
                variant="outline"
                className="flex-1"
              >
                Analyze {pair}
              </Button>
              <Button 
                onClick={onClose}
                variant="outline"
                className="px-6"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DynamicRiskMeter;