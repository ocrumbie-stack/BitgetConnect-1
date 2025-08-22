import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Bell, Zap, TrendingUp, TrendingDown, AlertTriangle, Bot, Settings, BarChart3, Target, Activity } from 'lucide-react';

interface AlertDemoCreatorProps {
  userId?: string;
}

export function AlertDemoCreator({ userId = 'default-user' }: AlertDemoCreatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createAlertMutation = useMutation({
    mutationFn: (alert: any) => apiRequest('/api/alerts', 'POST', alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
      toast({ title: 'Demo alert created!' });
    },
    onError: () => {
      toast({ title: 'Failed to create alert', variant: 'destructive' });
    }
  });

  const demoAlerts = [
    {
      alertType: 'pnl_gain',
      title: 'Profit Target Reached!',
      message: 'Your BTCUSDT position has gained +5.2% profit',
      severity: 'success',
      data: {
        tradingPair: 'BTCUSDT',
        pnl: '+5.2%',
        price: '116,500',
        change: '+2.1%'
      }
    },
    {
      alertType: 'screener_match',
      title: 'Screener Match Found',
      message: 'ETHUSDT matches your "High Volume Breakouts" screener criteria',
      severity: 'info',
      data: {
        tradingPair: 'ETHUSDT',
        screenerName: 'High Volume Breakouts',
        matchedCriteria: ['Volume > 200%', 'RSI < 30'],
        price: '3,420',
        change: '+8.2%'
      }
    },
    {
      alertType: 'volume_spike',
      title: 'Unusual Volume Activity',
      message: 'SOLUSDT showing 340% volume increase in the last hour',
      severity: 'warning',
      data: {
        tradingPair: 'SOLUSDT',
        volume: '24.5M',
        volumeChange: '+340%',
        price: '98.50'
      }
    },
    {
      alertType: 'trend_change',
      title: 'Trend Reversal Detected',
      message: 'ADAUSDT trend shifted from bearish to bullish on 4H timeframe',
      severity: 'info',
      data: {
        tradingPair: 'ADAUSDT',
        trendDirection: 'bullish',
        timeframe: '4H',
        confidence: 78,
        price: '0.456'
      }
    },
    {
      alertType: 'technical_signal',
      title: 'RSI Oversold Signal',
      message: 'MATICUSDT RSI dropped below 25 - potential reversal opportunity',
      severity: 'info',
      data: {
        tradingPair: 'MATICUSDT',
        indicator: 'RSI',
        indicatorValue: 24.3,
        timeframe: '1H',
        price: '0.892'
      }
    },
    {
      alertType: 'price_breakout',
      title: 'Price Breakout Alert',
      message: 'DOTUSDT broke above resistance level of $7.85',
      severity: 'success',
      data: {
        tradingPair: 'DOTUSDT',
        price: '7.92',
        resistanceLevel: '7.85',
        priceTarget: '8.50',
        change: '+3.4%'
      }
    },
    {
      alertType: 'support_resistance',
      title: 'Support Level Test',
      message: 'LINKUSDT testing critical support at $14.20',
      severity: 'warning',
      data: {
        tradingPair: 'LINKUSDT',
        price: '14.18',
        supportLevel: '14.20',
        confidence: 85
      }
    },
    {
      alertType: 'unusual_activity',
      title: 'Whale Activity Detected',
      message: 'Large transactions detected for AVAXUSDT - possible institutional movement',
      severity: 'info',
      data: {
        tradingPair: 'AVAXUSDT',
        price: '42.15',
        change: '+1.8%',
        volume: 'High'
      }
    }
  ];

  const createDemoAlert = (alertData: any) => {
    createAlertMutation.mutate({
      userId,
      ...alertData,
      isRead: false,
      isPinned: false
    });
  };

  return (
    <Card className="border-dashed border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Zap className="h-5 w-5" />
          Alert System Demo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Test the alert system with these demo notifications. Click the bell icon in the top-right to view alerts.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {demoAlerts.map((alert, index) => {
            const getAlertIcon = (alertType: string) => {
              if (alertType === 'pnl_gain') return <TrendingUp className="h-4 w-4 text-green-500" />;
              if (alertType === 'pnl_loss') return <TrendingDown className="h-4 w-4 text-red-500" />;
              if (alertType === 'screener_match') return <Settings className="h-4 w-4 text-blue-500" />;
              if (alertType === 'volume_spike') return <BarChart3 className="h-4 w-4 text-orange-500" />;
              if (alertType === 'trend_change') return <Activity className="h-4 w-4 text-purple-500" />;
              if (alertType === 'technical_signal') return <Target className="h-4 w-4 text-cyan-500" />;
              if (alertType === 'price_breakout') return <TrendingUp className="h-4 w-4 text-green-600" />;
              if (alertType === 'support_resistance') return <TrendingDown className="h-4 w-4 text-yellow-600" />;
              if (alertType === 'unusual_activity') return <AlertTriangle className="h-4 w-4 text-indigo-500" />;
              if (alertType === 'bot_error') return <AlertTriangle className="h-4 w-4 text-red-500" />;
              return <Bell className="h-4 w-4 text-blue-500" />;
            };

            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => createDemoAlert(alert)}
                disabled={createAlertMutation.isPending}
                className="justify-start h-auto p-3"
                data-testid={`button-demo-alert-${index}`}
              >
                <div className="flex items-center gap-2 w-full">
                  {getAlertIcon(alert.alertType)}
                  <div className="text-left">
                    <div className="font-medium text-xs">{alert.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {alert.message.substring(0, 32)}...
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 Test different alert types including screener matches, volume spikes, trend changes, technical signals, and more! Configure custom settings in the Alert Center.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}