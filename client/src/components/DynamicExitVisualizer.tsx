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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md mx-auto overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-400" />
            <div>
              <h2 className="text-white font-bold text-lg">{bot.tradingPair}</h2>
              <p className="text-gray-300 text-xs">{bot.exitCriteria?.strategy || 'Manual'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Compact ROI Display */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold mb-1 ${exitConditions.currentRoi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
          </div>
          <Badge className={`${getRiskColor(getRiskLevel())} text-white px-2 py-1 text-xs`}>
            {getRiskLevel()}
          </Badge>
          {riskMetrics && (
            <div className="mt-2 flex justify-around text-xs">
              <span>{riskMetrics.timeInPosition}m</span>
              <span className={`${riskMetrics.trend === 'Bullish' ? 'text-green-600' : riskMetrics.trend === 'Bearish' ? 'text-red-600' : 'text-gray-600'}`}>
                {riskMetrics.trend}
              </span>
            </div>
          )}
        </div>

        {/* Compact Chart */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Price</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">${exitConditions.currentPrice.toFixed(4)}</span>
          </div>
          
          {priceHistory.length > 1 ? (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <YAxis hide domain={['dataMin - 0.001', 'dataMax + 0.001']} />
                  <Tooltip 
                    formatter={(value: any) => [`$${value.toFixed(4)}`, 'Price']}
                    labelFormatter={() => ''}
                  />
                  <ReferenceLine y={exitConditions.stopLossPrice} stroke="#ef4444" strokeDasharray="2 2" />
                  <ReferenceLine y={exitConditions.takeProfitPrice} stroke="#22c55e" strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-gray-400 text-xs">
              Loading...
            </div>
          )}
        </div>

        {/* Compact Progress */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-red-500 font-semibold">Stop {exitConditions.stopLossPercent.toFixed(1)}%</span>
            <span className="text-green-500 font-semibold">Target {exitConditions.takeProfitPercent.toFixed(1)}%</span>
          </div>
          
          <Progress value={getProgressValue()} className="h-2 bg-gray-200 dark:bg-gray-700 mb-2" />
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>${parseFloat(bot.capital || '0').toFixed(0)}</span>
            <span>${exitConditions.entryPrice.toFixed(4)}</span>
          </div>
        </div>

        {/* Compact Actions */}
        {!showCloseConfirmation ? (
          <Button
            variant="destructive"
            className="w-full h-8 text-sm"
            onClick={() => setShowCloseConfirmation(true)}
            disabled={closePositionMutation.isPending}
          >
            Close Position
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-center text-gray-600 dark:text-gray-400 p-1 bg-orange-50 dark:bg-orange-900/20 rounded">
              Close position?
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCloseConfirmation(false)}
                disabled={closePositionMutation.isPending}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => closePositionMutation.mutate(bot.id)}
                disabled={closePositionMutation.isPending}
                className="h-7 text-xs"
              >
                {closePositionMutation.isPending ? 'Closing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}