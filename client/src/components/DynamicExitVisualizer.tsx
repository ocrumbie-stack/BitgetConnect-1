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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-xs mx-auto border border-gray-200 dark:border-gray-700">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{bot.tradingPair}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-5 w-5 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {/* Current P&L */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${exitConditions.currentRoi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
          </div>
        </div>

        {/* Key Info */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Entry:</span>
            <span>${exitConditions.entryPrice.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Current:</span>
            <span>${exitConditions.currentPrice.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Size:</span>
            <span>${parseFloat(bot.capital || '0').toFixed(0)}</span>
          </div>
        </div>

        {/* Exit Levels */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-500">SL: {exitConditions.stopLossPercent.toFixed(1)}%</span>
            <span className="text-green-500">TP: {exitConditions.takeProfitPercent.toFixed(1)}%</span>
          </div>
          <Progress value={getProgressValue()} className="h-1" />
        </div>

        {/* Close Button */}
        {!showCloseConfirmation ? (
          <Button
            variant="destructive"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setShowCloseConfirmation(true)}
            disabled={closePositionMutation.isPending}
          >
            Close Position
          </Button>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-center text-orange-700 dark:text-orange-300 p-1 bg-orange-50 dark:bg-orange-900/20 rounded">
              Close position?
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowCloseConfirmation(false)}
                disabled={closePositionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-6 text-xs"
                onClick={() => closePositionMutation.mutate(bot.id)}
                disabled={closePositionMutation.isPending}
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