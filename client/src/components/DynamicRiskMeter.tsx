import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Shield, X } from 'lucide-react';
import { useLocation } from 'wouter';

interface RiskData {
  overall: number; // 0-100 risk score
  volatility: number;
  volume: number;
  trend: number;
  support: number;
  liquidity: number;
}

interface DynamicRiskMeterProps {
  symbol: string;
  price: string;
  change24h: string;
  volume24h: string;
  onClose?: () => void;
  className?: string;
}

export function DynamicRiskMeter({ 
  symbol, 
  price, 
  change24h, 
  volume24h, 
  onClose,
  className = "" 
}: DynamicRiskMeterProps) {
  const [, setLocation] = useLocation();
  const [riskData, setRiskData] = useState<RiskData>({
    overall: 0,
    volatility: 0,
    volume: 0,
    trend: 0,
    support: 0,
    liquidity: 0
  });

  useEffect(() => {
    calculateRiskMetrics();
  }, [symbol, price, change24h, volume24h]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (onClose) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [onClose]);

  const calculateRiskMetrics = () => {
    const priceNum = parseFloat(price);
    const changeNum = Math.abs(parseFloat(change24h || '0'));
    const volumeNum = parseFloat(volume24h || '0');

    // Volatility Risk (0-100)
    const volatilityRisk = Math.min(changeNum * 1000, 100); // Higher change = higher risk

    // Volume Risk (0-100) - Low volume = higher risk
    const volumeRisk = volumeNum < 1000000 ? 80 : 
                      volumeNum < 10000000 ? 50 : 
                      volumeNum < 50000000 ? 30 : 20;

    // Trend Risk (0-100)
    const trendRisk = changeNum > 15 ? 90 : 
                     changeNum > 10 ? 70 : 
                     changeNum > 5 ? 40 : 20;

    // Support Risk (based on price level)
    const supportRisk = priceNum < 0.01 ? 85 : 
                       priceNum < 1 ? 60 : 
                       priceNum < 100 ? 30 : 15;

    // Liquidity Risk (inverse of volume)
    const liquidityRisk = volumeRisk;

    // Overall Risk (weighted average)
    const overallRisk = Math.round(
      (volatilityRisk * 0.3 + 
       volumeRisk * 0.2 + 
       trendRisk * 0.25 + 
       supportRisk * 0.15 + 
       liquidityRisk * 0.1)
    );

    setRiskData({
      overall: overallRisk,
      volatility: Math.round(volatilityRisk),
      volume: Math.round(volumeRisk),
      trend: Math.round(trendRisk),
      support: Math.round(supportRisk),
      liquidity: Math.round(liquidityRisk)
    });
  };

  const getRiskLevel = (score: number): { level: string; color: string; bgColor: string } => {
    if (score >= 80) return { level: 'Extreme', color: 'text-red-600', bgColor: 'bg-red-500' };
    if (score >= 60) return { level: 'High', color: 'text-orange-600', bgColor: 'bg-orange-500' };
    if (score >= 40) return { level: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
    if (score >= 20) return { level: 'Low', color: 'text-green-600', bgColor: 'bg-green-500' };
    return { level: 'Very Low', color: 'text-blue-600', bgColor: 'bg-blue-500' };
  };

  const overallRisk = getRiskLevel(riskData.overall);

  const RiskMeter = ({ value, label, icon: Icon }: { value: number; label: string; icon: any }) => {
    const risk = getRiskLevel(value);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <span className={`text-sm font-bold ${risk.color}`}>{value}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${risk.bgColor}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className={`${className} border-2 ${overallRisk.level === 'Extreme' ? 'border-red-500' : 
      overallRisk.level === 'High' ? 'border-orange-500' : 
      overallRisk.level === 'Medium' ? 'border-yellow-500' : 
      overallRisk.level === 'Low' ? 'border-green-500' : 'border-blue-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {symbol} - ${parseFloat(price).toFixed(4)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Risk Score */}
        <div className="text-center p-4 rounded-lg border-2 border-dashed" 
             style={{ borderColor: overallRisk.level === 'Extreme' ? '#ef4444' : 
                                 overallRisk.level === 'High' ? '#f97316' : 
                                 overallRisk.level === 'Medium' ? '#eab308' : 
                                 overallRisk.level === 'Low' ? '#22c55e' : '#3b82f6' }}>
          <div className="text-3xl font-bold mb-2" style={{ 
            color: overallRisk.level === 'Extreme' ? '#ef4444' : 
                   overallRisk.level === 'High' ? '#f97316' : 
                   overallRisk.level === 'Medium' ? '#eab308' : 
                   overallRisk.level === 'Low' ? '#22c55e' : '#3b82f6' 
          }}>
            {riskData.overall}
          </div>
          <Badge 
            variant="outline" 
            className={`${overallRisk.color} border-current font-medium`}
          >
            {overallRisk.level} Risk
          </Badge>
        </div>

        {/* Risk Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Risk Breakdown</h4>
          
          <RiskMeter 
            value={riskData.volatility} 
            label="Volatility" 
            icon={Activity} 
          />
          
          <RiskMeter 
            value={riskData.volume} 
            label="Volume Risk" 
            icon={TrendingDown} 
          />
          
          <RiskMeter 
            value={riskData.trend} 
            label="Trend Risk" 
            icon={TrendingUp} 
          />
          
          <RiskMeter 
            value={riskData.support} 
            label="Support Level" 
            icon={Shield} 
          />
          
          <RiskMeter 
            value={riskData.liquidity} 
            label="Liquidity Risk" 
            icon={AlertTriangle} 
          />
        </div>

        {/* Risk Assessment */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="text-sm font-semibold mb-2">Risk Assessment</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {riskData.overall >= 80 && "⚠️ Extreme risk detected. High volatility and unstable conditions. Consider avoiding or using minimal position sizes."}
            {riskData.overall >= 60 && riskData.overall < 80 && "🔶 High risk pair with significant volatility. Use proper risk management and stop losses."}
            {riskData.overall >= 40 && riskData.overall < 60 && "🟨 Moderate risk levels. Standard trading precautions recommended."}
            {riskData.overall >= 20 && riskData.overall < 40 && "🟢 Low risk environment with stable conditions. Good for conservative strategies."}
            {riskData.overall < 20 && "💎 Very low risk with stable market conditions. Suitable for larger position sizes."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            className="flex-1" 
            onClick={() => setLocation(`/trade?pair=${symbol}`)}
          >
            Trade {symbol}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setLocation(`/analyzer?pair=${symbol}&autoFill=true`)}
          >
            Analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}