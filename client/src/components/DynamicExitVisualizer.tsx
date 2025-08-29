import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { X, Clock, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

interface DynamicExitVisualizerProps {
  bot: any;
  onClose: () => void;
}

export function DynamicExitVisualizer({ bot, onClose }: DynamicExitVisualizerProps) {
  const [exitConditions, setExitConditions] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

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
        distanceToStopLoss: Math.abs(currentRoi - stopLossPercent),
        distanceToTakeProfit: Math.abs(takeProfitPercent - currentRoi)
      });
    }
  }, [bot, futures]);

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="p-6 space-y-6">
        {/* ROI and Risk Level Display - Prominent at top */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={exitConditions.currentRoi >= 0 ? "default" : "destructive"} 
            className="text-xl px-6 py-3 font-bold rounded-full"
          >
            {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
          </Badge>
          <Badge 
            className={`text-white text-lg px-6 py-3 font-medium rounded-full ${getRiskColor(getRiskLevel())}`}
          >
            {getRiskLevel()}
          </Badge>
        </div>

        {/* Progress Bar Section - Clean and spacious */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-red-500 font-semibold text-lg">Stop Loss</span>
            <span className="text-green-500 font-semibold text-lg">Take Profit</span>
          </div>
          
          <div className="relative">
            <Progress value={getProgressValue()} className="h-6 bg-gray-200 dark:bg-gray-700" />
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 font-medium">
            <span>{exitConditions.stopLossPercent.toFixed(1)}%</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              Current: {exitConditions.currentRoi.toFixed(2)}%
            </span>
            <span>{exitConditions.takeProfitPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Trading Pair and Price Info */}
        <div className="text-center space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="font-bold text-lg text-gray-900 dark:text-white">
            {bot.tradingPair}
          </div>
          {exitConditions.entryPrice > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 space-x-4">
              <span>Entry: ${exitConditions.entryPrice.toFixed(4)}</span>
              <span>Current: ${exitConditions.currentPrice.toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* Close Position Button */}
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          {!showCloseConfirmation ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowCloseConfirmation(true)}
              disabled={closePositionMutation.isPending}
            >
              Close Position Manually
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-center text-gray-600 dark:text-gray-400">
                Are you sure you want to close this position?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirmation(false)}
                  disabled={closePositionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
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
    </div>
  );
}