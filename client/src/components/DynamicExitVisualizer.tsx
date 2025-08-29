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

  const getPriceChart = () => {
    if (!exitConditions) return null;

    const { entryPrice, currentPrice, stopLossPrice, takeProfitPrice } = exitConditions;
    
    // Generate simulated price line data points
    const generatePriceData = () => {
      const points = [];
      const timePoints = 20; // Number of data points
      const currentTime = Date.now();
      const startTime = currentTime - (30 * 60 * 1000); // 30 minutes ago
      
      // Create a realistic price movement from entry to current
      const priceChange = currentPrice - entryPrice;
      const volatility = Math.abs(priceChange) * 0.3; // Add some volatility
      
      for (let i = 0; i < timePoints; i++) {
        const progress = i / (timePoints - 1);
        const time = startTime + (progress * 30 * 60 * 1000);
        
        // Create realistic price movement with some noise
        let price;
        if (i === 0) {
          price = entryPrice;
        } else if (i === timePoints - 1) {
          price = currentPrice;
        } else {
          // Linear interpolation with noise
          const basePrice = entryPrice + (priceChange * progress);
          const noise = (Math.random() - 0.5) * volatility * Math.sin(progress * Math.PI);
          price = basePrice + noise;
        }
        
        points.push({ time, price });
      }
      return points;
    };

    const priceData = generatePriceData();
    
    // Calculate chart range with padding
    const allPrices = [...priceData.map(p => p.price), stopLossPrice, takeProfitPrice];
    const minPrice = Math.min(...allPrices) * 0.995;
    const maxPrice = Math.max(...allPrices) * 1.005;
    const priceRange = maxPrice - minPrice;
    
    // Calculate positions as percentages from bottom
    const getYPosition = (price: number) => {
      return ((price - minPrice) / priceRange) * 100;
    };
    
    const entryY = getYPosition(entryPrice);
    const currentY = getYPosition(currentPrice);
    const stopLossY = getYPosition(stopLossPrice);
    const takeProfitY = getYPosition(takeProfitPrice);
    
    // Create SVG path for price line
    const createPricePath = () => {
      if (priceData.length < 2) return '';
      
      const chartWidth = 100; // percentage
      const pathData = priceData.map((point, index) => {
        const x = (index / (priceData.length - 1)) * chartWidth;
        const y = 100 - getYPosition(point.price); // Flip Y for SVG
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
      
      return pathData;
    };
    
    return (
      <div className="h-56 bg-gray-900 rounded-lg p-4 border border-gray-600 relative overflow-hidden">
        {/* Chart background grid */}
        <div className="absolute inset-4 opacity-15">
          <div className="h-full w-full border-l border-b border-gray-600"></div>
          {[20, 40, 60, 80].map(x => (
            <div key={x} className="absolute top-0 h-full border-l border-gray-700" style={{ left: `${x}%` }}></div>
          ))}
          {[20, 40, 60, 80].map(y => (
            <div key={y} className="absolute left-0 w-full border-t border-gray-700" style={{ top: `${y}%` }}></div>
          ))}
        </div>

        {/* SVG Price Line */}
        <svg className="absolute inset-4 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Zone backgrounds */}
          <defs>
            <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05"/>
            </linearGradient>
            <linearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          
          {/* Profit zone */}
          <rect 
            x="0" y={100 - takeProfitY} 
            width="100" height={takeProfitY - Math.max(entryY, currentY)} 
            fill="url(#profitGradient)"
          />
          
          {/* Loss zone */}
          <rect 
            x="0" y={100 - Math.min(entryY, currentY)} 
            width="100" height={Math.min(entryY, currentY) - stopLossY} 
            fill="url(#lossGradient)"
          />
          
          {/* Take Profit Line */}
          <line x1="0" y1={100 - takeProfitY} x2="100" y2={100 - takeProfitY} 
                stroke="rgb(34, 197, 94)" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.8"/>
          
          {/* Stop Loss Line */}
          <line x1="0" y1={100 - stopLossY} x2="100" y2={100 - stopLossY} 
                stroke="rgb(239, 68, 68)" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.8"/>
          
          {/* Entry Price Line */}
          <line x1="0" y1={100 - entryY} x2="100" y2={100 - entryY} 
                stroke="rgb(59, 130, 246)" strokeWidth="0.6" strokeDasharray="4,4" opacity="0.6"/>
          
          {/* Price Line */}
          <path 
            d={createPricePath()} 
            fill="none" 
            stroke="rgb(251, 191, 36)" 
            strokeWidth="1.2"
            className="drop-shadow-sm"
          />
          
          {/* Price dots */}
          {priceData.map((point, index) => {
            const x = (index / (priceData.length - 1)) * 100;
            const y = 100 - getYPosition(point.price);
            const isLast = index === priceData.length - 1;
            
            return (
              <circle 
                key={index}
                cx={x} cy={y} r={isLast ? "1.2" : "0.4"}
                fill={isLast ? "rgb(251, 191, 36)" : "rgba(251, 191, 36, 0.6)"}
                className={isLast ? "animate-pulse" : ""}
              />
            );
          })}
        </svg>

        {/* Price level labels */}
        <div className="absolute right-1 text-xs font-medium space-y-1">
          <div 
            className="text-green-400 bg-gray-900/80 px-2 py-0.5 rounded text-right"
            style={{ position: 'absolute', bottom: `${takeProfitY}%`, transform: 'translateY(50%)' }}
          >
            TP ${takeProfitPrice.toFixed(4)}
          </div>
          <div 
            className="text-yellow-400 bg-gray-900/80 px-2 py-0.5 rounded text-right"
            style={{ position: 'absolute', bottom: `${currentY}%`, transform: 'translateY(50%)' }}
          >
            ${currentPrice.toFixed(4)}
          </div>
          <div 
            className="text-blue-400 bg-gray-900/80 px-2 py-0.5 rounded text-right opacity-70"
            style={{ position: 'absolute', bottom: `${entryY}%`, transform: 'translateY(50%)' }}
          >
            Entry ${entryPrice.toFixed(4)}
          </div>
          <div 
            className="text-red-400 bg-gray-900/80 px-2 py-0.5 rounded text-right"
            style={{ position: 'absolute', bottom: `${stopLossY}%`, transform: 'translateY(50%)' }}
          >
            SL ${stopLossPrice.toFixed(4)}
          </div>
        </div>

        {/* Y-axis price scale */}
        <div className="absolute left-0 text-xs text-gray-400 space-y-1">
          <div className="absolute top-1">${maxPrice.toFixed(4)}</div>
          <div className="absolute bottom-1">${minPrice.toFixed(4)}</div>
        </div>
        
        {/* X-axis time labels */}
        <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-gray-500">
          <span>30m ago</span>
          <span>15m ago</span>
          <span>Now</span>
        </div>
        </div>
      );
    };

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl max-w-lg mx-auto border border-gray-700">
      {/* Simple Header */}
      <div className="bg-gray-800 p-4 rounded-t-lg border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold text-lg">{bot.tradingPair}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {timeRemaining && (
          <div className="text-gray-400 text-sm mt-1 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {timeRemaining}
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* ROI Display */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${exitConditions.currentRoi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
          </div>
          <div className={`text-sm mt-1 px-3 py-1 rounded-full inline-block ${getRiskColor(getRiskLevel())} text-white`}>
            {getRiskLevel()}
          </div>
        </div>

        {/* Price Chart */}
        {getPriceChart()}

        {/* Progress Info */}
        <div className="flex justify-between text-sm">
          <span className="text-red-400">Stop {exitConditions.stopLossPercent.toFixed(1)}%</span>
          <span className="text-gray-400">Current {exitConditions.currentRoi.toFixed(2)}%</span>
          <span className="text-green-400">Target {exitConditions.takeProfitPercent.toFixed(1)}%</span>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="text-gray-400 mb-1">Entry Price</div>
            <div className="text-white font-mono text-lg">${exitConditions.entryPrice.toFixed(4)}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="text-gray-400 mb-1">Current Price</div>
            <div className="text-white font-mono text-lg">${exitConditions.currentPrice.toFixed(4)}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="text-gray-400 mb-1">Position Size</div>
            <div className="text-white font-mono">{bot.positionData?.total || '0'} {bot.tradingPair.replace('USDT', '')}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="text-gray-400 mb-1">Leverage</div>
            <div className="text-white font-mono">{bot.leverage || '1'}x</div>
          </div>
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="text-gray-400 mb-1">Capital</div>
            <div className="text-white font-mono">${parseFloat(bot.capital || '0').toFixed(2)}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="text-gray-400 mb-1">Unrealized P&L</div>
            <div className={`font-mono ${parseFloat(bot.positionData?.unrealizedPL || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${parseFloat(bot.positionData?.unrealizedPL || '0').toFixed(4)}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {!showCloseConfirmation ? (
            <Button
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowCloseConfirmation(true)}
              disabled={closePositionMutation.isPending}
            >
              Close Position
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-center text-gray-300 text-sm">
                Close this position now?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirmation(false)}
                  disabled={closePositionMutation.isPending}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => closePositionMutation.mutate(bot.id)}
                  disabled={closePositionMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
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