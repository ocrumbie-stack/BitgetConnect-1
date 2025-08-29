import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { X, Clock, TrendingUp, TrendingDown, Target, Shield, BarChart3, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DynamicExitVisualizerProps {
  bot: any;
  onClose: () => void;
}

export function DynamicExitVisualizer({ bot, onClose }: DynamicExitVisualizerProps) {
  const [exitConditions, setExitConditions] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);

  // Debug log to check what data we're receiving
  useEffect(() => {
    console.log('DynamicExitVisualizer received bot data:', bot);
  }, [bot]);
  
  // Fetch real-time price data for the trading pair
  const { data: futures } = useQuery({
    queryKey: ['/api/futures'],
    refetchInterval: 3000, // Update every 3 seconds
  });

  useEffect(() => {
    // Get current price from futures data for the bot's trading pair
    let currentPrice = 0;
    if (futures && bot.tradingPair && Array.isArray(futures)) {
      const currentPair = futures.find((f: any) => f.symbol === bot.tradingPair);
      if (currentPair) {
        currentPrice = parseFloat(currentPair.price);
      }
    }

    // Extract exit conditions from bot execution data
    let currentRoi = parseFloat(bot.roi || '0');
    const entryPrice = parseFloat(bot.positionData?.openPriceAvg || bot.entryPrice || '0');
    
    // Calculate more accurate ROI if we have position data
    if (bot.positionData?.unrealizedPL && bot.capital) {
      currentRoi = (parseFloat(bot.positionData.unrealizedPL) / parseFloat(bot.capital)) * 100;
    }
    
    // Get stop loss and take profit from bot data, with fallbacks
    const stopLossPercent = parseFloat(bot.exitCriteria?.stopLoss?.replace('%', '') || bot.stopLoss || '-7.2');
    const takeProfitPercent = parseFloat(bot.exitCriteria?.takeProfit?.replace('%', '') || bot.takeProfit || '21.6');
    
    if (currentPrice > 0 && entryPrice > 0) {
      const stopLossPrice = entryPrice * (1 + stopLossPercent / 100);
      const takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);
      
      // Update price history for chart
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      setPriceHistory(prev => {
        const newHistory = [...prev, {
          time: timeLabel,
          price: currentPrice,
          roi: currentRoi,
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice
        }].slice(-20); // Keep last 20 data points
        return newHistory;
      });
      
      // Calculate risk metrics
      const distanceToStopLoss = Math.abs(currentRoi - stopLossPercent);
      const distanceToTakeProfit = Math.abs(takeProfitPercent - currentRoi);
      const volatility = priceHistory.length > 5 ? 
        Math.abs(currentPrice - priceHistory[priceHistory.length - 5]?.price || currentPrice) / currentPrice * 100 : 0;
      
      setRiskMetrics({
        volatility: volatility.toFixed(2),
        timeInPosition: Math.floor((Date.now() - new Date(bot.startedAt).getTime()) / (1000 * 60)),
        maxDrawdown: Math.min(...priceHistory.map(h => h.roi), currentRoi),
        maxGain: Math.max(...priceHistory.map(h => h.roi), currentRoi),
        trend: priceHistory.length > 2 ? 
          (currentPrice > priceHistory[priceHistory.length - 3]?.price ? 'Bullish' : 'Bearish') : 'Neutral'
      });
      
      setExitConditions({
        entryPrice,
        currentPrice,
        stopLossPrice,
        takeProfitPrice,
        stopLossPercent,
        takeProfitPercent,
        currentRoi,
        priceToStopLoss: Math.abs(currentPrice - stopLossPrice),
        priceToTakeProfit: Math.abs(currentPrice - takeProfitPrice),
        distanceToStopLoss,
        distanceToTakeProfit
      });
    }
  }, [bot, futures, priceHistory.length]);

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: async (botId: string) => {
      const response = await fetch(`/api/close-position/${bot.tradingPair}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });
      if (!response.ok) throw new Error('Failed to close position');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-executions'] });
      onClose();
    }
  });

  // Calculate time remaining until max runtime
  useEffect(() => {
    if (bot.startedAt && bot.exitCriteria?.maxRuntime) {
      const updateTimeRemaining = () => {
        const startTime = new Date(bot.startedAt).getTime();
        const maxRuntimeMs = parseInt(bot.exitCriteria.maxRuntime.replace('m', '')) * 60 * 1000;
        const endTime = startTime + maxRuntimeMs;
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
          setTimeRemaining('Time expired');
          return;
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m remaining`);
        } else {
          setTimeRemaining(`${minutes}m ${seconds}s remaining`);
        }
      };
      
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [bot.startedAt, bot.exitCriteria?.maxRuntime]);

  const getRiskLevel = () => {
    if (!exitConditions) return 'Medium';
    
    const { currentRoi, stopLossPercent, takeProfitPercent } = exitConditions;
    
    if (currentRoi <= stopLossPercent * 0.8) return 'Critical';
    if (currentRoi <= stopLossPercent * 0.5) return 'High';
    if (currentRoi >= takeProfitPercent * 0.8) return 'Profit Zone';
    return 'Medium';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Profit Zone': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getProgressValue = () => {
    if (!exitConditions) return 50;
    
    const { currentRoi, stopLossPercent, takeProfitPercent } = exitConditions;
    
    // Calculate position between stop loss and take profit
    const range = takeProfitPercent - stopLossPercent;
    const position = currentRoi - stopLossPercent;
    return Math.max(0, Math.min(100, (position / range) * 100));
  };

  if (!exitConditions) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-500 dark:text-gray-400">Loading exit data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl mx-auto overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-white font-bold text-xl">{bot.tradingPair}</h2>
              <p className="text-gray-300 text-sm">{bot.exitCriteria?.strategy || 'Manual'} Strategy</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {timeRemaining && (
              <div className="text-white text-sm flex items-center bg-white/10 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 mr-1" />
                {timeRemaining}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Main Performance Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - ROI & Risk */}
          <div className="space-y-4">
            {/* Large ROI Display */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current P&L</div>
              <div className={`text-5xl font-bold mb-2 ${exitConditions.currentRoi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
              </div>
              <Badge className={`${getRiskColor(getRiskLevel())} text-white px-4 py-1 text-sm`}>
                {getRiskLevel()}
              </Badge>
            </div>

            {/* Risk Metrics */}
            {riskMetrics && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Activity className="h-4 w-4 mr-2" />
                  Risk Metrics
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Volatility</div>
                    <div className="font-semibold">{riskMetrics.volatility}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Time</div>
                    <div className="font-semibold">{riskMetrics.timeInPosition}m</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Max Gain</div>
                    <div className="font-semibold text-green-600">+{riskMetrics.maxGain?.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Max Loss</div>
                    <div className="font-semibold text-red-600">{riskMetrics.maxDrawdown?.toFixed(2)}%</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Trend</span>
                    <span className={`text-xs font-semibold ${riskMetrics.trend === 'Bullish' ? 'text-green-600' : riskMetrics.trend === 'Bearish' ? 'text-red-600' : 'text-gray-600'}`}>
                      {riskMetrics.trend}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - Price Chart */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Live Price & Exit Levels
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Entry: ${exitConditions.entryPrice.toFixed(4)} | Current: ${exitConditions.currentPrice.toFixed(4)}
                </div>
              </div>
              
              {priceHistory.length > 1 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        domain={['dataMin - 0.001', 'dataMax + 0.001']}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `$${value.toFixed(4)}`}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'price' ? `$${value.toFixed(4)}` : `${value.toFixed(2)}%`,
                          name === 'price' ? 'Price' : 'ROI'
                        ]}
                      />
                      <ReferenceLine 
                        y={exitConditions.stopLossPrice} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5"
                        label={{ value: "Stop Loss", position: "insideTopRight", fontSize: 10 }}
                      />
                      <ReferenceLine 
                        y={exitConditions.takeProfitPrice} 
                        stroke="#22c55e" 
                        strokeDasharray="5 5"
                        label={{ value: "Take Profit", position: "insideTopRight", fontSize: 10 }}
                      />
                      <ReferenceLine 
                        y={exitConditions.entryPrice} 
                        stroke="#6b7280" 
                        strokeDasharray="2 2"
                        label={{ value: "Entry", position: "insideTopLeft", fontSize: 10 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Building price history...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exit Strategy Progress */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-red-500 font-semibold">Stop Loss {exitConditions.stopLossPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500 font-semibold">Take Profit {exitConditions.takeProfitPercent.toFixed(1)}%</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </div>
          
          <div className="relative mb-4">
            <Progress value={getProgressValue()} className="h-4 bg-gray-200 dark:bg-gray-700" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border text-xs font-semibold">
              {exitConditions.currentRoi.toFixed(2)}%
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Distance to Stop</div>
              <div className="font-semibold">{exitConditions.distanceToStopLoss?.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Position Size</div>
              <div className="font-semibold">${parseFloat(bot.capital || '0').toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Distance to Target</div>
              <div className="font-semibold">{exitConditions.distanceToTakeProfit?.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          {!showCloseConfirmation ? (
            <div className="space-y-3">
              <Button
                variant="destructive"
                className="w-full h-12 text-lg font-semibold"
                onClick={() => setShowCloseConfirmation(true)}
                disabled={closePositionMutation.isPending}
              >
                <AlertTriangle className="h-5 w-5 mr-2" />
                Close Position Manually
              </Button>
              <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                Position will be closed at market price
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <div className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Confirm Position Closure
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                  This will close your {bot.tradingPair} position immediately
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirmation(false)}
                  disabled={closePositionMutation.isPending}
                  className="h-10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => closePositionMutation.mutate(bot.id)}
                  disabled={closePositionMutation.isPending}
                  className="h-10"
                >
                  {closePositionMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Close
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}