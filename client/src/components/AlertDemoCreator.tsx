import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Bell, Zap, TrendingUp, TrendingDown, AlertTriangle, Bot } from 'lucide-react';

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
      alertType: 'entry_signal',
      title: 'AI Entry Signal Detected',
      message: 'Strong bullish momentum detected for ETHUSDT - Entry opportunity identified',
      severity: 'info',
      data: {
        tradingPair: 'ETHUSDT',
        price: '3,420',
        change: '+3.8%'
      }
    },
    {
      alertType: 'bot_error',
      title: 'Trading Bot Alert',
      message: 'Bot execution paused due to insufficient balance',
      severity: 'warning',
      data: {
        tradingPair: 'ADAUSDT',
        actionRequired: true
      }
    },
    {
      alertType: 'pnl_loss',
      title: 'Stop Loss Triggered',
      message: 'Position closed with -2.1% loss to protect capital',
      severity: 'error',
      data: {
        tradingPair: 'SOLUSDT',
        pnl: '-2.1%',
        price: '98.50'
      }
    },
    {
      alertType: 'performance_milestone',
      title: 'Monthly Performance Milestone',
      message: 'Congratulations! You achieved +15% monthly return',
      severity: 'success',
      data: {
        profit: '+15%',
        winRate: '78%'
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
          {demoAlerts.map((alert, index) => (
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
                {alert.alertType === 'pnl_gain' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {alert.alertType === 'pnl_loss' && <TrendingDown className="h-4 w-4 text-red-500" />}
                {alert.alertType === 'entry_signal' && <Bot className="h-4 w-4 text-blue-500" />}
                {alert.alertType === 'bot_error' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {alert.alertType === 'performance_milestone' && <Bell className="h-4 w-4 text-purple-500" />}
                <div className="text-left">
                  <div className="font-medium text-xs">{alert.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {alert.message.substring(0, 30)}...
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 Pro tip: Configure alert settings in the Alert Center to customize your notification preferences!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}