import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Clock, Activity, X, Eye, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface DynamicExitVisualizerProps {
  bot: any;
  onClose: () => void;
}

export function DynamicExitVisualizer({ bot, onClose }: DynamicExitVisualizerProps) {
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [exitConditions, setExitConditions] = useState<any>(null);
  
  // Fetch real-time price data for the trading pair
  const { data: futures } = useQuery({
    queryKey: ['/api/futures'],
    refetchInterval: 3000, // Update every 3 seconds
  });

  // Fetch historical price data for visualization
  const { data: priceData } = useQuery({
    queryKey: [`/api/futures/${bot.tradingPair}/history`],
    enabled: !!bot.tradingPair,
    refetchInterval: 10000, // Update every 10 seconds
  });

  useEffect(() => {
    if (futures && bot.tradingPair && Array.isArray(futures)) {
      const currentPair = futures.find((f: any) => f.symbol === bot.tradingPair);
      if (currentPair) {
        const newDataPoint = {
          time: new Date().toLocaleTimeString(),
          price: parseFloat(currentPair.price),
          roi: parseFloat(bot.roi),
          timestamp: Date.now()
        };
        
        setPriceHistory(prev => {
          const updated = [...prev, newDataPoint];
          // Keep only last 50 data points for performance
          return updated.slice(-50);
        });
      }
    }
  }, [futures, bot.tradingPair, bot.roi]);

  useEffect(() => {
    // Calculate dynamic exit conditions based on bot data
    if (bot.positionData && bot.exitCriteria) {
      const currentPrice = parseFloat(bot.positionData.markPrice);
      const entryPrice = parseFloat(bot.positionData.openPriceAvg);
      const stopLossPrice = entryPrice * (1 + parseFloat(bot.exitCriteria.stopLoss) / 100);
      const takeProfitPrice = entryPrice * (1 + parseFloat(bot.exitCriteria.takeProfit) / 100);
      
      setExitConditions({
        entryPrice,
        currentPrice,
        stopLossPrice,
        takeProfitPrice,
        stopLossPercent: parseFloat(bot.exitCriteria.stopLoss),
        takeProfitPercent: parseFloat(bot.exitCriteria.takeProfit),
        currentRoi: parseFloat(bot.roi),
        priceToStopLoss: Math.abs(currentPrice - stopLossPrice),
        priceToTakeProfit: Math.abs(currentPrice - takeProfitPrice),
        distanceToStopLoss: Math.abs(parseFloat(bot.roi) - parseFloat(bot.exitCriteria.stopLoss)),
        distanceToTakeProfit: Math.abs(parseFloat(bot.exitCriteria.takeProfit) - parseFloat(bot.roi))
      });
    }
  }, [bot]);

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-500" />
                Dynamic Exit Strategy Visualizer
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Real-time monitoring for {bot.tradingPair} • {bot.botName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Exit Conditions Overview */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    Exit Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exitConditions && (
                    <>
                      {/* Current Status */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Current ROI</span>
                          <Badge variant={exitConditions.currentRoi >= 0 ? "default" : "destructive"}>
                            {exitConditions.currentRoi >= 0 ? "+" : ""}{exitConditions.currentRoi.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Risk Level</span>
                          <Badge className={`text-white ${getRiskColor(getRiskLevel())}`}>
                            {getRiskLevel()}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-red-500 font-medium">Stop Loss</span>
                          <span className="text-green-500 font-medium">Take Profit</span>
                        </div>
                        <Progress value={getProgressValue()} className="h-3" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{exitConditions.stopLossPercent.toFixed(1)}%</span>
                          <span className="font-medium">Current: {exitConditions.currentRoi.toFixed(2)}%</span>
                          <span>{exitConditions.takeProfitPercent.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Price Levels */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">Take Profit</span>
                          <span className="font-mono text-sm">${exitConditions.takeProfitPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Current Price</span>
                          <span className="font-mono text-sm">${exitConditions.currentPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm font-medium">Entry Price</span>
                          <span className="font-mono text-sm">${exitConditions.entryPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">Stop Loss</span>
                          <span className="font-mono text-sm">${exitConditions.stopLossPrice.toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Distance Metrics */}
                      <div className="border-t pt-3">
                        <h4 className="font-medium mb-2 text-sm">Distance to Exit Points</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>To Stop Loss:</span>
                            <span className="font-mono">{exitConditions.distanceToStopLoss.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>To Take Profit:</span>
                            <span className="font-mono">{exitConditions.distanceToTakeProfit.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Real-time Price Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Real-time Price Movement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          domain={['dataMin - 0.1', 'dataMax + 0.1']}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            name === 'price' ? `$${value.toFixed(4)}` : `${value.toFixed(2)}%`,
                            name === 'price' ? 'Price' : 'ROI'
                          ]}
                        />
                        
                        {/* Price Area */}
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                        
                        {/* Reference Lines for Exit Conditions */}
                        {exitConditions && (
                          <>
                            <ReferenceLine 
                              y={exitConditions.takeProfitPrice} 
                              stroke="#10b981" 
                              strokeDasharray="5 5"
                              label={{ value: "Take Profit", position: "top" }}
                            />
                            <ReferenceLine 
                              y={exitConditions.entryPrice} 
                              stroke="#6b7280" 
                              strokeDasharray="3 3"
                              label={{ value: "Entry", position: "top" }}
                            />
                            <ReferenceLine 
                              y={exitConditions.stopLossPrice} 
                              stroke="#ef4444" 
                              strokeDasharray="5 5"
                              label={{ value: "Stop Loss", position: "bottom" }}
                            />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Real-time Alerts and Notifications */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Exit Strategy Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Stop Loss Alert */}
                  {exitConditions && exitConditions.currentRoi <= exitConditions.stopLossPercent * 0.8 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-700 dark:text-red-400">Stop Loss Warning</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Position approaching stop loss level. Current ROI: {exitConditions.currentRoi.toFixed(2)}%
                      </p>
                    </div>
                  )}

                  {/* Take Profit Alert */}
                  {exitConditions && exitConditions.currentRoi >= exitConditions.takeProfitPercent * 0.8 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-700 dark:text-green-400">Take Profit Zone</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        Position near take profit target. Consider securing profits.
                      </p>
                    </div>
                  )}

                  {/* Runtime Alert */}
                  {bot.runtime && parseInt(bot.runtime.replace('m', '')) > 180 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">Extended Runtime</span>
                      </div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">
                        Bot running for {bot.runtime}. Consider reviewing strategy.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bot Statistics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{bot.trades}</div>
                  <div className="text-sm text-gray-500">Total Trades</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{bot.winRate}%</div>
                  <div className="text-sm text-gray-500">Win Rate</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{bot.runtime}</div>
                  <div className="text-sm text-gray-500">Runtime</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${parseFloat(bot.profit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${parseFloat(bot.profit).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Total Profit</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}