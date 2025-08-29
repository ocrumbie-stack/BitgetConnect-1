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
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl mx-auto overflow-hidden border border-gray-200 dark:border-gray-700">
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

      <div className="p-4 space-y-4">
        {/* ROI and Chart Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ROI Display */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current P&L</div>
            <div className={`text-3xl font-bold mb-2 ${exitConditions.currentRoi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
            </div>
            <Badge className={`${getRiskColor(getRiskLevel())} text-white px-3 py-1 text-xs`}>
              {getRiskLevel()}
            </Badge>
            {riskMetrics && (
              <div className="mt-2 flex justify-between text-xs">
                <div className="text-center">
                  <div className="text-gray-500 dark:text-gray-400">Time</div>
                  <div className="font-semibold">{riskMetrics.timeInPosition}m</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500 dark:text-gray-400">Trend</div>
                  <div className={`font-semibold ${riskMetrics.trend === 'Bullish' ? 'text-green-600' : riskMetrics.trend === 'Bearish' ? 'text-red-600' : 'text-gray-600'}`}>
                    {riskMetrics.trend}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Chart */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                <BarChart3 className="h-3 w-3 mr-1" />
                Live Price
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ${exitConditions.currentPrice.toFixed(4)}
              </div>
            </div>
            
            {priceHistory.length > 1 ? (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <YAxis hide domain={['dataMin - 0.001', 'dataMax + 0.001']} />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toFixed(4)}`, 'Price']}
                      labelFormatter={() => ''}
                    />
                    <ReferenceLine y={exitConditions.stopLossPrice} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine y={exitConditions.takeProfitPrice} stroke="#22c55e" strokeDasharray="3 3" />
                    <ReferenceLine y={exitConditions.entryPrice} stroke="#6b7280" strokeDasharray="1 1" />
                    <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
                <BarChart3 className="h-4 w-4 opacity-50" />
              </div>
            )}
          </div>
        </div>

        {/* Exit Strategy Progress */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-red-500 font-semibold text-sm">Stop {exitConditions.stopLossPercent.toFixed(1)}%</span>
            <span className="text-green-500 font-semibold text-sm">Target {exitConditions.takeProfitPercent.toFixed(1)}%</span>
          </div>
          
          <div className="relative mb-3">
            <Progress value={getProgressValue()} className="h-3 bg-gray-200 dark:bg-gray-700" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-semibold">
              {exitConditions.currentRoi.toFixed(2)}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Capital</div>
              <div className="font-semibold">${parseFloat(bot.capital || '0').toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Entry Price</div>
              <div className="font-semibold">${exitConditions.entryPrice.toFixed(4)}</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          {!showCloseConfirmation ? (
            <Button
              variant="destructive"
              className="w-full h-10"
              onClick={() => setShowCloseConfirmation(true)}
              disabled={closePositionMutation.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Close Position Manually
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-center text-gray-600 dark:text-gray-400 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                Close {bot.tradingPair} position now?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirmation(false)}
                  disabled={closePositionMutation.isPending}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => closePositionMutation.mutate(bot.id)}
                  disabled={closePositionMutation.isPending}
                  className="h-9"
                >
                  {closePositionMutation.isPending ? 'Closing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}