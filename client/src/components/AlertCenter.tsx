import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertSetting } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Settings, Trash2, Check, CheckCheck, AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AlertCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertCenter({ open, onOpenChange }: AlertCenterProps) {
  const [activeTab, setActiveTab] = useState('alerts');
  const queryClient = useQueryClient();
  const userId = 'default-user'; // In real app, get from auth

  // Fetch alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts', userId],
    queryFn: () => apiRequest(`/api/alerts/${userId}`),
  });

  // Fetch alert settings
  const { data: alertSettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/alert-settings', userId],
    queryFn: () => apiRequest(`/api/alert-settings/${userId}`),
  });

  // Mark alert as read
  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest(`/api/alerts/${alertId}/read`, 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
    }
  });

  // Mark all alerts as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest(`/api/alerts/${userId}/read-all`, 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
    }
  });

  // Delete alert
  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest(`/api/alerts/${alertId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
    }
  });

  // Create alert setting
  const createSettingMutation = useMutation({
    mutationFn: (setting: any) => apiRequest('/api/alert-settings', 'POST', setting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
    }
  });

  // Update alert setting
  const updateSettingMutation = useMutation({
    mutationFn: ({ id, ...setting }: any) => apiRequest(`/api/alert-settings/${id}`, 'PUT', setting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
    }
  });

  const unreadCount = alerts.filter((alert: Alert) => !alert.isRead).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      case 'success': return 'default';
      default: return 'secondary';
    }
  };

  const alertTypes = [
    { value: 'pnl_gain', label: 'Profit Threshold' },
    { value: 'pnl_loss', label: 'Loss Threshold' },
    { value: 'entry_signal', label: 'Entry Signals' },
    { value: 'exit_signal', label: 'Exit Signals' },
    { value: 'bot_error', label: 'Bot Errors' },
    { value: 'performance_milestone', label: 'Performance Milestones' }
  ];

  const notificationMethods = [
    { value: 'in_app', label: 'In-App Notification' },
    { value: 'browser_notification', label: 'Browser Notification' },
    { value: 'email', label: 'Email' },
    { value: 'webhook', label: 'Webhook' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Center
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage your trading bot alerts and notification preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
            <TabsTrigger value="settings">Alert Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {alerts.length} total alerts • {unreadCount} unread
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              </div>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {alertsLoading ? (
                  <div className="text-center py-8">Loading alerts...</div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts yet. Alerts will appear here when your trading bots trigger notifications.
                  </div>
                ) : (
                  alerts.map((alert: Alert) => (
                    <Card key={alert.id} className={`${!alert.isRead ? 'bg-muted/50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{alert.title}</h4>
                                <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                                  {alert.alertType.replace('_', ' ')}
                                </Badge>
                                {!alert.isRead && (
                                  <Badge variant="destructive" className="text-xs">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {alert.message}
                              </p>
                              {alert.data && (
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {alert.data.tradingPair && (
                                    <div>Pair: {alert.data.tradingPair}</div>
                                  )}
                                  {alert.data.pnl && (
                                    <div>P&L: {alert.data.pnl}</div>
                                  )}
                                  {alert.data.price && (
                                    <div>Price: ${alert.data.price}</div>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!alert.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsReadMutation.mutate(alert.id)}
                                disabled={markAsReadMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAlertMutation.mutate(alert.id)}
                              disabled={deleteAlertMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Configure when and how you want to receive alerts from your trading bots
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-4">
                {alertTypes.map((type) => {
                  const setting = alertSettings.find((s: AlertSetting) => s.alertType === type.value);
                  
                  return (
                    <Card key={type.value}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{type.label}</CardTitle>
                            <CardDescription className="text-sm">
                              {type.value === 'pnl_gain' && 'Alert when profits reach a target amount'}
                              {type.value === 'pnl_loss' && 'Alert when losses exceed a threshold'}
                              {type.value === 'entry_signal' && 'Alert when bots enter new positions'}
                              {type.value === 'exit_signal' && 'Alert when bots exit positions'}
                              {type.value === 'bot_error' && 'Alert when bots encounter errors'}
                              {type.value === 'performance_milestone' && 'Alert when bots reach performance goals'}
                            </CardDescription>
                          </div>
                          <Switch
                            checked={setting?.isEnabled || false}
                            onCheckedChange={(enabled) => {
                              if (setting) {
                                updateSettingMutation.mutate({
                                  id: setting.id,
                                  isEnabled: enabled
                                });
                              } else {
                                createSettingMutation.mutate({
                                  userId,
                                  alertType: type.value,
                                  isEnabled: enabled,
                                  method: 'in_app'
                                });
                              }
                            }}
                          />
                        </div>
                      </CardHeader>
                      
                      {(setting?.isEnabled || false) && (
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Notification Method
                              </label>
                              <Select
                                value={setting?.method || 'in_app'}
                                onValueChange={(method) => {
                                  if (setting) {
                                    updateSettingMutation.mutate({
                                      id: setting.id,
                                      method
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {notificationMethods.map((method) => (
                                    <SelectItem key={method.value} value={method.value}>
                                      {method.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {(type.value === 'pnl_gain' || type.value === 'pnl_loss') && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">
                                  Threshold ($)
                                </label>
                                <Input
                                  type="number"
                                  placeholder="Enter amount"
                                  value={setting?.threshold || ''}
                                  onChange={(e) => {
                                    if (setting) {
                                      updateSettingMutation.mutate({
                                        id: setting.id,
                                        threshold: e.target.value
                                      });
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}